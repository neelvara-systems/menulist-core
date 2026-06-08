'use client';

import { formatInrPaise } from '@util/formatters';
import { Alert, Button, Card, Empty, Space, Spin, Statistic, Table, Tag, Typography, message } from 'antd';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

type MonitorEvent = {
  id: string;
  answerId: string;
  tId: string;
  sId: string;
  intent: string;
  question: string;
  answerText: string;
  status: string;
  confidence: string;
  cacheSource?: string | null;
  actionOptionCount: number;
  providerUsed: boolean;
  unitsConsumed: number;
  realCostPaise: number;
  ownerChargePaise: number;
  createdAt?: string | null;
};

type MonitorData = {
  summary: {
    total: number;
    answered: number;
    needsMoreData: number;
    unsupported: number;
    needsConfirmation: number;
    providerCalls: number;
    actionOptionsShown: number;
    unitsConsumed: number;
    realCostPaise: number;
    ownerChargePaise: number;
    byIntent: Record<string, number>;
    byStatus: Record<string, number>;
  };
  events: MonitorEvent[];
  recentActions: Array<Record<string, any>>;
  recentFeedback: Array<Record<string, any>>;
  generatedAt: string;
};

const statusColor = (status: string) => {
  if (status === 'answered') return 'green';
  if (status === 'unsupported') return 'orange';
  if (status === 'needs_more_data') return 'red';
  if (status === 'needs_confirmation') return 'blue';
  return 'default';
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '-';
};

export default function OwnerBusinessAssistantMonitor() {
  const { data: session, status } = useSession();
  const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
  const isPlatform = platformRole === 'PLATFORM';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MonitorData | null>(null);

  if (status !== 'loading' && session && !isPlatform) {
    redirect('/dashboard');
  }

  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    if (!isPlatform) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/platform/owner-business-assistant/monitor?limit=75');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to load Business Health monitor');
      setData(payload.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to load Business Health monitor');
    } finally {
      setLoading(false);
    }
  }, [isPlatform, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const topIntents = useMemo(() => (
    Object.entries(data?.summary.byIntent || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  ), [data?.summary.byIntent]);

  if (loading) {
    return (
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ margin: '0 auto', maxWidth: 1180, padding: 24 }}>
        <Alert type="warning" message="Business Health monitor is not available" showIcon />
      </div>
    );
  }

  const columns = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: formatTimestamp,
    },
    {
      title: 'Store',
      key: 'store',
      width: 120,
      render: (_: unknown, record: MonitorEvent) => `${record.tId}/${record.sId}`,
    },
    {
      title: 'Question / Answer',
      key: 'question',
      render: (_: unknown, record: MonitorEvent) => (
        <Space direction="vertical" size={4}>
          <Text strong>{record.question}</Text>
          <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0 }}>{record.answerText}</Paragraph>
        </Space>
      ),
    },
    {
      title: 'Result',
      key: 'status',
      width: 160,
      render: (_: unknown, record: MonitorEvent) => (
        <Space direction="vertical" size={4}>
          <Tag color={statusColor(record.status)}>{record.status}</Tag>
          <Text type="secondary">{record.intent}</Text>
        </Space>
      ),
    },
    {
      title: 'Cost',
      key: 'cost',
      width: 170,
      render: (_: unknown, record: MonitorEvent) => (
        <Space direction="vertical" size={4}>
          <Text>{record.unitsConsumed} units</Text>
          <Text type="secondary">{formatInrPaise(record.realCostPaise)} internal</Text>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ margin: '0 auto', maxWidth: 1280, padding: '24px 16px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>Business Health Monitor</Title>
            <Text type="secondary">Internal answer quality, support gaps, action usage, and cost view.</Text>
          </div>
          <Space wrap>
            <Button href="/transactions">Owner Transactions</Button>
            <Button href="/ops">Ops Control Room</Button>
            <Button onClick={() => void loadData()}>Refresh</Button>
          </Space>
        </div>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Card size="small"><Statistic title="Questions" value={data.summary.total} /></Card>
          <Card size="small"><Statistic title="Answered" value={data.summary.answered} /></Card>
          <Card size="small"><Statistic title="Needs More Data" value={data.summary.needsMoreData} /></Card>
          <Card size="small"><Statistic title="Unsupported" value={data.summary.unsupported} /></Card>
          <Card size="small"><Statistic title="Provider Calls" value={data.summary.providerCalls} /></Card>
          <Card size="small"><Statistic title="Units" value={data.summary.unitsConsumed} /></Card>
          <Card size="small"><Statistic title="Internal Cost" value={formatInrPaise(data.summary.realCostPaise)} /></Card>
          <Card size="small"><Statistic title="Owner Charge" value={formatInrPaise(data.summary.ownerChargePaise)} /></Card>
        </div>

        <Card title="Top Intents" size="small">
          {topIntents.length ? (
            <Space wrap>
              {topIntents.map(([intent, count]) => <Tag key={intent}>{intent}: {count}</Tag>)}
            </Space>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No answer events yet" />}
        </Card>

        <Card title="Recent Questions" size="small">
          <Table
            columns={columns}
            dataSource={data.events}
            pagination={{ pageSize: 15 }}
            rowKey="id"
            size="small"
          />
        </Card>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <Card title="Recent Actions" size="small">
            {data.recentActions.length ? (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {data.recentActions.slice(0, 8).map((action) => (
                  <div key={action.id} style={{ borderBottom: '1px solid var(--ant-color-border)', paddingBottom: 8 }}>
                    <Text strong>{action.actionType || action.operation || action.id}</Text><br />
                    <Text type="secondary">{action.status || action.workflowStatus || 'unknown'} · {formatTimestamp(action.createdAt)}</Text>
                  </div>
                ))}
              </Space>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No actions yet" />}
          </Card>

          <Card title="Recent Feedback" size="small">
            {data.recentFeedback.length ? (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {data.recentFeedback.slice(0, 8).map((feedback) => (
                  <div key={feedback.id} style={{ borderBottom: '1px solid var(--ant-color-border)', paddingBottom: 8 }}>
                    <Text strong>{feedback.rating || 'feedback'}</Text><br />
                    <Text type="secondary">{feedback.reason || feedback.answerId || feedback.id}</Text>
                  </div>
                ))}
              </Space>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No feedback yet" />}
          </Card>
        </div>
      </Space>
    </div>
  );
}
