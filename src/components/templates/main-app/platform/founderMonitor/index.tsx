'use client';

import { getPlatformFounderMonitor } from '@database/ops/founderMonitor';
import type {
  FounderMonitorData,
  FounderMonitorDataGap,
  FounderMonitorRevenueMovementRow,
  FounderMonitorRiskLevel,
  FounderMonitorSourceCoverage,
  FounderMonitorStatus,
  FounderMonitorStoreRow,
} from '@lib/ops/founderMonitorTypes';
import { createLatestRequestGuard } from '@lib/runtime/latestRequestGuard';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { formatInrPaise } from '@util/formatters';
import { Alert, Button, Card, Empty, Select, Space, Spin, Statistic, Table, Tabs, Tag, Typography, App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

const statusColor = (status: FounderMonitorStatus | FounderMonitorRiskLevel | string) => {
  if (status === 'healthy' || status === 'none' || status === 'available') return 'green';
  if (status === 'watch' || status === 'setup_required' || status === 'empty') return 'gold';
  if (status === 'action_required' || status === 'error') return 'red';
  return 'default';
};

const movementColor = (kind: string) => {
  if (kind === 'cash_collected' || kind === 'new_mrr') return 'green';
  if (kind === 'failed_payment' || kind === 'churn') return 'red';
  return 'gold';
};

const formatCount = (value?: number | null) => Number(value || 0).toLocaleString('en-IN');

const formatTimestamp = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('en-IN') : '-';
};

const labelize = (value: string) => value.replace(/_/g, ' ').toUpperCase();

const gapAlertType = (gap: FounderMonitorDataGap): 'info' | 'warning' | 'error' => {
  if (gap.severity === 'action_required') return 'error';
  if (gap.severity === 'watch') return 'warning';
  return 'info';
};

function MetricCard({
  title,
  value,
  detail,
  status = 'healthy',
}: {
  title: string;
  value: string;
  detail: string;
  status?: FounderMonitorStatus | FounderMonitorRiskLevel | string;
}) {
  return (
    <Card size="small" style={{ minHeight: 138 }}>
      <Statistic title={title} value={value} valueStyle={{ color: statusColor(status) === 'red' ? '#cf1322' : undefined }} />
      <Paragraph style={{ margin: '8px 0 0' }} type="secondary">
        {detail}
      </Paragraph>
    </Card>
  );
}

export default function PlatformFounderMonitor() {
    const { message: messageApi } = App.useApp();
  const { data: session, status } = useSession();
  const platformRole = session?.platformRole || session?.user?.platformRole;
  const isPlatform = platformRole === 'PLATFORM';
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<FounderMonitorData | null>(null);
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
    setData(null);
    setLoading(true);
    try {
      const payload = await getPlatformFounderMonitor(days);
      if (!isMountedRef.current || !requestGuard.isCurrent(requestId)) return;
      setData(payload);
    } catch (error) {
      if (!isMountedRef.current || !requestGuard.isCurrent(requestId)) return;
      logRuntimeFailure('founder_monitor_load_failed', error, { days });
      messageApi.error('Failed to load founder monitor');
    } finally {
      if (isMountedRef.current && requestGuard.isCurrent(requestId)) {
        setLoading(false);
      }
    }
  }, [days, isPlatform, status]);

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

  const storeColumns: ColumnsType<FounderMonitorStoreRow> = useMemo(() => [
    {
      title: 'Tenant / Store',
      key: 'identity',
      width: 260,
      render: (_: unknown, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.storeName}</Text>
          <Text type="secondary">{record.tenantName}</Text>
          <Text type="secondary">T{record.tenantId || '-'} / S{record.storeId || '-'}</Text>
        </Space>
      ),
    },
    {
      title: 'Stage',
      key: 'stage',
      width: 150,
      render: (_: unknown, record) => <Tag color={record.stage === 'Active' ? 'green' : record.stage === 'At risk' ? 'red' : 'gold'}>{record.stage}</Tag>,
    },
    {
      title: 'Plan / MRR',
      key: 'revenue',
      width: 180,
      render: (_: unknown, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.planName}</Text>
          <Text strong>{formatInrPaise(record.mrrPaise)}/mo</Text>
          <Text type="secondary">{labelize(record.subscriptionStatus || 'not_recorded')}</Text>
        </Space>
      ),
    },
    {
      title: 'Truth',
      key: 'truth',
      width: 180,
      render: (_: unknown, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.truthScore === null ? 'Not scored' : `${record.truthScore}/100`}</Text>
          <Text type="secondary">{record.menuStatus}</Text>
          <Text type="secondary">{record.daysSincePublish === null ? 'No publish date' : `${record.daysSincePublish} days since publish`}</Text>
        </Space>
      ),
    },
    {
      title: 'Distribution',
      dataIndex: 'distributionStatus',
      key: 'distributionStatus',
      width: 160,
    },
    {
      title: 'Support',
      key: 'support',
      width: 120,
      render: (_: unknown, record) => <Text>{record.supportOpenTickets} open</Text>,
    },
    {
      title: 'Risk',
      key: 'risk',
      render: (_: unknown, record) => (
        <Space direction="vertical" size={4}>
          <Tag color={statusColor(record.riskLevel)}>{labelize(record.riskLevel)}</Tag>
          {record.riskReasons.length ? (
            <Text type="secondary">{record.riskReasons.slice(0, 3).join(', ')}</Text>
          ) : (
            <Text type="secondary">No current risk</Text>
          )}
        </Space>
      ),
    },
  ], []);

  const movementColumns: ColumnsType<FounderMonitorRevenueMovementRow> = useMemo(() => [
    {
      title: 'When',
      key: 'occurredAt',
      width: 170,
      render: (_: unknown, record) => formatTimestamp(record.occurredAt),
    },
    {
      title: 'Type',
      key: 'kind',
      width: 150,
      render: (_: unknown, record) => <Tag color={movementColor(record.kind)}>{labelize(record.kind)}</Tag>,
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 140,
      render: (_: unknown, record) => <Text strong>{formatInrPaise(record.amountPaise)}</Text>,
    },
    {
      title: 'Tenant / Store',
      key: 'identity',
      width: 170,
      render: (_: unknown, record) => <Text>T{record.tenantId || '-'} / S{record.storeId || '-'}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
  ], []);

  const sourceColumns: ColumnsType<FounderMonitorSourceCoverage> = useMemo(() => [
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
      render: (_: unknown, record) => <Tag color={statusColor(record.status)}>{labelize(record.status)}</Tag>,
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

  const tabs = useMemo(() => data ? [
    {
      key: 'command-center',
      label: 'Command Center',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <MetricCard
              detail={`${formatCount(data.scorecard.activeStores)} active out of ${formatCount(data.scorecard.totalStores)} total stores.`}
              status={data.scorecard.trustedLiveStores > 0 ? 'healthy' : 'watch'}
              title="Trusted Live Stores"
              value={formatCount(data.scorecard.trustedLiveStores)}
            />
            <MetricCard detail="Current active recurring revenue." title="MRR" value={formatInrPaise(data.revenue.currentMrrPaise)} />
            <MetricCard
              detail={`${formatCount(data.growth.draftsCreated)} attributed drafts. ${data.growth.draftToClaimRatePercent}% draft-to-claim.`}
              status={data.growth.businessesClaimed > 0 ? 'healthy' : 'watch'}
              title="Attributed Claims"
              value={formatCount(data.growth.businessesClaimed)}
            />
            <MetricCard
              detail={`New ${formatInrPaise(data.revenue.newMrrPaise)} minus churn ${formatInrPaise(data.revenue.churnedMrrPaise)}.`}
              status={data.revenue.netNewMrrPaise >= 0 ? 'healthy' : 'action_required'}
              title="Net New MRR"
              value={formatInrPaise(data.revenue.netNewMrrPaise)}
            />
            <MetricCard detail={data.scorecard.todayWindowLabel} title="Cash Collected Today" value={formatInrPaise(data.revenue.cashCollectedTodayPaise)} />
            <MetricCard detail="Distinct tenants detected from tenant, subscription, and payment signals." title="New Tenants Today" value={formatCount(data.scorecard.newTenantsToday)} />
            <MetricCard detail="Distinct stores detected from subscription and payment signals." title="New Stores Today" value={formatCount(data.scorecard.newStoresToday)} />
            <MetricCard detail="Stores that published or refreshed a menu today." title="Stores Activated Today" value={formatCount(data.scorecard.storesActivatedToday)} />
            <MetricCard
              detail="Paid or entitled stores without a live menu signal."
              status={data.scorecard.onboardingStuckStores > 0 ? 'action_required' : 'healthy'}
              title="Onboarding Stuck"
              value={formatCount(data.scorecard.onboardingStuckStores)}
            />
            <MetricCard
              detail="Stale truth or critical support risk."
              status={data.scorecard.staleOrBrokenStores > 0 ? 'action_required' : 'healthy'}
              title="Stale / Broken Stores"
              value={formatCount(data.scorecard.staleOrBrokenStores)}
            />
            <MetricCard detail="Stores with a recorded public URL or menu presence surface." title="Distribution Stores" value={formatCount(data.scorecard.activeDistributionStores)} />
            <MetricCard
              detail={`Failed amount ${formatInrPaise(data.revenue.failedPaymentAmountTodayPaise)}.`}
              status={data.scorecard.failedPaymentsToday > 0 ? 'action_required' : 'healthy'}
              title="Failed Payments Today"
              value={formatCount(data.scorecard.failedPaymentsToday)}
            />
            <MetricCard
              detail="High priority open support tickets."
              status={data.scorecard.criticalTickets > 0 ? 'action_required' : 'healthy'}
              title="Critical Tickets"
              value={formatCount(data.scorecard.criticalTickets)}
            />
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <Card title="Store Truth">
              <Space direction="vertical" size={8}>
                <Text>Average Store Truth Score: <Text strong>{data.storeTruth.averageScore}/100</Text></Text>
                <Text>Scored stores: {formatCount(data.storeTruth.scoredStores)}</Text>
                <Text>Stores below 70: {formatCount(data.storeTruth.storesBelow70)}</Text>
                <Text>Paying stores below 70: {formatCount(data.storeTruth.payingStoresBelow70)}</Text>
                <Text>Unscored active stores: {formatCount(data.storeTruth.unscoredActiveStores)}</Text>
              </Space>
            </Card>
            <Card title="Revenue Health">
              <Space direction="vertical" size={8}>
                <Text>Active subscriptions: {formatCount(data.revenue.activeSubscriptions)}</Text>
                <Text>Past-due subscriptions: {formatCount(data.revenue.pastDueSubscriptions)}</Text>
                <Text>Past-due MRR: {formatInrPaise(data.revenue.pastDueMrrPaise)}</Text>
                <Text>ARPA: {formatInrPaise(data.revenue.arpaPaise)}</Text>
                <Text>Revenue per trusted store: {formatInrPaise(data.revenue.revenuePerTrustedLiveStorePaise)}</Text>
              </Space>
            </Card>
            <Card title="Cancellation Reasons">
              <Space direction="vertical" size={8}>
                {Object.entries(data.revenue.churnReasons).map(([reason, count]) => (
                  <Text key={reason}>{labelize(reason)}: <Text strong>{formatCount(count)}</Text></Text>
                ))}
              </Space>
            </Card>
            <Card title="Acquisition Sources">
              <Space direction="vertical" size={8}>
                {Object.entries(data.growth.bySource).map(([source, counts]) => (
                  <Text key={source}>
                    {labelize(source)}: <Text strong>{formatCount(counts.businessesClaimed)}</Text> claimed / {formatCount(counts.draftsCreated)} drafts
                  </Text>
                ))}
              </Space>
            </Card>
            <Card title="Onboarding">
              <Space direction="vertical" size={8}>
                <Text>Paid stores not live: {formatCount(data.onboarding.paidStoresNotLive)}</Text>
                <Text>Pending subscriptions: {formatCount(data.onboarding.pendingSubscriptions)}</Text>
                <Text>Stores without published menu: {formatCount(data.onboarding.storesWithoutPublishedMenu)}</Text>
                <Text>Missing distribution surface: {formatCount(data.onboarding.storesMissingDistributionSurface)}</Text>
                <Text>Time to live: {data.onboarding.averageTimeToLiveHours === null ? 'Not yet ledgered' : `${data.onboarding.averageTimeToLiveHours}h`}</Text>
              </Space>
            </Card>
            <Card title="Support Risk">
              <Space direction="vertical" size={8}>
                <Text>Open tickets: {formatCount(data.support.openTickets)}</Text>
                <Text>High priority open: {formatCount(data.support.highPriorityOpenTickets)}</Text>
                <Text>Opened today: {formatCount(data.support.ticketsOpenedToday)}</Text>
                <Text>Stores with 3+ open tickets: {formatCount(data.support.storesWithRepeatedTickets)}</Text>
              </Space>
            </Card>
          </div>

          {data.dataGaps.map((gap) => (
            <Alert description={gap.detail} key={gap.id} message={gap.label} showIcon type={gapAlertType(gap)} />
          ))}
        </Space>
      ),
    },
    {
      key: 'store-operations',
      label: 'Tenant / Store Operations',
      children: data.storeRows.length ? (
        <Table columns={storeColumns} dataSource={data.storeRows} pagination={{ pageSize: 20 }} rowKey="id" scroll={{ x: 1180 }} size="small" />
      ) : (
        <Empty description="No stores were found in the current platform summary." />
      ),
    },
    {
      key: 'revenue',
      label: 'Revenue Movement',
      children: data.revenueMovement.length ? (
        <Table columns={movementColumns} dataSource={data.revenueMovement} pagination={{ pageSize: 20 }} rowKey="id" size="small" />
      ) : (
        <Empty description="No recent revenue movement was found for this window." />
      ),
    },
    {
      key: 'sources',
      label: 'Source Coverage',
      children: (
        <Table columns={sourceColumns} dataSource={data.sourceCoverage} pagination={false} rowKey="id" size="small" />
      ),
    },
  ] : [], [data, movementColumns, sourceColumns, storeColumns]);

  if (loading && !data) {
    return (
      <Space align="center" direction="vertical" style={{ minHeight: 360, width: '100%', justifyContent: 'center' }}>
        <Spin />
        <Text type="secondary">Loading founder monitor...</Text>
      </Space>
    );
  }

  if (!data) {
    return <Empty description="Founder monitor is not available." />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space align="start" direction="vertical" size={12} style={{ width: '100%' }}>
          <Space align="center" wrap>
            <Title level={3} style={{ margin: 0 }}>Founder Monitor</Title>
            <Tag color={statusColor(data.status)}>{labelize(data.status)}</Tag>
          </Space>
          <Paragraph style={{ margin: 0 }} type="secondary">
            Platform-only operating view for trusted live stores, recurring revenue, onboarding, Store Truth, distribution, and support risk.
          </Paragraph>
          <Space wrap>
            <Select
              onChange={setDays}
              options={[
                { label: 'Last 7 days', value: 7 },
                { label: 'Last 30 days', value: 30 },
                { label: 'Last 60 days', value: 60 },
                { label: 'Last 90 days', value: 90 },
              ]}
              style={{ width: 150 }}
              value={days}
            />
            <Button loading={loading} onClick={() => void loadData()}>Refresh</Button>
            <Button href="/platform/cost-posture">Cost Posture</Button>
            <Button href="/platform/owner-business-assistant">Business Health Monitor</Button>
            <Button href="/platform/support-tickets">Support Tickets</Button>
            <Button href="/platform/stores">Stores</Button>
          </Space>
          <Text type="secondary">Generated {formatTimestamp(data.generatedAt)}. Reads are bounded and manual-refresh only.</Text>
        </Space>
      </Card>

      <Tabs items={tabs} />
    </Space>
  );
}
