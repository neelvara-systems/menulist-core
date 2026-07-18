import { createHash } from 'crypto';
import {
    BATCH_IMAGE_GENERATION_JOB_STATUS,
    type BatchImageGenerationJobStatusType,
} from '@constant/AI';
import {
    normalizeImageBatchJobId,
    normalizeImageBatchProjectId,
    normalizeImageBatchProjectJobKey,
} from '@lib/ai/imageBatchIdBoundary';
import type {
    BatchImageAccountingInput,
    BatchImageGenerationJobType,
    BatchImageItemExecution,
} from '@template/main-app/projects/types';
import type { UserUploadedFileType } from '@type/common';
import { normalizeImageBatchGenerationConfig } from '@lib/ai/imageBatchClientBoundary';
import {
    isImageBatchGeneratedStorageAsset,
    parseImageBatchStorageUrl,
    type ImageBatchStorageAssetScope,
} from '@lib/ai/imageBatchStorageBoundary';
import { MEDIA_ACCEPTED_IMAGE_MIME_TYPES } from '@lib/media/imageProfiles';

export const IMAGE_BATCH_ITEM_LEASE_MS = 5 * 60 * 1000;
export const IMAGE_BATCH_ITEM_MAX_ATTEMPTS = 3;
export const IMAGE_BATCH_MAX_ITEMS = 50;
export const IMAGE_BATCH_MAX_IMAGES_PER_ITEM = 4;
const IMAGE_BATCH_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_BATCH_IMAGE_MIME_TYPES = new Set<string>(MEDIA_ACCEPTED_IMAGE_MIME_TYPES);

const IMAGE_BATCH_STATUS_VALUES: ReadonlySet<BatchImageGenerationJobStatusType> = new Set(
    Object.values(BATCH_IMAGE_GENERATION_JOB_STATUS),
);
const IMAGE_BATCH_EXECUTION_STATUS_VALUES = new Set([
    'processing',
    'retry_pending',
    'staged',
    'completed',
    'failed',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function normalizeComparableJson(value: unknown): unknown {
    if (value === undefined) return null;
    if (Array.isArray(value)) return value.map(normalizeComparableJson);
    if (isPlainRecord(value)) {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, nestedValue]) => [key, normalizeComparableJson(nestedValue)]),
        );
    }
    return value;
}

export function areImageBatchJsonValuesEquivalent(left: unknown, right: unknown): boolean {
    try {
        return JSON.stringify(normalizeComparableJson(left)) === JSON.stringify(normalizeComparableJson(right));
    } catch {
        return false;
    }
}

export function imageBatchExecutionNeedsAccounting(
    execution: Pick<BatchImageItemExecution, 'requiresFinalization' | 'stagedAccountingInput' | 'stagedItem'>,
): boolean {
    return Boolean(execution.stagedItem && execution.stagedAccountingInput)
        && execution.requiresFinalization !== true;
}

const IMAGE_BATCH_ACCOUNTING_OPTIONAL_NUMBERS = [
    'candidatesTokenCount',
    'chargePerCredit',
    'failedPromptCount',
    'imageCount',
    'marginPaise',
    'ourChargePaise',
    'processingTime',
    'promptCacheHitCount',
    'promptCount',
    'promptTokenCount',
    'realCostPaise',
    'tokenPerCredit',
    'totalCharge',
    'totalCredits',
    'totalTokenCount',
] as const;
const IMAGE_BATCH_ACCOUNTING_INTEGER_FIELDS = new Set<string>([
    'candidatesTokenCount',
    'failedPromptCount',
    'imageCount',
    'processingTime',
    'promptCacheHitCount',
    'promptCount',
    'promptTokenCount',
    'totalTokenCount',
]);

export function normalizeImageBatchAccountingInput(value: unknown): BatchImageAccountingInput | null {
    if (!isPlainRecord(value)) return null;
    const projectScope = normalizeImageBatchProjectId(value.projectId);
    if (
        value.action !== 'batch_image_generation'
        || !projectScope
        || !Number.isSafeInteger(value.tId)
        || !Number.isSafeInteger(value.sId)
        || Number(value.tId) !== projectScope.tenantId
        || Number(value.sId) !== projectScope.storeId
        || typeof value.unitsConsumed !== 'number'
        || !Number.isFinite(value.unitsConsumed)
        || value.unitsConsumed < 0
        || value.unitsConsumed > 1_000_000
    ) return null;

    const result: BatchImageAccountingInput = {
        action: value.action,
        projectId: projectScope.projectId,
        sId: projectScope.storeId,
        tId: projectScope.tenantId,
        unitsConsumed: value.unitsConsumed,
    };
    if (value.billingMode !== undefined) {
        if (value.billingMode !== 'billable' && value.billingMode !== 'free') return null;
        result.billingMode = value.billingMode;
    }
    if (value.model !== undefined) {
        if (typeof value.model !== 'string' || value.model.length < 1 || value.model.length > 100) return null;
        result.model = value.model;
    }
    if (value.source !== undefined) {
        if (value.source !== 'ai_image_prompt_cache' && value.source !== 'gemini_image_generation') return null;
        result.source = value.source;
    }
    if (value.uId !== undefined) {
        if (typeof value.uId !== 'string' || value.uId.length < 1 || value.uId.length > 180) return null;
        result.uId = value.uId;
    }
    if (value.clientResponse !== undefined) {
        if (
            !isPlainRecord(value.clientResponse)
            || value.clientResponse.responseSummaryKind !== 'batch_image_generation'
            || !Number.isSafeInteger(value.clientResponse.generatedImageCount)
            || Number(value.clientResponse.generatedImageCount) < 1
            || Number(value.clientResponse.generatedImageCount) > IMAGE_BATCH_MAX_IMAGES_PER_ITEM
        ) return null;
        result.clientResponse = {
            generatedImageCount: Number(value.clientResponse.generatedImageCount),
            responseSummaryKind: 'batch_image_generation',
        };
    }
    for (const field of IMAGE_BATCH_ACCOUNTING_OPTIONAL_NUMBERS) {
        if (value[field] === undefined) continue;
        if (
            typeof value[field] !== 'number'
            || !Number.isFinite(value[field])
            || Math.abs(value[field]) > 1_000_000_000_000
            || (field !== 'marginPaise' && value[field] < 0)
            || (IMAGE_BATCH_ACCOUNTING_INTEGER_FIELDS.has(field) && !Number.isSafeInteger(value[field]))
        ) return null;
        result[field] = value[field];
    }
    return result;
}

function isImageBatchJobStatus(value: unknown): value is BatchImageGenerationJobStatusType {
    return typeof value === 'string'
        && IMAGE_BATCH_STATUS_VALUES.has(value as BatchImageGenerationJobStatusType);
}

function getStableHash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

export function getImageBatchItemExecutionKey(itemId: string): string {
    return `i_${getStableHash(itemId).slice(0, 32)}`;
}

export function getImageBatchOperationId(jobId: string, itemId: string): string {
    return `batch_img_${getStableHash(`${jobId}:${itemId}`).slice(0, 40)}`;
}

export function getImageBatchCloudTaskId(jobId: string, itemId: string): string {
    return `batch-img-${getStableHash(`${jobId}:${itemId}`).slice(0, 48)}`;
}

export function isValidBatchGeneratedImageUrl(value: unknown): value is string {
    return parseImageBatchStorageUrl(value) !== null;
}

export function normalizeImageBatchStoredMediaMetadata(value: unknown): {
    mimeType: string;
    sizeBytes: number;
} | null {
    if (!isPlainRecord(value)) return null;
    if (typeof value.mimeType !== 'string' || !IMAGE_BATCH_IMAGE_MIME_TYPES.has(value.mimeType)) return null;
    if (
        !Number.isSafeInteger(value.sizeBytes)
        || Number(value.sizeBytes) < 1
        || Number(value.sizeBytes) > IMAGE_BATCH_MAX_IMAGE_BYTES
    ) return null;
    return { mimeType: value.mimeType, sizeBytes: Number(value.sizeBytes) };
}

export function normalizeBatchGeneratedImages(
    value: unknown,
    storageScope?: ImageBatchStorageAssetScope,
): UserUploadedFileType[] | null {
    if (!Array.isArray(value) || value.length < 1 || value.length > IMAGE_BATCH_MAX_IMAGES_PER_ITEM) {
        return null;
    }

    const images: UserUploadedFileType[] = [];
    for (const entry of value) {
        const url = isPlainRecord(entry) && typeof entry.url === 'string' ? entry.url : '';
        if (
            !isPlainRecord(entry)
            || !url
            || !(storageScope
                ? isImageBatchGeneratedStorageAsset(url, storageScope)
                : isValidBatchGeneratedImageUrl(url))
        ) return null;
        if (typeof entry.name !== 'string' || entry.name.length < 1 || entry.name.length > 500) return null;
        const mimeType = entry.type;
        if (typeof mimeType !== 'string' || !IMAGE_BATCH_IMAGE_MIME_TYPES.has(mimeType)) return null;
        if (typeof entry.uid !== 'string' || entry.uid.length < 1 || entry.uid.length > 180) return null;
        if (
            typeof entry.size !== 'number'
            || !Number.isSafeInteger(entry.size)
            || entry.size < 1
            || entry.size > IMAGE_BATCH_MAX_IMAGE_BYTES
        ) return null;
        images.push({
            name: entry.name,
            size: entry.size,
            type: mimeType,
            uid: entry.uid,
            url,
        });
    }
    return images;
}

function normalizeStringArray(value: unknown, max: number, maxItemLength = 100): string[] | null {
    if (!Array.isArray(value) || value.length > max) return null;
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        if (typeof item !== 'string' || item.length < 1 || item.length > maxItemLength || seen.has(item)) return null;
        seen.add(item);
        result.push(item);
    }
    return result;
}

function normalizeDateLike(value: unknown): string | null {
    let date: Date;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'string' && value.length > 0 && value.length <= 100) {
        date = new Date(value);
    } else if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        date = new Date(value);
    } else if (value && typeof value === 'object') {
        const timestamp = value as { seconds?: unknown; toDate?: unknown; toMillis?: unknown };
        if (typeof timestamp.toDate === 'function') {
            const converted = (timestamp.toDate as () => unknown)();
            if (!(converted instanceof Date)) return null;
            date = converted;
        } else if (typeof timestamp.toMillis === 'function') {
            const milliseconds = (timestamp.toMillis as () => unknown)();
            if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds) || milliseconds < 0) return null;
            date = new Date(milliseconds);
        } else if (typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds) && timestamp.seconds >= 0) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            return null;
        }
    } else {
        return null;
    }
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeStatusHistory(
    value: unknown,
): BatchImageGenerationJobType['statusHistory'] | null {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 20) return null;
    const statusHistory: BatchImageGenerationJobType['statusHistory'] = [];
    for (const entry of value) {
        if (!isPlainRecord(entry) || !isImageBatchJobStatus(entry.status)) return null;
        if (entry.reason !== undefined && (typeof entry.reason !== 'string' || entry.reason.length > 240)) return null;
        const createdOn = normalizeDateLike(entry.createdOn);
        if (!createdOn) return null;
        statusHistory.push({
            createdOn,
            ...(typeof entry.reason === 'string' ? { reason: entry.reason } : {}),
            status: entry.status,
        });
    }
    return statusHistory;
}

function normalizeExecution(
    value: unknown,
    key: string,
    jobId: string,
    requestedItemIds: Set<string>,
    storageScope: ImageBatchStorageAssetScope,
): BatchImageItemExecution | null {
    if (!isPlainRecord(value)) return null;
    const itemId = typeof value.itemId === 'string' ? value.itemId : '';
    if (!requestedItemIds.has(itemId) || getImageBatchItemExecutionKey(itemId) !== key) return null;
    if (value.operationId !== getImageBatchOperationId(jobId, itemId)) return null;
    if (!Number.isSafeInteger(value.attemptCount) || Number(value.attemptCount) < 0 || Number(value.attemptCount) > IMAGE_BATCH_ITEM_MAX_ATTEMPTS) {
        return null;
    }
    if (typeof value.status !== 'string' || !IMAGE_BATCH_EXECUTION_STATUS_VALUES.has(value.status)) return null;
    let claimToken: string | undefined;
    if (value.claimToken !== undefined) {
        if (typeof value.claimToken !== 'string' || !UUID_PATTERN.test(value.claimToken)) return null;
        claimToken = value.claimToken;
    }
    if (value.leaseExpiresAtMs !== undefined && (!Number.isSafeInteger(value.leaseExpiresAtMs) || Number(value.leaseExpiresAtMs) < 0)) return null;
    let lastError: string | undefined;
    if (value.lastError !== undefined) {
        if (typeof value.lastError !== 'string' || value.lastError.length > 240) return null;
        lastError = value.lastError;
    }
    if (value.requiresFinalization !== undefined && typeof value.requiresFinalization !== 'boolean') return null;

    let stagedItem: BatchImageItemExecution['stagedItem'];
    if (value.stagedItem !== undefined) {
        if (!isPlainRecord(value.stagedItem) || value.stagedItem.id !== itemId) return null;
        if (typeof value.stagedItem.name !== 'string' || value.stagedItem.name.length < 1 || value.stagedItem.name.length > 500) return null;
        const images = normalizeBatchGeneratedImages(value.stagedItem.images, storageScope);
        if (!images) return null;
        stagedItem = { id: itemId, name: value.stagedItem.name, images };
    }

    let stagedAccountingInput: BatchImageItemExecution['stagedAccountingInput'];
    if (value.stagedAccountingInput !== undefined) {
        stagedAccountingInput = normalizeImageBatchAccountingInput(value.stagedAccountingInput) || undefined;
        if (!stagedAccountingInput) return null;
    }

    const stagedStoragePaths = value.stagedStoragePaths === undefined
        ? undefined
        : normalizeStringArray(value.stagedStoragePaths, IMAGE_BATCH_MAX_IMAGES_PER_ITEM, 500);
    if (value.stagedStoragePaths !== undefined && !stagedStoragePaths) return null;
    if ((stagedItem && !stagedAccountingInput) || (!stagedItem && stagedAccountingInput)) return null;
    if (stagedItem && (
        !stagedStoragePaths
        || stagedStoragePaths.length !== stagedItem.images.length
        || stagedStoragePaths.some((storagePath, index) => (
            !isImageBatchGeneratedStorageAsset(stagedItem.images[index].url, {
                ...storageScope,
                expectedStoragePath: storagePath,
            })
        ))
    )) return null;
    if (!stagedItem && stagedStoragePaths) return null;
    const hasStagedResult = Boolean(stagedItem && stagedAccountingInput);
    if (value.status === 'processing' && (!claimToken || value.leaseExpiresAtMs === undefined)) return null;
    if (value.status === 'staged' && !hasStagedResult) return null;
    if (value.status === 'retry_pending' && (claimToken || value.leaseExpiresAtMs !== undefined || hasStagedResult)) return null;
    if (['completed', 'failed'].includes(value.status) && (claimToken || value.leaseExpiresAtMs !== undefined || hasStagedResult)) return null;
    if (value.requiresFinalization === true && (!['processing', 'staged'].includes(value.status) || !hasStagedResult)) return null;

    return {
        attemptCount: Number(value.attemptCount),
        ...(claimToken ? { claimToken } : {}),
        itemId,
        ...(lastError ? { lastError } : {}),
        ...(value.leaseExpiresAtMs !== undefined ? { leaseExpiresAtMs: Number(value.leaseExpiresAtMs) } : {}),
        operationId: String(value.operationId),
        ...(value.requiresFinalization === true ? { requiresFinalization: true } : {}),
        ...(stagedAccountingInput ? { stagedAccountingInput } : {}),
        ...(stagedItem ? { stagedItem } : {}),
        ...(stagedStoragePaths ? { stagedStoragePaths } : {}),
        status: value.status as BatchImageItemExecution['status'],
    };
}

export function normalizePersistedImageBatchJob(
    value: unknown,
    id: unknown,
    options: { requireRequestedItems?: boolean } = {},
): BatchImageGenerationJobType | null {
    if (!isPlainRecord(value)) return null;
    const jobId = normalizeImageBatchJobId(id);
    const projectScope = normalizeImageBatchProjectId(value.projectId);
    if (!jobId || !projectScope || projectScope.projectId !== value.projectId) return null;
    const projectJobKey = value.projectJobKey === undefined
        ? undefined
        : normalizeImageBatchProjectJobKey(value.projectJobKey, projectScope.projectId, jobId);
    if (value.projectJobKey !== undefined && !projectJobKey) return null;
    if (!isImageBatchJobStatus(value.status)) return null;
    if (!Number.isSafeInteger(value.totalImages) || Number(value.totalImages) < 1 || Number(value.totalImages) > IMAGE_BATCH_MAX_ITEMS) return null;
    if (!Number.isSafeInteger(value.generatedCount) || Number(value.generatedCount) < 0 || Number(value.generatedCount) > Number(value.totalImages)) return null;
    const generationConfig = normalizeImageBatchGenerationConfig(value.generationConfig);
    if (!generationConfig) return null;
    const statusHistory = normalizeStatusHistory(value.statusHistory);
    if (!statusHistory) return null;
    if (value.error !== undefined && (typeof value.error !== 'string' || value.error.length > 500)) return null;
    if (value.selectedImagesPersisted !== undefined && typeof value.selectedImagesPersisted !== 'boolean') return null;
    if (value.hasStagedResults !== undefined && typeof value.hasStagedResults !== 'boolean') return null;
    const createdOn = value.createdOn === undefined ? undefined : normalizeDateLike(value.createdOn);
    const modifiedOn = value.modifiedOn === undefined ? undefined : normalizeDateLike(value.modifiedOn);
    if (value.createdOn !== undefined && !createdOn) return null;
    if (value.modifiedOn !== undefined && !modifiedOn) return null;

    const requestedItemIds = value.requestedItemIds === undefined
        ? []
        : normalizeStringArray(value.requestedItemIds, IMAGE_BATCH_MAX_ITEMS);
    if (!requestedItemIds) return null;
    if (options.requireRequestedItems && requestedItemIds.length !== Number(value.totalImages)) return null;
    const requestedSet = new Set(requestedItemIds);

    if (!Array.isArray(value.itemsList) || value.itemsList.length > Number(value.totalImages)) return null;
    const itemsList: BatchImageGenerationJobType['itemsList'] = [];
    const completedIds = new Set<string>();
    for (const item of value.itemsList) {
        if (!isPlainRecord(item) || typeof item.id !== 'string' || completedIds.has(item.id)) return null;
        if (options.requireRequestedItems && !requestedSet.has(item.id)) return null;
        if (typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 500) return null;
        const images = normalizeBatchGeneratedImages(item.images, {
            storeId: projectScope.storeId,
            tenantId: projectScope.tenantId,
        });
        if (!images) return null;
        completedIds.add(item.id);
        itemsList.push({ id: item.id, name: item.name, images });
    }
    if (Number(value.generatedCount) !== completedIds.size) return null;

    const failedItemIds = value.failedItemIds === undefined
        ? []
        : normalizeStringArray(value.failedItemIds, IMAGE_BATCH_MAX_ITEMS);
    const enqueueFailedItemIds = value.enqueueFailedItemIds === undefined
        ? []
        : normalizeStringArray(value.enqueueFailedItemIds, IMAGE_BATCH_MAX_ITEMS);
    if (!failedItemIds || !enqueueFailedItemIds) return null;
    if (failedItemIds.some((itemId) => !requestedSet.has(itemId) || completedIds.has(itemId))) return null;
    if (enqueueFailedItemIds.some((itemId) => !requestedSet.has(itemId))) return null;

    const itemExecutions: Record<string, BatchImageItemExecution> = {};
    if (value.itemExecutions !== undefined) {
        if (!isPlainRecord(value.itemExecutions) || Object.keys(value.itemExecutions).length > IMAGE_BATCH_MAX_ITEMS) return null;
        for (const [key, rawExecution] of Object.entries(value.itemExecutions)) {
            const execution = normalizeExecution(rawExecution, key, jobId, requestedSet, {
                storeId: projectScope.storeId,
                tenantId: projectScope.tenantId,
            });
            if (!execution) return null;
            itemExecutions[key] = execution;
        }
    }
    const hasStagedResults = Object.values(itemExecutions).some((execution) => Boolean(execution.stagedItem));
    if (value.hasStagedResults !== undefined && value.hasStagedResults !== hasStagedResults) return null;

    return {
        ...(createdOn ? { createdOn } : {}),
        ...(typeof value.error === 'string' ? { error: value.error } : {}),
        id: jobId,
        enqueueFailedItemIds,
        failedItemIds,
        generatedCount: completedIds.size,
        generationConfig,
        hasStagedResults,
        itemExecutions,
        itemsList,
        ...(modifiedOn ? { modifiedOn } : {}),
        projectId: projectScope.projectId,
        ...(projectJobKey ? { projectJobKey } : {}),
        requestedItemIds,
        ...(typeof value.selectedImagesPersisted === 'boolean'
            ? { selectedImagesPersisted: value.selectedImagesPersisted }
            : {}),
        status: value.status,
        statusHistory,
        totalImages: Number(value.totalImages),
    };
}
