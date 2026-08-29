import { useOfferingLabels } from '@hook/useOfferingLabels';
import { labelConfirmDialog } from '@lib/accessibility/antConfirmDialog';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { removeObjRef } from '@util/utils';
import { Alert, Button, Checkbox, Flex, Input, Modal, Tag, Typography, theme } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { LuHelpCircle } from 'react-icons/lu';
import { Project, ProjectFileType } from '../types';

const { Text, Title } = Typography;

export type BulkStatusAction = 'activate' | 'deactivate';

interface BulkStatusMenuModalProps {
    open: boolean;
    projectData: Project;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
}

interface CategoryRow {
    id: string;
    label: string;
    fileUid: string;
    fileName: string;
    currentStatus: boolean;
}

interface ItemRow {
    id: string;
    label: string;
    categoryId: string;
    fileUid: string;
    currentStatus: boolean;
}

// Build all categories from all files
function buildAllCategoryRows(files: ProjectFileType[], activeLang: string): CategoryRow[] {
    const rows: CategoryRow[] = [];
    files?.forEach(file => {
        if (!file.extractedData?.data?.categories) return;
        file.extractedData.data.categories.forEach(cat => {
            rows.push({
                id: cat.id,
                label: cat.name?.[activeLang] || 'Untitled category',
                fileUid: file.uid,
                fileName: file.name || 'Untitled file',
                currentStatus: cat.active ?? true
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
                id: item.id,
                label: item.name?.[activeLang] || 'Untitled item',
                categoryId: categoryId,
                fileUid: file.uid,
                currentStatus: item.active ?? true
            });
        });
    });
    return rows;
}

const BulkStatusMenuModal = ({ open, projectData, onClose, onApply }: BulkStatusMenuModalProps) => {
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const activeLang = getProjectDefaultLanguage(projectData);

    // State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
    const [itemRows, setItemRows] = useState<ItemRow[]>([]);
    // Checkboxes now represent active status: checked = active, unchecked = inactive
    const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
    const [activeItems, setActiveItems] = useState<Set<string>>(new Set());
    // Store initial state for reset functionality
    const [initialActiveCategories, setInitialActiveCategories] = useState<Set<string>>(new Set());
    const [initialActiveItems, setInitialActiveItems] = useState<Set<string>>(new Set());
    // Search states
    const [categorySearch, setCategorySearch] = useState('');
    const [itemSearch, setItemSearch] = useState('');

    // Initialize data when modal opens
    const initializeOpenState = useCallback(() => {
        const cats = buildAllCategoryRows(projectData.files || [], activeLang);
        setCategoryRows(cats);

        // Initialize checkboxes with current active status
        const activeCats = new Set(cats.filter(c => c.currentStatus).map(c => c.id));
        setActiveCategories(activeCats);
        setInitialActiveCategories(new Set(activeCats)); // Store initial state

        // Auto-select first category
        if (cats.length > 0) {
            const firstCat = cats[0];
            setSelectedCategoryId(firstCat.id);
            const items = buildItemsForCategory(projectData.files || [], firstCat.id, activeLang);
            setItemRows(items);

            // Initialize items with current active status
            const activeItms = new Set(items.filter(i => i.currentStatus).map(i => i.id));
            setActiveItems(activeItms);
            setInitialActiveItems(new Set(activeItms)); // Store initial state
        }

        // Reset search
        setCategorySearch('');
        setItemSearch('');
    }, [activeLang, projectData.files]);

    useEffect(() => {
        if (!open) return;
        initializeOpenState();
    }, [initializeOpenState, open]);

    // When category is clicked, load its items
    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        const items = buildItemsForCategory(projectData.files || [], categoryId, activeLang);
        setItemRows(items);

        // Initialize items checkboxes with current active status
        const activeItms = new Set(items.filter(i => i.currentStatus).map(i => i.id));
        setActiveItems(activeItms);
        setInitialActiveItems(new Set(activeItms)); // Update initial state for new category
    };

    // Reset to initial state
    const handleReset = () => {
        setActiveCategories(new Set(initialActiveCategories));
        setActiveItems(new Set(initialActiveItems));
        setCategorySearch('');
        setItemSearch('');
    };

    // Handle close with confirmation if changes exist
    const handleClose = () => {
        if (hasChanges) {
            Modal.confirm({
                title: 'Unsaved Changes',
                modalRender: labelConfirmDialog('Unsaved Changes'),
                icon: <LuHelpCircle />,
                content: 'You have unsaved changes. Are you sure you want to close?',
                okText: 'Discard Changes',
                okType: 'danger',
                cancelText: 'Keep Editing',
                onOk: onClose,
            });
        } else {
            onClose();
        }
    };

    // Toggle category active status
    const handleCategoryCheck = (categoryId: string, checked: boolean) => {
        const newActive = new Set(activeCategories);
        if (checked) {
            newActive.add(categoryId);
        } else {
            newActive.delete(categoryId);
        }
        setActiveCategories(newActive);
    };

    // Toggle item active status
    const handleItemCheck = (itemId: string, checked: boolean) => {
        const newActive = new Set(activeItems);
        if (checked) {
            newActive.add(itemId);
        } else {
            newActive.delete(itemId);
        }
        setActiveItems(newActive);
    };

    // Activate/Deactivate all categories
    const handleSelectAllCategories = (checked: boolean) => {
        if (checked) {
            setActiveCategories(new Set(categoryRows.map(c => c.id)));
        } else {
            setActiveCategories(new Set());
        }
    };

    // Activate/Deactivate all items
    const handleSelectAllItems = (checked: boolean) => {
        if (checked) {
            setActiveItems(new Set(itemRows.map(i => i.id)));
        } else {
            setActiveItems(new Set());
        }
    };

    // Apply changes
    const handleApply = () => {
        if (!hasChanges) return;

        const updatedProject = removeObjRef(projectData);

        // Update all categories based on checkbox state
        updatedProject.files?.forEach(file => {
            if (!file.extractedData?.data?.categories) return;
            file.extractedData.data.categories = file.extractedData.data.categories.map(cat => {
                // Checkbox checked = active, unchecked = inactive
                return { ...cat, active: activeCategories.has(cat.id) };
            });
        });

        // Update all items based on checkbox state
        updatedProject.files?.forEach(file => {
            if (!file.extractedData?.data?.items) return;
            file.extractedData.data.items = file.extractedData.data.items.map(item => {
                // Checkbox checked = active, unchecked = inactive
                return { ...item, active: activeItems.has(item.id) };
            });
        });

        onApply(updatedProject);
        onClose();
    };

    // Filter categories and items based on search
    const filteredCategories = categoryRows.filter(cat =>
        cat.label.toLowerCase().includes(categorySearch.toLowerCase())
    );
    const filteredItems = itemRows.filter(item =>
        item.label.toLowerCase().includes(itemSearch.toLowerCase())
    );

    const allCategoriesChecked = categoryRows.length > 0 && activeCategories.size === categoryRows.length;
    const allItemsChecked = itemRows.length > 0 && activeItems.size === itemRows.length;

    // Count changes made
    const categoriesChanged = categoryRows.filter(c =>
        (activeCategories.has(c.id) !== c.currentStatus)
    ).length;
    const itemsChanged = itemRows.filter(i =>
        (activeItems.has(i.id) !== i.currentStatus)
    ).length;

    // Detect if any changes were made
    const hasChanges = categoriesChanged > 0 || itemsChanged > 0;

    return (
        <Modal
            centered
            title={
                <Flex vertical gap={4}>
                    <Title level={4} style={{ margin: 0 }}>
                        Bulk Active / Inactive
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Control which categories and {labels.itemsPlural} appear on your {labels.offeringLower}
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={handleClose}
            closable={{ 'aria-label': 'Close Bulk Active / Inactive' }}
            maskClosable={false}
            styles={{ mask: { backdropFilter: 'blur(6px)' } }}
            width={900}
            footer={
                <Flex justify="space-between" align="center">
                    <Flex vertical gap={4}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {categoriesChanged + itemsChanged > 0
                                ? `${categoriesChanged + itemsChanged} ${categoriesChanged + itemsChanged === 1 ? 'change' : 'changes'} to apply`
                                : 'No changes made'}
                        </Text>
                    </Flex>
                    <Flex gap={8}>
                        <Button onClick={handleReset} disabled={!hasChanges}>
                            Reset
                        </Button>
                        {hasChanges && <Button onClick={handleClose}>Cancel</Button>}
                        <Button
                            type="primary"
                            onClick={hasChanges ? handleApply : handleClose}
                        >
                            {categoriesChanged + itemsChanged > 0
                                ? `Apply ${categoriesChanged + itemsChanged} ${categoriesChanged + itemsChanged === 1 ? 'Change' : 'Changes'}`
                                : 'Close'}
                        </Button>
                    </Flex>
                </Flex>
            }
        >
            <Flex vertical gap={12}>
                {/* User-Friendly Instructions */}
                <Alert
                    message={
                        <Text strong style={{ fontSize: 12 }}>
                            ✓ Checked = Active (visible) • ☐ Unchecked = Inactive (hidden)
                        </Text>
                    }
                    description={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            💡 Uncheck items to hide them when out of stock. Check them again anytime.
                        </Text>
                    }
                    type="info"
                    showIcon={false}
                    style={{
                        marginBottom: 0,
                        padding: '8px 12px',
                    }}
                />

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
                            vertical
                            style={{
                                borderBottom: `1px solid ${token.colorBorder}`,
                                background: token.colorBgLayout,
                            }}
                        >
                            <Flex
                                align="center"
                                justify="space-between"
                                style={{ padding: '12px 16px' }}
                            >
                                <Flex align="center" gap={8}>
                                    <Checkbox
                                        aria-label="Set all categories active"
                                        checked={allCategoriesChecked}
                                        indeterminate={activeCategories.size > 0 && !allCategoriesChecked}
                                        onChange={(e) => handleSelectAllCategories(e.target.checked)}
                                    />
                                    <Text strong style={{ fontSize: 13 }}>
                                        Categories
                                    </Text>
                                    <Tag color="blue" style={{ margin: 0 }}>
                                        {filteredCategories.length}/{categoryRows.length}
                                    </Tag>
                                </Flex>
                            </Flex>
                            {/* Search Input */}
                            <div style={{ padding: '0 12px 12px 12px' }}>
                                <Input
                                    placeholder="Search categories..."
                                    value={categorySearch}
                                    onChange={(e) => setCategorySearch(e.target.value)}
                                    allowClear
                                    style={{ fontSize: 12 }}
                                />
                            </div>
                        </Flex>

                        {/* Categories List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                            {filteredCategories.length === 0 ? (
                                <Flex
                                    align="center"
                                    justify="center"
                                    vertical
                                    gap={8}
                                    style={{ height: '100%', opacity: 0.5 }}
                                >
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        No categories found
                                    </Text>
                                </Flex>
                            ) : (
                                <Flex vertical gap={8}>
                                    {filteredCategories.map((cat) => (
                                        <Flex
                                            key={cat.id}
                                            align="center"
                                            gap={8}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: 6,
                                                border: `2px solid ${selectedCategoryId === cat.id ? token.colorPrimary : token.colorBorder}`,
                                                background: selectedCategoryId === cat.id ? token.colorPrimaryBg : token.colorBgBase,
                                            }}
                                        >
                                            <Checkbox
                                                aria-label={`Set ${cat.label} active`}
                                                checked={activeCategories.has(cat.id)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleCategoryCheck(cat.id, e.target.checked);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <button
                                                type="button"
                                                aria-label={`View ${cat.label} items`}
                                                aria-pressed={selectedCategoryId === cat.id}
                                                onClick={() => handleCategoryClick(cat.id)}
                                                style={{
                                                    flex: 1,
                                                    border: 0,
                                                    padding: 0,
                                                    background: 'transparent',
                                                    color: 'inherit',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                }}
                                            >
                                                <Flex vertical>
                                                    <Text style={{ fontSize: 13, fontWeight: selectedCategoryId === cat.id ? 600 : 400 }}>
                                                        {cat.label}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: 10 }}>
                                                        {cat.fileName} • {cat.currentStatus ? 'Active' : 'Inactive'}
                                                    </Text>
                                                </Flex>
                                            </button>
                                        </Flex>
                                    ))}
                                </Flex>
                            )}
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
                            vertical
                            style={{
                                borderBottom: `1px solid ${token.colorBorder}`,
                                background: token.colorBgLayout,
                            }}
                        >
                            <Flex
                                align="center"
                                justify="space-between"
                                style={{ padding: '12px 16px' }}
                            >
                                <Flex align="center" gap={8}>
                                    {itemRows.length > 0 && (
                                        <Checkbox
                                            aria-label="Set all items active"
                                            checked={allItemsChecked}
                                            indeterminate={activeItems.size > 0 && !allItemsChecked}
                                            onChange={(e) => handleSelectAllItems(e.target.checked)}
                                        />
                                    )}
                                    <Text strong style={{ fontSize: 13 }}>
                                        Items
                                    </Text>
                                    {itemRows.length > 0 && (
                                        <Tag color="green" style={{ margin: 0 }}>
                                            {filteredItems.length}/{itemRows.length}
                                        </Tag>
                                    )}
                                </Flex>
                            </Flex>
                            {/* Search Input */}
                            {itemRows.length > 0 && (
                                <div style={{ padding: '0 12px 12px 12px' }}>
                                    <Input
                                        placeholder="Search items..."
                                        value={itemSearch}
                                        onChange={(e) => setItemSearch(e.target.value)}
                                        allowClear
                                        style={{ fontSize: 12 }}
                                    />
                                </div>
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
                            ) : filteredItems.length === 0 ? (
                                <Flex
                                    align="center"
                                    justify="center"
                                    vertical
                                    gap={8}
                                    style={{ height: '100%', opacity: 0.5 }}
                                >
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        No items found
                                    </Text>
                                </Flex>
                            ) : (
                                <Flex vertical gap={8}>
                                    {filteredItems.map((item) => (
                                        <Flex
                                            key={item.id}
                                            align="center"
                                            gap={8}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: 6,
                                                border: `1px solid ${token.colorBorder}`,
                                                background: token.colorBgBase,
                                            }}
                                        >
                                            <Checkbox
                                                aria-label={`Set ${item.label} active`}
                                                checked={activeItems.has(item.id)}
                                                onChange={(e) => handleItemCheck(item.id, e.target.checked)}
                                            />
                                            <Flex vertical style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13 }}>
                                                    {item.label}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    {item.currentStatus ? 'Active' : 'Inactive'}
                                                </Text>
                                            </Flex>
                                        </Flex>
                                    ))}
                                </Flex>
                            )}
                        </div>
                    </Flex>
                </Flex>
            </Flex>
        </Modal>
    );
};

export default BulkStatusMenuModal;
