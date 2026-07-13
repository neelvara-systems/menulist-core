export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { AnswerlatticeOntologyActionSchema } from '@lib/answerlattice/ontologyContracts';
import {
    AnswerlatticeOntologyError,
    executeAnswerlatticeOntologyAction,
} from '@lib/answerlattice/ontologyServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const ONTOLOGY_REQUEST_MAX_BODY_BYTES = 32 * 1024;
const ONTOLOGY_RATE_LIMIT = { limit: 60, window: 60 };
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };

export const POST = withAuth(async (request: NextRequest, session) => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400, headers: NO_STORE_HEADERS });
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ONTOLOGY) {
        return NextResponse.json({ error: 'Product structure is not enabled.' }, { status: 403, headers: NO_STORE_HEADERS });
    }
    const userId = String(session.uId || session.user?.id || 'unknown');
    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-ontology', userId, scope.tenantId, scope.storeId),
            ...ONTOLOGY_RATE_LIMIT,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many product-structure changes. Please wait before trying again.' },
                { status: 429, headers: NO_STORE_HEADERS },
            );
        }
        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) return permission.response;
        if (!permission.access) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS });

        const body = await readBoundedJsonBody(request, ONTOLOGY_REQUEST_MAX_BODY_BYTES);
        if (body.ok === false) {
            return NextResponse.json({ error: 'Invalid product-structure request.' }, { status: body.response.status, headers: NO_STORE_HEADERS });
        }
        const parsed = AnswerlatticeOntologyActionSchema.safeParse(body.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid product-structure request.' }, { status: 400, headers: NO_STORE_HEADERS });
        }
        const result = await executeAnswerlatticeOntologyAction(parsed.data, permission.access);
        return NextResponse.json(result, { headers: NO_STORE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticeOntologyError) {
            return NextResponse.json({ error: error.publicMessage }, { status: error.status, headers: NO_STORE_HEADERS });
        }
        logRuntimeFailure('answerlattice_ontology_action_failed', error, {
            endpoint: '/api/answerlattice/ontology',
            hasTenantScope: true,
            hasStoreScope: true,
            hasUserId: userId !== 'unknown',
        });
        return NextResponse.json({ error: 'The product-structure change could not be completed.' }, { status: 500, headers: NO_STORE_HEADERS });
    }
});
