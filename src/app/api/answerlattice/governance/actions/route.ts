export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeGovernanceActionSchema,
} from '@lib/answerlattice/governanceContracts';
import {
    AnswerlatticeGovernanceError,
    executeAnswerlatticeGovernanceAction,
} from '@lib/answerlattice/governanceServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '../../../../../middleware/auth';

const GOVERNANCE_REQUEST_MAX_BODY_BYTES = 64 * 1024;
const GOVERNANCE_RATE_LIMIT = {
    limit: 60,
    window: 60,
};
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS) {
        return NextResponse.json({ error: 'Canonical answers are not enabled.' }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const userId = session.uId || session.user?.id || 'unknown';
    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-governance-actions',
                userId,
                scope.tenantId,
                scope.storeId,
            ),
            ...GOVERNANCE_RATE_LIMIT,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many governance actions. Please wait before trying again.' },
                { status: 429, headers: NO_STORE_HEADERS },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) return permission.response;
        if (!permission.access) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });
        }

        const bodyResult = await readBoundedJsonBody(request, GOVERNANCE_REQUEST_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid governance request.' },
                { status: bodyResult.response.status, headers: NO_STORE_HEADERS },
            );
        }
        const parsed = AnswerlatticeGovernanceActionSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid governance request.' }, { status: 400, headers: NO_STORE_HEADERS });
        }

        const result = await executeAnswerlatticeGovernanceAction(parsed.data, permission.access);
        return NextResponse.json(result, { headers: NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeGovernanceError) {
            return NextResponse.json(
                { error: error.publicMessage },
                { status: error.status, headers: NO_STORE_HEADERS },
            );
        }
        logRuntimeFailure('answerlattice_governance_action_failed', error, {
            endpoint: '/api/answerlattice/governance/actions',
            hasTenantScope: Boolean(scope.tenantId),
            hasStoreScope: Boolean(scope.storeId),
            hasUserId: Boolean(userId),
        });
        return NextResponse.json(
            { error: 'The governance action could not be completed.' },
            { status: 500, headers: NO_STORE_HEADERS },
        );
    }
});
