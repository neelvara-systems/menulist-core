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

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useDashboardOfferingLabels } from '@hook/useDashboardOfferingLabels';
import { formatDashboardMonth, formatDashboardPercent } from '@lib/analytics/ownerDashboardPresentation';
import { MonthlyViewData } from '@template/main-app/projects/types';
import { formatNumber } from '@util/formatters';
import { Card, Col, Empty, Row, Statistic, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import { LuCheckCircle } from 'react-icons/lu';
import AISummaryCard from './AISummaryCard';
import MenuAnalyticsDetailsCard from './MenuAnalyticsDetailsCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface MonthlyViewProps {
    data: MonthlyViewData | null;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ data }) => {
    const labels = useDashboardOfferingLabels();
    const t = useTranslations('Dashboard.owner');
    const { token } = theme.useToken();

    if (!data) {
        return (
            <Card className={styles.emptyCard}>
                <Empty
                    image={(
                        <ContextualStateIllustration
                            color={token.colorPrimary}
                            size={112}
                            treatment="softHalo"
                            variant="analyticsContext"
                        />
                    )}
                    imageStyle={{ height: 112 }}
                    description={
                        <Text type="secondary">
                            {t('empty.noMonthlyData')}
                        </Text>
                    }
                />
            </Card>
        );
    }

    const { metrics, aiSummary, daysWithData, monthStart } = data;

    // Format month for display
    const monthName = formatDashboardMonth(monthStart, t('periods.thisMonth'));

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
                            {t('monthly.daysOfActivityRecorded', { count: daysWithData })}
                        </Text>
                    </div>
                </div>
            </Card>

            {/* AI Summary - Calm, reassuring */}
            {aiSummary && (
                <AISummaryCard summary={aiSummary} metrics={metrics} period="monthly" />
            )}

            {/* Key Metrics - Neutral presentation */}
            <Row gutter={[16, 16]} className={styles.metricsRow}>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.totalMenuScans')}
                        value={metrics.menuVisits}
                        subtitle={t('periods.thisMonthLower')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.totalItemClicks')}
                        value={metrics.itemClicks}
                        subtitle={t('periods.thisMonthLower')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.engagedSessions')}
                        value={formatDashboardPercent(metrics.engagedSessionRate)}
                        subtitle={t('subtitles.menuInterest')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.actionRate')}
                        value={formatDashboardPercent(metrics.actionRate)}
                        subtitle={t('subtitles.finalActions')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.smartPicksShown')}
                        value={metrics.smartPicksRendered}
                        subtitle={t('subtitles.timesDisplayed')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.smartPicksEngagement')}
                        value={formatDashboardPercent(smartPicksEngagementRate)}
                        subtitle={t('units.totalClicks', { count: metrics.smartPicksClicks })}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.customerActions')}
                        value={metrics.menuActionClicks || 0}
                        subtitle={t('subtitles.finalClicks')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.searches')}
                        value={metrics.searches || 0}
                        subtitle={t('subtitles.demandChecks')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.noResultSearches')}
                        value={metrics.zeroResultSearches || 0}
                        subtitle={t('subtitles.noMatchFound')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.unavailableInterest')}
                        value={metrics.unavailableItemTaps || 0}
                        subtitle={t('subtitles.missedDemand')}
                    />
                </Col>
            </Row>

            {/* Subscription Value Summary */}
            <Card className={styles.subscriptionValue} variant="borderless">
                <Title level={5}>{labels.thisMonthLabel}</Title>
                <Row gutter={[24, 16]}>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title={t('metrics.activeDays')}
                            value={formatNumber(daysWithData)}
                            suffix={t('units.days')}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title={t('metrics.avgDailyScans')}
                            value={formatNumber(daysWithData > 0 ? Math.round(metrics.menuVisits / daysWithData) : 0)}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title={t('metrics.smartPicksActive')}
                            value={metrics.smartPicksRendered > 0 ? t('states.yes') : t('states.no')}
                        />
                    </Col>
                    <Col xs={12} sm={6}>
                        <Statistic
                            title={t('metrics.engagementRate')}
                            value={formatDashboardPercent(smartPicksEngagementRate)}
                        />
                    </Col>
                </Row>
            </Card>

            <MenuAnalyticsDetailsCard data={data} />
        </div>
    );
};

export default MonthlyView;
