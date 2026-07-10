'use client';

/**
 * Use MenuList — Output Center (v2)
 *
 * Unified page where owners get every usable output from MenuList:
 * links to share, screen URLs to display, and print-ready assets to download.
 *
 * Pure UI aggregation layer. Zero new backend logic. $0.00 Firebase cost.
 *
 * v2 enhancements:
 * - WhatsApp share for all links
 * - Multi-project support
 * - SMB category-aware wording (menu/services/catalog)
 * - Copy Message pattern from OBPLinkCard
 * - POS Sync shareable summary (when enabled)
 * - Google Business hint
 * - Ultra-simple UX for non-tech SMB owners
 *
 * @see __docs__/use-menulist/README.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { getScreenState } from '@database/campaigns';
import { getExistingProjectsListWithoutLoader } from '@database/projects';
import { recordStarterActivationSignal } from '@database/stores';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob, generateMenuKit, generateMenuKitAsset } from '@lib/menu-kit/menuKitGenerator';
import { buildMenuCardExportUrl } from '@lib/menu-card-export/navigation';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildPrintableAssetsUrl } from '@lib/printable-asset-templates/navigation';
import {
    PRINT_ASSET_REPRINT_GUIDANCE,
    buildPrintReadinessItems,
    buildPrintShopHandoffMessage,
    type PrintReadinessItem,
} from '@lib/print-assets/ownerPrintGuidance';
import { type MenuKitPrintAssetId } from '@lib/print-assets/printAssetCatalog';
import {
    STARTER_ACTIVATION_SIGNALS,
    isStarterActivationSignal,
    shouldRecordStarterActivationSignal,
    type StarterActivationSignal,
} from '@lib/onboarding/starterActivation';
import { buildScreenUrl } from '@lib/screen/utils';
import { isOwnerReferralAcquisitionEnabledForStore } from '@lib/ownerReferral/ownerReferralFeature';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename, downloadQrCode, generateBrandedQrCodeDataUrl } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Col, Divider, Empty, Flex, message, Modal, Row, Spin, Tag, theme, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuBookOpen,
    LuCheck,
    LuClipboard,
    LuCopy,
    LuDownload,
    LuEye,
    LuExternalLink,
    LuFileText,
    LuMapPin,
    LuMessageSquare,
    LuMonitor,
    LuPackage,
    LuPlaySquare,
    LuPrinter,
    LuQrCode,
    LuShield,
} from 'react-icons/lu';
import { ProjectSelectorList, ProjectSelectorTrigger } from '../../../shared/ProjectSelector';
import CommunicationKit from './CommunicationKit';
import OwnerReferralModal from './OwnerReferralModal';
import PresenceMonitor from './PresenceMonitor';
import ShareLinkCard from '../ShareLinkCard';
import { PageState, ProjectLink, UseMenuListData } from './types';
import { getBoundedUseMenuListStringContext, logUseMenuListFailure } from './useMenuListDiagnostics';

const { Title, Text, Paragraph } = Typography;

type UseMenuListView = 'overview' | 'print-assets';

const USE_MENULIST_COPY_UNAVAILABLE = 'use_menulist_copy_unavailable';
const USE_MENULIST_COPY_FALLBACK_FAILED = 'use_menulist_copy_fallback_failed';

const hasUseMenuListClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasUseMenuListCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyUseMenuListText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasUseMenuListClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasUseMenuListCopyFallback()) {
        throw clipboardWriteError || new Error(USE_MENULIST_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(USE_MENULIST_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface UseMenuListProps {
    view?: UseMenuListView;
}

export default function UseMenuList({ view = 'overview' }: UseMenuListProps) {
    const { storeDetails, tenantDetails, isMasterUser } = useContext(PlatformGlobalDataContext);
    const { token: themeToken } = theme.useToken();
    const router = useRouter();
    const searchParams = useSearchParams();
    // T4-N-03: QR card labels + descriptions routed through i18n.
    const t = useTranslations('UseMenuList');
    const projectIdQuery = searchParams.get('projectId') || '';
    const focusQuery = searchParams.get('focus') || '';
    const [pageState, setPageState] = useState<PageState>('loading');
    const [data, setData] = useState<UseMenuListData | null>(null);
    const [generatingKit, setGeneratingKit] = useState(false);
    const [generatingAsset, setGeneratingAsset] = useState<string | null>(null);
    const [previewingAsset, setPreviewingAsset] = useState<string | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const qrSectionRef = useRef<HTMLDivElement | null>(null);
    const recordedStarterSignalsRef = useRef(new Set<StarterActivationSignal>());

    const labels = useMemo(
        () => getOfferingLabels(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory],
    );
    const resolveProjectName = (name: string | Record<string, string> | undefined, fallback = 'Untitled') => (
        getLocalizedText(name, undefined, getPrimaryLocalizedLanguage(name, 'en'), fallback)
    );
    const storeDisplayName = useMemo(
        () => getStoreContextName(storeDetails as any, 'Your Business'),
        [storeDetails]
    );
    const storeBrandColor = useMemo(
        () => resolveStoreBrandColor(storeDetails as any),
        [storeDetails],
    );

    // Guide modal state
    const [guideModal, setGuideModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

    // Load data on mount
    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_USE_MENULIST) return;
        loadData();
    }, [projectIdQuery, storeDetails]);

    useEffect(() => {
        const existingSignals = Object.keys(storeDetails?.starterActivationSignals?.actions || {})
            .filter(isStarterActivationSignal);
        recordedStarterSignalsRef.current = new Set(existingSignals);
    }, [storeDetails?.storeId, storeDetails?.starterActivationSignals?.lastSignalAt]);

    useEffect(() => {
        if (focusQuery !== 'qr' || pageState !== 'ready') return;
        window.setTimeout(() => {
            qrSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [focusQuery, pageState]);

    const recordStarterSignal = useCallback((signal?: StarterActivationSignal) => {
        if (!signal || !storeDetails?.storeId || !shouldRecordStarterActivationSignal(storeDetails)) return;
        if (recordedStarterSignalsRef.current.has(signal)) return;

        recordedStarterSignalsRef.current.add(signal);
        recordStarterActivationSignal(storeDetails.storeId, signal).catch((error) => {
            logUseMenuListFailure('use_menulist_starter_signal_failed', error, {
                signal,
                ...getBoundedUseMenuListStringContext('storeId', storeDetails.storeId),
            });
            recordedStarterSignalsRef.current.delete(signal);
        });
    }, [storeDetails]);

    const getOutputDiagnosticContext = () => ({
        hasData: Boolean(data),
        allProjectCount: data?.allProjects.length ?? 0,
        hasPublishedMenu: data?.hasPublishedMenu,
        hasScreen: data?.hasScreen,
        hasFeedbackEnabled: data?.hasFeedbackEnabled,
        ...getBoundedUseMenuListStringContext('storeId', storeDetails?.storeId),
        ...getBoundedUseMenuListStringContext('projectId', data?.projectId),
    });

    async function loadData() {
        if (!storeDetails) {
            setPageState('loading');
            return;
        }

        try {
            // Get projects list to check if menu exists & is published
            const result = await getExistingProjectsListWithoutLoader(true);
            const projects = result?.projects || [];
            const defaultProject = projects.find((p: any) => p.projectId === projectIdQuery)
                || projects.find((p: any) => p.isDefault)
                || projects[0];

            if (!projects.length || !defaultProject) {
                setPageState('no_menu');
                return;
            }

            // Build links
            const subdomain = storeDetails.subdomain || '';
            const customDomain = storeDetails.customDomain;

            const obpLink = generateOBPUrl(subdomain, customDomain);
            const installAppLink =
                FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA &&
                    (storeDetails as any).pwaSettings?.enableInstallableApp !== false
                    ? `${obpLink.replace(/\/$/, '')}/?pwa=install`
                    : null;
            // R5 link-emitter audit (§9 PUBLIC-ROUTING-DOCTRINE): always emit
            // the real canonical slug URL (e.g., /food-menu), never the /menu
            // alias. Under R5, every project's canonical URL is its real slug.
            const menuLink = generateProjectUrl(
                subdomain,
                customDomain,
                resolveProjectName(defaultProject.name, labels.offeringTitle),
                false
            );

            // Get screen state
            let screenToken: string | null = null;
            let screenLastSeenAt: any = null;
            try {
                const screenState = await getScreenState();
                if (screenState) {
                    screenToken = screenState.screenToken;
                    screenLastSeenAt = screenState.screenLastSeenAt || null;
                }
            } catch (error) {
                logUseMenuListFailure('use_menulist_screen_links_load_failed', error, {
                    hasCustomDomain: Boolean(customDomain),
                    ...getBoundedUseMenuListStringContext('storeId', storeDetails.storeId),
                    ...getBoundedUseMenuListStringContext('tenantId', (storeDetails as any).tenantId),
                    ...getBoundedUseMenuListStringContext('projectId', defaultProject.projectId),
                    ...getBoundedUseMenuListStringContext('subdomain', subdomain),
                    ...getBoundedUseMenuListStringContext('obpLink', obpLink),
                    ...getBoundedUseMenuListStringContext('menuLink', menuLink),
                });
                // Screen not initialized or temporarily unavailable — keep non-screen outputs usable.
            }

            // Build feedback link
            const feedbackLink = defaultProject.projectId
                ? getFeedbackUrl(defaultProject.projectId, 'direct_link', obpLink)
                : ''
            const feedbackQrLink = defaultProject.projectId
                ? getFeedbackUrl(defaultProject.projectId, 'feedback_qr', obpLink)
                : ''

            // Build multi-project links
            const allProjects: ProjectLink[] = projects.map((p: any) => {
                return {
                    projectId: p.projectId,
                    name: p.name,
                    isDefault: p.isDefault || false,
                    active: p.active !== false,
                    deleted: p.deleted === true,
                    projectImage: p.projectImage || null,
                    // R5: real canonical slug URL — no /menu alias.
                    url: generateProjectUrl(subdomain, customDomain, resolveProjectName(p.name, labels.offeringTitle), false),
                    feedbackUrl: p.projectId ? getFeedbackUrl(p.projectId, 'direct_link', obpLink) : '',
                    feedbackQrUrl: p.projectId ? getFeedbackUrl(p.projectId, 'feedback_qr', obpLink) : '',
                };
            });

            // POS Sync status (if enabled)
            const posSync = storeDetails.posSync;
            const hasPosSync = FEATURE_FLAGS.ENABLE_POS_SYNC && !!posSync?.enabled;
            const hasPublishedMenu = projects.some((project: any) => project.deleted !== true && project.active !== false);

            const outputData: UseMenuListData = {
                obpLink,
                menuLink,
                installAppLink,
                feedbackLink,
                feedbackQrLink,
                screenToken,
                menuBoardLink: screenToken ? buildScreenUrl(screenToken, obpLink) : null,
                highlightsLink: screenToken ? `${buildScreenUrl(screenToken, obpLink)}?mode=highlights` : null,
                screenLastSeenAt,
                storeName: storeDisplayName,
                storeLogo: storeDetails.logo || null,
                subdomain: subdomain || '',
                customDomain: customDomain || null,
                businessType: storeDetails.businessType || '',
                projectId: defaultProject.projectId || null,
                projectName: resolveProjectName(defaultProject.name, labels.offeringTitle),
                isDefaultProject: defaultProject.isDefault || false,
                menuModifiedOn: defaultProject.modifiedOn || null,
                allProjects,
                hasPosSync,
                posSyncStatus: hasPosSync ? (posSync?.status || 'disabled') : null,
                hasPublishedMenu,
                hasScreen: !!screenToken,
                hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
            };

            setData(outputData);
            setPageState('ready');
        } catch (error) {
            logUseMenuListFailure('use_menulist_load_failed', error, {
                hasStoreDetails: Boolean(storeDetails),
                hasTenantDetails: Boolean(tenantDetails),
                isMasterUser: Boolean(isMasterUser),
                hasCustomDomain: Boolean(storeDetails?.customDomain),
                ...getBoundedUseMenuListStringContext('storeId', storeDetails?.storeId),
                ...getBoundedUseMenuListStringContext('projectIdQuery', projectIdQuery),
                ...getBoundedUseMenuListStringContext('subdomain', storeDetails?.subdomain),
            });
            setPageState('no_menu');
        }
    }

    // ── Action handlers ──────────────────────────────────────────

    const withEntrySource = (url: string, entrySource: 'copy' | 'direct' | 'qr' | 'whatsapp') => (
        withAnalyticsSource(url, entrySource === 'copy' ? 'copy_link' : entrySource)
    );

    const handleCopy = async (text: string, label: string, starterSignal?: StarterActivationSignal) => {
        try {
            await copyUseMenuListText(text);
            message.success(`${label} copied`);
            recordStarterSignal(starterSignal);
        } catch (error) {
            logUseMenuListFailure('use_menulist_copy_failed', error, {
                ...getOutputDiagnosticContext(),
                signal: starterSignal,
                ...getBoundedUseMenuListStringContext('copiedText', text),
                ...getBoundedUseMenuListStringContext('label', label),
                hasClipboardWrite: hasUseMenuListClipboardWrite(),
                hasCopyFallback: hasUseMenuListCopyFallback(),
            });
            message.error('Failed to copy');
        }
    };

    const handleOpen = (url: string, label: string) => {
        try {
            const opened = window.open(url, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('use_menulist_open_blocked');
            }
        } catch (error) {
            logUseMenuListFailure('use_menulist_open_failed', error, {
                ...getOutputDiagnosticContext(),
                ...getBoundedUseMenuListStringContext('url', url),
                ...getBoundedUseMenuListStringContext('label', label),
            });
            message.error('Failed to open link');
        }
    };

    const handleOpenMenuCardExport = () => {
        if (!data?.projectId) return;
        router.push(buildMenuCardExportUrl(data.projectId));
    };

    const handleOpenPrintAssets = () => {
        if (!FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES && !FEATURE_FLAGS.ENABLE_PRINT_ASSETS_ROUTE) return;
        router.push(buildPrintableAssetsUrl(data?.projectId));
    };

    const buildMenuKitInput = () => {
        if (!data) return null;
        return {
            storeName: data.storeName,
            menuUrl: data.menuLink,
            shortLink: data.menuLink.replace(/^https?:\/\//, ''),
            logoUrl: data.storeLogo || undefined,
            brandColor: storeBrandColor,
            businessType: data.businessType,
            businessCategory: storeDetails?.businessCategory,
            activePlanType: (storeDetails as any)?.activePlanType,
        };
    };

    const handleDownloadMenuKit = async () => {
        const input = buildMenuKitInput();
        if (!input) return;
        setGeneratingKit(true);
        try {
            const result = await generateMenuKit(input);
            downloadBlob(result.zipBlob, result.zipFilename);
            message.success('Menu Kit downloaded');
            recordStarterSignal(STARTER_ACTIVATION_SIGNALS.MENU_KIT_DOWNLOADED);
        } catch (error) {
            logUseMenuListFailure('use_menulist_menu_kit_download_failed', error, {
                ...getOutputDiagnosticContext(),
                hasInput: Boolean(input),
                hasLogo: Boolean(input.logoUrl),
                ...getBoundedUseMenuListStringContext('menuUrl', input.menuUrl),
                ...getBoundedUseMenuListStringContext('storeName', input.storeName),
                ...getBoundedUseMenuListStringContext('businessType', input.businessType),
                ...getBoundedUseMenuListStringContext('businessCategory', input.businessCategory),
            });
            message.error('Failed to generate Menu Kit');
        } finally {
            setGeneratingKit(false);
        }
    };

    const handleDownloadAsset = async (assetKey: MenuKitPrintAssetId, assetLabel: string) => {
        const input = buildMenuKitInput();
        if (!input) return;
        setGeneratingAsset(assetLabel);
        try {
            const asset = await generateMenuKitAsset(input, assetKey);
            downloadBlob(asset.blob, asset.filename);
            message.success(`${assetLabel} downloaded`);
        } catch (error) {
            logUseMenuListFailure('use_menulist_menu_kit_asset_download_failed', error, {
                ...getOutputDiagnosticContext(),
                assetKey,
                ...getBoundedUseMenuListStringContext('assetLabel', assetLabel),
            });
            message.error(`Failed to generate ${assetLabel}`);
        } finally {
            setGeneratingAsset(null);
        }
    };

    const handlePreviewAsset = async (assetKey: MenuKitPrintAssetId, assetLabel: string) => {
        const input = buildMenuKitInput();
        if (!input) return;
        setPreviewingAsset(assetLabel);
        try {
            const asset = await generateMenuKitAsset(input, assetKey);
            const previewBlob = new Blob([asset.blob], { type: asset.mimeType });
            const previewUrl = URL.createObjectURL(previewBlob);
            const opened = window.open(previewUrl, '_blank', 'noopener,noreferrer');

            if (!opened) {
                downloadBlob(asset.blob, asset.filename);
                message.info('Preview was blocked, so the file was downloaded instead');
            } else {
                message.success(`${assetLabel} preview opened`);
            }

            window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
        } catch (error) {
            logUseMenuListFailure('use_menulist_menu_kit_asset_preview_failed', error, {
                ...getOutputDiagnosticContext(),
                assetKey,
                ...getBoundedUseMenuListStringContext('assetLabel', assetLabel),
            });
            message.error(`Failed to preview ${assetLabel}`);
        } finally {
            setPreviewingAsset(null);
        }
    };

    // G-04 (§11 + D-08 + D-09 PUBLIC-ROUTING-DOCTRINE): branded QR downloads for
    // Business Profile, Store Menu (Layer 2 alias), and Project Menu URLs.
    // This keeps every owner-visible download consistent with the premium PDF
    // and Menu Kit output while preserving QR entry-source tracking.
    const handleDownloadQr = async (
        url: string,
        label: string,
        filenameLabel: string,
        starterSignal?: StarterActivationSignal,
        cardCopy?: { subtitle?: string; title?: string },
    ) => {
        if (!url) return;
        setGeneratingAsset(label);
        try {
            const dataUrl = await generateBrandedQrCodeDataUrl(url, {
                brandColor: storeBrandColor,
                footer: url.replace(/^https?:\/\//, ''),
                logoUrl: data?.storeLogo || undefined,
                storeName: data?.storeName,
                subtitle: cardCopy?.subtitle || labels.scanToView,
                title: cardCopy?.title || label,
                activePlanType: (storeDetails as any)?.activePlanType,
            });
            downloadQrCode(dataUrl, buildQrCodeFilename(filenameLabel));
            message.success(`${label} downloaded`);
            recordStarterSignal(starterSignal);
        } catch (error) {
            logUseMenuListFailure('use_menulist_qr_download_failed', error, {
                ...getOutputDiagnosticContext(),
                signal: starterSignal,
                hasCardCopy: Boolean(cardCopy),
                ...getBoundedUseMenuListStringContext('url', url),
                ...getBoundedUseMenuListStringContext('label', label),
                ...getBoundedUseMenuListStringContext('filenameLabel', filenameLabel),
                ...getBoundedUseMenuListStringContext('cardTitle', cardCopy?.title),
                ...getBoundedUseMenuListStringContext('cardSubtitle', cardCopy?.subtitle),
            });
            message.error(`Failed to generate ${label}`);
        } finally {
            setGeneratingAsset(null);
        }
    };

    const handleDownloadPdf = async () => {
        if (!data) return;
        setGeneratingAsset('Menu PDF');
        try {
            const { generateMenuPdf, downloadPdf } = await import('@lib/export/menuPdfGenerator');
            const { getProjectData } = await import('@database/projects');
            const projectData = data.projectId ? await getProjectData(data.projectId) : null;
            const extractedData = (projectData as any)?.extractedData || {};
            const fileItems = Array.isArray((projectData as any)?.files)
                ? (projectData as any).files.flatMap((file: any) => file?.extractedData?.data?.items || [])
                : [];
            const fileCategories = Array.isArray((projectData as any)?.files)
                ? (projectData as any).files.flatMap((file: any) => file?.extractedData?.data?.categories || [])
                : [];
            const items = Array.isArray(extractedData.items) && extractedData.items.length > 0
                ? extractedData.items
                : fileItems;
            const categories = Array.isArray(extractedData.categories) && extractedData.categories.length > 0
                ? extractedData.categories
                : fileCategories;

            if (!items.length) {
                message.warning(`No ${labels.offeringLower} items to export`);
                setGeneratingAsset(null);
                return;
            }

            const pdfResult = await generateMenuPdf({
                projectName: data.projectName || 'Menu',
                storeName: data.storeName,
                language: 'en',
                menuUrl: data.menuLink,
                currency: (storeDetails as any)?.currencySymbol || '',
                currencyCode: (storeDetails as any)?.currencyCode || (storeDetails as any)?.currency || undefined,
                showDescriptions: true,
                projectId: data.projectId || undefined,
                projectData: projectData as any,
                storeData: storeDetails as any,
                logoUrl: data.storeLogo || (storeDetails as any)?.logo || undefined,
                businessType: (storeDetails as any)?.businessType || data.businessType,
                businessCategory: (storeDetails as any)?.businessCategory,
                activePlanType: (storeDetails as any)?.activePlanType,
                brandColor: storeBrandColor,
                items: items.filter((i: any) => i.active !== false),
                categories,
            });
            downloadPdf(pdfResult);
            message.success('Menu PDF downloaded');
        } catch (error) {
            logUseMenuListFailure('use_menulist_pdf_download_failed', error, {
                ...getOutputDiagnosticContext(),
                hasStoreLogo: Boolean(data.storeLogo || (storeDetails as any)?.logo),
                ...getBoundedUseMenuListStringContext('currencyCode', (storeDetails as any)?.currencyCode || (storeDetails as any)?.currency),
                ...getBoundedUseMenuListStringContext('businessType', (storeDetails as any)?.businessType || data.businessType),
                ...getBoundedUseMenuListStringContext('businessCategory', (storeDetails as any)?.businessCategory),
            });
            message.error('Failed to generate PDF');
        } finally {
            setGeneratingAsset(null);
        }
    };

    // ── Render states ────────────────────────────────────────────

    if (pageState === 'loading') {
        return (
            <div style={{ textAlign: 'center', padding: 80 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (pageState === 'no_menu') {
        return (
            <div style={{ padding: 24 }}>
                <Title level={3}>Use MenuList</Title>
                <Empty
                    description="Create your first menu to get started"
                    style={{ marginTop: 60 }}
                >
                    <Button type="primary" href="/projects">
                        Create {labels.offeringTitle}
                    </Button>
                </Empty>
            </div>
        );
    }

    if (!data) return null;

    const shortMenuLink = data.menuLink.replace(/^https?:\/\//, '');
    const activeProject = data.allProjects.find((project) => project.projectId === data.projectId) || data.allProjects[0] || null;
    const printReadinessItems = buildPrintReadinessItems({
        hasFeedbackEnabled: data.hasFeedbackEnabled,
        menuLink: data.menuLink,
        shortMenuLink,
        storeData: storeDetails as any,
        storeLogo: data.storeLogo,
        storeName: data.storeName,
    });
    const printShopMessage = buildPrintShopHandoffMessage({
        hasFeedbackEnabled: data.hasFeedbackEnabled,
        menuLink: data.menuLink,
        shortMenuLink,
        storeData: storeDetails as any,
        storeLogo: data.storeLogo,
        storeName: data.storeName,
    });
    const quickActionButtonStyle = {
        minHeight: 48,
        whiteSpace: 'normal' as const,
    };
    const primaryTagStyle = {
        backgroundColor: themeToken.colorPrimaryBg,
        borderColor: themeToken.colorPrimaryBorder,
        color: themeToken.colorPrimaryText,
    };
    const infoTagStyle = {
        backgroundColor: themeToken.colorInfoBg,
        borderColor: themeToken.colorInfoBorder,
        color: themeToken.colorInfoText,
    };
    const successTagStyle = {
        backgroundColor: themeToken.colorSuccessBg,
        borderColor: themeToken.colorSuccessBorder,
        color: themeToken.colorSuccessText,
    };
    const errorTagStyle = {
        backgroundColor: themeToken.colorErrorBg,
        borderColor: themeToken.colorErrorBorder,
        color: themeToken.colorErrorText,
    };

    const handleSelectProject = (projectId: string) => {
        const project = data.allProjects.find((item) => item.projectId === projectId);
        if (!project) return;
        setData((prev) => prev ? {
            ...prev,
            projectId: project.projectId,
            projectName: resolveProjectName(project.name, labels.offeringTitle),
            isDefaultProject: project.isDefault,
            menuLink: project.url,
            feedbackLink: project.feedbackUrl,
            feedbackQrLink: project.feedbackQrUrl,
        } : prev);
        setIsProjectSelectorOpen(false);
    };

    if (view === 'print-assets') {
        return (
            <div style={{ margin: '0 auto', maxWidth: 1080, padding: '24px clamp(16px, 3vw, 32px)', width: '100%' }}>
                {activeProject ? (
                    <div style={{ marginBottom: 16 }}>
                        <ProjectSelectorTrigger
                            clickable={data.allProjects.length > 1}
                            currentProject={{
                                id: activeProject.projectId,
                                name: activeProject.name,
                                isDefault: activeProject.isDefault,
                                active: activeProject.active,
                                deleted: activeProject.deleted,
                                isSpecialMenu: activeProject.isSpecialMenu === true,
                                projectImage: (activeProject as any).projectImage || null,
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
                            helperText={data.allProjects.length > 1 ? 'Select project' : undefined}
                            onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                        />
                    </div>
                ) : null}

                <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap" style={{ marginBottom: 24 }}>
                    <Flex vertical gap={4}>
                        <Title level={3} style={{ margin: 0 }}>Print Assets</Title>
                        <Text type="secondary">
                            Ready-to-print files for tables, counters, entrances, and full paper menus
                        </Text>
                    </Flex>
                    <Button onClick={() => router.push('/use-menulist')} style={{ minHeight: 40 }}>
                        Back to Use MenuList
                    </Button>
                </Flex>

                <PrintReadinessPanel items={printReadinessItems} themeToken={themeToken} />

                <Card
                    size="small"
                    style={{ marginBottom: 24, background: themeToken.colorBgLayout }}
                    styles={{ body: { padding: 16 } }}
                >
                    <Row gutter={[12, 12]}>
                        <Col xs={24} md={8}>
                            <AssetCard
                                icon={<LuPackage size={20} />}
                                title="Download All Print Assets"
                                description="Menu Kit ZIP with print, social, placement guide, and instructions"
                                loading={generatingKit}
                                onDownload={handleDownloadMenuKit}
                                actionLabel="Download ZIP"
                                highlight
                                themeToken={themeToken}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <AssetCard
                                icon={<LuFileText size={20} />}
                                title="Print Menu PDF"
                                description={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Preview and create the full printable menu' : 'Download the printable menu file'}
                                loading={generatingAsset === 'Menu PDF'}
                                onDownload={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport : handleDownloadPdf}
                                actionLabel={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Open' : 'Download'}
                                themeToken={themeToken}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <AssetCard
                                icon={<LuClipboard size={20} />}
                                title="Print-Shop Handoff"
                                description="Copy exact file specs to send with the ZIP"
                                loading={false}
                                onDownload={() => handleCopy(printShopMessage, 'Print-shop message')}
                                actionLabel="Copy Message"
                                themeToken={themeToken}
                            />
                        </Col>
                    </Row>
                </Card>

                <Title level={5} style={{ marginBottom: 12 }}>Tables</Title>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title="Table Tent"
                            description="Folded table card, readable from both sides"
                            loading={generatingAsset === 'Table Tent'}
                            onDownload={() => handleDownloadAsset('table_tent', 'Table Tent')}
                            onSecondaryAction={() => handlePreviewAsset('table_tent', 'Table Tent')}
                            secondaryActionLabel="Preview"
                            secondaryLoading={previewingAsset === 'Table Tent'}
                            themeToken={themeToken}
                        />
                    </Col>
                    <Col xs={24} sm={12}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title="Single Table Card"
                            description="Upright card for holders, wall clips, or counter stands"
                            loading={generatingAsset === 'Single Table Card'}
                            onDownload={() => handleDownloadAsset('single_table_card', 'Single Table Card')}
                            onSecondaryAction={() => handlePreviewAsset('single_table_card', 'Single Table Card')}
                            secondaryActionLabel="Preview"
                            secondaryLoading={previewingAsset === 'Single Table Card'}
                            themeToken={themeToken}
                        />
                    </Col>
                </Row>

                <Title level={5} style={{ marginBottom: 12 }}>Counter & Entrance</Title>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title="Counter Sticker"
                            description="For billing counter, pickup counter, or service desk"
                            loading={generatingAsset === 'Counter Sticker'}
                            onDownload={() => handleDownloadAsset('counter_sticker', 'Counter Sticker')}
                            onSecondaryAction={() => handlePreviewAsset('counter_sticker', 'Counter Sticker')}
                            secondaryActionLabel="Preview"
                            secondaryLoading={previewingAsset === 'Counter Sticker'}
                            themeToken={themeToken}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title="Entrance Poster"
                            description="For door, window, host stand, or front counter"
                            loading={generatingAsset === 'Entrance Poster'}
                            onDownload={() => handleDownloadAsset('entrance_poster', 'Entrance Poster')}
                            onSecondaryAction={() => handlePreviewAsset('entrance_poster', 'Entrance Poster')}
                            secondaryActionLabel="Preview"
                            secondaryLoading={previewingAsset === 'Entrance Poster'}
                            themeToken={themeToken}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        {data.hasFeedbackEnabled ? (
                            <AssetCard
                                icon={<LuMessageSquare size={20} />}
                                title="Feedback QR"
                                description="Use near exit or counter when asking for private feedback"
                                loading={generatingAsset === 'Feedback QR'}
                                onDownload={async () => {
                                    if (!data.feedbackLink) {
                                        message.info('Feedback is not enabled');
                                        return;
                                    }
                                    setGeneratingAsset('Feedback QR');
                                    try {
                                        const { generateBrandedFeedbackQrCode, downloadQrCode, getQrCodeFilename } = await import('@lib/utils/feedbackQrCode');
                                        const qrDataUrl = await generateBrandedFeedbackQrCode(data.projectId!, {
                                            brandColor: storeBrandColor,
                                            footer: data.feedbackQrLink.replace(/^https?:\/\//, ''),
                                            logoUrl: data.storeLogo || undefined,
                                            storeName: data.storeName,
                                            subtitle: t('feedbackLinkDesc'),
                                            title: t('feedbackQr'),
                                            activePlanType: (storeDetails as any)?.activePlanType,
                                        }, data.obpLink);
                                        downloadQrCode(qrDataUrl, getQrCodeFilename(data.storeName));
                                        message.success('Feedback QR downloaded');
                                    } catch (error) {
                                        logUseMenuListFailure('use_menulist_feedback_qr_download_failed', error, {
                                            ...getOutputDiagnosticContext(),
                                            hasStoreLogo: Boolean(data.storeLogo),
                                            ...getBoundedUseMenuListStringContext('feedbackQrLink', data.feedbackQrLink),
                                            ...getBoundedUseMenuListStringContext('obpLink', data.obpLink),
                                        });
                                        message.error('Failed to generate Feedback QR');
                                    } finally {
                                        setGeneratingAsset(null);
                                    }
                                }}
                                disabled={!data.projectId}
                                themeToken={themeToken}
                            />
                        ) : (
                            <Card size="small" styles={{ body: { height: '100%', padding: 14 } }} style={{ height: '100%', minHeight: 174 }}>
                                <Flex vertical gap={8} align="center" justify="center" style={{ textAlign: 'center', height: '100%' }}>
                                    <div style={{ color: themeToken.colorTextSecondary }}>
                                        <LuMessageSquare size={20} />
                                    </div>
                                    <Text strong style={{ fontSize: 13 }}>Feedback QR</Text>
                                    <Tag color="default">Feedback is disabled currently</Tag>
                                </Flex>
                            </Card>
                        )}
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <Card size="small" styles={{ body: { padding: 16 } }}>
                            <Flex gap={10} vertical>
                                <Text strong>Print guidance</Text>
                                <Text type="secondary">
                                    Use matte finish where possible, keep QR panels clean, and test one scan before printing in bulk.
                                </Text>
                                <Text type="secondary">
                                    Open Preview before sending a file to print. The preview is the same generated output as the download.
                                </Text>
                            </Flex>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card size="small" styles={{ body: { padding: 16 } }}>
                            <Flex gap={8} vertical>
                                <Text strong>When to reprint</Text>
                                {PRINT_ASSET_REPRINT_GUIDANCE.map((item) => (
                                    <Flex align="flex-start" gap={8} key={item}>
                                        <LuCheck size={14} style={{ color: themeToken.colorSuccess, flexShrink: 0, marginTop: 3 }} />
                                        <Text type="secondary">{item}</Text>
                                    </Flex>
                                ))}
                            </Flex>
                        </Card>
                    </Col>
                </Row>

                <Modal
                    title="Select Project"
                    open={isProjectSelectorOpen}
                    onCancel={() => setIsProjectSelectorOpen(false)}
                    footer={null}
                    width={520}
                >
                    <ProjectSelectorList
                        currentProjectId={data.projectId}
                        onSelect={handleSelectProject}
                        projects={data.allProjects.map((project) => ({
                            id: project.projectId,
                            name: project.name,
                            isDefault: project.isDefault,
                            active: project.active,
                            deleted: project.deleted,
                            projectImage: project.projectImage || null,
                            secondaryLabel: project.url.replace(/^https?:\/\//, ''),
                        }))}
                    />
                </Modal>
            </div>
        );
    }

    // ── Main render ──────────────────────────────────────────────

    return (
        <div style={{ margin: '0 auto', maxWidth: 1080, padding: '24px clamp(16px, 3vw, 32px)', width: '100%' }}>
            {activeProject ? (
                <div style={{ marginBottom: 16 }}>
                    <ProjectSelectorTrigger
                        clickable={data.allProjects.length > 1}
                        currentProject={{
                            id: activeProject.projectId,
                            name: activeProject.name,
                            isDefault: activeProject.isDefault,
                            active: activeProject.active,
                            deleted: activeProject.deleted,
                            isSpecialMenu: activeProject.isSpecialMenu === true,
                            projectImage: (activeProject as any).projectImage || null,
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
                        helperText={data.allProjects.length > 1 ? 'Select project' : undefined}
                        onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                    />
                </div>
            ) : null}

            {/* Header */}
            <Flex vertical gap={4} style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>Use MenuList</Title>
                <Text type="secondary">
                    Your {labels.offeringLower} is live and ready to share
                </Text>
            </Flex>

            {/* ─── Quick Actions ─────────────────────────────────── */}
            <Card
                size="small"
                style={{ marginBottom: 24, background: themeToken.colorBgLayout }}
                styles={{ body: { padding: 16 } }}
            >
                <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Button
                            block
                            type="primary"
                            icon={<LuCopy size={16} />}
                            onClick={() => handleCopy(
                                withEntrySource(data.menuLink, 'copy'),
                                `${labels.offeringTitle} link`,
                                STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                            )}
                            size="large"
                            style={quickActionButtonStyle}
                        >
                            Copy {labels.offeringTitle} Link
                        </Button>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Button
                            block
                            icon={<LuExternalLink size={16} />}
                            onClick={() => handleOpen(withEntrySource(data.menuLink, 'direct'), `${labels.offeringTitle} link`)}
                            size="large"
                            style={quickActionButtonStyle}
                        >
                            Open {labels.offeringTitle}
                        </Button>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Button
                            block
                            icon={<LuMonitor size={16} />}
                            onClick={() => data.menuBoardLink
                                ? handleCopy(data.menuBoardLink, 'Screen link')
                                : message.info('Set up Digital Screens in Business Settings first')
                            }
                            size="large"
                            disabled={!data.menuBoardLink}
                            style={quickActionButtonStyle}
                        >
                            Copy Screen Link
                        </Button>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Button
                            block
                            icon={<LuPackage size={16} />}
                            onClick={handleDownloadMenuKit}
                            loading={generatingKit}
                            size="large"
                            style={quickActionButtonStyle}
                        >
                            {generatingKit ? 'Generating...' : 'Download Menu Kit'}
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* ─── Menu Visibility (Presence Monitor) ─────────────── */}
            {FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR && storeDetails && (
                <PresenceMonitor
                    data={data}
                    storeDetails={storeDetails}
                />
            )}

            {/* ─── Share Your {offering} ──────────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Share Your {labels.offeringTitle}</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={data.installAppLink ? 8 : 12}>
                    <ShareLinkCard
                        title="Business Profile Link"
                        description={`Share this with customers - points to ${labels.yourLatest}`}
                        url={data.obpLink}
                        shortUrl={data.obpLink.replace(/^https?:\/\//, '')}
                        sharePrefix={labels.shareMessagePrefix}
                        copySuccessLabel={`${labels.offeringTitle} page link`}
                        diagnosticContext={{ ...getOutputDiagnosticContext(), cardKind: 'business_profile' }}
                        onShareAction={(action) => recordStarterSignal(
                            action === 'whatsapp'
                                ? STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED
                                : STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                        )}
                        onGuide={() => setGuideModal({
                            title: `Where to share your ${labels.offeringLower}`,
                            content: (
                                <ul style={{ paddingLeft: 20, lineHeight: 2.2 }}>
                                    <li>Add to your <strong>Instagram bio</strong></li>
                                    <li>Send to customers on <strong>WhatsApp</strong></li>
                                    <li>Add to <strong>Google Business Profile</strong> (see hint below)</li>
                                    <li>Put on your <strong>business cards</strong> or packaging</li>
                                    <li>Share with <strong>staff</strong> so everyone sends the same link</li>
                                </ul>
                            ),
                        })}
                    />
                </Col>
                <Col xs={24} sm={data.installAppLink ? 8 : 12}>
                    <ShareLinkCard
                        title="Project Menu Link"
                        description={`Opens ${labels.offeringLower} immediately — best for quick sharing`}
                        url={data.menuLink}
                        shortUrl={shortMenuLink}
                        sharePrefix={labels.shareMessagePrefix}
                        copySuccessLabel={`Direct ${labels.offeringLower} link`}
                        diagnosticContext={{ ...getOutputDiagnosticContext(), cardKind: 'project_menu' }}
                        onShareAction={(action) => recordStarterSignal(
                            action === 'whatsapp'
                                ? STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED
                                : STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                        )}
                    />
                </Col>
                {data.installAppLink ? (
                    <Col xs={24} sm={8}>
                        <ShareLinkCard
                            title="Customer App Install Link"
                            description="Share this when you want customers to install your menu app directly"
                            url={data.installAppLink}
                            shortUrl={data.installAppLink.replace(/^https?:\/\//, '')}
                            sharePrefix={`Install ${data.storeName} on your phone:`}
                            copySuccessLabel="Customer App install link"
                            diagnosticContext={{ ...getOutputDiagnosticContext(), cardKind: 'customer_app_install' }}
                            onShareAction={(action) => recordStarterSignal(
                                action === 'whatsapp'
                                    ? STARTER_ACTIVATION_SIGNALS.WHATSAPP_SHARE_STARTED
                                    : STARTER_ACTIVATION_SIGNALS.MENU_LINK_COPIED,
                            )}
                            onGuide={() => setGuideModal({
                                title: 'Where to share the Customer App install link',
                                content: (
                                    <ul style={{ paddingLeft: 20, lineHeight: 2.2 }}>
                                        <li>Send directly on <strong>WhatsApp</strong> when customers ask for the menu</li>
                                        <li>Use it on a <strong>QR poster</strong> for loyal repeat customers</li>
                                        <li>Share with <strong>staff</strong> so they can help customers install the app</li>
                                        <li>Use the normal menu link for casual browsing; use this when you want installation</li>
                                    </ul>
                                ),
                            })}
                        />
                    </Col>
                ) : null}
            </Row>

            {isOwnerReferralAcquisitionEnabledForStore(storeDetails?.storeId) ? (
                <Flex justify="flex-end" style={{ marginBottom: 24 }}>
                    <OwnerReferralModal />
                </Flex>
            ) : null}

            {/*
             * ─── QR Codes ──────────────────────────────────────────
             * G-04 (§11 + D-08 + D-09 PUBLIC-ROUTING-DOCTRINE): three QR
             * products exposed side-by-side. Store Menu QR is the
             * operational default — it points at the Layer-2 `/menu` alias
             * so a reprint is NEVER required when the owner renames or
             * deletes a project (R5 universal-alias guarantee).
             */}
            <div ref={qrSectionRef}>
                <Title level={5} style={{ marginBottom: 12 }}>{t('qrSectionTitle')}</Title>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title={t('storeMenuQrTitle')}
                            description={t('storeMenuQrDescription')}
                            loading={generatingAsset === 'Store Menu QR'}
                            onDownload={() => handleDownloadQr(
                                // G-04: inline Layer-2 alias URL (avoids an
                                // extra import the auto-organizer keeps
                                // stripping). Equivalent to generateMenuUrl().
                                withEntrySource(`${data.obpLink.replace(/\/$/, '')}/menu`, 'qr'),
                                'Store Menu QR',
                                `${data.storeName}-store-menu-qr`,
                                STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                                { subtitle: labels.scanToView, title: labels.printCardTitle },
                            )}
                            highlight
                            themeToken={themeToken}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title={t('businessProfileQrTitle')}
                            description={t('businessProfileQrDescription')}
                            loading={generatingAsset === 'Business Profile QR'}
                            onDownload={() => handleDownloadQr(
                                withEntrySource(data.obpLink, 'qr'),
                                'Business Profile QR',
                                `${data.storeName}-business-profile-qr`,
                                STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                                { subtitle: 'Scan to open our business page', title: 'BUSINESS PROFILE' },
                            )}
                            themeToken={themeToken}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <AssetCard
                            icon={<LuQrCode size={20} />}
                            title={t('projectMenuQrTitle')}
                            description={t('projectMenuQrDescription', { projectName: data.projectName || t('projectFallback') })}
                            loading={generatingAsset === 'Project Menu QR'}
                            onDownload={() => handleDownloadQr(
                                withEntrySource(data.menuLink, 'qr'),
                                'Project Menu QR',
                                `${data.storeName}-${data.projectName || 'project'}-menu-qr`,
                                STARTER_ACTIVATION_SIGNALS.QR_DOWNLOADED,
                                { subtitle: labels.scanToView, title: labels.printCardTitle },
                            )}
                            themeToken={themeToken}
                        />
                    </Col>
                </Row>
            </div>

            {/*
             * T2-N-04 / D-07 + D-08 PUBLIC-ROUTING-DOCTRINE: outlet-scoped QRs.
             * When the current tenant has multiple outlets, the master owner
             * is the only user with dashboard access who can actually print
             * physical QRs for every location. The QRs here target each
             * outlet's own Store Menu alias (`/{outletSlug}/menu`) — outlet
             * slug rename chain (G-07) keeps these resolving even after a
             * rename, so they are safe to print and forget.
             */}
            {(() => {
                const outlets = (tenantDetails?.storesList || []).filter(
                    (s: any) => s && !s.isMaster && s.active !== false && s.outletSlug,
                );
                if (!isMasterUser || outlets.length === 0) return null;
                const tenantBase = data.obpLink.replace(/\/$/, '');
                return (
                    <div style={{ marginBottom: 24 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                            {t('outletQrSectionHelper')}
                        </Text>
                        <Flex vertical gap={8}>
                            {outlets.map((outlet: any) => {
                                const outletUrl = `${tenantBase}/${outlet.outletSlug}/menu`;
                                const assetLabel = `Store Menu QR · ${outlet.name || outlet.outletSlug}`;
                                return (
                                    <Flex
                                        key={outlet.storeId}
                                        align="center"
                                        justify="space-between"
                                        gap={12}
                                        wrap="wrap"
                                        style={{
                                            background: themeToken.colorBgLayout,
                                            border: `1px solid ${themeToken.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            padding: '10px 14px',
                                        }}
                                    >
                                        <Flex vertical gap={2} style={{ minWidth: 0 }}>
                                            <Text strong style={{ fontSize: 13 }}>
                                                {outlet.name || outlet.outletSlug}
                                            </Text>
                                            <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                                                {outletUrl}
                                            </Text>
                                        </Flex>
                                        <Button
                                            size="small"
                                            icon={<LuDownload size={14} />}
                                            loading={generatingAsset === assetLabel}
                                            style={{ flexShrink: 0 }}
                                            onClick={() => handleDownloadQr(
                                                withEntrySource(outletUrl, 'qr'),
                                                assetLabel,
                                                `${outlet.name || outlet.outletSlug}-store-menu-qr`,
                                                undefined,
                                                { subtitle: labels.scanToView, title: labels.printCardTitle },
                                            )}
                                        >
                                            {t('downloadQrButton')}
                                        </Button>
                                    </Flex>
                                );
                            })}
                        </Flex>
                    </div>
                );
            })()}

            {/* Google Business hint */}
            <Flex
                gap={8}
                align="flex-start"
                style={{
                    background: themeToken.colorBgLayout,
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 24,
                }}
            >
                <LuMapPin size={16} style={{ flexShrink: 0, marginTop: 2, color: themeToken.colorTextSecondary }} />
                <Flex vertical gap={2}>
                    <Text style={{ fontSize: 13 }}>
                        <strong>Add to Google Maps</strong>
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Search your business on Google → click &quot;Edit&quot; → Menu / Website → paste your link. Customers will find your {labels.offeringLower} from Google search.
                    </Text>
                </Flex>
            </Flex>

            {/* ─── Customer Messages (Communication Kit) ──────────── */}
            {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT && storeDetails && (
                <>
                    <Divider />
                    <CommunicationKit
                        storeName={data.storeName}
                        businessType={data.businessType}
                        businessCategory={storeDetails?.businessCategory}
                        diagnosticContext={getOutputDiagnosticContext()}
                        menuLink={data.menuLink}
                        address={buildStoreAddress(storeDetails)}
                        phone={storeDetails.phoneNumber || undefined}
                        workingHours={storeDetails.workingHours}
                        timeZone={storeDetails.timeZone}
                        themeToken={themeToken}
                    />
                </>
            )}

            <Divider />

            {/* ─── Digital Screens ───────────────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Digital Screens</Title>
            {data.hasScreen ? (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12}>
                        <Card size="small" styles={{ body: { padding: 16 } }}>
                            <Flex vertical gap={8}>
                                <Flex gap={8} align="center">
                                    <LuMonitor size={18} />
                                    <Text strong>Menu Board</Text>
                                    <Tag style={primaryTagStyle}>Main TV</Tag>
                                </Flex>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Full {labels.offeringLower} with categories, items, and prices
                                </Text>
                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        background: themeToken.colorBgLayout,
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {data.menuBoardLink?.replace(/^https?:\/\//, '')}
                                </Text>
                                <Flex gap={8} wrap="wrap">
                                    <Button size="small" icon={<LuClipboard size={14} />} onClick={() => handleCopy(data.menuBoardLink!, 'Menu Board link')} style={{ flex: '1 1 96px' }}>
                                        Copy
                                    </Button>
                                    <Button size="small" icon={<LuExternalLink size={14} />} onClick={() => handleOpen(data.menuBoardLink!, 'Menu Board link')} style={{ flex: '1 1 96px' }}>
                                        Open
                                    </Button>
                                </Flex>
                            </Flex>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card size="small" styles={{ body: { padding: 16 } }}>
                            <Flex vertical gap={8}>
                                <Flex gap={8} align="center">
                                    <LuPlaySquare size={18} />
                                    <Text strong>Highlights</Text>
                                    <Tag style={infoTagStyle}>Second TV</Tag>
                                </Flex>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Rotating promotional slides with featured items
                                </Text>
                                <Text
                                    type="secondary"
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        background: themeToken.colorBgLayout,
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {data.highlightsLink?.replace(/^https?:\/\//, '')}
                                </Text>
                                <Flex gap={8} wrap="wrap">
                                    <Button size="small" icon={<LuClipboard size={14} />} onClick={() => handleCopy(data.highlightsLink!, 'Highlights link')} style={{ flex: '1 1 96px' }}>
                                        Copy
                                    </Button>
                                    <Button size="small" icon={<LuExternalLink size={14} />} onClick={() => handleOpen(data.highlightsLink!, 'Highlights link')} style={{ flex: '1 1 96px' }}>
                                        Open
                                    </Button>
                                </Flex>
                            </Flex>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Card size="small" style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
                    <Flex gap={12} align="center" wrap="wrap">
                        <LuMonitor size={20} style={{ color: themeToken.colorTextSecondary }} />
                        <Flex vertical gap={2} style={{ flex: 1 }}>
                            <Text>Digital screens not set up yet</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Show your {labels.offeringLower} on TVs or wall displays
                            </Text>
                        </Flex>
                        <Button size="small" href="/business-settings" style={{ flexShrink: 0 }}>
                            Set Up
                        </Button>
                    </Flex>
                </Card>
            )}

            {/* Screen setup tip */}
            {data.hasScreen && (
                <Flex
                    gap={6}
                    align="flex-start"
                    style={{
                        background: themeToken.colorSuccessBg,
                        borderRadius: 8,
                        padding: '10px 14px',
                        border: `1px solid ${themeToken.colorSuccessBorder}`,
                        marginBottom: 24,
                    }}
                >
                    <LuCheck size={14} style={{ flexShrink: 0, marginTop: 3, color: themeToken.colorSuccess }} />
                    <Text style={{ fontSize: 12 }}>
                        <strong>Setup tip:</strong> Open the link on your TV browser and bookmark it. The screen refreshes automatically.
                    </Text>
                </Flex>
            )}

            <Divider />

            {/* ─── Print for Your Business ─────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Print for Your Business</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {(FEATURE_FLAGS.ENABLE_PRINTABLE_ASSET_TEMPLATES || FEATURE_FLAGS.ENABLE_PRINT_ASSETS_ROUTE) ? (
                    <Col xs={24} sm={12} md={8}>
                        <AssetCard
                            icon={<LuPrinter size={20} />}
                            title="Assets"
                            description="Choose branded templates for tables, counters, entrance files, and menus"
                            loading={false}
                            onDownload={handleOpenPrintAssets}
                            actionLabel="Open"
                            highlight
                            themeToken={themeToken}
                        />
                    </Col>
                ) : null}
                <Col xs={24} sm={12} md={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title="Table Tent"
                        description="Place on tables"
                        loading={generatingAsset === 'Table Tent'}
                        onDownload={() => handleDownloadAsset('table_tent', 'Table Tent')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title="Single Table Card"
                        description="Flat card or counter stand"
                        loading={generatingAsset === 'Single Table Card'}
                        onDownload={() => handleDownloadAsset('single_table_card', 'Single Table Card')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title="Counter Sticker"
                        description="Near billing counter"
                        loading={generatingAsset === 'Counter Sticker'}
                        onDownload={() => handleDownloadAsset('counter_sticker', 'Counter Sticker')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <AssetCard
                            icon={<LuQrCode size={20} />}
                            title="Entrance Poster"
                            description="Door, window, or reception"
                            loading={generatingAsset === 'Entrance Poster'}
                        onDownload={() => handleDownloadAsset('entrance_poster', 'Entrance Poster')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    {data.hasFeedbackEnabled ? (
                        <AssetCard
                            icon={<LuMessageSquare size={20} />}
                            title="Feedback QR"
                            description="Near exit or counter"
                            loading={generatingAsset === 'Feedback QR'}
                            onDownload={async () => {
                                if (!data.feedbackLink) {
                                    message.info('Feedback is not enabled');
                                    return;
                                }
                                setGeneratingAsset('Feedback QR');
                                try {
                                    const { generateBrandedFeedbackQrCode, downloadQrCode, getQrCodeFilename } = await import('@lib/utils/feedbackQrCode');
                                    const qrDataUrl = await generateBrandedFeedbackQrCode(data.projectId!, {
                                        brandColor: storeBrandColor,
                                        footer: data.feedbackQrLink.replace(/^https?:\/\//, ''),
                                        logoUrl: data.storeLogo || undefined,
                                        storeName: data.storeName,
                                        subtitle: t('feedbackLinkDesc'),
                                        title: t('feedbackQr'),
                                        activePlanType: (storeDetails as any)?.activePlanType,
                                    }, data.obpLink);
                                    downloadQrCode(qrDataUrl, getQrCodeFilename(data.storeName));
                                    message.success('Feedback QR downloaded');
                                } catch (error) {
                                    logUseMenuListFailure('use_menulist_feedback_qr_download_failed', error, {
                                        ...getOutputDiagnosticContext(),
                                        hasStoreLogo: Boolean(data.storeLogo),
                                        ...getBoundedUseMenuListStringContext('feedbackQrLink', data.feedbackQrLink),
                                        ...getBoundedUseMenuListStringContext('obpLink', data.obpLink),
                                    });
                                    message.error('Failed to generate Feedback QR');
                                } finally {
                                    setGeneratingAsset(null);
                                }
                            }}
                            disabled={!data.projectId}
                            themeToken={themeToken}
                        />
                    ) : (
                        <Card size="small" styles={{ body: { height: '100%', padding: 14 } }} style={{ height: '100%', minHeight: 174 }}>
                            <Flex vertical gap={8} align="center" justify="center" style={{ textAlign: 'center', height: '100%' }}>
                                <div style={{ color: themeToken.colorTextSecondary }}>
                                    <LuMessageSquare size={20} />
                                </div>
                                <Text strong style={{ fontSize: 13 }}>Feedback</Text>
                                <Tag color="default">Feedback is disabled currently</Tag>
                            </Flex>
                        </Card>
                    )}
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <AssetCard
                        icon={<LuFileText size={20} />}
                        title="Print Menu"
                        description={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Preview and create PDF' : 'Printable paper version'}
                        loading={generatingAsset === 'Menu PDF'}
                        onDownload={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? handleOpenMenuCardExport : handleDownloadPdf}
                        actionLabel={FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT ? 'Open' : 'Download'}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <AssetCard
                        icon={<LuPackage size={20} />}
                        title="Complete Menu Kit"
                        description="Everything in one download"
                        loading={generatingKit}
                        onDownload={handleDownloadMenuKit}
                        highlight
                        themeToken={themeToken}
                    />
                </Col>
            </Row>

            {/* ─── External Menu Sync Info (when enabled) ───────────────────── */}
            {data.hasPosSync && (
                <>
                    <Divider />
                    <Title level={5} style={{ marginBottom: 12 }}>External Menu Sync</Title>
                    <Card size="small" style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
                        <Flex vertical gap={10}>
                            <Flex gap={8} align="center">
                                <LuShield size={18} style={{ color: themeToken.colorPrimary }} />
                                <Text strong>Connected system</Text>
                                <Tag
                                    style={
                                        data.posSyncStatus === 'healthy'
                                            ? successTagStyle
                                            : data.posSyncStatus === 'connection_issue'
                                                ? errorTagStyle
                                                : undefined
                                    }
                                >
                                    {data.posSyncStatus === 'healthy' ? 'Connected' : data.posSyncStatus === 'connection_issue' ? 'Issue' : 'Active'}
                                </Tag>
                            </Flex>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Your {labels.offeringLower} can send approved updates to a connected system after publish.
                            </Text>
                            <Flex gap={8} wrap="wrap">
                                <Button
                                    size="small"
                                    icon={<LuCopy size={14} />}
                                    style={{ minHeight: 36, whiteSpace: 'normal' }}
                                    onClick={() => {
                                        const summary = [
                                            'MenuList External Menu Sync — Setup Info',
                                            '',
                                            'Payload: Full menu snapshot (JSON)',
                                            'Security: HMAC-SHA256 signed (header: X-MenuList-Signature)',
                                            'Headers: X-MenuList-Signature, X-MenuList-Event, X-MenuList-Version, X-MenuList-Timestamp, X-MenuList-Delivery-Id',
                                            'Response: HTTP 200 within 5 seconds',
                                            '',
                                            'Documentation: https://menulist.ai/pos-sync',
                                        ].join('\n');
                                        handleCopy(summary, 'External sync details');
                                    }}
                                >
                                    Copy Setup Info for Provider
                                </Button>
                                <Button size="small" href="/business-settings" style={{ minHeight: 36 }}>
                                    External Sync Settings
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                </>
            )}

            <Divider />

            {/* ─── Resources ─────────────────────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Resources</Title>
            <Flex gap={12} wrap="wrap" style={{ marginBottom: 24 }}>
                <Button
                    icon={<LuBookOpen size={14} />}
                    style={{ minHeight: 40 }}
                    onClick={() => setGuideModal({
                        title: 'Setup Guide',
                        content: (
                            <ol style={{ paddingLeft: 20, lineHeight: 2.2 }}>
                                <li>Place <strong>table QR cards</strong> on each table</li>
                                <li>Stick <strong>entrance poster</strong> on door or window</li>
                                <li>Place <strong>counter QR</strong> near billing counter</li>
                                <li>Place <strong>feedback QR</strong> near exit</li>
                                <li>Open <strong>screen link</strong> on your TV browser</li>
                                <li>Add <strong>{labels.offeringLower} link</strong> to Instagram bio &amp; Google</li>
                            </ol>
                        ),
                    })}
                >
                    Setup Guide
                </Button>
                <Button
                    icon={<LuPrinter size={14} />}
                    style={{ minHeight: 40 }}
                    onClick={() => setGuideModal({
                        title: 'Printing Guide',
                        content: (
                            <Flex vertical gap={8}>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Paper:</strong> Regular A4 paper works fine. Laminate for durability.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Printing:</strong> Black &amp; white is sufficient. Color looks better.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Table tent:</strong> Print on A5, fold in half — works as a tent card.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>QR size:</strong> Keep QR code at least 3cm × 3cm for reliable scanning.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Scan distance:</strong> QR size (cm) × 10 = max scan distance (cm).
                                </Paragraph>
                            </Flex>
                        ),
                    })}
                >
                    Printing Guide
                </Button>
                <Button
                    icon={<LuExternalLink size={14} />}
                    style={{ minHeight: 40 }}
                    onClick={() => setGuideModal({
                        title: `Sharing Guide`,
                        content: (
                            <Flex vertical gap={8}>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>WhatsApp:</strong> Copy {labels.offeringLower} link → paste in chat → send.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Instagram:</strong> Go to profile → Edit → Website → paste link.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Google Business:</strong> Search your business on Google → Edit → Menu → paste link.
                                </Paragraph>
                                <Paragraph style={{ margin: 0 }}>
                                    <strong>Staff:</strong> Share the link with your team so everyone sends the same updated {labels.offeringLower}.
                                </Paragraph>
                            </Flex>
                        ),
                    })}
                >
                    Sharing Guide
                </Button>
            </Flex>

            {/* Guide Modal */}
            <Modal
                title={guideModal?.title}
                open={!!guideModal}
                onCancel={() => setGuideModal(null)}
                footer={<Button onClick={() => setGuideModal(null)}>Got it</Button>}
                width={480}
                styles={{
                    content: {
                        background: themeToken.colorBgElevated,
                    },
                    header: {
                        background: themeToken.colorBgElevated,
                        borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
                    },
                    body: {
                        color: themeToken.colorText,
                    },
                    footer: {
                        borderTop: `1px solid ${themeToken.colorBorderSecondary}`,
                    },
                }}
            >
                <div style={{ color: themeToken.colorText }}>
                    {guideModal?.content}
                </div>
            </Modal>

            <Modal
                title="Select Project"
                open={isProjectSelectorOpen}
                onCancel={() => setIsProjectSelectorOpen(false)}
                footer={null}
                width={520}
            >
                <ProjectSelectorList
                    currentProjectId={data.projectId}
                    onSelect={handleSelectProject}
                    projects={data.allProjects.map((project) => ({
                        id: project.projectId,
                        name: project.name,
                        isDefault: project.isDefault,
                        active: project.active,
                        deleted: project.deleted,
                        projectImage: project.projectImage || null,
                        secondaryLabel: project.url.replace(/^https?:\/\//, ''),
                    }))}
                />
            </Modal>
        </div>
    );
}

// ── Reusable Sub-Components ──────────────────────────────────────

interface AssetCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    loading: boolean;
    onDownload: () => void;
    actionLabel?: string;
    disabled?: boolean;
    highlight?: boolean;
    onSecondaryAction?: () => void;
    secondaryActionLabel?: string;
    secondaryLoading?: boolean;
    themeToken: any;
}

/**
 * Build a readable address string from store fields.
 * Returns undefined if no address parts are available.
 */
function buildStoreAddress(store: any): string | undefined {
    const parts = [
        store.addressLine,
        store.area,
        store.city,
        store.state,
        store.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
}

function readinessTagColor(status: PrintReadinessItem['status']): 'success' | 'warning' | 'default' {
    if (status === 'ready') return 'success';
    if (status === 'attention') return 'warning';
    return 'default';
}

function PrintReadinessPanel({ items, themeToken }: { items: PrintReadinessItem[]; themeToken: any }) {
    return (
        <Card size="small" style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
            <Flex gap={12} vertical>
                <Flex align="center" gap={8} wrap="wrap">
                    <LuPrinter size={18} style={{ color: themeToken.colorPrimary }} />
                    <Text strong>Print readiness</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Check once before sending files to a print shop.
                    </Text>
                </Flex>
                <Row gutter={[12, 12]}>
                    {items.map((item) => (
                        <Col key={item.id} xs={24} md={item.id === 'feedback' ? 24 : 12}>
                            <Flex
                                align="flex-start"
                                gap={10}
                                style={{
                                    background: themeToken.colorBgLayout,
                                    border: `1px solid ${themeToken.colorBorderSecondary}`,
                                    borderRadius: 8,
                                    minHeight: 74,
                                    padding: 12,
                                }}
                            >
                                <Tag color={readinessTagColor(item.status)} style={{ marginTop: 1 }}>
                                    {item.status === 'ready' ? 'Ready' : item.status === 'attention' ? 'Check' : 'Info'}
                                </Tag>
                                <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                    <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.35 }}>
                                        {item.description}
                                    </Text>
                                </Flex>
                            </Flex>
                        </Col>
                    ))}
                </Row>
            </Flex>
        </Card>
    );
}

function AssetCard({
    icon,
    title,
    description,
    loading,
    onDownload,
    actionLabel = 'Download',
    disabled,
    highlight,
    onSecondaryAction,
    secondaryActionLabel = 'Preview',
    secondaryLoading,
    themeToken,
}: AssetCardProps) {
    return (
        <Card
            size="small"
            styles={{ body: { height: '100%', padding: 14 } }}
            style={{
                height: '100%',
                minHeight: onSecondaryAction ? 212 : 174,
                borderColor: highlight ? themeToken.colorPrimary : undefined,
                borderWidth: highlight ? 2 : 1,
            }}
        >
            <Flex vertical gap={8} align="center" style={{ height: '100%', textAlign: 'center' }}>
                <div style={{ color: themeToken.colorPrimary }}>{icon}</div>
                <Text strong style={{ fontSize: 13 }}>{title}</Text>
                <Text type="secondary" style={{ flex: 1, fontSize: 11, lineHeight: 1.35 }}>{description}</Text>
                <Button
                    size="small"
                    icon={<LuDownload size={14} />}
                    onClick={onDownload}
                    loading={loading}
                    disabled={disabled}
                    block
                    style={{ minHeight: 34 }}
                >
                    {loading ? 'Generating...' : actionLabel}
                </Button>
                {onSecondaryAction ? (
                    <Button
                        size="small"
                        icon={<LuEye size={14} />}
                        onClick={onSecondaryAction}
                        loading={secondaryLoading}
                        disabled={disabled}
                        block
                        style={{ minHeight: 34 }}
                    >
                        {secondaryLoading ? 'Opening...' : secondaryActionLabel}
                    </Button>
                ) : null}
            </Flex>
        </Card>
    );
}
import { withAnalyticsSource } from '@lib/analytics/sourceAttribution';
