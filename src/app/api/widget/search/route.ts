export const dynamic = 'force-dynamic';

/**
 * Widget Search API — Public endpoint for embeddable help widget
 *
 * This is a THIN AUTH WRAPPER around the unified coreSearch() pipeline.
 * All retrieval logic lives in src/lib/search/searchCore.ts.
 *
 * Auth: API key via X-API-Key header (same as Platform Pull API)
 * No NextAuth required — this is for end-users of SaaS products embedding Canonica.
 * Rate limited per API key. Feature-flagged via ENABLE_CANONICA_WIDGET.
 *
 * @see src/lib/search/searchCore.ts — The canonical search pipeline
 * @see __docs__/canonica/help-widget/
 */

import { FEATURE_FLAGS } from '@config/features';
import { validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { coreSearch } from '@lib/search/searchCore';
import { NextRequest, NextResponse } from 'next/server';

const MAX_QUERY_LENGTH = 500;

export async function POST(request: NextRequest) {
    // Feature flag check
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

        // Rate limiting per API key
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `widget:${apiKey}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            );
        }

        // ===== ORIGIN ALLOWLIST CHECK =====
        const requestOrigin = request.headers.get('origin');
        const allowedOrigins: string[] | undefined = storeData.widgetAllowedOrigins;
        if (allowedOrigins && allowedOrigins.length > 0 && requestOrigin) {
            if (!allowedOrigins.includes(requestOrigin)) {
                return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
            }
        }

        // Parse and validate request body
        const body = await request.json();
        const query = typeof body.query === 'string' ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : '';

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // ===== CONTEXT-AWARE SUPPORT =====
        let validatedContext: import('@lib/validation/contextSchema').ValidatedContextPayload | undefined;
        if (body.context && FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_AWARE) {
            try {
                const { CanonicaContextSchema } = await import('@lib/validation/contextSchema');
                validatedContext = CanonicaContextSchema.parse(body.context);
            } catch {
                validatedContext = undefined;
            }
        }

        // ===== IMAGE HANDLING (base64 inline → temp Firebase Storage URL) =====
        let imageUrl: string | undefined;
        if (body.imageBase64 && body.imageMimeType) {
            try {
                const { getStorage } = await import('firebase-admin/storage');
                const bucket = getStorage().bucket();
                const imageId = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const filePath = `widget-images/${tId}/${sId}/${imageId}`;
                const file = bucket.file(filePath);
                const imageBuffer = Buffer.from(body.imageBase64, 'base64');

                await file.save(imageBuffer, {
                    metadata: { contentType: body.imageMimeType },
                });

                // Generate signed URL (valid 15 min — enough for coreSearch processing)
                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 15 * 60 * 1000,
                });
                imageUrl = signedUrl;
            } catch {
                // Graceful degradation — continue without image
                imageUrl = undefined;
            }
        }

        // ===== CONVERSATION HISTORY =====
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content?: string }> | undefined;
        if (Array.isArray(body.conversationHistory) && body.conversationHistory.length > 0) {
            conversationHistory = body.conversationHistory.slice(-5).map((m: any) => ({
                role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
                content: typeof m.content === 'string' ? m.content.slice(0, 2000) : '',
            }));
        }

        // ===== CORE SEARCH — Single source of truth =====
        const result = await coreSearch({
            query,
            mountContext: 'widget',
            tId,
            sId,
            productContext: validatedContext,
            conversationHistory,
            imageUrl,
        });

        // ===== FORMAT RESPONSE for Widget frontend =====
        // Widget expects: answer (not craftedAnswer), canonical, references (compact: id+title only)
        const compactReferences = (result.references || []).map((ref: any) => ({
            id: ref.id,
            title: ref.title,
        }));

        const response: Record<string, any> = {
            answer: result.craftedAnswer,
            canonical: result.canonical,
            references: compactReferences,
            suggestedQuestions: result.suggestedQuestions || [],
            searchHistoryId: result.searchHistoryId,
            imageProcessed: result.imageProcessed,
        };

        // Add canonical-specific fields when applicable
        if (result.canonical) {
            response.confidence = result.confidence;
            response.answerType = result.answerType;
        }

        // Add procedure for guided workflows
        if (result.procedure && FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS) {
            response.procedure = result.procedure;
        }

        // Add graph expansion data for Knowledge Graph Exploitation (Item #11)
        // Widget receives compact version: interaction explanation + related suggestions only
        if (result.graphExpansion && FEATURE_FLAGS.ENABLE_CANONICA_KNOWLEDGE_GRAPH) {
            response.graphExpansion = {
                interactionDetected: result.graphExpansion.interactionDetected || null,
                relatedSuggestions: result.graphExpansion.relatedSuggestions || [],
            };
        }

        return NextResponse.json(response);

    } catch (err: any) {
        console.error('[Widget Search] Error:', err.message);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
