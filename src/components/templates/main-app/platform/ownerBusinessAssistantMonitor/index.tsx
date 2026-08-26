'use client';

import { formatInrPaise } from '@util/formatters';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantMonitorResponse,
  type OwnerBusinessAssistantMonitorData,
  type OwnerBusinessAssistantMonitorEvent,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { Alert, Button, Card, Empty, Space, Spin, Statistic, Table, Tag, Typography, App } from 'antd';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

const statusColor = (status: string) => {
  if (status === 'answered') return 'green';
  if (status === 'unsupported') return 'orange';
  if (status === 'needs_more_data') return 'red';
  return 'default';
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '-';
};

export default function OwnerBusinessAssistantMonitor() {
    const { message: messageApi } = App.useApp();
  const { data: session, status } = useSession();
  const platformRole = session?.platformRole || session?.user?.platformRole;
  const isPlatform = platformRole === 'PLATFORM';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OwnerBusinessAssistantMonitorData | null>(null);
  const isMountedRef = useRef(true);
  const requestGuardRef = useRef<ReturnType<typeof createLatestRequestGuard> | null>(null);
  if (!requestGuardRef.current) requestGuardRef.current = createLatestRequestGuard();

  if (status !== 'loading' && session && !isPlatform) {
    redirect('/dashboard');
  }

  const loadData = useCallback(async () => {
    const requestGuard = requestGuardRef.current;
    if (!requestGuard) return;
    const requestId = requestGuard.begin();
    if (status === 'loading') return;
    if (!isPlatform) {
      if (isMountedRef.current && requestGuard.isCurrent(requestId)) {
        setData(null);
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const endpoint = '/api/platform/owner-business-assistant/monitor?limit=50';
      const response = await fetch(endpoint, OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY);
      const payload = await readOwnerBusinessAssistantMonitorResponse(response, {
        ...getBoundedRuntimeStringContext('endpoint', endpoint),
        limit: 50,
      });
      if (!payload) throw new Error('owner_business_assistant_monitor_load_unavailable');
      if (!isMountedRef.current || !requestGuard.isCurrent(requestId)) return;
      setData(payload.data);
    } catch (error) {
      if (!isMountedRef.current || !requestGuard.isCurrent(requestId)) return;
      logRuntimeFailure('owner_business_assistant_monitor_load_failed', error, {
        ...getBoundedRuntimeStringContext('limit', 50),
      });
      messageApi.error('Failed to load Business Health monitor');
    } finally {
      if (isMountedRef.current && requestGuard.isCurrent(requestId)) {
        setLoading(false);
      }
    }
  }, [isPlatform, status]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestGuardRef.current?.invalidate();
    };
  }, []);

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
      render: (_: unknown, record: OwnerBusinessAssistantMonitorEvent) => `${record.tId}/${record.sId}`,
    },
    {
      title: 'Question / Answer',
      key: 'question',
      render: (_: unknown, record: OwnerBusinessAssistantMonitorEvent) => (
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
      render: (_: unknown, record: OwnerBusinessAssistantMonitorEvent) => (
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
      render: (_: unknown, record: OwnerBusinessAssistantMonitorEvent) => (
        <Space direction="vertical" size={4}>
          <Text>{record.unitsConsumed} units</Text>
          <Text type="secondary">{formatInrPaise(record.realCostPaise)} internal</Text>
        </Space>
      ),
    },
    {
      title: 'Route Cost',
      key: 'routeCost',
      width: 150,
      render: (_: unknown, record: OwnerBusinessAssistantMonitorEvent) => (
        <Space direction="vertical" size={4}>
          <Text>{record.firestoreReadCount ?? '-'} reads</Text>
          <Text type="secondary">{record.cacheSource || 'unknown'}{record.packetAgeMinutes != null ? ` · ${record.packetAgeMinutes}m` : ''}</Text>
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
            <Text type="secondary">Internal answer quality, support gaps, feedback, and cost view.</Text>
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
          <Card size="small"><Statistic title="Server Cache Hits" value={data.summary.serverCacheHits} /></Card>
          <Card size="small"><Statistic title="Fresh Packets" value={data.summary.freshFirestorePackets} /></Card>
          <Card size="small"><Statistic title="Avg Reads" value={data.summary.avgFirestoreReads} precision={2} /></Card>
          <Card size="small"><Statistic title="Max Reads" value={data.summary.maxFirestoreReads} /></Card>
          <Card size="small"><Statistic title="Thread Writes" value={data.summary.threadWrites} /></Card>
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

        <Card title="Source Coverage" size="small">
          {data.summary.sourceCoverage.length ? (
            <Table
              dataSource={data.summary.sourceCoverage}
              pagination={false}
              rowKey="domain"
              size="small"
              columns={[
                {
                  title: 'Domain',
                  dataIndex: 'domain',
                  key: 'domain',
                },
                {
                  title: 'Coverage',
                  key: 'status',
                  render: (_: unknown, record: OwnerBusinessAssistantMonitorData['summary']['sourceCoverage'][number]) => (
                    <Space wrap size={4}>
                      <Tag color={record.status === 'supported' ? 'green' : record.status === 'summary_only' ? 'blue' : 'orange'}>{record.status}</Tag>
                      {record.reason ? <Text type="secondary">{record.reason}</Text> : null}
                    </Space>
                  ),
                },
                {
                  title: 'Events',
                  dataIndex: 'eventCount',
                  key: 'eventCount',
                  width: 100,
                },
              ]}
            />
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No coverage data yet" />}
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
