/**
 * Empty State
 * 
 * Friendly empty state for when there's no data.
 * Non-alarming, encouraging tone.
 */

import { LineChartOutlined } from '@ant-design/icons';
import { Card, Empty, Typography } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    description,
    icon,
}) => {
    return (
        <Card className={styles.emptyStateCard}>
            <Empty
                image={icon || <LineChartOutlined className={styles.emptyIcon} />}
                imageStyle={{ height: 60, fontSize: 48, color: '#d9d9d9' }}
                description={
                    <div className={styles.emptyContent}>
                        <Title level={5} className={styles.emptyTitle}>
                            {title}
                        </Title>
                        <Text type="secondary" className={styles.emptyDescription}>
                            {description}
                        </Text>
                    </div>
                }
            />
        </Card>
    );
};

export default EmptyState;
