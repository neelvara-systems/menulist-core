/**
 * FeedbackInsightsSection Component
 * User satisfaction and feedback analysis
 */

import React from 'react';
import { Row, Col, Space, Typography } from 'antd';
import { StatCard, type StatCardProps } from './StatCard';
import { FeedbackList, type FeedbackListProps } from './FeedbackList';
import { RefreshButton } from './RefreshButton';

const { Title } = Typography;

export interface FeedbackInsightsSectionProps {
  title?: string;
  satisfactionStats: StatCardProps[];
  feedbackData: FeedbackListProps['data'];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export const FeedbackInsightsSection: React.FC<FeedbackInsightsSectionProps> = ({
  title = 'Feedback & Satisfaction',
  satisfactionStats,
  feedbackData,
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

      {/* Satisfaction Stats */}
      <Row gutter={[16, 16]}>
        {satisfactionStats.map((stat, index) => (
          <Col key={stat.title || index} xs={24} sm={12} md={8} lg={6}>
            <StatCard {...stat} loading={loading} />
          </Col>
        ))}
      </Row>

      {/* Feedback List */}
      <FeedbackList
        title="Recent Feedback"
        data={feedbackData}
        loading={loading}
        maxItems={15}
        showCount={true}
      />
    </Space>
  );
};

export default FeedbackInsightsSection;
