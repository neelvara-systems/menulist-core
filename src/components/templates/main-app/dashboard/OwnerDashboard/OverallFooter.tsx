/**
 * Overall Footer
 * 
 * Shows lifetime/all-time metrics as an anchor.
 * Always visible at the bottom of the dashboard.
 * Read-only, simple presentation.
 */

import { OverallData } from '@template/main-app/projects/types';
import { formatDateKey, formatDateTime } from '@util/dateTime';
import { Card, Col, Divider, Row, Statistic, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import React from 'react';
import { LuTrophy } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface OverallFooterProps {
    data: OverallData;
}

const OverallFooter: React.FC<OverallFooterProps> = ({ data }) => {
    const { lifetimeMetrics, firstDataDate, lastUpdated } = data;
    const formatter = useFormatter();

    const formatDate = (date?: string | Date) => {
        if (!date) return 'N/A';
        return typeof date === 'string'
            ? formatDateKey(date, formatter)
            : formatDateTime(date, 'date', formatter);
    };

    return (
        <Card className={styles.overallFooter} variant="borderless">
            <div className={styles.overallHeader}>
                <LuTrophy className={styles.overallIcon} />
                <Title level={5} className={styles.overallTitle}>
                    All Time Summary
                </Title>
                {firstDataDate && (
                    <Text type="secondary" className={styles.overallDateRange}>
                        Since {formatDate(firstDataDate)}
                    </Text>
                )}
            </div>

            <Divider className={styles.overallDivider} />

            <Row gutter={[24, 16]}>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Total Menu Scans"
                        value={lifetimeMetrics.totalViews}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Total Item Clicks"
                        value={lifetimeMetrics.totalClicks}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Smart Picks Shown"
                        value={lifetimeMetrics.totalSmartPicksRendered}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Smart Picks Clicks"
                        value={lifetimeMetrics.totalSmartPicksClicks}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Engaged Sessions"
                        suffix="%"
                        value={lifetimeMetrics.engagedSessionRate || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Action Rate"
                        suffix="%"
                        value={lifetimeMetrics.actionRate || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Searches"
                        value={lifetimeMetrics.totalSearches || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="No-result Searches"
                        value={lifetimeMetrics.totalZeroResultSearches || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Customer Actions"
                        value={lifetimeMetrics.totalMenuActionClicks || 0}
                        className={styles.overallStat}
                    />
                </Col>
                <Col xs={12} sm={6}>
                    <Statistic
                        title="Unavailable Interest"
                        value={lifetimeMetrics.totalUnavailableItemTaps || 0}
                        className={styles.overallStat}
                    />
                </Col>
            </Row>

            {data.menuActions && (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {`Actions: Call ${data.menuActions.call}, WhatsApp ${data.menuActions.whatsapp}, Directions ${data.menuActions.directions}, Reserve ${data.menuActions.reserve}, Order ${data.menuActions.order}`}
                </Text>
            )}

            {data.topItems?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {`Top items: ${data.topItems.slice(0, 3).map((item) => `${item.name || item.itemId} (${item.clicks} taps)`).join(', ')}`}
                </Text>
            ) : null}

            {data.topCategories?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {`Top category: ${data.topCategories.slice(0, 3).map((category) => `${category.name || category.categoryId} (${category.views} views, ${category.clicks} taps)`).join(', ')}`}
                </Text>
            ) : null}

            {data.topLanguages?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {`Top languages: ${data.topLanguages.slice(0, 3).map((language) => `${language.label || language.language} (${language.menuSessions || language.menuViews} sessions/views, ${language.adoptions || 0} stayed switches)`).join(', ')}`}
                </Text>
            ) : null}

            {data.topAttributeFilters?.length ? (
                <Text type="secondary" className={styles.lastUpdated} style={{ display: 'block', marginTop: 8 }}>
                    {`Top filters: ${data.topAttributeFilters.slice(0, 3).map((filter) => `${filter.label || filter.filterId} (${filter.interactions} intent, ${filter.actionClicks} actions)`).join(', ')}`}
                </Text>
            ) : null}

            {lastUpdated && (
                <Text type="secondary" className={styles.lastUpdated}>
                    Last updated: {formatDate(lastUpdated)}
                </Text>
            )}
        </Card>
    );
};

export default OverallFooter;
