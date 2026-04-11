'use client'

import { getOwnerLabels } from '@config/businessLabels';
import GlobalLanguagesList from '@data/languages';
import { updateProjectWithoutLoader, uploadFile } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useImageBatchJobListener } from '@hook/useImageBatchJobListener';
import useMenuProcessingJob from '@hook/useMenuProcessingJob';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import { runComparisonEngine } from '@lib/extraction/comparisonEngine';
import type { ComparisonEngineOutput, ComparisonMode } from '@lib/extraction/comparisonEngine.types';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import ProjectsDataProvider from '@providers/projectsDataProvider';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { associateItemImagesWithProject } from '../../templates/main-app/projects/editorView/utils/associateItemImages';
import { createNewCategory, createNewItem, deleteCategory } from '../../templates/main-app/projects/editorView/utils/editorOperations';
import type { BatchImageGenerationJobType, ItemForDropdown, Project } from '../../templates/main-app/projects/types';
import type {
    ExtractedDataAttribute,
    ExtractedDataCategory,
    ExtractedDataItem,
} from '../../templates/main-app/projects/types/extractedData.types';
import { removeObjRef } from '@util/utils';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCamera, LuCheck, LuFileText, LuFilter, LuLanguages, LuPencil, LuSettings2, LuX } from 'react-icons/lu';
import { Button, Card, Collapse, Dialog, DotLoading, Empty, Flex, FloatingBubble, List, Popup, ProgressBar, PullToRefresh, Result, SearchBar, Switch, Tag, Text, Title, Toast } from '../antd';
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
const TextCaseSheet = dynamic(() => import('../sheets/TextCaseSheet'), { ssr: false });
const ImageUploadModal = dynamic(() => import('../../templates/main-app/projects/editorView/ImageUploadModal'), { ssr: false });

type CategoryOption = { id: string; name: string };
type CategorySummary = {
    active: boolean;
    id: string;
    itemCount: number;
    name: string;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
};

type CategoryIssueSummary = {
    hidden: number;
    missingDescriptions: number;
    missingImages: number;
    missingPrices: number;
    priceOutliers: number;
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
    qualityIssue: 'priceOutliers' | 'translationMissing' | null;
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

function toArray<T>(value: T[] | T | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
}

function getCategoryTimeSlotPresetIds(category: ExtractedDataCategory): string[] {
    return toArray(category?.timeSlots)
        .map((slot: any) => slot?.presetId)
        .filter(Boolean);
}

function resolveLocalizedText(
    value: unknown,
    activeLang: string,
    fallback = ''
): string {
    if (typeof value === 'string') {
        return value;
    }

    if (value && typeof value === 'object') {
        const localizedValue = (value as Record<string, unknown>)[activeLang];
        if (typeof localizedValue === 'string' && localizedValue.trim()) {
            return localizedValue;
        }

        const englishValue = (value as Record<string, unknown>).en;
        if (typeof englishValue === 'string' && englishValue.trim()) {
            return englishValue;
        }

        const firstStringValue = Object.values(value as Record<string, unknown>)
            .find((entry) => typeof entry === 'string' && entry.trim());

        if (typeof firstStringValue === 'string') {
            return firstStringValue;
        }
    }

    return fallback;
}

function resolveCategoryName(
    category: Partial<ExtractedDataCategory> | null | undefined,
    activeLang: string,
    fallback: string
): string {
    return resolveLocalizedText(category?.name, activeLang, fallback);
}

function resolveItemName(
    item: Partial<ExtractedDataItem> | null | undefined,
    activeLang: string,
    fallback: string
): string {
    return resolveLocalizedText(item?.name, activeLang, fallback);
}

function resolveItemDescription(
    item: Partial<ExtractedDataItem> | null | undefined,
    activeLang: string
): string {
    return resolveLocalizedText(item?.description, activeLang);
}

function resolveAttributeName(
    attribute: Partial<ExtractedDataAttribute> | null | undefined,
    activeLang: string,
    fallback: string
): string {
    return resolveLocalizedText(attribute?.name, activeLang, fallback);
}

function hasLocalizedValue(value: unknown, languageCode: string): boolean {
    if (!value || typeof value !== 'object') return false;
    const localizedValue = (value as Record<string, unknown>)[languageCode];
    return typeof localizedValue === 'string' && localizedValue.trim().length > 0;
}

function hasMissingTranslations(item: Partial<ExtractedDataItem> | null | undefined, languages: string[]): boolean {
    if (!item || languages.length <= 1) return false;

    const [primaryLanguage, ...secondaryLanguages] = languages;

    return secondaryLanguages.some((languageCode) => {
        if (hasLocalizedValue(item.name, primaryLanguage) && !hasLocalizedValue(item.name, languageCode)) {
            return true;
        }

        if (hasLocalizedValue(item.description, primaryLanguage) && !hasLocalizedValue(item.description, languageCode)) {
            return true;
        }

        return toArray(item.attributes).some((attribute) => (
            hasLocalizedValue(attribute?.name, primaryLanguage) && !hasLocalizedValue(attribute?.name, languageCode)
        ));
    });
}

function normalizeExtractedPrice(price: unknown): number {
    if (typeof price === 'number') {
        return Number.isFinite(price) ? price : 0;
    }

    if (typeof price === 'string') {
        const direct = Number(price.trim());
        if (Number.isFinite(direct)) return direct;

        const cleaned = price.replace(/[^0-9.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function findExtractedItemById(projectData: Project | null | undefined, itemId: string): ExtractedDataItem | null {
    if (!projectData?.files?.length) return null;

    for (const file of projectData.files) {
        const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
        const matchedItem = items.find((item) => item.id === itemId);
        if (matchedItem) {
            return matchedItem;
        }
    }

    return null;
}

export default function MobileMenuScreen() {
    const { token } = theme.useToken();
    const t = useTranslations('MobileMenu');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const {
        isLoading: loadingProjects,
        projectsList,
        refreshCachedProject,
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
    const [draftFilters, setDraftFilters] = useState<MobileMenuFilters>(DEFAULT_FILTERS);
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
    const [isTextCaseOpen, setIsTextCaseOpen] = useState(false);
    const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
    const [imageModalItem, setImageModalItem] = useState<ExtractedDataItem | null>(null);
    const [imageModalSource, setImageModalSource] = useState<string>('');
    const [activeBatchImageJob, setActiveBatchImageJob] = useState<BatchImageGenerationJobType | null>(null);
    const [returnToCommandMenu, setReturnToCommandMenu] = useState(false);
    const [menuData, setMenuData] = useState<any>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [expandedCategoryKeys, setExpandedCategoryKeys] = useState<string[]>([]);
    const [isMenuQualityExpanded, setIsMenuQualityExpanded] = useState(true);
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
    const menuDataRef = useRef<any>(null);
    const pendingMenuRef = useRef<any>(null);
    const persistedLocalSnapshotRef = useRef<string | null>(null);
    const pendingLocalSnapshotRef = useRef<string | null>(null);
    const persistTimerRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);
    const isPersistingRef = useRef(false);
    const menuUpdateGenerationRef = useRef(0);

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

    const syncSavedMenuProject = useCallback((updatedProject: any) => {
        if (!updatedProject?.projectId) return;

        const savedProject = removeObjRef(updatedProject);
        const savedSnapshot = JSON.stringify(savedProject);

        clearPersistTimers();
        pendingMenuRef.current = null;
        pendingLocalSnapshotRef.current = null;
        persistedMenuRef.current = savedProject;
        persistedLocalSnapshotRef.current = savedSnapshot;
        menuDataRef.current = savedProject;
        setMenuData(savedProject);
        replaceProjectInList(savedProject);

        setEditingItem((current) => {
            if (!current?.id) return current;
            const nextExtractedItem = findExtractedItemById(savedProject, current.id);
            if (!nextExtractedItem) return current;

            return {
                ...current,
                image: nextExtractedItem.images?.[0]?.url || '',
            };
        });
    }, [clearPersistTimers, replaceProjectInList]);

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
        const snapshotString = JSON.stringify(snapshot);
        isPersistingRef.current = true;

        try {
            const savedProject = await updateProjectWithoutLoader(snapshot);
            const nextProject = savedProject || snapshot;
            persistedMenuRef.current = removeObjRef(nextProject);
            persistedLocalSnapshotRef.current = snapshotString;

            if (pendingMenuRef.current?.projectId === snapshot.projectId) {
                const pendingSnapshot = JSON.stringify(pendingMenuRef.current);
                if (pendingSnapshot === snapshotString) {
                    pendingMenuRef.current = null;
                    pendingLocalSnapshotRef.current = null;
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

        const nextPendingProject = removeObjRef(updatedProject);
        const nextPendingSnapshot = JSON.stringify(nextPendingProject);

        if (nextPendingSnapshot === pendingLocalSnapshotRef.current) {
            return;
        }

        if (nextPendingSnapshot === persistedLocalSnapshotRef.current) {
            return;
        }

        pendingMenuRef.current = nextPendingProject;
        pendingLocalSnapshotRef.current = nextPendingSnapshot;

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
        menuUpdateGenerationRef.current += 1;
        menuDataRef.current = updatedProject;
        setMenuData(updatedProject);
        replaceProjectInList(updatedProject);
        queueMenuPersist(updatedProject);
    }, [queueMenuPersist, replaceProjectInList]);

    const applyUndoableBulkMenuUpdate = useCallback((updatedProject: any, previousProject?: any, updatedCount?: number) => {
        applyLocalMenuUpdate(updatedProject);

        if (!previousProject) {
            Toast.show({ content: t('itemsUpdated', { count: updatedCount || 0 }), duration: 1500 });
            return;
        }

        const undoGeneration = menuUpdateGenerationRef.current;
        const undoProjectId = updatedProject?.projectId;
        Toast.show({
            content: (
                <Flex align="center" gap={12} justify="space-between" style={{ minWidth: 0, width: '100%' }}>
                    <Text style={{ flex: 1, minWidth: 0 }}>{t('itemsUpdated', { count: updatedCount || 0 })}</Text>
                    <Flex align="center" gap={4}>
                        <Button
                            fill="none"
                            onClick={() => {
                                Toast.clear();
                                if (
                                    menuUpdateGenerationRef.current !== undoGeneration ||
                                    menuDataRef.current?.projectId !== undoProjectId
                                ) {
                                    Toast.show({ content: t('undoUnavailable'), duration: 1800 });
                                    return;
                                }

                                applyLocalMenuUpdate(removeObjRef(previousProject));
                                Toast.show({ content: t('changesUndone'), duration: 1200 });
                            }}
                            size="small"
                        >
                            {t('undo')}
                        </Button>
                        <Button
                            fill="none"
                            icon={<LuX size={16} />}
                            onClick={() => {
                                Toast.clear();
                            }}
                            size="small"
                        />
                    </Flex>
                </Flex>
            ),
            duration: 5000,
        });
    }, [applyLocalMenuUpdate, t]);

    useEffect(() => {
        menuDataRef.current = menuData;
    }, [menuData]);

    useImageBatchJobListener({
        project: ((isImageUploadOpen || Boolean(activeBatchImageJob)) ? menuData : null) as Project,
        setActiveBatchImageJob,
    });

    const updateItemImageFromUpload = useCallback((itemId: string, imageUrl: string, imageName: string) => {
        const sourceProject = menuDataRef.current;
        if (!sourceProject?.files || !imageUrl) return;

        const updated = removeObjRef(sourceProject);
        let imageUpdated = false;

        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((menuItem: any) => {
                if (menuItem.id === itemId) {
                    menuItem.images = [{ url: imageUrl, name: imageName }];
                    imageUpdated = true;
                }
            });
        });

        if (imageUpdated) {
            applyLocalMenuUpdate(updated);
        }
    }, [applyLocalMenuUpdate]);

    const uploadItemImageInBackground = useCallback((itemId: string, imageData: string, imageName: string, uid: string) => {
        if (!imageData.includes('base64')) return;

        void uploadFile({
            uid,
            url: imageData,
        } as any, 'itemImages')
            .then((uploadedImage) => {
                if (uploadedImage) {
                    updateItemImageFromUpload(itemId, uploadedImage, imageName);
                }
            })
            .catch((error) => {
                console.error('[MobileMenu] Failed to upload item image:', error);
                Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });
            });
    }, [t, updateItemImageFromUpload]);

    const openImageUploadModal = useCallback((itemId?: string, source = '') => {
        const matchedItem = itemId ? findExtractedItemById(menuDataRef.current, itemId) : null;
        setImageModalItem(matchedItem);
        setImageModalSource(source);
        setIsImageUploadOpen(true);
    }, []);

    const handleModalImageUpload = useCallback(async (
        selectedItem: ItemForDropdown,
        imagesToUpload: any[],
    ) => {
        const sourceProject = menuDataRef.current as Project | null;
        if (!sourceProject?.projectId) {
            Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });
            return;
        }

        const updatedProject = await associateItemImagesWithProject(
            sourceProject,
            selectedItem,
            imagesToUpload,
        );

        if (!updatedProject) {
            Toast.show({ content: t('imageUploadFailed'), duration: 2000 });
            return;
        }

        const savedProject = await updateProjectWithoutLoader({
            ...updatedProject,
            projectId: sourceProject.projectId,
        });

        syncSavedMenuProject(savedProject || updatedProject);
        Toast.show({ content: t('imageAddedSuccess'), duration: 1200 });
    }, [syncSavedMenuProject, t]);

    useEffect(() => {
        const nextProject = selectedProject ? removeObjRef(selectedProject) : null;
        const nextProjectId = nextProject?.projectId || null;
        const currentProjectId = menuData?.projectId || null;
        const pendingProjectId = pendingMenuRef.current?.projectId || null;
        const persistedProjectId = persistedMenuRef.current?.projectId || null;

        if (!nextProjectId) {
            menuUpdateGenerationRef.current += 1;
            setMenuData(null);
            persistedMenuRef.current = null;
            pendingMenuRef.current = null;
            persistedLocalSnapshotRef.current = null;
            pendingLocalSnapshotRef.current = null;
            return;
        }

        if (nextProjectId !== currentProjectId) {
            menuUpdateGenerationRef.current += 1;
            setMenuData(nextProject);
            persistedMenuRef.current = nextProject;
            pendingMenuRef.current = null;
            persistedLocalSnapshotRef.current = JSON.stringify(nextProject);
            pendingLocalSnapshotRef.current = null;
            return;
        }

        if (pendingProjectId === nextProjectId) {
            // Desktop keeps the local dirty editor state while the background save is in flight.
            // Match that here: provider echoes for the same project must not override unsaved edits.
            persistedMenuRef.current = nextProject;
            return;
        }

        if (persistedProjectId !== nextProjectId) {
            setMenuData(nextProject);
            persistedMenuRef.current = nextProject;
            persistedLocalSnapshotRef.current = JSON.stringify(nextProject);
            return;
        }

        const nextSnapshot = JSON.stringify(nextProject);
        const persistedSnapshot = JSON.stringify(persistedMenuRef.current);

        if (nextSnapshot !== persistedSnapshot) {
            setMenuData(nextProject);
            persistedMenuRef.current = nextProject;
            persistedLocalSnapshotRef.current = nextSnapshot;
        }
    }, [menuData?.projectId, selectedProject]);

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

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && pendingMenuRef.current?.projectId && !isPersistingRef.current) {
                void flushPendingMenuPersist();
            }
        };

        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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
            void refreshCachedProject(activeProcessingState?.projectId || menuData?.projectId);
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
        refreshCachedProject,
        setActiveProcessingState,
        showReviewSheet,
        t,
    ]);

    const activeLang = useMemo(() => menuData?.languages?.[0] || 'en', [menuData?.languages]);
    const activeProjectLanguages = useMemo(() => menuData?.languages || ['en'], [menuData?.languages]);
    const languageLabels = useMemo(() => {
        const labelsByCode = new Map(GlobalLanguagesList.map((language) => [language.code, language.nativeName || language.name]));
        return activeProjectLanguages.map((code) => ({
            code,
            isPrimary: code === activeProjectLanguages[0],
            label: labelsByCode.get(code) || code.toUpperCase(),
        }));
    }, [activeProjectLanguages]);

    const categoryOptions = useMemo<CategoryOption[]>(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, string>();
        menuData.files.forEach((file: any) => {
            const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
            categories.forEach((category) => {
                const label = resolveCategoryName(category, activeLang, uncategorizedLabel);
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
                const categories = [...file.extractedData.data.categories as ExtractedDataCategory[]].sort((a, b) => {
                    const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
                    const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    const aName = resolveCategoryName(a, activeLang, '');
                    const bName = resolveCategoryName(b, activeLang, '');
                    return aName.localeCompare(bName);
                });
                const categoryMap: Record<string, string> = {};
                categories.forEach((category) => {
                    categoryMap[category.id] = resolveCategoryName(category, activeLang, uncategorizedLabel);
                });
                const menuItems = [...toArray<ExtractedDataItem>(file.extractedData.data.items)].sort((a, b) => {
                    const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
                    const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    const aName = resolveItemName(a, activeLang, '');
                    const bName = resolveItemName(b, activeLang, '');
                    return aName.localeCompare(bName);
                });
                categories.forEach((category) => {
                    const categoryName = categoryMap[category.id] || uncategorizedLabel;
                    const categoryItems = menuItems.filter((item) => item.category === category.id);
                    categoryItems.forEach((item) => {
                        const itemName = resolveItemName(item, activeLang, t('unnamedItem'));
                        const itemDescription = resolveItemDescription(item, activeLang);
                        const price = normalizeExtractedPrice(item.price);
                        const available = item.available !== false;
                        const active = item.active !== false;
                        items.push({
                            id: item.id || `${categoryName}-${itemName}`,
                            name: itemName,
                            price: price,
                            attributes: item.attributes?.map((attribute: any) => ({
                                id: attribute.id,
                                name: resolveAttributeName(attribute, activeLang, 'Variant'),
                                price: normalizeExtractedPrice(attribute.price),
                                active: attribute.active !== false,
                            })),
                            available,
                            active,
                            categoryId: item.category,
                            categoryName,
                            description: itemDescription,
                            image: item.images?.[0]?.url || '',
                            translationMissing: hasMissingTranslations(item, activeProjectLanguages),
                        });
                    });
                });
            }
        });
        return items;
    }, [activeLang, activeProjectLanguages, menuData, t, uncategorizedLabel]);

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

    const categoryIssueSummary = useMemo(() => {
        const map = new Map<string, CategoryIssueSummary>();

        const getSummary = (categoryId: string) => {
            const existing = map.get(categoryId);
            if (existing) return existing;

            const next: CategoryIssueSummary = {
                hidden: 0,
                missingDescriptions: 0,
                missingImages: 0,
                missingPrices: 0,
                priceOutliers: 0,
            };
            map.set(categoryId, next);
            return next;
        };

        menuItems.forEach((item) => {
            const categoryId = item.categoryId || 'uncategorized';
            const summary = getSummary(categoryId);

            if (!item.description?.trim()) summary.missingDescriptions += 1;
            if (!item.image) summary.missingImages += 1;
            if (!(item.price > 0) && !item.attributes?.length) summary.missingPrices += 1;
            if (!item.active) summary.hidden += 1;
            if (priceOutlierItemIds.has(item.id)) summary.priceOutliers += 1;
        });

        return map;
    }, [menuItems, priceOutlierItemIds]);

    const categoryHasSignals = useMemo(() => {
        const map = new Map<string, boolean>();

        categoryIssueSummary.forEach((summary, categoryId) => {
            map.set(
                categoryId,
                summary.missingPrices > 0
                || summary.missingImages > 0
                || summary.hidden > 0
                || summary.priceOutliers > 0
                || summary.missingDescriptions > 0
            );
        });

        return map;
    }, [categoryIssueSummary]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return menuItems.filter((item) => {
            if (q && !item.name.toLowerCase().includes(q) && !item.categoryName?.toLowerCase().includes(q)) {
                return false;
            }
            if (filters.categoryIds.length > 0 && (!item.categoryId || !filters.categoryIds.includes(item.categoryId))) {
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
            if (filters.qualityIssue === 'translationMissing' && !item.translationMissing) {
                return false;
            }
            return true;
        });
    }, [filters, menuItems, priceOutlierItemIds, searchQuery]);

    const appliedFilterCount = useMemo(() => {
        return [
            filters.categoryIds.length > 0,
            filters.hasImage !== null,
            filters.hasDescription !== null,
            filters.hasPrice !== null,
            filters.availability !== null,
            filters.activeStatus !== null,
            filters.qualityIssue !== null,
        ].filter(Boolean).length;
    }, [filters]);

    useEffect(() => {
        if (!isFilterSheetOpen) return;
        setDraftFilters(filters);
    }, [filters, isFilterSheetOpen]);

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

        if (filters.hasImage !== null) {
            chips.push({
                key: 'image',
                label: filters.hasImage ? t('hasImage') : t('missingPhoto'),
                onRemove: () => setFilters((prev) => ({ ...prev, hasImage: null })),
            });
        }

        if (filters.hasDescription !== null) {
            chips.push({
                key: 'description',
                label: filters.hasDescription ? t('hasDescription') : t('missingDescription'),
                onRemove: () => setFilters((prev) => ({ ...prev, hasDescription: null })),
            });
        }

        if (filters.hasPrice !== null) {
            chips.push({
                key: 'price-presence',
                label: filters.hasPrice ? t('hasPrice') : t('missingPrice'),
                onRemove: () => setFilters((prev) => ({ ...prev, hasPrice: null })),
            });
        }

        if (filters.availability !== null) {
            chips.push({
                key: 'availability',
                label: filters.availability ? availabilityLabels.available : availabilityLabels.unavailable,
                onRemove: () => setFilters((prev) => ({ ...prev, availability: null })),
            });
        }

        if (filters.activeStatus !== null) {
            chips.push({
                key: 'status',
                label: filters.activeStatus ? t('shownOnMenu') : t('hiddenFromMenu'),
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

        if (filters.qualityIssue === 'translationMissing') {
            chips.push({
                key: 'quality-translation-missing',
                label: t('missingTranslation'),
                onRemove: () => setFilters((prev) => ({ ...prev, qualityIssue: null })),
            });
        }

        return chips;
    }, [availabilityLabels.available, availabilityLabels.unavailable, categoryOptions, filters, t]);

    const handleReviewQualitySignal = useCallback((signal: { id: string }) => {
        setSearchQuery('');
        setIsMenuQualityExpanded(false);
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
            case 'translations':
                return { ...DEFAULT_FILTERS, qualityIssue: 'translationMissing' };
            default:
                return DEFAULT_FILTERS;
            }
        });
        requestAnimationFrame(() => {
            menuContentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);

    useEffect(() => {
        if (searchQuery || appliedFilterCount > 0) {
            setIsMenuQualityExpanded(false);
        }
    }, [appliedFilterCount, searchQuery]);

    const renderSingleChoiceFilter = useCallback((
        title: string,
        value: string,
        options: Array<{ label: string; value: string }>,
        subtitle: string | null,
        onChange: (value: string) => void
    ) => (
        <Card>
            <Flex gap={12} vertical>
                <Flex gap={2} vertical>
                    <Text strong>{title}</Text>
                    {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
                </Flex>
                <Flex gap={8} vertical>
                    {options.map((option) => {
                        const selected = value === option.value;

                        return (
                            <div
                                key={option.value}
                                onClick={() => onChange(selected ? '' : option.value)}
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

    const renderIssueToggle = useCallback((
        label: string,
        selected: boolean,
        onToggle: () => void
    ) => (
        <div
            onClick={onToggle}
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
                    {label}
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
    ), [token]);

    const activeProjectSummary = useMemo(
        () => selectedProjectSummary || projectsList.find((project: any) => project.projectId === menuData?.projectId) || null,
        [menuData?.projectId, projectsList, selectedProjectSummary]
    );
    const isFirstRunProject = Boolean(menuData?.projectId) && menuItems.length === 0 && !searchQuery && appliedFilterCount === 0;
    const categorySummary = useMemo(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, CategorySummary>();
        menuData.files.forEach((file: any) => {
            const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
            const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
            categories.forEach((category) => {
                const name = resolveCategoryName(category, activeLang, uncategorizedLabel);
                const count = items.filter((item) => item.category === category.id).length;
                if (!map.has(category.id)) {
                    map.set(category.id, {
                        id: category.id,
                        name,
                        active: category.active !== false,
                        itemCount: count,
                        orderIndex: category.orderIndex,
                        timeSlotPresetIds: getCategoryTimeSlotPresetIds(category),
                    });
                }
            });
        });
        return Array.from(map.values()).sort((a, b) => {
            const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
            const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
            if (aIndex !== bIndex) return aIndex - bIndex;
            return a.name.localeCompare(b.name);
        });
    }, [activeLang, menuData?.files, uncategorizedLabel]);
    const hasCategories = categorySummary.length > 0;
    const categoryCount = useMemo(() => categorySummary.length, [categorySummary.length]);

    const orderedCategorySections = useMemo(() => {
        const itemsByCategory = new Map<string, MenuItemType[]>();
        filteredItems.forEach((item) => {
            const key = item.categoryId || 'uncategorized';
            const current = itemsByCategory.get(key) || [];
            current.push(item);
            itemsByCategory.set(key, current);
        });

        const sections = categorySummary
            .map((category) => ({
                id: category.id,
                name: category.name,
                items: itemsByCategory.get(category.id) || [],
            }))
            .filter((category) => {
                if (!searchQuery && appliedFilterCount === 0) {
                    return true;
                }
                return category.items.length > 0;
            });

        const uncategorizedItems = itemsByCategory.get('uncategorized') || [];
        if (uncategorizedItems.length > 0) {
            sections.push({
                id: 'uncategorized',
                name: uncategorizedLabel,
                items: uncategorizedItems,
            });
        }

        return sections;
    }, [appliedFilterCount, categorySummary, filteredItems, searchQuery, uncategorizedLabel]);

    const categoryItemMap = useMemo<Record<string, MobileCategoryReorderItem[]>>(() => {
        if (!menuData?.files) return {};
        const grouped: Record<string, MobileCategoryReorderItem[]> = {};
        menuData.files.forEach((file: any) => {
            const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
            items.forEach((item) => {
                const categoryId = item.category || 'uncategorized';
                if (!grouped[categoryId]) grouped[categoryId] = [];
                grouped[categoryId].push({
                    available: item.available !== false,
                    id: item.id,
                    name: resolveItemName(item, activeLang, t('unnamedItem')),
                    active: item.active !== false,
                    price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price,
                });
            });
        });
        return grouped;
    }, [activeLang, menuData?.files, t]);
    const categorySummaryById = useMemo(() => {
        const map = new Map<string, CategorySummary>();
        categorySummary.forEach((category) => map.set(category.id, category));
        return map;
    }, [categorySummary]);

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
        nextCategory.orderIndex = targetFile.extractedData.data.categories.length;
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
            const hasCategory = file.extractedData?.data?.categories?.some((category: ExtractedDataCategory) => category.id === categoryId);
            if (!hasCategory) {
                return;
            }

            file.extractedData = deleteCategory(file, categoryId);
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
            const nextCategoryItems = [...orderedForFile, ...untouchedCategoryItems].map((item: any, index: number) => ({
                ...item,
                orderIndex: index,
            }));

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

    const handleToggleCategoryActive = useCallback((categoryId: string, nextActive: boolean) => {
        if (!menuData || categoryId === 'uncategorized') return;

        const updated = removeObjRef(menuData);
        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                if (category.id === categoryId) {
                    category.active = nextActive;
                }
            });
        });

        applyLocalMenuUpdate(updated);
        Toast.show({
            content: nextActive ? t('categoryShown') : t('categoryHidden'),
            duration: 1000,
        });
    }, [applyLocalMenuUpdate, menuData, t]);

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
                        <MobileMenuQualitySignals
                            activeKey={isMenuQualityExpanded ? ['menu-quality'] : []}
                            files={menuData.files}
                            onExpandedChange={setIsMenuQualityExpanded}
                            onReviewSignal={handleReviewQualitySignal}
                        />
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
                            {filters.hasImage === false && filteredItems.length > 0 ? (
                                <Button
                                    color="primary"
                                    fill="outline"
                                    onClick={() => openImageUploadModal(undefined, 'filter-missing-image')}
                                    size="small"
                                >
                                    {t('addImages')}
                                </Button>
                            ) : null}
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
                            <Flex gap={8} style={{ flex: 1, minWidth: 0 }} vertical>
                                <Text type="secondary">
                                    {t('categoriesSummary', {
                                        items: `${menuItems.length} ${labels.itemsPlural}`,
                                        categories: t('categoriesCount', { count: categoryCount }),
                                    })}
                                </Text>
                                {languageLabels.length > 0 ? (
                                    <Flex align="center" gap={6} wrap="wrap">
                                        <Flex align="center" gap={6}>
                                            <LuLanguages size={14} />
                                            <Text type="secondary">{t('availableLanguages')}</Text>
                                        </Flex>
                                        {languageLabels.map((language) => (
                                            <Tag color={language.isPrimary ? 'primary' : undefined} key={language.code}>
                                                {language.label}
                                            </Tag>
                                        ))}
                                    </Flex>
                                ) : null}
                            </Flex>
                            <Flex align="center" gap={8}>
                                {orderedCategorySections.length > 0 ? (
                                    <Button
                                        fill="none"
                                        onClick={() => {
                                            setExpandedCategoryKeys((current) => current.length === orderedCategorySections.length ? [] : orderedCategorySections.map((section) => section.id));
                                        }}
                                        size="small"
                                    >
                                        {expandedCategoryKeys.length === orderedCategorySections.length ? 'Collapse all' : 'Expand all'}
                                    </Button>
                                ) : null}
                                {searchQuery ? <Tag>{t('itemsCount', { count: filteredItems.length })}</Tag> : null}
                            </Flex>
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
                    ) : orderedCategorySections.length === 0 ? (
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
                        <Collapse
                            activeKey={expandedCategoryKeys}
                            onChange={(key) => setExpandedCategoryKeys(Array.isArray(key) ? key : (key ? [key] : []))}
                        >
                            {orderedCategorySections.map(({ id, items, name }) => (
                                <Collapse.Panel
                                    key={id}
                                    title={(
                                        <Flex align="center" gap={8} style={{ minWidth: 0, width: '100%' }}>
                                            <Flex gap={4} style={{ flex: '1 1 auto', minWidth: 0 }} vertical>
                                                <Text
                                                    strong
                                                    style={{
                                                        minWidth: 0,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {name}
                                                </Text>
                                                {id !== 'uncategorized' ? (
                                                    <Text type="secondary">
                                                        {categorySummaryById.get(id)?.itemCount || items.length} items
                                                    </Text>
                                                ) : null}
                                            </Flex>
                                            {categoryHasSignals.get(id) ? (
                                                <div
                                                    style={{
                                                        backgroundColor: token.colorWarning,
                                                        borderRadius: '999px',
                                                        flex: '0 0 auto',
                                                        height: 8,
                                                        width: 8,
                                                    }}
                                                />
                                            ) : null}
                                            {id !== 'uncategorized' ? (
                                                <Flex
                                                    align="center"
                                                    gap={8}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onMouseDown={(event) => event.stopPropagation()}
                                                    onPointerDown={(event) => event.stopPropagation()}
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    <Button
                                                        fill="outline"
                                                        onClick={() => {
                                                            setCategorySheetMode('manage');
                                                            setIsCategorySheetOpen(true);
                                                        }}
                                                        size="small"
                                                    >
                                                        <LuPencil size={14} />
                                                    </Button>
                                                    <Switch
                                                        checked={categorySummaryById.get(id)?.active !== false}
                                                        onChange={(checked) => handleToggleCategoryActive(id, checked)}
                                                    />
                                                </Flex>
                                            ) : null}
                                        </Flex>
                                    )}
                                >
                                    {items.length === 0 ? (
                                        <Empty description={t('noItemsToShow')} />
                                    ) : (
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
                                                                <Flex align="center" gap={6}>
                                                                    <Switch checked={item.available} onChange={() => handleToggleAvailability(item)} />
                                                                    <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }} type="secondary">
                                                                        {item.available ? availabilityLabels.available : availabilityLabels.unavailable}
                                                                    </Text>
                                                                </Flex>
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
                                                        <Flex align="center" gap={8} wrap>
                                                            {!item.active ? <Tag>{t('hidden')}</Tag> : null}
                                                            <Tag>{formatMenuPrice(item.price, currencySymbol)}</Tag>
                                                            {item.translationMissing ? <Tag color="warning">{t('missingTranslation')}</Tag> : null}
                                                            {item.attributes?.slice(0, 2).map((attribute) => (
                                                                <Tag key={attribute.id}>{attribute.name}</Tag>
                                                            ))}
                                                            {item.attributes && item.attributes.length > 2 ? <Tag>+{item.attributes.length - 2} more</Tag> : null}
                                                        </Flex>
                                                    }
                                                />
                                            ))}
                                        </List>
                                    )}
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
                        <Title level={4} style={{ lineHeight: 1.2, margin: 0, textAlign: 'center' }}>{t('findAndFix')}</Title>
                        <Button fill="none" onClick={() => setIsFilterSheetOpen(false)} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}>
                            <LuX size={18} />
                        </Button>
                    </Flex>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: '12px 12px 12px' }} vertical>

                    <Card>
                        <Flex gap={12} vertical>
                            <Flex gap={2} vertical>
                                <Text strong>{t('whereToLook')}</Text>
                                <Text type="secondary">{t('chooseCategoryToNarrowList')}</Text>
                            </Flex>
                            <Flex gap={10} vertical>
                                {categoryOptions.length === 0 ? (
                                    <Text type="secondary">{t('allCategories')}</Text>
                                ) : (
                                    categoryOptions.map((option) => (
                                        <div
                                            key={option.id}
                                            onClick={() => {
                                                setDraftFilters((prev) => ({
                                                    ...prev,
                                                    categoryIds: prev.categoryIds.includes(option.id) ? [] : [option.id],
                                                }));
                                            }}
                                            style={{
                                                backgroundColor: draftFilters.categoryIds.includes(option.id) ? token.colorPrimaryBg : token.colorBgContainer,
                                                border: `1px solid ${draftFilters.categoryIds.includes(option.id) ? token.colorPrimary : token.colorBorderSecondary}`,
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                padding: '12px 14px',
                                            }}
                                        >
                                            <Flex align="center" gap={12} justify="space-between">
                                                <Text style={{ color: draftFilters.categoryIds.includes(option.id) ? token.colorPrimary : undefined }}>
                                                    {option.name}
                                                </Text>
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    style={{
                                                        backgroundColor: draftFilters.categoryIds.includes(option.id) ? token.colorPrimary : 'transparent',
                                                        border: `1px solid ${draftFilters.categoryIds.includes(option.id) ? token.colorPrimary : token.colorBorderSecondary}`,
                                                        borderRadius: '999px',
                                                        color: draftFilters.categoryIds.includes(option.id) ? token.colorTextLightSolid : token.colorTextQuaternary,
                                                        flexShrink: 0,
                                                        height: 20,
                                                        width: 20,
                                                    }}
                                                >
                                                    {draftFilters.categoryIds.includes(option.id) ? <LuCheck size={12} /> : null}
                                                </Flex>
                                            </Flex>
                                        </div>
                                    ))
                                )}
                            </Flex>
                        </Flex>
                    </Card>

                    <Card>
                        <Flex gap={12} vertical>
                            <Flex gap={2} vertical>
                                <Text strong>{t('findItemsWith')}</Text>
                                <Text type="secondary">{t('findItemsWithHint')}</Text>
                            </Flex>
                            <Flex gap={8} vertical>
                                {renderIssueToggle(
                                    t('missingPhoto'),
                                    draftFilters.hasImage === false,
                                    () => setDraftFilters((prev) => ({ ...prev, hasImage: prev.hasImage === false ? null : false }))
                                )}
                                {renderIssueToggle(
                                    t('missingDescription'),
                                    draftFilters.hasDescription === false,
                                    () => setDraftFilters((prev) => ({ ...prev, hasDescription: prev.hasDescription === false ? null : false }))
                                )}
                                {renderIssueToggle(
                                    t('missingPrice'),
                                    draftFilters.hasPrice === false,
                                    () => setDraftFilters((prev) => ({ ...prev, hasPrice: prev.hasPrice === false ? null : false }))
                                )}
                                {activeProjectLanguages.length > 1 ? renderIssueToggle(
                                    t('missingTranslation'),
                                    draftFilters.qualityIssue === 'translationMissing',
                                    () => setDraftFilters((prev) => ({
                                        ...prev,
                                        qualityIssue: prev.qualityIssue === 'translationMissing' ? null : 'translationMissing',
                                    }))
                                ) : null}
                            </Flex>
                        </Flex>
                    </Card>

                    {renderSingleChoiceFilter(
                        t('availability'),
                        draftFilters.availability === null ? '' : draftFilters.availability ? 'available' : 'soldOut',
                        [
                            { label: availabilityLabels.available, value: 'available' },
                            { label: availabilityLabels.unavailable, value: 'soldOut' },
                        ],
                        null,
                        (value) => setDraftFilters((prev) => ({ ...prev, availability: value === '' ? null : value === 'available' }))
                    )}

                    {renderSingleChoiceFilter(
                        t('visibility'),
                        draftFilters.activeStatus === null ? '' : draftFilters.activeStatus ? 'active' : 'hidden',
                        [
                            { label: t('shownOnMenu'), value: 'active' },
                            { label: t('hiddenFromMenu'), value: 'hidden' },
                        ],
                        null,
                        (value) => setDraftFilters((prev) => ({ ...prev, activeStatus: value === '' ? null : value === 'active' }))
                    )}

                    <Flex gap={8}>
                        <Button
                            block
                            color="danger"
                            fill="outline"
                            onClick={() => {
                                setDraftFilters(DEFAULT_FILTERS);
                                setFilters(DEFAULT_FILTERS);
                                setIsFilterSheetOpen(false);
                            }}
                        >
                            {t('clearAll')}
                        </Button>
                        <Button block onClick={() => {
                            setFilters(draftFilters);
                            setIsFilterSheetOpen(false);
                        }}>
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
                onAddImages={() => launchCommandAction(() => openImageUploadModal(undefined, 'menu'))}
                onGenerateDescriptions={() => launchCommandAction(() => setIsGenerateDescriptionsOpen(true))}
                onManageLanguages={() => launchCommandAction(() => setIsManageLanguagesOpen(true))}
                onTextCase={() => launchCommandAction(() => setIsTextCaseOpen(true))}
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
                <TextCaseSheet
                    onClose={() => handleCommandActionBack(() => setIsTextCaseOpen(false))}
                    onSaved={(updatedProject) => {
                        applyLocalMenuUpdate(updatedProject);
                        setIsTextCaseOpen(false);
                        resetCommandActionFlow();
                    }}
                    projectData={menuData}
                    visible={isTextCaseOpen}
                />
            ) : null}

            {menuData ? (
                <SmartRecommendationsSheet
                    businessType={storeDetails?.businessType}
                    onClose={() => handleCommandActionBack(() => setIsSmartRecommendationsOpen(false))}
                    onSaved={(updatedProject) => {
                        applyLocalMenuUpdate(updatedProject);
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
                        applyLocalMenuUpdate(updatedProject);
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
                businessType={storeDetails?.businessType}
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
                    onGenerateDescriptions={() => {
                        setEditingItem(null);
                        setIsGenerateDescriptionsOpen(true);
                    }}
                    onManageLanguages={() => {
                        setEditingItem(null);
                        setIsManageLanguagesOpen(true);
                    }}
                    onManageImages={editingItem.id ? () => openImageUploadModal(editingItem.id, 'item') : undefined}
                    onSave={async (updatedItem) => {
                        if (!menuData) return;
                        const updated = removeObjRef(menuData);
                        const pendingImage = typeof updatedItem.image === 'string' ? updatedItem.image : null;
                        const shouldUploadImage = Boolean(pendingImage?.includes('base64'));
                        const imageName = `${updatedItem.name || editingItem.id}.jpg`;

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
                                        if (!shouldUploadImage) {
                                            nextItem.images = pendingImage ? [{ url: pendingImage, name: imageName }] : [];
                                        }
                                    }
                                    file.extractedData.data.items[idx] = nextItem;
                                }
                            });
                        });
                        applyLocalMenuUpdate(updated);
                        Toast.show({ content: t('itemUpdated'), duration: 1000 });
                        setEditingItem(null);
                        resetCommandActionFlow();

                        if (shouldUploadImage && pendingImage) {
                            uploadItemImageInBackground(
                                editingItem.id,
                                pendingImage,
                                imageName,
                                `${editingItem.id}-mobile-image`,
                            );
                        }
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
                        if (!newItem.categoryId) {
                            Toast.show({ content: t('selectCategory'), duration: 1500 });
                            return;
                        }
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

                        const categoryId = newItem.categoryId;

                        const pendingImage = typeof newItem.image === 'string' ? newItem.image : null;
                        const shouldUploadImage = Boolean(pendingImage?.includes('base64'));

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
                        createdItem.orderIndex = targetFile.extractedData.data.items.filter((item: any) => item.category === categoryId).length;
                        createdItem.active = newItem.active !== false;
                        createdItem.available = newItem.available !== false;
                        createdItem.attributes = (newItem.attributes || []).map((attribute) => ({
                            id: attribute.id,
                            active: attribute.active !== false,
                            name: { [activeLang]: attribute.name },
                            price: String(attribute.price || 0),
                        }));
                        const imageName = `${newItem.name || createdItem.id}.jpg`;
                        createdItem.images = pendingImage && !shouldUploadImage ? [{ url: pendingImage, name: imageName }] : [];

                        targetFile.extractedData.data.items.push(createdItem);

                        applyLocalMenuUpdate(updated);
                        Toast.show({ content: t('itemAdded'), duration: 1000 });
                        setIsAddSheetOpen(false);
                        resetCommandActionFlow();

                        if (shouldUploadImage && pendingImage) {
                            uploadItemImageInBackground(
                                createdItem.id,
                                pendingImage,
                                imageName,
                                `${createdItem.id}-mobile-new-item`,
                            );
                        }
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

            {menuData && isImageUploadOpen ? (
                <ProjectsDataProvider
                    contextData={{
                        activeProject: menuData,
                        setActiveProject: syncSavedMenuProject,
                        currentView: 1,
                        setCurrentView: () => { },
                        activeBatchImageJob,
                        setActiveBatchImageJob,
                    }}
                >
                    <ImageUploadModal
                        from={imageModalSource}
                        itemToUpdate={imageModalItem}
                        onClose={() => {
                            handleCommandActionBack(() => {
                                setIsImageUploadOpen(false);
                                setImageModalItem(null);
                                setImageModalSource('');
                            });
                        }}
                        onImageUpload={handleModalImageUpload}
                        open={isImageUploadOpen}
                        projectData={menuData}
                    />
                </ProjectsDataProvider>
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
                        void refreshCachedProject(menuData.projectId);
                        setShowSuccessState(true);
                    }}
                    primaryLang={menuData?.languages?.[0] || 'en'}
                    projectId={menuData.projectId}
                    visible={showReviewSheet}
                />
            ) : null}

            <BulkActionsSheet
                initialAction={bulkActionType}
                onApply={(updatedProject, context) => {
                    applyUndoableBulkMenuUpdate(updatedProject, context?.previousProject, context?.updatedCount);
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
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />
        </Flex>
    );
}
