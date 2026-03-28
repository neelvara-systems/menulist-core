/**
 * Monthly View
 * 
 * Subscription justification view.
 * Shows monthly summary in calm, reassuring tone.
 * 
 * Guardrails enforced:
 * - No week-by-week breakdown
 * - No comparisons to other businesses
 * - No negative framing
 * - No red/green language (neutral colors only)
 * - AI summary max 3 bullets (calm, reassuring)
 */

import { CheckCircleOutlined } from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { EMPTY_STATE_MESSAGES, MonthlyViewData } from '@template/main-app/projects/types';
import { Card, Col, Empty, Row, Statistic, Typography } from 'antd';
import React from 'react';
import AISummaryCard from './AISummaryCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface MonthlyViewProps {
    data: MonthlyViewData | null;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ data }) => {
    const labels = useOfferingLabels();

    if (!data) {
        return (
            <Card className={styles.emptyCard}>
                <Empty
                    description={
                        <Text type="secondary">
                            {EMPTY_STATE_MESSAGES.noMonthlyData.description}
                        </Text>
                    }
                />
            </Card>
        );
    }

    const { metrics, aiSummary, daysWithData, monthStart, monthEnd } = data;

    // Format month for display
    const monthName = new Date(monthStart).toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric',
    });

    const smartPicksEngagementRate = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    return (
        <div className={styles.monthlyView}>
            {/* Month Header */}
            <Card className={styles.monthHeader} variant="borderless">
                <div className={styles.monthHeaderContent}>
                    <CheckCircleOutlined className={styles.monthIcon} />
                    <div>
                        <Title level={4} className={styles.monthTitle}>
                            {monthName}
                        </Title>
                        <Text type="secondary">
                            {daysWithData} days of activity recorded
                        </Text>
                    </div>
                </div>
            </Card>

            {/* AI Summary - Calm, reassuring */}
            {aiSummary && (
                <AISummaryCard summary={aiSummary} period="monthly" />
            )}

            {/* Key Metrics - Neutral presentation */}
            <Row gutter={[16, 16]} className={styles.metricsRow}>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Total Menu Scans"
                        value={metrics.menuVisits}
                        subtitle="this month"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Total Item Clicks"
                        value={metrics.itemClicks}
                        subtitle="this month"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Smart Picks Shown"
                        value={metrics.smartPicksRendered}
                        subtitle="times displayed"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Smart Picks Engagement"
                        value={`${smartPicksEngagementRate}%`}
                        subtitle={`${metrics.smartPicksClicks} total clicks`}
                    />
                </Col>
            </Row>

            {/* Subscription Value Summary */}
            <Card className={styles.subscriptionValue} variant="borderless">
                <Title level={5}>{labels.thisMonthLabel}</Title>
                <Row gutter={[24, 16]}>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Active Days"
                            value={daysWithData}
                            suffix="days"
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Avg. Daily Scans"
                            value={daysWithData > 0 ? Math.round(metrics.menuVisits / daysWithData) : 0}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Smart Picks Active"
                            value={metrics.smartPicksRendered > 0 ? 'Yes' : 'No'}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title="Engagement Rate"
                            value={smartPicksEngagementRate}
                            suffix="%"
                        />
                    </Col>
                </Row>
            </Card>
        </div>
    );
};

export default MonthlyView;
