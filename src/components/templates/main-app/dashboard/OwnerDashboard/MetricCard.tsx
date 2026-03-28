/**
 * Metric Card
 * 
 * Simple metric display card for the Owner Dashboard.
 * Uses Ant Design Statistic for consistent number formatting.
 * Mobile-responsive with touch-friendly sizing.
 */

import { QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Space, Statistic, Tooltip } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

interface MetricCardProps {
    title: string;
    value: number | string;
    subtitle?: string;
    tooltip?: string;
    icon?: React.ReactNode;
    size?: 'default' | 'small';
    prefix?: React.ReactNode;
    suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    subtitle,
    tooltip,
    icon,
    size = 'default',
    prefix,
    suffix,
}) => {
    const formatValue = (val: number | string): string | number => {
        if (typeof val === 'number') {
            if (val >= 1000000) {
                return `${(val / 1000000).toFixed(1)}M`;
            }
            if (val >= 10000) {
                return `${(val / 1000).toFixed(1)}K`;
            }
            return val;
        }
        return val;
    };

    const titleElement = (
        <Space size={4} align="center">
            {icon && <span className={styles.metricIcon}>{icon}</span>}
            <span>{title}</span>
            {tooltip && (
                <Tooltip title={tooltip} placement="top">
                    <QuestionCircleOutlined className={styles.tooltipIcon} />
                </Tooltip>
            )}
        </Space>
    );

    return (
        <Card
            className={`${styles.metricCard} ${size === 'small' ? styles.metricCardSmall : ''}`}
            variant="borderless"
            hoverable
        >
            <Statistic
                title={titleElement}
                value={formatValue(value)}
                prefix={prefix}
                suffix={suffix}
                valueStyle={{
                    fontSize: size === 'small' ? 24 : 28,
                    fontWeight: 700,
                    color: '#262626',
                    lineHeight: 1.2,
                }}
            />
            {subtitle && (
                <div className={styles.metricSubtitle}>
                    {subtitle}
                </div>
            )}
        </Card>
    );
};

export default MetricCard;
