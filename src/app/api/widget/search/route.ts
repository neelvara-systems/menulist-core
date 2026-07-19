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
import { PRODUCT_IDS } from '@constant/product';
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
    validatePublicApiKey,
    withPublicApiCors,
} from '@lib/publicApi/auth';
import {
    ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER,
    isAnswerlatticeWidgetRuntimeRequestAuthorized,
} from '@lib/answerlattice/widgetRuntimeTokenServer';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { coreSearch } from '@lib/search/searchCore';
import {
    normalizeAnswerlatticeEvidenceLinks,
    verifyAnswerlatticeVisitorToken,
} from '@lib/answerlattice/verifiedWidgetContextServer';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import {
    AnswerlatticeSupportSearchCapacityError,
    createAnswerlatticeSupportSearchAccounting,
} from '@lib/answerlattice/supportSearchAccounting';
import {
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticePublicCitationUrl,
    normalizeAnswerlatticePublicFallbackReason,
    normalizeAnswerlatticeScopeClarification,
} from '@lib/answerlattice/publicAnswerContracts';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

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
    requestId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
    query: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
    context: z.unknown().optional(),
    visitor: WidgetVisitorSchema.optional(),
    sessionId: z.string().max(120).optional(),
    verifiedContextToken: z.string().max(4096).optional(),
    evidenceLinks: z.array(z.object({
        url: z.string().max(1000),
        label: z.string().max(80).optional(),
    }).strict()).max(3).optional(),
    conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2000),
    }).strict()).max(5).optional(),
    imageBase64: z.string().optional(),
    imageMimeType: z.string().optional(),
}).strict().superRefine((value, ctx) => {
    if (Boolean(value.imageBase64) !== Boolean(value.imageMimeType)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'imageBase64 and imageMimeType must be provided together',
            path: ['imageBase64'],
        });
    }
});

const isLikelyBase64 = (value: string): boolean => /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const stripUnverifiedSensitiveContext = (value: unknown): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const publicContext = { ...(value as Record<string, unknown>) };
    delete publicContext.plan;
    delete publicContext.role;
    delete publicContext.userRole;
    delete publicContext.locale;
    return publicContext;
};

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
): NextResponse => {
    const response = NextResponse.json(body, init);
    if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', 'private, no-store');
    return withPublicApiCors(response, request);
};

const widgetRateLimitResponse = (
    request: NextRequest,
    result: Awaited<ReturnType<typeof checkRateLimit>>,
) => {
    if (result.allowed) return null;
    const providerUnavailable = result.reason === 'provider_unavailable';
    const retryAfter = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1);
    return jsonResponse(
        request,
        {
            error: providerUnavailable
                ? 'Search is temporarily unavailable. Please try again later.'
                : 'Rate limit exceeded. Please try again later.',
        },
        {
            status: providerUnavailable ? 503 : 429,
            headers: {
                'Cache-Control': 'no-store',
                'Retry-After': String(retryAfter),
            },
        },
    );
};

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

        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const preAuthRateLimitResult = await checkRateLimit({
            key: `widget-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 60),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        const preAuthRateLimitResponse = widgetRateLimitResponse(request, preAuthRateLimitResult);
        if (preAuthRateLimitResponse) return preAuthRateLimitResponse;

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitResult = await checkRateLimit({
            key: `widget:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        const apiKeyRateLimitResponse = widgetRateLimitResponse(request, rateLimitResult);
        if (apiKeyRateLimitResponse) return apiKeyRateLimitResponse;

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
        const tId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
        const sId = normalizeAnswerlatticeScopeDocumentId(storeData.id ?? storeId);
        if (!tId || !sId) {
            logRuntimeFailure('answerlattice_widget_search_invalid_workspace_context', undefined, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
            });
            return jsonResponse(request, { error: 'Invalid API key' }, { status: 401 });
        }

        // ===== ORIGIN ALLOWLIST CHECK =====
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
        const requestId = body.requestId;
        const query = body.query;

        const hasVerifiedContextToken = Boolean(body.verifiedContextToken);
        const verifiedVisitor = body.verifiedContextToken
            ? FEATURE_FLAGS.ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT
                ? verifyAnswerlatticeVisitorToken(body.verifiedContextToken, storeData.answerlatticeVerifiedContext)
                : null
            : null;
        const verifiedContextRejected = hasVerifiedContextToken && !verifiedVisitor;
        const acceptUnsignedVisitor = !hasVerifiedContextToken;
        const evidenceLinks = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS
            ? normalizeAnswerlatticeEvidenceLinks(body.evidenceLinks, storeData.answerlatticeEvidenceAllowedHosts)
            : [];

        // ===== CONTEXT-AWARE SUPPORT =====
        let validatedContext: import('@lib/validation/contextSchema').ValidatedContextPayload | undefined;
        if (body.context && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE) {
            try {
                const { AnswerlatticeContextSchema } = await import('@lib/validation/contextSchema');
                validatedContext = AnswerlatticeContextSchema.parse(
                    verifiedContextRejected
                        ? stripUnverifiedSensitiveContext(body.context)
                        : body.context,
                );
            } catch {
                validatedContext = undefined;
            }
        }
        if (verifiedVisitor && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_AWARE) {
            try {
                const { AnswerlatticeContextSchema } = await import('@lib/validation/contextSchema');
                validatedContext = AnswerlatticeContextSchema.parse({
                    ...(validatedContext || {}),
                    ...(verifiedVisitor.plan ? { plan: verifiedVisitor.plan } : {}),
                    ...(verifiedVisitor.role ? { role: verifiedVisitor.role, userRole: verifiedVisitor.role } : {}),
                    ...(verifiedVisitor.locale ? { locale: verifiedVisitor.locale } : {}),
                });
            } catch {
                return jsonResponse(request, { error: 'Invalid verified context claims' }, { status: 401 });
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
        const supportSearchAccounting = createAnswerlatticeSupportSearchAccounting({
            actor: {
                id: verifiedVisitor?.id || 'widget',
                name: verifiedVisitor?.name || null,
                email: verifiedVisitor?.email || null,
            },
            mountContext: 'widget',
            requestId,
            scope: { tId, sId },
        });
        const result = await coreSearch({
            query,
            mountContext: 'widget',
            tId,
            sId,
            uId: verifiedVisitor?.id
                || (acceptUnsignedVisitor ? cleanWidgetIdentityText(body.visitor?.id || body.visitor?.customerId, 120) : null)
                || 'widget',
            mode: conversationHistory && conversationHistory.length > 0 ? 'assistant' : 'qna',
            productContext: validatedContext,
            conversationHistory,
            imageBuffer,
            requestMetadata: {
                visitorId: verifiedVisitor?.id
                    || (acceptUnsignedVisitor ? cleanWidgetIdentityText(body.visitor?.id || body.visitor?.customerId, 120) : null),
                visitorName: verifiedVisitor?.name
                    || (acceptUnsignedVisitor ? cleanWidgetIdentityText(body.visitor?.name || body.visitor?.displayName, 160) : null),
                visitorEmail: verifiedVisitor?.email
                    || (acceptUnsignedVisitor ? cleanWidgetEmail(body.visitor?.email) : null),
                widgetSessionId: cleanWidgetIdentityText(body.sessionId, 120),
                requestOrigin: cleanWidgetIdentityText(requestOrigin, 180),
                userAgentFamily: detectUserAgentFamily(request.headers.get('user-agent')),
                visitorVerified: Boolean(verifiedVisitor),
                evidenceLinks,
            },
            beforeAiProviderCall: supportSearchAccounting.beforeAiProviderCall,
        });
        await supportSearchAccounting.settle(result, Date.now() - operationStart);

        // ===== FORMAT RESPONSE for Widget frontend =====
        // Keep KB references separate from reviewer-approved canonical citations.
        const compactReferences = (result.references || []).slice(0, 12).flatMap((ref: any) => {
            const id = typeof ref?.id === 'string' ? ref.id.trim().slice(0, 180) : '';
            const title = typeof ref?.title === 'string' ? ref.title.trim().slice(0, 300) : '';
            if (!id || !title) return [];
            const url = normalizeAnswerlatticePublicCitationUrl(ref.url);
            return [{ id, title, ...(url ? { url } : {}) }];
        });
        const publicFallbackReason = normalizeAnswerlatticePublicFallbackReason(result.fallbackReason);

        const response: Record<string, any> = {
            answer: result.craftedAnswer,
            canonical: result.canonical,
            references: compactReferences,
            citations: normalizeAnswerlatticePublicCitations(result.citations),
            suggestedQuestions: result.suggestedQuestions || [],
            searchHistoryId: result.searchHistoryId,
            imageProcessed: result.imageProcessed,
            answerSource: result.answerSource || (result.canonical ? 'canonical' : 'rag'),
            fallbackReason: publicFallbackReason,
            fallbackSuggested: result.answerSource === 'empty'
                || Boolean(publicFallbackReason)
                || result.escalation?.escalationSuggested === true,
            clarification: normalizeAnswerlatticeScopeClarification(result.clarification),
        };

        if (result.relatedContent) {
            response.relatedContent = {
                key: result.relatedContent.key,
                label: result.relatedContent.label,
                articles: (result.relatedContent.articles || []).slice(0, 5).map((article: any) => ({
                    id: article.id,
                    title: article.title,
                })),
                faqs: (result.relatedContent.faqs || []).slice(0, 5).map((faq: any) => ({
                    id: faq.id,
                    question: faq.question,
                    ...(faq.articleId ? { articleId: faq.articleId } : {}),
                })),
                changelogs: (result.relatedContent.changelogs || []).slice(0, 3).map((entry: any) => ({
                    id: entry.id,
                    ...(entry.pageId ? { pageId: entry.pageId } : {}),
                    title: entry.title,
                    ...(entry.version ? { version: entry.version } : {}),
                })),
            };
        }

        // Add canonical-specific fields when applicable
        if (result.confidence) {
            response.confidence = result.confidence;
        }
        if (result.canonical) {
            response.answerType = result.answerType;
        }

        // Add procedure for guided workflows
        if (result.canonical && result.procedure && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS) {
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

        return jsonResponse(request, response);

    } catch (err: any) {
        if (err instanceof AnswerlatticeSupportSearchCapacityError) {
            return jsonResponse(request, {
                error: err.message,
                code: err.code,
                remainingCredits: err.remaining,
                requiredCredits: err.required,
            }, { status: err.status });
        }

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
