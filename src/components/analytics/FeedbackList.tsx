/**
 * FeedbackList Component
 * Displays top feedback items with sentiment
 */

import React from 'react';
import { Card, List, Tag, Space, Typography, Empty, theme, Badge } from 'antd';
import { LikeOutlined, DislikeOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

export interface FeedbackItem {
  id: string;
  message: string;
  isPositive: boolean;
  count: number;
  date?: string;
}

export interface FeedbackListProps {
  title?: string;
  data: FeedbackItem[];
  loading?: boolean;
  maxItems?: number;
  showCount?: boolean;
  onItemClick?: (item: FeedbackItem) => void;
  className?: string;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  title = 'Recent Feedback',
  data,
  loading = false,
  maxItems = 10,
  showCount = true,
  onItemClick,
  className,
}) => {
  const { token } = theme.useToken();

  // Limit items
  const displayData = maxItems ? data.slice(0, maxItems) : data;

  // Empty state
  if (!loading && (!data || data.length === 0)) {
    return (
      <Card className={className}>
        <Title level={5}>{title}</Title>
        <Empty
          description="No feedback yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Title level={5} style={{ marginBottom: 16 }}>
        {title}
      </Title>

      <List
        loading={loading}
        dataSource={displayData}
        renderItem={(item, index) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <List.Item
              onClick={() => onItemClick?.(item)}
              style={{
                cursor: onItemClick ? 'pointer' : 'default',
                padding: '12px 0',
                transition: 'background-color 0.2s',
              }}
            >
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="small"
              >
                {/* Sentiment & Count Row */}
                <Space
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <Tag
                    icon={
                      item.isPositive ? (
                        <LikeOutlined />
                      ) : (
                        <DislikeOutlined />
                      )
                    }
                    color={item.isPositive ? 'success' : 'error'}
                  >
                    {item.isPositive ? 'Positive' : 'Negative'}
                  </Tag>

                  {showCount && (
                    <Badge
                      count={item.count}
                      showZero
                      style={{
                        backgroundColor: token.colorBgContainer,
                        color: token.colorText,
                        border: `1px solid ${token.colorBorder}`,
                      }}
                    />
                  )}
                </Space>

                {/* Message */}
                <Paragraph
                  ellipsis={{ rows: 2, expandable: false }}
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: token.colorText,
                  }}
                >
                  {item.message}
                </Paragraph>

                {/* Date */}
                {item.date && (
                  <Text
                    type="secondary"
                    style={{ fontSize: 12 }}
                  >
                    {item.date}
                  </Text>
                )}
              </Space>
            </List.Item>
          </motion.div>
        )}
      />
    </Card>
  );
};

export default FeedbackList;
