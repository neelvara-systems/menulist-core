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
import { getProjectsList } from '@database/projects';
import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { downloadBlob, generateMenuKit } from '@lib/menu-kit/menuKitGenerator';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildScreenUrl } from '@lib/screen/utils';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename, downloadQrCode, generateQrCodeDataUrl } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Col, Divider, Empty, Flex, message, Modal, Row, Spin, Tag, theme, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import {
    LuBookOpen,
    LuCheck,
    LuClipboard,
    LuCopy,
    LuDownload,
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
import PresenceMonitor from './PresenceMonitor';
import { PageState, ProjectLink, UseMenuListData } from './types';

const { Title, Text, Paragraph } = Typography;

export default function UseMenuList() {
    const { storeDetails, tenantDetails, isMasterUser } = useContext(PlatformGlobalDataContext);
    const { token: themeToken } = theme.useToken();
    // T4-N-03: QR card labels + descriptions routed through i18n.
    const t = useTranslations('UseMenuList');
    const [pageState, setPageState] = useState<PageState>('loading');
    const [data, setData] = useState<UseMenuListData | null>(null);
    const [generatingKit, setGeneratingKit] = useState(false);
    const [generatingAsset, setGeneratingAsset] = useState<string | null>(null);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

    const labels = useMemo(() => getOfferingLabels(storeDetails?.businessType), [storeDetails?.businessType]);

    // Guide modal state
    const [guideModal, setGuideModal] = useState<{ title: string; content: React.ReactNode } | null>(null);

    // Load data on mount
    useEffect(() => {
        if (!FEATURE_FLAGS.ENABLE_USE_MENULIST) return;
        loadData();
    }, [storeDetails]);

    async function loadData() {
        if (!storeDetails) {
            setPageState('loading');
            return;
        }

        try {
            // Get projects list to check if menu exists & is published
            const result = await getProjectsList();
            const projects = result?.projects || [];
            const defaultProject = projects.find((p: any) => p.isDefault) || projects[0];

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
                defaultProject.name,
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
            } catch {
                // Screen not initialized — OK
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
                    name: p.name || 'Untitled',
                    isDefault: p.isDefault || false,
                    active: p.active !== false,
                    // R5: real canonical slug URL — no /menu alias.
                    url: generateProjectUrl(subdomain, customDomain, p.name, false),
                    feedbackUrl: p.projectId ? getFeedbackUrl(p.projectId, 'direct_link', obpLink) : '',
                    feedbackQrUrl: p.projectId ? getFeedbackUrl(p.projectId, 'feedback_qr', obpLink) : '',
                };
            });

            // POS Sync status (if enabled)
            const posSync = storeDetails.posSync;
            const hasPosSync = FEATURE_FLAGS.ENABLE_POS_SYNC && !!posSync?.enabled;

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
                storeName: storeDetails.name || 'Your Business',
                storeLogo: storeDetails.logo || null,
                subdomain: subdomain || '',
                customDomain: customDomain || null,
                businessType: storeDetails.businessType || '',
                projectId: defaultProject.projectId || null,
                projectName: defaultProject.name || null,
                isDefaultProject: defaultProject.isDefault || false,
                menuModifiedOn: defaultProject.modifiedOn || null,
                allProjects,
                hasPosSync,
                posSyncStatus: hasPosSync ? (posSync?.status || 'disabled') : null,
                hasPublishedMenu: !!obpLink,
                hasScreen: !!screenToken,
                hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
            };

            setData(outputData);
            setPageState('ready');
        } catch (error) {
            console.error('[UseMenuList] Error loading data:', error);
            setPageState('ready');
        }
    }

    // ── Action handlers ──────────────────────────────────────────

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr' | 'whatsapp') =>
        url ? `${url}${url.includes('?') ? '&' : '?'}src=${src}` : url;

    const handleCopy = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            message.success(`${label} copied`);
        } catch {
            message.error('Failed to copy');
        }
    };

    const handleOpen = (url: string) => {
        window.open(url, '_blank');
    };

    const handleDownloadMenuKit = async () => {
        if (!data) return;
        setGeneratingKit(true);
        try {
            const shortLink = data.menuLink.replace(/^https?:\/\//, '');
            const result = await generateMenuKit({
                storeName: data.storeName,
                menuUrl: data.menuLink,
                shortLink,
                logoUrl: data.storeLogo || undefined,
                businessType: data.businessType,
            });
            const safeName = data.storeName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_') || 'Menu';
            downloadBlob(result.zipBlob, `${safeName}_MenuKit.zip`);
            message.success('Menu Kit downloaded');
        } catch {
            message.error('Failed to generate Menu Kit');
        } finally {
            setGeneratingKit(false);
        }
    };

    const handleDownloadAsset = async (assetIndex: number, assetLabel: string) => {
        if (!data) return;
        setGeneratingAsset(assetLabel);
        try {
            const shortLink = data.menuLink.replace(/^https?:\/\//, '');
            const result = await generateMenuKit({
                storeName: data.storeName,
                menuUrl: data.menuLink,
                shortLink,
                logoUrl: data.storeLogo || undefined,
                businessType: data.businessType,
            });
            const asset = result.assets[assetIndex];
            if (asset) {
                downloadBlob(asset.blob, asset.filename);
                message.success(`${assetLabel} downloaded`);
            }
        } catch {
            message.error(`Failed to generate ${assetLabel}`);
        } finally {
            setGeneratingAsset(null);
        }
    };

    // G-04 (§11 + D-08 + D-09 PUBLIC-ROUTING-DOCTRINE): plain-QR download for
    // Business Profile, Store Menu (Layer 2 alias), and Project Menu URLs.
    // The print assets above include branded QR layouts; this handler emits a
    // raw QR PNG for contexts where the owner wants to paste the code into
    // their own design (Instagram bio banner, Google Maps profile, flyer).
    const handleDownloadQr = async (url: string, label: string, filenameLabel: string) => {
        if (!url) return;
        setGeneratingAsset(label);
        try {
            const dataUrl = await generateQrCodeDataUrl(url);
            downloadQrCode(dataUrl, buildQrCodeFilename(filenameLabel));
            message.success(`${label} downloaded`);
        } catch {
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
            const extractedData = (projectData as any)?.extractedData;

            if (!extractedData?.items?.length) {
                message.warning(`No ${labels.offeringLower} items to export`);
                setGeneratingAsset(null);
                return;
            }

            const pdfResult = await generateMenuPdf({
                projectName: data.projectName || 'Menu',
                storeName: data.storeName,
                language: 'en',
                menuUrl: data.menuLink,
                currency: '',
                showDescriptions: true,
                items: extractedData.items.filter((i: any) => i.active !== false),
                categories: extractedData.categories || [],
            });
            downloadPdf(pdfResult);
            message.success('Menu PDF downloaded');
        } catch {
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

    const handleSelectProject = (projectId: string) => {
        const project = data.allProjects.find((item) => item.projectId === projectId);
        if (!project) return;
        setData((prev) => prev ? {
            ...prev,
            projectId: project.projectId,
            projectName: project.name,
            isDefaultProject: project.isDefault,
            menuLink: project.url,
            feedbackLink: project.feedbackUrl,
            feedbackQrLink: project.feedbackQrUrl,
        } : prev);
        setIsProjectSelectorOpen(false);
    };

    // ── Main render ──────────────────────────────────────────────

    return (
        <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
            {activeProject ? (
                <div style={{ marginBottom: 16 }}>
                    <ProjectSelectorTrigger
                        clickable={data.allProjects.length > 1}
                        currentProject={{
                            id: activeProject.projectId,
                            name: activeProject.name || 'Untitled',
                            isDefault: activeProject.isDefault,
                            active: activeProject.active,
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
                    <Col xs={12} sm={6}>
                        <Button
                            block
                            type="primary"
                            icon={<LuCopy size={16} />}
                            onClick={() => handleCopy(withSource(data.menuLink, 'copy'), `${labels.offeringTitle} link`)}
                            size="large"
                        >
                            Copy {labels.offeringTitle} Link
                        </Button>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Button
                            block
                            icon={<LuExternalLink size={16} />}
                            onClick={() => handleOpen(withSource(data.menuLink, 'direct'))}
                            size="large"
                        >
                            Open {labels.offeringTitle}
                        </Button>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Button
                            block
                            icon={<LuMonitor size={16} />}
                            onClick={() => data.menuBoardLink
                                ? handleCopy(data.menuBoardLink, 'Screen link')
                                : message.info('Set up Digital Screens in Business Settings first')
                            }
                            size="large"
                            disabled={!data.menuBoardLink}
                        >
                            Copy Screen Link
                        </Button>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Button
                            block
                            icon={<LuPackage size={16} />}
                            onClick={handleDownloadMenuKit}
                            loading={generatingKit}
                            size="large"
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
                    onCopyLink={handleCopy}
                />
            )}

            {/* ─── Share Your {offering} ──────────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Share Your {labels.offeringTitle}</Title>

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={data.installAppLink ? 8 : 12}>
                    <LinkCard
                        title="Business Profile Link"
                        description={`Share this with customers — always shows ${labels.yourLatest}`}
                        url={data.obpLink}
                        shortUrl={data.obpLink.replace(/^https?:\/\//, '')}
                        storeName={data.storeName}
                        sharePrefix={labels.shareMessagePrefix}
                        onCopy={() => handleCopy(withSource(data.obpLink, 'copy'), `${labels.offeringTitle} page link`)}
                        onOpen={() => handleOpen(withSource(data.obpLink, 'direct'))}
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
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={data.installAppLink ? 8 : 12}>
                    <LinkCard
                        title="Project Menu Link"
                        description={`Opens ${labels.offeringLower} immediately — best for quick sharing`}
                        url={data.menuLink}
                        shortUrl={shortMenuLink}
                        storeName={data.storeName}
                        sharePrefix={labels.shareMessagePrefix}
                        onCopy={() => handleCopy(withSource(data.menuLink, 'copy'), `Direct ${labels.offeringLower} link`)}
                        onOpen={() => handleOpen(withSource(data.menuLink, 'direct'))}
                        themeToken={themeToken}
                    />
                </Col>
                {data.installAppLink ? (
                    <Col xs={24} sm={8}>
                        <LinkCard
                            title="Customer App Install Link"
                            description="Share this when you want customers to install your menu app directly"
                            url={data.installAppLink}
                            shortUrl={data.installAppLink.replace(/^https?:\/\//, '')}
                            storeName={data.storeName}
                            sharePrefix={`Install ${data.storeName} on your phone:`}
                            onCopy={() => handleCopy(withSource(data.installAppLink!, 'copy'), 'Customer App install link')}
                            onOpen={() => handleOpen(withSource(data.installAppLink!, 'direct'))}
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
                            themeToken={themeToken}
                        />
                    </Col>
                ) : null}
            </Row>

            {/*
             * ─── QR Codes ──────────────────────────────────────────
             * G-04 (§11 + D-08 + D-09 PUBLIC-ROUTING-DOCTRINE): three QR
             * products exposed side-by-side. Store Menu QR is the
             * operational default — it points at the Layer-2 `/menu` alias
             * so a reprint is NEVER required when the owner renames or
             * deletes a project (R5 universal-alias guarantee).
             */}
            <Title level={5} style={{ marginBottom: 12 }}>{t('qrSectionTitle')}</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title={t('storeMenuQrTitle')}
                        description={t('storeMenuQrDescription')}
                        loading={generatingAsset === 'Store Menu QR'}
                        onDownload={() => handleDownloadQr(
                            // G-04: inline Layer-2 alias URL (avoids an
                            // extra import the auto-organizer keeps
                            // stripping). Equivalent to generateMenuUrl().
                            `${data.obpLink.replace(/\/$/, '')}/menu`,
                            'Store Menu QR',
                            `${data.storeName}-store-menu-qr`,
                        )}
                        highlight
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title={t('businessProfileQrTitle')}
                        description={t('businessProfileQrDescription')}
                        loading={generatingAsset === 'Business Profile QR'}
                        onDownload={() => handleDownloadQr(
                            data.obpLink,
                            'Business Profile QR',
                            `${data.storeName}-business-profile-qr`,
                        )}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={24} sm={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title={t('projectMenuQrTitle')}
                        description={t('projectMenuQrDescription', { projectName: data.projectName || t('projectFallback') })}
                        loading={generatingAsset === 'Project Menu QR'}
                        onDownload={() => handleDownloadQr(
                            data.menuLink,
                            'Project Menu QR',
                            `${data.storeName}-${data.projectName || 'project'}-menu-qr`,
                        )}
                        themeToken={themeToken}
                    />
                </Col>
            </Row>

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
                                        style={{
                                            background: themeToken.colorBgLayout,
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
                                            onClick={() => handleDownloadQr(
                                                outletUrl,
                                                assetLabel,
                                                `${outlet.name || outlet.outletSlug}-store-menu-qr`,
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
                                    <Tag color="blue">Main TV</Tag>
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
                                <Flex gap={8}>
                                    <Button size="small" icon={<LuClipboard size={14} />} onClick={() => handleCopy(data.menuBoardLink!, 'Menu Board link')}>
                                        Copy
                                    </Button>
                                    <Button size="small" icon={<LuExternalLink size={14} />} onClick={() => handleOpen(data.menuBoardLink!)}>
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
                                    <Tag color="purple">Second TV</Tag>
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
                                <Flex gap={8}>
                                    <Button size="small" icon={<LuClipboard size={14} />} onClick={() => handleCopy(data.highlightsLink!, 'Highlights link')}>
                                        Copy
                                    </Button>
                                    <Button size="small" icon={<LuExternalLink size={14} />} onClick={() => handleOpen(data.highlightsLink!)}>
                                        Open
                                    </Button>
                                </Flex>
                            </Flex>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Card size="small" style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
                    <Flex gap={12} align="center">
                        <LuMonitor size={20} style={{ color: themeToken.colorTextSecondary }} />
                        <Flex vertical gap={2} style={{ flex: 1 }}>
                            <Text>Digital screens not set up yet</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Show your {labels.offeringLower} on TVs or wall displays
                            </Text>
                        </Flex>
                        <Button size="small" href="/business-settings">
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
                        background: '#f6ffed',
                        borderRadius: 8,
                        padding: '10px 14px',
                        border: '1px solid #b7eb8f',
                        marginBottom: 24,
                    }}
                >
                    <LuCheck size={14} style={{ flexShrink: 0, marginTop: 3, color: '#52c41a' }} />
                    <Text style={{ fontSize: 12 }}>
                        <strong>Setup tip:</strong> Open the link on your TV browser and bookmark it. The screen refreshes automatically.
                    </Text>
                </Flex>
            )}

            <Divider />

            {/* ─── Print for Your Restaurant ─────────────────────── */}
            <Title level={5} style={{ marginBottom: 12 }}>Print for Your Restaurant</Title>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title="Table Tent"
                        description="Place on tables"
                        loading={generatingAsset === 'Table Tent'}
                        onDownload={() => handleDownloadAsset(0, 'Table Tent')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title="Counter Sticker"
                        description="Near billing counter"
                        loading={generatingAsset === 'Counter Sticker'}
                        onDownload={() => handleDownloadAsset(1, 'Counter Sticker')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <AssetCard
                        icon={<LuQrCode size={20} />}
                        title="Entrance Poster"
                        description="At restaurant entrance"
                        loading={generatingAsset === 'Entrance Poster'}
                        onDownload={() => handleDownloadAsset(2, 'Entrance Poster')}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={12} sm={8}>
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
                                const { generateFeedbackQrCode, downloadQrCode } = await import('@lib/utils/feedbackQrCode');
                                const qrDataUrl = await generateFeedbackQrCode(data.projectId!);
                                downloadQrCode(qrDataUrl, `${data.storeName.replace(/\s+/g, '-')}-feedback-qr`);
                                message.success('Feedback QR downloaded');
                            } catch {
                                message.error('Failed to generate Feedback QR');
                            } finally {
                                setGeneratingAsset(null);
                            }
                        }}
                        disabled={!data.hasFeedbackEnabled || !data.projectId}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={12} sm={8}>
                    <AssetCard
                        icon={<LuFileText size={20} />}
                        title={`${labels.offeringTitle} PDF`}
                        description="Printable paper version"
                        loading={generatingAsset === 'Menu PDF'}
                        onDownload={handleDownloadPdf}
                        themeToken={themeToken}
                    />
                </Col>
                <Col xs={12} sm={8}>
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

            {/* ─── POS Sync Info (when enabled) ───────────────────── */}
            {data.hasPosSync && (
                <>
                    <Divider />
                    <Title level={5} style={{ marginBottom: 12 }}>POS Sync</Title>
                    <Card size="small" style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
                        <Flex vertical gap={10}>
                            <Flex gap={8} align="center">
                                <LuShield size={18} style={{ color: themeToken.colorPrimary }} />
                                <Text strong>POS Integration</Text>
                                <Tag color={data.posSyncStatus === 'healthy' ? 'green' : data.posSyncStatus === 'connection_issue' ? 'red' : 'default'}>
                                    {data.posSyncStatus === 'healthy' ? 'Connected' : data.posSyncStatus === 'connection_issue' ? 'Issue' : 'Active'}
                                </Tag>
                            </Flex>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Your {labels.offeringLower} automatically syncs to your POS system when you publish changes.
                            </Text>
                            <Flex gap={8} wrap="wrap">
                                <Button
                                    size="small"
                                    icon={<LuCopy size={14} />}
                                    onClick={() => {
                                        const summary = [
                                            'MenuList POS Sync — Setup Info',
                                            '',
                                            'Payload: Full menu snapshot (JSON)',
                                            'Security: HMAC-SHA256 signed (header: X-MenuList-Signature)',
                                            'Headers: X-MenuList-Signature, X-MenuList-Event, X-MenuList-Version, X-MenuList-Timestamp, X-MenuList-Delivery-Id',
                                            'Response: HTTP 200 within 5 seconds',
                                            '',
                                            'Documentation: https://menulist.ai/pos-sync',
                                        ].join('\n');
                                        handleCopy(summary, 'POS sync details');
                                    }}
                                >
                                    Copy Setup Info for POS Provider
                                </Button>
                                <Button size="small" href="/business-settings">
                                    POS Settings
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
                        name: project.name || 'Untitled',
                        isDefault: project.isDefault,
                        active: project.active,
                        secondaryLabel: project.url.replace(/^https?:\/\//, ''),
                    }))}
                />
            </Modal>
        </div>
    );
}

// ── Reusable Sub-Components ──────────────────────────────────────

interface LinkCardProps {
    title: string;
    description: string;
    url: string;
    shortUrl: string;
    storeName: string;
    sharePrefix: string;
    onCopy: () => void;
    onOpen: () => void;
    onGuide?: () => void;
    themeToken: any;
}

function LinkCard({ title, description, url, shortUrl, storeName, sharePrefix, onCopy, onOpen, onGuide, themeToken }: LinkCardProps) {
    const withSrc = (src: 'copy' | 'whatsapp' | 'qr') =>
        url ? `${url}${url.includes('?') ? '&' : '?'}src=${src}` : url;

    const handleWhatsApp = () => {
        const msg = `${sharePrefix}\n${withSrc('whatsapp')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleCopyMessage = async () => {
        const msg = `${sharePrefix}\n${withSrc('copy')}`;
        try {
            await navigator.clipboard.writeText(msg);
            message.success('Message copied — paste it in WhatsApp or anywhere');
        } catch {
            message.error('Could not copy message');
        }
    };

    return (
        <Card size="small" styles={{ body: { padding: 16 } }} style={{ height: '100%' }}>
            <Flex vertical gap={10}>
                <Text strong>{title}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{description}</Text>
                <Card
                    size="small"
                    styles={{ body: { padding: '6px 10px' } }}
                    style={{
                        backgroundColor: themeToken.colorFillAlter,
                        borderColor: themeToken.colorBorderSecondary,
                    }}
                >
                    <Text
                        style={{
                            fontSize: 11,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                        }}
                    >
                        {shortUrl}
                    </Text>
                </Card>
                <Flex gap={6} align="center" wrap="wrap">
                    <Button size="small" type="primary" icon={<LuClipboard size={14} />} onClick={onCopy}>
                        Copy Link
                    </Button>
                    <Button
                        size="small"
                        icon={<FaWhatsapp size={14} />}
                        onClick={handleWhatsApp}
                        style={{ color: '#25D366', borderColor: '#25D366' }}
                    >
                        WhatsApp
                    </Button>
                    <Button size="small" icon={<LuCopy size={14} />} onClick={handleCopyMessage}>
                        Copy Message
                    </Button>
                    <Button size="small" type="text" icon={<LuExternalLink size={14} />} onClick={onOpen}>
                        Open
                    </Button>
                </Flex>
                {onGuide && (
                    <Button size="small" type="link" style={{ fontSize: 12, padding: 0, height: 'auto' }} onClick={onGuide}>
                        Where should I share this?
                    </Button>
                )}
            </Flex>
        </Card>
    );
}

interface AssetCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    loading: boolean;
    onDownload: () => void;
    disabled?: boolean;
    highlight?: boolean;
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

function AssetCard({ icon, title, description, loading, onDownload, disabled, highlight, themeToken }: AssetCardProps) {
    return (
        <Card
            size="small"
            styles={{ body: { padding: 14 } }}
            style={{
                height: '100%',
                borderColor: highlight ? themeToken.colorPrimary : undefined,
                borderWidth: highlight ? 2 : 1,
            }}
        >
            <Flex vertical gap={8} align="center" style={{ textAlign: 'center' }}>
                <div style={{ color: themeToken.colorPrimary }}>{icon}</div>
                <Text strong style={{ fontSize: 13 }}>{title}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{description}</Text>
                <Button
                    size="small"
                    icon={<LuDownload size={14} />}
                    onClick={onDownload}
                    loading={loading}
                    disabled={disabled}
                    block
                >
                    {loading ? 'Generating...' : 'Download'}
                </Button>
            </Flex>
        </Card>
    );
}
