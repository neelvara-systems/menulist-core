/**
 * System Health Dashboard Component
 * Displays system health when a backing source is connected.
 */

'use client';

import { Card, Col, Row, Badge, Typography, Alert, Spin, Timeline } from 'antd';
import { motion } from 'framer-motion';
import {
  LuCheckCircle,
  LuAlertTriangle,
  LuXCircle,
  LuDatabase,
  LuCpu,
  LuFileText,
  LuAlertCircle,
  LuActivity,
} from 'react-icons/lu';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

// ================================================================
// TYPES
// ================================================================

interface HealthMetric {
  component: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  responseTime?: number;
  errorRate?: number;
  uptime?: number;
  details?: Record<string, any>;
}

interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'down';
  timestamp: Date;
  components: HealthMetric[];
  summary: {
    healthyCount: number;
    degradedCount: number;
    downCount: number;
    avgResponseTime: number;
  };
}

interface SystemHealthDashboardProps {
  tenantId: string;
  storeId: string;
  refreshInterval?: number;
}

// ================================================================
// COMPONENT
// ================================================================

export function SystemHealthDashboard({
  tenantId,
  storeId,
  refreshInterval = 60000, // 1 minute
}: SystemHealthDashboardProps) {
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, refreshInterval);
    return () => clearInterval(interval);
  }, [tenantId, storeId, refreshInterval]);

  function fetchHealthData() {
    setLoading(true);
    setHealthReport(null);
    setLastUpdate(new Date());
    setLoading(false);
  }

  if (loading && !healthReport) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" tip="Loading system health..." />
        </div>
      </Card>
    );
  }

  if (!healthReport) {
    return (
      <Card>
        <Alert message="System health data is not connected for this view." type="info" />
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overall Status Card */}
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ margin: 0, marginBottom: 8 }}>
              System Health Status
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          </div>
          <Badge
            status={getStatusBadge(healthReport.overall)}
            text={
              <Text strong style={{ fontSize: 16 }}>
                {healthReport.overall.toUpperCase()}
              </Text>
            }
          />
        </div>

        {/* Summary Stats */}
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={8}>
            <div
              style={{
                padding: 16,
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <LuCheckCircle size={18} color="#52c41a" />
                <Text strong style={{ fontSize: 24 }}>
                  {healthReport.summary.healthyCount}
                </Text>
              </div>
              <Text type="secondary">Healthy Components</Text>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                padding: 16,
                background: '#fffbe6',
                border: '1px solid #ffe58f',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <LuAlertTriangle size={18} color="#faad14" />
                <Text strong style={{ fontSize: 24 }}>
                  {healthReport.summary.degradedCount}
                </Text>
              </div>
              <Text type="secondary">Degraded Components</Text>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div
              style={{
                padding: 16,
                background: '#fff1f0',
                border: '1px solid #ffccc7',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <LuXCircle size={18} color="#f5222d" />
                <Text strong style={{ fontSize: 24 }}>
                  {healthReport.summary.downCount}
                </Text>
              </div>
              <Text type="secondary">Down Components</Text>
            </div>
          </Col>
        </Row>

        {/* Alert if degraded or down */}
        {healthReport.overall !== 'healthy' && (
          <Alert
            message={
              healthReport.overall === 'degraded'
                ? 'Some components are experiencing issues'
                : 'Critical system components are down'
            }
            description="Please check the component details below and take necessary action."
            type={healthReport.overall === 'degraded' ? 'warning' : 'error'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Component Details */}
      <Card title="Component Health" bordered={false}>
        <Timeline
          items={healthReport.components.map((component, index) => ({
            dot: getStatusIcon(component.status),
            color: getStatusColor(component.status),
            children: (
              <motion.div
                key={component.component}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 15 }}>
                    {component.component}
                  </Text>
                  <Badge
                    status={getStatusBadge(component.status)}
                    text={component.status}
                    style={{ marginLeft: 12 }}
                  />
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                  {component.responseTime && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Response: <strong>{component.responseTime}ms</strong>
                    </Text>
                  )}
                  {component.uptime !== undefined && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Uptime: <strong>{component.uptime}%</strong>
                    </Text>
                  )}
                  {component.errorRate !== undefined && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Errors: <strong>{component.errorRate}</strong>
                    </Text>
                  )}
                </div>

                {component.details && Object.keys(component.details).length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 8,
                      background: '#fafafa',
                      borderRadius: 4,
                      fontSize: 11,
                    }}
                  >
                    {Object.entries(component.details).map(([key, value]) => (
                      <div key={key}>
                        <Text type="secondary">
                          {key}: <strong>{String(value)}</strong>
                        </Text>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ),
          }))}
        />
      </Card>

      {/* Performance Metrics */}
      <Card title="Performance Metrics" bordered={false}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <div
              style={{
                padding: 16,
                background: '#f0f2f5',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <LuActivity size={24} color="#1890ff" style={{ marginBottom: 8 }} />
              <div>
                <Text strong style={{ display: 'block', fontSize: 24 }}>
                  {healthReport.summary.avgResponseTime.toFixed(0)}ms
                </Text>
                <Text type="secondary">Avg Response Time</Text>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={12}>
            <div
              style={{
                padding: 16,
                background: '#f0f2f5',
                borderRadius: 8,
                textAlign: 'center',
              }}
            >
              <LuCheckCircle size={24} color="#52c41a" style={{ marginBottom: 8 }} />
              <div>
                <Text strong style={{ display: 'block', fontSize: 24 }}>
                  {(
                    (healthReport.summary.healthyCount / healthReport.components.length) *
                    100
                  ).toFixed(0)}
                  %
                </Text>
                <Text type="secondary">System Availability</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getStatusIcon(status: 'healthy' | 'degraded' | 'down') {
  switch (status) {
    case 'healthy':
      return <LuCheckCircle size={16} />;
    case 'degraded':
      return <LuAlertTriangle size={16} />;
    case 'down':
      return <LuXCircle size={16} />;
  }
}

function getStatusColor(status: 'healthy' | 'degraded' | 'down'): string {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'degraded':
      return 'orange';
    case 'down':
      return 'red';
  }
}

function getStatusBadge(status: 'healthy' | 'degraded' | 'down'): 'success' | 'warning' | 'error' {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'down':
      return 'error';
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default SystemHealthDashboard;
