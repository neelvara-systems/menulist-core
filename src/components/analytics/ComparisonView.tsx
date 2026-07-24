/**
 * Period comparison for the active Answerlattice workspace.
 *
 * Workspace identity is derived from the authenticated product account. Numeric
 * tenant/store props are intentionally not accepted as read authority.
 */

'use client';

import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import {
  getDashboardData,
  type DateRange,
} from '@lib/analytics/dal';
import {
  compareMetrics,
  getComparisonDateRange,
  getPeriodLabel,
  type AnalyticsSummary,
  type ComparisonPeriod,
} from '@lib/analytics/comparison';
import { Card, Select, Space, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { MetricCardWithComparison } from './TrendIndicator';

const { Title, Text } = Typography;

export interface ComparisonViewProps {
  dateRange: DateRange;
  refreshInterval?: number;
}

const toAnalyticsSummary = (
  data: Awaited<ReturnType<typeof getDashboardData>>,
): AnalyticsSummary => ({
  totalChats: data.summary.totalChats,
  positiveFeedbackShare: data.feedback.total > 0 ? data.summary.satisfactionRate : null,
  avgMessagesPerChat: data.summary.avgMessagesPerChat,
  totalMessages: data.summary.totalMessages,
  totalFeedback: data.feedback.total,
  positiveCount: data.feedback.positive,
  negativeCount: data.feedback.negative,
});

export function ComparisonView({
  dateRange,
  refreshInterval = 60_000,
}: ComparisonViewProps) {
  const session = useClientAuthSession();
  const scope = resolveAnswerlatticeSessionScope(session);
  const [period, setPeriod] = useState<ComparisonPeriod>('wow');
  const previousDateRange = useMemo(
    () => getComparisonDateRange(period, dateRange.start, dateRange.end),
    [dateRange.end, dateRange.start, period],
  );
  const scopeKey = scope ? `${scope.tenantId}:${scope.storeId}` : null;

  const { data: currentData, isLoading: currentLoading } = useSWR(
    scopeKey
      ? ['answerlattice-analytics-comparison', scopeKey, dateRange.start.toISOString(), dateRange.end.toISOString()]
      : null,
    async () => toAnalyticsSummary(await getDashboardData(dateRange, session)),
    { refreshInterval, dedupingInterval: 60_000 },
  );
  const { data: previousData, isLoading: previousLoading } = useSWR(
    scopeKey
      ? [
          'answerlattice-analytics-comparison',
          scopeKey,
          previousDateRange.start.toISOString(),
          previousDateRange.end.toISOString(),
        ]
      : null,
    async () => toAnalyticsSummary(await getDashboardData(previousDateRange, session)),
    { refreshInterval, dedupingInterval: 60_000 },
  );

  const comparison = currentData && previousData
    ? compareMetrics(currentData, previousData)
    : null;
  const isLoading = currentLoading || previousLoading;

  return (
    <Card
      title={(
        <Space>
          <Title level={4} style={{ margin: 0 }}>Performance Comparison</Title>
          <Text type="secondary">({getPeriodLabel(period)})</Text>
        </Space>
      )}
      extra={(
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
      )}
      bordered={false}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" tip="Loading comparison data..." />
        </div>
      ) : !comparison ? (
        <Text type="secondary">No comparison data available</Text>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <MetricCardWithComparison
            title="Total Conversations"
            value={comparison.volume.current}
            comparison={comparison.volume}
            format={(value) => value.toLocaleString()}
          />
          <MetricCardWithComparison
            title="Positive Feedback Share"
            value={comparison.positiveFeedbackShare.current ?? 'Not available'}
            comparison={comparison.positiveFeedbackShare}
            format={(value) => value.toFixed(1)}
            suffix="%"
          />
          <MetricCardWithComparison
            title="Avg Messages per Chat"
            value={comparison.avgMessages.current}
            comparison={comparison.avgMessages}
            format={(value) => value.toFixed(1)}
          />
          <MetricCardWithComparison
            title="Total Messages"
            value={comparison.totalMessages.current}
            comparison={comparison.totalMessages}
            format={(value) => value.toLocaleString()}
          />
        </div>
      )}
    </Card>
  );
}

export default ComparisonView;
