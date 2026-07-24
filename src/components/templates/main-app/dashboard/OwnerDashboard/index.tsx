/**
 * Owner Dashboard v2
 * 
 * The main SMB owner-facing dashboard.
 * NOT analytics - this is CONFIRMATION for business owners.
 * 
 * Philosophy: "Answers, not data. Confidence, not insight."
 * 
 * View Hierarchy:
 * - Today (default) - live confirmation with compact activity
 * - Overview / Graphs / settled periods - owner-requested detail
 * - Overall (footer) - lifetime anchor
 *
 * Current shape:
 * - The first screen starts with the official customer source.
 * - Historical reads stay lazy until a settled tab is selected.
 * - Project selector supports multi-catalog stores.
 */

import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { FEATURE_FLAGS } from '@config/features';
import { getProjectData } from '@database/projects';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import { getStoredOwnerProjectId, setStoredOwnerProjectId } from '@lib/projects/projectSelection';
import { buildOwnerActionLayer, type OwnerActionId } from '@lib/ownerActions/buildOwnerActionLayer';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    getProjectPageProjectLogContext,
    getProjectPageStoreLogContext,
    logProjectPageFailure,
} from '@template/main-app/projects/utils/projectPageDiagnostics';
import { Alert, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { LuCalendarClock, LuClock, LuEye, LuImage, LuLink, LuListChecks, LuMessageCircle, LuQrCode, LuSearch, LuShieldCheck, LuStore, LuUtensils } from 'react-icons/lu';

import DailyView from './DailyView';
import { DashboardProjectSelector } from './DashboardProjectSelector';
import LoadingState from './LoadingState';
import MenuAnalyticsDetailsCard from './MenuAnalyticsDetailsCard';
import MenuQualitySignals from '../MenuQualitySignals';
import MenuSetupProgress from '../MenuSetupProgress';
import MonthlyView from './MonthlyView';
import OwnerDashboardGraphMode from './OwnerDashboardGraphMode';
import OverallFooter from './OverallFooter';
import OverviewView from './OverviewView';
import TodaySoFarCard from './TodaySoFarCard';
import ViewModeTabs from './ViewModeTabs';
import WeeklyView from './WeeklyView';

import CustomerAppMetrics from '../AnalyticsDashboard/CustomerAppMetrics';
import OBPMetricsCard from './OBPMetricsCard';
import { BusinessHealthAnalyticsStrip } from '../../ownerBusinessAssistant/BusinessHealthAnalyticsStrip';
import { BusinessHealthDashboardCard } from '../../ownerBusinessAssistant/BusinessHealthDashboardCard';
import styles from './OwnerDashboard.module.scss';
import useSWR from 'swr';

const { Text, Title } = Typography;

const renderOwnerActionIcon = (id: OwnerActionId) => {
    if (id === 'set_hours' || id === 'set_today_status') return <LuCalendarClock size={15} />;
    if (id === 'set_customer_link' || id === 'place_customer_link') return <LuLink size={15} />;
    if (id === 'open_private_feedback') return <LuMessageCircle size={15} />;
    if (id === 'prepare_staff_handoff') return <LuQrCode size={15} />;
    if (id === 'capture_daily_change' || id === 'update_prices') return <LuListChecks size={15} />;
    return <LuUtensils size={15} />;
};

const formatRelativeUpdatedLabel = (value: unknown): string => {
    if (!value) return 'Not updated yet';
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return 'Recently updated';
    const days = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86400000));
    if (days === 0) return 'Updated today';
    if (days === 1) return 'Updated yesterday';
    return `Updated ${days} days ago`;
};

const OwnerDashboard: React.FC = () => {
    const t = useTranslations('Dashboard.owner');
    const router = useRouter();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Derive a fallback projectId from storeDetails immediately (no SWR wait needed)
    const fallbackProjectId = storeDetails?.storeId
        ? `${storeDetails.tenantId}-default-${storeDetails.storeId}`
        : null;

    // Project selection state — seed with fallback so dashboard can start fetching immediately
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
        return getStoredOwnerProjectId(storeDetails?.storeId, storeDetails?.tenantId);
    });
    const [showHistorical, setShowHistorical] = useState(false);

    // Use selector-chosen project if available, otherwise fall back to derived default
    const activeProjectId = selectedProjectId || fallbackProjectId;
    const canShowBusinessHealthDashboardCard = Boolean(
        FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
        && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD
        && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_PAGE
    );
    const { current: businessHealthCurrent, isLoading: isBusinessHealthLoading } = useOwnerBusinessHealthCurrent(
        undefined,
        storeDetails?.storeId,
        { enabled: canShowBusinessHealthDashboardCard },
    );
    const isBusinessHealthReady = Boolean(
        businessHealthCurrent
        && businessHealthCurrent.status !== 'not_ready'
        && businessHealthCurrent.sourceRefs?.length,
    );

    const handleProjectChange = useCallback((projectId: string, _projectName: string) => {
        setSelectedProjectId(projectId);
        setStoredOwnerProjectId(projectId, storeDetails?.storeId, storeDetails?.tenantId);
    }, [storeDetails?.storeId, storeDetails?.tenantId]);

    const handleProjectSelectorReady = useCallback(() => {
        // no-op — we no longer block on selector ready
    }, []);

    useEffect(() => {
        setSelectedProjectId(getStoredOwnerProjectId(storeDetails?.storeId, storeDetails?.tenantId));
    }, [storeDetails?.storeId, storeDetails?.tenantId]);

    useEffect(() => {
        if (selectedProjectId) {
            setStoredOwnerProjectId(selectedProjectId, storeDetails?.storeId, storeDetails?.tenantId);
        }
    }, [selectedProjectId, storeDetails?.storeId, storeDetails?.tenantId]);

    const {
        data,
        loading,
        error,
        viewMode,
        setViewMode,
        loadingToday,
        loadingDaily,
        loadingWeekly,
        loadingMonthly,
    } = useOwnerDashboard({
        projectId: activeProjectId || undefined,
        loadHistorical: showHistorical,
    });
    const obpDashboard = useOBPDashboard({ loadHistorical: showHistorical });
    const shouldLoadDashboardProject = Boolean(
        activeProjectId
        && (FEATURE_FLAGS.ENABLE_MENU_SETUP_PROGRESS || FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS)
    );
    const {
        data: dashboardProjectData,
        isLoading: dashboardProjectLoading,
    } = useSWR(
        shouldLoadDashboardProject ? ['ownerDashboardProjectSetup', activeProjectId] : null,
        async () => {
            try {
                return await getProjectData(activeProjectId as string);
            } catch (error) {
                logProjectPageFailure('owner_dashboard_project_setup_load_failed', error, {
                    surface: 'owner_dashboard_menu_setup_progress',
                    ...getProjectPageProjectLogContext(activeProjectId),
                    ...getProjectPageStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                });
                return null;
            }
        },
        { dedupingInterval: 600000, revalidateOnFocus: false }
    );
    const dashboardProjectForChildren = dashboardProjectLoading
        ? null
        : dashboardProjectData === undefined
        ? undefined
        : dashboardProjectData || null;
    const hasPublicLink = Boolean(storeDetails?.customDomain || storeDetails?.subdomain);
    const hasWorkingHours = Boolean(storeDetails?.workingHours && Object.values(storeDetails.workingHours as Record<string, unknown>).some(Boolean));
    const confirmedPlacementCount = ['googleBusiness', 'instagramBio', 'whatsappProfile']
        .filter((surface) => Boolean((storeDetails as any)?.menuPresence?.[surface])).length;
    const feedbackReady = Boolean(storeDetails) && storeDetails.feedbackEnabled !== false;
    const hasConfirmedPlacement = confirmedPlacementCount > 0;
    const menuUpdatedLabel = formatRelativeUpdatedLabel(
        (dashboardProjectForChildren as any)?.modifiedOn
        || (dashboardProjectForChildren as any)?.updatedAt
        || data?.lastFetched
    );
    const dashboardAttentionItems = [
        activeProjectId || dashboardProjectLoading || dashboardProjectForChildren
            ? null
            : { key: 'menu', path: '/projects' },
        hasWorkingHours
            ? null
            : { key: 'hours', path: '/business-settings?section=hours&focus=working-hours' },
        hasPublicLink
            ? null
            : { key: 'public-listing', path: '/business-settings?section=search-discovery&focus=customer-link' },
    ].filter(Boolean) as Array<{ key: string; path: string }>;
    const needsAttentionCount = dashboardAttentionItems.length;
    const primaryAttentionPath = dashboardAttentionItems[0]?.path || '/projects';
    const publicSourceTitle = needsAttentionCount
        ? 'Needs attention'
        : hasConfirmedPlacement
            ? 'Official customer source is active'
            : 'Official customer source is ready to place';
    const publicSourceDescription = needsAttentionCount
        ? 'Fix menu, hours, or the customer link before sharing it widely.'
        : hasConfirmedPlacement
            ? 'No action needed. Customers can use your current public details from one source.'
            : 'Your customer link is ready. Add it to Google, Instagram, WhatsApp, QR, or print so customers use the current source.';
    const ownerActionLayer = FEATURE_FLAGS.ENABLE_OWNER_ACTION_LAYER && !dashboardProjectLoading
        ? buildOwnerActionLayer({
            project: dashboardProjectForChildren || null,
            storeDetails: storeDetails as any,
        })
        : null;
    const primaryStatusActionPath = needsAttentionCount ? primaryAttentionPath : '/projects?view=b2c';
    const primaryStatusActionLabel = needsAttentionCount ? 'Fix what needs attention' : 'Preview public menu';

    const hasMenuData = Boolean(data?.today || data?.overview || data?.daily30d?.length || data?.weekly || data?.daily || data?.monthly || data?.overall);
    const hasOBPSettledData = Boolean(obpDashboard.data?.overview || obpDashboard.data?.overall);
    const hasOBPData = Boolean(obpDashboard.data?.today || hasOBPSettledData);

    const handleViewModeChange = useCallback((mode: Parameters<typeof setViewMode>[0]) => {
        setShowHistorical(mode !== 'today');
        setViewMode(mode);
    }, [setViewMode]);

    // Show the full loader only before the live section has anything useful to render.
    // Settled analytics can load below the Today section after the owner requests it.
    if (!storeDetails?.storeId || (loading && !data?.today && !obpDashboard.data?.today && !showHistorical)) {
        return <LoadingState />;
    }

    if (error) {
        return (
            <Card className={styles.errorCard}>
                    <Alert
                        type="error"
                        message={t('unableToLoad')}
                        description={t('refreshOrContactSupport')}
                        showIcon
                    />
            </Card>
        );
    }

    if (!hasMenuData && !hasOBPData && (obpDashboard.loading || obpDashboard.loadingToday)) {
        return <LoadingState />;
    }

    const renderViewContent = () => {
        switch (viewMode) {
            case 'today':
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>{t('views.todaySoFar')}</Title>
                        <Flex gap={16} wrap="wrap">
                            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                                <TodaySoFarCard
                                    data={data?.today || null}
                                    loading={loadingToday}
                                    fetchedAt={data?.lastFetched}
                                    title={t('menu')}
                                />
                            </div>
                            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                                <OBPMetricsCard
                                    data={obpDashboard.data}
                                    loading={obpDashboard.loading}
                                    loadingToday={obpDashboard.loadingToday}
                                    mode="today"
                                />
                            </div>
                        </Flex>
                        <MenuAnalyticsDetailsCard data={data?.today || null} />
                    </Space>
                );
            case 'overview':
                if (loading && !data?.overview && !hasOBPSettledData) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>{t('views.overview')}</Title>
                        <Text type="secondary">{t('settledTabHelper')}</Text>
                        <OverviewView
                            data={data?.overview || null}
                            qualitySignalsSlot={(
                                <MenuQualitySignals
                                    projectData={dashboardProjectForChildren}
                                    projectId={activeProjectId}
                                    projectLoading={dashboardProjectLoading}
                                />
                            )}
                            projectId={activeProjectId}
                        />
                        <OBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="overview"
                        />
                        <CustomerAppMetrics />
                    </Space>
                );
            case 'graph':
                if (loading && !data?.daily30d?.length && !hasOBPSettledData) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>Graphs</Title>
                        <Text type="secondary">{t('settledTabHelper')}</Text>
                        <OwnerDashboardGraphMode
                            data={data}
                            obpData={obpDashboard.data}
                        />
                    </Space>
                );
            case 'daily':
                if (loadingDaily) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>{t('views.yesterday')}</Title>
                        <Text type="secondary">{t('settledTabHelper')}</Text>
                        <DailyView data={data?.daily || null} />
                        <OBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="daily"
                        />
                    </Space>
                );
            case 'weekly':
                if (loadingWeekly) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>{t('views.last7Days')}</Title>
                        <Text type="secondary">{t('settledTabHelper')}</Text>
                        <WeeklyView data={data?.weekly || null} />
                        <OBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="weekly"
                        />
                    </Space>
                );
            case 'monthly':
                if (loadingMonthly) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>{t('views.thisMonth')}</Title>
                        <Text type="secondary">{t('settledTabHelper')}</Text>
                        <MonthlyView data={data?.monthly || null} />
                        <OBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="monthly"
                        />
                    </Space>
                );
            case 'overall':
                if (loading && !data?.overall && !hasOBPSettledData) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>{t('views.overall')}</Title>
                        <Text type="secondary">{t('settledTabHelper')}</Text>
                        {data?.overall ? <OverallFooter data={data.overall} /> : null}
                        <MenuAnalyticsDetailsCard data={data?.overall || null} />
                        <OBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="overall"
                        />
                    </Space>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.ownerDashboard}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Flex align="center" gap={8}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{t('viewing')}</Text>
                    <DashboardProjectSelector
                        selectedProjectId={activeProjectId}
                        onProjectChange={handleProjectChange}
                        onReady={handleProjectSelectorReady}
                    />
                </Flex>

                <Card className={styles.truthStatusCard}>
                    <Flex align="flex-start" justify="space-between" gap={16} wrap="wrap">
                        <Flex gap={14} style={{ flex: '1 1 420px', minWidth: 0 }} vertical>
                            <Flex align="center" gap={10} wrap="wrap">
                                <LuShieldCheck size={22} color={needsAttentionCount ? 'var(--ant-color-warning)' : 'var(--ant-color-success)'} />
                                <Title level={3} style={{ margin: 0 }}>
                                    {publicSourceTitle}
                                </Title>
                                <Tag color={hasPublicLink ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                                    {hasPublicLink ? 'Customer link ready' : 'Customer link missing'}
                                </Tag>
                            </Flex>
                            <Text type="secondary" style={{ fontSize: 15 }}>
                                {publicSourceDescription}
                            </Text>
                            <Flex gap={8} wrap="wrap">
                                <Tag icon={<LuUtensils size={13} />} style={{ marginInlineEnd: 0 }}>
                                    Menu: {menuUpdatedLabel}
                                </Tag>
                                <Tag icon={<LuClock size={13} />} color={hasWorkingHours ? 'success' : 'warning'} style={{ marginInlineEnd: 0 }}>
                                    Hours: {hasWorkingHours ? 'Set' : 'Missing'}
                                </Tag>
                                <Tag icon={<LuStore size={13} />} color={hasPublicLink ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                                    Customer link: {hasPublicLink ? 'Ready' : 'Not ready'}
                                </Tag>
                                <Tag icon={<LuSearch size={13} />} color={hasConfirmedPlacement ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                                    Placed: {confirmedPlacementCount}/3
                                </Tag>
                                <Tag icon={<LuMessageCircle size={13} />} color={feedbackReady ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                                    Private feedback: {feedbackReady ? 'On' : 'Off'}
                                </Tag>
                            </Flex>
                        </Flex>
                        <Flex gap={8} wrap="wrap" style={{ flex: '0 1 390px' }}>
                            <Button
                                icon={needsAttentionCount ? <LuListChecks size={16} /> : <LuEye size={16} />}
                                onClick={() => router.push(primaryStatusActionPath)}
                                type="primary"
                            >
                                {primaryStatusActionLabel}
                            </Button>
                            <Button icon={<LuQrCode size={16} />} onClick={() => router.push('/use-menulist')}>
                                Share and QR
                            </Button>
                        </Flex>
                    </Flex>
                </Card>

                {ownerActionLayer ? (
                    <Card className={styles.quickActionsCard} size="small" title="Next owner action">
                        <Flex align="flex-start" justify="space-between" gap={12} wrap="wrap">
                            <Flex gap={6} style={{ flex: '1 1 360px', minWidth: 0 }} vertical>
                                <Flex align="center" gap={8} wrap="wrap">
                                    {renderOwnerActionIcon(ownerActionLayer.primaryAction.id)}
                                    <Text strong>{ownerActionLayer.primaryAction.label}</Text>
                                    <Tag color={ownerActionLayer.primaryAction.tone === 'attention' ? 'warning' : 'success'} style={{ marginInlineEnd: 0 }}>
                                        {ownerActionLayer.primaryAction.statusLabel}
                                    </Tag>
                                </Flex>
                                <Text type="secondary">{ownerActionLayer.primaryAction.description}</Text>
                                <Flex gap={8} wrap="wrap">
                                    <Tag color={ownerActionLayer.statusLabel === 'Stable' ? 'success' : 'warning'} style={{ marginInlineEnd: 0 }}>
                                        {ownerActionLayer.statusLabel}
                                    </Tag>
                                    <Tag color={ownerActionLayer.placement.confirmedCount > 0 ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                                        {ownerActionLayer.placement.latestConfirmedLabel}
                                    </Tag>
                                </Flex>
                            </Flex>
                            <Button
                                icon={renderOwnerActionIcon(ownerActionLayer.primaryAction.id)}
                                onClick={() => router.push(ownerActionLayer.primaryAction.desktopHref)}
                                type="primary"
                            >
                                Open
                            </Button>
                        </Flex>
                        <Flex gap={8} wrap="wrap" style={{ marginTop: 12 }}>
                            {ownerActionLayer.supportingActions.slice(0, 6).map((item) => (
                                <Button
                                    icon={renderOwnerActionIcon(item.id)}
                                    key={item.id}
                                    onClick={() => router.push(item.desktopHref)}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </Flex>
                    </Card>
                ) : null}

                <Card className={styles.quickActionsCard} size="small" title="Update what customers see">
                    <Flex gap={8} wrap="wrap">
                        <Button icon={<LuUtensils size={15} />} onClick={() => router.push('/projects')}>Update menu</Button>
                        <Button icon={<LuClock size={15} />} onClick={() => router.push('/business-settings?section=hours&focus=working-hours')}>Change hours</Button>
                        <Button icon={<LuCalendarClock size={15} />} onClick={() => router.push('/business-settings?section=hours&focus=temp-status')}>Set special hours</Button>
                        <Button icon={<LuImage size={15} />} onClick={() => router.push('/business-settings?section=business-profile&focus=official-page-photos')}>Update photos</Button>
                    </Flex>
                </Card>

                {canShowBusinessHealthDashboardCard ? (
                    <BusinessHealthDashboardCard
                        current={businessHealthCurrent}
                        isLoading={isBusinessHealthLoading}
                        projectId={activeProjectId || undefined}
                        storeScopeKey={storeDetails?.storeId}
                    />
                ) : null}

                {FEATURE_FLAGS.ENABLE_MENU_SETUP_PROGRESS ? (
                    <MenuSetupProgress
                        loading={dashboardProjectLoading}
                        project={dashboardProjectForChildren}
                        storeDetails={storeDetails as any}
                    />
                ) : null}

                {FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX ? (
                    <BusinessHealthAnalyticsStrip
                        enabled={isBusinessHealthReady}
                        projectId={activeProjectId || undefined}
                        storeScopeKey={storeDetails?.storeId}
                    />
                ) : null}

                <Flex
                    justify="space-between"
                    align="center"
                    wrap="wrap"
                    gap={16}
                    className={styles.dashboardHeader}
                >
                    <ViewModeTabs
                        activeMode={viewMode}
                        onModeChange={handleViewModeChange}
                        hasToday={true}
                        hasOverview={true}
                        hasGraph={FEATURE_FLAGS.ENABLE_OWNER_DASHBOARD_GRAPH_MODE}
                        hasDaily={true}
                        hasWeekly={true}
                        hasMonthly={true}
                        hasOverall={true}
                    />
                </Flex>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderViewContent()}
                    </motion.div>
                </AnimatePresence>

            </Space>
        </div>
    );
};

export default OwnerDashboard;
