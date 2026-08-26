import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { FEATURE_FLAGS } from '@config/features';
import { assertProjectUpdateSucceeded, updateProject } from '@database/projects';
import { useAppDispatch } from '@hook/useAppDispatch';
import useDeviceType from '@hook/useDeviceType';
import {
    buildItemImageEditorTarget,
    removeItemImageFromProject,
} from '@lib/media/itemImageAssociationBoundary';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { UserUploadedFileType } from '@type/common';
import { removeObjRef } from '@util/utils';
import { Button, Flex, Image, Modal, Popover, Space, Tooltip, App, theme } from 'antd';
import { Fragment, useContext, useRef, useState } from 'react';
import { LuMoreVertical, LuPencil, LuTrash } from 'react-icons/lu';
import { ExtractedDataItem, Project } from '../types';
import { getBoundedMenuEditorStringContext, getMenuEditorProjectLogContext, logMenuEditorDiagnostic, logMenuEditorFailure } from '../utils/editorDiagnostics';
import EditImageModal from './AiImageGenerator/EditImageModal';

function UploadedImagesList({
    disabled = false,
    fileId,
    item,
    onProjectDataUpdate,
    onUploadGeneratedImage,
    projectData,
}: {
    disabled?: boolean;
    fileId?: string;
    item: ExtractedDataItem & { fileId?: string };
    onProjectDataUpdate?: (updatedProject: Project) => Promise<void> | void;
    onUploadGeneratedImage: (imagesToUpload: UserUploadedFileType[]) => Promise<void>;
    projectData: Project;
}) {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const dispatch = useAppDispatch()
    const { activeProject, setActiveProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const [imageEditModal, setImageEditModal] = useState<{
        active: boolean;
        imageData: UserUploadedFileType | null;
    }>({ active: false, imageData: null });
    const [mobileActionImageUrl, setMobileActionImageUrl] = useState<string | null>(null);
    const deleteInFlightRef = useRef(false);
    const itemForEditing = buildItemImageEditorTarget(projectData, {
        fileId: item.fileId || fileId,
        id: item.id,
    });
    const hasImages = Boolean(item?.images?.length);

    const onImageDelete = (
        selectedItem: ExtractedDataItem & { fileId?: string },
        imageToDelete: UserUploadedFileType,
    ) => {
        if (disabled || deleteInFlightRef.current) return;
        const projectId = activeProject?.projectId || projectData.projectId;
        if (!projectId) {
            messageApi.error('The active project identity is unavailable.');
            return;
        }
        deleteInFlightRef.current = true;

        Modal.confirm({
            title: 'Delete item photo?',
            content: 'Customers will no longer see this photo on the item after you save.',
            okText: 'Delete photo',
            okType: 'danger',
            cancelText: 'Cancel',
            onCancel: () => {
                deleteInFlightRef.current = false;
            },
            onOk: async () => {
                dispatch(startLoader("deleting image"));
                const updatedProjectData = removeItemImageFromProject(
                    projectData,
                    {
                        fileId: selectedItem.fileId || fileId || '',
                        id: selectedItem.id,
                    },
                    imageToDelete.url,
                );

                if (updatedProjectData) {
                    // Directly sync the changes without waiting for the full sync function logic
                    // because we only modified the existing data structure
                    try {
                        if (onProjectDataUpdate) {
                            await onProjectDataUpdate({ ...updatedProjectData, projectId });
                        } else {
                            const savedProject = await updateProject({ ...updatedProjectData, projectId });
                            assertProjectUpdateSucceeded(
                                savedProject,
                                projectId,
                                'menu_editor_item_image_delete_project_update_rejected',
                            );
                            setActiveProject(removeObjRef(savedProject));
                        }

                        logMenuEditorDiagnostic('menu_editor_item_image_cleanup_deferred_shared_reference', {
                            ...getMenuEditorProjectLogContext(activeProject?.projectId || projectData.projectId, (projectData as { masterProjectId?: unknown }).masterProjectId),
                            ...getBoundedMenuEditorStringContext('itemId', selectedItem.id),
                            ...getBoundedMenuEditorStringContext('imageUrl', imageToDelete.url),
                        });
                        messageApi.success('Image deleted successfully!');
                    } catch (error) {
                        logMenuEditorFailure('menu_editor_item_image_delete_failed', error, {
                            ...getMenuEditorProjectLogContext(activeProject?.projectId || projectData.projectId, (projectData as { masterProjectId?: unknown }).masterProjectId),
                            ...getBoundedMenuEditorStringContext('itemId', selectedItem.id),
                            ...getBoundedMenuEditorStringContext('imageUrl', imageToDelete.url),
                            hasProjectDataUpdateOverride: Boolean(onProjectDataUpdate),
                            fileCount: updatedProjectData.files?.length || 0,
                            imageCount: selectedItem.images?.length || 0,
                        });
                        messageApi.error('Failed to delete image.');
                    } finally {
                        dispatch(stopLoader("deleting image"));
                        deleteInFlightRef.current = false;
                    }

                } else {
                    dispatch(stopLoader("deleting image"));
                    deleteInFlightRef.current = false;
                    messageApi.error('Failed to find the image to delete.');
                }
            },
        });
    };

    return (
        <Flex wrap gap={12} style={{ width: '100%' }}>
            {!hasImages ? (
                <Flex
                    align="center"
                    gap={8}
                    justify="center"
                    style={{
                        background: token.colorFillAlter,
                        border: `1px dashed ${token.colorBorder}`,
                        borderRadius: token.borderRadiusLG,
                        padding: isMobile ? 14 : 18,
                        textAlign: 'center',
                        width: '100%',
                    }}
                    vertical
                >
                    <ContextualStateIllustration
                        color={token.colorPrimary}
                        size={isMobile ? 72 : 88}
                        style={{ opacity: 0.78 }}
                        treatment="softHalo"
                        variant="uploadContext"
                    />
                    <span style={{ color: token.colorText, fontWeight: 600 }}>No photo yet</span>
                    <span style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                        {disabled ? 'This item does not have a photo.' : 'Add a clear photo when you are ready.'}
                    </span>
                </Flex>
            ) : null}
            {item?.images?.map((image: UserUploadedFileType, index: number) => {
                const imagePreviewConfig = disabled || isMobile ? true : {
                    mask: (
                        <Space size={12}>
                            {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && itemForEditing ? (
                                <LuPencil
                                    style={{ fontSize: 16, color: '#fff', cursor: 'pointer' }}
                                    onClick={(e) => { e.stopPropagation(); setImageEditModal({ active: true, imageData: image }); }}
                                />
                            ) : null}
                            <LuTrash
                                style={{ fontSize: 16, color: '#fff', cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); onImageDelete(item, image); }}
                            />
                        </Space>
                    )
                };

                const mobileActionContent = (
                    <Flex gap={6} style={{ minWidth: 132 }} vertical>
                        {FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && itemForEditing ? (
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
                        ) : null}
                        <Button
                            danger
                            icon={<LuTrash size={14} />}
                            onClick={() => {
                                setMobileActionImageUrl(null);
                                onImageDelete(item, image);
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
                                    onOpenChange={(open) => setMobileActionImageUrl(open ? image.url ?? null : null)}
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
            {!disabled && FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && itemForEditing ? (
                <EditImageModal
                    selectedItem={itemForEditing}
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
