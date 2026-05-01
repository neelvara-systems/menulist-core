'use client';

import { FEATURE_FLAGS } from '@config/features';
import type {
    OBPActionBreakdown,
    OBPLinkBreakdown,
    OBPPeriodMetrics,
    OBPShareBreakdown,
} from '@database/ownerDashboard';
import type { OBPDashboardViewData } from '@hook/useOBPDashboard';
import { LuExternalLink, LuGlobe, LuMapPin, LuMessageSquare, LuPhone, LuTrendingUp } from 'react-icons/lu';
import { Card, DotLoading, Flex, Tag, Text, Title } from '../../antd';

type OBPCardMode = 'today' | 'overview' | 'daily' | 'weekly' | 'monthly';

interface MobileOBPMetricsCardProps {
    data: OBPDashboardViewData | null;
    loading?: boolean;
    loadingToday?: boolean;
    mode: OBPCardMode;
}

function renderActionRows(actions: OBPActionBreakdown) {
    const rows = [
        { key: 'call', label: 'Call', value: actions.call, icon: <LuPhone color="#16a34a" size={14} /> },
        { key: 'whatsapp', label: 'WhatsApp', value: actions.whatsapp, icon: <LuMessageSquare color="#16a34a" size={14} /> },
        { key: 'directions', label: 'Directions', value: actions.directions, icon: <LuMapPin color="#f59e0b" size={14} /> },
        { key: 'reserve', label: 'Reserve', value: actions.reserve, icon: <LuMessageSquare color="#7c3aed" size={14} /> },
        { key: 'order', label: 'Order', value: actions.order, icon: <LuExternalLink color="#1d4ed8" size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                Action breakdown
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderShareRows(shares: OBPShareBreakdown) {
    const rows = [
        { key: 'whatsapp', label: 'WhatsApp shares', value: shares.whatsapp, icon: <LuMessageSquare color="#16a34a" size={14} /> },
        { key: 'copy_link', label: 'Copy link', value: shares.copy_link, icon: <LuExternalLink color="#1d4ed8" size={14} /> },
        { key: 'copy_message', label: 'Copy message', value: shares.copy_message, icon: <LuExternalLink color="#7c3aed" size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                Share breakdown
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderLinkRows(links: OBPLinkBreakdown) {
    const rows = [
        { key: 'google_review', label: 'Google reviews', value: links.google_review, icon: <LuGlobe color="#1d4ed8" size={14} /> },
        { key: 'instagram', label: 'Instagram', value: links.instagram, icon: <LuExternalLink color="#ec4899" size={14} /> },
        { key: 'facebook', label: 'Facebook', value: links.facebook, icon: <LuExternalLink color="#2563eb" size={14} /> },
        { key: 'website', label: 'Website', value: links.website, icon: <LuExternalLink color="#0f766e" size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                Link taps
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderMetricCards(metrics: OBPPeriodMetrics) {
    return (
        <>
            <Flex gap={12} wrap>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuGlobe color="#1d4ed8" size={14} />
                        <Text type="secondary">Page Views</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.views.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuExternalLink color="#0ea5e9" size={14} />
                        <Text type="secondary">View Menu Clicks</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.menuClicks.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuTrendingUp color="#16a34a" size={14} />
                        <Text type="secondary">Actions</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.actionClicks.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Text type="secondary">Shares</Text>
                    <Title level={3} style={{ margin: 0 }}>{metrics.shares.toLocaleString()}</Title>
                </Card>
                <Card size="small" style={{ flex: '1 1 45%' }}>
                    <Flex align="center" gap={8}>
                        <LuExternalLink color="#0f766e" size={14} />
                        <Text type="secondary">Link Taps</Text>
                    </Flex>
                    <Title level={3} style={{ margin: 0 }}>{metrics.linkClicks.toLocaleString()}</Title>
                </Card>
            </Flex>

            {renderActionRows(metrics.actions)}
            {renderLinkRows(metrics.links)}
            {renderShareRows(metrics.shareMethods)}
        </>
    );
}

export default function MobileOBPMetricsCard({ data, loading, loadingToday, mode }: MobileOBPMetricsCardProps) {
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const today = data?.today || null;
    const overview = data?.overview || null;
    const overall = data?.overall || null;

    if (mode === 'today') {
        if (loadingToday && !today) {
            return (
                <Card size="small" title={<Text strong>Official Business Page · Today so far</Text>}>
                    <Flex align="center" gap={8}>
                        <DotLoading color="primary" />
                        <Text type="secondary">Loading current OBP activity</Text>
                    </Flex>
                </Card>
            );
        }

        return (
            <Card size="small" title={<Text strong>Official Business Page · Today so far</Text>}>
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                    Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
                </Text>
                {today ? renderMetricCards(today) : (
                    <Text type="secondary">No OBP activity yet today.</Text>
                )}
            </Card>
        );
    }

    if ((loading && !data) || (!overview && !overall)) return null;

    const title =
        mode === 'daily'
            ? 'Official Business Page · Yesterday'
            : mode === 'weekly'
                ? 'Official Business Page · Last 7 Days'
                : mode === 'monthly'
                    ? 'Official Business Page · This Month'
                    : 'Official Business Page';

    const selectedMetrics =
        mode === 'daily'
            ? overview?.yesterday || null
            : mode === 'weekly'
                ? overview?.wtd || null
                : mode === 'monthly'
                    ? overview?.mtd || null
                    : null;

    const statusTag = mode === 'overview'
        ? overview?.status === 'working'
            ? <Tag color="success">Active</Tag>
            : overview?.status === 'low_activity'
                ? <Tag color="warning">Low activity</Tag>
                : <Tag>No data</Tag>
        : null;

    return (
        <Card
            size="small"
            title={(
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8}>
                        <LuGlobe color="#1d4ed8" size={16} />
                        <Text strong>{title}</Text>
                    </Flex>
                    {statusTag}
                </Flex>
            )}
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
            </Text>

            {mode === 'overview' ? (
                <>
                    {overview?.wtd ? (
                        <>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                                Last 7 Days
                            </Text>
                            {renderMetricCards(overview.wtd)}
                        </>
                    ) : (
                        <Text type="secondary">No settled OBP activity yet.</Text>
                    )}

                    {overview?.mtd ? (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                                {overview.mtd.monthName}
                            </Text>
                            {renderMetricCards(overview.mtd)}
                        </div>
                    ) : null}
                </>
            ) : selectedMetrics ? (
                renderMetricCards(selectedMetrics)
            ) : (
                <Text type="secondary">No settled OBP activity yet for this period.</Text>
            )}

            {overall ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {`Lifetime: ${overall.lifetimeViews.toLocaleString()} views, ${overall.lifetimeMenuClicks.toLocaleString()} View Menu clicks, ${overall.lifetimeActionClicks.toLocaleString()} actions, ${overall.lifetimeLinkClicks.toLocaleString()} link taps, ${overall.lifetimeShares.toLocaleString()} shares`}
                    </Text>
                    {overall.firstDataDate ? (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                            {`Since ${overall.firstDataDate}`}
                        </Text>
                    ) : null}
                    {renderActionRows(overall.lifetimeActions)}
                    {renderLinkRows(overall.lifetimeLinks)}
                    {renderShareRows(overall.lifetimeShareMethods)}
                </div>
            ) : null}
        </Card>
    );
}
