export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import {
    AnswerlatticeWidgetEscalationError,
    executeAnswerlatticeWidgetEscalation,
} from '@lib/answerlattice/widgetEscalationServer';
import {
    ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER,
    isAnswerlatticeWidgetRuntimeRequestAuthorized,
} from '@lib/answerlattice/widgetRuntimeTokenServer';
import {
    handlePublicApiCorsPreflight,
    hashApiKey,
    hasPublicApiCredentialScope,
    validatePublicApiKey,
    withPublicApiCors,
} from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

const WIDGET_ESCALATION_MAX_BODY_BYTES = 4 * 1024;
const WIDGET_AUTH_CACHE_TTL_MS = 15_000;
const WidgetEscalationRequestSchema = z.object({
    searchHistoryId: z.string().trim().max(180)
        .refine(value => normalizeAnswerlatticeSearchHistoryId(value) === value),
    email: z.string().trim().email().max(254),
    name: z.string().trim().max(160).optional(),
    details: z.string().trim().max(1000).optional(),
}).strict();

const jsonResponse = (
    request: NextRequest,
    body: Record<string, any>,
    init?: ResponseInit,
): NextResponse => {
    const response = NextResponse.json(body, init);
    if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', 'private, no-store');
    return withPublicApiCors(response, request);
};

const rateLimitResponse = (
    request: NextRequest,
    result: Awaited<ReturnType<typeof checkRateLimit>>,
) => {
    if (result.allowed) return null;
    const providerUnavailable = result.reason === 'provider_unavailable';
    const retryAfter = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1);
    return jsonResponse(request, {
        error: providerUnavailable
            ? 'Support requests are temporarily unavailable. Please try again later.'
            : 'Rate limit exceeded',
    }, {
        status: providerUnavailable ? 503 : 429,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
    });
};

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return jsonResponse(request, { error: 'Widget not enabled' }, { status: 404 });
    }

    try {
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey || !apiKey.startsWith('al_')) {
            return jsonResponse(request, { error: apiKey ? 'Invalid API key' : 'Missing API key' }, { status: 401 });
        }

        const rateLimitConfig = getRateLimitForFeature('FEEDBACK_SUBMISSION');
        const preAuthLimit = await checkRateLimit({
            key: `widget-escalation-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 60),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        const preAuthResponse = rateLimitResponse(request, preAuthLimit);
        if (preAuthResponse) return preAuthResponse;

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const keyLimit = await checkRateLimit({
            key: `widget-escalation:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        const keyLimitResponse = rateLimitResponse(request, keyLimit);
        if (keyLimitResponse) return keyLimitResponse;

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        });
        if (!authResult) return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });

        const { answerlatticeScope, storeData, storeId } = authResult;
        const credential = authResult.credential || {};
        if (
            (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE)
            || (credential.purpose && credential.purpose !== 'answerlattice_widget')
            || !hasPublicApiCredentialScope(credential, 'widget:feedback')
        ) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const tId = answerlatticeScope?.tenantId;
        const sId = answerlatticeScope?.storeId;
        if (!tId || !sId || String(sId) !== storeId) {
            logRuntimeFailure('answerlattice_widget_escalation_invalid_workspace_context', undefined, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
            });
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const requestOrigin = request.headers.get('origin');
        if (!isAnswerlatticeWidgetRuntimeRequestAuthorized({
            requestOrigin,
            allowedOrigins: storeData.widgetAllowedOrigins,
            runtimeToken: request.headers.get(ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER),
            apiKey,
            tId,
            sId,
        })) {
            return jsonResponse(request, { error: 'Origin not allowed' }, { status: 403 });
        }

        const bodyResult = await readBoundedJsonBody(request, WIDGET_ESCALATION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'A valid reply email is required',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return jsonResponse(request, {
                error: bodyResult.response.status === 413 ? 'Request body too large' : 'A valid reply email is required',
            }, { status: bodyResult.response.status });
        }
        const validation = WidgetEscalationRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return jsonResponse(request, { error: 'A valid reply email is required' }, { status: 400 });
        }

        const { searchHistoryId, email, name, details } = validation.data;
        if (!searchHistoryId || !email) {
            return jsonResponse(request, { error: 'A valid reply email is required' }, { status: 400 });
        }
        const result = await executeAnswerlatticeWidgetEscalation({
            tId,
            sId,
            searchHistoryId,
            email,
            name,
            details,
        });
        return jsonResponse(request, result);
    } catch (error) {
        if (error instanceof AnswerlatticeWidgetEscalationError) {
            return jsonResponse(request, { error: 'Could not create the support request' }, { status: error.status });
        }
        logRuntimeFailure('answerlattice_widget_escalation_failed', error);
        return jsonResponse(request, { error: 'Something went wrong' }, { status: 500 });
    }
}
