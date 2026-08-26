import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage, type MediaImageCropIntent } from '@lib/media/prepareMediaImage';
import MediaImageCard from '@/components/shared/media/MediaImageCard';
import MediaImageAdjustModal from '@/components/shared/media/MediaImageAdjustModal';
import MediaPublicContextPreview from '@/components/shared/media/MediaPublicContextPreview';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { removeObjRef } from '@util/utils';
import { Button, Card, ColorPicker, Divider, Flex, Tabs, Tooltip, Typography, App, theme } from 'antd';
import type { Color } from 'antd/es/color-picker';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuTrash } from 'react-icons/lu';
import ColorPresetsDrawer from './colorPresetsDrawer';
import GradientPicker from './GradientPicker';
import { isGradientString } from './gradientUtils';
import ImageGalleryDrawer from './imageGalleryDrawer';

interface BackgroundSettingsProps {
    config: any;
    onUpdate: (config: any) => void;
    previewAccentColor?: string;
    previewSubtitle?: string;
    previewTitle?: string;
    from: string
}

// Extracted reusable component for image upload UI
const ImageUploadSection = ({
    canAdjust,
    config,
    onAdjust,
    onRemove,
    onOpenGallery,
    onSelectFile,
    previewAccentColor,
    previewSubtitle,
    previewTitle,
    t,
}: {
    canAdjust?: boolean;
    config: any;
    onAdjust?: () => void;
    onRemove: () => void;
    onOpenGallery: (e: React.MouseEvent) => void;
    onSelectFile: (file: File) => void | Promise<void>;
    previewAccentColor?: string;
    previewSubtitle?: string;
    previewTitle?: string;
    t: (key: string) => string;
}) => {
    return (
        <Flex vertical>
            <Card size='small'>
                <MediaImageCard
                    accept={getMediaProfileAcceptAttribute('menuBackground')}
                    alt={t('background')}
                    canAdjust={canAdjust}
                    helperText={t('backgroundUploadFormats')}
                    imageType="menuBackground"
                    imageUrl={config?.backgroundImage}
                    onAdjust={onAdjust}
                    onRemove={config?.backgroundImage ? onRemove : undefined}
                    onSelectFile={onSelectFile}
                    placeholderDescription={t('backgroundUploadFormats')}
                    placeholderTitle={t('backgroundUploadPrompt')}
                    replaceLabel={t('replace')}
                />
                <Button
                    type='link'
                    style={{ marginTop: 8, paddingInline: 0 }}
                    onClick={onOpenGallery}
                >
                    {config?.backgroundImage ? t('gallery') : t('exploreGallery')}
                </Button>
                <MediaPublicContextPreview
                    accentColor={previewAccentColor}
                    imageType="menuBackground"
                    imageUrl={config?.backgroundImage}
                    subtitle={previewSubtitle}
                    title={previewTitle}
                />
            </Card>
        </Flex>
    );
};

export default function BackgroundSettings({ config, onUpdate, previewAccentColor, previewSubtitle, previewTitle, from }: BackgroundSettingsProps) {
    const { message: messageApi } = App.useApp();
    const t = useTranslations('MobileDesignEditor');
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const { token } = theme.useToken();

    // Background mode state
    const [backgroundMode, setBackgroundMode] = useState<'solid' | 'gradient' | 'image'>(
        config?.backgroundImage ? 'image' :
            config?.background?.includes('linear-gradient') ? 'gradient' : 'solid'
    );

    // Simple color value state
    const [colorValue, setColorValue] = useState<Color | string | null>(
        !config?.background?.includes('linear-gradient') ? config?.background : '#ffffff'
    );

    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isColorPresetsOpen, setIsColorPresetsOpen] = useState(false);
    const [backgroundImageDraft, setBackgroundImageDraft] = useState<{
        crop?: MediaImageCropIntent;
        fileName?: string;
        sourceDataUrl?: string;
    } | null>(null);
    const [isBackgroundAdjustOpen, setIsBackgroundAdjustOpen] = useState(false);

    // Parse existing background on initial load
    useEffect(() => {
        if (!config) return;

        if (config.backgroundImage) {
            setBackgroundMode('image');
        } else if (config.background) {
            if (isGradientString(config.background)) {
                setBackgroundMode('gradient');
            } else {
                setColorValue(config.background);
                setBackgroundMode('solid');
            }
        }
    }, [config]);  // Run whenever config changes

    const handleChange = (key: string, value: any) => {
        const configCopy = removeObjRef(config);

        if (key === 'background') {
            configCopy.background = value;

            // Also update the color property for text contrast if it's a solid color
            if (!isGradientString(value)) {
                configCopy.color = configCopy.color || '#ffffff';
            }
        } else {
            if (value) {
                configCopy.backgroundImage = value;
            } else {
                configCopy.backgroundImage = '';
            }
            configCopy.backgroundStyle = {
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            };
        }
        onUpdate(configCopy);
    };

    const handleRemoveBackground = () => {
        const configCopy = removeObjRef(config);
        delete configCopy.backgroundImage;
        delete configCopy.background;
        delete configCopy.backgroundStyle; // Also remove related styles if needed
        onUpdate(configCopy);

        // Reset local states
        setFileList([]);
        setBackgroundImageDraft(null);
        setIsBackgroundAdjustOpen(false);
        setColorValue('#ffffff'); // Reset to default or transparent
        setBackgroundMode('solid'); // Reset mode to default
    };

    const handleImageUploadProps = {
        accept: getMediaProfileAcceptAttribute('menuBackground'),
        maxCount: 1,
        fileList: fileList,
        beforeUpload: async (file: File) => {
            const fileData = { ...file, uid: new Date().getTime() + file.name };

            // Check 1: File type validation
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                messageApi.error('You can only upload image files!');
                return false;
            }

            const didProcessImage = await handleImageUpload(file);
            if (!didProcessImage) {
                return false;
            }

            // All checks passed, keep local upload state
            setFileList([fileData]);
            return false;
        },
        onRemove: () => {
            setFileList([]);
            setBackgroundImageDraft(null);
            setIsBackgroundAdjustOpen(false);
            handleChange('backgroundImage', '');
        },
        itemRender: (): null => null
    };

    const handleImageUpload = async (file: File) => {
        try {
            const prepared = await prepareMediaImage(file, 'menuBackground');
            handleChange('backgroundImage', prepared.dataUrl);
            setBackgroundImageDraft({
                crop: prepared.crop,
                fileName: prepared.sourceName || file.name,
                sourceDataUrl: prepared.sourceDataUrl,
            });
            return true;
        } catch (error) {
            logRuntimeFailure('menu_background_image_prepare_failed', error, {
                ...getBoundedRuntimeStringContext('fileName', file.name),
                ...getBoundedRuntimeStringContext('sourceView', from),
            });
            messageApi.error('Failed to process image. Please try another image.');
            return false;
        }
    };

    const handleOpenGallery = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsGalleryOpen(true);
    };

    return (
        <Card size='small'>
            <Flex vertical gap={16}>
                <Flex justify="space-between" align="center">
                    {from == "Main" ? <Typography.Text strong>{t('background')}</Typography.Text> :
                        <span >{t('background')}</span>
                    }
                    {(config?.backgroundImage || config?.background) && (
                        <Tooltip title={t('removeBackground')}>
                            <Button
                                aria-label={t('removeBackground')}
                                type="text"
                                danger
                                size="small"
                                icon={<LuTrash />}
                                onClick={handleRemoveBackground}
                            />
                        </Tooltip>
                    )}
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 10, marginBottom: 8 }}>
                    {t('backgroundImagePriorityNote')}
                </Typography.Text>
                <Tabs
                    activeKey={backgroundMode}
                    onChange={(value) => setBackgroundMode(value as 'solid' | 'gradient' | 'image')}
                    items={[
                        {
                            key: 'solid',
                            label: t('solidColor'),
                            children: (
                                <Flex gap={8} align="center" wrap="wrap" style={{ marginTop: 16 }}>
                                    {config?.backgroundImage && (
                                        <Typography.Text type="secondary" style={{ fontSize: 12, width: '100%', marginBottom: 8 }}>
                                            {t('removeImageBackgroundForColors')}
                                        </Typography.Text>
                                    )}
                                    <span>{t('colorLabel')}</span>
                                    <ColorPicker
                                        allowClear
                                        value={colorValue}
                                        onChange={(color) => {
                                            const hexColor = color.toHexString();
                                            setColorValue(hexColor);
                                            handleChange('background', hexColor);
                                        }}
                                    />
                                    <Button
                                        type='link'
                                        style={{ marginLeft: "auto" }}
                                        onClick={() => setIsColorPresetsOpen(true)}
                                    >
                                        {t('exploreColors')}
                                    </Button>
                                </Flex>
                            ),
                        },
                        {
                            key: 'gradient',
                            label: t('gradient'),
                            children: (
                                <Flex vertical style={{ marginTop: 16 }}>
                                    {config?.backgroundImage && (
                                        <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                                            {t('removeImageBackgroundForGradient')}
                                        </Typography.Text>
                                    )}
                                    <GradientPicker
                                        value={config?.background}
                                        onChange={(gradientString) => handleChange('background', gradientString)}
                                        onOpenColorPresets={() => setIsColorPresetsOpen(true)}
                                    />
                                </Flex>
                            ),
                        },
                        {
                            key: 'image',
                            label: t('image'),
                            children: (
                                <Flex vertical gap={8} style={{ marginTop: 16 }}>
                                    <ImageUploadSection
                                        canAdjust={Boolean(backgroundImageDraft?.sourceDataUrl)}
                                        config={config}
                                        onAdjust={() => setIsBackgroundAdjustOpen(true)}
                                        onRemove={() => handleImageUploadProps.onRemove()}
                                        onSelectFile={async (file) => {
                                            await handleImageUploadProps.beforeUpload(file);
                                        }}
                                        onOpenGallery={handleOpenGallery}
                                        previewAccentColor={previewAccentColor}
                                        previewSubtitle={previewSubtitle}
                                        previewTitle={previewTitle}
                                        t={t}
                                    />
                                </Flex>
                            ),
                        },
                    ]}
                    style={{ marginBottom: 16 }}
                />

                <Divider style={{ margin: ' 0' }} />

                {/* {backgroundMode !== 'image' && (
                    <Flex vertical gap={8}>
                        <span>Background Image (Optional)</span>
                        <ImageUploadSection
                            config={config}
                            uploadProps={handleImageUploadProps}
                            onOpenGallery={handleOpenGallery}
                        />
                    </Flex>
                )} */}
            </Flex>

            <ImageGalleryDrawer
                open={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onImageSelect={(imageUrl) => {
                    setBackgroundImageDraft(null);
                    setIsBackgroundAdjustOpen(false);
                    handleChange('backgroundImage', imageUrl);
                }}
                uploadProps={handleImageUploadProps}
            />
            <ColorPresetsDrawer
                open={isColorPresetsOpen}
                colorMode={backgroundMode}
                onClose={() => setIsColorPresetsOpen(false)}
                onColorSelect={(colorOrGradient) => {
                    // Check if it's a gradient object
                    if (typeof colorOrGradient === 'object' && colorOrGradient.type === 'gradient') {
                        // Set background mode to gradient
                        setBackgroundMode('gradient');

                        // Generate the gradient string
                        const gradientString = `linear-gradient(${colorOrGradient.angle}deg, ${colorOrGradient.colors
                            .map(c => `${c.color} ${c.position}%`)
                            .join(', ')
                            })`;

                        // Apply the gradient string directly
                        handleChange('background', gradientString);
                    } else if (typeof colorOrGradient === 'string') {
                        // It's a single color
                        // Always set to solid mode when a solid color is selected
                        setBackgroundMode('solid');

                        // Update the color value
                        setColorValue(colorOrGradient);

                        // Update the background
                        handleChange('background', colorOrGradient);
                    }
                }}
            />
            <MediaImageAdjustModal
                fileName={backgroundImageDraft?.fileName}
                imageType="menuBackground"
                initialCrop={backgroundImageDraft?.crop}
                onApply={(prepared) => {
                    handleChange('backgroundImage', prepared.dataUrl);
                    setBackgroundImageDraft({
                        crop: prepared.crop,
                        fileName: prepared.sourceName || backgroundImageDraft?.fileName,
                        sourceDataUrl: prepared.sourceDataUrl || backgroundImageDraft?.sourceDataUrl,
                    });
                }}
                onClose={() => setIsBackgroundAdjustOpen(false)}
                open={isBackgroundAdjustOpen}
                sourceDataUrl={backgroundImageDraft?.sourceDataUrl}
            />
        </Card>
    );
}
