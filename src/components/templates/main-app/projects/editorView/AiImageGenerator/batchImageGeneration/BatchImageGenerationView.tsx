import { IMAGE_GENERATION_STYLES } from '@constant/AI';
import useDeviceType from '@hook/useDeviceType';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { GenerateImageViaApiPayloadGenerationConfiType } from '@template/main-app/projects/types';
import { Button, Card, Checkbox, ColorPicker, Flex, Input, Skeleton, Switch, Tag, theme, Tooltip, Typography } from 'antd';
import React, { Fragment, useContext, useState } from 'react';
import { LuBadgeInfo, LuPen, LuSparkles } from 'react-icons/lu';
import AspectRatioSelector from '../AspectRatioSelector';
import { getImageViewTypeForBusiness } from '../imageViewType';
import MultiSelectAttributeSelector from '../MultiSelectAttributeSelector';
import StyleSelector from '../StyleSelector';

interface BatchImageGenerationViewProps {
    generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
    setGenerationConfig: React.Dispatch<React.SetStateAction<GenerateImageViaApiPayloadGenerationConfiType>>;
}

const BatchImageGenerationView: React.FC<BatchImageGenerationViewProps> = ({ generationConfig, setGenerationConfig }) => {

    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const selectedBusinessData = getImageViewTypeForBusiness(storeDetails?.businessType, storeDetails?.businessCategory);
    const [showStyleSelector, setShowStyleSelector] = useState(false)
    const [useRecommendedDefaults, setUseRecommendedDefaults] = useState(true)

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
        <Card size="small" style={{ border: 'none' }} styles={{ body: { paddingBottom: 0 } }}>
            <Flex vertical style={{ width: '100%' }} align="center">
                {false ? (
                    <Flex vertical align="center" gap={8} style={{ width: '100%' }}>
                        <Typography.Text type="secondary">
                            Generating images...
                        </Typography.Text>
                        <Skeleton.Image active style={getSkeletonDimensions(generationConfig.aspectRatio)} />
                    </Flex>
                ) : <>
                    <Flex vertical gap={24} justify='flex-start' align='center' style={{ width: '100%' }}>

                        <Typography.Text type="secondary" italic style={{ fontSize: '0.8em', marginTop: '4px' }}>
                            Selected items&apos; name, category, and description (if available) will be used to generate the image.
                        </Typography.Text>

                        <Card
                            size="small"
                            style={{
                                width: '100%',
                                background: useRecommendedDefaults ? token.colorPrimaryBg : token.colorBgContainer,
                                border: `1px solid ${useRecommendedDefaults ? token.colorPrimary : token.colorBorder}`
                            }}
                        >
                            <Flex justify="space-between" align="center">
                                <Flex align="center" gap={8}>
                                    <LuSparkles style={{ color: useRecommendedDefaults ? token.colorPrimary : token.colorTextSecondary }} />
                                    <Flex vertical>
                                        <Typography.Text strong>Use Recommended Defaults</Typography.Text>
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            We&apos;ll pick the best settings for your business type
                                        </Typography.Text>
                                    </Flex>
                                </Flex>
                                <Switch
                                    checked={useRecommendedDefaults}
                                    onChange={setUseRecommendedDefaults}
                                />
                            </Flex>
                        </Card>

                        {!useRecommendedDefaults && (
                            <>
                                <Flex gap={4} vertical style={{ width: '100%' }} justify='flex-start' align='start' >
                                    <Typography.Text type='secondary'>Styles*:</Typography.Text>
                                    <Flex gap={4} wrap style={{ width: '100%' }} onClick={() => setShowStyleSelector(true)}>
                                        <Tag style={{ lineHeight: 2, fontSize: 12 }} color="default">{generationConfig.stylesCategory}:</Tag>
                                        {(generationConfig.styles || []).map((styleName, index) => {
                                            const styleObj = findStyleByName(styleName);
                                            return <Fragment key={styleName}>
                                                <Tag style={{ fontSize: 12, lineHeight: 2 }} color="default">{styleObj?.name}</Tag></Fragment>
                                        })}
                                        <Button shape='circle' type='text' icon={<LuPen />} />
                                    </Flex>
                                </Flex>

                                <StyleSelector
                                    businessType={storeDetails?.businessType}
                                    businessCategory={storeDetails?.businessCategory}
                                    open={showStyleSelector}
                                    setShowStyleSelector={setShowStyleSelector}
                                    selectedStyles={generationConfig.styles || ['Natural Light']}
                                    stylesCategory={generationConfig.stylesCategory || 'Photorealism'}
                                    onChange={(styles, stylesCategory) => setGenerationConfig({ ...generationConfig, styles, stylesCategory })}
                                />

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

                                <Flex vertical gap={8}>
                                    <Flex align="center" gap={4}>
                                        <Typography.Text type='secondary' italic style={{ fontSize: 12 }}>Colors</Typography.Text>
                                        <Tooltip title="Pick a background color for the generated image. Disabled if Transparent Background is enabled.">
                                            <LuBadgeInfo style={{ color: '#888' }} />
                                        </Tooltip>
                                    </Flex>
                                    <Flex gap={16} justify='flex-start' align={isMobile ? 'flex-start' : 'center'} style={{ width: '100%' }} vertical={isMobile}>
                                        <Flex align='center' gap={8} style={{ width: '100%' }}>
                                            <Tooltip title="If enabled, the generated image will have a transparent background. Background color selection will be disabled.">
                                                <Checkbox
                                                    checked={generationConfig.transparentBg || false}
                                                    onChange={e => setGenerationConfig({ ...generationConfig, transparentBg: e.target.checked })}
                                                >
                                                    Transparent Background <LuBadgeInfo style={{ color: '#888', marginLeft: 4 }} />
                                                </Checkbox>
                                            </Tooltip>
                                        </Flex>

                                        <Flex justify='flex-start' align='center' style={{ width: '100%' }}>
                                            <Tooltip title="Pick a background color for the generated image. Disabled if Transparent Background is enabled.">
                                                <Typography.Text style={{ fontSize: 12, width: '90px', color: generationConfig.transparentBg ? token.colorTextDescription : token.colorTextBase }} type='secondary'>
                                                    Background Color <LuBadgeInfo style={{ color: '#888', marginLeft: 4 }} />
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
                                                    Foreground Color <LuBadgeInfo style={{ color: '#888', marginLeft: 4 }} />
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
                                </Flex>

                                <AspectRatioSelector
                                    imageType="menuItem"
                                    selectedAspectRatio={generationConfig.aspectRatio || '1:1'}
                                    onChange={(aspectRatio) => setGenerationConfig({ ...generationConfig, aspectRatio })}
                                />

                                <Flex vertical gap={8} style={{ width: '100%' }} justify='flex-start' align='start'>
                                    <Tooltip title="Add special instructions for the generated image.">
                                        <Flex align="center" gap={4}>
                                            <Typography.Text type='secondary'>Special Instructions:</Typography.Text>
                                            <LuBadgeInfo style={{ color: token.colorTextSecondary }} />
                                        </Flex>
                                    </Tooltip>
                                    <Input.TextArea
                                        rows={2}
                                        placeholder={`Add special instructions (optional)`}
                                        value={generationConfig.prompt}
                                        onChange={(e) => setGenerationConfig({ ...generationConfig, prompt: e.target.value })}
                                        style={{ height: 50, minWidth: '100%', resize: 'none' }}
                                    />
                                </Flex>

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
                            </>
                        )}

                        {/* Content Policy Agreement */}
                        <Flex
                            vertical
                            gap={8}
                            style={{
                                width: '100%',
                                padding: 16,
                                backgroundColor: token.colorBgContainerDisabled,
                                borderRadius: token.borderRadiusLG,
                                border: `1px solid ${generationConfig.agreeToTerms ? token.colorPrimary : token.colorBorder}`
                            }}
                        >
                            <Checkbox
                                checked={generationConfig.agreeToTerms || false}
                                onChange={(e) => setGenerationConfig({ ...generationConfig, agreeToTerms: e.target.checked })}
                                style={{ alignItems: 'flex-start' }}
                            >
                                <Flex vertical gap={4}>
                                    <Typography.Text strong style={{ fontSize: 14 }}>
                                        Content Policy Agreement
                                    </Typography.Text>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        I agree to not generate inappropriate content including but not limited to:
                                        violence, hate speech, NSFW content, or copyrighted material.
                                        I understand that violations may result in account suspension.
                                    </Typography.Text>
                                </Flex>
                            </Checkbox>
                        </Flex>
                    </Flex>
                </>}
            </Flex>
        </Card>
    );
};

export default BatchImageGenerationView;
