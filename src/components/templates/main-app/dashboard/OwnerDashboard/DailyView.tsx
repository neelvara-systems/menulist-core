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

import { InfoCircleOutlined } from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyViewData, EMPTY_STATE_MESSAGES } from '@template/main-app/projects/types';
import { Alert, Card, Col, Empty, Row, Typography } from 'antd';
import React from 'react';
import AISummaryCard from './AISummaryCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

interface DailyViewProps {
    data: DailyViewData | null;
}

const DailyView: React.FC<DailyViewProps> = ({ data }) => {
    const labels = useOfferingLabels();

    if (!data) {
        return (
            <Card className={styles.emptyCard}>
                <Empty
                    description={
                        <Text type="secondary">
                            No activity recorded yesterday
                        </Text>
                    }
                />
            </Card>
        );
    }

    const { metrics, aiSummary, isLowActivity, date } = data;

    // Format date for display
    const formattedDate = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
    });

    return (
        <div className={styles.dailyView}>
            {/* Low Activity Warning */}
            {isLowActivity && (
                <Alert
                    type="info"
                    icon={<InfoCircleOutlined />}
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
                        title="Item Clicks"
                        value={metrics.itemClicks}
                        size="small"
                    />
                </Col>
                {metrics.smartPicksRendered > 0 && (
                    <>
                        <Col xs={24} sm={12}>
                            <MetricCard
                                title="Smart Picks Shown"
                                value={metrics.smartPicksRendered}
                                size="small"
                            />
                        </Col>
                        <Col xs={24} sm={12}>
                            <MetricCard
                                title="Smart Picks Clicks"
                                value={metrics.smartPicksClicks}
                                size="small"
                            />
                        </Col>
                    </>
                )}
                <Col xs={24} sm={12}>
                    <MetricCard
                        title="Customer Actions"
                        value={metrics.menuActionClicks || 0}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title="Searches"
                        value={metrics.searches || 0}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title="No-result Searches"
                        value={metrics.zeroResultSearches || 0}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title="Unavailable Interest"
                        value={metrics.unavailableItemTaps || 0}
                        size="small"
                    />
                </Col>
            </Row>

            {(data.menuActions || data.topSearchTerms?.length || data.unavailableItems?.length || (metrics.zeroResultSearches || 0) > 0) && (
                <Card className={styles.detailCard} variant="borderless">
                    {data.menuActions ? (
                        <Text type="secondary">
                            Customer actions: Call {data.menuActions.call}, WhatsApp {data.menuActions.whatsapp}, Directions {data.menuActions.directions}, Reserve {data.menuActions.reserve}, Order {data.menuActions.order}
                        </Text>
                    ) : null}
                    {data.topSearchTerms?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            Top searches: {data.topSearchTerms.map((term) => `${term.term} (${term.count})`).join(', ')}
                        </Text>
                    ) : null}
                    <Text style={{ display: 'block', marginTop: 8 }}>
                        No-result searches: {metrics.zeroResultSearches || 0}
                    </Text>
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

export default DailyView;
