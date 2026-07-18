export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DB_COLLECTIONS } from '@constant/database';
import {
    buildMenuExtractionRoutingFields,
    buildProjectMenuExtractionDestination,
} from '@data/shared/menuExtractionJob';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { normalizeMenuExtractionJobId } from '@lib/menu-extraction/jobIdBoundary';
import { createOrReuseActiveMenuExtractionJob } from '@lib/menu-extraction/activeJobClaim';
import { checkSafeMode } from '@lib/ops/safeMode';
import {
    isPlatformExtractionRetryFileUrlAllowed,
    normalizePlatformExtractionRetrySource,
} from '@lib/ops/extractionRetryBoundary';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { logger } from '@lib/monitoring/logger';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from 'src/middleware/auth';

export const POST = withAuth(async (request, session, params) => {
    const jobId = normalizeMenuExtractionJobId(params?.jobId);
    if (!jobId) {
        logger.security('Extraction retry input validation failed', {
            ...getBoundedSecurityRouteContext(session, request),
        }, 'medium');
        return NextResponse.json({ error: 'Invalid retry request' }, { status: 400 });
    }

    const operatorId = String(session?.uId || session?.user?.id || 'platform');
    const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
    const rateLimit = await checkRateLimit({
        key: `ops-extraction-retry:${hashPublicRateLimitValue(operatorId)}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        logger.security('Extraction retry rate limited', {
            ...getBoundedSecurityRouteContext(session, request),
        }, 'medium');
        return NextResponse.json(
            { error: 'Retry is temporarily unavailable', retryAfter },
            { status: rateLimit.reason === 'provider_unavailable' ? 503 : 429, headers: { 'Retry-After': String(retryAfter) } },
        );
    }

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
        logger.security('Authorization Failed - Extraction Retry Current Platform Role', {
            ...getBoundedSecurityRouteContext(session, request),
        }, 'high');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    try {
        const originalSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS)
            .doc(jobId)
            .get();
        const source = originalSnapshot.exists
            ? normalizePlatformExtractionRetrySource(originalSnapshot.data())
            : null;
        if (!source) {
            return NextResponse.json({ error: 'Extraction retry is not available' }, { status: 409 });
        }

        const urlsAllowed = source.files.every((file) => isPlatformExtractionRetryFileUrlAllowed(
            file.url,
            source.source,
            source,
            process.env.NODE_ENV !== 'production',
        ));
        if (!urlsAllowed) {
            logger.security('Extraction retry source ownership validation failed', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedOpsStringContext('jobId', jobId),
                ...getBoundedOpsStringContext('tenantId', source.tId),
                ...getBoundedOpsStringContext('storeId', source.sId),
            }, 'high');
            return NextResponse.json({ error: 'Extraction retry is not available' }, { status: 409 });
        }

        // This is an intentional platform-wide recovery route. The current
        // PLATFORM user record is re-read above; tenant identity comes only
        // from the server-owned original job and is verified against the
        // canonical nested project path before any cross-tenant write.
        const projectSnapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.PROJECTS)
            .doc(source.tId)
            .collection(source.sId)
            .doc(source.projectId)
            .get();
        if (!projectSnapshot.exists) {
            return NextResponse.json({ error: 'Extraction retry is not available' }, { status: 409 });
        }

        const now = Timestamp.now();
        const jobData = sanitizeForFirestore({
            action: source.action,
            ...buildMenuExtractionRoutingFields(buildProjectMenuExtractionDestination(
                source.projectId,
                source.forceReview ? 'review' : 'auto_or_review',
            )),
            ...(source.businessCategory ? { businessCategory: source.businessCategory } : {}),
            ...(source.businessType ? { businessType: source.businessType } : {}),
            createdAt: now,
            currentStep: 'Queued',
            files: source.files,
            forceReview: source.forceReview,
            jobMode: source.jobMode,
            progress: 0,
            projectId: source.projectId,
            retriedFromJobId: jobId,
            retryCount: source.retryCount + 1,
            sId: source.sId,
            source: source.source,
            status: 'pending',
            tId: source.tId,
            targetLanguages: source.targetLanguages,
            uId: source.uId,
            updatedAt: now,
        }, { undefinedObjectValue: 'omit' });
        const creation = await createOrReuseActiveMenuExtractionJob({
            db: firestoreAdmin,
            jobData,
            projectId: source.projectId,
        });
        if (!creation.created) {
            return NextResponse.json({ error: 'Another extraction is already running' }, { status: 409 });
        }

        logger.security('Extraction retry created', {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedOpsStringContext('originalJobId', jobId),
            ...getBoundedOpsStringContext('replacementJobId', creation.match.id),
            ...getBoundedOpsStringContext('tenantId', source.tId),
            ...getBoundedOpsStringContext('storeId', source.sId),
            ...getBoundedOpsStringContext('projectId', source.projectId),
            retryCount: source.retryCount + 1,
        }, 'low');
        return NextResponse.json({ success: true, jobId: creation.match.id });
    } catch (error) {
        logOpsFailure('extraction_platform_retry_failed', error, {
            ...getBoundedOpsStringContext('jobId', jobId),
            ...getBoundedOpsStringContext('operatorId', currentPlatformUser.documentId),
        });
        return NextResponse.json({ error: 'Extraction retry failed' }, { status: 500 });
    }
}, { requiredPlatformRole: 'PLATFORM' });
