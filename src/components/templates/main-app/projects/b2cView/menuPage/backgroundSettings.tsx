import { validateImageQuality } from '@lib/imageQualityGuard';
import { validateImageUpload } from '@lib/performanceBudget';
import { removeObjRef } from '@util/utils';
import { Button, Card, ColorPicker, Divider, Flex, Tabs, Tooltip, Typography, Upload, message, theme } from 'antd';
import type { Color } from 'antd/es/color-picker';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuGalleryVerticalEnd, LuRefreshCcw, LuTrash, LuUpload } from 'react-icons/lu';
import ColorPresetsDrawer from './colorPresetsDrawer';
import GradientPicker from './GradientPicker';
import { isGradientString } from './gradientUtils';
import ImageGalleryDrawer from './imageGalleryDrawer';

interface BackgroundSettingsProps {
    config: any;
    onUpdate: (config: any) => void;
    from: string
}

// Extracted reusable component for image upload UI
const ImageUploadSection = ({
    config,
    uploadProps,
    onOpenGallery,
    t,
}: {
    config: any;
    uploadProps: UploadProps;
    onOpenGallery: (e: React.MouseEvent) => void;
    t: (key: string) => string;
}) => {
    const { token } = theme.useToken();

    return (
        <Flex vertical>
            <Card size='small'>
                <Upload {...uploadProps}>
                    <Flex vertical gap={8} align="center" style={{ cursor: 'pointer', width: '100%' }}>
                        {!Boolean(config?.backgroundImage) ? (
                            <Flex vertical align='center' gap={8} style={{ width: '100%', padding: 8 }}>
                                <LuUpload size={24} />
                                <span>{t('backgroundUploadPrompt')}</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>{t('backgroundUploadFormats')}</span>
                                <Button
                                    type='link'
                                    style={{ marginTop: "auto" }}
                                    onClick={onOpenGallery}
                                    icon={<LuGalleryVerticalEnd />}
                                >
                                    {t('exploreGallery')}
                                </Button>
                            </Flex>
                        ) : (
                            <Flex gap={10}>
                                <Flex style={{ width: '100%', height: 'auto', maxHeight: 200, border: `1px dashed ${token.colorBorder}`, borderRadius: 6 }}>
                                    <img src={config?.backgroundImage} alt="" style={{ width: '100%', height: "100%", objectFit: "cover" }} />
                                </Flex>
                                <Flex vertical gap={8} style={{ width: 'max-content' }}>
                                    <Button type='text' icon={<LuRefreshCcw />}>{t('replace')}</Button>
                                    <Button
                                        type='text'
                                        danger
                                        onClick={(e) => {
                                            uploadProps.onRemove?.({} as any);
                                            e.stopPropagation();
                                        }}
                                        icon={<LuTrash />}
                                    >
                                        {t('remove')}
                                    </Button>
                                    <Button
                                        type='link'
                                        style={{ marginTop: "auto" }}
                                        onClick={onOpenGallery}
                                        icon={<LuGalleryVerticalEnd />}
                                    >
                                        {t('gallery')}
                                    </Button>
                                </Flex>
                            </Flex>
                        )}
                    </Flex>
                </Upload>
            </Card>
        </Flex>
    );
};

export default function BackgroundSettings({ config, onUpdate, from }: BackgroundSettingsProps) {
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
        console.log(configCopy);
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
        setColorValue('#ffffff'); // Reset to default or transparent
        setBackgroundMode('solid'); // Reset mode to default
    };

    const handleImageUploadProps = {
        accept: "image/*",
        maxCount: 1,
        fileList: fileList,
        beforeUpload: async (file: File) => {
            const fileData = { ...file, uid: new Date().getTime() + file.name };

            // Check 1: File type validation
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('You can only upload image files!');
                return false;
            }

            // Check 2: Individual file size (existing check, keep for backward compatibility)
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('Image must be smaller than 2MB!');
                return false;
            }

            // Check 3: Constitutional Performance Budget (G03)
            const budgetValidation = validateImageUpload(file, 0, 'background');

            if (!budgetValidation.allowed) {
                message.error(budgetValidation.reason);
                return false;
            }

            // Check 4: Constitutional Image Quality (G04) - Resolution & Aspect Ratio
            const qualityValidation = await validateImageQuality(file);

            if (!qualityValidation.allowed) {
                message.error(qualityValidation.reason);
                return false;
            }

            // All checks passed, proceed with upload
            setFileList([fileData]);
            handleImageUpload(file);
            return false;
        },
        onRemove: () => {
            setFileList([]);
            handleChange('backgroundImage', '');
        },
        itemRender: () => null
    };

    const handleImageUpload = async (file: File) => {
        // Convert the image to base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result as string;
            handleChange('backgroundImage', base64String);
        };
        return false;
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
                                        config={config}
                                        uploadProps={handleImageUploadProps}
                                        onOpenGallery={handleOpenGallery}
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
                onImageSelect={(imageUrl) => handleChange('backgroundImage', imageUrl)}
                uploadProps={handleImageUploadProps}
            />
            <ColorPresetsDrawer
                open={isColorPresetsOpen}
                colorMode={backgroundMode}
                onClose={() => setIsColorPresetsOpen(false)}
                onColorSelect={(colorOrGradient) => {
                    console.log('Color preset selected:', colorOrGradient);

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
        </Card>
    );
}
