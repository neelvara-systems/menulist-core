/**
 * Owner Dashboard v2
 * 
 * The main SMB owner-facing dashboard.
 * NOT analytics - this is CONFIRMATION for business owners.
 * 
 * Philosophy: "Answers, not data. Confidence, not insight."
 * 
 * View Hierarchy:
 * - Overview (PRIMARY) - Default, hero status + expandable detail
 * - Daily (secondary) - Quick check, guarded
 * - Weekly (secondary) - Last 7 days detail
 * - Monthly (secondary) - Subscription justification
 * - Overall (footer) - Lifetime anchor
 * 
 * v2 Changes:
 * - Overview is now default (simplified hero + WTD/MTD/historical)
 * - Weekly/Monthly are detail views (lazy loaded)
 * - Historical weeks comparison
 * - Project selector for multi-catalog support
 */

import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Card, Flex, Space, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useContext, useEffect, useState } from 'react';

import DailyView from './DailyView';
import { DashboardProjectSelector } from './DashboardProjectSelector';
import LoadingState from './LoadingState';
import MenuQualitySignals from '../MenuQualitySignals';
import MonthlyView from './MonthlyView';
import OverallFooter from './OverallFooter';
import OverviewView from './OverviewView';
import TodaySoFarCard from './TodaySoFarCard';
import ViewModeTabs from './ViewModeTabs';
import WeeklyView from './WeeklyView';

import CustomerAppMetrics from '../AnalyticsDashboard/CustomerAppMetrics';
import OBPMetricsCard from './OBPMetricsCard';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;
const DASHBOARD_PROJECT_STORAGE_KEY = 'menulist_dashboard_project_id';
const SETTLED_TAB_HELPER_TEXT = 'Settled analytics are fetched only when this tab is opened. After the first fetch, this device uses cached settled data until the next store end-of-day cycle.';

const OwnerDashboard: React.FC = () => {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Derive a fallback projectId from storeDetails immediately (no SWR wait needed)
    const fallbackProjectId = storeDetails?.storeId
        ? `${storeDetails.tenantId}-default-${storeDetails.storeId}`
        : null;

    // Project selection state — seed with fallback so dashboard can start fetching immediately
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return window.sessionStorage.getItem(DASHBOARD_PROJECT_STORAGE_KEY);
    });
    const [showHistorical, setShowHistorical] = useState(false);

    // Use selector-chosen project if available, otherwise fall back to derived default
    const activeProjectId = selectedProjectId || fallbackProjectId;

    const handleProjectChange = useCallback((projectId: string, _projectName: string) => {
        setSelectedProjectId(projectId);
    }, []);

    const handleProjectSelectorReady = useCallback(() => {
        // no-op — we no longer block on selector ready
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (activeProjectId) {
            window.sessionStorage.setItem(DASHBOARD_PROJECT_STORAGE_KEY, activeProjectId);
        }
    }, [activeProjectId]);

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

    const hasMenuData = Boolean(data?.today || data?.overview || data?.weekly || data?.daily || data?.monthly || data?.overall);
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
                    message="Unable to load dashboard"
                    description="Please try refreshing the page. If the problem persists, contact support."
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
                        <Title level={4} style={{ margin: 0 }}>Today so far</Title>
                        <Flex gap={16} wrap="wrap">
                            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
                                <TodaySoFarCard
                                    data={data?.today || null}
                                    loading={loadingToday}
                                    fetchedAt={data?.lastFetched}
                                    title="Menu"
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
                    </Space>
                );
            case 'overview':
                if (loading && !data?.overview && !hasOBPSettledData) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>Overview</Title>
                        <Text type="secondary">{SETTLED_TAB_HELPER_TEXT}</Text>
                        <OverviewView
                            data={data?.overview || null}
                            qualitySignalsSlot={<MenuQualitySignals projectId={activeProjectId} />}
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
            case 'daily':
                if (loadingDaily) return <LoadingState />;
                return (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Title level={4} style={{ margin: 0 }}>Yesterday</Title>
                        <Text type="secondary">{SETTLED_TAB_HELPER_TEXT}</Text>
                        {data?.daily ? <DailyView data={data.daily} /> : null}
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
                        <Title level={4} style={{ margin: 0 }}>Last 7 Days</Title>
                        <Text type="secondary">{SETTLED_TAB_HELPER_TEXT}</Text>
                        {data?.weekly ? <WeeklyView data={data.weekly} /> : null}
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
                        <Title level={4} style={{ margin: 0 }}>This Month</Title>
                        <Text type="secondary">{SETTLED_TAB_HELPER_TEXT}</Text>
                        {data?.monthly ? <MonthlyView data={data.monthly} /> : null}
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
                        <Title level={4} style={{ margin: 0 }}>Overall</Title>
                        <Text type="secondary">{SETTLED_TAB_HELPER_TEXT}</Text>
                        {data?.overall ? <OverallFooter data={data.overall} /> : null}
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
                    <Text type="secondary" style={{ fontSize: 13 }}>Viewing:</Text>
                    <DashboardProjectSelector
                        selectedProjectId={activeProjectId}
                        onProjectChange={handleProjectChange}
                        onReady={handleProjectSelectorReady}
                    />
                </Flex>

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
