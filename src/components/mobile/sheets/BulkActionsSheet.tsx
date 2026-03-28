'use client'

import { getProjectData } from '@database/projects';
import { updateProject } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { removeObjRef } from '@util/utils';
import { Button, Checkbox, Dialog, List, NavBar, Popup, SearchBar, Tag, Toast } from 'antd-mobile';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuEye, LuEyeOff, LuToggleRight } from 'react-icons/lu';

interface BulkActionsSheetProps {
    visible: boolean;
    onClose: () => void;
    projectId: string;
}

type BulkAction = 'availability' | 'showHide' | null;
type ItemEntry = { id: string; name: string; price: string; category: string; categoryName: string; available: boolean; active: boolean; fileUid: string };

/**
 * Mobile Bulk Actions Sheet — simplified Menu Command Center
 * 
 * Supports only the two most mobile-relevant operations:
 * 1. Bulk Availability (mark available / sold out)
 * 2. Bulk Show/Hide (permanently show or hide from menu)
 * 
 * Pricing and category moves are desktop-only (complex multi-step UX).
 * Uses same bulkOperations utils and updateProject DAL as desktop.
 */
export default function BulkActionsSheet({ visible, onClose, projectId }: BulkActionsSheetProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [projectData, setProjectData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<BulkAction>(null);
    const [search, setSearch] = useState('');
    const [applying, setApplying] = useState(false);

    // Fetch project data
    useEffect(() => {
        if (!visible || !projectId) return;
        setLoading(true);
        setSelectedIds(new Set());
        setAction(null);
        setSearch('');
        getProjectData(projectId).then((data) => {
            setProjectData(data);
            setLoading(false);
        }).catch(() => {
            Toast.show({ content: 'Failed to load menu data', duration: 2000 });
            setLoading(false);
        });
    }, [visible, projectId]);

    // Build flat item list from project
    const items: ItemEntry[] = useMemo(() => {
        if (!projectData) return [];
        const result: ItemEntry[] = [];
        const activeLang = projectData.languages?.[0] || 'en';

        projectData.files?.forEach((file: any) => {
            if (!file.extractedData?.data) return;
            const catMap: Record<string, string> = {};
            (file.extractedData.data.categories || []).forEach((cat: any) => {
                catMap[cat.id] = cat.name?.[activeLang] || cat.name?.['en'] || 'Untitled';
            });

            (file.extractedData.data.items || []).forEach((item: any) => {
                result.push({
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.['en'] || 'Untitled',
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

    // Filter by search
    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const term = search.toLowerCase();
        return items.filter(i => i.name.toLowerCase().includes(term) || i.categoryName.toLowerCase().includes(term));
    }, [items, search]);

    // Group by category
    const categories = useMemo(() => {
        const map = new Map<string, ItemEntry[]>();
        filteredItems.forEach(item => {
            if (!map.has(item.categoryName)) map.set(item.categoryName, []);
            map.get(item.categoryName)!.push(item);
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
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
        }
    };

    const handleApply = async (target: string) => {
        if (selectedIds.size === 0) return;

        const actionLabel = action === 'availability'
            ? (target === 'available' ? 'Mark Available' : 'Mark Sold Out')
            : (target === 'show' ? 'Show on Menu' : 'Hide from Menu');

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
                    Toast.show({ content: 'Failed to apply', duration: 2000 });
                } finally {
                    setApplying(false);
                }
            },
        });
    };

    if (!visible) return null;

    // Step 1: Choose action
    if (!action) {
        return (
            <Popup visible={visible} onMaskClick={onClose} position="bottom" bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', height: '50vh' }} destroyOnClose>
                <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
                        <h2 className="text-lg font-semibold">Bulk Actions</h2>
                        <p className="text-xs text-gray-500 mt-1">Make changes to multiple items at once</p>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
                        <button
                            onClick={() => setAction('availability')}
                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-800 text-left min-h-[60px]"
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                <LuToggleRight size={20} className="text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">Change Availability</p>
                                <p className="text-xs text-gray-500">Mark items as available or sold out</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setAction('showHide')}
                            className="w-full flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-800 text-left min-h-[60px]"
                        >
                            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
                                <LuEyeOff size={20} className="text-orange-500" />
                            </div>
                            <div>
                                <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">Show or Hide Items</p>
                                <p className="text-xs text-gray-500">Permanently show or hide from customer menu</p>
                            </div>
                        </button>
                        <p className="text-xs text-center text-gray-400 pt-2">
                            For bulk pricing and category moves, use desktop.
                        </p>
                    </div>
                </div>
            </Popup>
        );
    }

    // Step 2: Select items + apply
    return (
        <Popup visible={visible} onMaskClick={onClose} position="bottom" bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', height: '90vh' }} destroyOnClose>
            <div className="flex flex-col h-full">
                <NavBar
                    onBack={() => setAction(null)}
                    right={
                        <Tag color="primary" fill="outline" style={{ fontSize: 11 }}>
                            {selectedIds.size} selected
                        </Tag>
                    }
                    style={{ '--height': '48px' } as React.CSSProperties}
                >
                    {action === 'availability' ? 'Availability' : 'Show/Hide'}
                </NavBar>

                {/* Search + Select All */}
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 space-y-2">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Search items..."
                        style={{ '--height': '36px' } as React.CSSProperties}
                    />
                    <div className="flex items-center justify-between">
                        <Checkbox
                            checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                            indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
                            onChange={toggleAll}
                            style={{ '--icon-size': '18px' } as React.CSSProperties}
                        >
                            <span className="text-xs text-gray-500">Select all ({filteredItems.length})</span>
                        </Checkbox>
                    </div>
                </div>

                {/* Item List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32 text-sm text-gray-400">Loading...</div>
                    ) : (
                        Array.from(categories.entries()).map(([catName, catItems]) => (
                            <div key={catName}>
                                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">{catName}</p>
                                </div>
                                <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                                    {catItems.map(item => (
                                        <List.Item
                                            key={item.id}
                                            prefix={
                                                <Checkbox
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleItem(item.id)}
                                                    style={{ '--icon-size': '18px' } as React.CSSProperties}
                                                />
                                            }
                                            description={
                                                <span className="flex items-center gap-1.5 text-xs">
                                                    {item.price && <span className="text-gray-500">{item.price}</span>}
                                                    {!item.available && <Tag color="warning" fill="outline" style={{ fontSize: 10 }}>Sold Out</Tag>}
                                                    {!item.active && <Tag color="default" fill="outline" style={{ fontSize: 10 }}>Hidden</Tag>}
                                                </span>
                                            }
                                            onClick={() => toggleItem(item.id)}
                                            style={{ minHeight: '44px' }}
                                        >
                                            <span className="text-sm">{item.name}</span>
                                        </List.Item>
                                    ))}
                                </List>
                            </div>
                        ))
                    )}
                </div>

                {/* Action Buttons */}
                {selectedIds.size > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        {action === 'availability' ? (
                            <div className="flex gap-3">
                                <Button
                                    block color="primary" fill="solid" size="large"
                                    loading={applying}
                                    onClick={() => handleApply('available')}
                                    style={{ minHeight: '44px' }}
                                >
                                    <LuCheck size={16} className="inline mr-1" /> Available
                                </Button>
                                <Button
                                    block color="warning" fill="solid" size="large"
                                    loading={applying}
                                    onClick={() => handleApply('unavailable')}
                                    style={{ minHeight: '44px' }}
                                >
                                    Sold Out
                                </Button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <Button
                                    block color="primary" fill="solid" size="large"
                                    loading={applying}
                                    onClick={() => handleApply('show')}
                                    style={{ minHeight: '44px' }}
                                >
                                    <LuEye size={16} className="inline mr-1" /> Show
                                </Button>
                                <Button
                                    block color="danger" fill="solid" size="large"
                                    loading={applying}
                                    onClick={() => handleApply('hide')}
                                    style={{ minHeight: '44px' }}
                                >
                                    <LuEyeOff size={16} className="inline mr-1" /> Hide
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Popup>
    );
}
