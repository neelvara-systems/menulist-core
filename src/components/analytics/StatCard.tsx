/**
 * StatCard Component
 * Displays a statistic with optional progress bar
 */

import React from 'react';
import { Card, Statistic, Progress, Space, Typography, theme, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { normalizeAnalyticsPercentage } from './analyticsPresentation';

const { Text } = Typography;

export interface StatCardProps {
  title: string;
  value: number;
  total?: number; // For progress calculation
  suffix?: string;
  prefix?: string;
  precision?: number;
  showProgress?: boolean;
  progressColor?: string;
  status?: 'success' | 'exception' | 'normal' | 'active';
  loading?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  total,
  suffix,
  prefix,
  precision = 0,
  showProgress = false,
  progressColor,
  status,
  loading = false,
  tooltip,
  icon,
  onClick,
  className,
}) => {
  const { token } = theme.useToken();

  // Calculate percentage if total is provided
  const percentage = normalizeAnalyticsPercentage(value, total ?? 0);

  // Determine progress color based on status
  const getProgressColor = () => {
    if (progressColor) return progressColor;
    
    switch (status) {
      case 'success':
        return token.colorSuccess;
      case 'exception':
        return token.colorError;
      case 'active':
        return token.colorPrimary;
      default:
        return token.colorPrimary;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        hoverable={!!onClick}
        onClick={onClick}
        className={className}
        loading={loading}
        style={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Title Row */}
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <Space size={8} align="center">
              <Text
                type="secondary"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {title}
              </Text>
              {tooltip && (
                <Tooltip title={tooltip}>
                  <InfoCircleOutlined
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: 14,
                      cursor: 'help',
                    }}
                  />
                </Tooltip>
              )}
            </Space>
            {icon && (
              <div
                style={{
                  fontSize: 24,
                  color: token.colorPrimary,
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
              fontSize: 32,
              fontWeight: 600,
              color: token.colorText,
            }}
          />

          {/* Progress Bar */}
          {showProgress && total !== undefined && (
            <div>
              <Progress
                percent={percentage}
                strokeColor={getProgressColor()}
                showInfo={false}
                size={['100%', 8]}
                style={{ marginBottom: 4 }}
              />
              <Space
                style={{
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {value.toLocaleString()} / {total.toLocaleString()}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: getProgressColor(),
                  }}
                >
                  {percentage.toFixed(1)}%
                </Text>
              </Space>
            </div>
          )}
        </Space>
      </Card>
    </motion.div>
  );
};

export default StatCard;
