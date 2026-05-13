'use client'

import CategoryIcon from '@atoms/CategoryIcon';
import { getOwnerLabels } from '@config/businessLabels';
import { FEATURE_FLAGS } from '@config/features';
import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { updateStore } from '@database/stores';
import { updateProjectWithoutLoader, uploadFile } from '@database/projects';
import { useImageBatchJobListener } from '@hook/useImageBatchJobListener';
import useMenuProcessingJob from '@hook/useMenuProcessingJob';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { runComparisonEngine } from '@lib/extraction/comparisonEngine';
import type { ComparisonEngineOutput, ComparisonMode } from '@lib/extraction/comparisonEngine.types';
import { buildComparisonProjectInput, getLinkedMasterComparisonInput } from '@lib/extraction/projectInput';
import { checkExistingActiveJob } from '@lib/firebase/menuProcessing';
import { generateAndSaveProjectImageIfMissing, getProjectImageDataFromComparisonPreview } from '@lib/image/projectImageGeneration';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getDataUrlMimeType } from '@lib/media/imageProfiles';
import { toPreparedUploadName } from '@lib/media/prepareMediaImage';
import { hasMeaningfulDescriptionsForLanguages } from '@lib/menu/descriptionQuality';
import { resolveProjectForRender } from '@lib/multiOutlet';
import { stripResolvedOutletProjectForSave } from '@lib/multiOutlet/outletProjectPersistence';
import { isPriceOutlierReviewed, normalizePriceForReview } from '@lib/mce/qualitySignals';
import { getBusinessAttributesWithMenuDefaults } from '@lib/obp/inferBusinessAttributesFromMenu';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { generateProjectUrl } from '@lib/utils/slugify';
import { normalizeCategoryIconValue } from '@lib/categoryIcons';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import ProjectsDataProvider from '@providers/projectsDataProvider';
import { removeObjRef } from '@util/utils';
import { DEFAULT_OUTLET_POLICY, type InheritanceState, type OutletPolicy } from '@type/multiOutlet.types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCamera, LuCheck, LuFileText, LuFilter, LuInfo, LuLanguages, LuPencil, LuSettings2, LuX } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { associateItemImagesWithProject } from '../../templates/main-app/projects/editorView/utils/associateItemImages';
import { createNewCategory, createNewItem, deleteCategory } from '../../templates/main-app/projects/editorView/utils/editorOperations';
import type { BatchImageGenerationJobType, ItemForDropdown, Project } from '../../templates/main-app/projects/types';
import type {
    ExtractedDataAttribute,
    ExtractedDataCategory,
    ExtractedDataItem,
} from '../../templates/main-app/projects/types/extractedData.types';
import { generateMenuFileUid } from '../../templates/main-app/projects/utils';
import { clearStaleCategoryTranslations, clearStaleTranslations, translateCategory } from '../../templates/main-app/projects/utils/translationsUtils';
import { Button, Card, Collapse, Dialog, DotLoading, Empty, Flex, FloatingBubble, List, Popup, ProgressBar, PullToRefresh, Result, SearchBar, Switch, Tag, Text, Title, Toast } from '../antd';
import MobileMenuCommandSheet from '../components/MobileMenuCommandSheet';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import type { MobileCategoryReorderItem } from '../sheets/CategoryManagerSheet';
import type { MobileMenuItemType as MenuItemType } from '../types';
import useViewportInfo from '../../../hooks/useViewportInfo';

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
const AIDefaultsSheet = dynamic(() => import('../sheets/AIDefaultsSheet'), { ssr: false });
const ImageUploadModal = dynamic(() => import('../../templates/main-app/projects/editorView/ImageUploadModal'), { ssr: false });

type CategoryOption = { id: string; name: string; icon?: string };
type CategorySummary = {
    active: boolean;
    id: string;
    icon?: string;
    itemCount: number;
    nameByLanguage?: Record<string, string>;
    name: string;
    orderIndex?: number;
    timeSlotPresetIds?: string[];
    translationMissing?: boolean;
};

type CategoryIssueSummary = {
    hidden: number;
    missingDescriptions: number;
    missingImages: number;
    missingPrices: number;
    missingIcon?: boolean;
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
    qualityIssue: 'priceOutliers' | 'translationMissing' | 'categoryIconMissing' | null;
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

function hasMissingDescriptionForLanguages(
    item: Partial<ExtractedDataItem> | null | undefined,
    languageCodes: string[]
): boolean {
    return !hasMeaningfulDescriptionsForLanguages(item?.description, languageCodes);
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

function hasCategoryIconValue(icon: unknown): boolean {
    return normalizeCategoryIconValue(icon).length > 0;
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

function hasMissingTranslationsForLanguage(
    item: Partial<ExtractedDataItem> | null | undefined,
    primaryLanguage: string,
    targetLanguage: string
): boolean {
    if (!item || primaryLanguage === targetLanguage) return false;

    if (hasLocalizedValue(item.name, primaryLanguage) && !hasLocalizedValue(item.name, targetLanguage)) {
        return true;
    }

    if (hasLocalizedValue(item.description, primaryLanguage) && !hasLocalizedValue(item.description, targetLanguage)) {
        return true;
    }

    return toArray(item.attributes).some((attribute) => (
        hasLocalizedValue(attribute?.name, primaryLanguage) && !hasLocalizedValue(attribute?.name, targetLanguage)
    ));
}

function hasMissingCategoryTranslationForLanguage(
    category: Partial<ExtractedDataCategory> | null | undefined,
    primaryLanguage: string,
    targetLanguage: string
): boolean {
    if (!category || primaryLanguage === targetLanguage) return false;

    return hasLocalizedValue(category.name, primaryLanguage) && !hasLocalizedValue(category.name, targetLanguage);
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

function findFileContainingItem(projectData: Project | null | undefined, itemId: string): Project['files'][number] | null {
    if (!projectData?.files?.length) return null;

    for (const file of projectData.files) {
        const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
        if (items.some((item) => item.id === itemId)) {
            return file;
        }
    }

    return null;
}

function findFileForCategory(projectData: Project | null | undefined, categoryId?: string): Project['files'][number] | null {
    if (!projectData?.files?.length) return null;
    if (!categoryId) return projectData.files[0] || null;

    for (const file of projectData.files) {
        const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
        if (categories.some((category) => category.id === categoryId)) {
            return file;
        }
    }

    return projectData.files[0] || null;
}

function ensurePrimaryMenuFile(
    projectData: Project | null | undefined,
    tenantId?: string | number,
    storeId?: string | number,
): Project['files'][number] | null {
    if (!projectData) return null;
    if (!Array.isArray(projectData.files)) {
        projectData.files = [];
    }

    if (!projectData.files.length) {
        if (tenantId === undefined || storeId === undefined) {
            return null;
        }
        projectData.files.push({
            uid: generateMenuFileUid(tenantId, storeId),
            extractedData: {
                data: {
                    categories: [],
                    items: [],
                    languages: [],
                },
            },
        });
    }

    const primaryFile = projectData.files[0];
    if (!primaryFile.extractedData) primaryFile.extractedData = { data: { categories: [], items: [], languages: [] } };
    if (!primaryFile.extractedData.data) primaryFile.extractedData.data = { categories: [], items: [], languages: [] };
    if (!Array.isArray(primaryFile.extractedData.data.categories)) primaryFile.extractedData.data.categories = [];
    if (!Array.isArray(primaryFile.extractedData.data.items)) primaryFile.extractedData.data.items = [];
    if (!Array.isArray(primaryFile.extractedData.data.languages)) primaryFile.extractedData.data.languages = [];

    return primaryFile;
}

function StatusDot({
    color,
    label,
}: {
    color: string;
    label?: string;
}) {
    return (
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            <span
                style={{
                    backgroundColor: color,
                    borderRadius: '999px',
                    display: 'inline-block',
                    flex: '0 0 auto',
                    height: 8,
                    width: 8,
                }}
            />
            {label ? (
                <Text style={{ fontSize: 12, lineHeight: 1.2 }} type="secondary">
                    {label}
                </Text>
            ) : null}
        </Flex>
    );
}

function resolveSpecialMenuStatus(project: any): 'scheduled' | 'active' | 'expired' | 'cancelled' | null {
    if (!project?.isSpecialMenu) return null;
    if (project.specialMenuStatus === 'cancelled') return 'cancelled';
    if (project.specialMenuStatus === 'expired') return 'expired';

    const now = Date.now();
    const startsAt = project.specialMenuStartsAt ? new Date(project.specialMenuStartsAt).getTime() : null;
    const endsAt = project.specialMenuEndsAt ? new Date(project.specialMenuEndsAt).getTime() : null;

    if (endsAt != null && Number.isFinite(endsAt) && endsAt <= now) return 'expired';
    if (startsAt != null && Number.isFinite(startsAt) && startsAt > now) return 'scheduled';
    return project.specialMenuStatus || 'active';
}

function formatSpecialMenuWindow(start?: string, end?: string): string | null {
    if (!start && !end) return null;

    const formatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    const startLabel = start ? formatter.format(new Date(start)) : null;
    const endLabel = end ? formatter.format(new Date(end)) : null;

    if (startLabel && endLabel) return `${startLabel} to ${endLabel}`;
    return startLabel || endLabel;
}

interface MobileMenuScreenProps {
    onOpenDesignEditor?: () => void;
}

export default function MobileMenuScreen({ onOpenDesignEditor }: MobileMenuScreenProps) {
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const t = useTranslations('MobileMenu');
    const tShare = useTranslations('MobileShare');
    const { storeDetails, setStoreDetails, userPermissions, isMasterUser } = useContext(PlatformGlobalDataContext);
    const storeContextName = useMemo(() => getStoreContextName(storeDetails as any, 'menu'), [storeDetails]);
    const {
        isLoading: loadingProjects,
        projectsById,
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
    const [addSheetInitialCategoryId, setAddSheetInitialCategoryId] = useState<string | null>(null);
    const [addSheetSource, setAddSheetSource] = useState<'default' | 'commandMenu' | 'categorySheet'>('default');
    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState<'availability' | 'showHide' | 'pricing' | 'moveCategory' | 'aiRepair' | null>(null);
    const [bulkActionInitialSelectedIds, setBulkActionInitialSelectedIds] = useState<string[]>([]);
    const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
    const [categorySheetMode, setCategorySheetMode] = useState<'manage' | 'reorder'>('manage');
    const [categorySheetInitialCategoryId, setCategorySheetInitialCategoryId] = useState<string | null>(null);
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
    const [isManageLanguagesOpen, setIsManageLanguagesOpen] = useState(false);
    const [isGenerateDescriptionsOpen, setIsGenerateDescriptionsOpen] = useState(false);
    const [isAIDefaultsOpen, setIsAIDefaultsOpen] = useState(false);
    const [isSmartRecommendationsOpen, setIsSmartRecommendationsOpen] = useState(false);
    const [isTextCaseOpen, setIsTextCaseOpen] = useState(false);
    const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
    const [isStatusLegendSheetOpen, setIsStatusLegendSheetOpen] = useState(false);
    const [imageModalItem, setImageModalItem] = useState<ExtractedDataItem | null>(null);
    const [imageModalInitialTab, setImageModalInitialTab] = useState<'upload' | 'generate'>('upload');
    const [imageModalInitialBatchItemIds, setImageModalInitialBatchItemIds] = useState<string[]>([]);
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
    const rawMenuProjectRef = useRef<any>(null);
    const menuDataRef = useRef<any>(null);
    const pendingMenuRef = useRef<any>(null);
    const persistedLocalSnapshotRef = useRef<string | null>(null);
    const pendingLocalSnapshotRef = useRef<string | null>(null);
    const persistTimerRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);
    const isPersistingRef = useRef(false);
    const menuUpdateGenerationRef = useRef(0);
    const projectImageAutoGenerationAttemptRef = useRef<Set<string>>(new Set());
    const [itemInheritanceStates, setItemInheritanceStates] = useState<Record<string, InheritanceState>>({});
    const [categoryInheritanceStates, setCategoryInheritanceStates] = useState<Record<string, InheritanceState>>({});

    const outletPolicy = useMemo<OutletPolicy | null>(() => {
        if (!menuData?.masterProjectId || isMasterUser) return null;
        return {
            ...DEFAULT_OUTLET_POLICY,
            ...((userPermissions as any)?.outletPolicy || {}),
        };
    }, [isMasterUser, menuData?.masterProjectId, userPermissions]);

    const canUseMenuExtraction = userPermissions?.canUseMenuExtraction !== false;
    const canAddLocalItems = userPermissions?.canAddLocalItems !== false;
    const canAddLocalCategories = userPermissions?.canAddLocalCategories !== false;

    const getPersistableMenuProject = useCallback((project: any) => {
        if (!project?.masterProjectId) return project;
        return stripResolvedOutletProjectForSave(
            project,
            rawMenuProjectRef.current || persistedMenuRef.current,
        );
    }, []);

    const getPersistableMenuProjectWithLinkedOverrides = useCallback((project: any) => {
        if (!project?.masterProjectId) return project;

        const updatedProject = removeObjRef(project);
        if (outletPolicy?.imageOverride === true || outletPolicy?.descriptionOverride === true) {
            const nextItemOverrides = {
                ...(updatedProject.overrides?.items || {}),
            };

            updatedProject.files?.forEach((file: any) => {
                file.extractedData?.data?.items?.forEach((item: any) => {
                    const inheritanceState = itemInheritanceStates[item.id];
                    if (
                        (inheritanceState === 'inherited' || inheritanceState === 'overridden') &&
                        (Array.isArray(item.images) || item.description)
                    ) {
                        nextItemOverrides[item.id] = {
                            ...(nextItemOverrides[item.id] || {}),
                            ...(outletPolicy?.imageOverride === true && Array.isArray(item.images) ? { images: item.images } : {}),
                            ...(outletPolicy?.descriptionOverride === true && item.description ? { description: item.description } : {}),
                        };
                    }
                });
            });

            updatedProject.overrides = {
                items: nextItemOverrides,
                categories: updatedProject.overrides?.categories || {},
                attributes: updatedProject.overrides?.attributes || {},
            };
        }

        return getPersistableMenuProject(updatedProject);
    }, [getPersistableMenuProject, itemInheritanceStates, outletPolicy?.descriptionOverride, outletPolicy?.imageOverride]);

    const replaceProjectInList = useCallback((updatedProject: any) => {
        if (!updatedProject?.projectId) return;
        upsertCachedProject(updatedProject);
    }, [upsertCachedProject]);

    const updateProjectImageInMobileCache = useCallback((projectId: string, projectImage: string) => {
        const summaryFromCache = selectedProjectSummary?.projectId === projectId
            ? selectedProjectSummary
            : projectsList.find((project: any) => project.projectId === projectId) || null;
        const currentProjectData = menuDataRef.current?.projectId === projectId
            ? menuDataRef.current
            : projectsById?.[projectId] || {};

        upsertCachedProject({
            ...(summaryFromCache || {}),
            ...(currentProjectData || {}),
            projectId,
            projectImage,
        });

        setMenuData((current: any) => {
            if (current?.projectId !== projectId) return current;

            const nextProject = { ...current, projectImage };
            menuDataRef.current = nextProject;
            if (persistedMenuRef.current?.projectId === projectId) {
                persistedMenuRef.current = nextProject;
                persistedLocalSnapshotRef.current = JSON.stringify(nextProject);
            }
            return nextProject;
        });
    }, [projectsById, projectsList, selectedProjectSummary, upsertCachedProject]);

    const maybeAutoGenerateProjectImage = useCallback(async ({
        categories,
        items,
        projectData,
        projectId,
        projectSummary,
    }: {
        categories?: any[];
        items?: any[];
        projectData?: any;
        projectId?: string | null;
        projectSummary?: any;
    }) => {
        if (!projectId) return;

        const summaryFromCache = projectSummary
            || projectsList.find((project: any) => project.projectId === projectId)
            || null;
        if (summaryFromCache?.projectImage || projectData?.projectImage) return;
        if (projectImageAutoGenerationAttemptRef.current.has(projectId)) return;
        projectImageAutoGenerationAttemptRef.current.add(projectId);

        try {
            const result = await generateAndSaveProjectImageIfMissing({
                businessCategory: storeDetails?.businessCategory,
                businessType: storeDetails?.businessType,
                categories,
                items,
                project: {
                    ...(projectData || {}),
                    ...(summaryFromCache || {}),
                    projectId,
                },
                storeName: storeContextName,
                summaryData: summaryFromCache,
            });

            if (result.imageUrl) {
                updateProjectImageInMobileCache(projectId, result.imageUrl);
            }
        } catch (error) {
            console.warn('[MobileProjectImage] Auto-generation skipped:', error);
        }
    }, [
        projectsList,
        storeContextName,
        storeDetails?.businessCategory,
        storeDetails?.businessType,
        updateProjectImageInMobileCache,
    ]);

    const applyMenuDerivedBusinessAttributeDefaults = useCallback(async (menuDataLike: { businessAttributeSuggestions?: unknown; categories?: any[]; items?: any[] } | null | undefined) => {
        if (!storeDetails?.storeId || !menuDataLike?.items?.length) return;
        const nextBusinessAttributes = getBusinessAttributesWithMenuDefaults(menuDataLike, storeDetails as any);
        if (!nextBusinessAttributes) return;

        try {
            await updateStore({
                id: storeDetails.storeId,
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                businessAttributes: nextBusinessAttributes,
            });
            setStoreDetails((previous: any) => previous
                ? { ...previous, businessAttributes: nextBusinessAttributes }
                : previous);
        } catch (error) {
            console.warn('[MobileMenu] Could not apply menu-derived business attributes', error);
        }
    }, [setStoreDetails, storeDetails]);

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
        rawMenuProjectRef.current = savedProject;
        menuDataRef.current = savedProject;
        setMenuData((current: any) => (
            current?.projectId === savedProject.projectId && current?.masterProjectId
                ? current
                : savedProject
        ));
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

        const pendingDisplayProject = removeObjRef(pendingMenuRef.current);
        const snapshot = removeObjRef(getPersistableMenuProjectWithLinkedOverrides(pendingDisplayProject));
        const snapshotString = JSON.stringify(snapshot);
        isPersistingRef.current = true;

        try {
            const savedProject = await updateProjectWithoutLoader(snapshot);
            const nextProject = savedProject || snapshot;
            persistedMenuRef.current = removeObjRef(nextProject);
            persistedLocalSnapshotRef.current = snapshotString;

            if (pendingMenuRef.current?.projectId === snapshot.projectId) {
                const pendingSnapshot = JSON.stringify(getPersistableMenuProjectWithLinkedOverrides(pendingMenuRef.current));
                if (pendingSnapshot === snapshotString) {
                    pendingMenuRef.current = null;
                    pendingLocalSnapshotRef.current = null;
                    rawMenuProjectRef.current = removeObjRef(nextProject);
                    setMenuData((current: any) => (
                        current?.projectId === nextProject.projectId && current?.masterProjectId
                            ? current
                            : nextProject
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

            if (
                pendingMenuRef.current &&
                JSON.stringify(getPersistableMenuProjectWithLinkedOverrides(pendingMenuRef.current)) !== JSON.stringify(persistedMenuRef.current)
            ) {
                if (!persistTimerRef.current) {
                    persistTimerRef.current = window.setTimeout(() => {
                        persistTimerRef.current = null;
                        void flushPendingMenuPersist();
                    }, MOBILE_MENU_PERSIST_DEBOUNCE_MS);
                }
            }
        }
    }, [getPersistableMenuProjectWithLinkedOverrides, replaceProjectInList, t]);

    const queueMenuPersist = useCallback((updatedProject: any) => {
        if (!updatedProject?.projectId) return;

        const nextPendingProject = removeObjRef(updatedProject);
        const nextPendingSnapshot = JSON.stringify(getPersistableMenuProjectWithLinkedOverrides(nextPendingProject));

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
    }, [flushPendingMenuPersist, getPersistableMenuProjectWithLinkedOverrides]);

    const applyLocalMenuUpdate = useCallback((updatedProject: any) => {
        const cacheProject = getPersistableMenuProjectWithLinkedOverrides(updatedProject);
        menuUpdateGenerationRef.current += 1;
        menuDataRef.current = updatedProject;
        setMenuData(updatedProject);
        replaceProjectInList(cacheProject);
        queueMenuPersist(updatedProject);
    }, [getPersistableMenuProjectWithLinkedOverrides, queueMenuPersist, replaceProjectInList]);

    const markPriceOutlierReviewed = useCallback((itemId: string) => {
        const sourceProject = menuDataRef.current;
        if (!sourceProject?.files) return;

        const updated = removeObjRef(sourceProject);
        let didUpdate = false;

        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((menuItem: any) => {
                if (menuItem.id !== itemId) return;

                menuItem.qualityReview = {
                    ...(menuItem.qualityReview || {}),
                    priceOutlierReviewedAt: new Date().toISOString(),
                    priceOutlierReviewedPrice: normalizePriceForReview(menuItem.price),
                };
                didUpdate = true;
            });
        });

        if (!didUpdate) return;

        applyLocalMenuUpdate(updated);
        Toast.show({ content: 'Price review marked as done.', duration: 1200 });
    }, [applyLocalMenuUpdate]);

    const applyLinkedOutletBulkOverrideDiff = useCallback((updatedProject: any, previousProject?: any) => {
        if (!updatedProject?.masterProjectId || !previousProject?.files?.length) {
            return { project: updatedProject, skippedInheritedChanges: false };
        }

        const previousItems = new Map<string, any>();
        previousProject.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((item: any) => {
                previousItems.set(item.id, item);
            });
        });

        const nextProject = removeObjRef(updatedProject);
        const nextItemOverrides = {
            ...(nextProject.overrides?.items || {}),
        };
        const nextAttributeOverrides = {
            ...(nextProject.overrides?.attributes || {}),
        };
        let skippedInheritedChanges = false;

        nextProject.files?.forEach((file: any) => {
            file.extractedData?.data?.items?.forEach((item: any) => {
                const inheritanceState = itemInheritanceStates[item.id];
                if (inheritanceState !== 'inherited' && inheritanceState !== 'overridden') return;

                const previousItem = previousItems.get(item.id);
                if (!previousItem) return;
                const hadExistingOverride = Boolean(nextItemOverrides[item.id]);
                const itemOverride = {
                    ...(nextItemOverrides[item.id] || {}),
                };

                if (String(item.price ?? '') !== String(previousItem.price ?? '')) {
                    if (outletPolicy?.priceOverride === false) {
                        item.price = previousItem.price;
                        skippedInheritedChanges = true;
                    } else {
                        itemOverride.price = String(item.price ?? '');
                    }
                }

                if ((item.available !== false) !== (previousItem.available !== false)) {
                    if (outletPolicy?.availabilityOverride === false) {
                        item.available = previousItem.available;
                        skippedInheritedChanges = true;
                    } else {
                        itemOverride.available = item.available !== false;
                    }
                }

                if ((item.active !== false) !== (previousItem.active !== false)) {
                    itemOverride.active = item.active !== false;
                }

                if (item.orderIndex !== previousItem.orderIndex && item.orderIndex !== undefined) {
                    itemOverride.orderIndex = item.orderIndex;
                }

                if (item.category !== previousItem.category) {
                    item.category = previousItem.category;
                    skippedInheritedChanges = true;
                }

                (item.attributes || []).forEach((attribute: any) => {
                    const previousAttribute = previousItem.attributes?.find((candidate: any) => candidate.id === attribute.id);
                    if (!previousAttribute || String(attribute.price ?? '') === String(previousAttribute.price ?? '')) return;

                    if (outletPolicy?.priceOverride === false) {
                        attribute.price = previousAttribute.price;
                        skippedInheritedChanges = true;
                        return;
                    }

                    nextAttributeOverrides[attribute.id] = {
                        ...(nextAttributeOverrides[attribute.id] || {}),
                        price: String(attribute.price ?? ''),
                    };
                });

                if (hadExistingOverride || Object.keys(itemOverride).length > 0) {
                    nextItemOverrides[item.id] = itemOverride;
                } else {
                    delete nextItemOverrides[item.id];
                }
            });
        });

        nextProject.overrides = {
            items: nextItemOverrides,
            categories: nextProject.overrides?.categories || {},
            attributes: nextAttributeOverrides,
        };

        return { project: nextProject, skippedInheritedChanges };
    }, [itemInheritanceStates, outletPolicy?.availabilityOverride, outletPolicy?.priceOverride]);

    const applyUndoableBulkMenuUpdate = useCallback((updatedProject: any, previousProject?: any, updatedCount?: number, successMessage?: string) => {
        const linkedUpdate = applyLinkedOutletBulkOverrideDiff(updatedProject, previousProject || menuDataRef.current);
        applyLocalMenuUpdate(linkedUpdate.project);

        const baseMessage = successMessage || t('itemsUpdated', { count: updatedCount || 0 });
        const displayMessage = linkedUpdate.skippedInheritedChanges
            ? `${baseMessage}. Some inherited fields were left unchanged.`
            : baseMessage;

        if (!previousProject) {
            Toast.show({ content: displayMessage, duration: 1800 });
            return;
        }

        const undoGeneration = menuUpdateGenerationRef.current;
        const undoProjectId = linkedUpdate.project?.projectId;
        Toast.show({
            content: (
                <Flex align="center" gap={12} justify="space-between" style={{ minWidth: 0, width: '100%' }}>
                    <Text style={{ flex: 1, minWidth: 0 }}>{displayMessage}</Text>
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
    }, [applyLinkedOutletBulkOverrideDiff, applyLocalMenuUpdate, t]);

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
        const mimeType = getDataUrlMimeType(imageData, 'image/webp');
        const preparedName = toPreparedUploadName(imageName, mimeType, imageName);

        void uploadFile({
            uid,
            url: imageData,
            type: mimeType,
            name: preparedName,
        } as any, 'itemImages')
            .then((uploadedImage) => {
                if (uploadedImage) {
                    updateItemImageFromUpload(itemId, uploadedImage, preparedName);
                }
            })
            .catch((error) => {
                console.error('[MobileMenu] Failed to upload item image:', error);
                Toast.show({ content: t('failedToSaveRefresh'), duration: 2000 });
            });
    }, [t, updateItemImageFromUpload]);

    const openImageUploadModal = useCallback((
        itemId?: string,
        source = '',
        preferredInitialTab: 'upload' | 'generate' = 'upload',
        initialBatchItemIds: string[] = [],
    ) => {
        const matchedItem = itemId ? findExtractedItemById(menuDataRef.current, itemId) : null;
        setImageModalItem(matchedItem);
        setImageModalInitialTab(preferredInitialTab);
        setImageModalInitialBatchItemIds(initialBatchItemIds);
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

        const inheritanceState = itemInheritanceStates[selectedItem.id];
        const isInheritedOutletItem = Boolean(
            sourceProject.masterProjectId &&
            (inheritanceState === 'inherited' || inheritanceState === 'overridden')
        );
        if (isInheritedOutletItem && outletPolicy?.imageOverride !== true) {
            Toast.show({ content: 'Image changes are not enabled for this location.', duration: 1800 });
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

        const projectToSave = getPersistableMenuProjectWithLinkedOverrides(updatedProject);
        const savedProject = await updateProjectWithoutLoader({
            ...projectToSave,
            projectId: sourceProject.projectId,
        });

        if (sourceProject.masterProjectId) {
            const rawSavedProject = savedProject || projectToSave;
            rawMenuProjectRef.current = removeObjRef(rawSavedProject);
            persistedMenuRef.current = removeObjRef(rawSavedProject);
            persistedLocalSnapshotRef.current = JSON.stringify(removeObjRef(rawSavedProject));
            menuDataRef.current = updatedProject;
            setMenuData(updatedProject);
            replaceProjectInList(rawSavedProject);
        } else {
            syncSavedMenuProject(savedProject || updatedProject);
        }
        Toast.show({ content: t('imageAddedSuccess'), duration: 1200 });
    }, [
        getPersistableMenuProjectWithLinkedOverrides,
        itemInheritanceStates,
        outletPolicy?.imageOverride,
        replaceProjectInList,
        syncSavedMenuProject,
        t,
    ]);

    useEffect(() => {
        const nextProject = selectedProject ? removeObjRef(selectedProject) : null;
        const nextProjectId = nextProject?.projectId || null;
        const currentProjectId = menuData?.projectId || null;
        const pendingProjectId = pendingMenuRef.current?.projectId || null;
        const persistedProjectId = persistedMenuRef.current?.projectId || null;

        if (!nextProjectId) {
            menuUpdateGenerationRef.current += 1;
            setMenuData(null);
            rawMenuProjectRef.current = null;
            persistedMenuRef.current = null;
            pendingMenuRef.current = null;
            persistedLocalSnapshotRef.current = null;
            pendingLocalSnapshotRef.current = null;
            setItemInheritanceStates({});
            setCategoryInheritanceStates({});
            return;
        }

        rawMenuProjectRef.current = nextProject;

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
        if (!selectedProject?.projectId) return;

        const rawProject = removeObjRef(selectedProject);
        rawMenuProjectRef.current = rawProject;

        if (!rawProject.masterProjectId) {
            setItemInheritanceStates({});
            setCategoryInheritanceStates({});
            return;
        }

        let cancelled = false;

        const resolveLinkedProject = async () => {
            try {
                const resolved = await resolveProjectForRender({ storeProject: rawProject });
                if (cancelled || pendingMenuRef.current?.projectId === rawProject.projectId) return;

                setItemInheritanceStates(resolved._resolved?.itemStates || {});
                setCategoryInheritanceStates(resolved._resolved?.categoryStates || {});

                const resolvedProject = removeObjRef(resolved);
                menuDataRef.current = resolvedProject;
                setMenuData((current: any) => (
                    current?.projectId === rawProject.projectId
                        ? resolvedProject
                        : current
                ));
            } catch (error) {
                console.error('[MobileMenu] Failed to resolve linked outlet project:', error);
            }
        };

        void resolveLinkedProject();

        return () => {
            cancelled = true;
        };
    }, [selectedProject]);

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
                void maybeAutoGenerateProjectImage({
                    categories: result.combinedData?.categories || [],
                    items: result.combinedData?.items || [],
                    projectData: menuData,
                    projectId: activeProcessingState?.projectId || menuData?.projectId,
                    projectSummary: selectedProjectSummary,
                });
                void applyMenuDerivedBusinessAttributeDefaults(result.combinedData);
            }
            setActiveProcessingState(null);
            setShowReviewSheet(false);
            setComparisonResult(null);
            void refreshCachedProject(activeProcessingState?.projectId || menuData?.projectId);
            setShowSuccessState(true);
        }

        if (jobIsPreviewReady && !showReviewSheet && activeJob?.result && menuData?.projectId) {
            void (async () => {
                try {
                    const storeProject = buildComparisonProjectInput(menuData);
                    const masterProject = menuData?.masterProjectId
                        ? await getLinkedMasterComparisonInput(menuData)
                        : undefined;
                    const extractedItems = activeJob.result.combinedData?.items || [];
                    const extractedCategories = activeJob.result.combinedData?.categories || [];
                    const comparisonMode: ComparisonMode = menuData?.masterProjectId ? 'OUTLET_LINKED' : 'SINGLE_STORE';
                    const primaryLang = menuData?.languages?.[0] || 'en';

                    const comparison = runComparisonEngine({
                        extracted: {
                            categories: extractedCategories,
                            items: extractedItems,
                        },
                        storeProject,
                        masterProject,
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
            })();
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
        applyMenuDerivedBusinessAttributeDefaults,
        maybeAutoGenerateProjectImage,
        menuData,
        refreshCachedProject,
        selectedProjectSummary,
        setActiveProcessingState,
        showReviewSheet,
        t,
    ]);

    const primaryLang = useMemo(
        () => getProjectDefaultLanguage(menuData, storeDetails),
        [menuData, storeDetails],
    );
    const activeProjectLanguages = useMemo(() => menuData?.languages || ['en'], [menuData?.languages]);
    const showCategoryIcons = menuData?.config?.design?.menu?.showCategoryIcons ?? true;
    const showItemPrices = menuData?.config?.design?.menu?.showItemPrices ?? true;
    const [displayLanguage, setDisplayLanguage] = useState<string>(primaryLang);

    useEffect(() => {
        setDisplayLanguage(primaryLang);
    }, [primaryLang, menuData?.projectId]);

    useEffect(() => {
        if (showItemPrices) return;

        const stripPriceFilters = (prev: MobileMenuFilters): MobileMenuFilters => {
            if (
                prev.minPrice === null &&
                prev.maxPrice === null &&
                prev.hasPrice === null &&
                prev.qualityIssue !== 'priceOutliers'
            ) {
                return prev;
            }

            return {
                ...prev,
                minPrice: null,
                maxPrice: null,
                hasPrice: null,
                qualityIssue: prev.qualityIssue === 'priceOutliers' ? null : prev.qualityIssue,
            };
        };

        setFilters(stripPriceFilters);
        setDraftFilters(stripPriceFilters);
    }, [showItemPrices]);


    const languageStats = useMemo(() => {
        return activeProjectLanguages.map((lang) => {
            let totalCategories = 0;
            let totalItems = 0;
            let totalDescriptions = 0;
            let totalAttributeNames = 0;
            let filled = 0;

            menuData?.files?.forEach((file: any) => {
                const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
                const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);

                totalCategories += categories.length;
                totalItems += items.length;
                totalDescriptions += items.length;

                categories.forEach((category) => {
                    if (hasLocalizedValue(category.name, lang)) filled += 1;
                });

                items.forEach((item) => {
                    if (hasLocalizedValue(item.name, lang)) filled += 1;
                    if (hasLocalizedValue(item.description, lang)) filled += 1;
                    totalAttributeNames += toArray(item.attributes).length;
                    toArray(item.attributes).forEach((attribute) => {
                        if (hasLocalizedValue(attribute?.name, lang)) filled += 1;
                    });
                });
            });

            const total = totalCategories + totalItems + totalDescriptions + totalAttributeNames;
            return {
                code: lang,
                filled,
                percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
                total,
            };
        });
    }, [activeProjectLanguages, menuData?.files]);

    const languageLabels = useMemo(() => {
        const labelsByCode = new Map(GlobalLanguagesList.map((language) => [language.code, language.nativeName || language.name]));
        return activeProjectLanguages.map((code) => ({
            code,
            isPrimary: code === activeProjectLanguages[0],
            label: labelsByCode.get(code) || code.toUpperCase(),
            stats: languageStats.find((entry) => entry.code === code) || null,
        }));
    }, [activeProjectLanguages, languageStats]);
    const firstLanguageWithMissingTranslations = useMemo(() => {
        const reviewableLanguages = activeProjectLanguages.filter((language) => language !== primaryLang);
        if (reviewableLanguages.length === 0 || !menuData?.files) return null;

        for (const language of reviewableLanguages) {
            for (const file of menuData.files) {
                const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
                if (items.some((item) => hasMissingTranslationsForLanguage(item, primaryLang, language))) {
                    return language;
                }
            }
        }

        return null;
    }, [activeProjectLanguages, menuData?.files, primaryLang]);
    const categoryOptions = useMemo<CategoryOption[]>(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, CategoryOption>();
        menuData.files.forEach((file: any) => {
            const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
            categories.forEach((category) => {
                const label = resolveCategoryName(category, displayLanguage, uncategorizedLabel);
                if (!map.has(category.id)) {
                    map.set(category.id, {
                        id: category.id,
                        icon: category.icon,
                        name: label,
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [displayLanguage, menuData?.files, uncategorizedLabel]);

    const categoryActiveById = useMemo(() => {
        const map = new Map<string, boolean>();
        menuData?.files?.forEach((file: any) => {
            toArray<ExtractedDataCategory>(file.extractedData?.data?.categories).forEach((category) => {
                map.set(category.id, category.active !== false);
            });
        });
        return map;
    }, [menuData?.files]);

    const menuItems = useMemo(() => {
        if (!menuData?.files) return [];
        const items: MenuItemType[] = [];
        menuData.files.forEach((file: any) => {
            if (file.extractedData?.data?.categories && Array.isArray(file.extractedData.data.categories)) {
                const categories = [...file.extractedData.data.categories as ExtractedDataCategory[]].sort((a, b) => {
                    const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
                    const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    const aName = resolveCategoryName(a, displayLanguage, '');
                    const bName = resolveCategoryName(b, displayLanguage, '');
                    return aName.localeCompare(bName);
                });
                const categoryMap: Record<string, string> = {};
                categories.forEach((category) => {
                    categoryMap[category.id] = resolveCategoryName(category, displayLanguage, uncategorizedLabel);
                });
                const menuItems = [...toArray<ExtractedDataItem>(file.extractedData.data.items)].sort((a, b) => {
                    const aIndex = typeof a.orderIndex === 'number' ? a.orderIndex : Number.POSITIVE_INFINITY;
                    const bIndex = typeof b.orderIndex === 'number' ? b.orderIndex : Number.POSITIVE_INFINITY;
                    if (aIndex !== bIndex) return aIndex - bIndex;
                    const aName = resolveItemName(a, displayLanguage, '');
                    const bName = resolveItemName(b, displayLanguage, '');
                    return aName.localeCompare(bName);
                });
                categories.forEach((category) => {
                    const categoryName = categoryMap[category.id] || uncategorizedLabel;
                    const categoryItems = menuItems.filter((item) => item.category === category.id);
                    categoryItems.forEach((item) => {
                        const itemName = resolveItemName(item, displayLanguage, t('unnamedItem'));
                        const itemDescription = resolveItemDescription(item, displayLanguage);
                        const price = normalizeExtractedPrice(item.price);
                        const available = item.available !== false;
                        const active = item.active !== false;
                        const hiddenByCategory = item.category ? categoryActiveById.get(item.category) === false : false;
                        items.push({
                            id: item.id || `${categoryName}-${itemName}`,
                            name: itemName,
                            price: price,
                            attributes: item.attributes?.map((attribute: any) => ({
                                id: attribute.id,
                                name: resolveAttributeName(attribute, displayLanguage, 'Attribute'),
                                price: normalizeExtractedPrice(attribute.price),
                                active: attribute.active !== false,
                            })),
                            available,
                            active,
                            categoryId: item.category,
                            categoryName,
                            hiddenByCategory,
                            description: itemDescription,
                            descriptionMissing: hasMissingDescriptionForLanguages(item, activeProjectLanguages),
                            fileId: file.uid,
                            image: item.images?.[0]?.url || '',
                            rawItem: removeObjRef(item),
                            translationMissing: hasMissingTranslationsForLanguage(item, primaryLang, displayLanguage),
                        });
                    });
                });

                const uncategorizedItems = menuItems.filter((item) => !item.category || !categoryMap[item.category]);
                uncategorizedItems.forEach((item) => {
                    const itemName = resolveItemName(item, displayLanguage, t('unnamedItem'));
                    const itemDescription = resolveItemDescription(item, displayLanguage);
                    const price = normalizeExtractedPrice(item.price);
                    const available = item.available !== false;
                    const active = item.active !== false;
                    items.push({
                        id: item.id || `${uncategorizedLabel}-${itemName}`,
                        name: itemName,
                        price: price,
                        attributes: item.attributes?.map((attribute: any) => ({
                            id: attribute.id,
                            name: resolveAttributeName(attribute, displayLanguage, 'Attribute'),
                            price: normalizeExtractedPrice(attribute.price),
                            active: attribute.active !== false,
                        })),
                        available,
                        active,
                        categoryId: item.category,
                        categoryName: uncategorizedLabel,
                        hiddenByCategory: false,
                        description: itemDescription,
                        descriptionMissing: hasMissingDescriptionForLanguages(item, activeProjectLanguages),
                        fileId: file.uid,
                        image: item.images?.[0]?.url || '',
                        rawItem: removeObjRef(item),
                        translationMissing: hasMissingTranslationsForLanguage(item, primaryLang, displayLanguage),
                    });
                });
            }
        });
        return items;
    }, [activeProjectLanguages, categoryActiveById, displayLanguage, menuData, primaryLang, t, uncategorizedLabel]);

    const isItemEffectivelyActive = useCallback((item: MenuItemType) => {
        const categoryActive = item.categoryId ? categoryActiveById.get(item.categoryId) !== false : true;
        return item.active !== false && categoryActive;
    }, [categoryActiveById]);

    const hasAnyMissingTranslationsForMenuItem = useCallback((item: MenuItemType) => {
        return item.rawItem ? hasMissingTranslations(item.rawItem, activeProjectLanguages) : false;
    }, [activeProjectLanguages]);

    const priceOutlierItemIds = useMemo(() => {
        if (!showItemPrices) return new Set<string>();

        const LOW_FACTOR = 0.35;
        const HIGH_FACTOR = 3;
        const MIN_ITEMS = 4;
        const groupedPrices = new Map<string, { id: string; price: number }[]>();

        menuItems.forEach((item) => {
            if (!isItemEffectivelyActive(item) || item.attributes?.length) return;
            if (!item.categoryId || !(item.price > 0)) return;
            if (item.rawItem && isPriceOutlierReviewed(item.rawItem)) return;
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
    }, [isItemEffectivelyActive, menuItems, showItemPrices]);

    const categorySummary = useMemo(() => {
        if (!menuData?.files) return [];
        const map = new Map<string, CategorySummary>();
        menuData.files.forEach((file: any) => {
            const categories = toArray<ExtractedDataCategory>(file.extractedData?.data?.categories);
            const items = toArray<ExtractedDataItem>(file.extractedData?.data?.items);
            categories.forEach((category) => {
                const name = resolveCategoryName(category, displayLanguage, uncategorizedLabel);
                const count = items.filter((item) => item.category === category.id).length;
                if (!map.has(category.id)) {
                    map.set(category.id, {
                        id: category.id,
                        name,
                        active: category.active !== false,
                        itemCount: count,
                        icon: category.icon,
                        nameByLanguage: typeof category.name === 'object' ? removeObjRef(category.name) : undefined,
                        orderIndex: category.orderIndex,
                        timeSlotPresetIds: getCategoryTimeSlotPresetIds(category),
                        translationMissing: hasMissingCategoryTranslationForLanguage(category, primaryLang, displayLanguage),
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
    }, [displayLanguage, menuData?.files, primaryLang, uncategorizedLabel]);

    const missingCategoryIconCategoryIds = useMemo(() => {
        if (!showCategoryIcons) return [];

        return categorySummary
            .filter((category) => category.active !== false && !hasCategoryIconValue(category.icon))
            .map((category) => category.id);
    }, [categorySummary, showCategoryIcons]);

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
            };
            map.set(categoryId, next);
            return next;
        };

        menuItems.forEach((item) => {
            const categoryId = item.categoryId || 'uncategorized';
            const summary = getSummary(categoryId);

            if (item.descriptionMissing) summary.missingDescriptions += 1;
            if (!item.image) summary.missingImages += 1;
            if (showItemPrices && !(item.price > 0) && !item.attributes?.length) summary.missingPrices += 1;
            if (!isItemEffectivelyActive(item)) summary.hidden += 1;
        });

        return map;
    }, [isItemEffectivelyActive, menuItems, showItemPrices]);

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
                const hasDescription = !item.descriptionMissing;
                if (hasDescription !== filters.hasDescription) return false;
            }
            if (showItemPrices && filters.hasPrice !== null) {
                const hasPrice = item.price > 0;
                if (hasPrice !== filters.hasPrice) return false;
            }
            if (filters.availability !== null && item.available !== filters.availability) {
                return false;
            }
            if (filters.activeStatus !== null && isItemEffectivelyActive(item) !== filters.activeStatus) {
                return false;
            }
            if (showItemPrices && filters.qualityIssue === 'priceOutliers' && !priceOutlierItemIds.has(item.id)) {
                return false;
            }
            if (filters.qualityIssue === 'translationMissing' && !hasAnyMissingTranslationsForMenuItem(item)) {
                return false;
            }
            if (filters.qualityIssue === 'categoryIconMissing' && (!item.categoryId || !missingCategoryIconCategoryIds.includes(item.categoryId))) {
                return false;
            }
            return true;
        });
    }, [filters, hasAnyMissingTranslationsForMenuItem, isItemEffectivelyActive, menuItems, missingCategoryIconCategoryIds, priceOutlierItemIds, searchQuery, showItemPrices]);

    const appliedFilterCount = useMemo(() => {
        return [
            filters.categoryIds.length > 0,
            filters.hasImage !== null,
            filters.hasDescription !== null,
            showItemPrices && filters.hasPrice !== null,
            filters.availability !== null,
            filters.activeStatus !== null,
            filters.qualityIssue !== null && (showItemPrices || filters.qualityIssue !== 'priceOutliers'),
        ].filter(Boolean).length;
    }, [filters, showItemPrices]);

    const menuIssueCounts = useMemo(() => {
        const scopedItems = draftFilters.categoryIds.length > 0
            ? menuItems.filter((item) => item.categoryId && draftFilters.categoryIds.includes(item.categoryId))
            : menuItems;
        const reviewableItems = scopedItems.filter((item) => isItemEffectivelyActive(item));
        return {
            available: scopedItems.filter((item) => item.available).length,
            hidden: scopedItems.filter((item) => !isItemEffectivelyActive(item)).length,
            missingPhoto: reviewableItems.filter((item) => !item.image).length,
            missingDescription: reviewableItems.filter((item) => item.descriptionMissing).length,
            missingPrice: showItemPrices ? reviewableItems.filter((item) => !(item.price > 0) && !item.attributes?.length).length : 0,
            priceOutliers: showItemPrices ? reviewableItems.filter((item) => priceOutlierItemIds.has(item.id)).length : 0,
            missingTranslation: reviewableItems.filter((item) => hasAnyMissingTranslationsForMenuItem(item)).length,
            missingCategoryIcon: showCategoryIcons
                ? categorySummary.filter((category) => {
                    if (draftFilters.categoryIds.length > 0 && !draftFilters.categoryIds.includes(category.id)) {
                        return false;
                    }
                    return category.active !== false && !hasCategoryIconValue(category.icon);
                }).length
                : 0,
            shown: scopedItems.filter((item) => isItemEffectivelyActive(item)).length,
            unavailable: scopedItems.filter((item) => !item.available).length,
        };
    }, [categorySummary, draftFilters.categoryIds, hasAnyMissingTranslationsForMenuItem, isItemEffectivelyActive, menuItems, priceOutlierItemIds, showCategoryIcons, showItemPrices]);
    const listingStatusLegend = useMemo(() => {
        const entries: { color: string; key: string; label: string }[] = [];
        if (menuIssueCounts.hidden > 0) {
            entries.push({ color: token.colorTextQuaternary, key: 'hidden', label: t('hidden') });
        }
        if (menuIssueCounts.unavailable > 0) {
            entries.push({ color: token.colorWarning, key: 'sold-out', label: availabilityLabels.unavailable });
        }
        if (activeProjectLanguages.length > 1 && menuIssueCounts.missingTranslation > 0) {
            entries.push({ color: token.colorPrimary, key: 'translation-missing', label: t('missingTranslation') });
        }
        return entries;
    }, [
        activeProjectLanguages.length,
        availabilityLabels.unavailable,
        menuIssueCounts.hidden,
        menuIssueCounts.missingTranslation,
        menuIssueCounts.unavailable,
        t,
        token.colorPrimary,
        token.colorTextQuaternary,
        token.colorWarning
    ]);

    const filterHealthHints = useMemo(() => ({
        showAllAvailable: menuIssueCounts.available > 0 && menuIssueCounts.unavailable === 0 && draftFilters.availability === null,
        showAllShownOnMenu: menuIssueCounts.shown > 0 && menuIssueCounts.hidden === 0 && draftFilters.activeStatus === null,
    }), [draftFilters.activeStatus, draftFilters.availability, menuIssueCounts.available, menuIssueCounts.hidden, menuIssueCounts.shown, menuIssueCounts.unavailable]);

    useEffect(() => {
        if (!isFilterSheetOpen) return;
        setDraftFilters(filters);
    }, [filters, isFilterSheetOpen]);

    useEffect(() => {
        if (!showCategoryIcons) {
            setFilters((prev) => prev.qualityIssue === 'categoryIconMissing' ? { ...prev, qualityIssue: null } : prev);
            setDraftFilters((prev) => prev.qualityIssue === 'categoryIconMissing' ? { ...prev, qualityIssue: null } : prev);
        }
    }, [showCategoryIcons]);

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

        if (showItemPrices && filters.hasPrice !== null) {
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

        if (showItemPrices && filters.qualityIssue === 'priceOutliers') {
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

        if (filters.qualityIssue === 'categoryIconMissing') {
            chips.push({
                key: 'quality-category-icon-missing',
                label: t('missingCategoryIcon'),
                onRemove: () => setFilters((prev) => ({ ...prev, qualityIssue: null })),
            });
        }

        return chips;
    }, [availabilityLabels.available, availabilityLabels.unavailable, categoryOptions, filters, showItemPrices, t]);

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
                    if (!showItemPrices) return DEFAULT_FILTERS;
                    return { ...DEFAULT_FILTERS, hasPrice: false };
                case 'hidden':
                    return { ...DEFAULT_FILTERS, activeStatus: false };
                case 'priceOutliers':
                    if (!showItemPrices) return DEFAULT_FILTERS;
                    return { ...DEFAULT_FILTERS, qualityIssue: 'priceOutliers' };
                case 'translations':
                    if (firstLanguageWithMissingTranslations) {
                        setDisplayLanguage(firstLanguageWithMissingTranslations);
                    }
                    return { ...DEFAULT_FILTERS, qualityIssue: 'translationMissing' };
                case 'projectContent':
                    setBulkActionType('aiRepair');
                    setIsBulkActionsOpen(true);
                    return DEFAULT_FILTERS;
                case 'categoryIcons':
                    return { ...DEFAULT_FILTERS, qualityIssue: 'categoryIconMissing' };
                default:
                    return DEFAULT_FILTERS;
            }
        });
        requestAnimationFrame(() => {
            menuContentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [firstLanguageWithMissingTranslations, showItemPrices]);

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
    const activeSpecialMenuStatus = useMemo(
        () => resolveSpecialMenuStatus(activeProjectSummary),
        [activeProjectSummary]
    );
    const activeSpecialMenuWindow = useMemo(
        () => formatSpecialMenuWindow(activeProjectSummary?.specialMenuStartsAt, activeProjectSummary?.specialMenuEndsAt),
        [activeProjectSummary?.specialMenuEndsAt, activeProjectSummary?.specialMenuStartsAt]
    );
    const hasCategories = categorySummary.length > 0;
    const categoryCount = useMemo(() => categorySummary.length, [categorySummary.length]);
    const isFirstRunProject = Boolean(menuData?.projectId) && !hasCategories && menuItems.length === 0 && !searchQuery && appliedFilterCount === 0;

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
                icon: category.icon,
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
                icon: undefined,
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
                    name: resolveItemName(item, displayLanguage, t('unnamedItem')),
                    active: (item.active !== false) && (categoryId === 'uncategorized' || categoryActiveById.get(categoryId) !== false),
                    hiddenByCategory: categoryId !== 'uncategorized' && categoryActiveById.get(categoryId) === false && item.active !== false,
                    price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price,
                    hasImage: Boolean(item.images?.[0]?.url),
                    hasDescription: !hasMissingDescriptionForLanguages(item, activeProjectLanguages),
                });
            });
        });
        return grouped;
    }, [activeProjectLanguages, categoryActiveById, displayLanguage, menuData?.files, t]);
    const categorySummaryById = useMemo(() => {
        const map = new Map<string, CategorySummary>();
        categorySummary.forEach((category) => map.set(category.id, category));
        return map;
    }, [categorySummary]);
    const timeSlotPresetLabelById = useMemo(() => {
        const map = new Map<string, string>();
        (storeDetails?.timeSlotPresets || []).forEach((preset: any) => {
            if (preset?.id && preset?.label) {
                map.set(preset.id, preset.label);
            }
        });
        return map;
    }, [storeDetails?.timeSlotPresets]);

    const getCategorySupportLabel = useCallback((categoryId: string) => {
        const summary = categorySummaryById.get(categoryId);
        if (!summary) return null;

        const presetLabels = (summary.timeSlotPresetIds || [])
            .map((presetId) => timeSlotPresetLabelById.get(presetId))
            .filter(Boolean);

        if (presetLabels.length > 0) {
            return presetLabels.join(' · ');
        }

        return summary.active !== false ? 'Available all day' : t('hiddenFromMenu');
    }, [categorySummaryById, t, timeSlotPresetLabelById]);

    const handleCategoryAdd = async ({ names, active, icon, presetIds }: { names: Record<string, string>; active: boolean; icon?: string; presetIds: string[] }) => {
        if (!menuData) return;
        if (menuData.masterProjectId && !canAddLocalCategories) {
            Toast.show({ content: 'Local categories are not enabled for this location.', duration: 1800 });
            return;
        }
        const presets = storeDetails?.timeSlotPresets || [];
        const previous = menuData;
        const updated = removeObjRef(menuData);
        const targetFile = ensurePrimaryMenuFile(updated, storeDetails?.tenantId, storeDetails?.storeId);
        if (!targetFile) return;
        const languageCodes = menuData.languages?.length
            ? menuData.languages
            : (targetFile.extractedData.data.languages || []).map((language: any) => language.code).filter(Boolean);
        const nextCategory = createNewCategory(targetFile, languageCodes.length ? languageCodes : ['en'], menuData.masterProjectId);
        nextCategory.active = active;
        nextCategory.orderIndex = targetFile.extractedData.data.categories.length;
        nextCategory.name = {
            ...nextCategory.name,
            ...names,
        };
        const normalizedIcon = normalizeCategoryIconValue(icon);
        if (normalizedIcon) {
            nextCategory.icon = normalizedIcon;
        } else {
            delete nextCategory.icon;
        }
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

    const handleCategoryUpdate = async ({ id: categoryId, names, active, icon, presetIds }: { id: string; names: Record<string, string>; active: boolean; icon?: string; presetIds: string[] }) => {
        if (!menuData) return;
        const presets = storeDetails?.timeSlotPresets || [];
        const updated = removeObjRef(menuData);
        const inheritanceState = categoryInheritanceStates[categoryId];
        const isInheritedOutletCategory = Boolean(
            menuData.masterProjectId &&
            (inheritanceState === 'inherited' || inheritanceState === 'overridden')
        );

        if (isInheritedOutletCategory) {
            updated.overrides = {
                items: updated.overrides?.items || {},
                categories: {
                    ...(updated.overrides?.categories || {}),
                    [categoryId]: {
                        ...(updated.overrides?.categories?.[categoryId] || {}),
                        active,
                    },
                },
                attributes: updated.overrides?.attributes || {},
            };

            updated.files?.forEach((file: any) => {
                file.extractedData?.data?.categories?.forEach((category: any) => {
                    if (category.id === categoryId) {
                        category.active = active;
                    }
                });
            });

            applyLocalMenuUpdate(updated);
            Toast.show({ content: active ? t('categoryShown') : t('categoryHidden'), duration: 1000 });
            return;
        }

        updated.files?.forEach((file: any) => {
            file.extractedData?.data?.categories?.forEach((category: any) => {
                if (category.id === categoryId) {
                    const nextName = clearStaleCategoryTranslations(
                        category.name,
                        names,
                        primaryLang,
                        activeProjectLanguages
                    );
                    category.name = nextName;
                    const normalizedIcon = normalizeCategoryIconValue(icon);
                    if (normalizedIcon) {
                        category.icon = normalizedIcon;
                    } else {
                        delete category.icon;
                    }
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

    const handleCategoryGenerateContent = async ({ id: categoryId, mode, names }: { id?: string; mode: 'missing' | 'regenerate'; names: Record<string, string> }) => {
        if (!menuData) return null;

        const targetFile = categoryId
            ? findFileForCategory(menuData, categoryId)
            : ensurePrimaryMenuFile(menuData, storeDetails?.tenantId, storeDetails?.storeId);
        if (!targetFile) return null;

        const sourceLanguage = GlobalLanguagesList.find((language) => language.code === primaryLang);
        const targetLanguages = activeProjectLanguages
            .slice(1)
            .filter((languageCode) => mode === 'regenerate' || !names[languageCode]?.trim())
            .map((languageCode) => GlobalLanguagesList.find((language) => language.code === languageCode))
            .filter(Boolean);

        if (!sourceLanguage || targetLanguages.length === 0) return null;
        if (!names[sourceLanguage.code]?.trim()) {
            Toast.show({ content: `Category name in ${sourceLanguage.name} is required to generate translations.`, duration: 1800 });
            return null;
        }

        const baseCategoryId = categoryId || `draft-category-${Date.now()}`;
        let nextCategory: ExtractedDataCategory = {
            active: true,
            id: baseCategoryId,
            name: Object.fromEntries(activeProjectLanguages.map((language) => [
                language,
                mode === 'regenerate' && language !== sourceLanguage.code ? '' : names[language] || '',
            ])),
        };

        let translatedCount = 0;
        for (const targetLanguage of targetLanguages) {
            const { updatedCategory, messageType } = await translateCategory(
                menuData,
                targetFile,
                targetLanguage as any,
                sourceLanguage as any,
                AI_ACTIONS_TYPES.ITEM_TRANSLATION,
                nextCategory
            );
            nextCategory = updatedCategory;
            if (messageType === 'success') {
                translatedCount += 1;
            }
        }

        if (translatedCount === 0) {
            Toast.show({ content: 'No missing category translations found.', duration: 1500 });
        } else {
            Toast.show({ content: mode === 'regenerate' ? 'Category translations regenerated.' : 'Category translations updated.', duration: 1200 });
        }

        return nextCategory.name;
    };

    const handleCategoryDelete = async (categoryId: string) => {
        if (!menuData) return;
        const inheritanceState = categoryInheritanceStates[categoryId];
        if (
            menuData.masterProjectId &&
            inheritanceState &&
            inheritanceState !== 'local-only'
        ) {
            Toast.show({ content: 'Inherited categories stay connected to the master menu.', duration: 1800 });
            return;
        }

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
        if (menuData.masterProjectId) {
            const nextCategoryOverrides = {
                ...(updated.overrides?.categories || {}),
            };
            orderedCategoryIds.forEach((categoryId, index) => {
                const inheritanceState = categoryInheritanceStates[categoryId];
                if (inheritanceState === 'inherited' || inheritanceState === 'overridden') {
                    nextCategoryOverrides[categoryId] = {
                        ...(nextCategoryOverrides[categoryId] || {}),
                        orderIndex: index,
                    };
                }
            });
            updated.overrides = {
                items: updated.overrides?.items || {},
                categories: nextCategoryOverrides,
                attributes: updated.overrides?.attributes || {},
            };
        }

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
        if (menuData.masterProjectId) {
            const nextItemOverrides = {
                ...(updated.overrides?.items || {}),
            };
            orderedItemIds.forEach((itemId, index) => {
                const inheritanceState = itemInheritanceStates[itemId];
                if (inheritanceState === 'inherited' || inheritanceState === 'overridden') {
                    nextItemOverrides[itemId] = {
                        ...(nextItemOverrides[itemId] || {}),
                        orderIndex: index,
                    };
                }
            });
            updated.overrides = {
                items: nextItemOverrides,
                categories: updated.overrides?.categories || {},
                attributes: updated.overrides?.attributes || {},
            };
        }

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
        const inheritanceState = itemInheritanceStates[item.id];
        const isInheritedOutletItem = Boolean(
            menuData.masterProjectId &&
            (inheritanceState === 'inherited' || inheritanceState === 'overridden')
        );
        if (isInheritedOutletItem && outletPolicy?.availabilityOverride === false) {
            Toast.show({ content: 'Availability changes are not enabled for this location.', duration: 1800 });
            return;
        }

        const updated = removeObjRef(menuData);
        if (isInheritedOutletItem) {
            updated.overrides = {
                items: {
                    ...(updated.overrides?.items || {}),
                    [item.id]: {
                        ...(updated.overrides?.items?.[item.id] || {}),
                        available: newAvailability,
                    },
                },
                categories: updated.overrides?.categories || {},
                attributes: updated.overrides?.attributes || {},
            };
        }
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
    }, [applyLocalMenuUpdate, availabilityLabels.available, availabilityLabels.unavailable, itemInheritanceStates, menuData, outletPolicy?.availabilityOverride]);

    const handleToggleCategoryActive = useCallback((categoryId: string, nextActive: boolean) => {
        if (!menuData || categoryId === 'uncategorized') return;

        const updated = removeObjRef(menuData);
        const inheritanceState = categoryInheritanceStates[categoryId];
        const isInheritedOutletCategory = Boolean(
            menuData.masterProjectId &&
            (inheritanceState === 'inherited' || inheritanceState === 'overridden')
        );
        if (isInheritedOutletCategory) {
            updated.overrides = {
                items: updated.overrides?.items || {},
                categories: {
                    ...(updated.overrides?.categories || {}),
                    [categoryId]: {
                        ...(updated.overrides?.categories?.[categoryId] || {}),
                        active: nextActive,
                    },
                },
                attributes: updated.overrides?.attributes || {},
            };
        }

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
    }, [applyLocalMenuUpdate, categoryInheritanceStates, menuData, t]);

    const handleRefresh = async () => {
        await flushPendingMenuPersist();
        await refreshProjects({
            force: true,
            preferredProjectId: menuData?.projectId || selectedProjectId,
            showLoader: false,
        });
    };

    const handleOpenUploadSheet = useCallback(() => {
        if (!canUseMenuExtraction) {
            Toast.show({ content: 'Menu extraction is not enabled for this location.', duration: 1800 });
            return;
        }
        if (isBusy) {
            Toast.show({ content: t('menuUploadProcessingInProgress'), duration: 1800 });
            return;
        }

        setIsUploadSheetOpen(true);
    }, [canUseMenuExtraction, isBusy, t]);

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

    const openAddItemSheet = useCallback((
        categoryId: string | null = null,
        source: 'default' | 'commandMenu' | 'categorySheet' = 'default',
    ) => {
        if (menuData?.masterProjectId && !canAddLocalItems) {
            Toast.show({ content: 'Local items are not enabled for this location.', duration: 1800 });
            return;
        }
        setAddSheetInitialCategoryId(categoryId);
        setAddSheetSource(source);
        setIsAddSheetOpen(true);
    }, [canAddLocalItems, menuData?.masterProjectId]);

    const menuPreviewUrl = useMemo(() => {
        const projectName = selectedProjectSummary?.name || selectedProject?.name || menuData?.name;
        const subdomain = storeDetails?.subdomain;
        const customDomain = storeDetails?.customDomain;
        if (!projectName || (!subdomain && !customDomain)) return null;

        try {
            return generateProjectUrl(subdomain, customDomain, projectName, false);
        } catch {
            return null;
        }
    }, [menuData?.name, selectedProject?.name, selectedProjectSummary?.name, storeDetails?.customDomain, storeDetails?.subdomain]);

    const handlePreviewMenu = useCallback(() => {
        if (!menuPreviewUrl) {
            Toast.show({ content: tShare('domainNotSetHelp'), duration: 1600 });
            return;
        }

        window.open(withAnalyticsSource(menuPreviewUrl, 'direct'), '_blank');
    }, [menuPreviewUrl, tShare]);

    const editingItemInheritanceState = editingItem?.id ? itemInheritanceStates[editingItem.id] : undefined;
    const isEditingInheritedOutletItem = Boolean(
        menuData?.masterProjectId &&
        (editingItemInheritanceState === 'inherited' || editingItemInheritanceState === 'overridden')
    );
    const canEditEditingItemImages = !isEditingInheritedOutletItem || outletPolicy?.imageOverride === true;
    const canRunLinkedDescriptionActions = !menuData?.masterProjectId || outletPolicy?.descriptionOverride === true;
    const canManageLinkedLanguages = !menuData?.masterProjectId || outletPolicy?.canAddLanguages !== false;

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
                        clickable={!isBusy}
                        currentProject={{
                            active: activeProjectSummary?.active !== false,
                            deleted: activeProjectSummary?.deleted === true,
                            id: menuData?.projectId || 'current',
                            isDefault: activeProjectSummary?.isDefault,
                            isSpecialMenu: activeProjectSummary?.isSpecialMenu === true,
                            name: activeProjectSummary?.name || menuData?.name || t('currentProject'),
                            projectImage: activeProjectSummary?.projectImage || menuData?.projectImage || null,
                            specialMenuBaseProjectId: activeProjectSummary?.specialMenuBaseProjectId,
                            specialMenuBaseProjectName: activeProjectSummary?.specialMenuBaseProjectId
                                ? projectsList.find((project: any) => project.projectId === activeProjectSummary.specialMenuBaseProjectId)?.name
                                : undefined,
                            specialMenuEndsAt: activeProjectSummary?.specialMenuEndsAt,
                            specialMenuStatus: activeProjectSummary?.specialMenuStatus,
                        }}
                        onClick={!isBusy ? () => setIsProjectSelectorOpen(true) : undefined}
                    />

                    {activeProjectSummary?.isSpecialMenu && activeSpecialMenuStatus ? (
                        <Card size="small" style={{ backgroundColor: token.colorWarningBg, borderColor: token.colorWarningBorder }}>
                            <Flex gap={6} vertical>
                                <Flex align="center" gap={8} wrap="wrap">
                                    <Tag color={activeSpecialMenuStatus === 'active' ? 'success' : activeSpecialMenuStatus === 'scheduled' ? 'processing' : 'default'}>
                                        {activeSpecialMenuStatus === 'active'
                                            ? 'Special menu active'
                                            : activeSpecialMenuStatus === 'scheduled'
                                                ? 'Special menu scheduled'
                                                : activeSpecialMenuStatus === 'cancelled'
                                                    ? 'Special menu cancelled'
                                                    : 'Special menu ended'}
                                    </Tag>
                                    {activeProjectSummary?.specialMenuDisplayName ? (
                                        <Text strong>
                                            {getLocalizedText(
                                                activeProjectSummary.specialMenuDisplayName,
                                                undefined,
                                                getPrimaryLocalizedLanguage(activeProjectSummary.specialMenuDisplayName, 'en'),
                                                '',
                                            )}
                                        </Text>
                                    ) : null}
                                </Flex>
                                {activeSpecialMenuWindow ? (
                                    <Text type="secondary">
                                        Runs: {activeSpecialMenuWindow}
                                    </Text>
                                ) : null}
                                <Text type="secondary">
                                    You are editing the special menu, not the regular menu.
                                </Text>
                            </Flex>
                        </Card>
                    ) : null}

                    {menuData?.files && !isFirstRunProject ? (
                        <MobileMenuQualitySignals
                            activeKey={isMenuQualityExpanded ? ['menu-quality'] : []}
                            files={menuData.files}
                            onOpenRepairMenu={() => {
                                setBulkActionType('aiRepair');
                                setIsBulkActionsOpen(true);
                            }}
                            projectContent={menuData}
                            projectLanguages={menuData.languages}
                            showCategoryIcons={showCategoryIcons}
                            showItemPrices={showItemPrices}
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
                                <Button
                                    block
                                    fill="outline"
                                    onClick={() => setIsFilterSheetOpen(true)}
                                    size="middle"
                                    style={{ height: 32, justifyContent: 'flex-start', minHeight: 32 }}
                                >
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
                        <Flex gap={10} vertical>
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
                                        onClick={() => {
                                            const eligibleItems = filteredItems.filter((item) => (
                                                !item.image &&
                                                (
                                                    !menuData?.masterProjectId ||
                                                    outletPolicy?.imageOverride === true ||
                                                    itemInheritanceStates[item.id] === 'local-only'
                                                )
                                            ));
                                            if (!eligibleItems.length) {
                                                Toast.show({ content: 'Image changes are not enabled for these items.', duration: 1800 });
                                                return;
                                            }
                                            openImageUploadModal(
                                                undefined,
                                                'filter-missing-image',
                                                'generate',
                                                eligibleItems.map((item) => item.id),
                                            );
                                        }}
                                        size="small"
                                    >
                                        {t('generateImages')}
                                    </Button>
                                ) : null}
                                {filters.hasDescription === false && filteredItems.length > 0 ? (
                                    <Button
                                        color="primary"
                                        fill="outline"
                                        onClick={() => {
                                            if (!canRunLinkedDescriptionActions) {
                                                Toast.show({ content: 'Description changes are not enabled for this location.', duration: 1800 });
                                                return;
                                            }
                                            setIsGenerateDescriptionsOpen(true);
                                        }}
                                        size="small"
                                    >
                                        {t('generateDescriptions')}
                                    </Button>
                                ) : null}
                                {filters.availability === false && filteredItems.length > 0 ? (
                                    <Button
                                        color="primary"
                                        fill="outline"
                                        onClick={() => {
                                            if (menuData?.masterProjectId && outletPolicy?.availabilityOverride === false) {
                                                Toast.show({ content: 'Availability changes are not enabled for this location.', duration: 1800 });
                                                return;
                                            }
                                            setBulkActionType('availability');
                                            setBulkActionInitialSelectedIds(filteredItems.filter((item) => !item.available).map((item) => item.id));
                                            setIsBulkActionsOpen(true);
                                        }}
                                        size="small"
                                    >
                                        {t('markAvailable')}
                                    </Button>
                                ) : null}
                                {filters.activeStatus === false && filteredItems.length > 0 ? (
                                    <Button
                                        color="primary"
                                        fill="outline"
                                        onClick={() => {
                                            setBulkActionType('showHide');
                                            setBulkActionInitialSelectedIds(filteredItems.filter((item) => !isItemEffectivelyActive(item)).map((item) => item.id));
                                            setIsBulkActionsOpen(true);
                                        }}
                                        size="small"
                                    >
                                        {t('showOnMenu')}
                                    </Button>
                                ) : null}
                                {filters.qualityIssue === 'categoryIconMissing' && showCategoryIcons && missingCategoryIconCategoryIds.length > 0 ? (
                                    <Button
                                        color="primary"
                                        fill="outline"
                                        onClick={() => {
                                            setCategorySheetMode('manage');
                                            setCategorySheetInitialCategoryId(missingCategoryIconCategoryIds[0] || null);
                                            setIsCategorySheetOpen(true);
                                        }}
                                        size="small"
                                    >
                                        {t('addCategoryIcons')}
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
                            {showItemPrices && filters.qualityIssue === 'priceOutliers' ? (
                                <Card size="small" style={{ backgroundColor: token.colorWarningBg, borderColor: token.colorWarningBorder }}>
                                    <Flex gap={4} vertical>
                                        <Text strong>Why this shows</Text>
                                        <Text type="secondary">
                                            We compare single-item prices inside the same category. This flag appears when a price is much lower or higher than the category&apos;s middle range.
                                        </Text>
                                        <Text type="secondary">
                                            How to use it: review the flagged prices. If a price is wrong, update it. If the difference is intentional, no action needed.
                                        </Text>
                                    </Flex>
                                </Card>
                            ) : null}
                        </Flex>
                    ) : null}

                </Flex>
            </Card>

            {!isFirstRunProject ? (
                <Flex
                    gap={8}
                    style={{
                        backgroundColor: token.colorBgContainer,
                        borderBottom: `1px solid ${token.colorBorderSecondary}`,
                        padding: isCompactHandheld ? '6px 12px 8px' : '8px 16px 10px',
                    }}
                    vertical
                >
                    {languageLabels.length > 1 ? (
                        <Flex
                            align="center"
                            gap={6}
                            style={{
                                WebkitOverflowScrolling: 'touch',
                                flexWrap: 'nowrap',
                                overflowX: 'auto',
                                paddingBottom: 2,
                                scrollbarWidth: 'none',
                            }}
                        >
                            {languageLabels.map((language) => {
                                const isSelected = displayLanguage === language.code;
                                const completionPercentage = !language.isPrimary && language.stats && language.stats.total > 0
                                    ? language.stats.percentage
                                    : null;
                                const isTranslationComplete = completionPercentage === 100;
                                return (
                                    <Tag
                                        color={isSelected ? 'primary' : undefined}
                                        key={language.code}
                                        onClick={() => setDisplayLanguage(language.code)}
                                        style={{ borderWidth: isSelected ? 2 : 1, cursor: 'pointer', flexShrink: 0, marginRight: 0 }}
                                    >
                                        <Flex align="center" gap={4}>
                                            <span>{language.label}</span>
                                            {completionPercentage !== null ? (
                                                isTranslationComplete ? (
                                                    <LuCheck
                                                        size={12}
                                                        style={{ color: token.colorSuccess }}
                                                    />
                                                ) : (
                                                    <span>{`· ${completionPercentage}%`}</span>
                                                )
                                            ) : null}
                                        </Flex>
                                    </Tag>
                                );
                            })}
                        </Flex>
                    ) : null}

                    {listingStatusLegend.length > 0 ? (
                        <Flex
                            align="center"
                            gap={12}
                            style={{
                                WebkitOverflowScrolling: 'touch',
                                flexWrap: 'nowrap',
                                overflowX: 'auto',
                                paddingBottom: 2,
                                scrollbarWidth: 'none',
                            }}
                        >
                            {listingStatusLegend.map((status) => (
                                <StatusDot color={status.color} key={status.key} label={status.label} />
                            ))}
                            <Button
                                fill="none"
                                onClick={() => setIsStatusLegendSheetOpen(true)}
                                size="mini"
                                style={{ flexShrink: 0, minWidth: 24, paddingInline: 0 }}
                            >
                                <LuInfo size={14} />
                            </Button>
                        </Flex>
                    ) : null}

                    <Flex
                        align={isCompactHandheld ? 'flex-start' : 'center'}
                        gap={isCompactHandheld ? 6 : 12}
                        justify="space-between"
                        vertical={isCompactHandheld}
                    >
                        <Text style={{ lineHeight: 1.25 }} type="secondary">
                            {t('categoriesSummary', {
                                items: `${menuItems.length} ${labels.itemsPlural}`,
                                categories: t('categoriesCount', { count: categoryCount }),
                            })}
                        </Text>
                        {orderedCategorySections.length > 0 ? (
                            <Button
                                fill="none"
                                onClick={() => {
                                    setExpandedCategoryKeys((current) => current.length === orderedCategorySections.length ? [] : orderedCategorySections.map((section) => section.id));
                                }}
                                size="small"
                                style={{ alignSelf: isCompactHandheld ? 'flex-end' : undefined, minHeight: 28, paddingInline: 4 }}
                            >
                                {expandedCategoryKeys.length === orderedCategorySections.length ? t('collapseAll') : t('expandAll')}
                            </Button>
                        ) : null}
                    </Flex>
                </Flex>
            ) : null}

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

                                <Flex gap={10} style={{ width: '100%' }} vertical={isCompactHandheld}>
                                    <Button
                                        block
                                        fill="outline"
                                        onClick={() => {
                                            setCategorySheetMode('manage');
                                            setCategorySheetInitialCategoryId(null);
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
                                            onClick={() => {
                                                openAddItemSheet();
                                            }}
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
                                        style={{ backgroundColor: token.colorPrimaryBg, borderRadius: 999, height: 80, width: 80 }}
                                    >
                                        <Flex align="center" justify="center" style={{ height: '100%' }}>
                                            <LuCamera color={token.colorPrimary} size={36} />
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
                        <div
                            style={{
                                backgroundColor: token.colorBorder,
                                borderRadius: 18,
                                padding: 1,
                            }}
                        >
                        <div
                            style={{
                                backgroundColor: token.colorBgElevated,
                                borderRadius: 17,
                                overflow: 'hidden',
                            }}
                        >
                                <Collapse
                                    activeKey={expandedCategoryKeys}
                                    expandIcon={null}
                                    onChange={(key) => setExpandedCategoryKeys(Array.isArray(key) ? key : (key ? [key] : []))}
                                >
                                    {orderedCategorySections.map(({ id, icon, items, name }) => {
                                        const categoryMeta = categorySummaryById.get(id);
                                        const supportLabel = id !== 'uncategorized' ? getCategorySupportLabel(id) : null;

                                        return (
                                            <Collapse.Panel
                                                key={id}
                                                title={(
                                                    <Flex
                                                        align="center"
                                                        gap={12}
                                                        style={{
                                                            minWidth: 0,
                                                            width: '100%',
                                                        }}
                                                    >
                                                        <Flex align="center" gap={12} style={{ flex: '1 1 auto', minWidth: 0 }}>
                                                    {FEATURE_FLAGS.ENABLE_CATEGORY_ICONS && showCategoryIcons && id !== 'uncategorized' ? (
                                                        <Flex
                                                            align="center"
                                                            justify="center"
                                                                    style={{
                                                                        backgroundColor: token.colorFillAlter,
                                                                        border: `1px solid ${token.colorBorderSecondary}`,
                                                                        borderRadius: 14,
                                                                        boxShadow: token.boxShadowTertiary,
                                                                        color: token.colorTextHeading,
                                                                        flexShrink: 0,
                                                                        height: 44,
                                                                        width: 44,
                                                                    }}
                                                                >
                                                                    <CategoryIcon icon={icon || ''} size={22} />
                                                                </Flex>
                                                            ) : null}
                                                            <Flex gap={4} style={{ flex: '1 1 auto', minWidth: 0 }} vertical>
                                                                <Text
                                                                    strong
                                                                    style={{
                                                                        color: token.colorText,
                                                                        fontSize: 15,
                                                                        fontWeight: 600,
                                                                        lineHeight: 1.25,
                                                                        minWidth: 0,
                                                                        overflowWrap: 'anywhere',
                                                                    }}
                                                                >
                                                                    {name}
                                                                </Text>
                                                                {id !== 'uncategorized' ? (
                                                                    <Flex align="center" gap={8} wrap="wrap">
                                                                        <Text style={{ color: token.colorTextSecondary, fontSize: 13, lineHeight: 1.35 }}>
                                                                            {supportLabel}
                                                                        </Text>
                                                                        <Text style={{ color: token.colorTextQuaternary, fontSize: 12 }}>
                                                                            {t('itemsCount', { count: items.length })}
                                                                        </Text>
                                                                        {categoryMeta?.translationMissing ? <StatusDot color={token.colorPrimary} /> : null}
                                                                    </Flex>
                                                                ) : null}
                                                            </Flex>
                                                        </Flex>
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
                                                                        setCategorySheetInitialCategoryId(id);
                                                                        setIsCategorySheetOpen(true);
                                                                    }}
                                                                    size="small"
                                                                    style={{
                                                                        backgroundColor: token.colorBgContainer,
                                                                        borderColor: token.colorBorderSecondary,
                                                                        borderRadius: 12,
                                                                        minHeight: 38,
                                                                        minWidth: 38,
                                                                        paddingInline: 0,
                                                                    }}
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
                                                    <Flex align="center" gap={8} style={{ padding: '14px 0 6px' }} vertical>
                                                        <Text type="secondary">{t('noItemsToShow')}</Text>
                                                        {id !== 'uncategorized' ? (
                                                            <Button
                                                                fill="outline"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    openAddItemSheet(id);
                                                                }}
                                                                size="small"
                                                            >
                                                                {t('addItem')}
                                                            </Button>
                                                        ) : null}
                                                    </Flex>
                                                ) : (
                                                    <div style={{ paddingTop: 8 }}>
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
                                                                            <Button
                                                                                fill="none"
                                                                                onClick={(event) => {
                                                                                    event.stopPropagation();
                                                                                    setEditingItem(item);
                                                                                }}
                                                                                size="small"
                                                                                style={{ minHeight: 34, minWidth: 34, paddingInline: 0 }}
                                                                            >
                                                                                <LuPencil size={14} />
                                                                            </Button>
                                                                        </Flex>
                                                                    }
                                                                    title={(
                                                                        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                                                                            <Text
                                                                                strong
                                                                                style={{
                                                                                    minWidth: 0,
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    whiteSpace: 'nowrap',
                                                                                }}
                                                                            >
                                                                                {item.name}
                                                                            </Text>
                                                                            <Flex align="center" gap={6} style={{ flexShrink: 0 }}>
                                                                                {!isItemEffectivelyActive(item) ? <StatusDot color={token.colorTextQuaternary} /> : null}
                                                                                {item.available === false ? <StatusDot color={token.colorWarning} /> : null}
                                                                                {item.translationMissing ? <StatusDot color={token.colorPrimary} /> : null}
                                                                            </Flex>
                                                                        </Flex>
                                                                    )}
                                                                    description={
                                                                        <Flex gap={8} vertical>
                                                                            <Flex align="center" gap={8} wrap>
                                                                                {!item.attributes?.length ? <Tag>{formatMenuPrice(item.price, currencySymbol)}</Tag> : null}
                                                                            </Flex>

                                                                            {item.hiddenByCategory ? (
                                                                                <Flex align="center" gap={8} wrap>
                                                                                    <Tag color="default">{t('hiddenByCategory')}</Tag>
                                                                                </Flex>
                                                                            ) : null}

                                                                            {filters.qualityIssue === 'priceOutliers' && priceOutlierItemIds.has(item.id) ? (
                                                                                <Flex align="center" gap={8} wrap>
                                                                                    <Tag color="warning">Needs price review</Tag>
                                                                                    <Button
                                                                                        color="primary"
                                                                                        fill="outline"
                                                                                        onClick={(event) => {
                                                                                            event.stopPropagation();
                                                                                            markPriceOutlierReviewed(item.id);
                                                                                        }}
                                                                                        size="small"
                                                                                    >
                                                                                        Mark reviewed
                                                                                    </Button>
                                                                                </Flex>
                                                                            ) : null}

                                                                            {item.attributes?.length ? (
                                                                                <Flex gap={6} wrap>
                                                                                    {item.attributes.slice(0, 3).map((attribute) => (
                                                                                        <Tag key={attribute.id}>
                                                                                            {attribute.name}
                                                                                            {typeof attribute.price === 'number' && attribute.price > 0 ? ` · ${formatMenuPrice(attribute.price, currencySymbol)}` : ''}
                                                                                        </Tag>
                                                                                    ))}
                                                                                    {item.attributes.length > 3 ? <Tag>+{item.attributes.length - 3} more</Tag> : null}
                                                                                </Flex>
                                                                            ) : null}
                                                                        </Flex>
                                                                    }
                                                                />
                                                            ))}
                                                        </List>
                                                        {id !== 'uncategorized' ? (
                                                            <Button
                                                                block
                                                                fill="outline"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    openAddItemSheet(id);
                                                                }}
                                                                size="small"
                                                                style={{ marginTop: 8 }}
                                                            >
                                                                {t('addItem')}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </Collapse.Panel>
                                        )
                                    })}
                                </Collapse>
                            </div>
                        </div>
                    )}
                </Flex>
            </PullToRefresh>

            {!isFirstRunProject ? (
                <FloatingBubble
                    onClick={() => setIsCommandMenuOpen(true)}
                    style={{ '--initial-position-bottom': 'calc(env(safe-area-inset-bottom) + 96px)', '--initial-position-right': 16, '--size': 52 }}
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
                bodyStyle={{ maxHeight: '72vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsStatusLegendSheetOpen(false)}
                visible={isStatusLegendSheetOpen}
            >
                <Flex style={{ maxHeight: '72vh' }} vertical>
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
                        <Title level={4} style={{ lineHeight: 1.2, margin: 0, textAlign: 'center' }}>
                            {t('filters')}
                        </Title>
                        <Button
                            fill="none"
                            onClick={() => setIsStatusLegendSheetOpen(false)}
                            style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}
                        >
                            <LuX size={18} />
                        </Button>
                    </Flex>

                    <Flex gap={10} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px calc(12px + env(safe-area-inset-bottom))' }} vertical>
                        <Card size="small" style={{ backgroundColor: token.colorBgContainer, margin: 0 }}>
                            <Flex gap={8} vertical>
                                <Text strong>Visibility status</Text>
                                <Flex align="center" gap={10}>
                                    <StatusDot color={token.colorSuccess} />
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text strong>{t('shownOnMenu')}</Text>
                                        <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.3 }}>
                                            Customers can see this on your menu.
                                        </Text>
                                    </Flex>
                                </Flex>
                                <Flex align="center" gap={10}>
                                    <StatusDot color={token.colorTextQuaternary} />
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text strong>{t('hiddenFromMenu')}</Text>
                                        <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.3 }}>
                                            Not shown to customers on your menu.
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card size="small" style={{ backgroundColor: token.colorBgContainer, margin: 0 }}>
                            <Flex gap={8} vertical>
                                <Text strong>Ordering status</Text>
                                <Flex align="center" gap={10}>
                                    <StatusDot color={token.colorSuccess} />
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text strong>{availabilityLabels.available}</Text>
                                        <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.3 }}>
                                            Customers can order this item now.
                                        </Text>
                                    </Flex>
                                </Flex>
                                <Flex align="center" gap={10}>
                                    <StatusDot color={token.colorWarning} />
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text strong>{availabilityLabels.unavailable}</Text>
                                        <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.3 }}>
                                            Still visible, but customers cannot order it.
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Card>

                        {activeProjectLanguages.length > 1 ? (
                            <Card size="small" style={{ backgroundColor: token.colorBgContainer, margin: 0 }}>
                                <Flex align="center" gap={10}>
                                    <StatusDot color={token.colorPrimary} />
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text strong>{t('missingTranslation')}</Text>
                                        <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.3 }}>
                                            Needs translation in the selected language.
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        ) : null}
                    </Flex>
                </Flex>
            </Popup>

            <Popup
                bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsFilterSheetOpen(false)}
                visible={isFilterSheetOpen}
            >
                <Flex style={{ maxHeight: '92vh' }} vertical>
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

                    <Flex gap={12} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>

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
                                                    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
                                    {(menuIssueCounts.missingPhoto > 0 || draftFilters.hasImage === false) ? renderIssueToggle(
                                        `${t('missingPhoto')} (${menuIssueCounts.missingPhoto})`,
                                        draftFilters.hasImage === false,
                                        () => setDraftFilters((prev) => ({ ...prev, hasImage: prev.hasImage === false ? null : false }))
                                    ) : null}
                                    {showCategoryIcons && (menuIssueCounts.missingCategoryIcon > 0 || draftFilters.qualityIssue === 'categoryIconMissing') ? renderIssueToggle(
                                        `${t('missingCategoryIcon')} (${menuIssueCounts.missingCategoryIcon})`,
                                        draftFilters.qualityIssue === 'categoryIconMissing',
                                        () => setDraftFilters((prev) => ({
                                            ...prev,
                                            qualityIssue: prev.qualityIssue === 'categoryIconMissing' ? null : 'categoryIconMissing',
                                        }))
                                    ) : null}
                                    {(menuIssueCounts.missingDescription > 0 || draftFilters.hasDescription === false) ? renderIssueToggle(
                                        `${t('missingDescription')} (${menuIssueCounts.missingDescription})`,
                                        draftFilters.hasDescription === false,
                                        () => setDraftFilters((prev) => ({ ...prev, hasDescription: prev.hasDescription === false ? null : false }))
                                    ) : null}
                                    {showItemPrices && (menuIssueCounts.missingPrice > 0 || draftFilters.hasPrice === false) ? renderIssueToggle(
                                        `${t('missingPrice')} (${menuIssueCounts.missingPrice})`,
                                        draftFilters.hasPrice === false,
                                        () => setDraftFilters((prev) => ({ ...prev, hasPrice: prev.hasPrice === false ? null : false }))
                                    ) : null}
                                    {showItemPrices && (menuIssueCounts.priceOutliers > 0 || draftFilters.qualityIssue === 'priceOutliers') ? renderIssueToggle(
                                        `${t('unusualPrices')} (${menuIssueCounts.priceOutliers})`,
                                        draftFilters.qualityIssue === 'priceOutliers',
                                        () => setDraftFilters((prev) => ({
                                            ...prev,
                                            qualityIssue: prev.qualityIssue === 'priceOutliers' ? null : 'priceOutliers',
                                        }))
                                    ) : null}
                                    {activeProjectLanguages.length > 1 && (menuIssueCounts.missingTranslation > 0 || draftFilters.qualityIssue === 'translationMissing') ? renderIssueToggle(
                                        `${t('missingTranslation')} (${menuIssueCounts.missingTranslation})`,
                                        draftFilters.qualityIssue === 'translationMissing',
                                        () => setDraftFilters((prev) => ({
                                            ...prev,
                                            qualityIssue: prev.qualityIssue === 'translationMissing' ? null : 'translationMissing',
                                        }))
                                    ) : null}
                                </Flex>
                            </Flex>
                        </Card>

                        {(() => {
                            const availabilityOptions: Array<{ label: string; value: string }> = [];
                            if (menuIssueCounts.available > 0 || draftFilters.availability === true) {
                                availabilityOptions.push({ label: availabilityLabels.available, value: 'available' });
                            }
                            if (menuIssueCounts.unavailable > 0 || draftFilters.availability === false) {
                                availabilityOptions.push({ label: availabilityLabels.unavailable, value: 'soldOut' });
                            }

                            const hasBothAvailabilityStates = menuIssueCounts.available > 0 && menuIssueCounts.unavailable > 0;
                            const shouldShowAvailabilityFilter = hasBothAvailabilityStates || draftFilters.availability !== null;
                            if (!shouldShowAvailabilityFilter || availabilityOptions.length === 0) return null;

                            return renderSingleChoiceFilter(
                                t('availability'),
                                draftFilters.availability === null ? '' : draftFilters.availability ? 'available' : 'soldOut',
                                availabilityOptions,
                                null,
                                (value) => setDraftFilters((prev) => ({ ...prev, availability: value === '' ? null : value === 'available' }))
                            );
                        })()}

                        {(() => {
                            const visibilityOptions: Array<{ label: string; value: string }> = [];
                            if (menuIssueCounts.shown > 0 || draftFilters.activeStatus === true) {
                                visibilityOptions.push({ label: t('shownOnMenu'), value: 'active' });
                            }
                            if (menuIssueCounts.hidden > 0 || draftFilters.activeStatus === false) {
                                visibilityOptions.push({ label: t('hiddenFromMenu'), value: 'hidden' });
                            }

                            const hasBothVisibilityStates = menuIssueCounts.shown > 0 && menuIssueCounts.hidden > 0;
                            const shouldShowVisibilityFilter = hasBothVisibilityStates || draftFilters.activeStatus !== null;
                            if (!shouldShowVisibilityFilter || visibilityOptions.length === 0) return null;

                            return renderSingleChoiceFilter(
                                t('visibility'),
                                draftFilters.activeStatus === null ? '' : draftFilters.activeStatus ? 'active' : 'hidden',
                                visibilityOptions,
                                null,
                                (value) => setDraftFilters((prev) => ({ ...prev, activeStatus: value === '' ? null : value === 'active' }))
                            );
                        })()}

                        <Text style={{ fontSize: 12 }} type="secondary">
                            {t('filterTerminologyHelp', { unavailable: availabilityLabels.unavailable })}
                        </Text>
                        {filterHealthHints.showAllShownOnMenu ? (
                            <Text style={{ fontSize: 12 }} type="secondary">
                                All items are shown on menu.
                            </Text>
                        ) : null}
                        {filterHealthHints.showAllAvailable ? (
                            <Text style={{ fontSize: 12 }} type="secondary">
                                All items are available.
                            </Text>
                        ) : null}

                    </Flex>

                    <div style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        flexShrink: 0,
                        padding: '12px 16px calc(12px + env(safe-area-inset-bottom))',
                        zIndex: 5,
                    }}>
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
                    </div>
                </Flex>
            </Popup>

            <MobileMenuCommandSheet
                businessType={storeDetails?.businessType}
                labels={labels}
                onAddItem={() => launchCommandAction(() => {
                    openAddItemSheet(null, 'commandMenu');
                })}
                onCategories={() => launchCommandAction(() => {
                    setCategorySheetMode('manage');
                    setCategorySheetInitialCategoryId(null);
                    setIsCategorySheetOpen(true);
                })}
                onChangeAvailability={() => launchCommandAction(() => {
                    if (menuData?.masterProjectId && outletPolicy?.availabilityOverride === false) {
                        Toast.show({ content: 'Availability changes are not enabled for this location.', duration: 1800 });
                        return;
                    }
                    setBulkActionType('availability');
                    setIsBulkActionsOpen(true);
                })}
                onClose={() => setIsCommandMenuOpen(false)}
                onAIDefaults={() => launchCommandAction(() => setIsAIDefaultsOpen(true))}
                onAddImages={() => launchCommandAction(() => openImageUploadModal(undefined, 'menu'))}
                onGenerateDescriptions={() => launchCommandAction(() => {
                    if (!canRunLinkedDescriptionActions) {
                        Toast.show({ content: 'Description changes are not enabled for this location.', duration: 1800 });
                        return;
                    }
                    setIsGenerateDescriptionsOpen(true);
                })}
                onManageLanguages={() => launchCommandAction(() => {
                    if (!canManageLinkedLanguages) {
                        Toast.show({ content: 'Language changes are not enabled for this location.', duration: 1800 });
                        return;
                    }
                    setIsManageLanguagesOpen(true);
                })}
                onOpenDesignEditor={onOpenDesignEditor}
                onRepairMenu={() => launchCommandAction(() => {
                    if (!canRunLinkedDescriptionActions) {
                        Toast.show({ content: 'Description changes are not enabled for this location.', duration: 1800 });
                        return;
                    }
                    setBulkActionType('aiRepair');
                    setIsBulkActionsOpen(true);
                })}
                onPreview={handlePreviewMenu}
                onTextCase={() => launchCommandAction(() => {
                    if (menuData?.masterProjectId) {
                        Toast.show({ content: 'Inherited item names stay connected to the master menu.', duration: 1800 });
                        return;
                    }
                    setIsTextCaseOpen(true);
                })}
                onMoveCategory={() => launchCommandAction(() => {
                    setBulkActionType('moveCategory');
                    setIsBulkActionsOpen(true);
                })}
                onUploadMenu={() => launchCommandAction(handleOpenUploadSheet)}
                onPricing={() => launchCommandAction(() => {
                    if (menuData?.masterProjectId && outletPolicy?.priceOverride === false) {
                        Toast.show({ content: 'Price changes are not enabled for this location.', duration: 1800 });
                        return;
                    }
                    setBulkActionType('pricing');
                    setIsBulkActionsOpen(true);
                })}
                onReorderMenu={() => launchCommandAction(() => {
                    setCategorySheetMode('reorder');
                    setCategorySheetInitialCategoryId(null);
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
                <AIDefaultsSheet
                    businessType={storeDetails?.businessType}
                    onClose={() => handleCommandActionBack(() => setIsAIDefaultsOpen(false))}
                    onSaved={(updatedProject) => {
                        applyLocalMenuUpdate(updatedProject);
                        setIsAIDefaultsOpen(false);
                        resetCommandActionFlow();
                    }}
                    projectData={menuData}
                    visible={isAIDefaultsOpen}
                />
            ) : null}

            {menuData ? (
                <GenerateDescriptionsSheet
                    businessType={storeDetails?.businessType}
                    onClose={() => handleCommandActionBack(() => setIsGenerateDescriptionsOpen(false))}
                    onSaved={(updatedProject) => {
                        applyLocalMenuUpdate(updatedProject);
                        setIsGenerateDescriptionsOpen(false);
                        resetCommandActionFlow();
                    }}
                    projectData={menuData}
                    visible={isGenerateDescriptionsOpen}
                />
            ) : null}

            <CategoryManagerSheet
                businessType={storeDetails?.businessType}
                categoryIconsEnabled={showCategoryIcons}
                categories={categorySummary}
                categoryItems={categoryItemMap}
                initialCategoryId={categorySheetInitialCategoryId}
                initialMode={categorySheetMode}
                presets={storeDetails?.timeSlotPresets || []}
                onAdd={handleCategoryAdd}
                onClose={() => handleCommandActionBack(() => {
                    setIsCategorySheetOpen(false);
                    setCategorySheetMode('manage');
                    setCategorySheetInitialCategoryId(null);
                })}
                onDelete={handleCategoryDelete}
                onGenerateContent={handleCategoryGenerateContent}
                onOpenDesignEditor={onOpenDesignEditor}
                onUpdate={handleCategoryUpdate}
                onReorder={handleCategoryReorder}
                onReorderItems={handleCategoryItemReorder}
                onAddItem={(categoryId) => {
                    openAddItemSheet(categoryId, 'categorySheet');
                }}
                selectedLanguages={activeProjectLanguages}
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
                        const inheritanceState = itemInheritanceStates[itemId];
                        if (
                            menuData.masterProjectId &&
                            inheritanceState &&
                            inheritanceState !== 'local-only'
                        ) {
                            Toast.show({ content: 'Inherited items stay connected to the master menu.', duration: 1800 });
                            return;
                        }
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
                    onGenerateImage={editingItem.id && canEditEditingItemImages ? () => openImageUploadModal(editingItem.id, 'item', 'upload') : undefined}
                    onManageImages={editingItem.id && canEditEditingItemImages ? () => openImageUploadModal(editingItem.id, 'item', 'upload') : undefined}
                    projectData={menuData}
                    inheritanceState={editingItemInheritanceState}
                    outletPolicy={outletPolicy}
                    onSave={async (updatedItem) => {
                        if (!menuData) return;
                        const updated = removeObjRef(menuData);
                        const inheritanceState = itemInheritanceStates[editingItem.id];
                        const isInheritedOutletItem = Boolean(
                            menuData.masterProjectId &&
                            (inheritanceState === 'inherited' || inheritanceState === 'overridden')
                        );
                        const pendingImage = typeof updatedItem.image === 'string' ? updatedItem.image : null;
                        const shouldUploadImage = Boolean(pendingImage?.includes('base64'));
                        const imageName = `${updatedItem.name || editingItem.id}.jpg`;
                        const rawItem = updatedItem.rawItem
                            ? clearStaleTranslations(
                                editingItem.rawItem || updatedItem.rawItem,
                                removeObjRef(updatedItem.rawItem),
                                primaryLang,
                                activeProjectLanguages
                            )
                            : null;

                        if (isInheritedOutletItem) {
                            const nextOverride = {
                                ...(updated.overrides?.items?.[editingItem.id] || {}),
                            };
                            const currentPriceValue = String(editingItem.rawItem?.price ?? editingItem.price ?? '');
                            const nextPriceValue = String(updatedItem.rawItem?.price ?? updatedItem.price ?? '');
                            const priceChanged = updatedItem.price !== undefined && nextPriceValue !== currentPriceValue;
                            const availableChanged = updatedItem.available !== undefined && updatedItem.available !== editingItem.available;
                            const activeChanged = updatedItem.active !== undefined && updatedItem.active !== editingItem.active;
                            const currentDescriptionValue = String(
                                editingItem.rawItem?.description?.[primaryLang] ?? editingItem.description ?? ''
                            );
                            const nextDescription = rawItem?.description || (
                                updatedItem.description !== undefined
                                    ? {
                                        ...(editingItem.rawItem?.description || {}),
                                        [primaryLang]: updatedItem.description,
                                    }
                                    : undefined
                            );
                            const descriptionChanged = Boolean(
                                nextDescription &&
                                String(nextDescription[primaryLang] || '') !== currentDescriptionValue
                            );
                            const imageChanged = updatedItem.image !== undefined && !shouldUploadImage;

                            if (priceChanged) {
                                if (outletPolicy?.priceOverride === false) {
                                    Toast.show({ content: 'Price changes are not enabled for this location.', duration: 1800 });
                                    return;
                                }
                                nextOverride.price = nextPriceValue;
                            }
                            if (availableChanged) {
                                if (outletPolicy?.availabilityOverride === false) {
                                    Toast.show({ content: 'Availability changes are not enabled for this location.', duration: 1800 });
                                    return;
                                }
                                nextOverride.available = updatedItem.available;
                            }
                            if (activeChanged) {
                                nextOverride.active = updatedItem.active;
                            }
                            if (descriptionChanged && nextDescription) {
                                if (outletPolicy?.descriptionOverride !== true) {
                                    Toast.show({ content: 'Description changes are not enabled for this location.', duration: 1800 });
                                    return;
                                }
                                nextOverride.description = nextDescription;
                            }
                            if (imageChanged) {
                                if (outletPolicy?.imageOverride !== true) {
                                    Toast.show({ content: 'Image changes are not enabled for this location.', duration: 1800 });
                                    return;
                                }
                                nextOverride.images = pendingImage ? [{ url: pendingImage, name: imageName }] : [];
                            }

                            updated.overrides = {
                                items: {
                                    ...(updated.overrides?.items || {}),
                                    [editingItem.id]: nextOverride,
                                },
                                categories: updated.overrides?.categories || {},
                                attributes: updated.overrides?.attributes || {},
                            };

                            updated.files?.forEach((file: any) => {
                                file.extractedData?.data?.items?.forEach((menuItem: any, idx: number) => {
                                    if (menuItem.id !== editingItem.id) return;
                                    file.extractedData.data.items[idx] = {
                                        ...menuItem,
                                        ...(priceChanged ? { price: nextPriceValue } : {}),
                                        ...(availableChanged ? { available: updatedItem.available } : {}),
                                        ...(activeChanged ? { active: updatedItem.active } : {}),
                                        ...(descriptionChanged && nextDescription ? { description: nextDescription, descriptionSource: 'manual' } : {}),
                                        ...(imageChanged ? { images: pendingImage ? [{ url: pendingImage, name: imageName }] : [] } : {}),
                                    };
                                });
                            });

                            applyLocalMenuUpdate(updated);
                            Toast.show({ content: t('itemUpdated'), duration: 1000 });
                            setEditingItem(null);
                            resetCommandActionFlow();
                            return;
                        }

                        updated.files?.forEach((file: any) => {
                            file.extractedData?.data?.items?.forEach((menuItem: any, idx: number) => {
                                if (menuItem.id === editingItem.id) {
                                    const nextItem = rawItem ? { ...menuItem, ...rawItem } : { ...menuItem };
                                    if (!rawItem) {
                                        if (updatedItem.name !== undefined) {
                                            const nextName = typeof menuItem.name === 'object' && menuItem.name ? { ...menuItem.name } : {};
                                            nextName[primaryLang] = updatedItem.name;
                                            nextItem.name = nextName;
                                        }
                                        if (updatedItem.description !== undefined) {
                                            const nextDescription = typeof menuItem.description === 'object' && menuItem.description ? { ...menuItem.description } : {};
                                            nextDescription[primaryLang] = updatedItem.description;
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
                                                name: { [primaryLang]: attribute.name },
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
                    selectedLanguages={activeProjectLanguages}
                    sourceFile={findFileContainingItem(menuData, editingItem.id)}
                />
            ) : null}

            {isAddSheetOpen ? (
                <ItemEditSheet
                    categories={categoryOptions}
                    currencySymbol={storeDetails?.currencySymbol || '₹'}
                    initialCategoryId={addSheetInitialCategoryId || undefined}
                    mode="add"
                    onClose={() => {
                        const shouldReturnToCommandMenu = addSheetSource === 'commandMenu';

                        if (shouldReturnToCommandMenu) {
                            handleCommandActionBack(() => {
                                setIsAddSheetOpen(false);
                                setAddSheetInitialCategoryId(null);
                                setAddSheetSource('default');
                            });
                            return;
                        }

                        setIsAddSheetOpen(false);
                        setAddSheetInitialCategoryId(null);
                        setAddSheetSource('default');
                    }}
                    projectData={menuData}
                    onSave={async (newItem) => {
                        if (!menuData) return;
                        if (!newItem.categoryId) {
                            Toast.show({ content: t('selectCategory'), duration: 1500 });
                            return;
                        }
                        const updated = removeObjRef(menuData);
                        let targetFile = findFileForCategory(updated, newItem.categoryId);
                        if (!targetFile) {
                            targetFile = ensurePrimaryMenuFile(updated, storeDetails?.tenantId, storeDetails?.storeId);
                        }
                        if (!targetFile) return;
                        const languageCodes = menuData.languages?.length
                            ? menuData.languages
                            : (targetFile.extractedData.data.languages || []).map((language: any) => language.code).filter(Boolean);

                        const categoryId = newItem.categoryId;
                        const rawItem = newItem.rawItem ? removeObjRef(newItem.rawItem) : null;

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
                            [primaryLang]: newItem.name || '',
                        };
                        createdItem.description = newItem.description
                            ? {
                                ...createdItem.description,
                                [primaryLang]: newItem.description,
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
                            name: { [primaryLang]: attribute.name },
                            price: String(attribute.price || 0),
                        }));
                        if (rawItem) {
                            createdItem.name = rawItem.name;
                            createdItem.description = rawItem.description;
                            createdItem.descriptionSource = rawItem.descriptionSource;
                            createdItem.price = rawItem.price;
                            createdItem.category = rawItem.category || categoryId;
                            createdItem.active = rawItem.active !== false;
                            createdItem.available = rawItem.available !== false;
                            createdItem.attributes = (rawItem.attributes || []).map((attribute) => ({
                                ...attribute,
                                price: String(attribute.price || ''),
                            }));
                        }
                        const imageName = `${newItem.name || createdItem.id}.jpg`;
                        createdItem.images = pendingImage && !shouldUploadImage ? [{ url: pendingImage, name: imageName }] : [];

                        targetFile.extractedData.data.items.push(createdItem);

                        applyLocalMenuUpdate(updated);
                        Toast.show({ content: t('itemAdded'), duration: 1000 });
                        const currentAddSheetSource = addSheetSource;
                        setIsAddSheetOpen(false);
                        setAddSheetInitialCategoryId(null);
                        setAddSheetSource('default');
                        if (currentAddSheetSource !== 'categorySheet') {
                            resetCommandActionFlow();
                        }

                        if (shouldUploadImage && pendingImage) {
                            uploadItemImageInBackground(
                                createdItem.id,
                                pendingImage,
                                imageName,
                                `${createdItem.id}-mobile-new-item`,
                            );
                        }
                    }}
                    selectedLanguages={activeProjectLanguages}
                    sourceFile={findFileForCategory(menuData, addSheetInitialCategoryId || categoryOptions[0]?.id)}
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
                        void refreshProjects({ force: true, preferredProjectId: projectId, showLoader: false });
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
                                setImageModalInitialTab('upload');
                                setImageModalInitialBatchItemIds([]);
                                setImageModalSource('');
                            });
                        }}
                        initialBatchItemIds={imageModalInitialBatchItemIds}
                        onImageUpload={handleModalImageUpload}
                        onProjectDataUpdate={async (updatedProject) => {
                            if (!updatedProject.projectId) return;
                            const projectToSave = getPersistableMenuProjectWithLinkedOverrides(updatedProject);
                            const savedProject = await updateProjectWithoutLoader(projectToSave);
                            if (updatedProject.masterProjectId) {
                                const rawSavedProject = savedProject || projectToSave;
                                rawMenuProjectRef.current = removeObjRef(rawSavedProject);
                                persistedMenuRef.current = removeObjRef(rawSavedProject);
                                persistedLocalSnapshotRef.current = JSON.stringify(removeObjRef(rawSavedProject));
                                menuDataRef.current = updatedProject;
                                setMenuData(updatedProject);
                                replaceProjectInList(rawSavedProject);
                            } else {
                                syncSavedMenuProject(savedProject || updatedProject);
                            }
                        }}
                        open={isImageUploadOpen}
                        preferredInitialTab={imageModalInitialTab}
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
                        const previewData = getProjectImageDataFromComparisonPreview(comparisonResult);
                        void maybeAutoGenerateProjectImage({
                            categories: previewData.categories,
                            items: previewData.items,
                            projectData: menuData,
                            projectId: menuData.projectId,
                            projectSummary: selectedProjectSummary,
                        });
                        const attributePreviewData = {
                            ...previewData,
                            businessAttributeSuggestions: activeJob?.result?.combinedData?.businessAttributeSuggestions,
                        };
                        void applyMenuDerivedBusinessAttributeDefaults(attributePreviewData);
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
                businessType={storeDetails?.businessType}
                initialAction={bulkActionType}
                initialSelectedIds={bulkActionInitialSelectedIds}
                onApply={(updatedProject, context) => {
                    applyUndoableBulkMenuUpdate(updatedProject, context?.previousProject, context?.updatedCount, context?.successMessage);
                    resetCommandActionFlow();
                }}
                projectData={menuData}
                visible={isBulkActionsOpen}
                onClose={() => {
                    handleCommandActionBack(() => {
                        setIsBulkActionsOpen(false);
                        setBulkActionType(null);
                        setBulkActionInitialSelectedIds([]);
                    });
                }}
            />

            <MobileProjectSelectorSheet
                currentProjectId={menuData?.projectId}
                currentProjectName={activeProjectSummary?.name || menuData?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onOpenDesignEditor={onOpenDesignEditor}
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
