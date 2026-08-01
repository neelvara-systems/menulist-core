import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { DB_COLLECTIONS } from "@constant/database";
import {
    buildImageBatchProjectJobKey,
    normalizeImageBatchJobId,
    normalizeImageBatchProjectId,
    normalizeImageBatchScopeDocumentId,
} from "@lib/ai/imageBatchIdBoundary";
import {
    areImageBatchJsonValuesEquivalent,
    getImageBatchItemExecutionKey,
    getImageBatchOperationId,
    IMAGE_BATCH_ITEM_LEASE_MS,
    IMAGE_BATCH_ITEM_MAX_ATTEMPTS,
    normalizeBatchGeneratedImages,
    normalizeImageBatchAccountingInput,
    normalizePersistedImageBatchJob,
} from "@lib/ai/imageBatchServerBoundary";
import {
    isImageBatchGeneratedStorageAsset,
    parseImageBatchStorageUrl,
} from "@lib/ai/imageBatchStorageBoundary";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import {
    BatchImageAccountingInput,
    BatchImageGenerationJobType,
    BatchImageItemExecution,
} from "@template/main-app/projects/types";
import { randomUUID } from "crypto";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION = DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS;
const MAX_STATUS_HISTORY_ENTRIES = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const IMAGE_BATCH_ITEMS_RETENTION_DAYS = 7;
const IMAGE_BATCH_JOB_RETENTION_DAYS = 30;
const IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES = new Set<string>([
    BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
]);

function requireImageBatchJobId(value: unknown): string {
    const jobId = normalizeImageBatchJobId(value);
    if (!jobId) throw new Error("Invalid image batch job ID.");
    return jobId;
}

function requireImageBatchProjectScope(projectId: string) {
    const scope = normalizeImageBatchProjectId(projectId);
    if (!scope) throw new Error("Invalid project scope for image batch job.");
    return scope;
}

function getScopedJobRef(id: string, tenantId: string | number, storeId: string | number) {
    const jobId = requireImageBatchJobId(id);
    const tenantScope = normalizeImageBatchScopeDocumentId(String(tenantId));
    const storeScope = normalizeImageBatchScopeDocumentId(String(storeId));
    if (!tenantScope || !storeScope) {
        throw new Error("Invalid image batch tenant/store scope.");
    }

    return firestoreAdmin.doc(`${COLLECTION}/${tenantScope.documentId}/${storeScope.documentId}/${jobId}`);
}

function removeUndefined(value: unknown): unknown {
    return sanitizeForFirestore(value, { undefinedObjectValue: 'omit' });
}

function getImageBatchRetentionFields(status?: string) {
    if (!status || !IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES.has(status)) {
        return {};
    }

    const now = Date.now();
    return {
        expiresAt: Timestamp.fromMillis(now + IMAGE_BATCH_JOB_RETENTION_DAYS * DAY_MS),
        itemsExpiresAt: Timestamp.fromMillis(now + IMAGE_BATCH_ITEMS_RETENTION_DAYS * DAY_MS),
    };
}

export async function getImageBatchProcessingJobByIdAdmin(
    id: string,
    scope: { sId: string | number; tId: string | number },
): Promise<BatchImageGenerationJobType | null> {
    const jobId = requireImageBatchJobId(id);
    const snap = await getScopedJobRef(jobId, scope.tId, scope.sId).get();
    if (!snap.exists) return null;
    const job = normalizePersistedImageBatchJob(snap.data(), snap.id);
    if (!job) throw new Error(`Image batch job ${snap.id} is invalid.`);
    return job;
}

export async function prepareImageBatchProcessingJobForTriggerAdmin({
    expectedGenerationConfig,
    expectedItemIds,
    jobId,
    projectId,
    serverNowIso = new Date().toISOString(),
}: {
    expectedGenerationConfig: unknown;
    expectedItemIds: string[];
    jobId: string;
    projectId: string;
    serverNowIso?: string;
}): Promise<{ job: BatchImageGenerationJobType; ready: boolean }> {
    const projectScope = requireImageBatchProjectScope(projectId);
    const imageBatchJobId = requireImageBatchJobId(jobId);
    const jobRef = getScopedJobRef(imageBatchJobId, projectScope.tId, projectScope.sId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(jobRef);
        const job = requirePersistedJob(snap, { requireRequestedItems: true });
        assertJobProject(job, projectScope.projectId);
        const requestedItemIds = job.requestedItemIds || [];
        const ready = job.status === BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED
            && job.totalImages === expectedItemIds.length
            && job.generatedCount === 0
            && job.itemsList.length === 0
            && requestedItemIds.length === expectedItemIds.length
            && requestedItemIds.every((itemId, index) => itemId === expectedItemIds[index])
            && areImageBatchJsonValuesEquivalent(job.generationConfig, expectedGenerationConfig);
        if (!ready) return { job, ready: false };

        const canonicalProjectJobKey = buildImageBatchProjectJobKey(
            projectScope.projectId,
            serverNowIso,
            imageBatchJobId,
        );
        if (!canonicalProjectJobKey) throw new Error('Could not build the canonical image batch project key.');
        if (job.projectJobKey !== canonicalProjectJobKey || snap.get('hasStagedResults') !== false) {
            transaction.update(jobRef, {
                hasStagedResults: false,
                modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
                projectJobKey: canonicalProjectJobKey,
            });
        }
        return {
            job: { ...job, hasStagedResults: false, projectJobKey: canonicalProjectJobKey },
            ready: true,
        };
    });
}

export async function updateImageBatchProcessingJobAdmin(
    data: {
        enqueueFailedItemIds?: string[];
        error?: string;
        failedItemIds?: string[];
        id: string;
        status?: BatchImageGenerationJobType['status'];
        statusHistory?: BatchImageGenerationJobType['statusHistory'];
    },
    projectId: string,
) {
    const projectScope = requireImageBatchProjectScope(projectId);
    const jobId = requireImageBatchJobId(data.id);

    const processedData: Record<string, unknown> = {
        ...(data.enqueueFailedItemIds !== undefined ? { enqueueFailedItemIds: data.enqueueFailedItemIds } : {}),
        ...(data.error !== undefined ? { error: data.error.slice(0, 500) } : {}),
        ...(data.failedItemIds !== undefined ? { failedItemIds: data.failedItemIds } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...getImageBatchRetentionFields(data.status),
    };
    let latestStatusEntry: unknown;

    if (Array.isArray(data.statusHistory) && data.statusHistory.length > 0) {
        latestStatusEntry = removeUndefined(data.statusHistory[data.statusHistory.length - 1]);
        delete processedData.statusHistory;
    }

    const finalData: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
        ...(removeUndefined(processedData) as Record<string, unknown>),
        modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
    };

    const jobRef = getScopedJobRef(jobId, projectScope.tId, projectScope.sId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(jobRef);
        const currentJob = requirePersistedJob(snap);
        assertJobProject(currentJob, projectScope.projectId);
        if (latestStatusEntry) {
            const currentHistory = currentJob.statusHistory;
            finalData.statusHistory = [...currentHistory, latestStatusEntry].slice(-MAX_STATUS_HISTORY_ENTRIES);
        }
        transaction.update(jobRef, finalData);
    });
    return finalData;
}

function requirePersistedJob(
    snap: FirebaseFirestore.DocumentSnapshot,
    options: { requireRequestedItems?: boolean } = {},
): BatchImageGenerationJobType {
    if (!snap.exists) throw new Error(`Image batch job ${snap.id} not found.`);
    const job = normalizePersistedImageBatchJob(snap.data(), snap.id, options);
    if (!job) throw new Error(`Image batch job ${snap.id} is invalid.`);
    return job;
}

function assertJobProject(job: BatchImageGenerationJobType, projectId: string) {
    if (job.projectId !== projectId) throw new Error('Image batch job project mismatch.');
}

function getProcessedItemCount(job: BatchImageGenerationJobType): number {
    return job.itemsList.length + (job.failedItemIds?.length || 0);
}

function getExecution(
    job: BatchImageGenerationJobType,
    itemId: string,
): { execution?: BatchImageItemExecution; key: string } {
    const key = getImageBatchItemExecutionKey(itemId);
    return { execution: job.itemExecutions?.[key], key };
}

function hasStagedImageBatchResults(itemExecutions: Record<string, BatchImageItemExecution>): boolean {
    return Object.values(itemExecutions).some((execution) => Boolean(execution.stagedItem));
}

export type ImageBatchItemClaimResult =
    | { state: 'claimed'; claimToken: string; execution: BatchImageItemExecution }
    | { state: 'completed' | 'failed' | 'in_flight' | 'terminal' };

export async function claimImageBatchItemAdmin({
    itemId,
    jobId,
    nowMs = Date.now(),
    projectId,
}: {
    itemId: string;
    jobId: string;
    nowMs?: number;
    projectId: string;
}): Promise<ImageBatchItemClaimResult> {
    const projectScope = requireImageBatchProjectScope(projectId);
    const imageBatchJobId = requireImageBatchJobId(jobId);
    const jobRef = getScopedJobRef(imageBatchJobId, projectScope.tId, projectScope.sId);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(jobRef);
        const job = requirePersistedJob(snap, { requireRequestedItems: true });
        assertJobProject(job, projectScope.projectId);
        if (!job.requestedItemIds?.includes(itemId)) throw new Error('Image batch item is not registered on the job.');
        if (job.itemsList.some((item) => item.id === itemId)) return { state: 'completed' } as const;
        if (job.failedItemIds?.includes(itemId)) return { state: 'failed' } as const;
        if (IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES.has(job.status)) return { state: 'terminal' } as const;

        const { execution: existing, key } = getExecution(job, itemId);
        if (
            existing?.status === 'processing'
            && typeof existing.leaseExpiresAtMs === 'number'
            && existing.leaseExpiresAtMs > nowMs
        ) {
            return { state: 'in_flight' } as const;
        }
        if (
            (existing?.attemptCount || 0) >= IMAGE_BATCH_ITEM_MAX_ATTEMPTS
            && !existing?.stagedItem
            && existing?.requiresFinalization !== true
        ) {
            const reason = `Image generation stopped after ${IMAGE_BATCH_ITEM_MAX_ATTEMPTS} attempts.`;
            const failedItemIds = Array.from(new Set([...(job.failedItemIds || []), itemId]));
            const nextJob = { ...job, failedItemIds };
            const nextStatus = getProcessedItemCount(nextJob) >= job.totalImages
                ? BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
                : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;
            const itemExecutions = {
                ...(job.itemExecutions || {}),
                [key]: {
                    attemptCount: existing?.attemptCount || IMAGE_BATCH_ITEM_MAX_ATTEMPTS,
                    itemId,
                    lastError: reason,
                    operationId: existing?.operationId || getImageBatchOperationId(imageBatchJobId, itemId),
                    status: 'failed' as const,
                },
            };
            transaction.update(jobRef, {
                error: reason,
                failedItemIds,
                hasStagedResults: hasStagedImageBatchResults(itemExecutions),
                itemExecutions,
                modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
                status: nextStatus,
                statusHistory: [...job.statusHistory, removeUndefined({
                    status: nextStatus,
                    reason,
                    createdOn: new Date(nowMs).toISOString(),
                })].slice(-MAX_STATUS_HISTORY_ENTRIES),
                ...getImageBatchRetentionFields(nextStatus),
            });
            return { state: 'failed' } as const;
        }

        const claimToken = randomUUID();
        const nextExecution: BatchImageItemExecution = {
            ...(existing || {}),
            attemptCount: Math.min((existing?.attemptCount || 0) + 1, IMAGE_BATCH_ITEM_MAX_ATTEMPTS),
            claimToken,
            itemId,
            leaseExpiresAtMs: nowMs + IMAGE_BATCH_ITEM_LEASE_MS,
            operationId: existing?.operationId || getImageBatchOperationId(imageBatchJobId, itemId),
            status: 'processing',
        };
        const itemExecutions = { ...(job.itemExecutions || {}), [key]: nextExecution };
        const enteringProcessing = job.status !== BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;
        transaction.update(jobRef, {
            hasStagedResults: hasStagedImageBatchResults(itemExecutions),
            itemExecutions,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            status: BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
            ...(enteringProcessing ? {
                statusHistory: [...job.statusHistory, {
                    createdOn: new Date(nowMs).toISOString(),
                    reason: 'Image generation started',
                    status: BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
                }].slice(-MAX_STATUS_HISTORY_ENTRIES),
            } : {}),
        });
        return { state: 'claimed', claimToken, execution: nextExecution } as const;
    });
}

export async function stageImageBatchItemResultAdmin({
    accountingInput,
    claimToken,
    item,
    jobId,
    projectId,
    storagePaths,
}: {
    accountingInput: BatchImageAccountingInput;
    claimToken: string;
    item: BatchImageGenerationJobType['itemsList'][number];
    jobId: string;
    projectId: string;
    storagePaths: string[];
}) {
    const projectScope = requireImageBatchProjectScope(projectId);
    const imageBatchJobId = requireImageBatchJobId(jobId);
    const normalizedAccountingInput = normalizeImageBatchAccountingInput(accountingInput);
    if (!normalizedAccountingInput || normalizedAccountingInput.projectId !== projectScope.projectId) {
        throw new Error('Image batch staged accounting input is invalid or outside the project scope.');
    }
    const normalizedImages = normalizeBatchGeneratedImages(item.images, {
        storeId: projectScope.storeId,
        tenantId: projectScope.tenantId,
    });
    if (
        typeof item.id !== 'string'
        || typeof item.name !== 'string'
        || item.name.length < 1
        || item.name.length > 500
        || !normalizedImages
        || storagePaths.length !== normalizedImages.length
        || storagePaths.some((storagePath, index) => (
            parseImageBatchStorageUrl(normalizedImages[index].url)?.storagePath !== storagePath
            || !isImageBatchGeneratedStorageAsset(normalizedImages[index].url, {
                expectedStoragePath: storagePath,
                storeId: projectScope.storeId,
                tenantId: projectScope.tenantId,
            })
        ))
    ) throw new Error('Image batch staged output is invalid or outside the project scope.');
    const jobRef = getScopedJobRef(imageBatchJobId, projectScope.tId, projectScope.sId);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(jobRef);
        const job = requirePersistedJob(snap, { requireRequestedItems: true });
        assertJobProject(job, projectScope.projectId);
        if (IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES.has(job.status)) {
            throw new Error('Image batch job is terminal and cannot stage output.');
        }
        const { execution, key } = getExecution(job, item.id);
        if (!execution || execution.claimToken !== claimToken || execution.status !== 'processing') {
            throw new Error('Image batch item claim is stale.');
        }

        const nextExecution = removeUndefined({
            ...execution,
            stagedAccountingInput: normalizedAccountingInput,
            stagedItem: { id: item.id, images: normalizedImages, name: item.name },
            stagedStoragePaths: storagePaths,
            requiresFinalization: undefined,
            status: 'staged',
        }) as BatchImageItemExecution;
        transaction.update(jobRef, {
            hasStagedResults: true,
            itemExecutions: { ...(job.itemExecutions || {}), [key]: nextExecution },
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        });
        return nextExecution;
    });
}

export async function appendImageBatchItemResultAdmin({
    claimToken,
    itemId,
    jobId,
    projectId,
}: {
    claimToken: string;
    itemId: string;
    jobId: string;
    projectId: string;
}) {
    const projectScope = requireImageBatchProjectScope(projectId);
    const imageBatchJobId = requireImageBatchJobId(jobId);

    const jobRef = getScopedJobRef(imageBatchJobId, projectScope.tId, projectScope.sId);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(jobRef);
        const currentJob = requirePersistedJob(snap, { requireRequestedItems: true });
        assertJobProject(currentJob, projectScope.projectId);
        if (IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES.has(currentJob.status)) {
            throw new Error('Image batch job is terminal and cannot append output.');
        }
        const { execution, key } = getExecution(currentJob, itemId);
        if (!execution || execution.claimToken !== claimToken || execution.status !== 'staged' || !execution.stagedItem) {
            throw new Error('Image batch item claim is stale or has no staged result.');
        }

        const currentItems = [...currentJob.itemsList];
        const existingIndex = currentItems.findIndex((existingItem) => existingItem.id === itemId);
        if (existingIndex >= 0) currentItems[existingIndex] = execution.stagedItem;
        else currentItems.push(execution.stagedItem);

        const failedItemIds = (currentJob.failedItemIds || []).filter((failedItemId) => failedItemId !== itemId);
        const nextGeneratedCount = currentItems.length;
        const processedCount = nextGeneratedCount + failedItemIds.length;
        const nextStatus = processedCount >= currentJob.totalImages
            ? failedItemIds.length > 0
                ? BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
                : BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED
            : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;
        const statusReason = nextStatus === BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED
            ? `Generated ${nextGeneratedCount} out of ${currentJob.totalImages}`
            : nextStatus === BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
                ? `Generated ${nextGeneratedCount} of ${currentJob.totalImages}; ${failedItemIds.length} item(s) failed`
                : `Generated ${nextGeneratedCount} out of ${currentJob.totalImages}`;

        const statusHistoryEntry = removeUndefined({
            status: nextStatus,
            reason: statusReason,
            createdOn: new Date().toISOString(),
        });
        const completedExecution: BatchImageItemExecution = {
            attemptCount: execution.attemptCount,
            itemId,
            operationId: execution.operationId,
            status: 'completed',
        };

        const itemExecutions = { ...(currentJob.itemExecutions || {}), [key]: completedExecution };
        const updateData = {
            ...(nextStatus === BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED
                ? { error: admin.firestore.FieldValue.delete() }
                : {}),
            failedItemIds,
            generatedCount: nextGeneratedCount,
            hasStagedResults: hasStagedImageBatchResults(itemExecutions),
            itemExecutions,
            itemsList: currentItems,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            status: nextStatus,
            statusHistory: [...currentJob.statusHistory, statusHistoryEntry].slice(-MAX_STATUS_HISTORY_ENTRIES),
            ...getImageBatchRetentionFields(nextStatus),
        };

        transaction.update(jobRef, updateData);

        return {
            generatedCount: nextGeneratedCount,
            itemCount: currentItems.length,
            status: nextStatus,
            totalImages: currentJob.totalImages,
        };
    });
}

type ImageBatchItemAttemptFailureResult = {
    cleanupStoragePaths: string[];
    retainsStagedResult: boolean;
    shouldRetry: boolean;
    stale: boolean;
    terminal: boolean;
};

export async function markImageBatchItemAttemptFailedAdmin({
    claimToken,
    itemId,
    jobId,
    preserveForRetry = false,
    projectId,
    reason,
    retryable = true,
}: {
    claimToken: string;
    itemId: string;
    jobId: string;
    preserveForRetry?: boolean;
    projectId: string;
    reason: string;
    retryable?: boolean;
}): Promise<ImageBatchItemAttemptFailureResult> {
    const projectScope = requireImageBatchProjectScope(projectId);
    const imageBatchJobId = requireImageBatchJobId(jobId);
    const jobRef = getScopedJobRef(imageBatchJobId, projectScope.tId, projectScope.sId);
    return firestoreAdmin.runTransaction<ImageBatchItemAttemptFailureResult>(async (transaction) => {
        const snap = await transaction.get(jobRef);
        const job = requirePersistedJob(snap, { requireRequestedItems: true });
        assertJobProject(job, projectScope.projectId);
        const { execution, key } = getExecution(job, itemId);
        if (IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES.has(job.status)) {
            const exactUnstagedClaim = execution?.claimToken === claimToken
                && execution.status === 'processing'
                && !execution.stagedItem
                && !execution.stagedAccountingInput;
            return {
                cleanupStoragePaths: [],
                retainsStagedResult: !exactUnstagedClaim,
                shouldRetry: false,
                stale: false,
                terminal: true,
            };
        }
        if (!execution || execution.claimToken !== claimToken || !['processing', 'staged'].includes(execution.status)) {
            return { cleanupStoragePaths: [], retainsStagedResult: true, shouldRetry: false, stale: true, terminal: false };
        }
        if (preserveForRetry && (!execution.stagedItem || !execution.stagedAccountingInput)) {
            throw new Error('Image batch finalization retry requires a staged result.');
        }

        const shouldRetry = preserveForRetry
            || (retryable && execution.attemptCount < IMAGE_BATCH_ITEM_MAX_ATTEMPTS);
        const cleanupStoragePaths = shouldRetry ? [] : (execution.stagedStoragePaths || []);
        const nextExecution: BatchImageItemExecution = shouldRetry
            ? {
                ...execution,
                claimToken: undefined,
                lastError: reason.slice(0, 240),
                leaseExpiresAtMs: undefined,
                ...(preserveForRetry ? { requiresFinalization: true } : {}),
                status: execution.stagedItem ? 'staged' : 'retry_pending',
            }
            : {
                attemptCount: execution.attemptCount,
                itemId,
                lastError: reason.slice(0, 240),
                operationId: execution.operationId,
                status: 'failed',
            };

        const failedItemIds = shouldRetry
            ? (job.failedItemIds || [])
            : Array.from(new Set([...(job.failedItemIds || []), itemId]));
        const nextJob = { ...job, failedItemIds };
        const processedCount = getProcessedItemCount(nextJob);
        const nextStatus = processedCount >= job.totalImages && failedItemIds.length > 0
            ? BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
            : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;
        const statusHistory = shouldRetry
            ? job.statusHistory
            : [...job.statusHistory, removeUndefined({
                status: nextStatus,
                reason: reason.slice(0, 240),
                createdOn: new Date().toISOString(),
            })].slice(-MAX_STATUS_HISTORY_ENTRIES);

        const itemExecutions = {
            ...(job.itemExecutions || {}),
            [key]: removeUndefined(nextExecution),
        } as Record<string, BatchImageItemExecution>;
        transaction.update(jobRef, {
            error: reason.slice(0, 240),
            failedItemIds,
            hasStagedResults: hasStagedImageBatchResults(itemExecutions),
            itemExecutions,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            status: nextStatus,
            statusHistory,
            ...getImageBatchRetentionFields(nextStatus),
        });
        return {
            cleanupStoragePaths,
            retainsStagedResult: shouldRetry && Boolean(execution.stagedItem && execution.stagedAccountingInput),
            shouldRetry,
            stale: false,
            terminal: false,
        };
    });
}

export async function markImageBatchProcessingJobFailedAdmin(
    jobId: string,
    projectId: string,
    reason: string,
) {
    return updateImageBatchProcessingJobAdmin({
        error: reason,
        id: jobId,
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
        statusHistory: [
            {
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                reason,
                createdOn: new Date().toISOString(),
            },
        ],
    }, projectId);
}
