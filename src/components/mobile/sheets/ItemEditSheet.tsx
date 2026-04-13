'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { getOwnerLabels } from '@config/businessLabels';
import { AICapacityError } from '@services/ai/capacityError';
import { useAppDispatch } from '@hook/useAppDispatch';
import getNewItemMetadataViaAPI from '@services/ai/dataGeneration/getNewItemMetadataViaAPI';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { theme, type UploadFile, type UploadProps } from 'antd';
import { useMemo, useState, useContext, useEffect } from 'react';
import { LuCamera, LuLanguages, LuPlus, LuSparkles, LuTrash2 } from 'react-icons/lu';
import type { Project, ProjectFileType, ExtractedDataAttribute, ExtractedDataItem } from '../../templates/main-app/projects/types';
import { translateItem } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Collapse, Dialog, Flex, Image, Input, NavBar, Popup, Select, Switch, Text, TextArea, Toast, Upload } from '../antd';
import type { MobileMenuItemType } from '../types';
import { useTranslations } from 'next-intl';

type LocalizedAttribute = ExtractedDataAttribute & {
    price: string;
};

interface ItemEditSheetProps {
    item?: MobileMenuItemType | null;
    categories: { id: string; name: string }[];
    currencySymbol: string;
    mode?: 'add' | 'edit';
    onClose: () => void;
    onGenerateImage?: () => void;
    onManageImages?: () => void;
    onSave: (updatedItem: Partial<MobileMenuItemType> & { categoryName?: string; image?: string | null; rawItem?: ExtractedDataItem }) => void | Promise<void>;
    onDelete?: (itemId: string) => void;
    projectData?: Project | null;
    selectedLanguages?: string[];
    sourceFile?: ProjectFileType | null;
}

function createDraftItem({
    item,
    languages,
}: {
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
        category: item?.rawItem?.category || item?.categoryId || '',
        description: item?.rawItem?.description
            ? { ...item.rawItem.description }
            : Object.fromEntries(languages.map((lang) => [lang, lang === primaryLanguage ? (item?.description || '') : ''])),
        id: item?.rawItem?.id || item?.id || `draft-item-${Date.now()}`,
        images: item?.rawItem?.images || undefined,
        name: item?.rawItem?.name
            ? { ...item.rawItem.name }
            : Object.fromEntries(languages.map((lang) => [lang, lang === primaryLanguage ? (item?.name || '') : ''])),
        price: item?.rawItem?.price !== undefined ? String(item.rawItem.price || '') : String(item?.price || ''),
    };
}

function getLocalizedValue(value: Record<string, string> | undefined, language: string): string {
    if (!value) return '';
    return value[language] || '';
}

export default function ItemEditSheet({
    item,
    categories,
    currencySymbol,
    mode = 'edit',
    onClose,
    onGenerateImage,
    onManageImages,
    onSave,
    onDelete,
    projectData,
    selectedLanguages = ['en'],
    sourceFile,
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
    const isAddMode = mode === 'add';
    const primaryLanguage = selectedLanguages[0] || 'en';
    const hasMultipleLanguages = selectedLanguages.length > 1;
    const [draftItem, setDraftItem] = useState<ExtractedDataItem>(() => createDraftItem({ item, languages: selectedLanguages }));
    const [imagePreview, setImagePreview] = useState<string | null>(item?.image || null);
    const [activeLanguageKey, setActiveLanguageKey] = useState<string[]>([primaryLanguage]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiWorking, setIsAiWorking] = useState(false);

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
        setDraftItem(createDraftItem({ item, languages: selectedLanguages }));
        setActiveLanguageKey([selectedLanguages[0] || 'en']);
    }, [item, selectedLanguages]);

    const itemImagePreviews = useMemo(() => {
        const images = (draftItem.images || [])
            .map((image) => image?.url)
            .filter((url): url is string => Boolean(url));

        if (imagePreview && !images.includes(imagePreview)) {
            return [imagePreview, ...images];
        }

        return images;
    }, [draftItem.images, imagePreview]);
    const imageActionLabel = itemImagePreviews.length > 0 ? t('editImages') : t('addImages');

    const uploadProps: UploadProps = useMemo(() => ({
        accept: 'image/*',
        beforeUpload: (file) => {
            if (file.size > 5 * 1024 * 1024) {
                Toast.show({ content: t('imageTooLarge'), duration: 2000 });
                return Upload.LIST_IGNORE;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            return false;
        },
        fileList: imagePreview
            ? [{ uid: item?.id || 'draft-item', name: `${item?.name || 'item'}.jpg`, status: 'done', url: imagePreview } as UploadFile]
            : [],
        listType: 'picture',
        maxCount: 1,
        onRemove: () => {
            setImagePreview(null);
            return true;
        },
        showUploadList: false,
    }), [imagePreview, item?.id, item?.name, t]);

    const updateLocalizedField = (language: string, field: 'name' | 'description', value: string) => {
        setDraftItem((previous) => ({
            ...previous,
            [field]: {
                ...(previous[field] || {}),
                [language]: value,
            },
        }));
    };

    const updateAttributeField = (attributeId: string, updates: Partial<LocalizedAttribute>) => {
        setDraftItem((previous) => ({
            ...previous,
            attributes: (previous.attributes || []).map((attribute) => (
                attribute.id === attributeId ? { ...attribute, ...updates } : attribute
            )),
        }));
    };

    const handleAddAttribute = () => {
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
        setDraftItem((previous) => ({
            ...previous,
            attributes: (previous.attributes || []).filter((attribute) => attribute.id !== attributeId),
        }));
    };

    const handleGenerateContent = async () => {
        if (isAiWorking || !projectData?.projectId || !sourceFile?.uid) return;

        const sourceLanguage = GlobalLanguagesList.find((language) => language.code === primaryLanguage);
        const targetLanguages = selectedLanguages
            .map((languageCode) => GlobalLanguagesList.find((language) => language.code === languageCode))
            .filter(Boolean);

        if (!sourceLanguage || targetLanguages.length === 0) return;

        if (!getLocalizedValue(draftItem.name, primaryLanguage).trim()) {
            Toast.show({ content: `Item name in ${sourceLanguage.name} is required to generate content.`, duration: 1800 });
            return;
        }

        setIsAiWorking(true);
        dispatch(startLoader('generating_content'));
        try {
            const result = await getNewItemMetadataViaAPI({
                businessType: storeDetails?.businessType,
                contentLength: 'Standard',
                fileId: sourceFile.uid,
                item: {
                    attributes: (draftItem.attributes || []).map((attribute) => ({
                        id: attribute.id,
                        name: getLocalizedValue(attribute.name, primaryLanguage),
                        price: attribute.price,
                    })),
                    category: draftItem.category,
                    description: getLocalizedValue(draftItem.description, primaryLanguage),
                    id: draftItem.id,
                    name: getLocalizedValue(draftItem.name, primaryLanguage),
                },
                projectId: projectData.projectId,
                sourceLang: sourceLanguage,
                targetLang: targetLanguages as any,
            });

            if (result) {
                setDraftItem((previous) => ({ ...previous, ...result }));
                Toast.show({ content: t('descriptionsUpdated'), duration: 1400 });
            }
        } catch (error) {
            if (error instanceof AICapacityError) {
                Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
            } else {
                Toast.show({ content: t('descriptionGenerationFailed'), duration: 2000 });
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

        const chosenCategory = categories.find((category) => category.id === draftItem.category);
        const categoryName = chosenCategory?.name || item?.categoryName || t('uncategorized');
        setIsSaving(true);

        try {
            await onSave({
                active: draftItem.active !== false,
                attributes: (draftItem.attributes || []).map((attribute) => ({
                    active: attribute.active !== false,
                    id: attribute.id,
                    name: getLocalizedValue(attribute.name, primaryLanguage),
                    price: parseFloat(String(attribute.price || 0)) || 0,
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
                    <Flex align="center" justify="space-between">
                        <Text strong>{languageLabel}</Text>
                        {!isAddMode && hasMultipleLanguages && languageCode !== primaryLanguage ? (
                            <Button
                                disabled={isAiWorking || isSaving}
                                fill="outline"
                                onClick={() => { void handleRetryTranslation(languageCode); }}
                                size="small"
                            >
                                <Flex align="center" gap={6}>
                                    <LuLanguages size={14} />
                                    <Text>{t('refreshAiText')}</Text>
                                </Flex>
                            </Button>
                        ) : null}
                    </Flex>

                    <Flex gap={6} vertical>
                        <Text strong>{t('itemNameLabel')}</Text>
                        <Input
                            autoFocus={isAddMode && languageCode === primaryLanguage}
                            onChange={(value) => updateLocalizedField(languageCode, 'name', value)}
                            placeholder={t('itemNamePlaceholder')}
                            value={getLocalizedValue(draftItem.name, languageCode)}
                        />
                    </Flex>

                    <Flex gap={6} vertical>
                        <Text strong>{t('descriptionLabel')}</Text>
                        <TextArea
                            maxLength={200}
                            onChange={(value) => updateLocalizedField(languageCode, 'description', value)}
                            placeholder={t('descriptionPlaceholder')}
                            rows={3}
                            showCount
                            value={getLocalizedValue(draftItem.description, languageCode)}
                        />
                    </Flex>

                    <Flex gap={10} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex gap={2} vertical>
                                <Text strong>{t('variantsAddOns')}</Text>
                                <Text type="secondary">{t('variantsAddOnsDesc')}</Text>
                            </Flex>
                            <Button disabled={isSaving} fill="outline" onClick={handleAddAttribute} size="small">
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
                                                    disabled={isSaving}
                                                    fill="none"
                                                    onClick={() => handleRemoveAttribute(attribute.id)}
                                                    size="small"
                                                >
                                                    <LuTrash2 size={14} />
                                                </Button>
                                            </Flex>
                                            <Input
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
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh', padding: 0 }}
            destroyOnClose
            onMaskClick={() => {
                if (!isSaving) onClose();
            }}
            position="bottom"
            visible
        >
            <Flex style={{ maxHeight: '85vh', overflowY: 'auto' }} vertical>
                <NavBar onBack={() => {
                    if (!isSaving) onClose();
                }}>
                    {isAddMode ? t('addItemTitle') : t('editItemTitle')}
                </NavBar>

                <Flex gap={16} style={{ padding: '12px 12px 12px' }} vertical>
                    <Card size="small" style={sectionCardStyle}>
                        <Flex gap={16} vertical>
                            {categories.length > 0 ? (
                                <Flex gap={6} vertical>
                                    <Text strong>{t('categoryLabel')}</Text>
                                    <Select
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
                                    {isAddMode || !onManageImages ? (
                                        <Upload {...uploadProps}>
                                            <Button fill="outline" size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuCamera size={14} />
                                                    <Text>{imageActionLabel}</Text>
                                                </Flex>
                                            </Button>
                                        </Upload>
                                    ) : (
                                        <Flex gap={8} wrap="wrap">
                                            <Button fill="outline" onClick={onManageImages} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuCamera size={14} />
                                                    <Text>{imageActionLabel}</Text>
                                                </Flex>
                                            </Button>
                                            <Button fill="outline" onClick={onGenerateImage || onManageImages} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuSparkles size={14} />
                                                    <Text>{t('generateImage')}</Text>
                                                </Flex>
                                            </Button>
                                        </Flex>
                                    )}
                                </Flex>
                            </Flex>

                            {!(draftItem.attributes || []).length ? (
                                <Flex gap={6} vertical>
                                    <Text strong>{t('priceLabel', { currency: currencySymbol })}</Text>
                                    <Input
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
                                    <Switch checked={draftItem.available !== false} onChange={(checked) => setDraftItem((previous) => ({ ...previous, available: checked }))} />
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

                    {(projectData && sourceFile) ? (
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
                                <Text>{isAddMode ? t('generateDescriptionsAi') : t('refreshAiText')}</Text>
                            </Flex>
                        </Button>
                    ) : null}

                    <Flex gap={12}>
                        <Button block disabled={isSaving} fill="outline" onClick={onClose} size="large">
                            {t('cancel')}
                        </Button>
                        <Button
                            block
                            color="primary"
                            disabled={!getLocalizedValue(draftItem.name, primaryLanguage).trim() || isSaving}
                            loading={isSaving}
                            onClick={() => {
                                void handleSave();
                            }}
                            size="large"
                        >
                            {isAddMode ? t('addItem') : t('save')}
                        </Button>
                    </Flex>

                    {!isAddMode && onDelete && item?.id ? (
                        <Button
                            block
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
                        >
                            {t('deleteItemAction')}
                        </Button>
                    ) : null}
                </Flex>
            </Flex>
        </Popup>
    );
}
