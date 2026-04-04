'use client'

import { useMemo, useState } from 'react';
import { LuCheck, LuChevronDown, LuChevronUp, LuClock, LuPencil, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import { Button, Card, Checkbox, Dialog, Flex, Input, List, Popup, Switch, Tag, Text, Title, Toast } from '../antd';
import type { TimeSlotPreset } from '@type/platform/store';
import { useTranslations } from 'next-intl';

export type MobileCategoryItem = {
    id: string;
    name: string;
    active: boolean;
    itemCount: number;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
};

interface CategoryManagerSheetProps {
    categories: MobileCategoryItem[];
    presets: TimeSlotPreset[];
    visible: boolean;
    onAdd: (name: string) => Promise<void>;
    onRename: (id: string, name: string) => Promise<void>;
    onToggleActive: (id: string, active: boolean) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onReorder: (id: string, direction: 'up' | 'down') => Promise<void>;
    onUpdateTimeSlots: (id: string, presetIds: string[]) => Promise<void>;
    onClose: () => void;
}

export default function CategoryManagerSheet({
    categories,
    presets,
    visible,
    onAdd,
    onRename,
    onToggleActive,
    onDelete,
    onReorder,
    onUpdateTimeSlots,
    onClose,
}: CategoryManagerSheetProps) {
    const t = useTranslations('MobileMenu');
    const [newCategory, setNewCategory] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const sorted = useMemo(() => {
        return [...categories].sort((a, b) => {
            const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
            const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
            if (aIndex !== bIndex) return aIndex - bIndex;
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    const [scheduleCategoryId, setScheduleCategoryId] = useState<string | null>(null);
    const [selectedPresets, setSelectedPresets] = useState<string[]>([]);

    const openSchedule = (category: MobileCategoryItem) => {
        setScheduleCategoryId(category.id);
        setSelectedPresets(category.timeSlotPresetIds || []);
    };

    const handleScheduleSave = async () => {
        if (!scheduleCategoryId) return;
        setIsSaving(true);
        try {
            await onUpdateTimeSlots(scheduleCategoryId, selectedPresets);
            Toast.show({ content: t('scheduleUpdated'), duration: 1200 });
            setScheduleCategoryId(null);
        } catch {
            Toast.show({ content: t('scheduleUpdateFailed'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setIsSaving(true);
        try {
            await onAdd(newCategory.trim());
            setNewCategory('');
            Toast.show({ content: t('categoryAdded'), duration: 1200 });
        } catch {
            Toast.show({ content: t('categoryAddFailed'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRename = async (categoryId: string) => {
        if (!editingName.trim()) return;
        setIsSaving(true);
        try {
            await onRename(categoryId, editingName.trim());
            setEditingId(null);
            setEditingName('');
            Toast.show({ content: t('categoryUpdated'), duration: 1200 });
        } catch {
            Toast.show({ content: t('categoryUpdateFailed'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (categoryId: string) => {
        Dialog.confirm({
            title: t('categoryDeleteTitle'),
            content: t('categoryDeleteDesc', { uncategorized: t('uncategorized') }),
            confirmText: t('delete'),
            cancelText: t('cancel'),
            onConfirm: async () => {
                setIsSaving(true);
                try {
                    await onDelete(categoryId);
                    Toast.show({ content: t('categoryDeleted'), duration: 1200 });
                } catch {
                    Toast.show({ content: t('categoryDeleteFailed'), duration: 1500 });
                } finally {
                    setIsSaving(false);
                }
            },
        });
    };

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh' }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex gap={16} vertical>
                <Flex align="center" justify="space-between">
                    <Title level={4} style={{ margin: 0 }}>{t('categoriesTitle')}</Title>
                    <Button fill="none" onClick={onClose} size="small" style={{ paddingInline: 4 }}>
                        <LuX size={18} />
                    </Button>
                </Flex>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{t('addCategoryLabel')}</Text>
                        <Flex gap={8}>
                            <Input onChange={setNewCategory} placeholder={t('categoryNamePlaceholder')} value={newCategory} />
                            <Button onClick={handleAdd} disabled={!newCategory.trim()} loading={isSaving}>
                                <Flex align="center" gap={6}>
                                    <LuPlus size={14} />
                                    <Text>{t('add')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    {sorted.length === 0 ? (
                        <Text type="secondary">{t('noCategories')}</Text>
                    ) : (
                        <List>
                            {sorted.map((category, index) => (
                                <List.Item
                                    key={category.id}
                                    title={<Text strong>{category.name}</Text>}
                                    description={<Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>}
                                    extra={(
                                        <Flex align="center" gap={8} wrap>
                                            {category.timeSlotPresetIds?.length ? <Tag color="processing">{t('scheduled')}</Tag> : null}
                                            <Switch checked={category.active} onChange={(checked) => void onToggleActive(category.id, checked)} />
                                            <Button
                                                fill="outline"
                                                onClick={() => void onReorder(category.id, 'up')}
                                                size="small"
                                                disabled={index === 0}
                                            >
                                                <LuChevronUp size={14} />
                                            </Button>
                                            <Button
                                                fill="outline"
                                                onClick={() => void onReorder(category.id, 'down')}
                                                size="small"
                                                disabled={index === sorted.length - 1}
                                            >
                                                <LuChevronDown size={14} />
                                            </Button>
                                            <Button fill="outline" onClick={() => openSchedule(category)} size="small">
                                                <LuClock size={14} />
                                            </Button>
                                            <Button fill="outline" onClick={() => { setEditingId(category.id); setEditingName(category.name); }} size="small">
                                                <LuPencil size={14} />
                                            </Button>
                                            <Button fill="outline" onClick={() => void handleDelete(category.id)} size="small" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                                <LuTrash2 size={14} />
                                            </Button>
                                        </Flex>
                                    )}
                                />
                            ))}
                        </List>
                    )}
                </Card>

                {editingId ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text type="secondary">{t('renameCategoryLabel')}</Text>
                            <Input onChange={setEditingName} value={editingName} />
                            <Flex gap={8}>
                                <Button block fill="outline" onClick={() => { setEditingId(null); setEditingName(''); }}>
                                    {t('cancel')}
                                </Button>
                                <Button block onClick={() => void handleRename(editingId)} loading={isSaving} disabled={!editingName.trim()}>
                                    <Flex align="center" gap={6}>
                                        <LuCheck size={14} />
                                        <Text>{t('save')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ) : null}

                {scheduleCategoryId ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text type="secondary">{t('categorySchedule')}</Text>
                            {presets.length === 0 ? (
                                <Text type="secondary">{t('scheduleEmpty')}</Text>
                            ) : (
                                <Flex gap={8} vertical>
                                    {presets.map((preset) => (
                                        <Checkbox
                                            checked={selectedPresets.includes(preset.id)}
                                            key={preset.id}
                                            onChange={(checked) => {
                                                setSelectedPresets((prev) => {
                                                    if (checked) return [...prev, preset.id];
                                                    return prev.filter((id) => id !== preset.id);
                                                });
                                            }}
                                        >
                                            <Flex align="center" gap={8}>
                                                <Tag color={preset.color || 'processing'}>{preset.label}</Tag>
                                                <Text type="secondary">{`${preset.startTime} - ${preset.endTime}`}</Text>
                                            </Flex>
                                        </Checkbox>
                                    ))}
                                </Flex>
                            )}
                            <Flex gap={8}>
                                <Button block fill="outline" onClick={() => setScheduleCategoryId(null)}>
                                    {t('cancel')}
                                </Button>
                                <Button block onClick={handleScheduleSave} loading={isSaving}>
                                    {t('save')}
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Popup>
    );
}
