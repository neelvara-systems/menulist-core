'use client';

import { FEATURE_FLAGS } from '@config/features';
import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { labelConfirmDialogTitle } from '@lib/accessibility/antConfirmDialog';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob } from '@lib/menu-kit/menuKitGenerator';
import { PRINTABLE_ASSET_TYPES, getPrintableAssetPreviewCopy, getPrintableAssetType, isPrintableAssetTypeId } from '@lib/printable-asset-templates/assetTypes';
import {
    buildPrintableAssetEditorDocument,
    isPrintableAssetEditorRenderable,
    rehydratePrintableAssetEditorDocument,
    renderPrintableAssetEditorDocumentFiles,
    stripPrintableAssetEditorAttributionLayers,
} from '@lib/printable-asset-templates/editorDocumentAdapter';
import { renderPrintableAsset, renderPrintableAssetDownloadFiles } from '@lib/printable-asset-templates/renderPrintableAsset';
import { buildPrintableStoreContactFields } from '@lib/printable-asset-templates/storeContact';
import { getPrintableTemplateFamiliesForAsset, getPrintableTemplateFamily, normalizePrintableTemplateFamilyId } from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableAssetOutputFormat, PrintableAssetRenderInput, PrintableAssetType, PrintableAssetTypeId, PrintableTemplateFamily, PrintableTemplateFamilyId } from '@lib/printable-asset-templates/types';
import {
    deleteCreativeEditorTemplate,
    getCreativeEditorTemplate,
    listCreativeEditorTemplates,
    resolveCreativeEditorTemplateScope,
    saveCreativeEditorTemplate,
    type CreativeEditorTemplateContext,
} from '@lib/creative-editor/templateRegistryDal';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { createRandomIdSegment } from '@lib/runtime/randomId';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import type { CreativeEditorDocument, CreativeEditorTemplateSaveRequest, CreativeEditorTemplateSummary } from '@/modules/creative-editor/types';
import PrintableTemplatePreview from '@/components/shared/printableAssets/PrintableTemplatePreview';
import { App as AntApp, Button, Card, Col, Empty, Flex, Modal, Row, Spin, theme, Typography } from 'antd';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuBadge, LuBadgePercent, LuCalendarDays, LuContact, LuDownload, LuFileText, LuGift, LuMail, LuMegaphone, LuPackage, LuPrinter, LuQrCode, LuSparkles, LuTag, LuTrash2, LuX } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../../shared/ProjectSelector';
import NoSubscriptionView from '../billing/NoSubscriptionView';

const { Paragraph, Text, Title } = Typography;

const CreativeEditor = dynamic(() => import('@/modules/creative-editor/CreativeEditor'), {
    loading: () => (
        <Flex align="center" justify="center" style={{ height: '100%' }}>
            <Spin />
        </Flex>
    ),
    ssr: false,
});

type ProjectLink = {
    active?: boolean;
    deleted?: boolean;
    feedbackUrl: string;
    feedbackQrUrl: string;
    isDefault: boolean;
    isSpecialMenu?: boolean;
    menuModifiedOn?: unknown;
    name: string | Record<string, string>;
    projectImage?: string | null;
    projectId: string;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: 'scheduled' | 'active' | 'expired' | 'cancelled';
    url: string;
};

type AssetsData = {
    allProjects: ProjectLink[];
    businessType: string;
    feedbackQrLink: string;
    hasFeedbackEnabled: boolean;
    menuLink: string;
    menuModifiedOn?: unknown;
    obpLink: string;
    projectId: string | null;
    projectName: string | null;
    storeLogo?: string | null;
    storeName: string;
};

type PendingTemplateSaveReservation = {
    inFlight: number;
    key: string;
    templateId: string;
};

const createReservedTemplateId = (): string => (
    `tpl_${Date.now().toString(36)}_${createRandomIdSegment(10)}`
);

type PageState = 'loading' | 'ready' | 'no_menu';

type PreviewAssetState = {
    blob: Blob;
    filename: string;
    label: string;
    outputFormat: PrintableAssetOutputFormat;
    url: string;
};

type PrintAssetEditorState = {
    activePlanType?: string | null;
    assetTypeId: PrintableAssetTypeId;
    initialDocument: CreativeEditorDocument;
    savedTemplateId?: string;
    templateFamilyId: PrintableTemplateFamilyId;
    title: string;
};

type PlatformTemplateCard = {
    description: string;
    family: PrintableTemplateFamily;
    id: string;
    source: 'generated' | 'registry';
    template?: CreativeEditorTemplateSummary;
    thumbnailUrl?: string | null;
    title: string;
};

const normalizeTemplateThumbnailUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= 4_000 ? normalized : null;
};

const normalizeTemplateDimension = (value: unknown): number => (
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1
);

function getAssetIcon(assetId: PrintableAssetTypeId) {
    if (assetId === 'print_menu') return <LuFileText size={18} />;
    if (assetId === 'complete_menu_kit') return <LuPackage size={18} />;
    if (assetId === 'entrance_poster') return <LuPrinter size={18} />;
    if (assetId === 'campaign_flyer') return <LuMegaphone size={18} />;
    if (assetId === 'gift_certificate') return <LuGift size={18} />;
    if (assetId === 'business_card') return <LuBadge size={18} />;
    if (assetId === 'staff_id_card') return <LuContact size={18} />;
    if (assetId === 'event_invitation') return <LuCalendarDays size={18} />;
    if (assetId === 'postcard') return <LuMail size={18} />;
    if (assetId === 'product_tag') return <LuTag size={18} />;
    if (assetId === 'campaign_poster') return <LuBadgePercent size={18} />;
    return <LuQrCode size={18} />;
}

function parseTimestamp(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(value);
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? undefined : new Date(parsed);
    }
    if (typeof value === 'object') {
        const record = value as { seconds?: number; toDate?: () => Date; toMillis?: () => number };
        if (typeof record.toDate === 'function') return record.toDate();
        if (typeof record.toMillis === 'function') return new Date(record.toMillis());
        if (typeof record.seconds === 'number') return new Date(record.seconds * 1000);
    }
    return undefined;
}

function getPrintableDownloadActionLabel(outputFormat: PrintableAssetOutputFormat, assetId?: PrintableAssetTypeId): string {
    if (outputFormat === 'pdf') return 'Download PDF';
    if (outputFormat === 'zip') return 'Download ZIP';
    if (assetId === 'print_menu') return 'Download first page image';
    if (assetId === 'business_card') return 'Download front + back images';
    return 'Download image';
}

function getPrintableActionFormats(asset: PrintableAssetType): PrintableAssetOutputFormat[] {
    return (asset.supportedOutputFormats || [asset.outputFormat]).filter((format) => format !== 'zip');
}

function getPrintablePreviewFormat(asset: PrintableAssetType): PrintableAssetOutputFormat | null {
    if (asset.outputFormat === 'zip') return null;
    return 'png';
}

function downloadPrintableResults(files: Array<{ blob: Blob; filename: string }>) {
    files.forEach((file) => downloadBlob(file.blob, file.filename));
}

function getPrintableActionModalWidth(assetId: PrintableAssetTypeId): number {
    if (assetId === 'table_tent') return 640;
    if (assetId === 'business_card') return 720;
    if (assetId === 'gift_certificate' || assetId === 'postcard' || assetId === 'product_tag') return 620;
    if (assetId === 'counter_sticker' || assetId === 'feedback_qr') return 500;
    return 540;
}

function getPrintableActionPreviewHeight(assetId: PrintableAssetTypeId): number {
    if (assetId === 'table_tent') return 340;
    if (assetId === 'business_card') return 260;
    if (assetId === 'gift_certificate' || assetId === 'postcard' || assetId === 'product_tag') return 300;
    if (assetId === 'staff_id_card') return 420;
    if (assetId === 'counter_sticker' || assetId === 'feedback_qr') return 330;
    if (assetId === 'print_menu' || assetId === 'entrance_poster') return 420;
    return 420;
}

function buildExportData(projectData: any) {
    const extractedData = projectData?.extractedData || {};
    const fileItems = Array.isArray(projectData?.files)
        ? projectData.files.flatMap((file: any) => file?.extractedData?.data?.items || [])
        : [];
    const fileCategories = Array.isArray(projectData?.files)
        ? projectData.files.flatMap((file: any) => file?.extractedData?.data?.categories || [])
        : [];
    const items = Array.isArray(extractedData.items) && extractedData.items.length > 0
        ? extractedData.items
        : fileItems;
    const categories = Array.isArray(extractedData.categories) && extractedData.categories.length > 0
        ? extractedData.categories
        : fileCategories;
    return { categories, items };
}

export default function PrintableAssetTemplatesRoute() {
    const { activeSubscription, activeSubscriptionLoading, storeDetails } = useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const { message: messageApi, modal } = AntApp.useApp();
    const projectIdQuery = searchParams?.get('projectId') || '';
    const [pageState, setPageState] = useState<PageState>('loading');
    const [data, setData] = useState<AssetsData | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<PrintableAssetTypeId>(() => {
        const fromQuery = searchParams?.get('asset');
        return isPrintableAssetTypeId(fromQuery) ? fromQuery : 'single_table_card';
    });
    const [activeTemplateId, setActiveTemplateId] = useState<PrintableTemplateFamilyId | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [editorBusyKey, setEditorBusyKey] = useState<string | null>(null);
    const [editorState, setEditorState] = useState<PrintAssetEditorState | null>(null);
    const [platformTemplates, setPlatformTemplates] = useState<CreativeEditorTemplateSummary[]>([]);
    const [platformTemplatesState, setPlatformTemplatesState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [userTemplates, setUserTemplates] = useState<CreativeEditorTemplateSummary[]>([]);
    const [userTemplatesState, setUserTemplatesState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [activePlatformTemplate, setActivePlatformTemplate] = useState<CreativeEditorTemplateSummary | null>(null);
    const [previewAsset, setPreviewAsset] = useState<PreviewAssetState | null>(null);
    const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [editorDirty, setEditorDirty] = useState(false);
    const editorDocumentRef = useRef<CreativeEditorDocument | null>(null);
    const editorBaselineRef = useRef('');
    const editorCloseConfirmOpenRef = useRef(false);
    const pendingTemplateSaveReservationRef = useRef<PendingTemplateSaveReservation | null>(null);
    const previewRequestRef = useRef(0);
    const previewUrlRef = useRef<string | null>(null);
    const projectDataCacheRef = useRef<Record<string, any>>({});
    const storeData = storeDetails as any;
    const sessionData = session as any;
    const storeBusinessType = storeDetails?.businessType;
    const storeBusinessCategory = storeData?.businessCategory;
    const storeTenantId = storeData?.tenantId ?? storeData?.tId;
    const storeStoreId = storeData?.storeId ?? storeData?.sId;
    const sessionTenantId = sessionData?.tId ?? sessionData?.user?.tenantId;
    const sessionStoreId = sessionData?.sId ?? sessionData?.user?.storeId;
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);

    const labels = useMemo(
        () => getOfferingLabels(storeBusinessType, storeBusinessCategory),
        [storeBusinessCategory, storeBusinessType],
    );
    const storeDisplayName = useMemo(
        () => getStoreContextName(storeDetails as any, 'Your Business'),
        [storeDetails],
    );
    const storeBrandColor = useMemo(
        () => resolveStoreBrandColor(storeDetails as any),
        [storeDetails],
    );
    const selectedAsset = getPrintableAssetType(selectedAssetId);
    const selectedAssetActionFormats = getPrintableActionFormats(selectedAsset);
    const canCustomizeSelectedAsset = (
        FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_CUSTOMIZE
        && isPrintableAssetEditorRenderable(selectedAssetId)
    );
    const canUsePlatformTemplateRegistry = (
        FEATURE_FLAGS.ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY
        && FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_EDITOR_RENDERER
    );
    const templateRegistryScope = useMemo(
        () => resolveCreativeEditorTemplateScope({
            session: {
                sId: sessionStoreId,
                tId: sessionTenantId,
            },
            storeDetails: {
                sId: storeStoreId,
                tId: storeTenantId,
            },
        }),
        [sessionStoreId, sessionTenantId, storeStoreId, storeTenantId],
    );
    const canLoadUserTemplates = (
        FEATURE_FLAGS.ENABLE_CREATIVE_EDITOR_TEMPLATE_REGISTRY
        && FEATURE_FLAGS.ENABLE_CREATIVE_EDITOR_USER_TEMPLATES
        && FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_USER_TEMPLATES
        && Boolean(templateRegistryScope)
    );
    const canUseUserTemplates = canLoadUserTemplates && canCustomizeSelectedAsset;
    const platformBusinessCategory = useMemo(
        () => resolveBusinessCategory(
            storeBusinessType,
            storeBusinessCategory,
        ) || 'generic',
        [storeBusinessCategory, storeBusinessType],
    );
    const templateRegistryContext = useMemo<CreativeEditorTemplateContext>(() => ({
        productId: 'menulist',
        scope: templateRegistryScope,
        sourceSurface: 'printable-asset-templates',
    }), [templateRegistryScope]);
    const platformTemplateRegistryContext = useMemo<CreativeEditorTemplateContext>(() => ({
        ...templateRegistryContext,
        businessCategory: platformBusinessCategory,
    }), [platformBusinessCategory, templateRegistryContext]);
    const availableTemplateFamilies = useMemo(
        () => getPrintableTemplateFamiliesForAsset(selectedAssetId),
        [selectedAssetId],
    );
    const activeTemplateFamily = useMemo(
        () => activePlatformTemplate
            ? getPrintableTemplateFamily(activePlatformTemplate.templateFamilyId)
            : activeTemplateId
                ? getPrintableTemplateFamily(activeTemplateId)
                : null,
        [activePlatformTemplate, activeTemplateId],
    );
    const selectedPlatformTemplates = useMemo(
        () => platformTemplates.filter((template) => (
            template.assetTypeId === selectedAssetId
            && template.productId === templateRegistryContext.productId
            && template.sourceSurface === templateRegistryContext.sourceSurface
        )),
        [platformTemplates, selectedAssetId, templateRegistryContext.productId, templateRegistryContext.sourceSurface],
    );
    const selectedUserTemplates = useMemo(
        () => userTemplates.filter((template) => (
            template.assetTypeId === selectedAssetId
            && template.productId === templateRegistryContext.productId
            && template.sourceSurface === templateRegistryContext.sourceSurface
        )),
        [selectedAssetId, templateRegistryContext.productId, templateRegistryContext.sourceSurface, userTemplates],
    );
    const shouldShowSavedDesigns = (
        canUseUserTemplates
        && (
            selectedUserTemplates.length > 0
            || userTemplatesState === 'loading'
            || userTemplatesState === 'error'
        )
    );
    const platformTemplateCards = useMemo<PlatformTemplateCard[]>(() => {
        if (selectedPlatformTemplates.length) {
            return selectedPlatformTemplates.map((template) => {
                const family = getPrintableTemplateFamily(template.templateFamilyId);
                return {
                    description: typeof template.description === 'string' && template.description.trim()
                        ? template.description
                        : family.description,
                    family,
                    id: template.id,
                    source: 'registry',
                    template,
                    thumbnailUrl: normalizeTemplateThumbnailUrl(template.thumbnailUrl),
                    title: template.title || family.label,
                };
            });
        }

        return availableTemplateFamilies.map((family) => ({
            description: family.description,
            family,
            id: family.id,
            source: 'generated',
            title: family.label,
        }));
    }, [availableTemplateFamilies, selectedPlatformTemplates]);
    const { actionLabel: previewActionLabel, instructionLabel: previewInstructionLabel } = getPrintableAssetPreviewCopy(selectedAssetId, labels);
    const activeProject = data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null;
    const projectSelectorItems = useMemo<ProjectSelectorItem[]>(() => (
        data?.allProjects.map((project) => ({
            active: project.active,
            deleted: project.deleted,
            id: project.projectId,
            isDefault: project.isDefault,
            isSpecialMenu: project.isSpecialMenu,
            name: project.name,
            projectImage: project.projectImage,
            secondaryLabel: project.url.replace(/^https?:\/\//, ''),
            specialMenuBaseProjectId: project.specialMenuBaseProjectId,
            specialMenuEndsAt: project.specialMenuEndsAt,
            specialMenuStatus: project.specialMenuStatus,
        })) || []
    ), [data?.allProjects]);

    const resolveProjectName = useCallback(
        (name: string | Record<string, string> | undefined, fallback = labels.offeringTitle) => (
            getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback)
        ),
        [labels.offeringTitle],
    );

    const releasePreviewUrl = useCallback(() => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
    }, []);

    useEffect(() => () => {
        releasePreviewUrl();
    }, [releasePreviewUrl]);

    useEffect(() => {
        async function loadData() {
            if (
                !FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES
                || activeSubscriptionLoading
                || !hasPaidAccess
                || !storeDetails
            ) {
                setPageState('loading');
                return;
            }

            try {
                projectDataCacheRef.current = {};
                const result = await getExistingProjectsListWithoutLoader(true);
                const projects = result?.projects || [];
                const defaultProject = projects.find((project: any) => project.projectId === projectIdQuery)
                    || projects.find((project: any) => project.isDefault)
                    || projects[0];

                if (!projects.length || !defaultProject) {
                    setPageState('no_menu');
                    return;
                }

                const subdomain = storeDetails.subdomain || '';
                const customDomain = storeDetails.customDomain;
                const obpLink = generateOBPUrl(subdomain, customDomain);
                const allProjects: ProjectLink[] = projects.map((project: any) => ({
                    active: project.active !== false,
                    deleted: project.deleted === true,
                    feedbackQrUrl: project.projectId ? getFeedbackUrl(project.projectId, 'feedback_qr', obpLink) : '',
                    feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId, 'direct_link', obpLink) : '',
                    isDefault: project.isDefault || false,
                    isSpecialMenu: project.isSpecialMenu === true,
                    menuModifiedOn: storeDetails.lastPublishedAt || null,
                    name: project.name,
                    projectImage: project.projectImage || null,
                    projectId: project.projectId,
                    specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                    specialMenuEndsAt: project.specialMenuEndsAt,
                    specialMenuStatus: project.specialMenuStatus,
                    url: generateProjectUrl(subdomain, customDomain, resolveProjectName(project.name), false),
                }));

                setData({
                    allProjects,
                    businessType: storeDetails.businessType || '',
                    feedbackQrLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'feedback_qr', obpLink) : '',
                    hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
                    menuLink: generateProjectUrl(subdomain, customDomain, resolveProjectName(defaultProject.name), false),
                    menuModifiedOn: storeDetails.lastPublishedAt || null,
                    obpLink,
                    projectId: defaultProject.projectId || null,
                    projectName: resolveProjectName(defaultProject.name),
                    storeLogo: storeDetails.logo || null,
                    storeName: storeDisplayName,
                });
                setPageState('ready');
            } catch {
                setPageState('no_menu');
            }
        }

        void loadData();
    }, [activeSubscriptionLoading, hasPaidAccess, labels.offeringTitle, projectIdQuery, resolveProjectName, storeDetails, storeDisplayName]);

    const reloadPlatformTemplates = useCallback(async () => {
        if (!canUsePlatformTemplateRegistry || pageState !== 'ready') {
            setPlatformTemplates([]);
            setPlatformTemplatesState('idle');
            return;
        }
        setPlatformTemplatesState('loading');
        try {
            const templates = await listCreativeEditorTemplates({
                ...platformTemplateRegistryContext,
                limit: 100,
                templateType: 'platform',
            });
            setPlatformTemplates(templates);
            setPlatformTemplatesState('ready');
        } catch {
            setPlatformTemplates([]);
            setPlatformTemplatesState('error');
        }
    }, [canUsePlatformTemplateRegistry, pageState, platformTemplateRegistryContext]);

    useEffect(() => {
        void reloadPlatformTemplates();
    }, [reloadPlatformTemplates]);

    const reloadUserTemplates = useCallback(async () => {
        if (!canLoadUserTemplates || pageState !== 'ready') {
            setUserTemplates([]);
            setUserTemplatesState('idle');
            return;
        }
        setUserTemplatesState('loading');
        try {
            const templates = await listCreativeEditorTemplates({ ...templateRegistryContext, limit: 100, templateType: 'user' });
            setUserTemplates(templates);
            setUserTemplatesState('ready');
        } catch {
            setUserTemplates([]);
            setUserTemplatesState('error');
        }
    }, [canLoadUserTemplates, pageState, templateRegistryContext]);

    useEffect(() => {
        void reloadUserTemplates();
    }, [reloadUserTemplates]);

    const closePreviewAsset = (invalidatePendingPreview = true) => {
        if (invalidatePendingPreview) previewRequestRef.current += 1;
        releasePreviewUrl();
        setPreviewAsset(null);
        setPreviewState('idle');
    };

    const resetEditor = () => {
        editorDocumentRef.current = null;
        editorBaselineRef.current = '';
        setEditorDirty(false);
        setEditorBusyKey(null);
        setEditorState(null);
    };

    const requestCloseEditor = () => {
        if (!editorDirty) {
            resetEditor();
            return;
        }
        if (editorCloseConfirmOpenRef.current) return;
        editorCloseConfirmOpenRef.current = true;
        let discardConfirmed = false;
        const confirmationTitle = 'Discard unsaved design changes?';
        modal.confirm({
            afterClose: () => {
                editorCloseConfirmOpenRef.current = false;
                if (discardConfirmed) resetEditor();
            },
            cancelText: 'Keep editing',
            content: 'These changes are not saved as a reusable design.',
            okText: 'Discard changes',
            okType: 'danger',
            onOk: () => {
                discardConfirmed = true;
            },
            title: labelConfirmDialogTitle(confirmationTitle),
            zIndex: 2200,
        });
    };

    const isEditorOpen = Boolean(editorState);

    useEffect(() => {
        if (!isEditorOpen) return undefined;
        const htmlOverflow = document.documentElement.style.overflow;
        const bodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = htmlOverflow;
            document.body.style.overflow = bodyOverflow;
        };
    }, [isEditorOpen]);

    useEffect(() => {
        if (!editorDirty) return undefined;
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [editorDirty]);

    const handleSelectAsset = (assetId: PrintableAssetTypeId) => {
        setSelectedAssetId(assetId);
        setActiveTemplateId(null);
        setActivePlatformTemplate(null);
        resetEditor();
        closePreviewAsset();
    };

    const closeTemplateActions = () => {
        setActiveTemplateId(null);
        setActivePlatformTemplate(null);
        closePreviewAsset();
        setBusyKey((current) => current?.startsWith('preview:') ? null : current);
    };

    const handleSelectProject = (projectId: string) => {
        const project = data?.allProjects.find((item) => item.projectId === projectId);
        if (!project) return;
        resetEditor();
        closePreviewAsset();
        setData((current) => current ? {
            ...current,
            feedbackQrLink: project.feedbackQrUrl,
            menuModifiedOn: project.menuModifiedOn || null,
            menuLink: project.url,
            projectId: project.projectId,
            projectName: resolveProjectName(project.name),
        } : current);
        setIsProjectSelectorOpen(false);
    };

    const getCachedProjectData = async (projectId: string | null): Promise<any | null> => {
        if (!projectId) return null;
        const cachedProject = projectDataCacheRef.current[projectId];
        if (cachedProject) return cachedProject;
        const projectData = await getProjectDataWithoutLoader(projectId);
        projectDataCacheRef.current[projectId] = projectData;
        return projectData;
    };

    const buildRenderInput = async (templateFamilyId: PrintableTemplateFamilyId): Promise<PrintableAssetRenderInput | null> => {
        if (!data) return null;
        const contactFields = buildPrintableStoreContactFields(storeDetails);
        const baseInput: PrintableAssetRenderInput = {
            activePlanType: (storeDetails as any)?.activePlanType,
            assetTypeId: selectedAssetId,
            brandColor: storeBrandColor,
            businessCategory: platformBusinessCategory,
            businessType: (storeDetails as any)?.businessType || data.businessType,
            ...contactFields,
            feedbackUrl: data.feedbackQrLink,
            lastPublishedAt: parseTimestamp(data.menuModifiedOn),
            logoUrl: data.storeLogo || undefined,
            menuUrl: data.menuLink,
            obpBaseUrl: data.obpLink,
            projectId: data.projectId,
            shortLink: (selectedAssetId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace(/^https?:\/\//, ''),
            storeName: data.storeName,
            templateFamilyId,
        };

        if (selectedAssetId !== 'print_menu') return baseInput;

        const projectData = await getCachedProjectData(data.projectId);
        const exportData = buildExportData(projectData as any);
        if (!exportData.items.length) {
            messageApi.warning(`No ${labels.offeringLower} items to export`);
            return null;
        }

        return {
            ...baseInput,
            printMenuOptions: {
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                businessCategory: platformBusinessCategory,
                businessType: (storeDetails as any)?.businessType || data.businessType,
                categories: exportData.categories,
                currency: (storeDetails as any)?.currencySymbol || '',
                currencyCode: (storeDetails as any)?.currencyCode || (storeDetails as any)?.currency || undefined,
                items: exportData.items.filter((item: any) => item.active !== false),
                language: (projectData as any)?.defaultLanguage || (storeDetails as any)?.defaultLanguage || 'en',
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

    const renderTemplatePreview = async (templateFamilyId: PrintableTemplateFamilyId, platformTemplate?: CreativeEditorTemplateSummary) => {
        previewRequestRef.current += 1;
        const requestId = previewRequestRef.current;
        if (normalizeTemplateThumbnailUrl(platformTemplate?.thumbnailUrl)) {
            closePreviewAsset(false);
            setPreviewState('ready');
            return;
        }
        const previewFormat = getPrintablePreviewFormat(selectedAsset);
        closePreviewAsset(false);
        if (!previewFormat) {
            if (previewRequestRef.current === requestId) setPreviewState('ready');
            return;
        }

        const busy = `preview:${selectedAssetId}:${templateFamilyId}:${previewFormat}`;
        setBusyKey(busy);
        setPreviewState('loading');
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) {
                if (previewRequestRef.current === requestId) setPreviewState('idle');
                return;
            }
            const result = await renderPrintableAsset({ ...input, outputFormat: previewFormat });
            const previewUrl = URL.createObjectURL(new Blob([result.blob], { type: result.mimeType }));
            if (previewRequestRef.current !== requestId) {
                URL.revokeObjectURL(previewUrl);
                return;
            }
            releasePreviewUrl();
            previewUrlRef.current = previewUrl;
            setPreviewAsset({
                blob: result.blob,
                filename: result.filename,
                label: `${selectedAsset.title} - ${getPrintableTemplateFamily(templateFamilyId).label}`,
                outputFormat: result.outputFormat,
                url: previewUrl,
            });
            setPreviewState('ready');
        } catch {
            if (previewRequestRef.current === requestId) setPreviewState('error');
        } finally {
            if (previewRequestRef.current === requestId) setBusyKey(null);
        }
    };

    const openTemplateActions = (card: PlatformTemplateCard) => {
        setActiveTemplateId(card.family.id);
        setActivePlatformTemplate(card.template || null);
        void renderTemplatePreview(card.family.id, card.template);
    };

    const handleRender = async (templateFamilyId: PrintableTemplateFamilyId, outputFormat: PrintableAssetOutputFormat) => {
        const busy = `download:${selectedAssetId}:${templateFamilyId}:${outputFormat}`;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const files = await renderPrintableAssetDownloadFiles({ ...input, outputFormat });
            downloadPrintableResults(files);
            messageApi.success(files.length > 1 ? `${selectedAsset.title} front and back images downloaded` : `${selectedAsset.title} downloaded`);
        } catch {
            messageApi.error(`Failed to generate ${selectedAsset.title}`);
        } finally {
            setBusyKey(null);
        }
    };

    const handleRenderPlatformTemplate = async (template: CreativeEditorTemplateSummary, outputFormat: PrintableAssetOutputFormat) => {
        const templateFamilyId = normalizePrintableTemplateFamilyId(template.templateFamilyId);
        const busy = `download-platform:${selectedAssetId}:${template.id}:${outputFormat}`;
        setBusyKey(busy);
        try {
            if (outputFormat === 'zip') {
                await handleRender(templateFamilyId, outputFormat);
                return;
            }
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const result = await getCreativeEditorTemplate({
                ...platformTemplateRegistryContext,
                assetTypeId: template.assetTypeId || selectedAssetId,
                templateId: template.id,
                templateType: 'platform',
            });
            const documentValue = stripPrintableAssetEditorAttributionLayers(rehydratePrintableAssetEditorDocument(result.document, input));
            const renderedFiles = await renderPrintableAssetEditorDocumentFiles({
                activePlanType: input.activePlanType,
                assetTypeId: selectedAssetId,
                document: documentValue,
                outputFormat,
                templateFamilyId,
            });
            downloadPrintableResults(renderedFiles);
            messageApi.success(renderedFiles.length > 1 ? `${selectedAsset.title} front and back images downloaded` : `${selectedAsset.title} downloaded`);
        } catch {
            messageApi.error(`Failed to generate ${selectedAsset.title}`);
        } finally {
            setBusyKey(null);
        }
    };

    const startEditorSession = (nextState: PrintAssetEditorState) => {
        const cleanDocument = stripPrintableAssetEditorAttributionLayers(nextState.initialDocument);
        editorDocumentRef.current = cleanDocument;
        editorBaselineRef.current = JSON.stringify(cleanDocument);
        setEditorDirty(false);
        setEditorState({ ...nextState, initialDocument: cleanDocument });
    };

    const openEditorForTemplate = async (templateFamilyId: PrintableTemplateFamilyId) => {
        if (!canCustomizeSelectedAsset) return;
        const busy = `customize:${selectedAssetId}:${templateFamilyId}`;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const documentValue = stripPrintableAssetEditorAttributionLayers(buildPrintableAssetEditorDocument(input));
            startEditorSession({
                activePlanType: input.activePlanType,
                assetTypeId: selectedAssetId,
                initialDocument: documentValue,
                templateFamilyId,
                title: `${selectedAsset.title} - ${getPrintableTemplateFamily(templateFamilyId).label}`,
            });
            setActiveTemplateId(null);
            closePreviewAsset();
        } catch {
            messageApi.error(`Failed to open ${selectedAsset.title} in the editor`);
        } finally {
            setBusyKey(null);
        }
    };

    const openEditorForPlatformTemplate = async (template: CreativeEditorTemplateSummary) => {
        if (!canCustomizeSelectedAsset) return;
        const templateFamilyId = normalizePrintableTemplateFamilyId(template.templateFamilyId);
        const busy = `customize-platform:${selectedAssetId}:${template.id}`;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const result = await getCreativeEditorTemplate({
                ...platformTemplateRegistryContext,
                assetTypeId: template.assetTypeId || selectedAssetId,
                templateId: template.id,
                templateType: 'platform',
            });
            const documentValue = stripPrintableAssetEditorAttributionLayers(rehydratePrintableAssetEditorDocument(result.document, input));
            startEditorSession({
                activePlanType: input.activePlanType,
                assetTypeId: selectedAssetId,
                initialDocument: documentValue,
                templateFamilyId,
                title: template.title,
            });
            setActiveTemplateId(null);
            setActivePlatformTemplate(null);
            closePreviewAsset();
        } catch {
            messageApi.error(`Failed to open ${selectedAsset.title} in the editor`);
        } finally {
            setBusyKey(null);
        }
    };

    const openEditorForUserTemplate = async (template: CreativeEditorTemplateSummary) => {
        if (!canUseUserTemplates) return;
        const templateFamilyId = normalizePrintableTemplateFamilyId(template.templateFamilyId);
        const busy = `user-template:${template.id}`;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            const result = await getCreativeEditorTemplate({
                ...templateRegistryContext,
                assetTypeId: template.assetTypeId || selectedAssetId,
                templateId: template.id,
            });
            const documentValue = stripPrintableAssetEditorAttributionLayers(rehydratePrintableAssetEditorDocument(result.document, input));
            startEditorSession({
                activePlanType: input.activePlanType,
                assetTypeId: selectedAssetId,
                initialDocument: documentValue,
                savedTemplateId: template.id,
                templateFamilyId,
                title: template.title,
            });
            setActiveTemplateId(null);
            closePreviewAsset();
        } catch {
            messageApi.error('Failed to open saved design');
        } finally {
            setBusyKey(null);
        }
    };

    const handleDeleteUserTemplate = (template: CreativeEditorTemplateSummary) => {
        const confirmationTitle = `Delete "${template.title}"?`;
        modal.confirm({
            content: 'This removes the saved design. Ready generated templates stay available.',
            okText: 'Delete',
            okType: 'danger',
            onOk: async () => {
                await deleteCreativeEditorTemplate({
                    ...templateRegistryContext,
                    assetTypeId: template.assetTypeId || selectedAssetId,
                    templateId: template.id,
                });
                setUserTemplates((current) => current.filter((item) => item.id !== template.id));
                messageApi.success('Saved design deleted');
            },
            title: labelConfirmDialogTitle(confirmationTitle),
        });
    };

    const handleEditorDocumentChange = useCallback((documentValue: CreativeEditorDocument) => {
        const cleanDocument = stripPrintableAssetEditorAttributionLayers(documentValue);
        editorDocumentRef.current = cleanDocument;
        setEditorDirty(Boolean(editorBaselineRef.current) && JSON.stringify(cleanDocument) !== editorBaselineRef.current);
    }, []);

    const handleSaveEditorTemplate = useCallback(async ({ document: documentValue, previewDataUrl }: CreativeEditorTemplateSaveRequest) => {
        if (!editorState || !canUseUserTemplates) {
            throw new Error('Template saving is not available for this asset');
        }
        const cleanDocument = stripPrintableAssetEditorAttributionLayers(documentValue);
        const reservationKey = [
            templateRegistryScope?.tId,
            templateRegistryScope?.sId,
            editorState.assetTypeId,
            editorState.templateFamilyId,
        ].join(':');
        let reservation = pendingTemplateSaveReservationRef.current;
        if (!editorState.savedTemplateId && (!reservation || reservation.key !== reservationKey)) {
            reservation = {
                inFlight: 0,
                key: reservationKey,
                templateId: createReservedTemplateId(),
            };
            pendingTemplateSaveReservationRef.current = reservation;
        }
        if (reservation && !editorState.savedTemplateId) reservation.inFlight += 1;
        const reservedTemplateId = editorState.savedTemplateId || reservation?.templateId;
        const documentTitle = typeof cleanDocument.title === 'string' ? cleanDocument.title.trim() : '';

        setEditorBusyKey('editor-template-save');
        try {
            const template = await saveCreativeEditorTemplate({
                ...templateRegistryContext,
                assetTypeId: editorState.assetTypeId,
                document: cleanDocument,
                templateFamilyId: editorState.templateFamilyId,
                templateId: reservedTemplateId,
                thumbnailDataUrl: previewDataUrl,
                title: documentTitle || editorState.title,
            });
            setEditorState((current) => current ? { ...current, savedTemplateId: template.id, title: template.title } : current);
            setUserTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
            editorDocumentRef.current = cleanDocument;
            editorBaselineRef.current = JSON.stringify(cleanDocument);
            setEditorDirty(false);
            messageApi.success('Design saved');
            return { notice: 'Design saved under Saved designs.', template };
        } finally {
            setEditorBusyKey(null);
            if (reservation && !editorState.savedTemplateId) {
                reservation.inFlight = Math.max(0, reservation.inFlight - 1);
                if (
                    reservation.inFlight === 0
                    && pendingTemplateSaveReservationRef.current === reservation
                ) {
                    pendingTemplateSaveReservationRef.current = null;
                }
            }
        }
    }, [canUseUserTemplates, editorState, messageApi, templateRegistryContext, templateRegistryScope?.sId, templateRegistryScope?.tId]);

    const handleEditorDownload = async (outputFormat: Exclude<PrintableAssetOutputFormat, 'zip'>) => {
        if (!editorState) return;
        const latestDocument = stripPrintableAssetEditorAttributionLayers(editorDocumentRef.current || editorState.initialDocument);
        const busy = `editor-download:${outputFormat}`;
        setEditorBusyKey(busy);
        try {
            const files = await renderPrintableAssetEditorDocumentFiles({
                activePlanType: editorState.activePlanType,
                assetTypeId: editorState.assetTypeId,
                document: latestDocument,
                outputFormat,
                templateFamilyId: editorState.templateFamilyId,
            });
            downloadPrintableResults(files);
            messageApi.success(files.length > 1 ? 'Front and back images downloaded' : `${outputFormat.toUpperCase()} downloaded`);
        } catch {
            messageApi.error('Failed to download edited asset');
        } finally {
            setEditorBusyKey(null);
        }
    };

    if (activeSubscriptionLoading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: 420 }}>
                <Spin size="large" />
            </Flex>
        );
    }

    if (!hasPaidAccess) {
        return <NoSubscriptionView />;
    }

    if (pageState === 'loading') {
        return (
            <Flex align="center" justify="center" style={{ minHeight: 420 }}>
                <Spin size="large" />
            </Flex>
        );
    }

    if (pageState === 'no_menu' || !data) {
        return (
            <div style={{ padding: 32 }}>
                <Empty description="Create your first menu to download assets" />
            </div>
        );
    }

    return (
        <div style={{ margin: '0 auto', maxWidth: 1280, padding: '24px clamp(16px, 3vw, 34px)', width: '100%' }}>
            <Flex align="flex-start" gap={16} justify="space-between" wrap="wrap" style={{ marginBottom: 20 }}>
                <div>
                    <Text style={{ color: token.colorTextTertiary, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase' }}>
                        Assets
                    </Text>
                    <Title level={3} style={{ margin: '4px 0 4px' }}>Ready-to-print assets</Title>
                    <Paragraph style={{ color: token.colorTextSecondary, margin: 0, maxWidth: 680 }}>
                        Choose a file type, pick a finished style, and download it from the current {labels.offeringLower}.
                    </Paragraph>
                </div>
                {activeProject ? (
                    <ProjectSelectorTrigger
                        clickable={data.allProjects.length > 1}
                        currentProject={{
                            active: activeProject.active,
                            deleted: activeProject.deleted,
                            id: activeProject.projectId,
                            isDefault: activeProject.isDefault,
                            isSpecialMenu: activeProject.isSpecialMenu,
                            name: activeProject.name,
                            projectImage: activeProject.projectImage,
                            specialMenuBaseProjectId: activeProject.specialMenuBaseProjectId,
                            specialMenuEndsAt: activeProject.specialMenuEndsAt,
                            specialMenuStatus: activeProject.specialMenuStatus,
                        }}
                        helperText={data.allProjects.length > 1 ? 'Select project' : undefined}
                        onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                    />
                ) : null}
            </Flex>

            <Row gutter={[20, 20]}>
                <Col xs={24} lg={6}>
                    <Card size="small" styles={{ body: { padding: 10 } }}>
                        <Flex gap={8} vertical>
                            {PRINTABLE_ASSET_TYPES.map((asset) => {
                                const active = selectedAssetId === asset.id;
                                const disabled = asset.requiresFeedback && !data.hasFeedbackEnabled;
                                return (
                                    <button
                                        aria-label={`${asset.title}. ${disabled ? 'Turn on feedback first' : `Output format ${asset.outputFormat.toUpperCase()}`}`}
                                        aria-pressed={active}
                                        key={asset.id}
                                        disabled={disabled}
                                        onClick={() => !disabled && handleSelectAsset(asset.id)}
                                        style={{
                                            alignItems: 'center',
                                            background: active ? token.colorPrimaryBg : token.colorBgContainer,
                                            border: `1px solid ${active ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            color: disabled ? token.colorTextDisabled : token.colorText,
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            font: 'inherit',
                                            gap: 10,
                                            minHeight: 58,
                                            padding: '10px 12px',
                                            textAlign: 'left',
                                            width: '100%',
                                        }}
                                        type="button"
                                    >
                                        <span style={{ color: active ? token.colorPrimary : token.colorTextSecondary, display: 'inline-flex' }}>
                                            {getAssetIcon(asset.id)}
                                        </span>
                                        <span style={{ minWidth: 0 }}>
                                            <Text strong style={{ display: 'block' }}>{asset.title}</Text>
                                            <Text style={{ color: disabled ? token.colorTextDisabled : token.colorTextSecondary, fontSize: 12 }}>
                                                {disabled ? 'Turn on feedback first' : asset.size}
                                            </Text>
                                        </span>
                                    </button>
                                );
                            })}
                        </Flex>
                    </Card>
                </Col>

                <Col xs={24} lg={18}>
                    {shouldShowSavedDesigns ? (
                        <div style={{ marginBottom: 22 }}>
                            <Flex align="center" justify="space-between" style={{ marginBottom: 10 }}>
                                <div>
                                    <Text strong>Saved designs</Text>
                                    <Text style={{ color: token.colorTextSecondary, display: 'block', fontSize: 12 }}>
                                        Designs you saved from the editor for {selectedAsset.title.toLowerCase()}.
                                    </Text>
                                </div>
                                <Button loading={userTemplatesState === 'loading'} onClick={() => void reloadUserTemplates()} size="small">
                                    Refresh
                                </Button>
                            </Flex>
                            {userTemplatesState === 'loading' ? (
                                <Card size="small">
                                    <Flex align="center" gap={10}>
                                        <Spin size="small" />
                                        <Text type="secondary">Loading saved designs...</Text>
                                    </Flex>
                                </Card>
                            ) : selectedUserTemplates.length ? (
                                <Row gutter={[12, 12]}>
                                    {selectedUserTemplates.map((template) => (
                                        <Col xs={24} sm={12} xl={8} key={template.id}>
                                            <Card
                                                hoverable
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        void openEditorForUserTemplate(template);
                                                    }
                                                }}
                                                onClick={() => void openEditorForUserTemplate(template)}
                                                role="button"
                                                style={{ borderRadius: 8, overflow: 'hidden' }}
                                                tabIndex={0}
                                                styles={{ body: { padding: 12 } }}
                                            >
                                                <div
                                                    style={{
                                                        alignItems: 'center',
                                                        background: token.colorBgLayout,
                                                        border: `1px solid ${token.colorBorderSecondary}`,
                                                        borderRadius: 8,
                                                        display: 'flex',
                                                        height: 118,
                                                        justifyContent: 'center',
                                                        marginBottom: 10,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    {normalizeTemplateThumbnailUrl(template.thumbnailUrl) ? (
                                                        <img
                                                            alt={`${template.title} preview`}
                                                            src={normalizeTemplateThumbnailUrl(template.thumbnailUrl) || undefined}
                                                            style={{ display: 'block', height: '100%', objectFit: 'contain', width: '100%' }}
                                                        />
                                                    ) : (
                                                        <Flex align="center" gap={8} vertical>
                                                            {getAssetIcon(selectedAssetId)}
                                                            <Text type="secondary" style={{ fontSize: 12 }}>Saved design</Text>
                                                        </Flex>
                                                    )}
                                                </div>
                                                <Flex align="flex-start" justify="space-between" gap={8}>
                                                    <div style={{ minWidth: 0 }}>
                                                        <Text strong ellipsis style={{ display: 'block' }}>{template.title}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {normalizeTemplateDimension(template.width)} x {normalizeTemplateDimension(template.height)}
                                                        </Text>
                                                    </div>
                                                    <Button
                                                        aria-label={`Delete ${template.title}`}
                                                        icon={<LuTrash2 size={15} />}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            handleDeleteUserTemplate(template);
                                                        }}
                                                        size="small"
                                                        type="text"
                                                    />
                                                </Flex>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : null}
                            {userTemplatesState === 'error' ? (
                                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                                    Saved designs could not be loaded. Ready templates are still available.
                                </Text>
                            ) : null}
                        </div>
                    ) : null}
                    <Flex align="center" justify="space-between" style={{ marginBottom: 10 }}>
                        <div>
                            <Text strong>Ready templates</Text>
                            <Text style={{ color: token.colorTextSecondary, display: 'block', fontSize: 12 }}>
                                {selectedPlatformTemplates.length
                                    ? 'Prepared styles loaded for this asset.'
                                    : `Generated from your ${labels.offeringLower} and business details.`}
                            </Text>
                        </div>
                        {platformTemplatesState === 'loading' ? <Spin size="small" /> : null}
                    </Flex>
                    {platformTemplatesState === 'error' ? (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 10 }}>
                            Template catalog could not be loaded. Ready generated templates are still available.
                        </Text>
                    ) : null}
                    <Row gutter={[16, 16]}>
                        {platformTemplateCards.map((card) => {
                            const family = card.family;
                            return (
                                <Col xs={24} sm={12} xl={8} key={card.id}>
                                    <Card
                                        aria-haspopup="dialog"
                                        aria-label={`Use ${card.title} style for ${selectedAsset.title}`}
                                        hoverable
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openTemplateActions(card);
                                            }
                                        }}
                                        onClick={() => openTemplateActions(card)}
                                        role="button"
                                        style={{
                                            borderColor: token.colorBorder,
                                            borderRadius: 8,
                                            overflow: 'hidden',
                                        }}
                                        tabIndex={0}
                                        styles={{ body: { padding: 0 } }}
                                    >
                                        <div style={{ height: 238 }}>
                                            {card.thumbnailUrl ? (
                                                <img
                                                    alt={`${card.title} preview`}
                                                    src={card.thumbnailUrl}
                                                    style={{ display: 'block', height: '100%', objectFit: 'contain', width: '100%' }}
                                                />
                                            ) : (
                                                <PrintableTemplatePreview
                                                    actionLabel={previewActionLabel}
                                                    assetTypeId={selectedAssetId}
                                                    brandColor={storeBrandColor}
                                                    compact
                                                    family={family}
                                                    instructionLabel={previewInstructionLabel}
                                                    shortLink={data.menuLink.replace(/^https?:\/\//, '')}
                                                    storeLogo={data.storeLogo}
                                                    storeName={data.storeName}
                                                />
                                            )}
                                        </div>
                                        <Flex gap={10} style={{ padding: 16 }} vertical>
                                            <Flex align="center" justify="space-between" gap={8}>
                                                <Text strong>{card.title}</Text>
                                            </Flex>
                                            <Text type="secondary" style={{ minHeight: 44 }}>{card.description}</Text>
                                            <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                                {selectedAsset.title} - {selectedAsset.size}
                                            </Text>
                                            <Text strong style={{ color: token.colorPrimary, fontSize: 13 }}>
                                                Use this style
                                            </Text>
                                        </Flex>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Col>
            </Row>

            <Modal
                footer={null}
                onCancel={() => setIsProjectSelectorOpen(false)}
                open={isProjectSelectorOpen}
                title="Select Project"
                width={560}
            >
                <ProjectSelectorList
                    currentProjectId={data.projectId}
                    onSelect={handleSelectProject}
                    projects={projectSelectorItems}
                />
            </Modal>
            <Modal
                destroyOnHidden
                footer={null}
                onCancel={closeTemplateActions}
                open={Boolean(activeTemplateFamily)}
                styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
                title={activeTemplateFamily ? `${selectedAsset.title} - ${activePlatformTemplate?.title || activeTemplateFamily.label}` : 'Download asset'}
                width={getPrintableActionModalWidth(selectedAssetId)}
            >
                {activeTemplateFamily ? (
                    <Flex gap={16} vertical>
                        <div
                            style={{
                                alignItems: 'center',
                                background: token.colorBgLayout,
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 12,
                                display: 'flex',
                                height: `min(${getPrintableActionPreviewHeight(selectedAssetId)}px, 42vh)`,
                                justifyContent: 'center',
                                minHeight: 220,
                                overflow: 'hidden',
                                padding: 12,
                            }}
                        >
                            {previewState === 'loading' ? (
                                <Flex align="center" gap={10} justify="center" vertical>
                                    <Spin />
                                    <Text type="secondary">Creating preview...</Text>
                                </Flex>
                            ) : previewAsset ? (
                                <img
                                    alt={`${previewAsset.label} preview`}
                                    src={previewAsset.url}
                                    style={{
                                        borderRadius: 8,
                                        display: 'block',
                                        maxHeight: '100%',
                                        maxWidth: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : activePlatformTemplate && normalizeTemplateThumbnailUrl(activePlatformTemplate.thumbnailUrl) ? (
                                <img
                                    alt={`${activePlatformTemplate.title} preview`}
                                    src={normalizeTemplateThumbnailUrl(activePlatformTemplate.thumbnailUrl) || undefined}
                                    style={{
                                        borderRadius: 8,
                                        display: 'block',
                                        maxHeight: '100%',
                                        maxWidth: '100%',
                                        objectFit: 'contain',
                                    }}
                                />
                            ) : previewState === 'error' ? (
                                <Text type="secondary" style={{ textAlign: 'center' }}>
                                    Preview is unavailable. Download can still generate the file.
                                </Text>
                            ) : (
                                <PrintableTemplatePreview
                                    actionLabel={previewActionLabel}
                                    assetTypeId={selectedAssetId}
                                    brandColor={storeBrandColor}
                                    family={activeTemplateFamily}
                                    instructionLabel={previewInstructionLabel}
                                    shortLink={(selectedAssetId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace(/^https?:\/\//, '')}
                                    storeLogo={data.storeLogo}
                                    storeName={data.storeName}
                                />
                            )}
                        </div>
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{activePlatformTemplate?.title || activeTemplateFamily.label}</Text>
                                <Text type="secondary">{activePlatformTemplate?.description || activeTemplateFamily.description}</Text>
                                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                    {selectedAsset.size}
                                </Text>
                            </Flex>
                            {selectedAsset.outputFormat === 'zip' ? (
                                <Button
                                    block
                                    icon={<LuDownload size={16} />}
                                    loading={
                                        activePlatformTemplate
                                            ? busyKey === `download-platform:${selectedAssetId}:${activePlatformTemplate.id}:zip`
                                            : busyKey === `download:${selectedAssetId}:${activeTemplateFamily.id}:zip`
                                    }
                                    onClick={() => activePlatformTemplate
                                        ? void handleRenderPlatformTemplate(activePlatformTemplate, 'zip')
                                        : void handleRender(activeTemplateFamily.id, 'zip')}
                                    size="large"
                                    type="primary"
                                >
                                    Download ZIP
                                </Button>
                            ) : (
                                selectedAssetActionFormats.map((format, index) => (
                                    <Button
                                        block
                                        icon={<LuDownload size={16} />}
                                        key={format}
                                        loading={
                                            activePlatformTemplate
                                                ? busyKey === `download-platform:${selectedAssetId}:${activePlatformTemplate.id}:${format}`
                                                : busyKey === `download:${selectedAssetId}:${activeTemplateFamily.id}:${format}`
                                        }
                                        onClick={() => activePlatformTemplate
                                            ? void handleRenderPlatformTemplate(activePlatformTemplate, format)
                                            : void handleRender(activeTemplateFamily.id, format)}
                                        size="large"
                                        type={index === 0 ? 'primary' : 'default'}
                                    >
                                        {getPrintableDownloadActionLabel(format, selectedAssetId)}
                                    </Button>
                                ))
                            )}
                            {canCustomizeSelectedAsset ? (
                                <Button
                                    block
                                    icon={<LuSparkles size={16} />}
                                    loading={
                                        activePlatformTemplate
                                            ? busyKey === `customize-platform:${selectedAssetId}:${activePlatformTemplate.id}`
                                            : busyKey === `customize:${selectedAssetId}:${activeTemplateFamily.id}`
                                    }
                                    onClick={() => activePlatformTemplate
                                        ? void openEditorForPlatformTemplate(activePlatformTemplate)
                                        : void openEditorForTemplate(activeTemplateFamily.id)}
                                    size="large"
                                >
                                    Customize design
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                ) : null}
            </Modal>
            {editorState && typeof document !== 'undefined' ? createPortal((
                <div
                    aria-label="Customize print asset"
                    aria-modal="true"
                    role="dialog"
                    style={{
                        background: token.colorBgLayout,
                        height: '100dvh',
                        inset: 0,
                        overflow: 'hidden',
                        position: 'fixed',
                        zIndex: 2100,
                    }}
                >
                    <CreativeEditor
                        allowNewDesign={false}
                        availableToolIds={['background', 'images', 'text', 'styles', 'brandKit']}
                        chromeMode="embedded"
                        disabledExportFormats={['json']}
                        enableBrowserDrafts
                        headerActions={[
                            {
                                disabled: Boolean(editorBusyKey),
                                icon: <LuPrinter size={16} />,
                                id: 'print-asset-pdf',
                                label: 'Print PDF',
                                loading: editorBusyKey === 'editor-download:pdf',
                                onClick: () => handleEditorDownload('pdf'),
                                requiresReadiness: true,
                                tone: 'primary',
                            },
                            {
                                disabled: Boolean(editorBusyKey),
                                icon: <LuDownload size={16} />,
                                id: 'print-asset-image',
                                label: 'Image',
                                loading: editorBusyKey === 'editor-download:png',
                                onClick: () => handleEditorDownload('png'),
                                requiresReadiness: true,
                            },
                            {
                                ariaLabel: 'Close editor',
                                disabled: Boolean(editorBusyKey),
                                icon: <LuX size={16} />,
                                id: 'print-asset-close',
                                label: 'Close',
                                onClick: requestCloseEditor,
                            },
                        ]}
                        initialDocument={editorState.initialDocument}
                        initialDrawerCollapsed
                        initialSelectedLayerId={null}
                        key={editorState.initialDocument.id}
                        onDocumentChange={handleEditorDocumentChange}
                        onTemplateSave={canUseUserTemplates ? handleSaveEditorTemplate : undefined}
                        productLabel="MenuList Assets"
                        sourceLabel="Print assets"
                        templateSaveLabel="Save reusable design"
                        templateSavePreview
                        workspaceControls={['preview']}
                    />
                </div>
            ), document.body) : null}
        </div>
    );
}
