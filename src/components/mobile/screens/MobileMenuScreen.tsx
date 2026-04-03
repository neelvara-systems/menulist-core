'use client'

import { getProjectData, getProjectsList, updateProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, Empty, FloatingBubble, List, Popup, PullToRefresh, SearchBar, Switch, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCamera, LuCheck, LuLayers, LuPlus } from 'react-icons/lu';
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
            console.log('🔍 Fetching menu data...');
            const result = await getProjectsList();
            const projects = result?.projects || [];
            console.log('📋 Projects found:', projects.length);
            setProjectsList(projects);

            // Load the specified project or default project
            let targetProject: any;
            if (projectId) {
                targetProject = projects.find((p: any) => p.projectId === projectId);
                console.log('🎯 Looking for specific project:', projectId);
            } else {
                targetProject = projects.find((p: any) => p.isDefault) || projects[0];
                console.log('🎯 Using default project:', targetProject?.projectId);
            }

            if (targetProject?.projectId) {
                console.log('📂 Loading project data for:', targetProject.projectId);
                const fullProject = await getProjectData(targetProject.projectId);
                console.log('📦 Project data loaded:', {
                    projectId: fullProject?.projectId,
                    hasFiles: !!fullProject?.files,
                    fileCount: fullProject?.files?.length,
                    dataCategories: fullProject?.files?.[0]?.extractedData?.data?.categories?.length || 0
                });
                setMenuData(fullProject);
            } else {
                console.log('❌ No target project found');
            }
        } catch (err) {
            console.error('❌ Failed to load menu data:', err);
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
        if (!menuData?.files) {
            console.log('❌ No files in menu data');
            return [];
        }
        const items: MenuItemType[] = [];
        console.log('📁 Processing', menuData.files.length, 'files');
        menuData.files.forEach((file: any, fileIndex: number) => {
            console.log(`📄 File ${fileIndex}:`, {
                fileName: file.fileName || file.name || 'Unnamed',
                hasExtractedData: !!file.extractedData,
                extractedDataKeys: file.extractedData ? Object.keys(file.extractedData) : [],
                categories: file.extractedData?.data?.categories?.length || 0,
                rawExtractedData: file.extractedData
            });

            // Handle the actual data structure: extractedData.data.categories and extractedData.data.items
            if (file.extractedData?.data?.categories && Array.isArray(file.extractedData.data.categories)) {
                const categories = file.extractedData.data.categories;
                const menuItems = file.extractedData.data.items || [];

                console.log(`🏷️  Found ${categories.length} categories and ${menuItems.length} items`);

                categories.forEach((cat: any, catIndex: number) => {
                    const categoryName = cat.name?.en || cat.name || 'Uncategorized';
                    console.log(`🏷️  Category ${catIndex}: ${categoryName}`);

                    // Find items that belong to this category
                    const categoryItems = menuItems.filter((item: any) => item.category === cat.id);
                    console.log(`📋 Found ${categoryItems.length} items for category ${categoryName}`);

                    categoryItems.forEach((item: any, itemIndex: number) => {
                        const itemName = item.name?.en || item.name || 'Unnamed Item';
                        const itemDescription = item.description?.en || item.description || '';
                        const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
                        const isAvailable = item.available !== false;

                        console.log(`🍽️  Item ${itemIndex}: ${itemName} - ₹${price} (Available: ${isAvailable})`);

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
            } else {
                console.log(`⚠️  File ${fileIndex} has no recognizable menu structure`);
                console.log('🔍 Available keys:', file.extractedData ? Object.keys(file.extractedData) : 'No extractedData');
            }
        });
        console.log('✅ Total menu items processed:', items.length);
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
        console.log('📊 Grouped items:', {
            totalItems: filteredItems.length,
            categories: Object.keys(groups),
            itemsPerCategory: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]))
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
        await fetchMenuData(menuData?.projectId);
    };

    const handleProjectSelect = async (projectId: string) => {
        setIsProjectSelectorOpen(false);
        await fetchMenuData(projectId);
        Toast.show({ content: t('projectSwitched'), duration: 1000 });
    };

    if (!storeDetails || isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search Bar with Project Selector */}
            <div style={{
                padding: '16px',
                backgroundColor: 'var(--adm-color-background, #fff)',
                borderBottom: '1px solid var(--adm-color-border, #e5e7eb)'
            }}>
                {/* Project Selector (if multiple projects) */}
                {projectsList.length > 1 && (
                    <div style={{ marginBottom: '12px' }}>
                        <Button
                            fill="outline"
                            color="primary"
                            size="small"
                            onClick={() => setIsProjectSelectorOpen(true)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                height: '36px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LuLayers size={16} />
                                <span style={{ fontSize: '14px' }}>
                                    {menuData?.name || t('currentProject')}
                                </span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)' }}>
                                {t('itemsCount', { count: menuItems.length })}
                            </span>
                        </Button>
                    </div>
                )}

                {/* Search Bar */}
                <SearchBar
                    placeholder={t('searchPlaceholder', { items: labels.itemsPlural })}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    style={{
                        '--background': 'var(--adm-color-fill-2, #f5f5f5)',
                        '--border-radius': '20px',
                        fontSize: '14px'
                    }}
                />

                {/* Search Results Count */}
                {searchQuery && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'var(--adm-color-weak, #999)',
                        textAlign: 'center'
                    }}>
                        Found {filteredItems.length} of {menuItems.length} items
                    </div>
                )}
            </div>

            {/* Quality Signals Panel */}
            {menuData?.files && (
                <div style={{ padding: '0 16px 8px' }}>
                    <MobileMenuQualitySignals files={menuData.files} />
                </div>
            )}

            {/* Menu Items */}
            <PullToRefresh onRefresh={handleRefresh}>
                <div style={{ padding: '0 16px 16px' }}>
                    {Object.keys(groupedItems).length === 0 ? (
                        <div style={{ paddingTop: '80px' }}>
                            {!searchQuery && !menuData ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '32px' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--adm-color-primary-bg, #e6f7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <LuCamera size={36} color="var(--adm-color-primary, #1677ff)" />
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>
                                        {t('createYourMenu', { offering: labels.offeringTitle })}
                                    </h3>
                                    <p style={{ fontSize: '14px', textAlign: 'center', maxWidth: '300px', color: 'var(--adm-color-weak, #999)' }}>
                                        {t('createYourMenuDesc', { offering: labels.offeringLower })}
                                    </p>
                                    <Button
                                        color="primary"
                                        fill="solid"
                                        size="large"
                                        onClick={() => setIsUploadSheetOpen(true)}
                                        style={{ minHeight: '44px' }}
                                    >
                                        {t('uploadMenuPhoto', { offering: labels.offeringTitle })}
                                    </Button>
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
                            <div key={category} style={{ marginBottom: '24px' }}>
                                {/* Category Header */}
                                <div style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--adm-color-primary-bg, #e6f7ff)',
                                    borderLeft: '4px solid var(--adm-color-primary, #1677ff)',
                                    margin: '0 16px 12px 16px',
                                    borderRadius: '0 8px 8px 0'
                                }}>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'var(--adm-color-primary, #1677ff)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span>{category}</span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: 'var(--adm-color-weak, #999)',
                                            fontWeight: 400,
                                            backgroundColor: 'var(--adm-color-background, #fff)',
                                            padding: '2px 8px',
                                            borderRadius: '12px'
                                        }}>
                                            {items.length} items
                                        </span>
                                    </div>
                                </div>

                                {/* Items List */}
                                <List style={{ borderRadius: '12px', margin: '0 16px' }}>
                                    {items.map((item) => (
                                        <List.Item
                                            key={item.id}
                                            style={{
                                                backgroundColor: item.isAvailable
                                                    ? 'var(--adm-color-background, #fff)'
                                                    : 'var(--adm-color-fill-2, #f5f5f5)',
                                                opacity: item.isAvailable ? 1 : 0.6,
                                                padding: '16px',
                                                borderBottom: '1px solid var(--adm-color-border, #e5e7eb)'
                                            }}
                                            onClick={() => setEditingItem(item)}
                                            arrow={false}
                                            extra={
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {/* Price Badge */}
                                                    <div style={{
                                                        backgroundColor: 'var(--adm-color-success-bg, #f6ffed)',
                                                        color: 'var(--adm-color-success, #52c41a)',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        border: '1px solid var(--adm-color-success-border, #b7eb8f)'
                                                    }}>
                                                        ₹{item.price}
                                                    </div>

                                                    {/* Availability Toggle */}
                                                    <Switch
                                                        checked={item.isAvailable}
                                                        onChange={() => handleToggleAvailability(item)}
                                                        style={{ transform: 'scale(0.9)' }}
                                                    />
                                                </div>
                                            }
                                        >
                                            <div style={{ width: '100%' }}>
                                                {/* Item Name */}
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: 500,
                                                    color: item.isAvailable
                                                        ? 'var(--adm-color-text, #000)'
                                                        : 'var(--adm-color-weak, #999)',
                                                    marginBottom: '4px',
                                                    lineHeight: '1.3'
                                                }}>
                                                    {item.name}
                                                </div>

                                                {/* Description */}
                                                {item.description && (
                                                    <div style={{
                                                        fontSize: '13px',
                                                        color: 'var(--adm-color-weak, #666)',
                                                        lineHeight: '1.4',
                                                        marginBottom: '8px'
                                                    }}>
                                                        {item.description.length > 80
                                                            ? `${item.description.substring(0, 80)}...`
                                                            : item.description}
                                                    </div>
                                                )}

                                                {/* Status Badge */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        backgroundColor: item.isAvailable
                                                            ? 'var(--adm-color-success-bg, #f6ffed)'
                                                            : 'var(--adm-color-error-bg, #fff2f0)',
                                                        color: item.isAvailable
                                                            ? 'var(--adm-color-success, #52c41a)'
                                                            : 'var(--adm-color-error, #ff4d4f)',
                                                        border: `1px solid ${item.isAvailable
                                                            ? 'var(--adm-color-success-border, #b7eb8f)'
                                                            : 'var(--adm-color-error-border, #ffccc7)'}`,
                                                        fontWeight: 500
                                                    }}>
                                                        {item.isAvailable ? 'Available' : 'Sold Out'}
                                                    </span>

                                                    {/* Edit Button */}
                                                    <Button
                                                        size="mini"
                                                        fill="outline"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingItem(item);
                                                            setIsAddSheetOpen(true);
                                                        }}
                                                        style={{ fontSize: '11px', height: '24px' }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        </List.Item>
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
            {
                editingItem && (
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
                )
            }

            {/* Add Item Bottom Sheet */}
            {
                isAddSheetOpen && (
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
                )
            }

            {/* Menu Upload Sheet — for PWA users to upload menu photos */}
            {
                isUploadSheetOpen && (
                    <MenuUploadSheet
                        onClose={() => setIsUploadSheetOpen(false)}
                        onComplete={() => {
                            setIsUploadSheetOpen(false);
                            fetchMenuData();
                        }}
                    />
                )
            }

            {/* Bulk Actions Sheet — simplified Command Center */}
            <BulkActionsSheet
                visible={isBulkActionsOpen}
                onClose={() => { setIsBulkActionsOpen(false); fetchMenuData(menuData?.projectId); }}
                projectId={menuData?.projectId || ''}
            />

            {/* Project Selector Popup */}
            <Popup
                visible={isProjectSelectorOpen}
                onMaskClick={() => setIsProjectSelectorOpen(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '70vh' }}
                destroyOnClose
            >
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#d1d5db', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{t('selectProject')}</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                        {projectsList.map((project: any) => (
                            <Card
                                key={project.projectId}
                                onClick={() => handleProjectSelect(project.projectId)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: project.projectId === menuData?.projectId
                                        ? '2px solid var(--adm-color-primary, #1677ff)'
                                        : '1px solid var(--adm-color-border, #e5e7eb)',
                                    backgroundColor: project.projectId === menuData?.projectId
                                        ? 'var(--adm-color-primary-bg, #e6f7ff)'
                                        : 'var(--adm-color-background, #fff)',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--adm-color-primary-bg, #e6f7ff)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <LuLayers size={20} color="var(--adm-color-primary, #1677ff)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--adm-color-text, #333)' }}>
                                            {project.name || t('unnamedProject')}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)' }}>
                                            {project.isDefault && <span style={{ color: 'var(--adm-color-primary, #1677ff)' }}>{t('default')}</span>}
                                            {project.isDefault && ' • '}
                                            {t('itemsCount', { count: project.itemCount || 0 })}
                                        </div>
                                    </div>
                                    {project.projectId === menuData?.projectId && (
                                        <LuCheck size={20} color="var(--adm-color-primary, #1677ff)" />
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div style={{ paddingTop: '8px' }}>
                        <Button block fill="outline" onClick={() => setIsProjectSelectorOpen(false)}>
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            </Popup>
        </div >
    );
}
