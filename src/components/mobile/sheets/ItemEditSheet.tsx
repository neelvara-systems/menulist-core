'use client'

import type { UploadFile, UploadProps } from 'antd';
import { useMemo, useState } from 'react';
import { LuCamera } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Image, Input, Picker, Popup, Switch, Text, TextArea, Title, Toast, Upload } from '../antd';
import type { MobileMenuItemType } from '../types';

interface ItemEditSheetProps {
    item: MobileMenuItemType;
    categories: { id: string; name: string }[];
    currencySymbol: string;
    onClose: () => void;
    onSave: (updatedItem: Partial<MobileMenuItemType>) => void;
    onDelete?: (itemId: string) => void;
}

export default function ItemEditSheet({ item, categories, currencySymbol, onClose, onSave, onDelete }: ItemEditSheetProps) {
    const [name, setName] = useState(item.name);
    const [price, setPrice] = useState(String(item.price));
    const [description, setDescription] = useState(item.description || '');
    const [isAvailable, setIsAvailable] = useState(item.available);
    const [isActive, setIsActive] = useState(item.active);
    const [imagePreview, setImagePreview] = useState<string | null>(item.image || null);
    const [selectedCategory, setSelectedCategory] = useState(item.categoryId || categories[0]?.id || '');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const uploadProps: UploadProps = useMemo(() => ({
        accept: 'image/*',
        beforeUpload: (file) => {
            if (file.size > 5 * 1024 * 1024) {
                Toast.show({ content: 'Image must be under 5MB', duration: 2000 });
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
    }), [imagePreview, item.id, item.name]);

    const handleSave = () => {
        onSave({
            name: name.trim(),
            price: parseFloat(price) || 0,
            description: description.trim(),
            available: isAvailable,
            active: isActive,
            categoryId: selectedCategory,
            image: imagePreview || undefined,
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
                <Title level={4} style={{ margin: 0 }}>
                    Edit Item
                </Title>

                <Card size="small">
                    <Flex gap={16} vertical>
                        <Flex gap={6} vertical>
                            <Text strong>Item Name</Text>
                            <Input
                                onChange={setName}
                                placeholder="Item name"
                                value={name}
                            />
                        </Flex>

                        <Flex gap={6} vertical>
                            <Text strong>{`Price (${currencySymbol})`}</Text>
                            <Input
                                onChange={setPrice}
                                placeholder="0"
                                type="number"
                                value={price}
                            />
                        </Flex>

                        {categories.length > 0 ? (
                            <Flex gap={6} vertical>
                                <Text strong>Category</Text>
                                <Button block fill="outline" onClick={() => setShowCategoryPicker(true)} style={{ justifyContent: 'flex-start' }}>
                                    {categories.find((category) => category.id === selectedCategory)?.name || 'Select category'}
                                </Button>
                                <Picker
                                    columns={[categories.map((category) => ({ label: category.name, value: category.id }))]}
                                    onClose={() => setShowCategoryPicker(false)}
                                    onConfirm={(value) => { if (value[0]) setSelectedCategory(value[0] as string); }}
                                    value={[selectedCategory]}
                                    visible={showCategoryPicker}
                                />
                            </Flex>
                        ) : null}

                        <Flex gap={6} vertical>
                            <Text strong>Item Image</Text>
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
                                            <Text>{imagePreview ? 'Change Photo' : 'Add Photo'}</Text>
                                        </Flex>
                                    </Button>
                                </Upload>
                            </Flex>
                        </Flex>

                        <Flex gap={6} vertical>
                            <Text strong>Description</Text>
                            <TextArea
                                maxLength={200}
                                onChange={setDescription}
                                placeholder="Item description"
                                rows={3}
                                showCount
                                value={description}
                            />
                        </Flex>

                        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>Available</Text>
                                    <Text type="secondary">Turn this off when the item is sold out.</Text>
                                </Flex>
                                <Switch checked={isAvailable} onChange={setIsAvailable} />
                            </Flex>
                        </Card>

                        <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>Show on menu</Text>
                                    <Text type="secondary">Hide this item from customers.</Text>
                                </Flex>
                                <Switch checked={isActive} onChange={setIsActive} />
                            </Flex>
                        </Card>
                    </Flex>
                </Card>

                <Flex gap={12}>
                    <Button block fill="outline" onClick={onClose} size="large">
                        Cancel
                    </Button>
                    <Button block color="primary" disabled={!name.trim()} onClick={handleSave} size="large">
                        Save
                    </Button>
                </Flex>

                {onDelete ? (
                    <Button
                        block
                        color="danger"
                        fill="outline"
                        onClick={() => {
                            Dialog.confirm({
                                title: 'Delete Item',
                                content: `Are you sure you want to delete "${item.name}"?`,
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                onConfirm: () => onDelete(item.id),
                            });
                        }}
                        size="large"
                    >
                        Delete This Item
                    </Button>
                ) : null}
            </Flex>
        </Popup>
    );
}
