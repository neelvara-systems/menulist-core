export const dynamic = 'force-dynamic';

/**
 * Widget Feedback API — Public endpoint for widget answer feedback
 *
 * Receives thumbs up/down from widget end-users.
 * Writes feedback to aiSearchHistory + emits Answerlattice signal for negative feedback.
 *
 * Auth: API key via X-API-Key header (same as widget search)
 * Rate limited per API key. Feature-flagged via ENABLE_ANSWERLATTICE_WIDGET.
 *
 * @see src/lib/search/searchCore.ts
 * @see __docs__/answerlattice/help-widget/
 */

/**
 * Widget Feedback API — Public endpoint for widget answer feedback
 *
 * Receives thumbs up/down from widget end-users.
 * Writes feedback to aiSearchHistory + emits Answerlattice signal for negative feedback.
 *
 * Auth: API key via X-API-Key header (same as widget search)
 * Rate limited per API key. Feature-flagged via ENABLE_ANSWERLATTICE_WIDGET.
 *
 * @see src/lib/search/searchCore.ts
 * @see __docs__/answerlattice/help-widget/
 */
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { isAnswerlatticeSearchHistoryAvailableForInteraction } from '@lib/answerlattice/searchHistoryInteractionServer';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { requireAnswerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { handlePublicApiCorsPreflight, hashApiKey, hasPublicApiCredentialScope, validatePublicApiKey, withPublicApiCors, } from '@lib/publicApi/auth';
import { ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER, isAnswerlatticeWidgetRuntimeRequestAuthorized, } from '@lib/answerlattice/widgetRuntimeTokenServer';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { admin } from '@lib/firebase/firebaseAdminCompat';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

const FeedbackRequestSchema = z.object({
    searchHistoryId: z.string().trim().max(180).refine((value) => normalizeAnswerlatticeSearchHistoryId(value) === value),
    isGood: z.boolean(),
    resolutionOutcome: z.enum(['resolved', 'not_resolved']).optional(),
}).strict().superRefine((value, context) => {
    if (
        (value.resolutionOutcome === 'resolved' && value.isGood !== true)
        || (value.resolutionOutcome === 'not_resolved' && value.isGood !== false)
    ) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Feedback outcome does not match the selected response.',
            path: ['resolutionOutcome'],
        });
    }
});
const WIDGET_FEEDBACK_MAX_BODY_BYTES = 2 * 1024;
const WIDGET_AUTH_CACHE_TTL_MS = 15_000;

const jsonResponse = (
    request: NextRequest,
    body: Record<string, unknown>,
    init?: ResponseInit,
): NextResponse => {
    const response = NextResponse.json(body, init);
    if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', 'private, no-store');
    return withPublicApiCors(response, request);
};

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

const cleanSignalContextText = (value: unknown, maxLength = 140): string | null => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const buildWidgetFeedbackContextMetadata = (historyData: Record<string, unknown>) => {
    const contextKey = cleanSignalContextText(historyData.contextKey, 140);
    const matchedEntityIds = Array.isArray(historyData.matchedEntityIds)
        ? historyData.matchedEntityIds
            .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
            .slice(0, 10)
        : [];
    const productContext = {
        contextKey,
        feature: cleanSignalContextText(historyData.surfaceFeature, 120),
        page: cleanSignalContextText(historyData.surfacePage, 120),
        workflow: cleanSignalContextText(historyData.surfaceWorkflow, 120),
    };
    const hasProductContext = Object.values(productContext).some(Boolean);

    return {
        query: cleanSignalContextText(historyData.query, 220),
        answerSource: cleanSignalContextText(historyData.answerSource, 80),
        confidence: cleanSignalContextText(historyData.confidence, 40),
        visitorId: cleanSignalContextText(historyData.visitorId, 120),
        widgetSessionId: cleanSignalContextText(historyData.widgetSessionId, 120),
        requestOrigin: cleanSignalContextText(historyData.requestOrigin, 180),
        requestPath: cleanSignalContextText(historyData.requestPath, 180),
        contextKey,
        fallbackReason: cleanSignalContextText(historyData.fallbackReason, 180),
        matchedEntityIds,
        productContext: hasProductContext ? productContext : null,
        relatedContextKeys: contextKey ? [contextKey] : [],
    };
};

const isWidgetSearchHistoryRow = (historyData: Record<string, unknown>): boolean => (
    historyData.mountContext === 'widget' || historyData.uId === 'widget'
);

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return jsonResponse(request, { error: 'Widget not enabled' }, { status: 404 });
    }

    try {
        // API key authentication
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey) {
            return jsonResponse(request, { error: 'Missing API key' }, { status: 401 });
        }
        if (!apiKey.startsWith('al_')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitConfig = getRateLimitForFeature('FEEDBACK_SUBMISSION');
        const preAuthRateLimitResult = await checkRateLimit({
            key: `widget-feedback-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 60),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!preAuthRateLimitResult.allowed) {
            const providerUnavailable = preAuthRateLimitResult.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((preAuthRateLimitResult.resetAt - Date.now()) / 1000), 1);
            return jsonResponse(request, {
                error: providerUnavailable
                    ? 'Feedback is temporarily unavailable. Please try again later.'
                    : 'Rate limit exceeded',
            }, {
                status: providerUnavailable ? 503 : 429,
                headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
            });
        }
        const rateLimitResult = await checkRateLimit({
            key: `widget-feedback:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000), 1);
            return jsonResponse(
                request,
                {
                    error: providerUnavailable
                        ? 'Feedback is temporarily unavailable. Please try again later.'
                        : 'Rate limit exceeded',
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Retry-After': String(retryAfter),
                    },
                }
            );
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

        const { answerlatticeScope, storeData, storeId } = authResult;
        const credential = authResult.credential || {};
        if (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        if (credential.purpose && credential.purpose !== 'answerlattice_widget') {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:feedback')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        const tId = answerlatticeScope?.tenantId;
        const sId = answerlatticeScope?.storeId;
        if (!tId || !sId || String(sId) !== storeId) {
            logRuntimeFailure('answerlattice_widget_feedback_invalid_workspace_context', undefined, {
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

        // Parse request body
        const bodyResult = await readBoundedJsonBody(request, WIDGET_FEEDBACK_MAX_BODY_BYTES, {
            invalidJsonMessage: 'searchHistoryId and isGood are required',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return jsonResponse(
                request,
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'searchHistoryId and isGood are required' },
                { status: bodyResult.response.status },
            );
        }

        const validation = FeedbackRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return jsonResponse(request, { error: 'searchHistoryId and isGood are required' }, { status: 400 });
        }
        const { searchHistoryId, isGood, resolutionOutcome } = validation.data;

        // Write feedback only to this workspace's own search-history record.
        const db = requireAnswerlatticeFirestoreAdmin();
        const historyRef = db
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .doc(searchHistoryId);
        const transactionResult = await db.runTransaction(async (transaction) => {
            const historyDoc = await transaction.get(historyRef);
            const current = historyDoc.exists ? historyDoc.data() : null;
            if (
                !current
                || current.pId !== PRODUCT_IDS.ANSWERLATTICE
                || normalizeAnswerlatticeScopeDocumentId(current.tId) !== tId
                || normalizeAnswerlatticeScopeDocumentId(current.sId) !== sId
                || !isWidgetSearchHistoryRow(current)
                || !isAnswerlatticeSearchHistoryAvailableForInteraction(current)
            ) return null;
            const alreadySubmitted = typeof current.submittedAt !== 'undefined'
                || typeof current.isGood === 'boolean';
            if (alreadySubmitted) {
                const authoritativeOutcome = current.resolutionOutcome === 'resolved' || current.resolutionOutcome === 'not_resolved'
                    ? current.resolutionOutcome
                    : typeof current.isGood === 'boolean'
                        ? current.isGood ? 'resolved' : 'not_resolved'
                        : null;
                return { historyData: current, feedbackCreated: false, authoritativeOutcome };
            }
            const now = admin.firestore.Timestamp.now();
            const authoritativeOutcome = resolutionOutcome || (isGood ? 'resolved' : 'not_resolved');
            transaction.set(historyRef, {
                isGood,
                resolutionOutcome: authoritativeOutcome,
                reasonsToImprove: [],
                comments: '',
                submittedAt: now,
                modifiedOn: now,
            }, { merge: true });
            return { historyData: current, feedbackCreated: true, authoritativeOutcome };
        });
        if (!transactionResult?.historyData) {
            return jsonResponse(request, { error: 'Search record not found' }, { status: 404 });
        }
        const { historyData, feedbackCreated, authoritativeOutcome } = transactionResult;
        if (!authoritativeOutcome) {
            return jsonResponse(request, { error: 'Feedback record is invalid' }, { status: 409 });
        }

        // Emit the durable, search-history-idempotent signal for both the first
        // write and a retry of an already committed negative outcome.
        if (authoritativeOutcome === 'not_resolved' && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
            try {
                const { emitAnswerlatticeSignal } = await import('@lib/answerlattice/signalEmitterServer');
                const { ANSWERLATTICE_SIGNAL_TYPE } = await import('@type/answerlattice');
                const matchedEntityId = Array.isArray(historyData.matchedEntityIds)
                    ? historyData.matchedEntityIds.find((id: unknown) => typeof id === 'string' && Boolean(id.trim()))
                    : undefined;
                const signalEmitted = await emitAnswerlatticeSignal({
                    type: ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE,
                    entityId: matchedEntityId,
                    tId,
                    sId,
                    metadata: {
                        searchHistoryId,
                        source: 'widget',
                        ...buildWidgetFeedbackContextMetadata(historyData),
                    },
                });
                if (!signalEmitted) {
                    logRuntimeFailure('answerlattice_widget_feedback_signal_emit_failed', undefined, {
                        ...getBoundedRuntimeStringContext('tenantId', tId),
                        ...getBoundedRuntimeStringContext('storeId', sId),
                        ...getBoundedRuntimeStringContext('searchHistoryId', searchHistoryId),
                    });
                    return jsonResponse(request, { error: 'Feedback signal could not be saved' }, { status: 503 });
                }
            } catch (signalError) {
                logRuntimeFailure('answerlattice_widget_feedback_signal_emit_failed', signalError, {
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                    ...getBoundedRuntimeStringContext('searchHistoryId', searchHistoryId),
                });
                return jsonResponse(request, { error: 'Feedback signal could not be saved' }, { status: 503 });
            }
        }

        return jsonResponse(request, {
            success: true,
            resolutionOutcome: authoritativeOutcome,
            isGood: authoritativeOutcome === 'resolved',
            created: feedbackCreated,
        });

    } catch (err: unknown) {
        logRuntimeFailure('answerlattice_widget_feedback_failed', err);
        return jsonResponse(request, { error: 'Something went wrong' }, { status: 500 });
    }
}
