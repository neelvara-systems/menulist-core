import { FEATURE_FLAGS } from '@config/features';
import {
    OBPActionBreakdown,
    OBPLinkBreakdown,
    OBPHistoricalWeek,
    OBPPeriodMetrics,
    OBPShareBreakdown,
} from '@database/ownerDashboard';
import type { OBPDashboardViewData } from '@hook/useOBPDashboard';
import { Card, Col, Divider, Empty, Flex, Row, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import {
    LuArrowDownRight,
    LuArrowUpRight,
    LuExternalLink,
    LuGlobe,
    LuMapPin,
    LuMessageSquare,
    LuMinus,
    LuPhone,
    LuTrendingUp,
} from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

type OBPCardMode = 'today' | 'overview' | 'daily' | 'weekly' | 'monthly';

interface OBPMetricsCardProps {
    data: OBPDashboardViewData | null;
    loading?: boolean;
    loadingToday?: boolean;
    mode: OBPCardMode;
}

function ChangeIndicator({ change }: { change: number | null }) {
    if (change === null) return <Text type="secondary" style={{ fontSize: 11 }}>No comparison</Text>;
    if (change === 0) return <Tag icon={<LuMinus size={10} />} color="default" style={{ fontSize: 11 }}>Same as last week</Tag>;
    if (change > 0) return <Tag icon={<LuArrowUpRight size={10} />} color="success" style={{ fontSize: 11 }}>+{change}% vs last week</Tag>;
    return <Tag icon={<LuArrowDownRight size={10} />} color="warning" style={{ fontSize: 11 }}>{change}% vs last week</Tag>;
}

function ActionBreakdown({ actions }: { actions: OBPActionBreakdown }) {
    const hasAny = actions.call > 0 || actions.whatsapp > 0 || actions.directions > 0 || actions.reserve > 0 || actions.order > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {actions.call > 0 && <Statistic title="Calls" value={actions.call} prefix={<LuPhone size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.whatsapp > 0 && <Statistic title="WhatsApp" value={actions.whatsapp} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.directions > 0 && <Statistic title="Directions" value={actions.directions} prefix={<LuMapPin size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.reserve > 0 && <Statistic title="Reserve" value={actions.reserve} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />}
            {actions.order > 0 && <Statistic title="Order" value={actions.order} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
        </Flex>
    );
}

function ShareBreakdown({ shares }: { shares: OBPShareBreakdown }) {
    const hasAny = shares.whatsapp > 0 || shares.copy_link > 0 || shares.copy_message > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {shares.whatsapp > 0 && <Statistic title="WhatsApp Shares" value={shares.whatsapp} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />}
            {shares.copy_link > 0 && <Statistic title="Copy Link" value={shares.copy_link} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
            {shares.copy_message > 0 && <Statistic title="Copy Message" value={shares.copy_message} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
        </Flex>
    );
}

function LinkBreakdown({ links }: { links: OBPLinkBreakdown }) {
    const hasAny = links.google_review > 0 || links.instagram > 0 || links.facebook > 0 || links.website > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {links.google_review > 0 && <Statistic title="Google Reviews" value={links.google_review} prefix={<LuGlobe size={12} />} valueStyle={{ fontSize: 16 }} />}
            {links.instagram > 0 && <Statistic title="Instagram" value={links.instagram} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
            {links.facebook > 0 && <Statistic title="Facebook" value={links.facebook} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
            {links.website > 0 && <Statistic title="Website" value={links.website} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />}
        </Flex>
    );
}

function WeeklyTrend({ weeks }: { weeks: OBPHistoricalWeek[] }) {
    if (weeks.length === 0) return null;
    const maxViews = Math.max(...weeks.map((week) => week.views), 1);

    return (
        <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                Weekly Trend (Last 4 Weeks)
            </Text>
            <Flex gap={4} align="flex-end" style={{ height: 48 }}>
                {weeks.map((week, index) => (
                    <Flex key={index} vertical align="center" gap={2} style={{ flex: 1 }}>
                        <div
                            style={{
                                width: '100%',
                                height: Math.max(4, (week.views / maxViews) * 40),
                                backgroundColor: week.isCurrentWeek ? '#1677ff' : '#e6f4ff',
                                borderRadius: 3,
                                transition: 'height 0.3s',
                            }}
                        />
                        <Text style={{ fontSize: 10, color: '#999' }}>{week.views}</Text>
                    </Flex>
                ))}
            </Flex>
            <Flex justify="space-between" style={{ marginTop: 2 }}>
                {weeks.map((week, index) => (
                    <Text key={index} style={{ fontSize: 9, color: '#bbb', flex: 1, textAlign: 'center' }}>
                        {week.weekLabel}
                    </Text>
                ))}
            </Flex>
        </div>
    );
}

function renderPeriodGrid(metrics: OBPPeriodMetrics) {
    return (
        <>
            <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                <Col xs={12} sm={8}>
                    <Statistic title="Page Views" value={metrics.views} prefix={<LuGlobe size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title="View Menu Clicks" value={metrics.menuClicks} prefix={<LuExternalLink size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title="Actions" value={metrics.actionClicks} prefix={<LuTrendingUp size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title="Link Taps" value={metrics.linkClicks} prefix={<LuExternalLink size={14} />} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title="Shares" value={metrics.shares} />
                </Col>
                <Col xs={12} sm={8}>
                    <Statistic title="Days Active" value={metrics.daysWithData} />
                </Col>
            </Row>
            <div style={{ marginTop: 12 }}>
                <ActionBreakdown actions={metrics.actions} />
            </div>
            <div style={{ marginTop: 12 }}>
                <LinkBreakdown links={metrics.links} />
            </div>
            <div style={{ marginTop: 12 }}>
                <ShareBreakdown shares={metrics.shareMethods} />
            </div>
        </>
    );
}

const OBPMetricsCard: React.FC<OBPMetricsCardProps> = ({ data, loading, loadingToday, mode }) => {
    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    const today = data?.today || null;
    const overview = data?.overview || null;
    const overall = data?.overall || null;

    if (mode === 'today') {
        if (loadingToday && !today) {
            return (
                <Card className={styles.obpCard} variant="borderless" title="Official Business Page · Today so far">
                    <Text type="secondary">Loading current OBP activity…</Text>
                </Card>
            );
        }

        return (
            <Card className={styles.obpCard} variant="borderless" title="Official Business Page · Today so far">
                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                    Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
                </Text>
                {today ? (
                    renderPeriodGrid(today)
                ) : (
                    <Text type="secondary">No OBP activity yet today.</Text>
                )}
            </Card>
        );
    }

    if ((loading && !data) || (!overview && !overall)) {
        return null;
    }

    const modeTitle =
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

    if (mode !== 'overview' && !selectedMetrics && !overall) {
        return null;
    }

    return (
        <Card
            className={styles.obpCard}
            variant="borderless"
            title={
                <span>
                    <LuGlobe size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    {modeTitle}
                </span>
            }
            extra={
                mode === 'overview'
                    ? overview?.status === 'working'
                        ? <Tag color="success" style={{ fontSize: 11 }}>Active</Tag>
                        : overview?.status === 'low_activity'
                            ? <Tag color="warning" style={{ fontSize: 11 }}>Low Activity</Tag>
                            : <Tag style={{ fontSize: 11 }}>No Data</Tag>
                    : null
            }
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. Shares come from the official business link card, and link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
            </Text>

            {mode === 'overview' ? (
                <>
                    {overview?.wtd ? (
                        <>
                            <Text type="secondary" style={{ fontSize: 12 }}>Last 7 Days</Text>
                            <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                                <Col xs={12} sm={6}>
                                    <Statistic title="Page Views" value={overview.wtd.views} prefix={<LuGlobe size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title="View Menu Clicks" value={overview.wtd.menuClicks} prefix={<LuExternalLink size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title="Actions" value={overview.wtd.actionClicks} prefix={<LuTrendingUp size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title="Link Taps" value={overview.wtd.linkClicks} prefix={<LuExternalLink size={14} />} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <Statistic title="Shares" value={overview.wtd.shares} />
                                </Col>
                                <Col xs={12} sm={6}>
                                    <div style={{ paddingTop: 4 }}>
                                        <ChangeIndicator change={overview.viewsChange} />
                                    </div>
                                </Col>
                            </Row>
                            <div style={{ marginTop: 12 }}>
                                <ActionBreakdown actions={overview.wtd.actions} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <LinkBreakdown links={overview.wtd.links} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <ShareBreakdown shares={overview.wtd.shareMethods} />
                            </div>
                        </>
                    ) : (
                        <Empty description={<Text type="secondary">No settled OBP activity yet.</Text>} />
                    )}

                    {overview?.mtd ? (
                        <>
                            <Divider style={{ margin: '16px 0 12px' }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>{overview.mtd.monthName}</Text>
                            {renderPeriodGrid(overview.mtd)}
                        </>
                    ) : null}

                    {overview && overview.historicalWeeks.length > 1 ? (
                        <>
                            <Divider style={{ margin: '16px 0 12px' }} />
                            <WeeklyTrend weeks={overview.historicalWeeks} />
                        </>
                    ) : null}
                </>
            ) : selectedMetrics ? (
                renderPeriodGrid(selectedMetrics)
            ) : (
                <Empty description={<Text type="secondary">No settled OBP activity yet for this period.</Text>} />
            )}

            {overall ? (
                <>
                    <Divider style={{ margin: '16px 0 12px' }} />
                    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Lifetime: {overall.lifetimeViews.toLocaleString()} views, {overall.lifetimeMenuClicks.toLocaleString()} View Menu clicks, {overall.lifetimeActionClicks.toLocaleString()} actions, {overall.lifetimeLinkClicks.toLocaleString()} link taps, {overall.lifetimeShares.toLocaleString()} shares
                        </Text>
                        {overall.firstDataDate ? (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Since {overall.firstDataDate}
                            </Text>
                        ) : null}
                    </Flex>
                    <div style={{ marginTop: 12 }}>
                        <ActionBreakdown actions={overall.lifetimeActions} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <LinkBreakdown links={overall.lifetimeLinks} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <ShareBreakdown shares={overall.lifetimeShareMethods} />
                    </div>
                </>
            ) : null}
        </Card>
    );
};

export default OBPMetricsCard;
