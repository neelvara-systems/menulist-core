export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { parseAnswerlatticeReleaseAction } from '@lib/answerlattice/releaseContracts';
import {
    AnswerlatticeReleaseError,
    executeAnswerlatticeReleaseAction,
} from '@lib/answerlattice/releaseServer';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const RELEASE_REQUEST_MAX_BODY_BYTES = 32 * 1024;
const RELEASE_RATE_LIMIT = { limit: 30, window: 60 };
const NO_STORE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-releases', userId, scope.tenantId, scope.storeId),
            ...RELEASE_RATE_LIMIT,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Release actions are temporarily unavailable. Please try again later.'
                        : 'Too many release actions. Please wait before trying again.',
                },
                { status: providerUnavailable ? 503 : 429, headers: NO_STORE_HEADERS },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE,
        );
        if (permission.response) return permission.response;
        if (!permission.access) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
        }

        const body = await readBoundedJsonBody(request, RELEASE_REQUEST_MAX_BODY_BYTES);
        if (body.ok === false) {
            return NextResponse.json(
                { error: 'Invalid release request.' },
                { status: body.response.status, headers: NO_STORE_HEADERS },
            );
        }
        const parsed = parseAnswerlatticeReleaseAction(body.data);
        if (!parsed) {
            return NextResponse.json({ error: 'Invalid release request.' }, { status: 400, headers: NO_STORE_HEADERS });
        }

        const result = await executeAnswerlatticeReleaseAction(parsed, permission.access);
        return NextResponse.json(result, { headers: NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeReleaseError) {
            return NextResponse.json(
                { error: error.publicMessage, code: error.code },
                { status: error.status, headers: NO_STORE_HEADERS },
            );
        }
        logRuntimeFailure('answerlattice_release_action_failed', error, {
            endpoint: '/api/answerlattice/releases',
            hasTenantScope: true,
            hasStoreScope: true,
            hasUserId: Boolean(userId),
        });
        return NextResponse.json(
            { error: 'The release action could not be completed.' },
            { status: 500, headers: NO_STORE_HEADERS },
        );
    }
});
