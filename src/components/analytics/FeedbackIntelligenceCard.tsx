/**
 * FeedbackIntelligenceCard Component
 * Displays AI-generated feedback analysis
 */

import React from 'react';
import { Card, Typography, Space, Tag, Collapse, Alert, Badge, theme } from 'antd';
import { MessageOutlined, WarningOutlined, CheckCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import DateTimeDisplay from '@atoms/DateTimeDisplay';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export interface FeedbackTheme {
  theme: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  examples: string[];
  suggestedActions: string[];
}

export interface FeedbackIntelligenceData {
  date: string;
  themes: FeedbackTheme[];
  summary: string;
  topIssues: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface FeedbackIntelligenceCardProps {
  data?: FeedbackIntelligenceData;
  loading?: boolean;
  className?: string;
}

export const FeedbackIntelligenceCard: React.FC<FeedbackIntelligenceCardProps> = ({
  data,
  loading = false,
  className,
}) => {
  const { token } = theme.useToken();

  // Get severity color
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return <WarningOutlined />;
      case 'medium':
        return <MessageOutlined />;
      case 'low':
        return <CheckCircleOutlined />;
    }
  };

  // Empty state
  if (!loading && !data) {
    return (
      <Card className={className}>
        <Space direction="vertical" style={{ width: '100%' }} align="center" size="middle">
          <RobotOutlined style={{ fontSize: 48, color: token.colorTextSecondary }} />
          <Text type="secondary">Feedback analysis will be generated daily</Text>
        </Space>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card
        loading={loading}
        className={className}
        title={
          <Space>
            <RobotOutlined style={{ color: token.colorPrimary }} />
            <span>Feedback Intelligence</span>
            <Tag color="purple">Gemini 2.5 Flash</Tag>
          </Space>
        }
      >
        {data && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Summary */}
            <Alert
              message="Executive Summary"
              description={data.summary}
              type="info"
              showIcon
            />

            {/* Top Issues */}
            {data.topIssues && data.topIssues.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>
                  🚨 Top Issues
                </Text>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {data.topIssues.map((issue, index) => (
                    <Alert
                      key={index}
                      message={issue}
                      type="error"
                      showIcon
                      style={{ fontSize: 14 }}
                    />
                  ))}
                </Space>
              </div>
            )}

            {/* Themes */}
            {data.themes && data.themes.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>
                  📊 Feedback Themes ({data.themes.length})
                </Text>
                <Collapse ghost>
                  {data.themes.map((theme, index) => (
                    <Panel
                      key={index}
                      header={
                        <Space>
                          <Badge count={theme.count} style={{ backgroundColor: token.colorPrimary }} />
                          <Text strong>{theme.theme}</Text>
                          <Tag color={getSeverityColor(theme.severity)} icon={getSeverityIcon(theme.severity)}>
                            {theme.severity.toUpperCase()}
                          </Tag>
                        </Space>
                      }
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {/* Examples */}
                        {theme.examples && theme.examples.length > 0 && (
                          <div>
                            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                              Examples:
                            </Text>
                            {theme.examples.map((example, i) => (
                              <Paragraph
                                key={i}
                                style={{
                                  fontSize: 13,
                                  fontStyle: 'italic',
                                  paddingLeft: 12,
                                  borderLeft: `3px solid ${token.colorBorder}`,
                                  marginBottom: 8,
                                }}
                              >
                                &ldquo;{example}&rdquo;
                              </Paragraph>
                            ))}
                          </div>
                        )}

                        {/* Suggested Actions */}
                        {theme.suggestedActions && theme.suggestedActions.length > 0 && (
                          <div>
                            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                              💡 Suggested Actions:
                            </Text>
                            <ul style={{ marginLeft: 20, marginBottom: 0 }}>
                              {theme.suggestedActions.map((action, i) => (
                                <li key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Space>
                    </Panel>
                  ))}
                </Collapse>
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations && data.recommendations.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>
                  ✅ Prioritized Recommendations
                </Text>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {data.recommendations.map((rec, index) => (
                    <Alert
                      key={index}
                      message={`${index + 1}. ${rec}`}
                      type="success"
                      showIcon
                      style={{ fontSize: 14 }}
                    />
                  ))}
                </Space>
              </div>
            )}

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

export default FeedbackIntelligenceCard;
