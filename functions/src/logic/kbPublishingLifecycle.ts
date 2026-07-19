import { createHash } from 'crypto';
import { getFunctions } from 'firebase-admin/functions';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
    ANSWERLATTICE_CACHE_SOURCES,
    getAnswerlatticeCacheVersionBumpData,
    getAnswerlatticeCacheVersionDocId,
} from '../answerlattice/cacheVersionManifest';
import {
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
} from '../answerlattice/compiledContextVersions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    ANSWERLATTICE_FAQS_COLLECTION,
    ANSWERLATTICE_CACHE_VERSIONS_COLLECTION,
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    IngestionJob,
    KB_ARTICLES_COLLECTION,
    KB_CATEGORIES_COLLECTION,
} from '../types';
import { normalizeFinalCategories } from './publishApprovedJob';

const PRODUCT_ID = 'AL';
const MAX_EMBEDDING_ARTICLES_PER_JOB = 100;
const MAX_REPLACEMENT_ARTICLES = 20;
const MAX_NAVIGATION_BYTES = 850 * 1024;

type PublishingJob = {
    tId: number;
    sId: number;
    status: string;
    articleIds: string[];
    pendingIds: string[];
    completedIds: string[];
    failedIds: string[];
    replacementIds: string[];
    embeddingRunId: string;
    enqueueStatus: string;
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

function collectLegacyPendingIds(categories: unknown): string[] | null {
    if (!categories || typeof categories !== 'object' || Array.isArray(categories)) return [];
    const ids: string[] = [];
    for (const category of Object.values(categories as Record<string, unknown>)) {
        if (!category || typeof category !== 'object' || Array.isArray(category)) continue;
        const record = category as Record<string, unknown>;
        const collectArticles = (articles: unknown) => {
            if (!Array.isArray(articles)) return;
            for (const article of articles) {
                if (!article || typeof article !== 'object' || Array.isArray(article)) continue;
                const articleRecord = article as Record<string, unknown>;
                const id = normalizeDocumentId(articleRecord.id);
                if (articleRecord.reEmbedding !== true) continue;
                if (!id) return false;
                ids.push(id);
            }
            return true;
        };
        if (collectArticles(record.articles) === false) return null;
        if (Array.isArray(record.sections)) {
            for (const section of record.sections) {
                if (!section || typeof section !== 'object' || Array.isArray(section)) continue;
                if (collectArticles((section as Record<string, unknown>).articles) === false) return null;
            }
        }
    }
    const uniqueIds = Array.from(new Set(ids));
    return uniqueIds.length <= MAX_EMBEDDING_ARTICLES_PER_JOB ? uniqueIds : null;
}

function parsePublishingJob(jobId: string, data: FirebaseFirestore.DocumentData | undefined): PublishingJob | null {
    if (!data) return null;
    const tId = normalizeScopeId(data.tId ?? data.tenantId);
    const sId = normalizeScopeId(data.sId ?? data.storeId);
    const pId = data.pId ?? data.productId;
    if (!tId || !sId || pId !== PRODUCT_ID) return null;
    const articleIds = normalizeIdList(data.articleIds);
    const pendingIds = normalizeIdList(data.embeddingPendingArticleIds);
    const completedIds = normalizeIdList(data.embeddingCompletedArticleIds);
    const failedIds = normalizeIdList(data.embeddingFailedArticleIds);
    const replacementIds = normalizeIdList(data.replacementArticleIds);
    const legacyPendingIds = data.embeddingPendingArticleIds === undefined
        ? collectLegacyPendingIds(data.categories)
        : pendingIds;
    const persistedRunId = data.embeddingRunId === undefined || data.embeddingRunId === null
        ? null
        : normalizeDocumentId(data.embeddingRunId);
    if (
        !articleIds
        || articleIds.length === 0
        || !pendingIds
        || !completedIds
        || !failedIds
        || !replacementIds
        || replacementIds.length > MAX_REPLACEMENT_ARTICLES
        || !legacyPendingIds
        || (data.embeddingRunId != null && !persistedRunId)
    ) return null;
    const pendingSet = new Set(legacyPendingIds);
    if (
        completedIds.some(id => !pendingSet.has(id))
        || failedIds.some(id => !pendingSet.has(id))
        || completedIds.some(id => failedIds.includes(id))
        || replacementIds.some(id => articleIds.includes(id))
    ) return null;
    const embeddingRunId = persistedRunId
        || `legacy_${createHash('sha256').update(jobId).digest('hex').slice(0, 32)}`;
    return {
        tId,
        sId,
        status: typeof data.status === 'string' ? data.status : '',
        articleIds,
        pendingIds: legacyPendingIds,
        completedIds,
        failedIds,
        replacementIds,
        embeddingRunId,
        enqueueStatus: typeof data.embeddingEnqueueStatus === 'string'
            ? data.embeddingEnqueueStatus
            : legacyPendingIds.length ? 'pending' : 'queued',
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getCategoriesDocId(tId: number, sId: number) {
    return `categories_${tId}_${sId}`;
}

function removeArticleIdsFromNavigation(categories: Record<string, unknown>, ids: Set<string>) {
    for (const category of Object.values(categories)) {
        if (!isRecord(category)) continue;
        if (Array.isArray(category.articles)) {
            category.articles = category.articles.filter(article => (
                !isRecord(article) || !ids.has(String(article.id || ''))
            ));
        }
        if (Array.isArray(category.sections)) {
            category.sections.forEach(section => {
                if (isRecord(section) && Array.isArray(section.articles)) {
                    section.articles = section.articles.filter(article => (
                        !isRecord(article) || !ids.has(String(article.id || ''))
                    ));
                }
            });
        }
    }
}

function getOwnedGeneratedFaqIds(articleId: string, value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const prefix = `${articleId}_faq_`;
    return Array.from(new Set(value
        .map(normalizeDocumentId)
        .filter((id): id is string => id !== null && id.startsWith(prefix))))
        .slice(0, 5);
}

function isTaskAlreadyExists(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const rawCode = (error as { code?: unknown }).code;
    if (rawCode === 6) return true;
    const code = String(rawCode || '').toLowerCase();
    return code.includes('task-already-exists') || code.includes('already-exists');
}

function getEmbeddingTaskId(jobId: string, articleId: string, runId: string): string {
    return `al-embed-${createHash('sha256').update(`${jobId}:${articleId}:${runId}`).digest('hex').slice(0, 48)}`;
}

export async function dispatchPublishingEmbeddingTasks(jobId: string, rawJob: IngestionJob): Promise<{
    dispatched: number;
    skipped: boolean;
}> {
    const safeJobId = normalizeDocumentId(jobId);
    if (!safeJobId) return { dispatched: 0, skipped: true };
    const parsed = parsePublishingJob(safeJobId, rawJob as FirebaseFirestore.DocumentData);
    if (!parsed || parsed.status !== INGESTION_JOB_STATUS.PUBLISHING || parsed.enqueueStatus !== 'pending') {
        return { dispatched: 0, skipped: true };
    }
    const queue = getFunctions().taskQueue('embedArticleWorker');
    let dispatched = 0;
    for (const articleId of parsed.pendingIds) {
        try {
            await queue.enqueue(
                {
                    articleData: { id: articleId },
                    embeddingRunId: parsed.embeddingRunId,
                    jobId: safeJobId,
                },
                {
                    dispatchDeadlineSeconds: 540,
                    id: getEmbeddingTaskId(safeJobId, articleId, parsed.embeddingRunId),
                },
            );
            dispatched += 1;
        } catch (error) {
            if (!isTaskAlreadyExists(error)) throw error;
        }
    }

    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(safeJobId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        if (!snapshot.exists) return;
        const current = parsePublishingJob(safeJobId, snapshot.data());
        if (
            !current
            || current.status !== INGESTION_JOB_STATUS.PUBLISHING
            || current.embeddingRunId !== parsed.embeddingRunId
        ) return;
        transaction.set(jobRef, {
            embeddingEnqueueStatus: 'queued',
            embeddingPendingArticleIds: parsed.pendingIds,
            embeddingRunId: parsed.embeddingRunId,
            articlesToEmbedCount: parsed.pendingIds.length,
            modifiedOn: Timestamp.now(),
        }, { merge: true });
    });
    return { dispatched, skipped: false };
}

export async function finalizePublishingJob(jobId: string): Promise<{ published: boolean }> {
    const safeJobId = normalizeDocumentId(jobId);
    if (!safeJobId) return { published: false };
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(safeJobId);
    let published = false;
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(jobRef);
        if (!snapshot.exists) return;
        const job = parsePublishingJob(safeJobId, snapshot.data());
        if (!job || job.status !== INGESTION_JOB_STATUS.PUBLISHING) return;
        if (job.enqueueStatus !== 'queued') return;
        if (job.failedIds.length > 0) return;
        if (!job.pendingIds.every(articleId => job.completedIds.includes(articleId))) return;
        let normalizedCategories;
        try {
            normalizedCategories = normalizeFinalCategories(snapshot.data()?.categories);
        } catch {
            return;
        }
        const placementIds = Array.from(normalizedCategories.placements.keys());
        if (
            placementIds.length !== job.articleIds.length
            || placementIds.some(articleId => !job.articleIds.includes(articleId))
        ) return;

        const completedAt = Timestamp.now();
        const maintenanceMetadata = {
            reason: 'kb_generation_job_published',
            sourceId: safeJobId,
            sourceType: 'kb_generation_job',
        };
        const cacheVersionRef = firestoreAdmin
            .collection(ANSWERLATTICE_CACHE_VERSIONS_COLLECTION)
            .doc(getAnswerlatticeCacheVersionDocId(ANSWERLATTICE_CACHE_SOURCES.KB, job.tId, job.sId));
        const sourceVersionsRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeSourceVersionsDocId(job.tId, job.sId));
        const bundleManifestRef = firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(getAnswerlatticeBundleManifestDocId(job.tId, job.sId));
        const categoriesRef = firestoreAdmin
            .collection(KB_CATEGORIES_COLLECTION)
            .doc(getCategoriesDocId(job.tId, job.sId));
        const categorySnap = await transaction.get(categoriesRef);
        const articleDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        for (const articleId of job.articleIds) {
            articleDocs.set(articleId, await transaction.get(
                firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId),
            ));
        }
        const replacementDocs = new Map<string, FirebaseFirestore.DocumentSnapshot>();
        for (const articleId of job.replacementIds) {
            replacementDocs.set(articleId, await transaction.get(
                firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId),
            ));
        }

        for (const [articleId, articleSnap] of articleDocs) {
            const article = articleSnap.data() || {};
            if (
                !articleSnap.exists
                || article.pId !== PRODUCT_ID
                || normalizeScopeId(article.tId) !== job.tId
                || normalizeScopeId(article.sId) !== job.sId
                || normalizeDocumentId(article.id ?? articleId) !== articleId
                || normalizeDocumentId(article.jobId) !== safeJobId
                || article.embeddingStatus !== 'embedded'
            ) return;
        }
        for (const [articleId, articleSnap] of replacementDocs) {
            if (!articleSnap.exists) continue;
            const article = articleSnap.data() || {};
            if (
                article.pId !== PRODUCT_ID
                || normalizeScopeId(article.tId) !== job.tId
                || normalizeScopeId(article.sId) !== job.sId
                || normalizeDocumentId(article.id ?? articleId) !== articleId
            ) return;
        }

        const storedCategories = categorySnap.data()?.categories;
        if (categorySnap.exists && storedCategories !== undefined && !isRecord(storedCategories)) return;
        const existingCategories: Record<string, unknown> = isRecord(storedCategories)
            ? structuredClone(storedCategories)
            : {};
        removeArticleIdsFromNavigation(existingCategories, new Set(job.replacementIds));
        for (const [categoryId, category] of Object.entries(normalizedCategories.categories)) {
            existingCategories[categoryId] = {
                ...category,
                pId: PRODUCT_ID,
                tId: job.tId,
                sId: job.sId,
                modifiedOn: completedAt,
            };
        }
        if (Buffer.byteLength(JSON.stringify(existingCategories), 'utf8') > MAX_NAVIGATION_BYTES) return;

        for (const [articleId, articleSnap] of articleDocs) {
            const article = articleSnap.data() || {};
            transaction.set(articleSnap.ref, {
                active: true,
                status: 'published',
                lastReviewedOn: completedAt,
                modifiedOn: completedAt,
            }, { merge: true });
            for (const faqId of getOwnedGeneratedFaqIds(articleId, article.faqIds)) {
                transaction.update(firestoreAdmin.collection(ANSWERLATTICE_FAQS_COLLECTION).doc(faqId), {
                    active: true,
                    status: 'published',
                    publishedOn: completedAt,
                    lastReviewedOn: completedAt,
                    modifiedOn: completedAt,
                });
            }
        }
        for (const [articleId, articleSnap] of replacementDocs) {
            if (!articleSnap.exists) continue;
            for (const faqId of getOwnedGeneratedFaqIds(articleId, articleSnap.data()?.faqIds)) {
                transaction.delete(firestoreAdmin.collection(ANSWERLATTICE_FAQS_COLLECTION).doc(faqId));
            }
            transaction.delete(articleSnap.ref);
        }
        transaction.set(categoriesRef, {
            pId: PRODUCT_ID,
            tId: job.tId,
            sId: job.sId,
            categories: existingCategories,
            modifiedOn: completedAt,
        }, { merge: true });

        transaction.set(jobRef, {
            status: INGESTION_JOB_STATUS.PUBLISHED,
            articlesEmbeddedCount: job.completedIds.length,
            articlesToEmbedCount: job.pendingIds.length,
            errorMessage: null,
            failureStage: null,
            publishedOn: completedAt,
            modifiedOn: completedAt,
        }, { merge: true });
        transaction.set(
            cacheVersionRef,
            getAnswerlatticeCacheVersionBumpData(
                ANSWERLATTICE_CACHE_SOURCES.KB,
                job.tId,
                job.sId,
                maintenanceMetadata,
            ),
            { merge: true },
        );
        transaction.set(sourceVersionsRef, {
            schemaVersion: 1,
            pId: PRODUCT_ID,
            tId: job.tId,
            sId: job.sId,
            kb: FieldValue.increment(1),
            docsNav: FieldValue.increment(1),
            updatedAt: completedAt,
            lastReason: maintenanceMetadata.reason,
            lastSourceId: maintenanceMetadata.sourceId,
            lastSourceType: maintenanceMetadata.sourceType,
        }, { merge: true });
        transaction.set(bundleManifestRef, {
            schemaVersion: 1,
            pId: PRODUCT_ID,
            tId: job.tId,
            sId: job.sId,
            status: 'stale',
            staleReason: maintenanceMetadata.reason,
            updatedAt: completedAt,
            lastReason: maintenanceMetadata.reason,
            lastSourceId: maintenanceMetadata.sourceId,
            lastSourceType: maintenanceMetadata.sourceType,
        }, { merge: true });
        published = true;
    });
    return { published };
}
