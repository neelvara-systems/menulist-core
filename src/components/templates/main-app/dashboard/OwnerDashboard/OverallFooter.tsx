/**
 * Overall Footer
 * 
 * Shows lifetime/all-time metrics as an anchor.
 * Always visible at the bottom of the dashboard.
 * Read-only, simple presentation.
 */

import { TrophyOutlined } from '@ant-design/icons';
import { OverallData } from '@template/main-app/projects/types';
import { Card, Col, Divider, Row, Statistic, Typography } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface OverallFooterProps {
    data: OverallData;
}

const OverallFooter: React.FC<OverallFooterProps> = ({ data }) => {
    const { lifetimeMetrics, firstDataDate, lastUpdated } = data;

    const formatDate = (date?: string | Date) => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <Card className={styles.overallFooter} variant="borderless">
            <div className={styles.overallHeader}>
                <TrophyOutlined className={styles.overallIcon} />
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
            </Row>

            {lastUpdated && (
                <Text type="secondary" className={styles.lastUpdated}>
                    Last updated: {formatDate(lastUpdated)}
                </Text>
            )}
        </Card>
    );
};

export default OverallFooter;
