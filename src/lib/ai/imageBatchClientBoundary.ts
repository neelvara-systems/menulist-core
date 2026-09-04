import {
    BATCH_IMAGE_GENERATION_JOB_STATUS,
    type BatchImageGenerationJobStatusType,
} from '@constant/AI';
import {
    normalizeImageBatchJobId,
    normalizeImageBatchProjectId,
    normalizeImageBatchProjectJobKey,
} from '@lib/ai/imageBatchIdBoundary';
import type { BatchImageGenerationJobType } from '@template/main-app/projects/types';
import type { UserUploadedFileType } from '@type/common';
import { isImageBatchGeneratedStorageAsset } from '@lib/ai/imageBatchStorageBoundary';
import { MEDIA_ACCEPTED_IMAGE_MIME_TYPES } from '@lib/media/imageProfiles';

const MAX_ITEMS = 50;
const MAX_IMAGES_PER_ITEM = 4;
const STATUS_VALUES = new Set<BatchImageGenerationJobStatusType>(
    Object.values(BATCH_IMAGE_GENERATION_JOB_STATUS),
);
const OWNER_VISIBLE_STATUS_VALUES = new Set<BatchImageGenerationJobStatusType>([
    BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
    BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
]);
const IMAGE_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);
const IMAGE_BATCH_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_BATCH_IMAGE_MIME_TYPES = new Set<string>(MEDIA_ACCEPTED_IMAGE_MIME_TYPES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExpectedImageBatchClientScope = {
    projectId?: unknown;
    storeId?: unknown;
    tenantId?: unknown;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function normalizeDateLike(value: unknown): string | null {
    try {
        let date: Date;
        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'string' || typeof value === 'number') {
            date = new Date(value);
        } else if (value && typeof value === 'object') {
            const timestamp = value as { seconds?: unknown; toDate?: unknown; toMillis?: unknown };
            if (typeof timestamp.toDate === 'function') {
                const converted = (timestamp.toDate as () => unknown)();
                if (!(converted instanceof Date)) return null;
                date = converted;
            } else if (typeof timestamp.toMillis === 'function') {
                const milliseconds = (timestamp.toMillis as () => unknown)();
                if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds)) return null;
                date = new Date(milliseconds);
            } else if (typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds)) {
                date = new Date(timestamp.seconds * 1_000);
            } else {
                return null;
            }
        } else {
            return null;
        }
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
}

function normalizeOptionalString(value: unknown, maximumLength: number): string | null | undefined {
    if (value === undefined || value === null) return undefined;
    return typeof value === 'string' && value.length <= maximumLength ? value : null;
}

function normalizeOptionalStringList(value: unknown): string[] | null | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.length > 20) return null;
    const normalized: string[] = [];
    for (const entry of value) {
        if (typeof entry !== 'string' || entry.length < 1 || entry.length > 100) return null;
        normalized.push(entry);
    }
    return normalized;
}

function normalizeStringArray(value: unknown): string[] | null {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > MAX_ITEMS) return null;
    const normalized: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
        if (typeof item !== 'string' || item.length < 1 || item.length > 100 || seen.has(item)) return null;
        seen.add(item);
        normalized.push(item);
    }
    return normalized;
}

function isValidStorageImageUrl(value: unknown): value is string {
    if (typeof value !== 'string' || value.length < 1 || value.length > 5_000) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.hostname === 'firebasestorage.googleapis.com'
            && url.pathname.startsWith('/v0/b/')
            && url.pathname.includes('/o/');
    } catch {
        return false;
    }
}

function isValidReferenceImageUrl(value: unknown): value is string {
    return isValidStorageImageUrl(value);
}

function normalizeReferenceImage(value: unknown): UserUploadedFileType | null | undefined {
    if (value === undefined || value === null) return value;
    if (!isPlainRecord(value) || !isValidReferenceImageUrl(value.url)) return undefined;

    const name = normalizeOptionalString(value.name, 255);
    const uid = normalizeOptionalString(value.uid, 160);
    const mediaId = normalizeOptionalString(value.mediaId, 160);
    if (name === null || uid === null || mediaId === null) return undefined;
    if (value.size !== undefined && (!Number.isSafeInteger(value.size) || Number(value.size) < 0 || Number(value.size) > 15 * 1024 * 1024)) return undefined;
    const type = value.type;
    if (typeof type !== 'string' || !/^image\/(jpeg|jpg|png|webp)$/i.test(type)) {
        return undefined;
    }

    return {
        ...(mediaId !== undefined ? { mediaId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(value.size !== undefined ? { size: Number(value.size) } : {}),
        type: type.toLowerCase().replace('image/jpg', 'image/jpeg'),
        ...(uid !== undefined ? { uid } : {}),
        url: value.url,
    };
}

export function normalizeImageBatchGenerationConfig(
    value: unknown,
): BatchImageGenerationJobType['generationConfig'] | null {
    if (!isPlainRecord(value)) return null;

    const result: BatchImageGenerationJobType['generationConfig'] = {};
    const backgroundColor = normalizeOptionalString(value.backgroundColor, 50);
    const foregroundColor = normalizeOptionalString(value.foregroundColor, 50);
    const negativePrompt = normalizeOptionalString(value.negativePrompt, 2_000);
    const prompt = normalizeOptionalString(value.prompt, 2_000);
    const stylesCategory = normalizeOptionalString(value.stylesCategory, 100);
    if (
        backgroundColor === null
        || foregroundColor === null
        || negativePrompt === null
        || prompt === null
        || stylesCategory === null
    ) return null;
    if (backgroundColor !== undefined) result.backgroundColor = backgroundColor;
    if (foregroundColor !== undefined) result.foregroundColor = foregroundColor;
    if (negativePrompt !== undefined) result.negativePrompt = negativePrompt;
    if (prompt !== undefined) result.prompt = prompt;
    if (stylesCategory !== undefined) result.stylesCategory = stylesCategory;

    for (const field of ['styles', 'environments', 'lighting', 'colors', 'moods', 'compositions', 'selectedImageTypes'] as const) {
        const normalized = normalizeOptionalStringList(value[field]);
        if (normalized === null) return null;
        if (field === 'selectedImageTypes' && normalized && normalized.length > MAX_IMAGES_PER_ITEM) return null;
        if (normalized !== undefined) result[field] = normalized;
    }

    if (value.aspectRatio !== undefined) {
        if (typeof value.aspectRatio !== 'string' || !IMAGE_ASPECT_RATIOS.has(value.aspectRatio)) return null;
        result.aspectRatio = value.aspectRatio;
    }
    for (const field of ['transparentBg', 'isMultiMode', 'agreeToTerms'] as const) {
        if (value[field] !== undefined) {
            if (typeof value[field] !== 'boolean') return null;
            result[field] = value[field];
        }
    }
    if (value.numberOfImages !== undefined) {
        if (!Number.isSafeInteger(value.numberOfImages) || Number(value.numberOfImages) < 1 || Number(value.numberOfImages) > 4) return null;
        result.numberOfImages = Number(value.numberOfImages);
    }
    if (value.referanceImage !== undefined) {
        const referenceImage = normalizeReferenceImage(value.referanceImage);
        if (referenceImage === undefined) return null;
        result.referanceImage = referenceImage;
    }
    if (value.subjectProfileId !== undefined) {
        const subjectProfileId = normalizeOptionalString(value.subjectProfileId, 160);
        if (subjectProfileId === null || (subjectProfileId !== undefined && subjectProfileId !== '' && !UUID_PATTERN.test(subjectProfileId))) return null;
        result.subjectProfileId = subjectProfileId || null;
    }
    if (value.subjectProfileVersion !== undefined) {
        if (value.subjectProfileVersion !== null && (!Number.isSafeInteger(value.subjectProfileVersion) || Number(value.subjectProfileVersion) < 1)) return null;
        result.subjectProfileVersion = value.subjectProfileVersion === null ? null : Number(value.subjectProfileVersion);
    }
    if (Boolean(result.subjectProfileId) !== Boolean(result.subjectProfileVersion)) return null;

    return result;
}

function getBatchImageSelectionKey(image: UserUploadedFileType): string | null {
    const uid = typeof image.uid === 'string' ? image.uid.trim() : '';
    if (uid) return `uid:${uid}`;

    const url = typeof image.url === 'string' ? image.url.trim() : '';
    return url ? `url:${url}` : null;
}

/**
 * Preserves local owner selection while a job listener delivers newer progress.
 * Images that did not exist in the previous snapshot are selected by default.
 */
export function mergeImageBatchSelectionState(
    previousJob: BatchImageGenerationJobType | null,
    incomingJob: BatchImageGenerationJobType,
): BatchImageGenerationJobType {
    if (!previousJob || previousJob.id !== incomingJob.id) {
        return {
            ...incomingJob,
            itemsList: incomingJob.itemsList.map((item) => ({
                ...item,
                images: item.images.map((image) => ({ ...image, isSelected: true })),
            })),
        };
    }

    const previousSelections = new Map<string, boolean>();
    previousJob.itemsList.forEach((item) => {
        item.images.forEach((image) => {
            const key = getBatchImageSelectionKey(image);
            if (key) previousSelections.set(`${item.id}:${key}`, image.isSelected !== false);
        });
    });

    return {
        ...incomingJob,
        itemsList: incomingJob.itemsList.map((item) => ({
            ...item,
            images: item.images.map((image) => {
                const key = getBatchImageSelectionKey(image);
                const previousSelection = key
                    ? previousSelections.get(`${item.id}:${key}`)
                    : undefined;
                return {
                    ...image,
                    isSelected: previousSelection ?? true,
                };
            }),
        })),
    };
}

export function normalizeImageBatchJobCreateInput(
    value: unknown,
): BatchImageGenerationJobType | null {
    if (!isPlainRecord(value)) return null;
    const projectScope = normalizeImageBatchProjectId(value.projectId);
    const generationConfig = normalizeImageBatchGenerationConfig(value.generationConfig);
    const requestedItemIds = normalizeStringArray(value.requestedItemIds);
    const statusHistory = normalizeStatusHistory(value.statusHistory);
    if (
        !projectScope
        || !generationConfig
        || !requestedItemIds
        || requestedItemIds.length < 1
        || !statusHistory
        || statusHistory.length !== 1
        || statusHistory[0].status !== BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED
        || value.status !== BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED
        || !Number.isSafeInteger(value.totalImages)
        || Number(value.totalImages) !== requestedItemIds.length
        || value.generatedCount !== 0
        || !Array.isArray(value.itemsList)
        || value.itemsList.length !== 0
        || !Array.isArray(value.failedItemIds)
        || value.failedItemIds.length !== 0
        || !Array.isArray(value.enqueueFailedItemIds)
        || value.enqueueFailedItemIds.length !== 0
        || !isPlainRecord(value.itemExecutions)
        || Object.keys(value.itemExecutions).length !== 0
    ) return null;

    return {
        enqueueFailedItemIds: [],
        failedItemIds: [],
        generatedCount: 0,
        generationConfig,
        itemExecutions: {},
        itemsList: [],
        projectId: projectScope.projectId,
        requestedItemIds,
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
        statusHistory,
        totalImages: requestedItemIds.length,
    };
}

function matchesExpectedScope(
    projectScope: NonNullable<ReturnType<typeof normalizeImageBatchProjectId>>,
    expectedScope?: ExpectedImageBatchClientScope,
): boolean {
    if (!expectedScope) return true;
    if (expectedScope.projectId !== undefined && expectedScope.projectId !== projectScope.projectId) return false;
    if (expectedScope.tenantId !== undefined && Number(expectedScope.tenantId) !== projectScope.tenantId) return false;
    if (expectedScope.storeId !== undefined && Number(expectedScope.storeId) !== projectScope.storeId) return false;
    return true;
}

function normalizeImages(
    value: unknown,
    projectScope: NonNullable<ReturnType<typeof normalizeImageBatchProjectId>>,
): UserUploadedFileType[] | null {
    if (!Array.isArray(value) || value.length < 1 || value.length > MAX_IMAGES_PER_ITEM) return null;
    const images: UserUploadedFileType[] = [];
    for (const image of value) {
        if (!isPlainRecord(image) || !isImageBatchGeneratedStorageAsset(image.url, {
            storeId: projectScope.storeId,
            tenantId: projectScope.tenantId,
        })) return null;
        if (typeof image.name !== 'string' || image.name.length < 1 || image.name.length > 500) return null;
        if (typeof image.type !== 'string' || !IMAGE_BATCH_IMAGE_MIME_TYPES.has(image.type)) return null;
        if (typeof image.uid !== 'string' || image.uid.length < 1 || image.uid.length > 180) return null;
        if (
            !Number.isSafeInteger(image.size)
            || Number(image.size) < 1
            || Number(image.size) > IMAGE_BATCH_MAX_IMAGE_BYTES
        ) return null;
        images.push({
            name: image.name,
            size: Number(image.size),
            type: image.type,
            uid: image.uid,
            url: image.url,
        });
    }
    return images;
}

export function toPersistedImageBatchProjectImage(
    image: UserUploadedFileType,
): UserUploadedFileType | null {
    const name = typeof image.name === 'string' ? image.name.trim() : '';
    const type = typeof image.type === 'string' ? image.type.trim().toLowerCase() : '';
    const uid = typeof image.uid === 'string' ? image.uid.trim() : '';
    const url = typeof image.url === 'string' ? image.url.trim() : '';
    if (
        !name
        || name.length > 500
        || !IMAGE_BATCH_IMAGE_MIME_TYPES.has(type)
        || !uid
        || uid.length > 180
        || !url
        || !Number.isSafeInteger(image.size)
        || Number(image.size) < 1
        || Number(image.size) > IMAGE_BATCH_MAX_IMAGE_BYTES
    ) return null;

    return {
        name,
        size: Number(image.size),
        type,
        uid,
        url,
    };
}

function normalizeStatusHistory(value: unknown): BatchImageGenerationJobType['statusHistory'] | null {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 20) return null;
    const result: BatchImageGenerationJobType['statusHistory'] = [];
    for (const entry of value) {
        if (!isPlainRecord(entry) || typeof entry.status !== 'string' || !STATUS_VALUES.has(entry.status as BatchImageGenerationJobStatusType)) return null;
        const createdOn = normalizeDateLike(entry.createdOn);
        if (!createdOn) return null;
        if (entry.reason !== undefined && (typeof entry.reason !== 'string' || entry.reason.length > 240)) return null;
        result.push({
            createdOn,
            ...(typeof entry.reason === 'string' ? { reason: entry.reason } : {}),
            status: entry.status as BatchImageGenerationJobStatusType,
        });
    }
    return result;
}

export function isImageBatchOwnerVisibleStatus(
    value: unknown,
): value is BatchImageGenerationJobStatusType {
    return typeof value === 'string'
        && OWNER_VISIBLE_STATUS_VALUES.has(value as BatchImageGenerationJobStatusType);
}

function getImageBatchJobSortTime(job: BatchImageGenerationJobType): number {
    const timestamps = [
        job.modifiedOn,
        job.createdOn,
        ...job.statusHistory.map((entry) => entry.createdOn),
    ].map((value) => {
        const normalized = normalizeDateLike(value);
        return normalized ? new Date(normalized).getTime() : 0;
    });

    return Math.max(0, ...timestamps);
}

/**
 * Keeps an older active job visible when a newer overlapping job has already
 * reached an owner-hidden terminal state. Overlap can occur across browser tabs,
 * so selecting the newest row before filtering is not a safe projection.
 */
export function selectLatestOwnerVisibleImageBatchJob(
    jobs: BatchImageGenerationJobType[],
): BatchImageGenerationJobType | null {
    return [...jobs]
        .filter((job) => isImageBatchOwnerVisibleStatus(job.status))
        .sort((left, right) => getImageBatchJobSortTime(right) - getImageBatchJobSortTime(left))[0]
        || null;
}

export function shouldApplyImageBatchListenerSnapshot(
    source: 'legacy' | 'primary',
    primaryHasJob: boolean,
): boolean {
    return source === 'primary' || !primaryHasJob;
}

export function shouldIgnoreImageBatchListenerAuthTeardown(
    errorCode: string | undefined,
    firebaseUserPresent: boolean,
): boolean {
    return errorCode === 'permission-denied' && !firebaseUserPresent;
}

export function isAllowedImageBatchOwnerTransition(
    currentStatus: unknown,
    nextStatus: unknown,
): boolean {
    if (
        typeof currentStatus !== 'string'
        || typeof nextStatus !== 'string'
        || !STATUS_VALUES.has(currentStatus as BatchImageGenerationJobStatusType)
        || !STATUS_VALUES.has(nextStatus as BatchImageGenerationJobStatusType)
    ) return false;

    if (nextStatus === BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED) {
        return [
            BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
            BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
            BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
        ].includes(currentStatus as BatchImageGenerationJobStatusType);
    }

    return [
        BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
        BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
    ].includes(nextStatus as BatchImageGenerationJobStatusType)
        && [
            BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
            BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
        ].includes(currentStatus as BatchImageGenerationJobStatusType);
}

export function isImageBatchOwnerOutcomeAlreadyCommitted(
    currentJob: Pick<BatchImageGenerationJobType, 'selectedImagesPersisted' | 'status'>,
    nextStatus: BatchImageGenerationJobStatusType,
    selectedImagesPersisted: boolean,
): boolean {
    return currentJob.status === nextStatus
        && currentJob.selectedImagesPersisted === selectedImagesPersisted;
}

export function normalizeImageBatchJobForClient(
    value: unknown,
    id: unknown,
    expectedScope?: ExpectedImageBatchClientScope,
): BatchImageGenerationJobType | null {
    if (!isPlainRecord(value)) return null;
    const jobId = normalizeImageBatchJobId(id);
    const projectScope = normalizeImageBatchProjectId(value.projectId);
    if (!jobId || !projectScope || projectScope.projectId !== value.projectId || !matchesExpectedScope(projectScope, expectedScope)) return null;
    if (typeof value.status !== 'string' || !STATUS_VALUES.has(value.status as BatchImageGenerationJobStatusType)) return null;
    if (!Number.isSafeInteger(value.totalImages) || Number(value.totalImages) < 1 || Number(value.totalImages) > MAX_ITEMS) return null;
    if (!Number.isSafeInteger(value.generatedCount) || Number(value.generatedCount) < 0 || Number(value.generatedCount) > Number(value.totalImages)) return null;
    const generationConfig = normalizeImageBatchGenerationConfig(value.generationConfig);
    if (!generationConfig) return null;

    const requestedItemIds = normalizeStringArray(value.requestedItemIds);
    const failedItemIds = normalizeStringArray(value.failedItemIds);
    const enqueueFailedItemIds = normalizeStringArray(value.enqueueFailedItemIds);
    const statusHistory = normalizeStatusHistory(value.statusHistory);
    if (!requestedItemIds || !failedItemIds || !enqueueFailedItemIds || !statusHistory) return null;
    if (requestedItemIds.length !== Number(value.totalImages)) return null;
    const requestedSet = new Set(requestedItemIds);

    if (!Array.isArray(value.itemsList) || value.itemsList.length > Number(value.totalImages)) return null;
    const itemsList: BatchImageGenerationJobType['itemsList'] = [];
    const completedIds = new Set<string>();
    for (const item of value.itemsList) {
        if (!isPlainRecord(item) || typeof item.id !== 'string' || completedIds.has(item.id)) return null;
        if (requestedSet.size > 0 && !requestedSet.has(item.id)) return null;
        if (typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 500) return null;
        const images = normalizeImages(item.images, projectScope);
        if (!images) return null;
        completedIds.add(item.id);
        itemsList.push({ id: item.id, images, name: item.name });
    }
    if (completedIds.size !== Number(value.generatedCount)) return null;
    if (failedItemIds.some((itemId) => completedIds.has(itemId) || (requestedSet.size > 0 && !requestedSet.has(itemId)))) return null;
    if (enqueueFailedItemIds.some((itemId) => requestedSet.size > 0 && !requestedSet.has(itemId))) return null;
    if (completedIds.size + failedItemIds.length > Number(value.totalImages)) return null;

    const status = value.status as BatchImageGenerationJobStatusType;
    if (status === BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED && (completedIds.size > 0 || failedItemIds.length > 0)) return null;
    if (status === BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED && (completedIds.size !== Number(value.totalImages) || failedItemIds.length > 0)) return null;
    if (value.error !== undefined && (typeof value.error !== 'string' || value.error.length > 500)) return null;
    if (value.selectedImagesPersisted !== undefined && typeof value.selectedImagesPersisted !== 'boolean') return null;
    if (value.hasStagedResults !== undefined && typeof value.hasStagedResults !== 'boolean') return null;

    const createdOn = value.createdOn === undefined ? undefined : normalizeDateLike(value.createdOn);
    const modifiedOn = value.modifiedOn === undefined ? undefined : normalizeDateLike(value.modifiedOn);
    if (value.createdOn !== undefined && !createdOn) return null;
    if (value.modifiedOn !== undefined && !modifiedOn) return null;
    const projectJobKey = value.projectJobKey === undefined
        ? undefined
        : normalizeImageBatchProjectJobKey(value.projectJobKey, projectScope.projectId, jobId);
    if (value.projectJobKey !== undefined && !projectJobKey) return null;

    return {
        ...(createdOn ? { createdOn } : {}),
        enqueueFailedItemIds,
        ...(typeof value.error === 'string' ? { error: value.error } : {}),
        failedItemIds,
        generatedCount: completedIds.size,
        generationConfig,
        ...(typeof value.hasStagedResults === 'boolean' ? { hasStagedResults: value.hasStagedResults } : {}),
        id: jobId,
        itemExecutions: {},
        itemsList,
        ...(modifiedOn ? { modifiedOn } : {}),
        projectId: projectScope.projectId,
        ...(projectJobKey ? { projectJobKey } : {}),
        requestedItemIds,
        ...(typeof value.selectedImagesPersisted === 'boolean'
            ? { selectedImagesPersisted: value.selectedImagesPersisted }
            : {}),
        status,
        statusHistory,
        totalImages: Number(value.totalImages),
    };
}
