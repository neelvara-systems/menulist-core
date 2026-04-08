'use client'

import type { TimeSlotPreset } from '@type/platform/store';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuChevronDown, LuChevronUp, LuFolderTree, LuPlus, LuTags } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, List, NavBar, Popup, Tag, Text, Toast } from '../antd';
import MobileCategoryEditSheet from './MobileCategoryEditSheet';

export type MobileCategoryItem = {
    id: string;
    name: string;
    active: boolean;
    itemCount: number;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
};

export type MobileCategoryReorderItem = {
    available?: boolean;
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
    onAdd: (payload: { name: string; active: boolean; presetIds: string[] }) => Promise<void>;
    onUpdate: (payload: { id: string; name: string; active: boolean; presetIds: string[] }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onReorder: (orderedIds: string[]) => Promise<void>;
    onReorderItems: (categoryId: string, orderedItemIds: string[]) => Promise<void>;
    onClose: () => void;
}

export default function CategoryManagerSheet({
    categories,
    categoryItems,
    initialMode = 'manage',
    presets,
    visible,
    onAdd,
    onUpdate,
    onDelete,
    onReorder,
    onReorderItems,
    onClose,
}: CategoryManagerSheetProps) {
    const t = useTranslations('MobileMenu');
    const STATUS_COLORS = {
        active: '#22c55e',
        inactive: '#94a3b8',
        soldOut: '#f59e0b',
    };
    const launchedInReorderMode = initialMode === 'reorder';
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedReorderCategoryId, setSelectedReorderCategoryId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isReorderHubMode, setIsReorderHubMode] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [isItemReorderMode, setIsItemReorderMode] = useState(false);
    const [reorderDraft, setReorderDraft] = useState<string[]>([]);
    const [itemReorderDraft, setItemReorderDraft] = useState<string[]>([]);
    const [categoryEditorMode, setCategoryEditorMode] = useState<'add' | 'edit' | null>(null);

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

    const renderStatusBadge = (label: string, color: string) => (
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            <span
                style={{
                    background: color,
                    borderRadius: '999px',
                    display: 'inline-block',
                    flex: '0 0 auto',
                    height: 8,
                    width: 8,
                }}
            />
            <Text style={{ fontSize: 12, lineHeight: 1.2 }}>{label}</Text>
        </Flex>
    );

    const resetCategoryEditor = () => {
        setSelectedCategoryId(null);
        setCategoryEditorMode(null);
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
        setCategoryEditorMode('edit');
    };

    const openAddCategoryEditor = () => {
        setSelectedCategoryId(null);
        setCategoryEditorMode('add');
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
            bodyStyle={{ minHeight: '64vh', maxHeight: '92vh', padding: 0 }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex gap={0} vertical>
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
                    <Flex gap={12} style={{ padding: '12px 12px 12px' }} vertical>
                        <Card>
                            <Text type="secondary">{t('reorderCategoriesHelp')}</Text>
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
                    </Flex>
                ) : isItemReorderMode ? (
                    <Flex gap={12} style={{ padding: '12px 12px 12px' }} vertical>
                        <Card>
                            <Flex gap={6} vertical>
                                {selectedReorderCategory ? (
                                    <>
                                        <Text strong>{selectedReorderCategory.name}</Text>
                                        <Text type="secondary">{t('reorderItemsHelp', { category: selectedReorderCategory.name })}</Text>
                                    </>
                                ) : (
                                    <Text type="secondary">{t('reorderItemsSelectCategoryHelp')}</Text>
                                )}
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
                                <Flex gap={10} vertical>
                                    <Flex align="center" gap={10} wrap="wrap">
                                        {renderStatusBadge(t('active'), STATUS_COLORS.active)}
                                        {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                                        {renderStatusBadge(t('soldOut'), STATUS_COLORS.soldOut)}
                                    </Flex>

                                    <List>
                                        {draftItems.map((item, index) => {
                                            const statusBits = [];
                                            if (item.active === false) statusBits.push(renderStatusBadge(t('inactive'), STATUS_COLORS.inactive));
                                            if (item.available === false) statusBits.push(renderStatusBadge(t('soldOut'), STATUS_COLORS.soldOut));
                                            if (item.active !== false && item.available !== false) statusBits.push(renderStatusBadge(t('active'), STATUS_COLORS.active));

                                            return (
                                                <List.Item
                                                    extra={(
                                                        <Flex gap={6}>
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
                                                    )}
                                                    key={item.id}
                                                    title={(
                                                        <Flex gap={4} vertical>
                                                            <Text strong>{item.name}</Text>
                                                            <Flex align="center" gap={12} wrap="wrap">
                                                                {statusBits}
                                                            </Flex>
                                                        </Flex>
                                                    )}
                                                />
                                            );
                                        })}
                                    </List>
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
                    </Flex>
                ) : isReorderHubMode ? (
                    <Flex gap={12} style={{ padding: '12px 12px 12px' }} vertical>
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
                    </Flex>
                ) : categoryEditorMode !== 'edit' ? (
                    <Flex gap={12} style={{ padding: '12px 12px 12px' }} vertical>
                        <Button block onClick={openAddCategoryEditor}>
                            <Flex align="center" gap={6}>
                                <LuPlus size={14} />
                                <Text>{t('addCategoryLabel')}</Text>
                            </Flex>
                        </Button>

                        <Card>
                            {sorted.length === 0 ? (
                                <Text type="secondary">{t('noCategories')}</Text>
                            ) : (
                                <Flex gap={12} vertical>
                                    <Text type="secondary">{t('categoryManagerHelp')}</Text>

                                    <List>
                                        {sorted.map((category) => (
                                            <List.Item
                                                arrow
                                                description={(
                                                    <Flex align="center" gap={8} wrap="wrap">
                                                        <Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>
                                                        {!category.active ? <Tag>{t('inactive')}</Tag> : null}
                                                        {category.timeSlotPresetIds?.length ? <Tag color="processing">{t('scheduled')}</Tag> : null}
                                                    </Flex>
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
                    </Flex>
                ) : null}
            </Flex>

            <MobileCategoryEditSheet
                category={categoryEditorMode === 'edit' ? selectedCategory : null}
                mode={categoryEditorMode === 'edit' ? 'edit' : 'add'}
                onClose={resetCategoryEditor}
                onDelete={async (categoryId) => {
                    await handleDelete(categoryId);
                }}
                onSave={async (payload) => {
                    setIsSaving(true);
                    try {
                        if (categoryEditorMode === 'add') {
                            await onAdd({
                                active: payload.active,
                                name: payload.name,
                                presetIds: payload.presetIds,
                            });
                            Toast.show({ content: t('categoryAdded'), duration: 1200 });
                        } else {
                            if (!payload.id) return;
                            await onUpdate({
                                active: payload.active,
                                id: payload.id,
                                name: payload.name,
                                presetIds: payload.presetIds,
                            });
                            Toast.show({ content: t('categoryUpdated'), duration: 1200 });
                        }
                        resetCategoryEditor();
                    } catch {
                        Toast.show({ content: categoryEditorMode === 'add' ? t('categoryAddFailed') : t('categoryUpdateFailed'), duration: 1500 });
                    } finally {
                        setIsSaving(false);
                    }
                }}
                presets={presets}
                visible={categoryEditorMode !== null}
            />
        </Popup>
    );
}
