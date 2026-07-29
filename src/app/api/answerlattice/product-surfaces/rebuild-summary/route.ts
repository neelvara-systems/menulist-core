export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { rebuildProductSurfaceContentSummaryServer } from '@lib/answerlattice/productSurfaceContentServer';
import {
    answerlatticeProductSurfaceSummaryRebuildRequestSchema,
    isExactAnswerlatticeProductSurfaceSummaryScope,
} from '@lib/answerlattice/productSurfaceSummaryContracts';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readOptionalBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES = 2 * 1024;
const productSurfaceSummaryJson = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
};
const withProductSurfaceSummaryPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
        return productSurfaceSummaryJson({ error: 'Answerlattice product surfaces are not enabled.' }, { status: 404 });
    }

    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) {
        return productSurfaceSummaryJson({ error: 'Answerlattice workspace is not available.' }, { status: 400 });
    }
    const { tenantId, storeId } = scope;
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) {
        return productSurfaceSummaryJson({ error: 'Forbidden' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(
            'answerlattice-product-surfaces:summary',
            actorId,
            tenantId,
            storeId,
        ),
        limit: 12,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const providerUnavailable = rateLimit.reason === 'provider_unavailable';
        return productSurfaceSummaryJson(
            {
                error: providerUnavailable
                    ? 'Product-surface summary rebuild is temporarily unavailable.'
                    : 'Too many rebuild requests.',
            },
            { status: providerUnavailable ? 503 : 429 },
        );
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
    if (permission.response) {
        return withProductSurfaceSummaryPrivateHeaders(permission.response);
    }

    try {
        const bodyResult = await readOptionalBoundedJsonBody(request, PRODUCT_SURFACE_SUMMARY_REBUILD_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid rebuild request.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return productSurfaceSummaryJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid rebuild request.' },
                { status: bodyResult.response.status },
            );
        }

        const parsedResult = answerlatticeProductSurfaceSummaryRebuildRequestSchema.safeParse(bodyResult.data);
        if (!parsedResult.success) {
            return productSurfaceSummaryJson({ error: 'Invalid rebuild request.' }, { status: 400 });
        }
        const parsed = parsedResult.data;
        const activeScope = { tId: tenantId, sId: storeId };
        if (!isExactAnswerlatticeProductSurfaceSummaryScope(parsed.scope, activeScope)) {
            return productSurfaceSummaryJson(
                { error: 'Answerlattice workspace changed before summary rebuild.' },
                { status: 409 },
            );
        }
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

        return productSurfaceSummaryJson({ summary, scope: activeScope });
    } catch (error) {
        logRuntimeFailure('answerlattice_product_surface_summary_rebuild_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
        });
        return productSurfaceSummaryJson({ error: 'Failed to rebuild product surface summary.' }, { status: 500 });
    }
});
