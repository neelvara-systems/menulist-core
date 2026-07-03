/**
 * CustomerAppMetrics — Analytics card for the installable PWA surface.
 *
 * Fetches analytics with `projectId='customerApp'` (separate from menu analytics).
 * Displays:
 *   - Installed Customers (lifetime unique-install proxy)
 *   - App Opens (30d)
 *   - Install Conversion (installed / promptShown)
 *   - Top Shortcut used
 *
 * Reads from the same `analytics` collection / `aggregateCustomerAnalytics` rollups
 * populated by the client trackers. No new hooks, no new API endpoints.
 */

import useCustomerAppDashboard from '@hook/useCustomerAppDashboard';
import { Alert, Card, Col, Empty, Row, Spin, Statistic, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import { LuDownload, LuEye, LuRocket, LuSmartphone, LuStar } from 'react-icons/lu';

const { Title, Text } = Typography;
const { useToken } = theme;

// Local extension of AnalyticsSummary — the core type in src/lib/analytics/types.ts
// targets menu analytics. Customer App fields live in the same summary doc under
// additional keys written by updateSummaryDocument() in aggregateCustomerAnalytics.ts.
interface CustomerAppSummaryShape {
    lifetimeTotalPromptShown?: number;
    lifetimeTotalPromptDismissed?: number;
    lifetimeTotalInstallStarted?: number;
    lifetimeTotalInstalled?: number;
    lifetimeUniqueInstalls?: number;
    lifetimeTotalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
    installsByDevice?: Record<string, number>;
    installsByLocation?: Record<string, number>;
    /** Per-platform install counts — iOS / Android / Desktop / Other. */
    installsByPlatform?: Record<string, number>;
    /** Install source — native prompt vs iOS heuristic/manual standalone inference. */
    installsBySource?: Record<string, number>;
    /** Per-platform app-open counts — powers the retention row. */
    appOpensByPlatform?: Record<string, number>;
    last30Days?: { totalAppOpens?: number; totalInstalled?: number };
}

interface CustomerAppDailyShape {
    date: string;
    totalInstalled?: number;
    totalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
}

type DashboardTranslator = (key: string, values?: Record<string, string | number>) => string;

function topShortcut(clicks: Record<string, number> | undefined, t: DashboardTranslator): { key: string; count: number } {
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
    const label = shortcutLabel(bestKey, t) || bestKey;
    return { key: label, count: bestCount };
}

// Central label map — covers the 6 shortcut surfaces we ship with.
function shortcutLabel(key: string, t: DashboardTranslator): string | null {
    switch (key) {
        case 'menu': return t('customerApp.shortcuts.menu');
        case 'call': return t('actions.call');
        case 'directions': return t('actions.directions');
        case 'whatsapp': return t('actions.whatsapp');
        case 'reservation': return t('customerApp.shortcuts.reservation');
        case 'order': return t('customerApp.shortcuts.order');
        default: return null;
    }
}

// Human-readable label for the platform breakdown rows.
function platformLabel(key: string, t: DashboardTranslator): string {
    switch (key) {
        case 'ios': return t('customerApp.platforms.iosLong');
        case 'android': return t('customerApp.platforms.android');
        case 'desktop': return t('customerApp.platforms.desktop');
        case 'other': return t('customerApp.platforms.other');
        default: return key;
    }
}

interface Props {
    /** Date range passed through to useAnalyticsData (shared with the dashboard filter). */
    dateRange?: { startDate: string; endDate: string };
}

const CustomerAppMetrics: React.FC<Props> = ({ dateRange }) => {
    const { token } = useToken();
    const t = useTranslations('Dashboard.owner');
    const { data, loading, error } = useCustomerAppDashboard();
    void dateRange;

    if (loading) {
        return (
            <Card>
                <Title level={5} style={{ marginBottom: 8 }}>{t('customerApp.title')}</Title>
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Spin />
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <Title level={5} style={{ marginBottom: 8 }}>{t('customerApp.title')}</Title>
                <Alert
                    type="warning"
                    showIcon
                    message={t('customerApp.couldNotLoad')}
                    description="Try again later."
                />
            </Card>
        );
    }

    const summary = (data?.summary ?? null) as CustomerAppSummaryShape | null;
    const daily = (data?.daily30d ?? []) as CustomerAppDailyShape[];

    const hasAnyData =
        (summary?.lifetimeTotalInstalled ?? 0) > 0 ||
        (summary?.lifetimeUniqueInstalls ?? 0) > 0 ||
        (summary?.lifetimeTotalAppOpens ?? 0) > 0 ||
        daily.length > 0;

    if (!hasAnyData) {
        return (
            <Card>
                <Title level={5} style={{ marginBottom: 8 }}>{t('customerApp.title')}</Title>
                <Empty
                    description={
                        <div>
                            <Text>{t('customerApp.noInstallsYet')}</Text>
                            <br />
                            <Text type="secondary">
                                {t('customerApp.noInstallsDescription')}
                            </Text>
                        </div>
                    }
                />
            </Card>
        );
    }

    // Lifetime
    const installedCustomers = summary?.lifetimeUniqueInstalls ?? summary?.lifetimeTotalInstalled ?? 0;
    const totalPromptShown = summary?.lifetimeTotalPromptShown ?? 0;
    const totalInstalled = summary?.lifetimeTotalInstalled ?? 0;
    const iosManualInstalls =
        (summary?.installsBySource?.['ios-inferred'] ?? 0) +
        (summary?.installsBySource?.['ios-standalone'] ?? 0);
    const promptedInstalls = Math.max(
        0,
        totalInstalled - (summary?.installsBySource?.['ios-standalone'] ?? 0),
    );

    // 30-day rollup from daily docs (works even if summary is stale)
    const appOpens30d = daily.reduce((sum, day) => sum + (day.totalAppOpens || 0), 0);
    const installs30d = daily.reduce((sum, day) => sum + (day.totalInstalled || 0), 0);

    // Install conversion — how many of the customers who saw the prompt installed
    const conversionPct =
        totalPromptShown > 0
            ? Math.round((promptedInstalls / totalPromptShown) * 100)
            : 0;

    const topShortcutResult = topShortcut(summary?.shortcutClicks, t);

    return (
        <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
                <LuSmartphone style={{ marginRight: 8 }} />
                {t('customerApp.title')}
            </Title>

            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('customerApp.installedCustomers')}
                        value={installedCustomers}
                        prefix={<LuDownload />}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('customerApp.appOpens30d')}
                        value={appOpens30d}
                        prefix={<LuEye />}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('customerApp.installs30d')}
                        value={installs30d}
                        prefix={<LuRocket />}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title={t('customerApp.installConversion')}
                        value={`${conversionPct}%`}
                        prefix={<LuRocket />}
                        valueStyle={{
                            color: conversionPct >= 20 ? token.colorSuccess : conversionPct >= 5 ? token.colorWarning : token.colorError,
                        }}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12}>
                    <Statistic
                        title={t('customerApp.topShortcut')}
                        value={topShortcutResult.key}
                        prefix={<LuStar />}
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <Statistic
                        title={t('customerApp.totalShortcutUses')}
                        value={Object.values(summary?.shortcutClicks || {}).reduce(
                            (sum, v) => sum + (typeof v === 'number' ? v : 0),
                            0,
                        )}
                    />
                </Col>
            </Row>

            <Alert
                style={{ marginTop: 16 }}
                type="info"
                showIcon
                message={t('customerApp.iosInferredTitle')}
                description={
                    iosManualInstalls > 0
                        ? t('customerApp.iosInferredWithCount', { count: iosManualInstalls.toLocaleString() })
                        : t('customerApp.iosInferredNoCount')
                }
            />

            {/* Shortcut breakdown — helps owners see which quick-actions customers value most */}
            {summary?.shortcutClicks && Object.keys(summary.shortcutClicks).length > 0 ? (
                <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                    <Col span={24}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('customerApp.shortcutBreakdown')}
                        </Text>
                    </Col>
                    {(['menu', 'call', 'directions', 'whatsapp', 'reservation', 'order'] as const).map((key) => {
                        const count = summary.shortcutClicks?.[key] ?? 0;
                        // Hide zero-count rows for shortcuts the store doesn't expose,
                        // to keep the card tight.
                        if (count === 0) return null;
                        return (
                            <Col key={key} xs={12} sm={6}>
                                <Statistic title={shortcutLabel(key, t) || key} value={count} />
                            </Col>
                        );
                    })}
                </Row>
            ) : null}

            {/* Platform breakdown — iOS vs Android vs Desktop installs */}
            {summary?.installsByPlatform && Object.keys(summary.installsByPlatform).length > 0 ? (
                <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                    <Col span={24}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('customerApp.installsByPlatform')}
                        </Text>
                    </Col>
                    {(['ios', 'android', 'desktop', 'other'] as const).map((key) => {
                        const count = summary.installsByPlatform?.[key] ?? 0;
                        if (count === 0) return null;
                        return (
                            <Col key={key} xs={12} sm={6}>
                                <Statistic title={platformLabel(key, t)} value={count} />
                            </Col>
                        );
                    })}
                </Row>
            ) : null}

            {/* Retention signal — directional read on how "sticky" the app is.
                avg opens/install above ~3 is healthy; below 1 suggests installs
                aren't translating into repeat use. */}
            {installedCustomers > 0 ? (
                <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
                    <Col span={24}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('customerApp.appStickiness')}
                        </Text>
                    </Col>
                    <Col xs={12} sm={8}>
                        <Statistic
                            title={t('customerApp.returningOpens30d')}
                            value={appOpens30d}
                        />
                    </Col>
                    <Col xs={12} sm={8}>
                        <Statistic
                            title={t('customerApp.avgOpensPerInstall')}
                            value={
                                (summary?.lifetimeTotalAppOpens ?? 0) > 0 && installedCustomers > 0
                                    ? ((summary?.lifetimeTotalAppOpens ?? 0) / installedCustomers).toFixed(1)
                                    : '0.0'
                            }
                        />
                    </Col>
                    {iosManualInstalls > 0 ? (
                        <Col xs={24} sm={8}>
                            <Statistic
                                title={t('customerApp.iosManualInstalls')}
                                value={iosManualInstalls}
                            />
                        </Col>
                    ) : null}
                </Row>
            ) : null}
        </Card>
    );
};

export default CustomerAppMetrics;
