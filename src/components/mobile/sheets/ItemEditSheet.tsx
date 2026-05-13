'use client'

import { getOwnerLabels } from '@config/businessLabels';
import { getMetadataFieldsForBusiness, type MetadataFieldConfig } from '@config/itemMetadataConfig';
import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getProjectDescriptionContentLength, getProjectDescriptionTone } from '@lib/ai/projectAIPreferences';
import { hasMeaningfulDescription } from '@lib/menu/descriptionQuality';
import { getDecisionFactValue, setDecisionFactValue } from '@lib/menu/itemDecisionFacts';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage } from '@lib/media/prepareMediaImage';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import getNewItemMetadataViaAPI, { mergeGeneratedItemMetadata } from '@services/ai/dataGeneration/getNewItemMetadataViaAPI';
import type { InheritanceState, OutletPolicy } from '@type/multiOutlet.types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCamera, LuLanguages, LuPlus, LuSparkles, LuTrash2 } from 'react-icons/lu';
import type { ExtractedDataAttribute, ExtractedDataItem, NewItemMetadataAPIParams, Project, ProjectFileType } from '../../templates/main-app/projects/types';
import { translateItem } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Collapse, Dialog, Flex, Image, Input, NavBar, Popup, Select, Switch, Text, TextArea, Toast } from '../antd';
import type { MobileMenuItemType } from '../types';
import { MENU_SHEET_CONTAINER_STYLE, MENU_SHEET_ROUNDED_BODY_STYLE } from './menuSheetLayout';

type LocalizedAttribute = ExtractedDataAttribute & {
    price: string;
};

interface ItemEditSheetProps {
    item?: MobileMenuItemType | null;
    categories: { id: string; name: string }[];
    currencySymbol: string;
    initialCategoryId?: string;
    mode?: 'add' | 'edit';
    onClose: () => void;
    onGenerateImage?: () => void;
    onManageImages?: () => void;
    onSave: (updatedItem: Partial<MobileMenuItemType> & { categoryName?: string; image?: string | null; rawItem?: ExtractedDataItem }) => void | Promise<void>;
    onDelete?: (itemId: string) => void;
    projectData?: Project | null;
    selectedLanguages?: string[];
    sourceFile?: ProjectFileType | null;
    inheritanceState?: InheritanceState;
    outletPolicy?: OutletPolicy | null;
}

function createDraftItem({
    initialCategoryId,
    item,
    languages,
}: {
    initialCategoryId?: string;
    item?: MobileMenuItemType | null;
    languages: string[];
}): ExtractedDataItem {
    const primaryLanguage = languages[0] || 'en';
    return {
        active: item?.active ?? true,
        attributes: (item?.rawItem?.attributes || item?.attributes || []).map((attribute: any, index: number) => ({
            active: attribute.active !== false,
            id: attribute.id || `draft-attr-${index + 1}`,
            name: typeof attribute.name === 'object'
                ? { ...attribute.name }
                : Object.fromEntries(languages.map((lang) => [lang, lang === primaryLanguage ? (attribute.name || '') : ''])),
            price: String(attribute.price || ''),
        })),
        available: item?.available ?? true,
        category: item?.rawItem?.category || item?.categoryId || initialCategoryId || '',
        description: item?.rawItem?.description
            ? { ...item.rawItem.description }
            : Object.fromEntries(languages.map((lang) => [lang, lang === primaryLanguage ? (item?.description || '') : ''])),
        id: item?.rawItem?.id || item?.id || `draft-item-${Date.now()}`,
        images: item?.rawItem?.images || undefined,
        name: item?.rawItem?.name
            ? { ...item.rawItem.name }
            : Object.fromEntries(languages.map((lang) => [lang, lang === primaryLanguage ? (item?.name || '') : ''])),
        price: item?.rawItem?.price !== undefined ? String(item.rawItem.price || '') : String(item?.price || ''),
        duration: item?.rawItem?.duration,
        decisionFacts: item?.rawItem?.decisionFacts ? { ...item.rawItem.decisionFacts } : undefined,
        allergens: item?.rawItem?.allergens,
        dietaryTags: item?.rawItem?.dietaryTags,
        spiceLevel: item?.rawItem?.spiceLevel,
        nutritionInfo: item?.rawItem?.nutritionInfo ? { ...item.rawItem.nutritionInfo } : undefined,
        skillLevel: item?.rawItem?.skillLevel,
        targetAudience: item?.rawItem?.targetAudience,
        materials: item?.rawItem?.materials,
        warranty: item?.rawItem?.warranty,
    };
}

function getLocalizedValue(value: Record<string, string> | undefined, language: string): string {
    if (!value) return '';
    return value[language] || '';
}

function normalizeLocalizedRecord(value: Record<string, string> | undefined, languages: string[]) {
    return Object.fromEntries(
        languages.map((language) => [language, String(value?.[language] || '').trim()])
    );
}

function normalizeDraftItemForComparison(draftItem: ExtractedDataItem, languages: string[]) {
    return {
        active: draftItem.active !== false,
        attributes: (draftItem.attributes || []).map((attribute) => ({
            active: attribute.active !== false,
            name: normalizeLocalizedRecord(attribute.name, languages),
            price: String(attribute.price ?? '').trim(),
        })),
        available: draftItem.available !== false,
        category: draftItem.category || '',
        decisionFacts: draftItem.decisionFacts || {},
        description: normalizeLocalizedRecord(draftItem.description, languages),
        legacyFacts: {
            allergens: draftItem.allergens || [],
            dietaryTags: draftItem.dietaryTags || [],
            duration: draftItem.duration,
            materials: draftItem.materials || '',
            nutritionInfo: draftItem.nutritionInfo || {},
            skillLevel: draftItem.skillLevel || '',
            spiceLevel: draftItem.spiceLevel || '',
            targetAudience: draftItem.targetAudience || '',
            warranty: draftItem.warranty || '',
        },
        name: normalizeLocalizedRecord(draftItem.name, languages),
        price: String(draftItem.price ?? '').trim(),
    };
}

export default function ItemEditSheet({
    item,
    categories,
    currencySymbol,
    initialCategoryId,
    mode = 'edit',
    onClose,
    onGenerateImage,
    onManageImages,
    onSave,
    onDelete,
    projectData,
    selectedLanguages = ['en'],
    sourceFile,
    inheritanceState,
    outletPolicy,
}: ItemEditSheetProps) {
    const t = useTranslations('MobileMenu');
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 18,
    } as const;
    const inlineSurfaceStyle = {
        backgroundColor: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 16,
        padding: '14px 16px',
    } as const;
    const availabilityLabels = getOwnerLabels(storeDetails?.businessType);
    const metadataFields = useMemo(() => getMetadataFieldsForBusiness(storeDetails?.businessType), [storeDetails?.businessType]);
    const isAddMode = mode === 'add';
    const primaryLanguage = selectedLanguages[0] || 'en';
    const hasMultipleLanguages = selectedLanguages.length > 1;
    const isInheritedOutletItem = Boolean(
        projectData?.masterProjectId &&
        !isAddMode &&
        (inheritanceState === 'inherited' || inheritanceState === 'overridden')
    );
    const canEditMasterFields = !isInheritedOutletItem;
    const canEditDescription = !isInheritedOutletItem || outletPolicy?.descriptionOverride === true;
    const canEditImages = !isInheritedOutletItem || outletPolicy?.imageOverride === true;
    const canEditPrice = !isInheritedOutletItem || outletPolicy?.priceOverride !== false;
    const canEditAvailability = !isInheritedOutletItem || outletPolicy?.availabilityOverride !== false;
    const canDeleteItem = !isInheritedOutletItem;
    const [draftItem, setDraftItem] = useState<ExtractedDataItem>(() => createDraftItem({ item, initialCategoryId, languages: selectedLanguages }));
    const [imagePreview, setImagePreview] = useState<string | null>(item?.image || null);
    const [activeLanguageKey, setActiveLanguageKey] = useState<string[]>([primaryLanguage]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiWorking, setIsAiWorking] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const canEditImageInline = (isAddMode || !onManageImages) && canEditImages;

    const resetDraft = () => {
        setDraftItem(createDraftItem({ item, initialCategoryId, languages: selectedLanguages }));
        setImagePreview(item?.image || null);
        setActiveLanguageKey([primaryLanguage]);
    };

    const collapseKeyboard = () => {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
            activeElement.blur();
        }
    };

    useEffect(() => {
        setImagePreview(item?.image || null);
    }, [item?.image]);

    useEffect(() => {
        setDraftItem(createDraftItem({ item, initialCategoryId, languages: selectedLanguages }));
        setActiveLanguageKey([selectedLanguages[0] || 'en']);
    }, [initialCategoryId, item, selectedLanguages]);

    const itemImagePreviews = useMemo(() => {
        const normalizedImages = Array.isArray(draftItem.images)
            ? draftItem.images
            : draftItem.images
                ? [draftItem.images]
                : [];

        const images = normalizedImages
            .map((image) => image?.url)
            .filter((url): url is string => Boolean(url));

        if (imagePreview && !images.includes(imagePreview)) {
            return [imagePreview, ...images];
        }

        return images;
    }, [draftItem.images, imagePreview]);
    const imageActionLabel = itemImagePreviews.length > 0 ? t('editImages') : t('addImages');
    const hasAnyDescription = Object.values(draftItem.description || {}).some((description) => hasMeaningfulDescription(description));
    const contentActionCopy = useMemo(() => {
        if (hasMultipleLanguages) {
            return hasAnyDescription
                ? {
                    label: 'Regenerate Description & Translations',
                    helper: 'Refreshes the description and translations for this item.',
                    success: 'Description and translations refreshed.',
                    failure: 'Failed to refresh description and translations.',
                    validation: 'description and translations',
                }
                : {
                    label: 'Generate Description & Translations',
                    helper: 'Creates the description and translations for this item.',
                    success: 'Description and translations generated.',
                    failure: 'Failed to generate description and translations.',
                    validation: 'description and translations',
                };
        }

        return hasAnyDescription
            ? {
                label: 'Regenerate Description',
                helper: 'Refreshes the description for this item.',
                success: 'Description refreshed.',
                failure: 'Failed to refresh description.',
                validation: 'description',
            }
            : {
                label: 'Generate Description',
                helper: 'Creates the description for this item.',
                success: 'Description generated.',
                failure: 'Failed to generate description.',
                validation: 'description',
            };
    }, [hasAnyDescription, hasMultipleLanguages]);
    const initialComparisonState = useMemo(() => JSON.stringify({
        draftItem: normalizeDraftItemForComparison(
            createDraftItem({ item, initialCategoryId, languages: selectedLanguages }),
            selectedLanguages
        ),
        imagePreview: canEditImageInline ? (item?.image || null) : null,
    }), [canEditImageInline, initialCategoryId, item, selectedLanguages]);
    const currentComparisonState = useMemo(() => JSON.stringify({
        draftItem: normalizeDraftItemForComparison(draftItem, selectedLanguages),
        imagePreview: canEditImageInline ? (imagePreview || null) : null,
    }), [canEditImageInline, draftItem, imagePreview, selectedLanguages]);
    const hasChanges = currentComparisonState !== initialComparisonState;

    const handleImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEditImages) return;
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const prepared = await prepareMediaImage(file, 'menuItem');
            setImagePreview(prepared.dataUrl);
        } catch (error) {
            Toast.show({ content: error instanceof Error ? error.message : t('imageTooLarge'), duration: 2200 });
        } finally {
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const updateLocalizedField = (language: string, field: 'name' | 'description', value: string) => {
        if (field === 'name' && !canEditMasterFields) return;
        if (field === 'description' && !canEditDescription) return;
        setDraftItem((previous) => ({
            ...previous,
            [field]: {
                ...(previous[field] || {}),
                [language]: value,
            },
        }));
    };

    const updateAttributeField = (attributeId: string, updates: Partial<LocalizedAttribute>) => {
        if (!canEditMasterFields) return;
        setDraftItem((previous) => ({
            ...previous,
            attributes: (previous.attributes || []).map((attribute) => (
                attribute.id === attributeId ? { ...attribute, ...updates } : attribute
            )),
        }));
    };

    const updateDecisionFact = (field: MetadataFieldConfig, value: any) => {
        if (!canEditMasterFields) return;
        setDraftItem((previous) => setDecisionFactValue(previous, field.key, value));
    };

    const renderDecisionFactControl = (field: MetadataFieldConfig) => {
        if (field.key === 'duration') return null;

        if (field.key === 'nutritionInfo') {
            const nutritionInfo = getDecisionFactValue(draftItem, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined;
            const updateNutrition = (patch: Partial<NonNullable<ExtractedDataItem['nutritionInfo']>>) => {
                setDraftItem((previous) => setDecisionFactValue(previous, 'nutritionInfo', {
                    ...(getDecisionFactValue(previous, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined),
                    ...patch,
                }));
            };

            return (
                <Flex gap={8} key={field.key} vertical>
                    <Text strong>{field.label}</Text>
                    {field.requiresOwnerConfirmation ? (
                        <Text type="secondary">{field.confirmationText || 'Only add this if confirmed.'}</Text>
                    ) : null}
                    <Flex gap={8} wrap="wrap">
                        <Input
                            onChange={(value) => updateNutrition({ calories: value ? Number(value) : undefined })}
                            placeholder="Calories"
                            style={{ flex: '1 1 120px' }}
                            type="number"
                            value={nutritionInfo?.calories !== undefined ? String(nutritionInfo.calories) : ''}
                        />
                        <Input
                            onChange={(value) => updateNutrition({ protein: value ? Number(value) : undefined })}
                            placeholder="Protein (g)"
                            style={{ flex: '1 1 120px' }}
                            type="number"
                            value={nutritionInfo?.protein !== undefined ? String(nutritionInfo.protein) : ''}
                        />
                        <Input
                            onChange={(value) => updateNutrition({ carbs: value ? Number(value) : undefined })}
                            placeholder="Carbs (g)"
                            style={{ flex: '1 1 120px' }}
                            type="number"
                            value={nutritionInfo?.carbs !== undefined ? String(nutritionInfo.carbs) : ''}
                        />
                        <Input
                            onChange={(value) => updateNutrition({ fat: value ? Number(value) : undefined })}
                            placeholder="Fat (g)"
                            style={{ flex: '1 1 120px' }}
                            type="number"
                            value={nutritionInfo?.fat !== undefined ? String(nutritionInfo.fat) : ''}
                        />
                        <Input
                            onChange={(value) => updateNutrition({ servingSize: value || undefined })}
                            placeholder="Serving size"
                            style={{ flex: '1 1 160px' }}
                            value={nutritionInfo?.servingSize || ''}
                        />
                    </Flex>
                </Flex>
            );
        }

        if (field.type === 'multiSelect' && field.options) {
            return (
                <Flex gap={6} key={field.key} vertical>
                    <Text strong>{field.label}</Text>
                    {field.requiresOwnerConfirmation ? (
                        <Text type="secondary">{field.confirmationText || 'Only add this if confirmed.'}</Text>
                    ) : null}
                    <Select
                        mode="multiple"
                        onChange={(value) => updateDecisionFact(field, Array.isArray(value) && value.length ? value : undefined)}
                        options={field.options}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                        value={(getDecisionFactValue(draftItem, field.key) as string[] | undefined) || []}
                    />
                </Flex>
            );
        }

        if (field.type === 'singleSelect' && field.options) {
            return (
                <Flex gap={6} key={field.key} vertical>
                    <Text strong>{field.label}</Text>
                    {field.requiresOwnerConfirmation ? (
                        <Text type="secondary">{field.confirmationText || 'Only add this if confirmed.'}</Text>
                    ) : null}
                    <Select
                        onChange={(value) => updateDecisionFact(field, value || undefined)}
                        options={field.options}
                        placeholder={`Select ${field.label.toLowerCase()}`}
                        value={getDecisionFactValue(draftItem, field.key) as string | undefined}
                    />
                </Flex>
            );
        }

        if (field.type === 'text') {
            return (
                <Flex gap={6} key={field.key} vertical>
                    <Text strong>{field.label}</Text>
                    {field.requiresOwnerConfirmation ? (
                        <Text type="secondary">{field.confirmationText || 'Only add this if confirmed.'}</Text>
                    ) : null}
                    <Input
                        onChange={(value) => updateDecisionFact(field, value || undefined)}
                        placeholder={field.tooltip}
                        value={(getDecisionFactValue(draftItem, field.key) as string | undefined) || ''}
                    />
                </Flex>
            );
        }

        return null;
    };

    const handleAddAttribute = () => {
        if (!canEditMasterFields) return;
        setDraftItem((previous) => ({
            ...previous,
            attributes: [
                ...(previous.attributes || []),
                {
                    active: true,
                    id: `${previous.id}-attr-${Date.now()}`,
                    name: Object.fromEntries(selectedLanguages.map((language) => [language, ''])),
                    price: '',
                },
            ],
        }));
    };

    const handleRemoveAttribute = (attributeId: string) => {
        if (!canEditMasterFields) return;
        setDraftItem((previous) => ({
            ...previous,
            attributes: (previous.attributes || []).filter((attribute) => attribute.id !== attributeId),
        }));
    };

    const handleGenerateContent = async () => {
        if (isAiWorking || !canEditDescription || !projectData?.projectId || !sourceFile?.uid) return;

        const sourceLanguage = GlobalLanguagesList.find((language) => language.code === primaryLanguage);
        const targetLanguages = selectedLanguages
            .map((languageCode) => GlobalLanguagesList.find((language) => language.code === languageCode))
            .filter(Boolean);

        if (!sourceLanguage || targetLanguages.length === 0) return;

        if (!getLocalizedValue(draftItem.name, primaryLanguage).trim()) {
            Toast.show({ content: `Item name in ${sourceLanguage.name} is required to generate ${contentActionCopy.validation}.`, duration: 1800 });
            return;
        }

        setIsAiWorking(true);
        dispatch(startLoader('generating_content'));
        try {
            const payload: NewItemMetadataAPIParams = {
                businessType: storeDetails?.businessType || '',
                fileId: sourceFile.uid,
                item: {
                    attributes: (draftItem.attributes || []).map((attribute) => ({
                        id: attribute.id,
                        name: getLocalizedValue(attribute.name, primaryLanguage),
                        price: attribute.price,
                    })),
                    category: draftItem.category,
                    description: getLocalizedValue(draftItem.description, primaryLanguage) || '',
                    id: draftItem.id,
                    name: getLocalizedValue(draftItem.name, primaryLanguage),
                },
                projectId: projectData.projectId,
                sourceLang: sourceLanguage,
                targetLang: targetLanguages as any,
                contentLength: getProjectDescriptionContentLength(projectData, storeDetails?.businessType),
                tone: getProjectDescriptionTone(projectData, storeDetails?.businessType),
            };

            const result = await getNewItemMetadataViaAPI(payload);

            if (result) {
                setDraftItem((previous) => mergeGeneratedItemMetadata(previous, result));
                Toast.show({ content: contentActionCopy.success, duration: 1400 });
            } else {
                Toast.show({ content: contentActionCopy.failure, duration: 2000 });
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
            } else {
                Toast.show({ content: contentActionCopy.failure, duration: 2000 });
            }
        } finally {
            dispatch(stopLoader('generating_content'));
            setIsAiWorking(false);
        }
    };

    const handleRetryTranslation = async (languageCode: string) => {
        if (isAiWorking || !projectData || !sourceFile) return;
        const sourceLanguage = GlobalLanguagesList.find((language) => language.code === primaryLanguage);
        const targetLanguage = GlobalLanguagesList.find((language) => language.code === languageCode);
        if (!sourceLanguage || !targetLanguage) return;

        setIsAiWorking(true);
        try {
            const { message, messageType, updatedItem } = await translateItem(
                projectData,
                sourceFile,
                targetLanguage as any,
                sourceLanguage as any,
                AI_ACTIONS_TYPES.ITEM_TRANSLATION,
                draftItem
            );

            setDraftItem(updatedItem);
            if (message) {
                Toast.show({ content: message, duration: messageType === 'success' ? 1200 : 1800 });
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
            } else {
                Toast.show({ content: 'Translation failed', duration: 1800 });
            }
        } finally {
            setIsAiWorking(false);
        }
    };

    const handleSave = async () => {
        if (isSaving || !getLocalizedValue(draftItem.name, primaryLanguage).trim()) return;

        const normalizedAttributes = (draftItem.attributes || []).map((attribute) => ({
            ...attribute,
            localizedName: getLocalizedValue(attribute.name, primaryLanguage).trim(),
            priceValue: String(attribute.price ?? '').trim(),
        }));

        const seenAttributeNames = new Set<string>();
        for (let index = 0; index < normalizedAttributes.length; index += 1) {
            const attribute = normalizedAttributes[index];
            if (!attribute.localizedName) {
                Toast.show({ content: `Attribute ${index + 1} name is required.`, duration: 1800 });
                return;
            }

            const attributeNameKey = attribute.localizedName.toLowerCase();
            if (seenAttributeNames.has(attributeNameKey)) {
                Toast.show({ content: `Attribute names must be unique.`, duration: 1800 });
                return;
            }
            seenAttributeNames.add(attributeNameKey);

            if (attribute.priceValue.length > 0) {
                const parsedAttributePrice = Number(attribute.priceValue);
                if (!Number.isFinite(parsedAttributePrice) || parsedAttributePrice < 0) {
                    Toast.show({ content: `Attribute ${index + 1} price must be 0 or more.`, duration: 1800 });
                    return;
                }
            }
        }

        const rawItemPrice = String(draftItem.price ?? '').trim();
        if (!normalizedAttributes.length && rawItemPrice.length > 0) {
            const parsedItemPrice = Number(rawItemPrice);
            if (!Number.isFinite(parsedItemPrice) || parsedItemPrice < 0) {
                Toast.show({ content: 'Item price must be 0 or more.', duration: 1800 });
                return;
            }
        }

        const chosenCategory = categories.find((category) => category.id === draftItem.category);
        const categoryName = chosenCategory?.name || item?.categoryName || t('uncategorized');
        setIsSaving(true);

        try {
            await onSave({
                active: draftItem.active !== false,
                attributes: normalizedAttributes.map((attribute) => ({
                    active: attribute.active !== false,
                    id: attribute.id,
                    name: attribute.localizedName,
                    price: parseFloat(attribute.priceValue || '0') || 0,
                })),
                available: draftItem.available !== false,
                categoryId: draftItem.category || undefined,
                categoryName,
                description: getLocalizedValue(draftItem.description, primaryLanguage).trim(),
                image: isAddMode || !onManageImages
                    ? imagePreview || (item?.image ? null : undefined)
                    : undefined,
                name: getLocalizedValue(draftItem.name, primaryLanguage).trim(),
                price: parseFloat(String(draftItem.price || 0)) || 0,
                rawItem: draftItem,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const renderLanguagePanel = (languageCode: string) => {
        const languageLabel = GlobalLanguagesList.find((language) => language.code === languageCode)?.name || languageCode;
        return (
            <Card key={languageCode} size="small" style={sectionCardStyle}>
                <Flex gap={12} vertical>
                    {hasMultipleLanguages ? (
                        <Flex align="center" justify="space-between">
                            <Text strong>{languageLabel}</Text>
                            {!isAddMode && languageCode !== primaryLanguage && canEditDescription ? (
                                <Button
                                    disabled={isAiWorking || isSaving}
                                    fill="outline"
                                    onClick={() => { void handleRetryTranslation(languageCode); }}
                                    size="small"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuLanguages size={14} />
                                        <Text>{t('refreshTranslation')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                        </Flex>
                    ) : null}

                    <Flex gap={6} vertical>
                        <Text strong>{t('itemNameLabel')}</Text>
                        <Input
                            autoFocus={isAddMode && languageCode === primaryLanguage}
                            disabled={!canEditMasterFields}
                            onChange={(value) => updateLocalizedField(languageCode, 'name', value)}
                            placeholder={t('itemNamePlaceholder')}
                            value={getLocalizedValue(draftItem.name, languageCode)}
                        />
                    </Flex>

                    <Flex gap={6} vertical>
                        <Text strong>{t('descriptionLabel')}</Text>
                        <TextArea
                            autoSize={{ minRows: 4, maxRows: 10 }}
                            disabled={!canEditDescription}
                            onChange={(value) => updateLocalizedField(languageCode, 'description', value)}
                            placeholder={t('descriptionPlaceholder')}
                            value={getLocalizedValue(draftItem.description, languageCode)}
                        />
                    </Flex>

                    <Flex gap={10} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex gap={2} vertical>
                                <Text strong>{t('variantsAddOns')}</Text>
                                <Text type="secondary">{t('variantsAddOnsDesc')}</Text>
                            </Flex>
                            <Button disabled={isSaving || !canEditMasterFields} fill="outline" onClick={handleAddAttribute} size="small">
                                <Flex align="center" gap={6}>
                                    <LuPlus size={14} />
                                    <Text>{t('add')}</Text>
                                </Flex>
                            </Button>
                        </Flex>

                        {(draftItem.attributes || []).length > 0 ? (
                            <Flex gap={8} vertical>
                                {(draftItem.attributes || []).map((attribute, index) => (
                                    <Card key={attribute.id} size="small" style={{ borderRadius: 14 }}>
                                        <Flex gap={10} vertical>
                                            <Flex align="center" justify="space-between">
                                                <Text strong>{t('optionNumber', { number: index + 1 })}</Text>
                                                <Button
                                                    color="danger"
                                                    disabled={isSaving || !canEditMasterFields}
                                                    fill="none"
                                                    onClick={() => handleRemoveAttribute(attribute.id)}
                                                    size="small"
                                                >
                                                    <LuTrash2 size={14} />
                                                </Button>
                                            </Flex>
                                            <Input
                                                disabled={!canEditMasterFields}
                                                onChange={(value) => {
                                                    updateAttributeField(attribute.id, {
                                                        name: {
                                                            ...(attribute.name || {}),
                                                            [languageCode]: value,
                                                        },
                                                    });
                                                }}
                                                placeholder={t('variantName')}
                                                value={getLocalizedValue(attribute.name, languageCode)}
                                            />
                                            <Flex align="center" gap={12}>
                                                <Flex gap={6} style={{ flex: 1, minWidth: 0 }} vertical>
                                                    <Text type="secondary">{t('variantPrice')}</Text>
                                                    <Input
                                                        disabled={!canEditMasterFields}
                                                        onChange={(value) => updateAttributeField(attribute.id, { price: value })}
                                                        placeholder={t('variantPrice')}
                                                        type="number"
                                                        value={String(attribute.price || '')}
                                                    />
                                                </Flex>
                                                <div style={{ ...inlineSurfaceStyle, flexShrink: 0, minWidth: 122, padding: '10px 12px' }}>
                                                    <Flex align="center" justify="space-between">
                                                        <Text style={{ fontSize: 12 }} type="secondary">{t('active')}</Text>
                                                        <Switch
                                                            checked={attribute.active !== false}
                                                            disabled={!canEditMasterFields}
                                                            onChange={(checked) => updateAttributeField(attribute.id, { active: checked })}
                                                        />
                                                    </Flex>
                                                </div>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        ) : (
                            <div style={inlineSurfaceStyle}>
                                <Text type="secondary">{t('noVariantsAdded')}</Text>
                            </div>
                        )}
                    </Flex>
                </Flex>
            </Card>
        );
    };

    return (
        <Popup
            bodyStyle={MENU_SHEET_ROUNDED_BODY_STYLE}
            destroyOnClose
            onMaskClick={() => {
                if (!isSaving) onClose();
            }}
            position="bottom"
            visible
            zIndex={1300}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar onBack={() => {
                    if (!isSaving) onClose();
                }}>
                    {isAddMode ? t('addItemTitle') : t('editItemTitle')}
                </NavBar>

                <Flex gap={16} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={16} vertical>
                            {categories.length > 0 ? (
                                <Flex gap={6} vertical>
                                    <Text strong>{t('categoryLabel')}</Text>
                                    <Select
                                        disabled={!canEditMasterFields}
                                        onChange={(value) => {
                                            setDraftItem((previous) => ({ ...previous, category: value }));
                                            collapseKeyboard();
                                        }}
                                        options={categories.map((category) => ({ label: category.name, value: category.id }))}
                                        placeholder={t('selectCategory')}
                                        value={draftItem.category || undefined}
                                    />
                                </Flex>
                            ) : null}

                            <Flex gap={6} vertical>
                                <Text strong>{t('itemImageLabel')}</Text>
                                <Flex align="center" gap={12} wrap="wrap">
                                    {itemImagePreviews.length > 0 ? (
                                        <Flex gap={8} wrap="wrap">
                                            {itemImagePreviews.map((imageUrl, index) => (
                                                <Image
                                                    height={64}
                                                    key={`${imageUrl}-${index}`}
                                                    preview={false}
                                                    src={imageUrl}
                                                    style={{ borderRadius: 8, objectFit: 'cover', width: 64 }}
                                                    width={64}
                                                />
                                            ))}
                                        </Flex>
                                    ) : (
                                        <Card size="small" style={{ borderRadius: 12, margin: 0 }}>
                                            <Flex align="center" justify="center" style={{ height: 48, width: 48 }}>
                                                <LuCamera color="#94a3b8" size={20} />
                                            </Flex>
                                        </Card>
                                    )}
                                    {canEditImages && (isAddMode || !onManageImages) ? (
                                        <>
                                            <input
                                                accept={getMediaProfileAcceptAttribute('menuItem')}
                                                onChange={handleImageInputChange}
                                                ref={imageInputRef}
                                                style={{ display: 'none' }}
                                                type="file"
                                            />
                                            <Button fill="outline" onClick={() => imageInputRef.current?.click()} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuCamera size={14} />
                                                    <Text>{imageActionLabel}</Text>
                                                </Flex>
                                            </Button>
                                        </>
                                    ) : canEditImages ? (
                                        <Flex gap={8} wrap="wrap">
                                            <Button fill="outline" onClick={onManageImages} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuCamera size={14} />
                                                    <Text>{imageActionLabel}</Text>
                                                </Flex>
                                            </Button>
                                            {itemImagePreviews.length > 0 ? (
                                                <Button fill="outline" onClick={onGenerateImage || onManageImages} size="small">
                                                    <Flex align="center" gap={6}>
                                                        <LuSparkles size={14} />
                                                        <Text>{t('generateImage')}</Text>
                                                    </Flex>
                                                </Button>
                                            ) : null}
                                        </Flex>
                                    ) : null}
                                </Flex>
                            </Flex>

                            {!(draftItem.attributes || []).length ? (
                                <Flex gap={6} vertical>
                                    <Text strong>{t('priceLabel', { currency: currencySymbol })}</Text>
                                    <Input
                                        disabled={!canEditPrice}
                                        onChange={(value) => setDraftItem((previous) => ({ ...previous, price: value }))}
                                        placeholder={t('pricePlaceholder')}
                                        type="number"
                                        value={String(draftItem.price || '')}
                                    />
                                </Flex>
                            ) : null}

                            <div style={inlineSurfaceStyle}>
                                <Flex align="center" justify="space-between">
                                    <Flex gap={2} vertical>
                                        <Text strong>{availabilityLabels.available}</Text>
                                        <Text type="secondary">{t('availableHelp')}</Text>
                                    </Flex>
                                    <Switch checked={draftItem.available !== false} disabled={!canEditAvailability} onChange={(checked) => setDraftItem((previous) => ({ ...previous, available: checked }))} />
                                </Flex>
                            </div>

                            <div style={inlineSurfaceStyle}>
                                <Flex align="center" justify="space-between">
                                    <Flex gap={2} vertical>
                                        <Text strong>{t('showOnMenu')}</Text>
                                        <Text type="secondary">{t('showOnMenuHelp')}</Text>
                                    </Flex>
                                    <Switch checked={draftItem.active !== false} onChange={(checked) => setDraftItem((previous) => ({ ...previous, active: checked }))} />
                                </Flex>
                            </div>
                        </Flex>
                    </Card>

                    {metadataFields.length > 0 && canEditMasterFields ? (
                        <Card size="small" style={sectionCardStyle}>
                            <Collapse>
                                <Collapse.Panel
                                    key="item-details"
                                    title={(
                                        <Flex gap={2} vertical>
                                            <Text strong>Item details</Text>
                                            <Text type="secondary">Dietary, nutrition, and other optional details.</Text>
                                        </Flex>
                                    )}
                                >
                                    <Flex gap={14} vertical>
                                        <Text type="secondary">Only add details you know are correct.</Text>
                                        {metadataFields.map((field) => {
                                            if (field.key === 'duration') {
                                                return (
                                                    <Flex gap={6} key={field.key} vertical>
                                                        <Text strong>{field.label}</Text>
                                                        <Input
                                                            onChange={(value) => updateDecisionFact(field, value ? Number(value) : undefined)}
                                                            placeholder={field.tooltip}
                                                            type="number"
                                                            value={draftItem.duration !== undefined ? String(draftItem.duration) : ''}
                                                        />
                                                    </Flex>
                                                );
                                            }

                                            return renderDecisionFactControl(field);
                                        })}
                                    </Flex>
                                </Collapse.Panel>
                            </Collapse>
                        </Card>
                    ) : null}

                    {hasMultipleLanguages ? (
                        <Collapse activeKey={activeLanguageKey} onChange={(key) => setActiveLanguageKey(Array.isArray(key) ? key : (key ? [key] : []))}>
                            {selectedLanguages.map((languageCode) => (
                                <Collapse.Panel key={languageCode} title={GlobalLanguagesList.find((language) => language.code === languageCode)?.name || languageCode}>
                                    {renderLanguagePanel(languageCode)}
                                </Collapse.Panel>
                            ))}
                        </Collapse>
                    ) : (
                        renderLanguagePanel(primaryLanguage)
                    )}

                    {(projectData && sourceFile && canEditDescription) ? (
                        <Flex gap={6} vertical>
                            <Button
                                block
                                disabled={isAiWorking || isSaving}
                                fill="outline"
                                loading={isAiWorking}
                                onClick={() => { void handleGenerateContent(); }}
                                size="large"
                            >
                                <Flex align="center" gap={6}>
                                    <LuSparkles size={16} />
                                    <Text>{contentActionCopy.label}</Text>
                                </Flex>
                            </Button>
                            <Text type="secondary">{contentActionCopy.helper}</Text>
                        </Flex>
                    ) : null}
                </Flex>

                <div
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        flexShrink: 0,
                        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        zIndex: 5,
                    }}
                >
                    <Flex gap={12} vertical>
                        <Flex gap={12}>
                            {!isAddMode && onDelete && item?.id && canDeleteItem ? (
                                <Button
                                    color="danger"
                                    disabled={isSaving}
                                    fill="outline"
                                    onClick={() => {
                                        if (isSaving) return;
                                        Dialog.confirm({
                                            title: t('deleteItemTitle'),
                                            content: t('deleteItemConfirm', { item: item.name }),
                                            confirmText: t('delete'),
                                            cancelText: t('cancel'),
                                            onConfirm: () => onDelete(item.id),
                                        });
                                    }}
                                    size="large"
                                    style={{ minWidth: 52, paddingInline: 0 }}
                                >
                                    <LuTrash2 size={18} />
                                </Button>
                            ) : null}
                            <Button block disabled={!hasChanges || isSaving} fill="outline" onClick={resetDraft} size="large">
                                Reset
                            </Button>
                            <Button
                                block
                                color="primary"
                                disabled={!hasChanges || !getLocalizedValue(draftItem.name, primaryLanguage).trim() || isSaving}
                                loading={isSaving}
                                onClick={() => {
                                    void handleSave();
                                }}
                                size="large"
                            >
                                {isAddMode ? t('addItem') : t('save')}
                            </Button>
                        </Flex>
                    </Flex>
                </div>
            </Flex>
        </Popup>
    );
}
