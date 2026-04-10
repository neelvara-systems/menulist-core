import { UserUploadedFileType } from '@type/common';
import useDeviceType from '@hook/useDeviceType';
import { Button, Card, Flex, Image, Input, Tag, theme, Tooltip } from 'antd';
import React, { Fragment, useEffect, useState } from 'react';
import { LuSparkles, LuWand2, LuX } from 'react-icons/lu';
import { ImageGenerationConfigType } from '../../types';

const PROMPT_EXAMPLES = [
    'e.g., "on a rustic wooden table"',
    'e.g., "with steam rising"',
    'e.g., "bright natural lighting"',
    'e.g., "with fresh garnish"',
    'e.g., "minimalist background"',
    'e.g., "cozy cafe setting"',
];

// UX-31: Quick quality enhancer tags
const QUICK_ENHANCERS = [
    { label: 'HD Quality', value: 'high resolution, sharp focus' },
    { label: 'Professional', value: 'professional photography, studio quality' },
    { label: 'Vibrant', value: 'vibrant colors, well-lit' },
    { label: 'Appetizing', value: 'appetizing, food photography' },
];

export interface ChatWidgetUiProps {
    generationConfig: ImageGenerationConfigType;
    setGenerationConfig: (config: ImageGenerationConfigType) => void;
    onGenerateImage: () => Promise<void>;
    onSelecteRefImage: (image: UserUploadedFileType | null) => void;
    setShowStyleSelector: (show: boolean) => void;
}

const ChatWidgetUi: React.FC<ChatWidgetUiProps> = ({
    generationConfig,
    setGenerationConfig,
    onGenerateImage,
    onSelecteRefImage,
    setShowStyleSelector
}) => {
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const [exampleIndex, setExampleIndex] = useState(0);

    // Rotate prompt examples every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setExampleIndex(prev => (prev + 1) % PROMPT_EXAMPLES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card
            size="small"
            style={{
                width: '100%',
                position: "sticky",
                bottom: 0,
                zIndex: 100,
                borderRadius: isMobile ? 8 : 20,
                boxShadow: token.boxShadow,
                background: token.colorBgContainer,
                borderColor: token.colorPrimaryBg
            }}
        >
            <Flex vertical style={{ width: '100%' }} gap={isMobile ? 10 : 16}>
                <Flex vertical gap={8} style={{ width: '100%' }} justify='flex-start' align='start'>

                    <Flex justify='space-between' align='center' style={{ width: '100%' }} gap={8}>
                        {generationConfig.referanceImage && <Image
                            src={generationConfig.referanceImage?.url}
                            alt={generationConfig.referanceImage?.name || `Reference image`}
                            style={{
                                border: `1px solid ${token.colorBorder}`,
                                borderRadius: 10,
                                height: 'auto',
                                width: 'auto',
                                maxWidth: 70,
                                maxHeight: 150,
                                objectFit: 'cover'
                            }}
                            preview={{
                                mask: (
                                    <LuX
                                        style={{ fontSize: 16, color: '#fff', cursor: 'pointer' }}
                                        onClick={(e) => { e.stopPropagation(); onSelecteRefImage(null); }}
                                    />
                                )
                            }}
                        />}

                        <Flex vertical>
                            {(generationConfig.stylesCategory || (generationConfig.styles && generationConfig.styles.length > 0)) && (
                                <Flex wrap="wrap" gap={4} onClick={() => setShowStyleSelector(true)}>
                                    {generationConfig.stylesCategory && (
                                        <Tag color={"cyan"} style={{ cursor: 'pointer', borderRadius: token.borderRadius, width: '100%', margin: 0, padding: "2px 10px" }}>{generationConfig.stylesCategory}:&nbsp;
                                            {generationConfig.styles && generationConfig.styles.map((style, index) => (
                                                <Fragment key={index}>{style}{index < generationConfig.styles.length - 1 ? ', ' : ''}</Fragment>
                                            ))}
                                        </Tag>
                                    )}
                                </Flex>
                            )}
                            {/* Show summary of other selected options */}
                            {/* <Flex wrap="wrap" gap={4} style={{ marginBottom: 8 }}>
                                {[
                                    { label: "Environments", key: "environments", color: "blue" },
                                    { label: "Lighting", key: "lighting", color: "gold" },
                                    { label: "Colors", key: "colors", color: "magenta" },
                                    { label: "Moods", key: "moods", color: "purple" },
                                    { label: "Compositions", key: "compositions", color: "geekblue" },
                                ].map(attr => (
                                    Boolean(generationConfig[attr.key]) && (
                                        <Flex key={attr.key} style={{ alignItems: "center", gap: 4, width: "100%" }}>
                                            <Typography.Text strong key={attr.key} color={attr.color}>
                                                {attr.label}: <Typography.Text key={attr.key} color={attr.color}>
                                                    {generationConfig[attr.key]}
                                                </Typography.Text>
                                            </Typography.Text>
                                        </Flex>
                                    )
                                ))}
                            </Flex> */}
                        </Flex>
                    </Flex>

                    <Flex vertical gap={8} style={{ width: '100%' }}>
                        <Tooltip title="The prompt is used to guide the AI in generating an image that matches your vision.">
                            <Input.TextArea
                                id="prompt-input"
                                allowClear
                                rows={2}
                                placeholder={`Add special instructions (optional) ${PROMPT_EXAMPLES[exampleIndex]}`}
                                value={generationConfig.prompt}
                                onChange={(e) => setGenerationConfig({ ...generationConfig, prompt: e.target.value })}
                                style={{ height: 50, minWidth: '100%', resize: 'none', background: "unset" }}
                            />
                        </Tooltip>
                        <Flex gap={4} wrap="wrap">
                            {QUICK_ENHANCERS.map((enhancer) => (
                                <Tag
                                    key={enhancer.label}
                                    color={generationConfig.prompt?.includes(enhancer.value) ? 'blue' : 'default'}
                                    style={{ cursor: 'pointer', fontSize: 11 }}
                                    onClick={() => {
                                        const currentPrompt = generationConfig.prompt || '';
                                        if (currentPrompt.includes(enhancer.value)) {
                                            setGenerationConfig({
                                                ...generationConfig,
                                                prompt: currentPrompt.replace(`, ${enhancer.value}`, '').replace(enhancer.value, '').trim()
                                            });
                                        } else {
                                            setGenerationConfig({
                                                ...generationConfig,
                                                prompt: currentPrompt ? `${currentPrompt}, ${enhancer.value}` : enhancer.value
                                            });
                                        }
                                    }}
                                >
                                    {enhancer.label}
                                </Tag>
                            ))}
                        </Flex>
                    </Flex>
                </Flex>
                <Flex justify='center' align='center' gap={8}>
                    <Tooltip title="Generate with smart defaults - no customization needed">
                        <Button
                            size='large'
                            type="default"
                            style={{ flex: isMobile ? 1 : undefined, fontSize: isMobile ? 12 : undefined, minWidth: isMobile ? 0 : 140, paddingInline: isMobile ? 6 : undefined }}
                            onClick={() => {
                                // Quick generate with smart defaults
                                setGenerationConfig({
                                    ...generationConfig,
                                    prompt: 'professional photography, high quality, well-lit',
                                    styles: generationConfig.styles?.length ? generationConfig.styles : ['Food Photography'],
                                    stylesCategory: generationConfig.stylesCategory || 'Photography'
                                });
                                setTimeout(() => onGenerateImage(), 100);
                            }}
                            loading={generationConfig.loading}
                            disabled={generationConfig.loading}
                            icon={<LuSparkles />}
                        >
                            {isMobile ? 'Quick' : 'Quick Generate'}
                        </Button>
                    </Tooltip>
                    <Button
                        size='large'
                        type="primary"
                        style={{ flex: 1, fontSize: isMobile ? 12 : undefined, minWidth: 0, paddingInline: isMobile ? 6 : undefined }}
                        onClick={onGenerateImage}
                        loading={generationConfig.loading}
                        disabled={generationConfig.loading}
                        icon={<LuWand2 />}
                    >
                        {isMobile ? 'Generate' : 'Generate Image'}
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
};

export default ChatWidgetUi;
