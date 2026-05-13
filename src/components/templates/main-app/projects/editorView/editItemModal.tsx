import AIButtonIcon from '@atoms/aiButtonIcon';
import { getOwnerLabels } from '@config/businessLabels';
import { getDurationConfig } from '@config/decisionBlocks';
import { FEATURE_FLAGS } from '@config/features';
import { getMetadataFieldsForBusiness, MetadataFieldConfig } from '@config/itemMetadataConfig';
import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { trackOwnerControlUsage } from '@database/ownerControlUsage';
import { useAppDispatch } from '@hook/useAppDispatch';
import { getProjectDescriptionContentLength, getProjectDescriptionTone } from '@lib/ai/projectAIPreferences';
import { hasMeaningfulDescription } from '@lib/menu/descriptionQuality';
import { getDecisionFactValue, setDecisionFactValue } from '@lib/menu/itemDecisionFacts';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectsDataContext, ProjectsDataProviderType } from '@providers/projectsDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { AICapacityError } from '@services/ai/capacityError';
import getNewItemMetadataViaAPI, { mergeGeneratedItemMetadata } from '@services/ai/dataGeneration/getNewItemMetadataViaAPI';
import { UserUploadedFileType } from '@type/common';
import type { InheritanceState, OutletPolicy } from '@type/multiOutlet.types';
import { removeObjRef } from '@util/utils';
import { message as antdMessage, Button, Collapse, CollapseProps, Empty, Flex, Input, InputNumber, Modal, Select, Slider, Switch, Tooltip, Typography } from 'antd';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react'; // Added useCallback
import { LuCheck, LuClock, LuExternalLink, LuFileImage, LuLock, LuPlus, LuSparkles, LuTrendingUp, LuX } from 'react-icons/lu';
import { ExtractedDataAttribute, ExtractedDataItem, ItemForDropdown, NewItemMetadataAPIParams, Project, ProjectFileType } from '../types';
import { sanitizeUserInput } from '../utils';
import { clearStaleTranslations, translateItem } from '../utils/translationsUtils';
import UploadedImagesList from './uploadedImagesList';

const { Text } = Typography;

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
        isCategoryLocked // Multi-outlet: lock category for inherited items
    }: {
        modalData: { active: boolean; item: ExtractedDataItem | null, status: 'edit' | 'add' };
        lang: string;
        itemData: ExtractedDataItem | null;
        categoriesList: any[];
        renderEditableContent: (lang: string, content: string, id: string, attributeId?: string) => JSX.Element;
        handleRetryTranslation: (language: string) => Promise<void>;
        handleAddAttribute: () => void;
        handleDeleteAttribute: (attributeId: string) => void;
        setItemData: React.Dispatch<React.SetStateAction<ExtractedDataItem | null>>;
        isCategoryLocked?: boolean;
    }
) => {
    return (
        <Flex vertical gap={16}>
            <Flex gap={8}>
                <Text strong style={{ minWidth: 80 }}>Category</Text>
                {isCategoryLocked ? (
                    <Tooltip title="Category is controlled by master menu and cannot be changed">
                        <Select
                            style={{ width: '100%' }}
                            value={itemData?.category}
                            disabled
                            options={categoriesList.map(cat => ({ value: cat.id, label: cat.name?.[lang] || cat.id }))}
                            suffixIcon={<LuLock size={12} style={{ opacity: 0.5 }} />}
                        />
                    </Tooltip>
                ) : (
                    <Select
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
                                <Button type="text" size="small" danger icon={<LuX />} onClick={() => handleDeleteAttribute(attr.id)} />
                            </Flex>
                        ))}
                    </Flex>
                </Flex>
            ) : <Flex gap={8}>
                <Text strong style={{ minWidth: 80 }}>Price</Text>
                {renderEditableContent(lang, itemData?.price || '', "price")}
            </Flex>}

            <Flex gap={8} align='flex-end' justify='flex-end' style={{ width: '100%' }}>
                {modalData.status == 'edit' && <AIButtonIcon
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
    onImageUpload: (selectedItem: ItemForDropdown, imagesToUpload: UserUploadedFileType[]) => void;
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
    const { activeProject } = useContext<ProjectsDataProviderType>(ProjectsDataContext);
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)

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
    const availabilityLabels = useMemo(() => getOwnerLabels(storeDetails?.businessType), [storeDetails?.businessType]);

    // Get duration configuration based on business type
    const durationConfig = useMemo(() => getDurationConfig(storeDetails?.businessType), [storeDetails?.businessType]);

    // Get metadata fields relevant to this store's business category
    const metadataFields = useMemo(() => getMetadataFieldsForBusiness(storeDetails?.businessType), [storeDetails?.businessType]);

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
            const updatedItem = fileData.extractedData.data.items.find(item => item.id === itemData.id);
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
    const hasMultipleLanguages = selectedLanguages.length > 1;
    const hasAnyDescription = useMemo(
        () => Object.values(itemData?.description || {}).some((description) => hasMeaningfulDescription(description)),
        [itemData?.description]
    );
    const contentActionCopy = useMemo(() => {
        if (hasMultipleLanguages) {
            return hasAnyDescription
                ? {
                    label: 'Regenerate Description & Translations',
                    helper: 'Refreshes the description and translations for this item.',
                    success: 'Description and translations refreshed.',
                    failure: 'Failed to refresh description and translations. Please try again.',
                    unexpected: 'An unexpected error occurred while refreshing description and translations. Please try again.',
                    validation: 'description and translations',
                }
                : {
                    label: 'Generate Description & Translations',
                    helper: 'Creates the description and translations for this item.',
                    success: 'Description and translations generated.',
                    failure: 'Failed to generate description and translations. Please try again.',
                    unexpected: 'An unexpected error occurred while generating description and translations. Please try again.',
                    validation: 'description and translations',
                };
        }

        return hasAnyDescription
            ? {
                label: 'Regenerate Description',
                helper: 'Refreshes the description for this item.',
                success: 'Description refreshed.',
                failure: 'Failed to refresh description. Please try again.',
                unexpected: 'An unexpected error occurred while refreshing description. Please try again.',
                validation: 'description',
            }
            : {
                label: 'Generate Description',
                helper: 'Creates the description for this item.',
                success: 'Description generated.',
                failure: 'Failed to generate description. Please try again.',
                unexpected: 'An unexpected error occurred while generating description. Please try again.',
                validation: 'description',
            };
    }, [hasAnyDescription, hasMultipleLanguages]);

    const onUploadGeneratedImage = useCallback((imagesToUpload: UserUploadedFileType[]) => {
        if (!itemData) return;
        const itemForDropdown: ItemForDropdown = {
            ...itemData,
            itemName: itemData.name?.[selectedLanguages[0]] || itemData.id,
            categoryName: "",
            fileId: itemData.id,
            descriptionLine: itemData.description?.[selectedLanguages[0]] || '',
            attributesList: itemData.attributes?.map(attr => attr.name?.[selectedLanguages[0]] || attr.id || '') || []
        }
        onImageUpload(itemForDropdown, imagesToUpload);
    }, [itemData, onImageUpload, selectedLanguages]); // Dependencies for useCallback

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
        dispatch(startLoader("retrying translations"))
        try {
            const sourceLangCode = getCanonicalProjectSourceLanguage(projectData.languages);
            const sourceLang = GlobalLanguagesList.find(lang => lang.code === sourceLangCode);
            const targetLang = GlobalLanguagesList.find(lang => lang.code === language);
            const { updatedItem, message: resultMessage, messageType } = await translateItem(projectData, fileData, targetLang, sourceLang, AI_ACTIONS_TYPES.ITEM_TRANSLATION, itemData);
            setItemData(updatedItem);
            if (messageType && resultMessage) {
                antdMessage[messageType as 'success' | 'error' | 'warning'](resultMessage);
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                antdMessage.info('Get more enhancements to continue. Visit Billing to add an enhancement pack.');
            } else {
                antdMessage.error('Translation failed');
                console.error('Translation failed:', error);
            }
        } finally {
            dispatch(stopLoader("retrying translations"))
        }
    }, [dispatch, projectData, fileData, itemData, setItemData]);

    const handleAddAttribute = useCallback(() => {
        const itemCopy = removeObjRef(itemData);
        let sequenceId = 1;

        if (!itemCopy.attributes.length) {
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
        const itemCopy = removeObjRef(itemData);
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
        const InputComponent = isDescription ? Input.TextArea : Input;
        const props = isDescription ? { autoSize: { minRows: 2, maxRows: 6 }, showCount: true } : {};

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
        if (isFieldLocked('description')) {
            antdMessage.info('Description changes are not enabled for this store.');
            return;
        }

        dispatch(startLoader("generating_content"));
        try {
            const sourceLanguage = GlobalLanguagesList.find(
                (gl) => gl.code === getCanonicalProjectSourceLanguage(projectData.languages),
            );
            const targetLanguages = projectData.languages.map(lang => GlobalLanguagesList.find(gl => gl.code === lang));

            // Validate if item name is present in the source language
            if (!itemData.name[sourceLanguage.code]) {
                antdMessage.error(`Item name in ${sourceLanguage.name} is required to generate ${contentActionCopy.validation}.`);
                return;
            }

            const payload: NewItemMetadataAPIParams = {
                item: {
                    id: itemData.id,
                    name: itemData.name[sourceLanguage.code],
                    category: itemData.category,
                    description: itemData.description?.[sourceLanguage.code] || '',
                    attributes: (itemData.attributes || []).map(attr => ({
                        id: attr.id,
                        name: attr.name?.[sourceLanguage.code],
                        price: attr.price
                    }))
                },
                targetLang: targetLanguages as any,
                sourceLang: sourceLanguage as any,
                projectId: projectData.projectId,
                fileId: fileData.uid,
                contentLength: getProjectDescriptionContentLength(projectData, storeDetails.businessType),
                tone: getProjectDescriptionTone(projectData, storeDetails.businessType),
                businessType: storeDetails.businessType
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
                console.error("Error generating content:", error);
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

        // Translation drift protection: if primary language text changed,
        // clear stale translations so they get retranslated instead of showing wrong data
        let finalItem = itemData;
        if (modalData.status === 'edit' && modalData.item && projectData.languages?.length > 1) {
            const primaryLang = projectData.languages[0];
            finalItem = clearStaleTranslations(modalData.item, itemData, primaryLang, projectData.languages);
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
                />
            )
        })) : [];

        items.push({
            key: 'Images',
            label: 'Images',
            children: (
                <Flex vertical gap={16}>
                    <UploadedImagesList disabled={isFieldLocked('images')} item={itemData} onProjectDataUpdate={onProjectDataUpdate} projectData={projectData} onUploadGeneratedImage={onUploadGeneratedImage} />
                    <Button disabled={isFieldLocked('images')} type="dashed" icon={<LuPlus />} onClick={() => openAddImageModal(itemData)} style={{ width: '100%' }}>Add Image</Button>
                </Flex>
            )
        });
        return items;
    }, [itemData, selectedLanguages, categoriesList, renderEditableContent, handleRetryTranslation, handleAddAttribute, handleDeleteAttribute, setItemData, projectData, onProjectDataUpdate, onUploadGeneratedImage, isFieldLocked, openAddImageModal]);

    return (
        <Modal
            title={modalData.status == 'edit' ? `Edit Item: ${itemData?.name?.[selectedLanguages[0]] || ''}` : "Add Item"}
            open={Boolean(modalData.active)}
            onCancel={onClose}
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
                        <Button icon={<LuX />} onClick={onClose}>Cancel</Button>
                        <AIButtonIcon type="default" icon={<LuSparkles />} onClick={onGenerateContent} label={contentActionCopy.label} />
                        <Button type="primary" icon={<LuCheck />} onClick={onSave} >Save</Button>
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {contentActionCopy.helper}
                    </Text>
                </Flex>
            </>}
            width={600}
        >
            {itemData ? (
                <Flex vertical gap={16}>
                    <Flex gap={24} wrap="wrap">
                        {/* Active toggle - show/hide item from menu */}
                        <Flex align='center' gap={8}>
                            <Text onClick={() => setItemData(prev => ({ ...prev!, active: !Boolean(prev?.active) }))} style={{ cursor: 'pointer' }}>Show on Menu</Text>
                            <Switch
                                size='small'
                                checked={Boolean(itemData?.active)}
                                onChange={(e) => setItemData(prev => ({ ...prev!, active: e }))}
                            />
                        </Flex>
                        {/* Availability toggle - dynamic labels based on business type */}
                        <Flex align='center' gap={8}>
                            <Text
                                onClick={() => setItemData(prev => ({ ...prev!, available: prev?.available === false ? true : false }))}
                                style={{ cursor: 'pointer', color: itemData?.available === false ? '#ef4444' : undefined }}
                            >
                                {itemData?.available === false ? availabilityLabels.unavailable : availabilityLabels.available}
                            </Text>
                            <Switch
                                size='small'
                                checked={itemData?.available !== false}
                                onChange={(e) => setItemData(prev => ({ ...prev!, available: e }))}
                            />
                        </Flex>
                        {/* Best Seller toggle - mark as store bestseller (FR-5 allowed override) */}
                        <Tooltip title="Mark this item as a bestseller at your store. Bestsellers may be highlighted in menus.">
                            <Flex align='center' gap={8}>
                                <Text
                                    onClick={() => setItemData(prev => ({ ...prev!, isBestSeller: !Boolean(prev?.isBestSeller) }))}
                                    style={{ cursor: 'pointer', color: itemData?.isBestSeller ? '#f59e0b' : undefined }}
                                >
                                    {itemData?.isBestSeller ? '⭐ Best Seller' : 'Best Seller'}
                                </Text>
                                <Switch
                                    size='small'
                                    checked={Boolean(itemData?.isBestSeller)}
                                    onChange={(e) => setItemData(prev => ({ ...prev!, isBestSeller: e }))}
                                />
                            </Flex>
                        </Tooltip>
                    </Flex>

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
                                            min={-20}
                                            max={20}
                                            value={itemData?.ownerBoost || 0}
                                            onChange={(value) => setItemData(prev => ({ ...prev!, ownerBoost: value }))}
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
                                                            <InputNumber size="small" placeholder="Calories" value={nutritionInfo?.calories}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), calories: v ?? undefined }))}
                                                                addonAfter="kcal" style={{ width: 130 }} min={0} />
                                                            <InputNumber size="small" placeholder="Protein" value={nutritionInfo?.protein}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), protein: v ?? undefined }))}
                                                                addonAfter="g" style={{ width: 110 }} min={0} />
                                                            <InputNumber size="small" placeholder="Carbs" value={nutritionInfo?.carbs}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), carbs: v ?? undefined }))}
                                                                addonAfter="g" style={{ width: 110 }} min={0} />
                                                            <InputNumber size="small" placeholder="Fat" value={nutritionInfo?.fat}
                                                                onChange={(v) => setItemData(prev => setDecisionFactValue(prev!, 'nutritionInfo', { ...(getDecisionFactValue(prev, 'nutritionInfo') as ExtractedDataItem['nutritionInfo'] | undefined), fat: v ?? undefined }))}
                                                                addonAfter="g" style={{ width: 110 }} min={0} />
                                                            <Input size="small" placeholder="Serving size" value={nutritionInfo?.servingSize}
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

                    {projectData.languages.length > 1 ? (
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
                                />
                                <Flex vertical gap={16}>
                                    <Text strong>Images</Text>
                                    <UploadedImagesList disabled={isFieldLocked('images')} item={itemData} onProjectDataUpdate={onProjectDataUpdate} projectData={projectData} onUploadGeneratedImage={onUploadGeneratedImage} />
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
                            onClick={() => onPreviewFile(fileData)}
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
