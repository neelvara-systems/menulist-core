'use client';

import { useDashboardOfferingLabels } from '@hook/useDashboardOfferingLabels';
import {
    formatDashboardPercent,
    getOwnerDashboardSourceLabel,
    type DashboardTranslator,
} from '@lib/analytics/ownerDashboardPresentation';
import type { OBPDashboardViewData } from '@hook/useOBPDashboard';
import type {
    DailyViewData,
    MenuActionBreakdown,
    OwnerDashboardData,
    OwnerDashboardTrendComparison,
    OwnerDashboardTrendMetric,
    OwnerDashboardTrendStatus,
    OwnerDashboardTrendSummary,
    SearchTerm,
    SourceQuality,
    TopItem,
} from '@template/main-app/projects/types';
import { formatInUserTimezone } from '@util/dateTime';
import { formatNumber } from '@util/formatters';
import { Card, Empty, Flex, Segmented, Tag, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';
import { LuActivity, LuMinus, LuMoveDown, LuMoveUp } from 'react-icons/lu';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

type GraphRange = '7d' | '30d';

interface OwnerDashboardGraphModeProps {
    data: OwnerDashboardData | null;
    obpData: OBPDashboardViewData | null;
}

interface TrendRow {
    date: string;
    label: string;
    scans: number;
    itemTaps: number;
    customerActions: number;
    searches: number;
    missingSearches: number;
    unavailableInterest: number;
    obpViews: number;
    obpActions: number;
}

interface BarRow {
    key: string;
    label: string;
    value: number;
    secondary?: number;
}

type ComparisonTrendKey = 'scans' | 'customerActions' | 'searches' | 'itemTaps' | 'unavailableInterest' | 'missingSearches';
type ComparisonTrendTone = 'positive' | 'problem';

const ACTION_KEYS: Array<keyof MenuActionBreakdown> = ['call', 'whatsapp', 'directions', 'reserve', 'order'];
const TREND_STABLE_CHANGE_PCT = 15;
const TREND_METRICS: OwnerDashboardTrendMetric[] = [
    'menu_activity',
    'customer_actions',
    'search_demand',
    'item_interest',
    'unavailable_demand',
    'missing_searches',
];
const TREND_SIGNAL_METRICS: OwnerDashboardTrendMetric[] = ['menu_activity', 'customer_actions', 'search_demand'];

function formatDateLabel(dateKey: string): string {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return formatInUserTimezone(date, { day: 'numeric', month: 'short' }, 'UTC');
}

function compactNumber(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return formatNumber(Math.round(value), {
        compactDisplay: 'short',
        maximumFractionDigits: 1,
        notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
    });
}

function addDaysToDateKey(dateKey: string, days: number): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split('T')[0];
}

function trendMetricLabel(metric: OwnerDashboardTrendMetric, t: DashboardTranslator): string {
    return t(`graph.metrics.${metric}`);
}

function trendMetricMinimum(metric: OwnerDashboardTrendMetric): number {
    if (metric === 'menu_activity') return 20;
    return 3;
}

function trendRowValue(row: TrendRow, metric: OwnerDashboardTrendMetric): number {
    if (metric === 'customer_actions') return row.customerActions;
    if (metric === 'search_demand') return row.searches;
    if (metric === 'item_interest') return row.itemTaps;
    if (metric === 'unavailable_demand') return row.unavailableInterest;
    if (metric === 'missing_searches') return row.missingSearches;
    return row.scans;
}

function getSamePeriodLastMonthRange(settlementDate: string) {
    const [year, month, day] = settlementDate.split('-').map(Number);
    const settled = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
    const currentStart = new Date(Date.UTC(settled.getUTCFullYear(), settled.getUTCMonth(), 1));
    const previousStart = new Date(Date.UTC(settled.getUTCFullYear(), settled.getUTCMonth() - 1, 1));
    const previousMonthEnd = new Date(Date.UTC(settled.getUTCFullYear(), settled.getUTCMonth(), 0));
    const daysToCompare = Math.min(settled.getUTCDate(), previousMonthEnd.getUTCDate());
    const previousEnd = new Date(previousStart);
    previousEnd.setUTCDate(previousStart.getUTCDate() + daysToCompare - 1);

    return {
        currentStart: currentStart.toISOString().split('T')[0],
        currentEnd: settlementDate,
        previousStart: previousStart.toISOString().split('T')[0],
        previousEnd: previousEnd.toISOString().split('T')[0],
    };
}

function getRowsInRange(rows: TrendRow[], startDate: string, endDate: string): TrendRow[] {
    return rows.filter((row) => row.date >= startDate && row.date <= endDate);
}

function buildTrendComparison(params: {
    rows: TrendRow[];
    metric: OwnerDashboardTrendMetric;
    period: 'week' | 'month';
    currentStart: string;
    currentEnd: string;
    previousStart: string;
    previousEnd: string;
    availableStartDate: string;
}): OwnerDashboardTrendComparison {
    const currentRows = getRowsInRange(params.rows, params.currentStart, params.currentEnd);
    const previousRows = getRowsInRange(params.rows, params.previousStart, params.previousEnd);
    const currentValue = currentRows.reduce((sum, row) => sum + trendRowValue(row, params.metric), 0);
    const previousValue = previousRows.reduce((sum, row) => sum + trendRowValue(row, params.metric), 0);
    const comparisonWindowCached = params.previousStart >= params.availableStartDate
        && params.currentStart >= params.availableStartDate;
    const enoughData = comparisonWindowCached
        && currentRows.length > 0
        && previousRows.length > 0
        && currentValue + previousValue >= trendMetricMinimum(params.metric);
    const changePct = previousValue > 0
        ? Math.round(((currentValue - previousValue) / previousValue) * 100)
        : currentValue > 0
            ? null
            : 0;
    let status: OwnerDashboardTrendStatus = 'not_enough_data';

    if (enoughData) {
        if (previousValue === 0 && currentValue > 0) {
            status = 'up';
        } else if (changePct !== null && Math.abs(changePct) < TREND_STABLE_CHANGE_PCT) {
            status = 'stable';
        } else if ((changePct || 0) > 0) {
            status = 'up';
        } else {
            status = 'down';
        }
    }

    return {
        metric: params.metric,
        period: params.period,
        label: params.metric,
        status,
        message: `${params.period}:${params.metric}:${status}`,
        currentValue,
        previousValue,
        changePct: enoughData ? changePct : null,
        currentStart: params.currentStart,
        currentEnd: params.currentEnd,
        previousStart: params.previousStart,
        previousEnd: params.previousEnd,
        currentDaysWithData: currentRows.length,
        previousDaysWithData: previousRows.length,
    };
}

function buildFallbackTrendSummary(rows: TrendRow[]): OwnerDashboardTrendSummary | undefined {
    if (rows.length === 0) return undefined;
    const availableStartDate = rows[0].date;
    const settlementDate = rows[rows.length - 1].date;
    const currentStart = addDaysToDateKey(settlementDate, -6);
    const previousEnd = addDaysToDateKey(currentStart, -1);
    const previousStart = addDaysToDateKey(previousEnd, -6);
    const monthRange = getSamePeriodLastMonthRange(settlementDate);
    const weekly = TREND_METRICS.map((metric) => buildTrendComparison({
        rows,
        metric,
        period: 'week',
        currentStart,
        currentEnd: settlementDate,
        previousStart,
        previousEnd,
        availableStartDate,
    }));
    const monthly = TREND_METRICS.map((metric) => buildTrendComparison({
        rows,
        metric,
        period: 'month',
        ...monthRange,
        availableStartDate,
    }));
    const primary = weekly.find((comparison) => comparison.metric === 'menu_activity')
        || weekly.find((comparison) => comparison.status !== 'not_enough_data')
        || weekly[0];

    return {
        source: 'daily30d_fallback',
        lastSettledLocalDate: settlementDate,
        primary,
        weekly,
        monthly,
        enoughData: weekly.some((comparison) => comparison.status !== 'not_enough_data'),
    };
}

function trendStatusLabel(status: OwnerDashboardTrendStatus, t: DashboardTranslator): string {
    return t(`graph.trend.status.${status}`);
}

function trendPeriodLabel(comparison: OwnerDashboardTrendComparison, t: DashboardTranslator): string {
    return t(`graph.trend.period.${comparison.period}`);
}

function trendValueLabel(comparison: OwnerDashboardTrendComparison, t: DashboardTranslator): string {
    if (comparison.status === 'not_enough_data') return t('graph.trend.needsMoreDays');
    return t('graph.trend.versus', {
        current: compactNumber(comparison.currentValue),
        previous: compactNumber(comparison.previousValue),
    });
}

function trendChangeLabel(
    comparison: OwnerDashboardTrendComparison | undefined,
    period: 'week' | 'month',
    t: DashboardTranslator,
): string {
    const periodLabel = t(`graph.trend.shortPeriod.${period}`);
    if (!comparison || comparison.status === 'not_enough_data') {
        return t('graph.trend.change.gathering', { period: periodLabel });
    }

    if (comparison.changePct === null) return t('graph.trend.change.newActivity', { period: periodLabel });
    if (comparison.status === 'stable') return t('graph.trend.change.steady', { period: periodLabel });
    return t('graph.trend.change.value', {
        period: periodLabel,
        change: formatDashboardPercent(comparison.changePct, true),
    });
}

function findTrendComparison(
    trendSummary: OwnerDashboardTrendSummary | undefined,
    metric: OwnerDashboardTrendMetric,
    period: 'week' | 'month',
): OwnerDashboardTrendComparison | undefined {
    const comparisons = period === 'month' ? trendSummary?.monthly : trendSummary?.weekly;
    return comparisons?.find((comparison) => comparison.metric === metric);
}

function metricValue(day: DailyViewData | undefined, key: keyof DailyViewData['metrics']): number {
    const value = day?.metrics?.[key];
    return typeof value === 'number' ? value : 0;
}

function collectMenuDays(data: OwnerDashboardData | null): DailyViewData[] {
    const rows = data?.daily30d?.length
        ? data.daily30d
        : [data?.daily, data?.today].filter(Boolean) as DailyViewData[];

    return rows
        .filter((row) => Boolean(row?.date))
        .sort((a, b) => a.date.localeCompare(b.date));
}

function sumMenuActions(days: DailyViewData[], t: DashboardTranslator): BarRow[] {
    const totals = ACTION_KEYS.reduce<Record<keyof MenuActionBreakdown, number>>((acc, key) => {
        acc[key] = 0;
        return acc;
    }, {
        call: 0,
        whatsapp: 0,
        directions: 0,
        reserve: 0,
        order: 0,
    });

    days.forEach((day) => {
        ACTION_KEYS.forEach((key) => {
            totals[key] += day.menuActions?.[key] || 0;
        });
    });

    return ACTION_KEYS
        .map((key) => ({ key, label: t(`actions.${key === 'call' ? 'calls' : key}`), value: totals[key] }))
        .filter((row) => row.value > 0);
}

function getBestSourceRows(data: OwnerDashboardData | null, t: DashboardTranslator): BarRow[] {
    const sources: SourceQuality[] = (
        data?.wtd?.sourceQuality?.length ? data.wtd.sourceQuality
        : data?.weekly?.sourceQuality?.length ? data.weekly.sourceQuality
        : data?.mtd?.sourceQuality?.length ? data.mtd.sourceQuality
        : data?.monthly?.sourceQuality?.length ? data.monthly.sourceQuality
        : data?.overall?.sourceQuality || []
    );

    return sources
        .slice(0, 6)
        .map((source) => ({
            key: source.source,
            label: getOwnerDashboardSourceLabel(source.source, source.label, t),
            value: source.menuSessions || 0,
            secondary: source.actionSessions || source.actionClicks || 0,
        }))
        .filter((row) => row.value > 0 || (row.secondary || 0) > 0);
}

function getTopItemRows(data: OwnerDashboardData | null): BarRow[] {
    const items: TopItem[] = (
        data?.wtd?.topItems?.length ? data.wtd.topItems
        : data?.weekly?.topItems?.length ? data.weekly.topItems
        : data?.mtd?.topItems?.length ? data.mtd.topItems
        : data?.monthly?.topItems?.length ? data.monthly.topItems
        : data?.overall?.topItems || []
    );

    return items
        .slice(0, 6)
        .map((item) => ({
            key: item.itemId,
            label: item.name || item.itemId,
            value: item.clicks || 0,
            secondary: item.views || 0,
        }))
        .filter((row) => row.value > 0 || (row.secondary || 0) > 0);
}

function combineSearchRows(primary: SearchTerm[] = [], noResult: SearchTerm[] = []): BarRow[] {
    const rows = new Map<string, BarRow>();

    primary.slice(0, 6).forEach((term) => {
        rows.set(term.term, {
            key: term.term,
            label: term.term,
            value: term.count || 0,
            secondary: 0,
        });
    });

    noResult.slice(0, 6).forEach((term) => {
        const current = rows.get(term.term) || {
            key: term.term,
            label: term.term,
            value: 0,
            secondary: 0,
        };
        current.secondary = (current.secondary || 0) + (term.count || 0);
        rows.set(term.term, current);
    });

    return Array.from(rows.values())
        .filter((row) => row.value > 0 || (row.secondary || 0) > 0)
        .sort((a, b) => ((b.value + (b.secondary || 0)) - (a.value + (a.secondary || 0))))
        .slice(0, 6);
}

function getSearchRows(data: OwnerDashboardData | null): BarRow[] {
    const period = data?.wtd || data?.weekly || data?.mtd || data?.monthly || data?.overall || null;
    return combineSearchRows(period?.topSearchTerms, period?.topZeroResultSearchTerms);
}

function hasUsefulValue<T extends object>(rows: T[], keys: string[]): boolean {
    return rows.some((row) => keys.some((key) => Number((row as Record<string, unknown>)[key] || 0) > 0));
}

function sumTrendRows(rows: TrendRow[], key: ComparisonTrendKey): number {
    return rows.reduce((sum, row) => sum + row[key], 0);
}

const OwnerDashboardGraphMode: React.FC<OwnerDashboardGraphModeProps> = ({ data, obpData }) => {
    const labels = useDashboardOfferingLabels();
    const t = useTranslations('Dashboard.owner');
    const { token } = theme.useToken();
    const [range, setRange] = useState<GraphRange>('30d');

    const menuDays = useMemo(() => collectMenuDays(data), [data]);
    const obpDaysByDate = useMemo(() => {
        return new Map((obpData?.daily30d || []).map((row) => [row.date, row]));
    }, [obpData?.daily30d]);

    const allTrendRows = useMemo<TrendRow[]>(() => {
        const dateSet = new Set<string>([
            ...menuDays.map((day) => day.date),
            ...Array.from(obpDaysByDate.keys()),
        ]);
        const menuByDate = new Map(menuDays.map((day) => [day.date, day]));

        return Array.from(dateSet)
            .sort((a, b) => a.localeCompare(b))
            .map((date) => {
                const menuDay = menuByDate.get(date);
                const obpDay = obpDaysByDate.get(date);
                return {
                    date,
                    label: formatDateLabel(date),
                    scans: metricValue(menuDay, 'menuVisits'),
                    itemTaps: metricValue(menuDay, 'itemClicks'),
                    customerActions: metricValue(menuDay, 'menuActionClicks'),
                    searches: metricValue(menuDay, 'searches'),
                    missingSearches: metricValue(menuDay, 'zeroResultSearches'),
                    unavailableInterest: metricValue(menuDay, 'unavailableItemTaps'),
                    obpViews: obpDay?.views || 0,
                    obpActions: (obpDay?.actionClicks || 0) + (obpDay?.menuClicks || 0) + (obpDay?.linkClicks || 0),
                };
            });
    }, [menuDays, obpDaysByDate]);

    const trendRows = useMemo(() => allTrendRows.slice(range === '7d' ? -7 : -30), [allTrendRows, range]);
    const rangeMenuDays = useMemo(() => menuDays.slice(range === '7d' ? -7 : -30), [menuDays, range]);
    const actionRows = useMemo(() => sumMenuActions(rangeMenuDays, t), [rangeMenuDays, t]);
    const sourceRows = useMemo(() => getBestSourceRows(data, t), [data, t]);
    const topItemRows = useMemo(() => getTopItemRows(data), [data]);
    const searchRows = useMemo(() => getSearchRows(data), [data]);
    const fallbackTrendSummaryRows = useMemo<TrendRow[]>(() => (
        menuDays.map((day) => ({
            date: day.date,
            label: formatDateLabel(day.date),
            scans: metricValue(day, 'menuVisits'),
            itemTaps: metricValue(day, 'itemClicks'),
            customerActions: metricValue(day, 'menuActionClicks'),
            searches: metricValue(day, 'searches'),
            missingSearches: metricValue(day, 'zeroResultSearches'),
            unavailableInterest: metricValue(day, 'unavailableItemTaps'),
            obpViews: 0,
            obpActions: 0,
        }))
    ), [menuDays]);
    const fallbackTrendSummary = useMemo(() => buildFallbackTrendSummary(fallbackTrendSummaryRows), [fallbackTrendSummaryRows]);
    const trendSummary = data?.trendSummary || fallbackTrendSummary;
    const trendCards = useMemo(() => {
        const weeklyCards = trendSummary?.weekly?.filter((comparison) => TREND_SIGNAL_METRICS.includes(comparison.metric)) || [];
        const monthlyMenu = trendSummary?.monthly?.find((comparison) => comparison.metric === 'menu_activity');
        return monthlyMenu ? [...weeklyCards, monthlyMenu] : weeklyCards;
    }, [trendSummary]);

    const totalScans = trendRows.reduce((sum, row) => sum + row.scans, 0);
    const totalActions = trendRows.reduce((sum, row) => sum + row.customerActions + row.obpActions, 0);
    const totalSearches = trendRows.reduce((sum, row) => sum + row.searches, 0);
    const hasTrendData = hasUsefulValue(trendRows, [
        'scans',
        'itemTaps',
        'customerActions',
        'searches',
        'missingSearches',
        'unavailableInterest',
        'obpViews',
        'obpActions',
    ]);
    const comparisonCharts = useMemo(() => ([
        {
            key: 'scans' as ComparisonTrendKey,
            title: trendMetricLabel('menu_activity', t),
            dataKey: 'scans' as ComparisonTrendKey,
            metric: 'menu_activity' as OwnerDashboardTrendMetric,
            tone: 'positive' as ComparisonTrendTone,
            value: sumTrendRows(trendRows, 'scans'),
            stroke: token.colorPrimary,
            fill: token.colorPrimaryBg,
            emptyDescription: t('graph.empty.menuActivity'),
        },
        {
            key: 'customerActions' as ComparisonTrendKey,
            title: trendMetricLabel('customer_actions', t),
            dataKey: 'customerActions' as ComparisonTrendKey,
            metric: 'customer_actions' as OwnerDashboardTrendMetric,
            tone: 'positive' as ComparisonTrendTone,
            value: sumTrendRows(trendRows, 'customerActions'),
            stroke: token.colorSuccess,
            fill: token.colorSuccessBg,
            emptyDescription: t('graph.empty.customerActions'),
        },
        {
            key: 'searches' as ComparisonTrendKey,
            title: trendMetricLabel('search_demand', t),
            dataKey: 'searches' as ComparisonTrendKey,
            metric: 'search_demand' as OwnerDashboardTrendMetric,
            tone: 'positive' as ComparisonTrendTone,
            value: sumTrendRows(trendRows, 'searches'),
            stroke: token.colorWarning,
            fill: token.colorWarningBg,
            emptyDescription: t('graph.empty.searchDemand'),
        },
        {
            key: 'itemTaps' as ComparisonTrendKey,
            title: trendMetricLabel('item_interest', t),
            dataKey: 'itemTaps' as ComparisonTrendKey,
            metric: 'item_interest' as OwnerDashboardTrendMetric,
            tone: 'positive' as ComparisonTrendTone,
            value: sumTrendRows(trendRows, 'itemTaps'),
            stroke: token.colorInfo,
            fill: token.colorInfoBg,
            emptyDescription: t('graph.empty.itemInterest'),
        },
        {
            key: 'unavailableInterest' as ComparisonTrendKey,
            title: trendMetricLabel('unavailable_demand', t),
            dataKey: 'unavailableInterest' as ComparisonTrendKey,
            metric: 'unavailable_demand' as OwnerDashboardTrendMetric,
            tone: 'problem' as ComparisonTrendTone,
            value: sumTrendRows(trendRows, 'unavailableInterest'),
            stroke: token.colorWarning,
            fill: token.colorWarningBg,
            emptyDescription: t('graph.empty.unavailableDemand'),
        },
        {
            key: 'missingSearches' as ComparisonTrendKey,
            title: trendMetricLabel('missing_searches', t),
            dataKey: 'missingSearches' as ComparisonTrendKey,
            metric: 'missing_searches' as OwnerDashboardTrendMetric,
            tone: 'problem' as ComparisonTrendTone,
            value: sumTrendRows(trendRows, 'missingSearches'),
            stroke: token.colorError,
            fill: token.colorErrorBg,
            emptyDescription: t('graph.empty.missingSearches'),
        },
    ]), [
        token.colorError,
        token.colorErrorBg,
        token.colorInfo,
        token.colorInfoBg,
        token.colorPrimary,
        token.colorPrimaryBg,
        token.colorSuccess,
        token.colorSuccessBg,
        token.colorWarning,
        token.colorWarningBg,
        t,
        trendRows,
    ]);

    const tooltipStyle = {
        backgroundColor: token.colorBgElevated,
        border: `1px solid ${token.colorBorder}`,
        borderRadius: token.borderRadius,
        boxShadow: token.boxShadowSecondary,
    };

    const renderEmpty = (description = t('graph.empty.default')) => (
        <Empty
            description={<Text type="secondary">{description}</Text>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className={styles.graphEmpty}
        />
    );

    const getTrendStatusClass = (status: OwnerDashboardTrendStatus): string => {
        if (status === 'up') return styles.trendSignalUp;
        if (status === 'down') return styles.trendSignalDown;
        if (status === 'stable') return styles.trendSignalStable;
        return styles.trendSignalQuiet;
    };

    const renderTrendIcon = (status: OwnerDashboardTrendStatus) => {
        if (status === 'up') return <LuMoveUp size={16} />;
        if (status === 'down') return <LuMoveDown size={16} />;
        if (status === 'stable') return <LuMinus size={16} />;
        return <LuActivity size={16} />;
    };

    const getComparisonBadgeClass = (
        comparison: OwnerDashboardTrendComparison | undefined,
        tone: ComparisonTrendTone,
    ): string => {
        if (!comparison || comparison.status === 'not_enough_data') return styles.comparisonBadgeQuiet;
        if (comparison.status === 'up') return tone === 'problem' ? styles.comparisonBadgeDown : styles.comparisonBadgeUp;
        if (comparison.status === 'down') return tone === 'problem' ? styles.comparisonBadgeUp : styles.comparisonBadgeDown;
        return styles.comparisonBadgeStable;
    };

    const renderComparisonBadge = (
        comparison: OwnerDashboardTrendComparison | undefined,
        period: 'week' | 'month',
        tone: ComparisonTrendTone,
    ) => (
        <span className={`${styles.comparisonBadge} ${getComparisonBadgeClass(comparison, tone)}`}>
            {trendChangeLabel(comparison, period, t)}
        </span>
    );

    const renderChartShell = (
        title: string,
        subtitle: string,
        children: React.ReactNode,
        empty: boolean,
        emptyDescription?: string,
    ) => (
        <Card
            className={styles.graphCard}
            title={(
                <div className={styles.graphCardTitle}>
                    <Title level={5}>{title}</Title>
                    <Text type="secondary">{subtitle}</Text>
                </div>
            )}
            variant="borderless"
        >
            {empty ? renderEmpty(emptyDescription) : children}
        </Card>
    );

    return (
        <div className={styles.graphMode}>
            <Card className={styles.graphHeaderCard} variant="borderless">
                <Flex justify="space-between" align="center" gap={16} wrap="wrap" className={styles.graphHeader}>
                    <div>
                        <Title level={4}>{t('graph.title')}</Title>
                        <Text type="secondary">
                            {t('graph.description')}
                        </Text>
                    </div>
                    <Segmented
                        value={range}
                        onChange={(value) => setRange(value as GraphRange)}
                        options={[
                            { label: t('graph.ranges.days7'), value: '7d' },
                            { label: t('graph.ranges.days30'), value: '30d' },
                        ]}
                    />
                </Flex>

                <div className={styles.graphSummaryGrid}>
                    <div className={styles.graphSummaryItem}>
                        <span className={styles.graphSummaryValue}>{compactNumber(totalScans)}</span>
                        <span className={styles.graphSummaryLabel}>{labels.scansLabel}</span>
                    </div>
                    <div className={styles.graphSummaryItem}>
                        <span className={styles.graphSummaryValue}>{compactNumber(totalActions)}</span>
                        <span className={styles.graphSummaryLabel}>{t('metrics.customerActions')}</span>
                    </div>
                    <div className={styles.graphSummaryItem}>
                        <span className={styles.graphSummaryValue}>{compactNumber(totalSearches)}</span>
                        <span className={styles.graphSummaryLabel}>{t('metrics.searches')}</span>
                    </div>
                </div>

                {trendSummary ? (
                    <div className={styles.trendSummaryPanel}>
                        <div className={styles.trendPrimary}>
                            <Text className={styles.trendEyebrow}>{t('graph.trend.summary')}</Text>
                            <Title level={5}>{t(`graph.trend.messages.${trendSummary.primary.status}`, {
                                metric: trendMetricLabel(trendSummary.primary.metric, t),
                                period: t(`graph.trend.shortPeriod.${trendSummary.primary.period}`),
                            })}</Title>
                            <Text type="secondary">
                                {t('graph.trend.updatedAfterClose')}
                            </Text>
                        </div>
                        <div className={styles.trendSignalGrid}>
                            {trendCards.map((comparison) => (
                                <div
                                    key={`${comparison.period}-${comparison.metric}`}
                                    className={`${styles.trendSignalCard} ${getTrendStatusClass(comparison.status)}`}
                                >
                                    <div className={styles.trendSignalTop}>
                                        <span className={styles.trendSignalIcon}>{renderTrendIcon(comparison.status)}</span>
                                        <span>{trendStatusLabel(comparison.status, t)}</span>
                                    </div>
                                    <span className={styles.trendSignalLabel}>{trendMetricLabel(comparison.metric, t)}</span>
                                    <span className={styles.trendSignalMeta}>
                                        {trendPeriodLabel(comparison, t)} · {trendValueLabel(comparison, t)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </Card>

            <div className={styles.comparisonChartsHeader}>
                <div>
                    <Title level={5}>{t('graph.comparison.title')}</Title>
                    <Text type="secondary">{t('graph.comparison.description')}</Text>
                </div>
            </div>

            <div className={styles.comparisonChartGrid}>
                {comparisonCharts.map((chart) => {
                    const weeklyComparison = findTrendComparison(trendSummary, chart.metric, 'week');
                    const monthlyComparison = findTrendComparison(trendSummary, chart.metric, 'month');
                    const gradientId = `owner-dashboard-${chart.key}-gradient`;
                    const isEmpty = !hasUsefulValue(trendRows, [chart.dataKey]);

                    return (
                        <Card key={chart.key} className={styles.comparisonChartCard} variant="borderless">
                            <div className={styles.comparisonChartHeader}>
                                <div className={styles.comparisonChartTitle}>
                                    <Text>{chart.title}</Text>
                                    <Title level={5}>{compactNumber(chart.value)}</Title>
                                </div>
                                <div className={styles.comparisonBadgeRow}>
                                    {renderComparisonBadge(weeklyComparison, 'week', chart.tone)}
                                    {renderComparisonBadge(monthlyComparison, 'month', chart.tone)}
                                </div>
                            </div>

                            {isEmpty ? (
                                renderEmpty(chart.emptyDescription)
                            ) : (
                                <div className={styles.comparisonChartCanvas}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendRows} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                                            <defs>
                                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={chart.fill} stopOpacity={0.88} />
                                                    <stop offset="100%" stopColor={chart.fill} stopOpacity={0.08} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: token.colorTextSecondary }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 11, fill: token.colorTextSecondary }} tickFormatter={compactNumber} width={40} />
                                            <Tooltip
                                                contentStyle={tooltipStyle}
                                                formatter={(value: number | string) => [compactNumber(Number(value || 0)), chart.title]}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey={chart.dataKey}
                                                name={chart.title}
                                                stroke={chart.stroke}
                                                strokeWidth={2.4}
                                                fill={`url(#${gradientId})`}
                                                dot={{ r: 2, strokeWidth: 1 }}
                                                activeDot={{ r: 4 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            {renderChartShell(
                t('graph.charts.menuTrend.title'),
                t(range === '7d' ? 'graph.charts.menuTrend.days7' : 'graph.charts.menuTrend.days30'),
                <div className={styles.graphViewport}>
                    <div className={styles.graphCanvas}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendRows} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                                <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 12, fill: token.colorTextSecondary }} />
                                <YAxis tick={{ fontSize: 12, fill: token.colorTextSecondary }} tickFormatter={compactNumber} width={42} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(value: number | string, name: string) => [compactNumber(Number(value || 0)), name]}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="scans" name={labels.scansLabel} stroke={token.colorPrimary} strokeWidth={2.4} dot={false} />
                                <Line type="monotone" dataKey="itemTaps" name={t('metrics.itemClicks')} stroke={token.colorInfo} strokeWidth={2.2} dot={false} />
                                <Line type="monotone" dataKey="customerActions" name={t('obp.actions')} stroke={token.colorSuccess} strokeWidth={2.2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>,
                !hasTrendData,
            )}

            <div className={styles.graphGridTwo}>
                {renderChartShell(
                    t('graph.charts.customerActions.title'),
                    t('graph.charts.customerActions.description'),
                    <div className={styles.graphViewport}>
                        <div className={styles.graphCanvasCompact}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={actionRows} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
                                    <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: token.colorTextSecondary }} />
                                    <YAxis tick={{ fontSize: 12, fill: token.colorTextSecondary }} tickFormatter={compactNumber} width={36} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: number | string) => compactNumber(Number(value || 0))}
                                    />
                                    <Bar dataKey="value" name={t('obp.actions')} fill={token.colorSuccess} radius={[6, 6, 0, 0]} maxBarSize={44} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>,
                    actionRows.length === 0,
                    t('graph.empty.customerActionsPeriod'),
                )}

                {renderChartShell(
                    t('graph.charts.sources.title'),
                    t('graph.charts.sources.description'),
                    <div className={styles.graphViewport}>
                        <div className={styles.graphCanvasCompact}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sourceRows} layout="vertical" margin={{ top: 8, right: 18, left: 10, bottom: 4 }}>
                                    <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: token.colorTextSecondary }} tickFormatter={compactNumber} />
                                    <YAxis dataKey="label" type="category" width={112} tick={{ fontSize: 12, fill: token.colorTextSecondary }} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: number | string, name: string) => [compactNumber(Number(value || 0)), name]}
                                    />
                                    <Legend />
                                    <Bar dataKey="value" name={t('graph.legends.visits')} fill={token.colorPrimary} radius={[0, 6, 6, 0]} maxBarSize={24} />
                                    <Bar dataKey="secondary" name={t('graph.legends.actionSessions')} fill={token.colorSuccess} radius={[0, 6, 6, 0]} maxBarSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>,
                    sourceRows.length === 0,
                    t('graph.empty.sources'),
                )}
            </div>

            <div className={styles.graphGridTwo}>
                {renderChartShell(
                    t('graph.charts.items.title'),
                    t('graph.charts.items.description'),
                    <div className={styles.graphViewport}>
                        <div className={styles.graphCanvasCompact}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topItemRows} layout="vertical" margin={{ top: 8, right: 18, left: 10, bottom: 4 }}>
                                    <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: token.colorTextSecondary }} tickFormatter={compactNumber} />
                                    <YAxis dataKey="label" type="category" width={126} tick={{ fontSize: 12, fill: token.colorTextSecondary }} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: number | string, name: string) => [compactNumber(Number(value || 0)), name]}
                                    />
                                    <Legend />
                                    <Bar dataKey="secondary" name={t('graph.legends.views')} fill={token.colorInfo} radius={[0, 6, 6, 0]} maxBarSize={22} />
                                    <Bar dataKey="value" name={t('graph.legends.taps')} fill={token.colorPrimary} radius={[0, 6, 6, 0]} maxBarSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>,
                    topItemRows.length === 0,
                    t('graph.empty.itemInterest'),
                )}

                {renderChartShell(
                    t('graph.charts.search.title'),
                    t('graph.charts.search.description'),
                    <div className={styles.graphViewport}>
                        <div className={styles.graphCanvasCompact}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={searchRows} layout="vertical" margin={{ top: 8, right: 18, left: 10, bottom: 4 }}>
                                    <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 12, fill: token.colorTextSecondary }} tickFormatter={compactNumber} />
                                    <YAxis dataKey="label" type="category" width={126} tick={{ fontSize: 12, fill: token.colorTextSecondary }} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(value: number | string, name: string) => [compactNumber(Number(value || 0)), name]}
                                    />
                                    <Legend />
                                    <Bar dataKey="value" name={t('metrics.searches')} fill={token.colorPrimary} radius={[0, 6, 6, 0]} maxBarSize={22} />
                                    <Bar dataKey="secondary" name={t('graph.legends.noResult')} fill={token.colorWarning} radius={[0, 6, 6, 0]} maxBarSize={22} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>,
                    searchRows.length === 0,
                    t('graph.empty.searchDemand'),
                )}
            </div>

            {renderChartShell(
                t('graph.charts.officialPage.title'),
                t('graph.charts.officialPage.description'),
                <div className={styles.graphViewport}>
                    <div className={styles.graphCanvas}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendRows} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                                <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 12, fill: token.colorTextSecondary }} />
                                <YAxis tick={{ fontSize: 12, fill: token.colorTextSecondary }} tickFormatter={compactNumber} width={42} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(value: number | string, name: string) => [compactNumber(Number(value || 0)), name]}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="obpViews" name={t('obp.pageViews')} stroke={token.colorPrimary} fill={token.colorPrimaryBg} fillOpacity={0.55} />
                                <Area type="monotone" dataKey="obpActions" name={t('obp.actions')} stroke={token.colorSuccess} fill={token.colorSuccessBg} fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>,
                !hasUsefulValue(trendRows, ['obpViews', 'obpActions']),
                t('graph.empty.officialPage'),
            )}

            <Flex gap={8} wrap="wrap">
                <Tag>{t('graph.footer.sameData')}</Tag>
                <Tag>{t('graph.footer.noExtraTracking')}</Tag>
                <Tag>{t('graph.footer.settledAfterClose')}</Tag>
            </Flex>
        </div>
    );
};

export default OwnerDashboardGraphMode;
