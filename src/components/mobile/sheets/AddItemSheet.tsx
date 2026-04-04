'use client'

import { useState } from 'react';
import { Button, Card, Flex, Input, Picker, Popup, Text, TextArea, Title } from '../antd';
import { useTranslations } from 'next-intl';

interface AddItemSheetProps {
    currencySymbol: string;
    categories: { id: string; name: string }[];
    onClose: () => void;
    onSave: (newItem: { name: string; price: number; categoryId: string | null; categoryName: string; description: string }) => void;
}

export default function AddItemSheet({ currencySymbol, categories, onClose, onSave }: AddItemSheetProps) {
    const t = useTranslations('MobileMenu');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    const handleSave = () => {
        if (!name.trim()) return;
        const chosenCategory = categories.find((category) => category.id === selectedCategory);
        const categoryName = newCategory.trim() || chosenCategory?.name || t('uncategorized');
        onSave({
            categoryId: newCategory.trim() ? null : (selectedCategory || null),
            categoryName,
            description: description.trim(),
            name: name.trim(),
            price: parseFloat(price) || 0,
        });
    };

    return (
        <Popup bodyStyle={{ maxHeight: '85vh' }} destroyOnClose onMaskClick={onClose} visible>
            <Flex gap={12} vertical>
                <Title level={4} style={{ margin: 0 }}>{t('addItemTitle')}</Title>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{t('itemNameLabel')}</Text>
                        <Input autoFocus onChange={setName} placeholder={t('itemNamePlaceholder')} value={name} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{t('priceLabel', { currency: currencySymbol })}</Text>
                        <Input onChange={setPrice} placeholder={t('pricePlaceholder')} type="number" value={price} />
                    </Flex>
                </Card>

                {categories.length > 0 ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text type="secondary">{t('categoryLabel')}</Text>
                            <Button block fill="outline" onClick={() => setShowCategoryPicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                                {categories.find((category) => category.id === selectedCategory)?.name || t('selectCategory')}
                            </Button>
                            <Picker
                                columns={[categories.map((category) => ({ label: category.name, value: category.id }))]}
                                onClose={() => setShowCategoryPicker(false)}
                                onConfirm={(value) => { if (value[0]) setSelectedCategory(value[0] as string); }}
                                value={[selectedCategory]}
                                visible={showCategoryPicker}
                            />
                        </Flex>
                    </Card>
                ) : null}

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{t('newCategoryLabel')}</Text>
                        <Input onChange={setNewCategory} placeholder={t('newCategoryPlaceholder')} value={newCategory} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{t('descriptionOptionalLabel')}</Text>
                        <TextArea maxLength={200} onChange={setDescription} placeholder={t('descriptionPlaceholder')} rows={2} showCount value={description} />
                    </Flex>
                </Card>

                <Flex gap={8}>
                    <Button block fill="outline" onClick={onClose} size="large">{t('cancel')}</Button>
                    <Button block disabled={!name.trim()} onClick={handleSave} size="large">{t('addItem')}</Button>
                </Flex>
            </Flex>
        </Popup>
    );
}
