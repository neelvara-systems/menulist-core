'use client';

import { FEATURE_FLAGS } from '@config/features';
import type {
    OBPActionBreakdown,
    OBPLinkBreakdown,
    OBPLanguageUsage,
    OBPPeriodMetrics,
    OBPShareBreakdown,
    OBPSourceBreakdown,
} from '@database/ownerDashboard';
import type { OBPDashboardViewData } from '@hook/useOBPDashboard';
import { theme } from 'antd';
import { LuExternalLink, LuGlobe, LuInfo, LuMapPin, LuMessageSquare, LuPhone, LuTrendingUp } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Popover, Tag, Text, Title } from '../../antd';

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

function renderSourceRows(sources?: OBPSourceBreakdown[]) {
    const rows = (sources || []).filter((source) => (
        source.views > 0 || source.actionClicks > 0 || source.menuClicks > 0 || source.linkClicks > 0
    ));
    if (rows.length === 0) return null;

    return (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                Visitor sources
            </Text>
            <Flex gap={8} vertical>
                {rows.slice(0, 6).map((source) => (
                    <Flex key={source.source} align="center" justify="space-between" gap={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{source.label}</Text>
                        <Text style={{ fontSize: 12, textAlign: 'right' }}>
                            {source.views.toLocaleString()} views
                            {source.menuClicks > 0 ? ` · ${source.menuClicks.toLocaleString()} menu` : ''}
                            {source.actionClicks > 0 ? ` · ${source.actionClicks.toLocaleString()} actions` : ''}
                            {source.linkClicks > 0 ? ` · ${source.linkClicks.toLocaleString()} links` : ''}
                        </Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

function renderLanguageRows(languages?: OBPLanguageUsage[]) {
    const rows = (languages || []).filter((language) => (
        language.views > 0 || language.sessions > 0 || language.adoptions > 0
    ));
    if (rows.length === 0) return null;

    return (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                OBP languages
            </Text>
            <Flex gap={6} vertical>
                {rows.slice(0, 5).map((language) => (
                    <Flex key={language.language} align="center" justify="space-between" gap={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{language.label}</Text>
                        <Text style={{ fontSize: 12, textAlign: 'right' }}>
                            {Math.max(language.sessions, language.views).toLocaleString()} page opens
                            {language.adoptions > 0 ? ` · ${language.adoptions.toLocaleString()} stayed` : ''}
                        </Text>
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
            {renderSourceRows(metrics.sources)}
            {renderLanguageRows(metrics.topLanguages)}
        </>
    );
}

export default function MobileOBPMetricsCard({ data, loading, loadingToday, mode }: MobileOBPMetricsCardProps) {
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const { token } = theme.useToken();
    const today = data?.today || null;
    const overview = data?.overview || null;
    const overall = data?.overall || null;
    const sharedInfoContent = (
        <div style={{ maxWidth: 280 }}>
            <Text type="secondary" style={{ display: 'block' }}>
                This card shows how customers interact with your Official Business Page before or around opening the menu.
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                Actions count final clicks on Call, WhatsApp, Directions, Reserve, and Order.
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
            </Text>
        </div>
    );

    if (mode === 'today') {
        const todayInfoContent = (
            <div style={{ maxWidth: 280 }}>
                {sharedInfoContent}
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                    Today so far is partial live activity only. It is not included yet in Yesterday, Last 7 Days, This Month, or lifetime totals.
                </Text>
            </div>
        );

        if (loadingToday && !today) {
            return (
                <Card
                    size="small"
                    title={(
                        <Flex align="center" justify="space-between">
                            <Text strong>Official Business Page · Today so far</Text>
                            <Popover content={todayInfoContent} placement="bottom" trigger="click">
                                <Button fill="none" style={{ minHeight: 'auto', padding: 4 }}>
                                    <LuInfo color={token.colorTextSecondary} size={16} />
                                </Button>
                            </Popover>
                        </Flex>
                    )}
                >
                    <Flex align="center" gap={8}>
                        <DotLoading color="primary" />
                        <Text type="secondary">Loading current OBP activity</Text>
                    </Flex>
                </Card>
            );
        }

        return (
            <Card
                size="small"
                title={(
                    <Flex align="center" justify="space-between">
                        <Text strong>Official Business Page · Today so far</Text>
                        <Popover content={todayInfoContent} placement="bottom" trigger="click">
                            <Button fill="none" style={{ minHeight: 'auto', padding: 4 }}>
                                <LuInfo color={token.colorTextSecondary} size={16} />
                            </Button>
                        </Popover>
                    </Flex>
                )}
            >
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
                    <Flex align="center" gap={8}>
                        <Popover content={sharedInfoContent} placement="bottom" trigger="click">
                            <Button fill="none" style={{ minHeight: 'auto', padding: 4 }}>
                                <LuInfo color={token.colorTextSecondary} size={16} />
                            </Button>
                        </Popover>
                        {statusTag}
                    </Flex>
                </Flex>
            )}
        >
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
                    {renderSourceRows(overall.lifetimeSources)}
                </div>
            ) : null}
        </Card>
    );
}
