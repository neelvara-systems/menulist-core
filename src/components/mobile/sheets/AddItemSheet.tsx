'use client'

import { useState } from 'react';
import { Button, Card, Flex, Input, Picker, Popup, Text, TextArea, Title } from '../antd';

interface AddItemSheetProps {
    currencySymbol: string;
    categories: { id: string; name: string }[];
    onClose: () => void;
    onSave: (newItem: { name: string; price: number; categoryId: string | null; categoryName: string; description: string }) => void;
}

export default function AddItemSheet({ currencySymbol, categories, onClose, onSave }: AddItemSheetProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    const handleSave = () => {
        if (!name.trim()) return;
        const chosenCategory = categories.find((category) => category.id === selectedCategory);
        const categoryName = newCategory.trim() || chosenCategory?.name || 'Uncategorized';
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
                <Title level={4} style={{ margin: 0 }}>Add item</Title>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">Item Name</Text>
                        <Input autoFocus onChange={setName} placeholder="Item name" value={name} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">Price ({currencySymbol})</Text>
                        <Input onChange={setPrice} placeholder="0" type="number" value={price} />
                    </Flex>
                </Card>

                {categories.length > 0 ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text type="secondary">Category</Text>
                            <Button block fill="outline" onClick={() => setShowCategoryPicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
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
                    </Card>
                ) : null}

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">New Category (optional)</Text>
                        <Input onChange={setNewCategory} placeholder="Add a new category" value={newCategory} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">Description (optional)</Text>
                        <TextArea maxLength={200} onChange={setDescription} placeholder="Item description" rows={2} showCount value={description} />
                    </Flex>
                </Card>

                <Flex gap={8}>
                    <Button block fill="outline" onClick={onClose} size="large">Cancel</Button>
                    <Button block disabled={!name.trim()} onClick={handleSave} size="large">Add item</Button>
                </Flex>
            </Flex>
        </Popup>
    );
}
