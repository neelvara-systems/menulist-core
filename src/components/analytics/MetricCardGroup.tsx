/**
 * MetricCardGroup Component
 * Grid layout for multiple metric cards
 */

import React from 'react';
import { Row, Col } from 'antd';
import MetricCard, { MetricCardProps } from './MetricCard';

export interface MetricCardGroupProps {
  metrics: MetricCardProps[];
  loading?: boolean;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  };
  gutter?: [number, number];
  className?: string;
}

export const MetricCardGroup: React.FC<MetricCardGroupProps> = ({
  metrics,
  loading = false,
  columns = {
    xs: 1,
    sm: 2,
    md: 2,
    lg: 4,
    xl: 4,
    xxl: 4,
  },
  gutter = [16, 16],
  className,
}) => {
  // Calculate span for each column based on screen size
  const getColSpan = () => {
    return {
      xs: columns.xs ? 24 / columns.xs : 24,
      sm: columns.sm ? 24 / columns.sm : 12,
      md: columns.md ? 24 / columns.md : 12,
      lg: columns.lg ? 24 / columns.lg : 6,
      xl: columns.xl ? 24 / columns.xl : 6,
      xxl: columns.xxl ? 24 / columns.xxl : 6,
    };
  };

  const colSpan = getColSpan();

  return (
    <Row gutter={gutter} className={className}>
      {metrics.map((metric, index) => (
        <Col key={metric.title || index} {...colSpan}>
          <MetricCard {...metric} loading={loading} />
        </Col>
      ))}
    </Row>
  );
};

export default MetricCardGroup;
