export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import { loadTriggerIndex } from '@lib/answerlattice/predictiveEngine';
import {
    ANSWERLATTICE_PREDICTIVE_MAX_BODY_BYTES,
    AnswerlatticePredictiveInteractionSchema,
    doesAnswerlatticePredictiveTriggerMatchContext,
    isAnswerlatticePredictiveTriggerWithinWindow,
} from '@lib/answerlattice/predictiveSupportContracts';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';
import { emitSuggestionSignal } from '@lib/answerlattice/signalEmitterServer';
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
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

const WIDGET_AUTH_CACHE_TTL_MS = 15_000;

const jsonResponse = (
    request: NextRequest,
    body: Record<string, unknown>,
    init?: ResponseInit,
): NextResponse => {
    const response = NextResponse.json(body, init);
    response.headers.set('Cache-Control', 'private, no-store');
    return withPublicApiCors(response, request);
};

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function POST(request: NextRequest) {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
    ) {
        return jsonResponse(request, { error: 'Predictive support is not enabled' }, { status: 404 });
    }

    try {
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey || !apiKey.startsWith('al_')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const rateLimitConfig = getRateLimitForFeature('FEEDBACK_SUBMISSION');
        const preAuthRateLimit = await checkRateLimit({
            key: `widget-predictive-interaction-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 60),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!preAuthRateLimit.allowed) {
            const providerUnavailable = preAuthRateLimit.reason === 'provider_unavailable';
            return jsonResponse(request, {
                error: providerUnavailable ? 'Predictive support is temporarily unavailable' : 'Rate limit exceeded',
            }, { status: providerUnavailable ? 503 : 429 });
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimit = await checkRateLimit({
            key: `widget-predictive-interaction:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return jsonResponse(request, {
                error: providerUnavailable ? 'Predictive support is temporarily unavailable' : 'Rate limit exceeded',
            }, { status: providerUnavailable ? 503 : 429 });
        }

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        });
        if (!authResult) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const credential = authResult.credential || {};
        if (
            (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE)
            || (credential.purpose && credential.purpose !== 'answerlattice_widget')
            || !hasPublicApiCredentialScope(credential, 'widget:predictive')
        ) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const { answerlatticeScope, storeData, storeId } = authResult;
        const tId = answerlatticeScope?.tenantId;
        const sId = answerlatticeScope?.storeId;
        if (!tId || !sId || String(sId) !== storeId) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        if (!isAnswerlatticeWidgetRuntimeRequestAuthorized({
            requestOrigin: request.headers.get('origin'),
            allowedOrigins: storeData.widgetAllowedOrigins,
            runtimeToken: request.headers.get(ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER),
            apiKey,
            tId,
            sId,
        })) {
            return jsonResponse(request, { error: 'Origin not allowed' }, { status: 403 });
        }

        const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_PREDICTIVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid predictive interaction',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return jsonResponse(request, {
                error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid predictive interaction',
            }, { status: bodyResult.response.status });
        }

        const parsed = AnswerlatticePredictiveInteractionSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return jsonResponse(request, { error: 'Invalid predictive interaction' }, { status: 400 });
        }
        const interaction = parsed.data;
        const triggerId = normalizeAnswerlatticePredictiveTriggerId(interaction.triggerId);
        if (!triggerId || triggerId !== interaction.triggerId) {
            return jsonResponse(request, { error: 'Invalid predictive interaction' }, { status: 400 });
        }

        const triggerIndex = await loadTriggerIndex(tId, sId, { bypassCache: true });
        const trigger = triggerIndex?.triggers?.[triggerId];
        if (
            !trigger
            || trigger.status !== 'active'
            || !isAnswerlatticePredictiveTriggerWithinWindow(trigger)
            || !doesAnswerlatticePredictiveTriggerMatchContext(trigger, {
                page: interaction.page,
                feature: interaction.feature,
                workflow: interaction.workflow,
                plan: interaction.plan,
                userRole: interaction.userRole,
            })
        ) {
            return jsonResponse(request, { error: 'Predictive trigger not found' }, { status: 404 });
        }

        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
            return jsonResponse(request, { success: true, recorded: false });
        }

        const emitted = await emitSuggestionSignal({
            type: interaction.type,
            triggerId,
            page: interaction.page,
            interactionId: interaction.interactionId,
            sessionId: interaction.sessionId,
            contextKey: interaction.contextKey,
            actionType: trigger.action.type,
            triggerKind: trigger.kind === 'known_issue' ? 'known_issue' : 'predictive_help',
            entityId: trigger.action.entityId,
            tId,
            sId,
        });
        if (!emitted) {
            return jsonResponse(request, { error: 'Predictive interaction could not be saved' }, { status: 503 });
        }

        return jsonResponse(request, { success: true, recorded: true });
    } catch (error) {
        logRuntimeFailure('answerlattice_predictive_interaction_failed', error, {
            ...getBoundedRuntimeStringContext('path', request.nextUrl.pathname),
        });
        return jsonResponse(request, { error: 'Something went wrong' }, { status: 500 });
    }
}
