/**
 * SummarySection Component
 * Overview section with KPIs and trend charts
 */

import React from 'react';
import { Space, Typography } from 'antd';
import { MetricCardGroup, type MetricCardGroupProps } from './MetricCardGroup';
import { TrendChart, type TrendChartProps } from './TrendChart';
import { RefreshButton } from './RefreshButton';
import type { MetricCardProps } from './MetricCard';

const { Title } = Typography;

export interface SummarySectionProps {
  title?: string;
  metrics: MetricCardProps[];
  chartData?: TrendChartProps;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  title = 'Overview',
  metrics,
  chartData,
  loading = false,
  onRefresh,
  className,
}) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large" className={className}>
      {/* Header */}
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          {title}
        </Title>
        {onRefresh && <RefreshButton onRefresh={onRefresh} loading={loading} />}
      </Space>

      {/* Metric Cards */}
      <MetricCardGroup metrics={metrics} loading={loading} />

      {/* Trend Chart */}
      {chartData && <TrendChart {...chartData} loading={loading} />}
    </Space>
  );
};

export default SummarySection;
