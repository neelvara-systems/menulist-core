export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { getCurrentPlatformUser, resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { getUniqueAuthUserByEmailFromCollection } from '@lib/auth/serverUserContext';
import {
    buildAnswerlatticePlatformWorkspaceOptions,
    isCurrentAnswerlatticePlatformWorkspaceOperator,
} from '@lib/answerlattice/platformWorkspaceOptions';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withPlatformAuth } from '../../../../../middleware/auth';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

export const GET = withPlatformAuth(async (request: NextRequest, session: any) => {
    const operatorId = resolveCurrentSessionUserDocumentId(session);
    if (!operatorId) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    const rateLimit = await checkRateLimit({
        key: `answerlattice-platform-workspaces:${hashPublicRateLimitValue(operatorId)}`,
        ...getRateLimitForFeature('DATA_READ'),
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        return NextResponse.json(
            { error: rateLimit.reason === 'provider_unavailable' ? 'Workspace access is temporarily unavailable' : 'Too many requests' },
            {
                status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
                headers: { 'Cache-Control': 'private, no-store', 'Retry-After': String(retryAfter) },
            },
        );
    }

    const email = String(session?.user?.email || '').toLowerCase().trim();
    const currentPlatformUser = await getCurrentPlatformUser(session);
    const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore | null;
    if (!currentPlatformUser || !email || !db || typeof db.collection !== 'function') {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }

    try {
        const answerlatticeUser = await getUniqueAuthUserByEmailFromCollection(
            db.collection(DB_COLLECTIONS.USERS),
            email,
        );
        if (!isCurrentAnswerlatticePlatformWorkspaceOperator(answerlatticeUser, email)) {
            logger.security('Authorization Failed - Answerlattice Platform Workspaces', {
                ...getBoundedSecurityRouteContext(session, request),
            }, 'high');
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
            );
        }

        const summarySnapshot = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get();
        const workspaces = buildAnswerlatticePlatformWorkspaceOptions(
            summarySnapshot.exists ? summarySnapshot.data() : null,
        );
        return NextResponse.json(
            { workspaces },
            { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } },
        );
    } catch (error) {
        logger.error('Answerlattice platform workspace list failed', {
            ...getBoundedSecurityRouteContext(session, request),
            failureCode: 'answerlattice_platform_workspaces_load_failed',
            sourceErrorName: getBoundedErrorName(error) || typeof error,
        });
        return NextResponse.json(
            { error: 'Could not load workspaces' },
            { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
});
