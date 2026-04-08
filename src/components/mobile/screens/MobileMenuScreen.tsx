'use client'

import { getOwnerLabels } from '@config/businessLabels';
import { updateProject } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import useMenuProcessingJob from '@hook/useMenuProcessingJob';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import { runComparisonEngine } from '@lib/extraction/comparisonEngine';
import type { ComparisonEngineOutput, ComparisonMode } from '@lib/extraction/comparisonEngine.types';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { createNewCategory, createNewItem } from '../../templates/main-app/projects/editorView/utils/editorOperations';
import { removeObjRef } from '@util/utils';
import { InputNumber, theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCamera, LuCheck, LuFileText, LuFilter, LuSettings2, LuX } from 'react-icons/lu';
import { Button, Card, Checkbox, Collapse, Dialog, DotLoading, Empty, Flex, FloatingBubble, List, Popup, ProgressBar, PullToRefresh, Result, SearchBar, Switch, Tag, Text, Title, Toast } from '../antd';
import type { MobileMenuItemType as MenuItemType } from '../types';
import MobileMenuCommandSheet from '../components/MobileMenuCommandSheet';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import type { MobileCategoryReorderItem } from '../sheets/CategoryManagerSheet';

const ItemEditSheet = dynamic(() => import('../sheets/ItemEditSheet'), { ssr: false });
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
    hasDescription: boolean | null;
    hasPrice: boolean | null;
    availability: boolean | null;
    activeStatus: boolean | null;
    qualityIssue: 'priceOutliers' | null;
};

const DEFAULT_FILTERS: MobileMenuFilters = {
    categoryIds: [],
    minPrice: null,
    maxPrice: null,
    hasImage: null,
    hasDescription: null,
    hasPrice: null,
    availability: null,
    activeStatus: null,
    qualityIssue: null,
};

const MOBILE_MENU_PERSIST_DEBOUNCE_MS = 700;
const MOBILE_MENU_PERSIST_RETRY_MS = 2500;

export default function MobileMenuScreen() {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const {
        isLoading: loadingProjects,
        projectsList,
        refreshProjects,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
        upsertCachedProject,
    } = useMobileProjects();
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
    const menuContentTopRef = useRef<HTMLDivElement | null>(null);
    const persistedMenuRef = useRef<any>(null);
    const pendingMenuRef = useRef<any>(null);
    const persistTimerRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);
    const isPersistingRef = useRef(false);

    const replaceProjectInList = useCallback((updatedProject: any) => {
        if (!updatedProject?.projectId) return;
        upsertCachedProject(updatedProject);
    }, [upsertCachedProject]);

    const clearPersistTimers = useCallback(() => {
        if (persistTimerRef.current) {
            window.clearTimeout(persistTimerRef.current);
            persistTimerRef.current = null;
        }
        if (retryTimerRef.current) {
            window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const setActiveProcessingState = useCallback((value: { jobId: string; projectId: string } | null) => {
        setActiveProcessingStateState(value);
        if (typeof window === 'undefined') return;
        if (value) {
            window.sessionStorage.setItem('mobileMenuActiveProcessingJob', JSON.stringify(value));
        } else {
            window.sessionStorage.removeItem('mobileMenuActiveProcessingJob');
        }
    }, []);

    const flushPendingMenuPersist = useCallback(async () => {
        if (isPersistingRef.current || !pendingMenuRef.current?.projectId) {
            return;
        }

        const snapshot = removeObjRef(pendingMenuRef.current);
        isPersistingRef.current = true;

        try {
            const savedProject = await updateProject(snapshot);
            const nextProject = savedProject || snapshot;
            persistedMenuRef.current = removeObjRef(nextProject);

            if (pendingMenuRef.current?.projectId === snapshot.projectId) {
                const pendingSnapshot = JSON.stringify(pendingMenuRef.current);
                const savedSnapshot = JSON.stringify(snapshot);
                if (pendingSnapshot === savedSnapshot) {
                    pendingMenuRef.current = null;
                    setMenuData((current: any) => (
                        current?.projectId === nextProject.projectId ? nextProject : current
                    ));
                    replaceProjectInList(nextProject);
                }
            }
        } catch (error) {
            console.error('[MobileMenu] Failed to persist project update:', error);
            Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });

            if (!retryTimerRef.current) {
                retryTimerRef.current = window.setTimeout(() => {
                    retryTimerRef.current = null;
                    void flushPendingMenuPersist();
                }, MOBILE_MENU_PERSIST_RETRY_MS);
            }
        } finally {
            isPersistingRef.current = false;

            if (pendingMenuRef.current && JSON.stringify(pendingMenuRef.current) !== JSON.stringify(persistedMenuRef.current)) {
                if (!persistTimerRef.current) {
                    persistTimerRef.current = window.setTimeout(() => {
                        persistTimerRef.current = null;
                        void flushPendingMenuPersist();
                    }, MOBILE_MENU_PERSIST_DEBOUNCE_MS);
                }
            }
        }
    }, [replaceProjectInList, t]);

    const queueMenuPersist = useCallback((updatedProject: any) => {
        if (!updatedProject?.projectId) return;

        pendingMenuRef.current = removeObjRef(updatedProject);

        if (retryTimerRef.current) {
            window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (persistTimerRef.current) {
            window.clearTimeout(persistTimerRef.current);
        }

        persistTimerRef.current = window.setTimeout(() => {
            persistTimerRef.current = null;
            void flushPendingMenuPersist();
        }, MOBILE_MENU_PERSIST_DEBOUNCE_MS);
    }, [flushPendingMenuPersist]);

    const applyLocalMenuUpdate = useCallback((updatedProject: any) => {
        setMenuData(updatedProject);
        replaceProjectInList(updatedProject);
        queueMenuPersist(updatedProject);
    }, [queueMenuPersist, replaceProjectInList]);

    useEffect(() => {
        const nextProject = activeProcessingState?.projectId
            ? null
            : selectedProject || null;

        setMenuData(nextProject ? removeObjRef(nextProject) : null);
        persistedMenuRef.current = nextProject ? removeObjRef(nextProject) : null;
        pendingMenuRef.current = null;
    }, [activeProcessingState?.projectId, selectedProject]);

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

    useEffect(() => {
        const handlePageHide = () => {
            if (pendingMenuRef.current?.projectId && !isPersistingRef.current) {
                void flushPendingMenuPersist();
            }
        };

        window.addEventListener('pagehide', handlePageHide);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            clearPersistTimers();
            if (pendingMenuRef.current?.projectId && !isPersistingRef.current) {
                void flushPendingMenuPersist();
            }
        };
    }, [clearPersistTimers, flushPendingMenuPersist]);

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

    const handleCancelProcessing = useCallback(async () => {
        const confirmed = await Dialog.confirm({
            cancelText: t('cancel'),
            confirmText: t('cancelProcessingConfirmAction'),
            content: t('cancelProcessingConfirmDesc'),
            title: t('cancelProcessingConfirmTitle'),
        });

        if (!confirmed) return;
        await cancelJob();
    }, [cancelJob, t]);

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
            void refreshProjects({
                force: true,
                preferredProjectId: activeProcessingState?.projectId || menuData?.projectId,
                showLoader: false,
            });
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
        jobError?.message,
        jobIsCancelled,
        jobIsCompleted,
        jobIsFailed,
        jobIsPreviewReady,
        menuData,
        refreshProjects,
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

    const priceOutlierItemIds = useMemo(() => {
        const LOW_FACTOR = 0.35;
        const HIGH_FACTOR = 3;
        const MIN_ITEMS = 4;
        const groupedPrices = new Map<string, { id: string; price: number }[]>();

        menuItems.forEach((item) => {
            if (!item.active || item.attributes?.length) return;
            if (!item.categoryId || !(item.price > 0)) return;
            const items = groupedPrices.get(item.categoryId) || [];
            items.push({ id: item.id, price: item.price });
            groupedPrices.set(item.categoryId, items);
        });

        const outliers = new Set<string>();
        groupedPrices.forEach((items) => {
            if (items.length < MIN_ITEMS) return;
            const sortedPrices = items.map((item) => item.price).sort((a, b) => a - b);
            const mid = Math.floor(sortedPrices.length / 2);
            const median = sortedPrices.length % 2 !== 0
                ? sortedPrices[mid]
                : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

            if (!(median > 0)) return;

            items.forEach((item) => {
                if (item.price < median * LOW_FACTOR || item.price > median * HIGH_FACTOR) {
                    outliers.add(item.id);
                }
            });
        });

        return outliers;
    }, [menuItems]);

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
            if (filters.hasDescription !== null) {
                const hasDescription = Boolean(item.description?.trim());
                if (hasDescription !== filters.hasDescription) return false;
            }
            if (filters.hasPrice !== null) {
                const hasPrice = item.price > 0;
                if (hasPrice !== filters.hasPrice) return false;
            }
            if (filters.availability !== null && item.available !== filters.availability) {
                return false;
            }
            if (filters.activeStatus !== null && item.active !== filters.activeStatus) {
                return false;
            }
            if (filters.qualityIssue === 'priceOutliers' && !priceOutlierItemIds.has(item.id)) {
                return false;
            }
            return true;
        });
    }, [filters, menuItems, priceOutlierItemIds, searchQuery]);

    const appliedFilterCount = useMemo(() => {
        return [
            filters.categoryIds.length > 0,
            filters.minPrice !== null || filters.maxPrice !== null,
            filters.hasImage !== null,
            filters.hasDescription !== null,
            filters.hasPrice !== null,
            filters.availability !== null,
            filters.activeStatus !== null,
            filters.qualityIssue !== null,
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

        if (filters.hasDescription !== null) {
            chips.push({
                key: 'description',
                label: filters.hasDescription ? t('hasDescription') : t('noDescription'),
                onRemove: () => setFilters((prev) => ({ ...prev, hasDescription: null })),
            });
        }

        if (filters.hasPrice !== null) {
            chips.push({
                key: 'price-presence',
                label: filters.hasPrice ? t('hasPrice') : t('noPrice'),
                onRemove: () => setFilters((prev) => ({ ...prev, hasPrice: null })),
            });
        }

        if (filters.availability !== null) {
            chips.push({
                key: 'availability',
                label: filters.availability ? t('available') : t('soldOut'),
                onRemove: () => setFilters((prev) => ({ ...prev, availability: null })),
            });
        }

        if (filters.activeStatus !== null) {
            chips.push({
                key: 'status',
                label: filters.activeStatus ? t('active') : t('hidden'),
                onRemove: () => setFilters((prev) => ({ ...prev, activeStatus: null })),
            });
        }

        if (filters.qualityIssue === 'priceOutliers') {
            chips.push({
                key: 'quality-price-outliers',
                label: t('unusualPrices'),
                onRemove: () => setFilters((prev) => ({ ...prev, qualityIssue: null })),
            });
        }

        return chips;
    }, [categoryOptions, filters, t]);

    const handleReviewQualitySignal = useCallback((signal: { id: string }) => {
        setSearchQuery('');
        setFilters(() => {
            switch (signal.id) {
            case 'descriptions':
                return { ...DEFAULT_FILTERS, hasDescription: false };
            case 'images':
                return { ...DEFAULT_FILTERS, hasImage: false };
            case 'prices':
                return { ...DEFAULT_FILTERS, hasPrice: false };
            case 'hidden':
                return { ...DEFAULT_FILTERS, activeStatus: false };
            case 'priceOutliers':
                return { ...DEFAULT_FILTERS, qualityIssue: 'priceOutliers' };
            default:
                return DEFAULT_FILTERS;
            }
        });
        requestAnimationFrame(() => {
            menuContentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    const renderSingleChoiceFilter = useCallback((
        title: string,
        value: string,
        options: Array<{ label: string; value: string }>,
        onChange: (value: string) => void
    ) => (
        <Card>
            <Flex gap={12} vertical>
                <Text strong>{title}</Text>
                <Flex gap={8} vertical>
                    {options.map((option) => {
                        const selected = value === option.value;

                        return (
                            <div
                                key={option.value}
                                onClick={() => onChange(option.value)}
                                style={{
                                    backgroundColor: selected ? token.colorPrimaryBg : token.colorBgContainer,
                                    border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    padding: '12px 14px',
                                }}
                            >
                                <Flex align="center" gap={12} justify="space-between">
                                    <Text style={{ color: selected ? token.colorPrimary : undefined }}>
                                        {option.label}
                                    </Text>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            backgroundColor: selected ? token.colorPrimary : 'transparent',
                                            border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
                                            borderRadius: '999px',
                                            color: selected ? token.colorTextLightSolid : token.colorTextQuaternary,
                                            flexShrink: 0,
                                            height: 20,
                                            width: 20,
                                        }}
                                    >
                                        {selected ? <LuCheck size={12} /> : null}
                                    </Flex>
                                </Flex>
                            </div>
                        );
                    })}
                </Flex>
            </Flex>
        </Card>
    ), [token]);

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
        () => selectedProjectSummary || projectsList.find((project: any) => project.projectId === menuData?.projectId) || null,
        [menuData?.projectId, projectsList, selectedProjectSummary]
    );
    const isFirstRunProject = Boolean(menuData?.projectId) && menuItems.length === 0 && !searchQuery && appliedFilterCount === 0;
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
    const hasCategories = categorySummary.length > 0;

    const categoryItemMap = useMemo<Record<string, MobileCategoryReorderItem[]>>(() => {
        if (!menuData?.files) return {};
        const grouped: Record<string, MobileCategoryReorderItem[]> = {};
        menuData.files.forEach((file: any) => {
            const items = file.extractedData?.data?.items || [];
            items.forEach((item: any) => {
                const categoryId = item.category || 'uncategorized';
                if (!grouped[categoryId]) grouped[categoryId] = [];
                grouped[categoryId].push({
                    available: item.available !== false,
                    id: item.id,
                    name: item.name?.[activeLang] || item.name?.en || item.name || t('unnamedItem'),
                    active: item.active !== false,
                    price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price,
                });
            });
        });
        return grouped;
    }, [activeLang, menuData?.files, t]);

    const handleCategoryAdd = async ({ name, active, presetIds }: { name: string; active: boolean; presetIds: string[] }) => {
        if (!menuData) return;
        const presets = storeDetails?.timeSlotPresets || [];
        const previous = menuData;
        const updated = removeObjRef(menuData);
        const targetFile = updated.files?.[0];
        if (!targetFile) return;
        if (!targetFile.extractedData) targetFile.extractedData = { data: { categories: [], items: [], languages: [] } };
        if (!targetFile.extractedData.data) targetFile.extractedData.data = { categories: [], items: [], languages: [] };
        if (!targetFile.extractedData.data.categories) targetFile.extractedData.data.categories = [];
        const languageCodes = menuData.languages?.length
            ? menuData.languages
            : (targetFile.extractedData.data.languages || []).map((language: any) => language.code).filter(Boolean);
        const nextCategory = createNewCategory(targetFile, languageCodes.length ? languageCodes : ['en'], menuData.masterProjectId);
        nextCategory.active = active;
        nextCategory.name = {
            ...nextCategory.name,
            [activeLang]: name,
        };
        nextCategory.timeSlots = presetIds.length
            ? presetIds
                .map((presetId) => presets.find((preset: any) => preset.id === presetId))
                .filter(Boolean)
                .map((preset: any) => ({
                    presetId: preset.id,
                    startTime: preset.startTime,
                    endTime: preset.endTime,
                }))
            : undefined;
        targetFile.extractedData.data.categories.push(nextCategory);
        applyLocalMenuUpdate(updated);
    };

    const handleCategoryUpdate = async ({ id: categoryId, name, active, presetIds }: { id: string; name: string; active: boolean; presetIds: string[] }) => {
        if (!menuData) return;
        const presets = storeDetails?.timeSlotPresets || [];
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                if (category.id === categoryId) {
                    const nextName = typeof category.name === 'object' && category.name ? { ...category.name } : {};
                    nextName[activeLang] = name;
                    category.name = nextName;
                    category.active = active;
                    category.timeSlots = presetIds.length
                        ? presetIds
                            .map((presetId) => presets.find((preset: any) => preset.id === presetId))
                            .filter(Boolean)
                            .map((preset: any) => ({
                                presetId: preset.id,
                                startTime: preset.startTime,
                                endTime: preset.endTime,
                            }))
                        : undefined;
                }
            });
        });
        applyLocalMenuUpdate(updated);
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
        applyLocalMenuUpdate(updated);
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
        applyLocalMenuUpdate(updated);
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
        applyLocalMenuUpdate(updated);
    };

    const handleToggleAvailability = useCallback(async (item: MenuItemType) => {
        if (!menuData) return;
        const newAvailability = !item.available;
        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((menuItem: any) => {
                if (menuItem.id === item.id) {
                    menuItem.available = newAvailability;
                }
            });
        });
        applyLocalMenuUpdate(updated);

        Toast.show({
            content: newAvailability ? availabilityLabels.available : availabilityLabels.unavailable,
            duration: 1000,
        });
    }, [applyLocalMenuUpdate, availabilityLabels.available, availabilityLabels.unavailable, menuData]);

    const handleRefresh = async () => {
        await flushPendingMenuPersist();
        await refreshProjects({
            force: true,
            preferredProjectId: menuData?.projectId || selectedProjectId,
            showLoader: false,
        });
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

    if (!storeDetails || (loadingProjects && !menuData)) {
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

                    {menuData?.files && !isFirstRunProject ? (
                        <MobileMenuQualitySignals files={menuData.files} onReviewSignal={handleReviewQualitySignal} />
                    ) : null}

                    {!isFirstRunProject ? (
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
                    ) : null}

                    {!isFirstRunProject && (activeFilterChips.length > 0 || searchQuery) ? (
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
                                color="danger"
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

                    {!isFirstRunProject ? (
                        <Flex align="center" justify="space-between">
                            <Text type="secondary">
                                {t('categoriesSummary', {
                                    items: `${menuItems.length} ${labels.itemsPlural}`,
                                    categories: t('categoriesCount', { count: categoryCount }),
                                })}
                            </Text>
                            {searchQuery ? <Tag>{t('itemsCount', { count: filteredItems.length })}</Tag> : null}
                        </Flex>
                    ) : null}

                </Flex>
            </Card>

            <PullToRefresh onRefresh={handleRefresh}>
                <Flex gap={16} style={{ padding: 16 }} vertical>
                    <div ref={menuContentTopRef} />
                    {isFirstRunProject ? (
                        <Card
                            style={{
                                background: `linear-gradient(165deg, ${token.colorBgContainer} 0%, ${token.colorFillAlter} 55%, ${token.colorBgElevated} 100%)`,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 24,
                                overflow: 'hidden',
                            }}
                        >
                            <Flex gap={18} vertical>
                                <Flex align="center" gap={14}>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            backgroundColor: token.colorPrimaryBg,
                                            border: `1px solid ${token.colorPrimaryBorder}`,
                                            borderRadius: 16,
                                            color: token.colorPrimary,
                                            height: 52,
                                            minWidth: 52,
                                            width: 52,
                                        }}
                                    >
                                        <LuFileText size={22} />
                                    </Flex>
                                    <Flex gap={4} style={{ flex: 1 }} vertical>
                                        <Title level={4} style={{ color: token.colorTextHeading, margin: 0 }}>
                                            {t('createYourMenu', { offering: labels.offeringTitle })}
                                        </Title>
                                        <Text style={{ color: token.colorTextSecondary }}>
                                            {t('createYourMenuDesc', { offering: labels.offeringLower })}
                                        </Text>
                                    </Flex>
                                </Flex>

                                <Button block color="primary" onClick={handleOpenUploadSheet} size="large" style={{ borderRadius: 16, minHeight: 50 }}>
                                    {t('uploadMenuPhoto', { offering: labels.offeringTitle })}
                                </Button>

                                <Flex gap={10} style={{ width: '100%' }}>
                                    <Button
                                        block
                                        fill="outline"
                                        onClick={() => {
                                            setCategorySheetMode('manage');
                                            setIsCategorySheetOpen(true);
                                        }}
                                        size="large"
                                        style={{
                                            backgroundColor: token.colorBgElevated,
                                            borderColor: token.colorBorder,
                                            borderRadius: 16,
                                        }}
                                    >
                                        {t('addCategoryLabel')}
                                    </Button>
                                    {hasCategories ? (
                                        <Button
                                            block
                                            fill="outline"
                                            onClick={() => setIsAddSheetOpen(true)}
                                            size="large"
                                            style={{
                                                backgroundColor: token.colorBgElevated,
                                                borderColor: token.colorBorder,
                                                borderRadius: 16,
                                            }}
                                        >
                                            {t('addItem')}
                                        </Button>
                                    ) : null}
                                </Flex>
                            </Flex>
                        </Card>
                    ) : Object.keys(groupedItems).length === 0 ? (
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
                            <Empty description={searchQuery || appliedFilterCount > 0 ? t('noItemsToShow') : t('noMenuItemsYet', { items: labels.itemsPlural })} />
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
                                                        <div
                                                            onClick={(event) => event.stopPropagation()}
                                                            onMouseDown={(event) => event.stopPropagation()}
                                                            onPointerDown={(event) => event.stopPropagation()}
                                                        >
                                                            <Switch checked={item.available} onChange={() => handleToggleAvailability(item)} />
                                                        </div>
                                                        <Button fill="outline" onClick={(event) => {
                                                            event.stopPropagation();
                                                            setEditingItem(item);
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

            {!isFirstRunProject ? (
                <FloatingBubble
                    onClick={() => setIsCommandMenuOpen(true)}
                    style={{ '--initial-position-bottom': 88, '--initial-position-right': 16, '--size': 52 }}
                >
                    <LuSettings2 size={18} />
                </FloatingBubble>
            ) : null}

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
                    <Button block fill="outline" loading={jobIsCancelling} onClick={() => void handleCancelProcessing()}>
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
                bodyStyle={{ minHeight: '64vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
                onMaskClick={() => setIsFilterSheetOpen(false)}
                visible={isFilterSheetOpen}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <Flex
                        align="center"
                        justify="space-between"
                        style={{
                            backgroundColor: token.colorBgContainer,
                            borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            minHeight: 52,
                            padding: '6px 12px',
                            position: 'sticky',
                            top: 0,
                            zIndex: 5,
                        }}
                    >
                        <div style={{ minHeight: 40, minWidth: 40 }} />
                        <Title level={4} style={{ lineHeight: 1.2, margin: 0, textAlign: 'center' }}>{t('filters')}</Title>
                        <Button fill="none" onClick={() => setIsFilterSheetOpen(false)} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}>
                            <LuX size={18} />
                        </Button>
                    </Flex>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>

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

                    {renderSingleChoiceFilter(
                        t('images'),
                        filters.hasImage === null ? 'all' : filters.hasImage ? 'yes' : 'no',
                        [
                            { label: t('allItems'), value: 'all' },
                            { label: t('hasImage'), value: 'yes' },
                            { label: t('noImage'), value: 'no' },
                        ],
                        (value) => setFilters((prev) => ({ ...prev, hasImage: value === 'all' ? null : value === 'yes' }))
                    )}

                    {renderSingleChoiceFilter(
                        t('descriptions'),
                        filters.hasDescription === null ? 'all' : filters.hasDescription ? 'yes' : 'no',
                        [
                            { label: t('allItems'), value: 'all' },
                            { label: t('hasDescription'), value: 'yes' },
                            { label: t('noDescription'), value: 'no' },
                        ],
                        (value) => setFilters((prev) => ({ ...prev, hasDescription: value === 'all' ? null : value === 'yes' }))
                    )}

                    {renderSingleChoiceFilter(
                        t('pricing'),
                        filters.hasPrice === null ? 'all' : filters.hasPrice ? 'yes' : 'no',
                        [
                            { label: t('allItems'), value: 'all' },
                            { label: t('hasPrice'), value: 'yes' },
                            { label: t('noPrice'), value: 'no' },
                        ],
                        (value) => setFilters((prev) => ({ ...prev, hasPrice: value === 'all' ? null : value === 'yes' }))
                    )}

                    {renderSingleChoiceFilter(
                        t('availability'),
                        filters.availability === null ? 'all' : filters.availability ? 'available' : 'soldOut',
                        [
                            { label: t('allItems'), value: 'all' },
                            { label: t('available'), value: 'available' },
                            { label: t('soldOut'), value: 'soldOut' },
                        ],
                        (value) => setFilters((prev) => ({ ...prev, availability: value === 'all' ? null : value === 'available' }))
                    )}

                    {renderSingleChoiceFilter(
                        t('status'),
                        filters.activeStatus === null ? 'all' : filters.activeStatus ? 'active' : 'hidden',
                        [
                            { label: t('allStatuses'), value: 'all' },
                            { label: t('active'), value: 'active' },
                            { label: t('hidden'), value: 'hidden' },
                        ],
                        (value) => setFilters((prev) => ({ ...prev, activeStatus: value === 'all' ? null : value === 'active' }))
                    )}

                    <Flex gap={8}>
                        <Button
                            block
                            color="danger"
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
                        replaceProjectInList(updatedProject);
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
                        replaceProjectInList(updatedProject);
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
                        replaceProjectInList(updatedProject);
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
                onUpdate={handleCategoryUpdate}
                onReorder={handleCategoryReorder}
                onReorderItems={handleCategoryItemReorder}
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
                        applyLocalMenuUpdate(updated);
                        Toast.show({ content: t('itemDeleted'), duration: 1000 });
                        setEditingItem(null);
                        resetCommandActionFlow();
                    }}
                    onSave={async (updatedItem) => {
                        if (!menuData) return;
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
                                        nextItem.descriptionSource = 'manual';
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
                        applyLocalMenuUpdate(updated);
                        Toast.show({ content: t('itemUpdated'), duration: 1000 });
                        setEditingItem(null);
                        resetCommandActionFlow();
                    }}
                />
            ) : null}

            {isAddSheetOpen ? (
                <ItemEditSheet
                    categories={categoryOptions}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    mode="add"
                    onClose={() => handleCommandActionBack(() => setIsAddSheetOpen(false))}
                    onSave={async (newItem) => {
                        if (!menuData) return;
                        const updated = removeObjRef(menuData);
                        let targetFile = updated.files?.[0];
                        if (!targetFile) return;
                        if (!targetFile.extractedData) targetFile.extractedData = { data: { categories: [], items: [], languages: [] } };
                        if (!targetFile.extractedData.data) targetFile.extractedData.data = { categories: [], items: [], languages: [] };
                        if (!targetFile.extractedData.data.categories) targetFile.extractedData.data.categories = [];
                        if (!targetFile.extractedData.data.items) targetFile.extractedData.data.items = [];
                        const languageCodes = menuData.languages?.length
                            ? menuData.languages
                            : (targetFile.extractedData.data.languages || []).map((language: any) => language.code).filter(Boolean);

                        let categoryId = newItem.categoryId;
                        if (!categoryId) {
                            const createdCategory = createNewCategory(
                                targetFile,
                                languageCodes.length ? languageCodes : ['en'],
                                menuData.masterProjectId,
                            );
                            createdCategory.active = true;
                            createdCategory.name = {
                                ...createdCategory.name,
                                [activeLang]: newItem.categoryName || 'Uncategorized',
                            };
                            targetFile.extractedData.data.categories.push(createdCategory);
                            categoryId = createdCategory.id;
                        }

                        const createdItem = createNewItem(
                            targetFile,
                            categoryId,
                            languageCodes.length ? languageCodes : ['en'],
                            menuData.masterProjectId,
                        );
                        createdItem.name = {
                            ...createdItem.name,
                            [activeLang]: newItem.name || '',
                        };
                        createdItem.description = newItem.description
                            ? {
                                ...createdItem.description,
                                [activeLang]: newItem.description,
                            }
                            : createdItem.description;
                        if (newItem.description) {
                            createdItem.descriptionSource = 'manual';
                        }
                        createdItem.price = String(newItem.price || 0);
                        createdItem.active = newItem.active !== false;
                        createdItem.available = newItem.available !== false;
                        createdItem.attributes = (newItem.attributes || []).map((attribute) => ({
                            id: attribute.id,
                            active: attribute.active !== false,
                            name: { [activeLang]: attribute.name },
                            price: String(attribute.price || 0),
                        }));
                        createdItem.images = newItem.image ? [{ url: newItem.image, name: `${newItem.name || createdItem.id}.jpg` }] : [];

                        targetFile.extractedData.data.items.push(createdItem);

                        applyLocalMenuUpdate(updated);
                        Toast.show({ content: t('itemAdded'), duration: 1000 });
                        setIsAddSheetOpen(false);
                        resetCommandActionFlow();
                    }}
                />
            ) : null}

            {isUploadSheetOpen ? (
                <MenuUploadSheet
                    currentProjectId={menuData?.projectId || null}
                    currentProjectLanguages={menuData?.languages || null}
                    existingFiles={menuData?.files || []}
                    onClose={() => handleCommandActionBack(() => setIsUploadSheetOpen(false))}
                    onJobCreated={({ jobId, projectId }) => {
                        setIsUploadSheetOpen(false);
                        resetCommandActionFlow();
                        setActiveProcessingState({ jobId, projectId });
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
                        void refreshProjects({
                            force: true,
                            preferredProjectId: menuData.projectId,
                            showLoader: false,
                        });
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
                    upsertCachedProject(updatedProject);
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
                    await flushPendingMenuPersist();
                    selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />
        </Flex>
    );
}
