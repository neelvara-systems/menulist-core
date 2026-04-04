'use client'

import type { TimeSlotPreset } from '@type/platform/store';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuArrowUpDown, LuCheck, LuChevronDown, LuChevronUp, LuClock, LuFolderTree, LuPlus, LuTags, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Checkbox, Dialog, Flex, Input, List, NavBar, Popup, Switch, Tag, Text, Toast } from '../antd';

export type MobileCategoryItem = {
    id: string;
    name: string;
    active: boolean;
    itemCount: number;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
};

export type MobileCategoryReorderItem = {
    id: string;
    name: string;
    active: boolean;
    price?: number;
};

interface CategoryManagerSheetProps {
    categories: MobileCategoryItem[];
    categoryItems: Record<string, MobileCategoryReorderItem[]>;
    initialMode?: 'manage' | 'reorder';
    presets: TimeSlotPreset[];
    visible: boolean;
    onAdd: (name: string) => Promise<void>;
    onRename: (id: string, name: string) => Promise<void>;
    onToggleActive: (id: string, active: boolean) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onReorder: (orderedIds: string[]) => Promise<void>;
    onReorderItems: (categoryId: string, orderedItemIds: string[]) => Promise<void>;
    onUpdateTimeSlots: (id: string, presetIds: string[]) => Promise<void>;
    onClose: () => void;
}

export default function CategoryManagerSheet({
    categories,
    categoryItems,
    initialMode = 'manage',
    presets,
    visible,
    onAdd,
    onRename,
    onToggleActive,
    onDelete,
    onReorder,
    onReorderItems,
    onUpdateTimeSlots,
    onClose,
}: CategoryManagerSheetProps) {
    const t = useTranslations('MobileMenu');
    const launchedInReorderMode = initialMode === 'reorder';
    const [newCategory, setNewCategory] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedReorderCategoryId, setSelectedReorderCategoryId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isReorderHubMode, setIsReorderHubMode] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isItemReorderMode, setIsItemReorderMode] = useState(false);
    const [reorderDraft, setReorderDraft] = useState<string[]>([]);
    const [itemReorderDraft, setItemReorderDraft] = useState<string[]>([]);
    const [draftName, setDraftName] = useState('');
    const [draftActive, setDraftActive] = useState(true);
    const [draftPresetIds, setDraftPresetIds] = useState<string[]>([]);

    const sorted = useMemo(() => {
        return [...categories].sort((a, b) => {
            const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
            const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
            if (aIndex !== bIndex) return aIndex - bIndex;
            return a.name.localeCompare(b.name);
        });
    }, [categories]);

    const orderedIds = useMemo(() => sorted.map((category) => category.id), [sorted]);

    const selectedCategory = useMemo(
        () => sorted.find((category) => category.id === selectedCategoryId) || null,
        [selectedCategoryId, sorted]
    );

    const selectedReorderCategory = useMemo(
        () => sorted.find((category) => category.id === selectedReorderCategoryId) || null,
        [selectedReorderCategoryId, sorted]
    );

    const draftCategories = useMemo(() => {
        const source = reorderDraft.length ? reorderDraft : orderedIds;
        return source
            .map((id) => sorted.find((category) => category.id === id))
            .filter(Boolean) as MobileCategoryItem[];
    }, [orderedIds, reorderDraft, sorted]);

    const selectedCategoryItems = useMemo(() => {
        if (!selectedReorderCategoryId) return [];
        return categoryItems[selectedReorderCategoryId] || [];
    }, [categoryItems, selectedReorderCategoryId]);

    const orderedItemIds = useMemo(() => selectedCategoryItems.map((item) => item.id), [selectedCategoryItems]);

    const draftItems = useMemo(() => {
        const source = itemReorderDraft.length ? itemReorderDraft : orderedItemIds;
        return source
            .map((id) => selectedCategoryItems.find((item) => item.id === id))
            .filter(Boolean) as MobileCategoryReorderItem[];
    }, [itemReorderDraft, orderedItemIds, selectedCategoryItems]);

    const resetCategoryEditor = () => {
        setSelectedCategoryId(null);
        setDraftName('');
        setDraftPresetIds([]);
    };

    const resetItemReorder = () => {
        setSelectedReorderCategoryId(null);
        setIsItemReorderMode(false);
        setItemReorderDraft([]);
    };

    const resetReorderState = () => {
        setIsReorderHubMode(false);
        setIsReorderMode(false);
        setReorderDraft([]);
        resetItemReorder();
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

    const openReorderMode = () => {
        setReorderDraft(orderedIds);
        setIsReorderMode(true);
    };

    const openReorderHub = () => {
        setIsReorderHubMode(true);
        setIsReorderMode(false);
        setIsItemReorderMode(false);
        setSelectedReorderCategoryId(null);
        setReorderDraft([]);
        setItemReorderDraft([]);
    };

    useEffect(() => {
        if (!visible) return;
        if (initialMode === 'reorder') {
            openReorderHub();
            return;
        }
        resetReorderState();
    }, [initialMode, visible]);

    const openItemReorderMode = () => {
        setIsItemReorderMode(true);
        setSelectedReorderCategoryId(null);
        setItemReorderDraft([]);
    };

    const openItemReorderCategory = (categoryId: string) => {
        const nextIds = (categoryItems[categoryId] || []).map((item) => item.id);
        setSelectedReorderCategoryId(categoryId);
        setItemReorderDraft(nextIds);
    };

    const moveDraftCategory = (categoryId: string, direction: 'up' | 'down') => {
        setReorderDraft((previous) => {
            const current = previous.length ? [...previous] : [...orderedIds];
            const currentIndex = current.findIndex((id) => id === categoryId);
            if (currentIndex === -1) return current;
            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= current.length) return current;
            const next = [...current];
            const [moved] = next.splice(currentIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
    };

    const moveDraftItem = (itemId: string, direction: 'up' | 'down') => {
        setItemReorderDraft((previous) => {
            const current = previous.length ? [...previous] : [...orderedItemIds];
            const currentIndex = current.findIndex((id) => id === itemId);
            if (currentIndex === -1) return current;
            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= current.length) return current;
            const next = [...current];
            const [moved] = next.splice(currentIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
    };

    const handleReorderSave = async () => {
        const nextOrder = reorderDraft.length ? reorderDraft : orderedIds;
        setIsSaving(true);
        try {
            await onReorder(nextOrder);
            setIsReorderMode(false);
            setReorderDraft([]);
            Toast.show({ content: t('categoryUpdated'), duration: 1200 });
        } catch {
            Toast.show({ content: t('categoryUpdateFailed'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    };

    const handleItemReorderSave = async () => {
        if (!selectedReorderCategoryId) return;
        const nextOrder = itemReorderDraft.length ? itemReorderDraft : orderedItemIds;
        setIsSaving(true);
        try {
            await onReorderItems(selectedReorderCategoryId, nextOrder);
            resetItemReorder();
            Toast.show({ content: t('categoryUpdated'), duration: 1200 });
        } catch {
            Toast.show({ content: t('categoryUpdateFailed'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    };

    const openCategoryEditor = (category: MobileCategoryItem) => {
        setSelectedCategoryId(category.id);
        setDraftName(category.name);
        setDraftActive(category.active);
        setDraftPresetIds(category.timeSlotPresetIds || []);
    };

    const handleCategorySave = async () => {
        if (!selectedCategoryId || !draftName.trim()) return;
        setIsSaving(true);
        try {
            const selected = sorted.find((category) => category.id === selectedCategoryId);
            if (!selected) return;

            if (draftName.trim() !== selected.name) {
                await onRename(selectedCategoryId, draftName.trim());
            }
            if (draftActive !== selected.active) {
                await onToggleActive(selectedCategoryId, draftActive);
            }

            const prevPresetIds = selected.timeSlotPresetIds || [];
            const nextPresetIds = [...draftPresetIds].sort();
            const prevSorted = [...prevPresetIds].sort();
            if (JSON.stringify(nextPresetIds) !== JSON.stringify(prevSorted)) {
                await onUpdateTimeSlots(selectedCategoryId, draftPresetIds);
            }

            Toast.show({ content: t('categoryUpdated'), duration: 1200 });
            resetCategoryEditor();
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
                    resetCategoryEditor();
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
                <NavBar
                    onBack={
                        isReorderMode
                            ? () => {
                                setIsReorderMode(false);
                                setReorderDraft([]);
                                setIsReorderHubMode(true);
                            }
                            : isItemReorderMode
                                ? () => {
                                    if (selectedReorderCategoryId) {
                                        setSelectedReorderCategoryId(null);
                                        setItemReorderDraft([]);
                                    } else {
                                        setIsItemReorderMode(false);
                                        setIsReorderHubMode(true);
                                    }
                                }
                                : isReorderHubMode
                                    ? () => {
                                        if (launchedInReorderMode) {
                                            onClose();
                                            return;
                                        }
                                        setIsReorderHubMode(false);
                                        setReorderDraft([]);
                                        setItemReorderDraft([]);
                                        setSelectedReorderCategoryId(null);
                                    }
                                : selectedCategoryId
                                    ? resetCategoryEditor
                                    : onClose
                    }
                >
                    {isReorderMode
                        ? t('reorderCategories')
                        : isItemReorderMode
                            ? t('reorderItems')
                            : isReorderHubMode
                                ? t('reorderMenu')
                            : selectedCategoryId
                                ? (selectedCategory?.name || t('categoriesTitle'))
                                : t('categoriesTitle')}
                </NavBar>

                {isReorderMode ? (
                    <>
                        <Card>
                            <Flex gap={6} vertical>
                                <Text strong>{t('reorderCategories')}</Text>
                                <Text type="secondary">{t('reorderCategoriesHelp')}</Text>
                            </Flex>
                        </Card>

                        <Card>
                            <Flex gap={8} vertical>
                                {draftCategories.map((category, index) => (
                                    <Card key={category.id} size="small" style={{ margin: 0 }}>
                                        <Flex align="center" gap={12} justify="space-between">
                                            <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                                <Text strong>{category.name}</Text>
                                                <Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>
                                            </Flex>
                                            <Flex gap={8}>
                                                <Button
                                                    disabled={index === 0}
                                                    fill="outline"
                                                    onClick={() => moveDraftCategory(category.id, 'up')}
                                                    size="small"
                                                >
                                                    <LuChevronUp size={14} />
                                                </Button>
                                                <Button
                                                    disabled={index === draftCategories.length - 1}
                                                    fill="outline"
                                                    onClick={() => moveDraftCategory(category.id, 'down')}
                                                    size="small"
                                                >
                                                    <LuChevronDown size={14} />
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        </Card>

                        <Flex gap={8}>
                            <Button
                                block
                                fill="outline"
                                onClick={() => {
                                    setIsReorderMode(false);
                                    setReorderDraft([]);
                                }}
                            >
                                {t('cancel')}
                            </Button>
                            <Button block loading={isSaving} onClick={() => void handleReorderSave()}>
                                {t('save')}
                            </Button>
                        </Flex>
                    </>
                ) : isItemReorderMode ? (
                    <>
                        <Card>
                            <Flex gap={6} vertical>
                                <Text strong>{t('reorderItems')}</Text>
                                <Text type="secondary">
                                    {selectedReorderCategory
                                        ? t('reorderItemsHelp', { category: selectedReorderCategory.name })
                                        : t('reorderItemsSelectCategoryHelp')}
                                </Text>
                            </Flex>
                        </Card>

                        <Card>
                            {!selectedReorderCategory ? (
                                <List>
                                    {sorted.map((category) => (
                                        <List.Item
                                            arrow
                                            description={<Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>}
                                            key={category.id}
                                            onClick={() => openItemReorderCategory(category.id)}
                                            title={<Text strong>{category.name}</Text>}
                                        />
                                    ))}
                                </List>
                            ) : draftItems.length === 0 ? (
                                <Text type="secondary">{t('noItemsInCategory')}</Text>
                            ) : (
                                <Flex gap={8} vertical>
                                    {draftItems.map((item, index) => (
                                        <Card key={item.id} size="small" style={{ margin: 0 }}>
                                            <Flex align="center" gap={12} justify="space-between">
                                                <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                                    <Text strong>{item.name}</Text>
                                                    {!item.active ? <Tag>{t('hidden')}</Tag> : null}
                                                </Flex>
                                                <Flex gap={8}>
                                                    <Button
                                                        disabled={index === 0}
                                                        fill="outline"
                                                        onClick={() => moveDraftItem(item.id, 'up')}
                                                        size="small"
                                                    >
                                                        <LuChevronUp size={14} />
                                                    </Button>
                                                    <Button
                                                        disabled={index === draftItems.length - 1}
                                                        fill="outline"
                                                        onClick={() => moveDraftItem(item.id, 'down')}
                                                        size="small"
                                                    >
                                                        <LuChevronDown size={14} />
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    ))}
                                </Flex>
                            )}
                        </Card>

                        <Flex gap={8}>
                            <Button
                                block
                                fill="outline"
                                onClick={() => {
                                    if (selectedReorderCategoryId) {
                                        setSelectedReorderCategoryId(null);
                                        setItemReorderDraft([]);
                                        return;
                                    }
                                    setIsItemReorderMode(false);
                                    setIsReorderHubMode(true);
                                }}
                            >
                                {selectedReorderCategoryId ? t('back') : t('cancel')}
                            </Button>
                            <Button
                                block
                                disabled={!selectedReorderCategoryId || draftItems.length === 0}
                                loading={isSaving}
                                onClick={() => void handleItemReorderSave()}
                            >
                                {t('save')}
                            </Button>
                        </Flex>
                    </>
                ) : isReorderHubMode ? (
                    <>
                        <Card>
                            <Flex gap={6} vertical>
                                <Text strong>{t('reorderMenu')}</Text>
                                <Text type="secondary">{t('reorderMenuHelp')}</Text>
                            </Flex>
                        </Card>

                        <Card>
                            <List>
                                <List.Item
                                    arrow
                                    description={<Text type="secondary">{t('reorderCategoriesHelp')}</Text>}
                                    onClick={openReorderMode}
                                    prefix={(
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={{ background: 'var(--ant-color-primary-bg)', borderRadius: 12, color: 'var(--ant-color-primary)', height: 40, width: 40 }}
                                        >
                                            <LuTags size={18} />
                                        </Flex>
                                    )}
                                    title={<Text strong>{t('reorderCategories')}</Text>}
                                />
                                <List.Item
                                    arrow
                                    description={<Text type="secondary">{t('reorderItemsShortcut')}</Text>}
                                    onClick={openItemReorderMode}
                                    prefix={(
                                        <Flex
                                            align="center"
                                            justify="center"
                                            style={{ background: 'var(--ant-color-primary-bg)', borderRadius: 12, color: 'var(--ant-color-primary)', height: 40, width: 40 }}
                                        >
                                            <LuFolderTree size={18} />
                                        </Flex>
                                    )}
                                    title={<Text strong>{t('reorderItems')}</Text>}
                                />
                            </List>
                        </Card>
                    </>
                ) : !selectedCategoryId ? (
                    <>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">{t('addCategoryLabel')}</Text>
                                <Flex gap={8}>
                                    <Input onChange={setNewCategory} placeholder={t('categoryNamePlaceholder')} value={newCategory} />
                                    <Button disabled={!newCategory.trim()} loading={isSaving} onClick={() => void handleAdd()}>
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
                                <Flex gap={12} vertical>
                                    <Card size="small" style={{ margin: 0 }}>
                                        <Text type="secondary">{t('categoryManagerHelp')}</Text>
                                    </Card>

                                    <List>
                                        {sorted.map((category) => (
                                            <List.Item
                                                arrow
                                                description={(
                                                    <Flex align="center" gap={8} wrap="wrap">
                                                        <Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>
                                                        {category.timeSlotPresetIds?.length ? <Tag color="processing">{t('scheduled')}</Tag> : null}
                                                    </Flex>
                                                )}
                                                extra={(
                                                    <Switch
                                                        checked={category.active}
                                                        onChange={(checked) => void onToggleActive(category.id, checked)}
                                                    />
                                                )}
                                                key={category.id}
                                                onClick={() => openCategoryEditor(category)}
                                                title={<Text strong>{category.name}</Text>}
                                            />
                                        ))}
                                    </List>
                                </Flex>
                            )}
                        </Card>
                    </>
                ) : selectedCategory ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" justify="space-between">
                                <Text strong>{t('itemsCount', { count: selectedCategory.itemCount })}</Text>
                                {draftPresetIds.length ? <Tag color="processing">{t('scheduled')}</Tag> : null}
                            </Flex>

                            <Flex gap={6} vertical>
                                <Text type="secondary">{t('renameCategoryLabel')}</Text>
                                <Input onChange={setDraftName} value={draftName} />
                            </Flex>

                            <Flex align="center" justify="space-between">
                                <Flex gap={2} vertical>
                                    <Text strong>{t('showOnMenu')}</Text>
                                    <Text type="secondary">Control whether this category appears in the menu.</Text>
                                </Flex>
                                <Switch checked={draftActive} onChange={setDraftActive} />
                            </Flex>

                            <Flex gap={8} vertical>
                                <Flex align="center" gap={8}>
                                    <LuClock size={16} />
                                    <Text strong>{t('categorySchedule')}</Text>
                                </Flex>
                                {presets.length === 0 ? (
                                    <Text type="secondary">{t('scheduleEmpty')}</Text>
                                ) : (
                                    <Flex gap={8} vertical>
                                        {presets.map((preset) => (
                                            <Checkbox
                                                checked={draftPresetIds.includes(preset.id)}
                                                key={preset.id}
                                                onChange={(checked) => {
                                                    setDraftPresetIds((prev) => {
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
                            </Flex>

                            <Flex gap={8}>
                                <Button block fill="outline" onClick={resetCategoryEditor}>
                                    {t('cancel')}
                                </Button>
                                <Button
                                    block
                                    disabled={!draftName.trim()}
                                    loading={isSaving}
                                    onClick={() => void handleCategorySave()}
                                >
                                    <Flex align="center" gap={6}>
                                        <LuCheck size={14} />
                                        <Text>{t('save')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>

                            <Button
                                block
                                color="danger"
                                fill="outline"
                                onClick={() => void handleDelete(selectedCategory.id)}
                                size="large"
                            >
                                <Flex align="center" gap={8}>
                                    <LuTrash2 size={16} />
                                    <Text>{t('delete')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Popup>
    );
}
