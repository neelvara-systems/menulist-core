'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import {
    buildOwnerBusinessActivityMetrics,
    getOwnerBusinessPrimaryAnalyticsPeriod,
} from '@lib/ownerBusinessAssistant/businessSignals';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { VIEW_MODE_CONFIG, type OwnerDashboardViewMode } from '@template/main-app/projects/types';
import { formatDateKey, formatDateTime, type IntlFormatter } from '@util/dateTime';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { LuAlertTriangle, LuBarChart3, LuCalendar, LuEye, LuFlame, LuHeart, LuInfo, LuRefreshCw, LuShield, LuTrendingDown, LuTrendingUp, LuZap } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, List, Popover, Tabs, Tag, Text, Title, Toast } from '../antd';
import MobileBusinessHealthCard from '../components/MobileBusinessHealthCard';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

// Customer App (installable PWA) metrics — store-scoped (projectId='customerApp').
// Kept in Overview only so mobile matches the desktop analytics hierarchy.
const MobileCustomerAppMetrics = dynamic(
    () => import('./dashboardSections/MobileCustomerAppMetrics'),
    { ssr: false },
);
const MobileOBPMetricsCard = dynamic(
    () => import('./dashboardSections/MobileOBPMetricsCard'),
    { ssr: false },
);
const MobileMenuAnalyticsDetailsCard = dynamic(
    () => import('./dashboardSections/MobileMenuAnalyticsDetailsCard'),
    { ssr: false },
);
const MobileOwnerActionPlanCard = dynamic(
    () => import('./dashboardSections/MobileOwnerActionPlanCard'),
    { ssr: false },
);

interface MobileDashboardScreenProps {
    onBack: () => void;
    onOpenBusinessHealth?: () => void;
    onOpenDesignEditor?: () => void;
}

const SETTLED_TAB_HELPER_TEXT = 'Settled analytics are fetched only when this tab is opened. After the first fetch, this device uses cached settled data until the next store end-of-day cycle.';
const FULL_WIDTH_TAG_STYLE = {
    display: 'block',
    fontSize: 13,
    marginInlineEnd: 0,
    padding: '6px 10px',
    textAlign: 'center' as const,
    width: '100%',
};

function formatUpdatedTime(value: Date | string | undefined, formatter: IntlFormatter): string | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return formatDateTime(parsed, 'time', formatter);
}

export default function MobileDashboardScreen({ onBack, onOpenBusinessHealth, onOpenDesignEditor }: MobileDashboardScreenProps) {
    const t = useTranslations('MobileDashboard');
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const labels = useOfferingLabels();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const {
        isLoading: loadingProjects,
        projectsList,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
    } = useMobileProjects();
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [showHistorical, setShowHistorical] = useState(false);

    const {
        data,
        error,
        loading,
        refetch,
        viewMode,
        setViewMode,
        loadingDaily,
        loadingMonthly,
        loadingToday,
        loadingWeekly,
    } = useOwnerDashboard(selectedProjectId ? {
        projectId: selectedProjectId,
        loadHistorical: showHistorical,
    } : undefined);
    const obpDashboard = useOBPDashboard({ loadHistorical: showHistorical });
    const refetchOBPDashboard = obpDashboard.refetch;
    const canShowBusinessHealthSummary = Boolean(
        FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
        && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD
        && selectedProjectId
        && storeDetails?.storeId,
    );
    const canShowBusinessHealthAnalytics = Boolean(
        canShowBusinessHealthSummary
        && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX,
    );
    const { current: businessHealthCurrent } = useOwnerBusinessHealthCurrent(
        undefined,
        storeDetails?.storeId,
        { enabled: canShowBusinessHealthSummary },
    );
    const isBusinessHealthReady = Boolean(businessHealthCurrent && businessHealthCurrent.status !== 'not_ready' && businessHealthCurrent.sourceRefs?.length);
    const { analytics: businessHealthAnalytics } = useOwnerBusinessAnalyticsIndex(
        selectedProjectId || undefined,
        storeDetails?.storeId,
        { enabled: canShowBusinessHealthAnalytics && isBusinessHealthReady },
    );

    const viewModeLabel = VIEW_MODE_CONFIG[viewMode].label;

    const handleRefresh = useCallback(async () => {
        try {
            await Promise.all([refetch(), refetchOBPDashboard()]);
            Toast.show({ content: t('refreshed'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToRefresh'), duration: 1500 });
        }
    }, [refetch, refetchOBPDashboard, t]);

    const handleViewModeChange = useCallback((key: string) => {
        const nextMode = key as OwnerDashboardViewMode;
        setShowHistorical(nextMode !== 'today');
        setViewMode(nextMode);
    }, [setViewMode]);

    const currentViewData = useMemo(() => {
        switch (viewMode) {
            case 'today':
                return data?.today || null;
            case 'daily':
                return data?.daily || null;
            case 'weekly':
                return data?.weekly || null;
            case 'monthly':
                return data?.monthly || null;
            case 'overall':
                return data?.overall || null;
            case 'overview':
            default:
                return data?.overview || null;
        }
    }, [data?.daily, data?.monthly, data?.overall, data?.overview, data?.today, data?.weekly, viewMode]);
    const businessHealthMetrics = useMemo(
        () => buildOwnerBusinessActivityMetrics(getOwnerBusinessPrimaryAnalyticsPeriod(businessHealthAnalytics?.periods))
            .map((metric) => ({ ...metric, delta: metric.detail })),
        [businessHealthAnalytics?.periods],
    );
    const businessHealthFreshnessNote = getOwnerBusinessHealthFreshnessNote(businessHealthCurrent);

    if (loadingProjects || (!selectedProjectId && loadingProjects)) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle', { offering: labels.offeringLower })}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    if (!selectedProjectId) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle', { offering: labels.offeringLower })}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" gap={12} justify="center" style={{ flex: 1 }} vertical>
                    <LuBarChart3 color={token.colorTextQuaternary} size={36} />
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                        {t('noProjects', { offering: labels.offeringLower })}
                    </Text>
                </Flex>
            </Flex>
        );
    }

    if (error) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle', { offering: labels.offeringLower })}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex gap={16} style={{ padding: 16 }} vertical>
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuAlertTriangle color={token.colorWarning} size={36} />
                            <Text strong>Unable to load dashboard</Text>
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                Please try refreshing this screen. If the problem persists, contact support.
                            </Text>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    const overview = data?.overview;
    const today = data?.today;
    const overall = data?.overall;
    const wtd = overview?.wtd;
    const mtd = overview?.mtd;
    const historicalWeeks = overview?.historicalWeeks || data?.historicalWeeks || [];
    const hasOBPSettledData = Boolean(obpDashboard.data?.overview || obpDashboard.data?.overall);
    const isOBPSettledPending = obpDashboard.loading && !obpDashboard.data;
    const hasOBPCurrentViewData = viewMode === 'today'
        ? Boolean(obpDashboard.data?.today)
        : viewMode === 'overview'
        ? hasOBPSettledData
        : viewMode === 'daily'
            ? Boolean(obpDashboard.data?.overview?.yesterday || obpDashboard.data?.overall)
            : viewMode === 'weekly'
                ? Boolean(obpDashboard.data?.overview?.wtd || obpDashboard.data?.overall)
                : viewMode === 'monthly'
                    ? Boolean(obpDashboard.data?.overview?.mtd || obpDashboard.data?.overall)
                    : Boolean(obpDashboard.data?.overall);
    const isLoading = viewMode === 'today'
        ? false
        : viewMode === 'overview'
            ? loading && !overview && !hasOBPSettledData
            : viewMode === 'daily'
                ? loadingDaily
                : viewMode === 'weekly'
                    ? loadingWeekly
                    : viewMode === 'monthly'
                        ? loadingMonthly
                        : viewMode === 'overall'
                            ? loading && !overall && !hasOBPSettledData
                            : loading && !currentViewData;

    const overviewStatus = (() => {
        if (!overview) return { color: 'default', text: t('noDataYet') };
        if (overview.status === 'working') return { color: 'success', text: t('menuWorking', { offering: labels.offeringLower }) };
        if (overview.status === 'low_activity') return { color: 'warning', text: t('lowActivity') };
        return { color: 'default', text: t('waitingFirstScan') };
    })();
    const stickyHistoricalHeaderStyle = {
        background: token.colorBgLayout,
        backdropFilter: 'blur(10px)',
        marginInline: -16,
        paddingInline: 16,
        paddingTop: 4,
        paddingBottom: 8,
        position: 'sticky' as const,
        top: 0,
        zIndex: 20,
    };

    const renderMetricTile = (
        label: ReactNode,
        value: ReactNode,
        icon?: ReactNode,
        titleLevel: 3 | 4 = 3,
    ) => (
        <div
            style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
                flex: '1 1 45%',
                minWidth: 0,
                padding: 12,
            }}
        >
            <Flex align="center" gap={8}>
                {icon}
                <Text type="secondary">{label}</Text>
            </Flex>
            <Title level={titleLevel} style={{ margin: 0 }}>
                {value}
            </Title>
        </div>
    );

    const renderMetricsCards = (metrics?: any) => (
        <Flex gap={12} wrap>
            {renderMetricTile(labels.scansLabel, (metrics?.menuVisits || 0).toLocaleString(), <LuEye color={token.colorPrimary} size={14} />)}
            {renderMetricTile(t('itemTaps'), (metrics?.itemClicks || 0).toLocaleString(), <LuFlame color={token.colorWarning} size={14} />)}
            {renderMetricTile('Engaged Sessions', `${metrics?.engagedSessionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={14} />)}
            {renderMetricTile('Action Rate', `${metrics?.actionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={14} />)}
            {renderMetricTile('Customer Actions', (metrics?.menuActionClicks || 0).toLocaleString(), <LuHeart color={token.colorSuccess} size={14} />)}
            {renderMetricTile('Searches', (metrics?.searches || 0).toLocaleString(), <LuBarChart3 color={token.colorInfo} size={14} />)}
            {renderMetricTile('No-result Searches', (metrics?.zeroResultSearches || 0).toLocaleString(), <LuTrendingDown color={token.colorWarning} size={14} />)}
            {renderMetricTile('Unavailable Interest', (metrics?.unavailableItemTaps || 0).toLocaleString(), <LuShield color={token.colorWarning} size={14} />)}
            {metrics?.smartPicksRendered > 0 ? (
                <>
                    {renderMetricTile(t('smartPicks'), metrics.smartPicksRendered.toLocaleString(), <LuZap color={token.colorInfo} size={14} />)}
                    {renderMetricTile(t('spClicks'), (metrics.smartPicksClicks || 0).toLocaleString(), <LuZap color={token.colorSuccess} size={14} />)}
                </>
            ) : null}
        </Flex>
    );

    const renderTodaySoFar = () => {
        if (loadingToday) {
            return (
                <Card size="small" title={<Text strong>Menu</Text>}>
                    <Flex align="center" gap={8}>
                        <DotLoading color="primary" />
                        <Text type="secondary">Loading current activity</Text>
                    </Flex>
                </Card>
            );
        }

        if (!today) {
            return (
                <Card size="small" title={<Text strong>Menu</Text>}>
                    <Text type="secondary" style={{ display: 'block' }}>
                        No menu activity yet today.
                    </Text>
                </Card>
            );
        }

        const updatedLabel = formatUpdatedTime(data?.lastFetched, formatter);
        const hasActions = Object.values(today.menuActions || {}).some((value) => Number(value) > 0);
        const topSearch = today.topSearchTerms?.[0];
        const topUnavailable = today.unavailableItems?.[0];
        const topFilter = today.topAttributeFilters?.[0];
        const topLanguage = today.topLanguages?.[0];
        const todayInfoContent = (
            <div style={{ maxWidth: 280 }}>
                <Text type="secondary" style={{ display: 'block' }}>
                    {updatedLabel
                        ? `Updated ${updatedLabel}. This is the current business day's partial activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals. Those views update after the next nightly settlement.`
                        : "This is the current business day's partial activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals. Those views update after the next nightly settlement."}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                    Fresh data appears when this screen is opened again or refreshed after 10 minutes. It does not auto-update continuously.
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                    Searches are de-duplicated within a session. Actions count final clicks only, and unavailable interest shows demand rather than confirmed lost sales.
                </Text>
                {topSearch ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {`Top search right now: ${topSearch.term} (${topSearch.count})`}
                    </Text>
                ) : null}
                {topFilter ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {`Top filter right now: ${topFilter.label || topFilter.filterId} (${topFilter.interactions} intent, ${topFilter.actionClicks} actions)`}
                    </Text>
                ) : null}
                {topLanguage ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {`Top language right now: ${topLanguage.label || topLanguage.language} (${topLanguage.menuSessions || topLanguage.menuViews} sessions/views, ${topLanguage.adoptions || 0} stayed switches)`}
                    </Text>
                ) : null}
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {`No-result searches so far: ${today.metrics.zeroResultSearches || 0}`}
                </Text>
                {today.topZeroResultSearchTerms?.length ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {`No-result terms so far: ${today.topZeroResultSearchTerms.map((term: any) => `${term.term} (${term.count})`).join(', ')}`}
                    </Text>
                ) : null}
                {topUnavailable ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {`Most tapped unavailable item: ${topUnavailable.name || topUnavailable.itemId} (${topUnavailable.clicks})`}
                    </Text>
                ) : null}
                {hasActions ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {`Customer actions: Call ${today.menuActions?.call || 0}, WhatsApp ${today.menuActions?.whatsapp || 0}, Directions ${today.menuActions?.directions || 0}, Reserve ${today.menuActions?.reserve || 0}, Order ${today.menuActions?.order || 0}`}
                    </Text>
                ) : null}
            </div>
        );

        return (
            <Card
                size="small"
                title={(
                    <Flex align="center" justify="space-between">
                        <Text strong>Menu</Text>
                        <Popover content={todayInfoContent} placement="bottom" trigger="click">
                            <Button
                                fill="none"
                                style={{ minHeight: 'auto', padding: 4 }}
                            >
                                <LuInfo color={token.colorTextSecondary} size={16} />
                            </Button>
                        </Popover>
                    </Flex>
                )}
            >
                {renderMetricsCards(today.metrics)}
            </Card>
        );
    };

    const renderAiSummary = (summary?: any) => summary?.bulletPoints?.length ? (
        <Card size="small" title={<Text strong>{t('aiSummary')}</Text>}>
            <List>
                {summary.bulletPoints.map((bullet: string, index: number) => (
                    <List.Item key={`${bullet}-${index}`} title={<Text>{bullet}</Text>} />
                ))}
            </List>
        </Card>
    ) : null;

    const renderPeriodView = () => {
        const periodData = currentViewData as any;

        if (viewMode === 'today' || viewMode === 'overview' || viewMode === 'overall') return null;
        if (!periodData) {
            return (
                <Card size="small" title={<Text strong>{viewModeLabel}</Text>}>
                    <Text type="secondary">No menu activity yet for this period.</Text>
                </Card>
            );
        }

        const dateLabel = viewMode === 'daily' && periodData.date
            ? formatDateKey(periodData.date, formatter)
            : viewMode === 'weekly' && periodData.weekStart && periodData.weekEnd
                ? `${formatDateKey(periodData.weekStart, formatter)} - ${formatDateKey(periodData.weekEnd, formatter)}`
                : viewMode === 'monthly' && periodData.monthStart
                    ? formatDateKey(periodData.monthStart, formatter)
                    : viewModeLabel;

        return (
            <>
                {viewMode !== 'daily' ? (
                    <Tag
                        color="processing"
                        style={FULL_WIDTH_TAG_STYLE}
                    >
                        {dateLabel}
                    </Tag>
                ) : null}

                <Card size="small" title={<Text strong>{viewModeLabel}</Text>}>
                    {renderMetricsCards(periodData.metrics)}
                    {viewMode === 'monthly' && periodData.daysWithData > 0 ? (
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                            {`${periodData.daysWithData} active days this month`}
                        </Text>
                    ) : null}
                </Card>
            </>
        );
    };

    const renderOverallView = () => (
        <>
            {overall?.lifetimeMetrics ? (
                <Card size="small" title={<Text strong>{t('allTime')}</Text>}>
                    <Flex gap={12} wrap>
                        {renderMetricTile(t('totalScans'), overall.lifetimeMetrics.totalViews?.toLocaleString() || '0', undefined, 4)}
                        {renderMetricTile(t('totalClicks'), overall.lifetimeMetrics.totalClicks?.toLocaleString() || '0', undefined, 4)}
                        {renderMetricTile('Engaged Sessions', `${overall.lifetimeMetrics.engagedSessionRate || 0}%`, undefined, 4)}
                        {renderMetricTile('Action Rate', `${overall.lifetimeMetrics.actionRate || 0}%`, undefined, 4)}
                        {renderMetricTile('Customer Actions', overall.lifetimeMetrics.totalMenuActionClicks?.toLocaleString() || '0', undefined, 4)}
                        {renderMetricTile('Searches', overall.lifetimeMetrics.totalSearches?.toLocaleString() || '0', undefined, 4)}
                        {renderMetricTile('No-result Searches', overall.lifetimeMetrics.totalZeroResultSearches?.toLocaleString() || '0', undefined, 4)}
                        {renderMetricTile('Unavailable Interest', overall.lifetimeMetrics.totalUnavailableItemTaps?.toLocaleString() || '0', undefined, 4)}
                    </Flex>
                    {overall.firstDataDate ? (
                        <Text type="secondary">
                            {`Since ${formatDateKey(overall.firstDataDate, formatter)}`}
                        </Text>
                    ) : null}
                </Card>
            ) : (
                <Card size="small" title={<Text strong>{t('allTime')}</Text>}>
                    <Text type="secondary">No lifetime menu activity yet.</Text>
                </Card>
            )}
        </>
    );

    const dailyHeaderData = viewMode === 'daily' ? currentViewData as any : null;
    const dailyHeaderDateLabel = dailyHeaderData?.date
        ? formatDateKey(dailyHeaderData.date, formatter)
        : null;
    const dailyHeaderLabel = dailyHeaderDateLabel && dailyHeaderData?.isLowActivity
        ? `${dailyHeaderDateLabel} · ${t('lowActivity')}`
        : dailyHeaderDateLabel;

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle', { offering: labels.offeringLower })}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ padding: 16, paddingBottom: 24 }} vertical>
                {projectsList.length > 1 && selectedProjectId ? (
                    <ProjectSelectorTrigger
                        clickable
                        currentProject={{
                            active: selectedProjectSummary?.active !== false,
                            deleted: selectedProjectSummary?.deleted === true,
                            id: selectedProjectId,
                            isDefault: selectedProjectSummary?.isDefault,
                            isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
                            name: selectedProjectSummary?.name || t('unnamedProject'),
                            projectImage: selectedProjectSummary?.projectImage || null,
                            specialMenuBaseProjectId: selectedProjectSummary?.specialMenuBaseProjectId,
                            specialMenuBaseProjectName: selectedProjectSummary?.specialMenuBaseProjectId
                                ? projectsList.find((project: any) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
                                : undefined,
                            specialMenuEndsAt: selectedProjectSummary?.specialMenuEndsAt,
                            specialMenuStatus: selectedProjectSummary?.specialMenuStatus,
                        }}
                        onClick={() => setIsProjectSelectorOpen(true)}
                    />
                ) : null}

                {canShowBusinessHealthSummary ? (
                    <MobileBusinessHealthCard
                        current={businessHealthCurrent}
                        freshnessNote={businessHealthFreshnessNote}
                        metrics={businessHealthMetrics}
                        onClick={onOpenBusinessHealth}
                    />
                ) : null}

                <div style={stickyHistoricalHeaderStyle}>
                    <Card className="mobile-dashboard-tabs-card" size="small">
                        <div className="mobile-dashboard-tabs">
                            <Tabs activeKey={viewMode} centered onChange={handleViewModeChange}>
                                <Tabs.Tab title={VIEW_MODE_CONFIG.today.label} key="today" />
                                <Tabs.Tab title={VIEW_MODE_CONFIG.overview.label} key="overview" />
                                <Tabs.Tab title={VIEW_MODE_CONFIG.daily.label} key="daily" />
                                <Tabs.Tab title={VIEW_MODE_CONFIG.weekly.label} key="weekly" />
                                <Tabs.Tab title={VIEW_MODE_CONFIG.monthly.label} key="monthly" />
                                <Tabs.Tab title={VIEW_MODE_CONFIG.overall.label} key="overall" />
                            </Tabs>
                        </div>
                    </Card>
                </div>

                <Flex align="center" justify="space-between">
                    <Title level={5} style={{ margin: 0 }}>
                        {viewMode === 'today' ? 'Today so far' : viewModeLabel}
                    </Title>
                    {viewMode === 'today' ? (
                        <Button fill="none" onClick={handleRefresh} style={{ paddingInline: 8 }}>
                            <LuRefreshCw size={18} color={token.colorTextTertiary} />
                        </Button>
                    ) : dailyHeaderLabel ? (
                        <Tag
                            color={dailyHeaderData?.isLowActivity ? 'warning' : 'processing'}
                            style={{ marginInlineEnd: 0 }}
                        >
                            {dailyHeaderLabel}
                        </Tag>
                    ) : null}
                </Flex>

                {viewMode !== 'today' ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {SETTLED_TAB_HELPER_TEXT}
                    </Text>
                ) : null}

                {showHistorical && viewMode === 'overview' ? (
                    <Tag
                        color={overviewStatus.color}
                        style={{ ...FULL_WIDTH_TAG_STYLE }}
                    >
                        {overviewStatus.text}
                    </Tag>
                ) : null}

                {isLoading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">{t('loading')}</Text>
                        </Flex>
                    </Card>
                ) : viewMode === 'today' ? (
                    <>
                        {renderTodaySoFar()}
                        <MobileOBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="today"
                        />
                        <MobileMenuAnalyticsDetailsCard data={today} />
                    </>
                ) : viewMode === 'overall' ? (
                    <>
                        {renderOverallView()}
                        <MobileOBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="overall"
                        />
                        <MobileMenuAnalyticsDetailsCard data={overall} />

                        {!overall && !hasOBPCurrentViewData && !isOBPSettledPending ? (
                            <Card>
                                <Flex align="center" gap={12} vertical>
                                    <LuBarChart3 color={token.colorTextQuaternary} size={36} />
                                    <Text type="secondary" style={{ textAlign: 'center' }}>
                                        {t('noAnalyticsYet', { offering: labels.offeringLower })}
                                    </Text>
                                </Flex>
                            </Card>
                        ) : null}
                    </>
                ) : viewMode !== 'overview' ? (
                    <>
                        {renderPeriodView()}
                        <MobileOBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode={viewMode}
                        />
                        <MobileMenuAnalyticsDetailsCard data={currentViewData as any} />
                        {renderAiSummary((currentViewData as any)?.aiSummary)}

                        {!currentViewData && !hasOBPCurrentViewData && !isOBPSettledPending ? (
                            <Card>
                                <Flex align="center" gap={12} vertical>
                                    <LuBarChart3 color={token.colorTextQuaternary} size={36} />
                                    <Text type="secondary" style={{ textAlign: 'center' }}>
                                        {t('noAnalyticsYet', { offering: labels.offeringLower })}
                                    </Text>
                                </Flex>
                            </Card>
                        ) : null}
                    </>
                ) : (
                    <>
                        <Card size="small" title={<Text strong>{t('last7Days')}</Text>}>
                            {wtd ? (
                                renderMetricsCards(wtd.metrics)
                            ) : (
                                <Text type="secondary">No settled menu activity yet for the last 7 days.</Text>
                            )}
                        </Card>
                        <MobileOBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode="overview"
                        />

                        <MobileCustomerAppMetrics />

                        <MobileOwnerActionPlanCard
                            actionPlan={data?.ownerActionPlan || overview?.ownerActionPlan}
                            confidence={data?.ownerConfidence || overview?.ownerConfidence}
                            sourceQuality={data?.sourceQuality || overview?.sourceQuality || []}
                            analyticsAiEntitlement={data?.analyticsAiEntitlement || overview?.analyticsAiEntitlement}
                            title="Menu Intelligence Action Plan"
                        />

                        {overview?.aiSummary?.bulletPoints?.length ? (
                            <Card size="small" title={<Text strong>{t('aiSummary')}</Text>}>
                                <List>
                                    {overview.aiSummary.bulletPoints.map((bullet: string, index: number) => (
                                        <List.Item key={`${bullet}-${index}`} title={<Text>{bullet}</Text>} />
                                    ))}
                                </List>
                            </Card>
                        ) : null}

                        {/* 4-Week Trend — most engaging visual for SMB owners */}
                        {historicalWeeks.length > 0 ? (() => {
                            const maxScans = Math.max(...historicalWeeks.map((w: any) => w.metrics?.menuVisits || 0), 1);
                            return (
                                <Card size="small" title={
                                    <Flex align="center" gap={6}>
                                        <LuTrendingUp color={token.colorPrimary} size={14} />
                                        <Text strong>4-Week Trend</Text>
                                    </Flex>
                                }>
                                    <Flex gap={8} vertical>
                                        {historicalWeeks.map((week: any, idx: number) => {
                                            const pct = Math.round((week.metrics?.menuVisits || 0) / maxScans * 100);
                                            return (
                                                <Flex key={idx} align="center" gap={8}>
                                                    <Text type="secondary" style={{ fontSize: 11, minWidth: 56 }}>{week.weekLabel}</Text>
                                                    <div style={{ flex: 1, background: token.colorFillSecondary, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                        <div style={{
                                                            background: week.isCurrentWeek ? token.colorPrimary : token.colorPrimaryBorder,
                                                            borderRadius: 4,
                                                            height: '100%',
                                                            width: `${pct}%`,
                                                            transition: 'width 0.4s ease',
                                                        }} />
                                                    </div>
                                                    <Text style={{ fontSize: 12, minWidth: 32, textAlign: 'right', fontWeight: week.isCurrentWeek ? 600 : 400 }}>
                                                        {(week.metrics?.menuVisits || 0).toLocaleString()}
                                                    </Text>
                                                    {week.isCurrentWeek ? (
                                                        <Tag
                                                            style={{
                                                                backgroundColor: token.colorPrimaryBg,
                                                                borderColor: token.colorPrimaryBorder,
                                                                color: token.colorPrimaryText,
                                                                fontSize: 10,
                                                                padding: '0 4px',
                                                            }}
                                                        >
                                                            Now
                                                        </Tag>
                                                    ) : null}
                                                </Flex>
                                            );
                                        })}
                                    </Flex>
                                </Card>
                            );
                        })() : null}

                        {/* MTD Summary */}
                        {mtd ? (
                            <Card size="small" title={
                                <Flex align="center" gap={6}>
                                    <LuCalendar color={token.colorInfo} size={14} />
                                    <Text strong>This Month</Text>
                                </Flex>
                            }>
                                <Flex gap={12} wrap>
                                    {renderMetricTile(labels.scansLabel, (mtd.metrics?.menuVisits || 0).toLocaleString(), <LuEye color={token.colorPrimary} size={12} />, 4)}
                                    {renderMetricTile(t('itemTaps'), (mtd.metrics?.itemClicks || 0).toLocaleString(), <LuFlame color={token.colorWarning} size={12} />, 4)}
                                    {renderMetricTile('Engaged Sessions', `${mtd.metrics?.engagedSessionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={12} />, 4)}
                                    {renderMetricTile('Action Rate', `${mtd.metrics?.actionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={12} />, 4)}
                                </Flex>
                                {mtd.daysWithData > 0 ? (
                                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                                        {`${mtd.daysWithData} active days this month`}
                                    </Text>
                                ) : null}
                            </Card>
                        ) : null}
                        <MobileMenuAnalyticsDetailsCard data={wtd} title="Last 7 Days Menu Details" />
                        <MobileMenuAnalyticsDetailsCard data={mtd} title={`${mtd?.monthName || 'This Month'} Menu Details`} />
                        {!overview && !overall && !hasOBPSettledData && !isOBPSettledPending ? (
                            <Card>
                                <Flex align="center" gap={12} vertical>
                                    <LuBarChart3 color={token.colorTextQuaternary} size={36} />
                                    <Text type="secondary" style={{ textAlign: 'center' }}>
                                        {t('noAnalyticsYet', { offering: labels.offeringLower })}
                                    </Text>
                                </Flex>
                            </Card>
                        ) : null}
                    </>
                )}
            </Flex>

            <style jsx global>{`
                .mobile-dashboard-tabs-card .adm-card-body {
                    padding: 10px 14px;
                }

                .mobile-dashboard-tabs .adm-tabs-header {
                    margin-bottom: 0;
                }
            `}</style>

            <MobileProjectSelectorSheet
                currentProjectId={selectedProjectId}
                currentProjectName={selectedProjectSummary?.name || null}
                onClose={() => setIsProjectSelectorOpen(false)}
                onOpenDesignEditor={onOpenDesignEditor}
                onProjectsChanged={async (preferredProjectId) => {
                    setIsProjectSelectorOpen(false);
                    await selectProject(preferredProjectId || null);
                }}
                visible={isProjectSelectorOpen}
            />
        </Flex>
    );
}
