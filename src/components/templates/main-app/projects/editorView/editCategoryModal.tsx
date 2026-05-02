import AIButtonIcon from '@atoms/aiButtonIcon';
import CategoryIcon from '@atoms/CategoryIcon';
import IconPicker from '@atoms/IconPicker';
import { getSuggestedCategoryIcons, normalizeCategoryIconValue } from '@lib/categoryIcons';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import TimeSlotPresetForm, { DEFAULT_PRESET_COLORS } from '@atoms/timeSlotPresetForm';
import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { generatePresetId, updateTimeSlotPresets } from '@database/stores';
import { validateTimeSlots } from '@hook/useTimedCategories';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import type { InheritanceState } from '@type/multiOutlet.types';
import { TimeSlotPreset } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import { removeObjRef } from '@util/utils';
import { message as antdMessage, Button, Flex, Input, Modal, Popover, Switch, Tag, theme, Tooltip, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuClock, LuExternalLink, LuFileImage, LuLock, LuPlus, LuSparkles, LuX } from 'react-icons/lu';
import GlobalLanguagesList from '@data/languages';
import { CategoryTimeSlot, ExtractedDataCategory, Project, ProjectFileType } from '../types';
import { sanitizeUserInput } from '../utils';
import { clearStaleCategoryTranslations, translateCategory } from '../utils/translationsUtils';

interface EditCategoryModalProps {
    modalData: { active: boolean; category: ExtractedDataCategory | null, status: 'edit' | 'add' };
    onClose: () => void;
    selectedLanguages: string[];
    setUpdatedFileData: any;
    fileData: ProjectFileType;
    projectData: Project;
    onPreviewFile?: (file: ProjectFileType) => void;
    // Multi-outlet governance props
    inheritanceState?: InheritanceState;
    isMasterLinked?: boolean;
}

function normalizeCategoryIconForSave(category: ExtractedDataCategory): ExtractedDataCategory {
    const normalizedIcon = normalizeCategoryIconValue(category.icon);
    const nextCategory = { ...category };

    if (normalizedIcon) {
        nextCategory.icon = normalizedIcon;
    } else {
        delete nextCategory.icon;
    }

    return nextCategory;
}

const EditCategoryModal = ({
    modalData,
    onClose,
    selectedLanguages,
    setUpdatedFileData,
    fileData,
    projectData,
    onPreviewFile,
    inheritanceState,
    isMasterLinked
}: EditCategoryModalProps) => {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const dispatch = useAppDispatch();
    // Multi-outlet governance: Determine if fields should be locked
    // Inherited/overridden categories have locked brand-critical fields (name, images)
    const isInheritedCategory = inheritanceState === 'inherited' || inheritanceState === 'overridden';
    const isNameLocked = FEATURE_FLAGS.ENABLE_MULTI_OUTLET && isMasterLinked && isInheritedCategory;

    // Get store details from context
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const timeSlotPresets = storeDetails?.timeSlotPresets || [];
    const [categoryData, setCategoryData] = useState<ExtractedDataCategory | null>(null);
    const [timeError, setTimeError] = useState<string | null>(null);
    const [showCreatePreset, setShowCreatePreset] = useState(false);
    const [newPresetData, setNewPresetData] = useState({ label: '', startTime: '09:00', endTime: '17:00', color: DEFAULT_PRESET_COLORS[0] });
    const [savingPreset, setSavingPreset] = useState(false);
    const primaryLanguage = getCanonicalProjectSourceLanguage(selectedLanguages);
    const shouldShowGenerateTranslations = useMemo(() => {
        if (!categoryData || selectedLanguages.length <= 1) return false;
        if (!categoryData.name?.[primaryLanguage]?.trim()) return false;
        return selectedLanguages.slice(1).some((language) => !categoryData.name?.[language]?.trim());
    }, [categoryData, primaryLanguage, selectedLanguages]);
    const suggestedIcons = useMemo(
        () => getSuggestedCategoryIcons(categoryData?.name?.[primaryLanguage], storeDetails?.businessType).map((entry) => entry.replace('lu:', '')),
        [categoryData?.name, primaryLanguage, storeDetails?.businessType]
    );

    useEffect(() => {
        if (modalData.active && modalData.category) {
            setCategoryData(normalizeCategoryIconForSave(modalData.category));
        } else {
            setCategoryData(null);
        }
        setTimeError(null);
    }, [modalData]);

    // Check if time slots section is enabled (array exists, even if empty)
    const hasTimeSlots = categoryData?.timeSlots !== undefined;

    // Toggle time slots on/off
    const handleTimeSlotToggle = useCallback((enabled: boolean) => {
        setCategoryData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                timeSlots: enabled ? [] : undefined
            };
        });
        setTimeError(null);
    }, []);

    // Toggle a preset (assign/unassign)
    const handleTogglePreset = useCallback((preset: TimeSlotPreset) => {
        setCategoryData(prev => {
            if (!prev) return null;
            const current = prev.timeSlots || [];
            const existingIndex = current.findIndex(s => s.presetId === preset.id);

            if (existingIndex >= 0) {
                // Remove preset
                const updated = current.filter((_, i) => i !== existingIndex);
                return { ...prev, timeSlots: updated };
            } else {
                // Add preset
                const newSlot: CategoryTimeSlot = {
                    presetId: preset.id,
                    startTime: preset.startTime,
                    endTime: preset.endTime
                };
                return { ...prev, timeSlots: [...current, newSlot] };
            }
        });
    }, []);

    // Create new preset inline (updates context + persists to DB)
    const handleCreatePreset = useCallback(async () => {
        if (!storeDetails) return;
        if (!newPresetData.label.trim()) {
            antdMessage.error('Please enter a label');
            return;
        }

        // Check for duplicate labels
        if (timeSlotPresets.some(p => p.label.toLowerCase() === newPresetData.label.trim().toLowerCase())) {
            antdMessage.error('A preset with this name already exists');
            return;
        }

        setSavingPreset(true);
        try {
            // Create preset with generated ID
            const created: TimeSlotPreset = {
                id: generatePresetId(storeDetails.tenantId, storeDetails.storeId),
                label: newPresetData.label.trim(),
                startTime: newPresetData.startTime,
                endTime: newPresetData.endTime,
                color: newPresetData.color
            };

            const updatedPresets = [...timeSlotPresets, created];

            // Update context immediately
            setStoreDetails({ ...storeDetails, timeSlotPresets: updatedPresets });

            // Persist to DB
            await updateTimeSlotPresets(storeDetails.storeId, updatedPresets);

            // Auto-assign the new preset
            handleTogglePreset(created);

            setShowCreatePreset(false);
            setNewPresetData({ label: '', startTime: '09:00', endTime: '17:00', color: DEFAULT_PRESET_COLORS[updatedPresets.length % DEFAULT_PRESET_COLORS.length] });
            antdMessage.success('Preset created and assigned');
        } catch (error) {
            console.error('Failed to persist preset:', error);
            antdMessage.error('Failed to create preset');
        } finally {
            setSavingPreset(false);
        }
    }, [storeDetails, setStoreDetails, newPresetData, timeSlotPresets, handleTogglePreset]);

    // Check if a preset is assigned
    const isPresetAssigned = useCallback((presetId: string) => {
        return categoryData?.timeSlots?.some(s => s.presetId === presetId) || false;
    }, [categoryData?.timeSlots]);


    const onSave = () => {
        // Validate categoryData exists
        if (!categoryData) {
            antdMessage.error('Category data is missing.');
            return;
        }

        // Validate at least one language has a name
        const hasName = selectedLanguages.some(lang =>
            categoryData.name?.[lang]?.trim()
        );
        if (!hasName) {
            antdMessage.error('Please enter a category name in at least one language.');
            return;
        }

        // Validate time slots if any exist
        if (categoryData.timeSlots?.length) {
            const validation = validateTimeSlots(categoryData.timeSlots);
            if (!validation.valid) {
                antdMessage.error(validation.error || 'Invalid time slot');
                return;
            }
        }

        // Deep clone to ensure immutability (handles Timestamps properly)
        const extractedData = removeObjRef(fileData.extractedData);

        // Translation drift protection: if primary language name changed,
        // clear stale translations so they get retranslated instead of showing wrong data
        let finalCategory = categoryData;
        if (modalData.status === 'edit' && modalData.category && selectedLanguages.length > 1) {
            const primaryLang = selectedLanguages[0];
            const clearedName = clearStaleCategoryTranslations(
                modalData.category.name, categoryData.name, primaryLang, selectedLanguages
            );
            if (clearedName !== categoryData.name) {
                finalCategory = { ...categoryData, name: clearedName };
            }
        }
        finalCategory = normalizeCategoryIconForSave(finalCategory);

        if (modalData.status === 'add') {
            // Add new category immutably
            extractedData.data.categories = [...(extractedData.data.categories || []), finalCategory];
        } else {
            // Update existing category immutably
            extractedData.data.categories = extractedData.data.categories.map(
                (c: ExtractedDataCategory) => c.id === finalCategory.id ? finalCategory : c
            );
        }

        setUpdatedFileData({ ...fileData, extractedData });
        onClose();
    };

    const onGenerateContent = async () => {
        if (!categoryData || !shouldShowGenerateTranslations) return;

        const sourceLanguage = GlobalLanguagesList.find((language) => language.code === primaryLanguage);
        const targetLanguages = selectedLanguages
            .slice(1)
            .map((languageCode) => GlobalLanguagesList.find((language) => language.code === languageCode))
            .filter(Boolean);

        if (!sourceLanguage || targetLanguages.length === 0) return;
        if (!categoryData.name?.[sourceLanguage.code]?.trim()) {
            antdMessage.error(`Category name in ${sourceLanguage.name} is required to generate translations.`);
            return;
        }

        dispatch(startLoader("generating_category_content"));
        try {
            let nextCategory = removeObjRef(categoryData);
            let updatedCount = 0;

            for (const targetLanguage of targetLanguages) {
                const { updatedCategory, messageType } = await translateCategory(
                    projectData,
                    fileData,
                    targetLanguage as any,
                    sourceLanguage as any,
                    AI_ACTIONS_TYPES.ITEM_TRANSLATION,
                    nextCategory
                );
                nextCategory = updatedCategory;
                if (messageType === 'success') {
                    updatedCount += 1;
                }
            }

            setCategoryData(nextCategory);
            if (updatedCount > 0) {
                antdMessage.success('Category translations updated successfully');
            } else {
                antdMessage.info('No missing category translations found.');
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error('Category translation failed. Please try again.');
            }
        } finally {
            dispatch(stopLoader("generating_category_content"));
        }
    }


    const renderEditableContent = useCallback((lang: string, content: string, id: string) => {
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            const safeValue = sanitizeUserInput(newValue, false);
            setCategoryData(prev => {
                if (!prev) return null;
                const updatedName = { ...prev.name, [lang]: safeValue };
                return { ...prev, name: updatedName };
            });
        };

        // Multi-outlet: Lock name field for inherited categories
        if (isNameLocked) {
            return (
                <Tooltip title="This field is controlled by master menu and cannot be edited">
                    <Input
                        value={content}
                        disabled
                        suffix={<LuLock size={12} style={{ opacity: 0.5 }} />}
                        placeholder={`Enter name in ${lang}`}
                    />
                </Tooltip>
            );
        }

        return (
            <Input
                value={content}
                onChange={handleInputChange}
                placeholder={`Enter name in ${lang}`}
            />
        );
    }, [isNameLocked]);

    return (
        <Modal
            title={modalData.status === 'edit' ? `Edit Category: ${categoryData?.name?.[selectedLanguages[0]] || ''}` : "Add Category"}
            open={modalData.active}
            onCancel={onClose}
            styles={{ body: { padding: '24px' } }}
            footer={<>
                <Flex gap={16} style={{ width: "100%" }} justify='flex-end'>
                    <Button icon={<LuX />} onClick={onClose}>Cancel</Button>
                    {shouldShowGenerateTranslations ? (
                        <AIButtonIcon
                            type="default"
                            Icon={LuSparkles}
                            onClick={onGenerateContent}
                            label={t('generateTranslations')}
                            tooltip="Adds missing translations for this category."
                        />
                    ) : null}
                    <Button type="primary" icon={<LuCheck />} onClick={onSave}>Save</Button>
                </Flex>
            </>}
            width={600}
        >
            <Flex vertical gap={16}>
                {/* File Indicator - only show when onPreviewFile is provided (TraditionalView) */}
                {onPreviewFile && fileData && (
                    <Tooltip title={modalData.status === 'edit' ? "Click to preview source file" : "Click to preview target file"}>
                        <Flex
                            align="center"
                            gap={8}
                            style={{
                                padding: '8px 12px',
                                background: 'rgba(0, 0, 0, 0.02)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                border: '1px solid rgba(0, 0, 0, 0.06)'
                            }}
                            onClick={() => onPreviewFile(fileData)}
                        >
                            {fileData.url ? (
                                <img
                                    src={fileData.url}
                                    alt={fileData.name || 'File'}
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: 4, objectFit: 'cover' }}
                                />
                            ) : (
                                <Flex
                                    align="center"
                                    justify="center"
                                    style={{
                                        width: 40,
                                        height: 40,
                                        background: 'rgba(0, 0, 0, 0.04)',
                                        borderRadius: 4
                                    }}
                                >
                                    <LuFileImage size={20} style={{ opacity: 0.5 }} />
                                </Flex>
                            )}
                            <Flex vertical style={{ flex: 1 }}>
                                <Typography.Text strong style={{ fontSize: 12 }}>
                                    {modalData.status === 'edit' ? 'Source File' : 'Saving to'}
                                </Typography.Text>
                                <Typography.Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                                    {fileData.name || 'Unnamed file'}
                                </Typography.Text>
                            </Flex>
                            <LuExternalLink size={14} style={{ opacity: 0.5 }} />
                        </Flex>
                    </Tooltip>
                )}

                {categoryData ? (
                    <>
                        <Flex align="center" gap={8}>
                            <Typography.Text strong onClick={() => setCategoryData({ ...categoryData, active: !categoryData.active })} style={{ cursor: 'pointer' }}>Active / Available</Typography.Text>
                            <Switch
                                size='small'
                                checked={categoryData.active}
                                onChange={(checked) => setCategoryData({ ...categoryData, active: checked })}
                            />
                        </Flex>

                        {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS ? (
                            <Flex
                                align="center"
                                justify="space-between"
                                gap={12}
                                style={{
                                    padding: '12px',
                                    background: token.colorFillAlter,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 8,
                                }}
                            >
                                <Flex vertical gap={2}>
                                    <Typography.Text strong>Category icon</Typography.Text>
                                    <Typography.Text type="secondary">
                                        Pick an icon or emoji to help this category stand out.
                                    </Typography.Text>
                                </Flex>
                                <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
                                    <IconPicker
                                        allowClear
                                        buttonSize="large"
                                        buttonStyle={{ height: 56, minWidth: 56 }}
                                        iconSize={26}
                                        onChange={(value) => {
                                            const normalizedIcon = normalizeCategoryIconValue(value);
                                            setCategoryData(normalizedIcon
                                                ? { ...categoryData, icon: normalizedIcon }
                                                : normalizeCategoryIconForSave({ ...categoryData, icon: undefined })
                                            );
                                        }}
                                        suggestedIcons={suggestedIcons}
                                        value={categoryData.icon}
                                    />
                                </Flex>
                            </Flex>
                        ) : null}

                        {/* Feature #3: Time-Based Categories with Presets */}
                        <Flex
                            vertical
                            gap={8}
                            style={{
                                padding: '12px',
                                background: token.colorFillAlter,
                                borderRadius: 8,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                marginTop: 8
                            }}
                        >
                            <Flex align="center" gap={8}>
                                <LuClock size={16} style={{ opacity: 0.6 }} />
                                <Typography.Text strong style={{ cursor: 'pointer' }} onClick={() => handleTimeSlotToggle(!hasTimeSlots)}>
                                    Show by time
                                </Typography.Text>
                                <Switch
                                    size='small'
                                    checked={hasTimeSlots}
                                    onChange={handleTimeSlotToggle}
                                />
                            </Flex>

                            {hasTimeSlots && (
                                <Flex vertical gap={8} style={{ marginTop: 8 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {timeSlotPresets.length > 0 ? 'Quick assign:' : 'No presets yet'}
                                    </Typography.Text>
                                    <Flex gap={8} wrap="wrap" align="center">
                                        {/* Available Presets */}
                                        {timeSlotPresets.map(preset => (
                                            <Tag
                                                key={preset.id}
                                                color={isPresetAssigned(preset.id) ? preset.color || 'blue' : 'default'}
                                                style={{
                                                    cursor: 'pointer',
                                                    borderStyle: isPresetAssigned(preset.id) ? 'solid' : 'dashed',
                                                    padding: '4px 10px',
                                                    fontSize: 13,
                                                    lineHeight: '20px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                }}
                                                onClick={() => handleTogglePreset(preset)}
                                            >
                                                {isPresetAssigned(preset.id) && <LuCheck size={14} style={{ marginRight: 6 }} />}
                                                {preset.label} ({formatClockTime(preset.startTime)} - {formatClockTime(preset.endTime)})
                                            </Tag>
                                        ))}

                                        {/* Create New Preset - Inline with tags */}
                                        {storeDetails && (
                                            <Popover
                                                open={showCreatePreset}
                                                onOpenChange={setShowCreatePreset}
                                                trigger="click"
                                                placement="bottom"
                                                content={
                                                    <Flex vertical gap={12} style={{ width: 260 }}>
                                                        <Typography.Text strong>Create Time Slot</Typography.Text>
                                                        <TimeSlotPresetForm
                                                            formData={newPresetData}
                                                            onChange={setNewPresetData}
                                                            compact
                                                        />
                                                        <Button
                                                            type="primary"
                                                            loading={savingPreset}
                                                            onClick={handleCreatePreset}
                                                            style={{ alignSelf: 'flex-end' }}
                                                        >
                                                            Create & Assign
                                                        </Button>
                                                    </Flex>
                                                }
                                            >
                                                <Button
                                                    type="dashed"
                                                    size="small"
                                                    icon={<LuPlus size={14} />}
                                                    style={{ height: 28 }}
                                                >
                                                    Create
                                                </Button>
                                            </Popover>
                                        )}
                                    </Flex>
                                </Flex>
                            )}

                            {timeError && (
                                <Typography.Text type="danger" style={{ fontSize: 12 }}>
                                    {timeError}
                                </Typography.Text>
                            )}
                        </Flex>
                        <Flex vertical gap={16}>
                            {selectedLanguages.map(lang => {
                                const name = categoryData.name?.[lang] || '';
                                return (
                                    <Flex key={lang} align="center" gap={8}>
                                        {selectedLanguages.length > 1 && <Tag color="blue">{lang}</Tag>}
                                        {renderEditableContent(lang, name, "name")}
                                    </Flex>
                                );
                            })}
                        </Flex>
                    </>
                ) : null}
            </Flex>
        </Modal>
    );
};

export default EditCategoryModal;
