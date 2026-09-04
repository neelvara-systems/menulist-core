/**
 * KnowledgeGaps Component
 * Displays unanswered questions and knowledge gaps
 */

import React from 'react';
import { Card, List, Tag, Space, Typography, Empty, theme, Tooltip, Badge } from 'antd';
import { WarningOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { NormalizedKnowledgeGap } from '@lib/analytics/normalizer';

const { Title, Text, Paragraph } = Typography;

export interface KnowledgeGapsProps {
  title?: string;
  data: NormalizedKnowledgeGap[];
  loading?: boolean;
  maxItems?: number;
  showExamples?: boolean;
  onItemClick?: (item: NormalizedKnowledgeGap) => void;
  className?: string;
}

export const KnowledgeGaps: React.FC<KnowledgeGapsProps> = ({
  title = 'Knowledge Gaps',
  data,
  loading = false,
  maxItems = 10,
  showExamples = true,
  onItemClick,
  className,
}) => {
  const { token } = theme.useToken();

  // Sort by count (highest first) and limit
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);

  // Get severity color
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return token.colorError;
      case 'medium':
        return token.colorWarning;
      case 'low':
        return token.colorSuccess;
      default:
        return token.colorTextSecondary;
    }
  };

  // Get severity label
  const getSeverityLabel = (severity: 'low' | 'medium' | 'high') => {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  };

  // Empty state
  if (!loading && (!data || data.length === 0)) {
    return (
      <Card className={className}>
        <Title level={5}>{title}</Title>
        <Empty
          description="No knowledge gaps detected"
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
        <Tooltip title="Questions users asked that couldn't be answered well">
          <QuestionCircleOutlined
            style={{
              color: token.colorTextSecondary,
              fontSize: 16,
            }}
          />
        </Tooltip>
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
              onKeyDown={(event) => {
                if (!onItemClick || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onItemClick(item);
              }}
              role={onItemClick ? 'button' : undefined}
              tabIndex={onItemClick ? 0 : undefined}
              style={{
                cursor: onItemClick ? 'pointer' : 'default',
                padding: '12px 0',
                transition: 'all 0.2s',
              }}
            >
              <Space
                direction="vertical"
                style={{ width: '100%' }}
                size="small"
              >
                {/* Header Row: Severity + Count */}
                <Space
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Tag
                    icon={<WarningOutlined />}
                    color={
                      item.severity === 'high'
                        ? 'error'
                        : item.severity === 'medium'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {getSeverityLabel(item.severity || 'low')} Priority
                  </Tag>

                  <Badge
                    count={item.count}
                    showZero
                    style={{
                      backgroundColor: getSeverityColor(item.severity || 'low'),
                      color: '#fff',
                    }}
                  />
                </Space>

                {/* Question */}
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

                {/* Examples */}
                {showExamples && item.examples && item.examples.length > 0 && (
                  <div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12, display: 'block', marginBottom: 4 }}
                    >
                      Example variations:
                    </Text>
                    {item.examples.slice(0, 2).map((example, i) => (
                      <Text
                        key={i}
                        type="secondary"
                        style={{
                          fontSize: 12,
                          display: 'block',
                          fontStyle: 'italic',
                          paddingLeft: 12,
                          marginBottom: 2,
                        }}
                      >
                        • {example}
                      </Text>
                    ))}
                  </div>
                )}

                {/* Last Occurrence */}
                {item.lastOccurrence && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Last seen: {item.lastOccurrence}
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

export default KnowledgeGaps;
