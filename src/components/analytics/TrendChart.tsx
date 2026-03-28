/**
 * TrendChart Component
 * Wrapper for Recharts with consistent theming
 */

import React from 'react';
import { Card, Typography, Empty, Spin } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useChartConfig, CHART_TYPES, ChartType } from '@lib/charts/config';
import { formatChartDate, formatChartLabel } from '@lib/charts/config';

const { Title } = Typography;

export interface TrendChartProps {
  title?: string;
  data: any[];
  type?: ChartType;
  dataKeys: Array<{
    key: string;
    name: string;
    color?: string;
  }>;
  xAxisKey?: string;
  height?: number;
  loading?: boolean;
  formatValue?: (value: number) => string;
  formatDate?: (date: string) => string;
  showLegend?: boolean;
  showGrid?: boolean;
  className?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  data,
  type = CHART_TYPES.LINE,
  dataKeys,
  xAxisKey = 'date',
  height = 300,
  loading = false,
  formatValue = (value) => formatChartLabel(value),
  formatDate = (date) => formatChartDate(date),
  showLegend = true,
  showGrid = true,
  className,
}) => {
  const config = useChartConfig();

  // Empty state
  if (!loading && (!data || data.length === 0)) {
    return (
      <Card className={className}>
        {title && <Title level={5}>{title}</Title>}
        <Empty
          description="No data available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        {title && <Title level={5}>{title}</Title>}
        <div
          style={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data,
      margin: config.margins.default,
    };

    const xAxis = (
      <XAxis
        dataKey={xAxisKey}
        stroke={config.axis.stroke}
        style={{ fontSize: config.axis.fontSize }}
        tickFormatter={formatDate}
      />
    );

    const yAxis = (
      <YAxis
        stroke={config.axis.stroke}
        style={{ fontSize: config.axis.fontSize }}
        tickFormatter={formatValue}
      />
    );

    const grid = showGrid ? (
      <CartesianGrid
        stroke={config.grid.stroke}
        strokeDasharray={config.grid.strokeDasharray}
        opacity={config.grid.strokeOpacity}
      />
    ) : null;

    const tooltip = (
      <Tooltip
        contentStyle={config.tooltip.contentStyle}
        labelStyle={config.tooltip.labelStyle}
        itemStyle={config.tooltip.itemStyle}
        formatter={formatValue}
        labelFormatter={formatDate}
      />
    );

    const legend = showLegend ? (
      <Legend
        iconSize={config.legend.iconSize}
        wrapperStyle={{
          fontSize: config.legend.fontSize,
          color: config.legend.color,
        }}
      />
    ) : null;

    switch (type) {
      case CHART_TYPES.BAR:
        return (
          <BarChart {...commonProps}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color || config.colors.primary}
                radius={config.bar.radius}
                maxBarSize={config.bar.maxBarSize}
                animationDuration={config.animation.duration}
              />
            ))}
          </BarChart>
        );

      case CHART_TYPES.AREA:
        return (
          <AreaChart {...commonProps}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color || config.colors.primary}
                fill={dk.color || config.colors.primary}
                fillOpacity={config.area.fillOpacity}
                strokeWidth={config.area.strokeWidth}
                animationDuration={config.animation.duration}
              />
            ))}
          </AreaChart>
        );

      case CHART_TYPES.LINE:
      default:
        return (
          <LineChart {...commonProps}>
            {grid}
            {xAxis}
            {yAxis}
            {tooltip}
            {legend}
            {dataKeys.map((dk) => (
              <Line
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color || config.colors.primary}
                strokeWidth={config.line.strokeWidth}
                dot={config.line.dot}
                activeDot={config.line.activeDot}
                animationDuration={config.animation.duration}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <Card className={className}>
      {title && (
        <Title level={5} style={{ marginBottom: 16 }}>
          {title}
        </Title>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
};

export default TrendChart;
