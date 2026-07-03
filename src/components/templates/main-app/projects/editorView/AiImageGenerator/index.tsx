import { InfoCircleOutlined } from '@ant-design/icons';
import SelectedItemCheck from '@atoms/selectedItemCheck';
import { IMAGE_GENERATION_STYLES } from '@constant/AI';
import { useAppDispatch } from '@hook/useAppDispatch';
import useDeviceType from '@hook/useDeviceType';
import { createUppercaseRandomIdSegment } from '@lib/runtime/randomId';
import Loader from '@organisms/loader';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import generateImageViaApi from '@services/ai/image/generateImageViaApi';
import { UserUploadedFileType } from '@type/common';
import { Button, Card, Collapse, ColorPicker, Flex, Image, Input, message, Modal, Popconfirm, Skeleton, Space, Switch, Tag, theme, Tooltip, Typography, Upload } from 'antd';
import React, { Fragment, useContext, useEffect, useState } from 'react';
import { FaImages } from 'react-icons/fa6';
import { LuBadgeInfo, LuCheck, LuCheckCircle, LuChevronDown, LuImage, LuImagePlus, LuRefreshCcw, LuSettings2, LuWand2, LuX } from 'react-icons/lu';
import { NavBar, Popup } from '../../../../../mobile/antd';
import { ImageGenerationConfigType, ItemForDropdown } from '../../types';
import AspectRatioSelector from './AspectRatioSelector';
import ChatWidgetUi from './ChatWidgetUi'; // Import the new component
import { getImageViewTypeForBusiness } from './imageViewType';
import MultiSelectAttributeSelector from './MultiSelectAttributeSelector';
import StyleSelector from './StyleSelector';
import {
    getBoundedMenuEditorStringContext,
    getMenuEditorProjectLogContext,
    logMenuEditorFailure,
} from '../../utils/editorDiagnostics';

interface AiImageGeneratorProps {
    selectedItem: ItemForDropdown | null;
    generationConfig: ImageGenerationConfigType;
    setGenerationConfig: (config: ImageGenerationConfigType) => void;
    uploadProps: any;
    onUploadGeneratedImage: (images: UserUploadedFileType[]) => void;
    onPreferencesUsed?: (config: ImageGenerationConfigType) => Promise<void> | void;
    batchItemCount?: number; // Number of items in the batch
}

const AiImageGenerator: React.FC<AiImageGeneratorProps> = ({
    selectedItem,
    generationConfig,
    setGenerationConfig,
    uploadProps,
    onUploadGeneratedImage,
    onPreferencesUsed,
    batchItemCount
}) => {

    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const selectedBusinessData = getImageViewTypeForBusiness(storeDetails?.businessType, storeDetails?.businessCategory);
    const imageTypes = selectedBusinessData?.imageTypes || [];
    const [selectedGeneratedForUpload, setSelectedGeneratedForUpload] = useState<UserUploadedFileType[]>([]);
    const [selectedReferenceImageMeta, setSelectedReferenceImageMeta] = useState<{ width: number; height: number } | null>(null);
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const dispatch = useAppDispatch()
    const [showStyleSelector, setShowStyleSelector] = useState(false)
    const [showImageTypeSelector, setShowImageTypeSelector] = useState(false)
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
    // const { token } = theme.useToken(); // ChatWidgetUi will call this itself

    // Helper function to calculate skeleton dimensions based on aspect ratio
    const getSkeletonDimensions = (aspectRatio: string | undefined, baseSize = 120) => {
        if (!aspectRatio) return { width: baseSize, height: baseSize }; // Default to square

        const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);

        if (isNaN(widthRatio) || isNaN(heightRatio) || heightRatio === 0) {
            return { width: baseSize, height: baseSize }; // Default on invalid ratio
        }

        const ratio = widthRatio / heightRatio;

        let width, height;
        if (ratio >= 1) { // Wider than tall or square
            width = baseSize;
            height = baseSize / ratio;
        } else { // Taller than wide
            height = baseSize;
            width = baseSize * ratio;
        }

        return { width: Math.round(width), height: Math.round(height) };
    };

    // Handler to toggle image selection for upload
    const toggleSelectGeneratedImage = (image: UserUploadedFileType) => {
        setSelectedGeneratedForUpload(prevSelected =>
            prevSelected.some(img => img.uid === image.uid)
                ? prevSelected.filter(img => img.uid !== image.uid)
                : [...prevSelected, image]
        );
    };

    const onSelecteRefImage = (image: UserUploadedFileType | null) => {
        if (generationConfig.referanceImage?.url === image?.url) {
            setGenerationConfig({ ...generationConfig, referanceImage: null });
        } else {
            setGenerationConfig({ ...generationConfig, referanceImage: image || null });
        }
    }

    useEffect(() => {
        const selectedReferenceImage = generationConfig.referanceImage;

        if (!selectedReferenceImage?.url) {
            setSelectedReferenceImageMeta(null);
            return;
        }

        const image = new window.Image();
        image.onload = () => {
            setSelectedReferenceImageMeta({
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        };
        image.onerror = () => {
            setSelectedReferenceImageMeta(null);
        };
        image.src = selectedReferenceImage.url;
    }, [generationConfig.referanceImage]);

    const onGenerateImage = async (): Promise<void> => {

        // Validate prompt only if it's empty AND no description exists for the item
        if (!generationConfig.prompt && !selectedItem?.descriptionLine) {
            message.error('Please enter a prompt or ensure the item has a description.');
            return;
        }

        if (generationConfig.selectedImageTypes?.length === 0 && generationConfig.isMultiMode) {
            message.error('Please select at least one image type for multi-mode generation.');
            return;
        }

        setGenerationConfig({ ...generationConfig, loading: true, generatedImages: [] });
        dispatch(startLoader("Generating Image"))
        try {
            const genratedImages = await generateImageViaApi({
                itemDetails: selectedItem,
                generationConfig,
                projectId: activeProject?.projectId,
                fileId: selectedItem?.fileId,
                businessType: storeDetails?.businessType
            });
            if (genratedImages?.length > 0) {
                // Create a descriptive name based on the styles and prompt
                const imageName = `${generationConfig.styles[0] || 'custom'}_${selectedItem?.itemName}`;

                // Create a new reference image object
                const newGenImages: UserUploadedFileType[] = genratedImages.map((image: { base64: string; mimeType: string }, index: number) => {
                    const uniqueId = createUppercaseRandomIdSegment(6);
                    let name = imageName;
                    if (generationConfig.isMultiMode) {
                        name = `${imageName}_${generationConfig.selectedImageTypes[index]}`;
                    }
                    return { name, url: image.base64, uid: uniqueId }
                });

                // Update the reference images array
                const updatedRefImages = [...generationConfig.referanceImages, ...newGenImages];

                setGenerationConfig({
                    ...generationConfig,
                    loading: false,
                    generatedImages: newGenImages,
                    referanceImages: updatedRefImages,
                    referanceImage: null,
                    selectedImageTypes: []
                });
                await onPreferencesUsed?.(generationConfig);
                setSelectedGeneratedForUpload(newGenImages);
                message.success('Image generated successfully!');
                dispatch(stopLoader("Generating Image"))
            } else {
                message.error('Image generation failed!, try again.');
                dispatch(stopLoader("Generating Image"))
                setGenerationConfig({ ...generationConfig, loading: false });
            }

        } catch (error: any) {
            if (error instanceof AICapacityError) {
                message.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                logMenuEditorFailure('menu_editor_ai_image_generate_failed', error, {
                    ...getMenuEditorProjectLogContext(activeProject?.projectId, activeProject?.masterProjectId),
                    ...getBoundedMenuEditorStringContext('itemId', selectedItem?.id),
                    ...getBoundedMenuEditorStringContext('itemName', selectedItem?.itemName),
                    isMultiMode: Boolean(generationConfig.isMultiMode),
                    promptLength: generationConfig.prompt?.length || 0,
                    referenceImageCount: Array.isArray(generationConfig.referanceImages)
                        ? generationConfig.referanceImages.length
                        : 0,
                    selectedImageTypeCount: Array.isArray(generationConfig.selectedImageTypes)
                        ? generationConfig.selectedImageTypes.length
                        : 0,
                });
                message.error('Image generation failed. Please try again.');
            }
            dispatch(stopLoader("Generating Image"))
            setGenerationConfig({ ...generationConfig, loading: false });
        }
    }

    const handleRetryGeneration = () => {
        setGenerationConfig({ ...generationConfig, generatedImages: [] });
        setSelectedGeneratedForUpload([]); // Clear selection on retry
    };

    const findStyleByName = (styleName: string): {
        name: string;
        description: string;
    } | undefined => {
        for (const category of IMAGE_GENERATION_STYLES) {
            const style = category.styles.find(s => s.name === styleName);
            if (style) return style;
        }
        return undefined;
    };

    const formatFileSize = (size?: number) => {
        if (!size || Number.isNaN(size)) return 'Unknown size';
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };

    const selectedImageTypes = generationConfig.selectedImageTypes || [];

    const setSelectedImageTypes = (nextTypes: string[]) => {
        setGenerationConfig({ ...generationConfig, selectedImageTypes: nextTypes });
    };

    const toggleImageType = (type: string) => {
        const nextTypes = selectedImageTypes.includes(type)
            ? selectedImageTypes.filter((selectedType) => selectedType !== type)
            : [...selectedImageTypes, type];
        setSelectedImageTypes(nextTypes);
    };

    const selectCommonImageTypes = () => {
        setSelectedImageTypes(imageTypes.slice(0, 3).map((imageType) => imageType.type));
    };

    const renderImageTypeCard = (imageType: { type: string; description: string }) => {
        const isSelected = selectedImageTypes.includes(imageType.type);

        return (
            <Flex
                align="center"
                gap={10}
                key={imageType.type}
                onClick={() => toggleImageType(imageType.type)}
                style={{
                    background: token.colorFillAlter,
                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    padding: '10px 12px',
                }}
            >
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        background: 'transparent',
                        border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
                        borderRadius: '999px',
                        color: isSelected ? token.colorPrimary : token.colorTextSecondary,
                        flex: '0 0 auto',
                        height: 24,
                        width: 24,
                    }}
                >
                    <LuCheck size={12} />
                </Flex>
                <Flex gap={2} style={{ minWidth: 0 }} vertical>
                    <Typography.Text style={{ color: isSelected ? token.colorPrimary : undefined, lineHeight: 1.25 }}>
                        {imageType.type}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                        {imageType.description}
                    </Typography.Text>
                </Flex>
            </Flex>
        );
    };

    const renderImageTypeShortcut = (label: string, description: string, active: boolean, onClick: () => void, disabled = false) => (
        <Flex
            align="center"
            gap={10}
            onClick={() => {
                if (disabled) return;
                onClick();
            }}
            style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 8,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                padding: '8px 10px',
            }}
        >
            <Flex
                align="center"
                justify="center"
                style={{
                    background: 'transparent',
                    border: `1px solid ${active ? token.colorPrimary : disabled ? token.colorBorderSecondary : token.colorBorder}`,
                    borderRadius: '999px',
                    color: active ? token.colorPrimary : disabled ? token.colorTextQuaternary : token.colorTextSecondary,
                    flex: '0 0 auto',
                    height: 24,
                    width: 24,
                }}
            >
                <LuCheck size={12} />
            </Flex>
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                <Typography.Text style={{ lineHeight: 1.25 }}>{label}</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                    {description}
                </Typography.Text>
            </Flex>
        </Flex>
    );

    const renderImageTypePickerContent = () => (
        <Flex gap={16} vertical>
            <Flex
                gap={10}
                style={{
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 8,
                    padding: 12,
                }}
                vertical
            >
                <Flex align="center" justify="space-between" gap={8}>
                    <Flex gap={4} vertical>
                        <Typography.Text strong>Pick the photo set</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Choose the views you want. Use Recommended if you are unsure.
                        </Typography.Text>
                    </Flex>
                    {selectedImageTypes.length > 0 ? (
                        <Tag color="blue" style={{ flex: '0 0 auto', margin: 0 }}>{selectedImageTypes.length} selected</Tag>
                    ) : null}
                </Flex>
                <Flex
                    gap={8}
                    style={{
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        paddingTop: 10,
                    }}
                    vertical
                >
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Shortcuts
                    </Typography.Text>
                    {renderImageTypeShortcut(
                        'Recommended set',
                        'Best starting set for most menus.',
                        selectedImageTypes.length > 0 && selectedImageTypes.join('|') === imageTypes.slice(0, 3).map((imageType) => imageType.type).join('|'),
                        selectCommonImageTypes
                    )}
                    {renderImageTypeShortcut(
                        'All image types',
                        'Generate every available view.',
                        selectedImageTypes.length === imageTypes.length && imageTypes.length > 0,
                        () => setSelectedImageTypes(imageTypes.map((imageType) => imageType.type))
                    )}
                    <Button
                        color="danger"
                        disabled={selectedImageTypes.length === 0}
                        icon={<LuX />}
                        onClick={() => setSelectedImageTypes([])}
                        size="small"
                        style={{ alignSelf: 'flex-start', color: token.colorError, paddingInline: 0 }}
                        type="text"
                    >
                        Clear selection
                    </Button>
                </Flex>
            </Flex>
            <div
                style={{
                    display: 'grid',
                    gap: 12,
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                }}
            >
                {imageTypes.map(renderImageTypeCard)}
            </div>
        </Flex>
    );

    const imageTypePickerFooter = (
        <Flex gap={8} justify="flex-end">
            <Button
                onClick={() => setShowImageTypeSelector(false)}
                style={{ flex: isMobile ? 1 : undefined, minWidth: isMobile ? 0 : 96 }}
            >
                Close
            </Button>
            <Button
                disabled={selectedImageTypes.length === 0}
                onClick={() => setShowImageTypeSelector(false)}
                style={{ flex: isMobile ? 1 : undefined, minWidth: isMobile ? 0 : 96 }}
                type="primary"
            >
                Done
            </Button>
        </Flex>
    );

    const renderImageTypeSelector = () => {
        if (!generationConfig.isMultiMode) return null;

        if (isMobile) {
            return (
                <Popup
                    bodyStyle={{ minHeight: '72vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
                    destroyOnClose
                    onMaskClick={() => setShowImageTypeSelector(false)}
                    visible={showImageTypeSelector}
                >
                    <Flex style={{ height: '100%' }} vertical>
                        <NavBar onBack={() => setShowImageTypeSelector(false)}>Image Types</NavBar>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px' }}>
                            {renderImageTypePickerContent()}
                        </div>
                        <div
                            style={{
                                backgroundColor: token.colorBgContainer,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
                            }}
                        >
                            {imageTypePickerFooter}
                        </div>
                    </Flex>
                </Popup>
            );
        }

        return (
            <Modal
                footer={imageTypePickerFooter}
                onCancel={() => setShowImageTypeSelector(false)}
                open={showImageTypeSelector}
                title="Choose Image Types"
                width={760}
                styles={{
                    body: {
                        maxHeight: 'calc(100vh - 220px)',
                        overflowY: 'auto',
                        paddingTop: 12,
                    },
                }}
            >
                {renderImageTypePickerContent()}
            </Modal>
        );
    };

    return (
        <Card
            size="small"
            style={isMobile ? { background: 'transparent', border: 0 } : undefined}
            styles={{ body: { padding: isMobile ? 0 : undefined, paddingBottom: 0 } }}
        >
            <Flex vertical style={{ width: '100%' }} align="center">
                {generationConfig.loading ? (
                    <Flex vertical align="center" gap={8} style={{ width: '100%' }}>
                        <Loader />
                        <Typography.Text type="secondary">
                            {generationConfig.isMultiMode && generationConfig.selectedImageTypes && generationConfig.selectedImageTypes.length > 1
                                ? `Generating ${generationConfig.selectedImageTypes.length} images...`
                                : 'Generating image...'}
                        </Typography.Text>
                        {generationConfig.isMultiMode && generationConfig.selectedImageTypes && generationConfig.selectedImageTypes.length > 1 ? (
                            <Flex wrap justify="center" gap={16} style={{ width: '100%', maxWidth: 600 }}>
                                {generationConfig.selectedImageTypes.map((type, index) => (
                                    <Flex vertical key={index} align="center" style={{ marginBottom: 16 }}>
                                        <Skeleton.Image active style={getSkeletonDimensions(generationConfig.aspectRatio)} />
                                        <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                                            {type}
                                        </Typography.Text>
                                    </Flex>
                                ))}
                            </Flex>
                        ) : (
                            <Skeleton.Image active style={getSkeletonDimensions(generationConfig.aspectRatio)} />
                        )}
                    </Flex>
                ) : <>
                    {(Boolean(generationConfig.generatedImages?.length) && !generationConfig.loading) ? (
                        <Flex vertical align="center" justify="center" style={{ width: '100%' }} gap={8}>
                            <Typography.Text strong>Generated Image&apos;s:</Typography.Text>
                            <Flex wrap="wrap" gap={16} justify="center" style={{ marginTop: 16 }}>
                                {generationConfig.generatedImages?.map((image, index) => {
                                    const isSelected = selectedGeneratedForUpload.some(img => img.uid === image.uid);
                                    return (
                                        <Fragment key={image.uid || index}>
                                            <Tooltip title={image.name}>
                                                <Image
                                                    key={image.uid || index} // Use uid if available
                                                    src={image.url}
                                                    alt={`Generated image ${index + 1}`}
                                                    width={isMobile ? 112 : 150}
                                                    height={isMobile ? 112 : 150}
                                                    style={{
                                                        objectFit: 'cover',
                                                        border: isSelected ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorder}`,
                                                        padding: '4px',
                                                        borderRadius: token.borderRadius
                                                    }}
                                                    preview={{
                                                        maskClassName: 'custom-mask',
                                                        mask: (
                                                            <Space size={16}>
                                                                {/* <Tooltip title="Edit Image">
                                                            <LuPencil
                                                                style={{ fontSize: 20, color: '#fff', cursor: 'pointer' }}
                                                                onClick={(e) => { e.stopPropagation(); setImageEditModal({ active: true, imageData: image }); }}
                                                            />
                                                        </Tooltip> */}
                                                                <Tooltip title={isSelected ? "Deselect" : "Select for Upload"}>
                                                                    <LuCheckCircle
                                                                        style={{ fontSize: 20, color: isSelected ? token.colorPrimaryActive : '#fff', cursor: 'pointer' }}
                                                                        onClick={(e) => { e.stopPropagation(); toggleSelectGeneratedImage(image); }}
                                                                    />
                                                                </Tooltip>
                                                            </Space>
                                                        )
                                                    }}
                                                />
                                            </Tooltip>
                                        </Fragment>
                                    );
                                })}
                            </Flex>
                            <Flex gap={8} style={{ marginTop: 16 }} justify="center"> {/* Adjusted margin */}
                                <Popconfirm
                                    title="Current images will be discarded. Save them before retrying?"
                                    onConfirm={handleRetryGeneration}
                                    okText="Retry Anyway"
                                    cancelText="Cancel"
                                >
                                    <Button
                                        ghost
                                        type="primary"
                                        icon={<LuRefreshCcw />}
                                        block
                                    >
                                        Retry Generation
                                    </Button>
                                </Popconfirm>
                                <Button
                                    type="primary"
                                    onClick={() => onUploadGeneratedImage(selectedGeneratedForUpload)} // Pass selected images
                                    icon={<LuWand2 />}
                                    disabled={selectedGeneratedForUpload.length === 0} // Disable if none selected
                                >
                                    {`Upload ${selectedGeneratedForUpload.length > 0 ? selectedGeneratedForUpload.length : ''} Selected Image(s)`}
                                </Button>
                            </Flex>
                        </Flex>
                    ) : (
                        <Flex vertical gap={isMobile ? 18 : 24} justify='flex-start' align='center' style={{ width: '100%' }}>

                            <Flex gap={isMobile ? 18 : 24} style={{ width: '100%' }} vertical={isMobile}>
                                <Flex
                                    gap={isMobile ? 18 : 24}
                                    style={{
                                        flex: isMobile ? undefined : '1 1 0',
                                        maxHeight: isMobile ? undefined : 'calc(100vh - 336px)',
                                        minWidth: 0,
                                        overscrollBehavior: isMobile ? undefined : 'contain',
                                        overflowY: isMobile ? undefined : 'auto',
                                        paddingBottom: isMobile ? undefined : 28,
                                        paddingRight: isMobile ? undefined : 8,
                                        width: '100%',
                                    }}
                                    vertical
                                >
                                    <Flex
                                        gap={12}
                                        style={{
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            padding: '12px 14px',
                                            width: '100%',
                                        }}
                                        vertical
                                    >
                                        <Flex align="center" gap={8}>
                                            <Typography.Text strong>
                                                Reference image
                                            </Typography.Text>
                                            <Typography.Text type='secondary' style={{ fontSize: 11, color: token.colorTextDescription }}>
                                                Optional
                                            </Typography.Text>
                                        </Flex>
                                        <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: 1.35 }}>
                                            Add one image if you want the generated result to follow a specific style or composition.
                                        </Typography.Text>
                                        {generationConfig.referanceImage ? (
                                            <Flex
                                                gap={12}
                                                style={{
                                                    background: token.colorBgContainer,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 8,
                                                    padding: 10,
                                                    width: '100%',
                                                }}
                                            >
                                                <Image
                                                    src={generationConfig.referanceImage.url}
                                                    alt={generationConfig.referanceImage.name || 'Selected reference image'}
                                                    preview={false}
                                                    style={{
                                                        borderRadius: 8,
                                                        flex: '0 0 auto',
                                                        height: 72,
                                                        objectFit: 'cover',
                                                        width: 72,
                                                    }}
                                                />
                                                <Flex gap={4} style={{ minWidth: 0, flex: 1 }} vertical>
                                                    <Typography.Text strong ellipsis>
                                                        {generationConfig.referanceImage.name || 'Reference image'}
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                        {formatFileSize(generationConfig.referanceImage.size)}
                                                    </Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                        {selectedReferenceImageMeta
                                                            ? `${selectedReferenceImageMeta.width} x ${selectedReferenceImageMeta.height}px`
                                                            : 'Dimensions unavailable'}
                                                    </Typography.Text>
                                                </Flex>
                                            </Flex>
                                        ) : null}
                                        <Flex style={{ width: '100%' }} wrap gap={8} justify='flex-start' align='center'>
                                            {generationConfig.referanceImages.map((image, index) => (
                                                <Flex
                                                    key={index}
                                                    style={{
                                                        background: token.colorBgContainer,
                                                        border: `1px solid ${image.url === generationConfig.referanceImage?.url ? token.colorPrimary : token.colorBorderSecondary}`,
                                                        borderRadius: 8,
                                                        cursor: 'pointer',
                                                        height: 'auto',
                                                        position: 'relative',
                                                        width: 'auto',
                                                    }}
                                                >
                                                    <SelectedItemCheck active={image.url === generationConfig.referanceImage?.url} />
                                                    <Image
                                                        onClick={() => onSelecteRefImage(image)}
                                                        src={image.url}
                                                        alt={image.name}
                                                        style={{
                                                            borderRadius: 8,
                                                            height: 'auto',
                                                            maxHeight: 150,
                                                            maxWidth: 70,
                                                            width: 'auto',
                                                        }}
                                                        preview={false}
                                                    />
                                                </Flex>
                                            ))}
                                            <Upload
                                                {...uploadProps}
                                                multiple={false}
                                                showUploadList={false}
                                            >
                                                <Flex
                                                    gap={4}
                                                    vertical
                                                    align="center"
                                                    justify='center'
                                                    style={{
                                                        background: token.colorBgContainer,
                                                        borderRadius: 8,
                                                        flex: '0 0 auto',
                                                        height: 70,
                                                        padding: 8,
                                                        width: isMobile ? 70 : 104,
                                                    }}
                                                >
                                                    <LuImagePlus size={22} />
                                                    <Typography.Text style={{ fontSize: 11, lineHeight: 1.2, textAlign: 'center' }}>
                                                        Add image
                                                    </Typography.Text>
                                                </Flex>
                                            </Upload>
                                        </Flex>
                                    </Flex>

                                    <Flex
                                        onClick={() => {
                                            if (generationConfig.isMultiMode) {
                                                setShowImageTypeSelector(true);
                                            }
                                        }}
                                        gap={12}
                                        style={{
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            cursor: generationConfig.isMultiMode ? 'pointer' : 'default',
                                            padding: '12px 14px',
                                            width: '100%',
                                        }}
                                        vertical
                                    >
                                        <Flex align={isMobile ? 'flex-start' : 'center'} justify="space-between" gap={12}>
                                            <Flex gap={2} style={{ minWidth: 0, flex: 1 }} vertical>
                                                <Typography.Text strong>
                                                    Photo count
                                                </Typography.Text>
                                                <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                    {generationConfig.isMultiMode
                                                        ? selectedImageTypes.length > 0
                                                            ? `${selectedImageTypes.length} photo type${selectedImageTypes.length === 1 ? '' : 's'} selected.`
                                                            : 'Choose the photo views to generate.'
                                                        : 'Create one photo for this item.'}
                                                </Typography.Text>
                                            </Flex>
                                            <Flex align="center" gap={8} style={{ flex: '0 0 auto' }}>
                                                {generationConfig.isMultiMode ? (
                                                    <Button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setShowImageTypeSelector(true);
                                                        }}
                                                        size="small"
                                                        style={{ borderRadius: 8 }}
                                                        type="default"
                                                    >
                                                        {selectedImageTypes.length > 0 ? 'Change' : 'Choose'}
                                                    </Button>
                                                ) : null}
                                                <Switch
                                                    checked={generationConfig.isMultiMode}
                                                    onChange={(checked) => setGenerationConfig({ ...generationConfig, isMultiMode: checked, selectedImageTypes: [] })}
                                                    checkedChildren={<FaImages />}
                                                    unCheckedChildren={<LuImage />}
                                                />
                                            </Flex>
                                        </Flex>
                                        {generationConfig.isMultiMode ? (
                                            selectedImageTypes.length > 0 ? (
                                                <Flex gap={8} wrap="wrap">
                                                    {selectedImageTypes.slice(0, 4).map((type) => (
                                                        <Tag
                                                            key={type}
                                                            style={{
                                                                background: token.colorBgContainer,
                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                borderRadius: 8,
                                                                margin: 0,
                                                            }}
                                                        >
                                                            {type}
                                                        </Tag>
                                                    ))}
                                                    {selectedImageTypes.length > 4 ? (
                                                        <Tag
                                                            style={{
                                                                background: token.colorBgContainer,
                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                borderRadius: 8,
                                                                margin: 0,
                                                            }}
                                                        >
                                                            +{selectedImageTypes.length - 4} more
                                                        </Tag>
                                                    ) : null}
                                                </Flex>
                                            ) : (
                                                <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                    No photo set selected yet.
                                                </Typography.Text>
                                            )
                                        ) : null}
                                    </Flex>

                                    {renderImageTypeSelector()}

                                    <Flex
                                        onClick={() => setShowStyleSelector(true)}
                                        gap={12}
                                        style={{
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            padding: '12px 14px',
                                            width: '100%',
                                        }}
                                        vertical
                                    >
                                        <Flex align={isMobile ? 'flex-start' : 'center'} justify="space-between" gap={12}>
                                            <Flex gap={2} style={{ minWidth: 0, flex: 1 }} vertical>
                                                <Typography.Text strong>Image style</Typography.Text>
                                                <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                    Choose the look for the generated image.
                                                </Typography.Text>
                                            </Flex>
                                            <Button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setShowStyleSelector(true);
                                                }}
                                                size="small"
                                                style={{ borderRadius: 8, flex: '0 0 auto' }}
                                            >
                                                Change
                                            </Button>
                                        </Flex>
                                        <Flex gap={8} wrap="wrap">
                                            <Tag
                                                style={{
                                                    background: token.colorBgContainer,
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 8,
                                                    margin: 0,
                                                }}
                                            >
                                                {generationConfig.stylesCategory || 'Photorealism'}
                                            </Tag>
                                            {(generationConfig.styles || []).slice(0, 3).map((styleName) => {
                                                const styleObj = findStyleByName(styleName);
                                                return (
                                                    <Tag
                                                        key={styleName}
                                                        style={{
                                                            background: token.colorBgContainer,
                                                            border: `1px solid ${token.colorBorderSecondary}`,
                                                            borderRadius: 8,
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {styleObj?.name || styleName}
                                                    </Tag>
                                                );
                                            })}
                                            {(generationConfig.styles || []).length > 3 ? (
                                                <Tag
                                                    style={{
                                                        background: token.colorBgContainer,
                                                        border: `1px solid ${token.colorBorderSecondary}`,
                                                        borderRadius: 8,
                                                        margin: 0,
                                                    }}
                                                >
                                                    +{(generationConfig.styles || []).length - 3} more
                                                </Tag>
                                            ) : null}
                                        </Flex>
                                    </Flex>

                                    <StyleSelector
                                        open={showStyleSelector}
                                        setShowStyleSelector={setShowStyleSelector}
                                        selectedStyles={generationConfig.styles || []}
                                        stylesCategory={generationConfig.stylesCategory || 'Photorealism'}
                                        businessType={storeDetails?.businessType}
                                        businessCategory={storeDetails?.businessCategory}
                                        onChange={(styles, stylesCategory) => setGenerationConfig({ ...generationConfig, styles, stylesCategory })}
                                    />

                                    <Collapse
                                        ghost
                                        activeKey={showAdvancedOptions ? ['advanced'] : []}
                                        onChange={(keys) => setShowAdvancedOptions(keys.includes('advanced'))}
                                        style={{ width: '100%' }}
                                        items={[{
                                            key: 'advanced',
                                            label: (
                                                <Flex align="center" gap={8}>
                                                    <LuSettings2 />
                                                    <Typography.Text type="secondary">
                                                        Customize Image (Optional)
                                                    </Typography.Text>
                                                    <LuChevronDown style={{
                                                        transform: showAdvancedOptions ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s'
                                                    }} />
                                                </Flex>
                                            ),
                                            showArrow: false,
                                            styles: {
                                                body: {
                                                    padding: 0,
                                                },
                                            },
                                            children: (
                                                <Flex
                                                    vertical
                                                    gap={isMobile ? 16 : 24}
                                                    style={{
                                                        background: isMobile ? token.colorBgContainer : undefined,
                                                        border: isMobile ? `1px solid ${token.colorBorderSecondary}` : undefined,
                                                        borderRadius: isMobile ? 8 : undefined,
                                                        padding: isMobile ? 12 : '16px 0 0',
                                                        width: '100%',
                                                    }}
                                                >
                                                    <MultiSelectAttributeSelector
                                                        displayMode={isMobile ? 'select' : 'chips'}
                                                        label="Setting"
                                                        tooltip="Select one or more environments to influence the mood and look of the generated image."
                                                        options={selectedBusinessData?.contextual_elements?.environments || []}
                                                        selected={generationConfig.environments || []}
                                                        onChange={(environments) => setGenerationConfig({ ...generationConfig, environments })}
                                                    />
                                                    <MultiSelectAttributeSelector
                                                        displayMode={isMobile ? 'select' : 'chips'}
                                                        label="Lighting"
                                                        tooltip="Select one or more lighting conditions to influence the mood and look of the generated image."
                                                        options={selectedBusinessData?.contextual_elements?.lighting || []}
                                                        selected={generationConfig.lighting || []}
                                                        onChange={(lighting) => setGenerationConfig({ ...generationConfig, lighting })}
                                                        multi={true}
                                                    />
                                                    <MultiSelectAttributeSelector
                                                        displayMode={isMobile ? 'select' : 'chips'}
                                                        label="Colors"
                                                        tooltip="Select preferred colors to include in the generated image."
                                                        options={selectedBusinessData?.contextual_elements?.colors || []}
                                                        selected={generationConfig.colors || []}
                                                        onChange={(colors) => setGenerationConfig({ ...generationConfig, colors })}
                                                    />
                                                    <MultiSelectAttributeSelector
                                                        displayMode={isMobile ? 'select' : 'chips'}
                                                        label="Mood"
                                                        tooltip="Select the moods you want the generated image to convey."
                                                        options={selectedBusinessData?.contextual_elements?.moods || []}
                                                        selected={generationConfig.moods || []}
                                                        onChange={(moods) => setGenerationConfig({ ...generationConfig, moods })}
                                                        multi={true}
                                                    />
                                                    <MultiSelectAttributeSelector
                                                        displayMode={isMobile ? 'select' : 'chips'}
                                                        label="Camera Angle"
                                                        tooltip="Select one or more composition types for the image layout."
                                                        options={selectedBusinessData?.contextual_elements?.compositions || []}
                                                        selected={generationConfig.compositions || []}
                                                        onChange={(compositions) => setGenerationConfig({ ...generationConfig, compositions })}
                                                    />

                                                    <Flex gap={8} style={{ width: '100%' }} vertical>
                                                        <Typography.Text type='secondary'>Colors:</Typography.Text>
                                                        <Flex gap={10} style={{ width: '100%' }} vertical={isMobile}>
                                                            <Flex
                                                                align={isMobile ? "center" : "stretch"}
                                                                justify="space-between"
                                                                gap={10}
                                                                style={{
                                                                    background: token.colorFillAlter,
                                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                                    borderRadius: 8,
                                                                    padding: '10px 12px',
                                                                    flex: isMobile ? undefined : 1,
                                                                    width: '100%',
                                                                }}
                                                            >
                                                                <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                                                    <Tooltip title="If enabled, the generated image will have a transparent background. Background color selection will be disabled.">
                                                                        <Typography.Text strong>
                                                                            Transparent background <InfoCircleOutlined style={{ color: '#888', marginLeft: 4 }} />
                                                                        </Typography.Text>
                                                                    </Tooltip>
                                                                    <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                                        Removes the background behind the image.
                                                                    </Typography.Text>
                                                                </Flex>
                                                                <Switch
                                                                    checked={generationConfig.transparentBg || false}
                                                                    onChange={(checked) => setGenerationConfig({ ...generationConfig, transparentBg: checked })}
                                                                />
                                                            </Flex>

                                                            <Flex
                                                                align={isMobile ? "center" : "stretch"}
                                                                justify="space-between"
                                                                gap={10}
                                                                style={{
                                                                    background: token.colorFillAlter,
                                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                                    borderRadius: 8,
                                                                    flex: isMobile ? undefined : 1,
                                                                    opacity: generationConfig.transparentBg ? 0.55 : 1,
                                                                    padding: '10px 12px',
                                                                    width: '100%',
                                                                }}
                                                            >
                                                                <Flex gap={10} style={{ minWidth: 0 }} vertical>
                                                                    <Tooltip title="Pick a background color for the generated image. Disabled if Transparent Background is enabled.">
                                                                        <Typography.Text strong style={{ color: generationConfig.transparentBg ? token.colorTextDescription : undefined }}>
                                                                            Background color <InfoCircleOutlined style={{ color: '#888', marginLeft: 4 }} />
                                                                        </Typography.Text>
                                                                    </Tooltip>
                                                                    <Flex align="center" gap={8}>
                                                                        <span
                                                                            style={{
                                                                                background: generationConfig.backgroundColor || token.colorBgContainer,
                                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                                borderRadius: 999,
                                                                                display: 'inline-block',
                                                                                flex: '0 0 auto',
                                                                                height: 16,
                                                                                width: 16,
                                                                            }}
                                                                        />
                                                                        <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                                            {generationConfig.transparentBg
                                                                                ? 'Disabled while transparent background is on'
                                                                                : generationConfig.backgroundColor || 'No background color selected'}
                                                                        </Typography.Text>
                                                                    </Flex>
                                                                </Flex>
                                                                <ColorPicker
                                                                    allowClear
                                                                    disabled={!!generationConfig.transparentBg}
                                                                    value={generationConfig.backgroundColor}
                                                                    onChange={(color) => {
                                                                        const hexColor = color.toHexString();
                                                                        setGenerationConfig({ ...generationConfig, backgroundColor: hexColor });
                                                                    }}
                                                                    onClear={() => setGenerationConfig({ ...generationConfig, backgroundColor: null })}
                                                                />
                                                            </Flex>

                                                            <Flex
                                                                align={isMobile ? "center" : "stretch"}
                                                                justify="space-between"
                                                                gap={10}
                                                                style={{
                                                                    background: token.colorFillAlter,
                                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                                    borderRadius: 8,
                                                                    flex: isMobile ? undefined : 1,
                                                                    padding: '10px 12px',
                                                                    width: '100%',
                                                                }}
                                                            >
                                                                <Flex gap={10} style={{ minWidth: 0 }} vertical>
                                                                    <Tooltip title="Pick a foreground color for the generated image (e.g., for text or main elements).">
                                                                        <Typography.Text strong>
                                                                            Foreground color <InfoCircleOutlined style={{ color: '#888', marginLeft: 4 }} />
                                                                        </Typography.Text>
                                                                    </Tooltip>
                                                                    <Flex align="center" gap={8}>
                                                                        <span
                                                                            style={{
                                                                                background: generationConfig.foregroundColor || token.colorBgContainer,
                                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                                borderRadius: 999,
                                                                                display: 'inline-block',
                                                                                flex: '0 0 auto',
                                                                                height: 16,
                                                                                width: 16,
                                                                            }}
                                                                        />
                                                                        <Typography.Text type='secondary' style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                                            {generationConfig.foregroundColor || 'No foreground color selected'}
                                                                        </Typography.Text>
                                                                    </Flex>
                                                                </Flex>
                                                                <ColorPicker
                                                                    allowClear
                                                                    value={generationConfig.foregroundColor}
                                                                    onChange={(color) => {
                                                                        const hexColor = color.toHexString();
                                                                        setGenerationConfig({ ...generationConfig, foregroundColor: hexColor });
                                                                    }}
                                                                    onClear={() => setGenerationConfig({ ...generationConfig, foregroundColor: null })}
                                                                />
                                                            </Flex>
                                                        </Flex>
                                                    </Flex>

                                                    <AspectRatioSelector
                                                        imageType="menuItem"
                                                        selectedAspectRatio={generationConfig.aspectRatio || '1:1'}
                                                        onChange={(aspectRatio) => setGenerationConfig({ ...generationConfig, aspectRatio })}
                                                    />

                                                    <Flex vertical gap={8} style={{ width: '100%' }} justify='flex-start' align='start'>
                                                        <Tooltip title="Words to avoid in the generated image. For example, 'blurry, text, watermark' to exclude those elements.">
                                                            <Flex align="center" gap={4}>
                                                                <Typography.Text type='secondary'>Exclude from image:</Typography.Text>
                                                                <LuBadgeInfo style={{ color: token.colorTextSecondary }} />
                                                            </Flex>
                                                        </Tooltip>
                                                        <Input.TextArea
                                                            rows={2}
                                                            placeholder={`e.g., 'blurry, low quality, text, watermark'`}
                                                            value={generationConfig.negativePrompt}
                                                            onChange={(e) => setGenerationConfig({ ...generationConfig, negativePrompt: e.target.value })}
                                                            style={{ height: 50, minWidth: '100%', resize: 'none' }}
                                                        />
                                                    </Flex>
                                                </Flex>
                                            )
                                        }]}
                                    />

                                    {selectedItem === null && batchItemCount && batchItemCount > 0 && (
                                        <Typography.Text strong style={{ textAlign: 'center', marginBottom: token.marginSM }}>
                                            Configuring photo generation for {batchItemCount} item(s).
                                        </Typography.Text>
                                    )}
                                </Flex>

                                {!isMobile ? (
                                    <div
                                        style={{
                                            alignSelf: 'flex-start',
                                            flex: '0 0 336px',
                                            height: 'calc(100vh - 336px)',
                                            position: 'sticky',
                                            top: 0,
                                            width: 336,
                                        }}
                                    >
                                        <ChatWidgetUi
                                            isDesktopSidebar
                                            setShowStyleSelector={setShowStyleSelector}
                                            generationConfig={generationConfig}
                                            setGenerationConfig={setGenerationConfig}
                                            onGenerateImage={onGenerateImage}
                                            onSelecteRefImage={onSelecteRefImage}
                                        />
                                    </div>
                                ) : null}
                            </Flex>

                            {isMobile ? (
                                <ChatWidgetUi
                                    setShowStyleSelector={setShowStyleSelector}
                                    generationConfig={generationConfig}
                                    setGenerationConfig={setGenerationConfig}
                                    onGenerateImage={onGenerateImage}
                                    onSelecteRefImage={onSelecteRefImage}
                                />
                            ) : null}
                        </Flex>
                    )}
                </>}
            </Flex>
        </Card>
    );
};

export default AiImageGenerator;
