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
import { secureError } from '@lib/security/secureLogger';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const FeedbackRequestSchema = z.object({
    searchHistoryId: z.string().trim().min(1).max(180),
    isGood: z.boolean(),
});
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
        if (!rateLimitResult.allowed) {
            const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
            return jsonResponse(
                request,
                { error: 'Rate limit exceeded' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(Math.max(retryAfter, 1)) },
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
        if (credential.productId && credential.productId !== 'AL') {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        if (credential.purpose && !String(credential.purpose).startsWith('answerlattice')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:feedback')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            secureError(
                '[Widget Feedback] Invalid API key workspace context',
                new Error('Authenticated API key does not resolve to a valid tenant/store'),
                { storeId }
            );
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        const requestOrigin = request.headers.get('origin');
        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
            return jsonResponse(request, { error: 'Origin not allowed' }, { status: 403 });
        }

        // Parse request body
        const validation = FeedbackRequestSchema.safeParse(await request.json());
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
            || typeof historyData.modifiedOn !== 'undefined';
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
            } catch {
                // Fire-and-forget — signal emission failure never blocks feedback
            }
        }

        return jsonResponse(request, { success: true });

    } catch (err: any) {
        secureError('[Widget Feedback] Error', err as Error);
        return jsonResponse(request, { error: 'Something went wrong' }, { status: 500 });
    }
}
