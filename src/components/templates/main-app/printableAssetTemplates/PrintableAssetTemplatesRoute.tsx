'use client';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import {
    clearPrintableProjectThemeOverride,
    savePrintableThemePreference,
} from '@database/printableAssetStylePreferences';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { labelConfirmDialogTitle } from '@lib/accessibility/antConfirmDialog';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { usePrintableStaffBadgePeople } from '@hook/usePrintableStaffBadgePeople';
import { MENU_KIT_ASSET_KEYS } from '@lib/menu-kit/types';
import { downloadPrintableAssetFiles } from '@lib/printable-asset-templates/assetDelivery';
import { getAssetBusinessProfileReadiness } from '@lib/printable-asset-templates/businessProfile';
import { PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS, getPrintableAssetPreviewCopy, getPrintableAssetType, isPrintableAssetTypeId } from '@lib/printable-asset-templates/assetTypes';
import {
    getPrintableThemeFamiliesForBusiness,
    resolvePrintableBusinessThemeRecommendation,
} from '@lib/printable-asset-templates/businessThemeRecommendations';
import {
    admitPrintableAssetEditorDocument,
    buildPrintableAssetEditorDocument,
    isPrintableAssetEditorRenderable,
    rehydratePrintableAssetEditorDocument,
    renderPrintableAssetEditorDocumentFiles,
    stripPrintableAssetEditorAttributionLayers,
} from '@lib/printable-asset-templates/editorDocumentAdapter';
import { renderPrintableAsset, renderPrintableAssetDownloadFiles } from '@lib/printable-asset-templates/renderPrintableAsset';
import {
    applyPrintableThemePreference,
    normalizePrintableAssetStylePreferences,
    removePrintableProjectThemeOverride,
    resolvePrintableAssetStyle,
} from '@lib/printable-asset-templates/stylePreferences';
import { buildPrintableStoreContactFields } from '@lib/printable-asset-templates/storeContact';
import { getPrintableTemplateFamily, normalizePrintableTemplateFamilyId } from '@lib/printable-asset-templates/templateFamilies';
import type { PrintableStaffBadgePerson } from '@lib/printable-asset-templates/staffBadgePerson';
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
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import type { CreativeEditorDocument, CreativeEditorTemplateSaveRequest, CreativeEditorTemplateSummary } from '@/modules/creative-editor/types';
import ContextualStateIllustration from '@/components/atoms/contextualStateIllustration';
import FlyerCampaignFields, {
    EMPTY_PRINTABLE_FLYER_CAMPAIGN_DRAFT,
    buildPrintableFlyerCampaignContent,
    type PrintableFlyerCampaignDraft,
} from '@/components/shared/printableAssets/FlyerCampaignFields';
import PostcardContentFields, {
    EMPTY_PRINTABLE_POSTCARD_CONTENT_DRAFT,
    buildPrintablePostcardContent,
    type PrintablePostcardContentDraft,
} from '@/components/shared/printableAssets/PostcardContentFields';
import {
    EMPTY_PRINTABLE_GIFT_CERTIFICATE_DRAFT,
    EMPTY_PRINTABLE_INVITATION_DRAFT,
    GiftCertificateContentFields,
    InvitationContentFields,
    buildPrintableGiftCertificateContent,
    buildPrintableInvitationContent,
    type PrintableGiftCertificateDraft,
    type PrintableInvitationDraft,
} from '@/components/shared/printableAssets/PersonalizedAssetFields';
import AssetBusinessProfileEditor from '@/components/shared/printableAssets/AssetBusinessProfileEditor';
import PrintableTemplatePreview from '@/components/shared/printableAssets/PrintableTemplatePreview';
import { App as AntApp, Button, Card, Col, Empty, Flex, Input, Modal, Progress, Row, Segmented, Select, Spin, Tag, theme, Typography } from 'antd';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { LuAlertCircle, LuBadge, LuBadgeCheck, LuBadgePercent, LuCalendarDays, LuCheck, LuChevronRight, LuContact, LuDownload, LuEye, LuFileText, LuGift, LuMail, LuMegaphone, LuPackage, LuPalette, LuPrinter, LuQrCode, LuSearch, LuSparkles, LuStore, LuTag, LuTrash2, LuX } from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger, type ProjectSelectorItem } from '../../../shared/ProjectSelector';
import NoSubscriptionView from '../billing/NoSubscriptionView';
import styles from './PrintableAssetTemplatesRoute.module.scss';

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
    storeTagline?: string | null;
};

type PendingTemplateSaveReservation = {
    inFlight: number;
    key: string;
    templateId: string;
};

const createReservedTemplateId = (): string => (
    `tpl_${Date.now().toString(36)}_${createRandomIdSegment(10)}`
);

type PageState = 'load_error' | 'loading' | 'missing_public_link' | 'no_menu' | 'ready';

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

type AssetPurposeGroupId = 'identity' | 'place' | 'promote';

type AssetPurposeGroup = {
    assetIds: PrintableAssetTypeId[];
    id: AssetPurposeGroupId;
    label: string;
};

const ASSET_PURPOSE_GROUPS: AssetPurposeGroup[] = [
    {
        assetIds: ['print_menu', 'table_tent', 'single_table_card', 'counter_sticker', 'entrance_poster', 'feedback_qr'],
        id: 'place',
        label: 'Place in your business',
    },
    {
        assetIds: ['campaign_flyer', 'gift_certificate', 'event_invitation', 'postcard', 'campaign_poster'],
        id: 'promote',
        label: 'Promote & share',
    },
    {
        assetIds: ['business_card', 'staff_id_card'],
        id: 'identity',
        label: 'Business identity',
    },
];

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

function getPurposeGroupIcon(groupId: AssetPurposeGroupId) {
    if (groupId === 'place') return <LuStore aria-hidden size={16} />;
    if (groupId === 'promote') return <LuMegaphone aria-hidden size={16} />;
    return <LuBadge aria-hidden size={16} />;
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

function getPrintableModalDownloadActionLabel(outputFormat: PrintableAssetOutputFormat, assetId: PrintableAssetTypeId): string {
    if (outputFormat === 'pdf') return 'Download PDF';
    if (outputFormat === 'zip') return 'Download ZIP';
    if (assetId === 'print_menu') return 'First page';
    if (assetId === 'business_card') return 'Front + back';
    return 'Image';
}

function getPrintableActionFormats(asset: PrintableAssetType): PrintableAssetOutputFormat[] {
    return (asset.supportedOutputFormats || [asset.outputFormat]).filter((format) => format !== 'zip');
}

function getPrintablePreviewFormat(asset: PrintableAssetType): PrintableAssetOutputFormat | null {
    if (asset.outputFormat === 'zip') return null;
    return 'png';
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
    const { activeSubscription, activeSubscriptionLoading, setStoreDetails, setUsersList, storeDetails, tenantDetails, userPermissions, usersList } = useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const { message: messageApi, modal } = AntApp.useApp();
    const projectIdQuery = searchParams?.get('projectId') || '';
    const [pageState, setPageState] = useState<PageState>('loading');
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [data, setData] = useState<AssetsData | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<PrintableAssetTypeId>(() => {
        const fromQuery = searchParams?.get('asset');
        return isPrintableAssetTypeId(fromQuery) && fromQuery !== 'product_tag'
            ? fromQuery
            : 'table_tent';
    });
    const [selectedStaffBadgePersonId, setSelectedStaffBadgePersonId] = useState<string | null>(null);
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
    const [runtimeDraftDirty, setRuntimeDraftDirty] = useState(false);
    const [isBusinessProfileEditorOpen, setIsBusinessProfileEditorOpen] = useState(false);
    const [businessProfileAssetId, setBusinessProfileAssetId] = useState<PrintableAssetTypeId | null>(null);
    const [businessProfileEditorState, setBusinessProfileEditorState] = useState({ busy: false, dirty: false });
    const [editorDirty, setEditorDirty] = useState(false);
    const [stylePreferenceBusyKey, setStylePreferenceBusyKey] = useState<string | null>(null);
    const [isThemeLibraryOpen, setIsThemeLibraryOpen] = useState(false);
    const [themeBrowseMode, setThemeBrowseMode] = useState<'all' | 'recommended'>('recommended');
    const [themeSearch, setThemeSearch] = useState('');
    const [pendingThemeId, setPendingThemeId] = useState<PrintableTemplateFamilyId | null>(null);
    const [flyerCampaignDraft, setFlyerCampaignDraft] = useState<PrintableFlyerCampaignDraft>(EMPTY_PRINTABLE_FLYER_CAMPAIGN_DRAFT);
    const [posterCampaignDraft, setPosterCampaignDraft] = useState<PrintableFlyerCampaignDraft>(EMPTY_PRINTABLE_FLYER_CAMPAIGN_DRAFT);
    const [postcardContentDraft, setPostcardContentDraft] = useState<PrintablePostcardContentDraft>(EMPTY_PRINTABLE_POSTCARD_CONTENT_DRAFT);
    const [giftCertificateDraft, setGiftCertificateDraft] = useState<PrintableGiftCertificateDraft>(EMPTY_PRINTABLE_GIFT_CERTIFICATE_DRAFT);
    const [invitationDraft, setInvitationDraft] = useState<PrintableInvitationDraft>(EMPTY_PRINTABLE_INVITATION_DRAFT);
    const stylePreferenceBusyRef = useRef(false);
    const editorDocumentRef = useRef<CreativeEditorDocument | null>(null);
    const editorBaselineRef = useRef('');
    const editorCloseConfirmOpenRef = useRef(false);
    const pendingTemplateSaveReservationRef = useRef<PendingTemplateSaveReservation | null>(null);
    const previewRequestRef = useRef(0);
    const previewUrlRef = useRef<string | null>(null);
    const assetOperationRef = useRef<string | null>(null);
    const profileStoreOverrideRef = useRef<Record<string, unknown> | null>(null);
    const projectDataCacheRef = useRef<Record<string, any>>({});
    const storeData = storeDetails as any;
    const sessionData = session as any;
    const storeBusinessType = storeDetails?.businessType;
    const storeBusinessCategory = storeData?.businessCategory;
    const storeTenantId = storeData?.tenantId ?? storeData?.tId;
    const storeStoreId = storeData?.storeId ?? storeData?.sId;
    const sessionTenantId = sessionData?.tId ?? sessionData?.user?.tenantId;
    const sessionStoreId = sessionData?.sId ?? sessionData?.user?.storeId;
    const sessionTenantIdNumber = Number(sessionTenantId);
    const sessionStoreIdNumber = Number(sessionStoreId);
    const hasSessionScope = Number.isSafeInteger(sessionTenantIdNumber)
        && sessionTenantIdNumber > 0
        && Number.isSafeInteger(sessionStoreIdNumber)
        && sessionStoreIdNumber > 0;
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);
    const stylePreferences = useMemo(
        () => normalizePrintableAssetStylePreferences(storeDetails?.printableAssetStylePreferences),
        [storeDetails?.printableAssetStylePreferences],
    );
    const themeBusinessType = storeBusinessType || data?.businessType;
    const themeRecommendation = useMemo(
        () => resolvePrintableBusinessThemeRecommendation({
            businessCategory: storeBusinessCategory,
            businessType: themeBusinessType,
        }),
        [storeBusinessCategory, themeBusinessType],
    );
    const themeFamilies = useMemo(
        () => getPrintableThemeFamiliesForBusiness({
            businessCategory: storeBusinessCategory,
            businessType: themeBusinessType,
        }),
        [storeBusinessCategory, themeBusinessType],
    );
    const resolvedParentThemeStyle = useMemo(
        () => resolvePrintableAssetStyle({
            assetTypeId: 'single_table_card',
            businessCategory: storeBusinessCategory,
            businessType: themeBusinessType,
            preferences: stylePreferences,
            projectId: data?.projectId,
        }),
        [data?.projectId, storeBusinessCategory, stylePreferences, themeBusinessType],
    );
    const effectiveThemeId = resolvedParentThemeStyle.templateFamilyId;
    const effectiveThemeFamily = useMemo(
        () => getPrintableTemplateFamily(effectiveThemeId),
        [effectiveThemeId],
    );
    const themeLibraryPreviewFamily = useMemo(
        () => pendingThemeId ? getPrintableTemplateFamily(pendingThemeId) : effectiveThemeFamily,
        [effectiveThemeFamily, pendingThemeId],
    );
    const activePurposeGroup = useMemo<AssetPurposeGroup>(() => (
        ASSET_PURPOSE_GROUPS.find((group) => group.assetIds.includes(selectedAssetId))
        || ASSET_PURPOSE_GROUPS[0]
    ), [selectedAssetId]);
    const visiblePurposeAssets = useMemo(() => (
        activePurposeGroup.assetIds.map((assetId) => getPrintableAssetType(assetId))
    ), [activePurposeGroup]);
    const visibleThemeFamilies = useMemo(() => {
        const normalizedSearch = themeSearch.trim().toLocaleLowerCase();
        const recommendedIds = new Set(themeRecommendation.recommendedThemeIds);
        const scopedFamilies = themeBrowseMode === 'recommended'
            ? themeFamilies.filter((family) => family.id === effectiveThemeId || recommendedIds.has(family.id))
            : themeFamilies;
        return scopedFamilies.filter((family) => (
            !normalizedSearch
            || family.label.toLocaleLowerCase().includes(normalizedSearch)
            || family.description.toLocaleLowerCase().includes(normalizedSearch)
        ));
    }, [effectiveThemeId, themeBrowseMode, themeFamilies, themeRecommendation.recommendedThemeIds, themeSearch]);

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
    const printableStoreContactFields = useMemo(
        () => buildPrintableStoreContactFields(storeDetails),
        [storeDetails],
    );
    const assetProfileReadiness = useMemo(
        () => getAssetBusinessProfileReadiness(storeDetails, tenantDetails),
        [storeDetails, tenantDetails],
    );
    const selectedAssetProfileReadiness = useMemo(
        () => getAssetBusinessProfileReadiness(storeDetails, tenantDetails, selectedAssetId),
        [selectedAssetId, storeDetails, tenantDetails],
    );
    const canManageAssetBusinessProfile = sessionData?.user?.role === 'owner'
        || hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_STORE]);
    const selectedAsset = getPrintableAssetType(selectedAssetId);
    const staffBadgePeopleState = usePrintableStaffBadgePeople({
        canReadStaff: userPermissions?.canManageUsers === true,
        enabled: selectedAssetId === 'staff_id_card',
        roles: storeDetails?.roles || [],
        setUsersList,
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId,
        usersList,
    });
    const selectedStaffBadgePerson = useMemo(
        () => staffBadgePeopleState.people.find((person) => person.id === selectedStaffBadgePersonId) || null,
        [selectedStaffBadgePersonId, staffBadgePeopleState.people],
    );
    useEffect(() => {
        setSelectedStaffBadgePersonId(null);
    }, [storeDetails?.storeId, storeDetails?.tenantId]);
    useEffect(() => {
        if (
            selectedStaffBadgePersonId
            && !staffBadgePeopleState.loading
            && !staffBadgePeopleState.people.some((person) => person.id === selectedStaffBadgePersonId)
        ) {
            setSelectedStaffBadgePersonId(null);
        }
    }, [selectedStaffBadgePersonId, staffBadgePeopleState.loading, staffBadgePeopleState.people]);
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
        () => resolveStoreBusinessCategory(
            storeBusinessType,
            storeBusinessCategory,
        ),
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
        () => [getPrintableTemplateFamily(effectiveThemeId)],
        [effectiveThemeId],
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
        () => selectedAssetId === 'complete_menu_kit' ? [] : platformTemplates.filter((template) => (
            template.assetTypeId === selectedAssetId
            && template.productId === templateRegistryContext.productId
            && template.sourceSurface === templateRegistryContext.sourceSurface
            && normalizePrintableTemplateFamilyId(template.templateFamilyId) === effectiveThemeId
        )),
        [effectiveThemeId, platformTemplates, selectedAssetId, templateRegistryContext.productId, templateRegistryContext.sourceSurface],
    );
    const selectedUserTemplates = useMemo(
        () => userTemplates.filter((template) => (
            template.assetTypeId === selectedAssetId
            && template.productId === templateRegistryContext.productId
            && template.sourceSurface === templateRegistryContext.sourceSurface
            && normalizePrintableTemplateFamilyId(template.templateFamilyId) === effectiveThemeId
        )),
        [effectiveThemeId, selectedAssetId, templateRegistryContext.productId, templateRegistryContext.sourceSurface, userTemplates],
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
            description: selectedAssetId === 'complete_menu_kit'
                ? 'Uses the selected parent theme across every supported asset.'
                : family.description,
            family,
            id: family.id,
            source: 'generated',
            title: selectedAssetId === 'complete_menu_kit' ? 'Your asset set' : family.label,
        }));
    }, [availableTemplateFamilies, selectedAssetId, selectedPlatformTemplates]);
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
                || !hasSessionScope
            ) {
                setPageState('loading');
                return;
            }

            try {
                projectDataCacheRef.current = {};
                const result = await getExistingProjectsListWithoutLoader(true, {
                    sId: sessionStoreIdNumber,
                    tId: sessionTenantIdNumber,
                });
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
                if (!subdomain && !customDomain) {
                    setPageState('missing_public_link');
                    return;
                }
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
                    storeTagline: getLocalizedText(
                        storeDetails.tagline,
                        undefined,
                        getPrimaryLocalizedLanguage(storeDetails.tagline, 'en'),
                        '',
                    ) || null,
                });
                setPageState('ready');
            } catch {
                setData(null);
                setPageState('load_error');
            }
        }

        void loadData();
    }, [activeSubscriptionLoading, hasPaidAccess, hasSessionScope, labels.offeringTitle, loadAttempt, projectIdQuery, resolveProjectName, sessionStoreIdNumber, sessionTenantIdNumber, storeDetails, storeDisplayName]);

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
        if (assetOperationRef.current) return;
        setSelectedAssetId(assetId);
        setActiveTemplateId(null);
        setActivePlatformTemplate(null);
        resetEditor();
        closePreviewAsset();
        setRuntimeDraftDirty(false);
    };

    const handleSelectPurposeGroup = (groupId: AssetPurposeGroupId) => {
        const group = ASSET_PURPOSE_GROUPS.find((candidate) => candidate.id === groupId);
        if (!group) return;
        const firstAssetId = group.assetIds[0];
        if (firstAssetId !== selectedAssetId) handleSelectAsset(firstAssetId);
    };

    const openThemeLibrary = () => {
        setPendingThemeId(null);
        setThemeBrowseMode('recommended');
        setThemeSearch('');
        setIsThemeLibraryOpen(true);
    };

    const closeTemplateActions = () => {
        if (assetOperationRef.current) return;
        setActiveTemplateId(null);
        setActivePlatformTemplate(null);
        closePreviewAsset();
        setBusyKey((current) => current?.startsWith('preview:') ? null : current);
        if (selectedAssetId === 'complete_menu_kit') setSelectedAssetId('table_tent');
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
        setFlyerCampaignDraft(EMPTY_PRINTABLE_FLYER_CAMPAIGN_DRAFT);
        setPosterCampaignDraft(EMPTY_PRINTABLE_FLYER_CAMPAIGN_DRAFT);
        setPostcardContentDraft(EMPTY_PRINTABLE_POSTCARD_CONTENT_DRAFT);
        setGiftCertificateDraft(EMPTY_PRINTABLE_GIFT_CERTIFICATE_DRAFT);
        setInvitationDraft(EMPTY_PRINTABLE_INVITATION_DRAFT);
        setRuntimeDraftDirty(false);
        setIsProjectSelectorOpen(false);
    };

    const replaceLocalStylePreferences = (nextPreferences: typeof stylePreferences) => {
        setStoreDetails((current) => current ? {
            ...current,
            printableAssetStylePreferences: nextPreferences,
        } : current);
    };

    const handleSaveThemePreference = async (
        scope: 'business' | 'project',
        templateFamilyId: PrintableTemplateFamilyId,
    ): Promise<boolean> => {
        if (!FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_STYLE_DEFAULTS) return false;
        if (stylePreferenceBusyRef.current) return false;
        const storeId = Number(storeDetails?.storeId);
        if (!Number.isSafeInteger(storeId) || storeId <= 0) {
            messageApi.error('Could not save this theme. Please refresh and try again.');
            return false;
        }
        const previousPreferences = stylePreferences;
        const busy = `theme:${scope}:${templateFamilyId}`;
        stylePreferenceBusyRef.current = true;
        setStylePreferenceBusyKey(busy);
        try {
            replaceLocalStylePreferences(applyPrintableThemePreference({
                businessCategory: storeBusinessCategory,
                businessType: themeBusinessType,
                current: previousPreferences,
                projectId: data?.projectId,
                scope,
                templateFamilyId,
            }));
            const savedPreferences = await savePrintableThemePreference({
                businessCategory: storeBusinessCategory,
                businessType: themeBusinessType,
                current: previousPreferences,
                projectId: data?.projectId,
                scope,
                storeId,
                templateFamilyId,
            });
            replaceLocalStylePreferences(savedPreferences);
            messageApi.success(scope === 'project'
                ? `${getPrintableTemplateFamily(templateFamilyId).label} is now this menu's theme`
                : `${getPrintableTemplateFamily(templateFamilyId).label} is now the business theme`);
            return true;
        } catch {
            replaceLocalStylePreferences(previousPreferences);
            messageApi.error('Could not save this theme. Please try again.');
            return false;
        } finally {
            stylePreferenceBusyRef.current = false;
            setStylePreferenceBusyKey(null);
        }
    };

    const applyPendingTheme = async (scope: 'business' | 'project') => {
        if (!pendingThemeId) return;
        const saved = await handleSaveThemePreference(scope, pendingThemeId);
        if (saved) setIsThemeLibraryOpen(false);
    };

    const handleClearProjectThemeOverride = async (): Promise<boolean> => {
        if (!data?.projectId) return false;
        if (stylePreferenceBusyRef.current) return false;
        const storeId = Number(storeDetails?.storeId);
        if (!Number.isSafeInteger(storeId) || storeId <= 0) {
            messageApi.error('Could not restore the business theme. Please refresh and try again.');
            return false;
        }
        const previousPreferences = stylePreferences;
        stylePreferenceBusyRef.current = true;
        setStylePreferenceBusyKey('theme:clear');
        try {
            replaceLocalStylePreferences(removePrintableProjectThemeOverride({
                current: previousPreferences,
                projectId: data.projectId,
            }));
            const savedPreferences = await clearPrintableProjectThemeOverride({
                current: previousPreferences,
                projectId: data.projectId,
                storeId,
            });
            replaceLocalStylePreferences(savedPreferences);
            messageApi.success(stylePreferences.businessThemeId
                ? 'This menu now uses the business theme'
                : 'This menu now uses the recommended theme');
            return true;
        } catch {
            replaceLocalStylePreferences(previousPreferences);
            messageApi.error('Could not restore the business theme. Please try again.');
            return false;
        } finally {
            stylePreferenceBusyRef.current = false;
            setStylePreferenceBusyKey(null);
        }
    };

    const getCachedProjectData = async (projectId: string | null): Promise<any | null> => {
        if (!projectId) return null;
        const cachedProject = projectDataCacheRef.current[projectId];
        if (cachedProject) return cachedProject;
        const projectData = await getProjectDataWithoutLoader(projectId);
        projectDataCacheRef.current[projectId] = projectData;
        return projectData;
    };

    const buildRenderInput = async (
        templateFamilyId: PrintableTemplateFamilyId,
        staffBadgePerson: PrintableStaffBadgePerson | null = selectedStaffBadgePerson,
        assetTypeId: PrintableAssetTypeId = selectedAssetId,
    ): Promise<PrintableAssetRenderInput | null> => {
        if (!data) return null;
        if (assetTypeId === 'staff_id_card' && !staffBadgePerson) return null;
        const sourceStoreDetails = profileStoreOverrideRef.current || storeDetails;
        const sourceStoreName = getStoreContextName(sourceStoreDetails, data.storeName);
        const sourceTagline = getLocalizedText(
            sourceStoreDetails?.tagline,
            undefined,
            getPrimaryLocalizedLanguage(sourceStoreDetails?.tagline, 'en'),
            '',
        );
        const contactFields = buildPrintableStoreContactFields(sourceStoreDetails);
        const baseInput: PrintableAssetRenderInput = {
            activePlanType: (sourceStoreDetails as any)?.activePlanType,
            assetTypeId,
            brandColor: resolveStoreBrandColor(sourceStoreDetails),
            businessCategory: platformBusinessCategory,
            businessType: (sourceStoreDetails as any)?.businessType || data.businessType,
            ...contactFields,
            feedbackUrl: data.feedbackQrLink,
            flyerCampaign: assetTypeId === 'campaign_flyer'
                ? buildPrintableFlyerCampaignContent(flyerCampaignDraft)
                : undefined,
            campaignContent: assetTypeId === 'campaign_poster'
                ? buildPrintableFlyerCampaignContent(posterCampaignDraft)
                : undefined,
            postcardContent: assetTypeId === 'postcard'
                ? buildPrintablePostcardContent(postcardContentDraft)
                : undefined,
            giftCertificateContent: assetTypeId === 'gift_certificate'
                ? buildPrintableGiftCertificateContent(giftCertificateDraft)
                : undefined,
            invitationContent: assetTypeId === 'event_invitation'
                ? buildPrintableInvitationContent(invitationDraft)
                : undefined,
            lastPublishedAt: parseTimestamp(data.menuModifiedOn),
            logoUrl: (sourceStoreDetails as any)?.logo || undefined,
            menuUrl: data.menuLink,
            obpBaseUrl: data.obpLink,
            projectId: data.projectId,
            shortLink: (assetTypeId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace(/^https?:\/\//, ''),
            ...(assetTypeId === 'staff_id_card' && staffBadgePerson ? {
                staffName: staffBadgePerson.name,
                staffRole: staffBadgePerson.role,
            } : {}),
            storeName: sourceStoreName,
            tagline: sourceTagline || undefined,
            templateFamilyId,
        };

        if (assetTypeId !== 'print_menu') return baseInput;

        const projectData = await getCachedProjectData(data.projectId);
        const exportData = buildExportData(projectData as any);
        if (!exportData.items.length) {
            messageApi.warning(`No ${labels.offeringLower} items to export`);
            return null;
        }

        return {
            ...baseInput,
            printMenuOptions: {
                activePlanType: (sourceStoreDetails as any)?.activePlanType,
                brandColor: resolveStoreBrandColor(sourceStoreDetails),
                businessCategory: platformBusinessCategory,
                businessType: (sourceStoreDetails as any)?.businessType || data.businessType,
                categories: exportData.categories,
                currency: (sourceStoreDetails as any)?.currencySymbol || '',
                currencyCode: (sourceStoreDetails as any)?.currencyCode || (sourceStoreDetails as any)?.currency || undefined,
                items: exportData.items.filter((item: any) => item.active !== false),
                language: (projectData as any)?.defaultLanguage || (sourceStoreDetails as any)?.defaultLanguage || 'en',
                logoUrl: (sourceStoreDetails as any)?.logo || undefined,
                menuUrl: data.menuLink,
                projectData: projectData as any,
                projectId: data.projectId || undefined,
                projectName: data.projectName || labels.offeringTitle,
                showDescriptions: true,
                storeData: sourceStoreDetails as any,
                storeName: sourceStoreName,
            },
        };
    };

    const renderInputPreview = async (
        input: PrintableAssetRenderInput,
        previewAssetType: PrintableAssetType,
        requestId: number,
    ): Promise<boolean> => {
        const previewFormat = getPrintablePreviewFormat(previewAssetType);
        if (!previewFormat) {
            if (previewRequestRef.current === requestId) {
                setRuntimeDraftDirty(false);
                setPreviewState('ready');
            }
            return true;
        }

        closePreviewAsset(false);
        setPreviewState('loading');
        try {
            const result = await renderPrintableAsset({ ...input, outputFormat: previewFormat });
            const previewUrl = URL.createObjectURL(new Blob([result.blob], { type: result.mimeType }));
            if (previewRequestRef.current !== requestId) {
                URL.revokeObjectURL(previewUrl);
                return false;
            }
            releasePreviewUrl();
            previewUrlRef.current = previewUrl;
            setPreviewAsset({
                blob: result.blob,
                filename: result.filename,
                label: `${previewAssetType.title} - ${getPrintableTemplateFamily(input.templateFamilyId).label}`,
                outputFormat: result.outputFormat,
                url: previewUrl,
            });
            setRuntimeDraftDirty(false);
            setPreviewState('ready');
            return true;
        } catch {
            if (previewRequestRef.current === requestId) setPreviewState('error');
            return false;
        }
    };

    const renderTemplatePreview = async (
        templateFamilyId: PrintableTemplateFamilyId,
        staffBadgePerson: PrintableStaffBadgePerson | null = selectedStaffBadgePerson,
        assetTypeId: PrintableAssetTypeId = selectedAssetId,
    ) => {
        if (assetOperationRef.current) return;
        previewRequestRef.current += 1;
        const requestId = previewRequestRef.current;
        const previewAssetType = getPrintableAssetType(assetTypeId);
        const previewFormat = getPrintablePreviewFormat(previewAssetType);
        const busy = `preview:${assetTypeId}:${templateFamilyId}:${previewFormat}`;
        assetOperationRef.current = busy;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId, staffBadgePerson, assetTypeId);
            if (!input) {
                if (previewRequestRef.current === requestId) setPreviewState('idle');
                return;
            }
            await renderInputPreview(input, previewAssetType, requestId);
        } finally {
            if (assetOperationRef.current === busy) assetOperationRef.current = null;
            if (previewRequestRef.current === requestId) setBusyKey(null);
        }
    };

    const closeBusinessProfileEditor = () => {
        if (businessProfileEditorState.busy) return;
        if (!businessProfileEditorState.dirty) {
            setIsBusinessProfileEditorOpen(false);
            setBusinessProfileAssetId(null);
            setBusinessProfileEditorState({ busy: false, dirty: false });
            return;
        }
        modal.confirm({
            cancelText: 'Keep editing',
            content: 'The business details entered here have not been saved.',
            okText: 'Discard changes',
            okType: 'danger',
            onOk: () => {
                setIsBusinessProfileEditorOpen(false);
                setBusinessProfileAssetId(null);
                setBusinessProfileEditorState({ busy: false, dirty: false });
            },
            title: labelConfirmDialogTitle('Discard unsaved business details?'),
            zIndex: 2300,
        });
    };

    const handleBusinessProfileSaved = async (nextStoreDetails: Record<string, unknown>) => {
        profileStoreOverrideRef.current = nextStoreDetails;
        setData((current) => current ? {
            ...current,
            storeLogo: typeof nextStoreDetails.logo === 'string' ? nextStoreDetails.logo : current.storeLogo,
            storeName: getStoreContextName(nextStoreDetails, current.storeName),
            storeTagline: getLocalizedText(
                nextStoreDetails.tagline,
                undefined,
                getPrimaryLocalizedLanguage(nextStoreDetails.tagline, 'en'),
                '',
            ) || null,
        } : current);
        setIsBusinessProfileEditorOpen(false);
        setBusinessProfileAssetId(null);
        setBusinessProfileEditorState({ busy: false, dirty: false });
        try {
            if (activeTemplateId && selectedAssetId !== 'complete_menu_kit') {
                await renderTemplatePreview(activeTemplateId, selectedStaffBadgePerson, selectedAssetId);
            }
        } finally {
            profileStoreOverrideRef.current = null;
        }
    };

    const openTemplateActions = (card: PlatformTemplateCard) => {
        setActiveTemplateId(card.family.id);
        setActivePlatformTemplate(card.template || null);
        void renderTemplatePreview(card.family.id);
    };

    const openAssetActions = (assetId: PrintableAssetTypeId) => {
        const matchingPlatformTemplate = platformTemplates.find((template) => (
            template.assetTypeId === assetId
            && template.productId === templateRegistryContext.productId
            && template.sourceSurface === templateRegistryContext.sourceSurface
            && normalizePrintableTemplateFamilyId(template.templateFamilyId) === effectiveThemeId
        ));
        handleSelectAsset(assetId);
        setActiveTemplateId(effectiveThemeId);
        setActivePlatformTemplate(matchingPlatformTemplate || null);
        if (assetId !== 'complete_menu_kit') {
            void renderTemplatePreview(effectiveThemeId, selectedStaffBadgePerson, assetId);
        }
    };

    const handleSelectStaffBadgePerson = (personId: string) => {
        if (assetOperationRef.current) return;
        const person = staffBadgePeopleState.people.find((candidate) => candidate.id === personId) || null;
        setSelectedStaffBadgePersonId(person?.id || null);
        setRuntimeDraftDirty(true);
        if (activeTemplateId) {
            void renderTemplatePreview(activeTemplateId, person);
        }
    };

    const handleRender = async (templateFamilyId: PrintableTemplateFamilyId, outputFormat: PrintableAssetOutputFormat) => {
        if (assetOperationRef.current) return;
        if (selectedAssetId === 'campaign_poster' && !buildPrintableFlyerCampaignContent(posterCampaignDraft)) {
            messageApi.warning('Add a real campaign headline before downloading the Campaign Poster.');
            return;
        }
        const busy = `download:${selectedAssetId}:${templateFamilyId}:${outputFormat}`;
        assetOperationRef.current = busy;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            previewRequestRef.current += 1;
            const requestId = previewRequestRef.current;
            if (!await renderInputPreview(input, selectedAsset, requestId)) {
                messageApi.error('Preview must be ready before an output can be created. Please retry.');
                return;
            }
            const files = await renderPrintableAssetDownloadFiles({ ...input, outputFormat });
            const delivery = await downloadPrintableAssetFiles(files, `${selectedAsset.title}-${getPrintableTemplateFamily(templateFamilyId).label}`);
            messageApi.success(delivery.filename.endsWith('.zip') && outputFormat !== 'zip'
                ? `${selectedAsset.title} front and back images downloaded as one ZIP`
                : `${selectedAsset.title} downloaded`);
        } catch {
            messageApi.error(`Failed to generate ${selectedAsset.title}`);
        } finally {
            if (assetOperationRef.current === busy) assetOperationRef.current = null;
            setBusyKey(null);
        }
    };

    const handleQuickDownload = async (outputFormat: PrintableAssetOutputFormat) => {
        // Prepared platform records may retain an older editor document while their
        // thumbnail already reflects the current theme. Owner downloads must always
        // use the governed current-source renderer so preview, PNG/PDF, and kit output
        // share the same artwork and layout rules. Saved owner designs remain explicit
        // user templates and continue to render their own edited documents.
        await handleRender(effectiveThemeId, outputFormat);
    };

    const openCurrentAssetActions = () => openAssetActions(selectedAssetId);

    const openCompleteKitActions = () => {
        handleSelectAsset('complete_menu_kit');
        setActiveTemplateId(effectiveThemeId);
    };

    const startEditorSession = (nextState: PrintAssetEditorState) => {
        const cleanDocument = stripPrintableAssetEditorAttributionLayers(nextState.initialDocument);
        editorDocumentRef.current = cleanDocument;
        editorBaselineRef.current = JSON.stringify(cleanDocument);
        setEditorDirty(false);
        setEditorState({ ...nextState, initialDocument: cleanDocument });
    };

    const openEditorForTemplate = async (templateFamilyId: PrintableTemplateFamilyId) => {
        if (!canCustomizeSelectedAsset || assetOperationRef.current) return;
        if (selectedAssetId === 'campaign_poster' && !buildPrintableFlyerCampaignContent(posterCampaignDraft)) {
            messageApi.warning('Add a real campaign headline before editing the Campaign Poster.');
            return;
        }
        const busy = `customize:${selectedAssetId}:${templateFamilyId}`;
        assetOperationRef.current = busy;
        setBusyKey(busy);
        try {
            const input = await buildRenderInput(templateFamilyId);
            if (!input) return;
            previewRequestRef.current += 1;
            const requestId = previewRequestRef.current;
            if (!await renderInputPreview(input, selectedAsset, requestId)) {
                messageApi.error('Preview must be ready before the editor can open. Please retry.');
                return;
            }
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
            if (assetOperationRef.current === busy) assetOperationRef.current = null;
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
        } catch (error) {
            logRuntimeFailure('printable_asset_saved_design_open_failed', error, {
                ...getBoundedRuntimeStringContext('assetTypeId', template.assetTypeId || selectedAssetId),
                ...getBoundedRuntimeStringContext('templateFamilyId', templateFamilyId),
                ...getBoundedRuntimeStringContext('templateId', template.id),
            });
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
        const admittedDocument = admitPrintableAssetEditorDocument(cleanDocument, editorState.assetTypeId);
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
        const documentTitle = typeof admittedDocument.title === 'string' ? admittedDocument.title.trim() : '';

        setEditorBusyKey('editor-template-save');
        try {
            const template = await saveCreativeEditorTemplate({
                ...templateRegistryContext,
                assetTypeId: editorState.assetTypeId,
                document: admittedDocument,
                templateFamilyId: editorState.templateFamilyId,
                templateId: reservedTemplateId,
                thumbnailDataUrl: previewDataUrl,
                title: documentTitle || editorState.title,
            });
            setEditorState((current) => current ? { ...current, savedTemplateId: template.id, title: template.title } : current);
            setUserTemplates((current) => [template, ...current.filter((item) => item.id !== template.id)]);
            editorDocumentRef.current = admittedDocument;
            editorBaselineRef.current = JSON.stringify(admittedDocument);
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
        if (!editorState || assetOperationRef.current) return;
        const latestDocument = stripPrintableAssetEditorAttributionLayers(editorDocumentRef.current || editorState.initialDocument);
        const busy = `editor-download:${outputFormat}`;
        assetOperationRef.current = busy;
        setEditorBusyKey(busy);
        try {
            const files = await renderPrintableAssetEditorDocumentFiles({
                activePlanType: editorState.activePlanType,
                assetTypeId: editorState.assetTypeId,
                document: latestDocument,
                outputFormat,
                templateFamilyId: editorState.templateFamilyId,
            });
            const delivery = await downloadPrintableAssetFiles(files, `${editorState.title}-edited`);
            messageApi.success(delivery.filename.endsWith('.zip')
                ? 'Front and back images downloaded as one ZIP'
                : `${outputFormat.toUpperCase()} downloaded`);
        } catch {
            messageApi.error('Failed to download edited asset');
        } finally {
            if (assetOperationRef.current === busy) assetOperationRef.current = null;
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

    if (pageState === 'missing_public_link') {
        return (
            <Flex align="center" gap={14} justify="center" style={{ minHeight: 420, padding: 32, textAlign: 'center' }} vertical>
                <ContextualStateIllustration
                    color={token.colorPrimary}
                    size={120}
                    treatment="softHalo"
                    variant="emptyWorkspace"
                />
                <Title level={4} style={{ margin: 0 }}>Set up your customer link</Title>
                <Text type="secondary" style={{ maxWidth: 520 }}>
                    Add a MenuList subdomain or custom domain before creating printable assets and QR files for customers.
                </Text>
                <Button onClick={() => router.push('/business-settings?focus=customer-link')} type="primary">
                    Open Domain settings
                </Button>
            </Flex>
        );
    }

    if (pageState === 'load_error') {
        return (
            <Flex align="center" gap={14} justify="center" style={{ minHeight: 420, padding: 32, textAlign: 'center' }} vertical>
                <ContextualStateIllustration
                    color={token.colorError}
                    size={112}
                    treatment="plain"
                    variant="serverErrorContext"
                />
                <Title level={4} style={{ margin: 0 }}>Assets could not be loaded</Title>
                <Text type="secondary">Your menu was not changed. Try loading the asset list again.</Text>
                <Button onClick={() => setLoadAttempt((current) => current + 1)} type="primary">
                    Try again
                </Button>
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

    const selectedAssetNeedsSetup = selectedAsset.requiresFeedback && !data.hasFeedbackEnabled;
    const selectedAssetNeedsDetails = [
        'campaign_flyer',
        'campaign_poster',
        'event_invitation',
        'gift_certificate',
        'postcard',
        'staff_id_card',
    ].includes(selectedAssetId);
    const selectedAssetPreviewCard = platformTemplateCards[0];

    return (
        <div
            className={styles.page}
            style={{
                '--assets-card-bg': token.colorBgElevated,
                '--assets-row-bg': token.colorBgContainer,
                '--assets-muted-bg': token.colorFillQuaternary,
                '--assets-hover-bg': token.colorFillSecondary,
                '--assets-preview-bg': token.colorBgLayout,
                '--assets-border': token.colorBorderSecondary,
                '--assets-primary': token.colorPrimary,
                '--assets-primary-bg': token.colorPrimaryBg,
                '--assets-primary-border': token.colorPrimaryBorder,
                '--assets-success': token.colorSuccess,
                '--assets-success-bg': token.colorSuccessBg,
                '--assets-success-border': token.colorSuccessBorder,
                '--assets-warning': token.colorWarningText,
                '--assets-warning-bg': token.colorWarningBg,
                '--assets-warning-border': token.colorWarningBorder,
                '--assets-text': token.colorText,
                '--assets-text-secondary': token.colorTextSecondary,
            } as CSSProperties}
        >
            <section className={styles.brandKitSection}>
                <Flex align="center" className={styles.pageHeader} gap={20} justify="space-between" wrap="wrap">
                    <div className={styles.pageHeaderCopy}>
                        <Title className={styles.pageTitle} level={2}>Your Brand Kit</Title>
                        <Paragraph className={styles.pageDescription}>
                            Everything you need to place, promote, and represent your business—ready to download and use.
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

                <div className={`${styles.profileReadiness} ${assetProfileReadiness.percent === 100 ? styles.profileReadinessComplete : ''}`}>
                    <div className={styles.profileReadinessIcon}>
                        {assetProfileReadiness.percent === 100
                            ? <LuBadgeCheck aria-hidden size={22} />
                            : <LuSparkles aria-hidden size={22} />}
                    </div>
                    <div className={styles.profileReadinessCopy}>
                        <Flex align="center" gap={8} wrap="wrap">
                            <Text strong>
                                {assetProfileReadiness.percent === 100
                                    ? 'Your business details are ready'
                                    : 'Complete your details for stronger assets'}
                            </Text>
                            <Tag color={assetProfileReadiness.percent === 100 ? 'success' : 'processing'}>
                                {assetProfileReadiness.completedCount}/{assetProfileReadiness.totalCount} ready
                            </Tag>
                        </Flex>
                        <Text type="secondary">
                            {assetProfileReadiness.missingFields.length
                                ? `Add ${assetProfileReadiness.missingFields.map((field) => field.label.toLocaleLowerCase()).join(', ')} once and reuse them across every design.`
                                : 'Your logo, tagline, identity, and public contact details can be reused across every design.'}
                        </Text>
                        <Progress percent={assetProfileReadiness.percent} showInfo={false} size="small" />
                    </div>
                    {canManageAssetBusinessProfile ? (
                        <Button onClick={() => { setBusinessProfileAssetId(null); setIsBusinessProfileEditorOpen(true); }} size="large" type={assetProfileReadiness.percent === 100 ? 'default' : 'primary'}>
                            {assetProfileReadiness.percent === 100 ? 'Review details' : 'Complete details'}
                        </Button>
                    ) : (
                        <Text type="secondary">Ask an owner or store manager to complete these details.</Text>
                    )}
                </div>

                <div className={styles.brandHero}>
                    <div className={styles.brandHeroToolbar}>
                        <Flex align="center" className={styles.brandKitStatus} gap={8}>
                            <LuBadgeCheck aria-hidden color={token.colorSuccess} size={18} />
                            <Text type="secondary">
                                {MENU_KIT_ASSET_KEYS.length} matching files are ready in this look.
                            </Text>
                        </Flex>
                        <Flex className={styles.brandActions} gap={10} wrap="wrap">
                            <Button icon={<LuPalette size={17} />} onClick={openThemeLibrary} size="large">
                                Change brand look
                            </Button>
                            <Button icon={<LuDownload size={17} />} onClick={openCompleteKitActions} size="large" type="primary">
                                Download complete kit
                            </Button>
                        </Flex>
                    </div>
                    <div aria-label={`${effectiveThemeFamily.label} asset set preview`} className={styles.brandMosaic}>
                        {PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS.map((assetId) => {
                            const asset = getPrintableAssetType(assetId);
                            const previewCopy = getPrintableAssetPreviewCopy(assetId, labels);
                            return (
                                <button
                                    aria-haspopup="dialog"
                                    aria-label={`Preview ${asset.title}`}
                                    className={styles.brandMosaicItem}
                                    key={assetId}
                                    onClick={() => openAssetActions(assetId)}
                                    type="button"
                                >
                                    <div className={styles.brandMosaicPreview}>
                                        <PrintableTemplatePreview
                                            actionLabel={previewCopy.actionLabel}
                                            assetTypeId={assetId}
                                            brandColor={storeBrandColor}
                                            compact
                                            family={effectiveThemeFamily}
                                            instructionLabel={previewCopy.instructionLabel}
                                            shortLink={(assetId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace(/^https?:\/\//, '')}
                                            storeLogo={data.storeLogo}
                                            storeName={data.storeName}
                                        />
                                    </div>
                                    <span aria-hidden className={styles.brandMosaicAction}>
                                        <LuEye size={14} />
                                    </span>
                                    <Text className={styles.brandMosaicLabel}>{asset.title}</Text>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className={styles.assetWorkspace}>
                <div className={styles.assetBrowser}>
                    <Segmented<AssetPurposeGroupId>
                        block
                        className={styles.purposeTabs}
                        onChange={handleSelectPurposeGroup}
                        options={ASSET_PURPOSE_GROUPS.map((group) => ({
                            label: (
                                <span className={styles.purposeTabLabel}>
                                    {getPurposeGroupIcon(group.id)}
                                    <span>{group.label}</span>
                                </span>
                            ),
                            value: group.id,
                        }))}
                        value={activePurposeGroup.id}
                    />
                    <div className={styles.assetListHeader}>
                        <div>
                            <Text className={styles.assetListTitle} strong>Choose an asset</Text>
                            <Text className={styles.assetListHint} type="secondary">
                                Select one to preview, edit, or download.
                            </Text>
                        </div>
                        <Text className={styles.assetCount} type="secondary">
                            {visiblePurposeAssets.length} assets
                        </Text>
                    </div>
                    <div className={styles.assetList}>
                        {visiblePurposeAssets.map((asset) => {
                            const active = selectedAssetId === asset.id;
                            const needsSetup = asset.requiresFeedback && !data.hasFeedbackEnabled;
                            return (
                                <button
                                    aria-label={`Select ${asset.title}. ${needsSetup ? 'Needs setup' : `Ready as ${asset.size}`}`}
                                    aria-pressed={active}
                                    className={`${styles.assetRow} ${active ? styles.assetRowActive : ''}`}
                                    key={asset.id}
                                    onClick={() => handleSelectAsset(asset.id)}
                                    type="button"
                                >
                                    <span className={styles.assetRowIcon}>{getAssetIcon(asset.id)}</span>
                                    <span className={styles.assetRowCopy}>
                                        <Text strong>{asset.title}</Text>
                                        <Text type="secondary">{asset.description}</Text>
                                    </span>
                                    <span className={styles.assetRowMeta}>
                                        <Text className={styles.assetSize} type="secondary">{asset.size}</Text>
                                        <span className={needsSetup ? styles.statusNeedsSetup : styles.statusReady}>
                                            {needsSetup ? <LuAlertCircle aria-hidden size={15} /> : <LuCheck aria-hidden size={15} />}
                                            {needsSetup ? 'Needs setup' : 'Ready'}
                                        </span>
                                    </span>
                                    <LuChevronRight aria-hidden className={styles.assetRowChevron} size={18} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                <aside className={styles.assetPreviewPane}>
                    <button
                        aria-haspopup="dialog"
                        aria-label={`Open ${selectedAsset.title} preview`}
                        className={`${styles.assetPreviewFrame} ${styles.assetPreviewTrigger}`}
                        onClick={openCurrentAssetActions}
                        type="button"
                    >
                        {selectedAssetPreviewCard?.thumbnailUrl ? (
                            <img
                                alt={`${selectedAsset.title} preview`}
                                src={selectedAssetPreviewCard.thumbnailUrl}
                            />
                        ) : (
                            <PrintableTemplatePreview
                                actionLabel={previewActionLabel}
                                assetTypeId={selectedAssetId}
                                brandColor={storeBrandColor}
                                family={effectiveThemeFamily}
                                instructionLabel={previewInstructionLabel}
                                shortLink={(selectedAssetId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace(/^https?:\/\//, '')}
                                storeLogo={data.storeLogo}
                                storeName={data.storeName}
                            />
                        )}
                        <span aria-hidden className={styles.assetPreviewOpenHint}>
                            <LuEye size={15} /> Preview
                        </span>
                    </button>
                    <div className={styles.assetPreviewDetails}>
                        <Title level={3} style={{ margin: 0 }}>{selectedAsset.title}</Title>
                        <Text type="secondary">{selectedAsset.size}</Text>
                        <Paragraph className={styles.assetPreviewDescription}>{selectedAsset.description}</Paragraph>

                        {selectedAssetNeedsSetup ? (
                            <div className={styles.recoveryPanel}>
                                <Flex align="flex-start" gap={10}>
                                    <LuAlertCircle aria-hidden color={token.colorWarning} size={19} />
                                    <div>
                                        <Text strong>Turn on customer feedback first</Text>
                                        <Text type="secondary">This keeps the printed QR connected to a working feedback page.</Text>
                                    </div>
                                </Flex>
                                <Button block onClick={() => router.push('/business-settings?section=feedback')} type="primary">
                                    Open feedback settings
                                </Button>
                            </div>
                        ) : selectedAssetNeedsDetails ? (
                            <Button block onClick={openCurrentAssetActions} size="large" type="primary">
                                Add details and open asset
                            </Button>
                        ) : (
                            <Flex gap={10} vertical>
                                {selectedAssetActionFormats.map((format, index) => (
                                    <Button
                                        block
                                        icon={<LuDownload size={17} />}
                                        key={format}
                                        loading={Boolean(busyKey?.includes(`:${selectedAssetId}:`) && busyKey.endsWith(`:${format}`))}
                                        onClick={() => void handleQuickDownload(format)}
                                        size="large"
                                        type={index === 0 ? 'primary' : 'default'}
                                    >
                                        {getPrintableDownloadActionLabel(format, selectedAssetId)}
                                    </Button>
                                ))}
                            </Flex>
                        )}

                        {!selectedAssetNeedsSetup ? (
                            <Button block icon={<LuEye size={17} />} onClick={openCurrentAssetActions} size="large" type="text">
                                Preview & edit
                            </Button>
                        ) : null}
                        <Flex align="center" className={styles.inheritanceNote} gap={7}>
                            <LuPalette aria-hidden size={15} />
                            <Text type="secondary">{effectiveThemeFamily.label} is applied automatically.</Text>
                        </Flex>
                        {platformTemplatesState === 'error' ? (
                            <Text type="secondary">Prepared layouts could not be loaded. The generated asset is still available.</Text>
                        ) : null}
                    </div>
                </aside>
            </section>

            {shouldShowSavedDesigns ? (
                <section className={styles.savedDesigns}>
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
                </section>
            ) : null}

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
                className={styles.themeLibraryModal}
                closable={!stylePreferenceBusyKey}
                destroyOnHidden
                footer={(
                    <Flex align="center" gap={10} justify="space-between" wrap="wrap">
                        <Flex align="center" gap={12} wrap="wrap">
                            {data.projectName ? (
                                <span className={styles.themeMenuContext} title={data.projectName}>
                                    <Text type="secondary">Menu:</Text>
                                    <Text strong>{data.projectName}</Text>
                                </span>
                            ) : null}
                            {data.projectId && stylePreferences.projectThemeOverrides?.[data.projectId] ? (
                                <Button
                                    disabled={Boolean(stylePreferenceBusyKey)}
                                    loading={stylePreferenceBusyKey === 'theme:clear'}
                                    onClick={() => void (async () => {
                                        const restored = await handleClearProjectThemeOverride();
                                        if (restored) setIsThemeLibraryOpen(false);
                                    })()}
                                    type="text"
                                >
                                    {stylePreferences.businessThemeId ? 'Return to business theme' : 'Use recommended theme'}
                                </Button>
                            ) : (
                                <Text type="secondary">Choose a look to preview it. Nothing changes until you apply it.</Text>
                            )}
                        </Flex>
                        <Flex className={styles.themeApplyActions} gap={10} wrap="wrap">
                            <Button
                                disabled={Boolean(stylePreferenceBusyKey)}
                                onClick={() => setIsThemeLibraryOpen(false)}
                            >
                                Close
                            </Button>
                            <Button
                                disabled={!pendingThemeId || Boolean(stylePreferenceBusyKey) || stylePreferences.businessThemeId === pendingThemeId}
                                loading={Boolean(pendingThemeId && stylePreferenceBusyKey === `theme:business:${pendingThemeId}`)}
                                onClick={() => void applyPendingTheme('business')}
                            >
                                {stylePreferences.businessThemeId === pendingThemeId ? 'Already applied to all menus' : 'Apply to all menus'}
                            </Button>
                            {data.projectId ? (
                                <Button
                                    className={styles.themeMenuAction}
                                    disabled={!pendingThemeId || Boolean(stylePreferenceBusyKey) || stylePreferences.projectThemeOverrides?.[data.projectId] === pendingThemeId}
                                    loading={Boolean(pendingThemeId && stylePreferenceBusyKey === `theme:project:${pendingThemeId}`)}
                                    onClick={() => void applyPendingTheme('project')}
                                    title={data.projectName
                                        ? `${stylePreferences.projectThemeOverrides?.[data.projectId] === pendingThemeId ? 'Already applied to' : 'Apply to'} ${data.projectName}`
                                        : undefined}
                                    type="primary"
                                >
                                    {stylePreferences.projectThemeOverrides?.[data.projectId] === pendingThemeId
                                        ? `Already applied to ${data.projectName || 'this menu'}`
                                        : `Apply to ${data.projectName || 'this menu'}`}
                                </Button>
                            ) : null}
                        </Flex>
                    </Flex>
                )}
                keyboard={!stylePreferenceBusyKey}
                maskClosable={!stylePreferenceBusyKey}
                onCancel={() => {
                    if (!stylePreferenceBusyKey) setIsThemeLibraryOpen(false);
                }}
                open={isThemeLibraryOpen}
                style={{
                    '--theme-library-bg': token.colorBgElevated,
                    '--theme-library-border': token.colorBorderSecondary,
                    '--theme-library-fill': token.colorFillQuaternary,
                    '--theme-library-hover': token.colorFillSecondary,
                    '--theme-library-preview-bg': token.colorBgLayout,
                    '--theme-library-primary': token.colorPrimary,
                    '--theme-library-primary-bg': token.colorPrimaryBg,
                    '--theme-library-primary-border': token.colorPrimary,
                    '--theme-library-success': token.colorSuccess,
                    '--theme-library-success-bg': token.colorSuccessBg,
                    '--theme-library-success-border': token.colorSuccessBorder,
                    '--theme-library-text': token.colorText,
                    margin: 0,
                    maxWidth: '100vw',
                    paddingBottom: 0,
                    top: 0,
                } as CSSProperties}
                title="Change brand look"
                width="100vw"
                zIndex={2300}
            >
                <Flex className={styles.themeLibraryShell} gap={16} vertical>
                    <Flex align="center" className={styles.themeLibraryControls} gap={10} justify="space-between" wrap="wrap">
                        <Segmented
                            onChange={(value) => setThemeBrowseMode(value as 'all' | 'recommended')}
                            options={[
                                { label: 'Recommended', value: 'recommended' },
                                { label: `All themes (${themeFamilies.length})`, value: 'all' },
                            ]}
                            value={themeBrowseMode}
                        />
                        <Input
                            allowClear
                            aria-label="Search brand looks"
                            onChange={(event) => setThemeSearch(event.target.value)}
                            placeholder="Search themes"
                            prefix={<LuSearch aria-hidden size={16} />}
                            style={{ maxWidth: 300 }}
                            value={themeSearch}
                        />
                    </Flex>
                    <div className={styles.themeLibraryWorkspace}>
                        <div className={styles.themeCatalogPanel}>
                            {visibleThemeFamilies.length ? (
                                <div className={styles.themeLibraryGrid}>
                                    {visibleThemeFamilies.map((family) => {
                                        const selected = pendingThemeId === family.id;
                                        const current = effectiveThemeId === family.id;
                                        const previewCopy = getPrintableAssetPreviewCopy('single_table_card', labels);
                                        return (
                                            <button
                                                aria-current={current ? 'true' : undefined}
                                                aria-label={`Preview ${family.label}${current ? ', current brand look' : ''}`}
                                                aria-pressed={selected}
                                                className={`${styles.themeChoice} ${selected ? styles.themeChoiceSelected : ''} ${current ? styles.themeChoiceCurrent : ''}`}
                                                key={family.id}
                                                onClick={() => setPendingThemeId((currentId) => (
                                                    currentId === family.id || current ? null : family.id
                                                ))}
                                                type="button"
                                            >
                                                <div className={styles.themeChoicePreview}>
                                                    <PrintableTemplatePreview
                                                        actionLabel={previewCopy.actionLabel}
                                                        assetTypeId="single_table_card"
                                                        brandColor={storeBrandColor}
                                                        compact
                                                        family={family}
                                                        instructionLabel={previewCopy.instructionLabel}
                                                        shortLink={data.menuLink.replace(/^https?:\/\//, '')}
                                                        storeLogo={data.storeLogo}
                                                        storeName={data.storeName}
                                                    />
                                                    {current || selected ? (
                                                        <span className={`${styles.themeSelectedMark} ${current ? styles.themeCurrentMark : styles.themePendingMark}`}>
                                                            <LuCheck aria-hidden size={14} /> {current ? 'Current' : 'Previewing'}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span className={styles.themeChoiceCopy}>
                                                    <Text strong>{family.label}</Text>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Empty description="No themes match this search" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                        </div>
                        <section
                            aria-label={`${themeLibraryPreviewFamily.label} key asset preview`}
                            className={styles.themeSetPreview}
                        >
                            <Flex align="center" className={styles.themeSetPreviewHeader} gap={12} justify="space-between">
                                <div aria-live="polite" className={styles.themeSetPreviewTitle}>
                                    <Text strong>{themeLibraryPreviewFamily.label}</Text>
                                    <Text type="secondary">
                                        {pendingThemeId ? 'Previewing — not applied yet' : 'Current brand look'}
                                    </Text>
                                </div>
                                <span className={`${styles.themePreviewState} ${pendingThemeId ? styles.themePreviewStateSelected : styles.themePreviewStateCurrent}`}>
                                    {pendingThemeId ? <LuEye aria-hidden size={14} /> : <LuCheck aria-hidden size={14} />}
                                    {pendingThemeId ? 'Previewing' : 'Current'}
                                </span>
                            </Flex>
                            <div className={styles.themeSetMosaic}>
                                {PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS.map((assetId) => {
                                    const asset = getPrintableAssetType(assetId);
                                    const previewCopy = getPrintableAssetPreviewCopy(assetId, labels);
                                    return (
                                        <div className={styles.themeSetMosaicItem} key={assetId}>
                                            <div className={styles.themeSetMosaicPreview}>
                                                <PrintableTemplatePreview
                                                    actionLabel={previewCopy.actionLabel}
                                                    assetTypeId={assetId}
                                                    brandColor={storeBrandColor}
                                                    compact
                                                    family={themeLibraryPreviewFamily}
                                                    instructionLabel={previewCopy.instructionLabel}
                                                    shortLink={(assetId === 'feedback_qr' ? data.feedbackQrLink : data.menuLink).replace(/^https?:\/\//, '')}
                                                    storeLogo={data.storeLogo}
                                                    storeName={data.storeName}
                                                />
                                            </div>
                                            <Text className={styles.themeSetMosaicLabel}>{asset.title}</Text>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </Flex>
            </Modal>
            <Modal
                closable={!businessProfileEditorState.busy}
                destroyOnHidden
                footer={null}
                keyboard={!businessProfileEditorState.busy}
                maskClosable={false}
                onCancel={closeBusinessProfileEditor}
                open={isBusinessProfileEditorOpen}
                styles={{ body: { maxHeight: 'calc(100dvh - 170px)', overflowY: 'auto' } }}
                title="Business details for your assets"
                width={780}
                zIndex={2250}
            >
                {isBusinessProfileEditorOpen ? (
                    <AssetBusinessProfileEditor
                        assetTitle={businessProfileAssetId ? getPrintableAssetType(businessProfileAssetId).title : undefined}
                        assetTypeId={businessProfileAssetId}
                        onCancel={closeBusinessProfileEditor}
                        onSaved={handleBusinessProfileSaved}
                        onStateChange={setBusinessProfileEditorState}
                    />
                ) : null}
            </Modal>
            <Modal
                closable={!busyKey}
                destroyOnHidden
                footer={null}
                keyboard={!busyKey}
                maskClosable={!busyKey}
                onCancel={closeTemplateActions}
                open={Boolean(activeTemplateFamily)}
                styles={{ body: { maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' } }}
                title={activeTemplateFamily
                    ? `${activeTemplateFamily.label} · ${selectedAssetId === 'complete_menu_kit' ? 'Complete Menu Kit' : selectedAsset.title}`
                    : 'Download asset'}
                width={getPrintableActionModalWidth(selectedAssetId)}
            >
                {activeTemplateFamily ? (
                    <Flex gap={16} vertical>
                        {selectedAssetId === 'staff_id_card' ? (
                            <Flex gap={6} vertical>
                                <Text strong>Select staff member</Text>
                                {userPermissions?.canManageUsers !== true ? (
                                    <Text type="secondary">You need staff-management access to create a personalized badge.</Text>
                                ) : (
                                    <Select
                                        aria-label="Select staff member for badge"
                                        disabled={Boolean(busyKey)}
                                        loading={staffBadgePeopleState.loading}
                                        notFoundContent={staffBadgePeopleState.error
                                            ? 'Staff details could not be loaded.'
                                            : 'No active staff with a valid name are available.'}
                                        onChange={handleSelectStaffBadgePerson}
                                        options={staffBadgePeopleState.people.map((person) => ({
                                            label: person.role ? `${person.name} - ${person.role}` : person.name,
                                            value: person.id,
                                        }))}
                                        placeholder="Choose a staff member"
                                        showSearch
                                        value={selectedStaffBadgePersonId || undefined}
                                    />
                                )}
                                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                    The badge uses only the selected staff record name and resolved role. It does not use store-contact fallbacks.
                                </Text>
                            </Flex>
                        ) : null}
                        {selectedAssetId === 'campaign_flyer' || selectedAssetId === 'campaign_poster' ? (
                            <FlyerCampaignFields
                                assetLabel={selectedAssetId === 'campaign_poster' ? 'Campaign Poster' : 'Flyer'}
                                applying={previewState === 'loading'}
                                dirty={runtimeDraftDirty}
                                disabled={Boolean(busyKey)}
                                onApply={() => void renderTemplatePreview(activeTemplateFamily.id)}
                                onChange={(value) => {
                                    if (selectedAssetId === 'campaign_poster') setPosterCampaignDraft(value);
                                    else setFlyerCampaignDraft(value);
                                    setRuntimeDraftDirty(true);
                                }}
                                value={selectedAssetId === 'campaign_poster' ? posterCampaignDraft : flyerCampaignDraft}
                            />
                        ) : null}
                        {selectedAssetId === 'postcard' ? (
                            <PostcardContentFields
                                applying={previewState === 'loading'}
                                dirty={runtimeDraftDirty}
                                disabled={Boolean(busyKey)}
                                onApply={() => void renderTemplatePreview(activeTemplateFamily.id)}
                                onChange={(value) => { setPostcardContentDraft(value); setRuntimeDraftDirty(true); }}
                                value={postcardContentDraft}
                            />
                        ) : null}
                        {selectedAssetId === 'gift_certificate' ? (
                            <GiftCertificateContentFields
                                applying={previewState === 'loading'}
                                dirty={runtimeDraftDirty}
                                disabled={Boolean(busyKey)}
                                onApply={() => void renderTemplatePreview(activeTemplateFamily.id)}
                                onChange={(value) => { setGiftCertificateDraft(value); setRuntimeDraftDirty(true); }}
                                value={giftCertificateDraft}
                            />
                        ) : null}
                        {selectedAssetId === 'event_invitation' ? (
                            <InvitationContentFields
                                applying={previewState === 'loading'}
                                dirty={runtimeDraftDirty}
                                disabled={Boolean(busyKey)}
                                onApply={() => void renderTemplatePreview(activeTemplateFamily.id)}
                                onChange={(value) => { setInvitationDraft(value); setRuntimeDraftDirty(true); }}
                                value={invitationDraft}
                            />
                        ) : null}
                        <div
                            className={styles.previewModalStage}
                            style={{
                                '--preview-modal-height': `${getPrintableActionPreviewHeight(selectedAssetId)}px`,
                            } as CSSProperties}
                        >
                            {previewState === 'loading' ? (
                                <Flex align="center" gap={10} justify="center" vertical>
                                    <Spin />
                                    <Text type="secondary">Creating preview...</Text>
                                </Flex>
                            ) : previewAsset ? (
                                <img
                                    alt={`${previewAsset.label} preview`}
                                    className={styles.previewModalImage}
                                    src={previewAsset.url}
                                />
                            ) : previewState === 'error' ? (
                                <Flex align="center" gap={10} justify="center" vertical>
                                    <Text type="secondary" style={{ textAlign: 'center' }}>
                                        Preview could not be created. Downloads and Customize stay unavailable until it succeeds.
                                    </Text>
                                    <Button disabled={Boolean(busyKey)} onClick={() => void renderTemplatePreview(activeTemplateFamily.id)}>
                                        Retry preview
                                    </Button>
                                </Flex>
                            ) : selectedAssetId === 'complete_menu_kit' ? (
                                <Flex align="center" gap={10} justify="center" vertical>
                                    <LuPackage color={token.colorPrimary} size={56} />
                                    <Text strong>{activeTemplateFamily.label} asset set</Text>
                                    <Text style={{ color: token.colorTextSecondary, maxWidth: 360, textAlign: 'center' }}>
                                        Every supported file follows the same selected parent theme automatically.
                                    </Text>
                                </Flex>
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
                            <Text className={styles.previewModalSizeBadge}>{selectedAsset.size}</Text>
                        </div>
                        <Flex gap={12} vertical>
                            <Text className={styles.previewModalDescription} type="secondary">
                                {selectedAssetId === 'complete_menu_kit'
                                    ? `Download the complete coordinated asset set in ${activeTemplateFamily.label}.`
                                    : selectedAsset.description}
                            </Text>
                            {selectedAssetNeedsSetup ? (
                                <div className={styles.recoveryPanel}>
                                    <Flex align="flex-start" gap={10}>
                                        <LuAlertCircle aria-hidden color={token.colorWarning} size={19} />
                                        <div>
                                            <Text strong>Turn on customer feedback to use this asset</Text>
                                            <Text type="secondary">You can inspect the design now. Downloads stay unavailable until its QR destination is active.</Text>
                                        </div>
                                    </Flex>
                                    <Button block onClick={() => router.push('/business-settings?section=feedback')} type="primary">
                                        Open feedback settings
                                    </Button>
                                </div>
                            ) : null}
                            <div className={styles.recoveryPanel}>
                                <Flex align="flex-start" gap={10} justify="space-between" wrap="wrap">
                                    <Flex gap={5} style={{ minWidth: 0 }} vertical>
                                        <Flex align="center" gap={8} wrap="wrap">
                                            <Text strong>Business details used by this asset</Text>
                                            <Tag color={selectedAssetProfileReadiness.percent === 100 ? 'success' : 'processing'}>
                                                {selectedAssetProfileReadiness.completedCount}/{selectedAssetProfileReadiness.totalCount} ready
                                            </Tag>
                                        </Flex>
                                        <Text type="secondary">
                                            {selectedAssetProfileReadiness.missingFields.length
                                                ? `Add ${selectedAssetProfileReadiness.missingFields.map((field) => field.label.toLocaleLowerCase()).join(', ')} to strengthen this design.`
                                                : 'All recommended business details for this design are available.'}
                                        </Text>
                                        <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                                            Changes save to Business Settings and are reused across future assets.
                                        </Text>
                                    </Flex>
                                    {canManageAssetBusinessProfile ? (
                                        <Button disabled={Boolean(busyKey)} onClick={() => { setBusinessProfileAssetId(selectedAssetId); setIsBusinessProfileEditorOpen(true); }}>
                                            {selectedAssetProfileReadiness.percent === 100 ? 'Review details' : 'Complete here'}
                                        </Button>
                                    ) : null}
                                </Flex>
                            </div>
                            {selectedAssetId === 'business_card' ? (
                                <div className={styles.recoveryPanel}>
                                    <Flex gap={6} vertical>
                                        <Text strong>Data used from Business Settings</Text>
                                        <Text type="secondary">
                                            Business: {data.storeName} · Tagline: {data.storeTagline || 'Not set'} · Contact: {printableStoreContactFields.contactName || 'Not set'}
                                        </Text>
                                        <Text type="secondary">
                                            Phone: {printableStoreContactFields.contactPhone || 'Not set'} · Email: {printableStoreContactFields.contactEmail || 'Not set'} · Address: {printableStoreContactFields.contactAddress || 'Not set'}
                                        </Text>
                                    </Flex>
                                </div>
                            ) : null}
                            {selectedAssetId === 'print_menu' ? (
                                <Text type="secondary">
                                    Data used: published items, categories, prices, options, descriptions, and item attributes from {data.projectName || labels.offeringTitle}. Update them in Menu before downloading if anything is wrong.
                                </Text>
                            ) : null}
                            <div className={styles.previewModalActions}>
                                {selectedAsset.outputFormat === 'zip' ? (
                                    <Button
                                        className={styles.previewModalAction}
                                        disabled={Boolean(busyKey) || previewState !== 'ready'}
                                        icon={<LuDownload size={16} />}
                                        loading={busyKey === `download:${selectedAssetId}:${activeTemplateFamily.id}:zip`}
                                        onClick={() => void handleRender(activeTemplateFamily.id, 'zip')}
                                        size="large"
                                        type="primary"
                                    >
                                        Download ZIP
                                    </Button>
                                ) : (
                                    selectedAssetActionFormats.map((format, index) => (
                                        <Button
                                            className={styles.previewModalAction}
                                            disabled={Boolean(busyKey) || previewState !== 'ready' || selectedAssetNeedsSetup || (selectedAssetId === 'staff_id_card' && !selectedStaffBadgePerson)}
                                            icon={<LuDownload size={16} />}
                                            key={format}
                                            loading={busyKey === `download:${selectedAssetId}:${activeTemplateFamily.id}:${format}`}
                                            onClick={() => void handleRender(activeTemplateFamily.id, format)}
                                            size="large"
                                            type={index === 0 ? 'primary' : 'default'}
                                        >
                                            {getPrintableModalDownloadActionLabel(format, selectedAssetId)}
                                        </Button>
                                    ))
                                )}
                                {canCustomizeSelectedAsset ? (
                                    <Button
                                        className={styles.previewModalAction}
                                        disabled={Boolean(busyKey) || previewState !== 'ready' || selectedAssetNeedsSetup || (selectedAssetId === 'staff_id_card' && !selectedStaffBadgePerson)}
                                        icon={<LuSparkles size={16} />}
                                        loading={busyKey === `customize:${selectedAssetId}:${activeTemplateFamily.id}`}
                                        onClick={() => void openEditorForTemplate(activeTemplateFamily.id)}
                                        size="large"
                                    >
                                        Customize
                                    </Button>
                                ) : null}
                            </div>
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
