import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, where } from "@firebase/firestore";
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { triggerStartGeneration } from "@lib/firebase/functions";
import { INGESTION_JOB_STATUS, IngestionJob } from "@type/knowledgeBase";
import { getKnowledgeBaseCategoriesDocId } from "@database/knowledgeBase/categories";
import { deleteFileByUrl } from "../storage/deleteFromStorage";

const COLLECTION = DB_COLLECTIONS.KB_GENERATION_JOBS;
const ACTIVE_JOB_LIMIT = 5;
const ALL_JOB_LIMIT = 100;
const PREVIOUS_JOB_LIMIT = 20;

const getCollectionRef = () => {
    return collection(canonicaFirebaseClient, COLLECTION);
};

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

export const getIngestionJobs = async () => {
    return await apiCallComposer(
        async () => {
            const q = query(getCollectionRef(), orderBy("createdOn", "desc"), limit(ALL_JOB_LIMIT));
            const querySnapshot = await getDocs(q);
            const list: IngestionJob[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as IngestionJob);
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
            const dataToUpdate = await canonicaRequestBodyComposer(data);
            const jobRef = doc(getCollectionRef(), jobId);
            await setDoc(jobRef, dataToUpdate, { merge: true });
            return { id: jobId, ...dataToUpdate };
        },
        data,
        "updateJob"
    );
};

export const deleteIngestionJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const db = canonicaFirebaseClient;
            const jobRef = doc(db, DB_COLLECTIONS.KB_GENERATION_JOBS, jobId);
            const jobDoc = await getDoc(jobRef);

            if (!jobDoc.exists()) {
                throw new Error(`Job ${jobId} not found.`);
            }

            const jobData = jobDoc.data() as IngestionJob;

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
                const deletePromises = jobData.sourceFiles.map(file => deleteFileByUrl(file.downloadURL));
                await Promise.all(deletePromises);
            }

            return { jobId };
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

            const resetData = await canonicaRequestBodyComposer({
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

            return resetJob;
        },
        { jobId },
        "retryJob"
    );
};

export const cancelJob = async (jobId: string) => {
    return await apiCallComposer(
        async () => {
            const dataToUpdate = await canonicaRequestBodyComposer({
                status: INGESTION_JOB_STATUS.CANCELLED,
            });
            const jobRef = doc(getCollectionRef(), jobId);
            await setDoc(jobRef, dataToUpdate, { merge: true });
            return { id: jobId, ...dataToUpdate };
        },
        { jobId },
        "cancelJob"
    );
};

export const addIngestionJob = async (data: Partial<IngestionJob>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await canonicaRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            // return { ...submitData, id: docRef.id };
            const newJob = { ...submitData, id: docRef.id } as IngestionJob;
            // --- NEW HYBRID LOGIC ---
            // In development, we manually call the local function trigger.
            if (process.env.NODE_ENV !== 'production') {
                await triggerStartGeneration(newJob.id, newJob);
            }
            // In production, the Firestore trigger will fire automatically. We do nothing.
            return newJob;

        },
        data,
        "addIngestionJob"
    );
};
