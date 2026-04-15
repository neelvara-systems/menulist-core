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
    getOBPDashboardData,
    OBPHistoricalWeek
} from '@database/ownerDashboard';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Card, Col, Divider, Flex, Row, Statistic, Tag, Typography } from 'antd';
import React, { useContext } from 'react';
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
import useSWR from 'swr';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

// ── Sub-components ──

function ChangeIndicator({ change }: { change: number | null }) {
    if (change === null) return <Text type="secondary" style={{ fontSize: 11 }}>No comparison</Text>;
    if (change === 0) return <Tag icon={<LuMinus size={10} />} color="default" style={{ fontSize: 11 }}>Same as last week</Tag>;
    if (change > 0) return <Tag icon={<LuArrowUpRight size={10} />} color="success" style={{ fontSize: 11 }}>+{change}% vs last week</Tag>;
    return <Tag icon={<LuArrowDownRight size={10} />} color="warning" style={{ fontSize: 11 }}>{change}% vs last week</Tag>;
}

function ActionBreakdown({ actions }: { actions: { call: number; whatsapp: number; directions: number } }) {
    const hasAny = actions.call > 0 || actions.whatsapp > 0 || actions.directions > 0;
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
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    const tId = storeDetails?.tenantId ? String(storeDetails.tenantId) : null;
    const sId = storeDetails?.storeId ? String(storeDetails.storeId) : null;
    const canFetch = FEATURE_FLAGS.ENABLE_OBP && !!tId && !!sId;

    const { data, isLoading } = useSWR(
        canFetch ? ['obpDashboard', tId, sId] : null,
        () => getOBPDashboardData(tId!, sId!),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateOnMount: false,
            dedupingInterval: 3600000,
            errorRetryCount: 1,
        }
    );

    if (!FEATURE_FLAGS.ENABLE_OBP || isLoading) return null;

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
            {/* This Week (WTD) */}
            {overview?.wtd && (
                <>
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
                                title="Menu Opens"
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
                            <div style={{ paddingTop: 4 }}>
                                <ChangeIndicator change={overview.viewsChange} />
                            </div>
                        </Col>
                    </Row>
                    <div style={{ marginTop: 12 }}>
                        <ActionBreakdown actions={overview.wtd.actions} />
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
                            Lifetime: {overall.lifetimeViews.toLocaleString()} views, {overall.lifetimeMenuClicks.toLocaleString()} menu opens, {overall.lifetimeActionClicks.toLocaleString()} actions
                        </Text>
                        {overall.firstDataDate && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Since {overall.firstDataDate}
                            </Text>
                        )}
                    </Flex>
                </>
            )}
        </Card>
    );
};

export default OBPMetricsCard;
