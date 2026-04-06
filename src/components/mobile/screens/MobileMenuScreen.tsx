'use client'

import { getOwnerLabels } from '@config/businessLabels';
import { getProjectData, getProjectsList, updateProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import useMenuProcessingJob from '@hook/useMenuProcessingJob';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import { runComparisonEngine } from '@lib/extraction/comparisonEngine';
import type { ComparisonEngineOutput, ComparisonMode } from '@lib/extraction/comparisonEngine.types';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { removeObjRef } from '@util/utils';
import { FloatButton, InputNumber, Segmented, theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuCamera, LuFilter, LuSettings2, LuX } from 'react-icons/lu';
import { Button, Card, Checkbox, Collapse, DotLoading, Empty, Flex, List, Popup, ProgressBar, PullToRefresh, Result, SearchBar, Switch, Tag, Text, Title, Toast } from '../antd';
import type { MobileMenuItemType as MenuItemType } from '../types';
import MobileMenuCommandSheet from '../components/MobileMenuCommandSheet';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import type { MobileCategoryReorderItem } from '../sheets/CategoryManagerSheet';

const ItemEditSheet = dynamic(() => import('../sheets/ItemEditSheet'), { ssr: false });
const AddItemSheet = dynamic(() => import('../sheets/AddItemSheet'), { ssr: false });
const MenuUploadSheet = dynamic(() => import('../sheets/MenuUploadSheet'), { ssr: false });
const ExtractionReviewSheet = dynamic(() => import('../sheets/ExtractionReviewSheet'), { ssr: false });
const BulkActionsSheet = dynamic(() => import('../sheets/BulkActionsSheet'), { ssr: false });
const MobileMenuQualitySignals = dynamic(() => import('../components/MenuQualitySignals'), { ssr: false });
const CategoryManagerSheet = dynamic(() => import('../sheets/CategoryManagerSheet'), { ssr: false });
const ManageLanguagesSheet = dynamic(() => import('../sheets/ManageLanguagesSheet'), { ssr: false });
const GenerateDescriptionsSheet = dynamic(() => import('../sheets/GenerateDescriptionsSheet'), { ssr: false });
const SmartRecommendationsSheet = dynamic(() => import('../sheets/SmartRecommendationsSheet'), { ssr: false });

type CategoryOption = { id: string; name: string };
type CategorySummary = {
    active: boolean;
    id: string;
    itemCount: number;
    name: string;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
};

type MobileMenuFilters = {
    categoryIds: string[];
    minPrice: number | null;
    maxPrice: number | null;
    hasImage: boolean | null;
    activeStatus: boolean | null;
};

const DEFAULT_FILTERS: MobileMenuFilters = {
    categoryIds: [],
    minPrice: null,
    maxPrice: null,
    hasImage: null,
    activeStatus: null,
};

export default function MobileMenuScreen() {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const availabilityLabels = getOwnerLabels(storeDetails?.businessType);
    const currencySymbol = storeDetails?.currencySymbol || '₹';
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<MobileMenuFilters>(DEFAULT_FILTERS);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'availability' | 'showHide' | 'pricing' | 'moveCategory' | null>(null);
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [categorySheetMode, setCategorySheetMode] = useState<'manage' | 'reorder'>('manage');
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
    const [isManageLanguagesOpen, setIsManageLanguagesOpen] = useState(false);
    const [isGenerateDescriptionsOpen, setIsGenerateDescriptionsOpen] = useState(false);
    const [isSmartRecommendationsOpen, setIsSmartRecommendationsOpen] = useState(false);
    const [returnToCommandMenu, setReturnToCommandMenu] = useState(false);
    const [menuData, setMenuData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [activeProcessingState, setActiveProcessingStateState] = useState<{ jobId: string; projectId: string } | null>(() => {
        if (typeof window === 'undefined') return null;
        const raw = window.sessionStorage.getItem('mobileMenuActiveProcessingJob');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            window.sessionStorage.removeItem('mobileMenuActiveProcessingJob');
            return null;
        }
    });
    const [showReviewSheet, setShowReviewSheet] = useState(false);
    const [comparisonResult, setComparisonResult] = useState<ComparisonEngineOutput | null>(null);
    const [showSuccessState, setShowSuccessState] = useState(false);
    const [showFailureState, setShowFailureState] = useState(false);
    const [failureMessage, setFailureMessage] = useState('');
    const [extractionStats, setExtractionStats] = useState<{
        qualityScore?: number;
        qualityDetails?: { categoryQuality: number; itemQuality: number; priceQuality: number; descriptionQuality: number };
        categoriesCount?: number;
        itemsCount?: number;
    } | null>(null);
    const uncategorizedLabel = t('uncategorized');

    const setActiveProcessingState = useCallback((value: { jobId: string; projectId: string } | null) => {
        setActiveProcessingStateState(value);
        if (typeof window === 'undefined') return;
        if (value) {
            window.sessionStorage.setItem('mobileMenuActiveProcessingJob', JSON.stringify(value));
        } else {
            window.sessionStorage.removeItem('mobileMenuActiveProcessingJob');
        }
    }, []);

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
            fetchMenuData(activeProcessingState?.projectId || undefined);
        }
    }, [activeProcessingState?.projectId, storeDetails?.storeId, fetchMenuData]);

    useEffect(() => {
        if (!menuData?.projectId || activeProcessingState) return;

        const checkExistingJob = async () => {
            try {
                const activeJobId = await checkExistingActiveJob(menuData.projectId);
                if (activeJobId) {
                    setActiveProcessingState({
                        jobId: activeJobId,
                        projectId: menuData.projectId,
                    });
                }
            } catch (error) {
                console.error('[MobileMenu] Failed to restore active job:', error);
            }
        };

        void checkExistingJob();
    }, [activeProcessingState, menuData?.projectId, setActiveProcessingState]);

    const activeProcessingJobId = activeProcessingState?.jobId || null;
    const {
        job: activeJob,
        isProcessing: jobIsProcessing,
        isPending: jobIsPending,
        isCancelling: jobIsCancelling,
        isCompleted: jobIsCompleted,
        isFailed: jobIsFailed,
        isCancelled: jobIsCancelled,
        isPreviewReady: jobIsPreviewReady,
        progress: jobProgress,
        currentStep: jobCurrentStep,
        error: jobError,
        cancel: cancelJob,
    } = useMenuProcessingJob(activeProcessingJobId);

    const isJobBlocking = Boolean(activeProcessingJobId) && !showReviewSheet && (jobIsPending || jobIsProcessing || jobIsCancelling);
    const isBusy = Boolean(activeProcessingJobId);

    useEffect(() => {
        if (!activeProcessingJobId) return;

        if (jobIsCompleted) {
            const result = activeJob?.result;
            if (result) {
                setExtractionStats({
                    qualityScore: result.qualityScore,
                    qualityDetails: result.qualityDetails,
                    categoriesCount: result.combinedData?.categories?.length || 0,
                    itemsCount: result.combinedData?.items?.length || 0,
                });
            }
            setActiveProcessingState(null);
            setShowReviewSheet(false);
            setComparisonResult(null);
            void fetchMenuData(activeProcessingState?.projectId || menuData?.projectId);
            setShowSuccessState(true);
        }

        if (jobIsPreviewReady && !showReviewSheet && activeJob?.result && menuData?.projectId) {
            try {
                const existingItems = menuData.files?.flatMap((file: any) => (file.extractedData?.data?.items || []).map((item: any) => ({
                    ...item,
                    fileUid: file.uid,
                }))) || [];
                const existingCategories = menuData.files?.flatMap((file: any) => (file.extractedData?.data?.categories || []).map((category: any) => ({
                    ...category,
                    fileUid: file.uid,
                }))) || [];
                const extractedItems = activeJob.result.combinedData?.items || [];
                const extractedCategories = activeJob.result.combinedData?.categories || [];
                const comparisonMode: ComparisonMode = menuData?.masterProjectId ? 'OUTLET_LINKED' : 'SINGLE_STORE';
                const primaryLang = menuData?.languages?.[0] || 'en';

                const comparison = runComparisonEngine({
                    extracted: {
                        categories: extractedCategories,
                        items: extractedItems,
                    },
                    storeProject: {
                        categories: existingCategories,
                        items: existingItems,
                    },
                    mode: comparisonMode,
                    primaryLang,
                });

                setExtractionStats({
                    qualityScore: activeJob.result.qualityScore,
                    qualityDetails: activeJob.result.qualityDetails,
                    categoriesCount: activeJob.result.combinedData?.categories?.length || 0,
                    itemsCount: activeJob.result.combinedData?.items?.length || 0,
                });
                setComparisonResult(comparison);
                setShowReviewSheet(true);
            } catch (error) {
                console.error('[MobileMenu] Comparison engine failed:', error);
                setFailureMessage(t('comparisonFailed'));
                setShowFailureState(true);
                setShowReviewSheet(false);
                setComparisonResult(null);
                setActiveProcessingState(null);
            }
        }

        if (jobIsFailed) {
            setFailureMessage(jobError?.message || t('processingFailedMessage'));
            setShowFailureState(true);
            setShowReviewSheet(false);
            setComparisonResult(null);
            setActiveProcessingState(null);
        }

        if (jobIsCancelled) {
            Toast.show({ content: t('processingCancelled'), duration: 1800 });
            setShowReviewSheet(false);
            setComparisonResult(null);
            setActiveProcessingState(null);
        }
    }, [
        activeJob,
        activeProcessingJobId,
        activeProcessingState?.projectId,
        fetchMenuData,
        jobError?.message,
        jobIsCancelled,
        jobIsCompleted,
        jobIsFailed,
        jobIsPreviewReady,
        menuData,
        setActiveProcessingState,
        showReviewSheet,
        t,
    ]);

    const activeLang = useMemo(() => menuData?.languages?.[0] || 'en', [menuData?.languages]);

    const categoryOptions = useMemo<CategoryOption[]>(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, string>();
        menuData.files.forEach((file: any) => {
            const categories = file.extractedData?.data?.categories || [];
            categories.forEach((category: any) => {
                const label = category.name?.[activeLang] || category.name?.en || category.name || uncategorizedLabel;
                if (!map.has(category.id)) map.set(category.id, label);
            });
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [activeLang, menuData?.files, uncategorizedLabel]);

    const menuItems = useMemo(() => {
        if (!menuData?.files) return [];
        const items: MenuItemType[] = [];
        menuData.files.forEach((file: any) => {
            if (file.extractedData?.data?.categories && Array.isArray(file.extractedData.data.categories)) {
                const categories = [...file.extractedData.data.categories].sort((a: any, b: any) => {
                    const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
                    const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    const aName = a.name?.[activeLang] || a.name?.en || a.name || '';
                    const bName = b.name?.[activeLang] || b.name?.en || b.name || '';
                    return aName.localeCompare(bName);
                });
                const categoryMap: Record<string, string> = {};
                categories.forEach((category: any) => {
                    categoryMap[category.id] = category.name?.[activeLang] || category.name?.en || category.name || uncategorizedLabel;
                });
                const menuItems = file.extractedData.data.items || [];
                categories.forEach((category: any) => {
                    const categoryName = categoryMap[category.id] || uncategorizedLabel;
                    const categoryItems = menuItems.filter((item: any) => item.category === category.id);
                    categoryItems.forEach((item: any) => {
                        const itemName = item.name?.[activeLang] || item.name?.en || item.name || t('unnamedItem');
                        const itemDescription = item.description?.[activeLang] || item.description?.en || item.description || '';
                        const price = typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0);
                        const available = item.available !== false;
                        const active = item.active !== false;
                        items.push({
                            id: item.id || `${categoryName}-${itemName}`,
                            name: itemName,
                            price: price,
                            attributes: item.attributes?.map((attribute: any) => ({
                                id: attribute.id,
                                name: attribute.name?.[activeLang] || attribute.name?.en || attribute.name || 'Variant',
                                price: typeof attribute.price === 'string' ? parseFloat(attribute.price) || 0 : (attribute.price || 0),
                                active: attribute.active !== false,
                            })),
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
    }, [activeLang, menuData, t, uncategorizedLabel]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return menuItems.filter((item) => {
            if (q && !item.name.toLowerCase().includes(q) && !item.categoryName?.toLowerCase().includes(q)) {
                return false;
            }
            if (filters.categoryIds.length > 0 && (!item.categoryId || !filters.categoryIds.includes(item.categoryId))) {
                return false;
            }
            if (filters.minPrice !== null && item.price < filters.minPrice) {
                return false;
            }
            if (filters.maxPrice !== null && item.price > filters.maxPrice) {
                return false;
            }
            if (filters.hasImage !== null) {
                const hasImage = Boolean(item.image);
                if (hasImage !== filters.hasImage) return false;
            }
            if (filters.activeStatus !== null && item.active !== filters.activeStatus) {
                return false;
            }
            return true;
        });
    }, [filters, menuItems, searchQuery]);

    const appliedFilterCount = useMemo(() => {
        return [
            filters.categoryIds.length > 0,
            filters.minPrice !== null || filters.maxPrice !== null,
            filters.hasImage !== null,
            filters.activeStatus !== null,
        ].filter(Boolean).length;
    }, [filters]);

    const activeFilterChips = useMemo(() => {
        const chips: { key: string; label: string; onRemove: () => void }[] = [];

        filters.categoryIds.forEach((categoryId) => {
            const categoryLabel = categoryOptions.find((option) => option.id === categoryId)?.name || t('category');
            chips.push({
                key: `category-${categoryId}`,
                label: `${t('category')}: ${categoryLabel}`,
                onRemove: () => setFilters((prev) => ({
                    ...prev,
                    categoryIds: prev.categoryIds.filter((id) => id !== categoryId),
                })),
            });
        });

        if (filters.minPrice !== null || filters.maxPrice !== null) {
            chips.push({
                key: 'price',
                label: `${t('priceRange')}: ${filters.minPrice ?? 0} - ${filters.maxPrice ?? 'Any'}`,
                onRemove: () => setFilters((prev) => ({ ...prev, minPrice: null, maxPrice: null })),
            });
        }

        if (filters.hasImage !== null) {
            chips.push({
                key: 'image',
                label: filters.hasImage ? t('hasImage') : t('noImage'),
                onRemove: () => setFilters((prev) => ({ ...prev, hasImage: null })),
            });
        }

        if (filters.activeStatus !== null) {
            chips.push({
                key: 'status',
                label: filters.activeStatus ? t('active') : t('hidden'),
                onRemove: () => setFilters((prev) => ({ ...prev, activeStatus: null })),
            });
        }

        return chips;
    }, [categoryOptions, filters, t]);

    const groupedItems = useMemo(() => {
        const groups: Record<string, MenuItemType[]> = {};
        filteredItems.forEach((item) => {
            const category = item.categoryName || uncategorizedLabel;
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
        });
        return groups;
    }, [filteredItems, uncategorizedLabel]);
    const categoryCount = useMemo(() => {
        const categories = new Set(menuItems.map((item) => item.categoryName || uncategorizedLabel));
        return categories.size;
    }, [menuItems, uncategorizedLabel]);
    const activeProjectSummary = useMemo(
        () => projectsList.find((project: any) => project.projectId === menuData?.projectId) || null,
        [menuData?.projectId, projectsList]
    );

    const categorySummary = useMemo(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, CategorySummary>();
        menuData.files.forEach((file: any) => {
            const categories = file.extractedData?.data?.categories || [];
            const items = file.extractedData?.data?.items || [];
            categories.forEach((category: any) => {
                const name = category.name?.[activeLang] || category.name?.en || category.name || uncategorizedLabel;
                const count = items.filter((item: any) => item.category === category.id).length;
                if (!map.has(category.id)) {
                    map.set(category.id, {
                        id: category.id,
                        name,
                        active: category.active !== false,
                        itemCount: count,
                        orderIndex: category.orderIndex,
                        timeSlotPresetIds: (category.timeSlots || []).map((slot: any) => slot.presetId).filter(Boolean),
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [activeLang, menuData?.files, uncategorizedLabel]);

    const categoryItemMap = useMemo<Record<string, MobileCategoryReorderItem[]>>(() => {
        if (!menuData?.files) return {};
        const grouped: Record<string, MobileCategoryReorderItem[]> = {};
        menuData.files.forEach((file: any) => {
            const items = file.extractedData?.data?.items || [];
            items.forEach((item: any) => {
                const categoryId = item.category || 'uncategorized';
                if (!grouped[categoryId]) grouped[categoryId] = [];
                grouped[categoryId].push({
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.en || item.name || t('unnamedItem'),
                    active: item.active !== false,
                    price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price,
                });
            });
        });
        return grouped;
    }, [activeLang, menuData?.files, t]);

    const handleCategoryAdd = async (name: string) => {
        if (!menuData) return;
        const updated = removeObjRef(menuData);
        const targetFile = updated.files?.[0];
        if (!targetFile) return;
        if (!targetFile.extractedData) targetFile.extractedData = { data: { categories: [], items: [], languages: [] } };
        if (!targetFile.extractedData.data) targetFile.extractedData.data = { categories: [], items: [], languages: [] };
        if (!targetFile.extractedData.data.categories) targetFile.extractedData.data.categories = [];
        const newId = `cat-${Date.now()}`;
        targetFile.extractedData.data.categories.push({
            id: newId,
            active: true,
            name: { [activeLang]: name },
        });
        await updateProject(updated);
        setMenuData(updated);
    };

    const handleCategoryRename = async (categoryId: string, name: string) => {
        if (!menuData) return;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                if (category.id === categoryId) {
                    const nextName = typeof category.name === 'object' && category.name ? { ...category.name } : {};
                    nextName[activeLang] = name;
                    category.name = nextName;
                }
            });
        });
        await updateProject(updated);
        setMenuData(updated);
    };

    const handleCategoryToggle = async (categoryId: string, active: boolean) => {
        if (!menuData) return;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                if (category.id === categoryId) {
                    category.active = active;
                }
            });
        });
        await updateProject(updated);
        setMenuData(updated);
    };

    const handleCategoryDelete = async (categoryId: string) => {
        if (!menuData) return;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            if (!file.extractedData?.data) return;
            const categories = file.extractedData.data.categories || [];
            const items = file.extractedData.data.items || [];
            let uncategorized = categories.find((cat: any) => (cat.name?.[activeLang] || cat.name?.en || cat.name) === uncategorizedLabel);
            if (!uncategorized) {
                uncategorized = { id: `uncat-${Date.now()}`, active: true, name: { [activeLang]: uncategorizedLabel } };
                categories.push(uncategorized);
            }
            file.extractedData.data.categories = categories.filter((cat: any) => cat.id !== categoryId);
            file.extractedData.data.items = items.map((item: any) => {
                if (item.category === categoryId) {
                    return { ...item, category: uncategorized.id };
                }
                return item;
            });
        });
        await updateProject(updated);
        setMenuData(updated);
    };

    const handleCategoryReorder = async (orderedCategoryIds: string[]) => {
        if (!menuData) return;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                const index = orderedCategoryIds.findIndex((itemId) => itemId === category.id);
                if (index >= 0) {
                    category.orderIndex = index;
                }
            });
        });
        await updateProject(updated);
        setMenuData(updated);
    };

    const handleCategoryTimeSlots = async (categoryId: string, presetIds: string[]) => {
        if (!menuData) return;
        const presets = storeDetails?.timeSlotPresets || [];
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                if (category.id !== categoryId) return;
                if (!presetIds.length) {
                    category.timeSlots = undefined;
                    return;
                }
                category.timeSlots = presetIds
                    .map((presetId: string) => presets.find((preset: any) => preset.id === presetId))
                    .filter(Boolean)
                    .map((preset: any) => ({
                        presetId: preset.id,
                        startTime: preset.startTime,
                        endTime: preset.endTime,
                    }));
            });
        });
        await updateProject(updated);
        setMenuData(updated);
    };

    const handleCategoryItemReorder = async (categoryId: string, orderedItemIds: string[]) => {
        if (!menuData) return;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            const currentItems = file.extractedData?.data?.items || [];
            if (!currentItems.length) return;

            const categoryItems = currentItems.filter((item: any) => item.category === categoryId);
            if (!categoryItems.length) return;

            const byId = new Map(categoryItems.map((item: any) => [item.id, item]));
            const orderedForFile = orderedItemIds
                .map((itemId) => byId.get(itemId))
                .filter(Boolean);

            if (!orderedForFile.length) return;

            const reorderedSet = new Set(orderedForFile.map((item: any) => item.id));
            const untouchedCategoryItems = categoryItems.filter((item: any) => !reorderedSet.has(item.id));
            const nextCategoryItems = [...orderedForFile, ...untouchedCategoryItems];

            let categoryIndex = 0;
            file.extractedData.data.items = currentItems.map((item: any) => {
                if (item.category !== categoryId) return item;
                const nextItem = nextCategoryItems[categoryIndex];
                categoryIndex += 1;
                return nextItem || item;
            });
        });
        await updateProject(updated);
        setMenuData(updated);
    };

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
            content: newAvailability ? availabilityLabels.available : availabilityLabels.unavailable,
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
    }, [availabilityLabels.available, availabilityLabels.unavailable, menuData, t]);

    const handleRefresh = async () => {
        await fetchMenuData(menuData?.projectId);
    };

    const handleOpenUploadSheet = useCallback(() => {
        if (isBusy) {
            Toast.show({ content: t('menuUploadProcessingInProgress'), duration: 1800 });
            return;
        }

        setIsUploadSheetOpen(true);
    }, [isBusy, t]);

    const launchCommandAction = useCallback((action: () => void) => {
        setReturnToCommandMenu(true);
        setIsCommandMenuOpen(false);
        action();
    }, []);

    const handleCommandActionBack = useCallback((closeAction: () => void) => {
        closeAction();
        if (returnToCommandMenu) {
            setIsCommandMenuOpen(true);
            setReturnToCommandMenu(false);
        }
    }, [returnToCommandMenu]);

    const resetCommandActionFlow = useCallback(() => {
        setReturnToCommandMenu(false);
    }, []);

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
                    <ProjectSelectorTrigger
                        clickable={projectsList.length > 1 && !isBusy}
                        currentProject={{
                            id: menuData?.projectId || 'current',
                            isDefault: activeProjectSummary?.isDefault,
                            name: activeProjectSummary?.name || menuData?.name || t('currentProject'),
                        }}
                        onClick={projectsList.length > 1 && !isBusy ? () => setIsProjectSelectorOpen(true) : undefined}
                        rightContent={<Tag>{t('itemsCount', { count: menuItems.length })}</Tag>}
                    />

                    <Flex align="center" gap={8}>
                        <Flex style={{ flex: 1, minWidth: 0 }}>
                            <SearchBar
                                onChange={setSearchQuery}
                                placeholder={t('searchPlaceholder', { items: labels.itemsPlural })}
                                value={searchQuery}
                            />
                        </Flex>
                        <Flex style={{ flexShrink: 0 }}>
                            <Button block fill="outline" onClick={() => setIsFilterSheetOpen(true)} style={{ justifyContent: 'flex-start' }}>
                                <Flex align="center" gap={8}>
                                    <LuFilter size={16} />
                                    <Text>{t('filters')}</Text>
                                    {appliedFilterCount > 0 ? <Tag color="processing">{appliedFilterCount}</Tag> : null}
                                </Flex>
                            </Button>
                        </Flex>
                    </Flex>

                    {(activeFilterChips.length > 0 || searchQuery) ? (
                        <Flex align="center" gap={8} wrap="wrap">
                            {searchQuery ? (
                                <Tag style={{ borderRadius: 999, paddingInline: 10 }}>
                                    <Flex align="center" gap={6}>
                                        <Text>{`"${searchQuery}"`}</Text>
                                        <Button
                                            fill="none"
                                            onClick={() => setSearchQuery('')}
                                            size="mini"
                                            style={{ minWidth: 20, paddingInline: 0 }}
                                        >
                                            <LuX size={12} />
                                        </Button>
                                    </Flex>
                                </Tag>
                            ) : null}
                            {activeFilterChips.map((chip) => (
                                <Tag key={chip.key} style={{ borderRadius: 999, paddingInline: 10 }}>
                                    <Flex align="center" gap={6}>
                                        <Text>{chip.label}</Text>
                                        <Button
                                            fill="none"
                                            onClick={chip.onRemove}
                                            size="mini"
                                            style={{ minWidth: 20, paddingInline: 0 }}
                                        >
                                            <LuX size={12} />
                                        </Button>
                                    </Flex>
                                </Tag>
                            ))}
                            <Button
                                fill="none"
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilters(DEFAULT_FILTERS);
                                }}
                                size="small"
                            >
                                {t('clearAll')}
                            </Button>
                        </Flex>
                    ) : null}

                    <Flex align="center" justify="space-between">
                        <Text type="secondary">
                            {t('categoriesSummary', {
                                items: `${menuItems.length} ${labels.itemsPlural}`,
                                categories: t('categoriesCount', { count: categoryCount }),
                            })}
                        </Text>
                        {searchQuery ? <Tag>{t('itemsCount', { count: filteredItems.length })}</Tag> : null}
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
                                    <Button color="primary" onClick={handleOpenUploadSheet} size="large">
                                        {t('uploadMenuPhoto', { offering: labels.offeringTitle })}
                                    </Button>
                                </Flex>
                            </Card>
                        ) : (
                            <Empty description={searchQuery ? t('noItemsFound') : t('noMenuItemsYet', { items: labels.itemsPlural })} />
                        )
                    ) : (
                        <Collapse defaultActiveKey={Object.keys(groupedItems)[0] ? [Object.keys(groupedItems)[0]] : undefined}>
                            {Object.entries(groupedItems).map(([category, items]) => (
                                <Collapse.Panel
                                    key={category}
                                    title={(
                                        <Flex align="center" justify="space-between">
                                            <Text strong>{category}</Text>
                                            <Tag>{t('itemsCount', { count: items.length })}</Tag>
                                        </Flex>
                                    )}
                                >
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
                                                                {item.available ? availabilityLabels.available : availabilityLabels.unavailable}
                                                            </Tag>
                                                            {!item.active ? <Tag>{t('hidden')}</Tag> : null}
                                                            <Tag>{`${currencySymbol}${item.price}`}</Tag>
                                                        </Flex>
                                                    </Flex>
                                                }
                                            />
                                        ))}
                                    </List>
                                </Collapse.Panel>
                            ))}
                        </Collapse>
                    )}
                </Flex>
            </PullToRefresh>

            <FloatButton
                icon={<LuSettings2 size={18} />}
                onClick={() => setIsCommandMenuOpen(true)}
                style={{ bottom: 76, insetInlineEnd: 16 }}
                type="primary"
            />

            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60vh' }}
                visible={isJobBlocking}
            >
                <Flex align="center" gap={16} vertical>
                    <DotLoading color="primary" />
                    <Title level={4} style={{ margin: 0 }}>
                        {t('processingStatusTitle')}
                    </Title>
                    <Text style={{ textAlign: 'center' }} type="secondary">
                        {jobCurrentStep || t('processingOfferingDesc', { items: labels.itemsPlural })}
                    </Text>
                    <ProgressBar percent={jobProgress || (jobIsPending ? 5 : 15)} style={{ width: '100%' }} />
                    <Button block fill="outline" loading={jobIsCancelling} onClick={() => void cancelJob()}>
                        {t('cancelProcessing')}
                    </Button>
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                onMaskClick={() => setShowSuccessState(false)}
                visible={showSuccessState}
            >
                <Result
                    extra={[
                        <Button
                            block
                            color="primary"
                            key="view-menu"
                            onClick={() => setShowSuccessState(false)}
                            size="large"
                        >
                            {t('viewUpdatedMenu')}
                        </Button>,
                    ]}
                    status="success"
                    subTitle={t('processingSuccessDesc', {
                        categories: extractionStats?.categoriesCount || 0,
                        items: extractionStats?.itemsCount || 0,
                    })}
                    title={t('processingSuccessTitle')}
                />
            </Popup>

            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                onMaskClick={() => setShowFailureState(false)}
                visible={showFailureState}
            >
                <Result
                    extra={[
                        <Button block color="primary" key="retry" onClick={() => setShowFailureState(false)} size="large">
                            {t('tryAgain')}
                        </Button>,
                    ]}
                    status="error"
                    subTitle={failureMessage}
                    title={t('processingFailedTitle')}
                />
            </Popup>

            <Popup
                bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80vh', overflowX: 'hidden' }}
                onMaskClick={() => setIsFilterSheetOpen(false)}
                visible={isFilterSheetOpen}
            >
                <Flex gap={16} vertical>
                    <Title level={4} style={{ margin: 0 }}>{t('filters')}</Title>

                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" justify="space-between">
                                <Text strong>{t('category')}</Text>
                                {filters.categoryIds.length > 0 ? (
                                    <Tag color="processing" style={{ borderRadius: 999 }}>
                                        {filters.categoryIds.length}
                                    </Tag>
                                ) : null}
                            </Flex>
                            <Flex gap={10} vertical>
                                {categoryOptions.length === 0 ? (
                                    <Text type="secondary">{t('allCategories')}</Text>
                                ) : (
                                    categoryOptions.map((option) => (
                                        <Checkbox
                                            checked={filters.categoryIds.includes(option.id)}
                                            key={option.id}
                                            onChange={(checked) => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    categoryIds: checked
                                                        ? [...prev.categoryIds, option.id]
                                                        : prev.categoryIds.filter((id) => id !== option.id),
                                                }));
                                            }}
                                        >
                                            {option.name}
                                        </Checkbox>
                                    ))
                                )}
                            </Flex>
                        </Flex>
                    </Card>

                    <Card>
                        <Flex gap={12} vertical>
                            <Text strong>{t('priceRange')}</Text>
                            <Flex gap={8}>
                                <InputNumber
                                    min={0}
                                    onChange={(value) => setFilters((prev) => ({ ...prev, minPrice: typeof value === 'number' ? value : null }))}
                                    placeholder={t('minPrice')}
                                    style={{ width: '100%' }}
                                    value={filters.minPrice}
                                />
                                <InputNumber
                                    min={0}
                                    onChange={(value) => setFilters((prev) => ({ ...prev, maxPrice: typeof value === 'number' ? value : null }))}
                                    placeholder={t('maxPrice')}
                                    style={{ width: '100%' }}
                                    value={filters.maxPrice}
                                />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card>
                        <Flex gap={12} vertical>
                            <Text strong>{t('images')}</Text>
                            <Segmented
                                block
                                onChange={(value) => setFilters((prev) => ({ ...prev, hasImage: value === 'all' ? null : value === 'yes' }))}
                                options={[
                                    { label: t('allItems'), value: 'all' },
                                    { label: t('hasImage'), value: 'yes' },
                                    { label: t('noImage'), value: 'no' },
                                ]}
                                value={filters.hasImage === null ? 'all' : filters.hasImage ? 'yes' : 'no'}
                            />
                        </Flex>
                    </Card>

                    <Card>
                        <Flex gap={12} vertical>
                            <Text strong>{t('status')}</Text>
                            <Segmented
                                block
                                onChange={(value) => setFilters((prev) => ({ ...prev, activeStatus: value === 'all' ? null : value === 'active' }))}
                                options={[
                                    { label: t('allStatuses'), value: 'all' },
                                    { label: t('active'), value: 'active' },
                                    { label: t('hidden'), value: 'hidden' },
                                ]}
                                value={filters.activeStatus === null ? 'all' : filters.activeStatus ? 'active' : 'hidden'}
                            />
                        </Flex>
                    </Card>

                    <Flex gap={8}>
                        <Button
                            block
                            fill="outline"
                            onClick={() => setFilters(DEFAULT_FILTERS)}
                        >
                            {t('clearAll')}
                        </Button>
                        <Button block onClick={() => setIsFilterSheetOpen(false)}>
                            {t('applyFilters')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>

            <MobileMenuCommandSheet
                businessType={storeDetails?.businessType}
                labels={labels}
                onAddItem={() => launchCommandAction(() => setIsAddSheetOpen(true))}
                onCategories={() => launchCommandAction(() => {
                    setCategorySheetMode('manage');
                    setIsCategorySheetOpen(true);
                })}
                onChangeAvailability={() => launchCommandAction(() => {
                    setBulkActionType('availability');
                    setIsBulkActionsOpen(true);
                })}
                onClose={() => setIsCommandMenuOpen(false)}
                onGenerateDescriptions={() => launchCommandAction(() => setIsGenerateDescriptionsOpen(true))}
                onManageLanguages={() => launchCommandAction(() => setIsManageLanguagesOpen(true))}
                onMoveCategory={() => launchCommandAction(() => {
                    setBulkActionType('moveCategory');
                    setIsBulkActionsOpen(true);
                })}
                onUploadMenu={() => launchCommandAction(handleOpenUploadSheet)}
                onPricing={() => launchCommandAction(() => {
                    setBulkActionType('pricing');
                    setIsBulkActionsOpen(true);
                })}
                onReorderMenu={() => launchCommandAction(() => {
                    setCategorySheetMode('reorder');
                    setIsCategorySheetOpen(true);
                })}
                onSmartRecommendations={() => launchCommandAction(() => setIsSmartRecommendationsOpen(true))}
                onShowHide={() => launchCommandAction(() => {
                    setBulkActionType('showHide');
                    setIsBulkActionsOpen(true);
                })}
                visible={isCommandMenuOpen}
            />

            {menuData ? (
                <SmartRecommendationsSheet
                    businessType={storeDetails?.businessType}
                    onClose={() => handleCommandActionBack(() => setIsSmartRecommendationsOpen(false))}
                    onSaved={(updatedProject) => {
                        setMenuData(updatedProject);
                        setIsSmartRecommendationsOpen(false);
                        resetCommandActionFlow();
                    }}
                    projectData={menuData}
                    visible={isSmartRecommendationsOpen}
                />
            ) : null}

            {menuData ? (
                <ManageLanguagesSheet
                    onClose={() => handleCommandActionBack(() => setIsManageLanguagesOpen(false))}
                    onSaved={(updatedProject) => {
                        setMenuData(updatedProject);
                        setIsManageLanguagesOpen(false);
                        resetCommandActionFlow();
                    }}
                    projectData={menuData}
                    visible={isManageLanguagesOpen}
                />
            ) : null}

            {menuData ? (
                <GenerateDescriptionsSheet
                    onClose={() => handleCommandActionBack(() => setIsGenerateDescriptionsOpen(false))}
                    onSaved={(updatedProject) => {
                        setMenuData(updatedProject);
                        resetCommandActionFlow();
                    }}
                    projectData={menuData}
                    visible={isGenerateDescriptionsOpen}
                />
            ) : null}

            <CategoryManagerSheet
                categories={categorySummary}
                categoryItems={categoryItemMap}
                initialMode={categorySheetMode}
                presets={storeDetails?.timeSlotPresets || []}
                onAdd={handleCategoryAdd}
                onClose={() => handleCommandActionBack(() => {
                    setIsCategorySheetOpen(false);
                    setCategorySheetMode('manage');
                })}
                onDelete={handleCategoryDelete}
                onRename={handleCategoryRename}
                onReorder={handleCategoryReorder}
                onReorderItems={handleCategoryItemReorder}
                onToggleActive={handleCategoryToggle}
                onUpdateTimeSlots={handleCategoryTimeSlots}
                visible={isCategorySheetOpen}
            />

            {editingItem ? (
                <ItemEditSheet
                    categories={categoryOptions}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    item={editingItem}
                    onClose={() => {
                        setEditingItem(null);
                        resetCommandActionFlow();
                    }}
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
                            resetCommandActionFlow();
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
                                    if (updatedItem.attributes !== undefined) {
                                        nextItem.attributes = updatedItem.attributes.map((attribute) => ({
                                            id: attribute.id,
                                            active: attribute.active !== false,
                                            name: { [activeLang]: attribute.name },
                                            price: String(attribute.price || 0),
                                        }));
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
                            resetCommandActionFlow();
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
                    onClose={() => handleCommandActionBack(() => setIsAddSheetOpen(false))}
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
                            resetCommandActionFlow();
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
                    currentProjectId={menuData?.projectId || null}
                    currentProjectLanguages={menuData?.languages || null}
                    existingFiles={menuData?.files || []}
                    onClose={() => setIsUploadSheetOpen(false)}
                    onJobCreated={({ jobId, projectId }) => {
                        setIsUploadSheetOpen(false);
                        setActiveProcessingState({ jobId, projectId });
                        void fetchMenuData(projectId);
                    }}
                />
            ) : null}

            {showReviewSheet && comparisonResult && activeProcessingJobId && menuData?.projectId ? (
                <ExtractionReviewSheet
                    comparisonResult={comparisonResult}
                    jobId={activeProcessingJobId}
                    onDiscard={() => {
                        setShowReviewSheet(false);
                        setComparisonResult(null);
                        setActiveProcessingState(null);
                    }}
                    onSaveComplete={() => {
                        setShowReviewSheet(false);
                        setComparisonResult(null);
                        setActiveProcessingState(null);
                        void fetchMenuData(menuData.projectId);
                        setShowSuccessState(true);
                    }}
                    primaryLang={menuData?.languages?.[0] || 'en'}
                    projectId={menuData.projectId}
                    visible={showReviewSheet}
                />
            ) : null}

            <BulkActionsSheet
                initialAction={bulkActionType}
                onApply={(updatedProject) => {
                    setMenuData(updatedProject);
                    resetCommandActionFlow();
                }}
                projectData={menuData}
                visible={isBulkActionsOpen}
                onClose={() => {
                    handleCommandActionBack(() => {
                        setIsBulkActionsOpen(false);
                        setBulkActionType(null);
                    });
                }}
            />

            <MobileProjectSelectorSheet
                currentProjectId={menuData?.projectId}
                currentProjectName={activeProjectSummary?.name || menuData?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await fetchMenuData(preferredProjectId || menuData?.projectId);
                }}
                visible={isProjectSelectorOpen}
            />
        </Flex>
    );
}
