'use client'

import { getRecommendedProjectAIPreferences, getResolvedProjectAIPreferences, mergeProjectAIPreferences } from '@lib/ai/projectAIPreferences';
import { getSafeMediaAspectRatio } from '@lib/media/imageProfiles';
import { theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuRefreshCcw } from 'react-icons/lu';
import type { Project, ProjectAIImagePreferences } from '../../templates/main-app/projects/types';
import AspectRatioSelector from '../../templates/main-app/projects/editorView/AiImageGenerator/AspectRatioSelector';
import MultiSelectAttributeSelector from '../../templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector';
import StyleSelector from '../../templates/main-app/projects/editorView/AiImageGenerator/StyleSelector';
import { IMAGE_VIEW_TYPES } from '../../templates/main-app/projects/editorView/AiImageGenerator/imageViewType';
import { DESCRIPTION_TONE_OPTIONS, type DescriptionTone } from '../../templates/main-app/projects/editorView/descriptionGeneration.shared';
import { Button, Card, Flex, NavBar, Popup, Switch, Text, TextArea } from '../antd';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_BODY_STYLE } from './menuSheetLayout';

type DescriptionContentLength = 'Standard' | 'Detailed';

interface AIDefaultsSheetProps {
    businessType?: string;
    onClose: () => void;
    onSaved: (updatedProject: Project) => void;
    projectData: Project;
    visible: boolean;
}

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

function normalizeMenuItemImagePreferences(preferences: ProjectAIImagePreferences): ProjectAIImagePreferences {
    return {
        ...preferences,
        aspectRatio: getSafeMediaAspectRatio('menuItem', preferences.aspectRatio),
    };
}

export default function AIDefaultsSheet({
    businessType,
    onClose,
    onSaved,
    projectData,
    visible,
}: AIDefaultsSheetProps) {
    const { token } = theme.useToken();
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;
    const resolvedPreferences = useMemo(() => getResolvedProjectAIPreferences(projectData, businessType), [businessType, projectData]);
    const recommendedPreferences = useMemo(() => getRecommendedProjectAIPreferences(businessType), [businessType]);
    const imageDefaults = useMemo(() => getImageDefaults(businessType), [businessType]);
    const [descriptionLength, setDescriptionLength] = useState<DescriptionContentLength>(resolvedPreferences.description.contentLength);
    const [descriptionTone, setDescriptionTone] = useState<DescriptionTone>(resolvedPreferences.description.tone);
    const [imagePreferences, setImagePreferences] = useState<ProjectAIImagePreferences>(() => normalizeMenuItemImagePreferences(resolvedPreferences.image));
    const [isStyleSelectorOpen, setIsStyleSelectorOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        const nextResolved = getResolvedProjectAIPreferences(projectData, businessType);
        setDescriptionLength(nextResolved.description.contentLength);
        setDescriptionTone(nextResolved.description.tone);
        setImagePreferences(normalizeMenuItemImagePreferences(nextResolved.image));
    }, [businessType, projectData, visible]);

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
        setImagePreferences(normalizeMenuItemImagePreferences(resolvedPreferences.image));
    };

    const resetToRecommended = () => {
        setDescriptionLength(recommendedPreferences.description.contentLength);
        setDescriptionTone(recommendedPreferences.description.tone);
        setImagePreferences(normalizeMenuItemImagePreferences(recommendedPreferences.image));
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

    const handleSave = () => {
        const updatedProject = mergeProjectAIPreferences(projectData, {
            description: {
                contentLength: descriptionLength,
                tone: descriptionTone,
            },
            image: {
                ...imagePreferences,
            },
        });

        onSaved(updatedProject);
        onClose();
    };

    if (!visible) return null;

    return (
        <>
            <Popup
                bodyStyle={MENU_SHEET_BODY_STYLE}
                destroyOnClose
                onMaskClick={onClose}
                visible={visible}
            >
                <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                    <NavBar onBack={onClose}>Generation defaults</NavBar>

                    <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                        <Card size="small" style={sectionCardStyle}>
                            <Flex gap={10} vertical>
                                <Text type="secondary">
                                    Set the default writing and photo style for this menu. Future description generation, menu repair, and generated photos will start with these choices.
                                </Text>
                                <Flex align="center" gap={10} justify="space-between">
                                    <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                        <Text strong>Recommended defaults</Text>
                                        <Text type="secondary">
                                            {businessType
                                                ? `Use settings picked for ${businessType}.`
                                                : 'Use the safest settings for this business.'}
                                        </Text>
                                    </Flex>
                                    <Button fill="outline" onClick={resetToRecommended} size="small">
                                        Use recommended
                                    </Button>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card size="small" style={sectionCardStyle}>
                                <Flex gap={12} vertical>
                                    <Flex gap={4} vertical>
                                        <Text strong>Descriptions</Text>
                                        <Text type="secondary">Pick how detailed new generated item descriptions should be by default.</Text>
                                    </Flex>
                                <Flex gap={8} vertical>
                                    {DESCRIPTION_OPTIONS.map((option) => {
                                        const isSelected = descriptionLength === option.value;

                                        return (
                                            <div
                                                key={option.value}
                                                onClick={() => setDescriptionLength(option.value)}
                                                style={{
                                                    backgroundColor: token.colorBgContainer,
                                                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    padding: '12px 14px',
                                                }}
                                            >
                                                <Flex align="center" gap={12} justify="space-between">
                                                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                                        <Text strong style={{ color: isSelected ? token.colorPrimary : undefined }}>{option.label}</Text>
                                                        <Text type="secondary">{option.description}</Text>
                                                    </Flex>
                                                    <Flex
                                                        align="center"
                                                        justify="center"
                                                        style={{
                                                            backgroundColor: isSelected ? token.colorPrimary : 'transparent',
                                                            border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                            borderRadius: '999px',
                                                            color: isSelected ? token.colorTextLightSolid : token.colorTextQuaternary,
                                                            height: 20,
                                                            width: 20,
                                                        }}
                                                    >
                                                        {isSelected ? <LuCheck size={12} /> : null}
                                                    </Flex>
                                                </Flex>
                                            </div>
                                        );
                                    })}
                                </Flex>
                                <Flex gap={8} vertical>
                                    <Text strong>Writing style</Text>
                                    {DESCRIPTION_TONE_OPTIONS.map((option) => {
                                        const isSelected = descriptionTone === option.value;

                                        return (
                                            <div
                                                key={option.value}
                                                onClick={() => setDescriptionTone(option.value)}
                                                style={{
                                                    backgroundColor: token.colorBgContainer,
                                                    border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    padding: '12px 14px',
                                                }}
                                            >
                                                <Flex align="center" gap={12} justify="space-between">
                                                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                                        <Text strong style={{ color: isSelected ? token.colorPrimary : undefined }}>{option.label}</Text>
                                                        <Text type="secondary">{option.description}</Text>
                                                    </Flex>
                                                    <Flex
                                                        align="center"
                                                        justify="center"
                                                        style={{
                                                            backgroundColor: isSelected ? token.colorPrimary : 'transparent',
                                                            border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorderSecondary}`,
                                                            borderRadius: '999px',
                                                            color: isSelected ? token.colorTextLightSolid : token.colorTextQuaternary,
                                                            height: 20,
                                                            width: 20,
                                                        }}
                                                    >
                                                        {isSelected ? <LuCheck size={12} /> : null}
                                                    </Flex>
                                                </Flex>
                                            </div>
                                        );
                                    })}
                                </Flex>
                            </Flex>
                        </Card>

                        <Card size="small" style={sectionCardStyle}>
                            <Flex gap={12} vertical>
                                <Flex gap={4} vertical>
                                    <Text strong>Photos</Text>
                                    <Text type="secondary">These defaults shape the look of new generated menu photos for this menu.</Text>
                                </Flex>

                                <Flex gap={8} vertical>
                                    <Text strong>Photo style</Text>
                                    <Button
                                        block
                                        onClick={() => setIsStyleSelectorOpen(true)}
                                        style={{
                                            background: token.colorBgContainer,
                                            borderColor: token.colorBorderSecondary,
                                            height: 'auto',
                                            padding: 0,
                                            textAlign: 'left',
                                        }}
                                    >
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
                                                <Text style={{ color: token.colorPrimary, flex: '0 0 auto', fontWeight: 600 }}>
                                                    Change
                                                </Text>
                                            </Flex>
                                            {imagePreferences.styles?.length ? (
                                                <Flex gap={6} wrap="wrap">
	                                                    <Text type="secondary">{imagePreferences.stylesCategory}</Text>
	                                                    {imagePreferences.styles.slice(0, 3).map((style) => (
	                                                        <Text key={style} style={selectedStyleChipStyle}>
	                                                            {style}
	                                                        </Text>
	                                                    ))}
	                                                    {imagePreferences.styles.length > 3 ? (
	                                                        <Text style={selectedStyleChipStyle}>
	                                                            +{imagePreferences.styles.length - 3} more
	                                                        </Text>
	                                                    ) : null}
                                                </Flex>
                                            ) : null}
                                        </Flex>
                                    </Button>
                                </Flex>

                                <Flex gap={8} vertical>
                                    <Text strong>Photo shape</Text>
                                    <AspectRatioSelector
                                        imageType="menuItem"
                                        onChange={(aspectRatio) => setImagePreferences((current) => ({ ...current, aspectRatio }))}
                                        selectedAspectRatio={imagePreferences.aspectRatio || '1:1'}
                                    />
                                </Flex>

                                <MultiSelectAttributeSelector
                                    label="Setting"
                                    multi
                                    onChange={(environments) => setImagePreferences((current) => ({ ...current, environments }))}
                                    options={imageDefaults?.contextual_elements?.environments || []}
                                    selected={imagePreferences.environments || []}
                                />
                                <MultiSelectAttributeSelector
                                    label="Lighting"
                                    multi
                                    onChange={(lighting) => setImagePreferences((current) => ({ ...current, lighting }))}
                                    options={imageDefaults?.contextual_elements?.lighting || []}
                                    selected={imagePreferences.lighting || []}
                                />
                                <MultiSelectAttributeSelector
                                    label="Colors"
                                    multi
                                    onChange={(colors) => setImagePreferences((current) => ({ ...current, colors }))}
                                    options={imageDefaults?.contextual_elements?.colors || []}
                                    selected={imagePreferences.colors || []}
                                />
                                <MultiSelectAttributeSelector
                                    label="Mood"
                                    multi
                                    onChange={(moods) => setImagePreferences((current) => ({ ...current, moods }))}
                                    options={imageDefaults?.contextual_elements?.moods || []}
                                    selected={imagePreferences.moods || []}
                                />
                                <MultiSelectAttributeSelector
                                    label="Camera Angle"
                                    multi
                                    onChange={(compositions) => setImagePreferences((current) => ({ ...current, compositions }))}
                                    options={imageDefaults?.contextual_elements?.compositions || []}
                                    selected={imagePreferences.compositions || []}
                                />

                                <Flex gap={8} vertical>
                                    <Text strong>Advanced photo defaults</Text>

                                    <Flex
                                        align="center"
                                        justify="space-between"
                                        style={{
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 12,
                                            padding: '12px 14px',
                                        }}
                                    >
                                        <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                            <Text strong>Transparent background</Text>
                                            <Text type="secondary">Use this when you want the generated image without a background.</Text>
                                        </Flex>
                                        <Switch
                                            checked={imagePreferences.transparentBg || false}
                                            onChange={(transparentBg) => setImagePreferences((current) => ({ ...current, transparentBg }))}
                                        />
                                    </Flex>

                                    <Flex
                                        align="center"
                                        justify="space-between"
                                        gap={12}
                                        style={{
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 12,
                                            opacity: imagePreferences.transparentBg ? 0.55 : 1,
                                            padding: '12px 14px',
                                        }}
                                    >
                                        <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                            <Text strong>Background color</Text>
                                            <Text type="secondary">
                                                {imagePreferences.transparentBg
                                                    ? 'Disabled while transparent background is on.'
                                                    : imagePreferences.backgroundColor || 'No background color selected.'}
                                            </Text>
                                        </Flex>
                                        <Flex align="center" gap={8}>
	                                            {renderColorSwatchInput({
	                                                disabled: Boolean(imagePreferences.transparentBg),
	                                                onChange: (backgroundColor) => setImagePreferences((current) => ({ ...current, backgroundColor })),
	                                                value: selectedBackgroundColor,
	                                            })}
                                            <Button
                                                disabled={Boolean(imagePreferences.transparentBg) || !imagePreferences.backgroundColor}
                                                fill="outline"
                                                onClick={() => setImagePreferences((current) => ({ ...current, backgroundColor: null }))}
                                                size="small"
                                            >
                                                Clear
                                            </Button>
                                        </Flex>
                                    </Flex>

                                    <Flex
                                        align="center"
                                        justify="space-between"
                                        gap={12}
                                        style={{
                                            background: token.colorFillAlter,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 12,
                                            padding: '12px 14px',
                                        }}
                                    >
                                        <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                            <Text strong>Foreground color</Text>
                                            <Text type="secondary">
                                                {imagePreferences.foregroundColor || 'No foreground color selected.'}
                                            </Text>
                                        </Flex>
                                        <Flex align="center" gap={8}>
                                            {renderColorSwatchInput({
                                                onChange: (foregroundColor) => setImagePreferences((current) => ({ ...current, foregroundColor })),
                                                value: selectedForegroundColor,
                                            })}
                                            <Button
                                                disabled={!imagePreferences.foregroundColor}
                                                fill="outline"
                                                onClick={() => setImagePreferences((current) => ({ ...current, foregroundColor: null }))}
                                                size="small"
                                            >
                                                Clear
                                            </Button>
                                        </Flex>
                                    </Flex>

                                    <Flex gap={6} vertical>
                                        <Text strong>Exclude from image</Text>
                                        <Text type="secondary">Save words the image generator should avoid by default, like text, watermark, blur, or low quality.</Text>
                                        <TextArea
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={(value) => setImagePreferences((current) => ({ ...current, negativePrompt: value }))}
                                            placeholder="e.g. text, watermark, blur, low quality"
                                            value={imagePreferences.negativePrompt || ''}
                                        />
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Card>
                    </Flex>

                    <div
                        style={{
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
                        }}
                    >
                        <Flex gap={8}>
                            <Button
                                block
                                disabled={!hasChanges}
                                fill="outline"
                                icon={<LuRefreshCcw size={16} />}
                                onClick={resetToSaved}
                                size="large"
                            >
                                Reset
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!hasChanges}
                                onClick={handleSave}
                                size="large"
                            >
                                Save defaults
                            </Button>
                        </Flex>
                    </div>
                </Flex>
            </Popup>

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
