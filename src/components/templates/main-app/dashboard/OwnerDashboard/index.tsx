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
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { EMPTY_STATE_MESSAGES } from '@template/main-app/projects/types';
import { Alert, Card, Flex, Space, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useContext, useState } from 'react';

import DailyView from './DailyView';
import { DashboardProjectSelector } from './DashboardProjectSelector';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import MonthlyView from './MonthlyView';
import OverallFooter from './OverallFooter';
import OverviewView from './OverviewView';
import ViewModeTabs from './ViewModeTabs';
import WeeklyView from './WeeklyView';

import OBPLinkCard from '../../businessSettings/OBPLinkCard';
import TempStatusCard from '../../businessSettings/TempStatusCard';
import ReputationGuard from '../../reviews/ReputationGuard';
import ReviewReplyTool from '../../reviews/ReviewReplyTool';
import MenuQualitySignals from '../MenuQualitySignals';
import BehaviorNudgeCard from './BehaviorNudgeCard';
import GoogleListingCard from './GoogleListingCard';
import HealthSignalCards from './HealthSignalCards';
import HoursFreshnessNudge from './HoursFreshnessNudge';
import OBPMetricsCard from './OBPMetricsCard';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

const OwnerDashboard: React.FC = () => {
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Derive a fallback projectId from storeDetails immediately (no SWR wait needed)
    const fallbackProjectId = storeDetails?.storeId
        ? `${storeDetails.tenantId}-default-${storeDetails.storeId}`
        : null;

    // Project selection state — seed with fallback so dashboard can start fetching immediately
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Use selector-chosen project if available, otherwise fall back to derived default
    const activeProjectId = selectedProjectId || fallbackProjectId;

    const handleProjectChange = useCallback((projectId: string, _projectName: string) => {
        setSelectedProjectId(projectId);
    }, []);

    const handleProjectSelectorReady = useCallback(() => {
        // no-op — we no longer block on selector ready
    }, []);

    const {
        data,
        loading,
        error,
        viewMode,
        setViewMode,
        loadingDaily,
        loadingWeekly,
        loadingMonthly,
    } = useOwnerDashboard({ projectId: activeProjectId || undefined });

    // Show loading while storeDetails hasn't loaded yet OR data is still fetching
    if (!storeDetails?.storeId || loading) {
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

    const hasAnyData = data?.overview || data?.weekly || data?.daily || data?.monthly || data?.overall;

    if (!hasAnyData) {
        return (
            <EmptyState
                title={EMPTY_STATE_MESSAGES.noData.title}
                description={EMPTY_STATE_MESSAGES.noData.description}
            />
        );
    }

    const renderCurrentView = () => {
        switch (viewMode) {
            case 'overview':
                return <OverviewView data={data?.overview || null} />;
            case 'daily':
                if (loadingDaily) return <LoadingState />;
                return <DailyView data={data?.daily || null} />;
            case 'weekly':
                if (loadingWeekly) return <LoadingState />;
                return <WeeklyView data={data?.weekly || null} />;
            case 'monthly':
                if (loadingMonthly) return <LoadingState />;
                return <MonthlyView data={data?.monthly || null} />;
            default:
                return <OverviewView data={data?.overview || null} />;
        }
    };

    return (
        <div className={styles.ownerDashboard}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Dashboard Header - Project Selector + View Mode Tabs */}
                <Flex
                    justify="space-between"
                    align="center"
                    wrap="wrap"
                    gap={16}
                    className={styles.dashboardHeader}
                >
                    {/* Project Selector */}
                    <Flex align="center" gap={8}>
                        <Text type="secondary" style={{ fontSize: 13 }}>Viewing:</Text>
                        <DashboardProjectSelector
                            selectedProjectId={activeProjectId}
                            onProjectChange={handleProjectChange}
                            onReady={handleProjectSelectorReady}
                        />
                    </Flex>

                    {/* View Mode Tabs */}
                    <ViewModeTabs
                        activeMode={viewMode}
                        onModeChange={setViewMode}
                        hasOverview={true}
                        hasDaily={true}
                        hasWeekly={true}
                        hasMonthly={true}
                    />
                </Flex>

                {/* Main Content Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderCurrentView()}
                    </motion.div>
                </AnimatePresence>

                {/* Hours Freshness Nudge — correction trigger for stale hours
                    Shows only when ENABLE_OUTPUT_CONTROL is ON and hours are RISKY/BROKEN.
                    @see __docs__/silent-correction-systems/README.md */}
                <HoursFreshnessNudge />

                {/* Menu Quality Signals - Actionable quality nudges */}
                <MenuQualitySignals projectId={selectedProjectId} />

                {/* Behavior Nudge Card - First-time reinforcement for official link adoption */}
                <BehaviorNudgeCard />

                {/* Google Listing Card - Pre-API bridge for GBP link control */}
                {storeDetails && <GoogleListingCard storeDetails={storeDetails} />}

                {/* Temporary Status Card - Daily operational action for public status banners */}
                {storeDetails && <TempStatusCard storeDetails={storeDetails} setStoreDetails={setStoreDetails} />}

                {/* OBP Link Card - Persistent visibility for link sharing habit */}
                {storeDetails && <OBPLinkCard storeDetails={storeDetails} />}

                {/* OBP Analytics Card - Shows when ENABLE_OBP is true */}
                <OBPMetricsCard />

                {/* Health Signal Cards - Pillars 4-6 (visible only when data exists) */}
                {storeDetails?.healthSignals && (
                    <HealthSignalCards healthSignals={storeDetails.healthSignals} />
                )}

                {/* Reputation Guard - Pillar 3 (passive notice when review risk detected) */}
                <ReputationGuard />

                {/* Review Reply Tool - Standalone AI reply suggestion */}
                <ReviewReplyTool businessType={storeDetails?.businessType} />

                {/* Overall Footer - Always visible */}
                {data?.overall && (
                    <OverallFooter data={data.overall} />
                )}
            </Space>
        </div>
    );
};

export default OwnerDashboard;
