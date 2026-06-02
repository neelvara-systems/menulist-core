/**
 * Empty State
 * 
 * Friendly empty state for when there's no data.
 * Non-alarming, encouraging tone.
 */

import { Card, Empty, Typography, theme } from 'antd';
import React from 'react';
import { LuLineChart } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

const { Text, Title } = Typography;
const { useToken } = theme;

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
    const { token } = useToken();

    return (
        <Card className={styles.emptyStateCard}>
            <Empty
                image={icon || <LuLineChart className={styles.emptyIcon} />}
                imageStyle={{ height: 60, fontSize: 48, color: token.colorTextQuaternary }}
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
