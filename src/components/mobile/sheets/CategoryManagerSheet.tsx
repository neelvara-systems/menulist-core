'use client'

import CategoryIcon from '@atoms/CategoryIcon';
import { getOwnerLabels } from '@config/businessLabels';
import type { TimeSlotPreset } from '@type/platform/store';
import { closestCenter, DndContext, DragEndEvent, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { LuFolderTree, LuGripVertical, LuPlus, LuTags } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, List, NavBar, Popup, Tag, Text, Toast } from '../antd';
import MobileCategoryEditSheet from './MobileCategoryEditSheet';

export type MobileCategoryItem = {
    id: string;
    name: string;
    active: boolean;
    icon?: string;
    itemCount: number;
    nameByLanguage?: Record<string, string>;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
};

export type MobileCategoryReorderItem = {
    available?: boolean;
    id: string;
    name: string;
    active: boolean;
    hiddenByCategory?: boolean;
    price?: number;
    hasImage?: boolean;
    hasDescription?: boolean;
};

interface CategoryManagerSheetProps {
    businessType?: string;
    categoryIconsEnabled?: boolean;
    categories: MobileCategoryItem[];
    categoryItems: Record<string, MobileCategoryReorderItem[]>;
    initialCategoryId?: string | null;
    initialMode?: 'manage' | 'reorder';
    presets: TimeSlotPreset[];
    visible: boolean;
    onAdd: (payload: { names: Record<string, string>; active: boolean; icon?: string; presetIds: string[] }) => Promise<void>;
    onUpdate: (payload: { id: string; names: Record<string, string>; active: boolean; icon?: string; presetIds: string[] }) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onGenerateContent?: (payload: { id?: string; names: Record<string, string> }) => Promise<Record<string, string> | null>;
    onOpenDesignEditor?: () => void;
    onReorder: (orderedIds: string[]) => Promise<void>;
    onReorderItems: (categoryId: string, orderedItemIds: string[]) => Promise<void>;
    onClose: () => void;
    selectedLanguages?: string[];
}

interface SortableReorderRowProps {
    id: string;
    title: ReactNode;
    description?: ReactNode;
    accessory?: ReactNode;
}

function SortableReorderRow({ id, title, description, accessory }: SortableReorderRowProps) {
    const { token } = theme.useToken();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            style={{
                cursor: 'grab',
                opacity: isDragging ? 0.72 : 1,
                transform: CSS.Transform.toString(transform),
                transition,
                touchAction: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            <Flex
                align="center"
                gap={12}
                justify="space-between"
                style={{
                    background: token.colorBgContainer,
                    border: `1px solid ${isDragging ? token.colorPrimary : token.colorBorderSecondary}`,
                    borderRadius: 16,
                    boxShadow: isDragging ? token.boxShadowSecondary : 'none',
                    minHeight: 72,
                    padding: '12px 14px',
                    userSelect: 'none',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                }}
            >
                <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                        <div style={{ minWidth: 0 }}>{title}</div>
                        {description ? <div style={{ minWidth: 0 }}>{description}</div> : null}
                    </Flex>
                </Flex>
                <Flex align="center" gap={10} style={{ flex: '0 0 auto', minWidth: 0 }}>
                    {accessory ? (
                        <div style={{ minWidth: 0 }}>
                            {accessory}
                        </div>
                    ) : null}
                    <div
                        style={{
                            alignItems: 'center',
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 12,
                            color: token.colorTextTertiary,
                            display: 'flex',
                            flex: '0 0 auto',
                            height: 40,
                            justifyContent: 'center',
                            width: 40,
                        }}
                    >
                        <LuGripVertical size={18} />
                    </div>
                </Flex>
            </Flex>
        </div>
    );
}

export default function CategoryManagerSheet({
    businessType,
    categoryIconsEnabled = true,
    categories,
    categoryItems,
    initialCategoryId = null,
    initialMode = 'manage',
    presets,
    visible,
    onAdd,
    onUpdate,
    onDelete,
    onGenerateContent,
    onOpenDesignEditor,
    onReorder,
    onReorderItems,
    onClose,
    selectedLanguages = ['en'],
}: CategoryManagerSheetProps) {
    const t = useTranslations('MobileMenu');
    const { token } = theme.useToken();
    const availabilityLabels = getOwnerLabels(businessType);
    const STATUS_COLORS = {
        active: '#22c55e',
        inactive: '#94a3b8',
        hiddenByCategory: '#64748b',
        soldOut: '#f59e0b',
        missingPhoto: '#ef4444',
        missingDescription: '#a855f7',
        missingPrice: '#ec4899',
    };
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 14,
    } as const;
    const reorderScrollableCardStyle = {
        ...sectionCardStyle,
        display: 'flex',
        flex: 1,
        flexDirection: 'column' as const,
        minHeight: 0,
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
    const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 120,
                tolerance: 8,
            },
        }),
    );

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
    const isDirectCategoryEditFlow = !isReorderHubMode
        && !isReorderMode
        && !isItemReorderMode
        && categoryEditorMode === 'edit'
        && !!initialCategoryId
        && selectedCategoryId === initialCategoryId;

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

    const renderStatusDot = (color: string, key: string) => (
        <span
            key={key}
            style={{
                background: color,
                borderRadius: '999px',
                display: 'inline-block',
                flex: '0 0 auto',
                height: 8,
                width: 8,
            }}
        />
    );

    const itemReorderLegend = useMemo(() => {
        if (draftItems.length === 0) return [];

        const hasInactive = draftItems.some((item) => item.active === false);
        const hasHiddenByCategory = draftItems.some((item) => item.hiddenByCategory);
        const hasUnavailable = draftItems.some((item) => item.available === false);
        const hasMissingPhoto = draftItems.some((item) => item.hasImage === false);
        const hasMissingDescription = draftItems.some((item) => item.hasDescription === false);
        const hasMissingPrice = draftItems.some((item) => !(item.price && item.price > 0));

        return [
            hasInactive ? renderStatusBadge(t('inactive'), STATUS_COLORS.inactive) : null,
            hasHiddenByCategory ? renderStatusBadge(t('hiddenByCategory'), STATUS_COLORS.hiddenByCategory) : null,
            hasUnavailable ? renderStatusBadge(availabilityLabels.unavailable, STATUS_COLORS.soldOut) : null,
            hasMissingPhoto ? renderStatusBadge(t('missingPhoto'), STATUS_COLORS.missingPhoto) : null,
            hasMissingDescription ? renderStatusBadge(t('missingDescription'), STATUS_COLORS.missingDescription) : null,
            hasMissingPrice ? renderStatusBadge(t('missingPrice'), STATUS_COLORS.missingPrice) : null,
        ].filter(Boolean);
    }, [
        STATUS_COLORS.hiddenByCategory,
        STATUS_COLORS.inactive,
        STATUS_COLORS.missingDescription,
        STATUS_COLORS.missingPhoto,
        STATUS_COLORS.missingPrice,
        STATUS_COLORS.soldOut,
        availabilityLabels.unavailable,
        draftItems,
        t,
    ]);

    const resetCategoryEditor = () => {
        setSelectedCategoryId(null);
        setCategoryEditorMode(null);
    };
    const closeCategoryEditor = () => {
        if (isDirectCategoryEditFlow) {
            onClose();
            return;
        }
        resetCategoryEditor();
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
            resetCategoryEditor();
            openReorderHub();
            return;
        }
        resetReorderState();
        if (initialCategoryId) {
            setSelectedCategoryId(initialCategoryId);
            setCategoryEditorMode('edit');
            return;
        }
        resetCategoryEditor();
    }, [initialCategoryId, initialMode, visible]);

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

    const handleCategoryDragEnd = ({ active, over }: DragEndEvent) => {
        setDraggingCategoryId(null);
        if (!over || active.id === over.id) return;

        setReorderDraft((previous) => {
            const current = previous.length ? [...previous] : [...orderedIds];
            const activeIndex = current.findIndex((id) => id === active.id);
            const overIndex = current.findIndex((id) => id === over.id);
            if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return current;
            return arrayMove(current, activeIndex, overIndex);
        });
    };

    const handleItemDragEnd = ({ active, over }: DragEndEvent) => {
        setDraggingItemId(null);
        if (!over || active.id === over.id) return;

        setItemReorderDraft((previous) => {
            const current = previous.length ? [...previous] : [...orderedItemIds];
            const activeIndex = current.findIndex((id) => id === active.id);
            const overIndex = current.findIndex((id) => id === over.id);
            if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return current;
            return arrayMove(current, activeIndex, overIndex);
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
        const category = categories.find((entry) => entry.id === categoryId);
        const itemCount = category?.itemCount || 0;
        const categoryName = category?.name || t('categoriesTitle');

        Dialog.confirm({
            title: t('categoryDeleteTitle'),
            content: itemCount > 0
                ? `Delete "${categoryName}" and ${itemCount} item${itemCount === 1 ? '' : 's'} inside it?`
                : `Delete "${categoryName}"?`,
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
            <Flex gap={0} style={{ minHeight: '64vh' }} vertical>
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
                                        ? closeCategoryEditor
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
                    <Flex gap={12} style={{ flex: 1, minHeight: 0, padding: '12px 12px 12px' }} vertical>
                        <Card style={sectionCardStyle}>
                            <Text type="secondary">{t('reorderCategoriesHelp')}</Text>
                        </Card>

                        <Card style={reorderScrollableCardStyle}>
                            <Flex gap={10} style={{ minHeight: 0 }} vertical>
                                <Text type="secondary">Press and drag the handle to reorder categories.</Text>
                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    <DndContext
                                        collisionDetection={closestCenter}
                                        onDragCancel={() => setDraggingCategoryId(null)}
                                        onDragEnd={handleCategoryDragEnd}
                                        onDragStart={({ active }) => setDraggingCategoryId(String(active.id))}
                                        sensors={sensors}
                                    >
                                        <SortableContext
                                            items={draftCategories.map((category) => category.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <Flex gap={10} vertical>
                                                {draftCategories.map((category) => (
                                                    <SortableReorderRow
                                                        accessory={<Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>}
                                                        description={
                                                            <Flex align="center" gap={8} wrap="wrap">
                                                                {!category.active ? <Tag>{t('inactive')}</Tag> : null}
                                                                {category.timeSlotPresetIds?.length ? <Tag color="processing">{t('scheduled')}</Tag> : null}
                                                            </Flex>
                                                        }
                                                        id={category.id}
                                                        key={category.id}
                                                        title={(
                                                            <Flex align="center" gap={10}>
                                                                <CategoryIcon icon={category.icon || ''} size={18} />
                                                                <Text strong>{category.name}</Text>
                                                            </Flex>
                                                        )}
                                                    />
                                                ))}
                                            </Flex>
                                        </SortableContext>
                                        <DragOverlay>
                                            {draggingCategoryId ? (
                                                <div style={{ width: 'calc(100vw - 64px)', maxWidth: 520 }}>
                                                    <Card style={{ ...sectionCardStyle, boxShadow: token.boxShadowSecondary }}>
                                                        <Flex align="center" gap={10}>
                                                            <CategoryIcon
                                                                icon={draftCategories.find((category) => category.id === draggingCategoryId)?.icon || ''}
                                                                size={18}
                                                            />
                                                            <Text strong>{draftCategories.find((category) => category.id === draggingCategoryId)?.name}</Text>
                                                        </Flex>
                                                    </Card>
                                                </div>
                                            ) : null}
                                        </DragOverlay>
                                    </DndContext>
                                </div>
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
                    <Flex gap={12} style={{ flex: 1, minHeight: 0, padding: '12px 12px 12px' }} vertical>
                        <Card style={sectionCardStyle}>
                            <Flex gap={6} vertical>
                                {selectedReorderCategory ? (
                                    <>
                                        <Flex align="center" gap={10}>
                                            <CategoryIcon icon={selectedReorderCategory.icon || ''} size={18} />
                                            <Text strong>{selectedReorderCategory.name}</Text>
                                        </Flex>
                                        <Text type="secondary">{t('reorderItemsHelp', { category: selectedReorderCategory.name })}</Text>
                                    </>
                                ) : (
                                    <Text type="secondary">{t('reorderItemsSelectCategoryHelp')}</Text>
                                )}
                            </Flex>
                        </Card>

                        <Card style={reorderScrollableCardStyle}>
                            {!selectedReorderCategory ? (
                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                    <List>
                                        {sorted.map((category) => (
                                            <List.Item
                                                arrow
                                                description={<Text type="secondary">{t('itemsCount', { count: category.itemCount })}</Text>}
                                                key={category.id}
                                                onClick={() => openItemReorderCategory(category.id)}
                                                title={(
                                                    <Flex align="center" gap={10}>
                                                        <CategoryIcon icon={category.icon || ''} size={18} />
                                                        <Text strong>{category.name}</Text>
                                                    </Flex>
                                                )}
                                            />
                                        ))}
                                    </List>
                                </div>
                            ) : draftItems.length === 0 ? (
                                <Text type="secondary">{t('noItemsInCategory')}</Text>
                            ) : (
                                <Flex gap={10} style={{ minHeight: 0 }} vertical>
                                    {itemReorderLegend.length > 0 ? (
                                        <Flex align="center" gap={10} wrap="wrap">
                                            {itemReorderLegend}
                                        </Flex>
                                    ) : null}

                                    <Text type="secondary">Press and drag the handle to reorder items.</Text>

                                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                        <DndContext
                                            collisionDetection={closestCenter}
                                            onDragCancel={() => setDraggingItemId(null)}
                                            onDragEnd={handleItemDragEnd}
                                            onDragStart={({ active }) => setDraggingItemId(String(active.id))}
                                            sensors={sensors}
                                        >
                                            <SortableContext
                                                items={draftItems.map((item) => item.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <Flex gap={10} vertical>
                                                    {draftItems.map((item) => {
                                                        const statusDots = [];
                                                        if (item.active === false) statusDots.push(renderStatusDot(STATUS_COLORS.inactive, `${item.id}-inactive`));
                                                        if (item.hiddenByCategory) statusDots.push(renderStatusDot(STATUS_COLORS.hiddenByCategory, `${item.id}-hidden`));
                                                        if (item.available === false) statusDots.push(renderStatusDot(STATUS_COLORS.soldOut, `${item.id}-unavailable`));
                                                        if (item.hasImage === false) statusDots.push(renderStatusDot(STATUS_COLORS.missingPhoto, `${item.id}-image`));
                                                        if (item.hasDescription === false) statusDots.push(renderStatusDot(STATUS_COLORS.missingDescription, `${item.id}-description`));
                                                        if (!(item.price && item.price > 0)) statusDots.push(renderStatusDot(STATUS_COLORS.missingPrice, `${item.id}-price`));

                                                        return (
                                                            <SortableReorderRow
                                                                accessory={item.price && item.price > 0 ? <Tag>${item.price}</Tag> : undefined}
                                                                description={statusDots.length > 0 ? (
                                                                    <Flex align="center" gap={6} wrap="wrap">
                                                                        {statusDots}
                                                                    </Flex>
                                                                ) : undefined}
                                                                id={item.id}
                                                                key={item.id}
                                                                title={<Text strong>{item.name}</Text>}
                                                            />
                                                        );
                                                    })}
                                                </Flex>
                                            </SortableContext>
                                            <DragOverlay>
                                                {draggingItemId ? (
                                                    <div style={{ width: 'calc(100vw - 64px)', maxWidth: 520 }}>
                                                        <Card style={{ ...sectionCardStyle, boxShadow: token.boxShadowSecondary }}>
                                                            <Text strong>{draftItems.find((item) => item.id === draggingItemId)?.name}</Text>
                                                        </Card>
                                                    </div>
                                                ) : null}
                                            </DragOverlay>
                                        </DndContext>
                                    </div>
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
                        <Card style={sectionCardStyle}>
                            <Flex gap={6} vertical>
                                <Text strong>{t('reorderMenu')}</Text>
                                <Text type="secondary">{t('reorderMenuHelp')}</Text>
                            </Flex>
                        </Card>

                        <Card style={sectionCardStyle}>
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
                                                title={(
                                                    <Flex align="center" gap={10}>
                                                        <CategoryIcon icon={category.icon || ''} size={18} />
                                                        <Text strong>{category.name}</Text>
                                                    </Flex>
                                                )}
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
                businessType={businessType}
                category={categoryEditorMode === 'edit' ? selectedCategory : null}
                categoryIconsEnabled={categoryIconsEnabled}
                mode={categoryEditorMode === 'edit' ? 'edit' : 'add'}
                onClose={closeCategoryEditor}
                onDelete={async (categoryId) => {
                    await handleDelete(categoryId);
                }}
                onGenerateContent={onGenerateContent}
                onOpenDesignEditor={onOpenDesignEditor}
                onSave={async (payload) => {
                    setIsSaving(true);
                    try {
                        if (categoryEditorMode === 'add') {
                            await onAdd({
                                active: payload.active,
                                icon: payload.icon,
                                names: payload.names,
                                presetIds: payload.presetIds,
                            });
                            Toast.show({ content: t('categoryAdded'), duration: 1200 });
                        } else {
                            if (!payload.id) return;
                            await onUpdate({
                                active: payload.active,
                                id: payload.id,
                                icon: payload.icon,
                                names: payload.names,
                                presetIds: payload.presetIds,
                            });
                            Toast.show({ content: t('categoryUpdated'), duration: 1200 });
                        }
                        closeCategoryEditor();
                    } catch {
                        Toast.show({ content: categoryEditorMode === 'add' ? t('categoryAddFailed') : t('categoryUpdateFailed'), duration: 1500 });
                    } finally {
                        setIsSaving(false);
                    }
                }}
                presets={presets}
                selectedLanguages={selectedLanguages}
                visible={categoryEditorMode !== null}
            />
        </Popup>
    );
}
