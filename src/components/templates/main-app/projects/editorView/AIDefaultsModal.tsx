'use client'

import { getRecommendedProjectAIPreferences, getResolvedProjectAIPreferences, mergeProjectAIPreferences } from '@lib/ai/projectAIPreferences';
import { Button, Card, Flex, Input, Modal, Switch, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuRefreshCcw } from 'react-icons/lu';
import type { Project, ProjectAIImagePreferences } from '../types';
import AspectRatioSelector from './AiImageGenerator/AspectRatioSelector';
import MultiSelectAttributeSelector from './AiImageGenerator/MultiSelectAttributeSelector';
import StyleSelector from './AiImageGenerator/StyleSelector';
import { IMAGE_VIEW_TYPES } from './AiImageGenerator/imageViewType';
import { DESCRIPTION_TONE_OPTIONS, type DescriptionTone } from './descriptionGeneration.shared';

const { Text } = Typography;

type DescriptionContentLength = 'Standard' | 'Detailed';

const DESCRIPTION_OPTIONS: Array<{
    description: string;
    label: string;
    value: DescriptionContentLength;
}> = [
    {
        description: 'One clear sentence for most menu items.',
        label: 'Standard',
        value: 'Standard',
    },
    {
        description: 'A richer description for premium or signature items.',
        label: 'Detailed',
        value: 'Detailed',
    },
];

function getImageDefaults(businessType?: string) {
    const normalizedBusinessType = businessType?.trim().toLowerCase();
    return IMAGE_VIEW_TYPES.find((type) => type.businessType?.trim().toLowerCase() === normalizedBusinessType)
        || IMAGE_VIEW_TYPES.find((type) => type.businessType === 'Restaurant')
        || IMAGE_VIEW_TYPES[0];
}

interface AIDefaultsModalProps {
    businessType?: string;
    onClose: () => void;
    open: boolean;
    projectData: Project;
    setProjectData: (project: Project) => void;
}

export default function AIDefaultsModal({
    businessType,
    onClose,
    open,
    projectData,
    setProjectData,
}: AIDefaultsModalProps) {
    const { token } = theme.useToken();
    const resolvedPreferences = useMemo(() => getResolvedProjectAIPreferences(projectData, businessType), [businessType, projectData]);
    const recommendedPreferences = useMemo(() => getRecommendedProjectAIPreferences(businessType), [businessType]);
    const imageDefaults = useMemo(() => getImageDefaults(businessType), [businessType]);
    const [descriptionLength, setDescriptionLength] = useState<DescriptionContentLength>(resolvedPreferences.description.contentLength);
    const [descriptionTone, setDescriptionTone] = useState<DescriptionTone>(resolvedPreferences.description.tone);
    const [imagePreferences, setImagePreferences] = useState<ProjectAIImagePreferences>(resolvedPreferences.image);
    const [isStyleSelectorOpen, setIsStyleSelectorOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const nextResolved = getResolvedProjectAIPreferences(projectData, businessType);
        setDescriptionLength(nextResolved.description.contentLength);
        setDescriptionTone(nextResolved.description.tone);
        setImagePreferences(nextResolved.image);
    }, [businessType, open, projectData]);

    const hasChanges = useMemo(() => {
        const currentState = JSON.stringify({
            descriptionLength,
            descriptionTone,
            imagePreferences,
        });
        const savedState = JSON.stringify({
            descriptionLength: resolvedPreferences.description.contentLength,
            descriptionTone: resolvedPreferences.description.tone,
            imagePreferences: resolvedPreferences.image,
        });

        return currentState !== savedState;
    }, [descriptionLength, descriptionTone, imagePreferences, resolvedPreferences.description.contentLength, resolvedPreferences.description.tone, resolvedPreferences.image]);

    const resetToSaved = () => {
        setDescriptionLength(resolvedPreferences.description.contentLength);
        setDescriptionTone(resolvedPreferences.description.tone);
        setImagePreferences(resolvedPreferences.image);
    };

    const resetToRecommended = () => {
        setDescriptionLength(recommendedPreferences.description.contentLength);
        setDescriptionTone(recommendedPreferences.description.tone);
        setImagePreferences(recommendedPreferences.image);
    };

    const handleSave = () => {
        setProjectData(mergeProjectAIPreferences(projectData, {
            description: {
                contentLength: descriptionLength,
                tone: descriptionTone,
            },
            image: {
                ...imagePreferences,
            },
        }));
        onClose();
    };

    const selectedBackgroundColor = imagePreferences.backgroundColor || '#ffffff';
    const selectedForegroundColor = imagePreferences.foregroundColor || '#111111';
    const selectedStyleChipStyle = {
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 8,
        color: token.colorText,
        padding: '2px 8px',
    } as const;
    const renderColorSwatchInput = ({
        disabled = false,
        onChange,
        value,
    }: {
        disabled?: boolean;
        onChange: (value: string) => void;
        value: string;
    }) => (
        <div
            style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: '999px',
                boxShadow: token.boxShadowTertiary,
                cursor: disabled ? 'not-allowed' : 'pointer',
                height: 40,
                opacity: disabled ? 0.45 : 1,
                overflow: 'hidden',
                position: 'relative',
                width: 40,
            }}
        >
            <div
                style={{
                    background: value,
                    borderRadius: '999px',
                    height: '100%',
                    width: '100%',
                }}
            />
            <input
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    height: '140%',
                    inset: '-20%',
                    opacity: 0,
                    position: 'absolute',
                    width: '140%',
                }}
                type="color"
                value={value}
            />
        </div>
    );

    return (
        <>
            <Modal
                footer={(
                    <Flex justify="space-between" style={{ width: '100%' }}>
                        <Button
                            disabled={!hasChanges}
                            icon={<LuRefreshCcw size={16} />}
                            onClick={resetToSaved}
                        >
                            Reset
                        </Button>
                        <Flex gap={8}>
                            <Button onClick={onClose}>Cancel</Button>
                            <Button disabled={!hasChanges} onClick={handleSave} type="primary">
                                Save defaults
                            </Button>
                        </Flex>
                    </Flex>
                )}
                onCancel={onClose}
                open={open}
                title="Generation defaults"
                width={780}
                styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 12 } }}
            >
                <Flex gap={16} vertical>
                    <Card size="small">
                        <Flex align="center" gap={12} justify="space-between">
                            <Flex gap={4} style={{ minWidth: 0 }} vertical>
                                <Text type="secondary">
                                    Set the default writing and photo style for this menu. Future description generation, menu repair, and generated photos will start with these choices.
                                </Text>
                                <Text strong>Recommended defaults</Text>
                                <Text type="secondary">
                                    {businessType
                                        ? `Use settings picked for ${businessType}.`
                                        : 'Use the safest settings for this business.'}
                                </Text>
                            </Flex>
                            <Button onClick={resetToRecommended}>
                                Use recommended
                            </Button>
                        </Flex>
                    </Card>

                    <Card size="small">
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>Descriptions</Text>
                                <Text type="secondary">Pick the default writing style for future generated item descriptions.</Text>
                            </Flex>

                            <Flex gap={8}>
                                {DESCRIPTION_OPTIONS.map((option) => {
                                    const isSelected = descriptionLength === option.value;
                                    return (
                                        <Flex
                                            key={option.value}
                                            onClick={() => setDescriptionLength(option.value)}
                                            style={{
                                                background: isSelected ? token.colorPrimaryBg : 'transparent',
                                                border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                flex: 1,
                                                padding: '10px 12px',
                                            }}
                                            vertical
                                        >
                                            <Text strong style={{ color: isSelected ? token.colorPrimary : undefined }}>{option.label}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{option.description}</Text>
                                        </Flex>
                                    );
                                })}
                            </Flex>

                            <Flex gap={8}>
                                {DESCRIPTION_TONE_OPTIONS.map((option) => {
                                    const isSelected = descriptionTone === option.value;
                                    return (
                                        <Flex
                                            key={option.value}
                                            onClick={() => setDescriptionTone(option.value)}
                                            style={{
                                                background: isSelected ? token.colorPrimaryBg : 'transparent',
                                                border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                flex: 1,
                                                padding: '10px 12px',
                                            }}
                                            vertical
                                        >
                                            <Text strong style={{ color: isSelected ? token.colorPrimary : undefined }}>{option.label}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{option.description}</Text>
                                        </Flex>
                                    );
                                })}
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small">
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>Photos</Text>
                                <Text type="secondary">These defaults shape the look of new generated menu photos for this menu.</Text>
                            </Flex>

                            <Button onClick={() => setIsStyleSelectorOpen(true)} style={{ height: 'auto', padding: 0, textAlign: 'left' }}>
                                <Flex gap={10} style={{ padding: 12, width: '100%' }} vertical>
                                    <Flex align="center" justify="space-between" gap={8}>
                                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                            <Text strong>Style and look</Text>
                                            <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                                {imagePreferences.styles?.length
                                                    ? `${imagePreferences.styles.length} styles selected`
                                                    : 'Choose the look for future generated photos.'}
                                            </Text>
                                        </Flex>
                                        <Text style={{ color: token.colorPrimary, fontWeight: 600 }}>Change</Text>
                                    </Flex>
                                    {imagePreferences.styles?.length ? (
                                        <Flex gap={6} wrap="wrap">
	                                            <Text type="secondary">{imagePreferences.stylesCategory}</Text>
	                                            {imagePreferences.styles.slice(0, 3).map((style) => (
	                                                <Text key={style} style={selectedStyleChipStyle}>
	                                                    {style}
	                                                </Text>
	                                            ))}
                                        </Flex>
                                    ) : null}
                                </Flex>
                            </Button>

                            <AspectRatioSelector
                                onChange={(aspectRatio) => setImagePreferences((current) => ({ ...current, aspectRatio }))}
                                selectedAspectRatio={imagePreferences.aspectRatio || '1:1'}
                            />

                            <MultiSelectAttributeSelector label="Setting" multi onChange={(environments) => setImagePreferences((current) => ({ ...current, environments }))} options={imageDefaults?.contextual_elements?.environments || []} selected={imagePreferences.environments || []} />
                            <MultiSelectAttributeSelector label="Lighting" multi onChange={(lighting) => setImagePreferences((current) => ({ ...current, lighting }))} options={imageDefaults?.contextual_elements?.lighting || []} selected={imagePreferences.lighting || []} />
                            <MultiSelectAttributeSelector label="Colors" multi onChange={(colors) => setImagePreferences((current) => ({ ...current, colors }))} options={imageDefaults?.contextual_elements?.colors || []} selected={imagePreferences.colors || []} />
                            <MultiSelectAttributeSelector label="Mood" multi onChange={(moods) => setImagePreferences((current) => ({ ...current, moods }))} options={imageDefaults?.contextual_elements?.moods || []} selected={imagePreferences.moods || []} />
                            <MultiSelectAttributeSelector label="Camera Angle" multi onChange={(compositions) => setImagePreferences((current) => ({ ...current, compositions }))} options={imageDefaults?.contextual_elements?.compositions || []} selected={imagePreferences.compositions || []} />

                            <Flex gap={8} vertical>
                                <Text strong>Advanced photo defaults</Text>

                                <Flex align="center" justify="space-between" style={{ background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, padding: '12px 14px' }}>
                                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                        <Text strong>Transparent background</Text>
                                        <Text type="secondary">Use this when you want the generated image without a background.</Text>
                                    </Flex>
                                    <Switch checked={imagePreferences.transparentBg || false} onChange={(transparentBg) => setImagePreferences((current) => ({ ...current, transparentBg }))} />
                                </Flex>

                                <Flex align="center" justify="space-between" gap={12} style={{ background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, opacity: imagePreferences.transparentBg ? 0.55 : 1, padding: '12px 14px' }}>
                                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                        <Text strong>Background color</Text>
                                        <Text type="secondary">{imagePreferences.transparentBg ? 'Disabled while transparent background is on.' : imagePreferences.backgroundColor || 'No background color selected.'}</Text>
	                                    </Flex>
	                                    <Flex align="center" gap={8}>
	                                        {renderColorSwatchInput({
	                                            disabled: Boolean(imagePreferences.transparentBg),
	                                            onChange: (backgroundColor) => setImagePreferences((current) => ({ ...current, backgroundColor })),
	                                            value: selectedBackgroundColor,
	                                        })}
	                                        <Button disabled={Boolean(imagePreferences.transparentBg) || !imagePreferences.backgroundColor} onClick={() => setImagePreferences((current) => ({ ...current, backgroundColor: null }))} size="small">
	                                            Clear
	                                        </Button>
                                    </Flex>
                                </Flex>

                                <Flex align="center" justify="space-between" gap={12} style={{ background: token.colorFillAlter, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, padding: '12px 14px' }}>
                                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                        <Text strong>Foreground color</Text>
                                        <Text type="secondary">{imagePreferences.foregroundColor || 'No foreground color selected.'}</Text>
	                                    </Flex>
	                                    <Flex align="center" gap={8}>
	                                        {renderColorSwatchInput({
	                                            onChange: (foregroundColor) => setImagePreferences((current) => ({ ...current, foregroundColor })),
	                                            value: selectedForegroundColor,
	                                        })}
	                                        <Button disabled={!imagePreferences.foregroundColor} onClick={() => setImagePreferences((current) => ({ ...current, foregroundColor: null }))} size="small">
	                                            Clear
	                                        </Button>
                                    </Flex>
                                </Flex>

                                <Flex gap={6} vertical>
                                    <Text strong>Exclude from image</Text>
                                    <Text type="secondary">Save words the image generator should avoid by default, like text, watermark, blur, or low quality.</Text>
                                    <Input.TextArea
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={(event) => setImagePreferences((current) => ({ ...current, negativePrompt: event.target.value }))}
                                        placeholder="e.g. text, watermark, blur, low quality"
                                        value={imagePreferences.negativePrompt || ''}
                                    />
                                </Flex>
                            </Flex>
                        </Flex>
                    </Card>
                </Flex>
            </Modal>

            <StyleSelector
                businessType={businessType}
                onChange={(styles, stylesCategory) => setImagePreferences((current) => ({ ...current, styles, stylesCategory }))}
                open={isStyleSelectorOpen}
                selectedStyles={imagePreferences.styles || []}
                setShowStyleSelector={setIsStyleSelectorOpen}
                stylesCategory={imagePreferences.stylesCategory || 'Photorealism'}
            />
        </>
    );
}
