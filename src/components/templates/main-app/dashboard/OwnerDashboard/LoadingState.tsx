/**
 * Loading State
 * 
 * Skeleton loading state for the dashboard.
 * Shows placeholder content while data loads.
 */

import { Card, Col, Row, Skeleton, Space } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const LoadingState: React.FC = () => {
    return (
        <div className={styles.loadingState}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Tabs Skeleton */}
                <Card variant="borderless">
                    <Skeleton.Button active block style={{ height: 40 }} />
                </Card>

                {/* AI Summary Skeleton */}
                <Card variant="borderless">
                    <Skeleton active paragraph={{ rows: 3 }} />
                </Card>

                {/* Metrics Skeleton */}
                <Row gutter={[16, 16]}>
                    {[1, 2, 3, 4].map((i) => (
                        <Col xs={24} sm={12} lg={6} key={i}>
                            <Card variant="borderless">
                                <Skeleton active paragraph={{ rows: 1 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Content Skeleton */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card variant="borderless">
                            <Skeleton active paragraph={{ rows: 4 }} />
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card variant="borderless">
                            <Skeleton active paragraph={{ rows: 4 }} />
                        </Card>
                    </Col>
                </Row>

                {/* Footer Skeleton */}
                <Card variant="borderless">
                    <Skeleton active paragraph={{ rows: 2 }} />
                </Card>
            </Space>
        </div>
    );
};

export default LoadingState;
