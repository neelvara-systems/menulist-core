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
import { canonicaStorageAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { hashApiKey, validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { coreSearch } from '@lib/search/searchCore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const MAX_QUERY_LENGTH = 500;
const MAX_WIDGET_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_WIDGET_IMAGE_BASE64_LENGTH = Math.ceil((MAX_WIDGET_IMAGE_BYTES * 4) / 3) + 100;
const ALLOWED_WIDGET_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const WidgetSearchRequestSchema = z.object({
    query: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
    context: z.unknown().optional(),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000).optional(),
    })).max(5).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
});

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

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: `widget:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
        });
        if (!rateLimitResult.allowed) {
            const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(Math.max(retryAfter, 1)) },
                }
            );
        }

        const authResult = await validatePublicApiKey(apiKey);
        if (!authResult) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            secureError(
                '[Widget Search] Invalid API key workspace context',
                new Error('Authenticated API key does not resolve to a valid tenant/store'),
                { storeId }
            );
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
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
        const validation = WidgetSearchRequestSchema.safeParse(await request.json());
        if (!validation.success) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const body = validation.data;
        const query = body.query;

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
                const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
                const imageMimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType.toLowerCase() : '';

                if (!ALLOWED_WIDGET_IMAGE_MIME_TYPES.has(imageMimeType)) {
                    throw new Error(`Unsupported widget image MIME type: ${imageMimeType || 'missing'}`);
                }
                if (!imageBase64 || imageBase64.length > MAX_WIDGET_IMAGE_BASE64_LENGTH) {
                    throw new Error('Widget image payload is empty or too large');
                }

                const imageBuffer = Buffer.from(imageBase64, 'base64');
                if (imageBuffer.byteLength > MAX_WIDGET_IMAGE_BYTES) {
                    throw new Error(`Widget image exceeds ${MAX_WIDGET_IMAGE_BYTES / 1024 / 1024}MB limit`);
                }

                const bucket = canonicaStorageAdmin.bucket();
                const imageId = `widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                const filePath = `widget-images/${tId}/${sId}/${imageId}`;
                const file = bucket.file(filePath);

                await file.save(imageBuffer, {
                    metadata: { contentType: imageMimeType },
                });

                // Generate signed URL (valid 15 min — enough for coreSearch processing)
                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 15 * 60 * 1000,
                });
                imageUrl = signedUrl;
            } catch (error) {
                // Graceful degradation — continue without image
                secureError('[Widget Search] Image upload failed', error as Error, { tId, sId });
                imageUrl = undefined;
            }
        }

        // ===== CONVERSATION HISTORY =====
        let conversationHistory: Array<{ role: 'user' | 'assistant'; content?: string }> | undefined;
        if (Array.isArray(body.conversationHistory) && body.conversationHistory.length > 0) {
            conversationHistory = body.conversationHistory.slice(-5).map((m) => ({
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
        secureError('[Widget Search] Error', err as Error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
