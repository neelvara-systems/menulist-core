/**
 * Interactive Trend Chart Component
 * Line chart with zoom, pan, and drill-down capabilities
 */

'use client';

import { Card, Select, Spin, Typography } from 'antd';
import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  Area,
  AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

// ================================================================
// TYPES
// ================================================================

export interface DataPoint {
  date: string;
  value: number;
  [key: string]: string | number | null | undefined;
}

export type InteractiveTrendRange = '7d' | '30d' | '90d' | 'all';

interface InteractiveTrendChartProps {
  data: DataPoint[];
  title: string;
  dataKeys?: string[];
  loading?: boolean;
  height?: number;
  showBrush?: boolean;
  chartType?: 'line' | 'area';
  colors?: string[];
}

// ================================================================
// COMPONENT
// ================================================================

export function InteractiveTrendChart({
  data,
  title,
  dataKeys = ['value'],
  loading = false,
  height = 300,
  showBrush = true,
  chartType = 'line',
  colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d'],
}: InteractiveTrendChartProps) {
  const [timeRange, setTimeRange] = useState<InteractiveTrendRange>('30d');

  // Filter data based on time range
  const filteredData = filterDataByTimeRange(data, timeRange);
  const admittedDataKeys = Array.from(new Set(dataKeys.filter((key) => typeof key === 'string' && key.trim())));
  const admittedColors = colors.length > 0 ? colors : ['#1890ff'];
  const chartHeight = Number.isFinite(height) ? Math.min(Math.max(height, 200), 800) : 300;

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            options={[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: '90d', label: 'Last 90 Days' },
              { value: 'all', label: 'All Time' },
            ]}
            style={{ width: 140 }}
          />
        </div>
      }
      bordered={false}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Text type="secondary">No data available</Text>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ChartComponent data={filteredData}>
              <defs>
                {admittedDataKeys.map((key, index) => (
                  <linearGradient key={key} id={`analytics-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={admittedColors[index % admittedColors.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={admittedColors[index % admittedColors.length]} stopOpacity={0.1} />
                  </linearGradient>
                ))}
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              
              <XAxis
                dataKey="date"
                stroke="#8c8c8c"
                style={{ fontSize: 12 }}
                tickFormatter={(value) => formatDate(value)}
              />
              
              <YAxis
                stroke="#8c8c8c"
                style={{ fontSize: 12 }}
                tickFormatter={(value) => formatValue(value)}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  padding: 12,
                }}
                formatter={(value, name) => [
                  formatValue(Number.isFinite(Number(value)) ? Number(value) : 0),
                  formatLabel(String(name)),
                ]}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
              />
              
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => formatLabel(value)}
              />
              
              {admittedDataKeys.map((key, index) => (
                <DataComponent
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={admittedColors[index % admittedColors.length]}
                  fill={chartType === 'area' ? `url(#analytics-gradient-${index})` : undefined}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={key}
                />
              ))}
              
              {showBrush && (
                <Brush
                  dataKey="date"
                  height={30}
                  stroke="#1890ff"
                  tickFormatter={(value) => formatDate(value)}
                />
              )}
            </ChartComponent>
          </ResponsiveContainer>

          {/* Chart Info */}
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 <strong>Tip:</strong> Use the brush at the bottom to zoom into specific time periods. 
              Hover over data points for details.
            </Text>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

const UTC_DAY_MS = 24 * 60 * 60 * 1000;

const parseAnalyticsDate = (value: string): number | null => {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const milliseconds = Date.parse(normalized);
  return Number.isFinite(milliseconds) ? milliseconds : null;
};

export function filterDataByTimeRange(
  data: DataPoint[],
  range: InteractiveTrendRange,
  nowMilliseconds = Date.now(),
): DataPoint[] {
  const currentUtcDayStart = Math.floor(nowMilliseconds / UTC_DAY_MS) * UTC_DAY_MS;
  const currentUtcDayEnd = currentUtcDayStart + UTC_DAY_MS;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : null;
  const cutoff = days === null ? Number.NEGATIVE_INFINITY : currentUtcDayStart - ((days - 1) * UTC_DAY_MS);

  return data.filter((item) => {
    const itemMilliseconds = parseAnalyticsDate(item.date);
    return itemMilliseconds !== null && itemMilliseconds >= cutoff && itemMilliseconds < currentUtcDayEnd;
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (!Number.isFinite(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatValue(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString();
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// ================================================================
// EXPORTS
// ================================================================

export default InteractiveTrendChart;
