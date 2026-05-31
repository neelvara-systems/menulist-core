export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { rebuildProductSurfaceContentSummaryServer } from '@lib/answerlattice/productSurfaceContentServer';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const RebuildRequestSchema = z.object({
    reason: z.string().trim().max(80).optional().default('manual'),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
        return NextResponse.json({ error: 'Answerlattice product surfaces are not enabled.' }, { status: 404 });
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
    if (permission.response) return permission.response;

    const scope = resolveAnswerlatticeSessionScope(session);
    const tenantId = Number(scope?.tenantId);
    const storeId = Number(scope?.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return NextResponse.json({ error: 'Answerlattice workspace is not available.' }, { status: 400 });
    }

    try {
        const rateLimit = await checkRateLimit({
            key: `answerlattice-product-surfaces:summary:${tenantId}:${storeId}`,
            limit: 12,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: 'Too many rebuild requests.' }, { status: 429 });
        }

        const body = await request.json().catch(() => ({}));
        const parsed = RebuildRequestSchema.parse(body);
        const summary = await rebuildProductSurfaceContentSummaryServer({
            tId: tenantId,
            sId: storeId,
            reason: parsed.reason,
        });

        secureLog('[Answerlattice Product Surfaces] Context summary rebuilt', {
            reason: parsed.reason,
            storeId,
            surfaceCount: summary.surfaceCount,
            tenantId,
        });

        return NextResponse.json({ summary });
    } catch (error) {
        secureError('[Answerlattice Product Surfaces] Failed to rebuild context summary', error as Error, {
            storeId,
            tenantId,
        });
        return NextResponse.json({ error: 'Failed to rebuild product surface summary.' }, { status: 500 });
    }
});
