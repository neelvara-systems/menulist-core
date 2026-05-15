export const dynamic = 'force-dynamic';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { canonicaFirestoreAdmin as firestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { EMBED_MODEL, callGeminiEmbedding } from '@lib/vectorEmbeddings';
import { extractPlainTextFromEditorContent } from '@lib/vectorEmbeddings/articleEmbeddings';
import { KnowledgeBaseArticleEmbeddingPayload } from '@type/knowledgeBase';
import { writeLogEntry } from 'logs/utils';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const LOG_FILE = "kb.log";

const getProviderRetryAfter = (error: any): number | null => {
    const message = String(error?.message || error || '');
    const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
    if (retryMatch?.[1]) {
        return Math.max(1, Math.ceil(Number(retryMatch[1])));
    }
    return null;
};

const isProviderRateLimitError = (error: any): boolean => {
    const message = String(error?.message || error || '').toLowerCase();
    return error?.status === 429 ||
        error?.httpStatusCode === 429 ||
        message.includes('429 too many requests') ||
        message.includes('resource_exhausted') ||
        message.includes('quota exceeded');
};

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

        const body = await request.json();
        const { embeddingPayload }: { embeddingPayload: KnowledgeBaseArticleEmbeddingPayload } = body;

        if (!embeddingPayload) {
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'EMBEDDING_GENERATION_ERROR', data: 'Article is required' });
            return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
        }

        const text = extractPlainTextFromEditorContent(embeddingPayload.content);
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
        const embeddingInput = `Category: ${embeddingPayload.categoryTitle}\nSection: ${embeddingPayload.sectionTitle}\nTitle: ${embeddingPayload.articleTitle}\nContent: ${text}`;
        const operationStart = Date.now();
        const vector = await callGeminiEmbedding(embeddingInput, {
            taskType: 'RETRIEVAL_DOCUMENT',
            title: embeddingPayload.articleTitle,
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

        let collectionRef = firestoreAdmin.collection(DB_COLLECTIONS.KB_ARTICLES);
        await collectionRef.doc(embeddingPayload.articleId).update({ embedding: vector });
        recordAiOperationForSession(session, {
            action: AI_ACTIONS_TYPES.HELP_CENTER_EMBEDDING,
            articleId: embeddingPayload.articleId,
            billingMode: 'internal',
            clientResponse: {
                categoryTitle: embeddingPayload.categoryTitle,
                sectionTitle: embeddingPayload.sectionTitle,
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
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'EMBEDDING_GENERATION_ERROR',
            data: { error: err?.message || String(err) }
        });
        if (isProviderRateLimitError(err)) {
            const retryAfter = getProviderRetryAfter(err) || 60;
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
