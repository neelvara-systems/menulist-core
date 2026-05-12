export const dynamic = 'force-dynamic';

/**
 * Widget Feedback API — Public endpoint for widget answer feedback
 *
 * Receives thumbs up/down from widget end-users.
 * Writes feedback to aiSearchHistory + emits Canonica signal for negative feedback.
 *
 * Auth: API key via X-API-Key header (same as widget search)
 * Rate limited per API key. Feature-flagged via ENABLE_CANONICA_WIDGET.
 *
 * @see src/lib/search/searchCore.ts
 * @see __docs__/canonica/help-widget/
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { hashApiKey, validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const FeedbackRequestSchema = z.object({
    searchHistoryId: z.string().trim().min(1).max(180),
    isGood: z.boolean(),
});

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
        return NextResponse.json({ error: 'Widget not enabled' }, { status: 404 });
    }

    try {
        // API key authentication
        const apiKey = request.headers.get('x-api-key');
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
        }

        const authResult = await validatePublicApiKey(apiKey);
        if (!authResult) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);

        // Rate limiting (reuse AI_OPERATION config — prevents feedback spam)
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `widget-feedback:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        // Parse request body
        const validation = FeedbackRequestSchema.safeParse(await request.json());
        if (!validation.success) {
            return NextResponse.json({ error: 'searchHistoryId and isGood are required' }, { status: 400 });
        }
        const { searchHistoryId, isGood } = validation.data;

        // Write feedback only to this workspace's own search-history record.
        const historyRef = canonicaFirestoreAdmin
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .doc(searchHistoryId);
        const historyDoc = await historyRef.get();
        const historyData = historyDoc.exists ? historyDoc.data() : null;
        if (
            !historyData ||
            Number(historyData.tId) !== tId ||
            Number(historyData.sId) !== sId
        ) {
            return NextResponse.json({ error: 'Search record not found' }, { status: 404 });
        }

        await historyRef.set({
            isGood,
            reasonsToImprove: [],
            comments: '',
            submittedAt: admin.firestore.Timestamp.now(),
            modifiedOn: admin.firestore.Timestamp.now(),
        }, { merge: true });

        // Emit Canonica signal for negative feedback (feeds mutation pipeline)
        if (!isGood && FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) {
            try {
                const { emitCanonicaSignal } = await import('@lib/canonica/signalEmitter');
                const { CANONICA_SIGNAL_TYPE } = await import('@type/canonica');
                await emitCanonicaSignal({
                    type: CANONICA_SIGNAL_TYPE.CHAT_NEGATIVE,
                    tId,
                    sId,
                    metadata: {
                        searchHistoryId,
                        source: 'widget',
                    },
                });
            } catch {
                // Fire-and-forget — signal emission failure never blocks feedback
            }
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        secureError('[Widget Feedback] Error', err as Error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
