'use client'

import { getOwnerLabels } from '@config/businessLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme, type UploadFile, type UploadProps } from 'antd';
import { useMemo, useState, useContext, useEffect } from 'react';
import { LuCamera, LuLanguages, LuPlus, LuSparkles, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Image, Input, NavBar, Popup, Select, Switch, Text, TextArea, Toast, Upload } from '../antd';
import type { MobileMenuItemType } from '../types';
import { useTranslations } from 'next-intl';

interface ItemEditSheetProps {
    item?: MobileMenuItemType | null;
    categories: { id: string; name: string }[];
    currencySymbol: string;
    mode?: 'add' | 'edit';
    onClose: () => void;
    onGenerateDescriptions?: () => void;
    onManageLanguages?: () => void;
    onManageImages?: () => void;
    onSave: (updatedItem: Partial<MobileMenuItemType> & { categoryName?: string; image?: string | null }) => void | Promise<void>;
    onDelete?: (itemId: string) => void;
}

export default function ItemEditSheet({
    item,
    categories,
    currencySymbol,
    mode = 'edit',
    onClose,
    onGenerateDescriptions,
    onManageLanguages,
    onManageImages,
    onSave,
    onDelete,
}: ItemEditSheetProps) {
    const t = useTranslations('MobileMenu');
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
    const [name, setName] = useState(item?.name || '');
    const [price, setPrice] = useState(item ? String(item.price) : '');
    const [description, setDescription] = useState(item?.description || '');
    const [isAvailable, setIsAvailable] = useState(item?.available ?? true);
    const [isActive, setIsActive] = useState(item?.active ?? true);
    const [imagePreview, setImagePreview] = useState<string | null>(item?.image || null);
    const [selectedCategory, setSelectedCategory] = useState(item?.categoryId || categories[0]?.id || '');
    const [attributes, setAttributes] = useState(item?.attributes || []);
    const [isSaving, setIsSaving] = useState(false);

    const collapseKeyboard = () => {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLElement) {
            activeElement.blur();
        }
    };

    useEffect(() => {
        setImagePreview(item?.image || null);
    }, [item?.image]);

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

    const handleSave = async () => {
        if (isSaving || !name.trim()) return;

        const chosenCategory = categories.find((category) => category.id === selectedCategory);
        const categoryName = chosenCategory?.name || item?.categoryName || t('uncategorized');
        setIsSaving(true);

        try {
            await onSave({
                name: name.trim(),
                price: parseFloat(price) || 0,
                description: description.trim(),
                available: isAvailable,
                active: isActive,
                categoryId: selectedCategory || undefined,
                categoryName,
                image: isAddMode || !onManageImages
                    ? imagePreview || (item?.image ? null : undefined)
                    : undefined,
                attributes,
            });
        } finally {
            setIsSaving(false);
        }
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
                        <Flex gap={6} vertical>
                            <Text strong>{t('itemNameLabel')}</Text>
                            <Input
                                autoFocus={isAddMode}
                                onChange={setName}
                                placeholder={t('itemNamePlaceholder')}
                                value={name}
                            />
                        </Flex>

                        <Flex gap={6} vertical>
                            <Text strong>{t('priceLabel', { currency: currencySymbol })}</Text>
                            <Input
                                onChange={setPrice}
                                placeholder={t('pricePlaceholder')}
                                type="number"
                                value={price}
                            />
                        </Flex>

                        {categories.length > 0 ? (
                            <Flex gap={6} vertical>
                                <Text strong>{t('categoryLabel')}</Text>
                                <Select
                                    onChange={(value) => {
                                        setSelectedCategory(value);
                                        collapseKeyboard();
                                    }}
                                    options={categories.map((category) => ({ label: category.name, value: category.id }))}
                                    placeholder={t('selectCategory')}
                                    value={selectedCategory || undefined}
                                />
                            </Flex>
                        ) : null}

                        <Flex gap={6} vertical>
                            <Text strong>{t('itemImageLabel')}</Text>
                            <Flex align="center" gap={12}>
                                {imagePreview ? (
                                    <Image
                                        height={64}
                                        preview={false}
                                        src={imagePreview}
                                        style={{ borderRadius: 8, objectFit: 'cover', width: 64 }}
                                        width={64}
                                    />
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
                                                <Text>{imagePreview ? t('changePhoto') : t('addPhoto')}</Text>
                                            </Flex>
                                        </Button>
                                    </Upload>
                                ) : (
                                    <Button fill="outline" onClick={onManageImages} size="small">
                                        <Flex align="center" gap={6}>
                                            <LuCamera size={14} />
                                            <Text>{imagePreview ? t('changePhoto') : t('addPhoto')}</Text>
                                        </Flex>
                                    </Button>
                                )}
                            </Flex>
                        </Flex>

                        <Flex gap={6} vertical>
                            <Text strong>{t('descriptionLabel')}</Text>
                            <TextArea
                                maxLength={200}
                                onChange={setDescription}
                                placeholder={t('descriptionPlaceholder')}
                                rows={3}
                                showCount
                                value={description}
                            />
                        </Flex>

                        {!isAddMode && (onManageImages || onGenerateDescriptions || onManageLanguages) ? (
                            <Flex gap={10} vertical>
                                <Flex gap={2} vertical>
                                    <Text strong>{t('aiToolsTitle')}</Text>
                                    <Text type="secondary">{t('aiToolsDesc')}</Text>
                                </Flex>
                                <Flex gap={8} wrap="wrap">
                                    {onManageImages ? (
                                        <Button fill="outline" onClick={onManageImages} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuCamera size={14} />
                                                <Text>{t('addImages')}</Text>
                                            </Flex>
                                        </Button>
                                    ) : null}
                                    {onGenerateDescriptions ? (
                                        <Button fill="outline" onClick={onGenerateDescriptions} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuSparkles size={14} />
                                                <Text>{t('generateDescriptions')}</Text>
                                            </Flex>
                                        </Button>
                                    ) : null}
                                    {onManageLanguages ? (
                                        <Button fill="outline" onClick={onManageLanguages} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuLanguages size={14} />
                                                <Text>{t('manageLanguages')}</Text>
                                            </Flex>
                                        </Button>
                                    ) : null}
                                </Flex>
                            </Flex>
                        ) : null}

                        <Flex gap={10} vertical>
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>{t('variantsAddOns')}</Text>
                                    <Text type="secondary">{t('variantsAddOnsDesc')}</Text>
                                </Flex>
                                <Button
                                    disabled={isSaving}
                                    fill="outline"
                                    onClick={() => {
                                        if (isSaving) return;
                                        setAttributes((previous) => [
                                            ...previous,
                                            {
                                                id: `${item?.id || 'draft-item'}-attr-${Date.now()}`,
                                                name: '',
                                                price: 0,
                                                active: true,
                                            },
                                        ]);
                                    }}
                                    size="small"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuPlus size={14} />
                                        <Text>{t('add')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>

                            {attributes.length > 0 ? (
                                <Flex gap={8} vertical>
                                    {attributes.map((attribute, index) => (
                                        <Card key={attribute.id} size="small" style={{ borderRadius: 14 }}>
                                            <Flex gap={10} vertical>
                                                <Flex align="center" justify="space-between">
                                                    <Text strong>{t('optionNumber', { number: index + 1 })}</Text>
                                                    <Button
                                                        color="danger"
                                                        disabled={isSaving}
                                                        fill="none"
                                                        onClick={() => {
                                                            if (isSaving) return;
                                                            setAttributes((previous) => previous.filter((entry) => entry.id !== attribute.id));
                                                        }}
                                                        size="small"
                                                    >
                                                        <LuTrash2 size={14} />
                                                    </Button>
                                                </Flex>
                                                <Input
                                                    onChange={(value) => {
                                                        setAttributes((previous) => previous.map((entry) => (
                                                            entry.id === attribute.id ? { ...entry, name: value } : entry
                                                        )));
                                                    }}
                                                    placeholder={t('variantName')}
                                                    value={attribute.name}
                                                />
                                                <Flex align="center" gap={12}>
                                                    <Flex gap={6} style={{ flex: 1, minWidth: 0 }} vertical>
                                                        <Text type="secondary">{t('variantPrice')}</Text>
                                                        <Input
                                                            onChange={(value) => {
                                                                setAttributes((previous) => previous.map((entry) => (
                                                                    entry.id === attribute.id ? { ...entry, price: parseFloat(value) || 0 } : entry
                                                                )));
                                                            }}
                                                            placeholder={t('variantPrice')}
                                                            type="number"
                                                            value={String(attribute.price || '')}
                                                        />
                                                    </Flex>
                                                    <div style={{ ...inlineSurfaceStyle, flexShrink: 0, minWidth: 122, padding: '10px 12px' }}>
                                                        <Flex align="center" justify="space-between">
                                                            <Flex gap={2} vertical>
                                                                <Text style={{ fontSize: 12 }} type="secondary">{t('availableToOrder')}</Text>
                                                            </Flex>
                                                            <Switch
                                                                checked={attribute.active !== false}
                                                                onChange={(checked) => {
                                                                    setAttributes((previous) => previous.map((entry) => (
                                                                        entry.id === attribute.id ? { ...entry, active: checked } : entry
                                                                    )));
                                                                }}
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

                            <div style={inlineSurfaceStyle}>
                                <Flex align="center" justify="space-between">
                                    <Flex gap={2} vertical>
                                        <Text strong>{availabilityLabels.available}</Text>
                                        <Text type="secondary">{t('availableHelp')}</Text>
                                    </Flex>
                                    <Switch checked={isAvailable} onChange={setIsAvailable} />
                                </Flex>
                            </div>

                            <div style={inlineSurfaceStyle}>
                                <Flex align="center" justify="space-between">
                                    <Flex gap={2} vertical>
                                        <Text strong>{t('showOnMenu')}</Text>
                                        <Text type="secondary">{t('showOnMenuHelp')}</Text>
                                    </Flex>
                                    <Switch checked={isActive} onChange={setIsActive} />
                                </Flex>
                            </div>
                        </Flex>
                    </Card>

                    <Flex gap={12}>
                        <Button block disabled={isSaving} fill="outline" onClick={onClose} size="large">
                            {t('cancel')}
                        </Button>
                        <Button
                            block
                            color="primary"
                            disabled={!name.trim() || isSaving}
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
