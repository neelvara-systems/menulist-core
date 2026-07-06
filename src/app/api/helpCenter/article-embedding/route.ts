export const dynamic = 'force-dynamic';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { getAIProviderRetryAfter, isAIProviderRateLimitError } from '@lib/ai/providerErrors';
import { recordAnswerlatticeAiOperation } from '@lib/answerlattice/aiAccounting';
import { bumpAnswerlatticeCacheVersionAdmin } from '@lib/answerlattice/cacheVersionAdmin';
import { ANSWERLATTICE_CACHE_SOURCES } from '@lib/answerlattice/cacheVersionManifest';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin as firestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { EMBED_MODEL, callGeminiEmbeddingWithMetadata } from '@lib/vectorEmbeddings';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { writeLogEntry } from 'logs/utils';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const LOG_FILE = "kb.log";
const ARTICLE_EMBEDDING_MAX_BODY_BYTES = 256 * 1024;
const ARTICLE_EMBEDDING_OPERATION_LOG_FAILED = 'embedding_operation_log_failed';
const ARTICLE_EMBEDDING_GENERATION_FAILED = 'embedding_generation_failed';

const ArticleEmbeddingRequestSchema = z.object({
    embeddingPayload: z.object({
        articleId: z.string().trim().max(160).refine((value) => normalizeAnswerlatticeKbArticleId(value) === value),
        content: z.unknown().optional(),
        categoryId: z.string().trim().min(1).max(160),
        sectionId: z.string().trim().max(160).optional().default(''),
        articleTitle: z.string().trim().min(1).max(300),
        categoryTitle: z.string().trim().max(300).optional().default(''),
        sectionTitle: z.string().trim().max(300).optional().default(''),
    }),
});

const getArticleEmbeddingErrorName = (error: unknown): string | undefined => {
    if (error instanceof Error && error.name) return error.name.slice(0, 80);
    if (error && typeof error === 'object' && 'name' in error) {
        const name = (error as { name?: unknown }).name;
        return typeof name === 'string' ? name.slice(0, 80) : undefined;
    }
    return typeof error === 'string' ? 'StringError' : undefined;
};

const getArticleEmbeddingErrorCode = (error: unknown): string | number | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code.slice(0, 80) : typeof code === 'number' ? code : undefined;
};

const getArticleEmbeddingErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

const getArticleEmbeddingFailureLogData = (code: string, error: unknown) => ({
    code,
    sourceErrorCode: getArticleEmbeddingErrorCode(error),
    sourceErrorName: getArticleEmbeddingErrorName(error),
    sourceErrorStatus: getArticleEmbeddingErrorStatus(error),
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

        const bodyResult = await readBoundedJsonBody(request, ARTICLE_EMBEDDING_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const { embeddingPayload } = ArticleEmbeddingRequestSchema.parse(bodyResult.data);
        const sessionScope = resolveAnswerlatticeSessionScope(session) || (() => {
            const tenantId = Number(session.tId ?? session.user?.tenantId);
            const storeId = Number(session.sId ?? session.user?.storeId);
            return Number.isFinite(tenantId) && Number.isFinite(storeId)
                ? { tenantId, storeId }
                : null;
        })();
        if (!sessionScope) {
            return NextResponse.json({ error: 'User not onboarded' }, { status: 400 });
        }

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
            articleTenantId !== Number(sessionScope.tenantId) ||
            articleStoreId !== Number(sessionScope.storeId)
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
        const embeddingResult = await callGeminiEmbeddingWithMetadata(embeddingInput, {
            taskType: 'RETRIEVAL_DOCUMENT',
            title: articleTitle,
        });
        const vector = embeddingResult.vector;

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

        await bumpAnswerlatticeCacheVersionAdmin(ANSWERLATTICE_CACHE_SOURCES.KB, articleTenantId, articleStoreId, {
            reason: 'article_embedding_api_update',
            sourceId: embeddingPayload.articleId,
            sourceType: 'kb_article',
        });
        await articleRef.update({ embedding: vector });
        recordAnswerlatticeAiOperation({
            tId: articleTenantId,
            sId: articleStoreId,
        }, {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING,
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
            promptTokenCount: embeddingResult.usageMetadata.promptTokenCount || 0,
            source: 'help_center_article_embedding',
            totalTokenCount: embeddingResult.usageMetadata.totalTokenCount || 0,
            candidatesTokenCount: embeddingResult.usageMetadata.candidatesTokenCount || 0,
            tokenCountSource: embeddingResult.usageMetadata.tokenCountSource || 'none',
        }, {
            id: session.user?.id,
            name: session.user?.name,
            email: session.user?.email,
        }).catch((error) => {
            void writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'EMBEDDING_OPERATION_LOG_ERROR',
                data: getArticleEmbeddingFailureLogData(ARTICLE_EMBEDDING_OPERATION_LOG_FAILED, error),
            });
        });
        return NextResponse.json({ ok: true, status: 200 });

    } catch (err: any) {
        if (err instanceof ZodError) {
            return NextResponse.json({ error: 'Invalid article embedding request' }, { status: 400 });
        }
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'EMBEDDING_GENERATION_ERROR',
            data: getArticleEmbeddingFailureLogData(ARTICLE_EMBEDDING_GENERATION_FAILED, err),
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
