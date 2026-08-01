import { normalizeImageBatchProjectId } from '@lib/ai/imageBatchIdBoundary';
import { isImageBatchGeneratedStorageAsset } from '@lib/ai/imageBatchStorageBoundary';
import { MENU_ITEM_MAX_IMAGES } from '@lib/media/itemImageAssociationBoundary';
import { MEDIA_ACCEPTED_IMAGE_MIME_TYPES } from '@lib/media/imageProfiles';
import type { Project } from '@template/main-app/projects/types';
import type { UserUploadedFileType } from '@type/common';

export const IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS = 50;
export const IMAGE_BATCH_PROJECT_SELECTION_MAX_IMAGES_PER_ITEM = 4;
export const IMAGE_BATCH_PROJECT_MAX_IMAGES_PER_ITEM = MENU_ITEM_MAX_IMAGES;
const IMAGE_BATCH_PROJECT_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const DANGEROUS_RECORD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ACCEPTED_IMAGE_MIME_TYPES = new Set<string>(MEDIA_ACCEPTED_IMAGE_MIME_TYPES);

export type ImageBatchProjectSelection = {
    itemId: string;
    images: UserUploadedFileType[];
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    } catch {
        return false;
    }
}

function readOwnValue(record: Record<string, unknown>, key: string): unknown {
    try {
        return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
    } catch {
        return undefined;
    }
}

function snapshotBoundedArray(value: unknown, maxItems: number): unknown[] | null {
    try {
        if (!Array.isArray(value) || value.length > maxItems) return null;
        return Array.from(value);
    } catch {
        return null;
    }
}

function normalizeImageByteSize(value: unknown): number | null {
    const normalized = typeof value === 'number'
        ? value
        : typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value)
            ? Number(value)
            : Number.NaN;
    return Number.isSafeInteger(normalized) ? normalized : null;
}

function normalizeSelectedImage(
    value: unknown,
    scope: NonNullable<ReturnType<typeof normalizeImageBatchProjectId>>,
    expectedBucket?: string,
): UserUploadedFileType | null {
    if (!isPlainRecord(value)) return null;
    const rawName = readOwnValue(value, 'name');
    const rawType = readOwnValue(value, 'type');
    const rawUid = readOwnValue(value, 'uid');
    const rawUrl = readOwnValue(value, 'url');
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const type = typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';
    const uid = typeof rawUid === 'string' ? rawUid.trim() : '';
    const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    const size = normalizeImageByteSize(readOwnValue(value, 'size'));
    if (
        !name
        || name.length > 500
        || !ACCEPTED_IMAGE_MIME_TYPES.has(type)
        || !uid
        || uid.length > 180
        || size === null
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
    const entries = snapshotBoundedArray(value, IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS);
    if (
        !scope
        || !entries
        || entries.length < 1
    ) return null;

    const seenItemIds = new Set<string>();
    const selections: ImageBatchProjectSelection[] = [];
    for (const entry of entries) {
        if (!isPlainRecord(entry)) return null;
        const rawItemId = readOwnValue(entry, 'itemId');
        const itemId = typeof rawItemId === 'string' ? rawItemId.trim() : '';
        const imagesInput = snapshotBoundedArray(
            readOwnValue(entry, 'images'),
            IMAGE_BATCH_PROJECT_SELECTION_MAX_IMAGES_PER_ITEM,
        );
        if (
            !itemId
            || itemId !== rawItemId
            || itemId.length > 100
            || itemId.includes('/')
            || DANGEROUS_RECORD_KEYS.has(itemId)
            || seenItemIds.has(itemId)
            || !imagesInput
            || imagesInput.length < 1
        ) return null;

        const images = imagesInput.map((image) => normalizeSelectedImage(image, scope, expectedBucket));
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
    filesValue: Project['files'],
    selectionsByItemId: ReadonlyMap<string, UserUploadedFileType[]>,
): { files: Project['files']; matchedItemCounts: Map<string, number> } {
    const matchedItemCounts = new Map<string, number>();
    const files = (filesValue || []).map((file) => {
        const data = file?.extractedData?.data;
        const items = Array.isArray(data?.items) ? data.items : [];
        let changed = false;
        const nextItems = items.map((item) => {
            const itemId = typeof item?.id === 'string' ? item.id : String(item?.id ?? '');
            const images = selectionsByItemId.get(itemId);
            if (!images) return item;
            changed = true;
            matchedItemCounts.set(itemId, (matchedItemCounts.get(itemId) || 0) + 1);
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
    return { files, matchedItemCounts };
}

function assertEverySelectionMatchedExactlyOnce(
    selectionsByItemId: ReadonlyMap<string, UserUploadedFileType[]>,
    matchedItemCounts: ReadonlyMap<string, number>,
): void {
    for (const itemId of Array.from(selectionsByItemId.keys())) {
        const matchCount = matchedItemCounts.get(itemId) || 0;
        if (matchCount === 0) throw new Error('image_batch_project_item_missing');
        if (matchCount !== 1) throw new Error('image_batch_project_item_ambiguous');
    }
}

export function appendImageBatchSelectionsToProject(
    project: Project,
    selections: ImageBatchProjectSelection[],
): Project {
    const selectionsByItemId = new Map(selections.map((selection) => [selection.itemId, selection.images]));
    const result = appendSelectionsToFiles(project.files, selectionsByItemId);
    assertEverySelectionMatchedExactlyOnce(selectionsByItemId, result.matchedItemCounts);
    return { ...project, files: result.files };
}

export function appendImageBatchSelectionsToOutletProject(
    outletProject: Project,
    masterProject: Project,
    selections: ImageBatchProjectSelection[],
): Project {
    const selectionsByItemId = new Map(selections.map((selection) => [selection.itemId, selection.images]));
    const localResult = appendSelectionsToFiles(outletProject.files, selectionsByItemId);
    const matchedItemCounts = new Map(localResult.matchedItemCounts);
    const nextItemOverrides = { ...(outletProject.overrides?.items || {}) };

    const masterItems = new Map<string, any>();
    const ambiguousMasterItemIds = new Set<string>();
    (masterProject.files || []).forEach((file) => {
        (file.extractedData?.data?.items || []).forEach((item) => {
            if (item?.id === undefined || item?.id === null) return;
            const itemId = String(item.id);
            if (masterItems.has(itemId)) {
                ambiguousMasterItemIds.add(itemId);
                return;
            }
            masterItems.set(itemId, item);
        });
    });

    for (const [itemId, selectedImages] of Array.from(selectionsByItemId.entries())) {
        if ((matchedItemCounts.get(itemId) || 0) > 0) continue;
        if (ambiguousMasterItemIds.has(itemId)) {
            matchedItemCounts.set(itemId, 2);
            continue;
        }
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
        matchedItemCounts.set(itemId, 1);
    }

    assertEverySelectionMatchedExactlyOnce(selectionsByItemId, matchedItemCounts);
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
