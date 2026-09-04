export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import GlobalLanguagesList from '@data/languages';
import {
    buildMenuExtractionRoutingFields,
    buildProjectMenuExtractionDestination,
    MENU_EXTRACTION_SOURCES,
} from '@data/shared/menuExtractionJob';
import { firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import {
    getBoundedMenuProcessingStringContext,
    getMenuProcessingProjectLogContext,
    logMenuProcessingDiagnostic,
    logMenuProcessingFailure,
} from '@lib/firebase/menuProcessingDiagnostics';
import {
    acquireMenuLinkSource,
    getMenuLinkImportClientMessage,
    MenuLinkImportError,
} from '@lib/menu-link-import/sourceAcquisition';
import {
    createOrReuseActiveMenuExtractionJob,
    MENU_EXTRACTION_ACTIVE_JOB_STATUSES,
} from '@lib/menu-extraction/activeJobClaim';
import {
    isMenuExtractionProjectIdInScope,
    normalizeMenuExtractionProjectId,
} from '@lib/menu-extraction/projectIdBoundary';
import { checkSafeMode } from '@lib/ops/safeMode';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import crypto from 'crypto';
import { Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { type AuthenticatedHandler, verifyTenantAccess, withAuth } from 'src/middleware/auth';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';

const MenuExtractionProjectIdSchema = z.string()
    .trim()
    .refine((value) => normalizeMenuExtractionProjectId(value) === value);

const RequestSchema = z.object({
    projectId: MenuExtractionProjectIdSchema,
    url: z.string().min(8).max(4000),
    permissionConfirmed: z.literal(true),
});

const ACTIVE_JOB_STATUSES = MENU_EXTRACTION_ACTIVE_JOB_STATUSES;
const MENU_LINK_IMPORT_MAX_BODY_BYTES = 8 * 1024;
const MENU_LINK_IMPORT_STORAGE_CLEANUP_FAILED = 'menu_link_import_storage_cleanup_failed';
const MENU_LINK_IMPORT_PERSISTENCE_PROBE_FAILED = 'menu_link_import_persistence_probe_failed';
const MENU_LINK_IMPORT_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

const withMenuLinkImportResponseHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(MENU_LINK_IMPORT_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

const withMenuLinkImportAuth = (handler: AuthenticatedHandler) => {
    const authenticatedHandler = withAuth(handler);
    return async (...args: Parameters<typeof authenticatedHandler>): Promise<NextResponse> => (
        withMenuLinkImportResponseHeaders(await authenticatedHandler(...args))
    );
};

function resolveTargetLanguages(projectData: unknown): Array<{ code: string; name: string }> {
    const projectRecord = projectData && typeof projectData === 'object' && !Array.isArray(projectData)
        ? projectData as Record<string, unknown>
        : {};
    const codes: unknown[] = Array.isArray(projectRecord.languages) && projectRecord.languages.length
        ? projectRecord.languages
        : [typeof projectRecord.defaultLanguage === 'string' ? projectRecord.defaultLanguage : 'en'];
    const dedupedCodes: string[] = Array.from(
        new Set(codes
            .filter((code: unknown): code is string => typeof code === 'string')
            .map((code) => code.trim().toLowerCase())
            .filter(Boolean)),
    );
    const languages = dedupedCodes
        .map((code) => GlobalLanguagesList.find((language) => language.code === code) || { code, name: code })
        .map((language) => ({ code: language.code, name: language.name }));

    return languages.length ? languages : [{ code: 'en', name: 'English' }];
}

async function findExistingActiveJob(projectId: string, userId: string): Promise<string | null> {
    const snapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
        .where('projectId', '==', projectId)
        .where('uId', '==', userId)
        .where('status', 'in', ACTIVE_JOB_STATUSES)
        .limit(10)
        .get();

    if (snapshot.empty) return null;

    const sorted = snapshot.docs
        .map((doc) => ({
            id: doc.id,
            createdAt: doc.data()?.createdAt,
        }))
        .sort((left, right) => {
            const leftTime = typeof left.createdAt?.toMillis === 'function' ? left.createdAt.toMillis() : 0;
            const rightTime = typeof right.createdAt?.toMillis === 'function' ? right.createdAt.toMillis() : 0;
            return rightTime - leftTime;
        });

    return sorted[0]?.id || null;
}

function buildDownloadUrl(bucketName: string, storagePath: string, token: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function deleteMenuLinkImportStoragePath(
    storagePath: string,
    context: { cleanupReason: string; projectId: string },
): Promise<boolean> {
    try {
        await storageAdmin.bucket().file(storagePath).delete({ ignoreNotFound: true });
        return true;
    } catch (error) {
        logMenuProcessingFailure(MENU_LINK_IMPORT_STORAGE_CLEANUP_FAILED, error, {
            ...getMenuProcessingProjectLogContext(context.projectId),
            ...getBoundedMenuProcessingStringContext('storagePath', storagePath),
            cleanupReason: context.cleanupReason,
        });
        return false;
    }
}

async function persistMenuLinkImportCleanupRecord(
    artifactRef: DocumentReference,
    artifactData: Record<string, unknown>,
    projectId: string,
): Promise<boolean> {
    try {
        await artifactRef.create(artifactData);
        return true;
    } catch (error) {
        logMenuProcessingFailure('menu_link_import_cleanup_record_failed', error, {
            ...getMenuProcessingProjectLogContext(projectId),
            ...getBoundedMenuProcessingStringContext('artifactId', artifactRef.id),
            cleanupReason: 'storage_delete_failed',
        });
        return false;
    }
}

export const POST = withMenuLinkImportAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 },
        );
    }

    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    const ids = {
        tId: String(session.tId || ''),
        sId: String(session.sId || ''),
        uId: String(session.uId || session.user?.id || ''),
    };

    if (!verifyTenantAccess(session, ids.tId, ids.sId, request)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const userRateLimitHash = hashPublicRateLimitValue(ids.uId);
    const tenantRateLimitHash = hashPublicRateLimitValue(ids.tId);
    const storeRateLimitHash = hashPublicRateLimitValue(ids.sId);
    const rateLimit = await checkRateLimit({
        key: `menu-link-import:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...getRateLimitForFeature('MENU_LINK_IMPORT'),
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        if (rateLimit.reason === 'provider_unavailable') {
            return NextResponse.json(
                { success: false, error: 'Menu link import is temporarily unavailable. Please try again later.' },
                { status: 503 },
            );
        }
        const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        return NextResponse.json(
            { success: false, error: 'Too many import attempts. Please wait before trying again.', retryAfter: waitSeconds },
            { status: 429, headers: { 'Retry-After': String(waitSeconds) } },
        );
    }

    const bodyResult = await readBoundedJsonBody(request, MENU_LINK_IMPORT_MAX_BODY_BYTES);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = RequestSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return NextResponse.json(
            { success: false, error: 'Check the menu link and permission confirmation.' },
            { status: 400 },
        );
    }

    const { projectId, url } = validation.data;
    if (!isMenuExtractionProjectIdInScope(projectId, ids.tId, ids.sId)) {
        return NextResponse.json({ success: false, error: 'Menu does not belong to this store.' }, { status: 403 });
    }

    const permissionResponse = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.USE_MENU_EXTRACTION],
        'Menu extraction',
    );
    if (permissionResponse) return permissionResponse;

    const createdStoragePaths: string[] = [];
    let artifactRef: DocumentReference | null = null;
    let artifactData: Record<string, unknown> | null = null;
    let jobRef: DocumentReference | null = null;
    let persistenceAttempted = false;
    let failureStage = 'project_lookup';

    try {
        const projectRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(ids.tId)
            .collection(ids.sId)
            .doc(projectId);
        const projectDoc = await projectRef.get();

        if (!projectDoc.exists) {
            return NextResponse.json({ success: false, error: 'Menu not found.' }, { status: 404 });
        }

        failureStage = 'active_job_lookup';
        const existingJobId = await findExistingActiveJob(projectId, ids.uId);
        if (existingJobId) {
            return NextResponse.json({
                success: true,
                jobId: existingJobId,
                projectId,
                reusedExistingJob: true,
            });
        }

        const projectData = projectDoc.data() || {};
        const targetLanguages = resolveTargetLanguages(projectData);
        const businessCategory = projectData.businessCategory || projectData.category || null;
        const businessType = projectData.businessType || projectData.type || null;
        failureStage = 'source_acquisition';
        const acquisition = await acquireMenuLinkSource(url, { businessCategory, businessType });
        jobRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS).doc();
        artifactRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_LINK_IMPORT_ARTIFACTS).doc();
        const bucket = storageAdmin.bucket();
        const now = Timestamp.now();
        const storagePath = `menuLinkImports/${ids.tId}/${ids.sId}/${projectId}/${jobRef.id}/source.${acquisition.artifactExtension}`;
        const downloadToken = crypto.randomUUID();

        failureStage = 'storage_write';
        await bucket.file(storagePath).save(acquisition.artifactBuffer, {
            metadata: {
                cacheControl: STORAGE_CACHE_CONTROL.immutablePrivate,
                contentType: acquisition.artifactContentType,
                metadata: {
                    artifactId: artifactRef.id,
                    jobId: jobRef.id,
                    firebaseStorageDownloadTokens: downloadToken,
                    importedAt: new Date().toISOString(),
                },
            },
        });
        createdStoragePaths.push(storagePath);

        const fileName = `Imported menu link.${acquisition.artifactExtension}`;
        const fileUid = `link-${artifactRef.id}`;
        const artifactUrl = buildDownloadUrl(bucket.name, storagePath, downloadToken);

        artifactData = {
            artifactId: artifactRef.id,
            acquisitionProvider: 'direct-http',
            contentHash: acquisition.contentHash,
            contentType: acquisition.artifactContentType,
            createdAt: now,
            finalUrl: acquisition.finalUrl,
            jobId: jobRef.id,
            permissionConfirmed: true,
            projectId,
            redirectCount: acquisition.redirectCount,
            sId: ids.sId,
            size: acquisition.size,
            sourceContentType: acquisition.sourceContentType,
            sourceKind: acquisition.sourceKind,
            sourceTextLength: acquisition.sourceTextLength || 0,
            sourceTextPresent: Boolean(acquisition.sourceTextPresent),
            sourceUrl: url.trim(),
            storagePath,
            tId: ids.tId,
            uId: ids.uId,
        };

        const jobData = {
            action: AI_ACTIONS_TYPES.IMAGE_PROCESSING,
            createdAt: now,
            currentStep: 'Queued',
            ...buildMenuExtractionRoutingFields(buildProjectMenuExtractionDestination(projectId, 'review')),
            files: [{
                uid: fileUid,
                name: fileName,
                size: acquisition.size,
                type: acquisition.artifactContentType,
                url: artifactUrl,
            }],
            forceReview: true,
            jobMode: 'SINGLE_STORE',
            progress: 0,
            projectId,
            ...(businessCategory ? { businessCategory } : {}),
            ...(businessType ? { businessType } : {}),
            sId: ids.sId,
            source: MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT,
            sourceMetadata: {
                acquisitionProvider: 'direct-http',
                artifactId: artifactRef.id,
                finalUrl: acquisition.finalUrl,
                sourceKind: acquisition.sourceKind,
                sourceUrl: url.trim(),
                storagePath,
            },
            status: 'pending',
            tId: ids.tId,
            targetLanguages,
            uId: ids.uId,
            updatedAt: now,
        };
        failureStage = 'job_persistence';
        persistenceAttempted = true;
        const jobCreation = await createOrReuseActiveMenuExtractionJob({
            additionalCreates: [{ data: artifactData, ref: artifactRef }],
            db: firestoreAdmin,
            jobData,
            jobRef,
            projectId,
        });
        if (!jobCreation.created) {
            const storageDeleted = await deleteMenuLinkImportStoragePath(storagePath, {
                cleanupReason: 'concurrent_active_job_reuse',
                projectId,
            });
            if (
                !storageDeleted
                && !(await persistMenuLinkImportCleanupRecord(artifactRef, artifactData, projectId))
            ) {
                throw new Error('menu_link_import_cleanup_untracked');
            }
            createdStoragePaths.length = 0;
            if (String(jobCreation.match.data.uId || '') !== ids.uId) {
                return NextResponse.json(
                    { success: false, error: 'Another menu extraction is already running.' },
                    { status: 409 },
                );
            }
            return NextResponse.json({
                success: true,
                jobId: jobCreation.match.id,
                projectId,
                reusedExistingJob: true,
            });
        }
        logMenuProcessingDiagnostic('menu_link_import_job_created', {
            ...getMenuProcessingProjectLogContext(projectId),
            ...getBoundedMenuProcessingStringContext('artifactId', artifactRef.id),
            ...getBoundedMenuProcessingStringContext('jobId', jobRef.id),
            ...getBoundedMenuProcessingStringContext('sourceKind', acquisition.sourceKind),
        });

        return NextResponse.json({
            success: true,
            jobId: jobRef.id,
            projectId,
        });
    } catch (error) {
        if (error instanceof MenuLinkImportError) {
            logMenuProcessingDiagnostic('menu_link_import_source_rejected', {
                ...getMenuProcessingProjectLogContext(projectId),
                ...getBoundedMenuProcessingStringContext('sourceErrorCode', error.code),
                ...getBoundedMenuProcessingStringContext('failureStage', failureStage),
                sourceStatusCode: error.status,
            });
            return NextResponse.json(
                { success: false, error: getMenuLinkImportClientMessage(error), code: error.code },
                { status: error.status },
            );
        }

        let cleanupDeferred = false;
        if (persistenceAttempted && jobRef && artifactRef) {
            try {
                const [jobSnapshot, artifactSnapshot] = await Promise.all([
                    jobRef.get(),
                    artifactRef.get(),
                ]);
                const committedJob = jobSnapshot.data() || {};
                const committedScopeMatches = jobSnapshot.exists
                    && artifactSnapshot.exists
                    && String(committedJob.projectId || '') === projectId
                    && String(committedJob.tId || '') === ids.tId
                    && String(committedJob.sId || '') === ids.sId
                    && String(committedJob.uId || '') === ids.uId
                    && committedJob.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT;

                if (committedScopeMatches) {
                    logMenuProcessingDiagnostic('menu_link_import_job_recovered_after_ambiguous_persistence', {
                        ...getMenuProcessingProjectLogContext(projectId),
                        ...getBoundedMenuProcessingStringContext('artifactId', artifactRef.id),
                        ...getBoundedMenuProcessingStringContext('jobId', jobRef.id),
                    });
                    return NextResponse.json({
                        success: true,
                        jobId: jobRef.id,
                        projectId,
                    });
                }

                cleanupDeferred = jobSnapshot.exists || artifactSnapshot.exists;
            } catch (probeError) {
                cleanupDeferred = true;
                logMenuProcessingFailure(MENU_LINK_IMPORT_PERSISTENCE_PROBE_FAILED, probeError, {
                    ...getMenuProcessingProjectLogContext(projectId),
                    ...getBoundedMenuProcessingStringContext('artifactId', artifactRef.id),
                    ...getBoundedMenuProcessingStringContext('jobId', jobRef.id),
                    cleanupDeferred: true,
                });
            }
        }

        if (!cleanupDeferred) {
            for (const path of createdStoragePaths) {
                const storageDeleted = await deleteMenuLinkImportStoragePath(path, {
                    cleanupReason: 'job_create_failed',
                    projectId,
                });
                if (
                    !storageDeleted
                    && artifactRef
                    && artifactData
                ) {
                    cleanupDeferred = await persistMenuLinkImportCleanupRecord(
                        artifactRef,
                        artifactData,
                        projectId,
                    );
                }
            }
        }

        logMenuProcessingFailure('menu_link_import_route_failed', error, {
            ...getMenuProcessingProjectLogContext(projectId),
            ...getBoundedMenuProcessingStringContext('failureStage', failureStage),
            cleanupDeferred,
            persistenceAttempted,
            storagePathCount: createdStoragePaths.length,
        });
        return NextResponse.json(
            { success: false, error: 'We could not read this menu link. Upload a photo/PDF or add the menu manually.' },
            { status: 500 },
        );
    }
});
