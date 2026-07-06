export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { rebuildProductSurfaceContentSummaryServer } from '@lib/answerlattice/productSurfaceContentServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const PRODUCT_SURFACE_SUMMARY_REBUILD_REASON_CODES = ['manual'] as const;
const RebuildRequestSchema = z.object({
    reason: z.enum(PRODUCT_SURFACE_SUMMARY_REBUILD_REASON_CODES).optional().default('manual'),
});
const PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES = 2 * 1024;

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
        return NextResponse.json({ error: 'Answerlattice product surfaces are not enabled.' }, { status: 404 });
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    const tenantId = Number(scope?.tenantId);
    const storeId = Number(scope?.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available.' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey('answerlattice-product-surfaces:summary', tenantId, storeId),
        limit: 12,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many rebuild requests.' }, { status: 429 });
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
    if (permission.response) return permission.response;

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid rebuild request.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid rebuild request.' },
                { status: bodyResult.response.status },
            );
        }

        const parsedResult = RebuildRequestSchema.safeParse(bodyResult.data);
        if (!parsedResult.success) {
            return NextResponse.json({ error: 'Invalid rebuild request.' }, { status: 400 });
        }
        const parsed = parsedResult.data;
        const summary = await rebuildProductSurfaceContentSummaryServer({
            tId: tenantId,
            sId: storeId,
            reason: parsed.reason,
        });

        logRuntimeDiagnostic('answerlattice_product_surface_summary_rebuilt', {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
            ...getBoundedRuntimeStringContext('reason', parsed.reason),
            surfaceCount: summary.surfaceCount,
        });

        return NextResponse.json({ summary });
    } catch (error) {
        logRuntimeFailure('answerlattice_product_surface_summary_rebuild_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
        return NextResponse.json({ error: 'Failed to rebuild product surface summary.' }, { status: 500 });
    }
});
