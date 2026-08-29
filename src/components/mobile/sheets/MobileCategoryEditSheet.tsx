'use client'

import CategoryIcon from '@atoms/CategoryIcon';
import IconPicker from '@atoms/IconPicker';
import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import { getSuggestedCategoryIcons, normalizeCategoryIconValue } from '@lib/categoryIcons';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { LuLanguages } from 'react-icons/lu';
import type { TimeSlotPreset } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuClock, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Checkbox, Collapse, Dialog, Flex, Input, NavBar, Popup, Switch, Tag, Text } from '../antd';
import type { MobileCategoryItem } from './CategoryManagerSheet';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_BODY_STYLE } from './menuSheetLayout';

type SavePayload = {
    active: boolean;
    id?: string;
    icon?: string;
    names: Record<string, string>;
    presetIds: string[];
};

interface MobileCategoryEditSheetProps {
    category?: MobileCategoryItem | null;
    mode: 'add' | 'edit';
    businessType?: string;
    businessCategory?: string;
    categoryIconsEnabled?: boolean;
    onAddItem?: (categoryId: string) => void;
    onClose: () => void;
    onDelete?: (categoryId: string) => void;
    onGenerateContent?: (payload: { id?: string; mode: 'missing' | 'regenerate'; names: Record<string, string> }) => Promise<Record<string, string> | null>;
    onOpenDesignEditor?: () => void;
    onSave: (payload: SavePayload) => Promise<void>;
    presets: TimeSlotPreset[];
    selectedLanguages: string[];
    visible: boolean;
}

function createInitialCategoryDraft(category: MobileCategoryItem | null | undefined, selectedLanguages: string[]) {
    return {
        active: category?.active ?? true,
        icon: normalizeCategoryIconValue(category?.icon),
        names: Object.fromEntries(selectedLanguages.map((language) => [language, category?.nameByLanguage?.[language] || ''])),
        presetIds: category?.timeSlotPresetIds || [],
    };
}

function normalizeCategoryDraft({
    active,
    icon,
    names,
    presetIds,
    selectedLanguages,
}: {
    active: boolean;
    icon: unknown;
    names: Record<string, string>;
    presetIds: string[];
    selectedLanguages: string[];
}) {
    return {
        active,
        icon: normalizeCategoryIconValue(icon),
        names: Object.fromEntries(selectedLanguages.map((language) => [language, String(names[language] || '').trim()])),
        presetIds: [...presetIds].sort(),
    };
}

export default function MobileCategoryEditSheet({
    category,
    mode,
    businessType,
    businessCategory,
    categoryIconsEnabled = true,
    onAddItem,
    onClose,
    onDelete,
    onGenerateContent,
    onOpenDesignEditor,
    onSave,
    presets,
    selectedLanguages,
    visible,
}: MobileCategoryEditSheetProps) {
    const t = useTranslations('MobileMenu');
    const { token } = theme.useToken();
    const primaryLanguage = getCanonicalProjectSourceLanguage(selectedLanguages);
    const [names, setNames] = useState<Record<string, string>>({});
    const [icon, setIcon] = useState<string>('');
    const [active, setActive] = useState(true);
    const [presetIds, setPresetIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activeLanguageKey, setActiveLanguageKey] = useState<string[]>([primaryLanguage]);
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;

    useEffect(() => {
        if (!visible) return;
        const initialDraft = createInitialCategoryDraft(category, selectedLanguages);
        const nextNames = initialDraft.names;
        setNames(nextNames);
        setIcon(initialDraft.icon);
        setActive(initialDraft.active);
        setPresetIds(initialDraft.presetIds);
        setActiveLanguageKey([primaryLanguage]);
    }, [category, primaryLanguage, selectedLanguages, visible]);

    const selectedCount = useMemo(() => presetIds.length, [presetIds.length]);
    const hasMultipleLanguages = selectedLanguages.length > 1;
    const initialDraft = useMemo(() => createInitialCategoryDraft(category, selectedLanguages), [category, selectedLanguages]);
    const resetLabel = useMemo(() => {
        const value = t('reset');
        return value ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}` : value;
    }, [t]);
    const hasPrimaryName = Boolean(names[primaryLanguage]?.trim());
    const hasMissingTranslations = useMemo(() => {
        if (!hasMultipleLanguages || !hasPrimaryName) return false;
        return selectedLanguages
            .filter((language) => language !== primaryLanguage)
            .some((language) => !names[language]?.trim());
    }, [hasMultipleLanguages, hasPrimaryName, names, primaryLanguage, selectedLanguages]);
    const translationActionState = useMemo(() => {
        if (!onGenerateContent || !hasMultipleLanguages) return null;
        if (!hasPrimaryName) {
            return {
                disabled: true,
                label: t('addPrimaryNameFirst'),
            };
        }
        if (!hasMissingTranslations) {
            return {
                disabled: false,
                label: t('regenerateTranslations'),
                mode: 'regenerate' as const,
            };
        }
        return {
            disabled: false,
            label: t('generateMissingTranslations'),
            mode: 'missing' as const,
        };
    }, [hasMissingTranslations, hasMultipleLanguages, hasPrimaryName, onGenerateContent, t]);
    const initialComparisonState = useMemo(() => JSON.stringify(
        normalizeCategoryDraft({
            active: initialDraft.active,
            icon: initialDraft.icon,
            names: initialDraft.names,
            presetIds: initialDraft.presetIds,
            selectedLanguages,
        })
    ), [initialDraft, selectedLanguages]);
    const currentComparisonState = useMemo(() => JSON.stringify(
        normalizeCategoryDraft({
            active,
            icon,
            names,
            presetIds,
            selectedLanguages,
        })
    ), [active, icon, names, presetIds, selectedLanguages]);
    const hasChanges = currentComparisonState !== initialComparisonState;

    const handleClose = async () => {
        if (isSaving) return;
        if (!hasChanges) {
            onClose();
            return;
        }

        const confirmed = await Dialog.confirm({
            cancelText: 'Keep editing',
            confirmText: 'Discard changes',
            content: 'Your unsaved category changes will be lost.',
            title: 'Discard unsaved category changes?',
        });
        if (confirmed) onClose();
    };

    const handleGenerateContent = async () => {
        if (!onGenerateContent || isSaving || !translationActionState?.mode || translationActionState.disabled) return;
        setIsSaving(true);
        try {
            const nextNames = await onGenerateContent({
                id: category?.id,
                mode: translationActionState.mode,
                names: Object.fromEntries(
                    selectedLanguages.map((language) => [language, names[language]?.trim() || ''])
                ),
            });

            if (nextNames) {
                setNames((previous) => ({
                    ...previous,
                    ...nextNames,
                }));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setNames(initialDraft.names);
        setIcon(initialDraft.icon);
        setActive(initialDraft.active);
        setPresetIds(initialDraft.presetIds);
        setActiveLanguageKey([primaryLanguage]);
    };

    const handleSave = async () => {
        const hasName = selectedLanguages.some((language) => names[language]?.trim());
        if (isSaving || !hasName) return;
        setIsSaving(true);
        const normalizedIcon = normalizeCategoryIconValue(icon);
        try {
            await onSave({
                active,
                id: category?.id,
                icon: normalizedIcon || undefined,
                names: Object.fromEntries(
                    selectedLanguages.map((language) => [language, names[language]?.trim() || ''])
                ),
                presetIds,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!visible) return null;

    const suggestedIcons = getSuggestedCategoryIcons(names[primaryLanguage], businessType, businessCategory);

    return (
        <Popup
            bodyStyle={MENU_SHEET_BODY_STYLE}
            destroyOnClose
            onMaskClick={() => {
                void handleClose();
            }}
            position="bottom"
            visible={visible}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar onBack={() => {
                    void handleClose();
                }}>
                    {mode === 'add' ? t('addCategoryLabel') : (category?.name || t('categoriesTitle'))}
                </NavBar>

                <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }} vertical>
                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={12} vertical>
                            {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS ? (
                                <Flex
                                    gap={12}
                                    style={{
                                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                                        paddingBottom: 12,
                                    }}
                                    vertical
                                >
                                    <Flex
                                        align="center"
                                        justify="space-between"
                                        gap={12}
                                    >
                                        <Flex gap={2} vertical>
                                            <Text strong>Category icon</Text>
                                            <Text type="secondary">Pick an icon or emoji to help this category stand out.</Text>
                                        </Flex>
                                        <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                                            <IconPicker
                                                allowClear
                                                buttonSize="large"
                                                buttonStyle={{ height: 56, minWidth: 56 }}
                                                iconSize={26}
                                                onChange={(nextIcon) => setIcon(normalizeCategoryIconValue(nextIcon))}
                                                suggestedIcons={suggestedIcons.map((entry) => entry.replace('lu:', ''))}
                                                value={icon}
                                            />
                                        </Flex>
                                    </Flex>

                                    {!categoryIconsEnabled ? (
                                        <Flex align="center" gap={10} justify="space-between">
                                            <Text style={{ color: token.colorTextSecondary, flex: 1, fontSize: 12, lineHeight: 1.4 }}>
                                                Category icons are turned off in Menu Design, so customers will not see this icon right now.
                                            </Text>
                                            {onOpenDesignEditor ? (
                                                <Button
                                                    fill="none"
                                                    onClick={onOpenDesignEditor}
                                                    size="small"
                                                    style={{ minHeight: 28, paddingInline: 0 }}
                                                >
                                                    Menu Design
                                                </Button>
                                            ) : null}
                                        </Flex>
                                    ) : null}
                                </Flex>
                            ) : null}

                            {hasMultipleLanguages ? (
                                <Collapse activeKey={activeLanguageKey} onChange={(key) => setActiveLanguageKey(Array.isArray(key) ? key : (key ? [key] : []))}>
                                    {selectedLanguages.map((languageCode, index) => {
                                        const languageLabel = GlobalLanguagesList.find((language) => language.code === languageCode)?.name || languageCode;
                                        return (
                                            <Collapse.Panel
                                                key={languageCode}
                                                title={(
                                                    <Flex align="center" gap={8} wrap="wrap">
                                                        <Text strong>{languageLabel}</Text>
                                                        {index === 0 ? <Tag color="primary">{t('primary')}</Tag> : null}
                                                    </Flex>
                                                )}
                                            >
                                                <Input
                                                    autoFocus={mode === 'add' && languageCode === primaryLanguage}
                                                    onChange={(value) => {
                                                        setNames((previous) => ({ ...previous, [languageCode]: value }));
                                                    }}
                                                    placeholder={t('categoryNamePlaceholder')}
                                                    value={names[languageCode] || ''}
                                                />
                                            </Collapse.Panel>
                                        );
                                    })}
                                </Collapse>
                            ) : (
                                <Flex gap={4} vertical>
                                    <Text strong>{t('categoryNamePlaceholder')}</Text>
                                    <Input
                                        autoFocus={mode === 'add'}
                                        onChange={(value) => setNames((previous) => ({ ...previous, [primaryLanguage]: value }))}
                                        placeholder={t('categoryNamePlaceholder')}
                                        value={names[primaryLanguage] || ''}
                                    />
                                </Flex>
                            )}

                            <Flex
                                align="center"
                                justify="space-between"
                                style={{
                                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                                    paddingTop: 12,
                                }}
                            >
                                <Flex gap={2} vertical>
                                    <Text strong>{t('active')}</Text>
                                    <Text type="secondary">{t('showOnMenuHelp')}</Text>
                                </Flex>
                                <Switch aria-label={t('active')} checked={active} onChange={setActive} />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={10} vertical>
                            <Flex align="center" gap={8} justify="space-between">
                                <Flex align="center" gap={8}>
                                    <LuClock size={16} />
                                    <Text strong>{t('categorySchedule')}</Text>
                                </Flex>
                                {selectedCount > 0 ? <Tag color="processing">{t('selectedCount', { count: selectedCount })}</Tag> : null}
                            </Flex>

                            {presets.length === 0 ? (
                                <Text type="secondary">{t('scheduleEmpty')}</Text>
                            ) : (
                                <Flex gap={8} vertical>
                                    {presets.map((preset) => {
                                        const checked = presetIds.includes(preset.id);
                                        return (
                                            <Checkbox
                                                checked={checked}
                                                key={preset.id}
                                                onChange={(nextChecked) => {
                                                    setPresetIds((prev) => nextChecked ? [...prev, preset.id] : prev.filter((id) => id !== preset.id));
                                                }}
                                            >
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Tag color={preset.color || 'processing'}>{preset.label}</Tag>
                                                    <Text type="secondary">{`${formatClockTime(preset.startTime)} - ${formatClockTime(preset.endTime)}`}</Text>
                                                </Flex>
                                            </Checkbox>
                                        );
                                    })}
                                </Flex>
                            )}
                        </Flex>
                    </Card>
                </Flex>

                <Card style={{ backgroundColor: token.colorBgContainer, borderBottom: 0, borderLeft: 0, borderRadius: 0, borderRight: 0, borderTop: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0, marginTop: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <Flex gap={8} vertical>
                        {mode === 'edit' && category?.id && onAddItem ? (
                            <Button
                                block
                                disabled={isSaving}
                                fill="outline"
                                onClick={() => onAddItem(category.id)}
                                size="large"
                            >
                                <Flex align="center" gap={6}>
                                    <LuPlus size={14} />
                                    <Text>{t('addItem')}</Text>
                                </Flex>
                            </Button>
                        ) : null}

                        {translationActionState ? (
                            <Button
                                block
                                disabled={translationActionState.disabled || isSaving}
                                fill="outline"
                                onClick={() => void handleGenerateContent()}
                                size="large"
                            >
                                <Flex align="center" gap={6}>
                                    <LuLanguages size={14} />
                                    <Text>{translationActionState.label}</Text>
                                </Flex>
                            </Button>
                        ) : null}

                        <Flex gap={8}>
                            {mode === 'edit' && category?.id && onDelete ? (
                                <Button
                                    aria-label={`${t('delete')} ${category.name}`}
                                    color="danger"
                                    disabled={isSaving}
                                    fill="outline"
                                    onClick={() => onDelete(category.id)}
                                    size="large"
                                    style={{ minWidth: 52, paddingInline: 0 }}
                                >
                                    <LuTrash2 size={18} />
                                </Button>
                            ) : null}
                            <Button block disabled={!hasChanges || isSaving} fill="outline" onClick={handleReset} size="large">
                                {resetLabel}
                            </Button>
                            <Button
                                block
                                disabled={!hasChanges || !selectedLanguages.some((language) => names[language]?.trim()) || isSaving}
                                loading={isSaving}
                                onClick={() => void handleSave()}
                                size="large"
                            >
                                <Flex align="center" gap={6}>
                                    {mode === 'add' ? <LuPlus size={14} /> : <LuCheck size={14} />}
                                    <Text>{mode === 'add' ? t('add') : t('save')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>
        </Popup>
    );
}
