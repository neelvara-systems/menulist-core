export const dynamic = 'force-dynamic';

/**
 * Answerlattice — Predictive Help API (Expansion Item #12)
 *
 * Returns proactive help suggestions based on user's current product context.
 * Called by the widget SDK on page entry (canon.page()).
 *
 * POST /api/answerlattice/predictive-help
 * Body: { page, feature?, workflow?, plan?, userRole?, entityHints?, userId }
 *
 * Auth: scoped widget API key plus allowed-origin/runtime-token authorization
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 *
 * @see __docs__/answerlattice/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import { evaluateTriggers } from '@lib/answerlattice/predictiveEngine';
import {
    ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN,
    ANSWERLATTICE_PREDICTIVE_MAX_BODY_BYTES,
} from '@lib/answerlattice/predictiveSupportContracts';
import {
    ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER,
    isAnswerlatticeWidgetRuntimeRequestAuthorized,
} from '@lib/answerlattice/widgetRuntimeTokenServer';
import { AnswerlatticeContextSchema } from '@lib/validation/contextSchema';
import { handlePublicApiCorsPreflight, hashApiKey, hasPublicApiCredentialScope, validatePublicApiKey, withPublicApiCors } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import type { AnswerlatticeContextPayload } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

const PredictiveHelpRequestSchema = z.object({
    page: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN),
    feature: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    workflow: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    plan: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    userRole: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    entityHints: z.array(
        z.string().trim().min(1).max(64).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN),
    ).max(5).optional(),
    userId: z.string().trim().min(8).max(160).regex(/^[A-Za-z0-9_.:-]+$/),
}).strict();
const WIDGET_AUTH_CACHE_TTL_MS = 15_000;

const emptyCorsResponse = (request: NextRequest, init?: ResponseInit): NextResponse => (
    withPublicApiCors(new NextResponse(null, {
        ...init,
        headers: {
            ...Object.fromEntries(new Headers(init?.headers).entries()),
            'Cache-Control': 'private, no-store',
        },
    }), request)
);

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function POST(request: NextRequest) {
    try {
        // Feature flag gate
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
            return emptyCorsResponse(request, { status: 204 });
        }

        // API key authentication (same pattern as widget search)
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey) {
            return emptyCorsResponse(request, { status: 204 });
        }
        if (!apiKey.startsWith('al_')) {
            return emptyCorsResponse(request, { status: 204 });
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const preAuthRateLimit = await checkRateLimit({
            key: `canon-predict-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 60),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!preAuthRateLimit.allowed) {
            return emptyCorsResponse(request, {
                status: 204,
                headers: { 'Cache-Control': 'no-store' },
            });
        }
        const rateLimitResult = await checkRateLimit({
            key: `canon-predict:${apiKeyRateLimitId}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (
            rateLimitResult.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && rateLimitResult.current === 0
            && rateLimitResult.remaining === rateLimitConfig.limit
        ) {
            return emptyCorsResponse(request, {
                status: 204,
                headers: { 'Cache-Control': 'no-store' },
            });
        }
        if (!rateLimitResult.allowed) {
            return emptyCorsResponse(request, {
                status: 204,
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        });
        if (!authResult) {
            return emptyCorsResponse(request, { status: 204 });
        }
        const credential = authResult.credential || {};
        if (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE) {
            return emptyCorsResponse(request, { status: 204 });
        }
        if (credential.purpose && credential.purpose !== 'answerlattice_widget') {
            return emptyCorsResponse(request, { status: 204 });
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:predictive')) {
            return emptyCorsResponse(request, { status: 204 });
        }

        // Extract tenant context from authenticated API key (never trust body for tId/sId)
        const { answerlatticeScope, storeData, storeId } = authResult;
        const tId = answerlatticeScope?.tenantId;
        const sId = answerlatticeScope?.storeId;
        if (!tId || !sId || String(sId) !== storeId) {
            logRuntimeFailure('answerlattice_predictive_help_invalid_workspace_context', undefined, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
            });
            return emptyCorsResponse(request, { status: 204 });
        }

        if (!isAnswerlatticeWidgetRuntimeRequestAuthorized({
            requestOrigin: request.headers.get('origin'),
            allowedOrigins: storeData.widgetAllowedOrigins,
            runtimeToken: request.headers.get(ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER),
            apiKey,
            tId,
            sId,
        })) {
            return emptyCorsResponse(request, { status: 204 });
        }

        const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_PREDICTIVE_MAX_BODY_BYTES);
        if (bodyResult.ok === false) {
            return emptyCorsResponse(request, { status: 204 });
        }

        const validation = PredictiveHelpRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return emptyCorsResponse(request, { status: 204 });
        }
        const { page, feature, workflow, plan, userRole, entityHints, userId } = validation.data;

        const context = AnswerlatticeContextSchema.parse({
            page,
            feature: feature || undefined,
            workflow: workflow || undefined,
            plan: plan || undefined,
            userRole: userRole || undefined,
            entityHints,
        }) as AnswerlatticeContextPayload;
        if (!context.page) {
            return emptyCorsResponse(request, { status: 204 });
        }

        // Evaluate triggers
        const suggestion = await evaluateTriggers(
            context,
            tId,
            sId,
            hashApiKey(`${apiKeyRateLimitId}:${userId}`).slice(0, 24)
        );

        if (!suggestion) {
            return emptyCorsResponse(request, { status: 204 });
        }

        const response = NextResponse.json({ suggestion });
        response.headers.set('Cache-Control', 'no-store');
        return withPublicApiCors(response, request);

    } catch (error) {
        logRuntimeFailure('answerlattice_predictive_help_failed', error);
        // Graceful degradation — never return errors to widget
        return emptyCorsResponse(request, { status: 204 });
    }
}
