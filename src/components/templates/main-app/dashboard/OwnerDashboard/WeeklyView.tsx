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

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useDashboardOfferingLabels } from '@hook/useDashboardOfferingLabels';
import { formatDashboardPercent } from '@lib/analytics/ownerDashboardPresentation';
import { WeeklyViewData } from '@template/main-app/projects/types';
import { Card, Col, Empty, Row, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
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
                            {t('empty.noWeeklyData')}
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
                <AISummaryCard summary={aiSummary} metrics={metrics} period="weekly" />
            )}

            {/* Key Metrics */}
            <Row gutter={[16, 16]} className={styles.metricsRow}>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={labels.scansLabel}
                        value={metrics.menuVisits}
                        icon={<LuEye />}
                        subtitle={metricsChange?.menuVisitsChange !== undefined
                            ? t('weekly.changeVsLastWeek', {
                                change: formatDashboardPercent(metricsChange.menuVisitsChange, true),
                            })
                            : undefined}
                        tooltip={labels.scansTooltip}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.itemClicks')}
                        value={metrics.itemClicks}
                        icon={<LuSmartphone />}
                        tooltip={t('tooltips.itemClicks')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.engagedSessions')}
                        value={formatDashboardPercent(metrics.engagedSessionRate)}
                        tooltip={t('tooltips.engagedSessions')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.actionRate')}
                        value={formatDashboardPercent(metrics.actionRate)}
                        tooltip={t('tooltips.actionRate')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.smartPicksShown')}
                        value={metrics.smartPicksRendered}
                        icon={<LuZap />}
                        tooltip={t('tooltips.smartPicksShown')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.smartPicksUsed')}
                        value={formatDashboardPercent(smartPicksEngagementRate)}
                        icon={<LuFlame />}
                        subtitle={t('units.clicks', { count: metrics.smartPicksClicks })}
                        tooltip={t('tooltips.smartPicksUsed')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.customerActions')}
                        value={metrics.menuActionClicks || 0}
                        tooltip={t('tooltips.customerActions')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.searches')}
                        value={metrics.searches || 0}
                        tooltip={t('tooltips.searches')}
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title={t('metrics.unavailableInterest')}
                        value={metrics.unavailableItemTaps || 0}
                        tooltip={t('tooltips.unavailableInterest')}
                    />
                </Col>
            </Row>

            <MenuAnalyticsDetailsCard data={data} />
        </div>
    );
};

export default WeeklyView;
