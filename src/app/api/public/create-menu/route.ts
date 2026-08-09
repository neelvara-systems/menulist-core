export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * Public Menu Entry API
 *
 * POST /api/public/create-menu — Authenticated upload/link import + queue extraction
 * GET  /api/public/create-menu?draftId={token} — Authenticated owner-bound preview polling
 *
 * Public drafts are durable. POST creates a public draft and a `menuImageProcessingJobs`
 * document; the shared extraction worker writes completion/failure back to the draft.
 *
 * @see __docs__/public-menu-entry/public-menu-entry_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { MENULIST_PLATFORM_STORE_ID, MENULIST_PLATFORM_TENANT_ID, MENULIST_PLATFORM_USER_ID } from '@constant/user';
import {
    buildMenuExtractionRoutingFields,
    buildPublicDraftMenuExtractionDestination,
    MENU_EXTRACTION_SOURCES,
    PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES,
    PUBLIC_CREATE_MENU_UPLOAD_LIMITS,
} from '@data/shared/menuExtractionJob';
import {
    PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION,
    sanitizePublicMenuDraftSourceFileName,
    type PublicMenuDraftSourceFile,
} from '@data/shared/publicMenuDraftSource';
import { MenuIntakeFileInput } from '@data/shared/menuIntakeIdentity';
import {
    getPublicMenuDraftTimestampMillis,
    normalizePublicMenuDraftExtractedData,
} from '@data/shared/publicMenuDraftData';
import { firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import {
    normalizeGrowthAcquisitionAttribution,
    type GrowthAcquisitionAttribution,
} from '@lib/growth/acquisitionAttribution';
import {
    acquireMenuLinkSource,
    getMenuLinkImportClientMessage,
    MenuLinkImportError,
} from '@lib/menu-link-import/sourceAcquisition';
import { analyzeMenuIntakeIdentity, isSupportedMenuIntakeIdentityMimeType } from '@lib/menu-extraction/menuIntakeIdentityServer';
import { checkSafeMode } from '@lib/ops/safeMode';
import { recordFounderGrowthEvent } from '@lib/ops/founderGrowthReadModel';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { normalizeExtractedMenuPriceTruth } from '@lib/pricing/projectPriceTruth';
import { normalizePublicDraftSourceForProject } from '@lib/public-menu-entry/publicDraftSource';
import { normalizePublicMenuDraftId } from '@lib/public-menu-entry/publicDraftId';
import { normalizePublicCreateMenuPreviewDraft } from '@lib/publicCreateMenu/previewDraftResponse';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedFormDataBody, readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateFileUpload } from '@lib/security/fileValidation';
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from '@lib/security/securityDiagnostics';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { type AuthenticatedHandler, withAuth } from 'src/middleware/auth';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;
const MAX_FILE_SIZE = PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES;
const MAX_CREATE_MENU_BODY_SIZE = PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES + 1024 * 1024;
const PUBLIC_CREATE_MENU_LINK_MAX_BODY_BYTES = 8 * 1024;
const ALLOWED_TYPES = new Set<string>(PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES);
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_DRAFT_STATUSES = new Set(['pending', 'processing']);
const REUSABLE_DRAFT_STATUSES = new Set(['pending', 'processing', 'completed']);
const PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE = 'We could not prepare this menu. Upload a clearer photo or PDF, or try another public menu link.';
const PUBLIC_MENU_ENTRY_REUSED_DRAFT = 'public_menu_entry_reused_draft';
const PUBLIC_MENU_ENTRY_REUSED_LINK_DRAFT = 'public_menu_entry_reused_link_draft';
const PUBLIC_MENU_ENTRY_REUSED_LINK_DRAFT_AFTER_ACQUISITION = 'public_menu_entry_reused_link_draft_after_acquisition';
const PUBLIC_MENU_ENTRY_DRAFT_CREATED = 'public_menu_entry_draft_created';
const PUBLIC_MENU_ENTRY_LINK_DRAFT_CREATED = 'public_menu_entry_link_draft_created';
const PUBLIC_MENU_ENTRY_DRAFT_JOB_CREATE_FAILED = 'public_menu_entry_draft_job_create_failed';
const PUBLIC_MENU_ENTRY_LINK_SOURCE_REJECTED = 'public_menu_entry_link_source_rejected';
const PUBLIC_MENU_ENTRY_LINK_IMPORT_FAILED = 'public_menu_entry_link_import_failed';
const PUBLIC_MENU_ENTRY_UPLOAD_FAILED = 'public_menu_entry_upload_failed';
const PUBLIC_MENU_ENTRY_POLL_FAILED = 'public_menu_entry_poll_failed';
const PUBLIC_MENU_ENTRY_STORAGE_CLEANUP_FAILED = 'public_menu_entry_storage_cleanup_failed';
const PUBLIC_MENU_ENTRY_COLLISION_LOOKUP_FAILED = 'public_menu_entry_collision_lookup_failed';
const PUBLIC_MENU_ENTRY_DRAFT_PRICE_INVALID = 'public_menu_entry_draft_price_invalid';
const PUBLIC_MENU_ENTRY_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

const withPublicMenuEntryPrivateResponse = (handler: AuthenticatedHandler) => {
    const authenticatedHandler = withAuth(handler);
    return async (...args: Parameters<typeof authenticatedHandler>): Promise<NextResponse> => {
        const response = await authenticatedHandler(...args);
        Object.entries(PUBLIC_MENU_ENTRY_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
            response.headers.set(name, value);
        });
        return response;
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

function buildPublicMenuEntryLogContext(context: {
    draftToken?: unknown;
    ipHash?: unknown;
    jobId?: unknown;
    sourceKind?: unknown;
    sourceType?: unknown;
    status?: unknown;
    userId?: unknown;
} = {}): Record<string, boolean | number | string | null | undefined> {
    return {
        ...getBoundedSecurityStringContext('draftToken', context.draftToken),
        ...getBoundedSecurityStringContext('userId', context.userId),
        ...getBoundedSecurityStringContext('jobId', context.jobId),
        ...getBoundedSecurityStringContext('ipHash', context.ipHash),
        sourceKind: typeof context.sourceKind === 'string' ? context.sourceKind.slice(0, 64) : undefined,
        sourceType: typeof context.sourceType === 'string' ? context.sourceType.slice(0, 64) : undefined,
        status: typeof context.status === 'string' ? context.status.slice(0, 64) : undefined,
    };
}

async function deletePublicMenuEntryStoragePath(
    storagePath: string,
    context: { cleanupReason: string; draftToken: string; userId: string },
): Promise<void> {
    try {
        await storageAdmin.bucket().file(storagePath).delete({ ignoreNotFound: true });
    } catch (error) {
        logSecurityFailure(PUBLIC_MENU_ENTRY_STORAGE_CLEANUP_FAILED, error, {
            ...buildPublicMenuEntryLogContext({ draftToken: context.draftToken, userId: context.userId }),
            ...getBoundedSecurityStringContext('storagePath', storagePath),
            cleanupReason: context.cleanupReason,
        });
    }
}

const PublicMenuLinkSchema = z.object({
    growthAcquisition: z.object({
        source: z.string().trim().max(80),
        medium: z.string().trim().max(80),
        campaign: z.string().trim().max(80),
    }).strict().optional().nullable(),
    permissionConfirmed: z.literal(true),
    sourceType: z.literal('menu_link'),
    url: z.string().trim().url().min(8).max(4000),
}).strict();

type PublicDraftSource = {
    contentType: string;
    finalUrl?: string;
    kind: 'image_upload' | 'menu_link_import';
    originalFileName: string;
    size: number;
    sourceContentType?: string;
    sourceKind?: string;
    sourceTextLength?: number;
    sourceTextPresent?: boolean;
    sourceUrl?: string;
    storagePath: string;
};

type PublicMenuLinkDraftSourceMetadata = {
    acquisitionProvider: 'direct-http';
    contentHash: string;
    finalUrl: string;
    permissionConfirmed: true;
    redirectCount: number;
    sourceContentType: string;
    sourceInputHash: string;
    sourceKind: string;
    sourceTextLength: number;
    sourceTextPresent: boolean;
    sourceUrl: string;
    storagePath: string;
};

type PendingPublicMenuDraftDocument = {
    claimed: false;
    contentHash: string;
    createdAt: Timestamp;
    createdByUId: string;
    detectedBrandAccentColor: null;
    detectedBusinessCategory: null;
    detectedBusinessName: null;
    detectedBusinessType: null;
    detectedCurrencyCode: null;
    detectedImageBackgroundColor: null;
    expiresAt: Timestamp;
    extractedBusinessProfile: null;
    extractedData: null;
    extractionStatus: 'pending';
    fileSize: number;
    fileType: string;
    growthAcquisition?: GrowthAcquisitionAttribution;
    imagePath: string;
    imageUrl: string;
    ipHash: string;
    originalFileName: string;
    sourceFiles?: PublicMenuDraftSourceFile[];
    sourceFilesVersion?: typeof PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION;
    sourceOriginalFileName?: string;
    sourceInputHash?: string;
    sourceMetadata?: PublicMenuLinkDraftSourceMetadata;
    sourceType: PublicDraftSource['kind'];
    suggestedProjectName: null;
    token: string;
    updatedAt: Timestamp;
};

type ReusableDraft = {
    data: Record<string, unknown>;
    id: string;
};

type ReusableDraftCriteria = {
    contentHash?: string | null;
    sourceInputHash?: string | null;
};

function buildDownloadUrl(bucketName: string, storagePath: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function hashClientIp(req: NextRequest): string {
    return hashPublicRateLimitValue(getClientIp(req));
}

function buildPublicDraftProjectId(draftToken: string): string {
    return `${MENULIST_PLATFORM_TENANT_ID}-public-${draftToken}-${MENULIST_PLATFORM_STORE_ID}`;
}

function hashString(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function hashBuffer(value: Buffer): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function buildIdempotentPublicDraftToken(userId: string, sourceFingerprint: string): string {
    const hex = hashString(`public-menu-draft:v1:${userId}:${sourceFingerprint}`).slice(0, 32).split('');
    hex[12] = '5';
    hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

function buildReusableDraftResponse(reusableDraft: ReusableDraft): NextResponse {
    const status = String(reusableDraft.data.extractionStatus || 'processing');
    return NextResponse.json({
        success: true,
        draftId: reusableDraft.id,
        previewUrl: `/create-menu/preview/${reusableDraft.id}`,
        reusedDraft: true,
        status,
    });
}

async function findReusableDraftForUser(
    userId: string,
    criteria: ReusableDraftCriteria = {},
): Promise<ReusableDraft | null> {
    const snapshot = await firestoreAdmin
        .collection(COLLECTION)
        .where('createdByUId', '==', userId)
        .limit(20)
        .get();

    let activeDraft: ReusableDraft | null = null;
    let matchingDraft: ReusableDraft | null = null;
    const now = Date.now();

    snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const expiresAtMillis = getPublicMenuDraftTimestampMillis(data.expiresAt);
        const status = String(data.extractionStatus || '');

        if (data.claimed === true) return;
        if (expiresAtMillis === null || expiresAtMillis <= now) return;

        if (!activeDraft && ACTIVE_DRAFT_STATUSES.has(status)) {
            activeDraft = { id: doc.id, data };
        }

        if (matchingDraft || !REUSABLE_DRAFT_STATUSES.has(status)) return;

        if (criteria.contentHash && data.contentHash === criteria.contentHash) {
            matchingDraft = { id: doc.id, data };
            return;
        }

        if (criteria.sourceInputHash && data.sourceInputHash === criteria.sourceInputHash) {
            matchingDraft = { id: doc.id, data };
        }
    });

    return activeDraft || matchingDraft;
}

async function getReusableDraftByIdForUser(
    draftToken: string,
    userId: string,
    criteria: ReusableDraftCriteria,
): Promise<ReusableDraft | null> {
    const draftDoc = await firestoreAdmin.collection(COLLECTION).doc(draftToken).get();
    if (!draftDoc.exists) return null;
    const data = draftDoc.data() || {};
    const expiresAtMillis = getPublicMenuDraftTimestampMillis(data.expiresAt);
    const status = String(data.extractionStatus || '');
    if (
        data.createdByUId !== userId
        || data.claimed === true
        || expiresAtMillis === null
        || expiresAtMillis <= Date.now()
        || !REUSABLE_DRAFT_STATUSES.has(status)
    ) {
        return null;
    }
    if (criteria.contentHash && data.contentHash !== criteria.contentHash) return null;
    if (criteria.sourceInputHash && data.sourceInputHash !== criteria.sourceInputHash) return null;
    return { id: draftDoc.id, data };
}

async function checkAuthenticatedPublicMenuEntryLimit(userId: string): Promise<NextResponse | null> {
    const rateLimitConfig = getRateLimitForFeature('PUBLIC_MENU_ENTRY_AUTH');
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const rateLimitResult = await checkRateLimit({
        key: `public-menu-entry:${userRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    if (rateLimitResult.allowed) return null;

    const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
    const waitSeconds = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
    return NextResponse.json(
        {
            success: false,
            error: providerUnavailable
                ? 'Menu setup is temporarily unavailable. Please try again in a minute.'
                : 'Too many menu setup attempts. Please try again later.',
        },
        providerUnavailable
            ? { status: 503 }
            : {
                status: 429,
                headers: {
                    'Retry-After': String(waitSeconds),
                    'X-RateLimit-Limit': String(rateLimitConfig.limit),
                    'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                    'X-RateLimit-Reset': String(rateLimitResult.resetAt),
                },
            },
    );
}

async function checkAuthenticatedPublicMenuEntryAdmission(userId: string): Promise<NextResponse | null> {
    const rateLimitConfig = getRateLimitForFeature('PUBLIC_MENU_ENTRY_ADMISSION');
    const userRateLimitHash = hashPublicRateLimitValue(userId);
    const rateLimitResult = await checkRateLimit({
        key: `public-menu-entry-admission:${userRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });
    if (rateLimitResult.allowed) return null;

    const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
    return NextResponse.json(
        {
            success: false,
            error: providerUnavailable
                ? 'Menu setup is temporarily unavailable. Please try again in a minute.'
                : 'Too many menu setup requests. Please wait a moment and try again.',
        },
        providerUnavailable
            ? { status: 503 }
            : {
                status: 429,
                headers: {
                    'Retry-After': String(Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))),
                },
            },
    );
}

const hasSessionScopeValue = (value: unknown): boolean => (
    value !== undefined && value !== null && String(value).trim().length > 0
);

async function runPublicDraftIdentityCheck(
    draftToken: string,
    projectId: string,
    sources: PublicDraftSource[],
    sourceUrls: string[],
) {
    const files: MenuIntakeFileInput[] = sources.flatMap((source, index) => (
        isSupportedMenuIntakeIdentityMimeType(source.contentType) && sourceUrls[index]
            ? [{
                uid: `public-${draftToken}-${index + 1}`,
                name: source.originalFileName,
                size: source.size,
                type: source.contentType,
                url: sourceUrls[index],
            }]
            : []
    ));
    if (!FEATURE_FLAGS.ENABLE_MENU_INTAKE_IDENTITY || files.length === 0) {
        return null;
    }

    const identityCheck = await analyzeMenuIntakeIdentity({
        context: { hasExistingMenu: false },
        files,
        operation: {
            billingMode: 'public',
            projectId,
            sId: MENULIST_PLATFORM_STORE_ID,
            source: 'public_menu_entry_identity',
            tId: MENULIST_PLATFORM_TENANT_ID,
            uId: String(MENULIST_PLATFORM_USER_ID),
        },
    });

    return {
        analyzedFileCount: identityCheck.analyzedFileCount,
        decision: identityCheck.decision,
        degraded: identityCheck.degraded === true,
        identity: identityCheck.identity,
        validation: identityCheck.validation,
    };
}

async function createPublicDraftExtractionJob(
    draftToken: string,
    sources: PublicDraftSource[],
    sourceUrls: string[],
    userId: string,
    draftData: Record<string, unknown>,
): Promise<string> {
    if (sources.length === 0 || sources.length !== sourceUrls.length) {
        throw new Error('public_menu_draft_sources_invalid');
    }
    const primarySource = sources[0];
    const jobRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS).doc(`public_${draftToken}`);
    const draftRef = firestoreAdmin.collection(COLLECTION).doc(draftToken);
    const now = Timestamp.now();
    const projectId = buildPublicDraftProjectId(draftToken);
    const identityCheck = await runPublicDraftIdentityCheck(draftToken, projectId, sources, sourceUrls);

    const batch = firestoreAdmin.batch();
    batch.create(jobRef, {
        action: AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION,
        createdAt: now,
        currentStep: 'Queued',
        ...buildMenuExtractionRoutingFields(buildPublicDraftMenuExtractionDestination(draftToken, primarySource.kind)),
        files: sources.map((source, index) => ({
            uid: `public-${draftToken}-${index + 1}`,
            name: source.originalFileName,
            size: source.size,
            type: source.contentType,
            url: sourceUrls[index],
        })),
        jobMode: 'SINGLE_STORE',
        progress: 0,
        projectId,
        sId: String(MENULIST_PLATFORM_STORE_ID),
        skipProjectSave: true,
        source: primarySource.kind === 'menu_link_import'
            ? MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
            : MENU_EXTRACTION_SOURCES.PUBLIC_CREATE_MENU,
        sourceMetadata: {
            ...(primarySource.kind === 'menu_link_import' ? {
                acquisitionProvider: 'direct-http',
                finalUrl: primarySource.finalUrl,
                sourceContentType: primarySource.sourceContentType,
                sourceKind: primarySource.sourceKind,
                sourceTextLength: primarySource.sourceTextLength || 0,
                sourceTextPresent: Boolean(primarySource.sourceTextPresent),
                sourceUrl: primarySource.sourceUrl,
            } : {}),
            ...(identityCheck ? { identityCheck } : {}),
            publicDraftId: draftToken,
            requestedByUId: userId,
            sourceType: primarySource.kind,
            storagePath: primarySource.storagePath,
            ...(sources.length > 1 ? { storagePaths: sources.map((source) => source.storagePath) } : {}),
        },
        status: 'pending',
        tId: String(MENULIST_PLATFORM_TENANT_ID),
        targetLanguages: [{ code: 'en', name: 'English' }],
        uId: String(MENULIST_PLATFORM_USER_ID),
        updatedAt: now,
    });
    batch.create(draftRef, {
        ...draftData,
        extractionJobId: jobRef.id,
        updatedAt: now,
    });
    await batch.commit();

    return jobRef.id;
}

async function createImageDraft(
    req: NextRequest,
    userId: string,
    imageFiles: File[],
    growthAcquisition: GrowthAcquisitionAttribution | null,
    uploadSource: { originalFileName: string | null; type: 'image' | 'pdf' },
) {
    if (
        imageFiles.length === 0
        || imageFiles.length > PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_FILES
        || (imageFiles.length > 1 && uploadSource.type !== 'pdf')
        || (uploadSource.type === 'pdf' && !FEATURE_FLAGS.ENABLE_PUBLIC_MENU_PDF_UPLOAD)
        || (uploadSource.type === 'pdf' && imageFiles.some((file) => file.type !== 'image/jpeg'))
    ) {
        return NextResponse.json(
            { success: false, error: 'Upload one valid menu image or a PDF of up to 15 pages.' },
            { status: 400 },
        );
    }

    const totalFileSize = imageFiles.reduce((total, file) => total + file.size, 0);
    if (
        !Number.isSafeInteger(totalFileSize)
        || totalFileSize <= 0
        || totalFileSize > PUBLIC_CREATE_MENU_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES
        || imageFiles.some((file) => !ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE)
    ) {
        return NextResponse.json(
            { success: false, error: 'Source is too large. Use a file up to 10MB and a PDF up to 15 pages.' },
            { status: 400 },
        );
    }

    const preparedFiles: Array<{ buffer: Buffer; file: File; fileName: string }> = [];
    for (let index = 0; index < imageFiles.length; index += 1) {
        const imageFile = imageFiles[index];
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const fileValidation = await validateFileUpload(buffer, imageFile.type, imageFile.size);
        if (!fileValidation.valid) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or PDF menu.' },
                { status: 400 },
            );
        }
        preparedFiles.push({
            buffer,
            file: imageFile,
            fileName: sanitizePublicMenuDraftSourceFileName(imageFile.name)
                || `menu-page-${index + 1}.jpg`,
        });
    }

    const fileHashes = preparedFiles.map(({ buffer }) => hashBuffer(buffer));
    const contentHash = preparedFiles.length === 1 && uploadSource.type === 'image'
        ? fileHashes[0]
        : hashString(fileHashes.map((hash, index) => `${index}:${hash}`).join('|'));
    const reusableDraft = await findReusableDraftForUser(userId, { contentHash });
    if (reusableDraft) {
        logSecurityDiagnostic(PUBLIC_MENU_ENTRY_REUSED_DRAFT, {
            ...buildPublicMenuEntryLogContext({
                draftToken: reusableDraft.id,
                sourceType: reusableDraft.data.sourceType || 'image_upload',
                status: reusableDraft.data.extractionStatus,
                userId,
            }),
            reason: reusableDraft.data.contentHash === contentHash ? 'content_hash' : 'active_draft',
        });
        return buildReusableDraftResponse(reusableDraft);
    }

    const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    const sourceFingerprint = uploadSource.type === 'pdf' ? `pdf-pages:${contentHash}` : `image:${contentHash}`;
    const draftToken = buildIdempotentPublicDraftToken(userId, sourceFingerprint);
    const sourceFiles = preparedFiles.map(({ file, fileName }, index): PublicMenuDraftSourceFile => {
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const storagePath = uploadSource.type === 'pdf'
            ? `publicMenuDrafts/${draftToken}/menu-page-${String(index + 1).padStart(2, '0')}.jpg`
            : `publicMenuDrafts/${draftToken}/menu.${ext}`;
        const downloadToken = preparedFiles.length === 1 ? draftToken : `${draftToken}-${index + 1}`;
        return {
            downloadUrl: buildDownloadUrl(storageAdmin.bucket().name, storagePath, downloadToken),
            fileName,
            fileSize: file.size,
            fileType: file.type,
            storagePath,
        };
    });
    const primarySource = sourceFiles[0];
    // The object path is deliberately deterministic. Its download token must be
    // deterministic too so a concurrent identical upload cannot invalidate the
    // URL committed by the request that wins the Firestore create batch.
    const bucket = storageAdmin.bucket();
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + DRAFT_TTL_MS);
    const ipHash = hashClientIp(req);
    const createdStoragePaths: string[] = [];
    try {
        for (let index = 0; index < preparedFiles.length; index += 1) {
            const prepared = preparedFiles[index];
            const sourceFile = sourceFiles[index];
            const downloadToken = preparedFiles.length === 1 ? draftToken : `${draftToken}-${index + 1}`;
            await bucket.file(sourceFile.storagePath).save(prepared.buffer, {
                metadata: {
                    cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                    contentType: sourceFile.fileType,
                    metadata: {
                        draftToken,
                        firebaseStorageDownloadTokens: downloadToken,
                        pageNumber: String(index + 1),
                        uploadedAt: new Date().toISOString(),
                    },
                },
            });
            createdStoragePaths.push(sourceFile.storagePath);
        }

        const draftData: PendingPublicMenuDraftDocument = {
            token: draftToken,
            imageUrl: primarySource.downloadUrl,
            imagePath: primarySource.storagePath,
            originalFileName: primarySource.fileName,
            fileType: primarySource.fileType,
            fileSize: primarySource.fileSize,
            sourceType: 'image_upload',
            sourceFiles,
            sourceFilesVersion: PUBLIC_MENU_DRAFT_SOURCE_FILES_VERSION,
            ...(uploadSource.type === 'pdf' && uploadSource.originalFileName
                ? { sourceOriginalFileName: uploadSource.originalFileName }
                : {}),
            ...(growthAcquisition ? { growthAcquisition } : {}),
            contentHash,
            extractedData: null,
            extractionStatus: 'pending' as const,
            detectedBusinessName: null,
            detectedBusinessType: null,
            detectedBusinessCategory: null,
            detectedCurrencyCode: null,
            detectedBrandAccentColor: null,
            detectedImageBackgroundColor: null,
            suggestedProjectName: null,
            extractedBusinessProfile: null,
            ipHash,
            createdByUId: userId,
            createdAt: now,
            updatedAt: now,
            expiresAt,
            claimed: false,
        };

        const jobSources: PublicDraftSource[] = sourceFiles.map((sourceFile) => ({
            contentType: sourceFile.fileType,
            kind: 'image_upload',
            originalFileName: sourceFile.fileName,
            size: sourceFile.fileSize,
            storagePath: sourceFile.storagePath,
        }));
        const jobId = await createPublicDraftExtractionJob(
            draftToken,
            jobSources,
            sourceFiles.map((sourceFile) => sourceFile.downloadUrl),
            userId,
            draftData,
        );

        await recordFounderGrowthEvent({
            attribution: growthAcquisition,
            draftId: draftToken,
            stage: 'draft_created',
        });

        logSecurityDiagnostic(PUBLIC_MENU_ENTRY_DRAFT_CREATED, {
            ...buildPublicMenuEntryLogContext({ draftToken, ipHash, jobId, sourceType: 'image_upload', userId }),
            fileCount: imageFiles.length,
            fileSize: totalFileSize,
        });

        return NextResponse.json({
            success: true,
            draftId: draftToken,
            previewUrl: `/create-menu/preview/${draftToken}`,
            status: 'processing',
        });
    } catch (error) {
        let collisionLookupFailed = false;
        try {
            const existingDraft = await getReusableDraftByIdForUser(draftToken, userId, { contentHash });
            if (existingDraft) {
                logSecurityDiagnostic(PUBLIC_MENU_ENTRY_REUSED_DRAFT, {
                    ...buildPublicMenuEntryLogContext({
                        draftToken,
                        sourceType: existingDraft.data.sourceType || 'image_upload',
                        status: existingDraft.data.extractionStatus,
                        userId,
                    }),
                    reason: 'deterministic_create_collision',
                });
                return buildReusableDraftResponse(existingDraft);
            }
        } catch (lookupError) {
            collisionLookupFailed = true;
            logSecurityFailure(PUBLIC_MENU_ENTRY_COLLISION_LOOKUP_FAILED, lookupError, {
                ...buildPublicMenuEntryLogContext({ draftToken, sourceType: 'image_upload', userId }),
                cleanupDeferred: true,
            });
        }

        // If the lookup itself failed, the deterministic path may belong to a
        // concurrently committed draft. Preserve it rather than corrupting a
        // possible winner; the failure is logged for operational cleanup.
        if (!collisionLookupFailed) {
            await Promise.all(createdStoragePaths.map((storagePath) => deletePublicMenuEntryStoragePath(storagePath, {
                cleanupReason: 'image_draft_job_create_failed',
                draftToken,
                userId,
            })));
        }
        logSecurityFailure(PUBLIC_MENU_ENTRY_DRAFT_JOB_CREATE_FAILED, error, buildPublicMenuEntryLogContext({ draftToken, userId }));
        return NextResponse.json(
            { success: false, error: 'Failed to process your menu. Please try again.' },
            { status: 500 },
        );
    }
}

async function createMenuLinkDraft(req: NextRequest, userId: string, body: unknown) {
    if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT) {
        return NextResponse.json(
            { success: false, error: 'Menu link import is not available.' },
            { status: 404 },
        );
    }

    const validation = PublicMenuLinkSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { success: false, error: 'Enter a public menu link and confirm you have permission to import it.' },
            { status: 400 },
        );
    }

    const requestedSourceUrl = validation.data.url.trim();
    const growthAcquisition = normalizeGrowthAcquisitionAttribution(validation.data.growthAcquisition);
    const sourceInputHash = hashString(requestedSourceUrl);
    const reusableDraft = await findReusableDraftForUser(userId, { sourceInputHash });
    if (reusableDraft) {
        logSecurityDiagnostic(PUBLIC_MENU_ENTRY_REUSED_LINK_DRAFT, {
            ...buildPublicMenuEntryLogContext({
                draftToken: reusableDraft.id,
                sourceType: reusableDraft.data.sourceType || 'menu_link_import',
                status: reusableDraft.data.extractionStatus,
                userId,
            }),
            reason: reusableDraft.data.sourceInputHash === sourceInputHash ? 'source_input_hash' : 'active_draft',
        });
        return buildReusableDraftResponse(reusableDraft);
    }

    const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    let draftToken = buildIdempotentPublicDraftToken(userId, `link-input:${sourceInputHash}`);
    let acquiredContentHash: string | null = null;
    const createdStoragePaths: string[] = [];

    try {
        const acquisition = await acquireMenuLinkSource(requestedSourceUrl);
        acquiredContentHash = acquisition.contentHash;
        draftToken = buildIdempotentPublicDraftToken(userId, `link-content:${acquisition.contentHash}`);
        const matchingDraft = await findReusableDraftForUser(userId, { contentHash: acquisition.contentHash });
        if (matchingDraft) {
            logSecurityDiagnostic(PUBLIC_MENU_ENTRY_REUSED_LINK_DRAFT_AFTER_ACQUISITION, {
                ...buildPublicMenuEntryLogContext({
                    draftToken: matchingDraft.id,
                    sourceKind: acquisition.sourceKind,
                    status: matchingDraft.data.extractionStatus,
                    userId,
                }),
                reason: matchingDraft.data.contentHash === acquisition.contentHash ? 'content_hash' : 'active_draft',
            });
            return buildReusableDraftResponse(matchingDraft);
        }

        const bucket = storageAdmin.bucket();
        const storagePath = `publicMenuDrafts/${draftToken}/source.${acquisition.artifactExtension}`;
        const downloadToken = draftToken;

        await bucket.file(storagePath).save(acquisition.artifactBuffer, {
            metadata: {
                cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                contentType: acquisition.artifactContentType,
                metadata: {
                    draftToken,
                    firebaseStorageDownloadTokens: downloadToken,
                    importedAt: new Date().toISOString(),
                    sourceKind: acquisition.sourceKind,
                },
            },
        });
        createdStoragePaths.push(storagePath);

        const sourceArtifactUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + DRAFT_TTL_MS);
        const ipHash = hashClientIp(req);
        const fileName = `Imported menu link.${acquisition.artifactExtension}`;

        const draftData: PendingPublicMenuDraftDocument = {
            token: draftToken,
            imageUrl: sourceArtifactUrl,
            imagePath: storagePath,
            originalFileName: fileName,
            fileType: acquisition.artifactContentType,
            fileSize: acquisition.size,
            sourceType: 'menu_link_import',
            ...(growthAcquisition ? { growthAcquisition } : {}),
            contentHash: acquisition.contentHash,
            sourceInputHash,
            sourceMetadata: {
                acquisitionProvider: 'direct-http',
                contentHash: acquisition.contentHash,
                finalUrl: acquisition.finalUrl,
                permissionConfirmed: true,
                redirectCount: acquisition.redirectCount,
                sourceContentType: acquisition.sourceContentType,
                sourceKind: acquisition.sourceKind,
                sourceTextLength: acquisition.sourceTextLength || 0,
                sourceTextPresent: Boolean(acquisition.sourceTextPresent),
                sourceInputHash,
                sourceUrl: requestedSourceUrl,
                storagePath,
            },
            extractedData: null,
            extractionStatus: 'pending' as const,
            detectedBusinessName: null,
            detectedBusinessType: null,
            detectedBusinessCategory: null,
            detectedCurrencyCode: null,
            detectedBrandAccentColor: null,
            detectedImageBackgroundColor: null,
            suggestedProjectName: null,
            extractedBusinessProfile: null,
            ipHash,
            createdByUId: userId,
            createdAt: now,
            updatedAt: now,
            expiresAt,
            claimed: false,
        };

        const jobId = await createPublicDraftExtractionJob(draftToken, [{
            contentType: acquisition.artifactContentType,
            finalUrl: acquisition.finalUrl,
            kind: 'menu_link_import',
            originalFileName: fileName,
            size: acquisition.size,
            sourceContentType: acquisition.sourceContentType,
            sourceKind: acquisition.sourceKind,
            sourceTextLength: acquisition.sourceTextLength,
            sourceTextPresent: acquisition.sourceTextPresent,
            sourceUrl: requestedSourceUrl,
            storagePath,
        }], [sourceArtifactUrl], userId, draftData);

        await recordFounderGrowthEvent({
            attribution: growthAcquisition,
            draftId: draftToken,
            stage: 'draft_created',
        });

        logSecurityDiagnostic(PUBLIC_MENU_ENTRY_LINK_DRAFT_CREATED, {
            ...buildPublicMenuEntryLogContext({ draftToken, ipHash, jobId, sourceKind: acquisition.sourceKind, userId }),
            fileSize: acquisition.size,
        });

        return NextResponse.json({
            success: true,
            draftId: draftToken,
            previewUrl: `/create-menu/preview/${draftToken}`,
            status: 'processing',
        });
    } catch (error) {
        if (error instanceof MenuLinkImportError) {
            logSecurityDiagnostic(PUBLIC_MENU_ENTRY_LINK_SOURCE_REJECTED, {
                code: error.code,
                status: error.status,
            });
            return NextResponse.json(
                { success: false, error: getMenuLinkImportClientMessage(error, { publicEntry: true }), code: error.code },
                { status: error.status },
            );
        }

        let collisionLookupFailed = false;
        if (acquiredContentHash) {
            try {
                const existingDraft = await getReusableDraftByIdForUser(draftToken, userId, {
                    contentHash: acquiredContentHash,
                });
                if (existingDraft) {
                    logSecurityDiagnostic(PUBLIC_MENU_ENTRY_REUSED_LINK_DRAFT_AFTER_ACQUISITION, {
                        ...buildPublicMenuEntryLogContext({
                            draftToken,
                            sourceType: existingDraft.data.sourceType || 'menu_link_import',
                            status: existingDraft.data.extractionStatus,
                            userId,
                        }),
                        reason: 'deterministic_create_collision',
                    });
                    return buildReusableDraftResponse(existingDraft);
                }
            } catch (lookupError) {
                collisionLookupFailed = true;
                logSecurityFailure(PUBLIC_MENU_ENTRY_COLLISION_LOOKUP_FAILED, lookupError, {
                    ...buildPublicMenuEntryLogContext({ draftToken, sourceType: 'menu_link_import', userId }),
                    cleanupDeferred: true,
                });
            }
        }

        if (!collisionLookupFailed) {
            await Promise.all(createdStoragePaths.map((path) => deletePublicMenuEntryStoragePath(path, {
                cleanupReason: 'link_draft_create_failed',
                draftToken,
                userId,
            })));
        }

        logSecurityFailure(PUBLIC_MENU_ENTRY_LINK_IMPORT_FAILED, error, buildPublicMenuEntryLogContext({ draftToken, userId }));
        return NextResponse.json(
            { success: false, error: 'We could not read this menu link. Upload a photo or try another public menu link.' },
            { status: 500 },
        );
    }
}

export const POST = withPublicMenuEntryPrivateResponse(async (req: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const userId = String(session?.user?.id || '');
    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'Authentication required.' },
            { status: 401 },
        );
    }

    const admissionResponse = await checkAuthenticatedPublicMenuEntryAdmission(userId);
    if (admissionResponse) return admissionResponse;

    const sessionTenantPresent = hasSessionScopeValue(session?.user?.tenantId);
    const sessionStorePresent = hasSessionScopeValue(session?.user?.storeId);
    if (sessionTenantPresent !== sessionStorePresent) {
        return NextResponse.json(
            { success: false, error: 'Your account setup is incomplete. Please sign in again.' },
            { status: 409 },
        );
    }
    if (sessionTenantPresent && sessionStorePresent) {
        const permissionResponse = await requireAnyStorePermission(
            req,
            session,
            [PERMISSIONS.USE_MENU_EXTRACTION],
            'Public menu setup extraction',
        );
        if (permissionResponse) return permissionResponse;
    }

    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_CREATE_MENU_BODY_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Source is too large. Upload a file up to 10MB, a PDF up to 15 pages, or use a public menu link.' },
                { status: 413 },
            );
        }

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const bodyResult = await readBoundedJsonBody(req, PUBLIC_CREATE_MENU_LINK_MAX_BODY_BYTES, {
                invalidJsonMessage: 'Enter a public menu link and confirm you have permission to import it.',
                tooLargeMessage: 'Menu link request is too large.',
            });
            if (bodyResult.ok === false) return bodyResult.response;

            return createMenuLinkDraft(req, userId, bodyResult.data);
        }

        const formDataResult = await readBoundedFormDataBody(req, MAX_CREATE_MENU_BODY_SIZE, {
            invalidFormDataMessage: 'Upload a valid menu image or PDF.',
            tooLargeMessage: 'Source is too large. Upload a file up to 10MB, a PDF up to 15 pages, or use a public menu link.',
        });
        if (formDataResult.ok === false) return formDataResult.response;

        const formData = formDataResult.formData;
        const imageValues = formData.getAll('images');
        const legacyImageValue = formData.get('image');
        const hasInvalidImagePart = imageValues.some((value) => !(value instanceof File));
        const imageFiles = imageValues.length > 0
            ? imageValues.filter((value): value is File => value instanceof File)
            : legacyImageValue instanceof File
                ? [legacyImageValue]
                : [];
        const uploadSourceType = formData.get('uploadSourceType') === 'pdf' ? 'pdf' : 'image';
        const sourceOriginalFileName = sanitizePublicMenuDraftSourceFileName(formData.get('sourceOriginalFileName'));
        const growthAcquisition = normalizeGrowthAcquisitionAttribution({
            source: formData.get('growthAcquisitionSource'),
            medium: formData.get('growthAcquisitionMedium'),
            campaign: formData.get('growthAcquisitionCampaign'),
        });

        if (
            hasInvalidImagePart
            || (imageValues.length > 0 && legacyImageValue instanceof File)
            || imageFiles.length === 0
            || (uploadSourceType === 'pdf' && !sourceOriginalFileName.toLowerCase().endsWith('.pdf'))
        ) {
            return NextResponse.json(
                { success: false, error: 'No valid menu image or PDF pages were provided.' },
                { status: 400 }
            );
        }

        return createImageDraft(req, userId, imageFiles, growthAcquisition, {
            originalFileName: uploadSourceType === 'pdf' ? sourceOriginalFileName : null,
            type: uploadSourceType,
        });
    } catch (error) {
        logSecurityFailure(PUBLIC_MENU_ENTRY_UPLOAD_FAILED, error, buildPublicMenuEntryLogContext({ userId }));
        return NextResponse.json(
            { success: false, error: 'Failed to process your menu. Please try again.' },
            { status: 500 }
        );
    }
});

export const GET = withPublicMenuEntryPrivateResponse(async (req: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('draftId');
    const normalizedDraftId = normalizePublicMenuDraftId(draftId);
    const statusOnly = searchParams.get('statusOnly') === '1' || searchParams.get('statusOnly') === 'true';
    const userId = String(session?.user?.id || '');

    if (!normalizedDraftId) {
        return NextResponse.json(
            { success: false, error: 'Invalid draftId parameter.' },
            { status: 400 }
        );
    }

    try {
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const draftRateLimitHash = hashPublicRateLimitValue(normalizedDraftId);
        const statusRateLimit = await checkRateLimit({
            key: `public-menu-entry-status:${userRateLimitHash}:${draftRateLimitHash}`,
            limit: 90,
            window: 300,
            failClosedOnProviderError: true,
        });
        if (!statusRateLimit.allowed) {
            const providerUnavailable = statusRateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    success: false,
                    error: providerUnavailable
                        ? 'Menu preview is temporarily unavailable. Please try again in a minute.'
                        : 'Too many preview checks. Please wait a moment.',
                },
                providerUnavailable
                    ? { status: 503 }
                    : {
                        status: 429,
                        headers: {
                            'Retry-After': String(Math.max(1, Math.ceil((statusRateLimit.resetAt - Date.now()) / 1000))),
                        },
                    },
            );
        }

        const draftDoc = await firestoreAdmin.collection(COLLECTION).doc(normalizedDraftId).get();

        if (!draftDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Draft not found or expired.' },
                { status: 404 }
            );
        }

        const draftData = draftDoc.data();
        if (!isRecord(draftData)) {
            return NextResponse.json(
                { success: false, error: 'Draft not found or expired.' },
                { status: 404 },
            );
        }
        const draft = draftData;

        if (draft.createdByUId !== userId) {
            return NextResponse.json(
                { success: false, error: 'You do not have access to this draft.' },
                { status: 403 },
            );
        }

        const expiresAtMillis = getPublicMenuDraftTimestampMillis(draft.expiresAt);
        if (expiresAtMillis === null || expiresAtMillis <= Date.now()) {
            return NextResponse.json(
                { success: false, error: 'Draft expired. Please upload again.', status: 'expired' },
                { status: 410 }
            );
        }

        let extractedData = normalizePublicMenuDraftExtractedData(draft.extractedData);
        if (extractedData) {
            try {
                extractedData = normalizeExtractedMenuPriceTruth(extractedData);
            } catch (error) {
                extractedData = null;
                logSecurityFailure(PUBLIC_MENU_ENTRY_DRAFT_PRICE_INVALID, error, buildPublicMenuEntryLogContext({
                    draftToken: normalizedDraftId,
                    status: draft.extractionStatus,
                    userId,
                }));
            }
        }
        const responseStatus = draft.extractionStatus === 'completed' && !extractedData
            ? 'failed'
            : draft.extractionStatus;
        const draftSource = normalizePublicDraftSourceForProject(draft, normalizedDraftId, {
            allowedBucket: storageAdmin.bucket().name,
            allowLocalEmulator: process.env.NODE_ENV !== 'production',
        });
        const normalizedPreview = normalizePublicCreateMenuPreviewDraft({
            status: responseStatus,
            detectedBusinessName: draft.detectedBusinessName,
            detectedBusinessType: draft.detectedBusinessType,
            detectedBusinessCategory: draft.detectedBusinessCategory,
            detectedCurrencyCode: draft.detectedCurrencyCode,
            detectedBrandAccentColor: draft.detectedBrandAccentColor,
            detectedImageBackgroundColor: draft.detectedImageBackgroundColor,
            suggestedProjectName: draft.suggestedProjectName,
            extractedBusinessProfile: draft.extractedBusinessProfile,
            imageUrl: draftSource?.imageUrl,
            sourceType: draft.sourceType,
            error: responseStatus === 'failed' ? PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE : null,
            extractedData,
        });
        if (!normalizedPreview || !draftSource) {
            logSecurityDiagnostic('public_menu_entry_draft_response_invalid', buildPublicMenuEntryLogContext({
                draftToken: normalizedDraftId,
                status: draft.extractionStatus,
                userId,
            }));
            return NextResponse.json(
                { success: false, error: PUBLIC_CREATE_MENU_DRAFT_FAILED_MESSAGE, status: 'failed' },
                { status: 422 },
            );
        }
        const responseBody: Record<string, unknown> = {
            success: true,
            ...normalizedPreview,
            resultReady: responseStatus === 'completed' && Boolean(extractedData),
        };

        if (statusOnly) delete responseBody.extractedData;

        return NextResponse.json(responseBody);
    } catch (error) {
        logSecurityFailure(PUBLIC_MENU_ENTRY_POLL_FAILED, error, buildPublicMenuEntryLogContext({ draftToken: normalizedDraftId, userId }));
        return NextResponse.json(
            { success: false, error: 'Failed to check status.' },
            { status: 500 }
        );
    }
});
