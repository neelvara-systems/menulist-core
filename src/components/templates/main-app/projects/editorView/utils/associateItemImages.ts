import { uploadFile } from '@database/projects';
import type { ItemForDropdown, Project } from '../../types';
import type { UserUploadedFileType } from '@type/common';
import {
    appendItemImagesToProject,
    toPersistedItemImage,
} from '@lib/media/itemImageAssociationBoundary';
import { isDataUrl } from '@lib/media/mediaStorage';

export async function associateItemImagesWithProject(
    projectData: Project,
    selectedItem: ItemForDropdown,
    imagesToUpload: UserUploadedFileType[],
): Promise<Project | null> {
    // Reject an ambiguous/missing target and an over-limit result before any
    // immutable Storage object is created.
    if (!appendItemImagesToProject(projectData, selectedItem, imagesToUpload)) {
        return null;
    }

    const uploadedImages: UserUploadedFileType[] = [];

    for (const imageData of imagesToUpload) {
        let uploadedUrl = imageData.url || '';
        if (isDataUrl(imageData.url)) {
            uploadedUrl = await uploadFile(
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
        }
        const persistedImage = toPersistedItemImage(imageData, uploadedUrl);
        if (!persistedImage) return null;
        uploadedImages.push(persistedImage);
    }

    return appendItemImagesToProject(projectData, selectedItem, uploadedImages);
}
