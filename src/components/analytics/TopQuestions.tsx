/**
 * TopQuestions Component
 * Displays most frequently asked questions
 */

import React from 'react';
import { Card, List, Space, Typography, Empty, theme, Badge, Tag } from 'antd';
import { FireOutlined, MessageOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { NormalizedTopQuestion } from '@lib/analytics/normalizer';

const { Title, Text, Paragraph } = Typography;

export interface TopQuestionsProps {
  title?: string;
  data: NormalizedTopQuestion[];
  loading?: boolean;
  maxItems?: number;
  showCategory?: boolean;
  onItemClick?: (item: NormalizedTopQuestion) => void;
  className?: string;
}

export const TopQuestions: React.FC<TopQuestionsProps> = ({
  title = 'Top Questions',
  data,
  loading = false,
  maxItems = 10,
  showCategory = true,
  onItemClick,
  className,
}) => {
  const { token } = theme.useToken();

  // Sort by count and limit
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);

  // Get rank color (top 3 get special colors)
  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return token.colorWarning; // Gold
      case 1:
        return token.colorTextSecondary; // Silver
      case 2:
        return '#cd7f32'; // Bronze
      default:
        return token.colorTextTertiary;
    }
  };

  // Empty state
  if (!loading && (!data || data.length === 0)) {
    return (
      <Card className={className}>
        <Title level={5}>{title}</Title>
        <Empty
          description="No questions yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={5} style={{ margin: 0 }}>
          {title}
        </Title>
        <FireOutlined
          style={{
            color: token.colorWarning,
            fontSize: 16,
          }}
        />
      </Space>

      <List
        loading={loading}
        dataSource={sortedData}
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
                transition: 'all 0.2s',
              }}
            >
              <Space
                direction="horizontal"
                style={{ width: '100%' }}
                size="middle"
                align="start"
              >
                {/* Rank Badge */}
                <Badge
                  count={index + 1}
                  showZero
                  style={{
                    backgroundColor: getRankColor(index),
                    color: '#fff',
                    fontWeight: 600,
                    minWidth: 28,
                    height: 28,
                    lineHeight: '28px',
                    fontSize: 14,
                  }}
                />

                {/* Question Content */}
                <Space
                  direction="vertical"
                  style={{ flex: 1, minWidth: 0 }}
                  size={4}
                >
                  <Paragraph
                    strong
                    ellipsis={{ rows: 2, expandable: false }}
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: token.colorText,
                    }}
                  >
                    {item.question}
                  </Paragraph>

                  <Space size="small" wrap>
                    {/* Category */}
                    {showCategory && item.category && (
                      <Tag
                        color="blue"
                        style={{ fontSize: 11, margin: 0 }}
                      >
                        {item.category}
                      </Tag>
                    )}

                    {/* Count */}
                    <Space size={4} style={{ fontSize: 12 }}>
                      <MessageOutlined
                        style={{ color: token.colorTextSecondary }}
                      />
                      <Text type="secondary">
                        {item.count} {item.count === 1 ? 'time' : 'times'}
                      </Text>
                    </Space>

                    {/* Last Asked */}
                    {item.lastAsked && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Last: {item.lastAsked}
                      </Text>
                    )}
                  </Space>
                </Space>
              </Space>
            </List.Item>
          </motion.div>
        )}
      />
    </Card>
  );
};

export default TopQuestions;
