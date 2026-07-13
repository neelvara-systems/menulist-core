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
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const AnswerlatticeScopeIdSchema = z.preprocess(
    (value) => normalizeAnswerlatticeScopeDocumentId(value) ?? undefined,
    z.number().int().positive(),
);
const TenantSummarySyncSchema = z.object({
    tId: AnswerlatticeScopeIdSchema,
    sId: AnswerlatticeScopeIdSchema,
    hasEntities: z.boolean().optional().default(true),
    source: z.enum(['entity_created', 'candidate_promoted']).optional().default('entity_created'),
}).strict();
const TENANT_SUMMARY_SYNC_MAX_BODY_BYTES = 2 * 1024;

const getSessionScope = (session: any) => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    const platformRole = String(session?.platformRole ?? session?.user?.platformRole ?? '').toUpperCase();

    return {
        tenantId: answerlatticeScope?.tenantId ?? null,
        storeId: answerlatticeScope?.storeId ?? null,
        isPlatform: platformRole === 'PLATFORM',
        userKey: hashPublicRateLimitValue(session?.user?.id || session?.user?.email || 'unknown'),
    };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const bodyResult = await readBoundedJsonBody(request, TENANT_SUMMARY_SYNC_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid tenant summary payload',
        tooLargeMessage: 'Request body too large',
    });
    if (bodyResult.ok === false) {
        return NextResponse.json(
            { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid tenant summary payload' },
            { status: bodyResult.response.status },
        );
    }

    const parsed = TenantSummarySyncSchema.safeParse(bodyResult.data);
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
        key: `answerlattice-tenant-summary:${scope.userKey}`,
        limit: 30,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!scope.isPlatform) {
        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return permission.response;
    }

    try {
        const result = await upsertAnswerlatticeTenantSummaryAdmin({
            tId: parsed.data.tId,
            sId: parsed.data.sId,
            source: parsed.data.source,
            active: true,
            hasEntities: parsed.data.hasEntities,
        });

        logRuntimeDiagnostic('answerlattice_tenant_summary_synced', {
            ...getBoundedRuntimeStringContext('tenantId', parsed.data.tId),
            ...getBoundedRuntimeStringContext('storeId', parsed.data.sId),
            source: parsed.data.source,
            skipped: result.skipped,
        });

        return NextResponse.json({ success: true, skipped: result.skipped });
    } catch (error) {
        logRuntimeFailure('answerlattice_tenant_summary_sync_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', parsed.data.tId),
            ...getBoundedRuntimeStringContext('storeId', parsed.data.sId),
            ...getBoundedRuntimeStringContext('source', parsed.data.source),
        });
        return NextResponse.json({ error: 'Failed to sync Answerlattice tenant summary' }, { status: 500 });
    }
});
