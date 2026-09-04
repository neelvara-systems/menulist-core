/**
 * MetricCard Component
 * Displays a single KPI with trend indicator
 */

import React from 'react';
import { Card, Statistic, Space, Typography, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;

export interface MetricCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: string;
  trend?: {
    value: number; // Percentage change
    isPositive: boolean;
    label?: string; // e.g., "vs last week"
  };
  loading?: boolean;
  precision?: number;
  icon?: React.ReactNode;
  color?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  suffix,
  prefix,
  trend,
  loading = false,
  precision = 0,
  icon,
  color,
  onClick,
  className,
}) => {
  const { token } = theme.useToken();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  const trendColor = trend
    ? trend.isPositive
      ? token.colorSuccess
      : token.colorError
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        hoverable={!!onClick}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={className}
        loading={loading}
        style={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {/* Title Row */}
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {title}
            </Text>
            {icon && (
              <div
                style={{
                  fontSize: 20,
                  color: color || token.colorPrimary,
                }}
              >
                {icon}
              </div>
            )}
          </Space>

          {/* Value */}
          <Statistic
            value={value}
            suffix={suffix}
            prefix={prefix}
            precision={precision}
            valueStyle={{
              fontSize: 28,
              fontWeight: 600,
              color: color || token.colorText,
            }}
          />

          {/* Trend Indicator */}
          {trend && (
            <Space size={4} align="center">
              {trend.isPositive ? (
                <ArrowUpOutlined style={{ color: trendColor, fontSize: 12 }} />
              ) : (
                <ArrowDownOutlined style={{ color: trendColor, fontSize: 12 }} />
              )}
              <Text
                style={{
                  color: trendColor,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {Math.abs(trend.value)}%
              </Text>
              {trend.label && (
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {trend.label}
                </Text>
              )}
            </Space>
          )}
        </Space>
      </Card>
    </motion.div>
  );
};

export default MetricCard;
