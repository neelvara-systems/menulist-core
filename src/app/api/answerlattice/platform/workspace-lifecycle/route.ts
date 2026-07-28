export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { getCurrentPlatformUser, resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { getUniqueAuthUserByEmailFromCollection } from '@lib/auth/serverUserContext';
import { isCurrentAnswerlatticePlatformWorkspaceOperator } from '@lib/answerlattice/platformWorkspaceOptions';
import {
    ANSWERLATTICE_WORKSPACE_LIFECYCLE_MAX_BODY_BYTES,
    answerlatticeWorkspaceLifecycleRequestSchema,
} from '@lib/answerlattice/workspaceLifecycleContracts';
import {
    AnswerlatticeWorkspaceLifecycleError,
    executeAnswerlatticeWorkspaceLifecycle,
} from '@lib/answerlattice/workspaceLifecycleServer';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withPlatformAuth } from '../../../../../middleware/auth';

const PRIVATE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

const response = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
    ...init,
    headers: {
        ...PRIVATE_HEADERS,
        ...(init.headers || {}),
    },
});

export const POST = withPlatformAuth(async (request: NextRequest, session: any) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WORKSPACE_LIFECYCLE) {
        return response({ error: 'Not found' }, { status: 404 });
    }
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) {
        return response({ error: 'Origin not allowed' }, { status: 403 });
    }

    const operatorId = resolveCurrentSessionUserDocumentId(session);
    if (!operatorId) {
        return response({ error: 'Forbidden' }, { status: 403 });
    }
    const rateLimit = await checkRateLimit({
        key: `answerlattice-workspace-lifecycle:${hashPublicRateLimitValue(operatorId)}`,
        ...getRateLimitForFeature('DATA_WRITE'),
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        return response(
            {
                error: rateLimit.reason === 'provider_unavailable'
                    ? 'Workspace lifecycle is temporarily unavailable'
                    : 'Too many requests',
            },
            {
                status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
                headers: { 'Retry-After': String(retryAfter) },
            },
        );
    }

    const email = String(session?.user?.email || '').toLowerCase().trim();
    const currentPlatformUser = await getCurrentPlatformUser(session);
    const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore | null;
    if (!currentPlatformUser || !email || !db || typeof db.collection !== 'function') {
        return response({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const answerlatticeUser = await getUniqueAuthUserByEmailFromCollection(
            db.collection(DB_COLLECTIONS.USERS),
            email,
        );
        if (!isCurrentAnswerlatticePlatformWorkspaceOperator(answerlatticeUser, email)) {
            logger.security('Authorization Failed - Answerlattice Workspace Lifecycle', {
                ...getBoundedSecurityRouteContext(session, request),
            }, 'critical');
            return response({ error: 'Forbidden' }, { status: 403 });
        }

        const bodyResult = await readBoundedJsonBody(
            request,
            ANSWERLATTICE_WORKSPACE_LIFECYCLE_MAX_BODY_BYTES,
            {
                invalidJsonMessage: 'Invalid workspace lifecycle request',
                tooLargeMessage: 'Workspace lifecycle request is too large',
            },
        );
        if (bodyResult.ok === false) {
            Object.entries(PRIVATE_HEADERS).forEach(([key, value]) => {
                bodyResult.response.headers.set(key, value);
            });
            return bodyResult.response;
        }
        const parsed = answerlatticeWorkspaceLifecycleRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return response({ error: 'Invalid workspace lifecycle request' }, { status: 400 });
        }

        const result = await executeAnswerlatticeWorkspaceLifecycle({
            actorId: String(answerlatticeUser?.id || operatorId),
            request: parsed.data,
        });
        return response({ result });
    } catch (error) {
        if (error instanceof AnswerlatticeWorkspaceLifecycleError) {
            logger.security('Answerlattice Workspace Lifecycle Rejected', {
                ...getBoundedSecurityRouteContext(session, request),
                failureCode: error.code.slice(0, 180),
            }, error.status >= 500 ? 'critical' : 'high');
            return response(
                {
                    code: error.code,
                    error: 'Workspace lifecycle request could not be completed',
                },
                { status: error.status },
            );
        }
        logger.error('Answerlattice workspace lifecycle failed', {
            ...getBoundedSecurityRouteContext(session, request),
            failureCode: 'answerlattice_workspace_lifecycle_failed',
            sourceErrorName: getBoundedErrorName(error) || typeof error,
        });
        return response(
            { error: 'Workspace lifecycle request could not be completed' },
            { status: 500 },
        );
    }
});
