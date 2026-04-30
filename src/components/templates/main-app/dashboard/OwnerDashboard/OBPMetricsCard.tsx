/**
 * OBP Metrics Card — Official Business Page Analytics (Full Parity)
 *
 * First-class analytics card for OBP — same depth as digital menu analytics.
 * Shows: This Week (WTD), Month-to-Date, Historical Weeks trend, Lifetime,
 * action breakdown (Call/WhatsApp/Directions), week-over-week change.
 *
 * Only renders when ENABLE_OBP is true and data exists.
 *
 * @see __docs__/official-business-page/official-business-page_impl.md ADR-9
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    OBPActionBreakdown,
    OBPLinkBreakdown,
    OBPHistoricalWeek,
    OBPShareBreakdown,
} from '@database/ownerDashboard';
import { useOBPDashboard } from '@hook/useOBPDashboard';
import { Card, Col, Divider, Flex, Row, Statistic, Tag, Typography } from 'antd';
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
    LuTrendingUp
} from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

// ── Sub-components ──

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
            {actions.call > 0 && (
                <Statistic title="Calls" value={actions.call} prefix={<LuPhone size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {actions.whatsapp > 0 && (
                <Statistic title="WhatsApp" value={actions.whatsapp} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {actions.directions > 0 && (
                <Statistic title="Directions" value={actions.directions} prefix={<LuMapPin size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {actions.reserve > 0 && (
                <Statistic title="Reserve" value={actions.reserve} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {actions.order > 0 && (
                <Statistic title="Order" value={actions.order} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
        </Flex>
    );
}

function ShareBreakdown({ shares }: { shares: OBPShareBreakdown }) {
    const hasAny = shares.whatsapp > 0 || shares.copy_link > 0 || shares.copy_message > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {shares.whatsapp > 0 && (
                <Statistic title="WhatsApp Shares" value={shares.whatsapp} prefix={<LuMessageSquare size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {shares.copy_link > 0 && (
                <Statistic title="Copy Link" value={shares.copy_link} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {shares.copy_message > 0 && (
                <Statistic title="Copy Message" value={shares.copy_message} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
        </Flex>
    );
}

function LinkBreakdown({ links }: { links: OBPLinkBreakdown }) {
    const hasAny = links.google_review > 0 || links.instagram > 0 || links.facebook > 0 || links.website > 0;
    if (!hasAny) return null;

    return (
        <Flex gap={16} wrap="wrap">
            {links.google_review > 0 && (
                <Statistic title="Google Reviews" value={links.google_review} prefix={<LuGlobe size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {links.instagram > 0 && (
                <Statistic title="Instagram" value={links.instagram} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {links.facebook > 0 && (
                <Statistic title="Facebook" value={links.facebook} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
            {links.website > 0 && (
                <Statistic title="Website" value={links.website} prefix={<LuExternalLink size={12} />} valueStyle={{ fontSize: 16 }} />
            )}
        </Flex>
    );
}

function WeeklyTrend({ weeks }: { weeks: OBPHistoricalWeek[] }) {
    if (weeks.length === 0) return null;
    const maxViews = Math.max(...weeks.map(w => w.views), 1);

    return (
        <div>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                Weekly Trend (Last 4 Weeks)
            </Text>
            <Flex gap={4} align="flex-end" style={{ height: 48 }}>
                {weeks.map((week, i) => (
                    <Flex key={i} vertical align="center" gap={2} style={{ flex: 1 }}>
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
                {weeks.map((week, i) => (
                    <Text key={i} style={{ fontSize: 9, color: '#bbb', flex: 1, textAlign: 'center' }}>
                        {week.weekLabel}
                    </Text>
                ))}
            </Flex>
        </div>
    );
}

// ── Main Component ──

const OBPMetricsCard: React.FC = () => {
    const { data, loading, loadingToday } = useOBPDashboard();

    if (!FEATURE_FLAGS.ENABLE_OBP || loading) return null;

    const today = data?.today;
    const overview = data?.overview;
    const overall = data?.overall;

    // Don't render if no data at all
    if (!overview && !overall) return null;
    if (overview?.status === 'no_data' && !overall) return null;

    return (
        <Card
            className={styles.obpCard}
            variant="borderless"
            title={
                <span>
                    <LuGlobe size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Official Business Page
                </span>
            }
            extra={
                overview?.status === 'working'
                    ? <Tag color="success" style={{ fontSize: 11 }}>Active</Tag>
                    : overview?.status === 'low_activity'
                        ? <Tag color="warning" style={{ fontSize: 11 }}>Low Activity</Tag>
                        : <Tag style={{ fontSize: 11 }}>No Data</Tag>
            }
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Actions count final OBP clicks on Call, WhatsApp, Directions, Reserve, and Order. They show customer intent, not completed calls or orders.
            </Text>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                Shares come from the official business link card. Link taps count Google review, Instagram, Facebook, and website visits from the public OBP.
            </Text>

            <Text type="secondary" style={{ fontSize: 12 }}>Today so far</Text>
            {loadingToday && !today ? (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Loading current OBP activity…
                </Text>
            ) : today ? (
                <>
                    <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                        <Col xs={12} sm={6}>
                            <Statistic title="Page Views" value={today.views} prefix={<LuGlobe size={14} />} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="View Menu Clicks" value={today.menuClicks} prefix={<LuExternalLink size={14} />} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Actions" value={today.actionClicks} prefix={<LuTrendingUp size={14} />} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Shares" value={today.shares} valueStyle={{ fontSize: 18 }} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Link Taps" value={today.linkClicks} prefix={<LuExternalLink size={14} />} />
                        </Col>
                    </Row>
                    <div style={{ marginTop: 12 }}>
                        <ActionBreakdown actions={today.actions} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <LinkBreakdown links={today.links} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <ShareBreakdown shares={today.shareMethods} />
                    </div>
                </>
            ) : (
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    No OBP activity yet today. Settled OBP analytics appear below.
                </Text>
            )}

            {/* This Week (WTD) */}
            {overview?.wtd && (
                <>
                    <Divider style={{ margin: '16px 0 12px' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>This Week</Text>
                    <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Page Views"
                                value={overview.wtd.views}
                                prefix={<LuGlobe size={14} />}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="View Menu Clicks"
                                value={overview.wtd.menuClicks}
                                prefix={<LuExternalLink size={14} />}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Actions"
                                value={overview.wtd.actionClicks}
                                prefix={<LuTrendingUp size={14} />}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Link Taps"
                                value={overview.wtd.linkClicks}
                                prefix={<LuExternalLink size={14} />}
                            />
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
            )}

            {/* Month-to-Date */}
            {overview?.mtd && (
                <>
                    <Divider style={{ margin: '16px 0 12px' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>{overview.mtd.monthName}</Text>
                    <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                        <Col xs={12} sm={8}>
                            <Statistic title="Views" value={overview.mtd.views} valueStyle={{ fontSize: 18 }} />
                        </Col>
                        <Col xs={12} sm={8}>
                            <Statistic title="Actions" value={overview.mtd.actionClicks} valueStyle={{ fontSize: 18 }} />
                        </Col>
                        <Col xs={12} sm={8}>
                            <Statistic title="Link Taps" value={overview.mtd.linkClicks} valueStyle={{ fontSize: 18 }} />
                        </Col>
                    </Row>
                    <Row gutter={[16, 12]} style={{ marginTop: 8 }}>
                        <Col xs={12} sm={8}>
                            <Statistic title="Shares" value={overview.mtd.shares} valueStyle={{ fontSize: 18 }} />
                        </Col>
                        <Col xs={12} sm={8}>
                            <Statistic title="Days Active" value={overview.mtd.daysWithData} valueStyle={{ fontSize: 18 }} />
                        </Col>
                    </Row>
                </>
            )}

            {/* Historical Weeks Trend */}
            {overview && overview.historicalWeeks.length > 1 && (
                <>
                    <Divider style={{ margin: '16px 0 12px' }} />
                    <WeeklyTrend weeks={overview.historicalWeeks} />
                </>
            )}

            {/* Lifetime Footer */}
            {overall && (
                <>
                    <Divider style={{ margin: '16px 0 12px' }} />
                    <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            Lifetime: {overall.lifetimeViews.toLocaleString()} views, {overall.lifetimeMenuClicks.toLocaleString()} View Menu clicks, {overall.lifetimeActionClicks.toLocaleString()} actions, {overall.lifetimeLinkClicks.toLocaleString()} link taps, {overall.lifetimeShares.toLocaleString()} shares
                        </Text>
                        {overall.firstDataDate && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Since {overall.firstDataDate}
                            </Text>
                        )}
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
            )}
        </Card>
    );
};

export default OBPMetricsCard;
