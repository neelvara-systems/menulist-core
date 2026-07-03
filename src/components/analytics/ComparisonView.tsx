/**
 * Comparison View Component
 * Shows period-over-period comparisons with interactive controls
 */

'use client';

import { Card, Select, Space, Spin, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import type { DateRange } from '@lib/analytics/dal';
import { getAnalytics } from '@lib/analytics/dal';
import type { ComparisonPeriod, PeriodComparison } from '@lib/analytics/comparison';
import { 
  compareMetrics, 
  getComparisonDateRange, 
  getPeriodLabel 
} from '@lib/analytics/comparison';
import { MetricCardWithComparison } from './TrendIndicator';

const { Title, Text } = Typography;

// ================================================================
// TYPES
// ================================================================

interface ComparisonViewProps {
  tenantId: string;
  storeId: string;
  dateRange: DateRange;
  refreshInterval?: number;
}

// ================================================================
// COMPONENT
// ================================================================

export function ComparisonView({
  tenantId,
  storeId,
  dateRange,
  refreshInterval = 60000,
}: ComparisonViewProps) {
  const [period, setPeriod] = useState<ComparisonPeriod>('wow');
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);

  // Fetch current period data
  const { data: currentData, isLoading: currentLoading } = useSWR(
    ['analytics', tenantId, storeId, dateRange],
    () => getAnalytics(tenantId, storeId, dateRange),
    { refreshInterval, dedupingInterval: 60000 }
  );

  // Calculate previous period date range
  const previousDateRange = getComparisonDateRange(
    period,
    dateRange.start,
    dateRange.end
  );

  // Fetch previous period data
  const { data: previousData, isLoading: previousLoading } = useSWR(
    ['analytics', tenantId, storeId, previousDateRange],
    () => getAnalytics(tenantId, storeId, previousDateRange),
    { refreshInterval, dedupingInterval: 60000 }
  );

  // Calculate comparison when both datasets are available
  useEffect(() => {
    if (currentData && previousData) {
      const comp = compareMetrics(currentData.summary, previousData.summary);
      setComparison(comp);
    }
  }, [currentData, previousData]);

  const isLoading = currentLoading || previousLoading;

  return (
    <Card
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Performance Comparison
          </Title>
          <Text type="secondary">({getPeriodLabel(period)})</Text>
        </Space>
      }
      extra={
        <Select
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'wow', label: 'Week over Week' },
            { value: 'mom', label: 'Month over Month' },
            { value: 'custom', label: 'Previous Period' },
          ]}
          style={{ width: 180 }}
        />
      }
      bordered={false}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="Loading comparison data..." />
        </div>
      ) : !comparison ? (
        <Text type="secondary">No comparison data available</Text>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <MetricCardWithComparison
              title="Total Conversations"
              value={comparison.volume.current}
              comparison={comparison.volume}
              format={(v) => v.toLocaleString()}
            />

            <MetricCardWithComparison
              title="Satisfaction Rate"
              value={comparison.satisfaction.current}
              comparison={comparison.satisfaction}
              format={(v) => v.toFixed(1)}
              suffix="%"
            />

            <MetricCardWithComparison
              title="Avg Messages per Chat"
              value={comparison.avgMessages.current}
              comparison={comparison.avgMessages}
              format={(v) => v.toFixed(1)}
            />

            <MetricCardWithComparison
              title="Total Messages"
              value={comparison.totalMessages.current}
              comparison={comparison.totalMessages}
              format={(v) => v.toLocaleString()}
            />
          </div>

          {/* Insights Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{
              marginTop: 24,
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Key Insights:
            </Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {getInsights(comparison).map((insight, idx) => (
                <li key={idx}>
                  <Text>{insight}</Text>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </Card>
  );
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Generate insights from comparison data
 */
function getInsights(comparison: PeriodComparison): string[] {
  const insights: string[] = [];

  // Volume insights
  if (Math.abs(comparison.volume.changePercent) > 10) {
    const direction = comparison.volume.trend === 'up' ? 'increased' : 'decreased';
    insights.push(
      `Conversation volume ${direction} by ${Math.abs(comparison.volume.changePercent).toFixed(1)}%`
    );
  }

  // Satisfaction insights
  if (comparison.satisfaction.changePercent > 5) {
    insights.push(`Satisfaction improved by ${comparison.satisfaction.changePercent.toFixed(1)}%`);
  } else if (comparison.satisfaction.changePercent < -5) {
    insights.push(
      `Satisfaction declined by ${Math.abs(comparison.satisfaction.changePercent).toFixed(1)}% - review feedback`
    );
  }

  // Efficiency insights
  if (comparison.avgMessages.changePercent < -10) {
    insights.push(
      `Chat efficiency improved - ${Math.abs(comparison.avgMessages.changePercent).toFixed(1)}% fewer messages needed`
    );
  }

  // Message volume
  if (comparison.totalMessages.changePercent > 15) {
    insights.push(`Message volume increased by ${comparison.totalMessages.changePercent.toFixed(1)}%`);
  }

  // Default insight if no significant changes
  if (insights.length === 0) {
    insights.push('Performance is stable compared to previous period');
  }

  return insights;
}

// ================================================================
// EXPORTS
// ================================================================

export default ComparisonView;
