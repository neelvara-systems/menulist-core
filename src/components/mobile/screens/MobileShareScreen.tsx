'use client'

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { getScreenState } from '@database/campaigns';
import { recordStarterActivationSignal } from '@database/stores';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { trackMenuKitDownload } from '@lib/analytics/unified';
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { downloadBlob, generateMenuKit, generateMenuKitAsset, type MenuKitAssetKey, shareBlob } from '@lib/menu-kit/menuKitGenerator';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { PRINTABLE_ASSET_TYPES, getPrintableAssetType } from '@lib/printable-asset-templates/assetTypes';
import { renderPrintableAsset } from '@lib/printable-asset-templates/renderPrintableAsset';
import {
    DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID,
    getPrintableTemplateFamiliesForAsset,
    getPrintableTemplateFamily,
} from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableAssetOutputFormat, PrintableAssetRenderInput, PrintableAssetType, PrintableAssetTypeId, PrintableTemplateFamily, PrintableTemplateFamilyId } from '@lib/printable-asset-templates/types';
import {
    PRINT_ASSET_REPRINT_GUIDANCE,
    buildPrintReadinessItems,
    buildPrintShopHandoffMessage,
    type PrintReadinessItem,
} from '@lib/print-assets/ownerPrintGuidance';
import {
    STARTER_ACTIVATION_SIGNALS,
    isStarterActivationSignal,
    shouldRecordStarterActivationSignal,
    type StarterActivationSignal,
} from '@lib/onboarding/starterActivation';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import { buildScreenUrl } from '@lib/screen/utils';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import PrintableTemplatePreview from '@/components/shared/printableAssets/PrintableTemplatePreview';
import { buildExportDataFromProject, downloadMenuData } from '@template/main-app/projects/utils/excelUtils';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuBookOpen,
    LuCheck,
    LuClipboard,
    LuCopy,
    LuDownload,
    LuEye,
    LuExternalLink,
    LuFileJson,
    LuFileText,
    LuImage,
    LuLink2,
    LuMapPin,
    LuMessageSquare,
    LuMonitor,
    LuPackage,
    LuPlaySquare,
    LuPrinter,
    LuQrCode,
    LuSheet,
    LuShare2,
    LuShield,
    LuSmartphone,
    LuX,
} from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobileLinkCard from '../components/MobileLinkCard';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';
import useViewportInfo from '../../../hooks/useViewportInfo';

type ProjectLink = {
    active?: boolean;
    deleted?: boolean;
    feedbackUrl: string;
    isDefault: boolean;
    isSpecialMenu?: boolean;
    name: string | Record<string, string>;
    projectImage?: string | null;
    projectId: string;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
};

type ShareData = {
    allProjects: ProjectLink[];
    businessType: string;
    feedbackLink: string;
    feedbackQrLink: string;
    hasFeedbackEnabled: boolean;
    hasPosSync: boolean;
    hasPublishedMenu: boolean;
    installAppLink: string | null;
    menuLink: string;
    menuModifiedOn?: unknown;
    obpLink: string;
    posSyncStatus: string | null;
    projectId: string | null;
    projectName: string | null;
    storeLogo?: string | null;
    storeMenuLink: string;
    storeName: string;
};

type ScreenLinksState = {
    highlightsLink: string | null;
    isLoading: boolean;
    menuBoardLink: string | null;
};

type OutletQrLink = {
    label: string;
    storeId: string | number;
    url: string;
};

type GuideKey = 'setup' | 'printing' | 'sharing';

type QrSheetState = {
    filename: string;
    helperText: string;
    starterSignal?: StarterActivationSignal;
    title: string;
    url: string;
};

type PreviewAssetState = {
    blob: Blob;
    filename: string;
    outputFormat: PrintableAssetOutputFormat;
    title: string;
    url: string;
};

type DownloadAssetKey =
    | 'export_json'
    | 'export_xlsx'
    | 'menu_pdf'
    | 'menu_kit'
    | 'table_tent'
    | 'single_table_card'
    | 'counter_sticker'
    | 'entrance_poster'
    | 'feedback_qr'
    | 'instagram_story'
    | 'whatsapp_status'
    | 'google_maps';

interface MobileShareScreenProps {
    mode?: 'full' | 'printAssets';
    onBack?: () => void;
    onOpenDigitalScreens?: () => void;
    onOpenDesignEditor?: () => void;
    onOpenPosSync?: () => void;
    onOpenPrintAssets?: () => void;
    onOpenPrintMenu?: () => void;
}

export default function MobileShareScreen({
    mode = 'full',
    onBack,
    onOpenDigitalScreens,
    onOpenDesignEditor,
    onOpenPosSync,
    onOpenPrintAssets,
    onOpenPrintMenu,
}: MobileShareScreenProps) {
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const { isMasterUser, storeDetails, tenantDetails, userPermissions } = useContext(PlatformGlobalDataContext);
    const t = useTranslations('MobileShare');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const labels = useOfferingLabels();
    const {
        isLoading: loadingProjects,
        projectsList,
        refreshCachedProject,
        selectedProject,
        selectedProjectId,
        selectProject,
    } = useMobileProjects();
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [qrSheet, setQrSheet] = useState<QrSheetState | null>(null);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const [activeGuide, setActiveGuide] = useState<GuideKey | null>(null);
    const [generatingDownload, setGeneratingDownload] = useState<DownloadAssetKey | null>(null);
    const [previewAsset, setPreviewAsset] = useState<PreviewAssetState | null>(null);
    const [selectedPrintableAssetId, setSelectedPrintableAssetId] = useState<PrintableAssetTypeId>('single_table_card');
    const [printableActionTemplateId, setPrintableActionTemplateId] = useState<PrintableTemplateFamilyId | null>(null);
    const [printableBusyKey, setPrintableBusyKey] = useState<string | null>(null);
    const [printablePreviewState, setPrintablePreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const isPrintAssetsMode = mode === 'printAssets';
    const [screenLinks, setScreenLinks] = useState<ScreenLinksState>({
        highlightsLink: null,
        isLoading: false,
        menuBoardLink: null,
    });
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);
    const recordedStarterSignalsRef = useRef(new Set<StarterActivationSignal>());
    const resolveProjectName = useCallback(
        (name: string | Record<string, string> | undefined, fallback?: string) =>
            getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback || tProjectSelector('untitled')),
        [tProjectSelector]
    );
    const storeDisplayName = useMemo(
        () => getStoreContextName(storeDetails as any, t('yourBusiness')),
        [storeDetails, t]
    );
    const storeBrandColor = useMemo(
        () => resolveStoreBrandColor(storeDetails as any),
        [storeDetails],
    );
    const canManageSharing = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU]);
    const canManageIntegrations = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_INTEGRATIONS]);

    const data = useMemo<ShareData | null>(() => {
        if (!storeDetails) return null;

        const projects = projectsList;
        const defaultProject = projects.find((project: any) => project.projectId === selectedProjectId) || null;

        if (!defaultProject) {
            return null;
        }

        const subdomain = storeDetails.subdomain || '';
        const customDomain = storeDetails.customDomain;
        const obpLink = generateOBPUrl(subdomain, customDomain);
        const storeMenuLink = `${obpLink.replace(/\/$/, '')}/menu`;
        const installAppLink =
            FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
            && (storeDetails as any).pwaSettings?.enableInstallableApp !== false
                ? `${obpLink.replace(/\/$/, '')}/?pwa=install`
                : null;
        const menuLink = generateProjectUrl(
            subdomain,
            customDomain,
            resolveProjectName(defaultProject.name, labels.offeringTitle),
            false
        );

        const allProjects: ProjectLink[] = projects.map((project: any) => ({
            active: project.active !== false,
            deleted: project.deleted === true,
            feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId, 'direct_link', obpLink) : '',
            isDefault: project.isDefault || false,
            name: project.name,
            projectImage: project.projectImage || null,
            projectId: project.projectId,
            url: generateProjectUrl(subdomain, customDomain, resolveProjectName(project.name, labels.offeringTitle), false),
        }));

        const posSync = storeDetails.posSync;
        const hasPosSync = FEATURE_FLAGS.ENABLE_POS_SYNC && !!posSync?.enabled;
        const hasPublishedMenu = projects.some((project: any) => project.deleted !== true && project.active !== false);

        return {
            allProjects,
            businessType: storeDetails.businessType || '',
            feedbackLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'direct_link', obpLink) : '',
            feedbackQrLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'feedback_qr', obpLink) : '',
            hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
            hasPosSync,
            hasPublishedMenu,
            installAppLink,
            menuLink,
            menuModifiedOn: defaultProject.modifiedOn || null,
            obpLink,
            posSyncStatus: hasPosSync ? (posSync?.status || 'disabled') : null,
            projectId: defaultProject.projectId || null,
            projectName: resolveProjectName(defaultProject.name, labels.offeringTitle),
            storeLogo: storeDetails.logo || null,
            storeMenuLink,
            storeName: storeDisplayName,
        };
    }, [labels.offeringTitle, projectsList, resolveProjectName, selectedProjectId, storeDetails, storeDisplayName, t]);

    useEffect(() => {
        if (!storeDetails?.storeId || !data?.obpLink) {
            setScreenLinks({ highlightsLink: null, isLoading: false, menuBoardLink: null });
            return;
        }

        let cancelled = false;
        setScreenLinks((current) => ({ ...current, isLoading: true }));

        const loadScreenLinks = async () => {
            try {
                const state = await getScreenState();
                if (cancelled) return;
                const menuBoardLink = state?.screenToken ? buildScreenUrl(state.screenToken, data.obpLink) : null;
                setScreenLinks({
                    highlightsLink: menuBoardLink ? `${menuBoardLink}?mode=highlights` : null,
                    isLoading: false,
                    menuBoardLink,
                });
            } catch {
                if (!cancelled) {
                    setScreenLinks({ highlightsLink: null, isLoading: false, menuBoardLink: null });
                }
            }
        };

        void loadScreenLinks();

        return () => {
            cancelled = true;
        };
    }, [data?.obpLink, storeDetails?.storeId]);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    useEffect(() => {
        return () => {
            if (previewAsset?.url) URL.revokeObjectURL(previewAsset.url);
        };
    }, [previewAsset?.url]);

    useEffect(() => {
        const existingSignals = Object.keys(storeDetails?.starterActivationSignals?.actions || {})
            .filter(isStarterActivationSignal);
        recordedStarterSignalsRef.current = new Set(existingSignals);
    }, [storeDetails?.storeId, storeDetails?.starterActivationSignals?.lastSignalAt]);

    const activeProject = useMemo(
        () => data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null,
        [data]
    );
    const selectedPrintableAsset = useMemo(
        () => getPrintableAssetType(selectedPrintableAssetId),
        [selectedPrintableAssetId],
    );
    const selectedPrintableActionFormats = useMemo(
        () => getMobilePrintableActionFormats(selectedPrintableAsset),
        [selectedPrintableAsset],
    );
    const availablePrintableTemplateFamilies = useMemo(
        () => getPrintableTemplateFamiliesForAsset(selectedPrintableAssetId),
        [selectedPrintableAssetId],
    );
    const printableActionTemplate = useMemo(
        () => printableActionTemplateId ? getPrintableTemplateFamily(printableActionTemplateId) : null,
        [printableActionTemplateId],
    );

    const outletQrLinks = useMemo<OutletQrLink[]>(() => {
        if (!data?.obpLink || !isMasterUser) return [];
        const outlets = (tenantDetails?.storesList || [])
            .filter((store: any) => store && !store.isMaster && store.active !== false && store.outletSlug);
        const tenantBase = data.obpLink.replace(/\/$/, '');
        return outlets.map((outlet: any) => ({
            label: outlet.name || outlet.outletSlug,
            storeId: outlet.storeId || outlet.outletSlug,
            url: `${tenantBase}/${outlet.outletSlug}/menu`,
        }));
    }, [data?.obpLink, isMasterUser, tenantDetails?.storesList]);

    const printReadinessItems = useMemo(() => {
        if (!data) return [];
        const shortMenuLink = data.menuLink.replace(/^https?:\/\//, '');
        return buildPrintReadinessItems({
            hasFeedbackEnabled: data.hasFeedbackEnabled,
            menuLink: data.menuLink,
            shortMenuLink,
            storeData: storeDetails as any,
            storeLogo: data.storeLogo,
            storeName: data.storeName,
        });
    }, [data, storeDetails]);

    const printShopMessage = useMemo(() => {
        if (!data) return '';
        const shortMenuLink = data.menuLink.replace(/^https?:\/\//, '');
        return buildPrintShopHandoffMessage({
            hasFeedbackEnabled: data.hasFeedbackEnabled,
            menuLink: data.menuLink,
            shortMenuLink,
            storeData: storeDetails as any,
            storeLogo: data.storeLogo,
            storeName: data.storeName,
        });
    }, [data, storeDetails]);

    const exportFilenameBase = useMemo(() => {
        const source = data?.projectName || data?.storeName || 'menu_data';
        return source.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().replace(/\s+/g, '_') || 'menu_data';
    }, [data?.projectName, data?.storeName]);

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr' | 'share') => (
        withAnalyticsSource(
            url,
            src === 'copy' ? 'copy_link' : src === 'share' ? 'native_share' : src,
        )
    );

    const openInternalLink = (url: string) => {
        if (!url) return;
        window.location.assign(url);
    };

    const recordStarterSignal = useCallback((signal?: StarterActivationSignal) => {
        if (!signal || !storeDetails?.storeId || !shouldRecordStarterActivationSignal(storeDetails)) return;
        if (recordedStarterSignalsRef.current.has(signal)) return;

        recordedStarterSignalsRef.current.add(signal);
        recordStarterActivationSignal(storeDetails.storeId, signal).catch(() => {
            recordedStarterSignalsRef.current.delete(signal);
        });
    }, [storeDetails]);

    const handleCopy = async (value: string, label: string, starterSignal?: StarterActivationSignal) => {
        try {
            await navigator.clipboard.writeText(value);
            Toast.show({ content: t('copiedLabel', { label }), duration: 1200 });
            recordStarterSignal(starterSignal);
        } catch {
            Toast.show({ content: t('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    };

    const handleOpenQr = (qrConfig: QrSheetState) => {
        setQrSheet(qrConfig);
        setIsQrSheetOpen(true);
    };

    const getSelectedProjectData = useCallback(async () => {
        if (!data?.projectId) return null;
        if (selectedProjectId === data.projectId && selectedProject) return selectedProject;
        return refreshCachedProject(data.projectId, { showLoader: false });
    }, [data?.projectId, refreshCachedProject, selectedProject, selectedProjectId]);

    const getSelectedProjectExportData = useCallback(async () => {
        const projectData = await getSelectedProjectData();
        if (!projectData) {
            return { categories: [], items: [], languages: [] };
        }

        const extractedData = (projectData as any)?.extractedData || {};
        let items = Array.isArray(extractedData.items) ? extractedData.items : [];
        let categories = Array.isArray(extractedData.categories) ? extractedData.categories : [];
        let languages = Array.isArray((projectData as any)?.languages) ? (projectData as any).languages : [];

        if (items.length === 0 && categories.length === 0 && Array.isArray((projectData as any)?.files)) {
            const fileExportData = buildExportDataFromProject(projectData as any);
            items = fileExportData.items;
            categories = fileExportData.categories;
            languages = fileExportData.languages;
        }

        const fallbackLanguage =
            (projectData as any)?.defaultLanguage ||
            storeDetails?.defaultLanguage ||
            storeDetails?.activeLanguages?.[0] ||
            storeDetails?.language ||
            'en';

        if (languages.length === 0 && fallbackLanguage) {
            languages = [fallbackLanguage];
        }

        return { categories, items, languages };
    }, [getSelectedProjectData, storeDetails?.activeLanguages, storeDetails?.defaultLanguage, storeDetails?.language]);

    const parseTimestamp = (value: unknown): Date | undefined => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (typeof value === 'number') return new Date(value);
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? undefined : new Date(parsed);
        }
        if (typeof value === 'object') {
            const record = value as {
                seconds?: number;
                toDate?: () => Date;
                toMillis?: () => number;
            };
            if (typeof record.toDate === 'function') return record.toDate();
            if (typeof record.toMillis === 'function') return new Date(record.toMillis());
            if (typeof record.seconds === 'number') return new Date(record.seconds * 1000);
        }
        return undefined;
    };

    const buildMenuKitInput = () => {
        if (!data) return null;
        return {
            businessType: data.businessType,
            businessCategory: storeDetails?.businessCategory,
            activePlanType: (storeDetails as any)?.activePlanType,
            brandColor: storeBrandColor,
            lastPublishedAt: parseTimestamp(data.menuModifiedOn),
            logoUrl: data.storeLogo || undefined,
            menuUrl: data.menuLink,
            shortLink: data.menuLink.replace(/^https?:\/\//, ''),
            storeName: data.storeName,
            templateFamilyId: DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID,
        };
    };

    const buildPrintableRenderInput = async (
        assetTypeId: PrintableAssetTypeId,
        templateFamilyId: PrintableTemplateFamilyId,
    ): Promise<PrintableAssetRenderInput | null> => {
        if (!data) return null;

        const baseInput: PrintableAssetRenderInput = {
            activePlanType: (storeDetails as any)?.activePlanType,
            assetTypeId,
            brandColor: storeBrandColor,
            businessCategory: (storeDetails as any)?.businessCategory,
            businessType: (storeDetails as any)?.businessType || data.businessType,
            feedbackUrl: data.feedbackQrLink,
            lastPublishedAt: parseTimestamp(data.menuModifiedOn),
            logoUrl: data.storeLogo || undefined,
            menuUrl: data.menuLink,
            obpBaseUrl: data.obpLink,
            projectId: data.projectId,
            shortLink: data.menuLink.replace(/^https?:\/\//, ''),
            storeName: data.storeName,
            templateFamilyId,
        };

        if (assetTypeId !== 'print_menu') return baseInput;

        const projectData = await getSelectedProjectData();
        const exportData = await getSelectedProjectExportData();
        const items = exportData.items.filter((item: any) => item.active !== false);
        if (items.length === 0) {
            Toast.show({ content: t('noMenuItems'), duration: 1500 });
            return null;
        }

        const language =
            (projectData as any)?.defaultLanguage ||
            exportData.languages[0] ||
            storeDetails?.defaultLanguage ||
            storeDetails?.activeLanguages?.[0] ||
            storeDetails?.language ||
            'en';

        return {
            ...baseInput,
            printMenuOptions: {
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                businessCategory: (storeDetails as any)?.businessCategory,
                businessType: (storeDetails as any)?.businessType || data.businessType,
                categories: exportData.categories,
                currency: storeDetails?.currencySymbol || '',
                currencyCode: (storeDetails as any)?.currencyCode || (storeDetails as any)?.currency || undefined,
                items,
                language,
                logoUrl: data.storeLogo || (storeDetails as any)?.logo || undefined,
                menuUrl: data.menuLink,
                projectData: projectData as any,
                projectId: data.projectId || undefined,
                projectName: data.projectName || labels.offeringTitle,
                showDescriptions: true,
                storeData: storeDetails as any,
                storeName: data.storeName,
            },
        };
    };

    const closePrintableTemplateActions = () => {
        setPrintableActionTemplateId(null);
        setPreviewAsset(null);
        setPrintablePreviewState('idle');
    };

    const renderPrintableTemplatePreview = async (templateFamilyId: PrintableTemplateFamilyId) => {
        if (!data) return;

        const assetType = selectedPrintableAsset;
        if (assetType.requiresFeedback && !data.hasFeedbackEnabled) {
            setPrintablePreviewState('idle');
            return;
        }

        const previewFormat = getMobilePrintablePreviewFormat(assetType);
        setPreviewAsset(null);
        if (!previewFormat) {
            setPrintablePreviewState('ready');
            return;
        }

        const busyKey = `preview:${selectedPrintableAssetId}:${templateFamilyId}:${previewFormat}`;
        setPrintableBusyKey(busyKey);
        setPrintablePreviewState('loading');
        try {
            const input = await buildPrintableRenderInput(selectedPrintableAssetId, templateFamilyId);
            if (!input) {
                setPrintablePreviewState('idle');
                return;
            }
            const result = await renderPrintableAsset({ ...input, outputFormat: previewFormat });
            const previewBlob = new Blob([result.blob], { type: result.mimeType });
            const previewUrl = URL.createObjectURL(previewBlob);
            setPreviewAsset({
                blob: result.blob,
                filename: result.filename,
                outputFormat: result.outputFormat,
                title: `${assetType.title} - ${getPrintableTemplateFamily(templateFamilyId).label}`,
                url: previewUrl,
            });
            setPrintablePreviewState('ready');
        } catch {
            setPrintablePreviewState('error');
        } finally {
            setPrintableBusyKey(null);
        }
    };

    const openPrintableTemplateActions = (templateFamilyId: PrintableTemplateFamilyId) => {
        setPrintableActionTemplateId(templateFamilyId);
        void renderPrintableTemplatePreview(templateFamilyId);
    };

    const handlePrintableAssetRender = async (templateFamilyId: PrintableTemplateFamilyId, outputFormat: PrintableAssetOutputFormat) => {
        if (!data) return;

        const assetType = selectedPrintableAsset;
        if (assetType.requiresFeedback && !data.hasFeedbackEnabled) {
            Toast.show({ content: 'Turn on feedback first, then download this QR.', duration: 1600 });
            return;
        }

        const busyKey = `download:${selectedPrintableAssetId}:${templateFamilyId}:${outputFormat}`;
        setPrintableBusyKey(busyKey);
        try {
            const input = await buildPrintableRenderInput(selectedPrintableAssetId, templateFamilyId);
            if (!input) return;
            const result = await renderPrintableAsset({ ...input, outputFormat });

            downloadBlob(result.blob, result.filename);
            if (selectedPrintableAssetId === 'complete_menu_kit') {
                void trackMenuKitDownload('zip_download');
                recordStarterSignal(STARTER_ACTIVATION_SIGNALS.MENU_KIT_DOWNLOADED);
            }
            Toast.show({ content: `${assetType.title} downloaded`, duration: 1400, icon: 'success' });
        } catch {
            Toast.show({ content: `Could not create ${assetType.title}`, duration: 1600 });
        } finally {
            setPrintableBusyKey(null);
        }
    };

    const handleDownloadPdf = async () => {
        if (!data?.projectId) return;

        setGeneratingDownload('menu_pdf');
        try {
            const projectData = await getSelectedProjectData();
            const exportData = await getSelectedProjectExportData();
            const items = exportData.items;
            const categories = exportData.categories;

            if (items.length === 0) {
                Toast.show({ content: t('noMenuItems'), duration: 1500 });
                return;
            }

            const language =
                (projectData as any)?.defaultLanguage ||
                exportData.languages[0] ||
                storeDetails?.defaultLanguage ||
                storeDetails?.activeLanguages?.[0] ||
                storeDetails?.language ||
                'en';

            const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');
            const pdfResult = await generateMenuPdf({
                categories,
                currency: storeDetails?.currencySymbol || '',
                items,
                language,
                menuUrl: data.menuLink,
                projectName: data.projectName || labels.offeringTitle,
                projectId: data.projectId || undefined,
                projectData: projectData as any,
                showDescriptions: true,
                storeData: storeDetails as any,
                logoUrl: data.storeLogo || (storeDetails as any)?.logo || undefined,
                businessType: (storeDetails as any)?.businessType || data.businessType,
                businessCategory: (storeDetails as any)?.businessCategory,
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                currencyCode: (storeDetails as any)?.currencyCode || (storeDetails as any)?.currency || undefined,
                storeName: data.storeName,
            });

            downloadPdf(pdfResult);
            localStorage.setItem(`menulist_last_pdf_download_${data.projectId}`, Date.now().toString());
            if (pdfResult.snapshotHash) {
                localStorage.setItem(`menulist_last_pdf_version_${data.projectId}`, pdfResult.snapshotHash);
            }
            Toast.show({ content: t('pdfDownloaded'), duration: 1400, icon: 'success' });
        } catch {
            Toast.show({ content: t('pdfFailed'), duration: 1600 });
        } finally {
            setGeneratingDownload(null);
        }
    };

    const handleOpenMenuCardExport = () => {
        if (!data?.projectId) return;
        onOpenPrintMenu?.();
    };

    const handleStructuredExport = async (type: 'json' | 'xlsx') => {
        if (!data?.projectId) return;

        setGeneratingDownload(type === 'xlsx' ? 'export_xlsx' : 'export_json');
        try {
            const exportData = await getSelectedProjectExportData();
            if (exportData.items.length === 0 && exportData.categories.length === 0) {
                Toast.show({ content: t('noMenuItems'), duration: 1500 });
                return;
            }

            await downloadMenuData(exportData, type, { filenameBase: exportFilenameBase });
            Toast.show({
                content: type === 'xlsx' ? t('xlsxDownloaded') : t('jsonDownloaded'),
                duration: 1400,
                icon: 'success',
            });
        } catch {
            Toast.show({ content: t('exportFailed', { type: type.toUpperCase() }), duration: 1600 });
        } finally {
            setGeneratingDownload(null);
        }
    };

    const handleDownloadMenuKit = async () => {
        const input = buildMenuKitInput();
        if (!input) return;

        setGeneratingDownload('menu_kit');
        try {
            const result = await generateMenuKit(input);
            const safeName = input.storeName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_') || 'Menu';
            downloadBlob(result.zipBlob, `${safeName}_MenuKit.zip`);
            void trackMenuKitDownload('zip_download');
            recordStarterSignal(STARTER_ACTIVATION_SIGNALS.MENU_KIT_DOWNLOADED);
            Toast.show({ content: t('menuKitDownloaded'), duration: 1400, icon: 'success' });
        } catch {
            Toast.show({ content: t('menuKitFailed'), duration: 1600 });
        } finally {
            setGeneratingDownload(null);
        }
    };

    const handleMenuKitAsset = async (
        key: DownloadAssetKey,
        assetKey: MenuKitAssetKey,
        label: string,
        trackingAction?: 'share_instagram' | 'share_whatsapp' | 'share_google_maps',
    ) => {
        const input = buildMenuKitInput();
        if (!input) return;

        setGeneratingDownload(key);
        try {
            const asset = await generateMenuKitAsset(input, assetKey);
            const shared = trackingAction ? await shareBlob(asset.blob, asset.filename, label) : false;
            if (shared) {
                void trackMenuKitDownload(trackingAction);
                Toast.show({ content: t('assetShared', { label }), duration: 1400, icon: 'success' });
            } else {
                downloadBlob(asset.blob, asset.filename);
                Toast.show({ content: t('assetDownloaded', { label }), duration: 1400, icon: 'success' });
            }
        } catch {
            Toast.show({ content: t('assetFailed', { label }), duration: 1600 });
        } finally {
            setGeneratingDownload(null);
        }
    };

    const handleDownloadFeedbackQr = async () => {
        if (!data?.projectId) return;

        setGeneratingDownload('feedback_qr');
        try {
            const { downloadQrCode, generateBrandedFeedbackQrCode } = await import('@lib/utils/feedbackQrCode');
            const qrDataUrl = await generateBrandedFeedbackQrCode(data.projectId, {
                brandColor: storeBrandColor,
                footer: data.feedbackQrLink.replace(/^https?:\/\//, ''),
                logoUrl: data.storeLogo || undefined,
                storeName: data.storeName,
                subtitle: t('feedbackLinkDesc'),
                title: t('feedbackQr'),
                activePlanType: (storeDetails as any)?.activePlanType,
            }, data.obpLink);
            downloadQrCode(qrDataUrl, `${data.storeName.replace(/\s+/g, '-')}-feedback-qr`);
            Toast.show({ content: t('assetDownloaded', { label: t('feedbackQr') }), duration: 1400, icon: 'success' });
        } catch {
            Toast.show({ content: t('assetFailed', { label: t('feedbackQr') }), duration: 1600 });
        } finally {
            setGeneratingDownload(null);
        }
    };

    const handleNativeShare = async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({
                text,
                title: label,
                url,
            });
            recordStarterSignal(STARTER_ACTIVATION_SIGNALS.NATIVE_SHARE_COMPLETED);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: t('couldNotCopy'), duration: 1500 });
        }
    };

    const handleCopyPosSetupInfo = () => {
        const summary = [
            'MenuList External Menu Sync - Setup Info',
            '',
            'Payload: Full menu snapshot (JSON)',
            'Security: HMAC-SHA256 signed (header: X-MenuList-Signature)',
            'Headers: X-MenuList-Signature, X-MenuList-Event, X-MenuList-Version, X-MenuList-Timestamp, X-MenuList-Delivery-Id',
            'Response: HTTP 200 within 5 seconds',
            '',
            'Documentation: https://menulist.ai/pos-sync',
        ].join('\n');
        return handleCopy(summary, t('posSetupInfo'));
    };

    const activeGuideSheet = activeGuide === 'setup'
        ? {
            items: [
                { body: t('setupGuideStepTables') },
                { body: t('setupGuideStepEntrance') },
                { body: t('setupGuideStepCounter') },
                { body: t('setupGuideStepFeedback') },
                { body: t('setupGuideStepScreens') },
                { body: t('setupGuideStepGoogle', { offering: labels.offeringLower }) },
            ],
            ordered: true,
            title: t('setupGuide'),
        }
        : activeGuide === 'printing'
            ? {
                items: [
                    { body: t('printingGuidePaper'), title: t('printingGuidePaperTitle') },
                    { body: t('printingGuidePrint'), title: t('printingGuidePrintTitle') },
                    { body: t('printingGuideTent'), title: t('printingGuideTentTitle') },
                    { body: t('printingGuideSize'), title: t('printingGuideSizeTitle') },
                    { body: t('printingGuideDistance'), title: t('printingGuideDistanceTitle') },
                ],
                ordered: false,
                title: t('printingGuide'),
            }
            : activeGuide === 'sharing'
                ? {
                    items: [
                        { body: t('sharingGuideWhatsapp', { offering: labels.offeringLower }), title: t('sharingGuideWhatsappTitle') },
                        { body: t('sharingGuideInstagram'), title: t('sharingGuideInstagramTitle') },
                        { body: t('sharingGuideGoogle'), title: t('sharingGuideGoogleTitle') },
                        { body: t('sharingGuideStaff', { offering: labels.offeringLower }), title: t('sharingGuideStaffTitle') },
                    ],
                    ordered: false,
                    title: t('sharingGuide'),
                }
                : null;

    if (!canManageSharing) {
        return (
            <Flex align="center" gap={12} justify="center" style={{ minHeight: '100%', padding: 24, textAlign: 'center' }} vertical>
                <LuShield color={token.colorTextQuaternary} size={36} />
                <Title level={4} style={{ margin: 0 }}>Sharing is not available for your role</Title>
                <Text type="secondary">Ask the owner to update your role if you need sharing or QR access.</Text>
            </Flex>
        );
    }

    if (loadingProjects && !data) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    if (!data) {
        return (
            <Flex align="center" gap={12} justify="center" style={{ minHeight: '100%', padding: 24 }} vertical>
                <LuBookOpen color={token.colorTextQuaternary} size={36} />
                <Title level={4} style={{ margin: 0 }}>{t('noMenuYet')}</Title>
                <Text type="secondary" style={{ textAlign: 'center' }}>
                    {t('noMenuYetDesc', { offering: labels.offeringLower })}
                </Text>
            </Flex>
        );
    }

    if (isPrintAssetsMode) {
        const templateRowPreviewWidth = isCompactHandheld ? 116 : 132;
        const templateRowPreviewHeight = isCompactHandheld ? 108 : 116;

        return (
            <Flex gap={isCompactHandheld ? 14 : 18} style={{ padding: isCompactHandheld ? 12 : 16 }} vertical>
                <NavBar onBack={onBack || (() => window.history.back())}>Assets</NavBar>

                {activeProject && data.allProjects.length > 1 ? (
                    <ProjectSelectorTrigger
                        clickable
                        currentProject={{
                            active: activeProject.active !== false,
                            deleted: activeProject.deleted === true,
                            id: activeProject.projectId,
                            isDefault: activeProject.isDefault,
                            isSpecialMenu: activeProject.isSpecialMenu === true,
                            name: activeProject.name,
                            projectImage: activeProject.projectImage || null,
                            specialMenuBaseProjectId: (activeProject as any).specialMenuBaseProjectId,
                            specialMenuBaseProjectName: (activeProject as any).specialMenuBaseProjectId
                                ? resolveProjectName(
                                    data.allProjects.find((project: any) => project.projectId === (activeProject as any).specialMenuBaseProjectId)?.name,
                                    labels.offeringTitle,
                                )
                                : undefined,
                            specialMenuEndsAt: activeProject.specialMenuEndsAt,
                            specialMenuStatus: activeProject.specialMenuStatus,
                        }}
                        onClick={() => setIsProjectSelectorOpen(true)}
                    />
                ) : null}

                <MobilePrintReadinessPanel compact={isCompactHandheld} items={printReadinessItems} />

                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={12} vertical>
                        <SectionHeader
                            compact={isCompactHandheld}
                            subtitle="Choose what you need to print or download."
                            title="Assets"
                        />
                        <Flex gap={10} vertical>
                            {PRINTABLE_ASSET_TYPES.map((asset) => {
                                const active = selectedPrintableAssetId === asset.id;
                                const disabled = asset.requiresFeedback && !data.hasFeedbackEnabled;
                                return (
                                    <button
                                        aria-label={`${asset.title}. ${disabled ? 'Turn on feedback first' : `Output format ${asset.outputFormat.toUpperCase()}`}`}
                                        aria-pressed={active}
                                        disabled={disabled}
                                        key={asset.id}
                                        onClick={() => {
                                            if (disabled) return;
                                            setSelectedPrintableAssetId(asset.id);
                                            closePrintableTemplateActions();
                                        }}
                                        style={{
                                            alignItems: 'center',
                                            background: active ? token.colorPrimaryBg : token.colorBgContainer,
                                            border: `1px solid ${active ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                            borderRadius: 18,
                                            color: disabled ? token.colorTextDisabled : token.colorText,
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            font: 'inherit',
                                            gap: 10,
                                            minHeight: 66,
                                            padding: '11px 12px',
                                            textAlign: 'left',
                                            width: '100%',
                                            WebkitTapHighlightColor: 'transparent',
                                        }}
                                        type="button"
                                    >
                                        <span style={{ color: active ? token.colorPrimary : token.colorTextSecondary, display: 'inline-flex' }}>
                                            {getMobilePrintableAssetIcon(asset.id)}
                                        </span>
                                        <span style={{ minWidth: 0 }}>
                                            <Text strong style={{ display: 'block', fontSize: isCompactHandheld ? 13 : 14 }}>
                                                {asset.title}
                                            </Text>
                                            <Text style={{ color: disabled ? token.colorTextDisabled : token.colorTextSecondary, fontSize: 12, lineHeight: 1.35 }}>
                                                {disabled ? 'Turn on feedback first' : `${asset.size} · ${asset.description}`}
                                            </Text>
                                        </span>
                                        <Tag color={active ? 'primary' : 'default'} style={{ flexShrink: 0 }}>
                                            {asset.outputFormat.toUpperCase()}
                                        </Tag>
                                    </button>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Card>

                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={12} vertical>
                        <SectionHeader
                            compact={isCompactHandheld}
                            subtitle="Pick one finished look. Logo, color, URL, and MenuList branding are filled automatically."
                            title="Choose Style"
                        />
                        <Flex gap={10} vertical>
                            {availablePrintableTemplateFamilies.map((family) => {
                                return (
                                    <button
                                        aria-haspopup="dialog"
                                        aria-label={`Open ${family.label} ${selectedPrintableAsset.title} download options`}
                                        key={family.id}
                                        onClick={() => openPrintableTemplateActions(family.id)}
                                        style={{
                                            alignItems: 'stretch',
                                            background: token.colorBgContainer,
                                            border: `1px solid ${token.colorBorderSecondary}`,
                                            borderRadius: 18,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            font: 'inherit',
                                            gap: isCompactHandheld ? 10 : 12,
                                            minHeight: templateRowPreviewHeight + 22,
                                            padding: isCompactHandheld ? 10 : 12,
                                            textAlign: 'left',
                                            width: '100%',
                                            WebkitTapHighlightColor: 'transparent',
                                        }}
                                        type="button"
                                    >
                                        <TemplateFamilySwatch
                                            actionLabel={
                                                selectedPrintableAssetId === 'feedback_qr'
                                                    ? 'Feedback QR'
                                                    : selectedPrintableAssetId === 'counter_sticker'
                                                        ? labels.scanForUpper
                                                        : labels.printCardTitle
                                            }
                                            assetTypeId={selectedPrintableAssetId}
                                            brandColor={storeBrandColor}
                                            family={family}
                                            instructionLabel={
                                                selectedPrintableAssetId === 'feedback_qr'
                                                    ? 'Scan to leave feedback'
                                                    : labels.scanToView
                                            }
                                            shortLink={data.menuLink.replace(/^https?:\/\//, '')}
                                            storeLogo={data.storeLogo}
                                            storeName={data.storeName}
                                            height={templateRowPreviewHeight}
                                            width={templateRowPreviewWidth}
                                        />
                                        <span
                                            style={{
                                                alignSelf: 'center',
                                                display: 'flex',
                                                flex: 1,
                                                flexDirection: 'column',
                                                gap: 5,
                                                minWidth: 0,
                                            }}
                                        >
                                            <span style={{ alignItems: 'flex-start', display: 'flex', gap: 8, justifyContent: 'space-between', minWidth: 0 }}>
                                                <Text
                                                    strong
                                                    style={{
                                                        display: 'block',
                                                        fontSize: isCompactHandheld ? 14 : 15,
                                                        lineHeight: 1.2,
                                                        minWidth: 0,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {family.label}
                                                </Text>
                                                <Tag style={{ flexShrink: 0, marginInlineEnd: 0 }}>{family.tier}</Tag>
                                            </span>
                                            <Text style={{ color: token.colorTextSecondary, display: 'block', fontSize: 12, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                                                {family.description}
                                            </Text>
                                            <Text style={{ color: token.colorTextTertiary, display: 'block', fontSize: 11.5, lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                                                Best for: {family.bestFor}
                                            </Text>
                                        </span>
                                    </button>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Card>

                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={8} vertical>
                        <Text strong>Print guidance</Text>
                        <Text type="secondary">Use matte finish where possible and test one scan before printing in bulk.</Text>
                        <Text type="secondary">Tap a template to preview or download the exact file for that style.</Text>
                        <Button
                            fill="outline"
                            onClick={() => void handleCopy(printShopMessage, 'print-shop message')}
                            style={{ marginTop: 4 }}
                        >
                            <Flex align="center" gap={6} justify="center">
                                <LuClipboard size={16} />
                                <Text>Copy Printer Message</Text>
                            </Flex>
                        </Button>
                    </Flex>
                </Card>

                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={8} vertical>
                        <Text strong>When to reprint</Text>
                        {PRINT_ASSET_REPRINT_GUIDANCE.map((item) => (
                            <Flex align="flex-start" gap={8} key={item}>
                                <LuCheck color={token.colorSuccess} size={15} style={{ flexShrink: 0, marginTop: 3 }} />
                                <Text type="secondary">{item}</Text>
                            </Flex>
                        ))}
                    </Flex>
                </Card>

                <MobileProjectSelectorSheet
                    currentProjectId={data.projectId}
                    currentProjectName={resolveProjectName(activeProject?.name, data.projectName || undefined)}
                    onClose={() => setIsProjectSelectorOpen(false)}
                    onOpenDesignEditor={onOpenDesignEditor}
                    onProjectsChanged={async (preferredProjectId) => {
                        setIsProjectSelectorOpen(false);
                        await selectProject(preferredProjectId || null);
                    }}
                    visible={isProjectSelectorOpen}
                />
                <PrintableTemplateActionSheet
                    actionLabel={
                        selectedPrintableAssetId === 'feedback_qr'
                            ? 'Feedback QR'
                            : selectedPrintableAssetId === 'counter_sticker'
                                ? labels.scanForUpper
                                : labels.printCardTitle
                    }
                    asset={selectedPrintableAsset}
                    assetTypeId={selectedPrintableAssetId}
                    brandColor={storeBrandColor}
                    busyKey={printableBusyKey}
                    family={printableActionTemplate}
                    instructionLabel={
                        selectedPrintableAssetId === 'feedback_qr'
                            ? 'Scan to leave feedback'
                            : labels.scanToView
                    }
                    onClose={closePrintableTemplateActions}
                    onDownload={(templateFamilyId, outputFormat) => void handlePrintableAssetRender(templateFamilyId, outputFormat)}
                    previewAsset={previewAsset}
                    previewState={printablePreviewState}
                    shortLink={data.menuLink.replace(/^https?:\/\//, '')}
                    storeLogo={data.storeLogo}
                    storeName={data.storeName}
                    supportedOutputFormats={selectedPrintableActionFormats}
                    visible={Boolean(printableActionTemplate)}
                />
            </Flex>
        );
    }

    return (
        <Flex gap={isCompactHandheld ? 14 : 18} style={{ padding: isCompactHandheld ? 12 : 16 }} vertical>
            {activeProject && data.allProjects.length > 1 ? (
                <ProjectSelectorTrigger
                    clickable
                    currentProject={{
                        active: activeProject.active !== false,
                        deleted: activeProject.deleted === true,
                        id: activeProject.projectId,
                        isDefault: activeProject.isDefault,
                        isSpecialMenu: activeProject.isSpecialMenu === true,
                        name: activeProject.name,
                        projectImage: activeProject.projectImage || null,
                        specialMenuBaseProjectId: (activeProject as any).specialMenuBaseProjectId,
                        specialMenuBaseProjectName: (activeProject as any).specialMenuBaseProjectId
                            ? resolveProjectName(
                                data.allProjects.find((project: any) => project.projectId === (activeProject as any).specialMenuBaseProjectId)?.name,
                                labels.offeringTitle,
                            )
                            : undefined,
                        specialMenuEndsAt: activeProject.specialMenuEndsAt,
                        specialMenuStatus: activeProject.specialMenuStatus,
                    }}
                    onClick={() => setIsProjectSelectorOpen(true)}
                />
            ) : null}

            <MobileLinkCard
                compact={isCompactHandheld}
                description={t('obpShareHint')}
                icon={<LuExternalLink color={token.colorText} size={18} />}
                isPrimary
                label={t('officialBusinessLink')}
                onCopy={() => void handleCopy(
                    withSource(data.obpLink, 'copy'),
                    t('officialBusinessLink'),
                    STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                )}
                onOpen={() => openInternalLink(withSource(data.obpLink, 'direct'))}
                onShare={supportsNativeShare ? () => void handleNativeShare({
                    label: t('officialBusinessLink'),
                    text: t('obpShareHint'),
                    url: withSource(data.obpLink, 'share'),
                }) : undefined}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-official-page`, 'qr'),
                    helperText: t('obpShareHint'),
                    starterSignal: STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                    title: t('officialBusinessLink'),
                    url: withSource(data.obpLink, 'qr'),
                })}
                value={data.obpLink}
            />

            <SectionHeader
                compact={isCompactHandheld}
                subtitle={`Share a direct link to the selected ${labels.offeringLower}.`}
                title={t('directOfferingLink', { offering: labels.offeringTitle })}
            />

            <MobileLinkCard
                compact={isCompactHandheld}
                description={t('directOfferingLinkDesc', { offering: labels.offeringLower })}
                icon={<LuLink2 color={token.colorText} size={18} />}
                label={t('directOfferingLink', { offering: labels.offeringTitle })}
                onCopy={() => void handleCopy(
                    withSource(data.menuLink, 'copy'),
                    t('directOfferingLinkCopyLabel', { offering: labels.offeringLower }),
                    STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                )}
                onOpen={() => openInternalLink(withSource(data.menuLink, 'direct'))}
                onShare={supportsNativeShare ? () => void handleNativeShare({
                    label: t('directOfferingLink', { offering: labels.offeringTitle }),
                    text: t('directOfferingLinkDesc', { offering: labels.offeringLower }),
                    url: withSource(data.menuLink, 'share'),
                }) : undefined}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-${labels.offeringLower}-direct-link`, 'qr'),
                    helperText: t('directOfferingLinkDesc', { offering: labels.offeringLower }),
                    starterSignal: STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                    title: t('directOfferingLink', { offering: labels.offeringTitle }),
                    url: withSource(data.menuLink, 'qr'),
                })}
                value={data.menuLink}
            />

            {data.installAppLink ? (
                <MobileLinkCard
                    compact={isCompactHandheld}
                    description="Share this when customers should install your business app directly on their phone."
                    icon={<LuSmartphone color={token.colorText} size={18} />}
                    label="Customer App install link"
                    onCopy={() => void handleCopy(
                        withSource(data.installAppLink as string, 'copy'),
                        'Customer App install link',
                        STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                    )}
                    onOpen={() => openInternalLink(withSource(data.installAppLink as string, 'direct'))}
                    onShare={supportsNativeShare ? () => void handleNativeShare({
                        label: 'Customer App install link',
                        text: 'Share this when customers should install your business app directly on their phone.',
                        url: withSource(data.installAppLink as string, 'share'),
                    }) : undefined}
                    onShowQr={() => handleOpenQr({
                        filename: buildQrCodeFilename(`${data.storeName}-customer-app-install`, 'qr'),
                        helperText: 'Customers can scan this QR to install your business app.',
                        starterSignal: STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                        title: 'Customer App install link',
                        url: withSource(data.installAppLink as string, 'qr'),
                    })}
                    value={data.installAppLink}
                />
            ) : null}

            {data.hasFeedbackEnabled && data.feedbackLink ? (
                <MobileLinkCard
                    compact={isCompactHandheld}
                    description={t('feedbackLinkDesc')}
                    icon={<LuMessageSquare color={token.colorText} size={18} />}
                    label={t('feedbackLink')}
                    onCopy={() => void handleCopy(data.feedbackLink, t('feedbackLink'))}
                    onOpen={() => openInternalLink(data.feedbackLink)}
                    onShare={supportsNativeShare ? () => void handleNativeShare({
                        label: t('feedbackLink'),
                        text: t('feedbackLinkDesc'),
                        url: data.feedbackLink,
                    }) : undefined}
                    onShowQr={() => handleOpenQr({
                        filename: buildQrCodeFilename(`${data.storeName}-feedback`, 'qr'),
                        helperText: t('feedbackLinkDesc'),
                        title: t('feedbackLink'),
                        url: data.feedbackQrLink,
                    })}
                    value={data.feedbackLink}
                />
            ) : null}

            <Card style={{ borderRadius: 24 }}>
                <Flex gap={12} vertical>
                    <SectionHeader
                        compact={isCompactHandheld}
                        subtitle={t('qrCodesDesc')}
                        title={t('qrCodesTitle')}
                    />

                    <Flex gap={10} wrap="wrap">
                        <DownloadTile
                            compact={isCompactHandheld}
                            description={t('storeMenuQrDesc')}
                            icon={<LuQrCode size={18} />}
                            loading={false}
                            onClick={() => handleOpenQr({
                                filename: buildQrCodeFilename(`${data.storeName}-store-menu`, 'qr'),
                                helperText: t('storeMenuQrDesc'),
                                starterSignal: STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                                title: t('storeMenuQr'),
                                url: withSource(data.storeMenuLink, 'qr'),
                            })}
                            title={t('storeMenuQr')}
                            highlighted
                        />
                        <DownloadTile
                            compact={isCompactHandheld}
                            description={t('businessProfileQrDesc')}
                            icon={<LuQrCode size={18} />}
                            loading={false}
                            onClick={() => handleOpenQr({
                                filename: buildQrCodeFilename(`${data.storeName}-business-profile`, 'qr'),
                                helperText: t('businessProfileQrDesc'),
                                starterSignal: STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                                title: t('businessProfileQr'),
                                url: withSource(data.obpLink, 'qr'),
                            })}
                            title={t('businessProfileQr')}
                        />
                        <DownloadTile
                            compact={isCompactHandheld}
                            description={t('projectMenuQrDesc', { projectName: data.projectName || t('projectFallback') })}
                            icon={<LuQrCode size={18} />}
                            loading={false}
                            onClick={() => handleOpenQr({
                                filename: buildQrCodeFilename(`${data.storeName}-${data.projectName || 'project'}-menu`, 'qr'),
                                helperText: t('projectMenuQrDesc', { projectName: data.projectName || t('projectFallback') }),
                                starterSignal: STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                                title: t('projectMenuQr'),
                                url: withSource(data.menuLink, 'qr'),
                            })}
                            title={t('projectMenuQr')}
                        />
                    </Flex>

                    {outletQrLinks.length > 0 ? (
                        <Flex gap={8} vertical>
                            <Text style={{ color: token.colorTextSecondary, fontSize: isCompactHandheld ? 11 : 12 }}>
                                {t('outletQrSectionHelper')}
                            </Text>
                            {outletQrLinks.map((outlet) => (
                                <Button
                                    fill="outline"
                                    key={outlet.storeId}
                                    onClick={() => handleOpenQr({
                                        filename: buildQrCodeFilename(`${outlet.label}-store-menu`, 'qr'),
                                        helperText: t('outletQrHelper', { outlet: outlet.label }),
                                        title: t('outletQrTitle', { outlet: outlet.label }),
                                        url: withSource(outlet.url, 'qr'),
                                    })}
                                    style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                >
                                    <Flex align="center" gap={8} style={{ minWidth: 0, width: '100%' }}>
                                        <LuQrCode size={16} />
                                        <Flex gap={1} style={{ minWidth: 0 }} vertical>
                                            <Text strong style={{ fontSize: 13 }}>{outlet.label}</Text>
                                            <Text ellipsis style={{ color: token.colorTextSecondary, fontSize: 11 }}>{outlet.url}</Text>
                                        </Flex>
                                    </Flex>
                                </Button>
                            ))}
                        </Flex>
                    ) : null}
                </Flex>
            </Card>

            <Card style={{ borderRadius: 24 }}>
                <Flex gap={12} vertical>
                    <SectionHeader
                        compact={isCompactHandheld}
                        subtitle={t('printDownloadsDesc')}
                        title={t('printDownloadsTitle')}
                    />

                    <Flex gap={10} wrap="wrap">
                        {(FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES || FEATURE_FLAGS.ENABLE_PRINT_ASSETS_ROUTE) && onOpenPrintAssets ? (
                            <DownloadTile
                                compact={isCompactHandheld}
                                description="Templates for tables, counters, feedback, and menus"
                                icon={<LuPrinter size={18} />}
                                loading={false}
                                onClick={onOpenPrintAssets}
                                title="Assets"
                                highlighted
                            />
                        ) : null}
                        <DownloadTile
                            compact={isCompactHandheld}
                            description={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Preview and create PDF' : t('menuPdfDesc')}
                            icon={<LuFileText size={18} />}
                            loading={generatingDownload === 'menu_pdf'}
                            onClick={() => FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport() : void handleDownloadPdf()}
                            title={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Print Menu' : t('menuPdf')}
                            highlighted
                        />
                        {FEATURE_FLAGS.ENABLE_MENU_KIT ? (
                            <DownloadTile
                                compact={isCompactHandheld}
                                description={t('completeMenuKitDesc')}
                                icon={<LuPackage size={18} />}
                                loading={generatingDownload === 'menu_kit'}
                                onClick={() => void handleDownloadMenuKit()}
                                title={t('completeMenuKit')}
                                highlighted
                            />
                        ) : null}
                    </Flex>

                    <Text style={{ color: token.colorTextSecondary, fontSize: isCompactHandheld ? 11 : 12 }}>
                        {t('exportData')}
                    </Text>
                    <Flex gap={10} wrap="wrap">
                        <DownloadTile
                            compact={isCompactHandheld}
                            description={t('exportXlsxDesc')}
                            icon={<LuSheet size={18} />}
                            loading={generatingDownload === 'export_xlsx'}
                            onClick={() => void handleStructuredExport('xlsx')}
                            title={t('exportXlsx')}
                        />
                        <DownloadTile
                            compact={isCompactHandheld}
                            description={t('exportJsonDesc')}
                            icon={<LuFileJson size={18} />}
                            loading={generatingDownload === 'export_json'}
                            onClick={() => void handleStructuredExport('json')}
                            title={t('exportJson')}
                        />
                    </Flex>

                    {FEATURE_FLAGS.ENABLE_MENU_KIT ? (
                        <>
                            <Text style={{ color: token.colorTextSecondary, fontSize: isCompactHandheld ? 11 : 12 }}>
                                {t('printFiles')}
                            </Text>
                            <Flex gap={10} wrap="wrap">
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('tableTentDesc')}
                                    icon={<LuQrCode size={18} />}
                                    loading={generatingDownload === 'table_tent'}
                                    onClick={() => void handleMenuKitAsset('table_tent', 'table_tent', t('tableTent'))}
                                    title={t('tableTent')}
                                />
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('singleTableCardDesc')}
                                    icon={<LuQrCode size={18} />}
                                    loading={generatingDownload === 'single_table_card'}
                                    onClick={() => void handleMenuKitAsset('single_table_card', 'single_table_card', t('singleTableCard'))}
                                    title={t('singleTableCard')}
                                />
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('counterStickerDesc')}
                                    icon={<LuQrCode size={18} />}
                                    loading={generatingDownload === 'counter_sticker'}
                                    onClick={() => void handleMenuKitAsset('counter_sticker', 'counter_sticker', t('counterSticker'))}
                                    title={t('counterSticker')}
                                />
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('entrancePosterDesc')}
                                    icon={<LuQrCode size={18} />}
                                    loading={generatingDownload === 'entrance_poster'}
                                    onClick={() => void handleMenuKitAsset('entrance_poster', 'entrance_poster', t('entrancePoster'))}
                                    title={t('entrancePoster')}
                                />
                                {data.hasFeedbackEnabled ? (
                                    <DownloadTile
                                        compact={isCompactHandheld}
                                        description={t('feedbackQrDesc')}
                                        icon={<LuMessageSquare size={18} />}
                                        loading={generatingDownload === 'feedback_qr'}
                                        onClick={() => void handleDownloadFeedbackQr()}
                                        title={t('feedbackQr')}
                                    />
                                ) : null}
                            </Flex>

                            <Text style={{ color: token.colorTextSecondary, fontSize: isCompactHandheld ? 11 : 12 }}>
                                {t('socialFiles')}
                            </Text>
                            <Flex gap={10} wrap="wrap">
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('instagramStoryDesc')}
                                    icon={<LuImage size={18} />}
                                    loading={generatingDownload === 'instagram_story'}
                                    onClick={() => void handleMenuKitAsset('instagram_story', 'instagram_story', t('instagramStory'), 'share_instagram')}
                                    title={t('instagramStory')}
                                />
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('whatsappStatusDesc')}
                                    icon={<LuShare2 size={18} />}
                                    loading={generatingDownload === 'whatsapp_status'}
                                    onClick={() => void handleMenuKitAsset('whatsapp_status', 'whatsapp_status', t('whatsappStatus'), 'share_whatsapp')}
                                    title={t('whatsappStatus')}
                                />
                                <DownloadTile
                                    compact={isCompactHandheld}
                                    description={t('googleMapsImageDesc')}
                                    icon={<LuMapPin size={18} />}
                                    loading={generatingDownload === 'google_maps'}
                                    onClick={() => void handleMenuKitAsset('google_maps', 'google_maps', t('googleMapsImage'), 'share_google_maps')}
                                    title={t('googleMapsImage')}
                                />
                            </Flex>
                        </>
                    ) : null}
                </Flex>
            </Card>

            {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT ? (
                <Flex gap={12} style={{ marginTop: 6 }} vertical>
                    <MobileCommunicationKit
                        activeProjects={data.allProjects
                            .filter((project) => project.active !== false && project.deleted !== true)
                            .map((project) => ({
                                name: resolveProjectName(project.name, labels.offeringTitle),
                                url: project.url,
                            }))}
                        address={buildStoreAddress(storeDetails)}
                        businessType={data.businessType}
                        businessCategory={storeDetails?.businessCategory}
                        menuLink={data.menuLink}
                        obpLink={data.obpLink}
                        phone={storeDetails?.phoneNumber || undefined}
                        projectName={data.allProjects.length > 1 ? resolveProjectName(activeProject?.name, data.projectName || undefined) : undefined}
                        storeName={data.storeName}
                        timeZone={storeDetails?.timeZone}
                        workingHours={storeDetails?.workingHours}
                    />
                </Flex>
            ) : null}

            <Card style={{ borderRadius: 24 }}>
                <Flex gap={12} vertical>
                    <SectionHeader
                        compact={isCompactHandheld}
                        subtitle={screenLinks.menuBoardLink ? t('digitalScreensReadyDesc', { offering: labels.offeringLower }) : t('screensNotSetUpHelp')}
                        title={t('digitalScreens')}
                    />
                    {screenLinks.isLoading ? (
                        <Flex align="center" gap={8}>
                            <DotLoading color="primary" />
                            <Text type="secondary">{t('loadingScreenLinks')}</Text>
                        </Flex>
                    ) : screenLinks.menuBoardLink && screenLinks.highlightsLink ? (
                        <>
                            <ScreenLinkPanel
                                compact={isCompactHandheld}
                                description={t('menuBoardDesc', { offering: labels.offeringLower })}
                                icon={<LuMonitor size={18} />}
                                label={t('menuBoard')}
                                link={screenLinks.menuBoardLink}
                                onCopy={() => void handleCopy(screenLinks.menuBoardLink as string, t('menuBoardLink'))}
                                onOpen={() => openInternalLink(screenLinks.menuBoardLink as string)}
                                tag={t('mainTv')}
                            />
                            <ScreenLinkPanel
                                compact={isCompactHandheld}
                                description={t('highlightsScreenDesc')}
                                icon={<LuPlaySquare size={18} />}
                                label={t('highlightsScreen')}
                                link={screenLinks.highlightsLink}
                                onCopy={() => void handleCopy(screenLinks.highlightsLink as string, t('highlightsLink'))}
                                onOpen={() => openInternalLink(screenLinks.highlightsLink as string)}
                                tag={t('secondTv')}
                            />
                            <Flex
                                align="flex-start"
                                gap={6}
                                style={{
                                    background: token.colorSuccessBg,
                                    border: `1px solid ${token.colorSuccessBorder}`,
                                    borderRadius: 12,
                                    padding: '10px 12px',
                                }}
                            >
                                <LuCheck color={token.colorSuccess} size={15} style={{ flexShrink: 0, marginTop: 3 }} />
                                <Text style={{ fontSize: 12 }}>{t('screenSetupTip')}</Text>
                            </Flex>
                        </>
                    ) : (
                        <Flex gap={10} vertical>
                            <Text type="secondary">{t('screensNotSetUpHelp')}</Text>
                            <Button fill="outline" onClick={() => {
                                if (onOpenDigitalScreens) {
                                    onOpenDigitalScreens();
                                    return;
                                }
                                window.location.assign('/business-settings');
                            }}>
                                <Flex align="center" gap={6} justify="center">
                                    <LuMonitor size={16} />
                                    <Text>{t('setUpScreens')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    )}
                </Flex>
            </Card>

            {data.hasPosSync ? (
                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={10} vertical>
                        <SectionHeader compact={isCompactHandheld} subtitle={t('posSyncDesc', { offering: labels.offeringLower })} title={t('posSync')} />
                        <Flex align="center" gap={8} wrap="wrap">
                            <LuShield color={token.colorTextSecondary} size={18} />
                            <Text strong>{t('posIntegration')}</Text>
                            <Tag color={data.posSyncStatus === 'healthy' ? 'success' : data.posSyncStatus === 'connection_issue' ? 'warning' : 'default'}>
                                {data.posSyncStatus || t('active')}
                            </Tag>
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            <Button fill="outline" onClick={() => void handleCopyPosSetupInfo()} style={{ flex: '1 1 160px' }}>
                                <Flex align="center" gap={6} justify="center">
                                    <LuCopy size={15} />
                                    <Text>{t('copyPosSetupInfo')}</Text>
                                </Flex>
                            </Button>
                            {canManageIntegrations ? (
                                <Button fill="outline" onClick={() => {
                                    if (onOpenPosSync) {
                                        onOpenPosSync();
                                        return;
                                    }
                                    window.location.assign('/business-settings');
                                }} style={{ flex: '1 1 140px' }}>
                                    <Flex align="center" gap={6} justify="center">
                                        <LuShield size={15} />
                                        <Text>{t('posSettings')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                </Card>
            ) : null}

            <Card style={{ borderRadius: 24 }}>
                <Flex gap={12} vertical>
                    <SectionHeader compact={isCompactHandheld} subtitle={t('resourcesDesc')} title={t('resources')} />
                    <Flex gap={10} wrap="wrap">
                        <GuideButton compact={isCompactHandheld} icon={<LuBookOpen size={17} />} label={t('setupGuide')} onClick={() => setActiveGuide('setup')} />
                        <GuideButton compact={isCompactHandheld} icon={<LuPrinter size={17} />} label={t('printingGuide')} onClick={() => setActiveGuide('printing')} />
                        <GuideButton compact={isCompactHandheld} icon={<LuExternalLink size={17} />} label={t('sharingGuide')} onClick={() => setActiveGuide('sharing')} />
                    </Flex>
                </Flex>
            </Card>

            <MobileProjectSelectorSheet
                currentProjectId={data.projectId}
                currentProjectName={resolveProjectName(activeProject?.name, data.projectName || undefined)}
                onClose={() => setIsProjectSelectorOpen(false)}
                onOpenDesignEditor={onOpenDesignEditor}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />

            <GuideSheet guide={activeGuideSheet} onClose={() => setActiveGuide(null)} visible={!!activeGuideSheet} />

            <MobileQrCodeSheet
                brandColor={storeBrandColor}
                copyErrorMessage={t('couldNotCopy')}
                copySuccessMessage={t('linkCopied')}
                downloadSuccessMessage={t('qrDownloaded')}
                filename={qrSheet?.filename || buildQrCodeFilename(data.storeName || 'menu', 'qr')}
                generatingLabel={t('generatingQr')}
                helperText={qrSheet?.helperText}
                imageAlt={qrSheet?.title || t('showQr')}
                logoUrl={data.storeLogo || undefined}
                onClose={() => setIsQrSheetOpen(false)}
                onDownload={() => recordStarterSignal(qrSheet?.starterSignal)}
                qrErrorMessage={t('qrFailed')}
                storeName={data.storeName}
                title={qrSheet?.title || t('showQr')}
                url={qrSheet?.url || ''}
                activePlanType={(storeDetails as any)?.activePlanType}
                visible={isQrSheetOpen}
            />
        </Flex>
    );
}

function mobileReadinessTagColor(status: PrintReadinessItem['status']): 'success' | 'warning' | 'default' {
    if (status === 'ready') return 'success';
    if (status === 'attention') return 'warning';
    return 'default';
}

function getMobilePrintableAssetIcon(assetId: PrintableAssetTypeId) {
    if (assetId === 'print_menu') return <LuFileText size={18} />;
    if (assetId === 'complete_menu_kit') return <LuPackage size={18} />;
    if (assetId === 'entrance_poster') return <LuPrinter size={18} />;
    if (assetId === 'feedback_qr') return <LuMessageSquare size={18} />;
    return <LuQrCode size={18} />;
}

function getMobilePrintableDownloadActionLabel(outputFormat: PrintableAssetOutputFormat, assetId?: PrintableAssetTypeId): string {
    if (outputFormat === 'pdf') return 'Download PDF';
    if (outputFormat === 'zip') return 'Download ZIP';
    if (assetId === 'print_menu') return 'Download first page image';
    return 'Download image';
}

function getMobilePrintableActionFormats(asset: PrintableAssetType): PrintableAssetOutputFormat[] {
    return (asset.supportedOutputFormats || [asset.outputFormat]).filter((format) => format !== 'zip');
}

function getMobilePrintablePreviewFormat(asset: PrintableAssetType): PrintableAssetOutputFormat | null {
    if (asset.outputFormat === 'zip') return null;
    return 'png';
}

function TemplateFamilySwatch({
    actionLabel,
    assetTypeId,
    brandColor,
    family,
    instructionLabel,
    shortLink,
    storeLogo,
    storeName,
    height = 98,
    width = '100%',
}: {
    actionLabel: string;
    assetTypeId: PrintableAssetTypeId;
    brandColor?: string | null;
    family: PrintableTemplateFamily;
    instructionLabel: string;
    shortLink?: string;
    storeLogo?: string | null;
    storeName: string;
    height?: number;
    width?: number | string;
}) {
    const { token } = theme.useToken();

    return (
        <div style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 14,
            flexShrink: 0,
            height,
            overflow: 'hidden',
            width,
        }}>
            <PrintableTemplatePreview
                actionLabel={actionLabel}
                assetTypeId={assetTypeId}
                brandColor={brandColor}
                compact
                family={family}
                instructionLabel={instructionLabel}
                shortLink={shortLink}
                storeLogo={storeLogo}
                storeName={storeName}
            />
        </div>
    );
}

function MobilePrintReadinessPanel({
    compact,
    items,
}: {
    compact?: boolean;
    items: PrintReadinessItem[];
}) {
    const { token } = theme.useToken();

    return (
        <Card style={{ borderRadius: 24 }}>
            <Flex gap={10} vertical>
                <SectionHeader
                    compact={compact}
                    subtitle="Check once before sending files to a print shop."
                    title="Print readiness"
                />
                <Flex gap={8} vertical>
                    {items.map((item) => (
                        <Flex
                            align="flex-start"
                            gap={8}
                            key={item.id}
                            style={{
                                background: token.colorBgLayout,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 14,
                                padding: compact ? 10 : 12,
                            }}
                        >
                            <Tag color={mobileReadinessTagColor(item.status)} style={{ flexShrink: 0 }}>
                                {item.status === 'ready' ? 'Ready' : item.status === 'attention' ? 'Check' : 'Info'}
                            </Tag>
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text strong style={{ fontSize: compact ? 12 : 13 }}>{item.title}</Text>
                                <Text style={{ color: token.colorTextSecondary, fontSize: compact ? 11 : 12, lineHeight: 1.35 }}>
                                    {item.description}
                                </Text>
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            </Flex>
        </Card>
    );
}

function PrintableTemplateActionSheet({
    actionLabel,
    asset,
    assetTypeId,
    brandColor,
    busyKey,
    family,
    instructionLabel,
    onClose,
    onDownload,
    previewAsset,
    previewState,
    shortLink,
    storeLogo,
    storeName,
    supportedOutputFormats,
    visible,
}: {
    actionLabel: string;
    asset: PrintableAssetType;
    assetTypeId: PrintableAssetTypeId;
    brandColor?: string | null;
    busyKey: string | null;
    family: PrintableTemplateFamily | null;
    instructionLabel: string;
    onClose: () => void;
    onDownload: (templateFamilyId: PrintableTemplateFamilyId, outputFormat: PrintableAssetOutputFormat) => void;
    previewAsset: PreviewAssetState | null;
    previewState: 'idle' | 'loading' | 'ready' | 'error';
    shortLink?: string;
    storeLogo?: string | null;
    storeName: string;
    supportedOutputFormats: PrintableAssetOutputFormat[];
    visible: boolean;
}) {
    const { token } = theme.useToken();

    return (
        <Popup
            bodyStyle={{ maxHeight: '92vh', overflow: 'hidden', padding: 0 }}
            destroyOnClose
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={{ height: '100%', maxHeight: '92vh' }} vertical>
                <NavBar backIcon={<LuX size={20} />} onBack={onClose}>
                    {family ? `${asset.title} - ${family.label}` : asset.title}
                </NavBar>
                {family ? (
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <div
                            style={{
                                alignItems: 'center',
                                background: token.colorBgLayout,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 18,
                                display: 'flex',
                                height: asset.outputFormat === 'pdf' ? 360 : 320,
                                justifyContent: 'center',
                                overflow: 'hidden',
                                padding: 10,
                            }}
                        >
                            {previewState === 'loading' ? (
                                <Flex align="center" gap={8} justify="center" vertical>
                                    <DotLoading color="primary" />
                                    <Text style={{ color: token.colorTextSecondary }}>Creating preview...</Text>
                                </Flex>
                            ) : previewAsset ? (
                                <img
                                    alt={`${previewAsset.title} preview`}
                                    src={previewAsset.url}
                                    style={{
                                        borderRadius: 12,
                                        display: 'block',
                                        maxHeight: '100%',
                                        maxWidth: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : previewState === 'error' ? (
                                <Text style={{ color: token.colorTextSecondary, textAlign: 'center' }}>
                                    Preview could not be created. Download still may work.
                                </Text>
                            ) : asset.outputFormat === 'zip' ? (
                                <PrintableTemplatePreview
                                    actionLabel={actionLabel}
                                    assetTypeId={assetTypeId}
                                    brandColor={brandColor}
                                    family={family}
                                    instructionLabel={instructionLabel}
                                    shortLink={shortLink}
                                    storeLogo={storeLogo}
                                    storeName={storeName}
                                />
                            ) : null}
                        </div>
                        <Card style={{ background: token.colorBgLayout, borderRadius: 18 }}>
                            <Flex gap={6} vertical>
                                <Flex align="center" gap={8} justify="space-between">
                                    <Text strong>{family.label}</Text>
                                    <Tag>{asset.outputFormat === 'zip' ? 'ZIP' : 'PDF + IMAGE'}</Tag>
                                </Flex>
                                <Text style={{ color: token.colorTextSecondary, lineHeight: 1.35 }}>
                                    {family.description}
                                </Text>
                                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                    {asset.size}
                                </Text>
                            </Flex>
                        </Card>
                        <Flex gap={8} vertical>
                            {asset.outputFormat === 'zip' ? (
                                <Button
                                    color="primary"
                                    loading={busyKey === `download:${asset.id}:${family.id}:zip`}
                                    onClick={() => onDownload(family.id, 'zip')}
                                >
                                    <Flex align="center" gap={6} justify="center">
                                        <LuDownload size={16} />
                                        <Text>Download ZIP</Text>
                                    </Flex>
                                </Button>
                            ) : (
                                supportedOutputFormats.map((format, index) => (
                                    <Button
                                        color={index === 0 ? 'primary' : 'default'}
                                        fill={index === 0 ? 'solid' : 'outline'}
                                        key={format}
                                        loading={busyKey === `download:${asset.id}:${family.id}:${format}`}
                                        onClick={() => onDownload(family.id, format)}
                                    >
                                        <Flex align="center" gap={6} justify="center">
                                            <LuDownload size={16} />
                                            <Text>{getMobilePrintableDownloadActionLabel(format, asset.id)}</Text>
                                        </Flex>
                                    </Button>
                                ))
                            )}
                        </Flex>
                    </Flex>
                ) : null}
            </Flex>
        </Popup>
    );
}

function DownloadTile({
    compact,
    description,
    highlighted,
    icon,
    loading,
    onClick,
    onSecondaryClick,
    secondaryLabel = 'Preview',
    secondaryLoading,
    title,
}: {
    compact?: boolean;
    description: string;
    highlighted?: boolean;
    icon: ReactNode;
    loading: boolean;
    onClick: () => void;
    onSecondaryClick?: () => void;
    secondaryLabel?: string;
    secondaryLoading?: boolean;
    title: string;
}) {
    const { token } = theme.useToken();
    const color = highlighted ? token.colorTextLightSolid : token.colorText;
    const tileStyle = {
        flex: '1 1 calc(50% - 5px)',
        minWidth: compact ? 128 : 144,
    };

    const primaryTile = (
        <Button
            block
            color={highlighted ? 'primary' : undefined}
            fill={highlighted ? 'solid' : 'outline'}
            loading={loading}
            onClick={onClick}
            style={{
                minHeight: compact ? 86 : 94,
                paddingBlock: compact ? 9 : 11,
                whiteSpace: 'normal',
            }}
        >
            <Flex align="center" gap={6} justify="center" style={{ color }} vertical>
                {loading ? <LuDownload size={18} /> : icon}
                <Text strong style={{ color, fontSize: compact ? 12 : 13, lineHeight: 1.2, textAlign: 'center' }}>
                    {title}
                </Text>
                <Text style={{ color: highlighted ? token.colorTextLightSolid : token.colorTextSecondary, fontSize: 11, lineHeight: 1.2, opacity: highlighted ? 0.78 : 1, textAlign: 'center' }}>
                    {description}
                </Text>
            </Flex>
        </Button>
    );

    if (onSecondaryClick) {
        return (
            <Flex gap={6} style={tileStyle} vertical>
                {primaryTile}
                <Button
                    block
                    fill="outline"
                    loading={secondaryLoading}
                    onClick={onSecondaryClick}
                    style={{ minHeight: 34 }}
                >
                    <Flex align="center" gap={6} justify="center">
                        <LuEye size={14} />
                        <Text strong style={{ fontSize: 12 }}>{secondaryLoading ? 'Opening...' : secondaryLabel}</Text>
                    </Flex>
                </Button>
            </Flex>
        );
    }

    return (
        <div style={tileStyle}>
            {primaryTile}
        </div>
    );
}

function ScreenLinkPanel({
    compact,
    description,
    icon,
    label,
    link,
    onCopy,
    onOpen,
    tag,
}: {
    compact?: boolean;
    description: string;
    icon: ReactNode;
    label: string;
    link: string;
    onCopy: () => void;
    onOpen: () => void;
    tag: string;
}) {
    const { token } = theme.useToken();

    return (
        <Card style={{ background: token.colorBgLayout, borderRadius: 16 }}>
            <Flex gap={10} vertical>
                <Flex align="center" gap={8} wrap="wrap">
                    {icon}
                    <Text strong style={{ fontSize: compact ? 13 : 14 }}>{label}</Text>
                    <Tag color="primary">{tag}</Tag>
                </Flex>
                <Text style={{ color: token.colorTextSecondary, fontSize: compact ? 11 : 12 }}>{description}</Text>
                <Text
                    style={{
                        background: token.colorBgContainer,
                        borderRadius: 8,
                        color: token.colorTextSecondary,
                        fontFamily: 'monospace',
                        fontSize: 11,
                        padding: '6px 8px',
                        wordBreak: 'break-all',
                    }}
                >
                    {link.replace(/^https?:\/\//, '')}
                </Text>
                <Flex gap={8}>
                    <Button block fill="outline" onClick={onCopy}>
                        <Flex align="center" gap={6} justify="center">
                            <LuCopy size={14} />
                            <Text>Copy</Text>
                        </Flex>
                    </Button>
                    <Button block fill="outline" onClick={onOpen}>
                        <Flex align="center" gap={6} justify="center">
                            <LuExternalLink size={14} />
                            <Text>Open</Text>
                        </Flex>
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

function GuideButton({
    compact,
    icon,
    label,
    onClick,
}: {
    compact?: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <Button fill="outline" onClick={onClick} style={{ flex: '1 1 calc(33.33% - 7px)', minHeight: compact ? 68 : 74, minWidth: 104, whiteSpace: 'normal' }}>
            <Flex align="center" gap={6} justify="center" vertical>
                {icon}
                <Text strong style={{ fontSize: compact ? 12 : 13, lineHeight: 1.2, textAlign: 'center' }}>{label}</Text>
            </Flex>
        </Button>
    );
}

function GuideSheet({
    guide,
    onClose,
    visible,
}: {
    guide: {
        items: Array<{ body: string; title?: string }>;
        ordered: boolean;
        title: string;
    } | null;
    onClose: () => void;
    visible: boolean;
}) {
    const { token } = theme.useToken();

    return (
        <Popup
            bodyStyle={{ maxHeight: '94vh', overflow: 'hidden', padding: 0 }}
            destroyOnClose
            onMaskClick={onClose}
            visible={visible}
        >
            <Flex style={{ height: '100%', maxHeight: '94vh' }} vertical>
                <NavBar backIcon={<LuX size={20} />} onBack={onClose}>
                    {guide?.title || ''}
                </NavBar>
                <Flex gap={10} style={{ overflowY: 'auto', padding: 12 }} vertical>
                    {guide?.items.map((item, index) => (
                        <Card key={`${item.title || item.body}-${index}`} style={{ background: token.colorBgLayout, borderRadius: 16 }}>
                            <Flex align="flex-start" gap={10}>
                                {guide.ordered ? (
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            background: token.colorPrimary,
                                            borderRadius: 999,
                                            color: token.colorTextLightSolid,
                                            flexShrink: 0,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            height: 24,
                                            width: 24,
                                        }}
                                    >
                                        {index + 1}
                                    </Flex>
                                ) : null}
                                <Flex gap={2} vertical>
                                    {item.title ? <Text strong>{item.title}</Text> : null}
                                    <Text style={{ color: token.colorTextSecondary }}>{item.body}</Text>
                                </Flex>
                            </Flex>
                        </Card>
                    ))}
                </Flex>
            </Flex>
        </Popup>
    );
}


function SectionHeader({ compact, subtitle, title }: { compact?: boolean; subtitle?: string; title: string }) {
    const { token } = theme.useToken();

    return (
        <Flex gap={4} vertical>
            <Text strong style={{ color: token.colorText, fontSize: compact ? 14 : 15 }}>
                {title}
            </Text>
            {subtitle ? <Text style={{ color: token.colorTextSecondary, fontSize: compact ? 11 : 12 }}>{subtitle}</Text> : null}
        </Flex>
    );
}

function buildStoreAddress(storeDetails: any) {
    if (!storeDetails) return undefined;
    const parts = [
        storeDetails.addressLine || storeDetails.address,
        storeDetails.city,
        storeDetails.state,
        storeDetails.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
}
