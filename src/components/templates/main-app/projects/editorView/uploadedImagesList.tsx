import { assertProjectUpdateSucceeded, updateProject } from '@database/projects';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { useAppDispatch } from '@hook/useAppDispatch';
import useDeviceType from '@hook/useDeviceType';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { UserUploadedFileType } from '@type/common';
import { removeObjRef } from '@util/utils';
import { Button, Flex, Image, Modal, Popover, Space, Tooltip, message, theme } from 'antd';
import { Fragment, useContext, useState } from 'react';
import { LuMoreVertical, LuPencil, LuTrash } from 'react-icons/lu';
import { ExtractedDataItem, Project } from '../types';
import { getBoundedMenuEditorStringContext, getMenuEditorProjectLogContext, logMenuEditorFailure } from '../utils/editorDiagnostics';
import EditImageModal from './AiImageGenerator/EditImageModal';

function UploadedImagesList({
    disabled = false,
    item,
    onProjectDataUpdate,
    onUploadGeneratedImage,
    projectData,
}: {
    disabled?: boolean;
    item: any;
    onProjectDataUpdate?: (updatedProject: Project) => Promise<void> | void;
    onUploadGeneratedImage: any;
    projectData: Project;
}) {
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const dispatch = useAppDispatch()
    const { activeProject, setActiveProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const [imageEditModal, setImageEditModal] = useState({ active: false, imageData: null })
    const [mobileActionImageUrl, setMobileActionImageUrl] = useState<string | null>(null);

    const onImageDelete = async (selectedItem: ExtractedDataItem, imageToDelete: UserUploadedFileType) => {
        if (disabled) return;

        Modal.confirm({
            title: 'Delete item photo?',
            content: 'Customers will no longer see this photo on the item after you save.',
            okText: 'Delete photo',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                dispatch(startLoader("deleting image"));
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
                        if (onProjectDataUpdate) {
                            await onProjectDataUpdate({ ...updatedProjectData, projectId: activeProject.projectId });
                        } else {
                            const savedProject = await updateProject({ ...updatedProjectData, projectId: activeProject.projectId });
                            assertProjectUpdateSucceeded(
                                savedProject,
                                activeProject.projectId,
                                'menu_editor_item_image_delete_project_update_rejected',
                            );
                            setActiveProject(removeObjRef(savedProject));
                        }
                        message.success('Image deleted successfully!');
                    } catch (error) {
                        logMenuEditorFailure('menu_editor_item_image_delete_failed', error, {
                            ...getMenuEditorProjectLogContext(activeProject?.projectId || projectData.projectId, (projectData as { masterProjectId?: unknown }).masterProjectId),
                            ...getBoundedMenuEditorStringContext('itemId', selectedItem.id),
                            ...getBoundedMenuEditorStringContext('imageUrl', imageToDelete.url),
                            hasProjectDataUpdateOverride: Boolean(onProjectDataUpdate),
                            fileCount: updatedProjectData.files?.length || 0,
                            imageCount: selectedItem.images?.length || 0,
                        });
                        message.error('Failed to delete image.');
                    } finally {
                        dispatch(stopLoader("deleting image"));
                    }

                } else {
                    dispatch(stopLoader("deleting image"));
                    message.error('Failed to find the image to delete.');
                }
            },
        });
    };

    return (
        <Flex wrap gap={12}>
            {item?.images?.map((image: UserUploadedFileType, index: number) => {
                const imagePreviewConfig = disabled || isMobile ? true : {
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
                };

                const mobileActionContent = (
                    <Flex gap={6} style={{ minWidth: 132 }} vertical>
                        <Button
                            icon={<LuPencil size={14} />}
                            onClick={() => {
                                setMobileActionImageUrl(null);
                                setImageEditModal({ active: true, imageData: image });
                            }}
                            size="small"
                        >
                            Edit
                        </Button>
                        <Button
                            danger
                            icon={<LuTrash size={14} />}
                            onClick={() => {
                                setMobileActionImageUrl(null);
                                void onImageDelete(item, image);
                            }}
                            size="small"
                        >
                            Delete
                        </Button>
                    </Flex>
                );

                return <Fragment key={index}>
                    <Flex gap={8} vertical style={{ width: isMobile ? 104 : 'auto' }}>
                        <div style={{ display: 'inline-block', position: 'relative', width: 'fit-content' }}>
                            <Tooltip title={image.name}>
                                <Image
                                    key={index}
                                    src={image.url}
                                    alt={image.name || `Uploaded image ${index + 1}`}
                                    style={{
                                        height: 'auto',
                                        width: 'auto',
                                        maxWidth: isMobile ? 104 : 70,
                                        maxHeight: 150,
                                        objectFit: 'cover',
                                        border: `1px solid ${token.colorBorder}`,
                                        borderRadius: token.borderRadius
                                    }}
                                    preview={imagePreviewConfig}
                                />
                            </Tooltip>
                            {isMobile && !disabled ? (
                                <Popover
                                    content={mobileActionContent}
                                    open={mobileActionImageUrl === image.url}
                                    onOpenChange={(open) => setMobileActionImageUrl(open ? image.url : null)}
                                    placement="bottomRight"
                                    trigger="click"
                                >
                                    <Button
                                        icon={<LuMoreVertical size={16} />}
                                        onClick={(event) => event.stopPropagation()}
                                        shape="circle"
                                        size="small"
                                        style={{
                                            position: 'absolute',
                                            right: 6,
                                            top: 6,
                                            zIndex: 2,
                                        }}
                                    />
                                </Popover>
                            ) : null}
                        </div>
                    </Flex>
                </Fragment>
            })}
            {!disabled ? (
                <EditImageModal
                    selectedItem={item}
                    open={imageEditModal.active}
                    onClose={() => setImageEditModal({ active: false, imageData: null })}
                    imageData={imageEditModal.imageData}
                    onUploadGeneratedImage={(imagesToUse) => onUploadGeneratedImage(imagesToUse)}
                />
            ) : null}
        </Flex>
    )
}

export default UploadedImagesList
