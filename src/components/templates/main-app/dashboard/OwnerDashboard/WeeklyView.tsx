/**
 * Weekly View (PRIMARY)
 * 
 * The default and most prominent view for the Owner Dashboard.
 * Shows weekly performance with AI summary and key metrics.
 * 
 * Features:
 * - AI Summary (max 5 bullets)
 * - Key metrics with % change from previous week
 * - Top performing items
 * - Smart Picks performance
 */

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { EMPTY_STATE_MESSAGES, WeeklyViewData } from '@template/main-app/projects/types';
import { Card, Col, Empty, Row, Typography } from 'antd';
import React from 'react';
import { LuEye, LuFlame, LuSmartphone, LuZap } from 'react-icons/lu';
import AISummaryCard from './AISummaryCard';
import MenuAnalyticsDetailsCard from './MenuAnalyticsDetailsCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

interface WeeklyViewProps {
    data: WeeklyViewData | null;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({ data }) => {
    const labels = useOfferingLabels();

    if (!data) {
        return (
            <Card className={styles.emptyCard}>
                <Empty
                    description={
                        <Text type="secondary">
                            {EMPTY_STATE_MESSAGES.noWeeklyData.description}
                        </Text>
                    }
                />
            </Card>
        );
    }

    const { metrics, metricsChange, aiSummary } = data;

    const smartPicksEngagementRate = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    return (
        <div className={styles.weeklyView}>
            {/* AI Summary - Most prominent */}
            {aiSummary && (
                <AISummaryCard summary={aiSummary} period="weekly" />
            )}

            {/* Key Metrics */}
            <Row gutter={[16, 16]} className={styles.metricsRow}>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={labels.scansLabel}
                        value={metrics.menuVisits}
                        icon={<LuEye />}
                        subtitle={metricsChange?.menuVisitsChange !== undefined
                            ? `${metricsChange.menuVisitsChange > 0 ? '+' : ''}${metricsChange.menuVisitsChange}% vs last week`
                            : undefined}
                        tooltip={labels.scansTooltip}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Item Clicks"
                        value={metrics.itemClicks}
                        icon={<LuSmartphone />}
                        tooltip="Number of times customers tapped on items"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Engaged Sessions"
                        value={`${metrics.engagedSessionRate || 0}%`}
                        tooltip="Sessions where customers showed real menu interest"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Action Rate"
                        value={`${metrics.actionRate || 0}%`}
                        tooltip="Sessions that led to a final customer action"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Smart Picks Shown"
                        value={metrics.smartPicksRendered}
                        icon={<LuZap />}
                        tooltip="How many times Smart Picks appeared on your page"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Smart Picks Used"
                        value={`${smartPicksEngagementRate}%`}
                        icon={<LuFlame />}
                        subtitle={`${metrics.smartPicksClicks} clicks`}
                        tooltip="Percentage of customers who used Smart Picks"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Customer Actions"
                        value={metrics.menuActionClicks || 0}
                        tooltip="Final actions like call, WhatsApp, directions, reserve, and order"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Searches"
                        value={metrics.searches || 0}
                        tooltip="De-duplicated search demand from the menu"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Unavailable Interest"
                        value={metrics.unavailableItemTaps || 0}
                        tooltip="Taps on unavailable items"
                    />
                </Col>
            </Row>

            <MenuAnalyticsDetailsCard data={data} />
        </div>
    );
};

export default WeeklyView;
