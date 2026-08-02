'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useOwnerBusinessAnalyticsIndex } from '@hook/ownerBusinessAssistant/useOwnerBusinessAnalyticsIndex';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import {
    buildOwnerBusinessActivityMetrics,
    getOwnerBusinessPrimaryAnalyticsPeriod,
} from '@lib/ownerBusinessAssistant/businessSignals';
import { buildOwnerActionLayer, type OwnerActionId, type OwnerActionItem } from '@lib/ownerActions/buildOwnerActionLayer';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { useOwnerDashboard } from '@hook/useOwnerDashboard';
import { getOwnerBusinessHealthFreshnessNote } from '@lib/ownerBusinessAssistant/freshness';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    type AISummary,
    type MonthlyViewData,
    type OwnerDashboardMetrics,
    type OwnerDashboardViewMode,
    type WeeklyViewData,
    type DailyViewData,
} from '@template/main-app/projects/types';
import { formatDateKey, formatDateTime, type IntlFormatter } from '@util/dateTime';
import { formatNumber } from '@util/formatters';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { LuAlertTriangle, LuBarChart3, LuCalendar, LuClock, LuEye, LuFlame, LuHeart, LuImage, LuInfo, LuLink, LuListChecks, LuMessageCircle, LuQrCode, LuRefreshCw, LuShield, LuTrendingDown, LuTrendingUp, LuUtensils, LuZap } from 'react-icons/lu';
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
    onOpenMenuTab?: () => void;
    onOpenMoreScreen?: (screen: 'aiMenuManager' | 'businessProfileHub' | 'domainSettings' | 'feedback' | 'hoursEdit' | 'officialPage' | 'presenceMonitor' | 'tempStatus') => void;
    onOpenShareTab?: () => void;
}

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

const renderOwnerActionIcon = (id: OwnerActionId) => {
    if (id === 'set_hours' || id === 'set_today_status') return <LuCalendar size={15} />;
    if (id === 'set_customer_link' || id === 'place_customer_link') return <LuLink size={15} />;
    if (id === 'open_private_feedback') return <LuMessageCircle size={15} />;
    if (id === 'prepare_staff_handoff') return <LuQrCode size={15} />;
    if (id === 'capture_daily_change' || id === 'update_prices') return <LuListChecks size={15} />;
    return <LuUtensils size={15} />;
};

export default function MobileDashboardScreen({
    onBack,
    onOpenBusinessHealth,
    onOpenDesignEditor,
    onOpenMenuTab,
    onOpenMoreScreen,
    onOpenShareTab,
}: MobileDashboardScreenProps) {
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

    const getViewModeLabel = useCallback((mode: OwnerDashboardViewMode) => t(`viewModes.${mode}`), [t]);
    const viewModeLabel = getViewModeLabel(viewMode);

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
    const selectedPeriodData: DailyViewData | WeeklyViewData | MonthlyViewData | null = viewMode === 'daily'
        ? data?.daily || null
        : viewMode === 'weekly'
            ? data?.weekly || null
            : viewMode === 'monthly'
                ? data?.monthly || null
                : null;
    const businessHealthMetrics = useMemo(
        () => buildOwnerBusinessActivityMetrics(getOwnerBusinessPrimaryAnalyticsPeriod(businessHealthAnalytics?.periods))
            .map((metric) => ({ ...metric, delta: metric.detail })),
        [businessHealthAnalytics?.periods],
    );
    const businessHealthFreshnessNote = getOwnerBusinessHealthFreshnessNote(businessHealthCurrent);
    const ownerActionLayer = useMemo(() => (
        FEATURE_FLAGS.ENABLE_OWNER_ACTION_LAYER && !loadingProjects && selectedProjectId
            ? buildOwnerActionLayer({
                project: selectedProjectSummary,
                storeDetails,
            })
            : null
    ), [loadingProjects, selectedProjectId, selectedProjectSummary, storeDetails]);

    const handleOwnerAction = useCallback((item: OwnerActionItem) => {
        const target = item.mobileTarget;
        if (target.type === 'menuTab') {
            onOpenMenuTab?.();
            return;
        }
        if (target.type === 'shareTab') {
            onOpenShareTab?.();
            return;
        }
        onOpenMoreScreen?.(target.screen);
    }, [onOpenMenuTab, onOpenMoreScreen, onOpenShareTab]);

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
                            <Text strong>{t('unableToLoad')}</Text>
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {t('refreshOrContactSupport')}
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
    const hasPublicLink = Boolean(storeDetails?.customDomain || storeDetails?.subdomain);
    const hasWorkingHours = Boolean(storeDetails?.workingHours && Object.values(storeDetails.workingHours as Record<string, unknown>).some(Boolean));
    const confirmedPlacementCount = ['googleBusiness', 'instagramBio', 'whatsappProfile']
        .filter((surface) => Boolean(storeDetails?.menuPresence?.[surface as keyof NonNullable<typeof storeDetails.menuPresence>])).length;
    const feedbackReady = storeDetails ? storeDetails.feedbackEnabled !== false : false;
    const hasConfirmedPlacement = confirmedPlacementCount > 0;
    const selectedMenuIsLive = selectedProjectSummary?.active !== false;
    const attentionItems = [
        !selectedMenuIsLive ? { key: 'menu', label: 'Menu is hidden', action: 'Open menu', onClick: onOpenMenuTab } : null,
        !hasWorkingHours ? { key: 'hours', label: 'Hours are missing', action: 'Set hours', onClick: () => onOpenMoreScreen?.('hoursEdit') } : null,
        !hasPublicLink ? { key: 'public-link', label: 'Customer link is not ready', action: 'Set link', onClick: () => onOpenMoreScreen?.('domainSettings') } : null,
    ].filter(Boolean) as Array<{ action: string; key: string; label: string; onClick?: () => void }>;
    const publicSourceTitle = attentionItems.length
        ? 'Needs attention'
        : hasConfirmedPlacement
            ? 'Official customer source is active'
            : 'Customer link is ready to place';
    const publicSourceDescription = attentionItems.length
        ? 'Fix menu, hours, or the customer link first.'
        : hasConfirmedPlacement
            ? 'No action needed.'
            : 'Add the same link to Google, Instagram, WhatsApp, QR, or print.';

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

    const renderMetricsCards = (metrics?: OwnerDashboardMetrics) => (
        <Flex gap={12} wrap>
            {renderMetricTile(labels.scansLabel, formatNumber(metrics?.menuVisits || 0), <LuEye color={token.colorPrimary} size={14} />)}
            {renderMetricTile(t('itemTaps'), formatNumber(metrics?.itemClicks || 0), <LuFlame color={token.colorWarning} size={14} />)}
            {renderMetricTile(t('engagedSessions'), `${metrics?.engagedSessionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={14} />)}
            {renderMetricTile(t('actionRate'), `${metrics?.actionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={14} />)}
            {renderMetricTile(t('customerActions'), formatNumber(metrics?.menuActionClicks || 0), <LuHeart color={token.colorSuccess} size={14} />)}
            {renderMetricTile(t('searches'), formatNumber(metrics?.searches || 0), <LuBarChart3 color={token.colorInfo} size={14} />)}
            {renderMetricTile(t('noResultSearches'), formatNumber(metrics?.zeroResultSearches || 0), <LuTrendingDown color={token.colorWarning} size={14} />)}
            {renderMetricTile(t('unavailableInterest'), formatNumber(metrics?.unavailableItemTaps || 0), <LuShield color={token.colorWarning} size={14} />)}
            {metrics && metrics.smartPicksRendered > 0 ? (
                <>
                    {renderMetricTile(t('smartPicks'), formatNumber(metrics.smartPicksRendered), <LuZap color={token.colorInfo} size={14} />)}
                    {renderMetricTile(t('spClicks'), formatNumber(metrics.smartPicksClicks || 0), <LuZap color={token.colorSuccess} size={14} />)}
                </>
            ) : null}
        </Flex>
    );

    const renderPublicTruthStatus = () => (
        <Card size="small">
            <Flex gap={14} vertical>
                <Flex align="center" justify="space-between" gap={10}>
                    <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                        <LuShield color={attentionItems.length ? token.colorWarning : token.colorSuccess} size={22} />
                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                            <Text strong style={{ fontSize: 16 }}>
                                {publicSourceTitle}
                            </Text>
                            <Text type="secondary">
                                {publicSourceDescription}
                            </Text>
                        </Flex>
                    </Flex>
                    <Tag color={hasPublicLink && selectedMenuIsLive ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                        {hasPublicLink && selectedMenuIsLive ? 'Link ready' : 'Not ready'}
                    </Tag>
                </Flex>

                <Flex gap={8} wrap>
                    <Tag color={selectedMenuIsLive ? 'success' : 'warning'} style={{ marginInlineEnd: 0 }}>
                        Menu: {selectedMenuIsLive ? 'Live' : 'Hidden'}
                    </Tag>
                    <Tag color={hasWorkingHours ? 'success' : 'warning'} style={{ marginInlineEnd: 0 }}>
                        Hours: {hasWorkingHours ? 'Set' : 'Missing'}
                    </Tag>
                    <Tag color={hasPublicLink ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                        Link: {hasPublicLink ? 'Ready' : 'Missing'}
                    </Tag>
                    <Tag color={hasConfirmedPlacement ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                        Placed: {confirmedPlacementCount}/3
                    </Tag>
                    <Tag color={feedbackReady ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                        Feedback: {feedbackReady ? 'On' : 'Off'}
                    </Tag>
                </Flex>

                {attentionItems.length ? (
                    <Flex gap={8} vertical>
                        <Text strong>Needs attention</Text>
                        {attentionItems.slice(0, 3).map((item) => (
                            <Card key={item.key} size="small" style={{ backgroundColor: token.colorFillAlter }}>
                                <Flex align="center" justify="space-between" gap={10}>
                                    <Text>{item.label}</Text>
                                    <Button
                                        color="primary"
                                        fill="outline"
                                        onClick={item.onClick}
                                        size="small"
                                        style={{ minHeight: 36 }}
                                    >
                                        {item.action}
                                    </Button>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );

    const renderQuickActions = () => (
        <Card size="small" title={<Text strong>Update what customers see</Text>}>
            <Flex gap={8} wrap>
                <Button fill="outline" onClick={onOpenMenuTab} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuUtensils size={15} /> Menu</Flex>
                </Button>
                <Button fill="outline" onClick={() => onOpenMoreScreen?.('hoursEdit')} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuClock size={15} /> Hours</Flex>
                </Button>
                <Button fill="outline" onClick={() => onOpenMoreScreen?.('tempStatus')} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuCalendar size={15} /> Today status</Flex>
                </Button>
                <Button fill="outline" onClick={() => onOpenMoreScreen?.('officialPage')} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuImage size={15} /> Photos</Flex>
                </Button>
                <Button fill="outline" onClick={() => onOpenMoreScreen?.('presenceMonitor')} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuLink size={15} /> Place link</Flex>
                </Button>
                <Button fill="outline" onClick={onOpenShareTab} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuQrCode size={15} /> QR</Flex>
                </Button>
                <Button fill="outline" onClick={() => onOpenMoreScreen?.('feedback')} style={{ minHeight: 44 }}>
                    <Flex align="center" gap={6}><LuMessageCircle size={15} /> Feedback</Flex>
                </Button>
            </Flex>
        </Card>
    );

    const renderOwnerActionLayer = () => ownerActionLayer ? (
        <Card size="small" title={<Text strong>Next owner action</Text>}>
            <Flex gap={12} vertical>
                <Flex gap={8} vertical>
                    <Flex align="center" gap={8} wrap>
                        {renderOwnerActionIcon(ownerActionLayer.primaryAction.id)}
                        <Text strong>{ownerActionLayer.primaryAction.label}</Text>
                        <Tag color={ownerActionLayer.primaryAction.tone === 'attention' ? 'warning' : 'success'} style={{ marginInlineEnd: 0 }}>
                            {ownerActionLayer.primaryAction.statusLabel}
                        </Tag>
                    </Flex>
                    <Text type="secondary">{ownerActionLayer.primaryAction.description}</Text>
                    <Flex gap={8} wrap>
                        <Tag color={ownerActionLayer.statusLabel === 'Stable' ? 'success' : 'warning'} style={{ marginInlineEnd: 0 }}>
                            {ownerActionLayer.statusLabel}
                        </Tag>
                        <Tag color={ownerActionLayer.placement.confirmedCount > 0 ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
                            {ownerActionLayer.placement.latestConfirmedLabel}
                        </Tag>
                    </Flex>
                </Flex>
                <Button block color="primary" onClick={() => handleOwnerAction(ownerActionLayer.primaryAction)} size="large">
                    <Flex align="center" gap={6} justify="center">
                        {renderOwnerActionIcon(ownerActionLayer.primaryAction.id)}
                        Open
                    </Flex>
                </Button>
                <Flex gap={8} wrap>
                    {ownerActionLayer.supportingActions.slice(0, 6).map((item) => (
                        <Button
                            fill="outline"
                            key={item.id}
                            onClick={() => handleOwnerAction(item)}
                            style={{ minHeight: 44 }}
                        >
                            <Flex align="center" gap={6}>
                                {renderOwnerActionIcon(item.id)}
                                {item.label}
                            </Flex>
                        </Button>
                    ))}
                </Flex>
            </Flex>
        </Card>
    ) : null;

    const renderTodaySoFar = () => {
        if (loadingToday) {
            return (
                <Card size="small" title={<Text strong>{t('menu')}</Text>}>
                    <Flex align="center" gap={8}>
                        <DotLoading color="primary" />
                        <Text type="secondary">{t('loadingCurrentActivity')}</Text>
                    </Flex>
                </Card>
            );
        }

        if (!today) {
            return (
                <Card size="small" title={<Text strong>{t('menu')}</Text>}>
                    <Text type="secondary" style={{ display: 'block' }}>
                        {t('noMenuActivityToday')}
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
                        ? t('todayPartialActivityUpdated', { updated: updatedLabel })
                        : t('todayPartialActivity')}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                    {t('refreshHint')}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                    {t('metricsHint')}
                </Text>
                {topSearch ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {t('topSearchNow', { term: topSearch.term, count: topSearch.count })}
                    </Text>
                ) : null}
                {topFilter ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {t('topFilterNow', {
                            label: topFilter.label || topFilter.filterId,
                            interactions: topFilter.interactions,
                            actions: topFilter.actionClicks,
                        })}
                    </Text>
                ) : null}
                {topLanguage ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {t('topLanguageNow', {
                            label: topLanguage.label || topLanguage.language,
                            sessions: topLanguage.menuSessions || topLanguage.menuViews,
                            adoptions: topLanguage.adoptions || 0,
                        })}
                    </Text>
                ) : null}
                <Text style={{ display: 'block', marginTop: 8 }}>
                    {t('noResultSearchesSoFar', { count: today.metrics.zeroResultSearches || 0 })}
                </Text>
                {today.topZeroResultSearchTerms?.length ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {t('noResultTermsSoFar', { terms: today.topZeroResultSearchTerms.map((term) => `${term.term} (${term.count})`).join(', ') })}
                    </Text>
                ) : null}
                {topUnavailable ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {t('mostTappedUnavailableItem', { item: topUnavailable.name || topUnavailable.itemId, count: topUnavailable.clicks })}
                    </Text>
                ) : null}
                {hasActions ? (
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        {t('customerActionsBreakdown', {
                            call: today.menuActions?.call || 0,
                            whatsapp: today.menuActions?.whatsapp || 0,
                            directions: today.menuActions?.directions || 0,
                            reserve: today.menuActions?.reserve || 0,
                            order: today.menuActions?.order || 0,
                        })}
                    </Text>
                ) : null}
            </div>
        );

        return (
            <Card
                size="small"
                title={(
                    <Flex align="center" justify="space-between">
                        <Text strong>{t('menu')}</Text>
                        <Popover content={todayInfoContent} placement="bottom" trigger="click">
                            <Button
                                aria-label={t('menu')}
                                fill="none"
                                style={{ padding: 4 }}
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

    const renderAiSummary = (summary?: AISummary) => summary?.bulletPoints?.length ? (
        <Card size="small" title={<Text strong>{t('aiSummary')}</Text>}>
            <List>
                {summary.bulletPoints.map((bullet: string, index: number) => (
                    <List.Item key={`${bullet}-${index}`} title={<Text>{bullet}</Text>} />
                ))}
            </List>
        </Card>
    ) : null;

    const renderPeriodView = () => {
        const periodData = selectedPeriodData;

        if (viewMode === 'today' || viewMode === 'overview' || viewMode === 'overall') return null;
        if (!periodData) {
            return (
                <Card size="small" title={<Text strong>{viewModeLabel}</Text>}>
                    <Text type="secondary">{t('noMenuActivityForPeriod')}</Text>
                </Card>
            );
        }

        const dateLabel = viewMode === 'daily' && 'date' in periodData && periodData.date
            ? formatDateKey(periodData.date, formatter)
            : viewMode === 'weekly' && 'weekStart' in periodData && periodData.weekStart && periodData.weekEnd
                ? `${formatDateKey(periodData.weekStart, formatter)} - ${formatDateKey(periodData.weekEnd, formatter)}`
                : viewMode === 'monthly' && 'monthStart' in periodData && periodData.monthStart
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
                    {viewMode === 'monthly' && 'daysWithData' in periodData && periodData.daysWithData > 0 ? (
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                            {t('activeDaysThisMonth', { count: periodData.daysWithData })}
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
                        {renderMetricTile(t('totalScans'), formatNumber(overall.lifetimeMetrics.totalViews || 0), undefined, 4)}
                        {renderMetricTile(t('totalClicks'), formatNumber(overall.lifetimeMetrics.totalClicks || 0), undefined, 4)}
                        {renderMetricTile(t('engagedSessions'), `${overall.lifetimeMetrics.engagedSessionRate || 0}%`, undefined, 4)}
                        {renderMetricTile(t('actionRate'), `${overall.lifetimeMetrics.actionRate || 0}%`, undefined, 4)}
                        {renderMetricTile(t('customerActions'), formatNumber(overall.lifetimeMetrics.totalMenuActionClicks || 0), undefined, 4)}
                        {renderMetricTile(t('searches'), formatNumber(overall.lifetimeMetrics.totalSearches || 0), undefined, 4)}
                        {renderMetricTile(t('noResultSearches'), formatNumber(overall.lifetimeMetrics.totalZeroResultSearches || 0), undefined, 4)}
                        {renderMetricTile(t('unavailableInterest'), formatNumber(overall.lifetimeMetrics.totalUnavailableItemTaps || 0), undefined, 4)}
                    </Flex>
                    {overall.firstDataDate ? (
                        <Text type="secondary">
                            {t('since', { date: formatDateKey(overall.firstDataDate, formatter) })}
                        </Text>
                    ) : null}
                </Card>
            ) : (
                <Card size="small" title={<Text strong>{t('allTime')}</Text>}>
                    <Text type="secondary">{t('noLifetimeMenuActivityYet')}</Text>
                </Card>
            )}
        </>
    );

    const dailyHeaderData = viewMode === 'daily' ? data?.daily : null;
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
                                ? projectsList.find((project) => project.projectId === selectedProjectSummary.specialMenuBaseProjectId)?.name
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

                {renderPublicTruthStatus()}
                {renderOwnerActionLayer()}
                {renderQuickActions()}

                <div style={stickyHistoricalHeaderStyle}>
                    <Card className="mobile-dashboard-tabs-card" size="small">
                        <div className="mobile-dashboard-tabs">
                            <Tabs activeKey={viewMode} centered onChange={handleViewModeChange}>
                                <Tabs.Tab title={getViewModeLabel('today')} key="today" />
                                <Tabs.Tab title={getViewModeLabel('overview')} key="overview" />
                                <Tabs.Tab title={getViewModeLabel('daily')} key="daily" />
                                <Tabs.Tab title={getViewModeLabel('weekly')} key="weekly" />
                                <Tabs.Tab title={getViewModeLabel('monthly')} key="monthly" />
                                <Tabs.Tab title={getViewModeLabel('overall')} key="overall" />
                            </Tabs>
                        </div>
                    </Card>
                </div>

                <Flex align="center" justify="space-between">
                    <Title level={5} style={{ margin: 0 }}>
                        {viewMode === 'today' ? t('todaySoFar') : viewModeLabel}
                    </Title>
                    {viewMode === 'today' ? (
                        <Button aria-label={t('refreshHint')} fill="none" onClick={handleRefresh} style={{ paddingInline: 8 }}>
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
                        {t('settledTabHelper')}
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
                ) : viewMode !== 'overview' && viewMode !== 'graph' ? (
                    <>
                        {renderPeriodView()}
                        <MobileOBPMetricsCard
                            data={obpDashboard.data}
                            loading={obpDashboard.loading}
                            loadingToday={obpDashboard.loadingToday}
                            mode={viewMode}
                        />
                        <MobileMenuAnalyticsDetailsCard data={selectedPeriodData} />
                        {renderAiSummary(selectedPeriodData?.aiSummary)}

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
                                <Text type="secondary">{t('noSettledMenuActivityLast7Days')}</Text>
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
                            title={t('menuIntelligenceActionPlan')}
                            projectId={selectedProjectId}
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
                            const maxScans = Math.max(...historicalWeeks.map((week) => week.metrics.menuVisits || 0), 1);
                            return (
                                <Card size="small" title={
                                    <Flex align="center" gap={6}>
                                        <LuTrendingUp color={token.colorPrimary} size={14} />
                                        <Text strong>{t('fourWeekTrend')}</Text>
                                    </Flex>
                                }>
                                    <Flex gap={8} vertical>
                                        {historicalWeeks.map((week, idx) => {
                                            const pct = Math.round((week.metrics.menuVisits || 0) / maxScans * 100);
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
                                                        {formatNumber(week.metrics.menuVisits || 0)}
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
                                                            {t('now')}
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
                                    <Text strong>{t('thisMonth')}</Text>
                                </Flex>
                            }>
                                <Flex gap={12} wrap>
                                    {renderMetricTile(labels.scansLabel, formatNumber(mtd.metrics?.menuVisits || 0), <LuEye color={token.colorPrimary} size={12} />, 4)}
                                    {renderMetricTile(t('itemTaps'), formatNumber(mtd.metrics?.itemClicks || 0), <LuFlame color={token.colorWarning} size={12} />, 4)}
                                    {renderMetricTile(t('engagedSessions'), `${mtd.metrics?.engagedSessionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={12} />, 4)}
                                    {renderMetricTile(t('actionRate'), `${mtd.metrics?.actionRate || 0}%`, <LuTrendingUp color={token.colorSuccess} size={12} />, 4)}
                                </Flex>
                                {mtd.daysWithData > 0 ? (
                                    <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                                        {t('activeDaysThisMonth', { count: mtd.daysWithData })}
                                    </Text>
                                ) : null}
                            </Card>
                        ) : null}
                        <MobileMenuAnalyticsDetailsCard data={wtd} title={t('last7DaysMenuDetails')} />
                        <MobileMenuAnalyticsDetailsCard data={mtd} title={t('monthMenuDetails', { month: mtd?.monthName || t('thisMonth') })} />
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
