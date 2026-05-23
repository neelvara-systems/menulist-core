'use client';

import { Line } from '@ant-design/plots';
import { useOfferingLabels } from '@hook/useOfferingLabels';
import { DailyAnalytics } from '@lib/analytics/types';
import { Card, Empty, Radio, Typography, theme } from 'antd';
import React, { useState } from 'react';

const { Title } = Typography;
const { useToken } = theme;

interface TrendAnalysisProps {
  dailyData: DailyAnalytics[];
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ dailyData }) => {
    const { token } = useToken();

    const labels = useOfferingLabels();
  const [metric, setMetric] = useState<'views' | 'clicks' | 'searches' | 'actions'>('views');

  if (!dailyData || dailyData.length === 0) {
    return (
      <Card>
        <Title level={5}>Trend Analysis</Title>
        <Empty description="No data available for the selected period" />
      </Card>
    );
  }

  // Prepare data for the chart
  const chartData = dailyData.map(day => ({
    date: day.date || '',
    value: metric === 'views'
      ? (day.totalViews || 0)
      : metric === 'clicks'
        ? (day.totalClicks || 0)
        : metric === 'searches'
          ? (day.totalSearches || 0)
          : (day.totalMenuActionClicks || 0),
    type: metric === 'views'
      ? labels.viewsLabel
      : metric === 'clicks'
        ? 'Item Clicks'
        : metric === 'searches'
          ? 'Searches'
          : 'Customer Actions'
  }));

  // Sort data by date
  chartData.sort((a, b) => a.date.localeCompare(b.date));

    const config = {
        data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    color: metric === 'views' ? token.colorPrimary : metric === 'clicks' ? token.colorSuccess : metric === 'searches' ? token.colorWarning : token.colorInfo,
    point: {
      size: 5,
      shape: 'diamond',
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.type, value: datum.value };
      },
    },
    xAxis: {
      label: {
        formatter: (text: string) => {
          // Format date for display (e.g., "Apr 7" instead of "2025-04-07")
          try {
            const date = new Date(text);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } catch (e) {
            return text;
          }
        },
      },
    },
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5}>Trend Analysis</Title>
        <Radio.Group
          value={metric}
          onChange={e => setMetric(e.target.value)}
          buttonStyle="solid"
        >
          <Radio.Button value="views">{labels.viewsLabel}</Radio.Button>
          <Radio.Button value="clicks">Item Clicks</Radio.Button>
          <Radio.Button value="searches">Searches</Radio.Button>
          <Radio.Button value="actions">Actions</Radio.Button>
        </Radio.Group>
      </div>
      <div style={{ height: 350 }}>
        <Line {...config} />
      </div>
    </Card>
  );
};

export default TrendAnalysis;
