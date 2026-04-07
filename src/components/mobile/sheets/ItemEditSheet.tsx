'use client'

import { getOwnerLabels } from '@config/businessLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme, type UploadFile, type UploadProps } from 'antd';
import { useMemo, useState, useContext } from 'react';
import { LuCamera, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Image, Input, NavBar, Popup, Select, Switch, Text, TextArea, Toast, Upload } from '../antd';
import type { MobileMenuItemType } from '../types';
import { useTranslations } from 'next-intl';

interface ItemEditSheetProps {
    item: MobileMenuItemType;
    categories: { id: string; name: string }[];
    currencySymbol: string;
    onClose: () => void;
    onSave: (updatedItem: Partial<MobileMenuItemType>) => void;
    onDelete?: (itemId: string) => void;
}

export default function ItemEditSheet({ item, categories, currencySymbol, onClose, onSave, onDelete }: ItemEditSheetProps) {
    const t = useTranslations('MobileMenu');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const availabilityLabels = getOwnerLabels(storeDetails?.businessType);
    const [name, setName] = useState(item.name);
    const [price, setPrice] = useState(String(item.price));
    const [description, setDescription] = useState(item.description || '');
    const [isAvailable, setIsAvailable] = useState(item.available);
    const [isActive, setIsActive] = useState(item.active);
    const [imagePreview, setImagePreview] = useState<string | null>(item.image || null);
    const [selectedCategory, setSelectedCategory] = useState(item.categoryId || categories[0]?.id || '');
    const [attributes, setAttributes] = useState(item.attributes || []);

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
            ? [{ uid: item.id, name: `${item.name || 'item'}.jpg`, status: 'done', url: imagePreview } as UploadFile]
            : [],
        listType: 'picture',
        maxCount: 1,
        onRemove: () => {
            setImagePreview(null);
            return true;
        },
        showUploadList: false,
    }), [imagePreview, item.id, item.name, t]);

    const handleSave = () => {
        onSave({
            name: name.trim(),
            price: parseFloat(price) || 0,
            description: description.trim(),
            available: isAvailable,
            active: isActive,
            categoryId: selectedCategory,
            image: imagePreview || undefined,
            attributes,
        });
    };

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh' }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible
        >
            <Flex gap={16} vertical>
                <NavBar onBack={onClose}>{t('editItemTitle')}</NavBar>

                <Card size="small">
                    <Flex gap={16} vertical>
                        <Flex gap={6} vertical>
                            <Text strong>{t('itemNameLabel')}</Text>
                            <Input
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
                                    onChange={setSelectedCategory}
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
                                    <Card size="small" style={{ margin: 0 }}>
                                        <Flex align="center" justify="center" style={{ height: 48, width: 48 }}>
                                            <LuCamera color="#94a3b8" size={20} />
                                        </Flex>
                                    </Card>
                                )}
                                <Upload {...uploadProps}>
                                    <Button fill="outline" size="small">
                                        <Flex align="center" gap={6}>
                                            <LuCamera size={14} />
                                            <Text>{imagePreview ? t('changePhoto') : t('addPhoto')}</Text>
                                        </Flex>
                                    </Button>
                                </Upload>
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

                        <Flex gap={10} vertical>
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>{t('variantsAddOns')}</Text>
                                    <Text type="secondary">{t('variantsAddOnsDesc')}</Text>
                                </Flex>
                                <Button
                                    fill="outline"
                                    onClick={() => {
                                        setAttributes((previous) => [
                                            ...previous,
                                            {
                                                id: `${item.id}-attr-${Date.now()}`,
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
                                        <Card key={attribute.id} size="small">
                                            <Flex gap={10} vertical>
                                                <Flex align="center" justify="space-between">
                                                    <Text strong>{t('optionNumber', { number: index + 1 })}</Text>
                                                    <Button
                                                        color="danger"
                                                        fill="none"
                                                        onClick={() => setAttributes((previous) => previous.filter((entry) => entry.id !== attribute.id))}
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
                                                <Flex align="center" justify="space-between">
                                                    <Text type="secondary">{t('availableToOrder')}</Text>
                                                    <Switch
                                                        checked={attribute.active !== false}
                                                        onChange={(checked) => {
                                                            setAttributes((previous) => previous.map((entry) => (
                                                                entry.id === attribute.id ? { ...entry, active: checked } : entry
                                                            )));
                                                        }}
                                                    />
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    ))}
                                </Flex>
                            ) : (
                                <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                                    <Text type="secondary">{t('noVariantsAdded')}</Text>
                                </Card>
                            )}
                        </Flex>

                        <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>{availabilityLabels.available}</Text>
                                    <Text type="secondary">{t('availableHelp')}</Text>
                                </Flex>
                                <Switch checked={isAvailable} onChange={setIsAvailable} />
                            </Flex>
                        </Card>

                        <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>{t('showOnMenu')}</Text>
                                    <Text type="secondary">{t('showOnMenuHelp')}</Text>
                                </Flex>
                                <Switch checked={isActive} onChange={setIsActive} />
                            </Flex>
                        </Card>
                    </Flex>
                </Card>

                <Flex gap={12}>
                    <Button block fill="outline" onClick={onClose} size="large">
                        {t('cancel')}
                    </Button>
                    <Button block color="primary" disabled={!name.trim()} onClick={handleSave} size="large">
                        {t('save')}
                    </Button>
                </Flex>

                {onDelete ? (
                    <Button
                        block
                        color="danger"
                        fill="outline"
                        onClick={() => {
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
        </Popup>
    );
}
