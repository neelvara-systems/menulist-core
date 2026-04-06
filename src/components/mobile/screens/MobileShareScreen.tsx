'use client'

import { FEATURE_FLAGS } from '@config/features';
import { getScreenState } from '@database/campaigns';
import { getProjectsList } from '@database/projects';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { buildScreenUrl } from '@lib/screen/utils';
import { getFeedbackUrl } from '@lib/utils/feedbackQrCode';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LuBookOpen, LuCopy, LuExternalLink, LuMessageSquare, LuMonitor, LuQrCode, LuShield } from 'react-icons/lu';
import MobileCommunicationKit from '../components/CommunicationKit';
import MobilePresenceMonitor from '../components/PresenceMonitor';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import { Button, Card, DotLoading, Flex, List, Tag, Text, Title, Toast } from '../antd';

type ProjectLink = {
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
    hasFeedbackEnabled: boolean;
    hasPosSync: boolean;
    hasPublishedMenu: boolean;
    hasScreen: boolean;
    highlightsLink: string | null;
    menuBoardLink: string | null;
    menuLink: string;
    obpLink: string;
    posSyncStatus: string | null;
    projectId: string | null;
    projectName: string | null;
    storeName: string;
};

export default function MobileShareScreen() {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const t = useTranslations('MobileShare');
    const common = useTranslations('Common');
    const tProjectSelector = useTranslations('MobileProjectSelector');
    const labels = useOfferingLabels();
    const [data, setData] = useState<ShareData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);

    const loadData = useCallback(async (preferredProjectId?: string | null) => {
        if (!storeDetails) return;

            setIsLoading(true);
            try {
                const result = await getProjectsList();
                const projects = result?.projects || [];
                const defaultProject = preferredProjectId
                    ? projects.find((project: any) => project.projectId === preferredProjectId)
                    : projects.find((project: any) => project.isDefault) || projects[0];

                if (!defaultProject) {
                    setData(null);
                    return;
                }

                const subdomain = storeDetails.subdomain || storeDetails.subDomain || '';
                const customDomain = storeDetails.customDomain;
                const obpLink = generateOBPUrl(subdomain, customDomain);
                const menuLink = generateProjectUrl(
                    subdomain,
                    customDomain,
                    defaultProject.isDefault ? undefined : defaultProject.name,
                    defaultProject.isDefault
                );

                let menuBoardLink: string | null = null;
                let highlightsLink: string | null = null;
                try {
                    const screenState = await getScreenState();
                    if (screenState?.screenToken) {
                        menuBoardLink = buildScreenUrl(screenState.screenToken);
                        highlightsLink = `${menuBoardLink}?mode=highlights`;
                    }
                } catch {
                    menuBoardLink = null;
                    highlightsLink = null;
                }

                const allProjects: ProjectLink[] = projects.map((project: any) => ({
                    feedbackUrl: project.projectId ? getFeedbackUrl(project.projectId) : '',
                    isDefault: project.isDefault || false,
                    name: project.name || tProjectSelector('untitled'),
                    projectId: project.projectId,
                    url: generateProjectUrl(subdomain, customDomain, project.isDefault ? undefined : project.name, project.isDefault),
                }));

                const posSync = storeDetails.posSync;
                const hasPosSync = FEATURE_FLAGS.ENABLE_POS_SYNC && !!posSync?.enabled;

                setData({
                    allProjects,
                    businessType: storeDetails.businessType || '',
                    feedbackLink: defaultProject.projectId ? getFeedbackUrl(defaultProject.projectId) : '',
                    hasFeedbackEnabled: storeDetails.feedbackEnabled !== false,
                    hasPosSync,
                    hasPublishedMenu: !!obpLink,
                    hasScreen: !!menuBoardLink,
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
    }, [storeDetails, t, tProjectSelector]);

    useEffect(() => {
        if (!storeDetails) return;
        void loadData();
    }, [loadData, storeDetails]);

    const activeProject = useMemo(
        () => data?.allProjects.find((project) => project.projectId === data.projectId) || data?.allProjects[0] || null,
        [data]
    );

    const handleCopy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            Toast.show({ content: t('copiedLabel', { label }), duration: 1200 });
        } catch {
            Toast.show({ content: t('copyFailedLabel', { label: label.toLowerCase() }), duration: 1500 });
        }
    };

    if (isLoading) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    if (!data) {
        return (
            <Flex align="center" gap={12} justify="center" style={{ minHeight: '100%', padding: 24 }} vertical>
                <LuBookOpen color="#d1d5db" size={36} />
                <Title level={4} style={{ margin: 0 }}>{t('noMenuYet')}</Title>
                <Text type="secondary" style={{ textAlign: 'center' }}>
                    {t('noMenuYetDesc', { offering: labels.offeringLower })}
                </Text>
            </Flex>
        );
    }

    return (
        <Flex gap={16} style={{ padding: 16 }} vertical>
            {activeProject ? (
                <ProjectSelectorTrigger
                    clickable={data.allProjects.length > 1}
                    currentProject={{
                        id: activeProject.projectId,
                        isDefault: activeProject.isDefault,
                        name: activeProject.name || tProjectSelector('untitled'),
                    }}
                    onClick={data.allProjects.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />
            ) : null}

            <LinkCard
                description={t('offeringPageDesc', { offering: labels.offeringLower })}
                icon={<LuExternalLink color="#2563eb" size={18} />}
                label={t('yourOfferingPage', { offering: labels.offeringTitle })}
                onCopy={() => void handleCopy(data.obpLink, t('offeringPageCopyLabel', { offering: labels.offeringTitle }))}
                onOpen={() => window.open(data.obpLink, '_blank')}
                value={data.obpLink}
            />

            <LinkCard
                description={t('directOfferingLinkDesc', { offering: labels.offeringLower })}
                icon={<LuCopy color="#16a34a" size={18} />}
                label={t('directOfferingLink', { offering: labels.offeringTitle })}
                onCopy={() => void handleCopy(data.menuLink, t('directOfferingLinkCopyLabel', { offering: labels.offeringLower }))}
                onOpen={() => window.open(data.menuLink, '_blank')}
                value={data.menuLink}
            />

            {data.hasFeedbackEnabled && data.feedbackLink ? (
                <LinkCard
                    description={t('feedbackLinkDesc')}
                    icon={<LuMessageSquare color="#16a34a" size={18} />}
                    label={t('feedbackLink')}
                    onCopy={() => void handleCopy(data.feedbackLink, t('feedbackLink'))}
                    onOpen={() => window.open(data.feedbackLink, '_blank')}
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
                        icon={<LuMonitor color="#2563eb" size={18} />}
                        label={t('menuBoard')}
                        onCopy={data.menuBoardLink ? () => void handleCopy(data.menuBoardLink as string, t('menuBoardLink')) : undefined}
                        onOpen={data.menuBoardLink ? () => window.open(data.menuBoardLink as string, '_blank') : undefined}
                        pendingLabel={t('notSetUpYet')}
                        value={data.menuBoardLink}
                    />
                    <ScreenCard
                        description={t('highlightsScreenDesc')}
                        icon={<LuQrCode color="#9333ea" size={18} />}
                        label={t('highlightsScreen')}
                        onCopy={data.highlightsLink ? () => void handleCopy(data.highlightsLink as string, t('highlightsLink')) : undefined}
                        onOpen={data.highlightsLink ? () => window.open(data.highlightsLink as string, '_blank') : undefined}
                        pendingLabel={t('notSetUpYet')}
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
                            <LuShield color="#475569" size={18} />
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
                    await loadData(preferredProjectId);
                }}
                visible={isProjectSelectorOpen}
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
    value,
}: {
    description: string;
    icon: React.ReactNode;
    label: string;
    onCopy: () => void;
    onOpen: () => void;
    value: string;
}) {
    const common = useTranslations('Common');
    return (
        <Card>
            <Flex gap={10} vertical>
                <Flex align="center" gap={8}>
                    {icon}
                    <Text strong>{label}</Text>
                </Flex>
                <Text type="secondary">{description}</Text>
                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                    <Text style={{ wordBreak: 'break-all' }}>{value}</Text>
                </Card>
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

function ScreenCard({
    description,
    icon,
    label,
    onCopy,
    onOpen,
    pendingLabel,
    value,
}: {
    description: string;
    icon: React.ReactNode;
    label: string;
    onCopy?: () => void;
    onOpen?: () => void;
    pendingLabel: string;
    value: string | null;
}) {
    const common = useTranslations('Common');
    if (!value) {
        return (
            <Card size="small">
                <Flex align="center" gap={10}>
                    {icon}
                    <Flex gap={2} vertical>
                        <Text strong>{label}</Text>
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
