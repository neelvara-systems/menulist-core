'use client'

import { getProjectData, getProjectsList, updateProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DotLoading, Empty, FloatingBubble, List, PullToRefresh, SearchBar, Switch, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCamera, LuCheck, LuPencil, LuPlus } from 'react-icons/lu';
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

    // Fetch menu data on mount — uses existing DAL (getProjectsList + getProjectData)
    const fetchMenuData = useCallback(async () => {
        try {
            setIsLoading(true);
            const result = await getProjectsList();
            const projects = result?.projects || [];
            // Load the default project (or first project)
            const defaultProject = projects.find((p: any) => p.isDefault) || projects[0];
            if (defaultProject?.projectId) {
                const fullProject = await getProjectData(defaultProject.projectId);
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

    // Flatten menu items from project data for display
    const menuItems = useMemo(() => {
        if (!menuData?.files) return [];
        const items: MenuItemType[] = [];
        menuData.files.forEach((file: any) => {
            if (file.extractedData?.categories) {
                file.extractedData.categories.forEach((cat: any) => {
                    cat.items?.forEach((item: any) => {
                        items.push({
                            id: item.id || `${cat.name}-${item.name}`,
                            name: item.name || '',
                            price: item.price || 0,
                            isAvailable: item.isAvailable !== false,
                            category: cat.name,
                            description: item.description || '',
                            image: item.image || '',
                        });
                    });
                });
            }
        });
        return items;
    }, [menuData]);

    // Client-side search filter (instant, no server calls — Law 4)
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return menuItems;
        const q = searchQuery.toLowerCase();
        return menuItems.filter(
            (item) =>
                item.name.toLowerCase().includes(q) ||
                item.category?.toLowerCase().includes(q)
        );
    }, [menuItems, searchQuery]);

    // Group items by category for display
    const groupedItems = useMemo(() => {
        const groups: Record<string, MenuItemType[]> = {};
        filteredItems.forEach((item) => {
            const cat = item.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });
        return groups;
    }, [filteredItems]);

    // Optimistic availability toggle (Law 8)
    const handleToggleAvailability = useCallback(async (item: MenuItemType) => {
        const newAvailability = !item.isAvailable;

        // Optimistic update — UI updates instantly
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

        // Background sync
        try {
            if (menuData?.projectId) {
                await updateProject(menuData);
            }
        } catch {
            // Revert on failure
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
        await fetchMenuData();
    };

    if (!storeDetails || isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar — always visible at top (Law 4) */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#141414] px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <SearchBar
                            placeholder={t('searchPlaceholder', { items: labels.itemsPlural })}
                            value={searchQuery}
                            onChange={setSearchQuery}
                            style={{ '--background': 'var(--adm-color-fill-content, #f5f5f5)' } as React.CSSProperties}
                        />
                    </div>
                    {menuData?.projectId && (
                        <button
                            onClick={() => setIsBulkActionsOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 flex-shrink-0"
                            aria-label="Bulk actions"
                        >
                            <LuCheck size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Quality Signals Panel */}
            {menuData?.files && (
                <div className="px-4 pb-2">
                    <MobileMenuQualitySignals files={menuData.files} />
                </div>
            )}

            {/* Menu Items */}
            <PullToRefresh onRefresh={handleRefresh}>
                <div className="px-4 pb-4">
                    {Object.keys(groupedItems).length === 0 ? (
                        <div className="pt-20">
                            {!searchQuery && !menuData ? (
                                <div className="flex flex-col items-center gap-4 pt-8">
                                    <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                        <LuCamera size={36} className="text-blue-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {t('createYourMenu', { offering: labels.offeringTitle })}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                                        {t('createYourMenuDesc', { offering: labels.offeringLower })}
                                    </p>
                                    <button
                                        onClick={() => setIsUploadSheetOpen(true)}
                                        className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium text-[15px] active:bg-blue-600 min-h-[44px]"
                                    >
                                        {t('uploadMenuPhoto', { offering: labels.offeringTitle })}
                                    </button>
                                </div>
                            ) : (
                                <Empty
                                    description={
                                        searchQuery ? t('noItemsFound') : t('noMenuItemsYet', { items: labels.itemsPlural })
                                    }
                                />
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedItems).map(([category, items]) => (
                            <div key={category} className="mb-4">
                                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-2 px-1">
                                    {category}
                                </h3>
                                <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                    {items.map((item) => (
                                        <List.Item
                                            key={item.id}
                                            title={
                                                <span className={`text-[15px] font-medium ${!item.isAvailable ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {item.name}
                                                </span>
                                            }
                                            description={
                                                <span className="text-[15px] font-semibold text-gray-800 dark:text-gray-200">
                                                    {storeDetails?.currencySymbol || '₹'}{item.price}
                                                </span>
                                            }
                                            extra={
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={item.isAvailable}
                                                        onChange={() => handleToggleAvailability(item)}
                                                        style={{ '--height': '26px', '--width': '44px' } as React.CSSProperties}
                                                    />
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="p-2.5 rounded-lg active:bg-gray-100 dark:active:bg-gray-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                        aria-label={`Edit ${item.name}`}
                                                    >
                                                        <LuPencil size={18} className="text-gray-500" />
                                                    </button>
                                                </div>
                                            }
                                            style={{ minHeight: '48px' }}
                                        />
                                    ))}
                                </List>
                            </div>
                        ))
                    )}
                </div>
            </PullToRefresh>

            {/* Floating Add Button (Law 2: max 2 levels) */}
            <FloatingBubble
                style={{
                    '--initial-position-bottom': '76px',
                    '--initial-position-right': '16px',
                    '--size': '52px',
                    '--background': 'var(--ant-color-primary, #1677ff)',
                } as React.CSSProperties}
                onClick={() => setIsAddSheetOpen(true)}
            >
                <LuPlus size={24} color="white" />
            </FloatingBubble>

            {/* Item Edit Bottom Sheet (Law 7: bottom sheet over modal) */}
            {editingItem && (
                <ItemEditSheet
                    item={editingItem}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    onClose={() => setEditingItem(null)}
                    onSave={async (updatedItem) => {
                        // Optimistic update
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
                    onDelete={async (itemId) => {
                        // Optimistic delete
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
                        // Background sync to Firestore
                        try {
                            if (menuData?.projectId) {
                                await updateProject(menuData);
                            }
                        } catch {
                            Toast.show({ content: t('failedToSync'), duration: 2000 });
                        }
                    }}
                />
            )}

            {/* Add Item Bottom Sheet */}
            {isAddSheetOpen && (
                <AddItemSheet
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    categories={Object.keys(groupedItems)}
                    onClose={() => setIsAddSheetOpen(false)}
                    onSave={async (newItem) => {
                        // Persist to Firestore via updateProject
                        setMenuData((prev: any) => {
                            if (!prev?.files) return prev;
                            const updated = JSON.parse(JSON.stringify(prev));
                            // Find or create the target category
                            let targetFile = updated.files[0];
                            if (!targetFile) return prev;
                            if (!targetFile.extractedData) targetFile.extractedData = { categories: [] };
                            if (!targetFile.extractedData.categories) targetFile.extractedData.categories = [];
                            let targetCat = targetFile.extractedData.categories.find(
                                (c: any) => c.name === newItem.category
                            );
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
                        // Background sync
                        try {
                            if (menuData?.projectId) {
                                await updateProject(menuData);
                            }
                        } catch {
                            Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });
                        }
                    }}
                />
            )}

            {/* Menu Upload Sheet — for PWA users to upload menu photos */}
            {isUploadSheetOpen && (
                <MenuUploadSheet
                    onClose={() => setIsUploadSheetOpen(false)}
                    onComplete={() => {
                        setIsUploadSheetOpen(false);
                        fetchMenuData();
                    }}
                />
            )}

            {/* Bulk Actions Sheet — simplified Command Center */}
            <BulkActionsSheet
                visible={isBulkActionsOpen}
                onClose={() => { setIsBulkActionsOpen(false); fetchMenuData(); }}
                projectId={menuData?.projectId || ''}
            />
        </div>
    );
}
