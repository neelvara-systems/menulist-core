'use client'

import { FEATURE_FLAGS } from '@config/features';
import type {
    MessagingOnboardingOpsAlert,
    MessagingOnboardingOpsEvent,
    MessagingOnboardingOpsHealth,
    MessagingOnboardingOpsSession,
    MessagingOnboardingOpsSnapshot,
} from '@lib/ops/messagingOnboardingTypes';
import { isMessagingOnboardingOpsSnapshotResponse } from '@lib/ops/messagingOnboardingOpsBoundary';
import { getBoundedErrorCode } from '@lib/monitoring/boundedLogContext';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import { formatInrAmount } from '@util/formatters';
import { Alert, Button, Card, Divider, Spin, Table, Tag, Typography, message, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    healthy: 'green',
    degraded: 'orange',
    critical: 'red',
    unknown: 'default',
};

const STATE_COLORS: Record<string, string> = {
    COLLECTING_INPUT: 'blue',
    VALIDATING_ASSETS: 'gold',
    AWAITING_MORE_UPLOADS: 'cyan',
    PROCESSING_MENU: 'gold',
    PREVIEW_READY: 'green',
    AWAITING_APPROVAL: 'green',
    PUBLISHING: 'orange',
    FAILED: 'red',
};

const SEVERITY_COLORS: Record<string, string> = {
    info: 'blue',
    warning: 'orange',
    critical: 'red',
};

const MESSAGING_ONBOARDING_MONITOR_LOAD_FAILED = 'Failed to load messaging onboarding data';
const MESSAGING_ONBOARDING_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024;
const MESSAGING_ONBOARDING_MONITOR_RESPONSE_PARSE_FAILED = 'messaging_onboarding_monitor_response_parse_failed';
const MESSAGING_ONBOARDING_MONITOR_RESPONSE_INVALID = 'messaging_onboarding_monitor_response_invalid';
const MESSAGING_ONBOARDING_MONITOR_RESPONSE_REJECTED = 'messaging_onboarding_monitor_response_rejected';
const MESSAGING_ONBOARDING_MONITOR_REQUEST_FAILED = 'messaging_onboarding_monitor_request_failed';

type MessagingOnboardingMonitorLogContext = Record<string, boolean | number | string | null | undefined>;

function getMessagingOnboardingMonitorResponseContext(response: Response): MessagingOnboardingMonitorLogContext {
    return {
        ...getBoundedRuntimeStringContext('endpoint', '/api/ops/messaging-onboarding'),
        maxBytes: MESSAGING_ONBOARDING_MONITOR_RESPONSE_JSON_MAX_BYTES,
        responseOk: response.ok,
        responseStatus: response.status,
    };
}

async function readMessagingOnboardingMonitorSnapshot(
    response: Response,
): Promise<MessagingOnboardingOpsSnapshot | null> {
    const logContext = getMessagingOnboardingMonitorResponseContext(response);
    let payload: unknown = null;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            MESSAGING_ONBOARDING_MONITOR_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(MESSAGING_ONBOARDING_MONITOR_RESPONSE_PARSE_FAILED, error, logContext);
        return null;
    }

    if (!response.ok) {
        logRuntimeFailure(
            MESSAGING_ONBOARDING_MONITOR_RESPONSE_REJECTED,
            new Error(MESSAGING_ONBOARDING_MONITOR_RESPONSE_REJECTED),
            logContext,
        );
        return null;
    }

    if (!isMessagingOnboardingOpsSnapshotResponse(payload)) {
        logRuntimeFailure(
            MESSAGING_ONBOARDING_MONITOR_RESPONSE_INVALID,
            new Error(MESSAGING_ONBOARDING_MONITOR_RESPONSE_INVALID),
            logContext,
        );
        return null;
    }

    return payload;
}

function formatTimestamp(value: string | null | undefined, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatPercent(value: number | undefined): string {
    if (typeof value !== 'number') return '-';
    return `${(value * 100).toFixed(1)}%`;
}

function formatInrCost(value: number | undefined): string {
    return formatInrAmount(value, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    });
}

function formatBytes(value: number | undefined): string {
    if (!value) return '-';
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getBoundedMessagingEventErrorCode(error: MessagingOnboardingOpsEvent['error']): string {
    return getBoundedErrorCode(error) || 'messaging_onboarding_event_failed';
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' | 'warning' }) {
    const { token } = theme.useToken();

    return (
        <div style={{ minWidth: 132 }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{label}</Text>
            <Text
                strong
                style={{
                    color: tone === 'danger' ? token.colorError : tone === 'warning' ? token.colorWarning : undefined,
                    fontSize: 20,
                }}
            >
                {value}
            </Text>
        </div>
    );
}

function MessagingOnboardingMonitor() {
    const formatter = useFormatter();
    const { data: session, status: sessionStatus } = useSession();
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<MessagingOnboardingOpsSnapshot | null>(null);
    const activeRequestRef = useRef<AbortController | null>(null);
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';

    if (session && !isPlatform) {
        redirect('/dashboard');
    }

    const loadData = useCallback(async () => {
        if (!isPlatform) {
            activeRequestRef.current?.abort();
            setSnapshot(null);
            setLoading(false);
            return;
        }

        activeRequestRef.current?.abort();
        const controller = new AbortController();
        activeRequestRef.current = controller;
        setLoading(true);
        try {
            const response = await fetch('/api/ops/messaging-onboarding', {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                signal: controller.signal,
            });
            const nextSnapshot = await readMessagingOnboardingMonitorSnapshot(response);
            if (activeRequestRef.current !== controller) return;
            if (!nextSnapshot) {
                setSnapshot(null);
                message.error(MESSAGING_ONBOARDING_MONITOR_LOAD_FAILED);
                return;
            }
            setSnapshot(nextSnapshot);
        } catch (error) {
            if (controller.signal.aborted || activeRequestRef.current !== controller) return;
            setSnapshot(null);
            logRuntimeFailure(MESSAGING_ONBOARDING_MONITOR_REQUEST_FAILED, error, {
                ...getBoundedRuntimeStringContext('endpoint', '/api/ops/messaging-onboarding'),
                isPlatform,
            });
            message.error(MESSAGING_ONBOARDING_MONITOR_LOAD_FAILED);
        } finally {
            if (activeRequestRef.current === controller) {
                activeRequestRef.current = null;
                setLoading(false);
            }
        }
    }, [isPlatform]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        void loadData();
        return () => {
            activeRequestRef.current?.abort();
        };
    }, [loadData, sessionStatus]);

    const eventColumns: ColumnsType<MessagingOnboardingOpsEvent> = useMemo(() => [
        {
            title: 'Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 130,
        },
        {
            title: 'Event',
            dataIndex: 'eventType',
            key: 'eventType',
            render: (value) => <Tag>{value}</Tag>,
        },
        {
            title: 'State',
            dataIndex: 'sessionState',
            key: 'sessionState',
            render: (value) => <Tag color={STATE_COLORS[value] || 'default'}>{value}</Tag>,
            width: 150,
        },
        {
            title: 'Owner',
            dataIndex: 'userIdMasked',
            key: 'userIdMasked',
            width: 90,
        },
        {
            title: 'Details',
            key: 'metadata',
            render: (_, record) => {
                const parts = Object.entries(record.metadata || {}).map(([key, value]) => `${key}: ${String(value)}`);
                return <Text type={record.error ? 'danger' : 'secondary'}>{record.error ? getBoundedMessagingEventErrorCode(record.error) : parts.join(' · ') || '-'}</Text>;
            },
        },
    ], [formatter]);

    const sessionColumns: ColumnsType<MessagingOnboardingOpsSession> = useMemo(() => [
        {
            title: 'Updated',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 130,
        },
        {
            title: 'State',
            dataIndex: 'state',
            key: 'state',
            render: (value) => <Tag color={STATE_COLORS[value] || 'default'}>{value}</Tag>,
        },
        {
            title: 'Owner',
            dataIndex: 'providerDisplayIdMasked',
            key: 'providerDisplayIdMasked',
            width: 100,
        },
        {
            title: 'Uploads',
            dataIndex: 'uploadCount',
            key: 'uploadCount',
            width: 90,
        },
        {
            title: 'Runs',
            dataIndex: 'processingRuns',
            key: 'processingRuns',
            width: 80,
        },
    ], [formatter]);

    const alertColumns: ColumnsType<MessagingOnboardingOpsAlert> = useMemo(() => [
        {
            title: 'Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 130,
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
            key: 'severity',
            render: (value) => <Tag color={SEVERITY_COLORS[value] || 'default'}>{String(value).toUpperCase()}</Tag>,
            width: 110,
        },
        {
            title: 'Alert',
            key: 'alert',
            render: (_, record) => (
                <div>
                    <Text strong>{record.title}</Text>
                    <br />
                    <Text type="secondary">{record.message}</Text>
                </div>
            ),
        },
    ], [formatter]);

    if (!FEATURE_FLAGS.ENABLE_MESSAGING_ONBOARDING_DASHBOARD) {
        return (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
                <Alert
                    message="Messaging onboarding monitor is disabled"
                    type="info"
                    showIcon
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const health = snapshot?.health;
    const statusColor = STATUS_COLORS[health?.status || 'unknown'];
    const webhook = snapshot?.webhookWindow;
    const inbound = snapshot?.inboundQueue;
    const costs = health?.costs || {};
    const metrics = health?.metrics || {};
    const retention = health?.retention || {};

    return (
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Messaging Onboarding Monitor</Title>
                    <Text type="secondary">Official WhatsApp Cloud API path · platform access only</Text>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button onClick={loadData} loading={loading}>Refresh</Button>
                    <Button href="/ops">Ops Control Room</Button>
                </div>
            </div>

            <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div>
                        <Text type="secondary">Health</Text>
                        <br />
                        <Tag color={statusColor}>{(health?.status || 'unknown').toUpperCase()}</Tag>
                    </div>
                    <div>
                        <Text type="secondary">Snapshot</Text>
                        <br />
                        <Text>{formatTimestamp(health?.windowEnd, formatter)}</Text>
                    </div>
                    <div>
                        <Text type="secondary">Provider</Text>
                        <br />
                        <Text strong>Meta Cloud API</Text>
                    </div>
                    <div>
                        <Text type="secondary">Access</Text>
                        <br />
                        <Text strong>platformRole</Text>
                    </div>
                    <div>
                        <Text type="secondary">Owner API keys</Text>
                        <br />
                        <Text strong>Not used</Text>
                    </div>
                </div>
            </Card>

            {health?.alerts?.length ? (
                <Alert
                    type={health.alerts.some((alert) => alert.severity === 'critical') ? 'error' : 'warning'}
                    message={health.alerts[0].title}
                    description={health.alerts[0].message}
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            <Card title="Pipeline Health" size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                    <Metric label="Sessions 24h" value={metrics.sessionsStarted ?? 0} />
                    <Metric label="Published 24h" value={metrics.publishedSessions ?? 0} />
                    <Metric label="Publish Rate" value={formatPercent(metrics.publishRate)} tone={(metrics.publishRate || 0) < 0.6 && (metrics.sessionsStarted || 0) >= 10 ? 'warning' : undefined} />
                    <Metric label="Processing Runs" value={metrics.processingRuns ?? 0} />
                    <Metric label="Failed Events" value={metrics.failedEvents ?? 0} tone={(metrics.failedEvents || 0) > 0 ? 'warning' : undefined} />
                    <Metric label="Cost / Publish" value={formatInrCost(costs.estimatedCostPerPublishInr)} tone={(costs.estimatedCostPerPublishInr || 0) >= (costs.alertCostPerPublishInr || 15) ? 'danger' : undefined} />
                    <Metric label="Source Sample" value={formatBytes(retention.publishedSourceBytesSampled)} />
                </div>
            </Card>

            <Card title={`Webhook Delivery (${webhook?.hours || 24}h counts)`} size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                    <Metric label="Recent Events" value={webhook?.recentEventsShown ?? 0} />
                    <Metric label="Invalid HMAC" value={webhook?.invalidSignatures ?? 0} tone={(webhook?.invalidSignatures || 0) > 0 ? 'danger' : undefined} />
                    <Metric label="Queued" value={webhook?.inboundQueued ?? 0} />
                    <Metric label="Processed" value={webhook?.inboundProcessed ?? 0} />
                    <Metric label="Inbound Failed" value={webhook?.inboundFailed ?? 0} tone={(webhook?.inboundFailed || 0) > 0 ? 'warning' : undefined} />
                    <Metric label="Replies Sent" value={webhook?.messageSent ?? 0} />
                    <Metric label="Send Failed" value={webhook?.messageSendFailed ?? 0} tone={(webhook?.messageSendFailed || 0) > 0 ? 'warning' : undefined} />
                    <Metric label="Media Failed" value={webhook?.providerMediaDownloadFailed ?? 0} tone={(webhook?.providerMediaDownloadFailed || 0) > 0 ? 'warning' : undefined} />
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
                <Card title="Inbound Queue" size="small">
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        <Metric label="Pending" value={inbound?.pending ?? 0} tone={(inbound?.pending || 0) > 0 ? 'warning' : undefined} />
                        <Metric label="Processing" value={inbound?.processing ?? 0} />
                        <Metric label="Failed" value={inbound?.failed ?? 0} tone={(inbound?.failed || 0) > 0 ? 'danger' : undefined} />
                    </div>
                </Card>

                <Card title="Sessions By State" size="small">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(snapshot?.sessionsByState || {}).map(([state, count]) => (
                            <Tag key={state} color={STATE_COLORS[state] || 'default'} style={{ marginBottom: 4 }}>
                                {state}: {count}
                            </Tag>
                        ))}
                    </div>
                </Card>
            </div>

            <Card title="Recent Sessions" size="small" style={{ marginBottom: 16 }}>
                <Table
                    columns={sessionColumns}
                    dataSource={snapshot?.recentSessions || []}
                    pagination={false}
                    rowKey="id"
                    size="small"
                />
            </Card>

            <Card title="Recent Webhook Events" size="small" style={{ marginBottom: 16 }}>
                <Table
                    columns={eventColumns}
                    dataSource={snapshot?.recentEvents || []}
                    pagination={false}
                    rowKey="id"
                    size="small"
                />
            </Card>

            <Card title="Messaging Alerts" size="small">
                <Table
                    columns={alertColumns}
                    dataSource={snapshot?.recentAlerts || []}
                    locale={{ emptyText: 'No messaging onboarding alerts' }}
                    pagination={false}
                    rowKey="id"
                    size="small"
                />
            </Card>

            <Divider />
            <Text type="secondary">
                Generated {formatTimestamp(snapshot?.generatedAt, formatter)}. Reads are platform-only and use server-side Admin SDK; messaging onboarding collections remain denied to client Firestore.
            </Text>
        </div>
    );
}

export default MessagingOnboardingMonitor;
