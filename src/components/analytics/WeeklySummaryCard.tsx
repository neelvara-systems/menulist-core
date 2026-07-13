/**
 * WeeklySummaryCard Component
 * Displays the verified weekly analytics summary.
 */

import React from 'react';
import { Card, Typography, Space, Tag, Divider, Alert, theme } from 'antd';
import { CalendarOutlined, TrophyOutlined, BulbOutlined, RobotOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import DateTimeDisplay from '@atoms/DateTimeDisplay';

const { Title, Text, Paragraph } = Typography;

export interface WeeklySummaryData {
  weekStart: string;
  weekEnd: string;
  narrative: string;
  highlights: string[];
  recommendations: string[];
  keyMetrics: {
    volumeChange: number;
    satisfactionChange: number;
    topCategory: string;
  };
  generatedAt: string;
}

export interface WeeklySummaryCardProps {
  data?: WeeklySummaryData;
  loading?: boolean;
  className?: string;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  data,
  loading = false,
  className,
}) => {
  const { token } = theme.useToken();

  // Empty state
  if (!loading && !data) {
    return (
      <Card className={className}>
        <Space direction="vertical" style={{ width: '100%' }} align="center" size="middle">
          <RobotOutlined style={{ fontSize: 48, color: token.colorTextSecondary }} />
          <Text type="secondary">Weekly summary will be generated on Sundays</Text>
        </Space>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        loading={loading}
        className={className}
        title={
          <Space>
            <RobotOutlined style={{ color: token.colorPrimary }} />
            <span>Weekly Summary</span>
            <Tag color="blue">Verified analytics</Tag>
          </Space>
        }
      >
        {data && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Week Period */}
            <Space>
              <CalendarOutlined style={{ color: token.colorTextSecondary }} />
              <Text type="secondary">
                {data.weekStart} to {data.weekEnd}
              </Text>
            </Space>

            {/* Key Metrics */}
            <Space size="middle" wrap>
              <Tag
                color={data.keyMetrics.volumeChange >= 0 ? 'green' : 'red'}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                Volume: {data.keyMetrics.volumeChange > 0 ? '+' : ''}
                {data.keyMetrics.volumeChange}%
              </Tag>
              <Tag
                color={data.keyMetrics.satisfactionChange >= 0 ? 'green' : 'red'}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                Satisfaction: {data.keyMetrics.satisfactionChange > 0 ? '+' : ''}
                {data.keyMetrics.satisfactionChange}%
              </Tag>
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                Top: {data.keyMetrics.topCategory}
              </Tag>
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            {/* Narrative */}
            <div>
              <Paragraph style={{ fontSize: 15, lineHeight: 1.7 }}>
                <ReactMarkdown>{data.narrative}</ReactMarkdown>
              </Paragraph>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Highlights */}
            <div>
              <Space style={{ marginBottom: 12 }}>
                <TrophyOutlined style={{ color: token.colorWarning, fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>
                  Key Highlights
                </Text>
              </Space>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {data.highlights.map((highlight, index) => (
                  <Alert
                    key={index}
                    message={highlight}
                    type="success"
                    showIcon
                    style={{ fontSize: 14 }}
                  />
                ))}
              </Space>
            </div>

            {/* Recommendations */}
            <div>
              <Space style={{ marginBottom: 12 }}>
                <BulbOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                <Text strong style={{ fontSize: 15 }}>
                  Recommendations
                </Text>
              </Space>
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {data.recommendations.map((rec, index) => (
                  <Alert
                    key={index}
                    message={rec}
                    type="info"
                    showIcon
                    style={{ fontSize: 14 }}
                  />
                ))}
              </Space>
            </div>

            {/* Generated timestamp */}
            <div style={{ fontSize: 12, display: 'block', textAlign: 'right' }}>
              <DateTimeDisplay value={data.generatedAt} mode="datetime" label="Generated" />
            </div>
          </Space>
        )}
      </Card>
    </motion.div>
  );
};

export default WeeklySummaryCard;
