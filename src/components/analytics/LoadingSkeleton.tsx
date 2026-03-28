/**
 * LoadingSkeleton Component
 * Consistent loading states for analytics
 */

import React from 'react';
import { Card, Skeleton, Space } from 'antd';

export type SkeletonType = 'metric' | 'chart' | 'list' | 'table' | 'section';

export interface LoadingSkeletonProps {
  type?: SkeletonType;
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'metric',
  count = 1,
  className,
}) => {
  // Metric card skeleton
  if (type === 'metric') {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} className={className}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Skeleton.Input active style={{ width: 120, height: 20 }} />
              <Skeleton.Input active style={{ width: 100, height: 32 }} />
              <Skeleton.Input active style={{ width: 80, height: 16 }} />
            </Space>
          </Card>
        ))}
      </>
    );
  }

  // Chart skeleton
  if (type === 'chart') {
    return (
      <Card className={className}>
        <Skeleton.Input active style={{ width: 200, height: 24, marginBottom: 16 }} />
        <Skeleton.Node
          active
          style={{
            width: '100%',
            height: 300,
          }}
        >
          <div />
        </Skeleton.Node>
      </Card>
    );
  }

  // List skeleton
  if (type === 'list') {
    return (
      <Card className={className}>
        <Skeleton.Input active style={{ width: 200, height: 24, marginBottom: 16 }} />
        <Skeleton active paragraph={{ rows: count || 5 }} />
      </Card>
    );
  }

  // Table skeleton
  if (type === 'table') {
    return (
      <Card className={className}>
        <Skeleton.Input active style={{ width: 200, height: 24, marginBottom: 16 }} />
        <Skeleton
          active
          paragraph={{ rows: count || 10 }}
          title={false}
        />
      </Card>
    );
  }

  // Section skeleton (for larger section-level content)
  if (type === 'section') {
    return (
      <Card className={className} style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Skeleton.Input active style={{ width: 250, height: 28 }} />
          <Skeleton active paragraph={{ rows: 4 }} />
        </Space>
      </Card>
    );
  }

  // Default skeleton
  return (
    <Card className={className}>
      <Skeleton active />
    </Card>
  );
};

export default LoadingSkeleton;
