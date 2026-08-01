'use client'

import { getOwnerLabels } from '@config/businessLabels';
import { FEATURE_FLAGS } from '@config/features';
import { getMetadataFieldsForBusiness, type MetadataFieldConfig } from '@config/itemMetadataConfig';
import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { CONTENT_CREDIT_OPERATION_COSTS } from '@data/shared/contentCreditPolicy';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getProjectDescriptionContentLength, getProjectDescriptionTone } from '@lib/ai/projectAIPreferences';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { hasAnyNonEmptyDescription } from '@lib/menu/descriptionQuality';
import { getDecisionFactValue, setDecisionFactValue } from '@lib/menu/itemDecisionFacts';
import { downloadSharableItemCard, shareSharableItemCard, type SharableItemCardInput } from '@lib/menu/sharableItemCard';
import { getMediaProfileAcceptAttribute } from '@lib/media/imageProfiles';
import { prepareMediaImage } from '@lib/media/prepareMediaImage';
import { getPublicItemListPriceLabel } from '@lib/pricing/publicItemPricePresentation';
import { MENU_PRICE_TEXT_MAX_LENGTH, normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import getNewItemMetadataViaAPI, {
    mergeGeneratedItemMetadata,
    prepareNewItemMetadataRequestItem,
} from '@services/ai/dataGeneration/getNewItemMetadataViaAPI';
import type { InheritanceState, OutletPolicy } from '@type/multiOutlet.types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCamera, LuClock, LuDownload, LuLanguages, LuMinus, LuPlus, LuShare2, LuSparkles, LuStar, LuTrash2, LuTrendingUp } from 'react-icons/lu';
import type { ExtractedDataAttribute, ExtractedDataItem, NewItemMetadataAPIParams, Project, ProjectFileType } from '../../templates/main-app/projects/types';
import { runSingleItemDescriptionGeneration } from '../../templates/main-app/projects/editorView/descriptionGeneration.shared';
import { translateItem } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Collapse, Dialog, Flex, Image, Input, NavBar, Popup, Select, Switch, Text, TextArea, Toast } from '../antd';
import type { MobileMenuItemType } from '../types';
import {
    getBoundedMobileProjectStringContext,
    getMobileProjectLogContext,
    getMobileProjectStoreLogContext,
    logMobileProjectFailure,
} from '../utils/mobileProjectDiagnostics';
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
    onSave: (updatedItem: Partial<Omit<MobileMenuItemType, 'image'>> & { categoryName?: string; image?: string | null; rawItem?: ExtractedDataItem }) => void | Promise<void>;
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
    const primaryLanguage = getCanonicalProjectSourceLanguage(languages);
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
        descriptionSource: item?.rawItem?.descriptionSource,
        id: item?.rawItem?.id || item?.id || `draft-item-${Date.now()}`,
        images: item?.rawItem?.images || undefined,
        isBestSeller: item?.rawItem?.isBestSeller ?? item?.isBestSeller ?? false,
        name: item?.rawItem?.name
            ? { ...item.rawItem.name }
            : Object.fromEntries(languages.map((lang) => [lang, lang === primaryLanguage ? (item?.name || '') : ''])),
        price: item?.rawItem?.price !== undefined ? String(item.rawItem.price || '') : String(item?.price || ''),
        duration: item?.rawItem?.duration ?? item?.duration,
        ownerBoost: clampOwnerBoost(item?.rawItem?.ownerBoost ?? item?.ownerBoost),
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
        descriptionSource: draftItem.descriptionSource,
        isBestSeller: draftItem.isBestSeller === true,
        legacyFacts: {
            allergens: draftItem.allergens || [],
            dietaryTags: draftItem.dietaryTags || [],
            duration: draftItem.duration,
            ownerBoost: draftItem.ownerBoost ?? 0,
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

function clampOwnerBoost(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(20, Math.max(-20, parsed));
}

function parseBoundedNumber(value: string, min: number, max: number): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return undefined;
    return Math.min(max, Math.max(min, parsed));
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
    const { storeDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const canGenerateDescriptions = userPermissions?.canGenerateDescriptions === true;
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
    const availabilityLabels = getOwnerLabels(storeDetails?.businessType, storeDetails?.businessCategory);
    const metadataFields = useMemo(
        () => getMetadataFieldsForBusiness(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );
    const isAddMode = mode === 'add';
    const primaryLanguage = getCanonicalProjectSourceLanguage(selectedLanguages);
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
    const [isCardWorking, setIsCardWorking] = useState(false);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const canEditImageInline = (isAddMode || !onManageImages) && canEditImages;

    const ownerBoostLevel = (draftItem.ownerBoost ?? 0) > 0
        ? 'higher'
        : (draftItem.ownerBoost ?? 0) < 0
            ? 'lower'
            : 'normal';

    const setOwnerBoostLevel = (value: number) => {
        setDraftItem((previous) => ({
            ...previous,
            ownerBoost: clampOwnerBoost(value),
        }));
    };

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
    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === draftItem.category),
        [categories, draftItem.category],
    );
    const sharableCardInput = useMemo<SharableItemCardInput>(() => {
        const itemName = getLocalizedValue(draftItem.name, primaryLanguage).trim() || item?.name || 'Menu item';
        const description = getLocalizedValue(draftItem.description, primaryLanguage).trim();
        const price = getPublicItemListPriceLabel(draftItem, currencySymbol) || '';
        const store = storeDetails as any;
        const projectName = getLocalizedValue((projectData as any)?.metadata?.name, primaryLanguage);

        return {
            itemName,
            description,
            categoryName: selectedCategory?.name,
            price,
            storeName: String(store?.publicPresence?.displayName || store?.name || store?.tenantName || 'Menu').trim(),
            projectName,
            imageUrl: itemImagePreviews[0],
            accentColor: store?.publicPresence?.accentColor || (projectData as any)?.config?.design?.brand?.accentColor,
            updatedLabel: 'Current menu',
        };
    }, [currencySymbol, draftItem.attributes, draftItem.description, draftItem.name, draftItem.price, item?.name, itemImagePreviews, primaryLanguage, projectData, selectedCategory?.name, storeDetails]);
    const canGenerateSharableCard = FEATURE_FLAGS.ENABLE_SHARABLE_ITEM_CARD_GENERATION && !isAddMode && Boolean(draftItem.id);

    const handleShareCard = async () => {
        if (!canGenerateSharableCard || isCardWorking) return;
        setIsCardWorking(true);
        try {
            const result = await shareSharableItemCard(sharableCardInput);
            Toast.show({ content: result === 'shared' ? 'Card shared' : 'Card downloaded', duration: 1500 });
        } catch {
            Toast.show({ content: 'Could not create card', duration: 2000 });
        } finally {
            setIsCardWorking(false);
        }
    };

    const handleDownloadCard = async () => {
        if (!canGenerateSharableCard || isCardWorking) return;
        setIsCardWorking(true);
        try {
            await downloadSharableItemCard(sharableCardInput);
            Toast.show({ content: 'Card downloaded', duration: 1500 });
        } catch {
            Toast.show({ content: 'Could not create card', duration: 2000 });
        } finally {
            setIsCardWorking(false);
        }
    };
    const sourceDescription = getLocalizedValue(draftItem.description, primaryLanguage).trim();
    const hasSourceDescription = sourceDescription.length > 0;
    const manualDescriptionProtected = draftItem.descriptionSource === 'manual'
        && hasAnyNonEmptyDescription(draftItem.description);
    const contentActionCopy = useMemo(() => {
        if (hasSourceDescription) {
            return {
                label: 'Refresh Descriptions',
                helper: `Refreshes this item in every menu language. Uses ${CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE} enhancement credit.`,
                success: 'Descriptions refreshed.',
                failure: 'Failed to refresh descriptions.',
                validation: 'descriptions',
            };
        }

        if (hasMultipleLanguages) {
            return {
                label: 'Generate Description & Translations',
                helper: 'Creates the first description and translations for this item at no credit cost.',
                success: 'Description and translations generated.',
                failure: 'Failed to generate description and translations.',
                validation: 'description and translations',
            };
        }

        return {
            label: 'Generate Description',
            helper: 'Creates the first description for this item at no credit cost.',
            success: 'Description generated.',
            failure: 'Failed to generate description.',
            validation: 'description',
        };
    }, [hasMultipleLanguages, hasSourceDescription]);
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
            logMobileProjectFailure('mobile_item_image_prepare_failed', error, {
                ...getMobileProjectLogContext(projectData?.projectId, projectData?.masterProjectId),
                ...getMobileProjectStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileProjectStringContext('fileName', file.name),
                ...getBoundedMobileProjectStringContext('itemId', item?.id || item?.rawItem?.id),
            });
            Toast.show({ content: t('imageTooLarge'), duration: 2200 });
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
            ...(field === 'description' ? { descriptionSource: 'manual' as const } : {}),
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
                        onChange={(value: string | string[]) => updateDecisionFact(field, Array.isArray(value) && value.length ? value : undefined)}
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
                        onChange={(value: string) => updateDecisionFact(field, value || undefined)}
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
        if (!canGenerateDescriptions) {
            Toast.show({ content: 'You do not have permission to generate descriptions.', duration: 1800 });
            return;
        }
        if (manualDescriptionProtected) {
            Toast.show({ content: 'Your manual description was kept unchanged.', duration: 1800 });
            return;
        }

        const sourceLanguage = GlobalLanguagesList.find((language) => language.code === primaryLanguage);
        const targetLanguageCodes = selectedLanguages.length > 0
            ? selectedLanguages
            : [primaryLanguage];
        const targetLanguages = targetLanguageCodes
            .map((languageCode) => GlobalLanguagesList.find((language) => language.code === languageCode))
            .filter(Boolean);

        if (!sourceLanguage || targetLanguages.length === 0) return;

        if (!getLocalizedValue(draftItem.name, primaryLanguage).trim()) {
            Toast.show({ content: `Item name in ${sourceLanguage.name} is required to generate ${contentActionCopy.validation}.`, duration: 1800 });
            return;
        }

        if (hasSourceDescription) {
            const confirmed = await Dialog.confirm({
                cancelText: 'Cancel',
                confirmText: 'Refresh descriptions',
                content: `Uses ${CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE} enhancement credit. Your current generated descriptions will be replaced.`,
                title: "Refresh this item's descriptions?",
            });
            if (!confirmed) return;
        }

        setIsAiWorking(true);
        dispatch(startLoader('generating_content'));
        try {
            if (hasSourceDescription) {
                const descriptionResult = await runSingleItemDescriptionGeneration({
                    contentLength: getProjectDescriptionContentLength(projectData, storeDetails?.businessType, storeDetails?.businessCategory),
                    item: draftItem,
                    projectData,
                    sourceFile,
                    tone: getProjectDescriptionTone(projectData, storeDetails?.businessType, storeDetails?.businessCategory),
                });
                if (descriptionResult.reason === 'manual_protected') {
                    Toast.show({ content: 'Your manual description was kept unchanged.', duration: 1800 });
                    return;
                }
                if (descriptionResult.reason) {
                    Toast.show({ content: contentActionCopy.failure, duration: 2000 });
                    return;
                }

                setDraftItem(descriptionResult.updatedItem);
                Toast.show({ content: contentActionCopy.success, duration: 1400 });
                return;
            }

            const payload: NewItemMetadataAPIParams = {
                fileId: sourceFile.uid,
                item: prepareNewItemMetadataRequestItem(
                    draftItem,
                    sourceFile.extractedData?.data?.categories || [],
                    sourceLanguage.code,
                ),
                projectId: projectData.projectId,
                sourceLang: sourceLanguage,
                targetLang: targetLanguages as any,
                contentLength: getProjectDescriptionContentLength(projectData, storeDetails?.businessType, storeDetails?.businessCategory),
                tone: getProjectDescriptionTone(projectData, storeDetails?.businessType, storeDetails?.businessCategory),
                ...(storeDetails?.businessType?.trim() ? { businessType: storeDetails.businessType.trim().slice(0, 100) } : {}),
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
                Toast.show({ content: t('enhancementPackRequired'), duration: 2200 });
            } else {
                Toast.show({ content: contentActionCopy.failure, duration: 2000 });
            }
        } finally {
            dispatch(stopLoader('generating_content'));
            setIsAiWorking(false);
        }
    };

    const handleRetryTranslation = async (languageCode: string) => {
        if (
            isAiWorking
            || !canGenerateDescriptions
            || !canEditMasterFields
            || languageCode === primaryLanguage
            || !projectData
            || !sourceFile
        ) return;
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
            priceResult: normalizeOptionalMenuPrice(attribute.price),
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

            if (!attribute.priceResult.success) {
                Toast.show({ content: `Attribute ${index + 1}: ${attribute.priceResult.error || 'Invalid price format.'}`, duration: 1800 });
                return;
            }
        }

        const normalizedItemPrice = normalizeOptionalMenuPrice(draftItem.price);
        if (!normalizedItemPrice.success) {
            Toast.show({ content: normalizedItemPrice.error || 'Invalid price format.', duration: 1800 });
            return;
        }

        if (draftItem.duration !== undefined && (draftItem.duration < 0 || draftItem.duration > 240)) {
            Toast.show({ content: t('prepTimeRangeHelp'), duration: 1800 });
            return;
        }

        if (draftItem.ownerBoost !== undefined && (draftItem.ownerBoost < -20 || draftItem.ownerBoost > 20)) {
            Toast.show({ content: t('priorityRangeHelp'), duration: 1800 });
            return;
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
                    price: attribute.priceResult.data || '',
                })),
                available: draftItem.available !== false,
                categoryId: draftItem.category || undefined,
                categoryName,
                description: getLocalizedValue(draftItem.description, primaryLanguage).trim(),
                image: isAddMode || !onManageImages
                    ? imagePreview || (item?.image ? null : undefined)
                    : undefined,
                isBestSeller: draftItem.isBestSeller === true,
                duration: draftItem.duration,
                name: getLocalizedValue(draftItem.name, primaryLanguage).trim(),
                ownerBoost: draftItem.ownerBoost ?? 0,
                price: normalizedItemPrice.data || '',
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
                            {!isAddMode
                            && languageCode !== primaryLanguage
                            && canGenerateDescriptions
                            && canEditMasterFields ? (
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
                                                        inputMode="text"
                                                        maxLength={MENU_PRICE_TEXT_MAX_LENGTH}
                                                        onChange={(value) => updateAttributeField(attribute.id, { price: value })}
                                                        placeholder={t('variantPrice')}
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
                                        onChange={(value: string) => {
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
                                                capture="environment"
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
                                            {itemImagePreviews.length > 0 && onGenerateImage ? (
                                                <Button fill="outline" onClick={onGenerateImage} size="small">
                                                    <Flex align="center" gap={6}>
                                                        <LuSparkles size={14} />
                                                        <Text>{t('generateImage')}</Text>
                                                    </Flex>
                                                </Button>
                                            ) : null}
                                        </Flex>
                                    ) : null}
                                </Flex>
                                {canGenerateSharableCard ? (
                                    <Flex gap={8} wrap="wrap">
                                        <Button disabled={isCardWorking} fill="outline" onClick={handleShareCard} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuShare2 size={14} />
                                                <Text>Share card</Text>
                                            </Flex>
                                        </Button>
                                        <Button disabled={isCardWorking} fill="outline" onClick={handleDownloadCard} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuDownload size={14} />
                                                <Text>Download card</Text>
                                            </Flex>
                                        </Button>
                                    </Flex>
                                ) : null}
                            </Flex>

                            {!(draftItem.attributes || []).length ? (
                                <Flex gap={6} vertical>
                                    <Text strong>{t('priceLabel', { currency: currencySymbol })}</Text>
                                    <Input
                                        disabled={!canEditPrice}
                                        inputMode="text"
                                        maxLength={MENU_PRICE_TEXT_MAX_LENGTH}
                                        onChange={(value) => setDraftItem((previous) => ({ ...previous, price: value }))}
                                        placeholder={t('pricePlaceholder')}
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

                            <div style={inlineSurfaceStyle}>
                                <Flex gap={10} vertical>
                                    <Text strong>Customer preview</Text>
                                    <Flex align="center" gap={10}>
                                        {itemImagePreviews[0] ? (
                                            <Image
                                                height={48}
                                                preview={false}
                                                src={itemImagePreviews[0]}
                                                style={{ borderRadius: 8, objectFit: 'cover', width: 48 }}
                                                width={48}
                                            />
                                        ) : null}
                                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                            <Text strong>{sharableCardInput.itemName}</Text>
                                            <Text type="secondary">
                                                {[
                                                    selectedCategory?.name,
                                                    draftItem.attributes?.length ? 'Has options' : sharableCardInput.price,
                                                    draftItem.available === false ? availabilityLabels.unavailable : null,
                                                    draftItem.active === false ? t('hidden') : null,
                                                ].filter(Boolean).join(' · ') || 'Saved item details'}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Flex>
                            </div>

                            <Collapse>
                                <Collapse.Panel
                                    key="more-options"
                                    title={(
                                        <Flex gap={2} vertical>
                                            <Text strong>More options</Text>
                                            <Text type="secondary">Popular label, prep time, and featured placement.</Text>
                                        </Flex>
                                    )}
                                >
                                    <Flex gap={12} vertical>
                                        <div style={inlineSurfaceStyle}>
                                            <Flex align="center" justify="space-between">
                                                <Flex align="center" gap={10}>
                                                    <LuStar
                                                        size={18}
                                                        style={{
                                                            color: draftItem.isBestSeller ? token.colorWarning : token.colorTextSecondary,
                                                        }}
                                                    />
                                                    <Flex gap={2} vertical>
                                                        <Text strong>{t('bestSeller')}</Text>
                                                        <Text type="secondary">{t('bestSellerHelp')}</Text>
                                                    </Flex>
                                                </Flex>
                                                <Switch
                                                    checked={draftItem.isBestSeller === true}
                                                    onChange={(checked) => setDraftItem((previous) => ({ ...previous, isBestSeller: checked }))}
                                                />
                                            </Flex>
                                        </div>

                                        <div style={inlineSurfaceStyle}>
                                            <Flex gap={12} vertical>
                                                <Flex align="center" gap={10}>
                                                    <LuClock size={18} style={{ color: token.colorTextSecondary }} />
                                                    <Flex gap={2} vertical>
                                                        <Text strong>{t('prepTime')}</Text>
                                                        <Text type="secondary">{t('prepTimeHelp')}</Text>
                                                    </Flex>
                                                </Flex>
                                                <Input
                                                    max={240}
                                                    min={0}
                                                    onChange={(value) => setDraftItem((previous) => ({
                                                        ...previous,
                                                        duration: parseBoundedNumber(value, 0, 240),
                                                    }))}
                                                    placeholder={t('prepTimePlaceholder')}
                                                    step={1}
                                                    type="number"
                                                    value={draftItem.duration !== undefined ? String(draftItem.duration) : ''}
                                                />
                                            </Flex>
                                        </div>

                                        <div style={inlineSurfaceStyle}>
                                            <Flex gap={12} vertical>
                                                <Flex align="center" gap={10}>
                                                    <LuTrendingUp size={18} style={{ color: token.colorTextSecondary }} />
                                                    <Flex gap={2} vertical>
                                                        <Text strong>{t('priority')}</Text>
                                                        <Text type="secondary">{t('priorityHelp')}</Text>
                                                    </Flex>
                                                </Flex>
                                                <Flex gap={8}>
                                                    <Button
                                                        fill={ownerBoostLevel === 'lower' ? 'solid' : 'outline'}
                                                        onClick={() => setOwnerBoostLevel(-10)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        <Flex align="center" gap={6} justify="center">
                                                            <LuMinus size={14} />
                                                            <Text>{t('lower')}</Text>
                                                        </Flex>
                                                    </Button>
                                                    <Button
                                                        fill={ownerBoostLevel === 'normal' ? 'solid' : 'outline'}
                                                        onClick={() => setOwnerBoostLevel(0)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        <Text>{t('normal')}</Text>
                                                    </Button>
                                                    <Button
                                                        fill={ownerBoostLevel === 'higher' ? 'solid' : 'outline'}
                                                        onClick={() => setOwnerBoostLevel(10)}
                                                        style={{ flex: 1 }}
                                                    >
                                                        <Flex align="center" gap={6} justify="center">
                                                            <LuPlus size={14} />
                                                            <Text>{t('higher')}</Text>
                                                        </Flex>
                                                    </Button>
                                                </Flex>
                                                <Text type="secondary">{t('priorityRangeHelp')}</Text>
                                            </Flex>
                                        </div>

                                        <Collapse accordion>
                                            <Collapse.Panel
                                                key="customer-impact-guide"
                                                title={(
                                                    <Flex gap={2} vertical>
                                                        <Text strong>{t('itemCustomerImpactTitle')}</Text>
                                                        <Text type="secondary">{t('itemCustomerImpactIntro')}</Text>
                                                    </Flex>
                                                )}
                                            >
                                                <Flex gap={12} vertical>
                                                    {[
                                                        {
                                                            desc: t('itemCustomerImpactReorderDesc'),
                                                            label: t('itemCustomerImpactReorderLabel'),
                                                        },
                                                        {
                                                            desc: t('itemCustomerImpactBestSellerDesc'),
                                                            label: t('itemCustomerImpactBestSellerLabel'),
                                                        },
                                                        {
                                                            desc: t('itemCustomerImpactPrepTimeDesc'),
                                                            label: t('itemCustomerImpactPrepTimeLabel'),
                                                        },
                                                        {
                                                            desc: t('itemCustomerImpactFeatureDesc'),
                                                            label: t('itemCustomerImpactFeatureLabel'),
                                                        },
                                                    ].map((row) => (
                                                        <Flex gap={2} key={row.label} vertical>
                                                            <Text strong>{row.label}</Text>
                                                            <Text type="secondary">{row.desc}</Text>
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            </Collapse.Panel>
                                        </Collapse>
                                    </Flex>
                                </Collapse.Panel>
                            </Collapse>
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
                                        {metadataFields.map(renderDecisionFactControl)}
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

                    {(projectData && sourceFile && canEditDescription && manualDescriptionProtected) ? (
                        <Text type="secondary">
                            Manual descriptions are protected. Use the language controls to refresh a translation.
                        </Text>
                    ) : null}

                    {(projectData && sourceFile && canEditDescription && canGenerateDescriptions && !manualDescriptionProtected) ? (
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
