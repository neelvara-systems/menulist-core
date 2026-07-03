import { BATCH_IMAGE_GENERATION_JOB_STATUS, type BatchImageGenerationJobStatusType } from "@constant/AI";
import { DB_COLLECTIONS } from "@constant/database";
import { collection, getDoc, increment, limit, query, runTransaction, setDoc, Timestamp, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { BatchImageGenerationJobType } from "@template/main-app/projects/types";
import { addDoc, doc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS;
const ACTIVE_BATCH_JOB_QUERY_LIMIT = 5;
const MAX_STATUS_HISTORY_ENTRIES = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const IMAGE_BATCH_ITEMS_RETENTION_DAYS = 7;
const IMAGE_BATCH_JOB_RETENTION_DAYS = 30;
const BATCH_IMAGE_GENERATION_JOB_STATUS_VALUES = new Set<BatchImageGenerationJobStatusType>(
    Object.values(BATCH_IMAGE_GENERATION_JOB_STATUS),
);
const IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES = new Set<BatchImageGenerationJobStatusType>([
    BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
]);

export type ImageBatchJobUpdateResult = {
    jobId: string;
    status?: BatchImageGenerationJobStatusType;
    success: true;
};

const isImageBatchJobUpdateResult = (value: unknown): value is ImageBatchJobUpdateResult => (
    Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && (value as { success?: unknown }).success === true
    && typeof (value as { jobId?: unknown }).jobId === "string"
    && (
        (value as { status?: unknown }).status === undefined
        || BATCH_IMAGE_GENERATION_JOB_STATUS_VALUES.has((value as { status: BatchImageGenerationJobStatusType }).status)
    )
);

export function assertImageBatchJobCreateSucceeded(
    result: unknown,
    rejectionCode = "image_batch_job_create_rejected",
): asserts result is string {
    if (typeof result !== "string" || !result.trim()) {
        throw new Error(rejectionCode);
    }
}

export function assertImageBatchJobUpdateSucceeded(
    result: unknown,
    expectedJobId?: string,
    expectedStatus?: BatchImageGenerationJobStatusType,
    rejectionCode = "image_batch_job_update_rejected",
): asserts result is ImageBatchJobUpdateResult {
    if (
        !isImageBatchJobUpdateResult(result)
        || (expectedJobId !== undefined && result.jobId !== expectedJobId)
        || (expectedStatus !== undefined && result.status !== expectedStatus)
    ) {
        throw new Error(rejectionCode);
    }
}

const getCollectionRef = async () => {
    const session = await getActiveSession();
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`)
}

export const getBatchImageJobCollectionRef = (session: any, projectId: string) => {
    const collectionRef = collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);

    // Keep this listener bounded. The hook selects the newest visible job client-side
    // to avoid a new composite index for this tenant/store subcollection path.
    return query(
        collectionRef,
        where("projectId", "==", projectId),
        where("status", "in", [BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED, BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING, BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED, BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED]),
        limit(ACTIVE_BATCH_JOB_QUERY_LIMIT)
    );
}

const getDocRef = async (docId: any, session: any) => {
    return doc(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`, docId)
}

function getImageBatchRetentionFields(status?: BatchImageGenerationJobStatusType) {
    if (!status || !IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES.has(status)) {
        return {};
    }

    const now = Date.now();
    return {
        expiresAt: Timestamp.fromMillis(now + IMAGE_BATCH_JOB_RETENTION_DAYS * DAY_MS),
        itemsExpiresAt: Timestamp.fromMillis(now + IMAGE_BATCH_ITEMS_RETENTION_DAYS * DAY_MS),
    };
}

export const getImageBatchProcessingJobById = async (id: string, session: any) => {
    return await apiCallComposer(
        async () => {
            const collectionDocRef = await getDocRef(id, session);
            const docSnap = await getDoc(collectionDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null
            }
        },
        id,
        "getImageBatchProcessingJobById"
    );
}

export const addImageBatchProcessingJob = async (data: BatchImageGenerationJobType) => {
    return await apiCallComposer(
        async () => {
            //add user first
            const docRef = await addDoc(await getCollectionRef(), await requestBodyComposer(data));
            data.id = docRef.id
            return docRef.id;
        },
        data,
        "addImageBatchProcessingJob"
    );
}

export const updateImageBatchProcessingJob = async (data: any, projectId: string) => {
    return await apiCallComposer(
        async () => {
            // Create a copy of the data to work with
            let processedData = { ...data, ...getImageBatchRetentionFields(data.status) };
            let specialFields: any = {};

            // Handle statusHistory specially if it exists in the data
            let latestStatusEntry: any = null;
            if ("statusHistory" in data && Array.isArray(data.statusHistory) && data.statusHistory.length > 0) {
                // Extract the latest status entry (assuming it's the last one in the array)
                latestStatusEntry = data.statusHistory[data.statusHistory.length - 1];

                // Remove statusHistory from the processed data
                delete processedData.statusHistory;
            }

            // Handle generatedCount increment if it's a number
            if ("generatedCount" in data) {

                // Remove generatedCount from processed data
                delete processedData.generatedCount;
                delete processedData.incrementGeneratedCount;

                // Add to special fields
                specialFields.generatedCount = increment(1);
            }

            // Prepare the update data
            const updateData = await requestBodyComposer(processedData);

            // Merge in the special fields that use Firestore field operations
            const finalUpdateData = { ...updateData, ...specialFields };

            const [tId, _, sId] = projectId.split("-");
            const docRef = await getDocRef(data.id, { tId, sId });
            if (latestStatusEntry) {
                await runTransaction(firebaseClient, async (transaction) => {
                    const snap = await transaction.get(docRef);
                    const currentHistory = Array.isArray(snap.data()?.statusHistory) ? snap.data()?.statusHistory : [];
                    finalUpdateData.statusHistory = [...currentHistory, latestStatusEntry].slice(-MAX_STATUS_HISTORY_ENTRIES);
                    transaction.set(docRef, {
                        ...finalUpdateData,
                    }, { merge: true });
                });
                return {
                    jobId: data.id,
                    status: finalUpdateData.status,
                    success: true,
                } satisfies ImageBatchJobUpdateResult;
            }
            await setDoc(docRef, finalUpdateData, { merge: true });

            return {
                jobId: data.id,
                status: finalUpdateData.status,
                success: true,
            } satisfies ImageBatchJobUpdateResult;
        },
        data,
        "updateImageBatchProcessingJob"
    );
}
