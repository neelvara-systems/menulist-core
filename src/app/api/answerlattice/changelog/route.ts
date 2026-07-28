export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeChangelogError,
    executeAnswerlatticeChangelogAction,
} from '@lib/answerlattice/changelogServer';
import { parseAnswerlatticeChangelogAction } from '@lib/answerlattice/changelogContracts';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const CHANGELOG_MAX_BODY_BYTES = 768 * 1024;
const CHANGELOG_RATE_LIMIT = { limit: 30, window: 60 };
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: NO_STORE_HEADERS });
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-changelog', userId, scope.tenantId, scope.storeId),
            ...CHANGELOG_RATE_LIMIT,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Changelog actions are temporarily unavailable. Please try again later.'
                        : 'Too many changelog actions. Please wait before trying again.',
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
        if (!permission.access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });

        const body = await readBoundedJsonBody(request, CHANGELOG_MAX_BODY_BYTES);
        if (body.ok === false) {
            return NextResponse.json(
                { error: 'Invalid changelog request.' },
                { status: body.response.status, headers: NO_STORE_HEADERS },
            );
        }
        const action = parseAnswerlatticeChangelogAction(body.data);
        if (!action) return NextResponse.json({ error: 'Invalid changelog request.' }, { status: 400, headers: NO_STORE_HEADERS });

        const result = await executeAnswerlatticeChangelogAction(action, permission.access);
        return NextResponse.json(result, { headers: NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeChangelogError) {
            return NextResponse.json({ error: error.publicMessage }, { status: error.status, headers: NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_changelog_action_failed', error, {
            endpoint: '/api/answerlattice/changelog',
            hasTenantScope: true,
            hasStoreScope: true,
            hasUserId: Boolean(userId),
        });
        return NextResponse.json(
            { error: 'The changelog action could not be completed.' },
            { status: 500, headers: NO_STORE_HEADERS },
        );
    }
});
