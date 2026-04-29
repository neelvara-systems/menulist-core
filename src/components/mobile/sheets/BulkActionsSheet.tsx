'use client'

import { AI_ACTIONS_TYPES } from '@constant/common';
import { getOwnerLabels } from '@config/businessLabels';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import { removeObjRef } from '@util/utils';
import { Segmented, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuArrowRight, LuCheck, LuCheckCheck, LuEye, LuEyeOff, LuFileText, LuFilter, LuFolderInput, LuLanguages, LuSparkles, LuX } from 'react-icons/lu';
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
import {
    getDescriptionGenerationStats,
    runDescriptionGeneration,
} from '../../templates/main-app/projects/editorView/descriptionGeneration.shared';
import type { Project } from '../../templates/main-app/projects/types';
import type { PricingConfig, PricingMethod } from '../../templates/main-app/projects/types/commandCenter.types';
import { Button, Card, Checkbox, Collapse, Dialog, Empty, Flex, Input, NavBar, Popover, Popup, SearchBar, Select, Tag, Text, Toast } from '../antd';
import { getProjectLanguageIssues, repairLanguageProject } from '../utils/languageRepair';

interface BulkActionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onApply: (updatedProject: Project, context?: { previousProject?: Project; successMessage?: string; updatedCount?: number }) => void;
    projectData: Project | null;
    initialAction?: BulkAction;
    initialSelectedIds?: string[];
}

type BulkAction = 'availability' | 'showHide' | 'pricing' | 'moveCategory' | 'aiRepair' | null;
type StatusFilter = 'all' | 'active' | 'inactive' | 'soldOut';
type ItemEntry = {
    id: string;
    name: string;
    price: string;
    description?: string;
    missingDescription: boolean;
    image?: string;
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

const DISTINCT_SCRIPT_LANGUAGE_CODES = new Set(['ar', 'bn', 'hi', 'mr', 'ta', 'te', 'zh']);

function hasMissingDescriptionInLanguages(item: any, languageCodes: string[]): boolean {
    if (!item?.description || typeof item.description !== 'object') return true;
    return languageCodes.some((languageCode) => {
        const localizedDescription = item.description?.[languageCode];
        return typeof localizedDescription !== 'string' || localizedDescription.trim().length === 0;
    });
}

export default function BulkActionsSheet({
    visible,
    onApply,
    onClose,
    projectData,
    initialAction = null,
    initialSelectedIds = [],
}: BulkActionsSheetProps) {
    const t = useTranslations('MobileMenu');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const availabilityLabels = getOwnerLabels(storeDetails?.businessType);
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
    const [applyDetail, setApplyDetail] = useState('');
    const selectionSummaryStyle = {
        backgroundColor: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 12,
        padding: '10px 12px',
    } as const;
    const clearSelectionButtonStyle = {
        color: token.colorError,
        minHeight: 32,
        paddingInline: 0,
    } as const;

    useEffect(() => {
        if (!visible) return;
        setWorkingProject(projectData ? removeObjRef(projectData) : null);
        setSelectedIds(new Set(initialSelectedIds));
        setAction(initialAction);
        setSearch('');
        setPricingMethod('increasePercent');
        setPricingValue(null);
        setDestinationCategoryId(null);
        setStatusFilter('all');
        setIsStatusFilterOpen(false);
        setApplyDetail('');
    }, [initialAction, initialSelectedIds, projectData, visible]);

    const items: ItemEntry[] = useMemo(() => {
        if (!workingProject) return [];
        const result: ItemEntry[] = [];
        const activeLang = getProjectDefaultLanguage(workingProject);
        const activeProjectLanguages = workingProject.languages?.filter(Boolean) || [activeLang];

        workingProject.files?.forEach((file: any) => {
            if (!file.extractedData?.data) return;
            const catMap: Record<string, string> = {};
            const catActiveMap: Record<string, boolean> = {};
            (file.extractedData.data.categories || []).forEach((category: any) => {
                catMap[category.id] = category.name?.[activeLang] || category.name?.en || 'Untitled';
                catActiveMap[category.id] = category.active !== false;
            });

            (file.extractedData.data.items || []).forEach((item: any) => {
                result.push({
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.en || 'Untitled',
                    price: item.price || '',
                    description: item.description?.[activeLang] || item.description?.en || '',
                    missingDescription: hasMissingDescriptionInLanguages(item, activeProjectLanguages),
                    image: item.images?.[0]?.url || '',
                    category: item.category,
                    categoryName: catMap[item.category] || 'Uncategorized',
                    available: item.available !== false,
                    active: (item.active !== false) && (catActiveMap[item.category] !== false),
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

    const searchScopedItems = useMemo(() => {
        let next = items;

        if (action === 'moveCategory' && destinationCategoryId) {
            next = next.filter((item) => item.category !== destinationCategoryId);
        }

        if (!search.trim()) return next;
        const term = search.toLowerCase();
        return next.filter((item) => item.name.toLowerCase().includes(term) || item.categoryName.toLowerCase().includes(term));
    }, [action, destinationCategoryId, items, search]);

    const filteredItems = useMemo(() => {
        if (statusFilter === 'active') {
            return searchScopedItems.filter((item) => item.active);
        }
        if (statusFilter === 'inactive') {
            return searchScopedItems.filter((item) => !item.active);
        }
        if (statusFilter === 'soldOut') {
            return searchScopedItems.filter((item) => !item.available);
        }
        return searchScopedItems;
    }, [searchScopedItems, statusFilter]);

    const categories = useMemo(() => {
        const map = new Map<string, ItemEntry[]>();
        filteredItems.forEach((item) => {
            if (!map.has(item.categoryName)) map.set(item.categoryName, []);
            map.get(item.categoryName)?.push(item);
        });
        return map;
    }, [filteredItems]);

    const activeLang = useMemo(() => getProjectDefaultLanguage(workingProject), [workingProject]);

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
    const selectedHiddenByFiltersCount = Math.max(selectedIds.size - effectiveSelectedCount, 0);
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
        setSearch(value);
    };

    const handleStatusFilterChange = (nextFilter: StatusFilter) => {
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
            const next = new Set(selectedIds);
            filteredItems.forEach((item) => next.delete(item.id));
            setSelectedIds(next);
            return;
        }
        const next = new Set(selectedIds);
        filteredItems.forEach((item) => next.add(item.id));
        setSelectedIds(next);
    };

    const selectItems = (nextItems: ItemEntry[]) => {
        setSelectedIds(new Set(nextItems.map((item) => item.id)));
        setIsStatusFilterOpen(false);
    };

    const hasMissingPrice = (item: ItemEntry) => {
        const price = Number(String(item.price || '').replace(/[^0-9.-]/g, ''));
        return !(Number.isFinite(price) && price > 0) && !item.attributes?.length;
    };

    const hasMissingDescription = (item: ItemEntry) => item.missingDescription;
    const hasMissingImage = (item: ItemEntry) => !(item.image?.trim());

    const languageIssues = useMemo(() => {
        if (!workingProject) return [];
        const sourceLanguageCode = getProjectDefaultLanguage(workingProject);
        return getProjectLanguageIssues(workingProject, sourceLanguageCode);
    }, [workingProject]);

    const languagesNeedingRepair = useMemo(
        () => languageIssues.filter((issue) => issue.total > 0),
        [languageIssues]
    );

    const descriptionStats = useMemo(() => {
        if (!workingProject) {
            return {
                aiDescriptionCount: 0,
                itemsCount: 0,
                itemsWithDescriptions: 0,
                itemsWithoutDescriptions: 0,
                manualDescriptionCount: 0,
            };
        }
        return getDescriptionGenerationStats(workingProject, null, undefined);
    }, [workingProject]);

    const aiRepairSummary = useMemo(() => {
        const reviewableItems = items.filter((item) => item.active);
        return {
            descriptionsToGenerate: descriptionStats.itemsWithoutDescriptions,
            languageIssueCount: languagesNeedingRepair.reduce((total, issue) => total + issue.total, 0),
            languagesToRepair: languagesNeedingRepair.length,
            missingImages: reviewableItems.filter((item) => !item.image).length,
            missingPrices: reviewableItems.filter(hasMissingPrice).length,
        };
    }, [descriptionStats.itemsWithoutDescriptions, items, languagesNeedingRepair]);
    const hasLatinScriptRepairLanguages = useMemo(() => (
        languagesNeedingRepair.some((issue) => !DISTINCT_SCRIPT_LANGUAGE_CODES.has(issue.code))
    ), [languagesNeedingRepair]);
    const hasManualReviewItems = aiRepairSummary.missingPrices > 0 || aiRepairSummary.missingImages > 0;

    const toggleCategory = (categoryName: string, checked: boolean) => {
        const next = new Set(selectedIds);
        const categoryItems = categories.get(categoryName) || [];
        categoryItems.forEach((item) => {
            if (checked) next.add(item.id);
            else next.delete(item.id);
        });
        setSelectedIds(next);
    };

    const handleAiRepair = async () => {
        if (!workingProject) return;

        const totalFixes = aiRepairSummary.languageIssueCount + aiRepairSummary.descriptionsToGenerate;
        if (totalFixes === 0) {
            Toast.show({ content: t('menuRepairNotNeeded'), duration: 1600 });
            return;
        }

        Dialog.confirm({
            cancelText: t('keep'),
            confirmText: t('repairMenuAiAction'),
            content: t('repairMenuAiConfirm', {
                descriptions: aiRepairSummary.descriptionsToGenerate,
                languages: aiRepairSummary.languagesToRepair,
            }),
            onConfirm: async () => {
                setApplying(true);
                setApplyDetail(t('repairMenuAiPreparing'));
                try {
                    const previousProject = removeObjRef(workingProject);
                    let updated = removeObjRef(workingProject);
                    const sourceLanguageCode = getProjectDefaultLanguage(updated);

                    for (const issue of languagesNeedingRepair) {
                        setApplyDetail(t('repairMenuAiLanguageStep', { code: issue.code.toUpperCase() }));
                        updated = await repairLanguageProject(updated, issue.code, sourceLanguageCode);
                    }

                    if (descriptionStats.itemsWithoutDescriptions > 0) {
                        setApplyDetail(t('repairMenuAiDescriptionsStep'));
                        updated = await runDescriptionGeneration({
                            action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
                            contentLength: 'Standard',
                            projectData: updated,
                        });
                    }

                    const repairSummaryParts = [
                        aiRepairSummary.languageIssueCount > 0
                            ? t('repairMenuAiLanguageIssuesCount', { count: aiRepairSummary.languageIssueCount })
                            : null,
                        aiRepairSummary.descriptionsToGenerate > 0
                            ? t('repairMenuAiDescriptionsCount', { count: aiRepairSummary.descriptionsToGenerate })
                            : null,
                        aiRepairSummary.missingPrices > 0
                            ? t('repairMenuAiPricesReviewCount', { count: aiRepairSummary.missingPrices })
                            : null,
                    ].filter(Boolean) as string[];

                    setWorkingProject(updated);
                    onApply(updated, {
                        previousProject,
                        successMessage: repairSummaryParts.join(' · '),
                        updatedCount: totalFixes,
                    });
                    onClose();
                } catch (error) {
                    if (error instanceof AICapacityError) {
                        Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });
                    } else {
                        Toast.show({ content: t('repairMenuAiFailed'), duration: 2200 });
                    }
                } finally {
                    setApplying(false);
                    setApplyDetail('');
                }
            },
            title: t('repairMenuAi'),
        });
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
                    const previousProject = removeObjRef(workingProject);
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

                    setWorkingProject(updated);
                    onApply(updated, { previousProject, updatedCount: selectedIds.size });
                    setSelectedIds(new Set());
                    setAction(null);
                    onClose();
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
        ? t('markAvailableUnavailable')
        : action === 'showHide'
            ? t('visibility')
            : action === 'pricing'
                ? t('editPricesBulk')
                : action === 'moveCategory'
                    ? t('moveItems')
                    : t('repairMenuAi');

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

    const renderItemStatus = (item: ItemEntry) => {
        if (action === 'availability') {
            if (!item.available && !item.active) {
                return (
                    <Flex align="center" gap={8} wrap="wrap">
                        {renderStatusBadge(availabilityLabels.unavailable, STATUS_COLORS.unavailable)}
                        {renderStatusBadge(t('inactive'), STATUS_COLORS.inactive)}
                    </Flex>
                );
            }
            if (!item.available) {
                return renderStatusBadge(availabilityLabels.unavailable, STATUS_COLORS.unavailable);
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
                        {renderStatusBadge(availabilityLabels.unavailable, STATUS_COLORS.unavailable)}
                    </Flex>
                );
            }
            if (!item.active) {
                return renderStatusBadge(t('inactive'), STATUS_COLORS.inactive);
            }
            if (!item.available) {
                return renderStatusBadge(availabilityLabels.unavailable, STATUS_COLORS.unavailable);
            }
            return null;
        }

        return (
            <Flex gap={8} wrap="wrap">
                {!item.available ? renderStatusBadge(availabilityLabels.unavailable, STATUS_COLORS.unavailable) : null}
                {!item.active ? renderStatusBadge(t('inactive'), STATUS_COLORS.inactive) : null}
            </Flex>
        );
    };

    const renderPricingChange = (item: ItemEntry) => {
        const change = pricingPreviewByItemId.get(item.id);

        if (!selectedIds.has(item.id)) {
            return <Text type="secondary">{formatMenuPrice(item.price, currencySymbol)}</Text>;
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
                <Text type="secondary">{formatMenuPrice(change.oldPrice, currencySymbol)}</Text>
                <LuArrowRight size={12} style={{ color: token.colorTextQuaternary }} />
                <Text strong>{formatMenuPrice(change.newPrice, currencySymbol)}</Text>
                <Tag color={change.changePercent >= 0 ? 'success' : 'warning'}>
                    {change.changePercent >= 0 ? '+' : ''}{Math.round(change.changePercent * 10) / 10}%
                </Tag>
            </Flex>
        );
    };

    const activeFilterCount = statusFilter === 'all' ? 0 : 1;
    const statusFilterLabel = statusFilter === 'active'
        ? t('shownOnMenu')
        : statusFilter === 'inactive'
            ? t('hiddenFromMenu')
            : statusFilter === 'soldOut'
                ? availabilityLabels.unavailable
                : t('allStatuses');

    const unavailableItems = searchScopedItems.filter((item) => !item.available);
    const hiddenItems = searchScopedItems.filter((item) => !item.active);
    const missingPriceItems = searchScopedItems.filter(hasMissingPrice);
    const missingDescriptionItems = searchScopedItems.filter(hasMissingDescription);
    const missingImageItems = searchScopedItems.filter(hasMissingImage);

    if (action === 'aiRepair') {
        const fixableNowCount = aiRepairSummary.languageIssueCount + aiRepairSummary.descriptionsToGenerate;

        return (
            <Popup
                bodyStyle={{ minHeight: '64vh', maxHeight: '90vh', overflowX: 'hidden', padding: 0 }}
                destroyOnClose
                onMaskClick={applying ? undefined : onClose}
                position="bottom"
                visible={visible}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar onBack={applying ? undefined : onClose}>
                        {actionTitle}
                    </NavBar>

                    <Flex gap={12} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                        <Card size="small" style={{ borderColor: token.colorPrimaryBorder }}>
                            <Flex gap={10} vertical>
                                <Flex align="center" gap={8}>
                                    <LuSparkles size={18} style={{ color: token.colorPrimary }} />
                                    <Flex gap={2} vertical>
                                        <Text strong>{t('repairMenuAi')}</Text>
                                        <Text type="secondary">{t('repairMenuAiDesc')}</Text>
                                    </Flex>
                                </Flex>
                                <Text type="secondary">
                                    {t('repairMenuAiSummary')}
                                </Text>
                            </Flex>
                        </Card>

                        <Card size="small">
                            <Flex gap={10} vertical>
                                <Flex align="center" gap={8}>
                                    <LuSparkles size={16} style={{ color: token.colorSuccess }} />
                                    <Text strong>{fixableNowCount === 0 ? t('menuRepairNotNeeded') : t('repairMenuAiFixNow')}</Text>
                                </Flex>
                                {fixableNowCount > 0 ? (
                                    <Flex gap={8} wrap="wrap">
                                        {aiRepairSummary.descriptionsToGenerate > 0 ? (
                                            <Tag color="success">
                                                {t('repairMenuAiDescriptionsCount', { count: aiRepairSummary.descriptionsToGenerate })}
                                            </Tag>
                                        ) : null}
                                        {aiRepairSummary.languageIssueCount > 0 ? (
                                            <Tag color="processing">
                                                {t('repairMenuAiLanguageIssuesCount', { count: aiRepairSummary.languageIssueCount })}
                                            </Tag>
                                        ) : null}
                                    </Flex>
                                ) : (
                                    <Text type="secondary">{t('menuCompletionReadyDesc')}</Text>
                                )}
                                {languagesNeedingRepair.length > 0 ? (
                                    <Flex gap={8} vertical>
                                        {languagesNeedingRepair.map((issue) => (
                                            <Flex align="center" gap={8} key={issue.code} justify="space-between">
                                                <Flex align="center" gap={8}>
                                                    <LuLanguages size={14} style={{ color: token.colorPrimary }} />
                                                    <Text>{issue.code.toUpperCase()}</Text>
                                                </Flex>
                                                <Text type="secondary">
                                                    {issue.missing > 0 ? `${issue.missing} ${t('repairMenuAiMissingShort')}` : null}
                                                    {issue.missing > 0 && issue.mismatched > 0 ? ' · ' : null}
                                                    {issue.mismatched > 0 ? `${issue.mismatched} ${t('repairMenuAiWrongShort')}` : null}
                                                </Text>
                                            </Flex>
                                        ))}
                                    </Flex>
                                ) : null}
                            </Flex>
                        </Card>

                        {hasManualReviewItems ? (
                            <Card size="small">
                                <Flex gap={10} vertical>
                                    <Flex align="center" gap={8}>
                                        <LuFileText size={16} style={{ color: token.colorWarning }} />
                                        <Text strong>{t('repairMenuAiNeedsManualReview')}</Text>
                                    </Flex>
                                    <Flex gap={8} wrap="wrap">
                                        {aiRepairSummary.missingPrices > 0 ? (
                                            <Tag>{t('repairMenuAiMissingPricesCount', { count: aiRepairSummary.missingPrices })}</Tag>
                                        ) : null}
                                        {aiRepairSummary.missingImages > 0 ? (
                                            <Tag>{t('repairMenuAiMissingImagesCount', { count: aiRepairSummary.missingImages })}</Tag>
                                        ) : null}
                                    </Flex>
                                    <Text type="secondary">{t('repairMenuAiManualReviewHint')}</Text>
                                    {hasLatinScriptRepairLanguages ? (
                                        <Text type="secondary">{t('repairMenuAiLatinLanguageHint')}</Text>
                                    ) : null}
                                </Flex>
                            </Card>
                        ) : hasLatinScriptRepairLanguages ? (
                            <Card size="small">
                                <Text type="secondary">{t('repairMenuAiLatinLanguageHint')}</Text>
                            </Card>
                        ) : null}

                        {applying ? (
                            <Card size="small" style={{ borderColor: token.colorBorderSecondary }}>
                                <Flex gap={8} vertical>
                                    <Text strong>{t('repairMenuAiWorking')}</Text>
                                    <Text type="secondary">{applyDetail || t('repairMenuAiPreparing')}</Text>
                                </Flex>
                            </Card>
                        ) : null}
                    </Flex>

                    <div
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            flexShrink: 0,
                            padding: '12px 16px',
                        }}
                    >
                        <Button
                            block
                            color="primary"
                            disabled={fixableNowCount === 0}
                            loading={applying}
                            onClick={() => void handleAiRepair()}
                            size="large"
                        >
                            {fixableNowCount === 0 ? t('menuRepairNotNeeded') : t('repairMenuAiAction')}
                        </Button>
                    </div>
                </Flex>
            </Popup>
        );
    }

    const renderSelectionShortcut = (label: string, nextItems: ItemEntry[]) => (
        <Flex
            align="center"
            gap={10}
            onClick={(event) => {
                event.stopPropagation();
                if (nextItems.length === 0) return;
                selectItems(nextItems);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 10,
                cursor: nextItems.length > 0 ? 'pointer' : 'not-allowed',
                opacity: nextItems.length > 0 ? 1 : 0.45,
                padding: '9px 12px',
            }}
        >
            <LuCheck size={14} style={{ color: nextItems.length > 0 ? token.colorPrimary : token.colorTextQuaternary, flex: '0 0 auto' }} />
            <Text>{label}</Text>
        </Flex>
    );

    const statusFilterContent = (
        <Flex gap={8} style={{ minWidth: 240 }} vertical>
            <Flex gap={4} vertical>
                <Text strong type="secondary">{t('filters')}</Text>
                {([
                    { key: 'all', label: t('allStatuses') },
                    { key: 'active', label: t('shownOnMenu') },
                    { key: 'inactive', label: t('hiddenFromMenu') },
                    { key: 'soldOut', label: availabilityLabels.unavailable },
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
            <Flex
                style={{
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    paddingTop: 8,
                }}
                gap={6}
                vertical
            >
                <Text strong type="secondary">{t('selectionShortcuts')}</Text>
                {filteredItems.length > 0 ? renderSelectionShortcut(t('selectVisibleResults', { count: filteredItems.length }), filteredItems) : null}
                {unavailableItems.length > 0 ? renderSelectionShortcut(`${availabilityLabels.unavailable} (${unavailableItems.length})`, unavailableItems) : null}
                {hiddenItems.length > 0 ? renderSelectionShortcut(t('selectHiddenItems', { count: hiddenItems.length }), hiddenItems) : null}
                {missingPriceItems.length > 0 ? renderSelectionShortcut(t('selectMissingPriceItems', { count: missingPriceItems.length }), missingPriceItems) : null}
                {missingDescriptionItems.length > 0 ? renderSelectionShortcut(`${t('missingDescription')} (${missingDescriptionItems.length})`, missingDescriptionItems) : null}
                {missingImageItems.length > 0 ? renderSelectionShortcut(`${t('missingPhoto')} (${missingImageItems.length})`, missingImageItems) : null}
            </Flex>
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
                >
                    {actionTitle}
                </NavBar>

                <Flex gap={10} style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 10px' }} vertical>
                    {action === 'pricing' ? (
                        <Card size="small" style={{ borderColor: token.colorBorderSecondary }}>
                            <Flex gap={10} vertical>
                                <Flex align="center" gap={8}>
                                    <Flex gap={2} vertical>
                                        <Text strong>{t('priceChangeTitle')}</Text>
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
                                    style={{ minHeight: 44 }}
                                    value={pricingMode}
                                />
                                <Flex align="center" gap={8}>
                                    {pricingMode !== 'set' ? (
                                        <Flex style={{ minWidth: 72 }}>
                                            <Segmented
                                                block
                                                onChange={(value) => handlePricingUnitChange(value as string)}
                                                options={[
                                                    { label: '%', value: 'percent' },
                                                    { label: currencySymbol, value: 'amount' },
                                                ]}
                                                size="small"
                                                style={{ minHeight: 44 }}
                                                value={pricingUnit}
                                            />
                                        </Flex>
                                    ) : null}
                                    <Flex style={{ flex: 1, minWidth: 0 }}>
                                        <Flex
                                            align="center"
                                            style={{
                                                backgroundColor: token.colorBgContainer,
                                                border: `1px solid ${token.colorBorder}`,
                                                borderRadius: 12,
                                                overflow: 'hidden',
                                                minHeight: 48,
                                                width: '100%',
                                            }}
                                        >
                                            {pricingMethod.includes('Percent') ? null : (
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        backgroundColor: token.colorFillAlter,
                                                        borderRight: `1px solid ${token.colorBorderSecondary}`,
                                                        color: token.colorTextSecondary,
                                                        minHeight: 48,
                                                        minWidth: 40,
                                                        padding: '0 10px',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <Text>{currencySymbol}</Text>
                                                </Flex>
                                            )}
                                            <Input
                                                onChange={(value) => {
                                                    const parsed = value === '' ? null : Number(value);
                                                    setPricingValue(Number.isFinite(parsed) && parsed !== null && parsed >= 0 ? parsed : null);
                                                }}
                                                placeholder={pricingMethod.includes('Percent') ? t('enterPercentage') : t('enterAmount')}
                                                style={{ border: 'none', borderRadius: 0, fontSize: 16, fontWeight: 600, minHeight: 48, width: '100%' }}
                                                type="number"
                                                value={pricingValue === null ? '' : String(pricingValue)}
                                            />
                                            {pricingMethod.includes('Percent') ? (
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        backgroundColor: token.colorFillAlter,
                                                        borderLeft: `1px solid ${token.colorBorderSecondary}`,
                                                        color: token.colorTextSecondary,
                                                        minHeight: 48,
                                                        minWidth: 40,
                                                        padding: '0 10px',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    <Text>%</Text>
                                                </Flex>
                                            ) : null}
                                        </Flex>
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
                            </Flex>
                        </Card>
                    ) : null}

                    <Flex align="center" gap={10}>
                        <Flex style={{ flex: 1, minWidth: 0 }}>
                            <SearchBar
                                onChange={handleSearchChange}
                                placeholder={t('smartRecommendationsSearchItems')}
                                value={search}
                            />
                        </Flex>

                        <Popover
                            content={statusFilterContent}
                            onOpenChange={setIsStatusFilterOpen}
                            open={isStatusFilterOpen}
                            placement="bottomLeft"
                            trigger="click"
                        >
                            <Button
                                fill="outline"
                                size="middle"
                                style={{ height: 32, minHeight: 32, minWidth: 98 }}
                            >
                                <Flex align="center" gap={6}>
                                    <LuFilter size={16} />
                                    <Text>{activeFilterCount > 0 ? statusFilterLabel : t('filters')}</Text>
                                </Flex>
                            </Button>
                        </Popover>
                    </Flex>

                    <Flex align="center" gap={12} justify="space-between" wrap={false}>
                        <div style={{ minWidth: 0 }}>
                            <Checkbox
                                checked={filteredItems.length > 0 && effectiveSelectedCount === filteredItems.length}
                                indeterminate={effectiveSelectedCount > 0 && effectiveSelectedCount < filteredItems.length}
                                onChange={toggleAll}
                            >
                                <Text style={{ whiteSpace: 'nowrap' }}>
                                    {filteredItems.length > 0 && effectiveSelectedCount === filteredItems.length
                                        ? t('deselectVisibleResults', { count: filteredItems.length })
                                        : t('selectVisibleResults', { count: filteredItems.length })}
                                </Text>
                            </Checkbox>
                        </div>
                        {selectedIds.size > 0 ? (
                            <Button
                                color="danger"
                                fill="none"
                                onClick={clearSelection}
                                size="small"
                                style={clearSelectionButtonStyle}
                                icon={<LuX />}
                            >
                                Clear selection
                            </Button>
                        ) : (
                            <div style={{ minWidth: 72 }} />
                        )}
                    </Flex>

                    {selectedIds.size > 0 ? (
                        <Flex gap={6} style={selectionSummaryStyle} vertical>
                            <Flex align="center" gap={10} justify="space-between" wrap>
                                <Flex gap={8} wrap="wrap">
                                    <Tag color="processing">
                                        {selectedHiddenByFiltersCount > 0
                                            ? t('selectedHiddenByFilters', { count: selectedIds.size, hidden: selectedHiddenByFiltersCount })
                                            : t('selectedCount', { count: selectedIds.size })}
                                    </Tag>
                                    {action === 'pricing' && preview && 'itemsAffected' in preview ? (
                                        <>
                                            <Tag>{formatMenuPrice(preview.avgPriceBefore, currencySymbol)} before</Tag>
                                            <Tag color="processing">{formatMenuPrice(preview.avgPriceAfter, currencySymbol)} after</Tag>
                                        </>
                                    ) : null}
                                </Flex>
                            </Flex>
                            {selectedHiddenByFiltersCount > 0 ? (
                                <Text type="secondary">{t('hiddenSelectionCaution')}</Text>
                            ) : null}
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
                                                <Tag color={selectedCount > 0 ? 'processing' : undefined} style={{ borderRadius: 999 }}>
                                                    {selectedCount}/{categoryItems.length}
                                                </Tag>
                                            </Flex>
                                        )}
                                    >
                                        <Flex gap={8} vertical>
                                            {categoryItems.map((item) => (
                                                <Card
                                                    key={item.id}
                                                    size="small"
                                                    style={{
                                                        backgroundColor: selectedIds.has(item.id) ? token.colorPrimaryBg : token.colorBgContainer,
                                                        borderColor: selectedIds.has(item.id) ? token.colorPrimaryBorder : token.colorBorderSecondary,
                                                        margin: 0,
                                                    }}
                                                >
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
                                                                    {action === 'pricing' ? renderPricingChange(item) : null}
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
                    )}
                </Flex>

                {selectedIds.size > 0 ? (
                    <div
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            bottom: 0,
                            flexShrink: 0,
                            marginBottom: -16,
                            padding: '12px 16px',
                            position: 'sticky',
                            zIndex: 5,
                        }}
                    >
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
                                        <Text>{t('markAvailable')} ({selectedAvailabilitySummary.toMarkAvailable})</Text>
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
                                    {availabilityLabels.unavailable} ({selectedAvailabilitySummary.toMarkUnavailable})
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
                                        <Text>{t('showOnMenu')} ({selectedVisibilitySummary.toShow})</Text>
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
                                        <Text>{t('hideFromMenu')} ({selectedVisibilitySummary.toHide})</Text>
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
                                {action === 'pricing' ? t('applyToItems', { count: selectedIds.size }) : t('moveSelectedItems')}
                            </Button>
                        )}
                    </div>
                ) : null}
            </Flex>
        </Popup>
    );
}
