'use client'

import { useState } from 'react';
import { Popup, Input, TextArea, Button, Picker } from 'antd-mobile';

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

    const categoryColumns = [
        categories.map((cat) => ({ label: cat, value: cat })),
    ];

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            price: parseFloat(price) || 0,
            category: selectedCategory,
            description: description.trim(),
        });
    };

    return (
        <Popup
            visible
            onMaskClick={onClose}
            position="bottom"
            bodyStyle={{
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                maxHeight: '85vh',
            }}
            destroyOnClose
        >
            <div className="px-4 pt-4 pb-6 space-y-4">
                {/* Drag Handle */}
                <div className="flex justify-center">
                    <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>

                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Add Item
                </h2>

                {/* Name */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Item Name
                    </label>
                    <Input
                        value={name}
                        onChange={setName}
                        placeholder="Item name"
                        autoFocus
                        style={{ '--font-size': '15px' } as React.CSSProperties}
                    />
                </div>

                {/* Price */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Price ({currencySymbol})
                    </label>
                    <Input
                        value={price}
                        onChange={setPrice}
                        placeholder="0"
                        type="number"
                        style={{ '--font-size': '15px' } as React.CSSProperties}
                    />
                </div>

                {/* Category */}
                {categories.length > 0 && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Category
                        </label>
                        <div
                            className="py-2 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-[15px] text-gray-900 dark:text-gray-100"
                            onClick={() => setShowCategoryPicker(true)}
                        >
                            {selectedCategory || 'Select category'}
                        </div>
                        <Picker
                            columns={categoryColumns}
                            visible={showCategoryPicker}
                            onClose={() => setShowCategoryPicker(false)}
                            onConfirm={(val) => {
                                if (val[0]) setSelectedCategory(val[0] as string);
                            }}
                            value={[selectedCategory]}
                        />
                    </div>
                )}

                {/* Description */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Description (optional)
                    </label>
                    <TextArea
                        value={description}
                        onChange={setDescription}
                        placeholder="Item description"
                        rows={2}
                        maxLength={200}
                        showCount
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        block
                        fill="outline"
                        size="large"
                        onClick={onClose}
                        style={{ minHeight: '44px' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        block
                        color="primary"
                        fill="solid"
                        size="large"
                        onClick={handleSave}
                        disabled={!name.trim()}
                        style={{ minHeight: '44px' }}
                    >
                        Add Item
                    </Button>
                </div>
            </div>
        </Popup>
    );
}
