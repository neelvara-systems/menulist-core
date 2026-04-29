'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { OwnerDashboardViewMode } from '@template/main-app/projects/types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { LuBarChart3, LuCalendar, LuEye, LuFlame, LuHeart, LuRefreshCw, LuShield, LuTrendingDown, LuTrendingUp, LuZap } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, List, NavBar, Tabs, Tag, Text, Title, Toast } from '../antd';
import MobileProjectSelectorSheet from '../components/MobileProjectSelectorSheet';
import MobileScreenIntro from '../components/MobileScreenIntro';
import { useMobileProjects } from '../providers/MobileProjectsProvider';

// Customer App (installable PWA) metrics — store-scoped (projectId='customerApp').
// Renders nothing when feature-flag off or no data yet, so it's safe to mount
// unconditionally here alongside menu analytics.
const MobileCustomerAppMetrics = dynamic(
    () => import('./dashboardSections/MobileCustomerAppMetrics'),
    { ssr: false },
);

interface MobileDashboardScreenProps {
    onBack: () => void;
    onOpenDesignEditor?: () => void;
}

const RISK_LABELS: Record<string, string> = { stable: 'Stable', watch: 'Watch', at_risk: 'At Risk' };
const FULL_WIDTH_TAG_STYLE = {
    display: 'block',
    fontSize: 13,
    marginInlineEnd: 0,
    padding: '6px 10px',
    textAlign: 'center' as const,
    width: '100%',
};

export default function MobileDashboardScreen({ onBack, onOpenDesignEditor }: MobileDashboardScreenProps) {
    const t = useTranslations('MobileDashboard');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const { isLoading: loadingProjects, projectsList, selectedProjectId, selectedProjectSummary, selectProject } = useMobileProjects();
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [showHistorical, setShowHistorical] = useState(false);

    const {
        data,
        loading,
        refetch,
        viewMode,
        setViewMode,
        loadingToday,
    } = useOwnerDashboard(selectedProjectId ? {
        projectId: selectedProjectId,
        loadHistorical: showHistorical,
    } : undefined);

    const viewModeLabel = viewMode === 'overview'
        ? t('overview')
        : viewMode === 'daily'
            ? t('daily')
            : viewMode === 'weekly'
                ? t('weekly')
                : t('monthly');

    const handleRefresh = useCallback(async () => {
        try {
            await refetch();
            Toast.show({ content: t('refreshed'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToRefresh'), duration: 1500 });
        }
    }, [refetch]);

    const handleViewModeChange = useCallback((key: string) => {
        setViewMode(key as OwnerDashboardViewMode);
    }, [setViewMode]);

    const currentViewData = useMemo(() => {
        switch (viewMode) {
            case 'daily':
                return data?.daily || null;
            case 'weekly':
                return data?.weekly || null;
            case 'monthly':
                return data?.monthly || null;
            case 'overview':
            default:
                return data?.overview || null;
        }
    }, [data?.daily, data?.monthly, data?.overview, data?.weekly, viewMode]);

    if (loadingProjects || (!selectedProjectId && loadingProjects)) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    if (!selectedProjectId) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" gap={12} justify="center" style={{ flex: 1 }} vertical>
                    <LuBarChart3 color={token.colorTextQuaternary} size={36} />
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                        {t('noProjects', { offering: labels.offeringLower })}
                    </Text>
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
    const isLoading = viewMode === 'overview'
        ? loading && !data
        : loading && !currentViewData;

    const overviewStatus = (() => {
        if (!overview) return { color: 'default', text: t('noDataYet') };
        if (overview.status === 'working') return { color: 'success', text: t('menuWorking', { offering: labels.offeringLower }) };
        if (overview.status === 'low_activity') return { color: 'warning', text: t('lowActivity') };
        return { color: 'default', text: t('waitingFirstScan') };
    })();
    const trustColors: Record<string, string> = {
        stable: token.colorPrimary,
        strong: token.colorSuccess,
        weak: token.colorWarning,
    };
    const riskColors: Record<string, string> = {
        at_risk: token.colorError,
        stable: token.colorSuccess,
        watch: token.colorWarning,
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

    const renderDemandAndActions = (data?: any) => {
        const hasActions = Object.values(data?.menuActions || {}).some((value) => Number(value) > 0);
        const hasSearchTerms = Boolean(data?.topSearchTerms?.length);
        const hasUnavailable = Boolean(data?.unavailableItems?.length);
        const hasZeroResultSearches = Number(data?.metrics?.zeroResultSearches || 0) > 0;

        if (!hasActions && !hasSearchTerms && !hasUnavailable && !hasZeroResultSearches) return null;

        return (
            <Card size="small" title={<Text strong>Customer Intent</Text>}>
                <Flex gap={8} vertical>
                    {hasActions ? (
                        <Text type="secondary">
                            {`Actions: Call ${data.menuActions?.call || 0}, WhatsApp ${data.menuActions?.whatsapp || 0}, Directions ${data.menuActions?.directions || 0}, Reserve ${data.menuActions?.reserve || 0}, Order ${data.menuActions?.order || 0}`}
                        </Text>
                    ) : null}
                    {hasSearchTerms ? (
                        <Text type="secondary">
                            {`Top searches: ${data.topSearchTerms.map((term: any) => `${term.term} (${term.count})`).join(', ')}`}
                        </Text>
                    ) : null}
                    <Text type="secondary">
                        {`No-result searches: ${data?.metrics?.zeroResultSearches || 0}`}
                    </Text>
                    {hasUnavailable ? (
                        <Text type="secondary">
                            {`Unavailable interest: ${data.unavailableItems.map((item: any) => `${item.name || item.itemId} (${item.clicks})`).join(', ')}`}
                        </Text>
                    ) : null}
                </Flex>
            </Card>
        );
    };

    const renderTodaySoFar = () => {
        if (loadingToday) {
            return (
                <Card size="small" title={<Text strong>Today so far</Text>}>
                    <Flex align="center" gap={8}>
                        <DotLoading color="primary" />
                        <Text type="secondary">Loading current activity</Text>
                    </Flex>
                </Card>
            );
        }

        if (!today) return null;

        const updatedLabel = today.lastUpdated
            ? today.lastUpdated.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
            : null;

        return (
            <Card size="small" title={<Text strong>Today so far</Text>}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {updatedLabel
                        ? `Updated ${updatedLabel}. This is today's partial activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals. Those views update tomorrow.`
                        : "This is today's partial activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals. Those views update tomorrow."}
                </Text>
                {renderMetricsCards(today.metrics)}
                <div style={{ marginTop: 12 }}>
                    {renderDemandAndActions(today)}
                </div>
                {!showHistorical ? (
                    <div style={{ marginTop: 12 }}>
                        <Button block onClick={() => setShowHistorical(true)}>
                            View settled analytics
                        </Button>
                    </div>
                ) : null}
            </Card>
        );
    };

    const renderTopItems = (items?: any[]) => items?.length ? (
        <Card size="small" title={<Text strong>{t('topItems')}</Text>}>
            <List>
                {items.slice(0, 5).map((item: any, index: number) => (
                    <List.Item
                        key={item.itemId || index}
                        prefix={<Tag>{index + 1}</Tag>}
                        extra={<Tag>{`${item.clicks} clicks`}</Tag>}
                        title={<Text>{item.name || item.itemId}</Text>}
                    />
                ))}
            </List>
        </Card>
    ) : null;

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

        if (!periodData || viewMode === 'overview') return null;

        const dateLabel = viewMode === 'daily' && periodData.date
            ? new Date(periodData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'long' })
            : viewMode === 'weekly' && periodData.weekStart && periodData.weekEnd
                ? `${new Date(periodData.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(periodData.weekEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                : viewMode === 'monthly' && periodData.monthStart
                    ? new Date(periodData.monthStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : viewModeLabel;

        return (
            <>
                <Tag
                    color={viewMode === 'daily' && periodData.isLowActivity ? 'warning' : 'processing'}
                    style={FULL_WIDTH_TAG_STYLE}
                >
                    {viewMode === 'daily' && periodData.isLowActivity
                        ? `${dateLabel} · ${t('lowActivity')}`
                        : dateLabel}
                </Tag>

                {renderAiSummary(periodData.aiSummary)}

                <Card size="small" title={<Text strong>{viewModeLabel}</Text>}>
                    {renderMetricsCards(periodData.metrics)}
                    {viewMode === 'monthly' && periodData.daysWithData > 0 ? (
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                            {`${periodData.daysWithData} active days this month`}
                        </Text>
                    ) : null}
                </Card>

                {renderTopItems(periodData.topItems)}
                {renderDemandAndActions(periodData)}
            </>
        );
    };

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar
                onBack={onBack}
                right={
                    <Flex align="center" gap={8}>
                        <Button fill="none" onClick={handleRefresh} style={{ paddingInline: 8 }}>
                            <LuRefreshCw size={18} color={token.colorTextTertiary} />
                        </Button>
                    </Flex>
                }
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle', { offering: labels.offeringLower })}
                    title={t('title')}
                />
                <ProjectSelectorTrigger
                    clickable={projectsList.length > 1}
                    currentProject={{
                        active: selectedProjectSummary?.active !== false,
                        deleted: selectedProjectSummary?.deleted === true,
                        id: selectedProjectId,
                        isDefault: selectedProjectSummary?.isDefault,
                        isSpecialMenu: selectedProjectSummary?.isSpecialMenu === true,
                        name: selectedProjectSummary?.name || t('unnamedProject'),
                        specialMenuBaseProjectId: selectedProjectSummary?.specialMenuBaseProjectId,
                        specialMenuBaseProjectName: selectedProjectSummary?.specialMenuBaseProjectId
                            ? projectsList.find((project: any) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
                            : undefined,
                        specialMenuEndsAt: selectedProjectSummary?.specialMenuEndsAt,
                        specialMenuStatus: selectedProjectSummary?.specialMenuStatus,
                    }}
                    onClick={projectsList.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />

                {renderTodaySoFar()}

                {showHistorical ? (
                    <>
                        <Card size="small">
                            <Tabs activeKey={viewMode} onChange={handleViewModeChange}>
                                <Tabs.Tab title={t('overview')} key="overview" />
                                <Tabs.Tab title={t('daily')} key="daily" />
                                <Tabs.Tab title={t('weekly')} key="weekly" />
                                <Tabs.Tab title={t('monthly')} key="monthly" />
                            </Tabs>
                        </Card>

                        {viewMode === 'overview' ? (
                            <Tag
                                color={overviewStatus.color}
                                style={FULL_WIDTH_TAG_STYLE}
                            >
                                {overviewStatus.text}
                            </Tag>
                        ) : null}
                    </>
                ) : null}

                {showHistorical && isLoading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">{t('loading')}</Text>
                        </Flex>
                    </Card>
                ) : showHistorical && viewMode !== 'overview' ? (
                    <>
                        {renderPeriodView()}

                        {overall?.lifetimeMetrics ? (
                            <Card size="small" title={<Text strong>{t('allTime')}</Text>}>
                                <Flex gap={12} wrap>
                                    {renderMetricTile(t('totalScans'), overall.lifetimeMetrics.totalViews?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile(t('totalClicks'), overall.lifetimeMetrics.totalClicks?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('Customer Actions', overall.lifetimeMetrics.totalMenuActionClicks?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('Searches', overall.lifetimeMetrics.totalSearches?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('No-result Searches', overall.lifetimeMetrics.totalZeroResultSearches?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('Unavailable Interest', overall.lifetimeMetrics.totalUnavailableItemTaps?.toLocaleString() || '0', undefined, 4)}
                                </Flex>
                                {overall.firstDataDate ? (
                                    <Text type="secondary">
                                        {`Since ${new Date(overall.firstDataDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                    </Text>
                                ) : null}
                            </Card>
                        ) : null}

                        {!currentViewData ? (
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
                ) : showHistorical ? (
                    <>
                        {wtd ? (
                            <Card size="small" title={<Text strong>{t('last7Days')}</Text>}>
                                {renderMetricsCards(wtd.metrics)}
                            </Card>
                        ) : null}
                        {renderDemandAndActions(wtd)}

                        {/* Customer App (installable PWA) — store-scoped analytics.
                            Sits alongside menu analytics on purpose: owners see both in one place. */}
                        <MobileCustomerAppMetrics />

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
                                                    {week.isCurrentWeek ? <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>Now</Tag> : null}
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
                                </Flex>
                                {mtd.daysWithData > 0 ? (
                                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                                        {`${mtd.daysWithData} active days this month`}
                                    </Text>
                                ) : null}
                            </Card>
                        ) : null}
                        {renderDemandAndActions(mtd)}

                        {storeDetails?.healthSignals ? (
                            (() => {
                                const hs = storeDetails.healthSignals;
                                const showTrust = FEATURE_FLAGS.ENABLE_TRUST_HEALTH_SIGNAL && hs.trust?.visible;
                                const showLoyalty = FEATURE_FLAGS.ENABLE_LOYALTY_HEALTH_SIGNAL && hs.loyalty?.visible;
                                const showRisk = FEATURE_FLAGS.ENABLE_RISK_DECLINE_DETECTION && hs.risk?.visible;
                                if (!showTrust && !showLoyalty && !showRisk) return null;
                                return (
                                    <Card size="small" title={<Text strong>{t('businessHealth')}</Text>}>
                                        <List>
                                            {showTrust && hs.trust ? (
                                                <List.Item
                                                    key="trust"
                                                    prefix={<LuShield color={trustColors[hs.trust.state] || token.colorPrimary} size={14} />}
                                                    extra={<Tag color="processing">{hs.trust.state}</Tag>}
                                                    title={<Text>{t('trust')}</Text>}
                                                />
                                            ) : null}
                                            {showLoyalty && hs.loyalty ? (
                                                <List.Item
                                                    key="loyalty"
                                                    prefix={<LuHeart color={trustColors[hs.loyalty.state] || token.colorPrimary} size={14} />}
                                                    extra={<Tag color="processing">{hs.loyalty.state}</Tag>}
                                                    title={<Text>{t('loyalty')}</Text>}
                                                />
                                            ) : null}
                                            {showRisk && hs.risk ? (
                                                <List.Item
                                                    key="risk"
                                                    prefix={<LuTrendingDown color={riskColors[hs.risk.state] || token.colorSuccess} size={14} />}
                                                    extra={<Tag color="warning">{RISK_LABELS[hs.risk.state] || hs.risk.state}</Tag>}
                                                    title={<Text>{t('health')}</Text>}
                                                />
                                            ) : null}
                                        </List>
                                    </Card>
                                );
                            })()
                        ) : null}

                        {wtd?.topItems?.length ? (
                            <Card size="small" title={<Text strong>{t('topItems')}</Text>}>
                                <List>
                                    {wtd.topItems.slice(0, 5).map((item: any, index: number) => (
                                        <List.Item
                                            key={item.itemId || index}
                                            prefix={<Tag>{index + 1}</Tag>}
                                            extra={<Tag>{`${item.clicks} clicks`}</Tag>}
                                            title={<Text>{item.name || item.itemId}</Text>}
                                        />
                                    ))}
                                </List>
                            </Card>
                        ) : null}

                        {overall?.lifetimeMetrics ? (
                            <Card size="small" title={<Text strong>{t('allTime')}</Text>}>
                                <Flex gap={12} wrap>
                                    {renderMetricTile(t('totalScans'), overall.lifetimeMetrics.totalViews?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile(t('totalClicks'), overall.lifetimeMetrics.totalClicks?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('Customer Actions', overall.lifetimeMetrics.totalMenuActionClicks?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('Searches', overall.lifetimeMetrics.totalSearches?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('No-result Searches', overall.lifetimeMetrics.totalZeroResultSearches?.toLocaleString() || '0', undefined, 4)}
                                    {renderMetricTile('Unavailable Interest', overall.lifetimeMetrics.totalUnavailableItemTaps?.toLocaleString() || '0', undefined, 4)}
                                </Flex>
                                {overall.menuActions ? (
                                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                        {`Actions: Call ${overall.menuActions.call}, WhatsApp ${overall.menuActions.whatsapp}, Directions ${overall.menuActions.directions}, Reserve ${overall.menuActions.reserve}, Order ${overall.menuActions.order}`}
                                    </Text>
                                ) : null}
                                {overall.firstDataDate ? (
                                    <Text type="secondary">
                                        {`Since ${new Date(overall.firstDataDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                    </Text>
                                ) : null}
                            </Card>
                        ) : null}

                        {!overview && !overall ? (
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
                ) : null}
            </Flex>

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
