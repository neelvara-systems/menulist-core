import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import {
    ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
    ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY,
    ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
} from '../constants/ai';
import { firestoreAdmin } from '../firebaseAdmin';
import { KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType } from '../types';
import { genrateEmbedding } from '../utils/aiUtils';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';
import {
    hasExactStoredAnswerlatticeProductAliases,
    parseStoredAnswerlatticeScopeAliases,
} from '../answerlattice/scopeBoundary';
import { getAnswerlatticeEmbeddingInput } from './embeddingSourceBoundary';
import { getReusableEmbeddingVectorDimensions, isValidGeneratedEmbeddingVector } from './embeddingVectorBoundary';

const PRODUCT_ID = 'AL';
const EMBEDDING_LEASE_MS = 5 * 60 * 1000;

export type AnswerlatticeArticleScope = { tId: number; sId: number };

type StoredAnswerlatticeArticle = KnowledgeBaseArticleType & {
    id: string;
    pId: 'AL';
    tId: number;
    sId: number;
};

function normalizeDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (id !== value || !id || id.length > 180 || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) return null;
    return id;
}

function timestampMillis(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    const timestamp = value as { seconds?: unknown; toMillis?: () => number };
    if (typeof timestamp.toMillis === 'function') {
        try {
            const millis = timestamp.toMillis();
            return Number.isFinite(millis) ? millis : 0;
        } catch {
            return 0;
        }
    }
    return typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds)
        ? timestamp.seconds * 1000
        : 0;
}

function cleanText(value: unknown, maxLength: number): string {
    return (typeof value === 'string' ? value : '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function parseStoredArticle(
    snapshot: FirebaseFirestore.DocumentSnapshot,
    expectedScope?: AnswerlatticeArticleScope,
): StoredAnswerlatticeArticle {
    if (!snapshot.exists) throw new PermanentArticleEmbeddingError('Article is not available.');
    const data = snapshot.data() || {};
    const articleId = normalizeDocumentId(snapshot.id);
    const storedId = normalizeDocumentId(data.id ?? snapshot.id);
    const scope = parseStoredAnswerlatticeScopeAliases(data);
    if (
        !articleId
        || storedId !== articleId
        || !hasExactStoredAnswerlatticeProductAliases(data)
        || !scope
        || (expectedScope && (expectedScope.tId !== scope.tId || expectedScope.sId !== scope.sId))
        || !cleanText(data.title, 300)
        || !data.content
    ) {
        throw new PermanentArticleEmbeddingError('Article is not available.');
    }
    return {
        ...(data as KnowledgeBaseArticleType),
        id: articleId,
        pId: PRODUCT_ID,
        tId: scope.tId,
        sId: scope.sId,
    };
}

function buildEmbeddingInput(article: StoredAnswerlatticeArticle): { sourceHash: string; text: string } {
    const input = getAnswerlatticeEmbeddingInput(article);
    if (!input) throw new PermanentArticleEmbeddingError('Article content is too short to embed.');
    return input;
}

export class PermanentArticleEmbeddingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PermanentArticleEmbeddingError';
    }
}

export class ArticleEmbeddingInProgressError extends Error {
    constructor() {
        super('Article embedding is already running.');
        this.name = 'ArticleEmbeddingInProgressError';
    }
}

export async function embedStoredAnswerlatticeArticle(params: {
    articleId: string;
    expectedScope?: AnswerlatticeArticleScope;
    force?: boolean;
    source: string;
}): Promise<{
    articleId: string;
    reused: boolean;
    scope: AnswerlatticeArticleScope;
    sourceHash: string;
    vectorDimensions: number;
}> {
    const articleId = normalizeDocumentId(params.articleId);
    if (!articleId) throw new PermanentArticleEmbeddingError('Article is not available.');
    const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
    const runId = `embed_${randomUUID()}`;
    const startedAt = Timestamp.now();
    const leaseExpiresAt = Timestamp.fromMillis(startedAt.toMillis() + EMBEDDING_LEASE_MS);

    const claim = await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(articleRef);
        const article = parseStoredArticle(snapshot, params.expectedScope);
        const { sourceHash } = buildEmbeddingInput(article);
        const vectorDimensions = getReusableEmbeddingVectorDimensions(article[ANSWERLATTICE_EMBEDDING_VECTOR_FIELD]);
        if (
            !params.force
            && article.embeddingStatus === 'embedded'
            && article.embeddingSourceHash === sourceHash
            && article.embeddingCacheVersion === ANSWERLATTICE_EMBEDDING_CACHE_VERSION
            && vectorDimensions === ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY
        ) {
            return { article, reused: true, sourceHash, vectorDimensions };
        }
        if (
            article.embeddingRun?.status === 'processing'
            && timestampMillis(article.embeddingRun.leaseExpiresAt) > Date.now()
        ) {
            throw new ArticleEmbeddingInProgressError();
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
        return { article, reused: false, sourceHash, vectorDimensions: 0 };
    });

    const scope = { tId: claim.article.tId, sId: claim.article.sId };
    if (claim.reused) {
        return { articleId, reused: true, scope, sourceHash: claim.sourceHash, vectorDimensions: claim.vectorDimensions };
    }

    try {
        const embedding = await genrateEmbedding({
            id: articleId,
            categoryTitle: claim.article.categoryTitle,
            sectionTitle: claim.article.sectionTitle || '',
            title: claim.article.title,
            content: claim.article.content,
            tId: scope.tId,
            sId: scope.sId,
            source: cleanText(params.source, 120) || 'answerlattice_article_embedding',
        });
        if (!isValidGeneratedEmbeddingVector(embedding, ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY)) {
            throw new Error('Embedding provider returned an invalid vector dimension.');
        }
        const completedAt = Timestamp.now();
        await firestoreAdmin.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(articleRef);
            const current = parseStoredArticle(snapshot, scope);
            const currentSourceHash = buildEmbeddingInput(current).sourceHash;
            if (
                current.embeddingRun?.id !== runId
                || current.embeddingRun?.status !== 'processing'
                || currentSourceHash !== claim.sourceHash
            ) {
                throw new Error('Article changed before embedding could be saved.');
            }
            transaction.set(articleRef, {
                [ANSWERLATTICE_EMBEDDING_VECTOR_FIELD]: FieldValue.vector(embedding),
                embeddingStatus: 'embedded',
                embeddingCacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
                embeddingSourceHash: claim.sourceHash,
                embeddingRun: {
                    id: runId,
                    status: 'completed',
                    sourceHash: claim.sourceHash,
                    startedAt,
                    leaseExpiresAt,
                    completedAt,
                },
                modifiedOn: completedAt,
            }, { merge: true });
        });
        return {
            articleId,
            reused: false,
            scope,
            sourceHash: claim.sourceHash,
            vectorDimensions: embedding.length,
        };
    } catch (error) {
        const failedAt = Timestamp.now();
        await firestoreAdmin.runTransaction(async (transaction) => {
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
            logger.error('[Answerlattice KB] Failed to persist article embedding failure state', {
                failureCode: 'answerlattice_article_embedding_failure_state_write_failed',
                articleIdLength: articleId.length,
                sourceErrorName: getBoundedFunctionsErrorName(stateError) || typeof stateError,
            });
        });
        throw error;
    }
}
