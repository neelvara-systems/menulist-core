'use client'

import { getProjectData, getProjectsList, updateProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { removeObjRef } from '@util/utils';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCamera, LuCheck, LuLayers, LuPlus } from 'react-icons/lu';
import { Button, Card, DotLoading, Empty, Flex, FloatingBubble, List, Popup, PullToRefresh, SearchBar, Switch, Tag, Text, Title, Toast } from '../antd';
import type { MobileMenuItemType as MenuItemType } from '../types';

const ItemEditSheet = dynamic(() => import('../sheets/ItemEditSheet'), { ssr: false });
const AddItemSheet = dynamic(() => import('../sheets/AddItemSheet'), { ssr: false });
const MenuUploadSheet = dynamic(() => import('../sheets/MenuUploadSheet'), { ssr: false });
const BulkActionsSheet = dynamic(() => import('../sheets/BulkActionsSheet'), { ssr: false });
const MobileMenuQualitySignals = dynamic(() => import('../components/MenuQualitySignals'), { ssr: false });

type CategoryOption = { id: string; name: string };

export default function MobileMenuScreen() {
    const t = useTranslations('MobileMenu');
    const tDashboard = useTranslations('MobileDashboard');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const currencySymbol = storeDetails?.currencySymbol || '₹';
    const [searchQuery, setSearchQuery] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [menuData, setMenuData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const { data: dashboardData } = useOwnerDashboard(menuData?.projectId ? { projectId: menuData.projectId } : undefined);

    const fetchMenuData = useCallback(async (projectId?: string) => {
        try {
            setIsLoading(true);
            const result = await getProjectsList();
            const projects = result?.projects || [];
            setProjectsList(projects);

            let targetProject: any;
            if (projectId) {
                targetProject = projects.find((project: any) => project.projectId === projectId);
            } else {
                targetProject = projects.find((project: any) => project.isDefault) || projects[0];
            }

            if (targetProject?.projectId) {
                const fullProject = await getProjectData(targetProject.projectId);
                setMenuData(fullProject);
            }
        } catch (err) {
            console.error('Failed to load menu data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (storeDetails?.storeId) {
            fetchMenuData();
        }
    }, [storeDetails?.storeId, fetchMenuData]);

    const activeLang = useMemo(() => menuData?.languages?.[0] || 'en', [menuData?.languages]);

    const categoryOptions = useMemo<CategoryOption[]>(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, string>();
        menuData.files.forEach((file: any) => {
            const categories = file.extractedData?.data?.categories || [];
            categories.forEach((category: any) => {
                const label = category.name?.[activeLang] || category.name?.en || category.name || 'Uncategorized';
                if (!map.has(category.id)) map.set(category.id, label);
            });
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [activeLang, menuData?.files]);

    const menuItems = useMemo(() => {
        if (!menuData?.files) return [];
        const items: MenuItemType[] = [];
        menuData.files.forEach((file: any) => {
            if (file.extractedData?.data?.categories && Array.isArray(file.extractedData.data.categories)) {
                const categories = file.extractedData.data.categories;
                const categoryMap: Record<string, string> = {};
                categories.forEach((category: any) => {
                    categoryMap[category.id] = category.name?.[activeLang] || category.name?.en || category.name || 'Uncategorized';
                });
                const menuItems = file.extractedData.data.items || [];
                categories.forEach((category: any) => {
                    const categoryName = categoryMap[category.id] || 'Uncategorized';
                    const categoryItems = menuItems.filter((item: any) => item.category === category.id);
                    categoryItems.forEach((item: any) => {
                        const itemName = item.name?.[activeLang] || item.name?.en || item.name || 'Unnamed Item';
                        const itemDescription = item.description?.[activeLang] || item.description?.en || item.description || '';
                        const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
                        const available = item.available !== false;
                        const active = item.active !== false;
                        items.push({
                            id: item.id || `${categoryName}-${itemName}`,
                            name: itemName,
                            price: price,
                            available,
                            active,
                            categoryId: item.category,
                            categoryName,
                            description: itemDescription,
                            image: item.images?.[0]?.url || item.image || '',
                        });
                    });
                });
            }
        });
        return items;
    }, [activeLang, menuData]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return menuItems;
        const q = searchQuery.toLowerCase();
        return menuItems.filter(
            (item) => item.name.toLowerCase().includes(q) || item.categoryName?.toLowerCase().includes(q)
        );
    }, [menuItems, searchQuery]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, MenuItemType[]> = {};
        filteredItems.forEach((item) => {
            const category = item.categoryName || 'Uncategorized';
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
        });
        return groups;
    }, [filteredItems]);
    const categoryCount = useMemo(() => {
        const categories = new Set(menuItems.map((item) => item.categoryName || 'Uncategorized'));
        return categories.size;
    }, [menuItems]);

    const handleToggleAvailability = useCallback(async (item: MenuItemType) => {
        if (!menuData) return;
        const newAvailability = !item.available;
        const previous = menuData;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((menuItem: any) => {
                if (menuItem.id === item.id) {
                    menuItem.available = newAvailability;
                }
            });
        });
        setMenuData(updated);

        Toast.show({
            content: newAvailability ? t('available') : t('soldOut'),
            duration: 1000,
        });

        try {
            if (updated?.projectId) {
                await updateProject(updated);
            }
        } catch {
            setMenuData(previous);
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        }
    }, [menuData]);

    const handleRefresh = async () => {
        await fetchMenuData(menuData?.projectId);
    };

    const handleProjectSelect = async (projectId: string) => {
        setIsProjectSelectorOpen(false);
        await fetchMenuData(projectId);
        Toast.show({ content: t('projectSwitched'), duration: 1000 });
    };

    if (!storeDetails || isLoading) {
        return (
            <Flex align="center" justify="center" style={{ height: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    const overview = dashboardData?.overview;
    const yesterday = overview?.yesterday;
    const statusTone = overview?.status === 'working'
        ? { color: '#16a34a', bg: '#ecfdf5' }
        : overview?.status === 'low_activity'
            ? { color: '#f59e0b', bg: '#fffbeb' }
            : overview?.status === 'no_data'
                ? { color: '#9ca3af', bg: '#f3f4f6' }
                : { color: '#9ca3af', bg: '#f3f4f6' };
    const statusText = overview?.status === 'working'
        ? tDashboard('menuWorking', { offering: labels.offeringLower })
        : overview?.status === 'low_activity'
            ? tDashboard('lowActivity')
            : overview?.status === 'no_data'
                ? tDashboard('waitingFirstScan')
                : tDashboard('noDataYet');

    return (
        <Flex style={{ height: '100%' }} vertical>
            <Card style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
                <Flex gap={12} vertical>
                    {projectsList.length > 1 ? (
                        <Button fill="outline" onClick={() => setIsProjectSelectorOpen(true)} size="small">
                            <Flex align="center" gap={8} justify="space-between" style={{ width: '100%' }}>
                                <Flex align="center" gap={8}>
                                    <LuLayers size={16} />
                                    <Text>{menuData?.name || t('currentProject')}</Text>
                                </Flex>
                                <Tag>{t('itemsCount', { count: menuItems.length })}</Tag>
                            </Flex>
                        </Button>
                    ) : null}

                    {overview ? (
                        <Card size="small" style={{ backgroundColor: statusTone.bg }}>
                            <Flex gap={4} vertical>
                                <Text strong style={{ color: statusTone.color }}>
                                    {statusText}
                                </Text>
                                {yesterday ? (
                                    <Text type="secondary">
                                        {`Yesterday · ${yesterday.metrics?.menuVisits?.toLocaleString() || '0'} ${labels.scansLabel}`}
                                    </Text>
                                ) : (
                                    <Text type="secondary">{overview.statusMessage}</Text>
                                )}
                            </Flex>
                        </Card>
                    ) : null}

                    <SearchBar
                        onChange={setSearchQuery}
                        placeholder={t('searchPlaceholder', { items: labels.itemsPlural })}
                        value={searchQuery}
                    />

                    <Flex align="center" justify="space-between">
                        <Text type="secondary">
                            {`${menuItems.length} ${labels.itemsPlural} · ${categoryCount} categories`}
                        </Text>
                        {searchQuery ? <Tag>{t('itemsCount', { count: filteredItems.length })}</Tag> : null}
                    </Flex>

                    <Flex gap={8} wrap>
                        <Button fill="outline" onClick={() => setIsUploadSheetOpen(true)} size="small">
                            {t('uploadMenuPhoto', { offering: labels.offeringTitle })}
                        </Button>
                        <Button fill="outline" onClick={() => setIsBulkActionsOpen(true)} size="small">
                            Bulk actions
                        </Button>
                        <Button color="primary" onClick={() => setIsAddSheetOpen(true)} size="small">
                            Add item
                        </Button>
                    </Flex>
                </Flex>
            </Card>

            {menuData?.files ? (
                <Card style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
                    <MobileMenuQualitySignals files={menuData.files} />
                </Card>
            ) : null}

            <PullToRefresh onRefresh={handleRefresh}>
                <Flex gap={16} style={{ padding: 16 }} vertical>
                    {Object.keys(groupedItems).length === 0 ? (
                        !searchQuery && !menuData ? (
                            <Card>
                                <Flex align="center" gap={12} vertical>
                                    <Card
                                        size="small"
                                        style={{ backgroundColor: '#e6f7ff', borderRadius: 999, height: 80, width: 80 }}
                                    >
                                        <Flex align="center" justify="center" style={{ height: '100%' }}>
                                            <LuCamera color="#1677ff" size={36} />
                                        </Flex>
                                    </Card>
                                    <Title level={4} style={{ margin: 0 }}>
                                        {t('createYourMenu', { offering: labels.offeringTitle })}
                                    </Title>
                                    <Text type="secondary" style={{ textAlign: 'center' }}>
                                        {t('createYourMenuDesc', { offering: labels.offeringLower })}
                                    </Text>
                                    <Button color="primary" onClick={() => setIsUploadSheetOpen(true)} size="large">
                                        {t('uploadMenuPhoto', { offering: labels.offeringTitle })}
                                    </Button>
                                </Flex>
                            </Card>
                        ) : (
                            <Empty description={searchQuery ? t('noItemsFound') : t('noMenuItemsYet', { items: labels.itemsPlural })} />
                        )
                    ) : (
                        Object.entries(groupedItems).map(([category, items]) => (
                            <Card key={category} size="small" title={
                                <Flex align="center" justify="space-between">
                                    <Text strong>{category}</Text>
                                    <Tag>{t('itemsCount', { count: items.length })}</Tag>
                                </Flex>
                            }>
                                <List>
                                    {items.map((item) => (
                                        <List.Item
                                            key={item.id}
                                            onClick={() => setEditingItem(item)}
                                            extra={
                                                <Flex align="center" gap={8} wrap>
                                                    <Switch checked={item.available} onChange={() => handleToggleAvailability(item)} />
                                                    <Button fill="outline" onClick={(event) => {
                                                        event.stopPropagation();
                                                        setEditingItem(item);
                                                        setIsAddSheetOpen(true);
                                                    }} size="small">
                                                        {t('edit')}
                                                    </Button>
                                                </Flex>
                                            }
                                            title={<Text strong>{item.name}</Text>}
                                            description={
                                                <Flex gap={6} vertical>
                                                    {item.description ? <Text type="secondary">{item.description}</Text> : null}
                                                    <Flex align="center" gap={8} wrap>
                                                        <Tag color={item.available ? 'success' : 'warning'}>
                                                            {item.available ? t('available') : t('soldOut')}
                                                        </Tag>
                                                        {!item.active ? <Tag>Hidden</Tag> : null}
                                                        <Tag>{`${currencySymbol}${item.price}`}</Tag>
                                                    </Flex>
                                                </Flex>
                                            }
                                        />
                                    ))}
                                </List>
                            </Card>
                        ))
                    )}
                </Flex>
            </PullToRefresh>

            <FloatingBubble
                style={{
                    '--initial-position-bottom': '76px',
                    '--initial-position-right': '16px',
                    '--size': '52px',
                    '--background': 'var(--ant-color-primary, #1677ff)',
                } as React.CSSProperties}
                onClick={() => setIsAddSheetOpen(true)}
            >
                <LuPlus size={24} color="#fff" />
            </FloatingBubble>

            {editingItem ? (
                <ItemEditSheet
                    categories={categoryOptions}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onDelete={async (itemId) => {
                        if (!menuData) return;
                        const previous = menuData;
                        const updated = removeObjRef(menuData);
                        updated.files?.forEach((file: any) => {
                            if (file.extractedData?.data?.items) {
                                file.extractedData.data.items = file.extractedData.data.items.filter(
                                    (menuItem: any) => menuItem.id !== itemId
                                );
                            }
                        });
                        setMenuData(updated);
                        try {
                            if (updated?.projectId) {
                                await updateProject(updated);
                            }
                            setEditingItem(null);
                            Toast.show({ content: t('itemDeleted'), duration: 1000 });
                        } catch {
                            setMenuData(previous);
                            Toast.show({ content: t('failedToSync'), duration: 2000 });
                        }
                    }}
                    onSave={async (updatedItem) => {
                        if (!menuData) return;
                        const previous = menuData;
                        const updated = removeObjRef(menuData);
                        updated.files?.forEach((file: any) => {
                            file.extractedData?.data?.items?.forEach((menuItem: any, idx: number) => {
                                if (menuItem.id === editingItem.id) {
                                    const nextItem = { ...menuItem };
                                    if (updatedItem.name !== undefined) {
                                        const nextName = typeof menuItem.name === 'object' && menuItem.name ? { ...menuItem.name } : {};
                                        nextName[activeLang] = updatedItem.name;
                                        nextItem.name = nextName;
                                    }
                                    if (updatedItem.description !== undefined) {
                                        const nextDescription = typeof menuItem.description === 'object' && menuItem.description ? { ...menuItem.description } : {};
                                        nextDescription[activeLang] = updatedItem.description;
                                        nextItem.description = nextDescription;
                                    }
                                    if (updatedItem.price !== undefined) {
                                        nextItem.price = String(updatedItem.price);
                                    }
                                    if (updatedItem.available !== undefined) {
                                        nextItem.available = updatedItem.available;
                                    }
                                    if (updatedItem.active !== undefined) {
                                        nextItem.active = updatedItem.active;
                                    }
                                    if (updatedItem.categoryId) {
                                        nextItem.category = updatedItem.categoryId;
                                    }
                                    if (updatedItem.image !== undefined) {
                                        nextItem.images = updatedItem.image ? [{ url: updatedItem.image, name: `${updatedItem.name || menuItem.id}.jpg` }] : [];
                                    }
                                    file.extractedData.data.items[idx] = nextItem;
                                }
                            });
                        });
                        setMenuData(updated);
                        try {
                            if (updated?.projectId) {
                                await updateProject(updated);
                            }
                            setEditingItem(null);
                            Toast.show({ content: t('itemUpdated'), duration: 1000 });
                        } catch {
                            setMenuData(previous);
                            Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });
                        }
                    }}
                />
            ) : null}

            {isAddSheetOpen ? (
                <AddItemSheet
                    categories={categoryOptions}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    onClose={() => setIsAddSheetOpen(false)}
                    onSave={async (newItem) => {
                        if (!menuData) return;
                        const previous = menuData;
                        const updated = removeObjRef(menuData);
                        let targetFile = updated.files?.[0];
                        if (!targetFile) return;
                        if (!targetFile.extractedData) targetFile.extractedData = { data: { categories: [], items: [], languages: [] } };
                        if (!targetFile.extractedData.data) targetFile.extractedData.data = { categories: [], items: [], languages: [] };
                        if (!targetFile.extractedData.data.categories) targetFile.extractedData.data.categories = [];
                        if (!targetFile.extractedData.data.items) targetFile.extractedData.data.items = [];

                        let categoryId = newItem.categoryId;
                        if (!categoryId) {
                            categoryId = `cat-${Date.now()}`;
                            targetFile.extractedData.data.categories.push({
                                id: categoryId,
                                active: true,
                                name: { [activeLang]: newItem.categoryName || 'Uncategorized' },
                            });
                        }

                        targetFile.extractedData.data.items.push({
                            id: `item-${Date.now()}`,
                            name: { [activeLang]: newItem.name },
                            description: newItem.description ? { [activeLang]: newItem.description } : undefined,
                            price: String(newItem.price || 0),
                            category: categoryId,
                            active: true,
                            available: true,
                        });

                        setMenuData(updated);
                        try {
                            if (updated?.projectId) {
                                await updateProject(updated);
                            }
                            setIsAddSheetOpen(false);
                            Toast.show({ content: t('itemAdded'), duration: 1000 });
                        } catch {
                            setMenuData(previous);
                            Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });
                        }
                    }}
                />
            ) : null}

            {isUploadSheetOpen ? (
                <MenuUploadSheet
                    onClose={() => setIsUploadSheetOpen(false)}
                    onComplete={() => {
                        setIsUploadSheetOpen(false);
                        fetchMenuData();
                    }}
                />
            ) : null}

            <BulkActionsSheet
                projectId={menuData?.projectId || ''}
                visible={isBulkActionsOpen}
                onClose={() => { setIsBulkActionsOpen(false); fetchMenuData(menuData?.projectId); }}
            />

            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70vh' }}
                onMaskClick={() => setIsProjectSelectorOpen(false)}
                position="bottom"
                visible={isProjectSelectorOpen}
            >
                <Flex gap={12} vertical>
                    <Title level={4} style={{ margin: 0 }}>
                        {t('selectProject')}
                    </Title>
                    <List>
                        {projectsList.map((project: any) => (
                            <List.Item
                                key={project.projectId}
                                onClick={() => handleProjectSelect(project.projectId)}
                                prefix={<LuLayers color="#1677ff" size={18} />}
                                extra={project.projectId === menuData?.projectId ? <LuCheck color="#1677ff" size={18} /> : null}
                                title={<Text>{project.name || t('unnamedProject')}</Text>}
                                description={
                                    <Text type="secondary">
                                        {project.isDefault ? `${t('default')} • ` : ''}
                                        {t('itemsCount', { count: project.itemCount || 0 })}
                                    </Text>
                                }
                            />
                        ))}
                    </List>
                    <Button block fill="outline" onClick={() => setIsProjectSelectorOpen(false)}>
                        {t('cancel')}
                    </Button>
                </Flex>
            </Popup>
        </Flex>
    );
}
