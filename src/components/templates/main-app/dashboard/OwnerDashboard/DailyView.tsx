/**
 * Daily View (Guarded)
 * 
 * Quick check view for yesterday's activity.
 * STRICTLY GUARDED - follows Daily View Guardrails.
 * 
 * Guardrails enforced:
 * - No % change
 * - No comparisons
 * - No arrows
 * - Max 4 metrics
 * - AI summary max 2 bullets (descriptive only)
 * - "Low activity" message if < 20 views
 */

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyViewData, EMPTY_STATE_MESSAGES } from '@template/main-app/projects/types';
import { formatDateKey } from '@util/dateTime';
import { Alert, Card, Col, Empty, Row, Typography, theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import React from 'react';
import { LuInfo } from 'react-icons/lu';
import AISummaryCard from './AISummaryCard';
import MenuAnalyticsDetailsCard from './MenuAnalyticsDetailsCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

interface DailyViewProps {
    data: DailyViewData | null;
}

const DailyView: React.FC<DailyViewProps> = ({ data }) => {
    const labels = useOfferingLabels();
    const formatter = useFormatter();
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
                            {t('empty.noActivityYesterday')}
                        </Text>
                    }
                />
            </Card>
        );
    }

    const { metrics, aiSummary, isLowActivity, date } = data;

    // Format date for display
    const formattedDate = formatDateKey(date, formatter);

    return (
        <div className={styles.dailyView}>
            {/* Low Activity Warning */}
            {isLowActivity && (
                <Alert
                    type="info"
                    icon={<LuInfo />}
                    message={EMPTY_STATE_MESSAGES.lowActivity.title}
                    description={EMPTY_STATE_MESSAGES.lowActivity.description}
                    className={styles.lowActivityAlert}
                    showIcon
                />
            )}

            {/* AI Summary - Descriptive only */}
            {aiSummary && !isLowActivity && (
                <AISummaryCard summary={aiSummary} period="daily" />
            )}

            {/* Key Metrics - Max 4, no comparisons */}
            <Row gutter={[16, 16]} className={styles.metricsRow}>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={labels.scansLabel}
                        value={metrics.menuVisits}
                        subtitle={formattedDate}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.itemClicks')}
                        value={metrics.itemClicks}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.engagedSessions')}
                        value={`${metrics.engagedSessionRate || 0}%`}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.actionRate')}
                        value={`${metrics.actionRate || 0}%`}
                        size="small"
                    />
                </Col>
                {metrics.smartPicksRendered > 0 && (
                    <>
                        <Col xs={24} sm={12}>
                            <MetricCard
                                title={t('metrics.smartPicksShown')}
                                value={metrics.smartPicksRendered}
                                size="small"
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <MetricCard
                                title={t('metrics.smartPicksClicks')}
                                value={metrics.smartPicksClicks}
                                size="small"
                            />
                        </Col>
                    </>
                )}
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.customerActions')}
                        value={metrics.menuActionClicks || 0}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.searches')}
                        value={metrics.searches || 0}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.noResultSearches')}
                        value={metrics.zeroResultSearches || 0}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title={t('metrics.unavailableInterest')}
                        value={metrics.unavailableItemTaps || 0}
                        size="small"
                    />
                </Col>
            </Row>

            <MenuAnalyticsDetailsCard data={data} />
        </div>
    );
};

export default DailyView;
