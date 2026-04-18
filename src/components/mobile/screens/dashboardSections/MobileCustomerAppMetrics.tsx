'use client';

/**
 * Mobile Customer App Metrics — section inside MobileDashboardScreen
 *
 * Mirrors desktop `CustomerAppMetrics` (which sits alongside `OverallMetrics`
 * inside `AnalyticsDashboard/index.tsx`). Same data path: `useAnalyticsData`
 * with `projectId='customerApp'`.
 *
 * Renders nothing when:
 *   - feature flag is off
 *   - no data has accumulated yet (avoids empty-card clutter on the dashboard)
 */

import { FEATURE_FLAGS } from '@config/features';
import useAnalyticsData from '@hook/useAnalyticsData';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { LuDownload, LuEye, LuRocket, LuSmartphone, LuStar } from 'react-icons/lu';
import { Card, DotLoading, Flex, Text, Title } from '../../antd';

type DailyShape = {
    date: string;
    totalInstalled?: number;
    totalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
};

type SummaryShape = {
    lifetimeTotalPromptShown?: number;
    lifetimeTotalInstalled?: number;
    lifetimeUniqueInstalls?: number;
    lifetimeTotalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
    installsByPlatform?: Record<string, number>;
    installsBySource?: Record<string, number>;
    appOpensByPlatform?: Record<string, number>;
};

function shortcutLabel(key: string): string {
    switch (key) {
        case 'menu': return 'View Menu';
        case 'call': return 'Call';
        case 'directions': return 'Directions';
        case 'whatsapp': return 'WhatsApp';
        case 'reservation': return 'Reservation';
        case 'order': return 'Order Online';
        default: return key;
    }
}

function platformLabel(key: string): string {
    switch (key) {
        case 'ios': return 'iOS';
        case 'android': return 'Android';
        case 'desktop': return 'Desktop';
        case 'other': return 'Other';
        default: return key;
    }
}

function sumLastNDays(daily: DailyShape[], field: keyof DailyShape, days: number): number {
    const cutoff = dayjs().subtract(days, 'day').startOf('day');
    let total = 0;
    for (const d of daily) {
        if (!d?.date) continue;
        if (dayjs(d.date).isBefore(cutoff)) continue;
        const v = d[field];
        if (typeof v === 'number') total += v;
    }
    return total;
}

function topShortcutLabel(clicks?: Record<string, number>): { key: string; count: number } {
    if (!clicks) return { key: '—', count: 0 };
    let bestKey = '';
    let bestCount = -1;
    for (const [k, v] of Object.entries(clicks)) {
        if (typeof v === 'number' && v > bestCount) {
            bestKey = k;
            bestCount = v;
        }
    }
    if (bestCount <= 0) return { key: '—', count: 0 };
    return { key: shortcutLabel(bestKey), count: bestCount };
}

export default function MobileCustomerAppMetrics() {
    const dateRange = useMemo(() => ({
        startDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD'),
    }), []);
    const { data, loading } = useAnalyticsData(dateRange, 'customerApp');

    if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) return null;

    const summary = (data?.summary ?? null) as unknown as SummaryShape | null;
    const daily = (data?.daily ?? []) as unknown as DailyShape[];

    const installedCustomers = summary?.lifetimeUniqueInstalls ?? summary?.lifetimeTotalInstalled ?? 0;
    const appOpens30d = sumLastNDays(daily, 'totalAppOpens', 30);
    const installs30d = sumLastNDays(daily, 'totalInstalled', 30);
    const totalPromptShown = summary?.lifetimeTotalPromptShown ?? 0;
    const totalInstalled = summary?.lifetimeTotalInstalled ?? 0;
    const conversionPct = totalPromptShown > 0 ? Math.round((totalInstalled / totalPromptShown) * 100) : 0;
    const top = topShortcutLabel(summary?.shortcutClicks);
    const hasAnyData = installedCustomers > 0 || appOpens30d > 0 || installs30d > 0 || daily.length > 0;

    // Initial load indicator
    if (loading && !data) {
        return (
            <Card size="small" title={
                <Flex align="center" gap={6}>
                    <LuSmartphone color="#8b5cf6" size={14} />
                    <Text strong>Customer App</Text>
                </Flex>
            }>
                <Flex align="center" justify="center" style={{ padding: 16 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Card>
        );
    }

    // Compute total shortcut uses — same aggregation the desktop card uses.
    const totalShortcutUses = Object.values(summary?.shortcutClicks || {}).reduce(
        (sum, v) => sum + (typeof v === 'number' ? v : 0),
        0,
    );

    // Empty state — matches desktop CustomerAppMetrics. Shows the card but with a
    // friendly "no data" message instead of silently hiding, so the owner knows
    // the feature exists even before the first install.
    if (!hasAnyData) {
        return (
            <Card size="small" title={
                <Flex align="center" gap={6}>
                    <LuSmartphone color="#8b5cf6" size={14} />
                    <Text strong>Customer App</Text>
                </Flex>
            }>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    No installs yet. Numbers appear here once customers start installing your menu app.
                </Text>
            </Card>
        );
    }

    return (
        <Card size="small" title={
            <Flex align="center" gap={6}>
                <LuSmartphone color="#8b5cf6" size={14} />
                <Text strong>Customer App</Text>
            </Flex>
        }>
            <Flex gap={12} wrap>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuDownload color="#16a34a" size={14} />
                        <Text type="secondary">Installed</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{installedCustomers.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuEye color="#0ea5e9" size={14} />
                        <Text type="secondary">App Opens (30d)</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{appOpens30d.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuRocket color="#f97316" size={14} />
                        <Text type="secondary">Installs (30d)</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{installs30d.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuRocket color={conversionPct >= 20 ? '#16a34a' : conversionPct >= 5 ? '#d48806' : '#cf1322'} size={14} />
                        <Text type="secondary">Conversion</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{conversionPct}%</Title>
                </Card>
            </Flex>

            {/* Top Shortcut + Total Shortcut Uses — matches desktop row layout */}
            <Flex gap={12} wrap style={{ marginTop: 12 }}>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuStar color="#eab308" size={14} />
                        <Text type="secondary">Top Shortcut</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{top.key}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Text type="secondary">Total Shortcut Uses</Text>
                    <Title level={3} style={{ margin: 0 }}>{totalShortcutUses.toLocaleString()}</Title>
                </Card>
            </Flex>

            {/* Shortcut breakdown — per-shortcut rows (matches desktop, adapted for narrow mobile) */}
            {summary?.shortcutClicks && Object.keys(summary.shortcutClicks).length > 0 ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        Shortcut breakdown
                    </Text>
                    <Flex gap={4} vertical>
                        {(['menu', 'call', 'directions', 'whatsapp', 'reservation', 'order'] as const).map((key) => {
                            const count = summary.shortcutClicks?.[key] ?? 0;
                            if (count === 0) return null;
                            return (
                                <Flex key={key} align="center" justify="space-between">
                                    <Text type="secondary" style={{ fontSize: 12 }}>{shortcutLabel(key)}</Text>
                                    <Text style={{ fontSize: 12 }}>{count}</Text>
                                </Flex>
                            );
                        })}
                    </Flex>
                </div>
            ) : null}

            {/* Platform breakdown — mirrors desktop, compact row layout */}
            {summary?.installsByPlatform && Object.keys(summary.installsByPlatform).length > 0 ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        Installs by platform
                    </Text>
                    <Flex gap={4} vertical>
                        {(['ios', 'android', 'desktop', 'other'] as const).map((key) => {
                            const count = summary.installsByPlatform?.[key] ?? 0;
                            if (count === 0) return null;
                            return (
                                <Flex key={key} align="center" justify="space-between">
                                    <Text type="secondary" style={{ fontSize: 12 }}>{platformLabel(key)}</Text>
                                    <Text style={{ fontSize: 12 }}>{count}</Text>
                                </Flex>
                            );
                        })}
                    </Flex>
                </div>
            ) : null}

            {/* App stickiness — directional retention read */}
            {installedCustomers > 0 ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        App stickiness
                    </Text>
                    <Flex gap={4} vertical>
                        <Flex align="center" justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>Returning opens (30d)</Text>
                            <Text style={{ fontSize: 12 }}>{appOpens30d}</Text>
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>Avg opens per install</Text>
                            <Text style={{ fontSize: 12 }}>
                                {(summary?.lifetimeTotalAppOpens ?? 0) > 0 && installedCustomers > 0
                                    ? ((summary?.lifetimeTotalAppOpens ?? 0) / installedCustomers).toFixed(1)
                                    : '0.0'}
                            </Text>
                        </Flex>
                        {(summary?.installsBySource?.['ios-inferred'] ?? 0) > 0 ? (
                            <Flex align="center" justify="space-between">
                                <Text type="secondary" style={{ fontSize: 12 }}>iOS (inferred)</Text>
                                <Text style={{ fontSize: 12 }}>{summary?.installsBySource?.['ios-inferred'] ?? 0}</Text>
                            </Flex>
                        ) : null}
                    </Flex>
                </div>
            ) : null}
        </Card>
    );
}
