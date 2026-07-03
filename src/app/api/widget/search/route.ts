export const dynamic = 'force-dynamic';

/**
 * Widget Search API — Public endpoint for embeddable help widget
 *
 * This is a THIN AUTH WRAPPER around the unified coreSearch() pipeline.
 * All retrieval logic lives in src/lib/search/searchCore.ts.
 *
 * Auth: API key via X-API-Key header (same as Platform Pull API)
 * No NextAuth required — this is for end-users of SaaS products embedding Answerlattice.
 * Rate limited per API key. Feature-flagged via ENABLE_ANSWERLATTICE_WIDGET.
 *
 * @see src/lib/search/searchCore.ts — The canonical search pipeline
 * @see __docs__/answerlattice/help-widget/
 */

import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { PRODUCT_IDS } from '@constant/product';
import { recordAiOperation } from '@lib/ai/operationLog';
import {
    ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH,
    ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
    isAllowedAnswerlatticeChatImageMimeType,
    normalizeAnswerlatticeChatImageMimeType,
} from '@lib/answerlattice/chatImagePolicy';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
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
import { coreSearch } from '@lib/search/searchCore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const MAX_QUERY_LENGTH = 500;
const WIDGET_SEARCH_MAX_BODY_BYTES = ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH + (64 * 1024);
const WIDGET_AUTH_CACHE_TTL_MS = 15_000;
const WidgetVisitorSchema = z.object({
    id: z.string().max(120).optional(),
    customerId: z.string().max(120).optional(),
    name: z.string().max(160).optional(),
    displayName: z.string().max(160).optional(),
    email: z.string().max(180).optional(),
}).strip();
const WidgetSearchRequestSchema = z.object({
    query: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
    context: z.unknown().optional(),
    visitor: WidgetVisitorSchema.optional(),
    sessionId: z.string().max(120).optional(),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000).optional(),
    })).max(5).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
}).superRefine((value, ctx) => {
    if (Boolean(value.imageBase64) !== Boolean(value.imageMimeType)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'imageBase64 and imageMimeType must be provided together',
            path: ['imageBase64'],
        });
    }
});

const isLikelyBase64 = (value: string): boolean => /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const cleanWidgetIdentityText = (value: unknown, maxLength = 160): string | null => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const cleanWidgetEmail = (value: unknown): string | null => {
    const email = cleanWidgetIdentityText(value, 180)?.toLowerCase() || null;
    if (!email) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const detectUserAgentFamily = (userAgent: string | null): string | null => {
    const value = String(userAgent || '').toLowerCase();
    if (!value) return null;
    if (value.includes('edg/')) return 'edge';
    if (value.includes('chrome/') || value.includes('crios/')) return 'chrome';
    if (value.includes('firefox/') || value.includes('fxios/')) return 'firefox';
    if (value.includes('safari/')) return 'safari';
    return 'other';
};

const jsonResponse = (
    request: NextRequest,
    body: Record<string, any>,
    init?: ResponseInit,
): NextResponse => withPublicApiCors(NextResponse.json(body, init), request);

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function POST(request: NextRequest) {
    // Feature flag check
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
            key: `widget:${apiKeyRateLimitId}`,
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
                { error: 'Search is temporarily unavailable. Please try again later.' },
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
                { error: 'Rate limit exceeded. Please try again later.' },
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
        if (!hasPublicApiCredentialScope(credential, 'widget:search')) {
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            logRuntimeFailure('answerlattice_widget_search_invalid_workspace_context', undefined, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
            });
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        // ===== ORIGIN ALLOWLIST CHECK =====
        const requestOrigin = request.headers.get('origin');
        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
            return jsonResponse(request, { error: 'Origin not allowed' }, { status: 403 });
        }

        // Parse and validate request body
        const bodyResult = await readBoundedJsonBody(request, WIDGET_SEARCH_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Query is required',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return jsonResponse(
                request,
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Query is required' },
                { status: bodyResult.response.status },
            );
        }

        const validation = WidgetSearchRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return jsonResponse(request, { error: 'Query is required' }, { status: 400 });
        }
        const body = validation.data;
        const query = body.query;

        // ===== CONTEXT-AWARE SUPPORT =====
        let validatedContext: import('@lib/validation/contextSchema').ValidatedContextPayload | undefined;
        if (body.context && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE) {
            try {
                const { AnswerlatticeContextSchema } = await import('@lib/validation/contextSchema');
                validatedContext = AnswerlatticeContextSchema.parse(body.context);
            } catch {
                validatedContext = undefined;
            }
        }

        // ===== IMAGE HANDLING (base64 inline → coreSearch image buffer) =====
        let imageBuffer: { imageBase64: string; mimeType: string } | undefined;
        if (body.imageBase64 && body.imageMimeType) {
            try {
                const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
                const imageMimeType = normalizeAnswerlatticeChatImageMimeType(body.imageMimeType);

                if (!isAllowedAnswerlatticeChatImageMimeType(imageMimeType)) {
                    throw new Error(`Unsupported widget image MIME type: ${imageMimeType || 'missing'}`);
                }
                if (!imageBase64 || imageBase64.length > ANSWERLATTICE_CHAT_IMAGE_MAX_BASE64_LENGTH) {
                    throw new Error('Widget image payload is empty or too large');
                }
                if (!isLikelyBase64(imageBase64)) {
                    throw new Error('Widget image payload is not valid base64');
                }

                const decodedImage = Buffer.from(imageBase64, 'base64');
                if (!decodedImage.byteLength || decodedImage.byteLength > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
                    throw new Error(`Widget image exceeds ${ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / 1024 / 1024}MB limit`);
                }
                imageBuffer = { imageBase64, mimeType: imageMimeType };
            } catch (error) {
                // Graceful degradation — continue without image
                logRuntimeFailure('answerlattice_widget_search_image_upload_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                    ...getBoundedRuntimeStringContext('imageMimeType', body.imageMimeType),
                });
                imageBuffer = undefined;
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
        const operationStart = Date.now();
        const result = await coreSearch({
            query,
            mountContext: 'widget',
            tId,
            sId,
            uId: cleanWidgetIdentityText(body.visitor?.id || body.visitor?.customerId, 120) || 'widget',
            mode: conversationHistory && conversationHistory.length > 0 ? 'assistant' : 'qna',
            productContext: validatedContext,
            conversationHistory,
            imageBuffer,
            requestMetadata: {
                visitorId: cleanWidgetIdentityText(body.visitor?.id || body.visitor?.customerId, 120),
                visitorName: cleanWidgetIdentityText(body.visitor?.name || body.visitor?.displayName, 160),
                visitorEmail: cleanWidgetEmail(body.visitor?.email),
                widgetSessionId: cleanWidgetIdentityText(body.sessionId, 120),
                requestOrigin: cleanWidgetIdentityText(requestOrigin, 180),
                requestPath: cleanWidgetIdentityText(validatedContext?.path, 180),
                userAgentFamily: detectUserAgentFamily(request.headers.get('user-agent')),
            },
        });

        // ===== FORMAT RESPONSE for Widget frontend =====
        // Widget expects: answer (not craftedAnswer), canonical, references (compact: id+title only)
        const compactReferences = (result.references || []).map((ref: any) => ({
            id: ref.id,
            title: ref.title,
            url: ref.url,
        }));

        const response: Record<string, any> = {
            answer: result.craftedAnswer,
            canonical: result.canonical,
            references: compactReferences,
            suggestedQuestions: result.suggestedQuestions || [],
            searchHistoryId: result.searchHistoryId,
            imageProcessed: result.imageProcessed,
            answerSource: result.answerSource || (result.canonical ? 'canonical' : 'rag'),
        };

        if (result.relatedContent) {
            response.relatedContent = {
                key: result.relatedContent.key,
                label: result.relatedContent.label,
                articles: result.relatedContent.articles || [],
                faqs: result.relatedContent.faqs || [],
                changelogs: result.relatedContent.changelogs || [],
            };
        }

        // Add canonical-specific fields when applicable
        if (result.canonical) {
            response.confidence = result.confidence;
            response.answerType = result.answerType;
        }

        // Add procedure for guided workflows
        if (result.procedure && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS) {
            response.procedure = result.procedure;
        }

        // Add graph expansion data for Knowledge Graph Exploitation (Item #11)
        // Widget receives compact version: interaction explanation + related suggestions only
        if (result.graphExpansion && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) {
            response.graphExpansion = {
                interactionDetected: result.graphExpansion.interactionDetected || null,
                relatedSuggestions: result.graphExpansion.relatedSuggestions || [],
            };
        }

        if (result.aiProviderUsed) {
            recordAiOperation({
                action: AI_ACTIONS_TYPES.ANSWERLATTICE_WIDGET_SEARCH,
                billingMode: 'public',
                clientResponse: {
                    aiProviderOperations: result.aiProviderOperations || [],
                    answerType: result.answerType || null,
                    answerSource: result.answerSource || null,
                    canonical: Boolean(result.canonical),
                    imageProcessed: Boolean(result.imageProcessed),
                    referencesCount: compactReferences.length,
                    searchHistoryId: result.searchHistoryId || null,
                    suggestedQuestionsCount: result.suggestedQuestions?.length || 0,
                },
                model: 'coreSearch',
                pId: PRODUCT_IDS.ANSWERLATTICE,
                processingTime: Date.now() - operationStart,
                promptTokenCount: result.aiProviderTokenUsage?.promptTokenCount || 0,
                sId,
                source: 'answerlattice_widget_search',
                tId,
                totalTokenCount: result.aiProviderTokenUsage?.totalTokenCount || 0,
                candidatesTokenCount: result.aiProviderTokenUsage?.candidatesTokenCount || 0,
                tokenCountSource: result.aiProviderTokenUsage?.tokenCountSource || 'none',
                uId: 'widget',
            }).catch((error) => {
                logRuntimeFailure('answerlattice_widget_search_operation_log_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                    ...getBoundedRuntimeStringContext('searchHistoryId', result.searchHistoryId),
                });
            });
        }

        return jsonResponse(request, response);

    } catch (err: any) {
        if (isAIProviderRateLimitError(err)) {
            const retryAfter = getAIProviderRetryAfter(err) || 60;
            return jsonResponse(
                request,
                {
                    error: `Search is temporarily busy. Please wait ${retryAfter} seconds before trying again.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Retry-After': String(retryAfter),
                    },
                }
            );
        }
        logRuntimeFailure('answerlattice_widget_search_failed', err);
        return jsonResponse(
            request,
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}
