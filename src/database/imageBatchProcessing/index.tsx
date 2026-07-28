import { BATCH_IMAGE_GENERATION_JOB_STATUS, type BatchImageGenerationJobStatusType } from "@constant/AI";
import { DB_COLLECTIONS } from "@constant/database";
import { collection, getDoc, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, Timestamp, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import {
    normalizeImageBatchJobId,
    normalizeImageBatchProjectId,
    getImageBatchProjectJobKeyPrefix,
    normalizeImageBatchScopeDocumentId,
} from "@lib/ai/imageBatchIdBoundary";
import {
    isAllowedImageBatchOwnerTransition,
    isImageBatchOwnerOutcomeAlreadyCommitted,
    normalizeImageBatchJobCreateInput,
    normalizeImageBatchJobForClient,
} from "@lib/ai/imageBatchClientBoundary";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { BatchImageGenerationJobType } from "@template/main-app/projects/types";
import { doc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS;
const RECENT_BATCH_JOB_QUERY_LIMIT = 5;
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

function requireProjectSessionScope(session: any, projectId: string) {
    const projectScope = normalizeImageBatchProjectId(projectId);
    const tenantScope = normalizeImageBatchScopeDocumentId(String(session.tId));
    const storeScope = normalizeImageBatchScopeDocumentId(String(session.sId));
    if (
        !projectScope
        || !tenantScope
        || !storeScope
        || projectScope.tId !== tenantScope.documentId
        || projectScope.sId !== storeScope.documentId
    ) {
        throw new Error("Image batch project does not belong to the active session scope.");
    }
    return { projectScope, storeScope, tenantScope };
}

const getCollectionRef = async (projectId: string) => {
    const session = await getActiveSession();
    const { storeScope, tenantScope } = requireProjectSessionScope(session, projectId);

    return collection(firebaseClient, `${COLLECTION}/${tenantScope.documentId}/${storeScope.documentId}`)
}

export const getBatchImageJobCollectionRef = (session: any, projectId: string) => {
    const { projectScope, storeScope, tenantScope } = requireProjectSessionScope(session, projectId);
    const projectJobKeyPrefix = getImageBatchProjectJobKeyPrefix(projectScope.projectId);
    if (!projectJobKeyPrefix) throw new Error("Invalid image batch project job key prefix.");

    const collectionRef = collection(firebaseClient, `${COLLECTION}/${tenantScope.documentId}/${storeScope.documentId}`);

    // A single-field range keeps the listener at one document without requiring a
    // per-store composite index for the tenant/store-scoped collection layout.
    return query(
        collectionRef,
        where("projectJobKey", ">=", projectJobKeyPrefix),
        where("projectJobKey", "<", `${projectJobKeyPrefix}\uf8ff`),
        orderBy("projectJobKey", "desc"),
        limit(RECENT_BATCH_JOB_QUERY_LIMIT),
    );
}

export const getLegacyBatchImageJobCollectionRef = (session: any, projectId: string) => {
    const { projectScope, storeScope, tenantScope } = requireProjectSessionScope(session, projectId);
    const collectionRef = collection(firebaseClient, `${COLLECTION}/${tenantScope.documentId}/${storeScope.documentId}`);
    return query(
        collectionRef,
        where("projectId", "==", projectScope.projectId),
        where("status", "in", [BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED, BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING, BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED, BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED]),
        limit(RECENT_BATCH_JOB_QUERY_LIMIT),
    );
}

const getDocRef = async (docId: any, session: any) => {
    const jobId = normalizeImageBatchJobId(docId);
    const tenantScope = normalizeImageBatchScopeDocumentId(String(session.tId));
    const storeScope = normalizeImageBatchScopeDocumentId(String(session.sId));
    if (!jobId || !tenantScope || !storeScope) {
        throw new Error("Invalid image batch job or tenant/store scope.");
    }

    return doc(firebaseClient, `${COLLECTION}/${tenantScope.documentId}/${storeScope.documentId}`, jobId)
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
                const job = normalizeImageBatchJobForClient(docSnap.data(), docSnap.id, {
                    storeId: session.sId,
                    tenantId: session.tId,
                });
                if (!job) throw new Error("Stored image batch job is invalid.");
                return job;
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
            const canonicalJob = normalizeImageBatchJobCreateInput(data);
            if (!canonicalJob) throw new Error("Invalid image batch job create payload.");
            const collectionRef = await getCollectionRef(canonicalJob.projectId);
            const jobRef = doc(collectionRef);
            const createData = await requestBodyComposer(canonicalJob, { isNew: true });
            await setDoc(jobRef, {
                ...createData,
                createdOn: serverTimestamp(),
                modifiedOn: serverTimestamp(),
            });
            return jobRef.id;
        },
        data,
        "addImageBatchProcessingJob"
    );
}

type ImageBatchOwnerUpdate = {
    id: string;
    selectedImagesPersisted: boolean;
    status:
        | typeof BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED
        | typeof BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED
        | typeof BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED;
    statusHistory: BatchImageGenerationJobType['statusHistory'];
};

export const updateImageBatchProcessingJob = async (data: ImageBatchOwnerUpdate, projectId: string) => {
    return await apiCallComposer(
        async () => {
            const projectScope = normalizeImageBatchProjectId(projectId);
            const jobId = normalizeImageBatchJobId(data.id);
            if (!projectScope || !jobId) {
                throw new Error("Invalid image batch project or job ID.");
            }
            const session = await getActiveSession();
            requireProjectSessionScope(session, projectScope.projectId);

            const latestStatusEntry = data.statusHistory.at(-1);
            if (
                !latestStatusEntry
                || latestStatusEntry.status !== data.status
                || typeof latestStatusEntry.createdOn !== "string"
                || !Number.isFinite(new Date(latestStatusEntry.createdOn).getTime())
                || (latestStatusEntry.reason !== undefined && latestStatusEntry.reason.length > 240)
            ) {
                throw new Error("Invalid image batch owner status transition entry.");
            }
            if (
                (data.status === BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED && data.selectedImagesPersisted !== true)
                || (data.status === BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED && data.selectedImagesPersisted !== false)
            ) {
                throw new Error("Image batch completion state does not match the selected-image outcome.");
            }

            const processedData: Record<string, unknown> = {
                selectedImagesPersisted: data.selectedImagesPersisted,
                status: data.status,
                ...getImageBatchRetentionFields(data.status),
            };

            // Prepare the update data
            const updateData = await requestBodyComposer(processedData, { isNew: false });

            const finalUpdateData: Record<string, unknown> = { ...updateData };
            finalUpdateData.modifiedOn = serverTimestamp();

            const docRef = await getDocRef(jobId, { tId: projectScope.tId, sId: projectScope.sId });
            await runTransaction(firebaseClient, async (transaction) => {
                const snap = await transaction.get(docRef);
                if (!snap.exists()) throw new Error("Image batch job does not exist.");
                const currentJob = normalizeImageBatchJobForClient(snap.data(), snap.id, {
                    projectId: projectScope.projectId,
                    storeId: projectScope.storeId,
                    tenantId: projectScope.tenantId,
                });
                if (!currentJob) throw new Error("Stored image batch job is invalid or outside the active project.");
                if (isImageBatchOwnerOutcomeAlreadyCommitted(currentJob, data.status, data.selectedImagesPersisted)) {
                    return;
                }
                if (!isAllowedImageBatchOwnerTransition(currentJob.status, data.status)) {
                    throw new Error("Image batch owner status transition is not allowed.");
                }
                if (
                    data.status === BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED
                    && (
                        currentJob.hasStagedResults === true
                        || (
                            currentJob.status !== BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED
                            && currentJob.hasStagedResults !== false
                        )
                    )
                ) {
                    throw new Error("An image is finishing. Wait for it to complete before cancelling.");
                }
                finalUpdateData.statusHistory = [...currentJob.statusHistory, latestStatusEntry].slice(-MAX_STATUS_HISTORY_ENTRIES);
                transaction.update(docRef, finalUpdateData);
            });

            return {
                jobId: data.id,
                status: data.status,
                success: true,
            } satisfies ImageBatchJobUpdateResult;
        },
        data,
        "updateImageBatchProcessingJob"
    );
}
