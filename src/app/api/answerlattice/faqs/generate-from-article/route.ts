export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT,
    ANSWERLATTICE_FAQ_GENERATED_PER_ARTICLE_LIMIT,
    normalizeGeneratedFaqs,
} from '@lib/answerlattice/faqContent';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { genAIClient } from '@lib/google/genAi';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { ANSWERLATTICE_FAQ_SOURCE, ANSWERLATTICE_FAQ_STATUS } from '@type/answerlattice';
import { type KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../../middleware/auth';

const GenerateFaqRequestSchema = z.object({
    articleId: z.string().trim().min(1).max(180),
});

const MAX_ARTICLE_TEXT_FOR_PROMPT = 6000;

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

const getResponseText = (response: any): string => {
    if (!response) return '';
    if (typeof response.text === 'function') return String(response.text() || '');
    if (typeof response.text === 'string') return response.text;
    return '';
};

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
    try {
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT) {
            return NextResponse.json({ error: 'FAQ management is not enabled.' }, { status: 404 });
        }

        const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE);
        if (permission.response) return permission.response;

        const requestBody = await request.json().catch(() => null);
        const validation = GenerateFaqRequestSchema.safeParse(requestBody);
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid FAQ generation request.' }, { status: 400 });
        }

        const sessionScope = resolveAnswerlatticeSessionScope(session);
        const tenantId = Number(sessionScope?.tenantId);
        const storeId = Number(sessionScope?.storeId);
        if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
            return NextResponse.json({ error: 'Answerlattice workspace is not available.' }, { status: 400 });
        }

        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        const rateLimitResult = await checkRateLimit({
            key: `answerlattice-faq-generation:${tenantId}:${storeId}:${session.user.id}`,
            limit: 8,
            window: 3600,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many FAQ refresh requests. Try again later.' }, { status: 429 });
        }

        const db = answerlatticeFirestoreAdmin;
        if (!db || typeof (db as any).collection !== 'function') {
            return NextResponse.json({ error: 'Answerlattice database is not configured.' }, { status: 500 });
        }

        const { articleId } = validation.data;
        const articleRef = db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId);
        const articleSnap = await articleRef.get();
        if (!articleSnap.exists) {
            return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
        }

        const article = { ...articleSnap.data(), id: articleSnap.id } as KnowledgeBaseArticleType;
        const articleTenantId = Number(article.tId);
        const articleStoreId = Number(article.sId);
        if (
            !Number.isFinite(articleTenantId) ||
            !Number.isFinite(articleStoreId) ||
            articleTenantId !== tenantId ||
            articleStoreId !== storeId
        ) {
            return NextResponse.json({ error: 'Article not found.' }, { status: 404 });
        }

        const articleText = extractPlainTextFromEditorContent(article.content || '');
        if (!article.title || articleText.trim().length < 80) {
            return NextResponse.json({ error: 'Add more article content before generating FAQ suggestions.' }, { status: 400 });
        }

        const existingSnapshot = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS)
            .where('tId', '==', tenantId)
            .where('sId', '==', storeId)
            .where('articleId', '==', articleId)
            .where('active', '==', true)
            .limit(ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT)
            .get();

        if (existingSnapshot.size >= ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT) {
            return NextResponse.json({
                articleId,
                createdCount: 0,
                skippedDuplicateCount: existingSnapshot.size,
                faqs: [],
                message: 'This article already has the maximum linked FAQs.',
            });
        }

        const existingQuestions = new Set(
            existingSnapshot.docs
                .map(item => normalizeQuestionKey(item.data()?.question))
                .filter(Boolean),
        );

        const operationStart = Date.now();
        const response = await genAIClient.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: buildFaqPrompt(article, articleText),
            config: {
                responseMimeType: 'application/json',
            },
        });

        const parsed = extractJsonObject(getResponseText(response));
        const normalizedFaqs = normalizeGeneratedFaqs(parsed?.faqs);
        const uniqueFaqs = normalizedFaqs.filter((faq) => {
            const key = normalizeQuestionKey(faq.question);
            if (!key || existingQuestions.has(key)) return false;
            existingQuestions.add(key);
            return true;
        }).slice(0, Math.max(0, ANSWERLATTICE_FAQ_ARTICLE_LINK_LIMIT - existingSnapshot.size));

        const now = Timestamp.now();
        const createdFaqs: Array<Record<string, any>> = uniqueFaqs.map((faq, index) => {
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
                articleTitle: article.title,
                canonicalAnswerId: null,
                entityIds: Array.from(new Set([...(article.entityIds || []), ...(faq.entityIds || [])])).slice(0, 25),
                contextKeys: Array.from(new Set([...(article.contextKeys || []), ...(faq.contextKeys || [])])).slice(0, 20),
                tags: Array.from(new Set([...(article.tags || []), ...(faq.tags || [])])).slice(0, 20),
                likes: 0,
                dislikes: 0,
                sortOrder: existingSnapshot.size + index + 1,
                publishedOn: null,
                lastReviewedOn: null,
                reviewRequestedOn: now,
                jobId: article.jobId || null,
                generatedFromArticleId: articleId,
                createdOn: now,
                modifiedOn: now,
                createdBy: session.user?.name || session.user?.email || session.user?.id,
                modifiedBy: session.user?.name || session.user?.email || session.user?.id,
                uId: session.user?.id as any,
            };
        });

        if (createdFaqs.length > 0) {
            const batch = db.batch();
            const createdIds = createdFaqs.map(faq => faq.id);
            createdFaqs.forEach((faq) => {
                batch.set(db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc(faq.id), faq, { merge: true });
            });
            batch.set(articleRef, {
                faqIds: FieldValue.arrayUnion(...createdIds),
                modifiedOn: now,
            }, { merge: true });
            await batch.commit();
        }

        recordAiOperationForSession(session, {
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: tenantId,
            sId: storeId,
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_FAQ_GENERATION,
            articleId,
            billingMode: 'internal',
            clientResponse: {
                articleTextLength: articleText.length,
                createdCount: createdFaqs.length,
                skippedDuplicateCount: normalizedFaqs.length - createdFaqs.length,
            },
            geminiResponse: response,
            model: 'gemini-2.0-flash',
            processingTime: Date.now() - operationStart,
            source: 'answerlattice_article_faq_generation',
        }).catch((logError) => {
            secureError('[Answerlattice FAQ] Operation log failed', logError as Error, { articleId, tenantId, storeId });
        });

        secureLog('[Answerlattice FAQ] Article suggestions generated', {
            articleId,
            tenantId,
            storeId,
            createdCount: createdFaqs.length,
            skippedDuplicateCount: normalizedFaqs.length - createdFaqs.length,
        });

        return NextResponse.json({
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
            return NextResponse.json({ error: 'Invalid FAQ generation request.' }, { status: 400 });
        }
        if (isAIProviderRateLimitError(error)) {
            const retryAfter = getAIProviderRetryAfter(error) || 60;
            return NextResponse.json(
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
        secureError('[Answerlattice FAQ] Article suggestion generation failed', error as Error, {
            userId: session.user?.id,
        });
        return NextResponse.json({ error: 'Failed to refresh FAQ suggestions.' }, { status: 500 });
    }
});
