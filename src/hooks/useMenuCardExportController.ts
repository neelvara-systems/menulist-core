'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import { getStoreContextName } from '@lib/businessIdentity/names';
import {
    buildDefaultSettings,
    buildPrintShopPacket,
    buildPrintSource,
    buildPrintSourceHash,
    downloadMenuCardArtifact,
    exposedMenuCardTemplates,
    findReusableExport,
    getFreshnessState,
    listLocalMenuCardExports,
    menuCardPresetRegistry,
    renderPdf,
    renderPreviewModel,
    resolveAutoPrintDesign,
    resolveMenuCardBusinessPrintProfile,
    saveLocalMenuCardExport,
    shareMenuCardArtifact,
    type MenuCardAutoPrintDesign,
    type MenuCardExportPreset,
    type MenuCardExportSettings,
    type MenuCardLocalHistoryRecord,
    type MenuCardPrintSource,
    type MenuCardSafeOverrides,
} from '@lib/menu-card-export';
import {
    isMenuCardAdvisorDensity,
    isMenuCardAdvisorPreset,
    isMenuCardAdvisorStyle,
    type MenuCardDesignAdvisorRecommendation,
} from '@lib/menu-card-export/ai/designAdvisor';
import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import getMenuCardDesignAdviceViaAPI, { MenuCardDesignAdvisorPlanError } from '@services/ai/menuCardExport/getDesignAdviceViaAPI';
import { resolveLocalExportStorageScope } from '@lib/export/localExportHistory';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export type MenuCardProjectOption = {
    projectId: string;
    name: string | Record<string, string>;
    isDefault?: boolean;
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    projectImage?: string | null;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
};

export type MenuCardExportNotice = {
    content: string;
    type: 'success' | 'error' | 'warning' | 'info';
};

type UseMenuCardExportControllerOptions = {
    initialProjectId?: string | null;
    loadProjectData?: (projectId: string) => Promise<Project | null>;
    notify?: (notice: MenuCardExportNotice) => void;
    projectDataById?: Record<string, Project | null | undefined>;
    projectSummaries?: Array<Partial<MenuCardProjectOption> & { projectId: string }>;
};

export function resolveMenuCardProjectName(
    name: string | Record<string, string> | undefined,
    fallback = 'Menu',
): string {
    return getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback);
}

type MenuCardStoreUrlContext = Pick<StoreDataType, 'customDomain' | 'subdomain'>;

function buildMenuUrl(storeDetails: MenuCardStoreUrlContext, project: MenuCardProjectOption): string {
    return generateProjectUrl(
        storeDetails?.subdomain || '',
        storeDetails?.customDomain,
        resolveMenuCardProjectName(project.name, 'Menu'),
        false,
    );
}

function normalizeProjectOption(storeUrlContext: MenuCardStoreUrlContext, project: Partial<MenuCardProjectOption> & { projectId: string }): MenuCardProjectOption {
    return {
        projectId: project.projectId,
        name: project.name || 'Menu',
        isDefault: project.isDefault,
        active: project.active,
        deleted: project.deleted,
        isSpecialMenu: project.isSpecialMenu,
        projectImage: project.projectImage || null,
        specialMenuBaseProjectId: project.specialMenuBaseProjectId,
        specialMenuEndsAt: project.specialMenuEndsAt,
        specialMenuStatus: project.specialMenuStatus,
        url: project.url || buildMenuUrl(storeUrlContext, project as MenuCardProjectOption),
    };
}

function makeSettings(preset: MenuCardExportPreset, styleId: string): MenuCardExportSettings {
    return buildDefaultSettings(preset, styleId);
}

const MENU_CARD_ADVICE_PLAN_REQUIRED_MESSAGE = 'Layout suggestions are included in Pro and Multi-location.';
const MENU_CARD_ADVICE_CAPACITY_MESSAGE = 'Additional AI enhancements are needed for layout suggestions.';

export function isMenuCardPresetAvailable(preset: MenuCardExportPreset): boolean {
    if (preset === 'print_shop_packet') {
        return FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_PRINT_SHOP;
    }
    return true;
}

export default function useMenuCardExportController({
    initialProjectId = null,
    loadProjectData,
    notify,
    projectDataById,
    projectSummaries,
}: UseMenuCardExportControllerOptions = {}) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const session = useClientAuthSession();
    const scope = useMemo(
        () => resolveOwnerBusinessAssistantClientScope(session, storeDetails?.storeId, storeDetails?.tenantId),
        [session, storeDetails?.storeId, storeDetails?.tenantId],
    );
    const scopedStoreDetails = scope ? storeDetails : null;
    const [projects, setProjects] = useState<MenuCardProjectOption[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
    const [projectData, setProjectData] = useState<Project | null>(null);
    const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [history, setHistory] = useState<MenuCardLocalHistoryRecord[]>([]);
    const [settings, setSettings] = useState<MenuCardExportSettings>(() => makeSettings('home_print', 'classic'));
    const [overrides] = useState<MenuCardSafeOverrides>({});
    const autoDesignKeyRef = useRef('');
    const manualSettingsTouchedRef = useRef(false);
    const projectDataCacheRef = useRef<Record<string, Project>>({});
    const adviceCacheRef = useRef<Record<string, MenuCardDesignAdvisorRecommendation>>({});
    const currentArtifactScopeRef = useRef('');
    const currentAdviceSourceHashRef = useRef('');
    const adviceInFlightRef = useRef(false);
    const artifactInFlightRef = useRef(false);
    const lastInitialProjectIdRef = useRef(initialProjectId || null);
    const [designAdvice, setDesignAdvice] = useState<MenuCardDesignAdvisorRecommendation | null>(null);
    const [adviceLoading, setAdviceLoading] = useState(false);
    const [adviceError, setAdviceError] = useState<string | null>(null);

    const storeName = useMemo(() => getStoreContextName(scopedStoreDetails, 'Your Business'), [scopedStoreDetails]);
    const storeUrlContext = useMemo(() => ({
        subdomain: scopedStoreDetails?.subdomain || '',
        customDomain: scopedStoreDetails?.customDomain,
    }), [scopedStoreDetails?.subdomain, scopedStoreDetails?.customDomain]);
    const storeRouteKey = useMemo(() => {
        if (!scopedStoreDetails || !scope) return '';
        const tenantId = scope.tenantId;
        const storeId = scope.storeId;
        const subdomain = scopedStoreDetails.subdomain || '';
        const customDomain = scopedStoreDetails.customDomain || '';
        if (!tenantId && !storeId && !subdomain && !customDomain) return '';
        return [tenantId, storeId, subdomain, customDomain].join('|');
    }, [
        scope,
        scopedStoreDetails,
    ]);
    const historyStorageScope = useMemo(() => resolveLocalExportStorageScope(scopedStoreDetails), [
        scopedStoreDetails,
    ]);

    useEffect(() => {
        const nextInitialProjectId = initialProjectId || null;
        if (!nextInitialProjectId || lastInitialProjectIdRef.current === nextInitialProjectId) return;
        lastInitialProjectIdRef.current = nextInitialProjectId;
        setSelectedProjectId(nextInitialProjectId);
    }, [initialProjectId]);

    useEffect(() => {
        let mounted = true;

        async function loadProjects() {
            if (!FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT) {
                setLoading(false);
                return;
            }

            if (!storeRouteKey) {
                setLoading(false);
                return;
            }

            projectDataCacheRef.current = {};
            adviceCacheRef.current = {};
            autoDesignKeyRef.current = '';
            manualSettingsTouchedRef.current = false;
            setProjectData(null);
            setLoadedProjectId(null);
            setHistory([]);
            setDesignAdvice(null);
            setAdviceError(null);
            const result = projectSummaries
                ? { projects: projectSummaries }
                : await getExistingProjectsListWithoutLoader(true);
            if (!mounted) return;
            const list = (result?.projects || [])
                .filter((project) => (!('deleted' in project) || project.deleted !== true) && project.active !== false)
                .map((project) => normalizeProjectOption(storeUrlContext, project));
            setProjects(list);
            setSelectedProjectId((current) => {
                if (current && list.some((project: MenuCardProjectOption) => project.projectId === current)) return current;
                return list.find((project: MenuCardProjectOption) => project.isDefault)?.projectId || list[0]?.projectId || null;
            });
            setLoading(false);
        }

        loadProjects().catch(() => {
            if (mounted) {
                setProjects([]);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [projectSummaries, storeRouteKey, storeUrlContext]);

    const selectedProject = useMemo(
        () => projects.find((project) => project.projectId === selectedProjectId) || projects[0] || null,
        [projects, selectedProjectId],
    );
    const visiblePresets = useMemo(
        () => menuCardPresetRegistry.filter((preset) => preset.exposed && isMenuCardPresetAvailable(preset.id)),
        [],
    );

    useEffect(() => {
        let mounted = true;

        async function loadProject() {
            if (!selectedProject?.projectId) {
                setProjectData(null);
                setLoadedProjectId(null);
                setHistory([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            setProjectData(null);
            setLoadedProjectId(null);
            const cachedProject = projectDataCacheRef.current[selectedProject.projectId];
            if (cachedProject) {
                setProjectData(cachedProject);
                setLoadedProjectId(selectedProject.projectId);
                setHistory(FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY
                    ? listLocalMenuCardExports(selectedProject.projectId, historyStorageScope)
                    : []);
                setLoading(false);
                return;
            }

            const providedProjectData = projectDataById?.[selectedProject.projectId];
            if (providedProjectData) {
                projectDataCacheRef.current[selectedProject.projectId] = providedProjectData;
                setProjectData(providedProjectData);
                setLoadedProjectId(selectedProject.projectId);
                setHistory(FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY
                    ? listLocalMenuCardExports(selectedProject.projectId, historyStorageScope)
                    : []);
                setLoading(false);
                return;
            }

            const data = loadProjectData
                ? await loadProjectData(selectedProject.projectId)
                : await getProjectDataWithoutLoader(selectedProject.projectId);
            if (!mounted) return;
            if (!data) {
                setLoading(false);
                return;
            }
            projectDataCacheRef.current[selectedProject.projectId] = data;
            setProjectData(data);
            setLoadedProjectId(selectedProject.projectId);
            setHistory(FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY
                ? listLocalMenuCardExports(selectedProject.projectId, historyStorageScope)
                : []);
            setLoading(false);
        }

        loadProject().catch(() => {
            if (mounted) {
                setProjectData(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, [historyStorageScope, loadProjectData, projectDataById, selectedProject?.projectId, storeRouteKey]);

    const source = useMemo<MenuCardPrintSource | null>(() => {
        if (!projectData || !selectedProject || !scopedStoreDetails || !scope) return null;
        if (loadedProjectId !== selectedProject.projectId) return null;
        return buildPrintSource({
            project: projectData,
            store: { ...scopedStoreDetails, name: storeName },
            menuUrl: selectedProject.url,
            settings,
        });
    }, [loadedProjectId, projectData, scope, scopedStoreDetails, selectedProject, settings, storeName]);

    const autoDesign = useMemo<MenuCardAutoPrintDesign | null>(() => {
        if (!source) return null;
        return resolveAutoPrintDesign(source, settings.preset);
    }, [settings.preset, source]);

    const businessProfile = useMemo(() => {
        if (!source) return null;
        return resolveMenuCardBusinessPrintProfile({
            businessCategory: source.business.businessCategory,
            catalogKind: source.business.catalogKind,
            offeringKind: source.business.offeringKind,
        });
    }, [source]);

    const autoDesignKey = useMemo(() => {
        if (!source || !selectedProject) return '';
        const itemCount = source.menu.categories.reduce((total, category) => total + category.items.length, 0);
        return [
            selectedProject.projectId,
            settings.preset,
            source.business.businessCategory || '',
            source.business.catalogKind || '',
            source.business.offeringKind || '',
            source.flags.hasDescriptions ? 'desc' : 'no-desc',
            source.flags.hasVariants ? 'variants' : 'no-variants',
            source.flags.hasMissingPrices ? 'missing-prices' : 'priced',
            source.menu.categories.length,
            itemCount,
        ].join('|');
    }, [selectedProject, settings.preset, source]);

    useEffect(() => {
        if (!autoDesign || !autoDesignKey || manualSettingsTouchedRef.current) return;
        if (autoDesignKeyRef.current === autoDesignKey) return;
        autoDesignKeyRef.current = autoDesignKey;
        setSettings((current) => ({
            ...current,
            density: autoDesign.settings.density,
            includeContactBlock: autoDesign.settings.includeContactBlock,
            includeDescriptions: autoDesign.settings.includeDescriptions,
            includeQr: autoDesign.settings.includeQr,
            styleId: autoDesign.settings.styleId,
        }));
    }, [autoDesign, autoDesignKey]);

    const preview = useMemo(() => {
        if (!source) return null;
        return renderPreviewModel(source, settings, overrides);
    }, [source, settings, overrides]);

    const sourceHash = useMemo(() => {
        if (!source) return '';
        return buildPrintSourceHash(source, settings, overrides);
    }, [source, settings, overrides]);
    currentArtifactScopeRef.current = `${storeRouteKey}:${selectedProject?.projectId || ''}:${sourceHash}`;
    currentAdviceSourceHashRef.current = sourceHash;

    const reusableExport = useMemo(
        () => FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY ? findReusableExport(history, sourceHash) : null,
        [history, sourceHash],
    );

    const blockers = useMemo(
        () => preview?.preflight.warnings.filter((warning) => warning.severity === 'blocker') || [],
        [preview],
    );
    const warnings = useMemo(
        () => preview?.preflight.warnings.filter((warning) => warning.severity !== 'blocker') || [],
        [preview],
    );

    useEffect(() => {
        setDesignAdvice(null);
        setAdviceError(null);
        setAdviceLoading(false);
    }, [sourceHash, selectedProject?.projectId]);

    useEffect(() => {
        setRendering(false);
    }, [storeRouteKey]);

    const updatePreset = useCallback((preset: MenuCardExportPreset) => {
        if (!isMenuCardPresetAvailable(preset)) return;
        autoDesignKeyRef.current = '';
        manualSettingsTouchedRef.current = false;
        setSettings((current) => makeSettings(preset, current.styleId));
    }, []);

    const updateStyle = useCallback((styleId: string) => {
        manualSettingsTouchedRef.current = true;
        setSettings((current) => ({ ...current, styleId }));
    }, []);

    const updateDensity = useCallback((density: MenuCardExportSettings['density']) => {
        manualSettingsTouchedRef.current = true;
        setSettings((current) => ({ ...current, density }));
    }, []);

    const updateToggle = useCallback((key: keyof MenuCardExportSettings, value: boolean) => {
        manualSettingsTouchedRef.current = true;
        setSettings((current) => ({ ...current, [key]: value }));
    }, []);

    const selectProject = useCallback((projectId: string) => {
        autoDesignKeyRef.current = '';
        manualSettingsTouchedRef.current = false;
        setSelectedProjectId(projectId);
    }, []);

    const buildDesignAdvisorPayload = useCallback((): MenuCardDesignAdvisorRequest | null => {
        if (!source || !preview || !selectedProject || !sourceHash) return null;
        if (
            !isMenuCardAdvisorPreset(settings.preset)
            || !isMenuCardAdvisorStyle(settings.styleId)
            || !isMenuCardAdvisorDensity(settings.density)
        ) return null;
        const itemCount = source.menu.categories.reduce((total, category) => total + category.items.length, 0);

        return {
            projectId: selectedProject.projectId,
            sourceHash,
            currentSettings: {
                preset: settings.preset,
                styleId: settings.styleId,
                density: settings.density,
                includeDescriptions: settings.includeDescriptions,
                includeQr: settings.includeQr,
                includeContactBlock: settings.includeContactBlock,
            },
            sourceSummary: {
                businessName: source.business.name,
                menuTitle: source.menu.title,
                categoryCount: source.menu.categories.length,
                itemCount,
                pageCount: preview.plan.pageCount,
                autoDesignLabel: autoDesign?.label,
                autoDesignReason: autoDesign?.reason,
                businessCategory: source.business.businessCategory,
                businessProfile: businessProfile?.documentLabel,
                offeringKind: source.business.offeringKind,
                hasDescriptions: source.flags.hasDescriptions,
                hasVariants: source.flags.hasVariants,
                hasDietaryTags: source.flags.hasDietaryTags,
                hasMissingPrices: source.flags.hasMissingPrices,
                categoryNames: source.menu.categories.map((category) => category.name).filter(Boolean).slice(0, 20),
            },
            preflightWarnings: preview.preflight.warnings.map((warning) => ({
                code: warning.code,
                severity: warning.severity,
                message: warning.message,
            })).slice(0, 20),
        };
    }, [autoDesign, businessProfile, preview, selectedProject, settings, source, sourceHash]);

    const requestDesignAdvice = useCallback(async () => {
        if (!FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_AI_ADVISOR) {
            setAdviceError('Layout suggestions are not enabled.');
            return;
        }

        const payload = buildDesignAdvisorPayload();
        if (!payload || adviceInFlightRef.current) return;
        const requestSourceHash = payload.sourceHash;

        const cached = adviceCacheRef.current[payload.sourceHash];
        if (cached) {
            setDesignAdvice(cached);
            setAdviceError(null);
            return;
        }

        adviceInFlightRef.current = true;
        setAdviceLoading(true);
        setAdviceError(null);
        try {
            const response = await getMenuCardDesignAdviceViaAPI(payload);
            if (currentAdviceSourceHashRef.current !== requestSourceHash) return;
            if (!response?.recommendation) {
                setAdviceError('Could not prepare a layout suggestion.');
                return;
            }
            adviceCacheRef.current[payload.sourceHash] = response.recommendation;
            setDesignAdvice(response.recommendation);
            notify?.({ content: 'Layout suggestion ready', type: 'success' });
        } catch (error) {
            if (currentAdviceSourceHashRef.current !== requestSourceHash) return;
            if (error instanceof MenuCardDesignAdvisorPlanError) {
                setAdviceError(MENU_CARD_ADVICE_PLAN_REQUIRED_MESSAGE);
                return;
            }
            if (error instanceof AICapacityError) {
                setAdviceError(MENU_CARD_ADVICE_CAPACITY_MESSAGE);
                return;
            }
            setAdviceError('Could not prepare a layout suggestion.');
        } finally {
            adviceInFlightRef.current = false;
            if (currentAdviceSourceHashRef.current === requestSourceHash) setAdviceLoading(false);
        }
    }, [buildDesignAdvisorPayload, notify]);

    const applyDesignAdvice = useCallback(() => {
        if (!designAdvice) return;
        const preset = isMenuCardPresetAvailable(designAdvice.preset) ? designAdvice.preset : 'home_print';
        manualSettingsTouchedRef.current = true;
        setSettings({
            ...makeSettings(preset, designAdvice.styleId),
            density: designAdvice.density,
            includeDescriptions: designAdvice.includeDescriptions,
            includeQr: designAdvice.includeQr,
            includeContactBlock: designAdvice.includeContactBlock,
        });
        notify?.({ content: 'Layout suggestion applied', type: 'success' });
    }, [designAdvice, notify]);

    const createArtifact = useCallback(async (share = false) => {
        if (!source || !selectedProject || artifactInFlightRef.current) return false;
        if (!isMenuCardPresetAvailable(settings.preset)) {
            notify?.({ content: 'This export option is not enabled', type: 'error' });
            return false;
        }
        if (preview?.preflight.status === 'blocked') {
            notify?.({ content: 'Fix the blocking warning before export', type: 'error' });
            return false;
        }

        const operationScope = currentArtifactScopeRef.current;
        artifactInFlightRef.current = true;
        setRendering(true);
        try {
            const artifact = settings.preset === 'print_shop_packet'
                ? await buildPrintShopPacket(source, settings, overrides)
                : await renderPdf(source, settings, overrides);
            if (currentArtifactScopeRef.current !== operationScope) return false;

            let delivery: 'downloaded' | 'shared' = 'downloaded';
            if (share) {
                const shareResult = await shareMenuCardArtifact(artifact, 'Menu file');
                if (shareResult === 'cancelled') {
                    notify?.({ content: 'Share cancelled', type: 'info' });
                    return false;
                }
                if (shareResult === 'shared') {
                    delivery = 'shared';
                } else {
                    downloadMenuCardArtifact(artifact);
                }
            } else {
                downloadMenuCardArtifact(artifact);
            }

            if (FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY) {
                const nextHistory = saveLocalMenuCardExport({
                    projectId: selectedProject.projectId,
                    projectName: resolveMenuCardProjectName(selectedProject.name, 'Menu'),
                    storeName,
                    preset: settings.preset,
                    storageScope: historyStorageScope,
                    styleId: settings.styleId,
                    artifact,
                });
                setHistory(nextHistory);
            }

            notify?.({
                content: settings.preset === 'print_shop_packet'
                    ? `Print-shop packet ${delivery}`
                    : `PDF ${delivery}`,
                type: 'success',
            });
            return true;
        } catch {
            notify?.({ content: share ? 'Could not share file' : 'Could not create file', type: 'error' });
            return false;
        } finally {
            artifactInFlightRef.current = false;
            if (currentArtifactScopeRef.current === operationScope) setRendering(false);
        }
    }, [historyStorageScope, notify, overrides, preview?.preflight.status, selectedProject, settings, source, storeName]);

    return {
        adviceError,
        adviceLoading,
        applyDesignAdvice,
        autoDesign,
        businessProfile,
        blockers,
        createArtifact,
        designAdvice,
        history,
        isAiAdvisorEnabled: FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_AI_ADVISOR,
        isEnabled: FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT,
        isHistoryEnabled: FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY,
        loading,
        projects,
        rendering,
        requestDesignAdvice,
        reusableExport,
        selectProject,
        selectedProject,
        selectedProjectId,
        settings,
        source,
        sourceHash,
        storeName,
        templates: exposedMenuCardTemplates,
        updateDensity,
        updatePreset,
        updateStyle,
        updateToggle,
        visiblePresets,
        warnings,
        preview,
        getFreshnessState,
    };
}
