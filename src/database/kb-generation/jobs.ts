import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, deleteField, doc, getDoc, getDocs, limit, orderBy, query, QueryConstraint, runTransaction, Timestamp, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeDiagnostic, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import {
    getIngestionJobTimestampMillis,
    isDeletableIngestionJobStatus,
    isExactAnswerlatticeProductId,
    normalizeIngestionJobQueryLimit,
    planIngestionJobSourceCleanup,
} from '@lib/answerlattice/ingestionJobDeletionBoundary';
import { answerlatticeFirebaseClient, answerlatticeStorage } from "@lib/firebase/answerlatticeFirebaseClient";
import { triggerFinalizePublish, triggerStartGeneration } from "@lib/firebase/functions";
import { createRuntimeId } from "@lib/runtime/randomId";
import { summarizeStorageCleanupResults } from '@lib/storage/storageCleanupResults';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { ARTICLE_RECONCILIATION_STATUS, INGESTION_JOB_STATUS, IngestionJob, IngestionJobCategoriesMap } from "@type/knowledgeBase";

const COLLECTION = DB_COLLECTIONS.KB_GENERATION_JOBS;
const ACTIVE_JOB_LIMIT = 5;
const ALL_JOB_LIMIT = 100;
const PREVIOUS_JOB_LIMIT = 20;
const PRODUCT_ID = 'AL';
const MAX_JOB_ARTICLES = 100;
const MAX_REVIEW_NAVIGATION_BYTES = 700 * 1024;
const JOB_DELETION_LEASE_MS = 5 * 60 * 1000;
const REVIEW_UPDATE_KEYS = new Set(['articleIds', 'articlesToReview']);
const REVIEW_ITEM_KEYS = new Set(['id', 'title', 'status', 'similarArticles']);
const REVIEW_SUMMARY_KEYS = new Set(['id', 'title', 'categoryTitle', 'sectionTitle', 'status', 'active', 'score']);
const REVIEW_CATEGORY_KEYS = new Set(['id', 'title', 'description', 'active', 'icon', 'index', 'url', 'sections', 'articles']);
const REVIEW_SECTION_KEYS = new Set(['id', 'title', 'description', 'active', 'index', 'url', 'articles']);
const REVIEW_ARTICLE_KEYS = new Set(['id', 'title', 'active', 'index', 'url', 'reEmbedding']);

export type IngestionJobWriteResult = Partial<IngestionJob> & {
    success: true;
    id: string;
    updatedFields: string[];
};

export type IngestionJobDeleteResult = {
    success: true;
    jobId: string;
    deleted: true;
    deletedDraftArticles: number;
    preservedPublishedArticles: number;
    storageCleanupFailedCount: number;
};

type ReadableIngestionJobScope = {
    isPlatform: boolean;
    tId?: number;
    sId?: number;
};

type IngestionJobSessionLookup = {
    session: Awaited<ReturnType<typeof getActiveSession>> | null;
};

const getCollectionRef = () => {
    return collection(answerlatticeFirebaseClient, COLLECTION);
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeDocumentId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (!id || id !== value || id.length > 180 || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) {
        return null;
    }
    return id;
};

const normalizeScopeId = (value: unknown): number | null => {
    const raw = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed > 0 && String(parsed) === raw ? parsed : null;
};

const timestampToMillis = (value: unknown): number | null => {
    return getIngestionJobTimestampMillis(value);
};

const assertPlatformIngestionSession = async (operation: string) => {
    const { session } = await resolveIngestionJobSession(operation);
    if (!session || (session as any).platformRole !== 'PLATFORM') {
        throw new Error('Platform access is required for this knowledge generation operation.');
    }
    return session;
};

const assertAnswerlatticeJob = (jobId: string, data: Record<string, unknown>) => {
    const tId = normalizeScopeId(data.tId);
    const sId = normalizeScopeId(data.sId);
    if (!isExactAnswerlatticeProductId(data.pId) || !tId || !sId) {
        throw new Error(`Job ${jobId} is not an Answerlattice knowledge generation job.`);
    }
    return { tId, sId };
};

const hasOnlyKeys = (value: Record<string, unknown>, allowedKeys: Set<string>) => (
    Object.keys(value).every(key => allowedKeys.has(key))
);

const isBoundedString = (value: unknown, maxLength: number, required = false) => (
    typeof value === 'string'
    && value.length <= maxLength
    && (!required || value.trim().length > 0)
);

const getJsonByteLength = (value: unknown) => {
    try {
        return new TextEncoder().encode(JSON.stringify(value)).byteLength;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
};

const assertReviewItems = (value: unknown) => {
    if (!Array.isArray(value) || value.length > MAX_JOB_ARTICLES) {
        throw new Error('Knowledge generation review items are invalid.');
    }
    const itemIds = new Set<string>();
    const allowedStatuses = new Set(Object.values(ARTICLE_RECONCILIATION_STATUS));
    for (const item of value) {
        if (!isRecord(item) || !hasOnlyKeys(item, REVIEW_ITEM_KEYS)) {
            throw new Error('Knowledge generation review items are invalid.');
        }
        const id = normalizeDocumentId(item.id);
        if (!id || itemIds.has(id) || !isBoundedString(item.title, 240, true) || !allowedStatuses.has(item.status as any)) {
            throw new Error('Knowledge generation review items are invalid.');
        }
        itemIds.add(id);
        if (!Array.isArray(item.similarArticles) || item.similarArticles.length > 3) {
            throw new Error('Knowledge generation review items are invalid.');
        }
        const similarIds = new Set<string>();
        for (const summary of item.similarArticles) {
            if (!isRecord(summary) || !hasOnlyKeys(summary, REVIEW_SUMMARY_KEYS)) {
                throw new Error('Knowledge generation review items are invalid.');
            }
            const summaryId = normalizeDocumentId(summary.id);
            if (
                !summaryId
                || similarIds.has(summaryId)
                || !isBoundedString(summary.title, 240, true)
                || !isBoundedString(summary.categoryTitle, 160, true)
                || (summary.sectionTitle !== undefined && !isBoundedString(summary.sectionTitle, 160))
                || !isBoundedString(summary.status, 40, true)
                || typeof summary.active !== 'boolean'
                || (summary.score !== undefined && (typeof summary.score !== 'number' || !Number.isFinite(summary.score) || summary.score < 0 || summary.score > 1))
            ) {
                throw new Error('Knowledge generation review items are invalid.');
            }
            similarIds.add(summaryId);
        }
        if (item.status === ARTICLE_RECONCILIATION_STATUS.REPLACE && similarIds.size === 0) {
            throw new Error('Knowledge generation review items are invalid.');
        }
    }
};

const assertReviewNavigation: (value: unknown) => asserts value is IngestionJobCategoriesMap = (value) => {
    if (!isRecord(value) || getJsonByteLength(value) > MAX_REVIEW_NAVIGATION_BYTES) {
        throw new Error('Knowledge generation review navigation is invalid.');
    }
    const categoryEntries = Object.entries(value);
    if (categoryEntries.length > 20) throw new Error('Knowledge generation review navigation is invalid.');
    const articleIds = new Set<string>();
    let sectionCount = 0;

    const assertArticle = (article: unknown) => {
        if (!isRecord(article) || !hasOnlyKeys(article, REVIEW_ARTICLE_KEYS)) {
            throw new Error('Knowledge generation review navigation is invalid.');
        }
        const id = normalizeDocumentId(article.id);
        if (
            !id
            || articleIds.has(id)
            || !isBoundedString(article.title, 240, true)
            || (article.active !== undefined && typeof article.active !== 'boolean')
            || (article.index !== undefined && !Number.isSafeInteger(article.index))
            || (article.url !== undefined && (!isBoundedString(article.url, 500) || (article.url !== '' && !(article.url as string).startsWith('/'))))
            || (article.reEmbedding !== undefined && typeof article.reEmbedding !== 'boolean')
        ) {
            throw new Error('Knowledge generation review navigation is invalid.');
        }
        articleIds.add(id);
        if (articleIds.size > MAX_JOB_ARTICLES) throw new Error('Knowledge generation review navigation is invalid.');
    };

    for (const [categoryKey, category] of categoryEntries) {
        if (!isRecord(category) || !hasOnlyKeys(category, REVIEW_CATEGORY_KEYS)) {
            throw new Error('Knowledge generation review navigation is invalid.');
        }
        const categoryId = normalizeDocumentId(categoryKey);
        if (
            !categoryId
            || normalizeDocumentId(category.id) !== categoryId
            || !isBoundedString(category.title, 160, true)
            || !isBoundedString(category.description, 500)
            || typeof category.active !== 'boolean'
            || (category.icon !== undefined && !isBoundedString(category.icon, 80))
            || (category.index !== undefined && !Number.isSafeInteger(category.index))
            || (category.url !== undefined && (!isBoundedString(category.url, 500) || (category.url !== '' && !(category.url as string).startsWith('/'))))
        ) {
            throw new Error('Knowledge generation review navigation is invalid.');
        }
        const directArticles = category.articles === undefined ? [] : category.articles;
        const sections = category.sections === undefined ? [] : category.sections;
        if (!Array.isArray(directArticles) || !Array.isArray(sections) || (directArticles.length > 0 && sections.length > 0)) {
            throw new Error('Knowledge generation review navigation is invalid.');
        }
        directArticles.forEach(assertArticle);
        for (const section of sections) {
            sectionCount += 1;
            if (sectionCount > 60 || !isRecord(section) || !hasOnlyKeys(section, REVIEW_SECTION_KEYS)) {
                throw new Error('Knowledge generation review navigation is invalid.');
            }
            if (
                !normalizeDocumentId(section.id)
                || !isBoundedString(section.title, 160, true)
                || !isBoundedString(section.description, 500)
                || typeof section.active !== 'boolean'
                || (section.index !== undefined && !Number.isSafeInteger(section.index))
                || (section.url !== undefined && (!isBoundedString(section.url, 500) || (section.url !== '' && !(section.url as string).startsWith('/'))))
                || !Array.isArray(section.articles)
            ) {
                throw new Error('Knowledge generation review navigation is invalid.');
            }
            section.articles.forEach(assertArticle);
        }
    }
};

const assertReviewUpdate = (data: Partial<IngestionJob>) => {
    const keys = Object.keys(data);
    if (keys.length === 0 || keys.some(key => !REVIEW_UPDATE_KEYS.has(key))) {
        throw new Error('Only review navigation and duplicate-resolution fields can be updated directly.');
    }
    if (data.articleIds !== undefined) {
        if (
            !Array.isArray(data.articleIds)
            || data.articleIds.length > MAX_JOB_ARTICLES
            || data.articleIds.some(id => !normalizeDocumentId(id))
            || new Set(data.articleIds).size !== data.articleIds.length
        ) throw new Error('Knowledge generation article IDs are invalid.');
    }
    if (data.articlesToReview !== undefined) assertReviewItems(data.articlesToReview);
    if (data.categories !== undefined) {
        throw new Error('Use the transactional review-navigation mutation for category changes.');
    }
};

export function assertIngestionJobWriteSucceeded(
    result: unknown,
    expectedJobId: string,
    rejectionCode = 'ingestion_job_write_rejected',
): asserts result is IngestionJobWriteResult {
    if (
        !isRecord(result)
        || result.success !== true
        || result.id !== expectedJobId
        || !Array.isArray(result.updatedFields)
    ) {
        throw new Error(rejectionCode);
    }
}

export function assertIngestionJobDeleteSucceeded(
    result: unknown,
    expectedJobId: string,
    rejectionCode = 'ingestion_job_delete_rejected',
): asserts result is IngestionJobDeleteResult {
    const deletedDraftArticles = isRecord(result) ? result.deletedDraftArticles : null;
    const preservedPublishedArticles = isRecord(result) ? result.preservedPublishedArticles : null;
    const storageCleanupFailedCount = isRecord(result) ? result.storageCleanupFailedCount : null;
    if (
        !isRecord(result)
        || result.success !== true
        || result.deleted !== true
        || result.jobId !== expectedJobId
        || typeof deletedDraftArticles !== 'number'
        || !Number.isSafeInteger(deletedDraftArticles)
        || deletedDraftArticles < 0
        || preservedPublishedArticles !== 0
        || storageCleanupFailedCount !== 0
    ) {
        throw new Error(rejectionCode);
    }
}

export const getIngestionJobCollectionRef = (session: any) => {
    const tId = normalizeScopeId(session?.tId);
    const sId = normalizeScopeId(session?.sId);
    if (!tId || !sId) throw new Error('Answerlattice workspace scope is not available.');
    const collectionRef = getCollectionRef();
    return query(
        collectionRef,
        where("pId", "==", PRODUCT_ID),
        where("tId", "==", tId),
        where("sId", "==", sId),
        where("status", "in", [INGESTION_JOB_STATUS.PENDING, INGESTION_JOB_STATUS.PROCESSING, INGESTION_JOB_STATUS.NEEDS_REVIEW, INGESTION_JOB_STATUS.PUBLISHING]),
        orderBy("createdOn", "desc"),
        limit(ACTIVE_JOB_LIMIT)
    );
};

const resolveIngestionJobSession = async (operation: string): Promise<IngestionJobSessionLookup> => {
    try {
        return {
            session: await getActiveSession(),
        };
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_kb_generation_session_lookup_failed',
            error,
            getBoundedAnswerlatticeStringContext('operation', operation),
        );
        return {
            session: null,
        };
    }
};

const resolveReadableIngestionJobScope = async (session?: any): Promise<ReadableIngestionJobScope> => {
    const activeSession = session || (await resolveIngestionJobSession('resolve_readable_ingestion_job_scope')).session;
    const tId = normalizeScopeId(activeSession?.tId);
    const sId = normalizeScopeId(activeSession?.sId);
    return {
        isPlatform: activeSession?.platformRole === 'PLATFORM',
        ...(tId ? { tId } : {}),
        ...(sId ? { sId } : {}),
    };
};

const getReadableIngestionJobFilters = (scope: ReadableIngestionJobScope): QueryConstraint[] => {
    if (scope.isPlatform) {
        return [where("pId", "==", PRODUCT_ID)];
    }
    if (!scope.tId || !scope.sId) {
        return [];
    }
    return [
        where("pId", "==", PRODUCT_ID),
        where("tId", "==", scope.tId),
        where("sId", "==", scope.sId),
    ];
};

const readableIngestionJobScopeAllowsJob = (
    scope: ReadableIngestionJobScope,
    job: Partial<IngestionJob> | null | undefined,
) => {
    if (!isExactAnswerlatticeProductId(job?.pId)) return false;
    if (scope.isPlatform) return true;
    return Boolean(
        scope.tId
        && scope.sId
        && normalizeScopeId(job?.tId) === scope.tId
        && normalizeScopeId(job?.sId) === scope.sId
    );
};

export const getIngestionJobs = async () => {
    return await apiCallComposer(
        async () => {
            const scope = await resolveReadableIngestionJobScope();
            if (!scope.isPlatform && (!scope.tId || !scope.sId)) {
                return [];
            }
            const filters = getReadableIngestionJobFilters(scope);
            const q = query(getCollectionRef(), ...filters, orderBy("createdOn", "desc"), limit(ALL_JOB_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: IngestionJob[] = [];
            querySnapshot.forEach((doc) => {
                const job = { ...doc.data(), id: doc.id } as IngestionJob;
                if (readableIngestionJobScopeAllowsJob(scope, job)) {
                    list.push(job);
                }
            });
            return list.sort((a, b) => (
                (timestampToMillis(b.createdOn) ?? 0) - (timestampToMillis(a.createdOn) ?? 0)
            ));
        },
        "getIngestionJobs"
    );
};

export const getPreviousIngestionJobs = async (session: any, maxResults: number = PREVIOUS_JOB_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const tId = normalizeScopeId(session?.tId);
            const sId = normalizeScopeId(session?.sId);
            if (!tId || !sId) return [];
            const collectionRef = getCollectionRef();
            const q = query(
                collectionRef,
                where("pId", "==", PRODUCT_ID),
                where("tId", "==", tId),
                where("sId", "==", sId),
                where("status", "in", [
                    INGESTION_JOB_STATUS.PUBLISHED,
                    INGESTION_JOB_STATUS.FAILED,
                    INGESTION_JOB_STATUS.CANCELLED,
                ]),
                orderBy("createdOn", "desc"),
                limit(normalizeIngestionJobQueryLimit(maxResults, PREVIOUS_JOB_LIMIT, 50))
            );

            const querySnapshot = await getDocs(q);
            const list: IngestionJob[] = [];
            querySnapshot.forEach((doc) => {
                const job = { ...doc.data(), id: doc.id } as IngestionJob;
                if (
                    isExactAnswerlatticeProductId(job.pId)
                    && normalizeScopeId(job.tId) === tId
                    && normalizeScopeId(job.sId) === sId
                ) {
                    list.push(job);
                }
            });
            return list.sort((a, b) => (
                (timestampToMillis(b.createdOn) ?? 0) - (timestampToMillis(a.createdOn) ?? 0)
            ));
        },
        "getPreviousIngestionJobs"
    );
};

export const updateJob = async (jobId: string, data: Partial<IngestionJob>) => {
    return await apiCallComposer(
        async () => {
            const safeJobId = normalizeDocumentId(jobId);
            if (!safeJobId) throw new Error('Knowledge generation job ID is invalid.');
            await assertPlatformIngestionSession('update_job_review');
            assertReviewUpdate(data);
            const composed = await answerlatticeRequestBodyComposer(data, { isNew: false });
            const dataToUpdate = Object.fromEntries([
                ...Object.entries(data),
                ['modifiedBy', composed.modifiedBy],
                ['modifiedOn', composed.modifiedOn],
                ['requestId', composed.requestId],
                ['traceId', composed.traceId],
                ['uId', composed.uId],
            ].filter(([, value]) => value !== undefined));
            const jobRef = doc(getCollectionRef(), safeJobId);
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshot = await transaction.get(jobRef);
                if (!snapshot.exists()) throw new Error(`Job ${safeJobId} not found.`);
                const job = snapshot.data() as Record<string, unknown>;
                assertAnswerlatticeJob(safeJobId, job);
                if (job.status !== INGESTION_JOB_STATUS.NEEDS_REVIEW) {
                    throw new Error('Only jobs awaiting review can be edited.');
                }
                if (isRecord(job.deletionRun)) {
                    throw new Error('This knowledge generation job is being deleted.');
                }
                transaction.update(jobRef, dataToUpdate);
            });
            return {
                id: safeJobId,
                ...dataToUpdate,
                success: true,
                updatedFields: Object.keys(dataToUpdate),
            } satisfies IngestionJobWriteResult;
        },
        data,
        "updateJob"
    );
};

type ReviewNavigationMutation = (
    current: IngestionJobCategoriesMap,
) => IngestionJobCategoriesMap;

export const updateReviewJobNavigation = async (
    jobId: string,
    operation: string,
    mutate: ReviewNavigationMutation,
) => {
    return await apiCallComposer(
        async () => {
            const safeJobId = normalizeDocumentId(jobId);
            if (!safeJobId) throw new Error('Knowledge generation job ID is invalid.');
            if (!isBoundedString(operation, 80, true)) {
                throw new Error('Knowledge generation review operation is invalid.');
            }
            await assertPlatformIngestionSession('update_job_review_navigation');
            const composed = await answerlatticeRequestBodyComposer({}, { isNew: false });
            const jobRef = doc(getCollectionRef(), safeJobId);
            const categories = await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshot = await transaction.get(jobRef);
                if (!snapshot.exists()) throw new Error(`Job ${safeJobId} not found.`);
                const job = snapshot.data() as Record<string, unknown>;
                assertAnswerlatticeJob(safeJobId, job);
                if (job.status !== INGESTION_JOB_STATUS.NEEDS_REVIEW) {
                    throw new Error('Only jobs awaiting review can be edited.');
                }
                if (isRecord(job.deletionRun)) {
                    throw new Error('This knowledge generation job is being deleted.');
                }
                assertReviewNavigation(job.categories);
                const next = mutate(job.categories);
                assertReviewNavigation(next);
                transaction.update(jobRef, {
                    categories: next,
                    modifiedBy: composed.modifiedBy,
                    modifiedOn: composed.modifiedOn,
                    requestId: composed.requestId,
                    traceId: composed.traceId,
                    uId: composed.uId,
                });
                return next;
            });
            return {
                id: safeJobId,
                categories,
                success: true,
                updatedFields: ['categories', 'modifiedBy', 'modifiedOn', 'requestId', 'traceId', 'uId'],
            } satisfies IngestionJobWriteResult;
        },
        { jobId, operation },
        'updateReviewJobNavigation',
    );
};

export const deleteIngestionJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const safeJobId = normalizeDocumentId(jobId);
            if (!safeJobId) throw new Error('Knowledge generation job ID is invalid.');
            await assertPlatformIngestionSession('delete_ingestion_job');
            const db = answerlatticeFirebaseClient;
            const jobRef = doc(db, DB_COLLECTIONS.KB_GENERATION_JOBS, safeJobId);
            const jobDoc = await getDoc(jobRef);

            if (!jobDoc.exists()) {
                throw new Error(`Job ${safeJobId} not found.`);
            }

            const jobData = jobDoc.data() as IngestionJob;
            const scope = assertAnswerlatticeJob(safeJobId, jobData as unknown as Record<string, unknown>);
            if (!isDeletableIngestionJobStatus(jobData.status)) {
                throw new Error('Cancel this active knowledge generation job before deleting it.');
            }
            if (jobData.status === INGESTION_JOB_STATUS.FAILED && jobData.failureStage === 'embedding') {
                throw new Error('Retry the failed article embeddings before deleting this job.');
            }
            if (!Array.isArray(jobData.sourceFiles) || jobData.sourceFiles.length > 8 || jobData.sourceFiles.some(file => (
                !file
                || typeof file.downloadURL !== 'string'
                || !file.downloadURL
            ))) {
                throw new Error('This knowledge generation job has invalid source-file cleanup data.');
            }

            const workspaceJobsSnapshot = await getDocs(query(
                collection(db, DB_COLLECTIONS.KB_GENERATION_JOBS),
                where('pId', '==', PRODUCT_ID),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                limit(ALL_JOB_LIMIT + 1),
            ));
            if (workspaceJobsSnapshot.size > ALL_JOB_LIMIT) {
                throw new Error('This workspace has too many knowledge generation jobs to prove source-file cleanup safely.');
            }
            const expectedSourcePrefix = `ingestion_source_files/${scope.tId}/${scope.sId}/`;
            const sourceCleanupPlan = planIngestionJobSourceCleanup(
                jobData.sourceFiles,
                workspaceJobsSnapshot.docs
                    .filter(snapshot => snapshot.id !== safeJobId)
                    .map(snapshot => snapshot.data().sourceFiles),
                expectedSourcePrefix,
            );
            if (!answerlatticeStorage && sourceCleanupPlan.cleanupCandidates.length > 0) {
                throw new Error('Answerlattice source-file storage is not available.');
            }

            const articlesSnapshot = await getDocs(query(
                collection(db, DB_COLLECTIONS.KB_ARTICLES),
                where('pId', '==', PRODUCT_ID),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('jobId', '==', safeJobId),
                limit(MAX_JOB_ARTICLES + 1),
            ));
            if (articlesSnapshot.size > MAX_JOB_ARTICLES) {
                throw new Error('This legacy job has too many related articles to delete safely.');
            }
            const draftArticleDocs = articlesSnapshot.docs.filter((articleDoc) => {
                const article = articleDoc.data();
                return article.status !== 'published' && article.active !== true;
            });
            const preservedPublishedArticles = articlesSnapshot.size - draftArticleDocs.length;
            if (preservedPublishedArticles > 0) {
                throw new Error('Published knowledge history cannot be deleted while its articles are active.');
            }

            const deletionRunId = createRuntimeId('delete');
            const deletionStartedAt = Timestamp.now();
            const deletionLeaseExpiresAt = Timestamp.fromMillis(deletionStartedAt.toMillis() + JOB_DELETION_LEASE_MS);
            const expectedModifiedOnMs = timestampToMillis(jobData.modifiedOn);
            if (expectedModifiedOnMs === null) {
                throw new Error('This legacy knowledge generation job has an invalid modification timestamp.');
            }

            await runTransaction(db, async (transaction) => {
                const currentJob = await transaction.get(jobRef);
                if (!currentJob.exists()) throw new Error('Knowledge generation job is not available.');
                const currentData = currentJob.data() as Record<string, unknown>;
                assertAnswerlatticeJob(safeJobId, currentData);
                if (
                    currentData.status !== jobData.status
                    || timestampToMillis(currentData.modifiedOn) !== expectedModifiedOnMs
                ) {
                    throw new Error('Knowledge generation job changed before deletion.');
                }
                const activeDeletionRun = isRecord(currentData.deletionRun) ? currentData.deletionRun : null;
                if (
                    activeDeletionRun?.status === 'processing'
                    && (timestampToMillis(activeDeletionRun.leaseExpiresAt) || 0) > Date.now()
                ) {
                    throw new Error('Knowledge generation job deletion is already running.');
                }
                draftArticleDocs.forEach((articleDoc) => {
                    transaction.delete(articleDoc.ref);
                });
                transaction.update(jobRef, {
                    deletionRun: {
                        id: deletionRunId,
                        status: 'processing',
                        startedAt: deletionStartedAt,
                        leaseExpiresAt: deletionLeaseExpiresAt,
                        completedAt: null,
                        failedCount: 0,
                    },
                    modifiedOn: deletionStartedAt,
                });
            });

            if (sourceCleanupPlan.preservedStoragePaths.length > 0) {
                logAnswerlatticeDiagnostic(
                    'answerlattice_kb_source_cleanup_preserved_shared_reference',
                    { preservedSourceFileCount: sourceCleanupPlan.preservedStoragePaths.length },
                );
            }

            const storageCleanupResults = await Promise.allSettled(
                sourceCleanupPlan.cleanupCandidates.map(sourceFile => (
                    deleteFileByUrl(sourceFile.downloadURL, answerlatticeStorage)
                )),
            );
            const storageCleanupSummary = summarizeStorageCleanupResults(storageCleanupResults);
            if (storageCleanupSummary.failed > 0) {
                const failedAt = Timestamp.now();
                await runTransaction(db, async (transaction) => {
                    const currentJob = await transaction.get(jobRef);
                    if (!currentJob.exists()) return;
                    const currentData = currentJob.data() as Record<string, unknown>;
                    assertAnswerlatticeJob(safeJobId, currentData);
                    const currentDeletionRun = isRecord(currentData.deletionRun) ? currentData.deletionRun : null;
                    if (currentDeletionRun?.id !== deletionRunId || currentDeletionRun.status !== 'processing') {
                        throw new Error('Knowledge generation job deletion ownership changed.');
                    }
                    transaction.update(jobRef, {
                        deletionRun: {
                            ...currentDeletionRun,
                            status: 'failed',
                            completedAt: failedAt,
                            failedCount: storageCleanupSummary.failed,
                        },
                        modifiedOn: failedAt,
                    });
                });
                logAnswerlatticeFailure(
                    'answerlattice_kb_source_cleanup_failed',
                    new Error('answerlattice_kb_source_cleanup_failed'),
                    {
                        attemptedSourceFileCount: storageCleanupSummary.attempted,
                        failedSourceFileCount: storageCleanupSummary.failed,
                    },
                );
                throw new Error('One or more knowledge source files could not be deleted. Retry job deletion.');
            }

            await runTransaction(db, async (transaction) => {
                const currentJob = await transaction.get(jobRef);
                if (!currentJob.exists()) return;
                const currentData = currentJob.data() as Record<string, unknown>;
                assertAnswerlatticeJob(safeJobId, currentData);
                const currentDeletionRun = isRecord(currentData.deletionRun) ? currentData.deletionRun : null;
                if (currentDeletionRun?.id !== deletionRunId || currentDeletionRun.status !== 'processing') {
                    throw new Error('Knowledge generation job deletion ownership changed.');
                }
                transaction.delete(jobRef);
            });

            return {
                success: true,
                jobId: safeJobId,
                deleted: true,
                deletedDraftArticles: draftArticleDocs.length,
                preservedPublishedArticles,
                storageCleanupFailedCount: storageCleanupSummary.failed,
            } satisfies IngestionJobDeleteResult;
        },
        jobId,
        "deleteIngestionJob"
    );
};

export const retryJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const safeJobId = normalizeDocumentId(jobId);
            if (!safeJobId) throw new Error('Knowledge generation job ID is invalid.');
            await assertPlatformIngestionSession('retry_ingestion_job');
            const composed = await answerlatticeRequestBodyComposer({}, { isNew: false });
            const jobRef = doc(getCollectionRef(), safeJobId);
            let resetJob: IngestionJob | null = null;
            let retryMode: 'generation' | 'publishing' | 'review' = 'generation';
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const jobSnap = await transaction.get(jobRef);
                if (!jobSnap.exists()) throw new Error(`Job ${safeJobId} not found`);
                const job = { id: safeJobId, ...jobSnap.data() } as IngestionJob;
                assertAnswerlatticeJob(safeJobId, job as unknown as Record<string, unknown>);
                if (job.status !== INGESTION_JOB_STATUS.FAILED) {
                    throw new Error(`Only failed jobs can be retried. Current status: ${job.status}`);
                }
                if (job.deletionRun) {
                    throw new Error('Finish deleting this knowledge generation job before retrying it.');
                }

                let resetData: Record<string, unknown>;
                if (job.failureStage === 'embedding') {
                    retryMode = 'publishing';
                    const pendingIds = Array.from(new Set(job.embeddingPendingArticleIds || job.articleIds || []))
                        .filter((id): id is string => Boolean(normalizeDocumentId(id)))
                        .slice(0, MAX_JOB_ARTICLES);
                    if (pendingIds.length === 0) throw new Error('This failed publishing job has no articles to retry.');
                    resetData = {
                        status: INGESTION_JOB_STATUS.PUBLISHING,
                        embeddingPendingArticleIds: pendingIds,
                        embeddingCompletedArticleIds: Array.from(new Set(job.embeddingCompletedArticleIds || []))
                            .filter((id): id is string => pendingIds.includes(id)),
                        embeddingFailedArticleIds: [],
                        embeddingEnqueueStatus: 'pending',
                        embeddingRunId: createRuntimeId('publish'),
                        errorMessage: null,
                        failureStage: null,
                    };
                } else if (job.failureStage === 'publishing_orchestration') {
                    retryMode = 'review';
                    resetData = {
                        status: INGESTION_JOB_STATUS.NEEDS_REVIEW,
                        errorMessage: null,
                        failureStage: null,
                    };
                } else {
                    resetData = {
                        status: INGESTION_JOB_STATUS.PENDING,
                        errorMessage: null,
                        failureStage: null,
                        categories: deleteField(),
                        articleIds: deleteField(),
                        articlesToReview: deleteField(),
                        articlesEmbeddedCount: deleteField(),
                        articlesToEmbedCount: deleteField(),
                        embeddingPendingArticleIds: deleteField(),
                        embeddingCompletedArticleIds: deleteField(),
                        embeddingFailedArticleIds: deleteField(),
                        embeddingEnqueueStatus: deleteField(),
                        embeddingRunId: deleteField(),
                        generationRun: deleteField(),
                    };
                }
                resetData.modifiedOn = composed.modifiedOn;
                resetData.modifiedBy = composed.modifiedBy;
                resetData.uId = composed.uId;
                transaction.update(jobRef, resetData);
                resetJob = { ...job, ...resetData, id: safeJobId } as IngestionJob;
            });

            if (process.env.NODE_ENV !== 'production' && resetJob) {
                if (retryMode === 'generation') {
                    await triggerStartGeneration(safeJobId, resetJob);
                } else if (retryMode === 'publishing') {
                    await triggerFinalizePublish(safeJobId, resetJob);
                }
            }

            return {
                ...(resetJob as IngestionJob),
                success: true,
                updatedFields: retryMode === 'generation'
                    ? ['status', 'generationRun', 'errorMessage', 'failureStage']
                    : ['status', 'errorMessage', 'failureStage'],
            } satisfies IngestionJobWriteResult;
        },
        { jobId },
        "retryJob"
    );
};

export const cancelJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const safeJobId = normalizeDocumentId(jobId);
            if (!safeJobId) throw new Error('Knowledge generation job ID is invalid.');
            await assertPlatformIngestionSession('cancel_ingestion_job');
            const composed = await answerlatticeRequestBodyComposer({}, { isNew: false });
            const dataToUpdate = {
                status: INGESTION_JOB_STATUS.CANCELLED,
                modifiedOn: composed.modifiedOn,
                modifiedBy: composed.modifiedBy,
                uId: composed.uId,
            };
            const jobRef = doc(getCollectionRef(), safeJobId);
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshot = await transaction.get(jobRef);
                if (!snapshot.exists()) throw new Error(`Job ${safeJobId} not found.`);
                const job = snapshot.data() as Record<string, unknown>;
                assertAnswerlatticeJob(safeJobId, job);
                if (isRecord(job.deletionRun)) {
                    throw new Error('This knowledge generation job is being deleted.');
                }
                const cancellableStatuses = new Set<string>([
                    INGESTION_JOB_STATUS.PENDING,
                    INGESTION_JOB_STATUS.PROCESSING,
                    INGESTION_JOB_STATUS.NEEDS_REVIEW,
                ]);
                if (!cancellableStatuses.has(String(job.status))) {
                    throw new Error('This knowledge generation job can no longer be cancelled.');
                }
                transaction.update(jobRef, dataToUpdate);
            });
            return {
                id: safeJobId,
                ...dataToUpdate,
                success: true,
                updatedFields: Object.keys(dataToUpdate),
            } satisfies IngestionJobWriteResult;
        },
        { jobId },
        "cancelJob"
    );
};

export const addIngestionJob = async (data: Partial<IngestionJob>) => {
    return await apiCallComposer(
        async () => {
            await assertPlatformIngestionSession('add_ingestion_job');
            if (!Array.isArray(data.sourceFiles) || data.sourceFiles.length === 0 || data.sourceFiles.length > 8) {
                throw new Error('Use between one and eight knowledge source files.');
            }
            const submitData = await answerlatticeRequestBodyComposer({
                title: typeof data.title === 'string' ? data.title.slice(0, 160) : 'Knowledge import',
                sourceFiles: data.sourceFiles,
                status: INGESTION_JOB_STATUS.PENDING,
                categories: null,
            }, { isNew: true });
            const tId = normalizeScopeId(submitData.tId);
            const sId = normalizeScopeId(submitData.sId);
            if (!tId || !sId || submitData.pId !== PRODUCT_ID) {
                throw new Error('Answerlattice workspace scope is not available.');
            }
            const expectedPrefix = `ingestion_source_files/${tId}/${sId}/`;
            if (data.sourceFiles.some((file) => (
                !isRecord(file)
                || typeof file.storagePath !== 'string'
                || !file.storagePath.startsWith(expectedPrefix)
                || file.storagePath.includes('..')
            ))) {
                throw new Error('One or more knowledge source files are outside this workspace.');
            }
            const docRef = await addDoc(getCollectionRef(), submitData);
            const newJob = { ...submitData, id: docRef.id } as IngestionJob;
            if (process.env.NODE_ENV !== 'production') {
                await triggerStartGeneration(newJob.id, newJob);
            }
            return {
                ...newJob,
                success: true,
                updatedFields: Object.keys(submitData),
            } satisfies IngestionJobWriteResult;

        },
        data,
        "addIngestionJob"
    );
};
