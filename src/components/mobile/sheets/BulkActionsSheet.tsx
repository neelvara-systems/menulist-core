'use client'

import { updateProject } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { removeObjRef } from '@util/utils';
import { InputNumber, Popover, Segmented, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuCheck, LuCheckCheck, LuEye, LuEyeOff, LuFilter, LuFolderInput, LuX } from 'react-icons/lu';
import {
    applyBulkActiveInactive,
    applyBulkAvailability,
    applyBulkMoveCategory,
    applyBulkPricing,
    computeActiveInactivePreview,
    computeAvailabilityPreview,
    computeMoveCategoryPreview,
    computePricingPreview,
    getAllCategories,
} from '../../templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations';
import type { Project } from '../../templates/main-app/projects/types';
import type { PricingConfig, PricingMethod } from '../../templates/main-app/projects/types/commandCenter.types';
import { Button, Card, Checkbox, Collapse, Dialog, Empty, Flex, NavBar, Popup, SearchBar, Select, Tag, Text, Toast } from '../antd';

interface BulkActionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onApply: (updatedProject: Project) => void;
    projectData: Project | null;
    initialAction?: BulkAction;
}

type BulkAction = 'availability' | 'showHide' | 'pricing' | 'moveCategory' | null;
type StatusFilter = 'all' | 'active' | 'inactive' | 'soldOut';
type ItemEntry = {
    id: string;
    name: string;
    price: string;
    category: string;
    categoryName: string;
    available: boolean;
    active: boolean;
    fileUid: string;
    attributes?: { id: string; name: string; price: string }[];
};

const STATUS_COLORS = {
    available: '#22c55e',
    unavailable: '#f59e0b',
    inactive: '#9ca3af',
} as const;

export default function BulkActionsSheet({ visible, onApply, onClose, projectData, initialAction = null }: BulkActionsSheetProps) {
    const t = useTranslations('MobileMenu');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const unselectedFilterColor = 'rgba(0,0,0,0.35)';
    const currencySymbol = storeDetails?.currencySymbol || '₹';
    const [workingProject, setWorkingProject] = useState<Project | null>(projectData);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [action, setAction] = useState<BulkAction>(null);
    const [search, setSearch] = useState('');
    const [applying, setApplying] = useState(false);
    const [pricingMethod, setPricingMethod] = useState<PricingMethod>('increasePercent');
    const [pricingValue, setPricingValue] = useState<number | null>(null);
    const [destinationCategoryId, setDestinationCategoryId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setWorkingProject(projectData ? removeObjRef(projectData) : null);
        setSelectedIds(new Set());
        setAction(initialAction);
        setSearch('');
        setPricingMethod('increasePercent');
        setPricingValue(null);
        setDestinationCategoryId(null);
        setStatusFilter('all');
        setIsStatusFilterOpen(false);
    }, [initialAction, projectData, visible]);

    const items: ItemEntry[] = useMemo(() => {
        if (!workingProject) return [];
        const result: ItemEntry[] = [];
        const activeLang = workingProject.languages?.[0] || 'en';

        workingProject.files?.forEach((file: any) => {
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
                    attributes: item.attributes?.map((attr: any) => ({
                        id: attr.id,
                        name: attr.name?.[activeLang] || attr.name?.en || 'Variant',
                        price: attr.price || '',
                    })),
                });
            });
        });

        return result;
    }, [workingProject]);

    const filteredItems = useMemo(() => {
        let next = items;

        if (statusFilter === 'active') {
            next = next.filter((item) => item.active);
        } else if (statusFilter === 'inactive') {
            next = next.filter((item) => !item.active);
        } else if (statusFilter === 'soldOut') {
            next = next.filter((item) => !item.available);
        }

        if (action === 'moveCategory' && destinationCategoryId) {
            next = next.filter((item) => item.category !== destinationCategoryId);
        }

        if (!search.trim()) return next;
        const term = search.toLowerCase();
        return next.filter((item) => item.name.toLowerCase().includes(term) || item.categoryName.toLowerCase().includes(term));
    }, [action, destinationCategoryId, items, search, statusFilter]);

    const categories = useMemo(() => {
        const map = new Map<string, ItemEntry[]>();
        filteredItems.forEach((item) => {
            if (!map.has(item.categoryName)) map.set(item.categoryName, []);
            map.get(item.categoryName)?.push(item);
        });
        return map;
    }, [filteredItems]);

    const activeLang = useMemo(() => workingProject?.languages?.[0] || 'en', [workingProject?.languages]);

    const destinationCategories = useMemo(() => {
        if (!workingProject) return [];
        return getAllCategories(workingProject, activeLang).map((category) => ({
            itemCount: category.itemCount,
            label: category.name,
            value: category.id,
        }));
    }, [activeLang, workingProject]);

    const selectedItems = useMemo(
        () => items.filter((item) => selectedIds.has(item.id)).map((item) => ({ ...item, isLocked: false })),
        [items, selectedIds]
    );
    const effectiveSelectedCount = useMemo(
        () => filteredItems.filter((item) => selectedIds.has(item.id)).length,
        [filteredItems, selectedIds]
    );
    const selectedDestinationCategory = useMemo(
        () => destinationCategories.find((category) => category.value === destinationCategoryId) || null,
        [destinationCategories, destinationCategoryId]
    );

    const selectedAvailabilitySummary = useMemo(() => {
        const availableCount = selectedItems.filter((item) => item.available).length;
        const unavailableCount = selectedItems.length - availableCount;
        return {
            availableCount,
            unavailableCount,
            toMarkAvailable: unavailableCount,
            toMarkUnavailable: availableCount,
        };
    }, [selectedItems]);

    const selectedVisibilitySummary = useMemo(() => {
        const visibleCount = selectedItems.filter((item) => item.active).length;
        const hiddenCount = selectedItems.length - visibleCount;
        return {
            visibleCount,
            hiddenCount,
            toShow: hiddenCount,
            toHide: visibleCount,
        };
    }, [selectedItems]);

    const pricingConfig = useMemo<PricingConfig | null>(() => {
        if (action !== 'pricing' || pricingValue === null || Number.isNaN(pricingValue) || pricingValue <= 0) return null;
        return {
            method: pricingMethod,
            value: pricingValue,
        };
    }, [action, pricingMethod, pricingValue]);

    const pricingPreviewByItemId = useMemo(() => {
        if (action !== 'pricing' || !pricingConfig) {
            return new Map<string, { oldPrice: number; newPrice: number; changePercent: number }>();
        }

        const pricingPreview = computePricingPreview(selectedItems, pricingConfig);

        return pricingPreview.allChanges.reduce((acc, change) => {
            if (change.isAttribute) return acc;
            acc.set(change.itemId, {
                oldPrice: change.oldPrice,
                newPrice: change.newPrice,
                changePercent: change.changePercent,
            });
            return acc;
        }, new Map<string, { oldPrice: number; newPrice: number; changePercent: number }>());
    }, [action, pricingConfig, selectedItems]);

    const preview = useMemo(() => {
        if (selectedItems.length === 0 || !action) return null;
        if (action === 'availability') return computeAvailabilityPreview(selectedItems, 'available');
        if (action === 'showHide') return computeActiveInactivePreview(selectedItems, 'show');
        if (action === 'pricing' && pricingConfig) return computePricingPreview(selectedItems, pricingConfig);
        if (action === 'moveCategory' && destinationCategoryId) {
            const destinationName = destinationCategories.find((category) => category.value === destinationCategoryId)?.label || t('selectedCategory');
            return computeMoveCategoryPreview(selectedItems, destinationCategoryId, destinationName);
        }
        return null;
    }, [action, destinationCategories, destinationCategoryId, pricingConfig, selectedItems, t]);

    const toggleItem = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleSearchChange = (value: string) => {
        if (selectedIds.size > 0 && value !== search) {
            clearSelection();
        }
        setSearch(value);
    };

    const handleStatusFilterChange = (nextFilter: StatusFilter) => {
        if (selectedIds.size > 0 && nextFilter !== statusFilter) {
            clearSelection();
        }
        setStatusFilter(nextFilter);
        setIsStatusFilterOpen(false);
    };

    const handleDestinationCategoryChange = (value: string | null) => {
        if (selectedIds.size > 0 && value !== destinationCategoryId) {
            clearSelection();
        }
        setDestinationCategoryId(value);
    };

    const toggleAll = () => {
        if (effectiveSelectedCount === filteredItems.length) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    };

    const toggleCategory = (categoryName: string, checked: boolean) => {
        const next = new Set(selectedIds);
        const categoryItems = categories.get(categoryName) || [];
        categoryItems.forEach((item) => {
            if (checked) next.add(item.id);
            else next.delete(item.id);
        });
        setSelectedIds(next);
    };

    const handleApply = async (target?: string) => {
        if (selectedIds.size === 0) return;

        let actionLabel = t('updateItems');
        if (action === 'availability') {
            actionLabel = target === 'available' ? t('markAvailable') : t('markSoldOut');
        } else if (action === 'showHide') {
            actionLabel = target === 'show' ? t('active') : t('inactive');
        } else if (action === 'pricing') {
            actionLabel = t('updatePrices');
        } else if (action === 'moveCategory') {
            actionLabel = t('moveItems');
        }

        Dialog.confirm({
            content: t('bulkActionConfirm', { action: actionLabel, count: selectedIds.size }),
            onConfirm: async () => {
                if (!workingProject) return;
                setApplying(true);
                try {
                    let updated = removeObjRef(workingProject);
                    if (action === 'availability' && (target === 'available' || target === 'unavailable')) {
                        updated = applyBulkAvailability(updated, selectedIds, target);
                    } else if (action === 'showHide' && (target === 'show' || target === 'hide')) {
                        updated = applyBulkActiveInactive(updated, selectedIds, target);
                    } else if (action === 'pricing' && pricingConfig) {
                        updated = applyBulkPricing(updated, selectedIds, pricingConfig);
                    } else if (action === 'moveCategory' && destinationCategoryId) {
                        updated = applyBulkMoveCategory(updated, selectedIds, destinationCategoryId);
                    } else {
                        setApplying(false);
                        return;
                    }

                    await updateProject(updated);
                    setWorkingProject(updated);
                    onApply(updated);
                    setSelectedIds(new Set());
                    setAction(null);
                    onClose();
                    Toast.show({ content: t('itemsUpdated', { count: selectedIds.size }), duration: 1500 });
                } catch {
                    Toast.show({ content: t('bulkApplyFailed'), duration: 2000 });
                } finally {
                    setApplying(false);
                }
            },
        });
    };

    if (!visible) return null;

    if (!action) return null;

    const actionTitle = action === 'availability'
        ? t('availability')
        : action === 'showHide'
            ? t('showAndHide')
            : action === 'pricing'
                ? t('updatePrices')
                : t('moveToCategory');

    const pricingMode = pricingMethod === 'setFixed'
        ? 'set'
        : pricingMethod === 'increasePercent' || pricingMethod === 'addFlat'
            ? 'increase'
            : 'reduce';
    const pricingUnit = pricingMethod === 'increasePercent' || pricingMethod === 'decreasePercent' ? 'percent' : 'amount';

    const handlePricingModeChange = (nextMode: string) => {
        if (nextMode === 'set') {
            setPricingMethod('setFixed');
            return;
        }

        if (nextMode === 'increase') {
            setPricingMethod(pricingUnit === 'percent' ? 'increasePercent' : 'addFlat');
            return;
        }

        setPricingMethod(pricingUnit === 'percent' ? 'decreasePercent' : 'reduceFlat');
    };

    const handlePricingUnitChange = (nextUnit: string) => {
        if (pricingMode === 'set') return;
        if (pricingMode === 'increase') {
            setPricingMethod(nextUnit === 'percent' ? 'increasePercent' : 'addFlat');
            return;
        }
        setPricingMethod(nextUnit === 'percent' ? 'decreasePercent' : 'reduceFlat');
    };

    const renderStatusBadge = (label: string, color: string) => (
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            <span
                style={{
                    background: color,
                    borderRadius: '999px',
                    display: 'inline-block',
                    flex: '0 0 auto',
                    height: 8,
                    width: 8,
                }}
            />
            <Text style={{ fontSize: 12, lineHeight: 1.2 }}>{label}</Text>
        </Flex>
    );

    const renderLegend = () => {
        if (action === 'availability') {
            return (
                <Flex gap={10} wrap="wrap">
                    {renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable)}
                    {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                </Flex>
            );
        }

        if (action === 'showHide') {
            return (
                <Flex gap={10} wrap="wrap">
                    {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                    {renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable)}
                </Flex>
            );
        }

        if (action === 'pricing' || action === 'moveCategory') {
            return (
                <Flex gap={10} wrap="wrap">
                    {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                    {renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable)}
                </Flex>
            );
        }

        return null;
    };

    const renderItemStatus = (item: ItemEntry) => {
        if (action === 'availability') {
            if (!item.available && !item.active) {
                return (
                    <Flex align="center" gap={8} wrap="wrap">
                        {renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable)}
                        {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                    </Flex>
                );
            }
            if (!item.available) {
                return renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable);
            }
            if (!item.active) {
                return renderStatusBadge(t('inactive'), STATUS_COLORS.inactive);
            }
            return null;
        }

        if (action === 'showHide') {
            if (!item.active && !item.available) {
                return (
                    <Flex align="center" gap={8} wrap="wrap">
                        {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                        {renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable)}
                    </Flex>
                );
            }
            if (!item.active) {
                return renderStatusBadge(t('inactive'), STATUS_COLORS.inactive);
            }
            if (!item.available) {
                return renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable);
            }
            return null;
        }

        return (
            <Flex gap={8} wrap="wrap">
                {!item.available ? renderStatusBadge(t('soldOut'), STATUS_COLORS.unavailable) : null}
                {!item.active ? renderStatusBadge(t('inactive'), STATUS_COLORS.inactive) : null}
            </Flex>
        );
    };

    const renderPricingChange = (item: ItemEntry) => {
        const change = pricingPreviewByItemId.get(item.id);

        if (!selectedIds.has(item.id)) {
            return item.price ? <Text type="secondary">{item.price}</Text> : null;
        }

        if (!change) {
            return (
                <Tag>
                    No price change
                </Tag>
            );
        }

        return (
            <Flex align="center" gap={6} wrap="wrap">
                <Text type="secondary">{currencySymbol}{change.oldPrice}</Text>
                <LuArrowRight size={12} style={{ color: token.colorTextQuaternary }} />
                <Text strong>{currencySymbol}{change.newPrice}</Text>
                <Tag color={change.changePercent >= 0 ? 'success' : 'warning'}>
                    {change.changePercent >= 0 ? '+' : ''}{Math.round(change.changePercent * 10) / 10}%
                </Tag>
            </Flex>
        );
    };

    const activeFilterCount = statusFilter === 'all' ? 0 : 1;
    const statusFilterLabel = statusFilter === 'active'
        ? t('active')
        : statusFilter === 'inactive'
            ? t('inactive')
            : statusFilter === 'soldOut'
                ? t('soldOut')
                : t('allStatuses');

    const statusFilterContent = (
        <Flex gap={4} style={{ minWidth: 200 }} vertical>
            {([
                { key: 'all', label: t('allStatuses') },
                { key: 'active', label: t('active') },
                { key: 'inactive', label: t('inactive') },
                { key: 'soldOut', label: t('soldOut') },
            ] as const).map((option) => (
                <Flex
                    align="center"
                    gap={10}
                    key={option.key}
                    onClick={() => handleStatusFilterChange(option.key)}
                    style={{
                        borderRadius: 10,
                        cursor: 'pointer',
                        padding: '10px 12px',
                    }}
                >
                    <Flex
                        align="center"
                        justify="center"
                        style={{
                            border: `1px solid ${statusFilter === option.key ? token.colorPrimary : unselectedFilterColor}`,
                            borderRadius: '999px',
                            color: statusFilter === option.key ? token.colorPrimary : unselectedFilterColor,
                            height: 18,
                            width: 18,
                        }}
                    >
                        <LuCheckCheck size={11} />
                    </Flex>
                    <Text style={{ color: statusFilter === option.key ? token.colorPrimary : undefined }}>{option.label}</Text>
                </Flex>
            ))}
        </Flex>
    );

    return (
        <Popup
            bodyStyle={{ minHeight: '68vh', maxHeight: '90vh', overflowX: 'hidden', padding: 0 }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar
                    onBack={onClose}
                    right={<Tag color="processing">{t('selectedCount', { count: effectiveSelectedCount })}</Tag>}
                >
                    {actionTitle}
                </NavBar>

                <Flex gap={10} style={{ padding: '12px 12px 10px' }} vertical>
                    {action === 'pricing' ? (
                        <Card size="small">
                            <Flex gap={10} vertical>
                                <Flex align="center" gap={8}>
                                    <Flex gap={2} vertical>
                                        <Text strong>{t('pricingRule')}</Text>
                                        <Text type="secondary">{t('pricingRuleSubtitle')}</Text>
                                    </Flex>
                                </Flex>
                                <Segmented
                                    block
                                    onChange={(value) => handlePricingModeChange(value as string)}
                                    options={[
                                        { label: t('increaseLabel'), value: 'increase' },
                                        { label: t('reduceLabel'), value: 'reduce' },
                                        { label: t('setPrice'), value: 'set' },
                                    ]}
                                    value={pricingMode}
                                />
                                <Flex align="end" gap={8}>
                                    {pricingMode !== 'set' ? (
                                        <Flex style={{ minWidth: 92 }}>
                                            <Segmented
                                                block
                                                onChange={(value) => handlePricingUnitChange(value as string)}
                                                options={[
                                                    { label: '%', value: 'percent' },
                                                    { label: currencySymbol, value: 'amount' },
                                                ]}
                                                value={pricingUnit}
                                            />
                                        </Flex>
                                    ) : null}
                                    <Flex style={{ flex: 1, minWidth: 0 }}>
                                        <InputNumber
                                            addonAfter={pricingMethod.includes('Percent') ? '%' : undefined}
                                            addonBefore={pricingMethod.includes('Percent') ? undefined : currencySymbol}
                                            min={0}
                                            onChange={(value) => setPricingValue(typeof value === 'number' ? value : null)}
                                            placeholder={pricingMethod.includes('Percent') ? t('enterPercentage') : t('enterAmount')}
                                            style={{ width: '100%' }}
                                            value={pricingValue}
                                        />
                                    </Flex>
                                </Flex>
                                {pricingConfig && preview && 'itemsAffected' in preview ? (
                                    <Flex gap={8} wrap="wrap">
                                        <Tag color="processing">{t('itemsAffected', { count: preview.itemsAffected })}</Tag>
                                        <Tag>{t('itemsSkipped', { count: preview.itemsSkipped })}</Tag>
                                        <Tag color={preview.netChangePercent >= 0 ? 'success' : 'warning'}>
                                            {preview.netChangePercent >= 0 ? '+' : ''}{preview.netChangePercent}%
                                        </Tag>
                                    </Flex>
                                ) : (
                                    <Text type="secondary">{t('pricingRuleHelp')}</Text>
                                )}
                            </Flex>
                        </Card>
                    ) : null}

                    {action === 'moveCategory' ? (
                        <Card size="small">
                            <Flex gap={10} vertical>
                                <Flex align="center" gap={8}>
                                    <LuFolderInput size={16} />
                                    <Flex gap={2} vertical>
                                        <Text strong>{t('destinationCategory')}</Text>
                                        <Text type="secondary">{t('destinationCategoryHelp')}</Text>
                                    </Flex>
                                </Flex>
                                <Select
                                    onChange={handleDestinationCategoryChange}
                                    options={destinationCategories}
                                    placeholder={t('chooseCategory')}
                                    value={destinationCategoryId || undefined}
                                />
                                {preview && 'itemsToMove' in preview && destinationCategoryId ? (
                                    <Flex gap={8} wrap="wrap">
                                        <Tag color="processing">{t('itemsAffected', { count: preview.itemsToMove })}</Tag>
                                        <Tag>{t('selectedCategory')}: {preview.destinationCategory}</Tag>
                                        {preview.sourceCategories.length > 0 ? (
                                            <Tag>{preview.sourceCategories.length} {t('categories')}</Tag>
                                        ) : null}
                                    </Flex>
                                ) : null}
                            </Flex>
                        </Card>
                    ) : null}

                    <Flex align="center" gap={10}>
                        <Popover
                            content={statusFilterContent}
                            onOpenChange={setIsStatusFilterOpen}
                            open={isStatusFilterOpen}
                            placement="bottomLeft"
                            trigger="click"
                        >
                            <Button
                                fill="outline"
                                style={{ minWidth: 98 }}
                            >
                                <Flex align="center" gap={6}>
                                    <LuFilter size={16} />
                                    <Text>{activeFilterCount > 0 ? statusFilterLabel : t('filters')}</Text>
                                </Flex>
                            </Button>
                        </Popover>

                        <Flex style={{ flex: 1, minWidth: 0 }}>
                            <SearchBar
                                onChange={handleSearchChange}
                                placeholder={t('smartRecommendationsSearchItems')}
                                value={search}
                            />
                        </Flex>
                    </Flex>

                    <Flex align="center" gap={12} justify="space-between" wrap>
                        <Flex align="center" gap={10} style={{ flex: 1, minWidth: 0 }} wrap>
                            {renderLegend()}
                        </Flex>
                        <Checkbox
                            checked={filteredItems.length > 0 && effectiveSelectedCount === filteredItems.length}
                            indeterminate={effectiveSelectedCount > 0 && effectiveSelectedCount < filteredItems.length}
                            onChange={toggleAll}
                        >
                            <Text style={{ whiteSpace: 'nowrap' }}>{t('selectAllCount', { count: filteredItems.length })}</Text>
                        </Checkbox>
                    </Flex>

                    {selectedIds.size > 0 && action === 'availability' ? (
                        <Flex align="center" gap={10} justify="space-between" wrap>
                            <Flex gap={8} wrap="wrap">
                                <Tag color="success">
                                    {selectedAvailabilitySummary.availableCount} {t('available')}
                                </Tag>
                                <Tag color="warning">
                                    {selectedAvailabilitySummary.unavailableCount} {t('soldOut')}
                                </Tag>
                            </Flex>
                            <Button
                                color="danger"
                                fill="none"
                                onClick={clearSelection}
                                size="small"
                                icon={<LuX />}
                            >
                                Clear selection
                            </Button>
                        </Flex>
                    ) : null}

                    {selectedIds.size > 0 && action === 'showHide' ? (
                        <Flex align="center" gap={10} justify="space-between" wrap>
                            <Flex gap={8} wrap="wrap">
                                <Tag color="success">
                                    {selectedVisibilitySummary.visibleCount} {t('active')}
                                </Tag>
                                <Tag>
                                    {selectedVisibilitySummary.hiddenCount} {t('inactive')}
                                </Tag>
                            </Flex>
                            <Button
                                color="danger"
                                fill="outline"
                                onClick={clearSelection}
                                size="small"
                            >
                                Clear selection
                            </Button>
                        </Flex>
                    ) : null}

                    {action === 'pricing' && preview && 'itemsAffected' in preview ? (
                        <Flex gap={8} wrap="wrap">
                            <Tag>{currencySymbol}{preview.avgPriceBefore} before</Tag>
                            <Tag color="processing">{currencySymbol}{preview.avgPriceAfter} after</Tag>
                        </Flex>
                    ) : null}
                </Flex>

                <Flex style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }} vertical>
                    {!workingProject ? (
                        <Card>
                            <Text type="secondary">{t('loadingItems')}</Text>
                        </Card>
                    ) : categories.size === 0 ? (
                        <Empty description={t('noMatchingItems')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Card size="small">
                            <Collapse
                                defaultActiveKey={Array.from(categories.keys())[0] ? [Array.from(categories.keys())[0]] : undefined}
                            >
                                {Array.from(categories.entries()).map(([categoryName, categoryItems]) => {
                                    const selectedCount = categoryItems.filter((item) => selectedIds.has(item.id)).length;
                                    const allCategorySelected = categoryItems.length > 0 && selectedCount === categoryItems.length;
                                    const someCategorySelected = selectedCount > 0 && !allCategorySelected;

                                    return (
                                        <Collapse.Panel
                                            key={categoryName}
                                            title={(
                                                <Flex align="center" gap={8} justify="space-between" style={{ width: '100%' }}>
                                                    <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
                                                        <div onClick={(event) => event.stopPropagation()}>
                                                            <Checkbox
                                                                checked={allCategorySelected}
                                                                indeterminate={someCategorySelected}
                                                                onChange={(checked) => toggleCategory(categoryName, checked)}
                                                            />
                                                        </div>
                                                        <Text strong>{categoryName}</Text>
                                                    </Flex>
                                                    <Tag color={selectedCount > 0 ? 'processing' : undefined}>
                                                        {selectedCount}/{categoryItems.length}
                                                    </Tag>
                                                </Flex>
                                            )}
                                        >
                                            <Flex gap={8} vertical>
                                                {categoryItems.map((item) => (
                                                    <Card key={item.id} size="small" style={{ margin: 0 }}>
                                                        <Flex
                                                            align="center"
                                                            gap={10}
                                                            justify="space-between"
                                                            onClick={() => toggleItem(item.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
                                                                <div onClick={(event) => event.stopPropagation()}>
                                                                    <Checkbox
                                                                        checked={selectedIds.has(item.id)}
                                                                        onChange={() => toggleItem(item.id)}
                                                                    />
                                                                </div>
                                                                <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                                                                    <Text>{item.name}</Text>
                                                                    <Flex gap={8} wrap="wrap">
                                                                        {action === 'pricing' ? renderPricingChange(item) : (item.price ? <Text type="secondary">{item.price}</Text> : null)}
                                                                        {renderItemStatus(item)}
                                                                        {item.attributes?.length ? <Tag>{t('variantsCount', { count: item.attributes.length })}</Tag> : null}
                                                                    </Flex>
                                                                </Flex>
                                                            </Flex>
                                                        </Flex>
                                                    </Card>
                                                ))}
                                            </Flex>
                                        </Collapse.Panel>
                                    );
                                })}
                            </Collapse>
                        </Card>
                    )}
                </Flex>

                {selectedIds.size > 0 ? (
                    <Card style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
                        {action === 'availability' ? (
                            <Flex gap={12}>
                                <Button
                                    block
                                    color="primary"
                                    disabled={selectedAvailabilitySummary.toMarkAvailable === 0}
                                    loading={applying}
                                    onClick={() => handleApply('available')}
                                    size="large"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuCheck size={16} />
                                        <Text>{t('available')} ({selectedAvailabilitySummary.toMarkAvailable})</Text>
                                    </Flex>
                                </Button>
                                <Button
                                    block
                                    color="warning"
                                    disabled={selectedAvailabilitySummary.toMarkUnavailable === 0}
                                    loading={applying}
                                    onClick={() => handleApply('unavailable')}
                                    size="large"
                                >
                                    {t('soldOut')} ({selectedAvailabilitySummary.toMarkUnavailable})
                                </Button>
                            </Flex>
                        ) : action === 'showHide' ? (
                            <Flex gap={12}>
                                <Button
                                    block
                                    color="primary"
                                    disabled={selectedVisibilitySummary.toShow === 0}
                                    loading={applying}
                                    onClick={() => handleApply('show')}
                                    size="large"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuEye size={16} />
                                        <Text>{t('active')} ({selectedVisibilitySummary.toShow})</Text>
                                    </Flex>
                                </Button>
                                <Button
                                    block
                                    color="danger"
                                    disabled={selectedVisibilitySummary.toHide === 0}
                                    loading={applying}
                                    onClick={() => handleApply('hide')}
                                    size="large"
                                >
                                    <Flex align="center" gap={6}>
                                        <LuEyeOff size={16} />
                                        <Text>{t('inactive')} ({selectedVisibilitySummary.toHide})</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        ) : (
                            <Button
                                block
                                color="primary"
                                disabled={
                                    (action === 'pricing' && !pricingConfig) ||
                                    (action === 'moveCategory' && (!destinationCategoryId || !preview || !('itemsToMove' in preview) || preview.itemsToMove <= 0))
                                }
                                loading={applying}
                                onClick={() => handleApply()}
                                size="large"
                            >
                                {action === 'pricing' ? t('applyPriceUpdate') : t('moveSelectedItems')}
                            </Button>
                        )}
                    </Card>
                ) : null}
            </Flex>
        </Popup>
    );
}
