export const dynamic = 'force-dynamic';

/**
 * Answerlattice Tenant Summary Sync
 *
 * Server-side companion for client-side entity creation. The nightly scheduler
 * discovers tenants from platformSummary/answerlatticeTenantsSummary, which is a
 * platform summary document and must stay server-written.
 */

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { upsertAnswerlatticeTenantSummaryAdmin } from '@lib/answerlattice/tenantSummaryAdmin';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const TenantSummarySyncSchema = z.object({
    tId: z.coerce.number().int().positive(),
    sId: z.coerce.number().int().positive(),
    hasEntities: z.boolean().optional().default(true),
    source: z.enum(['entity_created', 'candidate_promoted']).optional().default('entity_created'),
});

const getSessionScope = (session: any) => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    const tenantId = Number(answerlatticeScope?.tenantId);
    const storeId = Number(answerlatticeScope?.storeId);
    const platformRole = String(session?.platformRole ?? session?.user?.platformRole ?? '').toUpperCase();

    return {
        tenantId: Number.isFinite(tenantId) ? tenantId : null,
        storeId: Number.isFinite(storeId) ? storeId : null,
        isPlatform: platformRole === 'PLATFORM',
        userKey: String(session?.user?.id || session?.user?.email || 'unknown'),
    };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const body = await request.json().catch(() => null);
    const parsed = TenantSummarySyncSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid tenant summary payload' }, { status: 400 });
    }

    const scope = getSessionScope(session);
    if (
        !scope.isPlatform
        && (scope.tenantId !== parsed.data.tId || scope.storeId !== parsed.data.sId)
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!scope.isPlatform) {
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return permission.response;
    }

    const rateLimit = await checkRateLimit({
        key: `answerlattice-tenant-summary:${scope.userKey}`,
        limit: 30,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const result = await upsertAnswerlatticeTenantSummaryAdmin({
            tId: parsed.data.tId,
            sId: parsed.data.sId,
            source: parsed.data.source,
            hasEntities: parsed.data.hasEntities,
        });

        secureLog('[Answerlattice Tenant Summary] Synced tenant registry', {
            tId: parsed.data.tId,
            sId: parsed.data.sId,
            source: parsed.data.source,
            skipped: result.skipped,
        });

        return NextResponse.json({ success: true, skipped: result.skipped });
    } catch (error) {
        secureError('[Answerlattice Tenant Summary] Sync failed', error as Error, {
            tId: parsed.data.tId,
            sId: parsed.data.sId,
        });
        return NextResponse.json({ error: 'Failed to sync Answerlattice tenant summary' }, { status: 500 });
    }
});
