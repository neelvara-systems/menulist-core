import { DndContext, DragEndEvent, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { getUID, removeObjRef } from '@util/utils';
import { Button, Flex, Modal, Tag, Typography, theme } from 'antd';
import { useState } from 'react';
import { LuHelpCircle } from 'react-icons/lu';
import { ExtractedDataCategory, ExtractedDataItem, Project, ProjectFileType } from '../types';
import ReorderSortableItem from './ReorderSortableItem';

const { Text, Title } = Typography;

interface ReorderMenuModalProps {
    open: boolean;
    projectData: Project;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
}

interface CategoryRow {
    uid: string;
    id: string;
    label: string;
    fileUid: string;
    fileName: string;
}

interface ItemRow {
    uid: string;
    id: string;
    label: string;
    categoryId: string;
    fileUid: string;
}

// Build all categories from all files
function buildAllCategoryRows(files: ProjectFileType[], activeLang: string): CategoryRow[] {
    const rows: CategoryRow[] = [];
    files?.forEach(file => {
        if (!file.extractedData?.data?.categories) return;
        file.extractedData.data.categories.forEach(cat => {
            rows.push({
                uid: getUID(),
                id: cat.id,
                label: cat.name?.[activeLang] || 'Untitled category',
                fileUid: file.uid,
                fileName: file.name || 'Untitled file'
            });
        });
    });
    return rows;
}

// Build items for a specific category
function buildItemsForCategory(files: ProjectFileType[], categoryId: string, activeLang: string): ItemRow[] {
    const rows: ItemRow[] = [];
    files?.forEach(file => {
        if (!file.extractedData?.data?.items) return;
        const items = file.extractedData.data.items.filter(item => item.category === categoryId);
        items.forEach(item => {
            rows.push({
                uid: getUID(),
                id: item.id,
                label: item.name?.[activeLang] || 'Untitled item',
                categoryId: categoryId,
                fileUid: file.uid
            });
        });
    });
    return rows;
}

const ReorderMenuModal = ({ open, projectData, onClose, onApply }: ReorderMenuModalProps) => {
    const { token } = theme.useToken();
    const activeLang = getProjectDefaultLanguage(projectData);

    // State for category selection and drag-drop
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
    const [itemRows, setItemRows] = useState<ItemRow[]>([]);
    const [draggingCategory, setDraggingCategory] = useState<any>(null);
    const [draggingItem, setDraggingItem] = useState<any>(null);

    // Store initial state for reset functionality
    const [initialCategoryRows, setInitialCategoryRows] = useState<CategoryRow[]>([]);
    const [initialItemRows, setInitialItemRows] = useState<ItemRow[]>([]);

    // Initialize data when modal opens
    const handleOpen = () => {
        const cats = buildAllCategoryRows(projectData.files || [], activeLang);
        setCategoryRows(cats);
        setInitialCategoryRows([...cats]); // Store initial state

        // Auto-select first category
        if (cats.length > 0 && !selectedCategoryId) {
            const firstCat = cats[0];
            setSelectedCategoryId(firstCat.id);
            const items = buildItemsForCategory(projectData.files || [], firstCat.id, activeLang);
            setItemRows(items);
            setInitialItemRows([...items]); // Store initial state
        }
    };

    // When category is clicked, load its items
    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        const items = buildItemsForCategory(projectData.files || [], categoryId, activeLang);
        setItemRows(items);
        setInitialItemRows([...items]); // Update initial state when switching categories
    };

    // Reset to initial state
    const handleReset = () => {
        setCategoryRows([...initialCategoryRows]);
        setItemRows([...initialItemRows]);
    };

    // Detect if order has changed
    const hasChanges =
        JSON.stringify(categoryRows.map(c => c.id)) !== JSON.stringify(initialCategoryRows.map(c => c.id)) ||
        JSON.stringify(itemRows.map(i => i.id)) !== JSON.stringify(initialItemRows.map(i => i.id));

    // Handle close with confirmation if changes exist
    const handleClose = () => {
        if (hasChanges) {
            Modal.confirm({
                title: 'Unsaved Changes',
                icon: <LuHelpCircle />,
                content: 'You have unsaved order changes. Are you sure you want to close?',
                okText: 'Discard Changes',
                okType: 'danger',
                cancelText: 'Keep Editing',
                onOk: onClose,
            });
        } else {
            onClose();
        }
    };

    // Handle category reordering
    const handleCategoryDragEnd = ({ active, over }: DragEndEvent) => {
        if (over?.id && active?.id) {
            const activeIndex = categoryRows.findIndex(x => x.uid === active.id);
            const overIndex = categoryRows.findIndex(x => x.uid === over.id);
            if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;
            const newList = arrayMove(categoryRows, activeIndex, overIndex);
            setCategoryRows(newList);
        }
        setDraggingCategory(null);
    };

    // Handle item reordering
    const handleItemDragEnd = ({ active, over }: DragEndEvent) => {
        if (over?.id && active?.id) {
            const activeIndex = itemRows.findIndex(x => x.uid === active.id);
            const overIndex = itemRows.findIndex(x => x.uid === over.id);
            if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;
            const newList = arrayMove(itemRows, activeIndex, overIndex);
            setItemRows(newList);
        }
        setDraggingItem(null);
    };

    // Apply changes to project
    const handleApply = () => {
        const updatedProject = removeObjRef(projectData);

        // Update category orders per file
        const categoryOrdersByFile: Record<string, string[]> = {};
        categoryRows.forEach((cat, index) => {
            if (!categoryOrdersByFile[cat.fileUid]) {
                categoryOrdersByFile[cat.fileUid] = [];
            }
            categoryOrdersByFile[cat.fileUid].push(cat.id);
        });

        // Update item orders per file
        const itemOrdersByFile: Record<string, string[]> = {};
        itemRows.forEach((item, index) => {
            if (!itemOrdersByFile[item.fileUid]) {
                itemOrdersByFile[item.fileUid] = [];
            }
            itemOrdersByFile[item.fileUid].push(item.id);
        });

        // Apply to each file
        updatedProject.files?.forEach(file => {
            if (!file.extractedData?.data) return;

            // Reorder categories
            if (categoryOrdersByFile[file.uid]) {
                const currentCats = file.extractedData.data.categories || [];
                const byId: Record<string, ExtractedDataCategory> = {};
                currentCats.forEach(c => { byId[c.id] = c; });
                file.extractedData.data.categories = categoryOrdersByFile[file.uid]
                    .map(id => byId[id])
                    .filter(Boolean);
            }

            // Reorder items
            if (itemOrdersByFile[file.uid]) {
                const currentItems = file.extractedData.data.items || [];
                const byId: Record<string, ExtractedDataItem> = {};
                currentItems.forEach(i => { byId[i.id] = i; });

                const reorderedIds = itemOrdersByFile[file.uid];
                const reorderedSet = new Set(reorderedIds);
                const reorderedItems = reorderedIds
                    .map(id => byId[id])
                    .filter(Boolean);
                const untouchedItems = currentItems.filter(i => !reorderedSet.has(i.id));
                file.extractedData.data.items = [...reorderedItems, ...untouchedItems];
            }
        });

        onApply(updatedProject);
        onClose();
    };

    const canReorder = categoryRows.length > 0;

    return (
        <Modal
            centered
            title={
                <Flex vertical gap={4}>
                    <Title level={4} style={{ margin: 0 }}>
                        Reorder Menu
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Use the ⋮⋮ handle to drag items. Click categories to view and reorder their items.
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={handleClose}
            afterOpenChange={(visible) => {
                if (visible) handleOpen();
            }}
            closable={true}
            maskClosable={false}
            styles={{ mask: { backdropFilter: 'blur(6px)' } }}
            width={900}
            footer={
                <Flex justify="space-between" align="center">
                    <Text type="secondary" style={{ fontSize: 11, maxWidth: 400 }}>
                        💡 Tip: Grab the ⋮⋮ handle to drag and reorder. Click anywhere else to select.
                    </Text>
                    <Flex gap={8}>
                        <Button onClick={handleReset} disabled={!hasChanges}>
                            Reset
                        </Button>
                        <Button onClick={handleClose}>Cancel</Button>
                        <Button type="primary" disabled={!canReorder} onClick={handleApply}>
                            Update order
                        </Button>
                    </Flex>
                </Flex>
            }
        >
            {/* Two-Column Layout */}
            <Flex gap={16} style={{ height: '500px' }}>
                {/* LEFT COLUMN: Categories */}
                <Flex
                    vertical
                    style={{
                        flex: '0 0 40%',
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorder}`,
                        background: token.colorBgContainer,
                        overflow: 'hidden',
                    }}
                >
                    {/* Categories Header */}
                    <Flex
                        align="center"
                        justify="space-between"
                        style={{
                            padding: '12px 16px',
                            borderBottom: `1px solid ${token.colorBorder}`,
                            background: token.colorBgLayout,
                            position: 'sticky',
                            top: 0,
                            zIndex: 1
                        }}
                    >
                        <Flex align="center" gap={8}>
                            <Text strong style={{ fontSize: 13 }}>
                                Categories
                            </Text>
                            <Tag color="blue" style={{ margin: 0 }}>
                                {categoryRows.length}
                            </Tag>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Drag to reorder
                        </Text>
                    </Flex>

                    {/* Categories List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                        <DndContext
                            onDragStart={({ active }) => setDraggingCategory(active)}
                            onDragCancel={() => setDraggingCategory(null)}
                            onDragEnd={handleCategoryDragEnd}
                            collisionDetection={rectIntersection}
                        >
                            <SortableContext
                                items={categoryRows.map((row) => row.uid)}
                                strategy={rectSortingStrategy}
                            >
                                <Flex vertical gap={8}>
                                    {categoryRows.map((cat, index) => (
                                        <div key={cat.uid}>
                                            <ReorderSortableItem
                                                label={cat.label}
                                                index={index}
                                                uid={cat.uid}
                                                isSelected={selectedCategoryId === cat.id}
                                                onClick={() => handleCategoryClick(cat.id)}
                                            />
                                        </div>
                                    ))}
                                </Flex>
                            </SortableContext>
                            <DragOverlay>
                                {draggingCategory?.id ? (
                                    <Flex
                                        justify="center"
                                        align="center"
                                        style={{
                                            background: token.colorBgBase,
                                            width: '100%',
                                            height: 40,
                                            border: `2px solid ${token.colorPrimary}`,
                                            borderRadius: 6,
                                            paddingInline: 12,
                                        }}
                                    >
                                        <Text style={{ fontSize: 13 }}>
                                            {categoryRows.find(r => r.uid === draggingCategory.id)?.label || ''}
                                        </Text>
                                    </Flex>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </Flex>

                {/* RIGHT COLUMN: Items */}
                <Flex
                    vertical
                    style={{
                        flex: 1,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorder}`,
                        background: token.colorBgContainer,
                        overflow: 'hidden',
                    }}
                >
                    {/* Items Header */}
                    <Flex
                        align="center"
                        justify="space-between"
                        style={{
                            padding: '12px 16px',
                            borderBottom: `1px solid ${token.colorBorder}`,
                            background: token.colorBgLayout,
                            position: 'sticky',
                            top: 0,
                            zIndex: 1
                        }}
                    >
                        <Flex align="center" gap={8}>
                            <Text strong style={{ fontSize: 13 }}>
                                Items
                            </Text>
                            {itemRows.length > 0 && (
                                <Tag color="green" style={{ margin: 0 }}>
                                    {itemRows.length}
                                </Tag>
                            )}
                        </Flex>
                        {selectedCategoryId ? (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Drag to reorder
                            </Text>
                        ) : (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Select a category
                            </Text>
                        )}
                    </Flex>

                    {/* Items List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                        {!selectedCategoryId ? (
                            <Flex
                                align="center"
                                justify="center"
                                vertical
                                gap={8}
                                style={{ height: '100%', opacity: 0.5 }}
                            >
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    👈 Click a category to see its items
                                </Text>
                            </Flex>
                        ) : itemRows.length === 0 ? (
                            <Flex
                                align="center"
                                justify="center"
                                vertical
                                gap={8}
                                style={{ height: '100%', opacity: 0.5 }}
                            >
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    No items in this category
                                </Text>
                            </Flex>
                        ) : (
                            <DndContext
                                onDragStart={({ active }) => setDraggingItem(active)}
                                onDragCancel={() => setDraggingItem(null)}
                                onDragEnd={handleItemDragEnd}
                                collisionDetection={rectIntersection}
                            >
                                <SortableContext
                                    items={itemRows.map((row) => row.uid)}
                                    strategy={rectSortingStrategy}
                                >
                                    <Flex vertical gap={8}>
                                        {itemRows.map((item, index) => (
                                            <ReorderSortableItem
                                                key={item.uid}
                                                label={item.label}
                                                index={index}
                                                uid={item.uid}
                                                onClick={() => { }} // Items don't need click action
                                            />
                                        ))}
                                    </Flex>
                                </SortableContext>
                                <DragOverlay>
                                    {draggingItem?.id ? (
                                        <Flex
                                            justify="center"
                                            align="center"
                                            style={{
                                                background: token.colorBgBase,
                                                width: '100%',
                                                height: 40,
                                                border: `2px solid ${token.colorPrimary}`,
                                                borderRadius: 6,
                                                paddingInline: 12,
                                            }}
                                        >
                                            <Text style={{ fontSize: 13 }}>
                                                {itemRows.find(r => r.uid === draggingItem.id)?.label || ''}
                                            </Text>
                                        </Flex>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        )}
                    </div>
                </Flex>
            </Flex>
        </Modal>
    );
};

export default ReorderMenuModal;
