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
import useCustomerAppDashboard from '@hook/useCustomerAppDashboard';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { LuDownload, LuEye, LuRocket, LuSmartphone, LuStar } from 'react-icons/lu';
import { Card, DotLoading, Flex, Text, Title } from '../../antd';

type DashboardTranslator = (key: string, values?: Record<string, string | number>) => string;

function shortcutLabel(key: string, t: DashboardTranslator): string {
    switch (key) {
        case 'menu': return t('customerApp.shortcuts.menu');
        case 'call': return t('actions.call');
        case 'directions': return t('actions.directions');
        case 'whatsapp': return t('actions.whatsapp');
        case 'reservation': return t('customerApp.shortcuts.reservation');
        case 'order': return t('customerApp.shortcuts.order');
        default: return key;
    }
}

function platformLabel(key: string, t: DashboardTranslator): string {
    switch (key) {
        case 'ios': return t('customerApp.platforms.ios');
        case 'android': return t('customerApp.platforms.android');
        case 'desktop': return t('customerApp.platforms.desktop');
        case 'other': return t('customerApp.platforms.other');
        default: return key;
    }
}

function topShortcutLabel(clicks: Record<string, number> | undefined, t: DashboardTranslator): { key: string; count: number } {
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
    return { key: shortcutLabel(bestKey, t), count: bestCount };
}

export default function MobileCustomerAppMetrics() {
    const { data, loading } = useCustomerAppDashboard();
    const { token } = theme.useToken();
    const t = useTranslations('Dashboard.owner');

    if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) return null;

    const summary = data?.summary ?? null;
    const daily = data?.daily30d ?? [];

    const installedCustomers = summary?.lifetimeUniqueInstalls ?? summary?.lifetimeTotalInstalled ?? 0;
    const appOpens30d = daily.reduce((sum, day) => sum + (day.totalAppOpens || 0), 0);
    const installs30d = daily.reduce((sum, day) => sum + (day.totalInstalled || 0), 0);
    const iosManualInstalls =
        (summary?.installsBySource?.['ios-inferred'] ?? 0) +
        (summary?.installsBySource?.['ios-standalone'] ?? 0);
    const totalPromptShown = summary?.lifetimeTotalPromptShown ?? 0;
    const totalInstalled = summary?.lifetimeTotalInstalled ?? 0;
    const promptedInstalls = Math.max(
        0,
        totalInstalled - (summary?.installsBySource?.['ios-standalone'] ?? 0),
    );
    const conversionPct = totalPromptShown > 0 ? Math.round((promptedInstalls / totalPromptShown) * 100) : 0;
    const top = topShortcutLabel(summary?.shortcutClicks, t);
    const hasAnyData = installedCustomers > 0 || appOpens30d > 0 || installs30d > 0 || daily.length > 0;

    // Initial load indicator
    if (loading && !data) {
        return (
            <Card size="small" title={
                <Flex align="center" gap={6}>
                    <LuSmartphone color={token.colorPrimary} size={14} />
                    <Text strong>{t('customerApp.title')}</Text>
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
                    <LuSmartphone color={token.colorPrimary} size={14} />
                    <Text strong>{t('customerApp.title')}</Text>
                </Flex>
            }>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('customerApp.mobileNoInstallsDescription')}
                </Text>
            </Card>
        );
    }

    return (
        <Card size="small" title={
            <Flex align="center" gap={6}>
                <LuSmartphone color={token.colorPrimary} size={14} />
                <Text strong>{t('customerApp.title')}</Text>
            </Flex>
        }>
            <Flex gap={12} wrap>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuDownload color={token.colorSuccess} size={14} />
                        <Text type="secondary">{t('customerApp.installed')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{installedCustomers.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuEye color={token.colorInfo} size={14} />
                        <Text type="secondary">{t('customerApp.appOpens30d')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{appOpens30d.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuRocket color={token.colorWarning} size={14} />
                        <Text type="secondary">{t('customerApp.installs30d')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{installs30d.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuRocket color={conversionPct >= 20 ? token.colorSuccess : conversionPct >= 5 ? token.colorWarning : token.colorError} size={14} />
                        <Text type="secondary">{t('customerApp.conversion')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{conversionPct}%</Title>
                </Card>
            </Flex>

            {/* Top Shortcut + Total Shortcut Uses — matches desktop row layout */}
            <Flex gap={12} wrap style={{ marginTop: 12 }}>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuStar color={token.colorWarning} size={14} />
                        <Text type="secondary">{t('customerApp.topShortcut')}</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{top.key}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Text type="secondary">{t('customerApp.totalShortcutUses')}</Text>
                    <Title level={3} style={{ margin: 0 }}>{totalShortcutUses.toLocaleString()}</Title>
                </Card>
            </Flex>

            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 12 }}>
                {iosManualInstalls > 0
                    ? t('customerApp.mobileIosInferredWithCount', { count: iosManualInstalls.toLocaleString() })
                    : t('customerApp.mobileIosInferredNoCount')}
            </Text>

            {/* Shortcut breakdown — per-shortcut rows (matches desktop, adapted for narrow mobile) */}
            {summary?.shortcutClicks && Object.keys(summary.shortcutClicks).length > 0 ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        {t('customerApp.shortcutBreakdown')}
                    </Text>
                    <Flex gap={4} vertical>
                        {(['menu', 'call', 'directions', 'whatsapp', 'reservation', 'order'] as const).map((key) => {
                            const count = summary.shortcutClicks?.[key] ?? 0;
                            if (count === 0) return null;
                            return (
                                <Flex key={key} align="center" justify="space-between">
                                    <Text type="secondary" style={{ fontSize: 12 }}>{shortcutLabel(key, t)}</Text>
                                    <Text style={{ fontSize: 12 }}>{count}</Text>
                                </Flex>
                            );
                        })}
                    </Flex>
                </div>
            ) : null}

            {/* Platform breakdown — mirrors desktop, compact row layout */}
            {summary?.installsByPlatform && Object.keys(summary.installsByPlatform).length > 0 ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        {t('customerApp.installsByPlatform')}
                    </Text>
                    <Flex gap={4} vertical>
                        {(['ios', 'android', 'desktop', 'other'] as const).map((key) => {
                            const count = summary.installsByPlatform?.[key] ?? 0;
                            if (count === 0) return null;
                            return (
                                <Flex key={key} align="center" justify="space-between">
                                    <Text type="secondary" style={{ fontSize: 12 }}>{platformLabel(key, t)}</Text>
                                    <Text style={{ fontSize: 12 }}>{count}</Text>
                                </Flex>
                            );
                        })}
                    </Flex>
                </div>
            ) : null}

            {/* App stickiness — directional retention read */}
            {installedCustomers > 0 ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        {t('customerApp.appStickiness')}
                    </Text>
                    <Flex gap={4} vertical>
                        <Flex align="center" justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('customerApp.returningOpens30d')}</Text>
                            <Text style={{ fontSize: 12 }}>{appOpens30d}</Text>
                        </Flex>
                        <Flex align="center" justify="space-between">
                            <Text type="secondary" style={{ fontSize: 12 }}>{t('customerApp.avgOpensPerInstall')}</Text>
                            <Text style={{ fontSize: 12 }}>
                                {(summary?.lifetimeTotalAppOpens ?? 0) > 0 && installedCustomers > 0
                                    ? ((summary?.lifetimeTotalAppOpens ?? 0) / installedCustomers).toFixed(1)
                                    : '0.0'}
                            </Text>
                        </Flex>
                        {iosManualInstalls > 0 ? (
                            <Flex align="center" justify="space-between">
                                <Text type="secondary" style={{ fontSize: 12 }}>{t('customerApp.iosManualInstalls')}</Text>
                                <Text style={{ fontSize: 12 }}>{iosManualInstalls}</Text>
                            </Flex>
                        ) : null}
                    </Flex>
                </div>
            ) : null}
        </Card>
    );
}
