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
import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID, ECOMSAI_PLATFORM_USER_ID } from '@constant/user';
import {
    buildMenuExtractionRoutingFields,
    buildPublicDraftMenuExtractionDestination,
    MENU_EXTRACTION_SOURCES,
    PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES,
} from '@data/shared/menuExtractionJob';
import { MenuIntakeFileInput } from '@data/shared/menuIntakeIdentity';
import { firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import { acquireMenuLinkSource, MenuLinkImportError } from '@lib/menu-link-import/sourceAcquisition';
import { analyzeMenuIntakeIdentity, isSupportedMenuIntakeIdentityMimeType } from '@lib/menu-extraction/menuIntakeIdentityServer';
import { checkSafeMode } from '@lib/ops/safeMode';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'src/middleware/auth';
import { getClientIp } from 'src/middleware/publicApi';
import { z } from 'zod';

const COLLECTION = DB_COLLECTIONS.PUBLIC_MENU_DRAFTS;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set<string>(PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES);
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_DRAFT_STATUSES = new Set(['pending', 'processing']);
const REUSABLE_DRAFT_STATUSES = new Set(['pending', 'processing', 'completed']);

const PublicMenuLinkSchema = z.object({
    permissionConfirmed: z.literal(true),
    sourceType: z.literal('menu_link'),
    url: z.string().min(8).max(4000),
});

type PublicDraftSource = {
    contentType: string;
    finalUrl?: string;
    kind: 'image_upload' | 'menu_link_import';
    originalFileName: string;
    size: number;
    sourceContentType?: string;
    sourceKind?: string;
    sourceTextPreview?: string;
    sourceUrl?: string;
    storagePath: string;
};

type ReusableDraft = {
    data: Record<string, any>;
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
    const ip = getClientIp(req);
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

function buildPublicDraftProjectId(draftToken: string): string {
    return `${ECOMSAI_PLATFORM_TENANT_ID}-public-${draftToken}-${ECOMSAI_PLATFORM_STORE_ID}`;
}

function hashString(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function hashBuffer(value: Buffer): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function getTimestampMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return null;
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
        const expiresAtMillis = getTimestampMillis(data.expiresAt);
        const status = String(data.extractionStatus || '');

        if (data.claimed === true) return;
        if (expiresAtMillis !== null && expiresAtMillis < now) return;

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

async function checkAuthenticatedPublicMenuEntryLimit(userId: string): Promise<NextResponse | null> {
    const rateLimitConfig = getRateLimitForFeature('PUBLIC_MENU_ENTRY_AUTH');
    const rateLimitResult = await checkRateLimit({
        key: `public-menu-entry:${userId}`,
        ...rateLimitConfig,
    });

    if (rateLimitResult.allowed) return null;

    const waitSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
        {
            success: false,
            error: 'Too many menu setup attempts. Please try again later.',
        },
        {
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

async function runPublicDraftIdentityCheck(draftToken: string, projectId: string, source: PublicDraftSource, sourceUrl: string) {
    if (!FEATURE_FLAGS.ENABLE_MENU_INTAKE_IDENTITY || !isSupportedMenuIntakeIdentityMimeType(source.contentType)) {
        return null;
    }

    const file: MenuIntakeFileInput = {
        uid: `public-${draftToken}`,
        name: source.originalFileName,
        size: source.size,
        type: source.contentType,
        url: sourceUrl,
    };

    const identityCheck = await analyzeMenuIntakeIdentity({
        context: { hasExistingMenu: false },
        files: [file],
        operation: {
            billingMode: 'public',
            projectId,
            sId: ECOMSAI_PLATFORM_STORE_ID,
            source: 'public_menu_entry_identity',
            tId: ECOMSAI_PLATFORM_TENANT_ID,
            uId: String(ECOMSAI_PLATFORM_USER_ID),
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

async function createPublicDraftExtractionJob(draftToken: string, source: PublicDraftSource, sourceUrl: string, userId: string): Promise<string> {
    const jobRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS).doc();
    const now = Timestamp.now();
    const projectId = buildPublicDraftProjectId(draftToken);
    const identityCheck = await runPublicDraftIdentityCheck(draftToken, projectId, source, sourceUrl);

    await jobRef.set({
        action: AI_ACTIONS_TYPES.PUBLIC_MENU_EXTRACTION,
        createdAt: now,
        currentStep: 'Queued',
        ...buildMenuExtractionRoutingFields(buildPublicDraftMenuExtractionDestination(draftToken, source.kind)),
        files: [{
            uid: `public-${draftToken}`,
            name: source.originalFileName,
            size: source.size,
            type: source.contentType,
            url: sourceUrl,
        }],
        jobMode: 'SINGLE_STORE',
        progress: 0,
        projectId,
        sId: String(ECOMSAI_PLATFORM_STORE_ID),
        skipProjectSave: true,
        source: source.kind === 'menu_link_import'
            ? MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT
            : MENU_EXTRACTION_SOURCES.PUBLIC_CREATE_MENU,
        sourceMetadata: {
            ...(source.kind === 'menu_link_import' ? {
                acquisitionProvider: 'direct-http',
                finalUrl: source.finalUrl,
                sourceContentType: source.sourceContentType,
                sourceKind: source.sourceKind,
                sourceTextPreview: source.sourceTextPreview || null,
                sourceUrl: source.sourceUrl,
            } : {}),
            ...(identityCheck ? { identityCheck } : {}),
            publicDraftId: draftToken,
            requestedByUId: userId,
            sourceType: source.kind,
            storagePath: source.storagePath,
        },
        status: 'pending',
        tId: String(ECOMSAI_PLATFORM_TENANT_ID),
        targetLanguages: [{ code: 'en', name: 'English' }],
        uId: String(ECOMSAI_PLATFORM_USER_ID),
        updatedAt: now,
    });

    await firestoreAdmin.collection(COLLECTION).doc(draftToken).update({
        extractionJobId: jobRef.id,
        updatedAt: now,
    });

    return jobRef.id;
}

async function createImageDraft(req: NextRequest, userId: string, imageFile: File) {
    if (!ALLOWED_TYPES.has(imageFile.type)) {
        return NextResponse.json(
            { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.' },
            { status: 400 }
        );
    }

    if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { success: false, error: 'File too large. Maximum size is 10MB.' },
            { status: 400 }
        );
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const contentHash = hashBuffer(buffer);
    const reusableDraft = await findReusableDraftForUser(userId, { contentHash });
    if (reusableDraft) {
        secureLog('[PublicMenuEntry] Reusing owner draft', {
            draftToken: reusableDraft.id,
            reason: reusableDraft.data.contentHash === contentHash ? 'content_hash' : 'active_draft',
            sourceType: reusableDraft.data.sourceType || 'image_upload',
            status: reusableDraft.data.extractionStatus,
            userId,
        });
        return buildReusableDraftResponse(reusableDraft);
    }

    const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    const draftToken = crypto.randomUUID();
    const ext = imageFile.type === 'image/png' ? 'png' : imageFile.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `publicMenuDrafts/${draftToken}/menu.${ext}`;
    const downloadToken = crypto.randomUUID();
    const bucket = storageAdmin.bucket();
    const imageUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(Date.now() + DRAFT_TTL_MS);
    const ipHash = hashClientIp(req);
    let draftCreated = false;

    try {
        await bucket.file(storagePath).save(buffer, {
            metadata: {
                cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                contentType: imageFile.type,
                metadata: {
                    draftToken,
                    firebaseStorageDownloadTokens: downloadToken,
                    uploadedAt: new Date().toISOString(),
                },
            },
        });

        await firestoreAdmin.collection(COLLECTION).doc(draftToken).set({
            token: draftToken,
            imageUrl,
            imagePath: storagePath,
            originalFileName: imageFile.name || 'menu.jpg',
            fileType: imageFile.type,
            fileSize: imageFile.size,
            sourceType: 'image_upload',
            contentHash,
            extractedData: null,
            extractionStatus: 'pending' as const,
            extractionJobId: null,
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
        });
        draftCreated = true;

        const jobId = await createPublicDraftExtractionJob(draftToken, {
            contentType: imageFile.type,
            kind: 'image_upload',
            originalFileName: imageFile.name || 'menu.jpg',
            size: imageFile.size,
            storagePath,
        }, imageUrl, userId);

        secureLog('[PublicMenuEntry] Draft created', {
            draftToken,
            fileSize: imageFile.size,
            ipHash,
            jobId,
            sourceType: 'image_upload',
            userId,
        });

        return NextResponse.json({
            success: true,
            draftId: draftToken,
            previewUrl: `/create-menu/preview/${draftToken}`,
            status: 'processing',
        });
    } catch (error) {
        await bucket.file(storagePath).delete({ ignoreNotFound: true }).catch(() => undefined);
        if (draftCreated) {
            await firestoreAdmin.collection(COLLECTION).doc(draftToken).delete().catch(() => undefined);
        }
        secureError('[PublicMenuEntry] Draft job creation failed', error instanceof Error ? error : new Error(String(error)), { draftToken });
        return NextResponse.json(
            { success: false, error: 'Failed to process your menu image. Please try again.' },
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
    const sourceInputHash = hashString(requestedSourceUrl);
    const reusableDraft = await findReusableDraftForUser(userId, { sourceInputHash });
    if (reusableDraft) {
        secureLog('[PublicMenuEntry] Reusing owner link draft', {
            draftToken: reusableDraft.id,
            reason: reusableDraft.data.sourceInputHash === sourceInputHash ? 'source_input_hash' : 'active_draft',
            sourceType: reusableDraft.data.sourceType || 'menu_link_import',
            status: reusableDraft.data.extractionStatus,
            userId,
        });
        return buildReusableDraftResponse(reusableDraft);
    }

    const rateLimitResponse = await checkAuthenticatedPublicMenuEntryLimit(userId);
    if (rateLimitResponse) return rateLimitResponse;

    const draftToken = crypto.randomUUID();
    const createdStoragePaths: string[] = [];

    try {
        const acquisition = await acquireMenuLinkSource(requestedSourceUrl);
        const matchingDraft = await findReusableDraftForUser(userId, { contentHash: acquisition.contentHash });
        if (matchingDraft) {
            secureLog('[PublicMenuEntry] Reusing owner link draft after acquisition', {
                draftToken: matchingDraft.id,
                reason: matchingDraft.data.contentHash === acquisition.contentHash ? 'content_hash' : 'active_draft',
                sourceKind: acquisition.sourceKind,
                status: matchingDraft.data.extractionStatus,
                userId,
            });
            return buildReusableDraftResponse(matchingDraft);
        }

        const bucket = storageAdmin.bucket();
        const storagePath = `publicMenuDrafts/${draftToken}/source.${acquisition.artifactExtension}`;
        const downloadToken = crypto.randomUUID();

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

        await firestoreAdmin.collection(COLLECTION).doc(draftToken).set({
            token: draftToken,
            imageUrl: sourceArtifactUrl,
            imagePath: storagePath,
            originalFileName: fileName,
            fileType: acquisition.artifactContentType,
            fileSize: acquisition.size,
            sourceType: 'menu_link_import',
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
                sourceTextPreview: acquisition.sourceTextPreview || null,
                sourceInputHash,
                sourceUrl: requestedSourceUrl,
                storagePath,
            },
            extractedData: null,
            extractionStatus: 'pending' as const,
            extractionJobId: null,
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
        });

        const jobId = await createPublicDraftExtractionJob(draftToken, {
            contentType: acquisition.artifactContentType,
            finalUrl: acquisition.finalUrl,
            kind: 'menu_link_import',
            originalFileName: fileName,
            size: acquisition.size,
            sourceContentType: acquisition.sourceContentType,
            sourceKind: acquisition.sourceKind,
            sourceTextPreview: acquisition.sourceTextPreview,
            sourceUrl: requestedSourceUrl,
            storagePath,
        }, sourceArtifactUrl, userId);

        secureLog('[PublicMenuEntry] Link draft created', {
            draftToken,
            fileSize: acquisition.size,
            ipHash,
            jobId,
            sourceKind: acquisition.sourceKind,
            userId,
        });

        return NextResponse.json({
            success: true,
            draftId: draftToken,
            previewUrl: `/create-menu/preview/${draftToken}`,
            status: 'processing',
        });
    } catch (error) {
        await Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete({ ignoreNotFound: true })));
        await firestoreAdmin.collection(COLLECTION).doc(draftToken).delete().catch(() => undefined);

        if (error instanceof MenuLinkImportError) {
            secureLog('[PublicMenuEntry] Link source rejected', {
                code: error.code,
                status: error.status,
            });
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: error.status },
            );
        }

        secureError('[PublicMenuEntry] Link import failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: 'We could not read this menu link. Upload a photo or try another public menu link.' },
            { status: 500 },
        );
    }
}

export const POST = withAuth(async (req: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    const userId = String(session?.user?.id || '');
    if (!userId) {
        return NextResponse.json(
            { success: false, error: 'Authentication required.' },
            { status: 401 },
        );
    }

    try {
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json().catch(() => null);
            return createMenuLinkDraft(req, userId, body);
        }

        const formData = await req.formData();
        const imageFile = formData.get('image') as File | null;

        if (!imageFile) {
            return NextResponse.json(
                { success: false, error: 'No image file provided.' },
                { status: 400 }
            );
        }

        return createImageDraft(req, userId, imageFile);
    } catch (error) {
        secureError('[PublicMenuEntry] Upload failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: 'Failed to process your menu image. Please try again.' },
            { status: 500 }
        );
    }
});

export const GET = withAuth(async (req: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_MENU_ENTRY) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 }
        );
    }

    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('draftId');
    const statusOnly = searchParams.get('statusOnly') === '1' || searchParams.get('statusOnly') === 'true';
    const userId = String(session?.user?.id || '');

    if (!draftId) {
        return NextResponse.json(
            { success: false, error: 'Missing draftId parameter.' },
            { status: 400 }
        );
    }

    try {
        const statusRateLimit = await checkRateLimit({
            key: `public-menu-entry-status:${userId}:${draftId}`,
            limit: 90,
            window: 300,
        });
        if (!statusRateLimit.allowed) {
            return NextResponse.json(
                { success: false, error: 'Too many preview checks. Please wait a moment.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((statusRateLimit.resetAt - Date.now()) / 1000)),
                    },
                },
            );
        }

        const draftDoc = await firestoreAdmin.collection(COLLECTION).doc(draftId).get();

        if (!draftDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Draft not found or expired.' },
                { status: 404 }
            );
        }

        const draft = draftDoc.data()!;

        if (draft.createdByUId !== userId) {
            return NextResponse.json(
                { success: false, error: 'You do not have access to this draft.' },
                { status: 403 },
            );
        }

        if (draft.expiresAt && draft.expiresAt.toMillis() < Date.now()) {
            return NextResponse.json(
                { success: false, error: 'Draft expired. Please upload again.', status: 'expired' },
                { status: 410 }
            );
        }

        const responseBody: Record<string, unknown> = {
            success: true,
            status: draft.extractionStatus,
            detectedBusinessName: draft.detectedBusinessName || null,
            detectedBusinessType: draft.detectedBusinessType || null,
            detectedBusinessCategory: draft.detectedBusinessCategory || null,
            detectedCurrencyCode: draft.detectedCurrencyCode || null,
            detectedBrandAccentColor: draft.detectedBrandAccentColor || null,
            detectedImageBackgroundColor: draft.detectedImageBackgroundColor || null,
            suggestedProjectName: draft.suggestedProjectName || null,
            extractedBusinessProfile: draft.extractedBusinessProfile || null,
            imageUrl: draft.imageUrl,
            sourceType: draft.sourceType || 'image_upload',
            error: draft.extractionError || null,
            resultReady: draft.extractionStatus === 'completed' && Boolean(draft.extractedData),
        };

        if (!statusOnly) {
            responseBody.extractedData = draft.extractedData || null;
        }

        return NextResponse.json(responseBody);
    } catch (error) {
        secureError('[PublicMenuEntry] Poll failed', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { success: false, error: 'Failed to check status.' },
            { status: 500 }
        );
    }
});
