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

import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyViewData, EMPTY_STATE_MESSAGES } from '@template/main-app/projects/types';
import { formatDateKey } from '@util/dateTime';
import { Alert, Card, Col, Empty, Row, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import React from 'react';
import { LuInfo } from 'react-icons/lu';
import AISummaryCard from './AISummaryCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';

const { Text } = Typography;

interface DailyViewProps {
    data: DailyViewData | null;
}

const DailyView: React.FC<DailyViewProps> = ({ data }) => {
    const labels = useOfferingLabels();
    const formatter = useFormatter();

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
                        title="Item Clicks"
                        value={metrics.itemClicks}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title="Engaged Sessions"
                        value={`${metrics.engagedSessionRate || 0}%`}
                        size="small"
                    />
                </Col>
                <Col xs={24} sm={12}>
                    <MetricCard
                        title="Action Rate"
                        value={`${metrics.actionRate || 0}%`}
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

            {(data.menuActions || data.topCategories?.length || data.topLanguages?.length || data.topAttributeFilters?.length || data.topSearchTerms?.length || data.topZeroResultSearchTerms?.length || data.unavailableItems?.length || (metrics.zeroResultSearches || 0) > 0) && (
                <Card className={styles.detailCard} variant="borderless">
                    {data.topCategories?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            Top category: {data.topCategories.map((category) => `${category.name || category.categoryId} (${category.views} views, ${category.clicks} taps)`).join(', ')}
                        </Text>
                    ) : null}
                    {data.topLanguages?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            Top languages: {data.topLanguages.map((language) => `${language.label || language.language} (${language.menuSessions || language.menuViews} sessions/views, ${language.adoptions || 0} stayed switches)`).join(', ')}
                        </Text>
                    ) : null}
                    {data.topAttributeFilters?.length ? (
                        <Text style={{ display: 'block', marginTop: 8 }}>
                            Top filters: {data.topAttributeFilters.map((filter) => `${filter.label || filter.filterId} (${filter.interactions} intent, ${filter.actionClicks} actions)`).join(', ')}
                        </Text>
                    ) : null}
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

export default DailyView;
