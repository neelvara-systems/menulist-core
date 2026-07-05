import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, QueryConstraint, runTransaction, setDoc, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { bumpAnswerlatticeCacheVersion } from "@lib/answerlattice/cacheVersionClient";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import { answerlatticeFirebaseClient, answerlatticeStorage } from "@lib/firebase/answerlatticeFirebaseClient";
import { triggerStartGeneration } from "@lib/firebase/functions";
import { INGESTION_JOB_STATUS, IngestionJob } from "@type/knowledgeBase";
import { getKnowledgeBaseCategoriesDocId } from "@database/knowledgeBase/categories";
import { deleteFileByUrl } from "../storage/deleteFromStorage";

const COLLECTION = DB_COLLECTIONS.KB_GENERATION_JOBS;
const ACTIVE_JOB_LIMIT = 5;
const ALL_JOB_LIMIT = 100;
const PREVIOUS_JOB_LIMIT = 20;

export type IngestionJobWriteResult = Partial<IngestionJob> & {
    success: true;
    id: string;
    updatedFields: string[];
};

export type IngestionJobDeleteResult = {
    success: true;
    jobId: string;
    deleted: true;
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
    if (
        !isRecord(result)
        || result.success !== true
        || result.deleted !== true
        || result.jobId !== expectedJobId
    ) {
        throw new Error(rejectionCode);
    }
}

export const getIngestionJobCollectionRef = (session: any) => {
    const collectionRef = getCollectionRef();
    return query(
        collectionRef,
        where("tId", "==", session.tId),
        where("sId", "==", session.sId),
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
    const tId = Number(activeSession?.tId);
    const sId = Number(activeSession?.sId);
    return {
        isPlatform: activeSession?.platformRole === 'PLATFORM',
        ...(Number.isFinite(tId) && tId > 0 ? { tId } : {}),
        ...(Number.isFinite(sId) && sId > 0 ? { sId } : {}),
    };
};

const getReadableIngestionJobFilters = (scope: ReadableIngestionJobScope): QueryConstraint[] => {
    if (scope.isPlatform) {
        return [];
    }
    if (!scope.tId || !scope.sId) {
        return [];
    }
    return [
        where("tId", "==", scope.tId),
        where("sId", "==", scope.sId),
    ];
};

const readableIngestionJobScopeAllowsJob = (
    scope: ReadableIngestionJobScope,
    job: Partial<IngestionJob> | null | undefined,
) => {
    if (scope.isPlatform) {
        return true;
    }
    return Boolean(
        scope.tId
        && scope.sId
        && Number(job?.tId) === scope.tId
        && Number(job?.sId) === scope.sId
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
            return list.sort((a, b) => new Date(b.createdOn.toDate()).getTime() - new Date(a.createdOn.toDate()).getTime());
        },
        "getIngestionJobs"
    );
};

export const getPreviousIngestionJobs = async (session: any, maxResults: number = PREVIOUS_JOB_LIMIT) => {
    return await apiCallComposer(
        async () => {
            const collectionRef = getCollectionRef();
            const q = query(
                collectionRef,
                where("tId", "==", session.tId),
                where("sId", "==", session.sId),
                where("status", "in", [
                    INGESTION_JOB_STATUS.PUBLISHED,
                    INGESTION_JOB_STATUS.FAILED,
                    INGESTION_JOB_STATUS.CANCELLED,
                ]),
                orderBy("createdOn", "desc"),
                limit(Math.min(Math.max(maxResults, 1), 50))
            );

            const querySnapshot = await getDocs(q);
            const list: IngestionJob[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as IngestionJob);
            });
            return list.sort((a, b) => new Date(b.createdOn.toDate()).getTime() - new Date(a.createdOn.toDate()).getTime());
        },
        "getPreviousIngestionJobs"
    );
};

export const updateJob = async (jobId: string, data: Partial<IngestionJob>) => {
    return await apiCallComposer(
        async () => {
            const dataToUpdate = await answerlatticeRequestBodyComposer(data);
            const jobRef = doc(getCollectionRef(), jobId);
            await setDoc(jobRef, dataToUpdate, { merge: true });
            return {
                id: jobId,
                ...dataToUpdate,
                success: true,
                updatedFields: Object.keys(dataToUpdate),
            } satisfies IngestionJobWriteResult;
        },
        data,
        "updateJob"
    );
};

export const deleteIngestionJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const db = answerlatticeFirebaseClient;
            const jobRef = doc(db, DB_COLLECTIONS.KB_GENERATION_JOBS, jobId);
            const jobDoc = await getDoc(jobRef);

            if (!jobDoc.exists()) {
                throw new Error(`Job ${jobId} not found.`);
            }

            const jobData = jobDoc.data() as IngestionJob;
            await bumpAnswerlatticeCacheVersion(ANSWERLATTICE_CACHE_SOURCES.KB, Number(jobData.tId), Number(jobData.sId), {
                reason: 'ingestion_job_delete',
                sourceId: jobId,
                sourceType: 'kb_generation_job',
            });

            await runTransaction(db, async (transaction) => {
                // 1. Delete associated categories from the master document
                if (jobData.categories) {
                    const categoriesDocRef = doc(
                        db,
                        DB_COLLECTIONS.KB_CATEGORIES,
                        getKnowledgeBaseCategoriesDocId(jobData.tId, jobData.sId)
                    );
                    const categoriesDoc = await transaction.get(categoriesDocRef);
                    if (categoriesDoc.exists()) {
                        const masterCategories = categoriesDoc.data().categories || {};
                        for (const categoryId in jobData.categories) {
                            delete masterCategories[categoryId];
                        }
                        transaction.update(categoriesDocRef, { categories: masterCategories });
                    }
                }

                // 2. Delete all articles associated with this job
                const articlesRef = collection(db, DB_COLLECTIONS.KB_ARTICLES);
                const articlesQuery = query(articlesRef, where("jobId", "==", jobId));
                const articlesSnapshot = await getDocs(articlesQuery); // Note: getDocs is non-transactional, but it's acceptable for reads before writes.
                articlesSnapshot.forEach((articleDoc) => {
                    transaction.delete(articleDoc.ref);
                });

                // 3. Delete the job document itself
                transaction.delete(jobRef);
            });

            // 4. Delete associated files from storage after the transaction
            if (jobData.sourceFiles && jobData.sourceFiles.length > 0) {
                const deletePromises = jobData.sourceFiles.map(file => deleteFileByUrl(file.downloadURL, answerlatticeStorage));
                await Promise.all(deletePromises);
            }

            return { success: true, jobId, deleted: true } satisfies IngestionJobDeleteResult;
        },
        jobId,
        "deleteIngestionJob"
    );
};

export const retryJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const jobRef = doc(getCollectionRef(), jobId);
            const jobSnap = await getDoc(jobRef);
            if (!jobSnap.exists()) throw new Error(`Job ${jobId} not found`);

            const job = jobSnap.data() as IngestionJob;
            if (job.status !== INGESTION_JOB_STATUS.FAILED) {
                throw new Error(`Only failed jobs can be retried. Current status: ${job.status}`);
            }

            const resetData = await answerlatticeRequestBodyComposer({
                status: INGESTION_JOB_STATUS.PENDING,
                errorMessage: null,
                categories: null,
                articleIds: null,
                articlesToReview: null,
                articlesEmbeddedCount: null,
                articlesToEmbedCount: null,
            });

            await setDoc(jobRef, resetData, { merge: true });
            const resetJob = { ...job, ...resetData, id: jobId } as IngestionJob;

            if (process.env.NODE_ENV !== 'production') {
                await triggerStartGeneration(resetJob.id, resetJob);
            }

            return {
                ...resetJob,
                success: true,
                updatedFields: Object.keys(resetData),
            } satisfies IngestionJobWriteResult;
        },
        { jobId },
        "retryJob"
    );
};

export const cancelJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const dataToUpdate = await answerlatticeRequestBodyComposer({
                status: INGESTION_JOB_STATUS.CANCELLED,
            });
            const jobRef = doc(getCollectionRef(), jobId);
            await setDoc(jobRef, dataToUpdate, { merge: true });
            return {
                id: jobId,
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
            const submitData = await answerlatticeRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            // return { ...submitData, id: docRef.id };
            const newJob = { ...submitData, id: docRef.id } as IngestionJob;
            // --- NEW HYBRID LOGIC ---
            // In development, we manually call the local function trigger.
            if (process.env.NODE_ENV !== 'production') {
                await triggerStartGeneration(newJob.id, newJob);
            }
            // In production, the Firestore trigger will fire automatically. We do nothing.
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
