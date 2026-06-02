import { Button, Checkbox, Collapse, Flex, Input, Tag, Typography, theme } from 'antd';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { useMemo, useState } from 'react';
import { LuLock } from 'react-icons/lu';
import type { SelectedItemInfo, SelectionSummary } from '../../types/commandCenter.types';

const { Text } = Typography;
const { Panel } = Collapse;

interface SelectionContextProps {
    allItems: SelectedItemInfo[];
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    summary: SelectionSummary;
    currencySymbol: string;
}

export default function SelectionContext({
    allItems,
    selectedIds,
    onSelectionChange,
    summary,
    currencySymbol,
}: SelectionContextProps) {
    const { token } = theme.useToken();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Group items by category
    const categorizedItems = useMemo(() => {
        const map = new Map<string, SelectedItemInfo[]>();
        allItems.forEach((item) => {
            const key = item.categoryName;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        });
        return map;
    }, [allItems]);

    // Filter by search
    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) return categorizedItems;
        const term = searchTerm.toLowerCase();
        const filtered = new Map<string, SelectedItemInfo[]>();
        categorizedItems.forEach((items, catName) => {
            const matched = items.filter(
                (i) =>
                    i.name.toLowerCase().includes(term) ||
                    catName.toLowerCase().includes(term)
            );
            if (matched.length > 0) filtered.set(catName, matched);
        });
        return filtered;
    }, [categorizedItems, searchTerm]);

    const handleToggleItem = (itemId: string, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(itemId);
        else next.delete(itemId);
        onSelectionChange(next);
    };

    const handleToggleCategory = (catName: string, checked: boolean) => {
        const catItems = categorizedItems.get(catName) || [];
        const next = new Set(selectedIds);
        catItems.forEach((item) => {
            if (checked) next.add(item.id);
            else next.delete(item.id);
        });
        onSelectionChange(next);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onSelectionChange(new Set(allItems.map((i) => i.id)));
        } else {
            onSelectionChange(new Set());
        }
    };

    const handleExpandAll = () => {
        const allCategoryNames = Array.from(categorizedItems.keys());
        setExpandedCategories(allCategoryNames);
    };

    const handleCollapseAll = () => {
        setExpandedCategories([]);
    };

    const allSelected = allItems.length > 0 && selectedIds.size === allItems.length;
    const someSelected = selectedIds.size > 0 && !allSelected;
    const allExpanded = expandedCategories.length === categorizedItems.size && categorizedItems.size > 0;
    const someExpanded = expandedCategories.length > 0 && !allExpanded;

    return (
        <Flex
            vertical
            style={{
                width: '100%',
                minWidth: 240,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Flex
                vertical
                gap={8}
                style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgLayout,
                }}
            >
                <Flex align="center" justify="space-between">
                    <Text strong style={{ fontSize: 13 }}>Selection</Text>
                    <Flex align="center" gap={8}>
                        {selectedIds.size > 0 && (
                            <Button
                                size="small"
                                type="link"
                                onClick={() => onSelectionChange(new Set())}
                                style={{ height: 'auto', padding: 0, fontSize: 11 }}
                            >
                                Clear selection
                            </Button>
                        )}
                        <Tag color={selectedIds.size > 0 ? 'blue' : undefined}>
                            {selectedIds.size} selected
                        </Tag>
                    </Flex>
                </Flex>

                {/* Summary info */}
                {selectedIds.size > 0 && (
                    <Flex vertical gap={2}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {summary.outletName} &middot; {summary.categories.length} {summary.categories.length === 1 ? 'category' : 'categories'}
                        </Text>
                        {summary.lockedCount > 0 && (
                            <Flex align="center" gap={4}>
                                <LuLock style={{ fontSize: 10, color: token.colorTextSecondary }} />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    {summary.lockedCount} locked by master
                                </Text>
                            </Flex>
                        )}
                        {summary.inactiveCount > 0 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {summary.inactiveCount} hidden items included
                            </Text>
                        )}
                    </Flex>
                )}

                {/* Search */}
                <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    size="small"
                    style={{ fontSize: 12 }}
                />

                {/* Select all and expand/collapse */}
                <Flex justify="space-between" align="center">
                    <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{ fontSize: 12 }}
                    >
                        <Text style={{ fontSize: 12 }}>Select all ({allItems.length} items)</Text>
                    </Checkbox>
                    {categorizedItems.size > 0 && (
                        <Button
                            type="link"
                            size="small"
                            onClick={allExpanded ? handleCollapseAll : handleExpandAll}
                            style={{
                                fontSize: 11,
                                height: 'auto',
                                padding: '0 4px',
                                color: token.colorLink
                            }}
                        >
                            {allExpanded ? 'Collapse All' : someExpanded ? 'Collapse' : 'Expand All'}
                        </Button>
                    )}
                </Flex>
            </Flex>

            {/* Items list grouped by category with accordion */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                {filteredCategories.size === 0 ? (
                    <Flex
                        align="center"
                        justify="center"
                        style={{ height: '100%', opacity: 0.5 }}
                    >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {searchTerm ? 'No items match search' : 'No items in menu'}
                        </Text>
                    </Flex>
                ) : (
                    <Collapse
                        ghost
                        size="small"
                        activeKey={expandedCategories}
                        onChange={(keys) => setExpandedCategories(keys as string[])}
                        items={Array.from(filteredCategories.entries()).map(([catName, items]) => {
                            const catSelectedCount = items.filter((i) => selectedIds.has(i.id)).length;
                            const allCatSelected = catSelectedCount === items.length;
                            const someCatSelected = catSelectedCount > 0 && !allCatSelected;

                            return {
                                key: catName,
                                label: (
                                    <Flex align="center" gap={6}>
                                        <Checkbox
                                            checked={allCatSelected}
                                            indeterminate={someCatSelected}
                                            onChange={(e) => handleToggleCategory(catName, e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Text strong style={{ fontSize: 12, flex: 1 }}>
                                            {catName}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                            {catSelectedCount}/{items.length}
                                        </Text>
                                    </Flex>
                                ),
                                children: (
                                    <Flex vertical gap={2}>
                                        {items.map((item) => (
                                            <Flex
                                                key={item.id}
                                                align="center"
                                                gap={6}
                                                style={{
                                                    padding: '3px 8px 3px 24px',
                                                    borderRadius: 4,
                                                    opacity: item.isLocked ? 0.6 : 1,
                                                }}
                                            >
                                                <Checkbox
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                                                    <Flex align="center" gap={4}>
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                        {item.isLocked && (
                                                            <LuLock style={{ fontSize: 10, color: token.colorTextQuaternary, flexShrink: 0 }} />
                                                        )}
                                                    </Flex>
                                                    {item.price && (
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            {item.active ? '' : '(hidden) '}
                                                            {formatMenuPrice(item.price, currencySymbol)}
                                                            {item.attributes && item.attributes.length > 0
                                                                ? ` + ${item.attributes.length} variants`
                                                                : ''}
                                                        </Text>
                                                    )}
                                                </Flex>
                                            </Flex>
                                        ))}
                                    </Flex>
                                ),
                            };
                        })}
                    />
                )}
            </div>
        </Flex>
    );
}
