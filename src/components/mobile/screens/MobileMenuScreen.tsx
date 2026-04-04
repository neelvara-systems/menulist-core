'use client'

import { getProjectData, getProjectsList, updateProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
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

export default function MobileMenuScreen() {
    const t = useTranslations('MobileMenu');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [menuData, setMenuData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

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

    const menuItems = useMemo(() => {
        if (!menuData?.files) return [];
        const items: MenuItemType[] = [];
        menuData.files.forEach((file: any) => {
            if (file.extractedData?.data?.categories && Array.isArray(file.extractedData.data.categories)) {
                const categories = file.extractedData.data.categories;
                const menuItems = file.extractedData.data.items || [];
                categories.forEach((category: any) => {
                    const categoryName = category.name?.en || category.name || 'Uncategorized';
                    const categoryItems = menuItems.filter((item: any) => item.category === category.id);
                    categoryItems.forEach((item: any) => {
                        const itemName = item.name?.en || item.name || 'Unnamed Item';
                        const itemDescription = item.description?.en || item.description || '';
                        const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
                        const isAvailable = item.available !== false;
                        items.push({
                            id: item.id || `${categoryName}-${itemName}`,
                            name: itemName,
                            price: price,
                            isAvailable: isAvailable,
                            category: categoryName,
                            description: itemDescription,
                            image: item.image || '',
                        });
                    });
                });
            }
        });
        return items;
    }, [menuData]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return menuItems;
        const q = searchQuery.toLowerCase();
        return menuItems.filter(
            (item) => item.name.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q)
        );
    }, [menuItems, searchQuery]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, MenuItemType[]> = {};
        filteredItems.forEach((item) => {
            const category = item.category || 'Uncategorized';
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
        });
        return groups;
    }, [filteredItems]);
    const categoryCount = useMemo(() => {
        const categories = new Set(menuItems.map((item) => item.category || 'Uncategorized'));
        return categories.size;
    }, [menuItems]);

    const handleToggleAvailability = useCallback(async (item: MenuItemType) => {
        const newAvailability = !item.isAvailable;

        setMenuData((prev: any) => {
            if (!prev?.files) return prev;
            const updated = JSON.parse(JSON.stringify(prev));
            updated.files.forEach((file: any) => {
                file.extractedData?.categories?.forEach((cat: any) => {
                    cat.items?.forEach((menuItem: any) => {
                        if ((menuItem.id || `${cat.name}-${menuItem.name}`) === item.id) {
                            menuItem.isAvailable = newAvailability;
                        }
                    });
                });
            });
            return updated;
        });

        Toast.show({
            content: newAvailability ? t('available') : t('soldOut'),
            duration: 1000,
        });

        try {
            if (menuData?.projectId) {
                await updateProject(menuData);
            }
        } catch {
            setMenuData((prev: any) => {
                if (!prev?.files) return prev;
                const reverted = JSON.parse(JSON.stringify(prev));
                reverted.files.forEach((file: any) => {
                    file.extractedData?.categories?.forEach((cat: any) => {
                        cat.items?.forEach((menuItem: any) => {
                            if ((menuItem.id || `${cat.name}-${menuItem.name}`) === item.id) {
                                menuItem.isAvailable = !newAvailability;
                            }
                        });
                    });
                });
                return reverted;
            });
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
                                                    <Switch checked={item.isAvailable} onChange={() => handleToggleAvailability(item)} />
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
                                                        <Tag color={item.isAvailable ? 'success' : 'warning'}>
                                                            {item.isAvailable ? t('available') : t('soldOut')}
                                                        </Tag>
                                                        <Tag>{`₹${item.price}`}</Tag>
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
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onDelete={async (itemId) => {
                        setMenuData((prev: any) => {
                            if (!prev?.files) return prev;
                            const updated = JSON.parse(JSON.stringify(prev));
                            updated.files.forEach((file: any) => {
                                file.extractedData?.categories?.forEach((cat: any) => {
                                    if (cat.items) {
                                        cat.items = cat.items.filter(
                                            (menuItem: any) => (menuItem.id || `${cat.name}-${menuItem.name}`) !== itemId
                                        );
                                    }
                                });
                            });
                            return updated;
                        });
                        setEditingItem(null);
                        Toast.show({ content: t('itemDeleted'), duration: 1000 });
                        try {
                            if (menuData?.projectId) {
                                await updateProject(menuData);
                            }
                        } catch {
                            Toast.show({ content: t('failedToSync'), duration: 2000 });
                        }
                    }}
                    onSave={async (updatedItem) => {
                        setMenuData((prev: any) => {
                            if (!prev?.files) return prev;
                            const updated = JSON.parse(JSON.stringify(prev));
                            updated.files.forEach((file: any) => {
                                file.extractedData?.categories?.forEach((cat: any) => {
                                    cat.items?.forEach((menuItem: any, idx: number) => {
                                        if ((menuItem.id || `${cat.name}-${menuItem.name}`) === editingItem.id) {
                                            cat.items[idx] = { ...menuItem, ...updatedItem };
                                        }
                                    });
                                });
                            });
                            return updated;
                        });
                        setEditingItem(null);
                        Toast.show({ content: t('itemUpdated'), duration: 1000 });
                    }}
                />
            ) : null}

            {isAddSheetOpen ? (
                <AddItemSheet
                    categories={Object.keys(groupedItems)}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    onClose={() => setIsAddSheetOpen(false)}
                    onSave={async (newItem) => {
                        setMenuData((prev: any) => {
                            if (!prev?.files) return prev;
                            const updated = JSON.parse(JSON.stringify(prev));
                            let targetFile = updated.files[0];
                            if (!targetFile) return prev;
                            if (!targetFile.extractedData) targetFile.extractedData = { categories: [] };
                            if (!targetFile.extractedData.categories) targetFile.extractedData.categories = [];
                            let targetCat = targetFile.extractedData.categories.find((cat: any) => cat.name === newItem.category);
                            if (!targetCat) {
                                targetCat = { name: newItem.category || 'Uncategorized', items: [] };
                                targetFile.extractedData.categories.push(targetCat);
                            }
                            if (!targetCat.items) targetCat.items = [];
                            targetCat.items.push({
                                id: `${newItem.category}-${newItem.name}-${Date.now()}`,
                                name: newItem.name,
                                price: newItem.price,
                                description: newItem.description,
                                isAvailable: true,
                            });
                            return updated;
                        });
                        setIsAddSheetOpen(false);
                        Toast.show({ content: t('itemAdded'), duration: 1000 });
                        try {
                            if (menuData?.projectId) {
                                await updateProject(menuData);
                            }
                        } catch {
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
