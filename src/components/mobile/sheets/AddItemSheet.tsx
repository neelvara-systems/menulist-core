'use client'

import { useState } from 'react';
import { Button, Card, Flex, Input, Picker, Popup, Text, TextArea, Title } from '../antd';

interface AddItemSheetProps {
    currencySymbol: string;
    categories: string[];
    onClose: () => void;
    onSave: (newItem: { name: string; price: number; category: string; description: string }) => void;
}

export default function AddItemSheet({ currencySymbol, categories, onClose, onSave }: AddItemSheetProps) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categories[0] || '');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            category: selectedCategory,
            description: description.trim(),
            name: name.trim(),
            price: parseFloat(price) || 0,
        });
    };

    return (
        <Popup bodyStyle={{ maxHeight: '85vh' }} destroyOnClose onMaskClick={onClose} visible>
            <Flex gap={12} vertical>
                <Title level={4} style={{ margin: 0 }}>Add Item</Title>

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
                                {selectedCategory || 'Select category'}
                            </Button>
                            <Picker
                                columns={[categories.map((category) => ({ label: category, value: category }))]}
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
                        <Text type="secondary">Description (optional)</Text>
                        <TextArea maxLength={200} onChange={setDescription} placeholder="Item description" rows={2} showCount value={description} />
                    </Flex>
                </Card>

                <Flex gap={8}>
                    <Button block fill="outline" onClick={onClose} size="large">Cancel</Button>
                    <Button block disabled={!name.trim()} onClick={handleSave} size="large">Add Item</Button>
                </Flex>
            </Flex>
        </Popup>
    );
}
