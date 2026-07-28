import {
    ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG,
    ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
    ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY,
} from '@constant/answerlattice/ai';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { recordAnswerlatticeAiOperation, type AnswerlatticeAiActor } from '@lib/answerlattice/aiAccounting';
import { bumpAnswerlatticeCacheVersionAdmin } from '@lib/answerlattice/cacheVersionAdmin';
import { ANSWERLATTICE_CACHE_SOURCES } from '@lib/answerlattice/cacheVersionManifest';
import { getAnswerlatticeScopeLogContext, getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { getAnswerlatticeArticleEmbeddingInput } from '@lib/answerlattice/embeddingSourceBoundary';
import { normalizeAnswerlatticeKbArticleId } from '@lib/answerlattice/kbArticleIdBoundary';
import {
    normalizeAnswerlatticeScopeDocumentId,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
} from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin as db } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { callGeminiEmbeddingWithMetadata } from '@lib/vectorEmbeddings';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';

const ARTICLE_EMBEDDING_LEASE_MS = 5 * 60 * 1000;

type ArticleEmbeddingScope = { tId: number; sId: number };
type StoredArticle = Record<string, any> & {
    id: string;
    pId: typeof PRODUCT_IDS.ANSWERLATTICE;
    tId: number;
    sId: number;
    title: string;
    content: unknown;
};

const timestampMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    const candidate = value as { toMillis?: () => number; seconds?: unknown };
    if (typeof candidate.toMillis === 'function') return candidate.toMillis();
    return typeof candidate.seconds === 'number' && Number.isFinite(candidate.seconds)
        ? candidate.seconds * 1000
        : 0;
};

const cleanText = (value: unknown, max: number) => String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const getVectorValues = (value: unknown): number[] => {
    if (!value || typeof value !== 'object') return [];
    const vector = value as { values?: unknown; _values?: unknown; toArray?: () => number[] };
    const values = typeof vector.toArray === 'function'
        ? vector.toArray()
        : vector.values || vector._values;
    return Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
};

const isExpectedEmbeddingVector = (value: unknown): boolean => {
    const values = getVectorValues(value);
    return values.length === ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY
        && values.some(item => item !== 0);
};

const parseArticle = (snapshot: FirebaseFirestore.DocumentSnapshot, scope: ArticleEmbeddingScope): StoredArticle => {
    if (!snapshot.exists) throw new Error('Article not found.');
    const data = snapshot.data() || {};
    const articleId = normalizeAnswerlatticeKbArticleId(snapshot.id);
    const storedId = normalizeAnswerlatticeKbArticleId(data.id ?? snapshot.id);
    const tId = normalizeConsistentAnswerlatticeScopeDocumentIds([data.tId, data.tenantId]);
    const sId = normalizeConsistentAnswerlatticeScopeDocumentIds([data.sId, data.storeId]);
    const pId = data.pId ?? data.productId;
    const title = cleanText(data.title, 300);
    if (
        !articleId
        || storedId !== articleId
        || pId !== PRODUCT_IDS.ANSWERLATTICE
        || tId !== scope.tId
        || sId !== scope.sId
        || !title
        || !data.content
    ) {
        throw new Error('Article not found.');
    }
    return { ...data, id: articleId, pId: PRODUCT_IDS.ANSWERLATTICE, tId, sId, title, content: data.content };
};

const buildEmbeddingInput = (article: StoredArticle) => {
    const input = getAnswerlatticeArticleEmbeddingInput(article);
    if (!input) throw new Error('Article content is too short to embed.');
    return input;
};

export async function embedAnswerlatticeArticle(params: {
    actor?: AnswerlatticeAiActor | null;
    articleId: string;
    scope: ArticleEmbeddingScope;
    source: string;
}): Promise<{ articleId: string; reused: boolean; vectorDimensions: number }> {
    if (!db || typeof (db as any).collection !== 'function') {
        throw new Error('Answerlattice Firebase is not configured.');
    }
    const articleId = normalizeAnswerlatticeKbArticleId(params.articleId);
    const tId = normalizeAnswerlatticeScopeDocumentId(params.scope.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(params.scope.sId);
    if (!articleId || !tId || !sId) throw new Error('Article not found.');
    const scope = { tId, sId };
    const articleRef = db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(articleId);
    const runId = `embed_${crypto.randomUUID()}`;
    const startedAt = Timestamp.now();
    const leaseExpiresAt = Timestamp.fromMillis(startedAt.toMillis() + ARTICLE_EMBEDDING_LEASE_MS);

    const claim = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(articleRef);
        const article = parseArticle(snapshot, scope);
        const { text, sourceHash } = buildEmbeddingInput(article);
        const activeVector = article[ANSWERLATTICE_ACTIVE_EMBEDDING_CONFIG.vectorField];
        if (
            article.embeddingStatus === 'embedded'
            && article.embeddingSourceHash === sourceHash
            && article.embeddingCacheVersion === ANSWERLATTICE_EMBEDDING_CACHE_VERSION
            && isExpectedEmbeddingVector(activeVector)
        ) {
            const values = getVectorValues(activeVector);
            return { article, text, reused: true, sourceHash, vectorDimensions: values.length };
        }
        if (
            article.embeddingRun?.status === 'processing'
            && timestampMillis(article.embeddingRun.leaseExpiresAt) > Date.now()
        ) {
            throw new Error('Article embedding is already running.');
        }
        transaction.set(articleRef, {
            embeddingStatus: 'processing',
            embeddingRun: {
                id: runId,
                status: 'processing',
                sourceHash,
                startedAt,
                leaseExpiresAt,
                completedAt: null,
            },
            modifiedOn: startedAt,
        }, { merge: true });
        return { article, text, reused: false, sourceHash, vectorDimensions: 0 };
    });

    if (claim.reused) {
        return { articleId, reused: true, vectorDimensions: claim.vectorDimensions };
    }

    const operationStart = Date.now();
    try {
        const embeddingResult = await callGeminiEmbeddingWithMetadata(claim.text, {
            purpose: 'document',
            title: claim.article.title,
        });
        const values = embeddingResult.vector.values || embeddingResult.vector._values || [];
        if (!Array.isArray(values) || values.length === 0) throw new Error('Embedding provider returned an empty vector.');
        const completedAt = Timestamp.now();

        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(articleRef);
            const current = parseArticle(snapshot, scope);
            const currentSourceHash = buildEmbeddingInput(current).sourceHash;
            if (
                current.embeddingRun?.id !== runId
                || current.embeddingRun?.status !== 'processing'
                || currentSourceHash !== claim.sourceHash
            ) {
                throw new Error('Article changed before embedding could be saved.');
            }
            transaction.set(articleRef, {
                [embeddingResult.vectorField]: embeddingResult.vector,
                embeddingStatus: 'embedded',
                embeddingCacheVersion: embeddingResult.cacheVersion,
                embeddingSourceHash: claim.sourceHash,
                embeddingRun: {
                    id: runId,
                    status: 'completed',
                    sourceHash: claim.sourceHash,
                    startedAt,
                    leaseExpiresAt,
                    completedAt,
                },
                lastReviewedOn: completedAt,
                modifiedOn: completedAt,
            }, { merge: true });
        });

        await bumpAnswerlatticeCacheVersionAdmin(ANSWERLATTICE_CACHE_SOURCES.KB, tId, sId, {
            reason: 'article_embedding_update',
            sourceId: articleId,
            sourceType: 'kb_article',
        });
        await recordAnswerlatticeAiOperation(scope, {
            action: AI_ACTIONS_TYPES.ANSWERLATTICE_KB_EMBEDDING,
            articleId,
            billingMode: 'internal',
            clientResponse: { textLength: claim.text.length, vectorDimensions: values.length },
            model: embeddingResult.model,
            processingTime: Date.now() - operationStart,
            promptTokenCount: embeddingResult.usageMetadata.promptTokenCount || 0,
            candidatesTokenCount: embeddingResult.usageMetadata.candidatesTokenCount || 0,
            totalTokenCount: embeddingResult.usageMetadata.totalTokenCount || 0,
            tokenCountSource: embeddingResult.usageMetadata.tokenCountSource || 'none',
            source: cleanText(params.source, 120) || 'answerlattice_article_embedding',
        }, params.actor).catch((error) => {
            logAnswerlatticeFailure('answerlattice_article_embedding_operation_log_failed', error, {
                ...getAnswerlatticeScopeLogContext(scope),
                ...getBoundedAnswerlatticeStringContext('articleId', articleId),
            });
        });
        return { articleId, reused: false, vectorDimensions: values.length };
    } catch (error) {
        const failedAt = Timestamp.now();
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(articleRef);
            if (!snapshot.exists) return;
            const current = snapshot.data() || {};
            if (current.embeddingRun?.id !== runId) return;
            transaction.set(articleRef, {
                embeddingStatus: 'failed',
                embeddingRun: {
                    ...current.embeddingRun,
                    status: 'failed',
                    completedAt: failedAt,
                },
                modifiedOn: failedAt,
            }, { merge: true });
        }).catch((stateError) => {
            logAnswerlatticeFailure('answerlattice_article_embedding_failure_state_write_failed', stateError, {
                ...getAnswerlatticeScopeLogContext(scope),
                ...getBoundedAnswerlatticeStringContext('articleId', articleId),
            });
        });
        throw error;
    }
}
