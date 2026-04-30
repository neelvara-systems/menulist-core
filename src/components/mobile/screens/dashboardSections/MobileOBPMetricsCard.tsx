'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    type OBPActionBreakdown,
    type OBPLinkBreakdown,
    type OBPShareBreakdown,
} from '@database/ownerDashboard';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { LuExternalLink, LuGlobe, LuMapPin, LuMessageSquare, LuPhone, LuTrendingUp } from 'react-icons/lu';
import { Card, DotLoading, Flex, Tag, Text, Title } from '../../antd';

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

export default function MobileOBPMetricsCard() {
    const { data, loading, loadingToday } = useOBPDashboard();

    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    if (loading && !data) {
        return (
            <Card size="small" title={<Text strong>Official Business Page</Text>}>
                <Flex align="center" justify="center" style={{ padding: 16 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Card>
        );
    }

    const today = data?.today;
    const overview = data?.overview;
    const overall = data?.overall;

    if (!overview && !overall) return null;
    if (overview?.status === 'no_data' && !overall) return null;

    const statusTag = overview?.status === 'working'
        ? <Tag color="success">Active</Tag>
        : overview?.status === 'low_activity'
            ? <Tag color="warning">Low activity</Tag>
            : <Tag>No data</Tag>;

    return (
        <Card
            size="small"
            title={(
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8}>
                        <LuGlobe color="#1d4ed8" size={16} />
                        <Text strong>Official Business Page</Text>
                    </Flex>
                    {statusTag}
                </Flex>
            )}
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. They show customer intent, not completed calls or orders.
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Shares come from the official business link card. Link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
            </Text>

            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Today so far
            </Text>
            {loadingToday && !today ? (
                <Flex align="center" gap={8} style={{ marginBottom: 12 }}>
                    <DotLoading color="primary" />
                    <Text type="secondary">Loading current OBP activity</Text>
                </Flex>
            ) : today ? (
                <>
                    <Flex gap={12} wrap>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuGlobe color="#1d4ed8" size={14} />
                                <Text type="secondary">Page Views</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{today.views.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuExternalLink color="#0ea5e9" size={14} />
                                <Text type="secondary">View Menu Clicks</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{today.menuClicks.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuTrendingUp color="#16a34a" size={14} />
                                <Text type="secondary">Actions</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{today.actionClicks.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Text type="secondary">Shares</Text>
                            <Title level={3} style={{ margin: 0 }}>{today.shares.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuExternalLink color="#0f766e" size={14} />
                                <Text type="secondary">Link Taps</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{today.linkClicks.toLocaleString()}</Title>
                        </Card>
                    </Flex>

                    {renderActionRows(today.actions)}
                    {renderLinkRows(today.links)}
                    {renderShareRows(today.shareMethods)}
                </>
            ) : (
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    No OBP activity yet today. Settled OBP analytics appear below.
                </Text>
            )}

            {overview?.wtd ? (
                <>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }} />
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                        This week
                    </Text>
                    <Flex gap={12} wrap>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuGlobe color="#1d4ed8" size={14} />
                                <Text type="secondary">Page Views</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.views.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuExternalLink color="#0ea5e9" size={14} />
                                <Text type="secondary">View Menu Clicks</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.menuClicks.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuTrendingUp color="#16a34a" size={14} />
                                <Text type="secondary">Actions</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.actionClicks.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuExternalLink color="#0f766e" size={14} />
                                <Text type="secondary">Link Taps</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.linkClicks.toLocaleString()}</Title>
                        </Card>
                    </Flex>

                    {renderActionRows(overview.wtd.actions)}
                    {renderLinkRows(overview.wtd.links)}
                    {renderShareRows(overview.wtd.shareMethods)}
                </>
            ) : null}

            {overview?.mtd ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                        {overview.mtd.monthName}
                    </Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {`${overview.mtd.views.toLocaleString()} views, ${overview.mtd.menuClicks.toLocaleString()} View Menu clicks, ${overview.mtd.actionClicks.toLocaleString()} actions, ${overview.mtd.linkClicks.toLocaleString()} link taps, ${overview.mtd.shares.toLocaleString()} shares`}
                    </Text>
                </div>
            ) : null}

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
