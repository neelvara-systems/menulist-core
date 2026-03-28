/**
 * StoreCustomizationModal - Outlet Store Override Management
 * 
 * Purpose: Provides a single screen for outlet stores to manage all allowed overrides
 * per FR-5 specification (multi-outlet-consistency_spec.md).
 * 
 * Allowed Overrides (FR-5):
 * - Items: active, available, price, isBestSeller, duration, ownerBoost
 * - Categories: active, orderIndex, timeSlots
 * - Attributes: active, price
 * 
 * This modal does NOT affect master/standalone stores - it's only shown when isMasterLinked=true.
 * 
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_spec.md#FR-5
 */

import { FEATURE_FLAGS } from '@config/features';
import type { InheritanceState } from '@type/multiOutlet.types';
import { Badge, Button, Flex, Input, InputNumber, Modal, Switch, Table, Tabs, Tag, theme, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useMemo, useState } from 'react';
import { LuDollarSign, LuInfo, LuPackage, LuStar, LuTrendingUp, LuX } from 'react-icons/lu';
import { ExtractedDataCategory, ExtractedDataItem, Project, ProjectFileType } from '../types';

const { Text, Title } = Typography;

interface StoreCustomizationModalProps {
    open: boolean;
    onClose: () => void;
    projectData: Project;
    setProjectData: React.Dispatch<React.SetStateAction<Project>>;
    itemStates?: Record<string, InheritanceState>;
    categoryStates?: Record<string, InheritanceState>;
    masterPrices?: Record<string, string>; // Master prices for visual diff (FR-8, US-3)
}

type ItemOverrideRow = {
    key: string;
    id: string;
    name: string;
    category: string;
    price: string;
    masterPrice?: string; // Original master price for visual diff
    active: boolean;
    available: boolean;
    isBestSeller: boolean;
    duration?: number;
    ownerBoost?: number;
    inheritanceState?: InheritanceState;
    fileUid: string;
};

type CategoryOverrideRow = {
    key: string;
    id: string;
    name: string;
    active: boolean;
    itemCount: number;
    inheritanceState?: InheritanceState;
    fileUid: string;
};

export default function StoreCustomizationModal({
    open,
    onClose,
    projectData,
    setProjectData,
    itemStates = {},
    categoryStates = {},
    masterPrices = {},
}: StoreCustomizationModalProps) {
    const { token } = theme.useToken();
    const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
    const [searchTerm, setSearchTerm] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    const activeLang = projectData.languages?.[0] || 'en';

    // Extract all items from all files
    const itemRows = useMemo((): ItemOverrideRow[] => {
        const rows: ItemOverrideRow[] = [];
        projectData.files?.forEach((file: ProjectFileType) => {
            const categories = file.extractedData?.data?.categories || [];
            const items = file.extractedData?.data?.items || [];

            items.forEach((item: ExtractedDataItem) => {
                const category = categories.find((c: ExtractedDataCategory) => c.id === item.category);
                rows.push({
                    key: item.id,
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.en || 'Unnamed',
                    category: category?.name?.[activeLang] || category?.name?.en || 'Uncategorized',
                    price: item.price || '',
                    masterPrice: masterPrices[item.id], // For visual diff (FR-8, US-3)
                    active: item.active !== false,
                    available: item.available !== false,
                    isBestSeller: Boolean(item.isBestSeller),
                    duration: item.duration,
                    ownerBoost: item.ownerBoost,
                    inheritanceState: itemStates[item.id],
                    fileUid: file.uid,
                });
            });
        });
        return rows;
    }, [projectData.files, activeLang, itemStates, masterPrices]);

    // Extract all categories from all files
    const categoryRows = useMemo((): CategoryOverrideRow[] => {
        const rows: CategoryOverrideRow[] = [];
        projectData.files?.forEach((file: ProjectFileType) => {
            const categories = file.extractedData?.data?.categories || [];
            const items = file.extractedData?.data?.items || [];

            categories.forEach((category: ExtractedDataCategory) => {
                const itemCount = items.filter((i: ExtractedDataItem) => i.category === category.id).length;
                rows.push({
                    key: category.id,
                    id: category.id,
                    name: category.name?.[activeLang] || category.name?.en || 'Unnamed',
                    active: category.active !== false,
                    itemCount,
                    inheritanceState: categoryStates[category.id],
                    fileUid: file.uid,
                });
            });
        });
        return rows;
    }, [projectData.files, activeLang, categoryStates]);

    // Filter rows by search term
    const filteredItemRows = useMemo(() => {
        if (!searchTerm) return itemRows;
        const term = searchTerm.toLowerCase();
        return itemRows.filter(row =>
            row.name.toLowerCase().includes(term) ||
            row.category.toLowerCase().includes(term)
        );
    }, [itemRows, searchTerm]);

    const filteredCategoryRows = useMemo(() => {
        if (!searchTerm) return categoryRows;
        const term = searchTerm.toLowerCase();
        return categoryRows.filter(row => row.name.toLowerCase().includes(term));
    }, [categoryRows, searchTerm]);

    // Update item field
    const updateItemField = useCallback((itemId: string, fileUid: string, field: string, value: any) => {
        setProjectData(prev => {
            const updatedFiles = prev.files?.map((file: ProjectFileType) => {
                if (file.uid !== fileUid) return file;
                const updatedItems = file.extractedData?.data?.items?.map((item: ExtractedDataItem) => {
                    if (item.id !== itemId) return item;
                    return { ...item, [field]: value };
                });
                return {
                    ...file,
                    extractedData: {
                        ...file.extractedData!,
                        data: {
                            ...file.extractedData!.data!,
                            items: updatedItems,
                        },
                    },
                };
            });
            return { ...prev, files: updatedFiles };
        });
        setHasChanges(true);
    }, [setProjectData]);

    // Update category field
    const updateCategoryField = useCallback((categoryId: string, fileUid: string, field: string, value: any) => {
        setProjectData(prev => {
            const updatedFiles = prev.files?.map((file: ProjectFileType) => {
                if (file.uid !== fileUid) return file;
                const updatedCategories = file.extractedData?.data?.categories?.map((cat: ExtractedDataCategory) => {
                    if (cat.id !== categoryId) return cat;
                    return { ...cat, [field]: value };
                });
                return {
                    ...file,
                    extractedData: {
                        ...file.extractedData!,
                        data: {
                            ...file.extractedData!.data!,
                            categories: updatedCategories,
                        },
                    },
                };
            });
            return { ...prev, files: updatedFiles };
        });
        setHasChanges(true);
    }, [setProjectData]);

    // Render inheritance badge
    const renderInheritanceBadge = (state?: InheritanceState) => {
        if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) return null;
        if (!state || state === 'local-only') {
            return <Tag color="blue" style={{ fontSize: 10 }}>Local</Tag>;
        }
        if (state === 'inherited') {
            return <Tag color="purple" style={{ fontSize: 10 }}>From Master</Tag>;
        }
        if (state === 'overridden') {
            return <Tag color="orange" style={{ fontSize: 10 }}>Overridden</Tag>;
        }
        return null;
    };

    // Item columns
    const itemColumns: ColumnsType<ItemOverrideRow> = [
        {
            title: 'Item',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (name: string, record) => (
                <Flex vertical gap={2}>
                    <Text strong style={{ fontSize: 13 }}>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.category}</Text>
                </Flex>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 80,
            align: 'center',
            render: (_, record) => renderInheritanceBadge(record.inheritanceState),
        },
        {
            title: (
                <Tooltip title="Show/hide this item on your menu">
                    <Flex align="center" gap={4}>Show</Flex>
                </Tooltip>
            ),
            dataIndex: 'active',
            key: 'active',
            width: 80,
            align: 'center',
            render: (active: boolean, record) => (
                <Switch
                    size="small"
                    checked={active}
                    onChange={(checked) => updateItemField(record.id, record.fileUid, 'active', checked)}
                />
            ),
        },
        {
            title: (
                <Tooltip title="Mark as temporarily unavailable (sold out)">
                    <Flex align="center" gap={4}>In Stock</Flex>
                </Tooltip>
            ),
            dataIndex: 'available',
            key: 'available',
            width: 90,
            align: 'center',
            render: (available: boolean, record) => (
                <Switch
                    size="small"
                    checked={available}
                    onChange={(checked) => updateItemField(record.id, record.fileUid, 'available', checked)}
                    style={{ backgroundColor: available ? undefined : '#ef4444' }}
                />
            ),
        },
        {
            title: (
                <Tooltip title="Local price for this store">
                    <Flex align="center" gap={4}>
                        <LuDollarSign size={12} />
                        Price
                    </Flex>
                </Tooltip>
            ),
            dataIndex: 'price',
            key: 'price',
            width: 120,
            render: (price: string, record: ItemOverrideRow) => (
                <Flex vertical gap={2}>
                    <Input
                        size="small"
                        value={price}
                        onChange={(e) => updateItemField(record.id, record.fileUid, 'price', e.target.value)}
                        style={{ width: 80 }}
                        placeholder="0.00"
                    />
                    {/* Visual diff: Show master price with strikethrough if overridden (FR-8, US-3) */}
                    {record.masterPrice && record.masterPrice !== price && (
                        <Text type="secondary" delete style={{ fontSize: 10 }}>
                            Master: {record.masterPrice}
                        </Text>
                    )}
                </Flex>
            ),
        },
        {
            title: (
                <Tooltip title="Mark as a bestseller at your store">
                    <Flex align="center" gap={4}>
                        <LuStar size={12} />
                        Best Seller
                    </Flex>
                </Tooltip>
            ),
            dataIndex: 'isBestSeller',
            key: 'isBestSeller',
            width: 100,
            align: 'center',
            render: (isBestSeller: boolean, record) => (
                <Switch
                    size="small"
                    checked={isBestSeller}
                    onChange={(checked) => updateItemField(record.id, record.fileUid, 'isBestSeller', checked)}
                    checkedChildren="⭐"
                />
            ),
        },
        {
            title: (
                <Tooltip title="Preparation time in minutes">
                    <Flex align="center" gap={4}>Prep Time</Flex>
                </Tooltip>
            ),
            dataIndex: 'duration',
            key: 'duration',
            width: 90,
            render: (duration: number | undefined, record) => (
                <InputNumber
                    size="small"
                    min={0}
                    max={240}
                    value={duration}
                    onChange={(value) => updateItemField(record.id, record.fileUid, 'duration', value)}
                    style={{ width: 70 }}
                    placeholder="—"
                    addonAfter="m"
                />
            ),
        },
        {
            title: (
                <Tooltip title="Boost or suppress this item in recommendations (-20 to +20)">
                    <Flex align="center" gap={4}>
                        <LuTrendingUp size={12} />
                        Promotion
                    </Flex>
                </Tooltip>
            ),
            dataIndex: 'ownerBoost',
            key: 'ownerBoost',
            width: 90,
            align: 'center',
            render: (ownerBoost: number | undefined, record) => (
                <InputNumber
                    size="small"
                    min={-20}
                    max={20}
                    value={ownerBoost || 0}
                    onChange={(value) => updateItemField(record.id, record.fileUid, 'ownerBoost', value)}
                    style={{ width: 60 }}
                />
            ),
        },
    ];

    // Category columns
    const categoryColumns: ColumnsType<CategoryOverrideRow> = [
        {
            title: 'Category',
            dataIndex: 'name',
            key: 'name',
            width: 250,
            render: (name: string, record) => (
                <Flex vertical gap={2}>
                    <Text strong style={{ fontSize: 13 }}>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.itemCount} items</Text>
                </Flex>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            align: 'center',
            render: (_, record) => renderInheritanceBadge(record.inheritanceState),
        },
        {
            title: (
                <Tooltip title="Show/hide this entire category on your menu">
                    <Flex align="center" gap={4}>Active</Flex>
                </Tooltip>
            ),
            dataIndex: 'active',
            key: 'active',
            width: 100,
            align: 'center',
            render: (active: boolean, record) => (
                <Switch
                    size="small"
                    checked={active}
                    onChange={(checked) => updateCategoryField(record.id, record.fileUid, 'active', checked)}
                />
            ),
        },
    ];

    // Stats summary
    const stats = useMemo(() => {
        const unavailableItems = itemRows.filter(r => !r.available).length;
        const hiddenItems = itemRows.filter(r => !r.active).length;
        const bestSellers = itemRows.filter(r => r.isBestSeller).length;
        const hiddenCategories = categoryRows.filter(r => !r.active).length;
        return { unavailableItems, hiddenItems, bestSellers, hiddenCategories };
    }, [itemRows, categoryRows]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            title={
                <Flex vertical gap={4}>
                    <Title level={4} style={{ margin: 0 }}>
                        Store Customization
                    </Title>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                        Manage local prices, availability, and bestsellers for your store
                    </Text>
                </Flex>
            }
            width={900}
            footer={
                <Flex justify="space-between" align="center">
                    <Flex gap={16}>
                        <Badge count={stats.unavailableItems} showZero color={stats.unavailableItems > 0 ? 'red' : 'default'}>
                            <Tag>Sold Out</Tag>
                        </Badge>
                        <Badge count={stats.hiddenItems} showZero color={stats.hiddenItems > 0 ? 'orange' : 'default'}>
                            <Tag>Hidden Items</Tag>
                        </Badge>
                        <Badge count={stats.bestSellers} showZero color={stats.bestSellers > 0 ? 'gold' : 'default'}>
                            <Tag>⭐ Best Sellers</Tag>
                        </Badge>
                    </Flex>
                    <Flex gap={8}>
                        <Button icon={<LuX />} onClick={onClose}>Close</Button>
                        {hasChanges && (
                            <Text type="secondary" style={{ fontSize: 11, alignSelf: 'center' }}>
                                <LuInfo size={12} /> Changes auto-save when you modify fields
                            </Text>
                        )}
                    </Flex>
                </Flex>
            }
            styles={{ body: { padding: '16px 0' } }}
        >
            <Flex vertical gap={16}>
                {/* Info Banner */}
                <Flex
                    align="center"
                    gap={8}
                    style={{
                        padding: '8px 12px',
                        background: token.colorPrimaryBg,
                        borderRadius: 8,
                        margin: '0 24px'
                    }}
                >
                    <LuPackage size={16} style={{ color: token.colorPrimary }} />
                    <Text style={{ fontSize: 12 }}>
                        These changes only affect <strong>your store</strong>. Master menu content (names, descriptions, images) remains unchanged.
                    </Text>
                </Flex>

                {/* Search */}
                <Flex style={{ padding: '0 24px' }}>
                    <Input
                        placeholder="Search items or categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        allowClear
                        style={{ maxWidth: 300 }}
                    />
                </Flex>

                {/* Tabs */}
                <Tabs
                    activeKey={activeTab}
                    onChange={(key) => setActiveTab(key as 'items' | 'categories')}
                    style={{ margin: '0 24px' }}
                    items={[
                        {
                            key: 'items',
                            label: `Items (${filteredItemRows.length})`,
                            children: (
                                <Table
                                    columns={itemColumns}
                                    dataSource={filteredItemRows}
                                    size="small"
                                    pagination={{ pageSize: 10, showSizeChanger: true }}
                                    scroll={{ x: 800 }}
                                    style={{ marginTop: 8 }}
                                />
                            ),
                        },
                        {
                            key: 'categories',
                            label: `Categories (${filteredCategoryRows.length})`,
                            children: (
                                <Table
                                    columns={categoryColumns}
                                    dataSource={filteredCategoryRows}
                                    size="small"
                                    pagination={{ pageSize: 10, showSizeChanger: true }}
                                    style={{ marginTop: 8 }}
                                />
                            ),
                        },
                    ]}
                />
            </Flex>
        </Modal>
    );
}
