export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import GlobalLanguagesList from '@data/languages';
import { firestoreAdmin, storageAdmin } from '@lib/firebase/firebaseAdmin';
import { acquireMenuLinkSource, MenuLinkImportError } from '@lib/menu-link-import/sourceAcquisition';
import { checkSafeMode } from '@lib/ops/safeMode';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from 'src/middleware/auth';
import { z } from 'zod';

const RequestSchema = z.object({
    projectId: z.string().min(3).max(160),
    url: z.string().min(8).max(4000),
    permissionConfirmed: z.literal(true),
});

const ACTIVE_JOB_STATUSES = ['pending', 'processing', 'preview_ready'];

function resolveTargetLanguages(projectData: any): Array<{ code: string; name: string }> {
    const codes = Array.isArray(projectData?.languages) && projectData.languages.length
        ? projectData.languages
        : [projectData?.defaultLanguage || 'en'];
    const dedupedCodes: string[] = Array.from(
        new Set(codes.map((code: unknown) => String(code || '').trim().toLowerCase()).filter(Boolean)),
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

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT) {
        return NextResponse.json(
            { success: false, error: 'This feature is not available.' },
            { status: 404 },
        );
    }

    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { success: false, error: 'Check the menu link and permission confirmation.' },
            { status: 400 },
        );
    }

    const ids = {
        tId: String(session.tId || ''),
        sId: String(session.sId || ''),
        uId: String(session.uId || session.user?.id || ''),
    };

    if (!verifyTenantAccess(session, ids.tId, ids.sId, request)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit({
        key: `menu-link-import:${ids.uId}:${ids.tId}:${ids.sId}`,
        ...getRateLimitForFeature('MENU_LINK_IMPORT'),
    });
    if (!rateLimit.allowed) {
        const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        return NextResponse.json(
            { success: false, error: 'Too many import attempts. Please wait before trying again.', retryAfter: waitSeconds },
            { status: 429, headers: { 'Retry-After': String(waitSeconds) } },
        );
    }

    const { projectId, url } = validation.data;
    const createdStoragePaths: string[] = [];
    let artifactRefForCleanup: FirebaseFirestore.DocumentReference | null = null;
    let artifactDocCreated = false;
    let jobDocCreated = false;

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

        const existingJobId = await findExistingActiveJob(projectId, ids.uId);
        if (existingJobId) {
            return NextResponse.json({
                success: true,
                jobId: existingJobId,
                projectId,
                reusedExistingJob: true,
            });
        }

        const acquisition = await acquireMenuLinkSource(url);
        const jobRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS).doc();
        const artifactRef = firestoreAdmin.collection(DB_COLLECTIONS.MENU_LINK_IMPORT_ARTIFACTS).doc();
        artifactRefForCleanup = artifactRef;
        const bucket = storageAdmin.bucket();
        const now = Timestamp.now();
        const storagePath = `menuLinkImports/${ids.tId}/${ids.sId}/${projectId}/${jobRef.id}/source.${acquisition.artifactExtension}`;
        const downloadToken = crypto.randomUUID();

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
        const projectData = projectDoc.data() || {};
        const targetLanguages = resolveTargetLanguages(projectData);
        const businessCategory = projectData.businessCategory || projectData.category || null;
        const businessType = projectData.businessType || projectData.type || null;

        await artifactRef.set({
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
            sourceTextPreview: acquisition.sourceTextPreview || null,
            sourceUrl: url.trim(),
            storagePath,
            tId: ids.tId,
            uId: ids.uId,
        });
        artifactDocCreated = true;

        await jobRef.set({
            action: AI_ACTIONS_TYPES.IMAGE_PROCESSING,
            createdAt: now,
            currentStep: 'Queued',
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
            source: 'menu_link_import',
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
        });
        jobDocCreated = true;

        secureLog('[MenuLinkImport] Job created', {
            artifactId: artifactRef.id,
            jobId: jobRef.id,
            projectId,
            sourceKind: acquisition.sourceKind,
        });

        return NextResponse.json({
            success: true,
            jobId: jobRef.id,
            projectId,
        });
    } catch (error) {
        if (error instanceof MenuLinkImportError) {
            secureLog('[MenuLinkImport] Source rejected', {
                code: error.code,
                projectId,
                status: error.status,
            });
            return NextResponse.json(
                { success: false, error: error.message, code: error.code },
                { status: error.status },
            );
        }

        if (!jobDocCreated) {
            await Promise.allSettled(createdStoragePaths.map((path) => storageAdmin.bucket().file(path).delete({ ignoreNotFound: true })));
            if (artifactDocCreated && artifactRefForCleanup) {
                await artifactRefForCleanup.delete().catch(() => undefined);
            }
        }

        secureError('[MenuLinkImport] Import failed', error as Error, { projectId });
        return NextResponse.json(
            { success: false, error: 'We could not read this menu link. Upload a photo/PDF or add the menu manually.' },
            { status: 500 },
        );
    }
});
