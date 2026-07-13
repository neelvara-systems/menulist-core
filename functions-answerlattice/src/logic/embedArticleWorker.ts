import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    ARTICLE_STATUS,
    EmbedArticleType,
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    KB_ARTICLES_COLLECTION,
} from '../types';
import {
    embedStoredAnswerlatticeArticle,
    PermanentArticleEmbeddingError,
    type AnswerlatticeArticleScope,
} from './articleEmbedding';

const PRODUCT_ID = 'AL';
const MAX_EMBEDDING_ARTICLES_PER_JOB = 100;
const EMBEDDING_FAILED_MESSAGE = 'One or more article embeddings could not be completed.';
const EMBED_ARTICLE_WORKER_FAILED_CODE = 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_FAILED';
const EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND_CODE = 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND';
const EMBED_ARTICLE_WORKER_FAILURE_STATE_WRITE_FAILED_CODE = 'ANSWERLATTICE_EMBED_ARTICLE_WORKER_FAILURE_STATE_WRITE_FAILED';

type WorkerJob = {
    pId: 'AL';
    tId: number;
    sId: number;
    status: string;
    articleIds: string[];
    embeddingPendingArticleIds: string[];
    embeddingCompletedArticleIds: string[];
    embeddingFailedArticleIds: string[];
    embeddingRunId: string | null;
};

function normalizeDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (id !== value || !id || id.length > 180 || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) return null;
    return id;
}

function normalizeIdList(value: unknown): string[] | null {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > MAX_EMBEDDING_ARTICLES_PER_JOB) return null;
    const ids = value.map(normalizeDocumentId);
    if (ids.some(id => id === null)) return null;
    return Array.from(new Set(ids as string[]));
}

function normalizeScopeId(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 && String(id) === raw ? id : null;
}

function parseWorkerJob(data: FirebaseFirestore.DocumentData | undefined): WorkerJob | null {
    if (!data) return null;
    const tId = normalizeScopeId(data.tId ?? data.tenantId);
    const sId = normalizeScopeId(data.sId ?? data.storeId);
    const pId = data.pId ?? data.productId;
    const status = typeof data.status === 'string' ? data.status : '';
    if (!tId || !sId || pId !== PRODUCT_ID || !status) return null;
    const articleIds = normalizeIdList(data.articleIds);
    const pending = normalizeIdList(data.embeddingPendingArticleIds);
    const completed = normalizeIdList(data.embeddingCompletedArticleIds);
    const failed = normalizeIdList(data.embeddingFailedArticleIds);
    const embeddingRunId = data.embeddingRunId === undefined || data.embeddingRunId === null
        ? null
        : normalizeDocumentId(data.embeddingRunId);
    if (!articleIds || !pending || !completed || !failed || (data.embeddingRunId != null && !embeddingRunId)) return null;
    const effectivePending = data.embeddingPendingArticleIds === undefined ? articleIds : pending;
    const pendingSet = new Set(effectivePending);
    if (
        completed.some(id => !pendingSet.has(id))
        || failed.some(id => !pendingSet.has(id))
        || completed.some(id => failed.includes(id))
    ) return null;
    return {
        pId: PRODUCT_ID,
        tId,
        sId,
        status,
        articleIds,
        embeddingPendingArticleIds: effectivePending,
        embeddingCompletedArticleIds: completed,
        embeddingFailedArticleIds: failed,
        embeddingRunId,
    };
}

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') return value.slice(0, 120);
    return null;
}

function getEmbedArticleWorkerContext(articleId: string, jobId: string, retryCount: number) {
    return {
        articleIdLength: articleId.length,
        jobIdLength: jobId.length,
        retryCount,
    };
}

function getEmbedArticleWorkerErrorContext(error: unknown) {
    const sourceError = error as { code?: unknown; status?: unknown };
    const sourceErrorCode = boundedDiagnosticValue(sourceError?.code);
    const sourceStatusCode = boundedDiagnosticValue(sourceError?.status);
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        ...(sourceErrorCode ? { sourceErrorCode } : {}),
        ...(sourceStatusCode ? { sourceStatusCode } : {}),
    };
}

async function markEmbeddingFailure(params: {
    articleId: string;
    finalAttempt: boolean;
    jobId: string;
    runId?: string | null;
}) {
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(params.jobId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const jobSnap = await transaction.get(jobRef);
        if (!jobSnap.exists) return;
        const job = parseWorkerJob(jobSnap.data());
        if (!job || job.status !== INGESTION_JOB_STATUS.PUBLISHING) return;
        if (job.embeddingRunId && job.embeddingRunId !== params.runId) return;
        if (!job.embeddingPendingArticleIds.includes(params.articleId)) return;
        if (job.embeddingCompletedArticleIds.includes(params.articleId)) return;
        const failedIds = Array.from(new Set([...job.embeddingFailedArticleIds, params.articleId]))
            .slice(0, MAX_EMBEDDING_ARTICLES_PER_JOB);
        transaction.set(jobRef, {
            embeddingFailedArticleIds: failedIds,
            embeddingLastFailureAt: Timestamp.now(),
            ...(params.finalAttempt ? {
                status: INGESTION_JOB_STATUS.FAILED,
                errorMessage: EMBEDDING_FAILED_MESSAGE,
                failureStage: 'embedding',
            } : {}),
            modifiedOn: Timestamp.now(),
        }, { merge: true });
    });
}

export async function embedArticleWorkerLogic(
    articleData: EmbedArticleType,
    jobIdInput: string,
    options: { embeddingRunId?: string | null; retryCount?: number; finalAttempt?: boolean } = {},
) {
    const articleId = normalizeDocumentId(articleData?.id);
    const jobId = normalizeDocumentId(jobIdInput);
    const runId = options.embeddingRunId === undefined || options.embeddingRunId === null
        ? null
        : normalizeDocumentId(options.embeddingRunId);
    const retryCount = Number.isSafeInteger(options.retryCount) && Number(options.retryCount) >= 0
        ? Number(options.retryCount)
        : 0;
    if (!articleId || !jobId || (options.embeddingRunId != null && !runId)) {
        throw new PermanentArticleEmbeddingError('Embedding task identity is invalid.');
    }
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);

    try {
        const preflight = await firestoreAdmin.runTransaction(async (transaction) => {
            const jobSnap = await transaction.get(jobRef);
            if (!jobSnap.exists) return { skipped: true as const, scope: null };
            const job = parseWorkerJob(jobSnap.data());
            if (!job) throw new PermanentArticleEmbeddingError('Embedding job scope is invalid.');
            if (job.status !== INGESTION_JOB_STATUS.PUBLISHING) {
                return { skipped: true as const, scope: null };
            }
            if (job.embeddingRunId && job.embeddingRunId !== runId) {
                return { skipped: true as const, scope: null };
            }
            if (!job.embeddingPendingArticleIds.includes(articleId)) {
                throw new PermanentArticleEmbeddingError('Article is not part of this embedding job.');
            }
            if (job.embeddingCompletedArticleIds.includes(articleId)) {
                return { skipped: true as const, scope: null };
            }
            return {
                skipped: false as const,
                scope: { tId: job.tId, sId: job.sId } satisfies AnswerlatticeArticleScope,
            };
        });
        if (preflight.skipped || !preflight.scope) {
            return { completed: false, skipped: true };
        }

        const embedding = await embedStoredAnswerlatticeArticle({
            articleId,
            expectedScope: preflight.scope,
            source: 'answerlattice_embed_article_worker',
        });
        const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
        const completedAt = Timestamp.now();
        const completion = await firestoreAdmin.runTransaction(async (transaction) => {
            const [jobSnap, articleSnap] = await Promise.all([
                transaction.get(jobRef),
                transaction.get(articleRef),
            ]);
            if (!jobSnap.exists || !articleSnap.exists) {
                throw new PermanentArticleEmbeddingError('Embedding completion records are unavailable.');
            }
            const job = parseWorkerJob(jobSnap.data());
            const article = articleSnap.data() || {};
            if (
                !job
                || job.status !== INGESTION_JOB_STATUS.PUBLISHING
                || (job.embeddingRunId && job.embeddingRunId !== runId)
                || !job.embeddingPendingArticleIds.includes(articleId)
                || normalizeScopeId(article.tId) !== job.tId
                || normalizeScopeId(article.sId) !== job.sId
                || article.pId !== PRODUCT_ID
                || article.embeddingStatus !== 'embedded'
                || article.embeddingSourceHash !== embedding.sourceHash
            ) {
                return { completed: false, skipped: true };
            }
            const completedIds = Array.from(new Set([...job.embeddingCompletedArticleIds, articleId]))
                .slice(0, MAX_EMBEDDING_ARTICLES_PER_JOB);
            const failedIds = job.embeddingFailedArticleIds.filter(id => id !== articleId);
            transaction.set(articleRef, {
                active: true,
                status: ARTICLE_STATUS.PUBLISHED,
                lastReviewedOn: completedAt,
                modifiedOn: completedAt,
            }, { merge: true });
            transaction.set(jobRef, {
                embeddingCompletedArticleIds: completedIds,
                embeddingFailedArticleIds: failedIds,
                articlesEmbeddedCount: completedIds.length,
                modifiedOn: completedAt,
            }, { merge: true });
            return { completed: true, skipped: false };
        });
        logger.info('[Answerlattice KB] Article embedding worker completed', {
            ...getEmbedArticleWorkerContext(articleId, jobId, retryCount),
            reused: embedding.reused,
            completed: completion.completed,
        });
        return completion;
    } catch (error) {
        const permanent = error instanceof PermanentArticleEmbeddingError;
        const finalAttempt = permanent || options.finalAttempt === true;
        await markEmbeddingFailure({
            articleId,
            finalAttempt,
            jobId,
            runId,
        }).catch((stateError) => {
            logger.error('[Answerlattice KB] Failed to persist worker failure state', {
                failureCode: EMBED_ARTICLE_WORKER_FAILURE_STATE_WRITE_FAILED_CODE,
                ...getEmbedArticleWorkerContext(articleId, jobId, retryCount),
                ...getEmbedArticleWorkerErrorContext(stateError),
            });
        });
        logger.error('[Answerlattice KB] Article embedding worker failed', {
            failureCode: permanent
                ? EMBED_ARTICLE_WORKER_ARTICLE_NOT_FOUND_CODE
                : EMBED_ARTICLE_WORKER_FAILED_CODE,
            ...getEmbedArticleWorkerContext(articleId, jobId, retryCount),
            finalAttempt,
            ...getEmbedArticleWorkerErrorContext(error),
        });
        if (!finalAttempt) throw error;
        return { completed: false, failed: true, skipped: false };
    }
}
