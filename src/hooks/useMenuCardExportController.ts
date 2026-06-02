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
import type { MenuCardDesignAdvisorRecommendation } from '@lib/menu-card-export/ai/designAdvisor';
import type { MenuCardDesignAdvisorRequest } from '@lib/validation/apiSchemas';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { AICapacityError } from '@services/ai/capacityError';
import getMenuCardDesignAdviceViaAPI, { MenuCardDesignAdvisorPlanError } from '@services/ai/menuCardExport/getDesignAdviceViaAPI';
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
    notify?: (notice: MenuCardExportNotice) => void;
};

export function resolveMenuCardProjectName(
    name: string | Record<string, string> | undefined,
    fallback = 'Menu',
): string {
    return getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback);
}

function buildMenuUrl(storeDetails: any, project: MenuCardProjectOption): string {
    return generateProjectUrl(
        storeDetails?.subdomain || '',
        storeDetails?.customDomain,
        resolveMenuCardProjectName(project.name, 'Menu'),
        false,
    );
}

function makeSettings(preset: MenuCardExportPreset, styleId: string): MenuCardExportSettings {
    return buildDefaultSettings(preset, styleId);
}

export function isMenuCardPresetAvailable(preset: MenuCardExportPreset): boolean {
    if (preset === 'print_shop_packet') {
        return FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_PRINT_SHOP;
    }
    return true;
}

export default function useMenuCardExportController({
    initialProjectId = null,
    notify,
}: UseMenuCardExportControllerOptions = {}) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [projects, setProjects] = useState<MenuCardProjectOption[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
    const [projectData, setProjectData] = useState<any | null>(null);
    const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [rendering, setRendering] = useState(false);
    const [history, setHistory] = useState<MenuCardLocalHistoryRecord[]>([]);
    const [settings, setSettings] = useState<MenuCardExportSettings>(() => makeSettings('home_print', 'classic'));
    const [overrides] = useState<MenuCardSafeOverrides>({});
    const autoDesignKeyRef = useRef('');
    const manualSettingsTouchedRef = useRef(false);
    const projectDataCacheRef = useRef<Record<string, any>>({});
    const adviceCacheRef = useRef<Record<string, MenuCardDesignAdvisorRecommendation>>({});
    const [designAdvice, setDesignAdvice] = useState<MenuCardDesignAdvisorRecommendation | null>(null);
    const [adviceLoading, setAdviceLoading] = useState(false);
    const [adviceError, setAdviceError] = useState<string | null>(null);

    const storeName = useMemo(() => getStoreContextName(storeDetails as any, 'Your Business'), [storeDetails]);
    const storeUrlContext = useMemo(() => ({
        subdomain: (storeDetails as any)?.subdomain || '',
        customDomain: (storeDetails as any)?.customDomain,
    }), [(storeDetails as any)?.subdomain, (storeDetails as any)?.customDomain]);
    const storeRouteKey = useMemo(() => {
        if (!storeDetails) return '';
        const tenantId = (storeDetails as any)?.tenantId || (storeDetails as any)?.tId || '';
        const storeId = (storeDetails as any)?.storeId || (storeDetails as any)?.sId || '';
        const subdomain = (storeDetails as any)?.subdomain || '';
        const customDomain = (storeDetails as any)?.customDomain || '';
        if (!tenantId && !storeId && !subdomain && !customDomain) return '';
        return [tenantId, storeId, subdomain, customDomain].join('|');
    }, [
        (storeDetails as any)?.tenantId,
        (storeDetails as any)?.tId,
        (storeDetails as any)?.storeId,
        (storeDetails as any)?.sId,
        (storeDetails as any)?.subdomain,
        (storeDetails as any)?.customDomain,
    ]);

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
            const result = await getExistingProjectsListWithoutLoader(true);
            if (!mounted) return;
            const list = (result?.projects || [])
                .filter((project: any) => project.deleted !== true && project.active !== false)
                .map((project: any) => ({
                    projectId: project.projectId,
                    name: project.name,
                    isDefault: project.isDefault,
                    active: project.active,
                    deleted: project.deleted,
                    isSpecialMenu: project.isSpecialMenu,
                    projectImage: project.projectImage || null,
                    specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                    specialMenuEndsAt: project.specialMenuEndsAt,
                    specialMenuStatus: project.specialMenuStatus,
                    url: buildMenuUrl(storeUrlContext, project),
                }));
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
    }, [storeRouteKey, storeUrlContext]);

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
                    ? listLocalMenuCardExports(selectedProject.projectId)
                    : []);
                setLoading(false);
                return;
            }

            const data = await getProjectDataWithoutLoader(selectedProject.projectId);
            if (!mounted) return;
            projectDataCacheRef.current[selectedProject.projectId] = data;
            setProjectData(data);
            setLoadedProjectId(selectedProject.projectId);
            setHistory(FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY
                ? listLocalMenuCardExports(selectedProject.projectId)
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
    }, [selectedProject?.projectId]);

    const source = useMemo<MenuCardPrintSource | null>(() => {
        if (!projectData || !selectedProject || !storeDetails) return null;
        if (loadedProjectId !== selectedProject.projectId) return null;
        return buildPrintSource({
            project: projectData,
            store: { ...storeDetails, name: storeName },
            menuUrl: selectedProject.url,
            settings,
        });
    }, [loadedProjectId, projectData, selectedProject, settings, storeDetails, storeName]);

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
    }, [sourceHash, selectedProject?.projectId]);

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
        const itemCount = source.menu.categories.reduce((total, category) => total + category.items.length, 0);

        return {
            projectId: selectedProject.projectId,
            sourceHash,
            currentSettings: {
                preset: settings.preset as any,
                styleId: settings.styleId as any,
                density: settings.density as any,
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
        if (!payload) return;

        const cached = adviceCacheRef.current[payload.sourceHash];
        if (cached) {
            setDesignAdvice(cached);
            setAdviceError(null);
            return;
        }

        setAdviceLoading(true);
        setAdviceError(null);
        try {
            const response = await getMenuCardDesignAdviceViaAPI(payload);
            if (!response?.recommendation) {
                setAdviceError('Could not prepare a layout suggestion.');
                return;
            }
            adviceCacheRef.current[payload.sourceHash] = response.recommendation;
            setDesignAdvice(response.recommendation);
            notify?.({ content: 'Layout suggestion ready', type: 'success' });
        } catch (error) {
            if (error instanceof MenuCardDesignAdvisorPlanError) {
                setAdviceError(error.message);
                return;
            }
            if (error instanceof AICapacityError) {
                setAdviceError(error.message);
                return;
            }
            setAdviceError('Could not prepare a layout suggestion.');
        } finally {
            setAdviceLoading(false);
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
        if (!source || !selectedProject) return false;
        if (!isMenuCardPresetAvailable(settings.preset)) {
            notify?.({ content: 'This export option is not enabled', type: 'error' });
            return false;
        }
        if (preview?.preflight.status === 'blocked') {
            notify?.({ content: 'Fix the blocking warning before export', type: 'error' });
            return false;
        }

        setRendering(true);
        try {
            const artifact = settings.preset === 'print_shop_packet'
                ? await buildPrintShopPacket(source, settings, overrides)
                : await renderPdf(source, settings, overrides);

            if (share) {
                const shared = await shareMenuCardArtifact(artifact as any, 'Menu file');
                if (!shared) downloadMenuCardArtifact(artifact as any);
            } else {
                downloadMenuCardArtifact(artifact as any);
            }

            if (FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_HISTORY) {
                const nextHistory = saveLocalMenuCardExport({
                    projectId: selectedProject.projectId,
                    projectName: resolveMenuCardProjectName(selectedProject.name, 'Menu'),
                    storeName,
                    preset: settings.preset,
                    styleId: settings.styleId,
                    artifact: artifact as any,
                });
                setHistory(nextHistory);
            }

            notify?.({
                content: settings.preset === 'print_shop_packet' ? 'Print-shop packet created' : 'PDF created',
                type: 'success',
            });
            return true;
        } catch {
            notify?.({ content: 'Could not create file', type: 'error' });
            return false;
        } finally {
            setRendering(false);
        }
    }, [notify, overrides, preview?.preflight.status, selectedProject, settings, source, storeName]);

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
