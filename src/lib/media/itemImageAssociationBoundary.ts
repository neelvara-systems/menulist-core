import type { ItemForDropdown, Project } from '@template/main-app/projects/types';
import type { UserUploadedFileType } from '@type/common';

export const MENU_ITEM_MAX_IMAGES = 20;

type ItemImageTarget = Pick<Partial<ItemForDropdown>, 'fileId' | 'id'>;

function normalizeRequiredIdentity(value: unknown): string | null {
    if (typeof value !== 'string' || !value || value.trim() !== value) return null;
    return value;
}

export function buildItemImageTargetValue(target: ItemImageTarget): string | null {
    const fileId = normalizeRequiredIdentity(target.fileId);
    const itemId = normalizeRequiredIdentity(target.id);
    return fileId && itemId ? JSON.stringify([fileId, itemId]) : null;
}

export function parseItemImageTargetValue(value: unknown): { fileId: string; id: string } | null {
    if (typeof value !== 'string' || value.length > 500) return null;
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.length !== 2) return null;
        const fileId = normalizeRequiredIdentity(parsed[0]);
        const itemId = normalizeRequiredIdentity(parsed[1]);
        return fileId && itemId ? { fileId, id: itemId } : null;
    } catch {
        return null;
    }
}

export function resolveUniqueItemImageTarget(
    items: readonly ItemForDropdown[],
    target: ItemImageTarget,
): ItemForDropdown | null {
    const itemId = normalizeRequiredIdentity(target.id);
    if (!itemId) return null;
    const fileId = target.fileId === undefined
        ? null
        : normalizeRequiredIdentity(target.fileId);
    if (target.fileId !== undefined && !fileId) return null;

    const matches = items.filter((item) => (
        item.id === itemId
        && (fileId === null || item.fileId === fileId)
    ));
    return matches.length === 1 ? matches[0] : null;
}

export function buildItemImageEditorTarget(
    projectData: Project,
    target: ItemImageTarget,
): ItemForDropdown | null {
    const fileId = normalizeRequiredIdentity(target.fileId);
    const itemId = normalizeRequiredIdentity(target.id);
    if (!fileId || !itemId) return null;

    const matchingFiles = (projectData.files || []).filter((file) => file.uid === fileId);
    if (matchingFiles.length !== 1) return null;
    const file = matchingFiles[0];
    const matchingItems = file.extractedData?.data?.items
        ?.filter((item) => item.id === itemId) || [];
    if (matchingItems.length !== 1) return null;

    const item = matchingItems[0];
    const language = projectData.languages?.[0] || 'en';
    const categoryName = file.extractedData?.data?.categories
        ?.find((category) => category.id === item.category)
        ?.name?.[language] || 'Uncategorized';

    return {
        ...item,
        attributesList: Array.isArray(item.attributes)
            ? item.attributes.map((attribute) => attribute.name?.[language] || attribute.id || '')
            : [],
        categoryName,
        descriptionLine: item.description?.[language] || '',
        fileId,
        itemName: item.name?.[language] || item.id,
    };
}

export function toPersistedItemImage(
    image: UserUploadedFileType,
    uploadedUrl: string,
): UserUploadedFileType | null {
    if (!uploadedUrl || uploadedUrl.trim() !== uploadedUrl || /^data:/i.test(uploadedUrl)) {
        return null;
    }

    return {
        ...(typeof image.name === 'string' ? { name: image.name } : {}),
        ...(typeof image.size === 'number' ? { size: image.size } : {}),
        ...(typeof image.type === 'string' || image.type === null ? { type: image.type } : {}),
        ...(typeof image.uid === 'string' ? { uid: image.uid } : {}),
        url: uploadedUrl,
    };
}

export function appendItemImagesToProject(
    projectData: Project,
    selectedItem: Pick<ItemForDropdown, 'fileId' | 'id'>,
    uploadedImages: readonly UserUploadedFileType[],
): Project | null {
    const fileId = normalizeRequiredIdentity(selectedItem.fileId);
    const itemId = normalizeRequiredIdentity(selectedItem.id);
    if (!fileId || !itemId || uploadedImages.length < 1) return null;

    const matchingFiles = (projectData.files || []).filter((file) => file.uid === fileId);
    if (matchingFiles.length !== 1) return null;
    const matchingItems = matchingFiles[0].extractedData?.data?.items
        ?.filter((item) => item.id === itemId) || [];
    if (matchingItems.length !== 1) return null;

    const currentImages = Array.isArray(matchingItems[0].images) ? matchingItems[0].images : [];
    if (currentImages.length + uploadedImages.length > MENU_ITEM_MAX_IMAGES) return null;

    return {
        ...projectData,
        files: (projectData.files || []).map((file) => {
            const extractedData = file.extractedData;
            if (file.uid !== fileId || !extractedData?.data?.items) return file;
            return {
                ...file,
                extractedData: {
                    ...extractedData,
                    data: {
                        ...extractedData.data,
                        items: extractedData.data.items.map((item) => (
                            item.id === itemId
                                ? { ...item, images: [...currentImages, ...uploadedImages] }
                                : item
                        )),
                    },
                },
            };
        }),
    };
}

export function removeItemImageFromProject(
    projectData: Project,
    selectedItem: Pick<ItemForDropdown, 'fileId' | 'id'>,
    imageUrl: unknown,
): Project | null {
    const fileId = normalizeRequiredIdentity(selectedItem.fileId);
    const itemId = normalizeRequiredIdentity(selectedItem.id);
    const normalizedImageUrl = normalizeRequiredIdentity(imageUrl);
    if (!fileId || !itemId || !normalizedImageUrl) return null;

    const matchingFiles = (projectData.files || []).filter((file) => file.uid === fileId);
    if (matchingFiles.length !== 1) return null;
    const matchingItems = matchingFiles[0].extractedData?.data?.items
        ?.filter((item) => item.id === itemId) || [];
    if (matchingItems.length !== 1 || !Array.isArray(matchingItems[0].images)) return null;

    const imageIndex = matchingItems[0].images.findIndex((image) => image.url === normalizedImageUrl);
    if (imageIndex < 0) return null;
    const nextImages = matchingItems[0].images.filter((_, index) => index !== imageIndex);

    return {
        ...projectData,
        files: (projectData.files || []).map((file) => {
            const extractedData = file.extractedData;
            if (file.uid !== fileId || !extractedData?.data?.items) return file;
            return {
                ...file,
                extractedData: {
                    ...extractedData,
                    data: {
                        ...extractedData.data,
                        items: extractedData.data.items.map((item) => (
                            item.id === itemId
                                ? { ...item, images: nextImages }
                                : item
                        )),
                    },
                },
            };
        }),
    };
}

export function getItemImagesSnapshot(
    projectData: Project,
    selectedItem: Pick<ItemForDropdown, 'fileId' | 'id'>,
): string | null {
    const fileId = normalizeRequiredIdentity(selectedItem.fileId);
    const itemId = normalizeRequiredIdentity(selectedItem.id);
    if (!fileId || !itemId) return null;

    const matchingFiles = (projectData.files || []).filter((file) => file.uid === fileId);
    if (matchingFiles.length !== 1) return null;
    const matchingItems = matchingFiles[0].extractedData?.data?.items
        ?.filter((item) => item.id === itemId) || [];
    if (matchingItems.length !== 1) return null;

    return JSON.stringify(Array.isArray(matchingItems[0].images) ? matchingItems[0].images : []);
}

export function replaceItemImagesInProject(
    projectData: Project,
    selectedItem: Pick<ItemForDropdown, 'fileId' | 'id'>,
    uploadedImages: readonly UserUploadedFileType[],
    expectedCurrentImagesSnapshot?: string,
): Project | null {
    const fileId = normalizeRequiredIdentity(selectedItem.fileId);
    const itemId = normalizeRequiredIdentity(selectedItem.id);
    if (!fileId || !itemId || uploadedImages.length > MENU_ITEM_MAX_IMAGES) return null;

    const currentImagesSnapshot = getItemImagesSnapshot(projectData, selectedItem);
    if (
        currentImagesSnapshot === null
        || (
            expectedCurrentImagesSnapshot !== undefined
            && currentImagesSnapshot !== expectedCurrentImagesSnapshot
        )
    ) {
        return null;
    }

    return {
        ...projectData,
        files: (projectData.files || []).map((file) => {
            const extractedData = file.extractedData;
            if (file.uid !== fileId || !extractedData?.data?.items) return file;
            return {
                ...file,
                extractedData: {
                    ...extractedData,
                    data: {
                        ...extractedData.data,
                        items: extractedData.data.items.map((item) => (
                            item.id === itemId
                                ? { ...item, images: [...uploadedImages] }
                                : item
                        )),
                    },
                },
            };
        }),
    };
}
