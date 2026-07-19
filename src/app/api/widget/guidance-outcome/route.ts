export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_GUIDANCE_MAX_BODY_BYTES,
    AnswerlatticeGuidanceOutcomeSchema,
    buildAnswerlatticeGuidanceOutcomeIdempotencyKey,
    matchAnswerlatticeGuidanceOutcomeToHistory,
} from '@lib/answerlattice/guidedResolutionContracts';
import { normalizeAnswerlatticeCanonicalAnswerId } from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { isAnswerlatticeSearchHistoryAvailableForInteraction } from '@lib/answerlattice/searchHistoryInteractionServer';
import { emitAnswerlatticeSignal } from '@lib/answerlattice/signalEmitter';
import { normalizeWidgetConfig } from '@lib/answerlattice/widgetConfig';
import {
    ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER,
    isAnswerlatticeWidgetRuntimeRequestAuthorized,
} from '@lib/answerlattice/widgetRuntimeTokenServer';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
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
import { ANSWERLATTICE_SIGNAL_TYPE } from '@type/answerlattice';
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
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION
    ) {
        return jsonResponse(request, { error: 'Guided resolution is not enabled' }, { status: 404 });
    }

    try {
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey || !apiKey.startsWith('al_')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const rateLimitConfig = getRateLimitForFeature('FEEDBACK_SUBMISSION');
        const preAuthRateLimit = await checkRateLimit({
            key: `widget-guidance-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 60),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!preAuthRateLimit.allowed) {
            const providerUnavailable = preAuthRateLimit.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((preAuthRateLimit.resetAt - Date.now()) / 1000), 1);
            return jsonResponse(request, {
                error: providerUnavailable ? 'Guidance is temporarily unavailable' : 'Rate limit exceeded',
            }, {
                status: providerUnavailable ? 503 : 429,
                headers: { 'Retry-After': String(retryAfter) },
            });
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimit = await checkRateLimit({
            key: `widget-guidance:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1);
            return jsonResponse(request, {
                error: providerUnavailable ? 'Guidance is temporarily unavailable' : 'Rate limit exceeded',
            }, {
                status: providerUnavailable ? 503 : 429,
                headers: { 'Retry-After': String(retryAfter) },
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
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const credential = authResult.credential || {};
        if (
            (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE)
            || (credential.purpose && credential.purpose !== 'answerlattice_widget')
            || !hasPublicApiCredentialScope(credential, 'widget:feedback')
        ) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const { storeData, storeId } = authResult;
        const tId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
        const sId = normalizeAnswerlatticeScopeDocumentId(storeData.id ?? storeData.sId ?? storeId);
        if (tId === null || sId === null || String(sId) !== storeId) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        if (!normalizeWidgetConfig(storeData.widgetConfig).guidedResolutionEnabled) {
            return jsonResponse(request, { error: 'Guided resolution is not enabled' }, { status: 404 });
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

        const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_GUIDANCE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid guidance outcome',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return jsonResponse(request, {
                error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid guidance outcome',
            }, { status: bodyResult.response.status });
        }

        const parsed = AnswerlatticeGuidanceOutcomeSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return jsonResponse(request, { error: 'Invalid guidance outcome' }, { status: 400 });
        }
        const outcome = parsed.data;
        const normalizedSearchHistoryId = normalizeAnswerlatticeSearchHistoryId(outcome.searchHistoryId);
        if (!normalizedSearchHistoryId || normalizedSearchHistoryId !== outcome.searchHistoryId) {
            return jsonResponse(request, { error: 'Invalid guidance outcome' }, { status: 400 });
        }

        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
            return jsonResponse(request, { success: true, recorded: false });
        }

        const historySnap = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .doc(normalizedSearchHistoryId)
            .get();
        const historyData = historySnap.exists ? historySnap.data() || {} : null;
        const canonicalAnswerId = normalizeAnswerlatticeCanonicalAnswerId(historyData?.canonicalAnswerId);
        if (
            !historyData
            || historyData.pId !== PRODUCT_IDS.ANSWERLATTICE
            || normalizeAnswerlatticeScopeDocumentId(historyData.tId) !== tId
            || normalizeAnswerlatticeScopeDocumentId(historyData.sId) !== sId
            || historyData.mountContext !== 'widget'
            || historyData.canonical !== true
            || !canonicalAnswerId
            || !isAnswerlatticeSearchHistoryAvailableForInteraction(historyData)
        ) {
            return jsonResponse(request, { error: 'Search record not found' }, { status: 404 });
        }
        const outcomeEvidence = matchAnswerlatticeGuidanceOutcomeToHistory(outcome, historyData);
        if (!outcomeEvidence) {
            return jsonResponse(request, { error: 'Guidance outcome does not match the served procedure' }, { status: 409 });
        }

        const matchedEntityId = Array.isArray(historyData.matchedEntityIds)
            ? historyData.matchedEntityIds.find((value: unknown) => typeof value === 'string' && Boolean(value.trim()))
            : undefined;
        const outcomeIdempotencyKey = buildAnswerlatticeGuidanceOutcomeIdempotencyKey(outcome);
        const emitted = await emitAnswerlatticeSignal({
            type: outcome.outcome === 'escalated'
                ? ANSWERLATTICE_SIGNAL_TYPE.ESCALATION
                : ANSWERLATTICE_SIGNAL_TYPE.GUIDED_RESOLUTION,
            entityId: matchedEntityId,
            tId,
            sId,
            metadata: {
                source: 'widget:guided_resolution',
                signalPurpose: 'guided_resolution_outcome',
                idempotencyKey: outcomeIdempotencyKey,
                requestId: outcomeIdempotencyKey,
                clientRequestId: outcome.requestId,
                procedureSessionId: outcome.procedureSessionId,
                searchHistoryId: normalizedSearchHistoryId,
                canonicalAnswerId,
                procedureSlug: outcomeEvidence.procedureSlug,
                outcome: outcome.outcome,
                totalSteps: outcome.totalSteps,
                completedSteps: outcome.completedSteps,
                blockedStepOrder: outcome.blockedStepOrder || null,
                targetId: outcomeEvidence.targetId,
                expectedEvent: outcomeEvidence.expectedEvent,
                widgetSessionId: outcome.widgetSessionId,
                contextKey: outcomeEvidence.contextKey,
                query: typeof historyData.query === 'string' ? historyData.query.slice(0, 220) : null,
                answerSource: typeof historyData.answerSource === 'string' ? historyData.answerSource.slice(0, 80) : null,
            },
        });
        if (!emitted) {
            return jsonResponse(request, { error: 'Guidance outcome could not be saved' }, { status: 503 });
        }

        return jsonResponse(request, { success: true, recorded: true });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_guidance_outcome_failed', error, {
            ...getBoundedRuntimeStringContext('path', request.nextUrl.pathname),
        });
        return jsonResponse(request, { error: 'Something went wrong' }, { status: 500 });
    }
}
