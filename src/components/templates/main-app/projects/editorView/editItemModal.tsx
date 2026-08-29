import AIButtonIcon from '@atoms/aiButtonIcon';
import { getOwnerLabels } from '@config/businessLabels';
import { getDurationConfig } from '@config/decisionBlocks';
import { FEATURE_FLAGS } from '@config/features';
import { getMetadataFieldsForBusiness, MetadataFieldConfig } from '@config/itemMetadataConfig';
import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { CONTENT_CREDIT_OPERATION_COSTS } from '@data/shared/contentCreditPolicy';
import { trackOwnerControlUsage } from '@database/ownerControlUsage';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getProjectDescriptionContentLength, getProjectDescriptionTone } from '@lib/ai/projectAIPreferences';
import { hasAnyNonEmptyDescription } from '@lib/menu/descriptionQuality';
import { labelConfirmDialog } from '@lib/accessibility/antConfirmDialog';
import { getDecisionFactValue, setDecisionFactValue } from '@lib/menu/itemDecisionFacts';
import { downloadSharableItemCard, shareSharableItemCard, type SharableItemCardInput } from '@lib/menu/sharableItemCard';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { buildItemImageEditorTarget } from '@lib/media/itemImageAssociationBoundary';
import { getPublicItemListPriceLabel } from '@lib/pricing/publicItemPricePresentation';
import { MENU_PRICE_TEXT_MAX_LENGTH, normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import getNewItemMetadataViaAPI, {
    mergeGeneratedItemMetadata,
    prepareNewItemMetadataRequestItem,
} from '@services/ai/dataGeneration/getNewItemMetadataViaAPI';
import { UserUploadedFileType } from '@type/common';
import type { InheritanceState, OutletPolicy } from '@type/multiOutlet.types';
import { removeObjRef } from '@util/utils';
import { message as antdMessage, Button, Collapse, CollapseProps, Empty, Flex, Input, InputNumber, Modal, Popconfirm, Select, Slider, Switch, Tooltip, Typography } from 'antd';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'; // Added useCallback
import { LuCheck, LuClock, LuDownload, LuExternalLink, LuEye, LuFileImage, LuHelpCircle, LuLock, LuPlus, LuShare2, LuSparkles, LuTrendingUp, LuX } from 'react-icons/lu';
import { ExtractedDataAttribute, ExtractedDataItem, ItemForDropdown, NewItemMetadataAPIParams, Project, ProjectFileType } from '../types';
import { sanitizeUserInput } from '../utils';
import { getBoundedMenuEditorStringContext, getMenuEditorProjectLogContext, logMenuEditorFailure } from '../utils/editorDiagnostics';
import { getBoundedTranslationStringContext, getTranslationLanguageLogContext, getTranslationScopeLogContext, logTranslationFailure } from '../utils/translationDiagnostics';
import { clearStaleTranslations, translateItem } from '../utils/translationsUtils';
import { runSingleItemDescriptionGeneration } from './descriptionGeneration.shared';
import UploadedImagesList from './uploadedImagesList';

const { Text } = Typography;

function getLocalizedDraftText(value: unknown, language: string, fallback = ''): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const record = value as Record<string, string>;
        return record[language] || Object.values(record).find(Boolean) || fallback;
    }
    return fallback;
}

function getFirstItemImageUrl(images: unknown): string | undefined {
    const list = Array.isArray(images) ? images : images ? [images] : [];
    for (const image of list) {
        if (typeof image === 'string') return image;
        if (image && typeof image === 'object') {
            const record = image as Record<string, unknown>;
            const url = record.url || record.src || record.imageUrl || record.downloadURL || record.uploadedUrl;
            if (typeof url === 'string' && url.trim()) return url;
        }
    }
    return undefined;
}

// Memoize ItemFormView to prevent unnecessary re-renders
const ItemFormView = memo((
    { modalData,
        lang,
        itemData,
        categoriesList,
        renderEditableContent,
        handleRetryTranslation,
        handleAddAttribute,
        handleDeleteAttribute,
        setItemData, // Pass setItemData if category selection is handled here
        isCategoryLocked, // Multi-outlet: lock category for inherited items
        canRetryTranslation,
        sourceLanguageCode,
    }: {
        modalData: { active: boolean; item: ExtractedDataItem | null, status: 'edit' | 'add' };
        lang: string;
        itemData: ExtractedDataItem | null;
        categoriesList: any[];
        renderEditableContent: (lang: string, content: string, id: string, attributeId?: string) => React.ReactElement;
        handleRetryTranslation: (language: string) => Promise<void>;
        handleAddAttribute: () => void;
        handleDeleteAttribute: (attributeId: string) => void;
        setItemData: React.Dispatch<React.SetStateAction<ExtractedDataItem | null>>;
        isCategoryLocked?: boolean;
        canRetryTranslation?: boolean;
        sourceLanguageCode: string;
    }
) => {
    return (
        <Flex vertical gap={16}>
            <Flex gap={8}>
                <Text strong style={{ minWidth: 80 }}>Category</Text>
                {isCategoryLocked ? (
                    <Tooltip title="Category is controlled by master menu and cannot be changed">
                        <Select
                            aria-label="Category"
                            style={{ width: '100%' }}
                            value={itemData?.category}
                            disabled
                            options={categoriesList.map(cat => ({ value: cat.id, label: cat.name?.[lang] || cat.id }))}
                            suffixIcon={<LuLock size={12} style={{ opacity: 0.5 }} />}
                        />
                    </Tooltip>
                ) : (
                    <Select
                        aria-label="Category"
                        style={{ width: '100%' }}
                        value={itemData?.category}
                        onChange={(value) => setItemData(prev => ({ ...prev!, category: value }))}
                        options={categoriesList.map(cat => ({ value: cat.id, label: cat.name?.[lang] || cat.id }))}
                    />
                )}
            </Flex>

            <Flex gap={8}>
                <Text strong style={{ minWidth: 80 }}>Name</Text>
                {renderEditableContent(lang, itemData?.name?.[lang] || '', "name")}
            </Flex>

            {itemData?.description && (
                <Flex gap={8}>
                    <Text strong style={{ minWidth: 80 }}>Description</Text>
                    {renderEditableContent(lang, itemData?.description?.[lang] || '', "description")}
                </Flex>
            )}

            {Boolean(itemData?.attributes?.length) ? (
                <Flex gap={8} align='flex-start' >
                    <Text strong style={{ minWidth: 80 }}>Attributes</Text>
                    <Flex vertical gap={12}>
                        {itemData?.attributes?.map((attr) => (
                            <Flex align='center' key={attr.id} gap={16}>
                                <Flex vertical gap={4}>
                                    {renderEditableContent(lang, attr.name?.[lang] || '', "attr_name", attr.id)}
                                </Flex>
                                <Flex vertical gap={4}>
                                    {renderEditableContent(lang, attr.price || '', "attr_price", attr.id)}
                                </Flex>
                                <Button aria-label="Delete attribute" type="text" size="small" danger icon={<LuX />} onClick={() => handleDeleteAttribute(attr.id)} />
                            </Flex>
                        ))}
                    </Flex>
                </Flex>
            ) : <Flex gap={8}>
                <Text strong style={{ minWidth: 80 }}>Price</Text>
                {renderEditableContent(lang, itemData?.price || '', "price")}
            </Flex>}

            <Flex gap={8} align='flex-end' justify='flex-end' style={{ width: '100%' }}>
                {modalData.status == 'edit' && canRetryTranslation && lang !== sourceLanguageCode && <AIButtonIcon
                    onClick={() => handleRetryTranslation(lang)}
                    tooltip={`Refresh the ${GlobalLanguagesList.find(l => l.code == lang)?.name} translation for this item.`}
                    label={`Refresh ${GlobalLanguagesList.find(l => l.code == lang)?.name} Translation`}
                />}
                <Button icon={<LuPlus />} onClick={handleAddAttribute}>Add Attribute</Button>
            </Flex>
        </Flex>
    );
});
ItemFormView.displayName = 'ItemFormView'; // <-- This is the fix

interface EditItemModalProps {
    modalData: { active: boolean; item: ExtractedDataItem | null, status: 'edit' | 'add' };
    onClose: any;
    selectedLanguages: string[];
    projectData: Project;
    onImageUpload: (selectedItem: ItemForDropdown, imagesToUpload: UserUploadedFileType[]) => Promise<void>;
    openAddImageModal: (itemData: ExtractedDataItem) => void;
    onProjectDataUpdate?: (updatedProject: Project) => Promise<void> | void;
    setUpdatedFileData: any;
    fileData: ProjectFileType;
    onPreviewFile?: (file: ProjectFileType) => void; // Optional: for TraditionalView to show file preview
    // Multi-outlet governance props
    inheritanceState?: InheritanceState;
    isMasterLinked?: boolean;
    outletPolicy?: OutletPolicy | null;
}
const EditItemModal: React.FC<EditItemModalProps> = ({ modalData, onClose, selectedLanguages, projectData, onImageUpload, openAddImageModal, onProjectDataUpdate, setUpdatedFileData, fileData, onPreviewFile, inheritanceState, isMasterLinked, outletPolicy }) => {

    const [itemData, setItemData] = useState<ExtractedDataItem | null>(null);
    const [activeTab, setActiveTab] = useState<string[]>(['Images']);
    const [isCardWorking, setIsCardWorking] = useState(false);
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const dispatch = useAppDispatch();
    const { storeDetails, userPermissions } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const canGenerateDescriptions = userPermissions?.canGenerateDescriptions === true;

    // Multi-outlet governance: Determine if fields should be locked
    // Inherited/overridden items have locked brand-critical fields (name, description, images, category)
    const isInheritedItem = inheritanceState === 'inherited' || inheritanceState === 'overridden';
    const isFieldLocked = useCallback((field: string) => {
        if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET || !isMasterLinked) return false;
        if (!isInheritedItem) return false;
        if (field === 'description' && outletPolicy?.descriptionOverride === true) return false;
        if (field === 'images' && outletPolicy?.imageOverride === true) return false;
        // Lock brand-critical fields for inherited items (per FR-6 in spec)
        return ['name', 'description', 'category', 'images'].includes(field);
    }, [isMasterLinked, isInheritedItem, outletPolicy?.descriptionOverride, outletPolicy?.imageOverride]);

    // Get dynamic availability labels based on business type
    const availabilityLabels = useMemo(
        () => getOwnerLabels(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );

    // Get duration configuration based on business type
    const durationConfig = useMemo(
        () => getDurationConfig(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );

    // Get metadata fields relevant to this store's business category
    const metadataFields = useMemo(
        () => getMetadataFieldsForBusiness(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );
    const primaryLanguage = selectedLanguages[0] || 'en';
    const sourceLanguageCode = getCanonicalProjectSourceLanguage(projectData.languages);
    const initialDraftState = useMemo(
        () => JSON.stringify(removeObjRef(modalData.item) ?? null),
        [modalData.item],
    );
    const currentDraftState = useMemo(
        () => JSON.stringify(removeObjRef(itemData) ?? null),
        [itemData],
    );
    const hasDraftChanges = currentDraftState !== initialDraftState;

    const handleClose = useCallback(() => {
        if (!hasDraftChanges) {
            onClose();
            return;
        }

        Modal.confirm({
            title: 'Discard unsaved item changes?',
            modalRender: labelConfirmDialog('Discard unsaved item changes?'),
            icon: <LuHelpCircle />,
            content: 'Your unsaved item changes will be lost.',
            okText: 'Discard Changes',
            okType: 'danger',
            cancelText: 'Keep Editing',
            onOk: onClose,
        });
    }, [hasDraftChanges, onClose]);

    useEffect(() => {
        setItemData(modalData.item);
        if (modalData.active && modalData.item) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [modalData]);

    useEffect(() => {
        if (activeProject && itemData) {
            // Find the item in the latest fileData from activeProject to ensure consistency
            const updatedItem = fileData.extractedData?.data?.items?.find(item => item.id === itemData.id);
            if (updatedItem) {
                setItemData(updatedItem);
            }
        }
    }, [activeProject, fileData, itemData?.id]); // Added fileData and itemData.id as dependencies

    const categoriesList = useMemo(() => {
        let categoriesForDropdown: any[] = [];
        projectData?.files?.forEach(file => {
            categoriesForDropdown = [...categoriesForDropdown, ...(file?.extractedData?.data?.categories || [])]
        });
        return categoriesForDropdown;
    }, [projectData]);
    const selectedCategory = useMemo(
        () => categoriesList.find((category) => category.id === itemData?.category),
        [categoriesList, itemData?.category],
    );
    const sharableCardInput = useMemo<SharableItemCardInput>(() => {
        const store = storeDetails as any;
        const itemName = getLocalizedDraftText(itemData?.name, primaryLanguage, 'Menu item');
        const description = getLocalizedDraftText(itemData?.description, primaryLanguage);
        const categoryName = getLocalizedDraftText(selectedCategory?.name, primaryLanguage);
        const projectName = getLocalizedDraftText((projectData as any)?.metadata?.name, primaryLanguage);
        const price = getPublicItemListPriceLabel(itemData, store?.currencySymbol || '₹') || '';

        return {
            itemName,
            description,
            categoryName,
            price,
            storeName: String(store?.publicPresence?.displayName || store?.name || store?.tenantName || 'Menu').trim(),
            projectName,
            imageUrl: getFirstItemImageUrl(itemData?.images),
            accentColor: store?.publicPresence?.accentColor || (projectData as any)?.config?.design?.brand?.accentColor,
            updatedLabel: 'Current menu',
        };
    }, [itemData, primaryLanguage, projectData, selectedCategory?.name, storeDetails]);
    const customerPreviewMeta = useMemo(() => {
        const parts = [
            sharableCardInput.categoryName,
            itemData?.attributes?.length ? 'Has options' : sharableCardInput.price,
            itemData?.available === false ? availabilityLabels.unavailable : null,
            itemData?.active === false ? 'Hidden from customers' : 'Customers can see this',
        ].filter(Boolean);

        return parts.join(' - ') || 'Saved item details';
    }, [availabilityLabels.unavailable, itemData?.active, itemData?.attributes?.length, itemData?.available, sharableCardInput.categoryName, sharableCardInput.price]);
    const canGenerateSharableCard = FEATURE_FLAGS.ENABLE_SHARABLE_ITEM_CARD_GENERATION && modalData.status === 'edit' && Boolean(itemData?.id);

    const handleShareCard = useCallback(async () => {
        if (!canGenerateSharableCard || isCardWorking) return;
        setIsCardWorking(true);
        try {
            const result = await shareSharableItemCard(sharableCardInput);
            antdMessage.success(result === 'shared' ? 'Card shared' : 'Card downloaded');
        } catch {
            antdMessage.error('Could not create card.');
        } finally {
            setIsCardWorking(false);
        }
    }, [canGenerateSharableCard, isCardWorking, sharableCardInput]);

    const handleDownloadCard = useCallback(async () => {
        if (!canGenerateSharableCard || isCardWorking) return;
        setIsCardWorking(true);
        try {
            await downloadSharableItemCard(sharableCardInput);
            antdMessage.success('Card downloaded');
        } catch {
            antdMessage.error('Could not create card.');
        } finally {
            setIsCardWorking(false);
        }
    }, [canGenerateSharableCard, isCardWorking, sharableCardInput]);
    const hasMultipleLanguages = selectedLanguages.length > 1;
    const sourceDescription = itemData?.description?.[sourceLanguageCode]?.trim() || '';
    const hasSourceDescription = sourceDescription.length > 0;
    const manualDescriptionProtected = itemData?.descriptionSource === 'manual'
        && hasAnyNonEmptyDescription(itemData.description);
    const contentActionCopy = useMemo(() => {
        if (hasSourceDescription) {
            return {
                label: 'Refresh Descriptions',
                helper: `Refreshes this item in every menu language. Uses ${CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE} enhancement credit.`,
                success: 'Descriptions refreshed.',
                failure: 'Failed to refresh descriptions. Please try again.',
                unexpected: 'An unexpected error occurred while refreshing descriptions. Please try again.',
                validation: 'descriptions',
            };
        }

        if (hasMultipleLanguages) {
            return {
                label: 'Generate Description & Translations',
                helper: 'Creates the first description and translations for this item at no credit cost.',
                success: 'Description and translations generated.',
                failure: 'Failed to generate description and translations. Please try again.',
                unexpected: 'An unexpected error occurred while generating description and translations. Please try again.',
                validation: 'description and translations',
            };
        }

        return {
            label: 'Generate Description',
            helper: 'Creates the first description for this item at no credit cost.',
            success: 'Description generated.',
            failure: 'Failed to generate description. Please try again.',
            unexpected: 'An unexpected error occurred while generating description. Please try again.',
            validation: 'description',
        };
    }, [hasMultipleLanguages, hasSourceDescription]);

    const onUploadGeneratedImage = useCallback(async (imagesToUpload: UserUploadedFileType[]) => {
        if (!itemData) throw new Error('menu_editor_image_edit_item_missing');
        const itemForDropdown = buildItemImageEditorTarget(projectData, {
            fileId: fileData.uid,
            id: itemData.id,
        });
        if (!itemForDropdown) throw new Error('menu_editor_image_edit_target_missing');
        await onImageUpload(itemForDropdown, imagesToUpload);
    }, [fileData.uid, itemData, onImageUpload, projectData]);

    // Memoize onChangeValue using useCallback
    const onChangeValue = useCallback((lang: string, id: string, newValue: any, attributeId?: string) => {
        setItemData(prevItemData => {
            if (!prevItemData) return null;

            const updatedItem = { ...prevItemData };

            if (id === 'name') {
                const safeName = sanitizeUserInput(newValue, false);
                updatedItem.name = {
                    ...(updatedItem.name || {}),
                    [lang]: safeName
                };
            } else if (id === 'description') {
                const safeDescription = sanitizeUserInput(newValue, true);
                updatedItem.description = {
                    ...(updatedItem.description || {}),
                    [lang]: safeDescription
                };
                // P1.4: Mark as manually written to protect from AI refresh
                updatedItem.descriptionSource = 'manual';
            } else if (id === 'price') {
                updatedItem.price = newValue;
            } else if (id === 'attr_name' && attributeId) {
                updatedItem.attributes = (updatedItem.attributes || []).map(attr => {
                    if (attr.id === attributeId) {
                        const safeAttrName = sanitizeUserInput(newValue, false);
                        return {
                            ...attr,
                            name: {
                                ...(attr.name || {}),
                                [lang]: safeAttrName
                            }
                        };
                    }
                    return attr;
                });
            } else if (id === 'attr_price' && attributeId) {
                updatedItem.attributes = (updatedItem.attributes || []).map(attr => {
                    if (attr.id === attributeId) {
                        return {
                            ...attr,
                            price: newValue
                        };
                    }
                    return attr;
                });
            }
            return updatedItem;
        });
    }, [setItemData]); // setItemData is a stable function from useState

    const handleRetryTranslation = useCallback(async (language: string) => {
        const sourceLangCode = getCanonicalProjectSourceLanguage(projectData.languages);
        if (isInheritedItem || !canGenerateDescriptions || language === sourceLangCode || !itemData) return;
        dispatch(startLoader("retrying translations"))
        try {
            const sourceLang = GlobalLanguagesList.find(lang => lang.code === sourceLangCode);
            const targetLang = GlobalLanguagesList.find(lang => lang.code === language);
            if (!sourceLang || !targetLang) throw new Error('Translation language is unavailable.');
            const { updatedItem, message: resultMessage, messageType } = await translateItem(projectData, fileData, targetLang, sourceLang, AI_ACTIONS_TYPES.ITEM_TRANSLATION, itemData);
            if (!updatedItem) throw new Error('Translated item is unavailable.');
            setItemData(updatedItem);
            if (messageType && resultMessage) {
                antdMessage[messageType as 'success' | 'error' | 'warning'](resultMessage);
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error('Translation failed');
                logTranslationFailure('menu_translation_item_retry_failed', error, {
                    ...getTranslationScopeLogContext(projectData.projectId, fileData.uid),
                    ...getTranslationLanguageLogContext(language, getCanonicalProjectSourceLanguage(projectData.languages)),
                    ...getBoundedTranslationStringContext('itemId', itemData?.id),
                });
            }
        } finally {
            dispatch(stopLoader("retrying translations"))
        }
    }, [canGenerateDescriptions, dispatch, fileData, isInheritedItem, itemData, projectData, setItemData]);

    const handleAddAttribute = useCallback(() => {
        if (!itemData) return;
        const itemCopy = removeObjRef(itemData);
        if (!itemCopy) return;
        let sequenceId = 1;

        if (!itemCopy.attributes?.length) {
            itemCopy.attributes = [];
        } else {
            sequenceId = (Number(itemCopy.attributes[itemCopy.attributes.length - 1]?.id?.split(`${itemData.id}-a`)[1]) + 1) || 1;
        }

        const newAttribute: ExtractedDataAttribute = {
            id: `${itemData.id}-a${sequenceId}`,
            name: Object.fromEntries(Array.from(selectedLanguages).map(lang => [lang, ''])),
            price: '',
            active: true
        };
        itemCopy.attributes.push(newAttribute);
        setItemData(itemCopy);
    }, [itemData, fileData.uid, selectedLanguages, setItemData]);

    const handleDeleteAttribute = useCallback((attributeId: string) => {
        if (!itemData) return;
        const itemCopy = removeObjRef(itemData);
        if (!itemCopy) return;
        itemCopy.attributes = itemCopy.attributes?.filter(attr => attr.id !== attributeId);
        setItemData(itemCopy);
    }, [itemData, setItemData]);

    const renderEditableContent = useCallback((lang: string, content: string, id: string, attributeId: string = "") => {
        const getPlaceholder = (idString: string) => {
            if (idString == 'name') return `Name`;
            if (idString == 'price') return `Price`;
            if (idString == 'description') return `Description`;
            if (idString == 'attr_price') return `Attribute Price`;
            if (idString == 'attr_name') return `Attribute Name`;
            return '';
        };

        const isDescription = id.includes('description');
        const isPrice = id === 'price' || id === 'attr_price';
        const InputComponent = isDescription ? Input.TextArea : Input;
        const props = isDescription
            ? { autoSize: { minRows: 2, maxRows: 6 }, showCount: true }
            : isPrice
                ? { maxLength: MENU_PRICE_TEXT_MAX_LENGTH }
                : {};

        // Multi-outlet: Check if this field is locked for inherited items
        const locked = isFieldLocked(id);
        if (locked) {
            return (
                <Tooltip title="This field is controlled by master menu and cannot be edited">
                    <Input
                        value={content}
                        placeholder={getPlaceholder(id)}
                        disabled
                        suffix={<LuLock size={12} style={{ opacity: 0.5 }} />}
                        style={{ width: '100%', height: 32 }}
                    />
                </Tooltip>
            );
        }

        return (
            <InputComponent
                value={content}
                placeholder={getPlaceholder(id)}
                onChange={(e) => onChangeValue(lang, id, e.target.value, attributeId)}
                {...props}
                style={{
                    width: '100%',
                    cursor: 'text',
                    ...(isDescription ? { height: 'max-content' } : { height: 32 })
                }}
            />
        );
    }, [onChangeValue, isFieldLocked]);

    const onGenerateContent = async () => {
        if (!canGenerateDescriptions) {
            antdMessage.info('You do not have permission to generate descriptions.');
            return;
        }
        if (isFieldLocked('description')) {
            antdMessage.info('Description changes are not enabled for this store.');
            return;
        }
        if (!itemData || !storeDetails || !projectData.projectId) return;

        dispatch(startLoader("generating_content"));
        const sourceLanguage = GlobalLanguagesList.find(
            (gl) => gl.code === getCanonicalProjectSourceLanguage(projectData.languages),
        );
        const projectLanguageCodes = projectData.languages?.length
            ? projectData.languages
            : sourceLanguage
                ? [sourceLanguage.code]
                : [];
        const targetLanguages = projectLanguageCodes
            .map(lang => GlobalLanguagesList.find(gl => gl.code === lang))
            .filter(Boolean);

        try {
            if (!sourceLanguage) {
                antdMessage.error('The source language is unavailable.');
                return;
            }
            // Validate if item name is present in the source language
            if (!itemData.name[sourceLanguage.code]?.trim()) {
                antdMessage.error(`Item name in ${sourceLanguage.name} is required to generate ${contentActionCopy.validation}.`);
                return;
            }

            if (hasSourceDescription) {
                const descriptionResult = await runSingleItemDescriptionGeneration({
                    contentLength: getProjectDescriptionContentLength(projectData, storeDetails.businessType, storeDetails.businessCategory),
                    item: itemData,
                    projectData,
                    sourceFile: fileData,
                    tone: getProjectDescriptionTone(projectData, storeDetails.businessType, storeDetails.businessCategory),
                });
                if (descriptionResult.reason === 'manual_protected') {
                    antdMessage.info('Your manual description was kept unchanged.');
                    return;
                }
                if (descriptionResult.reason) {
                    antdMessage.error(contentActionCopy.failure);
                    return;
                }

                setItemData(descriptionResult.updatedItem);
                antdMessage.success(contentActionCopy.success);
                return;
            }

            const payload: NewItemMetadataAPIParams = {
                item: prepareNewItemMetadataRequestItem(
                    itemData,
                    fileData.extractedData?.data?.categories || [],
                    sourceLanguage.code,
                ),
                targetLang: targetLanguages as any,
                sourceLang: sourceLanguage as any,
                projectId: projectData.projectId,
                fileId: fileData.uid,
                contentLength: getProjectDescriptionContentLength(projectData, storeDetails.businessType, storeDetails.businessCategory),
                tone: getProjectDescriptionTone(projectData, storeDetails.businessType, storeDetails.businessCategory),
                ...(storeDetails.businessType?.trim() ? { businessType: storeDetails.businessType.trim().slice(0, 100) } : {}),
            }
            const result = await getNewItemMetadataViaAPI(payload)
            if (result) {
                antdMessage.success(contentActionCopy.success)
                setItemData(mergeGeneratedItemMetadata(itemData, result))
            } else {
                antdMessage.error(contentActionCopy.failure);
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                logMenuEditorFailure('menu_editor_item_content_generation_failed', error, {
                    ...getMenuEditorProjectLogContext(projectData.projectId, (projectData as { masterProjectId?: unknown }).masterProjectId),
                    ...getBoundedMenuEditorStringContext('fileId', fileData.uid),
                    ...getBoundedMenuEditorStringContext('itemId', itemData.id),
                    sourceLanguagePresent: Boolean(sourceLanguage?.code),
                    targetLanguageCount: targetLanguages.length,
                    attributeCount: itemData.attributes?.length || 0,
                });
                antdMessage.error(contentActionCopy.unexpected);
            }
        } finally {
            dispatch(stopLoader("generating_content"));
        }
    }

    const onSave = useCallback(() => {
        if (!itemData || !itemData.name) {
            antdMessage.error('Item name is missing.');
            return;
        }

        for (const lang of selectedLanguages) {
            if (!itemData.name[lang] || itemData.name[lang].trim() === '') {
                const languageName = GlobalLanguagesList.find(l => l.code === lang)?.name || lang;
                antdMessage.error(`Please enter item name for ${languageName}.`);
                setActiveTab([lang]);
                return;
            }
        }

        const normalizedItemPrice = normalizeOptionalMenuPrice(itemData.price);
        if (!normalizedItemPrice.success) {
            antdMessage.error(normalizedItemPrice.error || 'Invalid price format.');
            return;
        }
        const normalizedAttributes: ExtractedDataAttribute[] = [];
        for (let index = 0; index < (itemData.attributes || []).length; index += 1) {
            const attribute = (itemData.attributes || [])[index];
            if (!attribute) continue;
            const normalizedPrice = normalizeOptionalMenuPrice(attribute.price);
            if (!normalizedPrice.success) {
                antdMessage.error(`Option ${index + 1}: ${normalizedPrice.error || 'Invalid price format.'}`);
                return;
            }
            normalizedAttributes.push({ ...attribute, price: normalizedPrice.data || '' });
        }
        const normalizedItemData = {
            ...itemData,
            price: normalizedItemPrice.data || '',
            attributes: normalizedAttributes,
        };

        // Track ownerBoost changes (Authority Maturation Doctrine)
        const originalItem = modalData.item;
        if (modalData.status === 'edit' && originalItem) {
            const originalBoost = originalItem.ownerBoost || 0;
            const newBoost = itemData.ownerBoost || 0;
            if (originalBoost !== newBoost) {
                // Fire-and-forget tracking
                trackOwnerControlUsage('ownerBoost', {
                    previousValue: originalBoost,
                    newValue: newBoost,
                    projectId: projectData.projectId,
                    itemId: itemData.id,
                });
            }
        }

        const fileCopy = removeObjRef(fileData);
        if (!fileCopy?.extractedData?.data?.items) {
            antdMessage.error('Menu file data is unavailable.');
            return;
        }

        // Translation drift protection: if canonical English source text changed,
        // clear stale translations so they get retranslated instead of showing wrong data
        let finalItem: ExtractedDataItem = normalizedItemData;
        if (modalData.status === 'edit' && modalData.item && (projectData.languages?.length || 0) > 1) {
            const primaryLang = getCanonicalProjectSourceLanguage(projectData.languages);
            finalItem = clearStaleTranslations(
                modalData.item,
                normalizedItemData,
                primaryLang,
                projectData.languages || [],
                { preserveGeneratedDescriptionTranslations: itemData.descriptionSource === 'ai' },
            );
        }

        if (modalData.status == 'edit') {
            fileCopy.extractedData.data.items = fileCopy.extractedData.data.items.map(item => item.id == finalItem?.id ? finalItem : item);
        } else {
            fileCopy.extractedData.data.items.push(finalItem);
        }
        setUpdatedFileData(fileCopy);
        onClose();
    }, [itemData, selectedLanguages, projectData, fileData.uid, setUpdatedFileData, onClose, modalData]); // Dependencies for useCallback

    const collapseItems: CollapseProps['items'] = useMemo(() => {
        const items: CollapseProps['items'] = itemData ? selectedLanguages.map(lang => ({
            key: lang,
            label: `${GlobalLanguagesList.find(l => l.code == lang)?.name} (${lang})`,
            children: (
                <ItemFormView
                    modalData={modalData}
                    lang={lang}
                    itemData={itemData}
                    categoriesList={categoriesList}
                    renderEditableContent={renderEditableContent}
                    handleRetryTranslation={handleRetryTranslation}
                    handleAddAttribute={handleAddAttribute}
                    handleDeleteAttribute={handleDeleteAttribute}
                    setItemData={setItemData}
                    isCategoryLocked={isFieldLocked('category')}
                    canRetryTranslation={canGenerateDescriptions && !isInheritedItem}
                    sourceLanguageCode={getCanonicalProjectSourceLanguage(selectedLanguages)}
                />
            )
        })) : [];

        if (itemData) items.push({
            key: 'Images',
            label: 'Images',
            children: (
                <Flex vertical gap={16}>
                    <UploadedImagesList disabled={isFieldLocked('images')} fileId={fileData.uid} item={itemData} onProjectDataUpdate={onProjectDataUpdate} projectData={projectData} onUploadGeneratedImage={onUploadGeneratedImage} />
                    <Button disabled={isFieldLocked('images')} type="dashed" icon={<LuPlus />} onClick={() => openAddImageModal(itemData)} style={{ width: '100%' }}>Add Image</Button>
                </Flex>
            )
        });
        return items;
    }, [canGenerateDescriptions, categoriesList, handleAddAttribute, handleDeleteAttribute, handleRetryTranslation, isFieldLocked, isInheritedItem, itemData, onProjectDataUpdate, onUploadGeneratedImage, openAddImageModal, projectData, renderEditableContent, selectedLanguages, setItemData]);

    return (
        <Modal
            title={modalData.status == 'edit' ? `Edit Item: ${itemData?.name?.[selectedLanguages[0]] || ''}` : "Add Item"}
            open={Boolean(modalData.active)}
            onCancel={handleClose}
            style={{ top: 20 }}
            styles={{
                body: {
                    maxHeight: 'calc(100vh - 220px)',
                    overflowY: 'auto',
                    padding: 14,
                }
            }}
            footer={<>
                <Flex gap={8} vertical>
                    <Flex gap={16}>
                        <Button icon={<LuX />} onClick={handleClose}>Cancel</Button>
                        {canGenerateSharableCard ? (
                            <>
                                <Button disabled={isCardWorking} icon={<LuShare2 />} onClick={handleShareCard}>Share card</Button>
                                <Button disabled={isCardWorking} icon={<LuDownload />} onClick={handleDownloadCard}>Download card</Button>
                            </>
                        ) : null}
                        {canGenerateDescriptions && !manualDescriptionProtected ? (
                            hasSourceDescription ? (
                                <Popconfirm
                                    cancelText="Cancel"
                                    description={`Uses ${CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE} enhancement credit. Your current generated descriptions will be replaced.`}
                                    okText="Refresh descriptions"
                                    onConfirm={onGenerateContent}
                                    title="Refresh this item's descriptions?"
                                >
                                    <span>
                                        <AIButtonIcon type="default" icon={<LuSparkles />} label={contentActionCopy.label} />
                                    </span>
                                </Popconfirm>
                            ) : (
                                <AIButtonIcon type="default" icon={<LuSparkles />} onClick={onGenerateContent} label={contentActionCopy.label} />
                            )
                        ) : null}
                        <Button type="primary" icon={<LuCheck />} onClick={onSave} >Save</Button>
                    </Flex>
                    {manualDescriptionProtected ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Manual descriptions are protected. Use the language controls to refresh a translation.
                        </Text>
                    ) : canGenerateDescriptions ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {contentActionCopy.helper}
                        </Text>
                    ) : null}
                </Flex>
            </>}
            width={600}
        >
            {itemData ? (
                <Flex vertical gap={16}>
                    <Flex gap={24} wrap="wrap">
                        {/* Active toggle - show/hide item from customers */}
                        <Flex align='center' gap={8}>
                            <label htmlFor="edit-item-active-switch" style={{ cursor: 'pointer' }}>
                                <Text>Show to customers</Text>
                            </label>
                            <Switch
                                id="edit-item-active-switch"
                                aria-label="Show item to customers"
                                size='small'
                                checked={Boolean(itemData?.active)}
                                onChange={(e) => setItemData(prev => ({ ...prev!, active: e }))}
                            />
                        </Flex>
                        {/* Availability toggle - dynamic labels based on business type */}
                        <Flex align='center' gap={8}>
                            <label htmlFor="edit-item-availability-switch" style={{ cursor: 'pointer' }}>
                                <Text style={{ color: itemData?.available === false ? '#ef4444' : undefined }}>
                                    {itemData?.available === false ? availabilityLabels.unavailable : availabilityLabels.available}
                                </Text>
                            </label>
                            <Switch
                                id="edit-item-availability-switch"
                                aria-label="Item available"
                                size='small'
                                checked={itemData?.available !== false}
                                onChange={(e) => setItemData(prev => ({ ...prev!, available: e }))}
                            />
                        </Flex>
                        {/* Best Seller toggle - mark as store bestseller (FR-5 allowed override) */}
                        <Tooltip title="Mark this item as a bestseller at your store. Bestsellers may be highlighted in menus.">
                            <Flex align='center' gap={8}>
                                <label htmlFor="edit-item-best-seller-switch" style={{ cursor: 'pointer' }}>
                                    <Text style={{ color: itemData?.isBestSeller ? '#f59e0b' : undefined }}>
                                        {itemData?.isBestSeller ? '⭐ Best Seller' : 'Best Seller'}
                                    </Text>
                                </label>
                                <Switch
                                    id="edit-item-best-seller-switch"
                                    aria-label="Best seller"
                                    size='small'
                                    checked={Boolean(itemData?.isBestSeller)}
                                    onChange={(e) => setItemData(prev => ({ ...prev!, isBestSeller: e }))}
                                />
                            </Flex>
                        </Tooltip>
                    </Flex>

                    <div style={{
                        background: 'rgba(0,0,0,0.02)',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 8,
                        padding: 12,
                    }}>
                        <Flex gap={10} vertical>
                            <Flex align="center" gap={8}>
                                <LuEye size={15} style={{ opacity: 0.7 }} />
                                <Text strong>Customer preview</Text>
                            </Flex>
                            <Flex align="center" gap={12}>
                                {sharableCardInput.imageUrl ? (
                                    <img
                                        alt={`Customer preview for ${sharableCardInput.itemName}`}
                                        src={sharableCardInput.imageUrl}
                                        style={{
                                            borderRadius: 8,
                                            flex: '0 0 auto',
                                            height: 54,
                                            objectFit: 'cover',
                                            width: 54,
                                        }}
                                    />
                                ) : (
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            background: 'rgba(0,0,0,0.04)',
                                            border: '1px solid rgba(0,0,0,0.08)',
                                            borderRadius: 8,
                                            flex: '0 0 auto',
                                            height: 54,
                                            width: 54,
                                        }}
                                    >
                                        <LuFileImage size={18} style={{ opacity: 0.45 }} />
                                    </Flex>
                                )}
                                <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                    <Text strong ellipsis>{sharableCardInput.itemName}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {customerPreviewMeta}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </div>

                    {/* Advanced Options - Progressive Disclosure (collapsed by default) */}
                    <Collapse
                        size="small"
                        ghost
                        items={[{
                            key: 'advanced',
                            label: (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Advanced Options (Prep Time, Promotion)
                                </Text>
                            ),
                            children: (
                                <Flex gap={16} wrap="wrap" style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                                    {/* Duration Input */}
                                    <Flex align='center' gap={8} style={{ flex: 1, minWidth: 180 }}>
                                        <Tooltip title={`Time to prepare/deliver this item. Used for Quick Pick recommendations.`}>
                                            <Flex align='center' gap={4} style={{ cursor: 'help' }}>
                                                <LuClock size={14} style={{ opacity: 0.6 }} />
                                                <Text style={{ fontSize: 12 }}>Prep Time</Text>
                                            </Flex>
                                        </Tooltip>
                                        <InputNumber
                                            aria-label="Prep time"
                                            size='small'
                                            min={0}
                                            max={240}
                                            value={itemData?.duration}
                                            placeholder={`${durationConfig.default}`}
                                            onChange={(value) => setItemData(prev => ({ ...prev!, duration: value ?? undefined }))}
                                            addonAfter={durationConfig.unit}
                                            style={{ width: 100 }}
                                        />
                                    </Flex>

                                    {/* Owner Boost Slider */}
                                    <Flex align='center' gap={8} style={{ flex: 1, minWidth: 200 }}>
                                        <Tooltip title="Boost or suppress this item in recommendations. Positive = boost, Negative = suppress.">
                                            <Flex align='center' gap={4} style={{ cursor: 'help' }}>
                                                <LuTrendingUp size={14} style={{ opacity: 0.6 }} />
                                                <Text style={{ fontSize: 12 }}>Promotion</Text>
                                            </Flex>
                                        </Tooltip>
                                        <Slider
                                            ariaLabelForHandle="Promotion"
                                            min={-20}
                                            max={20}
                                            value={itemData?.ownerBoost || 0}
                                            onChange={(value: number) => setItemData(prev => ({ ...prev!, ownerBoost: value }))}
                                            tooltip={{ formatter: (val) => val === 0 ? 'Neutral' : val! > 0 ? `+${val}` : `${val}` }}
                                            marks={{ '-20': '-20', '0': '0', '20': '+20' }}
                                            style={{ flex: 1, margin: '0 8px' }}
                                        />
                                    </Flex>
                                </Flex>
                            )
                        }]}
                    />
                    {/* Item Details — Business-category-aware metadata fields */}
                    {metadataFields.length > 0 && (
                        <Collapse
                            size="small"
                            ghost
                            items={[{
                                key: 'metadata',
                                label: (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Item Details ({metadataFields.map(f => f.label).join(', ')})
                                    </Text>
                                ),
                                children: (
                                    <Flex gap={12} wrap="wrap" style={{ padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                                        {metadataFields.map((field: MetadataFieldConfig) => {
                                            if (field.key === 'duration') return null; // Duration is in Advanced Options
                                            const confirmationCopy = field.requiresOwnerConfirmation ? (
                                                <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                                                    {field.confirmationText || 'Only add this if confirmed.'}
                                                </Text>
                                            ) : null;
                                            if (field.key === 'nutritionInfo') {
                                                const nutritionInfo = getDecisionFactValue(itemData, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined;
                                                return (
                                                    <Flex key={field.key} vertical gap={4} style={{ width: '100%' }}>
                                                        <Tooltip title={field.tooltip}>
                                                            <Text style={{ fontSize: 12, cursor: 'help' }}>{field.label}</Text>
                                                        </Tooltip>
                                                        {confirmationCopy}
                                                        <Flex gap={8} wrap="wrap">
                                                            <InputNumber aria-label="Calories" size="small" placeholder="Calories" value={nutritionInfo?.calories}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), calories: v ?? undefined }))}
                                                                addonAfter="kcal" style={{ width: 130 }} min={0} />
                                                            <InputNumber aria-label="Protein" size="small" placeholder="Protein" value={nutritionInfo?.protein}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), protein: v ?? undefined }))}
                                                                addonAfter="g" style={{ width: 110 }} min={0} />
                                                            <InputNumber aria-label="Carbs" size="small" placeholder="Carbs" value={nutritionInfo?.carbs}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), carbs: v ?? undefined }))}
                                                                addonAfter="g" style={{ width: 110 }} min={0} />
                                                            <InputNumber aria-label="Fat" size="small" placeholder="Fat" value={nutritionInfo?.fat}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), fat: v ?? undefined }))}
                                                                addonAfter="g" style={{ width: 110 }} min={0} />
                                                            <Input aria-label="Serving size" size="small" placeholder="Serving size" value={nutritionInfo?.servingSize}
                                                                onChange={(e) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), servingSize: e.target.value || undefined }))}
                                                                style={{ width: 140 }} />
                                                        </Flex>
                                                    </Flex>
                                                );
                                            }
                                            if (field.type === 'multiSelect' && field.options) {
                                                return (
                                                    <Flex key={field.key} align="center" gap={8} style={{ flex: 1, minWidth: 220 }}>
                                                        <Flex vertical style={{ minWidth: 80 }}>
                                                            <Tooltip title={field.tooltip}>
                                                                <Text style={{ fontSize: 12, cursor: 'help' }}>{field.label}</Text>
                                                            </Tooltip>
                                                            {confirmationCopy}
                                                        </Flex>
                                                        <Select
                                                            aria-label={field.label}
                                                            mode="multiple" size="small" allowClear
                                                            placeholder={`Select ${field.label.toLowerCase()}`}
                                                            value={(getDecisionFactValue(itemData, field.key) as string[] | undefined) || []}
                                                            onChange={(val) => setItemData(prev => setDecisionFactValue(prev!, field.key, val.length ? val : undefined))}
                                                            options={field.options}
                                                            style={{ flex: 1 }} maxTagCount={2}
                                                        />
                                                    </Flex>
                                                );
                                            }
                                            if (field.type === 'singleSelect' && field.options) {
                                                return (
                                                    <Flex key={field.key} align="center" gap={8} style={{ flex: 1, minWidth: 180 }}>
                                                        <Flex vertical style={{ minWidth: 80 }}>
                                                            <Tooltip title={field.tooltip}>
                                                                <Text style={{ fontSize: 12, cursor: 'help' }}>{field.label}</Text>
                                                            </Tooltip>
                                                            {confirmationCopy}
                                                        </Flex>
                                                        <Select
                                                            aria-label={field.label}
                                                            size="small" allowClear
                                                            placeholder={`Select`}
                                                            value={getDecisionFactValue(itemData, field.key) as string | undefined}
                                                            onChange={(val) => setItemData(prev => setDecisionFactValue(prev!, field.key, val || undefined))}
                                                            options={field.options}
                                                            style={{ flex: 1 }}
                                                        />
                                                    </Flex>
                                                );
                                            }
                                            if (field.type === 'text') {
                                                return (
                                                    <Flex key={field.key} align="center" gap={8} style={{ flex: 1, minWidth: 180 }}>
                                                        <Flex vertical style={{ minWidth: 80 }}>
                                                            <Tooltip title={field.tooltip}>
                                                                <Text style={{ fontSize: 12, cursor: 'help' }}>{field.label}</Text>
                                                            </Tooltip>
                                                            {confirmationCopy}
                                                        </Flex>
                                                        <Input
                                                            size="small"
                                                            placeholder={field.tooltip}
                                                            value={getDecisionFactValue(itemData, field.key) as string | undefined}
                                                            onChange={(e) => setItemData(prev => setDecisionFactValue(prev!, field.key, e.target.value || undefined))}
                                                            style={{ flex: 1 }}
                                                        />
                                                    </Flex>
                                                );
                                            }
                                            return null;
                                        })}
                                    </Flex>
                                )
                            }]}
                        />
                    )}

                    {(projectData.languages?.length || 0) > 1 ? (
                        <Collapse
                            size='small'
                            items={collapseItems}
                            defaultActiveKey={selectedLanguages.length > 0 ? [selectedLanguages[0]] : []}
                            accordion
                            activeKey={activeTab}
                            onChange={(key) => setActiveTab(key as string[])}
                        />
                    ) : (
                        <>
                            <Flex vertical gap={16}>
                                <ItemFormView
                                    modalData={modalData}
                                    lang={selectedLanguages[0]}
                                    itemData={itemData}
                                    categoriesList={categoriesList}
                                    renderEditableContent={renderEditableContent}
                                    handleRetryTranslation={handleRetryTranslation}
                                    handleAddAttribute={handleAddAttribute}
                                    handleDeleteAttribute={handleDeleteAttribute}
                                    setItemData={setItemData}
                                    isCategoryLocked={isFieldLocked('category')}
                                    canRetryTranslation={canGenerateDescriptions && !isInheritedItem}
                                    sourceLanguageCode={getCanonicalProjectSourceLanguage(selectedLanguages)}
                                />
                                <Flex vertical gap={16}>
                                    <Text strong>Images</Text>
                                    <UploadedImagesList disabled={isFieldLocked('images')} fileId={fileData.uid} item={itemData} onProjectDataUpdate={onProjectDataUpdate} projectData={projectData} onUploadGeneratedImage={onUploadGeneratedImage} />
                                    <Button disabled={isFieldLocked('images')} type="dashed" icon={<LuPlus />} onClick={() => openAddImageModal(itemData)} style={{ width: '100%' }}>Add Image</Button>
                                </Flex>
                            </Flex>
                        </>
                    )}
                    {/* File Indicator - only show when onPreviewFile is provided (TraditionalView) */}
                    {onPreviewFile && fileData && (
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
                            aria-label={modalData.status === 'edit' ? `Preview source file ${fileData.name || ''}`.trim() : `Preview target file ${fileData.name || ''}`.trim()}
                            onClick={() => onPreviewFile(fileData)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onPreviewFile(fileData);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            title={modalData.status === 'edit' ? "Click to preview source file" : "Click to preview target file"}
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
                                <Text strong style={{ fontSize: 12 }}>
                                    {modalData.status === 'edit' ? 'Source File' : 'Saving to'}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {fileData.name || 'Unnamed file'}
                                </Text>
                            </Flex>
                            <LuExternalLink size={14} style={{ opacity: 0.5 }} />
                        </Flex>
                    )}
                </Flex>
            ) : (
                <Empty description="No item data to display or item not selected." />
            )}
        </Modal>
    );
};

export default EditItemModal;
