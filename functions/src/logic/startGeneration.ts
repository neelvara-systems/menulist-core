import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { ANSWERLATTICE_EMBEDDING_CACHE_VERSION, ANSWERLATTICE_EMBEDDING_VECTOR_FIELD } from '../constants/ai';
import { firestoreAdmin } from '../firebaseAdmin';
import { constructKbGenerationPrompt } from '../prompt';
import {
    ARTICLE_RECONCILIATION_STATUS,
    ARTICLE_STATUS,
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    type IngestionJob,
    type IngestionJobArticleToReview,
    type IngestionJobCategoriesMap,
    KB_ARTICLES_COLLECTION,
    type KnowledgeBaseArticleSource,
    type KnowledgeBaseArticleSummary,
    type ProcessedArticleToSave,
    type ProcessedKBArticle,
    type ProcessedKBCategory,
    type ProcessedKBMap,
    type ProcessedKBSection,
} from '../types';
import { genrateEmbedding, getKBFromSource } from '../utils/aiUtils';
import { tiptapToText } from '../utils/tiptapUtils';
import { getAnswerlatticeEmbeddingInput } from './embeddingSourceBoundary';

const PRODUCT_ID = 'AL' as const;
const START_GENERATION_FAILED_CODE = 'ANSWERLATTICE_START_GENERATION_FAILED';
const START_GENERATION_FAILED_MESSAGE = 'Knowledge generation failed';
const MAX_EXISTING_ARTICLE_SUMMARIES = 100;
const EMBEDDING_CONCURRENCY = 3;
const MAX_JOB_COMPLETION_JSON_BYTES = 850_000;
const GENERATION_LEASE_MS = 15 * 60 * 1000;
const GENERATION_CANCELLED_CODE = 'ANSWERLATTICE_START_GENERATION_CANCELLED';

type Scope = { tId: number; sId: number };
type ArticleTask = {
    article: ProcessedKBArticle;
    category: ProcessedKBCategory;
    categoryId: string;
    section: ProcessedKBSection | null;
    sectionId: string;
};
type StartGenerationDependencies = {
    generateKnowledge?: typeof getKBFromSource;
    generateEmbedding?: typeof genrateEmbedding;
};

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getStartGenerationErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

function createGenerationCancellationError(): Error & { code: string } {
    const error = new Error(GENERATION_CANCELLED_CODE) as Error & { code: string };
    error.code = GENERATION_CANCELLED_CODE;
    return error;
}

function isGenerationCancellationError(error: unknown): boolean {
    return Boolean(
        error
        && typeof error === 'object'
        && 'code' in error
        && error.code === GENERATION_CANCELLED_CODE,
    );
}

function getStartGenerationJobContext(job: Partial<IngestionJob> | null, jobId: string) {
    return {
        jobIdLength: jobId.length,
        sourceFileCount: Array.isArray(job?.sourceFiles) ? job.sourceFiles.length : 0,
        hasTenantScope: job?.tId != null,
        hasStoreScope: job?.sId != null,
    };
}

function getProcessedArticleContext(article: ProcessedKBArticle, jobId: string) {
    return {
        jobIdLength: jobId.length,
        articleIdLength: article.id?.length || 0,
        titleLength: article.title?.length || 0,
        sourceCount: Array.isArray(article.sources) ? article.sources.length : 0,
        generatedFaqCount: Array.isArray(article.generatedFaqs) ? article.generatedFaqs.length : 0,
    };
}

function normalizeDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (
        !id
        || id !== value
        || id.length > 180
        || id === '.'
        || id === '..'
        || id.includes('/')
        || /^__.*__$/.test(id)
    ) return null;
    return id;
}

function normalizeScopeId(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed > 0 && String(parsed) === raw ? parsed : null;
}

function cleanText(value: unknown, maxLength: number): string {
    return typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : '';
}

function titleTokens(value: string): Set<string> {
    return new Set(cleanText(value, 240).toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length >= 3));
}

function titleSimilarity(leftValue: string, rightValue: string): number {
    const left = titleTokens(leftValue);
    const right = titleTokens(rightValue);
    if (!left.size || !right.size) return 0;
    const intersection = Array.from(left).filter(token => right.has(token)).length;
    const union = new Set(Array.from(left).concat(Array.from(right))).size;
    return union ? intersection / union : 0;
}

async function loadExistingArticleSummaries(scope: Scope): Promise<KnowledgeBaseArticleSummary[]> {
    const snapshot = await firestoreAdmin.collection(KB_ARTICLES_COLLECTION)
        .where('pId', '==', PRODUCT_ID)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', ARTICLE_STATUS.PUBLISHED)
        .limit(MAX_EXISTING_ARTICLE_SUMMARIES)
        .select('id', 'title', 'categoryTitle', 'sectionTitle', 'status', 'active', 'pId', 'tId', 'sId')
        .get();
    return snapshot.docs.flatMap(document => {
        const data = document.data();
        const id = normalizeDocumentId(document.id);
        const title = cleanText(data.title, 240);
        if (
            !id
            || !title
            || data.pId !== PRODUCT_ID
            || data.tId !== scope.tId
            || data.sId !== scope.sId
            || data.status !== ARTICLE_STATUS.PUBLISHED
        ) return [];
        return [{
            id,
            title,
            categoryTitle: cleanText(data.categoryTitle, 160),
            sectionTitle: cleanText(data.sectionTitle, 160),
            status: ARTICLE_STATUS.PUBLISHED,
            active: data.active !== false,
        }];
    });
}

function findTitleSimilarArticles(
    title: string,
    existingArticles: KnowledgeBaseArticleSummary[],
): KnowledgeBaseArticleSummary[] {
    return existingArticles
        .map(article => ({ ...article, score: titleSimilarity(title, article.title) }))
        .filter(article => Number(article.score) >= 0.72)
        .sort((left, right) => Number(right.score) - Number(left.score) || left.id.localeCompare(right.id))
        .slice(0, 3);
}

function buildArticleTasks(categoryMap: ProcessedKBMap): ArticleTask[] {
    const tasks: ArticleTask[] = [];
    for (const [categoryId, category] of Object.entries(categoryMap)) {
        for (const article of category.articles || []) {
            tasks.push({ article, category, categoryId, section: null, sectionId: '' });
        }
        for (const section of category.sections || []) {
            for (const article of section.articles || []) {
                tasks.push({ article, category, categoryId, section, sectionId: section.id });
            }
        }
    }
    return tasks;
}

function sourceType(value: unknown): KnowledgeBaseArticleSource['type'] {
    const normalized = cleanText(value, 120).toLowerCase();
    if (normalized === 'pdf' || normalized === 'application/pdf') return 'pdf';
    if (normalized === 'image' || normalized.startsWith('image/')) return 'image';
    if (normalized === 'video' || normalized.startsWith('video/') || normalized.startsWith('audio/')) return 'video';
    return 'document';
}

function buildSourceReferences(job: Partial<IngestionJob>): KnowledgeBaseArticleSource[] {
    if (!Array.isArray(job.sourceFiles)) return [];
    return job.sourceFiles.map(file => ({
        type: sourceType(file.type),
        url: cleanText(file.storagePath, 1024),
        name: cleanText(file.fileName, 180),
    })).filter(source => Boolean(source.url && source.name));
}

function buildReviewNavigation(categoryMap: ProcessedKBMap): IngestionJobCategoriesMap {
    const navigation: IngestionJobCategoriesMap = {};
    Object.entries(categoryMap).forEach(([categoryId, category], categoryIndex) => {
        const toArticle = (article: ProcessedKBArticle, articleIndex: number) => ({
            id: article.id,
            title: article.title,
            active: true,
            index: articleIndex,
            url: `/${categoryId}/${article.id}`,
        });
        const sections = (category.sections || []).map((section, sectionIndex) => ({
            id: section.id,
            title: section.title,
            description: section.description || '',
            active: true,
            index: sectionIndex,
            url: `/${categoryId}/${section.id}`,
            articles: (section.articles || []).map((article, articleIndex) => ({
                ...toArticle(article, articleIndex),
                url: `/${categoryId}/${section.id}/${article.id}`,
            })),
        }));
        navigation[categoryId] = {
            id: categoryId,
            title: category.title,
            description: category.description || '',
            active: true,
            index: categoryIndex,
            url: `/${categoryId}`,
            ...(sections.length ? { sections } : {
                articles: (category.articles || []).map(toArticle),
            }),
        };
    });
    return navigation;
}

export const startGenerationLogic = async (
    jobIdInput: string,
    jobHint: IngestionJob,
    dependencies: StartGenerationDependencies = {},
) => {
    const logger = functions.logger;
    const jobId = normalizeDocumentId(jobIdInput);
    if (!jobId) {
        logger.error('[startGenerationLogic] Generation failed', {
            failureCode: START_GENERATION_FAILED_CODE,
            jobIdLength: typeof jobIdInput === 'string' ? jobIdInput.length : 0,
            sourceErrorName: 'InvalidJobId',
        });
        return { skipped: false, failed: true };
    }
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    const runId = `generation_${randomUUID()}`;
    const startedAt = Timestamp.now();
    const leaseExpiresAt = Timestamp.fromMillis(startedAt.toMillis() + GENERATION_LEASE_MS);
    let claimedJob: Partial<IngestionJob> | null = null;

    logger.info('[startGenerationLogic] Starting generation function', getStartGenerationJobContext(jobHint, jobId));

    try {
        claimedJob = await firestoreAdmin.runTransaction(async transaction => {
            const snapshot = await transaction.get(jobRef);
            if (!snapshot.exists) return null;
            const data = snapshot.data() as Partial<IngestionJob> & Record<string, unknown>;
            if (data.status !== INGESTION_JOB_STATUS.PENDING) return null;
            const tId = normalizeScopeId(data.tId);
            const sId = normalizeScopeId(data.sId);
            if (!tId || !sId || (data.pId != null && data.pId !== PRODUCT_ID)) {
                transaction.set(jobRef, {
                    status: INGESTION_JOB_STATUS.FAILED,
                    errorMessage: START_GENERATION_FAILED_MESSAGE,
                    failureStage: 'generation',
                    modifiedOn: startedAt,
                }, { merge: true });
                return null;
            }
            transaction.set(jobRef, {
                pId: PRODUCT_ID,
                tId,
                sId,
                status: INGESTION_JOB_STATUS.PROCESSING,
                errorMessage: null,
                failureStage: null,
                generationRun: {
                    id: runId,
                    status: 'processing',
                    startedAt,
                    leaseExpiresAt,
                    completedAt: null,
                },
                modifiedOn: startedAt,
            }, { merge: true });
            return { ...data, pId: PRODUCT_ID, tId, sId };
        });
        if (!claimedJob) return { skipped: true };

        const scope = {
            tId: normalizeScopeId(claimedJob.tId)!,
            sId: normalizeScopeId(claimedJob.sId)!,
        };
        const prompt = constructKbGenerationPrompt();
        const generatedData = await (dependencies.generateKnowledge || getKBFromSource)(
            prompt,
            claimedJob.sourceFiles,
            scope,
        );
        logger.info('[startGenerationLogic:getKBFromSource] Generated data received', {
            ...getStartGenerationJobContext(claimedJob, jobId),
            categoryCount: Object.keys(generatedData || {}).length,
        });

        const categoryMap = generatedData || {};
        const tasks = buildArticleTasks(categoryMap);
        const sourceReferences = buildSourceReferences(claimedJob);
        const existingArticles = await loadExistingArticleSummaries(scope);
        const articlesToCreate: ProcessedArticleToSave[] = [];
        const articlesToReview: IngestionJobArticleToReview[] = [];

        for (let index = 0; index < tasks.length; index += EMBEDDING_CONCURRENCY) {
            const taskBatch = tasks.slice(index, index + EMBEDDING_CONCURRENCY);
            const processedBatch = await Promise.all(taskBatch.map(async task => {
                const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc();
                const articleForEmbedding = {
                    id: task.article.id,
                    categoryTitle: task.category.title,
                    sectionTitle: task.section?.title || '',
                    title: task.article.title,
                    content: task.article.content,
                    ...scope,
                    source: 'answerlattice_kb_generation',
                };
                const embedding = dependencies.generateEmbedding
                    ? await dependencies.generateEmbedding(articleForEmbedding)
                    : await genrateEmbedding(articleForEmbedding);
                const similarArticles = findTitleSimilarArticles(task.article.title, existingArticles);
                const embeddingInput = getAnswerlatticeEmbeddingInput({
                    categoryTitle: task.category.title,
                    sectionTitle: task.section?.title || '',
                    title: task.article.title,
                    content: task.article.content,
                });
                if (!embeddingInput) throw new Error('Article content is too short to embed.');
                const contentLength = tiptapToText(task.article.content).length;
                const lengthScore = Math.min(contentLength / 3000, 1) * 0.4;
                const structureScore = (task.article.title.length > 5 ? 0.3 : 0) + (task.section ? 0.1 : 0);
                const sourceScore = sourceReferences.length ? 0.2 : 0;
                const qualityScore = Math.round((lengthScore + structureScore + sourceScore) * 100) / 100;
                const now = Timestamp.now();
                const article: ProcessedArticleToSave = {
                    id: articleRef.id,
                    processedId: task.article.id,
                    pId: PRODUCT_ID,
                    ...scope,
                    active: false,
                    categoryId: task.categoryId,
                    sectionId: task.sectionId,
                    categoryTitle: task.category.title,
                    sectionTitle: task.section?.title || '',
                    title: task.article.title,
                    index: 0,
                    url: `/${task.categoryId}/${task.sectionId ? `${task.sectionId}/` : ''}${articleRef.id}`,
                    content: task.article.content,
                    [ANSWERLATTICE_EMBEDDING_VECTOR_FIELD]: FieldValue.vector(embedding),
                    embeddingStatus: 'embedded',
                    embeddingCacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
                    embeddingSourceHash: embeddingInput.sourceHash,
                    tags: [],
                    generatedFaqs: task.article.generatedFaqs || [],
                    createdOn: now,
                    modifiedOn: now,
                    status: ARTICLE_STATUS.NEEDS_REVIEW,
                    jobId,
                    sources: sourceReferences,
                    qualityScore,
                    ...(similarArticles.length ? {
                        reconciliation: {
                            status: ARTICLE_RECONCILIATION_STATUS.UNRESOLVED,
                            similarArticleIds: similarArticles.map(item => item.id),
                            similarArticles,
                        },
                    } : {}),
                };
                logger.info('[startGenerationLogic:processArticle] Processed article.', getProcessedArticleContext(task.article, jobId));
                return { article, similarArticles, task };
            }));
            for (const result of processedBatch) {
                result.task.article.id = result.article.id;
                articlesToCreate.push(result.article);
                if (result.similarArticles.length) {
                    articlesToReview.push({
                        id: result.article.id,
                        title: result.article.title,
                        status: ARTICLE_RECONCILIATION_STATUS.UNRESOLVED,
                        similarArticles: result.similarArticles,
                    });
                }
            }
        }

        const reviewNavigation = buildReviewNavigation(categoryMap);
        const completedAt = Timestamp.now();
        const jobCompletion = {
            status: INGESTION_JOB_STATUS.NEEDS_REVIEW,
            articleIds: articlesToCreate.map(article => article.id),
            categories: reviewNavigation,
            articlesToReview,
            errorMessage: null,
            failureStage: null,
            generationRun: {
                id: runId,
                status: 'completed',
                startedAt,
                leaseExpiresAt,
                completedAt,
            },
            modifiedOn: completedAt,
        };
        if (Buffer.byteLength(JSON.stringify(jobCompletion), 'utf8') > MAX_JOB_COMPLETION_JSON_BYTES) {
            throw new Error('Knowledge generation review state is too large.');
        }

        await firestoreAdmin.runTransaction(async transaction => {
            const snapshot = await transaction.get(jobRef);
            if (!snapshot.exists) throw new Error('Knowledge generation job is not available.');
            const current = snapshot.data() || {};
            if (current.status === INGESTION_JOB_STATUS.CANCELLED) {
                throw createGenerationCancellationError();
            }
            if (
                current.status !== INGESTION_JOB_STATUS.PROCESSING
                || current.generationRun?.id !== runId
                || current.generationRun?.status !== 'processing'
            ) {
                throw new Error('Knowledge generation job changed before completion.');
            }
            for (const article of articlesToCreate) {
                transaction.create(firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(article.id), article);
            }
            transaction.set(jobRef, jobCompletion, { merge: true });
        });

        logger.info('[startGenerationLogic] Process completed successfully. Job is now a Work Order.', {
            ...getStartGenerationJobContext(claimedJob, jobId),
            articleCount: articlesToCreate.length,
            reviewItemCount: articlesToReview.length,
            categoryCount: Object.keys(categoryMap).length,
        });
        return { skipped: false, articleCount: articlesToCreate.length };
    } catch (error: unknown) {
        if (isGenerationCancellationError(error)) {
            logger.info('[startGenerationLogic] Generation stopped after owner cancellation.', {
                jobIdLength: jobId.length,
            });
            return { skipped: false, cancelled: true };
        }
        const failedAt = Timestamp.now();
        if (claimedJob) {
            await firestoreAdmin.runTransaction(async transaction => {
                const snapshot = await transaction.get(jobRef);
                if (!snapshot.exists) return;
                const current = snapshot.data() || {};
                if (
                    current.status === INGESTION_JOB_STATUS.CANCELLED
                    || current.generationRun?.id !== runId
                    || current.generationRun?.status !== 'processing'
                ) return;
                transaction.set(jobRef, {
                    status: INGESTION_JOB_STATUS.FAILED,
                    errorMessage: START_GENERATION_FAILED_MESSAGE,
                    failureStage: 'generation',
                    generationRun: {
                        ...current.generationRun,
                        status: 'failed',
                        completedAt: failedAt,
                    },
                    modifiedOn: failedAt,
                }, { merge: true });
            }).catch(stateError => {
                logger.error('[startGenerationLogic] Failure state write failed', {
                    failureCode: 'ANSWERLATTICE_START_GENERATION_FAILURE_STATE_WRITE_FAILED',
                    jobIdLength: jobId.length,
                    ...getStartGenerationErrorContext(stateError),
                });
            });
        }
        logger.error('[startGenerationLogic] Generation failed', {
            failureCode: START_GENERATION_FAILED_CODE,
            ...getStartGenerationJobContext(claimedJob || jobHint, jobId),
            ...getStartGenerationErrorContext(error),
        });
        return { skipped: false, failed: true };
    }
};
