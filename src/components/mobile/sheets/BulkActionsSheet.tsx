'use client'

import { getProjectData, updateProject } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { removeObjRef } from '@util/utils';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuEye, LuEyeOff, LuToggleRight } from 'react-icons/lu';
import { Button, Card, Checkbox, Dialog, Empty, Flex, List, NavBar, Popup, SearchBar, Tag, Text, Title, Toast } from '../antd';

interface BulkActionsSheetProps {
    visible: boolean;
    onClose: () => void;
    projectId: string;
}

type BulkAction = 'availability' | 'showHide' | null;
type ItemEntry = {
    id: string;
    name: string;
    price: string;
    category: string;
    categoryName: string;
    available: boolean;
    active: boolean;
    fileUid: string;
};

export default function BulkActionsSheet({ visible, onClose, projectId }: BulkActionsSheetProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [projectData, setProjectData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<BulkAction>(null);
    const [search, setSearch] = useState('');
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        if (!visible || !projectId) return;
        setLoading(true);
        setSelectedIds(new Set());
        setAction(null);
        setSearch('');
        getProjectData(projectId)
            .then((data) => {
                setProjectData(data);
                setLoading(false);
            })
            .catch(() => {
                Toast.show({ content: 'Failed to load menu data', duration: 2000 });
                setLoading(false);
            });
    }, [projectId, visible]);

    const items: ItemEntry[] = useMemo(() => {
        if (!projectData) return [];
        const result: ItemEntry[] = [];
        const activeLang = projectData.languages?.[0] || 'en';

        projectData.files?.forEach((file: any) => {
            if (!file.extractedData?.data) return;
            const catMap: Record<string, string> = {};
            (file.extractedData.data.categories || []).forEach((category: any) => {
                catMap[category.id] = category.name?.[activeLang] || category.name?.en || 'Untitled';
            });

            (file.extractedData.data.items || []).forEach((item: any) => {
                result.push({
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.en || 'Untitled',
                    price: item.price || '',
                    category: item.category,
                    categoryName: catMap[item.category] || 'Uncategorized',
                    available: item.available !== false,
                    active: item.active ?? true,
                    fileUid: file.uid,
                });
            });
        });

        return result;
    }, [projectData]);

    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const term = search.toLowerCase();
        return items.filter((item) => item.name.toLowerCase().includes(term) || item.categoryName.toLowerCase().includes(term));
    }, [items, search]);

    const categories = useMemo(() => {
        const map = new Map<string, ItemEntry[]>();
        filteredItems.forEach((item) => {
            if (!map.has(item.categoryName)) map.set(item.categoryName, []);
            map.get(item.categoryName)?.push(item);
        });
        return map;
    }, [filteredItems]);

    const toggleItem = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    };

    const handleApply = async (target: string) => {
        if (selectedIds.size === 0) return;

        const actionLabel = action === 'availability'
            ? (target === 'available' ? 'Mark available' : 'Mark sold out')
            : (target === 'show' ? 'Show on menu' : 'Hide from menu');

        Dialog.confirm({
            content: `${actionLabel} for ${selectedIds.size} items?`,
            confirmText: 'Apply',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setApplying(true);
                try {
                    const updated = removeObjRef(projectData);
                    updated.files?.forEach((file: any) => {
                        if (!file.extractedData?.data?.items) return;
                        file.extractedData.data.items = file.extractedData.data.items.map((item: any) => {
                            if (!selectedIds.has(item.id)) return item;
                            if (action === 'availability') {
                                return { ...item, available: target === 'available' };
                            }
                            if (action === 'showHide') {
                                return { ...item, active: target === 'show' };
                            }
                            return item;
                        });
                    });

                    await updateProject(updated);
                    setProjectData(updated);
                    setSelectedIds(new Set());
                    setAction(null);
                    Toast.show({ content: `${selectedIds.size} items updated`, duration: 1500 });
                } catch {
                    Toast.show({ content: 'Failed to apply changes', duration: 2000 });
                } finally {
                    setApplying(false);
                }
            },
        });
    };

    if (!visible) return null;

    if (!action) {
        return (
            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '50vh' }}
                destroyOnClose
                onMaskClick={onClose}
                position="bottom"
                visible={visible}
            >
                <Flex gap={16} style={{ height: '100%' }} vertical>
                    <Flex gap={4} vertical>
                        <Title level={4} style={{ margin: 0 }}>
                            Bulk Actions
                        </Title>
                        <Text type="secondary">Make changes to multiple items at once for {storeDetails?.name || 'your menu'}.</Text>
                    </Flex>

                    <Card onClick={() => setAction('availability')}>
                        <Flex align="center" gap={12}>
                            <LuToggleRight color="#1677ff" size={20} />
                            <Flex gap={2} vertical>
                                <Text strong>Change Availability</Text>
                                <Text type="secondary">Mark selected items as available or sold out.</Text>
                            </Flex>
                        </Flex>
                    </Card>

                    <Card onClick={() => setAction('showHide')}>
                        <Flex align="center" gap={12}>
                            <LuEyeOff color="#d97706" size={20} />
                            <Flex gap={2} vertical>
                                <Text strong>Show or Hide Items</Text>
                                <Text type="secondary">Control whether customers can see selected items.</Text>
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                        <Text type="secondary">Bulk pricing and category moves stay on desktop for now.</Text>
                    </Card>
                </Flex>
            </Popup>
        );
    }

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '90vh' }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar
                    onBack={() => setAction(null)}
                    right={<Tag color="processing">{selectedIds.size} selected</Tag>}
                    style={{ '--height': '48px' } as React.CSSProperties}
                >
                    {action === 'availability' ? 'Availability' : 'Show and Hide'}
                </NavBar>

                <Flex gap={12} style={{ padding: 16 }} vertical>
                    <SearchBar
                        onChange={setSearch}
                        placeholder="Search items"
                        value={search}
                    />

                    <Flex align="center" justify="space-between">
                        <Checkbox
                            checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                            indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
                            onChange={toggleAll}
                        >
                            <Text>Select all ({filteredItems.length})</Text>
                        </Checkbox>
                    </Flex>
                </Flex>

                <Flex style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }} vertical>
                    {loading ? (
                        <Card>
                            <Text type="secondary">Loading items...</Text>
                        </Card>
                    ) : categories.size === 0 ? (
                        <Empty description="No matching items" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Flex gap={16} vertical>
                            {Array.from(categories.entries()).map(([categoryName, categoryItems]) => (
                                <Card
                                    key={categoryName}
                                    size="small"
                                    title={<Text strong>{categoryName}</Text>}
                                >
                                    <List>
                                        {categoryItems.map((item) => (
                                            <List.Item
                                                key={item.id}
                                                description={
                                                    <Flex gap={8} wrap="wrap">
                                                        {item.price ? <Text type="secondary">{item.price}</Text> : null}
                                                        {!item.available ? <Tag color="warning">Sold Out</Tag> : null}
                                                        {!item.active ? <Tag>Hidden</Tag> : null}
                                                    </Flex>
                                                }
                                                onClick={() => toggleItem(item.id)}
                                                prefix={
                                                    <Checkbox
                                                        checked={selectedIds.has(item.id)}
                                                        onChange={() => toggleItem(item.id)}
                                                    />
                                                }
                                                title={<Text>{item.name}</Text>}
                                            />
                                        ))}
                                    </List>
                                </Card>
                            ))}
                        </Flex>
                    )}
                </Flex>

                {selectedIds.size > 0 ? (
                    <Card style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
                        {action === 'availability' ? (
                            <Flex gap={12}>
                                <Button block color="primary" loading={applying} onClick={() => handleApply('available')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuCheck size={16} />
                                        <Text>Available</Text>
                                    </Flex>
                                </Button>
                                <Button block color="warning" loading={applying} onClick={() => handleApply('unavailable')} size="large">
                                    Sold Out
                                </Button>
                            </Flex>
                        ) : (
                            <Flex gap={12}>
                                <Button block color="primary" loading={applying} onClick={() => handleApply('show')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuEye size={16} />
                                        <Text>Show</Text>
                                    </Flex>
                                </Button>
                                <Button block color="danger" loading={applying} onClick={() => handleApply('hide')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuEyeOff size={16} />
                                        <Text>Hide</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        )}
                    </Card>
                ) : null}
            </Flex>
        </Popup>
    );
}
