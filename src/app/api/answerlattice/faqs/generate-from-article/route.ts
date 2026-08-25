export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_TEXT_MODEL } from '@constant/answerlattice/ai';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import {
    ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT,
    ANSWERLATTICE_FAQ_GENERATED_PER_ARTICLE_LIMIT,
    normalizeGeneratedFaqs,
} from '@lib/answerlattice/faqContent';
import { answerlatticeGenAIClient } from '@lib/answerlattice/genAiClient';
import { normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    isExactAnswerlatticePersistedAuthority,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import {
    ANSWERLATTICE_FAQ_SOURCE,
    ANSWERLATTICE_FAQ_STATUS,
    type AnswerlatticeFaq,
} from '@type/answerlattice';
import { type KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const GenerateFaqRequestSchema = z.object({
    articleId: z.string().trim().refine((value) => normalizeAnswerlatticeKbArticleId(value) === value),
}).strict();

const GENERATE_FAQ_FROM_ARTICLE_MAX_BODY_BYTES = 4 * 1024;
const MAX_ARTICLE_TEXT_FOR_PROMPT = 6000;
const FAQ_PROVIDER_RESPONSE_TEXT_MAX_CHARS = 32 * 1024;

type BoundedFaqProviderResponseText = {
    originalLength: number;
    text: string;
    truncated: boolean;
};

type AnswerlatticeGeneratedFaqDocument = Omit<
    AnswerlatticeFaq,
    'publishedOn' | 'lastReviewedOn' | 'reviewRequestedOn' | 'createdOn' | 'modifiedOn'
> & {
    publishedOn: null;
    lastReviewedOn: null;
    reviewRequestedOn: Timestamp;
    createdOn: Timestamp;
    modifiedOn: Timestamp;
};

class FaqGenerationConflictError extends Error {
    constructor(public readonly publicMessage: string) {
        super(publicMessage);
        this.name = 'FaqGenerationConflictError';
    }
}

class FaqGenerationProviderOutputError extends Error {
    constructor() {
        super('FAQ provider output exceeded the response boundary.');
        this.name = 'FaqGenerationProviderOutputError';
    }
}

const privateJson = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return (NextResponse.json)(body, { ...init, headers });
};

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

const normalizeQuestionKey = (value: unknown): string => (
    typeof value === 'string'
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
        : ''
);

const extractJsonObject = (value: string): Record<string, unknown> | null => {
    const cleaned = value.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    if (!cleaned) return null;

    try {
        const parsed = JSON.parse(cleaned);
        return Array.isArray(parsed) ? { faqs: parsed } : parsed;
    } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace < 0 || lastBrace <= firstBrace) return null;
        try {
            const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
            return Array.isArray(parsed) ? { faqs: parsed } : parsed;
        } catch {
            return null;
        }
    }
};

const getRawResponseText = (response: any): string => {
    if (!response) return '';
    if (typeof response.text === 'function') return String(response.text() || '');
    if (typeof response.text === 'string') return response.text;
    return '';
};

const getResponseText = (response: any): BoundedFaqProviderResponseText => {
    const rawText = getRawResponseText(response);
    return {
        originalLength: rawText.length,
        text: rawText.slice(0, FAQ_PROVIDER_RESPONSE_TEXT_MAX_CHARS),
        truncated: rawText.length > FAQ_PROVIDER_RESPONSE_TEXT_MAX_CHARS,
    };
};

const getArticleFaqSourceFingerprint = (article: KnowledgeBaseArticleType): string => createHash('sha256')
    .update(JSON.stringify({
        title: article.title || '',
        content: extractPlainTextFromEditorContent(article.content || ''),
        categoryTitle: article.categoryTitle || '',
        sectionTitle: article.sectionTitle || '',
        tags: Array.isArray(article.tags) ? article.tags : [],
        contextKeys: Array.isArray(article.contextKeys) ? article.contextKeys : [],
        entityIds: Array.isArray(article.entityIds) ? article.entityIds : [],
        jobId: article.jobId || null,
    }))
    .digest('hex');

const buildFaqPrompt = (article: KnowledgeBaseArticleType, text: string) => {
    const tags = Array.isArray(article.tags) ? article.tags.filter(Boolean).slice(0, 12).join(', ') : '';
    const contextKeys = Array.isArray(article.contextKeys) ? article.contextKeys.filter(Boolean).slice(0, 12).join(', ') : '';
    const entityIds = Array.isArray(article.entityIds) ? article.entityIds.filter(Boolean).slice(0, 12).join(', ') : '';

    return `You generate owner-reviewable FAQ suggestions for a SaaS product help center.

Return JSON only:
{
  "faqs": [
    {
      "question": "Short customer question",
      "answer": "Short source-backed answer",
      "tags": ["optional"],
      "contextKeys": ["optional"],
      "entityIds": ["optional"]
    }
  ]
}

Rules:
- Generate at most ${ANSWERLATTICE_FAQ_GENERATED_PER_ARTICLE_LIMIT} FAQs.
- Use only facts directly supported by the article.
- Do not invent policies, pricing, timelines, integrations, or support commitments.
- Prefer repeated customer questions that can be answered in 1-3 sentences.
- Keep answers under 600 characters.
- If the article does not support useful FAQs, return {"faqs":[]}.

Article metadata:
Title: ${article.title || ''}
Category: ${article.categoryTitle || ''}
Section: ${article.sectionTitle || ''}
Tags: ${tags}
Product surfaces: ${contextKeys}
Entity IDs: ${entityIds}

Article content:
${text.slice(0, MAX_ARTICLE_TEXT_FOR_PROMPT)}`;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    let tenantIdForLog: number | string | undefined;
    let storeIdForLog: number | string | undefined;
    const userIdForLog = resolveCurrentSessionUserDocumentId(session);
    let articleIdForLog: string | undefined;

    try {
        if (!userIdForLog) {
            return privateJson({ error: 'Forbidden' }, { status: 403 });
        }
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT) {
            return privateJson({ error: 'FAQ management is not enabled.' }, { status: 404 });
        }

        const sessionScope = resolveAnswerlatticeSessionScope(session);
        tenantIdForLog = sessionScope?.tenantId;
        storeIdForLog = sessionScope?.storeId;
        if (!sessionScope) {
            return privateJson({ error: 'Answerlattice workspace is not available.' }, { status: 400 });
        }
        const tenantId = sessionScope.tenantId;
        const storeId = sessionScope.storeId;

        const { checkAnswerlatticeSafeMode } = await import('@lib/answerlattice/safeMode');
        const safeModeResponse = await checkAnswerlatticeSafeMode();
        if (safeModeResponse) return withPrivateHeaders(safeModeResponse);

        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-faq-generation', tenantId, storeId, userIdForLog),
            limit: 8,
            window: 3600,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            return privateJson(
                {
                    error: providerUnavailable
                        ? 'FAQ generation is temporarily unavailable. Try again later.'
                        : 'Too many FAQ refresh requests. Try again later.',
                },
                { status: providerUnavailable ? 503 : 429 },
            );
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return withPrivateHeaders(permission.response);

        const bodyResult = await readBoundedJsonBody(request, GENERATE_FAQ_FROM_ARTICLE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid FAQ generation request.',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return privateJson(
                { error: bodyResult.response.status === 413 ? 'Request body too large.' : 'Invalid FAQ generation request.' },
                { status: bodyResult.response.status },
            );
        }

        const validation = GenerateFaqRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return privateJson({ error: 'Invalid FAQ generation request.' }, { status: 400 });
        }
        articleIdForLog = validation.data.articleId;

        const db = answerlatticeFirestoreAdmin;
        if (!db) {
            return privateJson({ error: 'Answerlattice database is not configured.' }, { status: 500 });
        }

        const { articleId } = validation.data;
        const articleRef = db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId);
        const articleSnap = await articleRef.get();
        if (!articleSnap.exists) {
            return privateJson({ error: 'Article not found.' }, { status: 404 });
        }

        const article = { ...articleSnap.data(), id: articleSnap.id } as KnowledgeBaseArticleType;
        const articleRecord = article as unknown as Record<string, unknown>;
        if (!isExactAnswerlatticePersistedAuthority(articleRecord, { tenantId, storeId })) {
            return privateJson({ error: 'Article not found.' }, { status: 404 });
        }

        const articleText = extractPlainTextFromEditorContent(article.content || '');
        if (!article.title || articleText.trim().length < 80) {
            return privateJson({ error: 'Add more article content before generating FAQ suggestions.' }, { status: 400 });
        }
        const sourceFingerprint = getArticleFaqSourceFingerprint(article);

        const existingSnapshot = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', tenantId)
            .where('sId', '==', storeId)
            .where('articleId', '==', articleId)
            .where('active', '==', true)
            .limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT)
            .get();

        if (existingSnapshot.size >= ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) {
            return privateJson({
                articleId,
                createdCount: 0,
                skippedDuplicateCount: existingSnapshot.size,
                faqs: [],
                message: 'This article already has the maximum linked FAQs.',
            });
        }

        const operationStart = Date.now();
        const response = await answerlatticeGenAIClient.models.generateContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            contents: buildFaqPrompt(article, articleText),
            config: {
                responseMimeType: 'application/json',
            },
        });

        const responseText = getResponseText(response);
        if (responseText.truncated) {
            logRuntimeDiagnostic('answerlattice_faq_provider_response_truncated', {
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('articleId', articleId),
                providerResponseTextLength: responseText.originalLength,
                providerResponseTextMaxChars: FAQ_PROVIDER_RESPONSE_TEXT_MAX_CHARS,
            });
            throw new FaqGenerationProviderOutputError();
        }

        const parsed = extractJsonObject(responseText.text);
        const normalizedFaqs = normalizeGeneratedFaqs(parsed?.faqs);
        const linkedFaqQuery = db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
            .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
            .where('tId', '==', tenantId)
            .where('sId', '==', storeId)
            .where('articleId', '==', articleId)
            .where('active', '==', true)
            .limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT);
        const createdFaqs = await db.runTransaction(async (transaction) => {
            const currentArticleSnapshot = await transaction.get(articleRef);
            if (!currentArticleSnapshot.exists) {
                throw new FaqGenerationConflictError('The article changed or was removed. Refresh before generating FAQ suggestions again.');
            }
            const currentArticle = {
                ...currentArticleSnapshot.data(),
                id: currentArticleSnapshot.id,
            } as KnowledgeBaseArticleType;
            const currentArticleRecord = currentArticle as unknown as Record<string, unknown>;
            if (
                !isExactAnswerlatticePersistedAuthority(currentArticleRecord, { tenantId, storeId })
                || getArticleFaqSourceFingerprint(currentArticle) !== sourceFingerprint
            ) {
                throw new FaqGenerationConflictError('The article changed while FAQ suggestions were being generated. Review the article and try again.');
            }

            const currentLinkedFaqs = await transaction.get(linkedFaqQuery);
            const remainingSlots = Math.max(0, ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT - currentLinkedFaqs.size);
            if (remainingSlots === 0 || normalizedFaqs.length === 0) return [];

            const existingQuestions = new Set(
                currentLinkedFaqs.docs
                    .map(item => normalizeQuestionKey(item.data()?.question))
                    .filter(Boolean),
            );
            const uniqueFaqs = normalizedFaqs.filter((faq) => {
                const key = normalizeQuestionKey(faq.question);
                if (!key || existingQuestions.has(key)) return false;
                existingQuestions.add(key);
                return true;
            }).slice(0, remainingSlots);
            if (uniqueFaqs.length === 0) return [];

            const now = Timestamp.now();
            const actor = String(session.user?.name || session.user?.email || userIdForLog || 'unknown');
            const actorId = userIdForLog;
            const nextFaqs = uniqueFaqs.map<AnswerlatticeGeneratedFaqDocument>((faq, index) => {
                const ref = db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc();
                return {
                    id: ref.id,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tId: tenantId,
                    sId: storeId,
                    question: faq.question,
                    answer: faq.answer,
                    status: ANSWERLATTICE_FAQ_STATUS.NEEDS_REVIEW,
                    source: ANSWERLATTICE_FAQ_SOURCE.ARTICLE,
                    active: true,
                    articleId,
                    articleTitle: currentArticle.title,
                    canonicalAnswerId: null,
                    entityIds: normalizeAnswerlatticeResolvedEntityIds([...(currentArticle.entityIds || []), ...(faq.entityIds || [])], 25),
                    contextKeys: Array.from(new Set([...(currentArticle.contextKeys || []), ...(faq.contextKeys || [])])).slice(0, 20),
                    tags: Array.from(new Set([...(currentArticle.tags || []), ...(faq.tags || [])])).slice(0, 20),
                    likes: 0,
                    dislikes: 0,
                    sortOrder: currentLinkedFaqs.size + index + 1,
                    publishedOn: null,
                    lastReviewedOn: null,
                    reviewRequestedOn: now,
                    jobId: currentArticle.jobId || null,
                    generatedFromArticleId: articleId,
                    createdOn: now,
                    modifiedOn: now,
                    createdBy: actor,
                    modifiedBy: actor,
                    uId: actorId,
                };
            });
            nextFaqs.forEach((faq) => {
                transaction.create(db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc(faq.id), faq);
            });
            transaction.update(articleRef, {
                faqIds: FieldValue.arrayUnion(...nextFaqs.map(faq => faq.id)),
                modifiedOn: now,
            });
            return nextFaqs;
        });

        await recordAnswerlatticeAiOperation({
            tId: tenantId,
            sId: storeId,
        }, {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_FAQ_GENERATION,
            articleId,
            billingMode: 'internal',
            clientResponse: {
                articleTextLength: articleText.length,
                createdCount: createdFaqs.length,
                skippedDuplicateCount: normalizedFaqs.length - createdFaqs.length,
            },
            geminiResponse: response,
            model: ANSWERLATTICE_TEXT_MODEL,
            processingTime: Date.now() - operationStart,
            source: 'answerlattice_article_faq_generation',
        }, {
            id: session.user?.id,
            name: session.user?.name,
            email: session.user?.email,
        }).catch((logError) => {
            logRuntimeFailure('answerlattice_faq_operation_log_failed', logError, {
                ...getBoundedRuntimeStringContext('tenantId', tenantId),
                ...getBoundedRuntimeStringContext('storeId', storeId),
                ...getBoundedRuntimeStringContext('articleId', articleId),
            });
        });

        logRuntimeDiagnostic('answerlattice_faq_generation_completed', {
            ...getBoundedRuntimeStringContext('tenantId', tenantId),
            ...getBoundedRuntimeStringContext('storeId', storeId),
            ...getBoundedRuntimeStringContext('articleId', articleId),
            createdCount: createdFaqs.length,
            skippedDuplicateCount: normalizedFaqs.length - createdFaqs.length,
        });

        return privateJson({
            articleId,
            createdCount: createdFaqs.length,
            skippedDuplicateCount: Math.max(0, normalizedFaqs.length - createdFaqs.length),
            faqs: createdFaqs.map(faq => ({
                id: faq.id,
                question: faq.question,
                answer: faq.answer,
                status: faq.status,
                source: faq.source,
            })),
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return privateJson({ error: 'Invalid FAQ generation request.' }, { status: 400 });
        }
        if (error instanceof FaqGenerationConflictError) {
            return privateJson({ error: error.publicMessage }, { status: 409 });
        }
        if (error instanceof FaqGenerationProviderOutputError) {
            return privateJson(
                { error: 'The FAQ provider returned an invalid response. No suggestions were saved.' },
                { status: 502 },
            );
        }
        if (isAIProviderRateLimitError(error)) {
            const retryAfter = getAIProviderRetryAfter(error) || 60;
            return privateJson(
                {
                    error: `FAQ generation is temporarily busy. Please wait ${retryAfter} seconds before trying again.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfter) },
                },
            );
        }
        logRuntimeFailure('answerlattice_faq_generation_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
            ...getBoundedRuntimeStringContext('articleId', articleIdForLog),
        });
        return privateJson({ error: 'Failed to refresh FAQ suggestions.' }, { status: 500 });
    }
});
