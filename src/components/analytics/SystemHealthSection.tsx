/**
 * SystemHealthSection Component
 * System health monitoring and alerts
 */

import React from 'react';
import { Card, Row, Col, Space, Typography, Alert, Progress, Badge, theme } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { RefreshButton } from './RefreshButton';

const { Title, Text } = Typography;

export interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: number;
  unit?: string;
  message?: string;
  icon?: React.ReactNode;
}

export interface SystemHealthSectionProps {
  title?: string;
  metrics: HealthMetric[];
  alerts?: Array<{
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    description?: string;
  }>;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export const SystemHealthSection: React.FC<SystemHealthSectionProps> = ({
  title = 'System Health',
  metrics,
  alerts = [],
  loading = false,
  onRefresh,
  className,
}) => {
  const { token } = theme.useToken();

  // Get status icon
  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 20 }} />;
      case 'warning':
        return <WarningOutlined style={{ color: token.colorWarning, fontSize: 20 }} />;
      case 'critical':
        return <CloseCircleOutlined style={{ color: token.colorError, fontSize: 20 }} />;
    }
  };

  // Get progress color
  const getProgressColor = (status: HealthMetric['status']) => {
    switch (status) {
      case 'healthy':
        return token.colorSuccess;
      case 'warning':
        return token.colorWarning;
      case 'critical':
        return token.colorError;
    }
  };

  // Calculate percentage
  const getPercentage = (value: number, threshold: number) => {
    return Math.min((value / threshold) * 100, 100);
  };

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

      {/* Alerts */}
      {alerts.length > 0 && (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              type={alert.type}
              message={alert.message}
              description={alert.description}
              showIcon
              closable
            />
          ))}
        </Space>
      )}

      {/* Health Metrics */}
      <Row gutter={[16, 16]}>
        {metrics.map((metric, index) => (
          <Col key={metric.name || index} xs={24} md={12} lg={8}>
            <Card loading={loading}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Header */}
                <Space
                  style={{
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space>
                    {metric.icon || <ApiOutlined style={{ fontSize: 20 }} />}
                    <Text strong>{metric.name}</Text>
                  </Space>
                  {getStatusIcon(metric.status)}
                </Space>

                {/* Value */}
                <div>
                  <Text style={{ fontSize: 28, fontWeight: 600 }}>
                    {metric.value}
                    {metric.unit && (
                      <Text type="secondary" style={{ fontSize: 16, marginLeft: 4 }}>
                        {metric.unit}
                      </Text>
                    )}
                  </Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    Threshold: {metric.threshold}
                    {metric.unit}
                  </Text>
                </div>

                {/* Progress Bar */}
                <Progress
                  percent={getPercentage(metric.value, metric.threshold)}
                  strokeColor={getProgressColor(metric.status)}
                  showInfo={false}
                  size={[null, 8]}
                />

                {/* Status Message */}
                {metric.message && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {metric.message}
                  </Text>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Overall Status Summary */}
      <Card>
        <Space direction="horizontal" size="large" wrap>
          <Space>
            <Badge status="success" />
            <Text>
              Healthy:{' '}
              <Text strong>{metrics.filter((m) => m.status === 'healthy').length}</Text>
            </Text>
          </Space>
          <Space>
            <Badge status="warning" />
            <Text>
              Warning:{' '}
              <Text strong>{metrics.filter((m) => m.status === 'warning').length}</Text>
            </Text>
          </Space>
          <Space>
            <Badge status="error" />
            <Text>
              Critical:{' '}
              <Text strong>{metrics.filter((m) => m.status === 'critical').length}</Text>
            </Text>
          </Space>
        </Space>
      </Card>
    </Space>
  );
};

export default SystemHealthSection;
