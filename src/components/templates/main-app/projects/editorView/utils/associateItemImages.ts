import { uploadFile } from '@database/projects';
import type { ItemForDropdown, Project } from '../../types';
import type { UserUploadedFileType } from '@type/common';
import { removeObjRef } from '@util/utils';

export async function associateItemImagesWithProject(
    projectData: Project,
    selectedItem: ItemForDropdown,
    imagesToUpload: UserUploadedFileType[],
): Promise<Project | null> {
    const updatedProjectData: Project = removeObjRef(projectData);
    let itemUpdated = false;

    for (const imageData of imagesToUpload) {
        if (imageData.url.includes('base64')) {
            const uploadedUrl = await uploadFile(
                {
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
                    item.images = item.images || [];
                    item.images = [...item.images, ...imagesToUpload];
                    itemUpdated = true;
                    break;
                }
            }

            if (itemUpdated) break;
        }
    }

    return itemUpdated ? updatedProjectData : null;
}
