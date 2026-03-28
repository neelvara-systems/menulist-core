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
import { validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';

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

        // Rate limiting (reuse AI_OPERATION config — prevents feedback spam)
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `widget-feedback:${apiKey}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        // Parse request body
        const body = await request.json();
        const { searchHistoryId, isGood } = body;

        if (!searchHistoryId || typeof isGood !== 'boolean') {
            return NextResponse.json({ error: 'searchHistoryId and isGood are required' }, { status: 400 });
        }

        // Write feedback to aiSearchHistory
        const { updateAiSearchHistoryWithFeedback } = await import('@database/aiSearchHistory');
        await updateAiSearchHistoryWithFeedback({
            id: searchHistoryId,
            isGood,
            reasonsToImprove: [],
            comments: '',
        });

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
        console.error('[Widget Feedback] Error:', err.message);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
