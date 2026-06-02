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

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { EMPTY_STATE_MESSAGES, MonthlyViewData } from '@template/main-app/projects/types';
import { formatDateKey } from '@util/dateTime';
import { Card, Col, Empty, Row, Statistic, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import React from 'react';
import { LuCheckCircle } from 'react-icons/lu';
import AISummaryCard from './AISummaryCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface MonthlyViewProps {
    data: MonthlyViewData | null;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ data }) => {
    const labels = useOfferingLabels();
    const formatter = useFormatter();

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
    const monthName = formatDateKey(monthStart, formatter);

    const smartPicksEngagementRate = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    return (
        <div className={styles.monthlyView}>
            {/* Month Header */}
            <Card className={styles.monthHeader} variant="borderless">
                <div className={styles.monthHeaderContent}>
                    <LuCheckCircle className={styles.monthIcon} />
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
                        title="Engaged Sessions"
                        value={`${metrics.engagedSessionRate || 0}%`}
                        subtitle="menu interest"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Action Rate"
                        value={`${metrics.actionRate || 0}%`}
                        subtitle="final actions"
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
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Customer Actions"
                        value={metrics.menuActionClicks || 0}
                        subtitle="final clicks"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Searches"
                        value={metrics.searches || 0}
                        subtitle="demand checks"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="No-result Searches"
                        value={metrics.zeroResultSearches || 0}
                        subtitle="no match found"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title="Unavailable Interest"
                        value={metrics.unavailableItemTaps || 0}
                        subtitle="missed demand"
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

            {(data.menuActions || data.topCategories?.length || data.topLanguages?.length || data.topAttributeFilters?.length || data.topSearchTerms?.length || data.topZeroResultSearchTerms?.length || data.unavailableItems?.length || (metrics.zeroResultSearches || 0) > 0) && (
                <Card className={styles.detailCard} variant="borderless">
                    <Title level={5}>What customers tried to do</Title>
                    {data.topCategories?.length ? (
                        <Text style={{ display: 'block', marginBottom: 8 }}>
                            Top category: {data.topCategories.slice(0, 3).map((category) => `${category.name || category.categoryId} (${category.views} views, ${category.clicks} taps)`).join(', ')}
                        </Text>
                    ) : null}
                    {data.topLanguages?.length ? (
                        <Text style={{ display: 'block', marginBottom: 8 }}>
                            Top languages: {data.topLanguages.slice(0, 3).map((language) => `${language.label || language.language} (${language.menuSessions || language.menuViews} sessions/views, ${language.adoptions || 0} stayed switches)`).join(', ')}
                        </Text>
                    ) : null}
                    {data.topAttributeFilters?.length ? (
                        <Text style={{ display: 'block', marginBottom: 8 }}>
                            Top filters: {data.topAttributeFilters.slice(0, 3).map((filter) => `${filter.label || filter.filterId} (${filter.interactions} intent, ${filter.actionClicks} actions)`).join(', ')}
                        </Text>
                    ) : null}
                    <Text type="secondary">
                        Actions: Call {data.menuActions?.call || 0}, WhatsApp {data.menuActions?.whatsapp || 0}, Directions {data.menuActions?.directions || 0}, Reserve {data.menuActions?.reserve || 0}, Order {data.menuActions?.order || 0}
                    </Text>
                    {data.topSearchTerms?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            Top searches: {data.topSearchTerms.map((term) => `${term.term} (${term.count})`).join(', ')}
                        </Text>
                    ) : null}
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        No-result searches: {metrics.zeroResultSearches || 0}
                    </Text>
                    {data.topZeroResultSearchTerms?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            No-result terms: {data.topZeroResultSearchTerms.map((term) => `${term.term} (${term.count})`).join(', ')}
                        </Text>
                    ) : null}
                    {data.unavailableItems?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            Unavailable interest: {data.unavailableItems.map((item) => `${item.name || item.itemId} (${item.clicks})`).join(', ')}
                        </Text>
                    ) : null}
                </Card>
            )}
        </div>
    );
};

export default MonthlyView;
