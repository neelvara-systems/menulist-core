export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { rebuildProductSurfaceContentSummaryServer } from '@lib/canonica/productSurfaceContentServer';
import { canUseCanonicaManagement, resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const RebuildRequestSchema = z.object({
    reason: z.string().trim().max(80).optional().default('manual'),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_PRODUCT_SURFACES) {
        return NextResponse.json({ error: 'Canonica product surfaces are not enabled.' }, { status: 404 });
    }

    if (!canUseCanonicaManagement(session)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const scope = resolveCanonicaSessionScope(session) || {
        tenantId: Number(session?.tId || session?.user?.tenantId),
        storeId: Number(session?.sId || session?.user?.storeId),
    };
    const tenantId = Number(scope?.tenantId);
    const storeId = Number(scope?.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
        return NextResponse.json({ error: 'Canonica workspace is not available.' }, { status: 400 });
    }

    try {
        const rateLimit = await checkRateLimit({
            key: `canonica-product-surfaces:summary:${tenantId}:${storeId}`,
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

        secureLog('[Canonica Product Surfaces] Context summary rebuilt', {
            reason: parsed.reason,
            storeId,
            surfaceCount: summary.surfaceCount,
            tenantId,
        });

        return NextResponse.json({ summary });
    } catch (error) {
        secureError('[Canonica Product Surfaces] Failed to rebuild context summary', error as Error, {
            storeId,
            tenantId,
        });
        return NextResponse.json({ error: 'Failed to rebuild product surface summary.' }, { status: 500 });
    }
});
