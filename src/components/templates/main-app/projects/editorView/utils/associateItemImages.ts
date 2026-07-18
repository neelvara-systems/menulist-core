import { uploadFile } from '@database/projects';
import type { ItemForDropdown, Project } from '../../types';
import type { UserUploadedFileType } from '@type/common';
import { isDataUrl } from '@lib/media/mediaStorage';
import { removeObjRef } from '@util/utils';

function normalizeItemImages(images: unknown): UserUploadedFileType[] {
    return Array.isArray(images) ? images : [];
}

export async function associateItemImagesWithProject(
    projectData: Project,
    selectedItem: ItemForDropdown,
    imagesToUpload: UserUploadedFileType[],
): Promise<Project | null> {
    const updatedProjectData: Project = removeObjRef(projectData);
    let itemUpdated = false;

    for (const imageData of imagesToUpload) {
        if (isDataUrl(imageData.url)) {
            const uploadedUrl = await uploadFile(
                {
                    blob: imageData.blob,
                    mediaChecksum: imageData.mediaChecksum,
                    mediaId: imageData.mediaId,
                    mediaProfile: imageData.mediaProfile || 'menuItem',
                    mediaVariant: imageData.mediaVariant,
                    mediaVersion: imageData.mediaVersion,
                    preparedMedia: imageData.preparedMedia,
                    url: imageData.url,
                    type: imageData.type,
                    uid: `${selectedItem.id}-${imageData.uid}`,
                },
                'itemImages',
            );
            imageData.url = uploadedUrl;
        }
    }

    if (updatedProjectData?.files) {
        for (const file of updatedProjectData.files) {
            const itemsList = file.extractedData?.data?.items || [];
            if (!itemsList.length) continue;

            for (const item of itemsList) {
                if (item.id === selectedItem.id) {
                    item.images = [...normalizeItemImages(item.images), ...imagesToUpload];
                    itemUpdated = true;
                    break;
                }
            }

            if (itemUpdated) break;
        }
    }

    return itemUpdated ? updatedProjectData : null;
}
