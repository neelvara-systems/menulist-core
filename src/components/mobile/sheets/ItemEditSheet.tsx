'use client'

import { Button, Dialog, Input, Popup, Switch, TextArea, Toast } from 'antd-mobile';
import { useRef, useState } from 'react';
import { LuCamera } from 'react-icons/lu';
import type { MobileMenuItemType } from '../types';

interface ItemEditSheetProps {
    item: MobileMenuItemType;
    currencySymbol: string;
    onClose: () => void;
    onSave: (updatedItem: Partial<MobileMenuItemType>) => void;
    onDelete?: (itemId: string) => void;
}

export default function ItemEditSheet({ item, currencySymbol, onClose, onSave, onDelete }: ItemEditSheetProps) {
    const [name, setName] = useState(item.name);
    const [price, setPrice] = useState(String(item.price));
    const [description, setDescription] = useState(item.description || '');
    const [isAvailable, setIsAvailable] = useState(item.isAvailable);
    const [imagePreview, setImagePreview] = useState<string | null>(item.image || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            Toast.show({ content: 'Image must be under 5MB', duration: 2000 });
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        onSave({
            name: name.trim(),
            price: parseFloat(price) || 0,
            description: description.trim(),
            isAvailable,
            image: imagePreview || undefined,
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
                    Edit Item
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

                {/* Image — Camera capture for mobile */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Item Image
                    </label>
                    <div className="flex items-center gap-3">
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt={name}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <LuCamera size={20} className="text-gray-400" />
                            </div>
                        )}
                        <Button
                            size="small"
                            fill="outline"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ minHeight: '36px' }}
                        >
                            <LuCamera size={14} className="inline mr-1" />
                            {imagePreview ? 'Change' : 'Add Photo'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageCapture}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Description
                    </label>
                    <TextArea
                        value={description}
                        onChange={setDescription}
                        placeholder="Item description (optional)"
                        rows={2}
                        maxLength={200}
                        showCount
                    />
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between py-2">
                    <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">
                        Available
                    </span>
                    <Switch
                        checked={isAvailable}
                        onChange={setIsAvailable}
                        style={{ '--height': '26px', '--width': '44px' } as React.CSSProperties}
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
                        Save
                    </Button>
                </div>

                {/* Delete Button */}
                {onDelete && (
                    <button
                        onClick={() => {
                            Dialog.confirm({
                                title: 'Delete Item',
                                content: `Are you sure you want to delete "${item.name}"?`,
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                onConfirm: () => onDelete(item.id),
                            });
                        }}
                        className="w-full text-center text-red-500 text-sm font-medium py-3 active:bg-red-50 dark:active:bg-red-900/20 rounded-lg min-h-[44px]"
                    >
                        Delete This Item
                    </button>
                )}
            </div>
        </Popup>
    );
}
