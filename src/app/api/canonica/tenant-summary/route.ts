export const dynamic = 'force-dynamic';

/**
 * Canonica Tenant Summary Sync
 *
 * Server-side companion for client-side entity creation. The nightly scheduler
 * discovers tenants from platformSummary/canonicaTenantsSummary, which is a
 * platform summary document and must stay server-written.
 */

import { upsertCanonicaTenantSummaryAdmin } from '@lib/canonica/tenantSummaryAdmin';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
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
    const canonicaScope = resolveCanonicaSessionScope(session);
    const tenantId = Number(canonicaScope?.tenantId);
    const storeId = Number(canonicaScope?.storeId);
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

    const rateLimit = await checkRateLimit({
        key: `canonica-tenant-summary:${scope.userKey}`,
        limit: 30,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    try {
        const result = await upsertCanonicaTenantSummaryAdmin({
            tId: parsed.data.tId,
            sId: parsed.data.sId,
            source: parsed.data.source,
            hasEntities: parsed.data.hasEntities,
        });

        secureLog('[Canonica Tenant Summary] Synced tenant registry', {
            tId: parsed.data.tId,
            sId: parsed.data.sId,
            source: parsed.data.source,
            skipped: result.skipped,
        });

        return NextResponse.json({ success: true, skipped: result.skipped });
    } catch (error) {
        secureError('[Canonica Tenant Summary] Sync failed', error as Error, {
            tId: parsed.data.tId,
            sId: parsed.data.sId,
        });
        return NextResponse.json({ error: 'Failed to sync Canonica tenant summary' }, { status: 500 });
    }
});
