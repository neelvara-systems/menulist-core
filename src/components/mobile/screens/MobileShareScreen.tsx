'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getScreenState } from '@database/campaigns';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildScreenUrl } from '@lib/screen/utils';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { buildQrCodeFilename } from '@lib/utils/qrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    LuBookOpen,
    LuCopy,
    LuExternalLink,
    LuLink2,
    LuMessageSquare,
    LuMonitor,
    LuQrCode,
    LuShare2,
    LuShield,
    LuSmartphone,
} from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, Tag, Text, Title, Toast } from '../antd';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

type ProjectLink = {
    active?: boolean;
    deleted?: boolean;
    feedbackUrl: string;
    isDefault: boolean;
    isSpecialMenu?: boolean;
    name: string;
    projectId: string;
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
    hasScreen: boolean;
    installAppLink: string | null;
    highlightsLink: string | null;
    menuBoardLink: string | null;
    menuLink: string;
    obpLink: string;
    posSyncStatus: string | null;
    projectId: string | null;
    projectName: string | null;
    storeName: string;
};

type QrSheetState = {
    filename: string;
    helperText: string;
    title: string;
    url: string;
};

type StatusTone = 'success' | 'warning' | 'default';

export default function MobileShareScreen() {
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const t = useTranslations('MobileShare');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const labels = useOfferingLabels();
    const { isLoading: loadingProjects, projectsList, selectedProjectId, selectProject } = useMobileProjects();
    const [data, setData] = useState<ShareData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [qrSheet, setQrSheet] = useState<QrSheetState | null>(null);
    const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
    const [supportsNativeShare, setSupportsNativeShare] = useState(false);

    const loadData = useCallback(async () => {
        if (!storeDetails) return;

        setIsLoading(true);
        try {
            const projects = projectsList;
            const defaultProject = projects.find((project: any) => project.projectId === selectedProjectId) || null;

            if (!defaultProject) {
                setData(null);
                return;
            }

            const subdomain = storeDetails.subdomain || '';
            const customDomain = storeDetails.customDomain;
            const obpLink = generateOBPUrl(subdomain, customDomain);
            const installAppLink =
                FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                && (storeDetails as any).pwaSettings?.enableInstallableApp !== false
                    ? `${obpLink.replace(/\/$/, '')}/?pwa=install`
                    : null;
            const menuLink = generateProjectUrl(
                subdomain,
                customDomain,
                defaultProject.name,
                false
            );

            let menuBoardLink: string | null = null;
            let highlightsLink: string | null = null;
            try {
                const screenState = await getScreenState();
                if (screenState?.screenToken) {
                    menuBoardLink = buildScreenUrl(screenState.screenToken, obpLink);
                    highlightsLink = `${menuBoardLink}?mode=highlights`;
                }
            } catch {
                menuBoardLink = null;
                highlightsLink = null;
            }

            const allProjects: ProjectLink[] = projects.map((project: any) => ({
                active: project.active !== false,
                deleted: project.deleted === true,
                feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId, 'direct_link', obpLink) : '',
                isDefault: project.isDefault || false,
                name: project.name || tProjectSelector('untitled'),
                projectId: project.projectId,
                url: generateProjectUrl(subdomain, customDomain, project.name, false),
            }));

            const posSync = storeDetails.posSync;
            const hasPosSync = FEATURE_FLAGS.ENABLE_POS_SYNC && !!posSync?.enabled;

            setData({
                allProjects,
                businessType: storeDetails.businessType || '',
                feedbackLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'direct_link', obpLink) : '',
                feedbackQrLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId, 'feedback_qr', obpLink) : '',
                hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
                hasPosSync,
                hasPublishedMenu: !!obpLink,
                hasScreen: !!menuBoardLink,
                installAppLink,
                highlightsLink,
                menuBoardLink,
                menuLink,
                obpLink,
                posSyncStatus: hasPosSync ? (posSync?.status || 'disabled') : null,
                projectId: defaultProject.projectId || null,
                projectName: defaultProject.name || null,
                storeName: storeDetails.name || t('yourBusiness'),
            });
        } finally {
            setIsLoading(false);
        }
    }, [projectsList, selectedProjectId, storeDetails, t, tProjectSelector]);

    useEffect(() => {
        if (!storeDetails || loadingProjects) return;
        void loadData();
    }, [loadData, loadingProjects, storeDetails]);

    useEffect(() => {
        setSupportsNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }, []);

    const activeProject = useMemo(
        () => data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null,
        [data]
    );

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr' | 'share') =>
        url ? `${url}${url.includes('?') ? '&' : '?'}src=${src}` : url;

    const handleCopy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            Toast.show({ content: t('copiedLabel', { label }), duration: 1200 });
        } catch {
            Toast.show({ content: t('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    };

    const handleOpenQr = (qrConfig: QrSheetState) => {
        setQrSheet(qrConfig);
        setIsQrSheetOpen(true);
    };

    const handleNativeShare = async ({ label, text, url }: { label: string; text?: string; url: string }) => {
        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;

        try {
            await navigator.share({
                text,
                title: label,
                url,
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            Toast.show({ content: t('couldNotCopy'), duration: 1500 });
        }
    };

    if (isLoading || loadingProjects) {
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

    return (
        <Flex gap={18} style={{ padding: 16 }} vertical>
            {activeProject ? (
                <ProjectSelectorTrigger
                    clickable={data.allProjects.length > 1}
                    currentProject={{
                        active: activeProject.active !== false,
                        deleted: activeProject.deleted === true,
                        id: activeProject.projectId,
                        isDefault: activeProject.isDefault,
                        isSpecialMenu: activeProject.isSpecialMenu === true,
                        name: activeProject.name || tProjectSelector('untitled'),
                        specialMenuEndsAt: activeProject.specialMenuEndsAt,
                        specialMenuStatus: activeProject.specialMenuStatus,
                    }}
                    onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />
            ) : null}

            <LinkCard
                description={t('offeringPageDesc', { offering: labels.offeringLower })}
                icon={<LuExternalLink color={token.colorText} size={18} />}
                isPrimary
                label={t('officialBusinessLink')}
                onCopy={() => void handleCopy(withSource(data.obpLink, 'copy'), t('officialBusinessLink'))}
                onOpen={() => window.open(withSource(data.obpLink, 'direct'), '_blank')}
                onShare={supportsNativeShare ? () => void handleNativeShare({
                    label: t('officialBusinessLink'),
                    text: t('offeringPageDesc', { offering: labels.offeringLower }),
                    url: withSource(data.obpLink, 'share'),
                }) : undefined}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-official-page`, 'qr'),
                    helperText: t('offeringPageDesc', { offering: labels.offeringLower }),
                    title: t('officialBusinessLink'),
                    url: withSource(data.obpLink, 'qr'),
                })}
                showQrLabel={t('showQr')}
                value={data.obpLink}
            />

            <SectionHeader
                subtitle={t('shareYourOfferingDesc', { offering: labels.offeringTitle })}
                title={t('directOfferingLink', { offering: labels.offeringTitle })}
            />

            <LinkCard
                description={t('directOfferingLinkDesc', { offering: labels.offeringLower })}
                icon={<LuLink2 color={token.colorText} size={18} />}
                label={t('directOfferingLink', { offering: labels.offeringTitle })}
                onCopy={() => void handleCopy(withSource(data.menuLink, 'copy'), t('directOfferingLinkCopyLabel', { offering: labels.offeringLower }))}
                onOpen={() => window.open(withSource(data.menuLink, 'direct'), '_blank')}
                onShare={supportsNativeShare ? () => void handleNativeShare({
                    label: t('directOfferingLink', { offering: labels.offeringTitle }),
                    text: t('directOfferingLinkDesc', { offering: labels.offeringLower }),
                    url: withSource(data.menuLink, 'share'),
                }) : undefined}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-${labels.offeringLower}-direct-link`, 'qr'),
                    helperText: t('directOfferingLinkDesc', { offering: labels.offeringLower }),
                    title: t('directOfferingLink', { offering: labels.offeringTitle }),
                    url: withSource(data.menuLink, 'qr'),
                })}
                showQrLabel={t('showQr')}
                value={data.menuLink}
            />

            {data.installAppLink ? (
                <LinkCard
                    description="Share this when you want customers to install your menu app directly. It opens the install prompt right away."
                    icon={<LuSmartphone color={token.colorText} size={18} />}
                    label="Customer App install link"
                    onCopy={() => void handleCopy(withSource(data.installAppLink as string, 'copy'), 'Customer App install link')}
                    onOpen={() => window.open(withSource(data.installAppLink as string, 'direct'), '_blank')}
                    onShare={supportsNativeShare ? () => void handleNativeShare({
                        label: 'Customer App install link',
                        text: 'Share this when you want customers to install your menu app directly.',
                        url: withSource(data.installAppLink as string, 'share'),
                    }) : undefined}
                    onShowQr={() => handleOpenQr({
                        filename: buildQrCodeFilename(`${data.storeName}-customer-app-install`, 'qr'),
                        helperText: 'Customers can scan this QR to install your menu app.',
                        title: 'Customer App install link',
                        url: withSource(data.installAppLink as string, 'qr'),
                    })}
                    showQrLabel={t('showQr')}
                    value={data.installAppLink}
                />
            ) : null}

            {data.hasFeedbackEnabled && data.feedbackLink ? (
                <LinkCard
                    description={t('feedbackLinkDesc')}
                    icon={<LuMessageSquare color={token.colorText} size={18} />}
                    label={t('feedbackLink')}
                    onCopy={() => void handleCopy(data.feedbackLink, t('feedbackLink'))}
                    onOpen={() => window.open(data.feedbackLink, '_blank')}
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
                    showQrLabel={t('showQr')}
                    value={data.feedbackLink}
                />
            ) : null}

            <Flex gap={12} vertical>
                <SectionHeader subtitle={t('screensReadyHelp')} title={t('digitalScreens')} />
                <ScreenCard
                    description={t('menuBoardDesc', { offering: labels.offeringLower })}
                    icon={<LuMonitor color={token.colorText} size={18} />}
                    label={t('menuBoard')}
                    onCopy={data.menuBoardLink ? () => void handleCopy(data.menuBoardLink as string, t('menuBoardLink')) : undefined}
                    onOpen={data.menuBoardLink ? () => window.open(data.menuBoardLink as string, '_blank') : undefined}
                    onShare={supportsNativeShare && data.menuBoardLink ? () => void handleNativeShare({
                        label: t('menuBoard'),
                        text: t('menuBoardDesc', { offering: labels.offeringLower }),
                        url: data.menuBoardLink as string,
                    }) : undefined}
                    pendingLabel={t('notSetUpYet')}
                    statusColor={data.menuBoardLink ? 'success' : 'default'}
                    statusLabel={data.menuBoardLink ? t('ready') : t('notSetUp')}
                    value={data.menuBoardLink}
                />
                <ScreenCard
                    description={t('highlightsScreenDesc')}
                    icon={<LuQrCode color={token.colorText} size={18} />}
                    label={t('highlightsScreen')}
                    onCopy={data.highlightsLink ? () => void handleCopy(data.highlightsLink as string, t('highlightsLink')) : undefined}
                    onOpen={data.highlightsLink ? () => window.open(data.highlightsLink as string, '_blank') : undefined}
                    onShare={supportsNativeShare && data.highlightsLink ? () => void handleNativeShare({
                        label: t('highlightsScreen'),
                        text: t('highlightsScreenDesc'),
                        url: data.highlightsLink as string,
                    }) : undefined}
                    pendingLabel={t('notSetUpYet')}
                    statusColor={data.highlightsLink ? 'success' : 'default'}
                    statusLabel={data.highlightsLink ? t('ready') : t('notSetUp')}
                    value={data.highlightsLink}
                />
            </Flex>

            {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT ? (
                <Flex gap={12} style={{ marginTop: 6 }} vertical>
                    <MobileCommunicationKit
                        address={buildStoreAddress(storeDetails)}
                        businessType={data.businessType}
                        menuLink={data.menuLink}
                        phone={storeDetails?.phoneNumber || undefined}
                        storeName={data.storeName}
                        timeZone={storeDetails?.timeZone}
                        workingHours={storeDetails?.workingHours}
                    />
                </Flex>
            ) : null}

            {data.hasPosSync ? (
                <Card style={{ borderRadius: 24 }}>
                    <Flex gap={8} vertical>
                        <SectionHeader subtitle={t('posSyncDesc', { offering: labels.offeringLower })} title={t('posSync')} />
                        <Flex align="center" gap={8}>
                            <LuShield color={token.colorTextSecondary} size={18} />
                            <Text strong>{t('posIntegration')}</Text>
                            <Tag color={data.posSyncStatus === 'healthy' ? 'success' : data.posSyncStatus === 'connection_issue' ? 'warning' : 'default'}>
                                {data.posSyncStatus || t('active')}
                            </Tag>
                        </Flex>
                    </Flex>
                </Card>
            ) : null}

            <MobileProjectSelectorSheet
                currentProjectId={data.projectId}
                currentProjectName={activeProject?.name || data.projectName}
                onClose={() => setIsProjectSelectorOpen(false)}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />

            <MobileQrCodeSheet
                copyErrorMessage={t('couldNotCopy')}
                copySuccessMessage={t('linkCopied')}
                downloadSuccessMessage={t('qrDownloaded')}
                filename={qrSheet?.filename || buildQrCodeFilename(data.storeName || 'menu', 'qr')}
                generatingLabel={t('generatingQr')}
                helperText={qrSheet?.helperText}
                imageAlt={qrSheet?.title || t('showQr')}
                onClose={() => setIsQrSheetOpen(false)}
                qrErrorMessage={t('qrFailed')}
                title={qrSheet?.title || t('showQr')}
                url={qrSheet?.url || ''}
                visible={isQrSheetOpen}
            />
        </Flex>
    );
}

function LinkCard({
    description,
    icon,
    isPrimary,
    label,
    onCopy,
    onOpen,
    onShare,
    onShowQr,
    showQrLabel,
    value,
}: {
    description: string;
    icon: React.ReactNode;
    isPrimary?: boolean;
    label: string;
    onCopy: () => void;
    onOpen: () => void;
    onShare?: () => void;
    onShowQr: () => void;
    showQrLabel: string;
    value: string;
}) {
    const { token } = theme.useToken();

    return (
        <Card style={{ borderRadius: 24 }}>
            <Flex gap={14} vertical>
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                        <IconBadge tint={token.colorFillAlter}>
                            {icon}
                        </IconBadge>
                        <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                            <Text strong style={{ color: token.colorText, fontSize: isPrimary ? 15 : 14 }}>
                                {label}
                            </Text>
                            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{description}</Text>
                        </Flex>
                    </Flex>
                </Flex>

                <Card
                    size="small"
                    style={{
                        backgroundColor: token.colorFillAlter,
                        borderColor: token.colorBorderSecondary,
                        borderRadius: 16,
                    }}
                >
                    <Text style={{ color: token.colorText, fontSize: 12, wordBreak: 'break-all' }}>
                        {value}
                    </Text>
                </Card>

                <Flex gap={10}>
                    <ActionTile icon={<LuCopy size={18} />} onClick={onCopy} />
                    {onShare ? <ActionTile icon={<LuShare2 size={18} />} onClick={onShare} /> : null}
                    <ActionTile icon={<LuQrCode size={18} />} onClick={onShowQr} />
                    <ActionTile icon={<LuExternalLink size={18} />} onClick={onOpen} />
                </Flex>
            </Flex>
        </Card>
    );
}

function ScreenCard({
    description,
    icon,
    label,
    onCopy,
    onOpen,
    onShare,
    pendingLabel,
    statusColor,
    statusLabel,
    value,
}: {
    description: string;
    icon: React.ReactNode;
    label: string;
    onCopy?: () => void;
    onOpen?: () => void;
    onShare?: () => void;
    pendingLabel: string;
    statusColor: StatusTone;
    statusLabel: string;
    value: string | null;
}) {
    const { token } = theme.useToken();

    if (!value) {
        return (
            <Card size="small" style={{ borderRadius: 20 }}>
                <Flex align="center" gap={12}>
                    <IconBadge tint={token.colorFillAlter}>{icon}</IconBadge>
                    <Flex gap={4} style={{ flex: 1, minWidth: 0 }} vertical>
                        <Flex align="center" gap={8} wrap="wrap">
                            <Text strong style={{ fontSize: 14 }}>{label}</Text>
                            <Tag color={statusColor}>{statusLabel}</Tag>
                        </Flex>
                        <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{pendingLabel}</Text>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="small" style={{ borderRadius: 20 }}>
            <Flex gap={14} vertical>
                <Flex align="center" gap={12} justify="space-between">
                    <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
                        <IconBadge tint={token.colorFillAlter}>{icon}</IconBadge>
                        <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                            <Flex align="center" gap={8} wrap="wrap">
                                <Text strong style={{ fontSize: 14 }}>{label}</Text>
                                <Tag color={statusColor}>{statusLabel}</Tag>
                            </Flex>
                            <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{description}</Text>
                            <Text style={{ color: token.colorTextSecondary, fontSize: 12, wordBreak: 'break-all' }}>{value}</Text>
                        </Flex>
                    </Flex>
                </Flex>

                <Flex gap={10}>
                    {onCopy ? <ActionTile icon={<LuCopy size={18} />} onClick={onCopy} /> : null}
                    {onShare ? <ActionTile icon={<LuShare2 size={18} />} onClick={onShare} /> : null}
                    {onOpen ? <ActionTile icon={<LuExternalLink size={18} />} onClick={onOpen} /> : null}
                </Flex>
            </Flex>
        </Card>
    );
}

function ActionTile({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
    const { token } = theme.useToken();

    return (
        <Button
            fill="outline"
            onClick={onClick}
            size="small"
            style={{
                borderColor: token.colorBorderSecondary,
                borderRadius: 16,
                flex: 1,
                minHeight: 48,
                minWidth: 0,
                paddingBlock: 0,
                paddingInline: 0,
            }}
        >
            <Flex align="center" justify="center" style={{ color: token.colorText, minHeight: 20 }}>
                    {icon}
            </Flex>
        </Button>
    );
}

function IconBadge({ children, tint }: { children: React.ReactNode; tint: string }) {
    return (
        <Flex
            align="center"
            justify="center"
            style={{
                backgroundColor: tint,
                borderRadius: 16,
                height: 44,
                minWidth: 44,
                width: 44,
            }}
        >
            {children}
        </Flex>
    );
}

function SectionHeader({ subtitle, title }: { subtitle?: string; title: string }) {
    const { token } = theme.useToken();

    return (
        <Flex gap={4} vertical>
            <Text strong style={{ color: token.colorText, fontSize: 15 }}>
                {title}
            </Text>
            {subtitle ? <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>{subtitle}</Text> : null}
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
