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

import { AppstoreOutlined, DownloadOutlined, EyeOutlined, RocketOutlined, StarOutlined } from '@ant-design/icons';
import useAnalyticsData from '@hook/useAnalyticsData';
import { Alert, Card, Col, Empty, Row, Spin, Statistic, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';

const { Title, Text } = Typography;

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
    last30Days?: { totalAppOpens?: number; totalInstalled?: number };
}

interface CustomerAppDailyShape {
    date: string;
    totalInstalled?: number;
    totalAppOpens?: number;
    shortcutClicks?: Record<string, number>;
}

function sumLastNDays<K extends keyof CustomerAppDailyShape>(
    daily: CustomerAppDailyShape[],
    field: K,
    days: number,
): number {
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

function topShortcut(clicks?: Record<string, number>): { key: string; count: number } {
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
    const label =
        bestKey === 'menu' ? 'View Menu' :
        bestKey === 'call' ? 'Call' :
        bestKey === 'directions' ? 'Directions' :
        bestKey === 'whatsapp' ? 'WhatsApp' :
        bestKey;
    return { key: label, count: bestCount };
}

interface Props {
    /** Date range passed through to useAnalyticsData (shared with the dashboard filter). */
    dateRange?: { startDate: string; endDate: string };
}

const CustomerAppMetrics: React.FC<Props> = ({ dateRange }) => {
    const { data, loading, error } = useAnalyticsData(dateRange, 'customerApp');

    if (loading) {
        return (
            <Card>
                <Title level={5} style={{ marginBottom: 8 }}>Customer App</Title>
                <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Spin />
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <Title level={5} style={{ marginBottom: 8 }}>Customer App</Title>
                <Alert
                    type="warning"
                    showIcon
                    message="Could not load Customer App analytics"
                    description={error.message}
                />
            </Card>
        );
    }

    const summary = (data?.summary ?? null) as unknown as CustomerAppSummaryShape | null;
    const daily = (data?.daily ?? []) as unknown as CustomerAppDailyShape[];

    const hasAnyData =
        (summary?.lifetimeTotalInstalled ?? 0) > 0 ||
        (summary?.lifetimeUniqueInstalls ?? 0) > 0 ||
        (summary?.lifetimeTotalAppOpens ?? 0) > 0 ||
        daily.length > 0;

    if (!hasAnyData) {
        return (
            <Card>
                <Title level={5} style={{ marginBottom: 8 }}>Customer App</Title>
                <Empty
                    description={
                        <div>
                            <Text>No installs yet.</Text>
                            <br />
                            <Text type="secondary">
                                Numbers appear here after customers start installing your menu app.
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

    // 30-day rollup from daily docs (works even if summary is stale)
    const appOpens30d = sumLastNDays(daily, 'totalAppOpens', 30);
    const installs30d = sumLastNDays(daily, 'totalInstalled', 30);

    // Install conversion — how many of the customers who saw the prompt installed
    const conversionPct =
        totalPromptShown > 0
            ? Math.round((totalInstalled / totalPromptShown) * 100)
            : 0;

    const topShortcutResult = topShortcut(summary?.shortcutClicks);

    return (
        <Card>
            <Title level={5} style={{ marginBottom: 16 }}>
                <AppstoreOutlined style={{ marginRight: 8 }} />
                Customer App
            </Title>

            <Row gutter={[16, 16]}>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Installed Customers"
                        value={installedCustomers}
                        prefix={<DownloadOutlined />}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="App Opens (30d)"
                        value={appOpens30d}
                        prefix={<EyeOutlined />}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Installs (30d)"
                        value={installs30d}
                        prefix={<RocketOutlined />}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Install Conversion"
                        value={`${conversionPct}%`}
                        prefix={<RocketOutlined />}
                        valueStyle={{
                            color: conversionPct >= 20 ? '#3f8600' : conversionPct >= 5 ? '#d48806' : '#cf1322',
                        }}
                    />
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12}>
                    <Statistic
                        title="Top Shortcut"
                        value={topShortcutResult.key}
                        prefix={<StarOutlined />}
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <Statistic
                        title="Shortcut Uses"
                        value={topShortcutResult.count}
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default CustomerAppMetrics;
