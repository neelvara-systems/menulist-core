import { randomUUID } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { HttpsError } from 'firebase-functions/v2/https';
import {
    ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
    ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY,
    ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
} from '../constants/ai';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    ARTICLE_RECONCILIATION_STATUS,
    ARTICLE_STATUS,
    ANSWERLATTICE_FAQS_COLLECTION,
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    IngestionJob,
    IngestionJobCategory,
    IngestionJobCategoriesMap,
    KB_ARTICLES_COLLECTION,
} from '../types';
import { getAnswerlatticeEmbeddingInput } from './embeddingSourceBoundary';
import { getReusableEmbeddingVectorDimensions } from './embeddingVectorBoundary';

const PRODUCT_ID = 'AL';
const MAX_PUBLISH_ARTICLES = 60;
const MAX_PUBLISH_CATEGORIES = 20;
const MAX_PUBLISH_SECTIONS = 60;
const MAX_REPLACEMENT_ARTICLES = 20;
const MAX_FINAL_CATEGORIES_INPUT_BYTES = 512 * 1024;
const PUBLISH_APPROVED_JOB_FAILED_CODE = 'ANSWERLATTICE_PUBLISH_APPROVED_JOB_FAILED';
const PUBLISH_APPROVED_JOB_STATUS_UPDATE_FAILED_CODE = 'ANSWERLATTICE_PUBLISH_APPROVED_JOB_STATUS_UPDATE_FAILED';
const PUBLISH_APPROVED_JOB_NOT_FOUND_CODE = 'ANSWERLATTICE_PUBLISH_APPROVED_JOB_NOT_FOUND';
const PUBLISH_APPROVED_JOB_FAILED_MESSAGE = 'Publishing failed';

type ArticlePlacement = {
    id: string;
    title: string;
    categoryId: string;
    categoryTitle: string;
    sectionId: string;
    sectionTitle: string;
    reEmbedding: boolean;
};

type NormalizedFinalCategories = {
    categories: IngestionJobCategoriesMap;
    placements: Map<string, ArticlePlacement>;
};

function normalizeDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (id !== value || !id || id.length > 180 || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) return null;
    return id;
}

function normalizeGeneratedArticleId(value: unknown): string | null {
    const id = normalizeDocumentId(value);
    return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

function normalizeRouteSegment(value: unknown): string | null {
    const id = normalizeDocumentId(value);
    return id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedIndex(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 10_000
        ? value
        : fallback;
}

function normalizeScopeId(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 && String(id) === raw ? id : null;
}

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') return value.slice(0, 120);
    return null;
}

function getPublishApprovedJobErrorContext(jobId: string, error: unknown) {
    const sourceError = error as { code?: unknown; status?: unknown };
    const sourceErrorCode = boundedDiagnosticValue(sourceError?.code);
    const sourceStatusCode = boundedDiagnosticValue(sourceError?.status);
    return {
        jobIdLength: jobId.length,
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        ...(sourceErrorCode ? { sourceErrorCode } : {}),
        ...(sourceStatusCode ? { sourceStatusCode } : {}),
    };
}

function getPublishApprovedJobFailureCode(error: unknown): string {
    if (error instanceof HttpsError && error.code === 'not-found') return PUBLISH_APPROVED_JOB_NOT_FOUND_CODE;
    return PUBLISH_APPROVED_JOB_FAILED_CODE;
}

function cleanText(value: unknown, maxLength: number): string {
    return (typeof value === 'string' ? value : '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function cleanStringList(value: unknown, maxItems: number, maxLength: number): string[] {
    const input = Array.isArray(value) ? value : [];
    return Array.from(new Set(input.map(item => cleanText(item, maxLength)).filter(Boolean))).slice(0, maxItems);
}

function normalizeGeneratedFaqs(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const question = cleanText(record.question, 240);
        const answer = cleanText(record.answer, 2_000);
        if (!question || !answer) return null;
        return {
            question,
            answer,
            tags: cleanStringList(record.tags, 20, 64),
            contextKeys: cleanStringList(record.contextKeys, 20, 80),
            entityIds: cleanStringList(record.entityIds, 25, 160),
            sortOrder: typeof record.sortOrder === 'number' && Number.isSafeInteger(record.sortOrder)
                ? record.sortOrder
                : index,
        };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 5);
}

function buildFaqId(articleId: string, index: number): string {
    return `${articleId}_faq_${index + 1}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);
}

function buildFaqDrafts(
    article: Record<string, unknown>,
    articleTitle: string,
    articleId: string,
    job: Pick<IngestionJob, 'id' | 'uId'>,
    scope: { tId: number; sId: number },
) {
    return normalizeGeneratedFaqs(article.generatedFaqs).map((faq, index) => {
        const id = buildFaqId(articleId, index);
        return {
            id,
            data: {
                id,
                pId: PRODUCT_ID,
                ...scope,
                uId: job.uId,
                question: faq.question,
                answer: faq.answer,
                source: 'import',
                articleId,
                articleTitle,
                tags: faq.tags,
                contextKeys: faq.contextKeys,
                entityIds: faq.entityIds.length ? faq.entityIds : cleanStringList(article.entityIds, 25, 160),
                sortOrder: faq.sortOrder,
                jobId: job.id,
                generatedFromArticleId: articleId,
                publishedOn: null,
                lastReviewedOn: null,
                reviewRequestedOn: null,
                createdOn: article.createdOn instanceof Timestamp ? article.createdOn : Timestamp.now(),
                modifiedOn: Timestamp.now(),
                status: 'needs_review',
                active: false,
            },
        };
    });
}

export function normalizeFinalCategories(input: unknown): NormalizedFinalCategories {
    let byteSize = Number.POSITIVE_INFINITY;
    try {
        byteSize = Buffer.byteLength(JSON.stringify(input), 'utf8');
    } catch {
        throw new HttpsError('invalid-argument', 'Final knowledge-base structure is invalid.');
    }
    if (byteSize > MAX_FINAL_CATEGORIES_INPUT_BYTES || !input || typeof input !== 'object' || Array.isArray(input)) {
        throw new HttpsError('invalid-argument', 'Final knowledge-base structure is invalid.');
    }

    const categories: IngestionJobCategoriesMap = Object.create(null);
    const placements = new Map<string, ArticlePlacement>();
    let sectionCount = 0;
    const categoryEntries = Object.entries(input as Record<string, unknown>);
    if (categoryEntries.length === 0 || categoryEntries.length > MAX_PUBLISH_CATEGORIES) {
        throw new HttpsError('invalid-argument', 'Final knowledge-base structure has an invalid category count.');
    }

    const normalizeArticle = (
        value: unknown,
        categoryId: string,
        categoryTitle: string,
        sectionId: string,
        sectionTitle: string,
        index: number,
    ) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new HttpsError('invalid-argument', 'Final knowledge-base article is invalid.');
        }
        const record = value as Record<string, unknown>;
        const id = normalizeGeneratedArticleId(record.id);
        const title = cleanText(record.title, 240);
        if (!id || !title || placements.has(id)) {
            throw new HttpsError('invalid-argument', 'Final knowledge-base article identity is invalid.');
        }
        if (placements.size >= MAX_PUBLISH_ARTICLES) {
            throw new HttpsError('invalid-argument', 'Final knowledge-base structure has too many articles.');
        }
        placements.set(id, {
            id,
            title,
            categoryId,
            categoryTitle,
            sectionId,
            sectionTitle,
            reEmbedding: record.reEmbedding === true,
        });
        return {
            id,
            title,
            active: true,
            index: boundedIndex(record.index, index),
            url: sectionId
                ? `/${categoryId}/${sectionId}/${id}`
                : `/${categoryId}/${id}`,
            ...(record.reEmbedding === true ? { reEmbedding: true } : {}),
        };
    };

    categoryEntries.forEach(([rawCategoryId, value], categoryIndex) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new HttpsError('invalid-argument', 'Final knowledge-base category is invalid.');
        }
        const record = value as Record<string, unknown>;
        const categoryId = normalizeRouteSegment(rawCategoryId);
        const title = cleanText(record.title, 160);
        const storedCategoryId = record.id === undefined ? categoryId : normalizeRouteSegment(record.id);
        if (!categoryId || storedCategoryId !== categoryId || !title) {
            throw new HttpsError('invalid-argument', 'Final knowledge-base category identity is invalid.');
        }
        const directArticles = Array.isArray(record.articles) ? record.articles : [];
        const rawSections = Array.isArray(record.sections) ? record.sections : [];
        if (directArticles.length > 0 && rawSections.length > 0) {
            throw new HttpsError('invalid-argument', 'A category cannot contain direct articles and sections together.');
        }
        const category: IngestionJobCategory = {
            id: categoryId,
            title,
            description: cleanText(record.description, 500),
            icon: cleanText(record.icon, 80) || 'book',
            url: `/${categoryId}`,
            active: true,
            index: boundedIndex(record.index, categoryIndex),
        };
        if (directArticles.length > 0) {
            category.articles = directArticles.map((article, articleIndex) => normalizeArticle(
                article,
                categoryId,
                title,
                '',
                '',
                articleIndex,
            ));
        } else {
            category.sections = rawSections.map((sectionValue, sectionIndex) => {
                sectionCount += 1;
                if (sectionCount > MAX_PUBLISH_SECTIONS || !sectionValue || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) {
                    throw new HttpsError('invalid-argument', 'Final knowledge-base section is invalid.');
                }
                const sectionRecord = sectionValue as Record<string, unknown>;
                const sectionId = normalizeRouteSegment(sectionRecord.id);
                const sectionTitle = cleanText(sectionRecord.title, 160);
                if (!sectionId || !sectionTitle) throw new HttpsError('invalid-argument', 'Final knowledge-base section identity is invalid.');
                const articles = Array.isArray(sectionRecord.articles) ? sectionRecord.articles : [];
                return {
                    id: sectionId,
                    title: sectionTitle,
                    description: cleanText(sectionRecord.description, 500),
                    active: true,
                    index: boundedIndex(sectionRecord.index, sectionIndex),
                    url: `/${categoryId}/${sectionId}`,
                    articles: articles.map((article, articleIndex) => normalizeArticle(
                        article,
                        categoryId,
                        title,
                        sectionId,
                        sectionTitle,
                        articleIndex,
                    )),
                };
            });
        }
        categories[categoryId] = category;
    });
    if (placements.size === 0) throw new HttpsError('invalid-argument', 'Publish at least one knowledge-base article.');
    return { categories, placements };
}

function normalizeJobArticleIds(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PUBLISH_ARTICLES) return null;
    const ids = value.map(normalizeGeneratedArticleId);
    if (ids.some(id => id === null)) return null;
    const uniqueIds = Array.from(new Set(ids as string[]));
    return uniqueIds.length === value.length ? uniqueIds : null;
}

function normalizeArticlesToReview(value: unknown, jobArticleIds: Set<string>): Array<{
    similarArticleIds: string[];
    status: string;
}> | null {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value) || value.length > MAX_PUBLISH_ARTICLES) return null;
    const validStatuses = new Set<string>(Object.values(ARTICLE_RECONCILIATION_STATUS));
    const seenIds = new Set<string>();
    const normalized = [];
    for (const item of value) {
        if (!isRecord(item)) return null;
        const id = normalizeGeneratedArticleId(item.id);
        if (!id || !jobArticleIds.has(id) || seenIds.has(id) || !validStatuses.has(String(item.status))) return null;
        seenIds.add(id);
        if (!Array.isArray(item.similarArticles) || item.similarArticles.length > 3) return null;
        const similarArticleIds = item.similarArticles.map(article => (
            isRecord(article) ? normalizeDocumentId(article.id) : null
        ));
        if (similarArticleIds.some(articleId => articleId === null)) return null;
        const uniqueSimilarArticleIds = Array.from(new Set(similarArticleIds as string[]));
        if (uniqueSimilarArticleIds.length !== similarArticleIds.length) return null;
        normalized.push({ status: String(item.status), similarArticleIds: uniqueSimilarArticleIds });
    }
    return normalized;
}

function getOwnedGeneratedFaqIds(articleId: string, value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const prefix = `${articleId}_faq_`;
    return Array.from(new Set(value
        .map(normalizeDocumentId)
        .filter((id): id is string => id !== null && id.startsWith(prefix))))
        .slice(0, 5);
}

function deleteStaleGeneratedFaqs(
    transaction: FirebaseFirestore.Transaction,
    articleId: string,
    previousFaqIds: unknown,
    nextFaqIds: string[],
) {
    const nextIds = new Set(nextFaqIds);
    for (const faqId of getOwnedGeneratedFaqIds(articleId, previousFaqIds)) {
        if (!nextIds.has(faqId)) {
            transaction.delete(firestoreAdmin.collection(ANSWERLATTICE_FAQS_COLLECTION).doc(faqId));
        }
    }
}

export async function publishApprovedJobLogic(jobIdInput: string, finalCategoriesInput: IngestionJobCategoriesMap) {
    const jobId = normalizeDocumentId(jobIdInput);
    if (!jobId) throw new HttpsError('invalid-argument', 'Job ID is invalid.');
    const normalized = normalizeFinalCategories(finalCategoriesInput);
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    let alreadyStarted = false;

    try {
        await firestoreAdmin.runTransaction(async (transaction) => {
            const jobSnap = await transaction.get(jobRef);
            if (!jobSnap.exists) throw new HttpsError('not-found', 'Job not found.');
            const job = { ...jobSnap.data(), id: jobSnap.id } as IngestionJob;
            if (job.status === INGESTION_JOB_STATUS.PUBLISHING || job.status === INGESTION_JOB_STATUS.PUBLISHED) {
                alreadyStarted = true;
                return;
            }
            if (job.status !== INGESTION_JOB_STATUS.NEEDS_REVIEW) {
                throw new HttpsError('failed-precondition', 'This knowledge-base job is not ready to publish.');
            }
            if (job.deletionRun) {
                throw new HttpsError('failed-precondition', 'This knowledge-base job is being deleted.');
            }
            if (job.pId !== PRODUCT_ID) {
                throw new HttpsError('failed-precondition', 'This knowledge-base job is not available.');
            }
            const tId = normalizeScopeId(job.tId);
            const sId = normalizeScopeId(job.sId);
            if (!tId || !sId) throw new HttpsError('failed-precondition', 'This knowledge-base job is not available.');
            const jobArticleIds = normalizeJobArticleIds(job.articleIds);
            if (!jobArticleIds) {
                throw new HttpsError('failed-precondition', 'This knowledge-base job has an invalid article set.');
            }
            const jobArticleIdSet = new Set(jobArticleIds);
            for (const articleId of normalized.placements.keys()) {
                if (!jobArticleIds.includes(articleId)) {
                    throw new HttpsError('failed-precondition', 'Final knowledge-base structure contains an article outside this job.');
                }
            }
            const articlesToReview = normalizeArticlesToReview(job.articlesToReview, jobArticleIdSet);
            if (!articlesToReview) {
                throw new HttpsError('failed-precondition', 'This knowledge-base job has invalid reconciliation state.');
            }
            if (articlesToReview.some(item => item.status === ARTICLE_RECONCILIATION_STATUS.UNRESOLVED)) {
                throw new HttpsError('failed-precondition', 'Resolve duplicate article reviews before publishing.');
            }

            const articleDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>();
            for (const articleId of jobArticleIds) {
                const articleSnap = await transaction.get(firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId));
                articleDocs.set(articleId, articleSnap);
            }

            const allReplacementIds = Array.from(new Set(articlesToReview
                .filter(item => item.status === ARTICLE_RECONCILIATION_STATUS.REPLACE)
                .flatMap(item => item.similarArticleIds)
                .filter(id => !jobArticleIdSet.has(id))));
            if (allReplacementIds.length > MAX_REPLACEMENT_ARTICLES) {
                throw new HttpsError('resource-exhausted', 'Too many replacement articles were selected.');
            }
            const replacementIds = allReplacementIds;
            const replacementDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>();
            for (const articleId of replacementIds) {
                replacementDocs.set(articleId, await transaction.get(firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId)));
            }

            for (const [articleId, articleSnap] of articleDocs) {
                if (!articleSnap.exists) throw new HttpsError('failed-precondition', 'A generated article is missing.');
                const article = articleSnap.data() || {};
                if (
                    article.pId !== PRODUCT_ID
                    || normalizeScopeId(article.tId) !== tId
                    || normalizeScopeId(article.sId) !== sId
                    || String(article.jobId || '') !== jobId
                    || normalizeDocumentId(article.id ?? articleId) !== articleId
                ) {
                    throw new HttpsError('failed-precondition', 'A generated article has invalid workspace ownership.');
                }
            }
            for (const [articleId, articleSnap] of replacementDocs) {
                if (!articleSnap.exists) continue;
                const article = articleSnap.data() || {};
                if (
                    article.pId !== PRODUCT_ID
                    || normalizeScopeId(article.tId) !== tId
                    || normalizeScopeId(article.sId) !== sId
                    || normalizeDocumentId(article.id ?? articleId) !== articleId
                ) {
                    throw new HttpsError('failed-precondition', 'A replacement article has invalid workspace ownership.');
                }
            }

            const embeddingPendingArticleIds: string[] = [];
            for (const articleId of jobArticleIds) {
                const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
                const article = articleDocs.get(articleId)?.data() || {};
                const placement = normalized.placements.get(articleId);
                if (!placement) {
                    deleteStaleGeneratedFaqs(transaction, articleId, article.faqIds, []);
                    transaction.delete(articleRef);
                    continue;
                }
                const embeddingInput = getAnswerlatticeEmbeddingInput({
                    categoryTitle: article.categoryTitle,
                    sectionTitle: article.sectionTitle,
                    title: article.title,
                    content: article.content,
                });
                if (!embeddingInput) {
                    throw new HttpsError('failed-precondition', 'A generated article has invalid content for embedding.');
                }
                const needsEmbedding = placement.reEmbedding
                    || article.embeddingStatus !== 'embedded'
                    || article.embeddingCacheVersion !== ANSWERLATTICE_EMBEDDING_CACHE_VERSION
                    || article.embeddingSourceHash !== embeddingInput.sourceHash
                    || getReusableEmbeddingVectorDimensions(article[ANSWERLATTICE_EMBEDDING_VECTOR_FIELD]) !== ANSWERLATTICE_EMBEDDING_OUTPUT_DIMENSIONALITY
                    || article.categoryTitle !== placement.categoryTitle
                    || (article.sectionTitle || '') !== placement.sectionTitle
                    || article.title !== placement.title;
                if (needsEmbedding) embeddingPendingArticleIds.push(articleId);
                const faqDrafts = buildFaqDrafts(article, placement.title, articleId, job, { tId, sId });
                const nextFaqIds = faqDrafts.map(item => item.id);
                deleteStaleGeneratedFaqs(transaction, articleId, article.faqIds, nextFaqIds);
                transaction.set(articleRef, {
                    pId: PRODUCT_ID,
                    tId,
                    sId,
                    categoryId: placement.categoryId,
                    categoryTitle: placement.categoryTitle,
                    sectionId: placement.sectionId,
                    sectionTitle: placement.sectionTitle,
                    title: placement.title,
                    active: false,
                    status: ARTICLE_STATUS.NEEDS_REVIEW,
                    ...(needsEmbedding ? { embeddingStatus: 'pending' } : {}),
                    generatedFaqs: FieldValue.delete(),
                    reconciliation: FieldValue.delete(),
                    faqIds: nextFaqIds,
                    modifiedOn: Timestamp.now(),
                }, { merge: true });
                for (const faqDraft of faqDrafts) {
                    transaction.set(
                        firestoreAdmin.collection(ANSWERLATTICE_FAQS_COLLECTION).doc(faqDraft.id),
                        faqDraft.data,
                        { merge: true },
                    );
                }
            }

            const embeddingRunId = `publish_${randomUUID()}`;
            transaction.set(jobRef, {
                pId: PRODUCT_ID,
                status: INGESTION_JOB_STATUS.PUBLISHING,
                categories: normalized.categories,
                articleIds: Array.from(normalized.placements.keys()),
                embeddingPendingArticleIds,
                embeddingCompletedArticleIds: [],
                embeddingFailedArticleIds: [],
                embeddingEnqueueStatus: 'pending',
                embeddingRunId,
                replacementArticleIds: replacementIds,
                articlesToEmbedCount: embeddingPendingArticleIds.length,
                articlesEmbeddedCount: 0,
                errorMessage: null,
                failureStage: null,
                modifiedOn: Timestamp.now(),
            }, { merge: true });
        });

        return {
            success: true,
            alreadyStarted,
            status: alreadyStarted ? 'already_started' : 'publishing',
        };
    } catch (error) {
        logger.error('[Answerlattice KB] Publish orchestration failed', {
            failureCode: getPublishApprovedJobFailureCode(error),
            ...getPublishApprovedJobErrorContext(jobId, error),
        });
        if (error instanceof HttpsError) throw error;
        await jobRef.set({
            status: INGESTION_JOB_STATUS.FAILED,
            errorMessage: PUBLISH_APPROVED_JOB_FAILED_MESSAGE,
            failureStage: 'publishing_orchestration',
            modifiedOn: Timestamp.now(),
        }, { merge: true }).catch((statusError) => {
            logger.error('[Answerlattice KB] Publish failure status update failed', {
                failureCode: PUBLISH_APPROVED_JOB_STATUS_UPDATE_FAILED_CODE,
                ...getPublishApprovedJobErrorContext(jobId, statusError),
            });
        });
        throw new HttpsError('internal', 'Could not publish approved job.', {
            code: PUBLISH_APPROVED_JOB_FAILED_CODE,
        });
    }
}
