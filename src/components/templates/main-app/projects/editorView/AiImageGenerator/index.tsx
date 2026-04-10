import { InfoCircleOutlined } from '@ant-design/icons';
import SelectedItemCheck from '@atoms/selectedItemCheck';
import { IMAGE_GENERATION_STYLES } from '@constant/AI';
import useDeviceType from '@hook/useDeviceType';
import { useAppDispatch } from '@hook/useAppDispatch';
import Loader from '@organisms/loader';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import generateImageViaApi from '@services/ai/image/generateImageViaApi';
import { UserUploadedFileType } from '@type/common';
import { Button, Card, Checkbox, Collapse, ColorPicker, Flex, Image, Input, message, Modal, Popconfirm, Skeleton, Space, Switch, Tag, theme, Tooltip, Typography, Upload } from 'antd';
import React, { Fragment, useContext, useState } from 'react';
import { FaImages } from 'react-icons/fa6';
import { LuBadgeInfo, LuCheck, LuCheckCircle, LuChevronDown, LuImage, LuImagePlus, LuRefreshCcw, LuSettings2, LuWand2 } from 'react-icons/lu';
import { NavBar, Popup } from '../../../../../mobile/antd';
import { ImageGenerationConfigType, ItemForDropdown } from '../../types';
import AspectRatioSelector from './AspectRatioSelector';
import ChatWidgetUi from './ChatWidgetUi'; // Import the new component
import { IMAGE_VIEW_TYPES } from './imageViewType';
import MultiSelectAttributeSelector from './MultiSelectAttributeSelector';
import StyleSelector from './StyleSelector';

interface AiImageGeneratorProps {
    selectedItem: ItemForDropdown | null;
    generationConfig: ImageGenerationConfigType;
    setGenerationConfig: (config: ImageGenerationConfigType) => void;
    uploadProps: any;
    onUploadGeneratedImage: (images: UserUploadedFileType[]) => void;
    batchItemCount?: number; // Number of items in the batch
}

const AiImageGenerator: React.FC<AiImageGeneratorProps> = ({
    selectedItem,
    generationConfig,
    setGenerationConfig,
    uploadProps,
    onUploadGeneratedImage,
    batchItemCount
}) => {

    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const normalizedBusinessType = storeDetails?.businessType?.trim().toLowerCase();
    const selectedBusinessData = IMAGE_VIEW_TYPES.find(type => type.businessType?.trim().toLowerCase() === normalizedBusinessType)
        || IMAGE_VIEW_TYPES.find(type => type.businessType === 'Restaurant')
        || IMAGE_VIEW_TYPES[0];
    const imageTypes = selectedBusinessData?.imageTypes || [];
    const [selectedGeneratedForUpload, setSelectedGeneratedForUpload] = useState<UserUploadedFileType[]>([]);
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
                    const uniqueId = Math.random().toString(36).substring(2, 5).toUpperCase();
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
                message.info('Get more AI enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                message.error(`Image generation failed: ${error.message}`);
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
            <div
                key={imageType.type}
                onClick={() => toggleImageType(imageType.type)}
                style={{
                    backgroundColor: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                    border: `2px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    padding: 12,
                    position: 'relative',
                }}
            >
                <SelectedItemCheck active={isSelected} />
                <Flex gap={4} vertical>
                    <Typography.Text strong>{imageType.type}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>
                        {imageType.description}
                    </Typography.Text>
                </Flex>
            </div>
        );
    };

    const renderImageTypeShortcut = (label: string, description: string, onClick: () => void, disabled = false) => (
        <Flex
            align="center"
            gap={10}
            onClick={() => {
                if (disabled) return;
                onClick();
            }}
            style={{
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 8,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
                padding: '10px 12px',
            }}
        >
            <Flex
                align="center"
                justify="center"
                style={{
                    background: disabled ? token.colorBgTextHover : token.colorPrimaryBg,
                    borderRadius: 8,
                    color: disabled ? token.colorTextQuaternary : token.colorPrimary,
                    flex: '0 0 auto',
                    height: 32,
                    width: 32,
                }}
            >
                <LuCheck size={16} />
            </Flex>
            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                <Typography.Text strong>{label}</Typography.Text>
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
                    <Typography.Text strong type="secondary" style={{ fontSize: 12 }}>
                        Shortcuts
                    </Typography.Text>
                    {renderImageTypeShortcut('Recommended set', 'Best starting set for most menus.', selectCommonImageTypes)}
                    {renderImageTypeShortcut('All image types', 'Generate every available view.', () => setSelectedImageTypes(imageTypes.map((imageType) => imageType.type)))}
                    {renderImageTypeShortcut('Clear selection', 'Start over with no selected views.', () => setSelectedImageTypes([]), selectedImageTypes.length === 0)}
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
                        <Flex vertical gap={isMobile ? 18 : 34} justify='flex-start' align='center' style={{ width: '100%' }}>

                            <Typography.Text type="secondary" style={{ fontSize: isMobile ? 12 : '0.8em', marginTop: isMobile ? 0 : '4px', width: '100%' }}>
                                We will use the item name, category, and description to guide the image.
                            </Typography.Text>

                            <Flex vertical gap={8} style={{ width: '100%' }} justify='flex-start' align='start'>
                                <Flex align="center" gap={8}>
                                    <Typography.Text type='secondary'>
                                        Reference image
                                    </Typography.Text>
                                    <Typography.Text type='secondary' style={{ fontSize: 11, color: token.colorTextDescription }}>
                                        Optional
                                    </Typography.Text>
                                </Flex>
                                <Flex style={{ width: '100%' }} wrap gap={8} justify='flex-start' align='center'>
                                    {generationConfig.referanceImages.map((image, index) => (
                                        <Flex key={index} style={{ cursor: 'pointer', width: "auto", position: 'relative', height: "auto", borderRadius: 4, outline: `1px solid ${image.url === generationConfig.referanceImage?.url ? token.colorPrimary : '#d9d9d9'}` }}>
                                            <SelectedItemCheck active={image.url === generationConfig.referanceImage?.url} />
                                            <Image
                                                onClick={() => onSelecteRefImage(image)}
                                                src={image.url}
                                                alt={image.name}
                                                style={{
                                                    height: 'auto',
                                                    width: 'auto',
                                                    borderRadius: 4,
                                                    maxWidth: 70,
                                                    maxHeight: 150
                                                }}
                                                preview={false}
                                            />
                                        </Flex>
                                    ))}
                                    <Upload.Dragger {...uploadProps} multiple={false} itemRender={() => null} listType="">
                                        <Flex vertical align="center" justify='center' style={{ width: 50, height: 50 }}>
                                            <LuImagePlus size={28} />
                                        </Flex>
                                    </Upload.Dragger>
                                </Flex>
                            </Flex>

                            <Card
                                onClick={() => {
                                    if (generationConfig.isMultiMode) {
                                        setShowImageTypeSelector(true);
                                    }
                                }}
                                size="small"
                                style={{
                                    borderColor: token.colorBorderSecondary,
                                    cursor: generationConfig.isMultiMode ? 'pointer' : 'default',
                                    width: '100%',
                                }}
                            >
                                <Flex gap={10} vertical>
                                    <Flex align="center" justify="space-between" gap={8}>
                                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
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
                                                    type={selectedImageTypes.length > 0 ? 'default' : 'primary'}
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
                                    {generationConfig.isMultiMode && selectedImageTypes.length > 0 ? (
                                        <Flex gap={6} wrap="wrap">
                                            {selectedImageTypes.slice(0, 4).map((type) => (
                                                <Tag key={type} color="processing" style={{ borderRadius: 8, margin: 0 }}>
                                                    {type}
                                                </Tag>
                                            ))}
                                            {selectedImageTypes.length > 4 ? (
                                                <Tag style={{ borderRadius: 8, margin: 0 }}>
                                                    +{selectedImageTypes.length - 4} more
                                                </Tag>
                                            ) : null}
                                        </Flex>
                                    ) : null}
                                    {generationConfig.isMultiMode && selectedImageTypes.length === 0 ? (
                                        <Tag style={{ borderRadius: 8, margin: 0, width: 'fit-content' }}>
                                            No photo set selected
                                        </Tag>
                                    ) : null}
                                </Flex>
                            </Card>

                            {renderImageTypeSelector()}

                            <Card
                                onClick={() => setShowStyleSelector(true)}
                                size="small"
                                style={{
                                    borderColor: token.colorBorderSecondary,
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Flex gap={10} vertical>
                                    <Flex align="center" justify="space-between" gap={8}>
                                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
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
                                            style={{ flex: '0 0 auto' }}
                                        >
                                            Change
                                        </Button>
                                    </Flex>
                                    <Flex gap={6} wrap="wrap">
                                        <Tag color="processing" style={{ borderRadius: 8, margin: 0 }}>
                                            {generationConfig.stylesCategory || 'Photorealism'}
                                        </Tag>
                                        {(generationConfig.styles || []).slice(0, 3).map((styleName) => {
                                            const styleObj = findStyleByName(styleName);
                                            return (
                                                <Tag key={styleName} style={{ borderRadius: 8, margin: 0 }}>
                                                    {styleObj?.name || styleName}
                                                </Tag>
                                            );
                                        })}
                                        {(generationConfig.styles || []).length > 3 ? (
                                            <Tag style={{ borderRadius: 8, margin: 0 }}>
                                                +{(generationConfig.styles || []).length - 3} more
                                            </Tag>
                                        ) : null}
                                    </Flex>
                                </Flex>
                            </Card>

                            <StyleSelector
                                open={showStyleSelector}
                                setShowStyleSelector={setShowStyleSelector}
                                selectedStyles={generationConfig.styles || []}
                                stylesCategory={generationConfig.stylesCategory || 'Photorealism'}
                                businessType={storeDetails?.businessType}
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

                                            <Flex gap={isMobile ? 12 : 16} justify='flex-start' align={isMobile ? 'stretch' : 'center'} style={{ width: '100%' }} vertical={isMobile}>
                                                <Flex vertical gap={8} justify='flex-start' align='start' style={{ width: '100%' }}>
                                                    <Flex align='center' gap={8}>
                                                        <Tooltip title="If enabled, the generated image will have a transparent background. Background color selection will be disabled.">
                                                            <Checkbox
                                                                checked={generationConfig.transparentBg || false}
                                                                onChange={e => setGenerationConfig({ ...generationConfig, transparentBg: e.target.checked })}
                                                            >
                                                                Transparent Background <InfoCircleOutlined style={{ color: '#888', marginLeft: 4 }} />
                                                            </Checkbox>
                                                        </Tooltip>
                                                    </Flex>
                                                </Flex>

                                                <Flex justify='flex-start' align='center' style={{ width: '100%' }}>
                                                    <Tooltip title="Pick a background color for the generated image. Disabled if Transparent Background is enabled.">
                                                        <Typography.Text style={{ fontSize: 12, width: '90px', color: generationConfig.transparentBg ? token.colorTextDescription : token.colorTextBase }} type='secondary'>
                                                            Background Color <InfoCircleOutlined style={{ color: '#888', marginLeft: 4 }} />
                                                        </Typography.Text>
                                                    </Tooltip>
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

                                                <Flex justify='flex-start' align='center' style={{ width: '100%' }}>
                                                    <Tooltip title="Pick a foreground color for the generated image (e.g., for text or main elements).">
                                                        <Typography.Text style={{ fontSize: 12, width: '90px' }}>
                                                            Foreground Color <InfoCircleOutlined style={{ color: '#888', marginLeft: 4 }} />
                                                        </Typography.Text>
                                                    </Tooltip>
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

                                            <AspectRatioSelector
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
                                    Configuring AI generation for {batchItemCount} item(s).
                                </Typography.Text>
                            )}

                            <ChatWidgetUi
                                setShowStyleSelector={setShowStyleSelector}
                                generationConfig={generationConfig}
                                setGenerationConfig={setGenerationConfig}
                                onGenerateImage={onGenerateImage}
                                onSelecteRefImage={onSelecteRefImage}
                            />
                        </Flex>
                    )}
                </>}
            </Flex>
        </Card>
    );
};

export default AiImageGenerator;
