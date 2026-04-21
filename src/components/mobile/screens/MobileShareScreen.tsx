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
import { LuBookOpen, LuCopy, LuExternalLink, LuMessageSquare, LuMonitor, LuQrCode, LuShield, LuSmartphone } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, Tag, Text, Title, Toast } from '../antd';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileQrCodeSheet from '../components/MobileQrCodeSheet';
import MobilePresenceMonitor from '../components/PresenceMonitor';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

type ProjectLink = {
    active?: boolean;
    deleted?: boolean;
    feedbackUrl: string;
    isDefault: boolean;
    name: string;
    projectId: string;
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
                FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA &&
                    (storeDetails as any).pwaSettings?.enableInstallableApp !== false
                    ? `${obpLink.replace(/\/$/, '')}/?pwa=install`
                    : null;
            // R5 link-emitter audit: always emit the real canonical slug URL
            // (e.g., /food-menu), never the /menu alias. Pass project name
            // regardless of isDefault — under R5 every project's canonical URL
            // is its real slug.
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

            const allProjects: ProjectLink[] = projects.map((project: any) => {
                return {
                    active: project.active !== false,
                    deleted: project.deleted === true,
                    feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId, 'direct_link', obpLink) : "",
                    isDefault: project.isDefault || false,
                    name: project.name || tProjectSelector('untitled'),
                    projectId: project.projectId,
                    // R5: always real canonical slug URL — no /menu alias.
                    url: generateProjectUrl(subdomain, customDomain, project.name, false),
                };
            });

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

    const activeProject = useMemo(
        () => data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null,
        [data]
    );
    const domainSummary = storeDetails?.customDomain
        ? {
            color: (storeDetails as any).domainVerified ? 'success' : 'warning' as StatusTone,
            label: (storeDetails as any).domainVerified ? t('customDomainLive') : t('customDomainPending'),
            value: storeDetails.customDomain,
        }
        : {
            color: storeDetails?.subdomain ? 'success' : 'default' as StatusTone,
            label: storeDetails?.subdomain ? t('subdomainLive') : t('domainNotSet'),
            value: storeDetails?.subdomain ? generateOBPUrl(storeDetails.subdomain, storeDetails.customDomain).replace(/^https?:\/\//, '') : t('domainNotSetHelp'),
        };

    const withSource = (url: string, src: 'copy' | 'direct' | 'qr') =>
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

    const feedbackSummary = data.hasFeedbackEnabled
        ? { color: 'success' as StatusTone, label: t('feedbackOn'), value: t('feedbackOnHelp') }
        : { color: 'default' as StatusTone, label: t('feedbackOff'), value: t('feedbackOffHelp') };
    const screenSummary = data.hasScreen
        ? { color: 'success' as StatusTone, label: t('screensReady'), value: t('screensReadyHelp') }
        : { color: 'default' as StatusTone, label: t('screensNotSetUp'), value: t('screensNotSetUpHelp') };

    return (
        <Flex gap={16} style={{ padding: 16 }} vertical>
            {activeProject ? (
                <ProjectSelectorTrigger
                    clickable={data.allProjects.length > 1}
                    currentProject={{
                        active: activeProject.active !== false,
                        deleted: activeProject.deleted === true,
                        id: activeProject.projectId,
                        isDefault: activeProject.isDefault,
                        name: activeProject.name || tProjectSelector('untitled'),
                    }}
                    onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />
            ) : null}

            <Card>
                <Flex gap={8} vertical>
                    <StatusSummaryRow color={domainSummary.color} label={domainSummary.label} value={domainSummary.value} />
                    <StatusSummaryRow color={feedbackSummary.color} label={feedbackSummary.label} value={feedbackSummary.value} />
                    <StatusSummaryRow color={screenSummary.color} label={screenSummary.label} value={screenSummary.value} />
                </Flex>
            </Card>

            <LinkCard
                description={t('offeringPageDesc', { offering: labels.offeringLower })}
                icon={<LuExternalLink color={token.colorPrimary} size={18} />}
                label={t('officialBusinessLink')}
                onCopy={() => void handleCopy(withSource(data.obpLink, 'copy'), t('officialBusinessLink'))}
                onOpen={() => window.open(withSource(data.obpLink, 'direct'), '_blank')}
                onShowQr={() => handleOpenQr({
                    filename: buildQrCodeFilename(`${data.storeName}-official-page`, 'qr'),
                    helperText: t('offeringPageDesc', { offering: labels.offeringLower }),
                    title: t('officialBusinessLink'),
                    url: withSource(data.obpLink, 'qr'),
                })}
                showQrLabel={t('showQr')}
                value={data.obpLink}
            />

            <LinkCard
                description={t('directOfferingLinkDesc', { offering: labels.offeringLower })}
                icon={<LuCopy color={token.colorSuccess} size={18} />}
                label={t('directOfferingLink', { offering: labels.offeringTitle })}
                onCopy={() => void handleCopy(withSource(data.menuLink, 'copy'), t('directOfferingLinkCopyLabel', { offering: labels.offeringLower }))}
                onOpen={() => window.open(withSource(data.menuLink, 'direct'), '_blank')}
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
                    icon={<LuSmartphone color={token.colorPrimary} size={18} />}
                    label="Customer App install link"
                    onCopy={() => void handleCopy(withSource(data.installAppLink as string, 'copy'), 'Customer App install link')}
                    onOpen={() => window.open(withSource(data.installAppLink as string, 'direct'), '_blank')}
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
                    icon={<LuMessageSquare color={token.colorSuccess} size={18} />}
                    label={t('feedbackLink')}
                    onCopy={() => void handleCopy(data.feedbackLink, t('feedbackLink'))}
                    onOpen={() => window.open(data.feedbackLink, '_blank')}
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

            {FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR && storeDetails ? (
                <MobilePresenceMonitor
                    hasFeedbackEnabled={data.hasFeedbackEnabled}
                    hasPublishedMenu={data.hasPublishedMenu}
                    hasScreen={data.hasScreen}
                    menuLink={data.menuLink}
                    storeDetails={storeDetails as any}
                />
            ) : null}

            <Card title={<Text strong>{t('digitalScreens')}</Text>}>
                <Flex gap={12} vertical>
                    <ScreenCard
                        description={t('menuBoardDesc', { offering: labels.offeringLower })}
                        icon={<LuMonitor color={token.colorPrimary} size={18} />}
                        label={t('menuBoard')}
                        onCopy={data.menuBoardLink ? () => void handleCopy(data.menuBoardLink as string, t('menuBoardLink')) : undefined}
                        onOpen={data.menuBoardLink ? () => window.open(data.menuBoardLink as string, '_blank') : undefined}
                        pendingLabel={t('notSetUpYet')}
                        statusColor={data.menuBoardLink ? 'success' : 'default'}
                        statusLabel={data.menuBoardLink ? t('ready') : t('notSetUp')}
                        value={data.menuBoardLink}
                    />
                    <ScreenCard
                        description={t('highlightsScreenDesc')}
                        icon={<LuQrCode color={token.colorInfo} size={18} />}
                        label={t('highlightsScreen')}
                        onCopy={data.highlightsLink ? () => void handleCopy(data.highlightsLink as string, t('highlightsLink')) : undefined}
                        onOpen={data.highlightsLink ? () => window.open(data.highlightsLink as string, '_blank') : undefined}
                        pendingLabel={t('notSetUpYet')}
                        statusColor={data.highlightsLink ? 'success' : 'default'}
                        statusLabel={data.highlightsLink ? t('ready') : t('notSetUp')}
                        value={data.highlightsLink}
                    />
                </Flex>
            </Card>

            {FEATURE_FLAGS.ENABLE_CUSTOMER_COMMUNICATION_KIT ? (
                <Card>
                    <MobileCommunicationKit
                        address={buildStoreAddress(storeDetails)}
                        businessType={data.businessType}
                        menuLink={data.menuLink}
                        phone={storeDetails?.phoneNumber || undefined}
                        storeName={data.storeName}
                        timeZone={storeDetails?.timeZone}
                        workingHours={storeDetails?.workingHours}
                    />
                </Card>
            ) : null}

            {data.hasPosSync ? (
                <Card title={<Text strong>{t('posSync')}</Text>}>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={8}>
                            <LuShield color={token.colorTextSecondary} size={18} />
                            <Text strong>{t('posIntegration')}</Text>
                            <Tag color={data.posSyncStatus === 'healthy' ? 'success' : data.posSyncStatus === 'connection_issue' ? 'warning' : 'default'}>
                                {data.posSyncStatus || t('active')}
                            </Tag>
                        </Flex>
                        <Text type="secondary">
                            {t('posSyncDesc', { offering: labels.offeringLower })}
                        </Text>
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
    label,
    onCopy,
    onOpen,
    onShowQr,
    showQrLabel,
    value,
}: {
    description: string;
    icon: React.ReactNode;
    label: string;
    onCopy: () => void;
    onOpen: () => void;
    onShowQr: () => void;
    showQrLabel: string;
    value: string;
}) {
    const common = useTranslations('Common');
    const { token } = theme.useToken();
    return (
        <Card>
            <Flex gap={10} vertical>
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8}>
                        {icon}
                        <Text strong>{label}</Text>
                    </Flex>
                    <Button fill="none" onClick={onOpen} size="small" style={{ minHeight: 32, minWidth: 32, paddingInline: 4 }}>
                        <LuExternalLink size={16} />
                    </Button>
                </Flex>
                <Text type="secondary">{description}</Text>
                <Card
                    size="small"
                    style={{
                        backgroundColor: token.colorFillAlter,
                        borderColor: token.colorBorderSecondary,
                    }}
                >
                    <Text style={{ wordBreak: 'break-all' }}>{value}</Text>
                </Card>
                <Flex gap={8}>
                    <Button block fill="outline" onClick={onCopy} size="small">
                        {common('copy')}
                    </Button>
                    <Button block onClick={onShowQr} size="small">
                        {showQrLabel}
                    </Button>
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
    pendingLabel: string;
    statusColor: StatusTone;
    statusLabel: string;
    value: string | null;
}) {
    const common = useTranslations('Common');
    if (!value) {
        return (
            <Card size="small">
                <Flex align="center" gap={10}>
                    {icon}
                    <Flex gap={2} vertical>
                        <Flex align="center" gap={8} wrap="wrap">
                            <Text strong>{label}</Text>
                            <Tag color={statusColor}>{statusLabel}</Tag>
                        </Flex>
                        <Text type="secondary">{pendingLabel}</Text>
                    </Flex>
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="small">
            <Flex gap={10} vertical>
                <Flex align="center" gap={8}>
                    {icon}
                    <Text strong>{label}</Text>
                    <Tag color={statusColor}>{statusLabel}</Tag>
                </Flex>
                <Text type="secondary">{description}</Text>
                <Text style={{ wordBreak: 'break-all' }}>{value}</Text>
                <Flex gap={8}>
                    <Button block fill="outline" onClick={onCopy} size="small">
                        {common('copy')}
                    </Button>
                    <Button block onClick={onOpen} size="small">
                        {common('open')}
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

function StatusSummaryRow({ color, label, value }: { color: StatusTone; label: string; value: string }) {
    return (
        <Flex align="center" justify="space-between" gap={12}>
            <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                <Tag color={color}>{label}</Tag>
            </Flex>
            <Text style={{ flex: 1, textAlign: 'right' }} type="secondary">
                {value}
            </Text>
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
