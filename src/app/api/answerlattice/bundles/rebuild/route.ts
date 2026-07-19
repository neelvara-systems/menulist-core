export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeContextBundleServer } from '@lib/answerlattice/contextBundleBuilderServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const BUNDLE_REBUILD_REASON_CODES = ['manual', 'activation_manual_rebuild'] as const;
const RebuildRequestSchema = z.object({
    reason: z.enum(BUNDLE_REBUILD_REASON_CODES).optional().default('manual'),
    force: z.boolean().optional().default(false),
}).strict();
const BUNDLE_REBUILD_MAX_BODY_BYTES = 2 * 1024;
const ANSWERLATTICE_BUNDLE_REBUILD_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
} as const;

const bundleRebuildJson = (
    body: Record<string, unknown>,
    status = 200,
): NextResponse => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_BUNDLE_REBUILD_RESPONSE_HEADERS,
});

const withBundleRebuildHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_BUNDLE_REBUILD_RESPONSE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_BUNDLE_BUILDER) {
        return bundleRebuildJson({ error: 'Compiled context bundles are not enabled.' }, 404);
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
        return bundleRebuildJson({ error: 'Answerlattice workspace is not available.' }, 400);
    }
    const { tenantId, storeId } = scope;

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey('answerlattice-context-bundle:rebuild', tenantId, storeId),
        limit: 4,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return bundleRebuildJson({ error: 'Too many rebuild requests.' }, 429);
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.REBUILD_CONTEXT);
    if (permission.response) return withBundleRebuildHeaders(permission.response);

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, BUNDLE_REBUILD_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid rebuild request.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return bundleRebuildJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid rebuild request.' },
                bodyResult.response.status,
            );
        }

        const parsedResult = RebuildRequestSchema.safeParse(bodyResult.data);
        if (!parsedResult.success) {
            return bundleRebuildJson({ error: 'Invalid rebuild request.' }, 400);
        }
        const parsed = parsedResult.data;
        const manifest = await buildAnswerlatticeContextBundleServer({
            tId: tenantId,
            sId: storeId,
            reason: parsed.reason,
            requestedBy: 'owner',
            force: parsed.force,
        });

        logRuntimeDiagnostic('answerlattice_context_bundle_manual_rebuild_completed', {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
            status: manifest.status,
            bundleVersion: manifest.bundleVersion,
            bytesTotal: manifest.stats?.bytesTotal || 0,
        });

        return bundleRebuildJson({
            ok: manifest.status === 'ready',
            manifest: {
                status: manifest.status,
                bundleVersion: manifest.bundleVersion,
                activeVersion: manifest.activeVersion,
                lastReadyVersion: manifest.lastReadyVersion,
                stats: manifest.stats,
                lastBuildError: manifest.lastBuildError ? 'Compiled context rebuild failed. Check platform logs.' : null,
                staleReason: manifest.staleReason || null,
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_context_bundle_manual_rebuild_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
        return bundleRebuildJson({ error: 'Failed to rebuild compiled context.' }, 500);
    }
});
