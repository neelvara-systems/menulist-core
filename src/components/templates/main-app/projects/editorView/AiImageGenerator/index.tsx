import { InfoCircleOutlined } from '@ant-design/icons';
import SelectedItemCheck from '@atoms/selectedItemCheck';
import { IMAGE_GENERATION_STYLES } from '@constant/AI';
import { useAppDispatch } from '@hook/useAppDispatch';
import Loader from '@organisms/loader';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import generateImageViaApi from '@services/ai/image/generateImageViaApi';
import { UserUploadedFileType } from '@type/common';
import { Button, Card, Checkbox, Collapse, ColorPicker, Flex, Image, Input, message, Popconfirm, Skeleton, Space, Switch, theme, Tooltip, Typography, Upload } from 'antd';
import React, { Fragment, useContext, useState } from 'react';
import { FaImages } from 'react-icons/fa6';
import { LuBadgeInfo, LuCheckCircle, LuChevronDown, LuImage, LuImagePlus, LuPen, LuRefreshCcw, LuSettings2, LuWand2 } from 'react-icons/lu';
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
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const selectedBusinessData = storeDetails?.businessType ? IMAGE_VIEW_TYPES.find(type => type.businessType === storeDetails?.businessType) : null;
    const [selectedGeneratedForUpload, setSelectedGeneratedForUpload] = useState<UserUploadedFileType[]>([]);
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext)
    const dispatch = useAppDispatch()
    const [showStyleSelector, setShowStyleSelector] = useState(false)
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

    return (
        <Card size="small" styles={{ body: { paddingBottom: 0 } }}>
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
                                                    width={150} // Adjusted size for better mask visibility
                                                    height={150}
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
                        <Flex vertical gap={34} justify='flex-start' align='center' style={{ width: '100%' }}>

                            <Typography.Text type="secondary" italic style={{ fontSize: '0.8em', marginTop: '4px' }}>
                                The item&apos;s name, category, and description (if available) will be used to generate the image.
                            </Typography.Text>

                            <Flex vertical gap={8} style={{ width: '100%' }} justify='flex-start' align='start'>
                                <Flex align="center" gap={8}>
                                    <Typography.Text type='secondary'>
                                        📷 Reference Image
                                    </Typography.Text>
                                    <Typography.Text type='secondary' style={{ fontSize: 11, color: token.colorTextDescription }}>
                                        (Optional - AI will match this style)
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
                                size="small"
                                style={{
                                    width: '100%',
                                    backgroundColor: generationConfig.isMultiMode ? token.colorPrimaryBg : token.colorBgLayout,
                                    borderColor: generationConfig.isMultiMode ? token.colorPrimaryBorder : token.colorBorder,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <Flex align='center' justify='space-between' gap={8} style={{ width: '100%' }}>
                                    <Flex vertical gap={4}>
                                        <Typography.Text strong style={{ fontSize: 13 }}>
                                            {generationConfig.isMultiMode ? '📸 Multi-Image Mode' : '🖼️ Single Image Mode'}
                                        </Typography.Text>
                                        <Typography.Text type='secondary' style={{ fontSize: 11 }}>
                                            {generationConfig.isMultiMode
                                                ? 'Generate multiple image types at once (hero, detail, ambiance, etc.)'
                                                : 'Generate one high-quality image based on your settings'
                                            }
                                        </Typography.Text>
                                    </Flex>
                                    <Switch
                                        checked={generationConfig.isMultiMode}
                                        onChange={(checked) => setGenerationConfig({ ...generationConfig, isMultiMode: checked, selectedImageTypes: [] })}
                                        checkedChildren={<FaImages />}
                                        unCheckedChildren={<LuImage />}
                                    />
                                </Flex>
                            </Card>

                            {/* Image Types Selection - only show when multi-mode is enabled */}
                            {generationConfig.isMultiMode && (
                                <Flex vertical gap={8} style={{ width: '100%' }} justify='flex-start' align='start'>
                                    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                                        <Typography.Text type='secondary'>Image Types:</Typography.Text>
                                        <Button
                                            type="link"
                                            size="small"
                                            onClick={() => {
                                                const allTypes = selectedBusinessData.imageTypes.map(type => type.type);
                                                setGenerationConfig({
                                                    ...generationConfig,
                                                    selectedImageTypes: allTypes.length === generationConfig.selectedImageTypes?.length ? [] : allTypes
                                                });
                                            }}
                                        >
                                            {generationConfig.selectedImageTypes?.length === selectedBusinessData.imageTypes.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </Flex>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        {selectedBusinessData?.imageTypes?.map(imageType => (
                                            <Checkbox
                                                key={imageType.type}
                                                checked={generationConfig.selectedImageTypes?.includes(imageType.type)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setGenerationConfig({
                                                            ...generationConfig,
                                                            selectedImageTypes: [...(generationConfig.selectedImageTypes || []), imageType.type]
                                                        });
                                                    } else {
                                                        setGenerationConfig({
                                                            ...generationConfig,
                                                            selectedImageTypes: (generationConfig.selectedImageTypes || []).filter(type => type !== imageType.type)
                                                        });
                                                    }
                                                }}
                                            >
                                                <Flex vertical>
                                                    <Typography.Text>{imageType.type}</Typography.Text>
                                                    <Typography.Text type="secondary" style={{ fontSize: '0.8em' }}>
                                                        {imageType.description}
                                                    </Typography.Text>
                                                </Flex>
                                            </Checkbox>
                                        ))}
                                    </Space>
                                </Flex>
                            )}

                            <Flex gap={4} vertical style={{ width: '100%' }} justify='flex-start' align='start' >
                                <Typography.Text type='secondary'>Styles*:</Typography.Text>
                                <Flex gap={4} wrap style={{ width: '100%' }} onClick={() => setShowStyleSelector(true)}>
                                    <Button shape='round' ghost type='primary'>{generationConfig.stylesCategory}</Button>
                                    {(generationConfig.styles || []).map((styleName, index) => {
                                        const styleObj = findStyleByName(styleName);
                                        return <Fragment key={styleName}>
                                            <Button shape='round'>{styleObj?.name}</Button></Fragment>
                                    })}
                                    <Button shape='circle' type='text' icon={<LuPen />} />
                                </Flex>
                            </Flex>

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
                                        <Flex vertical gap={24} style={{ width: '100%', paddingTop: 16 }}>
                                            <MultiSelectAttributeSelector
                                                label="Setting"
                                                tooltip="Select one or more environments to influence the mood and look of the generated image."
                                                options={selectedBusinessData?.contextual_elements?.environments || []}
                                                selected={generationConfig.environments || []}
                                                onChange={(environments) => setGenerationConfig({ ...generationConfig, environments })}
                                            />
                                            <MultiSelectAttributeSelector
                                                label="Lighting"
                                                tooltip="Select one or more lighting conditions to influence the mood and look of the generated image."
                                                options={selectedBusinessData?.contextual_elements?.lighting || []}
                                                selected={generationConfig.lighting || []}
                                                onChange={(lighting) => setGenerationConfig({ ...generationConfig, lighting })}
                                                multi={true}
                                            />
                                            <MultiSelectAttributeSelector
                                                label="Colors"
                                                tooltip="Select preferred colors to include in the generated image."
                                                options={selectedBusinessData?.contextual_elements?.colors || []}
                                                selected={generationConfig.colors || []}
                                                onChange={(colors) => setGenerationConfig({ ...generationConfig, colors })}
                                            />
                                            <MultiSelectAttributeSelector
                                                label="Mood"
                                                tooltip="Select the moods you want the generated image to convey."
                                                options={selectedBusinessData?.contextual_elements?.moods || []}
                                                selected={generationConfig.moods || []}
                                                onChange={(moods) => setGenerationConfig({ ...generationConfig, moods })}
                                                multi={true}
                                            />
                                            <MultiSelectAttributeSelector
                                                label="Camera Angle"
                                                tooltip="Select one or more composition types for the image layout."
                                                options={selectedBusinessData?.contextual_elements?.compositions || []}
                                                selected={generationConfig.compositions || []}
                                                onChange={(compositions) => setGenerationConfig({ ...generationConfig, compositions })}
                                            />

                                            <Flex gap={16} justify='flex-start' align='center' style={{ width: '100%' }}>
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
