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

import { AppstoreOutlined, EyeOutlined, FallOutlined, FireOutlined, RiseOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { EMPTY_STATE_MESSAGES, WeeklyViewData } from '@template/main-app/projects/types';
import { Card, Col, Empty, Row, Tag, Typography } from 'antd';
import React from 'react';
import AISummaryCard from './AISummaryCard';
import MetricCard from './MetricCard';
import styles from './OwnerDashboard.module.scss';
import TopItemsList from './TopItemsList';

const { Text, Title } = Typography;

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

    const { metrics, metricsChange, aiSummary, topItems, blockPerformance } = data;

    const smartPicksEngagementRate = metrics.smartPicksRendered > 0
        ? Math.round((metrics.smartPicksClicks / metrics.smartPicksRendered) * 100)
        : 0;

    const renderChangeTag = (change: number | undefined) => {
        if (change === undefined || change === 0) return null;

        const isPositive = change > 0;
        return (
            <Tag
                color={isPositive ? 'green' : 'orange'}
                className={styles.changeTag}
            >
                {isPositive ? <RiseOutlined /> : <FallOutlined />}
                {isPositive ? '+' : ''}{change}%
            </Tag>
        );
    };

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
                        icon={<EyeOutlined />}
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
                        icon={<AppstoreOutlined />}
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
                        icon={<ThunderboltOutlined />}
                        tooltip="How many times Smart Picks appeared on your page"
                    />
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <MetricCard
                        title="Smart Picks Used"
                        value={`${smartPicksEngagementRate}%`}
                        icon={<FireOutlined />}
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

            {/* Top Items and Block Performance */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <TopItemsList items={topItems} title="Most Popular Items" />
                    {data.topCategories?.length ? (
                        <Card className={styles.detailCard} variant="borderless" style={{ marginTop: 16 }}>
                            <Title level={5}>Top Category</Title>
                            <Text type="secondary">
                                {data.topCategories.slice(0, 3).map((category) => `${category.name || category.categoryId} (${category.views} views, ${category.clicks} taps)`).join(', ')}
                            </Text>
                        </Card>
                    ) : null}
                    {data.topLanguages?.length ? (
                        <Card className={styles.detailCard} variant="borderless" style={{ marginTop: 16 }}>
                            <Title level={5}>Top Languages</Title>
                            <Text type="secondary">
                                {data.topLanguages.slice(0, 3).map((language) => `${language.label || language.language} (${language.menuSessions || language.menuViews} sessions/views, ${language.adoptions || 0} stayed switches)`).join(', ')}
                            </Text>
                        </Card>
                    ) : null}
                    {data.topAttributeFilters?.length ? (
                        <Card className={styles.detailCard} variant="borderless" style={{ marginTop: 16 }}>
                            <Title level={5}>Top Filters</Title>
                            <Text type="secondary">
                                {data.topAttributeFilters.slice(0, 3).map((filter) => `${filter.label || filter.filterId} (${filter.interactions} intent, ${filter.actionClicks} actions)`).join(', ')}
                            </Text>
                        </Card>
                    ) : null}
                </Col>
                <Col xs={24} lg={12}>
                    <Card className={styles.blockPerformanceCard} variant="borderless">
                        <Title level={5}>Smart Picks Performance</Title>
                        <div className={styles.blockList}>
                            <div className={styles.blockItem}>
                                <Text>Popular Items</Text>
                                <Text type="secondary">
                                    {blockPerformance.popular.clicks} clicks from {blockPerformance.popular.rendered} views
                                </Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>Quick Pick</Text>
                                <Text type="secondary">
                                    {blockPerformance.quickPick.clicks} clicks from {blockPerformance.quickPick.rendered} views
                                </Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>Best Value</Text>
                                <Text type="secondary">
                                    {blockPerformance.bestValue.clicks} clicks from {blockPerformance.bestValue.rendered} views
                                </Text>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className={styles.blockPerformanceCard} variant="borderless">
                        <Title level={5}>Customer Actions</Title>
                        <div className={styles.blockList}>
                            <div className={styles.blockItem}>
                                <Text>Call</Text>
                                <Text type="secondary">{data.menuActions?.call || 0}</Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>WhatsApp</Text>
                                <Text type="secondary">{data.menuActions?.whatsapp || 0}</Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>Directions</Text>
                                <Text type="secondary">{data.menuActions?.directions || 0}</Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>Reserve</Text>
                                <Text type="secondary">{data.menuActions?.reserve || 0}</Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>Order</Text>
                                <Text type="secondary">{data.menuActions?.order || 0}</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className={styles.blockPerformanceCard} variant="borderless">
                        <Title level={5}>Search Demand</Title>
                        <div className={styles.blockList}>
                            <div className={styles.blockItem}>
                                <Text>Total Searches</Text>
                                <Text type="secondary">{metrics.searches || 0}</Text>
                            </div>
                            <div className={styles.blockItem}>
                                <Text>No-result Searches</Text>
                                <Text type="secondary">{metrics.zeroResultSearches || 0}</Text>
                            </div>
                            {data.topZeroResultSearchTerms?.slice(0, 3).map((term) => (
                                <div className={styles.blockItem} key={`zero-${term.term}`}>
                                    <Text>No-result: {term.term}</Text>
                                    <Text type="secondary">{term.count}</Text>
                                </div>
                            ))}
                            {data.topSearchTerms?.slice(0, 3).map((term) => (
                                <div className={styles.blockItem} key={term.term}>
                                    <Text>{term.term}</Text>
                                    <Text type="secondary">{term.count}</Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className={styles.blockPerformanceCard} variant="borderless">
                        <Title level={5}>Unavailable Interest</Title>
                        <div className={styles.blockList}>
                            <div className={styles.blockItem}>
                                <Text>Total Taps</Text>
                                <Text type="secondary">{metrics.unavailableItemTaps || 0}</Text>
                            </div>
                            {data.unavailableItems?.slice(0, 3).map((item) => (
                                <div className={styles.blockItem} key={item.itemId}>
                                    <Text>{item.name || item.itemId}</Text>
                                    <Text type="secondary">{item.clicks}</Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default WeeklyView;
