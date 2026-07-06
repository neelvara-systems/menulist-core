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

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import {
    handlePublicApiCorsPreflight,
    hashApiKey,
    hasPublicApiCredentialScope,
    isRequestOriginAllowed,
    validatePublicApiKey,
    withPublicApiCors,
} from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const FeedbackRequestSchema = z.object({
    searchHistoryId: z.string().trim().max(180).refine((value) => normalizeAnswerlatticeSearchHistoryId(value) === value),
    isGood: z.boolean(),
});
const WIDGET_FEEDBACK_MAX_BODY_BYTES = 2 * 1024;
const WIDGET_AUTH_CACHE_TTL_MS = 15_000;

const jsonResponse = (
    request: NextRequest,
    body: Record<string, any>,
    init?: ResponseInit,
): NextResponse => withPublicApiCors(NextResponse.json(body, init), request);

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

const cleanSignalContextText = (value: unknown, maxLength = 140): string | null => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const buildWidgetFeedbackContextMetadata = (historyData: Record<string, any>) => {
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
        visitorName: cleanSignalContextText(historyData.visitorName, 160),
        visitorEmail: cleanSignalContextText(historyData.visitorEmail, 180),
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

const isWidgetSearchHistoryRow = (historyData: Record<string, any>): boolean => (
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
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `widget-feedback:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
        });
        if (
            rateLimitResult.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && rateLimitResult.current === 0
            && rateLimitResult.remaining === rateLimitConfig.limit
        ) {
            return jsonResponse(
                request,
                { error: 'Feedback is temporarily unavailable. Please try again later.' },
                {
                    status: 503,
                    headers: { 'Cache-Control': 'no-store' },
                }
            );
        }
        if (!rateLimitResult.allowed) {
            const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
            return jsonResponse(
                request,
                { error: 'Rate limit exceeded' },
                {
                    status: 429,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Retry-After': String(Math.max(retryAfter, 1)),
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

        const { storeData, storeId } = authResult;
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
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            logRuntimeFailure('answerlattice_widget_feedback_invalid_workspace_context', undefined, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
            });
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const requestOrigin = request.headers.get('origin');
        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
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
        const { searchHistoryId, isGood } = validation.data;

        // Write feedback only to this workspace's own search-history record.
        const historyRef = answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .doc(searchHistoryId);
        const historyDoc = await historyRef.get();
        const historyData = historyDoc.exists ? historyDoc.data() : null;
        if (
            !historyData ||
            Number(historyData.tId) !== tId ||
            Number(historyData.sId) !== sId ||
            !isWidgetSearchHistoryRow(historyData)
        ) {
            return jsonResponse(request, { error: 'Search record not found' }, { status: 404 });
        }

        const alreadySubmitted = typeof historyData.submittedAt !== 'undefined'
            || typeof historyData.isGood === 'boolean';
        if (alreadySubmitted && historyData.isGood === isGood) {
            return jsonResponse(request, { success: true });
        }

        await historyRef.set({
            isGood,
            reasonsToImprove: [],
            comments: '',
            submittedAt: admin.firestore.Timestamp.now(),
            modifiedOn: admin.firestore.Timestamp.now(),
        }, { merge: true });

        // Emit Answerlattice signal for negative feedback (feeds mutation pipeline)
        if (!isGood && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
            try {
                const { emitAnswerlatticeSignal } = await import('@lib/answerlattice/signalEmitter');
                const { ANSWERLATTICE_SIGNAL_TYPE } = await import('@type/answerlattice');
                const matchedEntityId = Array.isArray(historyData.matchedEntityIds)
                    ? historyData.matchedEntityIds.find((id: unknown) => typeof id === 'string' && Boolean(id.trim()))
                    : undefined;
                await emitAnswerlatticeSignal({
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
            } catch (signalError) {
                // Fire-and-forget — signal emission failure never blocks feedback
                logRuntimeFailure('answerlattice_widget_feedback_signal_emit_failed', signalError, {
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                    ...getBoundedRuntimeStringContext('searchHistoryId', searchHistoryId),
                });
            }
        }

        return jsonResponse(request, { success: true });

    } catch (err: any) {
        logRuntimeFailure('answerlattice_widget_feedback_failed', err);
        return jsonResponse(request, { error: 'Something went wrong' }, { status: 500 });
    }
}
