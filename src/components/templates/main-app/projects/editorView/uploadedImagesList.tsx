import { updateProject } from '@database/projects';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { useAppDispatch } from '@hook/useAppDispatch';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { UserUploadedFileType } from '@type/common';
import { removeObjRef } from '@util/utils';
import { Flex, Image, Modal, Space, Tooltip, message, theme } from 'antd';
import { Fragment, useContext, useState } from 'react';
import { LuPencil, LuTrash } from 'react-icons/lu';
import { ExtractedDataItem, Project } from '../types';
import EditImageModal from './AiImageGenerator/EditImageModal';

function UploadedImagesList({ item, projectData, onUploadGeneratedImage }: { item: any, projectData: Project, onUploadGeneratedImage }) {
    const { token } = theme.useToken();
    const dispatch = useAppDispatch()
    const { activeProject, setActiveProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const [imageEditModal, setImageEditModal] = useState({ active: false, imageData: null })

    const onImageDelete = async (selectedItem: ExtractedDataItem, imageToDelete: UserUploadedFileType) => {
        Modal.confirm({
            title: 'Are you sure you want to delete this image?',
            content: 'This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                dispatch(startLoader("deleting image"));
                console.log(`Deleting image: ${imageToDelete} for item: ${selectedItem.id}`);
                const updatedProjectData: Project = removeObjRef(projectData);
                let itemUpdated = false;

                // Iterate through files and their extractedData
                if (updatedProjectData?.files) {
                    for (const file of updatedProjectData.files) {
                        const itemsList = file.extractedData?.data?.items || [];
                        if (itemsList.length > 0) {
                            for (const item of itemsList) {
                                if (item.id === selectedItem.id && item.images) {
                                    const imageIndex = item.images.findIndex(image => image.url === imageToDelete.url);
                                    if (imageIndex !== -1) {
                                        item.images.splice(imageIndex, 1); // Remove the image URL
                                        itemUpdated = true;
                                        break; // Found and updated item
                                    }
                                }
                            }
                            if (itemUpdated) break; // Item found in this file
                        }
                    }
                }

                if (itemUpdated) {
                    // Directly sync the changes without waiting for the full sync function logic
                    // because we only modified the existing data structure
                    try {
                        await deleteFileByUrl(imageToDelete.url);
                        await updateProject({ ...updatedProjectData, projectId: activeProject.projectId });
                        setActiveProject(removeObjRef(updatedProjectData));
                        message.success('Image deleted successfully!');
                    } catch (error) {
                        console.error("Failed to delete image:", error);
                        message.error('Failed to delete image.');
                    } finally {
                        dispatch(stopLoader("deleting image"));
                    }

                } else {
                    dispatch(stopLoader("deleting image"));
                    message.error('Failed to find the image to delete.');
                }
            },
            onCancel() {
                console.log('Image deletion cancelled');
            },
        });
    };

    return (
        <Flex wrap gap={12}>
            {item?.images?.map((image: UserUploadedFileType, index: number) => {
                return <Fragment key={index}>
                    <Tooltip title={image.name}>
                        <Image
                            key={index}
                            src={image.url}
                            alt={image.name || `Uploaded image ${index + 1}`}
                            style={{
                                height: 'auto',
                                width: 'auto',
                                maxWidth: 70,
                                maxHeight: 150,
                                objectFit: 'cover',
                                border: `1px solid ${token.colorBorder}`,
                                borderRadius: token.borderRadius
                            }}
                            preview={{
                                mask: (
                                    <Space size={12}>
                                        <LuPencil
                                            style={{ fontSize: 16, color: '#fff', cursor: 'pointer' }}
                                            onClick={(e) => { e.stopPropagation(); setImageEditModal({ active: true, imageData: image }); }}
                                        />
                                        <LuTrash
                                            style={{ fontSize: 16, color: '#fff', cursor: 'pointer' }}
                                            onClick={(e) => { e.stopPropagation(); onImageDelete(item, image); }}
                                        />
                                    </Space>
                                )
                            }}
                        />
                    </Tooltip>
                </Fragment>
            })}
            <EditImageModal
                selectedItem={item}
                open={imageEditModal.active}
                onClose={() => setImageEditModal({ active: false, imageData: null })}
                imageData={imageEditModal.imageData}
                onUploadGeneratedImage={(imagesToUse) => onUploadGeneratedImage(imagesToUse)}
            />
        </Flex>
    )
}

export default UploadedImagesList