/**
 * Advanced Metrics Cards Component
 * Displays FRT, Resolution Rate, and other advanced KPIs
 */

'use client';

import { Card, Col, Row, Statistic, Tooltip, Typography } from 'antd';
import { motion } from 'framer-motion';
import {
  LuClock,
  LuCheckCircle,
  LuTrendingUp,
  LuUsers,
  LuMessageSquare,
  LuZap,
} from 'react-icons/lu';
import { TrendBadge } from './TrendIndicator';
import type { ComparisonResult } from '@lib/analytics/comparison';

const { Text } = Typography;

// ================================================================
// TYPES
// ================================================================

interface AdvancedMetric {
  title: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  comparison?: ComparisonResult;
  formatter?: (value: number) => string;
}

interface AdvancedMetricsCardsProps {
  metrics: {
    firstResponseTime?: number; // in seconds
    resolutionRate?: number; // percentage
    avgSessionDuration?: number; // in minutes
    peakHour?: number; // 0-23
    activeUsers?: number;
    efficiency?: number; // messages per resolution
  };
  comparisons?: {
    firstResponseTime?: ComparisonResult;
    resolutionRate?: ComparisonResult;
    efficiency?: ComparisonResult;
  };
  loading?: boolean;
}

// ================================================================
// COMPONENT
// ================================================================

export function AdvancedMetricsCards({
  metrics,
  comparisons,
  loading = false,
}: AdvancedMetricsCardsProps) {
  const advancedMetrics: AdvancedMetric[] = [
    {
      title: 'First Response Time',
      value: metrics.firstResponseTime || 0,
      unit: 's',
      icon: <LuClock size={24} />,
      color: '#1890ff',
      description: 'Average time to first AI response',
      comparison: comparisons?.firstResponseTime,
      formatter: (val) => formatTime(val),
    },
    {
      title: 'Resolution Rate',
      value: metrics.resolutionRate || 0,
      unit: '%',
      icon: <LuCheckCircle size={24} />,
      color: '#52c41a',
      description: 'Percentage of queries successfully resolved',
      comparison: comparisons?.resolutionRate,
    },
    {
      title: 'Avg Session Duration',
      value: metrics.avgSessionDuration || 0,
      unit: 'min',
      icon: <LuTrendingUp size={24} />,
      color: '#faad14',
      description: 'Average conversation length',
    },
    {
      title: 'Peak Activity Hour',
      value: metrics.peakHour !== undefined ? formatHour(metrics.peakHour) : '--',
      icon: <LuZap size={24} />,
      color: '#f5222d',
      description: 'Busiest hour of the day',
    },
    {
      title: 'Active Users (24h)',
      value: metrics.activeUsers || 0,
      icon: <LuUsers size={24} />,
      color: '#722ed1',
      description: 'Unique users in last 24 hours',
    },
    {
      title: 'Chat Efficiency',
      value: metrics.efficiency || 0,
      unit: 'msgs',
      icon: <LuMessageSquare size={24} />,
      color: '#13c2c2',
      description: 'Average messages per resolution',
      comparison: comparisons?.efficiency,
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {advancedMetrics.map((metric, index) => (
        <Col xs={24} sm={12} lg={8} key={metric.title}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <Card
              bordered={false}
              style={{
                height: '100%',
                borderLeft: `4px solid ${metric.color}`,
              }}
              bodyStyle={{ padding: 20 }}
              loading={loading}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${metric.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: metric.color,
                    flexShrink: 0,
                  }}
                >
                  {metric.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Tooltip title={metric.description}>
                    <Text
                      type="secondary"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        marginBottom: 4,
                        cursor: 'help',
                      }}
                    >
                      {metric.title}
                    </Text>
                  </Tooltip>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                    <Statistic
                      value={
                        typeof metric.value === 'number' && metric.formatter
                          ? metric.formatter(metric.value)
                          : metric.value
                      }
                      valueStyle={{
                        fontSize: 28,
                        fontWeight: 600,
                        color: '#262626',
                        lineHeight: 1,
                      }}
                    />
                    {metric.unit && (
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        {metric.unit}
                      </Text>
                    )}
                  </div>

                  {/* Comparison Badge */}
                  {metric.comparison && (
                    <TrendBadge comparison={metric.comparison} />
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </Col>
      ))}
    </Row>
  );
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

// ================================================================
// EXPORTS
// ================================================================

export default AdvancedMetricsCards;
