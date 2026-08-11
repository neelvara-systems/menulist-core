/**
 * Metric Card
 * 
 * Simple metric display card for the Owner Dashboard.
 * Uses Ant Design Statistic for consistent number formatting.
 * Mobile-responsive with touch-friendly sizing.
 */

import { Card, Space, Statistic, Tooltip, theme } from 'antd';
import { formatNumber } from '@util/formatters';
import React from 'react';
import { LuHelpCircle } from 'react-icons/lu';
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
    const { token } = theme.useToken();
    const formatValue = (val: number | string): string | number => {
        if (typeof val === 'number') {
            return formatNumber(val, {
                compactDisplay: 'short',
                maximumFractionDigits: 1,
                notation: Math.abs(val) >= 10000 ? 'compact' : 'standard',
            });
        }
        return val;
    };

    const titleElement = (
        <Space size={4} align="center">
            {icon && <span className={styles.metricIcon}>{icon}</span>}
            <span>{title}</span>
            {tooltip && (
                <Tooltip title={tooltip} placement="top">
                    <LuHelpCircle className={styles.tooltipIcon} />
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
                    color: token.colorText,
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
