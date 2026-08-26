'use client';

import { getPlatformCostPosture } from '@database/ops/costPosture';
import type {
  PlatformCostAlert,
  PlatformCostGuardrail,
  PlatformCostPostureData,
  PlatformCostPostureStatus,
  PlatformCostSignal,
  PlatformCostSourceCoverage,
} from '@lib/ops/costPostureTypes';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { formatInrPaise } from '@util/formatters';
import { Alert, Button, Card, Empty, Select, Space, Spin, Statistic, Table, Tag, Typography, App } from 'antd';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

const statusColor = (status: PlatformCostPostureStatus | string) => {
  if (status === 'healthy' || status === 'ok' || status === 'available') return 'green';
  if (status === 'watch') return 'orange';
  if (status === 'high' || status === 'critical' || status === 'action_required' || status === 'error') return 'red';
  if (status === 'setup_required' || status === 'pending' || status === 'empty') return 'gold';
  return 'default';
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '-';
};

const statusLabel = (status: string) => status.replace(/_/g, ' ').toUpperCase();

export default function PlatformCostPosture() {
    const { message: messageApi } = App.useApp();
  const { data: session, status } = useSession();
  const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
  const isPlatform = platformRole === 'PLATFORM';
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PlatformCostPostureData | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  if (status !== 'loading' && session && !isPlatform) {
    redirect('/dashboard');
  }

  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    if (!isPlatform) {
      activeRequestRef.current?.abort();
      setLoading(false);
      return;
    }

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);
    try {
      const payload = await getPlatformCostPosture(days, { signal: controller.signal });
      if (activeRequestRef.current !== controller) return;
      setData(payload);
    } catch (error) {
      if (controller.signal.aborted || activeRequestRef.current !== controller) return;
      setData(null);
      logRuntimeFailure('platform_cost_posture_load_failed', error, { days });
      messageApi.error('Failed to load platform cost posture');
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [days, isPlatform, status]);

  useEffect(() => {
    void loadData();
    return () => {
      activeRequestRef.current?.abort();
    };
  }, [loadData]);

  const signalColumns = useMemo(() => [
    {
      title: 'Source',
      key: 'source',
      render: (_: unknown, record: PlatformCostSignal) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.label}</Text>
          <Text type="secondary">{record.coverage}</Text>
        </Space>
      ),
    },
    {
      title: 'Rows',
      dataIndex: 'count',
      key: 'count',
      width: 90,
    },
    {
      title: 'Internal Cost',
      key: 'realCostPaise',
      width: 140,
      render: (_: unknown, record: PlatformCostSignal) => formatInrPaise(record.realCostPaise),
    },
    {
      title: 'Owner Charge',
      key: 'ownerChargePaise',
      width: 140,
      render: (_: unknown, record: PlatformCostSignal) => formatInrPaise(record.ownerChargePaise),
    },
    {
      title: 'Provider Calls',
      dataIndex: 'providerCalls',
      key: 'providerCalls',
      width: 130,
    },
    {
      title: 'Reads Seen',
      dataIndex: 'firestoreReadsObserved',
      key: 'firestoreReadsObserved',
      width: 120,
    },
    {
      title: 'Latest',
      key: 'latestAt',
      width: 170,
      render: (_: unknown, record: PlatformCostSignal) => formatTimestamp(record.latestAt),
    },
    {
      title: '',
      key: 'action',
      width: 110,
      render: (_: unknown, record: PlatformCostSignal) => <Button size="small" href={record.linkHref}>Open</Button>,
    },
  ], []);

  const guardrailColumns = useMemo(() => [
    {
      title: 'Guardrail',
      key: 'label',
      width: 220,
      render: (_: unknown, record: PlatformCostGuardrail) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.label}</Text>
          <Tag color={statusColor(record.status)}>{statusLabel(record.status)}</Tag>
        </Space>
      ),
    },
    {
      title: 'Detail',
      dataIndex: 'detail',
      key: 'detail',
    },
    {
      title: '',
      key: 'action',
      width: 110,
      render: (_: unknown, record: PlatformCostGuardrail) => (
        record.actionHref ? <Button size="small" href={record.actionHref}>Open</Button> : null
      ),
    },
  ], []);

  const sourceColumns = useMemo(() => [
    {
      title: 'Source',
      dataIndex: 'label',
      key: 'label',
      width: 240,
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_: unknown, record: PlatformCostSourceCoverage) => (
        <Tag color={statusColor(record.status)}>{statusLabel(record.status)}</Tag>
      ),
    },
    {
      title: 'Limit',
      dataIndex: 'readLimit',
      key: 'readLimit',
      width: 90,
    },
    {
      title: 'Docs',
      dataIndex: 'documentsConsidered',
      key: 'documentsConsidered',
      width: 90,
    },
    {
      title: 'Detail',
      dataIndex: 'detail',
      key: 'detail',
    },
  ], []);

  const alertColumns = useMemo(() => [
    {
      title: 'Time',
      key: 'timestamp',
      width: 170,
      render: (_: unknown, record: PlatformCostAlert) => formatTimestamp(record.timestamp),
    },
    {
      title: 'Severity',
      key: 'severity',
      width: 120,
      render: (_: unknown, record: PlatformCostAlert) => (
        <Tag color={statusColor(record.severity.toLowerCase())}>{record.severity.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Alert',
      key: 'title',
      render: (_: unknown, record: PlatformCostAlert) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.title}</Text>
          <Text type="secondary">{record.message || record.type}</Text>
        </Space>
      ),
    },
  ], []);

  if (loading) {
    return (
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ margin: '0 auto', maxWidth: 1280, padding: 24 }}>
        <Alert type="warning" message="Platform cost posture is not available" showIcon />
      </div>
    );
  }

  return (
    <div style={{ margin: '0 auto', maxWidth: 1320, padding: '24px 16px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ alignItems: 'flex-start', display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <Space align="center" wrap>
              <Title level={3} style={{ margin: 0 }}>Platform Cost Posture</Title>
              <Tag color={statusColor(data.status)}>{statusLabel(data.status)}</Tag>
            </Space>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              Known internal cost signals for {data.periodDays} days. Whole-bill forecasting waits for Cloud Billing export.
            </Paragraph>
          </div>
          <Space wrap>
            <Select
              aria-label="Lookback period"
              options={[
                { label: '7 days', value: 7 },
                { label: '30 days', value: 30 },
                { label: '60 days', value: 60 },
                { label: '90 days', value: 90 },
              ]}
              style={{ width: 120 }}
              value={days}
              onChange={setDays}
            />
            <Button href="/ops">Ops</Button>
            <Button href="/ops/extraction">Extraction</Button>
            <Button href="/platform/owner-business-assistant">Business Health</Button>
            <Button href="/transactions">AI Transactions</Button>
            <Button onClick={() => void loadData()}>Refresh</Button>
          </Space>
        </div>

        <Alert
          showIcon
          type={data.billingExport.blocksBillForecast ? 'warning' : 'success'}
          message={`Cloud Billing export: ${statusLabel(data.billingExport.status)}`}
          description={`${data.billingExport.details} Dataset target: ${data.billingExport.dataset}.`}
        />

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <Card size="small"><Statistic title="Known Internal Cost" value={formatInrPaise(data.totals.knownInternalCostPaise)} /></Card>
          <Card size="small"><Statistic title="Known Owner Charge" value={formatInrPaise(data.totals.knownOwnerChargePaise)} /></Card>
          <Card size="small"><Statistic title="Provider Calls" value={data.totals.providerCalls} /></Card>
          <Card size="small"><Statistic title="Reads Observed" value={data.totals.firestoreReadsObserved} /></Card>
          <Card size="small">
            <Statistic
              title="SAFE_MODE"
              value={data.safeMode.active ? 'ACTIVE' : 'OFF'}
              valueStyle={{ color: data.safeMode.active ? '#cf1322' : '#237804' }}
            />
          </Card>
        </div>

        <Card size="small" title="Cost Signals">
          <Table
            columns={signalColumns}
            dataSource={data.signals}
            pagination={false}
            rowKey="id"
            scroll={{ x: 980 }}
            size="small"
          />
        </Card>

        <Card size="small" title="Guardrails">
          <Table
            columns={guardrailColumns}
            dataSource={data.guardrails}
            pagination={false}
            rowKey="id"
            scroll={{ x: 760 }}
            size="small"
          />
        </Card>

        <Card size="small" title="Recent Cost / Usage Alerts">
          {data.alerts.length === 0 ? (
            <Empty description="No recent cost or usage alerts" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              columns={alertColumns}
              dataSource={data.alerts}
              pagination={false}
              rowKey="id"
              scroll={{ x: 720 }}
              size="small"
            />
          )}
        </Card>

        <Card size="small" title="Source Coverage">
          <Table
            columns={sourceColumns}
            dataSource={data.sourceCoverage}
            pagination={false}
            rowKey="id"
            scroll={{ x: 820 }}
            size="small"
          />
        </Card>

        <Text type="secondary">Generated {formatTimestamp(data.generatedAt)}</Text>
      </Space>
    </div>
  );
}
