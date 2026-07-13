export const dynamic = 'force-dynamic';

/**
 * Answerlattice — Article Translation API
 *
 * Translates a KB article's title and content to a target locale using Gemini.
 * Stores the translation on the article document: translations.{locale} = { ... }
 *
 * Phase 4 — Multi-Language KB Articles (4.2)
 * Feature-flagged: ENABLE_ANSWERLATTICE_MULTI_LANGUAGE
 *
 * POST /api/answerlattice/translate
 * Body: { articleId, targetLocale }
 *
 * @see __docs__/answerlattice/answerlattice-build-priority-roadmap.md Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_TEXT_MODEL } from '@constant/answerlattice/ai';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { bumpAnswerlatticeCacheVersionAdmin } from '@lib/answerlattice/cacheVersionAdmin';
import { ANSWERLATTICE_CACHE_SOURCES } from '@lib/answerlattice/cacheVersionManifest';
import { answerlatticeGenAIClient } from '@lib/answerlattice/genAiClient';
import {
    ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH,
    normalizeAnswerlatticeKbArticleId,
} from '@lib/answerlattice/kbArticleIdBoundary';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { ANSWERLATTICE_SUPPORTED_LOCALES } from '@type/answerlattice';
import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const TranslateRequestSchema = z.object({
    articleId: z.string().trim().max(ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH)
        .refine((value) => normalizeAnswerlatticeKbArticleId(value) === value),
    targetLocale: z.enum(ANSWERLATTICE_SUPPORTED_LOCALES as unknown as [string, ...string[]]),
}).strict();
const TRANSLATE_ARTICLE_MAX_BODY_BYTES = 4 * 1024;
const MAX_TRANSLATION_TEXT_FOR_PROMPT = 8000;
const MAX_TRANSLATED_CONTENT_CHARS = 12000;
const MAX_TRANSLATED_TITLE_CHARS = 300;
const TRANSLATION_PROVIDER_RESPONSE_TEXT_MAX_CHARS = 64 * 1024;

type BoundedTranslationProviderResponseText = {
    originalLength: number;
    text: string;
    truncated: boolean;
};

class AnswerlatticeTranslationProviderOutputError extends Error {
    readonly code = 'ANSWERLATTICE_TRANSLATION_RESPONSE_TOO_LARGE';

    constructor() {
        super('ANSWERLATTICE_TRANSLATION_RESPONSE_TOO_LARGE');
        this.name = 'AnswerlatticeTranslationProviderOutputError';
    }
}

const cleanTranslationOutput = (value: unknown, fallback: string, maxLength: number): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback || '').slice(0, maxLength);
};

const getRawTranslationResponseText = (response: any): string => {
    if (!response) return '';
    if (typeof response.text === 'function') return String(response.text() || '');
    if (typeof response.text === 'string') return response.text;
    return '';
};

const getTranslationResponseText = (response: any): BoundedTranslationProviderResponseText => {
    const rawText = getRawTranslationResponseText(response);
    return {
        originalLength: rawText.length,
        text: rawText.slice(0, TRANSLATION_PROVIDER_RESPONSE_TEXT_MAX_CHARS),
        truncated: rawText.length > TRANSLATION_PROVIDER_RESPONSE_TEXT_MAX_CHARS,
    };
};

export const POST = withAuth(async (request: NextRequest, session) => {
    let tenantIdForLog: number | string | undefined;
    let storeIdForLog: number | string | undefined;
    const userIdForLog = session.uId || session.user?.id;
    let articleIdForLog: string | undefined;
    let targetLocaleForLog: string | undefined;

    try {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MULTI_LANGUAGE) {
            return NextResponse.json({ error: 'Multi-language is not enabled.' }, { status: 403 });
        }

        const sessionScope = resolveAnswerlatticeSessionScope(session);
        tenantIdForLog = sessionScope?.tenantId;
        storeIdForLog = sessionScope?.storeId;
        if (!sessionScope) {
            return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
        }

        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // Rate limiting
        const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-translate', userIdForLog || 'unknown', sessionScope.tenantId, sessionScope.storeId),
            ...rateLimitConfig,
        });
        if (
            rateLimitResult.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && rateLimitResult.current === 0
            && rateLimitResult.remaining === rateLimitConfig.limit
        ) {
            return NextResponse.json(
                { error: 'Translation is temporarily unavailable. Please try again later.' },
                { status: 503, headers: { 'Cache-Control': 'no-store' } },
            );
        }
        if (!rateLimitResult.allowed) {
            const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
            return NextResponse.json(
                { error: 'Rate limit exceeded. Try again later.' },
                {
                    status: 429,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Retry-After': String(Math.max(retryAfter, 1)),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return permission.response;

        const bodyResult = await readBoundedJsonBody(request, TRANSLATE_ARTICLE_MAX_BODY_BYTES, {
            invalidJsonMessage: `Invalid translation request. Supported locales: ${ANSWERLATTICE_SUPPORTED_LOCALES.join(', ')}`,
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                {
                    error: bodyResult.response.status === 413
                        ? 'Request body too large.'
                        : `Invalid translation request. Supported locales: ${ANSWERLATTICE_SUPPORTED_LOCALES.join(', ')}`,
                },
                { status: bodyResult.response.status },
            );
        }

        const validation = TranslateRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return NextResponse.json({ error: `Invalid translation request. Supported locales: ${ANSWERLATTICE_SUPPORTED_LOCALES.join(', ')}` }, { status: 400 });
        }
        const { articleId, targetLocale } = validation.data;
        if (targetLocale === 'en-US') {
            return NextResponse.json({ error: 'Cannot translate to source locale (en-US).' }, { status: 400 });
        }
        articleIdForLog = articleId;
        targetLocaleForLog = targetLocale;

        // Fetch article
        const db = answerlatticeFirestoreAdmin;
        const articleDoc = await db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId).get();
        if (!articleDoc.exists) {
            return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
        }

        const article = articleDoc.data()!;
        const articleTenantId = normalizeAnswerlatticeScopeDocumentId(article.tId ?? article.tenantId);
        const articleStoreId = normalizeAnswerlatticeScopeDocumentId(article.sId ?? article.storeId);
        if (
            !articleTenantId ||
            !articleStoreId ||
            articleTenantId !== sessionScope.tenantId ||
            articleStoreId !== sessionScope.storeId
        ) {
            return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
        }

        const title = article.title || '';

        // Extract plain text from TipTap JSON content for translation
        let plainContent = '';
        try {
            if (article.content && typeof article.content === 'object') {
                plainContent = extractTextFromTiptap(article.content);
            } else if (typeof article.content === 'string') {
                plainContent = article.content;
            }
        } catch {
            plainContent = JSON.stringify(article.content || '');
        }
        plainContent = plainContent.replace(/\s+\n/g, '\n').trim();

        if (!title && !plainContent) {
            return NextResponse.json({ error: 'Article has no content to translate.' }, { status: 400 });
        }
        if (plainContent.length > MAX_TRANSLATION_TEXT_FOR_PROMPT) {
            return NextResponse.json(
                { error: 'Article is too long for one-click translation. Shorten or split it before translating.' },
                { status: 413 },
            );
        }

        // Call Gemini for translation
        const LOCALE_NAMES: Record<string, string> = {
            'en-GB': 'British English', 'hi-IN': 'Hindi', 'ar-SA': 'Arabic',
            'es-ES': 'Spanish', 'fr-FR': 'French', 'de-DE': 'German',
            'pt-BR': 'Brazilian Portuguese', 'ja-JP': 'Japanese', 'zh-CN': 'Simplified Chinese',
            'ko-KR': 'Korean', 'it-IT': 'Italian', 'nl-NL': 'Dutch',
            'ru-RU': 'Russian', 'tr-TR': 'Turkish',
        };
        const targetLanguage = LOCALE_NAMES[targetLocale] || targetLocale;

        const prompt = `You are a professional translator for a SaaS help center knowledge base.

Translate the following KB article from English to ${targetLanguage}.

RULES:
- Maintain the original meaning precisely
- Keep technical terms in English if they have no standard translation (e.g., "API", "webhook", "dashboard")
- Use formal/professional tone appropriate for product documentation
- Do NOT add, remove, or modify any information
- Preserve any formatting markers or structure

TITLE (English):
${title}

CONTENT (English):
${plainContent}

Respond in this exact JSON format:
{
  "translatedTitle": "...",
  "translatedContent": "..."
}`;

        const operationStart = Date.now();
        const response = await answerlatticeGenAIClient.models.generateContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            contents: prompt,
        });

        const responseTextResult = getTranslationResponseText(response);
        if (responseTextResult.truncated) {
            throw new AnswerlatticeTranslationProviderOutputError();
        }
        const responseText = responseTextResult.text;

        // Parse response
        let translatedTitle = title;
        let translatedContent = plainContent;

        try {
            const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            translatedTitle = cleanTranslationOutput(parsed.translatedTitle, title, MAX_TRANSLATED_TITLE_CHARS);
            translatedContent = cleanTranslationOutput(parsed.translatedContent, plainContent, MAX_TRANSLATED_CONTENT_CHARS);
        } catch {
            // If JSON parse fails, use raw response as content
            translatedContent = cleanTranslationOutput(responseText, plainContent, MAX_TRANSLATED_CONTENT_CHARS);
        }

        // Build TipTap JSON for translated content (simple paragraph wrapping)
        const translatedTiptapContent = {
            type: 'doc',
            content: translatedContent.split('\n\n').filter(Boolean).map((paragraph: string) => ({
                type: 'paragraph',
                content: [{ type: 'text', text: paragraph.trim() }],
            })),
        };

        // Save translation to article document
        const now = admin.firestore.Timestamp.now();
        await bumpAnswerlatticeCacheVersionAdmin(ANSWERLATTICE_CACHE_SOURCES.KB, articleTenantId, articleStoreId, {
            reason: 'article_translation_update',
            sourceId: articleId,
            sourceType: 'kb_article',
        });
        await db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId).update({
            [`translations.${targetLocale}`]: {
                locale: targetLocale,
                title: translatedTitle,
                content: translatedTiptapContent,
                translatedBy: 'ai',
                translatedAt: now,
            },
        });

        recordAnswerlatticeAiOperation({
            tId: sessionScope.tenantId,
            sId: sessionScope.storeId,
        }, {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_TRANSLATION,
            articleId,
            billingMode: 'internal',
            clientResponse: {
                targetLocale,
                translatedContentLength: translatedContent.length,
                translatedTitleLength: translatedTitle.length,
            },
            geminiResponse: response,
            model: ANSWERLATTICE_TEXT_MODEL,
            processingTime: Date.now() - operationStart,
            source: 'answerlattice_translate',
        }, {
            id: session.user?.id,
            name: session.user?.name,
            email: session.user?.email,
        }).catch((logError) => {
            logRuntimeFailure('answerlattice_translation_operation_log_failed', logError, {
                ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
                ...getBoundedRuntimeStringContext('articleId', articleId),
                ...getBoundedRuntimeStringContext('targetLocale', targetLocale),
            });
        });

        return NextResponse.json({
            articleId,
            locale: targetLocale,
            translatedTitle,
            translatedBy: 'ai',
        });

    } catch (error) {
        if (isAIProviderRateLimitError(error)) {
            const retryAfter = getAIProviderRetryAfter(error) || 60;
            return NextResponse.json(
                {
                    error: `Translation is temporarily busy. Please wait ${retryAfter} seconds before trying again.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Retry-After': String(retryAfter),
                    },
                },
            );
        }
        logRuntimeFailure('answerlattice_translation_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
            ...getBoundedRuntimeStringContext('articleId', articleIdForLog),
            ...getBoundedRuntimeStringContext('targetLocale', targetLocaleForLog),
        });
        return NextResponse.json(
            { error: 'Translation failed. Please try again.' },
            { status: 500 }
        );
    }
});

/**
 * Extract plain text from TipTap JSON content recursively.
 */
function extractTextFromTiptap(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';

    let text = '';
    if (Array.isArray(node.content)) {
        for (const child of node.content) {
            text += extractTextFromTiptap(child);
            if (child.type === 'paragraph' || child.type === 'heading' || child.type === 'bulletList' || child.type === 'orderedList') {
                text += '\n\n';
            }
        }
    }
    return text;
}
