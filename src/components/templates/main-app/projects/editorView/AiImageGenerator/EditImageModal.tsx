import ImageUploadInput from '@atoms/imageUploadInput';
import { useAppDispatch } from '@hook/useAppDispatch';
import useDeviceType from '@hook/useDeviceType';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import editImageViaApi from '@services/ai/image/editImageViaApi';
import { UserUploadedFileType } from '@type/common';
import { Button, Card, Divider, Flex, Image, Input, message, Modal, Space, theme, Tooltip, Typography } from 'antd';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { LuCheckCircle, LuCircleDot, LuEye, LuImagePlus, LuPalette, LuPenTool, LuScissors, LuShirt, LuSparkles, LuTrash2, LuUploadCloud, LuWand2, LuZap } from 'react-icons/lu';
import { NavBar, Popup } from '../../../../../mobile/antd';
import { ItemForDropdown } from '../../types';
import { BUSINESS_FEATURE_MAP, IMAGE_VIEW_TYPES, ImageEditingFeatureType, PLATFORM_EDITING_FEATURES, UNIVERSAL_FEATURES } from './imageViewType';

// Icon mapping for feature icons stored as strings
const ICON_MAP: Record<string, React.ReactNode> = {
    'LuZap': <LuZap />,
    'LuPalette': <LuPalette />,
    'LuScissors': <LuScissors />,
    'LuImagePlus': <LuImagePlus />,
    'LuSparkles': <LuSparkles />,
    'LuShirt': <LuShirt />,
    'LuPenTool': <LuPenTool />,
    'LuWand2': <LuWand2 />,
};

interface EditImageModalProps {
    open: boolean;
    onClose: () => void;
    imageData: UserUploadedFileType | null;
    selectedItem: ItemForDropdown | null;
    onUploadGeneratedImage: (images: UserUploadedFileType[]) => void;
}

const EditImageModal: React.FC<EditImageModalProps> = ({
    open,
    onClose,
    imageData,
    selectedItem,
    onUploadGeneratedImage,
}) => {
    const { isMobile } = useDeviceType();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const { token } = theme.useToken();
    const dispatch = useAppDispatch();

    // Filter platform features based on business type relevance
    const getRelevantPlatformFeatures = () => {
        const businessType = storeDetails?.businessType || '';
        const additionalFeatures = BUSINESS_FEATURE_MAP[businessType] || [];
        const relevantFeatureNames = [...UNIVERSAL_FEATURES, ...additionalFeatures];
        return PLATFORM_EDITING_FEATURES.filter(f => relevantFeatureNames.includes(f.featureName));
    };
    const platformfeaturesList = getRelevantPlatformFeatures()

    const [prompt, setPrompt] = useState('');
    // Default to "Enhance Image" (first feature) - most common action for non-tech users
    const [selectedFeature, setSelectedFeature] = useState<ImageEditingFeatureType>(platformfeaturesList[0]);
    const [generatedImages, setGeneratedImages] = useState<UserUploadedFileType[]>([]);
    const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number | null>(null);
    const [sourceImage, setSourceImage] = useState<UserUploadedFileType | null>(imageData);
    const [selectedForUpload, setSelectedForUpload] = useState<string[]>([]);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef(null);
    const [selectedPromptImage, setSelectedPromptImage] = useState<UserUploadedFileType>({ name: "", size: 0, type: "", url: null })

    useEffect(() => {
        if (open && imageData) {
            setPrompt('');
            setSelectedFeature(platformfeaturesList[0]); // Default to "Enhance Image" - most useful for non-tech users
            setGeneratedImages([]);
            setSelectedPreviewIndex(null);
            setSourceImage(imageData);
            setSelectedForUpload([]); // Reset upload selection
            setUploadSuccess(false);
        } else if (!open) {
            setSourceImage(null);
            setSelectedForUpload([]);
            setUploadSuccess(false);
        }
    }, [open, imageData]);

    const handleSelectSource = (image: UserUploadedFileType) => {
        setSourceImage(image);
    };

    const handleSelectThumbnail = (index: number, imageData: UserUploadedFileType[] = generatedImages) => {
        if (imageData && imageData[index]) {
            const selectedEdit = imageData[index];
            setSelectedPreviewIndex(index);
            handleSelectSource(selectedEdit);
        }
    };

    const generateNewImageClick = async () => {
        if (!sourceImage || (!prompt.trim() && selectedFeature.featureName === 'Custom Prompt') || !selectedItem) {
            message.error("Please select a source image and enter a prompt.");
            return;
        }

        if (Boolean(selectedFeature.userPrompt) && selectedFeature.userPrompt == "required" && !prompt.trim()) {
            message.error("Please enter a prompt.");
            return;
        }

        if (Boolean(selectedFeature.promptImage) && selectedFeature.promptImage == "required" && !Boolean(selectedPromptImage?.url)) {
            message.error("Please select a prompt image.");
            return;
        }

        dispatch(startLoader("Editing Image"));

        try {

            const editedImages = await editImageViaApi({
                itemDetails: {
                    id: selectedItem.id,
                    name: selectedItem.itemName,
                    description: selectedItem.descriptionLine,
                    attributes: selectedItem.attributesList,
                    category: selectedItem.categoryName
                },
                generationConfig: {
                    prompt: prompt || "",
                    referanceImage: sourceImage,
                    feature: selectedFeature.featureName == "Custom Prompt" ? (Boolean(selectedPromptImage?.url) ? "Generic Two-Image Edit" : "Generic Single-Image Edit") : selectedFeature.featureName,
                    promptImages: [selectedPromptImage],
                },
                projectId: activeProject?.projectId || '',
                fileId: sourceImage?.uid || '',
                businessType: storeDetails?.businessType || '',
            })

            if (editedImages.length === 0) {
                message.error("Edit generation failed.");
                dispatch(stopLoader("Editing Image"));
                return;
            }

            const uniqueId = Math.random().toString(36).substring(2, 5).toUpperCase();

            const newEditedImage: UserUploadedFileType = {
                ...sourceImage,
                uid: `edited-${uniqueId}-${sourceImage?.uid?.substring(0, 4)}`,
                url: editedImages[0].base64,
                type: editedImages[0].mimeType,
                name: `edited-${uniqueId}`,
            };

            const updatedEdits = [...generatedImages, newEditedImage];
            setGeneratedImages(updatedEdits);
            handleSelectThumbnail(updatedEdits.length - 1, updatedEdits);
            // Auto-select new image for upload (UX-18)
            setSelectedForUpload(prev => [...prev, newEditedImage.uid]);
            setPrompt('');
            setSelectedFeature(platformfeaturesList[platformfeaturesList.length - 1]);
            message.success("Edit preview generated! ✅ Selected for upload.");

        } catch (error) {
            if (error instanceof AICapacityError) {
                message.info('Get more AI enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                message.error("Edit generation failed.");
            }
        } finally {
            dispatch(stopLoader("Editing Image"));
        }
    };

    const handleUploadEditedImage = () => {
        if (selectedForUpload.length === 0) {
            message.error("Please select at least one image to upload.");
            return;
        }
        const imagesToUpload = generatedImages.filter(img => selectedForUpload.includes(img.uid));
        if (imagesToUpload.length > 0) {
            onUploadGeneratedImage(imagesToUpload);
            // NEW-1: Show success state briefly before closing
            setUploadSuccess(true);
            setTimeout(() => {
                setUploadSuccess(false);
                onClose();
            }, 800);
        }
    };

    const toggleImageSelection = (uid: string) => {
        setSelectedForUpload(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const sourceBorderStyle = (isSelectedSource: boolean): React.CSSProperties => ({
        border: isSelectedSource ? `3px solid ${token.colorSuccess}` : `1px solid ${token.colorBorderSecondary}`,
        padding: '4px',
        borderRadius: token.borderRadiusLG + 4,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isSelectedSource ? `0 0 0 4px ${token.colorSuccessBg}` : 'none',
    });

    const getBusinessFeatures = (): ImageEditingFeatureType[] => {
        return (IMAGE_VIEW_TYPES.find((type) => type.businessType === storeDetails?.businessType)?.editingFeatures || []) as ImageEditingFeatureType[];
    };

    const renderFeatureCard = (feature: ImageEditingFeatureType) => {
        const isSelected = feature.featureName === selectedFeature.featureName;
        const featureIcon = feature.icon ? ICON_MAP[feature.icon] : <LuCircleDot />;
        return (
            <Card
                key={feature.featureName}
                hoverable
                styles={{ body: { padding: 0 } }}
                onClick={() => setSelectedFeature(feature)}
                style={{
                    position: 'relative',
                    padding: token.paddingSM,
                    minWidth: 180,
                    flex: '1 1 calc(50% - 8px)',
                    maxWidth: 'calc(50% - 4px)',
                    borderRadius: 12,
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    border: `2px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                    backgroundColor: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                }}
            >
                <Flex vertical gap={4}>
                    <Flex align="center" gap={8}>
                        <span style={{
                            fontSize: 18,
                            color: isSelected ? token.colorPrimary : token.colorTextSecondary
                        }}>
                            {featureIcon}
                        </span>
                        <Typography.Text strong style={{
                            color: isSelected ? token.colorPrimary : token.colorText,
                            fontSize: 13
                        }}>
                            {feature.friendlyName || feature.featureName}
                        </Typography.Text>
                    </Flex>
                    <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: 1.3 }}>
                        {feature.whatItDoes || feature.description}
                    </Typography.Text>
                </Flex>
            </Card>
        );
    }

    const footerActions = (
        <Flex gap={12} style={{ width: '100%' }}>
            <Button block disabled={uploadSuccess} onClick={onClose}>
                Cancel
            </Button>
            {generatedImages.length > 0 ? (
                <Button
                    block
                    icon={uploadSuccess ? <LuCheckCircle style={{ color: token.colorSuccess }} /> : <LuUploadCloud />}
                    onClick={handleUploadEditedImage}
                    disabled={selectedForUpload.length === 0 || uploadSuccess}
                    style={{
                        borderColor: selectedForUpload.length > 0 ? token.colorSuccess : undefined,
                        color: selectedForUpload.length > 0 ? token.colorSuccess : undefined,
                    }}
                >
                    {uploadSuccess ? 'Done' : `Upload ${selectedForUpload.length > 0 ? `${selectedForUpload.length} Image${selectedForUpload.length > 1 ? 's' : ''}` : 'Selected'}`}
                </Button>
            ) : null}
            <Button block type="primary" icon={<LuSparkles />} onClick={generateNewImageClick} disabled={uploadSuccess}>
                {selectedFeature?.userPrompt === 'required' ? 'Apply Edit' : 'Enhance Now'}
            </Button>
        </Flex>
    );

    const modalContent = (
        <Flex vertical gap="middle">
            {generatedImages && generatedImages.length > 0 && (
                <>
                    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                        <Typography.Text type="secondary">✅ Select images to upload:</Typography.Text>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => setSelectedForUpload(
                                selectedForUpload.length === generatedImages.length
                                    ? []
                                    : generatedImages.map(img => img.uid)
                            )}
                        >
                            {selectedForUpload.length === generatedImages.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </Flex>
                    <Flex wrap gap="small" justify='center' align='center' style={{ maxHeight: '120px', overflowY: 'auto', paddingBottom: '10px' }}>
                        {generatedImages.map((edit, index) => {
                            const isSelectedPreview = index === selectedPreviewIndex;
                            const isSelectedForUpload = selectedForUpload.includes(edit.uid);
                            return (
                                <Tooltip key={edit.uid} title="Click image to preview • Click ✓ to select for upload" placement="bottom">
                                    <div style={{ position: 'relative' }}>
                                        <Image
                                            src={edit.url}
                                            alt={`Edit ${index + 1}`}
                                            width={70}
                                            height={70}
                                            style={{
                                                objectFit: 'cover',
                                                borderRadius: token.borderRadius,
                                                border: `3px solid ${isSelectedForUpload ? token.colorSuccess : isSelectedPreview ? token.colorPrimary : token.colorBorder}`,
                                                padding: '2px',
                                                boxSizing: 'border-box',
                                                opacity: isSelectedForUpload ? 1 : 0.7,
                                                cursor: 'pointer',
                                            }}
                                            preview={false}
                                            onClick={() => handleSelectThumbnail(index)}
                                        />
                                        {isSelectedPreview && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 4,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                backgroundColor: token.colorPrimary,
                                                color: 'white',
                                                fontSize: 9,
                                                padding: '1px 6px',
                                                borderRadius: 8,
                                            }}>
                                                Preview
                                            </div>
                                        )}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: -4,
                                                right: -4,
                                                backgroundColor: isSelectedForUpload ? token.colorSuccess : 'white',
                                                borderRadius: '50%',
                                                padding: 3,
                                                cursor: 'pointer',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                border: `2px solid ${isSelectedForUpload ? token.colorSuccess : token.colorBorder}`,
                                            }}
                                            onClick={(e) => { e.stopPropagation(); toggleImageSelection(edit.uid); }}
                                        >
                                            <LuCheckCircle
                                                style={{
                                                    color: isSelectedForUpload ? 'white' : token.colorTextSecondary,
                                                    fontSize: 16,
                                                    display: 'block',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </Tooltip>
                            );
                        })}
                    </Flex>
                    <Divider style={{ margin: '8px 0' }} />
                </>
            )}
            <Flex justify="center" gap="middle" align="center" vertical={isMobile}>
                {imageData && (
                    <Flex vertical align="center" gap="small">
                        <Typography.Text strong>Original</Typography.Text>
                        <Image
                            src={imageData.url}
                            alt={imageData.name || 'Original image'}
                            style={{
                                maxWidth: '100%',
                                maxHeight: 200,
                                objectFit: 'contain',
                                borderRadius: token.borderRadiusLG,
                                ...sourceBorderStyle(sourceImage?.url === imageData.url)
                            }}
                            onClick={() => handleSelectSource(imageData)}
                            preview={false}
                        />
                    </Flex>
                )}
                {generatedImages && selectedPreviewIndex !== null && (
                    <Flex vertical align="center" gap="small">
                        <Typography.Text strong>Generated Image</Typography.Text>
                        <Image
                            src={generatedImages[selectedPreviewIndex].url}
                            alt={generatedImages[selectedPreviewIndex].name || 'Generated image'}
                            style={{
                                maxWidth: '100%',
                                maxHeight: 200,
                                objectFit: 'contain',
                                borderRadius: token.borderRadiusLG,
                                ...sourceBorderStyle(generatedImages[selectedPreviewIndex].url === sourceImage?.url)
                            }}
                            onClick={() => handleSelectSource(generatedImages[selectedPreviewIndex])}
                            preview={{
                                maskClassName: 'custom-mask',
                                mask: (
                                    <Space size={16}>
                                        <Tooltip title="Preview">
                                            <LuEye style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} />
                                        </Tooltip>
                                        <LuCheckCircle style={{ fontSize: 20, color: generatedImages[selectedPreviewIndex].url === sourceImage?.url ? token.colorPrimaryActive : '#fff', cursor: 'pointer' }} />
                                    </Space>
                                )
                            }}
                        />
                    </Flex>
                )}
            </Flex>


            <Flex vertical gap="small">
                <Flex align="center" justify="center" gap={8} style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: token.colorSuccessBg,
                    borderRadius: token.borderRadius,
                    border: `1px solid ${token.colorSuccessBorder}`
                }}>
                    <LuCheckCircle style={{ color: token.colorSuccess, fontSize: 16 }} />
                    <Typography.Text style={{ color: token.colorSuccess, textAlign: 'center' }}>
                        Editing this image. Tap another image to switch.
                    </Typography.Text>
                </Flex>
                <Typography.Title level={5} style={{ marginBottom: token.marginXS }}>What do you want to do?</Typography.Title>

                {getBusinessFeatures().length > 0 && (
                    <>
                        <Typography.Text type="secondary" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>
                            Recommended for {storeDetails?.businessType || 'your business'}
                        </Typography.Text>
                        <Flex wrap gap={8} style={{ width: '100%', marginBottom: 16 }}>
                            {getBusinessFeatures().map(renderFeatureCard)}
                        </Flex>
                    </>
                )}

                <Typography.Text type="secondary" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>
                    General editing tools
                </Typography.Text>
                <Flex wrap gap={8} style={{ width: '100%' }}>
                    {platformfeaturesList.map(renderFeatureCard)}
                </Flex>
            </Flex>

            {Boolean(selectedFeature?.userPrompt) && <Flex style={{
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${token.colorBorder}`,
                borderRadius: 12,
                margin: "10px 0",
                padding: 6,
                overflow: 'hidden',
                gap: 10
            }}>
                {Boolean(selectedFeature?.promptImage) && <Flex gap={16}>
                    {selectedPromptImage?.url ? (
                        <Image
                            src={selectedPromptImage.url}
                            alt="Selected Prompt Image"
                            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 12 }}
                            preview={{
                                maskClassName: 'custom-mask',
                                mask: (
                                    <Space size={16}>
                                        <LuEye style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} />
                                        <LuTrash2 style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedPromptImage(null)} />
                                    </Space>
                                )
                            }}
                        />
                    ) : (
                        <Button size='large' type='text' style={{ height: 45, width: 45, marginLeft: 3, fontSize: 24 }} icon={<LuImagePlus />} onClick={() => fileInputRef.current.click()} />
                    )}
                </Flex>}
                <Input.TextArea
                    allowClear
                    rows={3}
                    placeholder={selectedFeature.prompt}
                    value={prompt}
                    style={{ border: "unset", backgroundColor: "transparent", padding: 0 }}
                    onChange={(e) => setPrompt(e.target.value)}
                />
            </Flex>}
        </Flex>
    );

    return (
        <>
            {isMobile ? (
                <Popup
                    bodyStyle={{ minHeight: '72vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
                    destroyOnClose
                    onMaskClick={onClose}
                    visible={open}
                >
                    <Flex style={{ height: '100%' }} vertical>
                        <NavBar onBack={onClose}>
                            {selectedItem?.itemName ? `Edit ${selectedItem.itemName}` : 'Edit Image'}
                        </NavBar>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px' }}>
                            {modalContent}
                        </div>
                        <div
                            style={{
                                backgroundColor: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
                            }}
                        >
                            {footerActions}
                        </div>
                    </Flex>
                </Popup>
            ) : (
                <Modal
                    title={
                        <Flex align="center" gap="small">
                            <LuSparkles style={{ color: token.colorPrimary }} />
                            <span>Enhance: {selectedItem?.itemName}</span>
                        </Flex>
                    }
                    open={open}
                    onCancel={onClose}
                    destroyOnHidden
                    maskClosable={false}
                    footer={footerActions}
                    width={700}
                >
                    {modalContent}
                </Modal>
            )}
            <ImageUploadInput onUploadFile={(selectedPromptImage: UserUploadedFileType) => setSelectedPromptImage(selectedPromptImage)} fileInputRef={fileInputRef} />

        </>
    );

};

export default EditImageModal;
