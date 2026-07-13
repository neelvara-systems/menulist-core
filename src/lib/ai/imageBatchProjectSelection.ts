import { normalizeImageBatchProjectId } from '@lib/ai/imageBatchIdBoundary';
import { isImageBatchGeneratedStorageAsset } from '@lib/ai/imageBatchStorageBoundary';
import { MEDIA_ACCEPTED_IMAGE_MIME_TYPES } from '@lib/media/imageProfiles';
import type { Project } from '@template/main-app/projects/types';
import type { UserUploadedFileType } from '@type/common';

export const IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS = 50;
export const IMAGE_BATCH_PROJECT_SELECTION_MAX_IMAGES_PER_ITEM = 4;
export const IMAGE_BATCH_PROJECT_MAX_IMAGES_PER_ITEM = 20;
const IMAGE_BATCH_PROJECT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const DANGEROUS_RECORD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ACCEPTED_IMAGE_MIME_TYPES = new Set<string>(MEDIA_ACCEPTED_IMAGE_MIME_TYPES);

export type ImageBatchProjectSelection = {
    itemId: string;
    images: UserUploadedFileType[];
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function normalizeSelectedImage(
    value: unknown,
    scope: NonNullable<ReturnType<typeof normalizeImageBatchProjectId>>,
    expectedBucket?: string,
): UserUploadedFileType | null {
    if (!isPlainRecord(value)) return null;
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const type = typeof value.type === 'string' ? value.type.trim().toLowerCase() : '';
    const uid = typeof value.uid === 'string' ? value.uid.trim() : '';
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    const size = Number(value.size);
    if (
        !name
        || name.length > 500
        || !ACCEPTED_IMAGE_MIME_TYPES.has(type)
        || !uid
        || uid.length > 180
        || !Number.isSafeInteger(size)
        || size < 1
        || size > IMAGE_BATCH_PROJECT_IMAGE_MAX_BYTES
        || !isImageBatchGeneratedStorageAsset(url, {
            expectedBucket,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        })
    ) return null;

    return { name, size, type, uid, url };
}

export function normalizeImageBatchProjectSelections(
    value: unknown,
    projectId: unknown,
    expectedBucket?: string,
): ImageBatchProjectSelection[] | null {
    const scope = normalizeImageBatchProjectId(projectId);
    if (
        !scope
        || !Array.isArray(value)
        || value.length < 1
        || value.length > IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS
    ) return null;

    const seenItemIds = new Set<string>();
    const selections: ImageBatchProjectSelection[] = [];
    for (const entry of value) {
        if (!isPlainRecord(entry)) return null;
        const itemId = typeof entry.itemId === 'string' ? entry.itemId.trim() : '';
        if (
            !itemId
            || itemId !== entry.itemId
            || itemId.length > 100
            || itemId.includes('/')
            || DANGEROUS_RECORD_KEYS.has(itemId)
            || seenItemIds.has(itemId)
            || !Array.isArray(entry.images)
            || entry.images.length < 1
            || entry.images.length > IMAGE_BATCH_PROJECT_SELECTION_MAX_IMAGES_PER_ITEM
        ) return null;

        const images = entry.images.map((image) => normalizeSelectedImage(image, scope, expectedBucket));
        if (images.some((image) => image === null)) return null;
        seenItemIds.add(itemId);
        selections.push({ itemId, images: images as UserUploadedFileType[] });
    }
    return selections;
}

function appendUniqueImages(
    currentValue: unknown,
    selectedImages: UserUploadedFileType[],
): UserUploadedFileType[] {
    const currentImages = Array.isArray(currentValue) ? currentValue as UserUploadedFileType[] : [];
    const nextImages = [...currentImages];
    const knownUrls = new Set(currentImages
        .map((image) => typeof image?.url === 'string' ? image.url.trim() : '')
        .filter(Boolean));
    for (const image of selectedImages) {
        const url = image.url as string;
        if (knownUrls.has(url)) continue;
        knownUrls.add(url);
        nextImages.push({ ...image });
    }
    if (nextImages.length > IMAGE_BATCH_PROJECT_MAX_IMAGES_PER_ITEM) {
        throw new Error('image_batch_project_item_image_limit_exceeded');
    }
    return nextImages;
}

function appendSelectionsToFiles(
    filesValue: unknown,
    selectionsByItemId: ReadonlyMap<string, UserUploadedFileType[]>,
): { files: Project['files']; matchedItemIds: Set<string> } {
    const matchedItemIds = new Set<string>();
    const files = (Array.isArray(filesValue) ? filesValue : []).map((file) => {
        const data = file?.extractedData?.data;
        const items = Array.isArray(data?.items) ? data.items : [];
        let changed = false;
        const nextItems = items.map((item) => {
            const itemId = typeof item?.id === 'string' ? item.id : String(item?.id ?? '');
            const images = selectionsByItemId.get(itemId);
            if (!images) return item;
            changed = true;
            matchedItemIds.add(itemId);
            return { ...item, images: appendUniqueImages(item.images, images) };
        });
        if (!changed) return file;
        return {
            ...file,
            extractedData: {
                ...file.extractedData,
                data: { ...data, items: nextItems },
            },
        };
    }) as Project['files'];
    return { files, matchedItemIds };
}

function assertEverySelectionMatched(
    selectionsByItemId: ReadonlyMap<string, UserUploadedFileType[]>,
    matchedItemIds: ReadonlySet<string>,
): void {
    for (const itemId of Array.from(selectionsByItemId.keys())) {
        if (!matchedItemIds.has(itemId)) throw new Error('image_batch_project_item_missing');
    }
}

export function appendImageBatchSelectionsToProject(
    project: Project,
    selections: ImageBatchProjectSelection[],
): Project {
    const selectionsByItemId = new Map(selections.map((selection) => [selection.itemId, selection.images]));
    const result = appendSelectionsToFiles(project.files, selectionsByItemId);
    assertEverySelectionMatched(selectionsByItemId, result.matchedItemIds);
    return { ...project, files: result.files };
}

export function appendImageBatchSelectionsToOutletProject(
    outletProject: Project,
    masterProject: Project,
    selections: ImageBatchProjectSelection[],
): Project {
    const selectionsByItemId = new Map(selections.map((selection) => [selection.itemId, selection.images]));
    const localResult = appendSelectionsToFiles(outletProject.files, selectionsByItemId);
    const matchedItemIds = new Set(localResult.matchedItemIds);
    const nextItemOverrides = { ...(outletProject.overrides?.items || {}) };

    const masterItems = new Map<string, any>();
    (masterProject.files || []).forEach((file) => {
        (file.extractedData?.data?.items || []).forEach((item) => {
            if (item?.id !== undefined && item?.id !== null) masterItems.set(String(item.id), item);
        });
    });

    for (const [itemId, selectedImages] of Array.from(selectionsByItemId.entries())) {
        if (matchedItemIds.has(itemId)) continue;
        const masterItem = masterItems.get(itemId);
        if (!masterItem) continue;
        const currentOverride = nextItemOverrides[itemId] || {};
        const currentImages = Array.isArray(currentOverride.images)
            ? currentOverride.images
            : masterItem.images;
        nextItemOverrides[itemId] = {
            ...currentOverride,
            images: appendUniqueImages(currentImages, selectedImages),
        };
        matchedItemIds.add(itemId);
    }

    assertEverySelectionMatched(selectionsByItemId, matchedItemIds);
    return {
        ...outletProject,
        files: localResult.files,
        overrides: {
            ...(outletProject.overrides || {}),
            items: nextItemOverrides,
            categories: outletProject.overrides?.categories || {},
            attributes: outletProject.overrides?.attributes || {},
        },
    };
}
