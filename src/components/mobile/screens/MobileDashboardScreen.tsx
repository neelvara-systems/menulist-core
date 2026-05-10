'use client'

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { OwnerDashboardViewMode } from '@template/main-app/projects/types';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { LuBarChart3, LuCalendar, LuEye, LuFlame, LuHeart, LuInfo, LuRefreshCw, LuShield, LuTrendingDown, LuTrendingUp, LuZap } from 'react-icons/lu';
import { ProjectSelectorTrigger } from '../../shared/ProjectSelector';
import { Button, Card, DotLoading, Flex, List, Popover, Tabs, Tag, Text, Title, Toast } from '../antd';
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
const MobileOwnerActionPlanCard = dynamic(
    () => import('./dashboardSections/MobileOwnerActionPlanCard'),
    { ssr: false },
);

interface MobileDashboardScreenProps {
    onBack: () => void;
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

function formatUpdatedTime(value?: Date | string): string | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function resolveDashboardText(value: unknown, language: string, fallback = ''): string {
    if (typeof value === 'string') return value.trim() || fallback;
    if (!value || typeof value !== 'object') return fallback;

    const localized = value as Record<string, unknown>;
    const direct = localized[language];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    const english = localized.en;
    if (typeof english === 'string' && english.trim()) return english.trim();
    const firstValue = Object.values(localized).find((entry): entry is string => (
        typeof entry === 'string' && entry.trim().length > 0
    ));

    return firstValue?.trim() || fallback;
}

function buildProjectAnalyticsLabels(project: any, language: string) {
    const itemNames: Record<string, string> = {};
    const categoryNames: Record<string, string> = {};
    const files = Array.isArray(project?.files)
        ? project.files
        : Array.isArray(project?.projectData?.files)
            ? project.projectData.files
            : [];

    files.forEach((file: any) => {
        const data = file?.extractedData?.data;
        (data?.categories || []).forEach((category: any) => {
            if (!category?.id) return;
            const label = resolveDashboardText(category.name, language, category.id);
            if (label) categoryNames[category.id] = label;
        });
        (data?.items || []).forEach((item: any) => {
            if (!item?.id) return;
            const label = resolveDashboardText(item.name, language, item.id);
            if (label) itemNames[item.id] = label;
        });
    });

    return { categoryNames, itemNames };
}

export default function MobileDashboardScreen({ onBack, onOpenDesignEditor }: MobileDashboardScreenProps) {
    const t = useTranslations('MobileDashboard');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const labels = useOfferingLabels();
    const {
        isLoading: loadingProjects,
        projectsList,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
    } = useMobileProjects();
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
    const obpDashboard = useOBPDashboard({ loadHistorical: showHistorical });

    const viewModeLabel = viewMode === 'today'
        ? 'Today'
        : viewMode === 'overview'
            ? t('overview')
            : viewMode === 'daily'
                ? t('daily')
                : viewMode === 'weekly'
                    ? t('weekly')
                    : viewMode === 'monthly'
                        ? t('monthly')
                        : 'Overall';

    const handleRefresh = useCallback(async () => {
        try {
            await refetch();
            Toast.show({ content: t('refreshed'), duration: 1000 });
        } catch {
            Toast.show({ content: t('failedToRefresh'), duration: 1500 });
        }
    }, [refetch]);

    const handleViewModeChange = useCallback((key: string) => {
        const nextMode = key as OwnerDashboardViewMode;
        setShowHistorical(nextMode !== 'today');
        setViewMode(nextMode);
    }, [setViewMode]);

    const dashboardLanguage = selectedProject?.defaultLanguage
        || selectedProjectSummary?.defaultLanguage
        || storeDetails?.defaultLanguage
        || 'en';
    const dashboardLabels = useMemo(
        () => buildProjectAnalyticsLabels(selectedProject, dashboardLanguage),
        [dashboardLanguage, selectedProject]
    );
    const enrichTopItems = useCallback((items?: any[]) => (
        Array.isArray(items)
            ? items.map((item) => ({
                ...item,
                name: dashboardLabels.itemNames[item.itemId] || item.name,
            }))
            : items
    ), [dashboardLabels.itemNames]);
    const enrichTopCategories = useCallback((categories?: any[]) => (
        Array.isArray(categories)
            ? categories.map((category) => ({
                ...category,
                name: dashboardLabels.categoryNames[category.categoryId] || category.name,
            }))
            : categories
    ), [dashboardLabels.categoryNames]);
    const enrichViewData = useCallback((viewData?: any) => (
        viewData
            ? {
                ...viewData,
                topCategories: enrichTopCategories(viewData.topCategories),
                topItems: enrichTopItems(viewData.topItems),
                unavailableItems: enrichTopItems(viewData.unavailableItems),
            }
            : viewData
    ), [enrichTopCategories, enrichTopItems]);
    const enrichedData = useMemo(() => {
        if (!data) return data;
        return {
            ...data,
            daily: enrichViewData(data.daily),
            monthly: enrichViewData(data.monthly),
            mtd: enrichViewData(data.mtd),
            overall: data.overall
                ? {
                    ...data.overall,
                    topCategories: enrichTopCategories(data.overall.topCategories),
                    topItems: enrichTopItems(data.overall.topItems),
                }
                : data.overall,
            overview: data.overview
                ? {
                    ...data.overview,
                    mtd: enrichViewData(data.overview.mtd),
                    wtd: enrichViewData(data.overview.wtd),
                    yesterday: enrichViewData(data.overview.yesterday),
                }
                : data.overview,
            today: enrichViewData(data.today),
            weekly: enrichViewData(data.weekly),
            wtd: enrichViewData(data.wtd),
        };
    }, [data, enrichTopCategories, enrichTopItems, enrichViewData]);

    const currentViewData = useMemo(() => {
        switch (viewMode) {
            case 'today':
                return enrichedData?.today || null;
            case 'daily':
                return enrichedData?.daily || null;
            case 'weekly':
                return enrichedData?.weekly || null;
            case 'monthly':
                return enrichedData?.monthly || null;
            case 'overall':
                return enrichedData?.overall || null;
            case 'overview':
            default:
                return enrichedData?.overview || null;
        }
    }, [enrichedData?.daily, enrichedData?.monthly, enrichedData?.overall, enrichedData?.overview, enrichedData?.today, enrichedData?.weekly, viewMode]);

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

    const overview = enrichedData?.overview;
    const today = enrichedData?.today;
    const overall = enrichedData?.overall;
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
        ? loadingToday && !today && obpDashboard.loadingToday && !obpDashboard.data?.today
        : viewMode === 'overview'
        ? loading && !data
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

    const renderDemandAndActions = (data?: any) => {
        const hasActions = Object.values(data?.menuActions || {}).some((value) => Number(value) > 0);
        const hasTopCategories = Boolean(data?.topCategories?.length);
        const hasTopLanguages = Boolean(data?.topLanguages?.length);
        const hasTopFilters = Boolean(data?.topAttributeFilters?.length);
        const hasSearchTerms = Boolean(data?.topSearchTerms?.length);
        const hasZeroResultTerms = Boolean(data?.topZeroResultSearchTerms?.length);
        const hasUnavailable = Boolean(data?.unavailableItems?.length);
        const hasZeroResultSearches = Number(data?.metrics?.zeroResultSearches || 0) > 0;

        return (
            <Card size="small" title={<Text strong>Customer Intent</Text>}>
                <Flex gap={8} vertical>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Searches are de-duplicated within a session. Actions count final clicks only, and unavailable interest shows demand rather than confirmed lost sales.
                    </Text>
                    {!hasActions && !hasTopCategories && !hasTopLanguages && !hasTopFilters && !hasSearchTerms && !hasZeroResultTerms && !hasUnavailable && !hasZeroResultSearches ? (
                        <Text type="secondary">No customer intent yet for this period.</Text>
                    ) : null}
                    {hasActions ? (
                        <Text type="secondary">
                            {`Actions: Call ${data.menuActions?.call || 0}, WhatsApp ${data.menuActions?.whatsapp || 0}, Directions ${data.menuActions?.directions || 0}, Reserve ${data.menuActions?.reserve || 0}, Order ${data.menuActions?.order || 0}`}
                        </Text>
                    ) : null}
                    {hasTopCategories ? (
                        <Text type="secondary">
                            {`Top category: ${data.topCategories.slice(0, 3).map((category: any) => `${category.name || category.categoryId} (${category.views} views, ${category.clicks} taps)`).join(', ')}`}
                        </Text>
                    ) : null}
                    {hasTopLanguages ? (
                        <Text type="secondary">
                            {`Top languages: ${data.topLanguages.slice(0, 3).map((language: any) => `${language.label || language.language} (${language.menuSessions || language.menuViews} sessions/views, ${language.adoptions || 0} stayed switches)`).join(', ')}`}
                        </Text>
                    ) : null}
                    {hasTopFilters ? (
                        <Text type="secondary">
                            {`Top filters: ${data.topAttributeFilters.slice(0, 3).map((filter: any) => `${filter.label || filter.filterId} (${filter.interactions} intent, ${filter.actionClicks} actions)`).join(', ')}`}
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
                    {hasZeroResultTerms ? (
                        <Text type="secondary">
                            {`No-result terms: ${data.topZeroResultSearchTerms.map((term: any) => `${term.term} (${term.count})`).join(', ')}`}
                        </Text>
                    ) : null}
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

        const updatedLabel = formatUpdatedTime(data?.lastFetched);
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

    const renderTopItems = (items?: any[]) => (
        <Card size="small" title={<Text strong>{t('topItems')}</Text>}>
            {items?.length ? (
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
            ) : (
                <Text type="secondary">No top items yet for this period.</Text>
            )}
        </Card>
    );

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
            ? new Date(periodData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })
            : viewMode === 'weekly' && periodData.weekStart && periodData.weekEnd
                ? `${new Date(periodData.weekStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(periodData.weekEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                : viewMode === 'monthly' && periodData.monthStart
                    ? new Date(periodData.monthStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
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
                            {`Since ${new Date(overall.firstDataDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
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
        ? new Date(dailyHeaderData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })
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
                <ProjectSelectorTrigger
                    clickable={projectsList.length > 1}
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
                    onClick={projectsList.length > 1 ? () => setIsProjectSelectorOpen(true) : undefined}
                />

                <div style={stickyHistoricalHeaderStyle}>
                    <Card className="mobile-dashboard-tabs-card" size="small">
                        <div className="mobile-dashboard-tabs">
                            <Tabs activeKey={viewMode} centered onChange={handleViewModeChange}>
                                <Tabs.Tab title="Today" key="today" />
                                <Tabs.Tab title={t('overview')} key="overview" />
                                <Tabs.Tab title={t('daily')} key="daily" />
                                <Tabs.Tab title={t('weekly')} key="weekly" />
                                <Tabs.Tab title={t('monthly')} key="monthly" />
                                <Tabs.Tab title="Overall" key="overall" />
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
                        {renderTopItems(today?.topItems)}
                        {renderDemandAndActions(today)}
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
                        {renderTopItems(overall?.topItems)}
                        {renderDemandAndActions(overall ? {
                            ...overall,
                            metrics: {
                                zeroResultSearches: overall.lifetimeMetrics?.totalZeroResultSearches || 0,
                            },
                        } : null)}

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
                        {renderTopItems((currentViewData as any)?.topItems)}
                        {renderDemandAndActions(currentViewData)}
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
                        {renderTopItems(wtd?.topItems)}
                        {renderDemandAndActions(wtd)}

                        <MobileOwnerActionPlanCard
                            actionPlan={enrichedData?.ownerActionPlan || overview?.ownerActionPlan}
                            confidence={enrichedData?.ownerConfidence || overview?.ownerConfidence}
                            sourceQuality={enrichedData?.sourceQuality || overview?.sourceQuality || []}
                            analyticsAiEntitlement={enrichedData?.analyticsAiEntitlement || overview?.analyticsAiEntitlement}
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
