import { UserUploadedFileType } from '@type/common';
import useDeviceType from '@hook/useDeviceType';
import { CONTENT_CREDIT_OPERATION_COSTS } from '@data/shared/contentCreditPolicy';
import { Button, Card, Flex, Image, Input, Tag, Typography, theme, Tooltip } from 'antd';
import React, { Fragment } from 'react';
import { LuSparkles, LuWand2, LuX } from 'react-icons/lu';
import { ImageGenerationConfigType } from '../../types';

const PROMPT_EXAMPLES = [
    'e.g., "on a clean neutral background"',
    'e.g., "show the most important detail clearly"',
    'e.g., "bright natural lighting"',
    'e.g., "in the real business setting"',
];

// UX-31: Quick quality enhancer tags
const QUICK_ENHANCERS = [
    { label: 'HD Quality', value: 'high resolution, sharp focus' },
    { label: 'Professional', value: 'professional photography, studio quality' },
    { label: 'Vibrant', value: 'vibrant colors, well-lit' },
    { label: 'Clear detail', value: 'clear subject detail, realistic texture' },
];

export interface ChatWidgetUiProps {
    generationConfig: ImageGenerationConfigType;
    setGenerationConfig: (config: ImageGenerationConfigType) => void;
    onGenerateImage: (configOverride?: ImageGenerationConfigType) => Promise<void>;
    onSelecteRefImage: (image: UserUploadedFileType | null) => void;
    setShowStyleSelector: (show: boolean) => void;
    isDesktopSidebar?: boolean;
}

const ChatWidgetUi: React.FC<ChatWidgetUiProps> = ({
    generationConfig,
    setGenerationConfig,
    onGenerateImage,
    onSelecteRefImage,
    setShowStyleSelector,
    isDesktopSidebar = false,
}) => {
    const { token } = theme.useToken();
    const { isMobile } = useDeviceType();
    const selectedStyleLabel = generationConfig.styles?.filter(Boolean).join(', ');
    const selectedModeLabel = generationConfig.isMultiMode ? 'Multiple photos' : 'Single photo';
    const requestedImageCount = generationConfig.isMultiMode
        ? Math.max(generationConfig.selectedImageTypes?.length || 0, 1)
        : 1;
    const requestedCredits = requestedImageCount * CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE;

    return (
        <Card
            size="small"
            style={{
                width: '100%',
                height: !isMobile && isDesktopSidebar ? '100%' : undefined,
                position: isMobile ? 'sticky' : (isDesktopSidebar ? 'sticky' : 'relative'),
                top: !isMobile && isDesktopSidebar ? 0 : 'auto',
                bottom: isMobile ? 0 : 'auto',
                zIndex: isMobile ? 100 : 'auto',
                borderRadius: 8,
                boxShadow: isMobile || isDesktopSidebar ? token.boxShadow : 'none',
                background: token.colorBgContainer,
                borderColor: token.colorBorderSecondary
            }}
            styles={{
                body: {
                    display: !isMobile && isDesktopSidebar ? 'flex' : undefined,
                    flexDirection: !isMobile && isDesktopSidebar ? 'column' : undefined,
                    height: !isMobile && isDesktopSidebar ? '100%' : undefined,
                    padding: isMobile ? 12 : 14,
                },
            }}
        >
            <Flex
                vertical
                style={{
                    flex: !isMobile && isDesktopSidebar ? 1 : undefined,
                    minHeight: 0,
                    width: '100%',
                }}
                gap={isMobile ? 10 : 12}
            >
                <Flex
                    vertical
                    style={{
                        flex: !isMobile && isDesktopSidebar ? 1 : undefined,
                        minHeight: 0,
                        overflowY: !isMobile && isDesktopSidebar ? 'auto' : undefined,
                        paddingRight: !isMobile && isDesktopSidebar ? 2 : undefined,
                    }}
                    gap={isMobile ? 10 : 12}
                >
                    {isDesktopSidebar ? (
                        <Flex gap={2} vertical>
                            <Typography.Text strong>
                                Review and generate
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                Check your selections, add any final instructions, then generate the image.
                            </Typography.Text>
                        </Flex>
                    ) : null}
                    <Flex
                        gap={isMobile ? 12 : 16}
                        style={{
                            alignItems: isMobile ? undefined : 'stretch',
                            width: '100%',
                        }}
                        vertical={isMobile || isDesktopSidebar}
                    >
                    <Flex
                        gap={12}
                        style={{
                            background: token.colorFillAlter,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            flex: 1,
                            padding: isMobile ? 10 : 12,
                            width: '100%',
                        }}
                        vertical
                    >
                        <Flex gap={10} align={generationConfig.referanceImage ? 'flex-start' : 'center'}>
                            {generationConfig.referanceImage ? (
                                <Image
                                    src={generationConfig.referanceImage?.url}
                                    alt={generationConfig.referanceImage?.name || 'Reference image'}
                                    style={{
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        borderRadius: 8,
                                        flex: '0 0 auto',
                                        height: 56,
                                        objectFit: 'cover',
                                        width: 56,
                                    }}
                                    preview={{
                                        mask: (
                                            <LuX
                                                style={{ fontSize: 16, color: '#fff', cursor: 'pointer' }}
                                                onClick={(e) => { e.stopPropagation(); onSelecteRefImage(null); }}
                                            />
                                        )
                                    }}
                                />
                            ) : null}
                            <Flex gap={8} style={{ minWidth: 0, flex: 1 }} vertical>
                                <Flex gap={6} wrap="wrap">
                                    <Tag
                                        style={{
                                            background: token.colorBgContainer,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            margin: 0,
                                        }}
                                    >
                                        {selectedModeLabel}
                                    </Tag>
                                    {generationConfig.aspectRatio ? (
                                        <Tag
                                            style={{
                                                background: token.colorBgContainer,
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                borderRadius: 8,
                                                margin: 0,
                                            }}
                                        >
                                            Ratio {generationConfig.aspectRatio}
                                        </Tag>
                                    ) : null}
                                </Flex>
                                {(generationConfig.stylesCategory || selectedStyleLabel) ? (
                                    <Button
                                        aria-label="Change selected image style"
                                        block
                                        onClick={() => setShowStyleSelector(true)}
                                        style={{ height: 'auto', padding: 0, textAlign: 'start', whiteSpace: 'normal' }}
                                        type="text"
                                    >
                                        <Flex gap={6} vertical>
                                            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
                                                Selected style
                                            </Typography.Text>
                                            <Typography.Text style={{ lineHeight: 1.35, wordBreak: 'break-word' }}>
                                                {generationConfig.stylesCategory ? (
                                                    <Fragment>
                                                        {generationConfig.stylesCategory}
                                                        {selectedStyleLabel ? `: ${selectedStyleLabel}` : ''}
                                                    </Fragment>
                                                ) : selectedStyleLabel}
                                            </Typography.Text>
                                        </Flex>
                                    </Button>
                                ) : null}
                            </Flex>
                        </Flex>
                    </Flex>

                    <Flex vertical gap={8} style={{ width: '100%', flex: isMobile || isDesktopSidebar ? undefined : 1.2 }}>
                        <Flex gap={4} vertical>
                            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>
                                Special instructions
                            </Typography.Text>
                            <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                Add any extra detail you want the image to follow.
                            </Typography.Text>
                        </Flex>
                        <Tooltip title="The prompt is used to guide image generation so the result matches your vision.">
                            <Input.TextArea
                                aria-label="Special instructions"
                                id="prompt-input"
                                allowClear
                                autoSize={{ minRows: 3, maxRows: 5 }}
                                placeholder={`Optional, ${PROMPT_EXAMPLES[0]}`}
                                value={generationConfig.prompt}
                                onChange={(e) => setGenerationConfig({ ...generationConfig, prompt: e.target.value })}
                                style={{
                                    background: token.colorBgContainer,
                                    borderRadius: 8,
                                    lineHeight: 1.45,
                                    minWidth: '100%',
                                    resize: 'none',
                                }}
                            />
                        </Tooltip>
                        <Flex gap={6} wrap="wrap">
                            {QUICK_ENHANCERS.map((enhancer) => (
                                <Button
                                    aria-pressed={generationConfig.prompt?.includes(enhancer.value) || false}
                                    key={enhancer.label}
                                    size="small"
                                    style={{
                                        background: token.colorBgContainer,
                                        border: `1px solid ${generationConfig.prompt?.includes(enhancer.value) ? token.colorPrimary : token.colorBorderSecondary}`,
                                        borderRadius: 8,
                                        color: generationConfig.prompt?.includes(enhancer.value) ? token.colorPrimary : undefined,
                                        fontSize: 11,
                                        height: 28,
                                        paddingInline: 10,
                                    }}
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
                                </Button>
                            ))}
                        </Flex>
                    </Flex>
                    </Flex>
                </Flex>
                <Flex
                    justify='center'
                    align='center'
                    gap={8}
                    style={{
                        background: !isMobile && isDesktopSidebar ? token.colorBgContainer : undefined,
                        borderTop: !isMobile && isDesktopSidebar ? `1px solid ${token.colorBorderSecondary}` : undefined,
                        marginTop: !isMobile && isDesktopSidebar ? 4 : undefined,
                        paddingTop: !isMobile && isDesktopSidebar ? 12 : undefined,
                        width: '100%',
                    }}
                >
                    <Tooltip title="Replace the current prompt and style with recommended general-purpose settings">
                        <Button
                            size='large'
                            type="default"
                            style={{
                                borderRadius: 8,
                                flex: 1,
                                fontSize: isMobile ? 12 : undefined,
                                height: isDesktopSidebar ? 46 : undefined,
                                minWidth: 0,
                                paddingInline: isMobile ? 6 : 14,
                            }}
                            onClick={() => {
                                setGenerationConfig({
                                    ...generationConfig,
                                    prompt: 'professional photography, high quality, well-lit',
                                    styles: ['Natural Light'],
                                    stylesCategory: 'Photorealism',
                                });
                            }}
                            loading={generationConfig.loading}
                            disabled={generationConfig.loading}
                            icon={<LuSparkles />}
                        >
                            Use defaults
                        </Button>
                    </Tooltip>
                    <Button
                        size='large'
                        type="primary"
                        style={{
                            borderRadius: 8,
                            flex: 1,
                            fontSize: isMobile ? 12 : undefined,
                            height: isDesktopSidebar ? 46 : undefined,
                            minWidth: 0,
                            paddingInline: isMobile ? 6 : 14,
                        }}
                        onClick={() => void onGenerateImage()}
                        loading={generationConfig.loading}
                        disabled={generationConfig.loading}
                        icon={<LuWand2 />}
                    >
                        Generate {requestedImageCount === 1 ? 'photo' : `${requestedImageCount} photos`} · {requestedCredits} credits
                    </Button>
                </Flex>
                <Typography.Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                    Credits are charged only for completed photos.
                </Typography.Text>
            </Flex>
        </Card>
    );
};

export default ChatWidgetUi;
