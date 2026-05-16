export const dynamic = 'force-dynamic';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import { bumpCanonicaCacheVersionAdmin } from '@lib/canonica/cacheVersionAdmin';
import { CANONICA_CACHE_SOURCES } from '@lib/canonica/cacheVersionManifest';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { EMBED_MODEL, callGeminiEmbedding } from '@lib/vectorEmbeddings';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { writeLogEntry } from 'logs/utils';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const LOG_FILE = "kb.log";
const ArticleEmbeddingRequestSchema = z.object({
    embeddingPayload: z.object({
        articleId: z.string().trim().min(1).max(160),
        content: z.unknown().optional(),
        categoryId: z.string().trim().min(1).max(160),
        sectionId: z.string().trim().max(160).optional().default(''),
        articleTitle: z.string().trim().min(1).max(300),
        categoryTitle: z.string().trim().max(300).optional().default(''),
        sectionTitle: z.string().trim().max(300).optional().default(''),
    }),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        // ✅ Session guaranteed by withAuth middleware

        // 🛡️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // 🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        const { embeddingPayload } = ArticleEmbeddingRequestSchema.parse(await request.json());
        const articleRef = firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES).doc(embeddingPayload.articleId);
        const articleDoc = await articleRef.get();
        if (!articleDoc.exists) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const article = articleDoc.data() || {};
        const articleTenantId = Number(article.tId ?? article.tenantId);
        const articleStoreId = Number(article.sId ?? article.storeId);
        if (
            !Number.isFinite(articleTenantId) ||
            !Number.isFinite(articleStoreId) ||
            articleTenantId !== Number(session.tId) ||
            articleStoreId !== Number(session.sId)
        ) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const articleTitle = typeof article.title === 'string' && article.title.trim()
            ? article.title.trim()
            : embeddingPayload.articleTitle;
        const categoryTitle = typeof article.categoryTitle === 'string'
            ? article.categoryTitle
            : embeddingPayload.categoryTitle;
        const sectionTitle = typeof article.sectionTitle === 'string'
            ? article.sectionTitle
            : embeddingPayload.sectionTitle;
        const text = extractPlainTextFromEditorContent(article.content);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'EMBEDDING_GENERATION_STARTED',
            data: {
                articleId: embeddingPayload.articleId,
                textLength: text.length,
            }
        });

        if (!text || text.length === 0) {
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'EMBEDDING_GENERATION_ERROR', data: 'Article content is required' });
            return NextResponse.json({ error: 'Article content is required' }, { status: 400 });
        }
        const embeddingInput = `Category: ${categoryTitle}\nSection: ${sectionTitle}\nTitle: ${articleTitle}\nContent: ${text}`;
        const operationStart = Date.now();
        const vector = await callGeminiEmbedding(embeddingInput, {
            taskType: 'RETRIEVAL_DOCUMENT',
            title: articleTitle,
        });

        if (!vector) {
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'EMBEDDING_GENERATION_ERROR', data: vector });
            return NextResponse.json({ error: 'Vector generation failed' }, { status: 400 });
        }

        const values = vector.values || vector._values;
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'EMBEDDING_GENERATED',
            data: {
                articleId: embeddingPayload.articleId,
                model: EMBED_MODEL,
                vectorDimensions: values.length,
            }
        });

        await bumpCanonicaCacheVersionAdmin(CANONICA_CACHE_SOURCES.KB, articleTenantId, articleStoreId, {
            reason: 'article_embedding_api_update',
            sourceId: embeddingPayload.articleId,
            sourceType: 'kb_article',
        });
        await articleRef.update({ embedding: vector });
        recordAiOperationForSession(session, {
            action: AI_ACTIONS_TYPES.HELP_CENTER_EMBEDDING,
            articleId: embeddingPayload.articleId,
            billingMode: 'internal',
            clientResponse: {
                categoryTitle,
                sectionTitle,
                textLength: text.length,
                vectorDimensions: values.length,
            },
            model: EMBED_MODEL,
            processingTime: Date.now() - operationStart,
            source: 'help_center_article_embedding',
        }).catch((error) => {
            void writeLogEntry({ logFileName: LOG_FILE, logType: 'EMBEDDING_OPERATION_LOG_ERROR', data: error });
        });
        return NextResponse.json({ ok: true, status: 200 });

    } catch (err: any) {
        if (err instanceof ZodError) {
            return NextResponse.json({ error: 'Invalid article embedding request' }, { status: 400 });
        }
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'EMBEDDING_GENERATION_ERROR',
            data: { error: err?.message || String(err) }
        });
        if (isAIProviderRateLimitError(err)) {
            const retryAfter = getAIProviderRetryAfter(err) || 60;
            return NextResponse.json(
                {
                    error: `Embedding generation is temporarily busy. Please wait ${retryAfter} seconds before trying again.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfter) },
                }
            );
        }
        return NextResponse.json({ error: 'Embedding generation failed. Please try again.' }, { status: 500 });
    }
});
