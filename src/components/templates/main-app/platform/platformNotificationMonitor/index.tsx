'use client';

import { FEATURE_FLAGS } from '@config/features';
import type {
    PlatformNotificationChannel,
    PlatformNotificationProductId,
    PlatformNotificationSeverity,
} from '@data/shared/platformNotificationRegistry';
import type {
    PlatformNotificationRow,
    PlatformNotificationSnapshot,
    PlatformNotificationStatusFilter,
    PlatformNotificationSeverityFilter,
} from '@lib/ops/platformNotificationTypes';
import {
    readPlatformNotificationActionResponse,
    readPlatformNotificationSnapshotResponse,
} from '@lib/ops/platformNotificationClientResponse';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import {
    copyRuntimeTextToClipboard,
    getBoundedRuntimeStringContext,
    hasRuntimeClipboardWrite,
    hasRuntimeCopyFallback,
    logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuCheckCircle,
    LuCopy,
    LuExternalLink,
    LuMail,
    LuMessageCircle,
    LuPlus,
    LuRefreshCw,
} from 'react-icons/lu';

const { Text, Title } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS: Array<{ label: string; value: PlatformNotificationStatusFilter }> = [
    { label: 'Active', value: 'active' },
    { label: 'Acknowledged', value: 'acknowledged' },
    { label: 'All recent', value: 'all' },
];

const SEVERITY_OPTIONS: Array<{ label: string; value: PlatformNotificationSeverityFilter }> = [
    { label: 'All severities', value: 'all' },
    { label: 'Critical', value: 'critical' },
    { label: 'Warning', value: 'warning' },
    { label: 'Info', value: 'info' },
];

const PRODUCT_LABELS: Record<PlatformNotificationProductId, string> = {
    PLATFORM: 'Platform',
    ML: 'MenuList',
    AL: 'Answerlattice',
    CC: 'CampaignCue',
    MC: 'MyCodex',
};

const SEVERITY_COLORS: Record<PlatformNotificationSeverity, string> = {
    critical: 'red',
    warning: 'orange',
    info: 'blue',
};

function formatTimestamp(value: string | null | undefined, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function normalizeWhatsappPhone(value: string): string {
    return buildWhatsAppPhoneParam({ phoneNumber: value });
}

function buildMailtoHref(destination: string, subject: string, body: string): string {
    return `mailto:${encodeURIComponent(destination)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildWhatsappWebHref(destination: string, body: string): string {
    return `https://web.whatsapp.com/send?phone=${normalizeWhatsappPhone(destination)}&text=${encodeURIComponent(body)}`;
}

function metadataText(record: PlatformNotificationRow): string {
    const entries = Object.entries(record.metadataPreview || {});
    if (!entries.length) return '-';
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' / ');
}

function scopeText(record: PlatformNotificationRow): string {
    const parts = [record.tId && record.tId !== 'system' ? `Tenant ${record.tId}` : null, record.sId && record.sId !== 'system' ? `Store ${record.sId}` : null]
        .filter(Boolean);
    return parts.length ? parts.join(' / ') : 'System';
}

function CountMetric({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone?: 'danger' | 'warning';
}) {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                minWidth: 124,
                padding: '10px 12px',
                borderRadius: 6,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorFillAlter,
            }}
        >
            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{label}</Text>
            <Text
                strong
                style={{
                    fontSize: 20,
                    color: tone === 'danger' ? token.colorError : tone === 'warning' ? token.colorWarning : undefined,
                }}
            >
                {value}
            </Text>
        </div>
    );
}

function buildManualSubject(record: PlatformNotificationRow): string {
    return `[${record.severity.toUpperCase()}] ${record.title}`;
}

function buildManualBody(record: PlatformNotificationRow, formatter: IntlFormatter): string {
    return [
        record.title,
        '',
        record.message,
        '',
        `Severity: ${record.severity.toUpperCase()}`,
        `Trigger: ${record.triggerType}`,
        `Product: ${PRODUCT_LABELS[record.productId] || record.productId}`,
        `Scope: ${scopeText(record)}`,
        `Time: ${formatTimestamp(record.timestamp, formatter)}`,
        `Runbook: ${record.runbook}`,
        `Alert ID: ${record.id}`,
        '',
        `Context: ${metadataText(record)}`,
    ].join('\n');
}

export default function PlatformNotificationMonitor() {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const { data: session, status: sessionStatus } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';

    const [statusFilter, setStatusFilter] = useState<PlatformNotificationStatusFilter>('active');
    const [severityFilter, setSeverityFilter] = useState<PlatformNotificationSeverityFilter>('all');
    const [triggerFilter, setTriggerFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [snapshot, setSnapshot] = useState<PlatformNotificationSnapshot | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [manualAlertOpen, setManualAlertOpen] = useState(false);
    const [prefillModal, setPrefillModal] = useState<{
        channel: 'email' | 'whatsapp_web';
        destination: string;
        subject: string;
        body: string;
    } | null>(null);
    const [manualForm] = Form.useForm();

    const loadData = useCallback(async (eventId?: string | null) => {
        if (!isPlatform) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const query = new URLSearchParams({
                status: statusFilter,
                severity: severityFilter,
                triggerType: triggerFilter,
                limit: '50',
            });
            if (eventId) query.set('eventId', eventId);

            const response = await fetch(`/api/ops/platform-notifications?${query.toString()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const data = await readPlatformNotificationSnapshotResponse(response, {
                ...getBoundedRuntimeStringContext('eventId', eventId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
                ...getBoundedRuntimeStringContext('severityFilter', severityFilter),
                ...getBoundedRuntimeStringContext('triggerFilter', triggerFilter),
            });
            if (!data) {
                message.error('Failed to load platform notifications');
                return;
            }
            setSnapshot(data);
        } catch (error) {
            logRuntimeFailure('platform_notification_monitor_load_failed', error, {
                ...getBoundedRuntimeStringContext('eventId', eventId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
                ...getBoundedRuntimeStringContext('severityFilter', severityFilter),
                ...getBoundedRuntimeStringContext('triggerFilter', triggerFilter),
            });
            message.error('Failed to load platform notifications');
        } finally {
            setLoading(false);
        }
    }, [isPlatform, severityFilter, statusFilter, triggerFilter]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        setSelectedEventId(null);
        void loadData(null);
    }, [loadData, sessionStatus]);

    const runAction = useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
        setActionLoading(true);
        try {
            const response = await fetch('/api/ops/platform-notifications', {
                cache: 'no-store',
                credentials: 'same-origin',
                method: 'POST',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const actionResult = await readPlatformNotificationActionResponse(response, {
                ...getBoundedRuntimeStringContext('action', body.action),
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
            });
            if (!actionResult) {
                message.error('Platform notification action failed');
                return false;
            }
            message.success(actionResult.message || 'Action completed');
            await loadData(selectedEventId);
            return true;
        } catch (error) {
            logRuntimeFailure('platform_notification_monitor_action_failed', error, {
                ...getBoundedRuntimeStringContext('action', body.action),
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
            });
            message.error('Platform notification action failed');
            return false;
        } finally {
            setActionLoading(false);
        }
    }, [loadData, selectedEventId]);

    const openEvent = useCallback((record: PlatformNotificationRow) => {
        setSelectedEventId(record.id);
        void loadData(record.id);
    }, [loadData]);

    const closeDrawer = useCallback(() => {
        setSelectedEventId(null);
        void loadData(null);
    }, [loadData]);

    const openPrefillModal = useCallback((record: PlatformNotificationRow, channel: 'email' | 'whatsapp_web') => {
        setSelectedEventId(record.id);
        setPrefillModal({
            channel,
            destination: '',
            subject: buildManualSubject(record),
            body: buildManualBody(record, formatter),
        });
        void loadData(record.id);
    }, [formatter, loadData]);

    const openPrefilledExternalTool = useCallback(() => {
        if (!prefillModal) return;
        if (!prefillModal.destination.trim()) {
            message.warning(prefillModal.channel === 'email' ? 'Enter an email address' : 'Enter a WhatsApp number');
            return;
        }

        if (prefillModal.channel === 'email') {
            window.location.href = buildMailtoHref(prefillModal.destination, prefillModal.subject, prefillModal.body);
            return;
        }

        const whatsappWebHref = buildWhatsappWebHref(prefillModal.destination, prefillModal.body);
        try {
            const opened = window.open(whatsappWebHref, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('platform_notification_monitor_whatsapp_open_blocked');
            }
        } catch (error) {
            logRuntimeFailure('platform_notification_monitor_whatsapp_open_failed', error, {
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
                ...getBoundedRuntimeStringContext('severityFilter', severityFilter),
                ...getBoundedRuntimeStringContext('triggerFilter', triggerFilter),
                ...getBoundedRuntimeStringContext('destination', prefillModal.destination),
                ...getBoundedRuntimeStringContext('messageBody', prefillModal.body),
                ...getBoundedRuntimeStringContext('whatsappWebHref', whatsappWebHref),
            });
            message.error('Unable to open WhatsApp Web');
        }
    }, [prefillModal, selectedEventId, severityFilter, statusFilter, triggerFilter]);

    const copyPrefillMessage = useCallback(async () => {
        if (!prefillModal) return;
        const messageText = prefillModal.channel === 'email'
            ? `${prefillModal.subject}\n\n${prefillModal.body}`
            : prefillModal.body || '';
        try {
            await copyRuntimeTextToClipboard(messageText);
            message.success('Message copied');
        } catch (error) {
            logRuntimeFailure('platform_notification_monitor_message_copy_failed', error, {
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
                ...getBoundedRuntimeStringContext('severityFilter', severityFilter),
                ...getBoundedRuntimeStringContext('triggerFilter', triggerFilter),
                ...getBoundedRuntimeStringContext('channel', prefillModal.channel),
                ...getBoundedRuntimeStringContext('destination', prefillModal.destination),
                ...getBoundedRuntimeStringContext('subject', prefillModal.subject),
                ...getBoundedRuntimeStringContext('messageBody', prefillModal.body),
                messageTextLength: messageText.length,
                hasClipboardWrite: hasRuntimeClipboardWrite(),
                hasCopyFallback: hasRuntimeCopyFallback(),
            });
            message.error('Unable to copy message');
        }
    }, [prefillModal, selectedEventId, severityFilter, statusFilter, triggerFilter]);

    const selectedEvent = snapshot?.selectedEvent?.id === selectedEventId ? snapshot.selectedEvent : undefined;
    const counts = snapshot?.counts || { active: 0, acknowledged: 0, critical: 0, warning: 0, info: 0 };
    const triggerOptions = useMemo(() => [
        { label: 'All triggers', value: 'all' },
        ...((snapshot?.registry || []).map((entry) => ({ label: entry.title, value: entry.triggerType }))),
    ], [snapshot?.registry]);

    const columns: ColumnsType<PlatformNotificationRow> = useMemo(() => [
        {
            title: 'Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 152,
        },
        {
            title: 'Severity',
            dataIndex: 'severity',
            key: 'severity',
            render: (value: PlatformNotificationSeverity, record) => (
                <Space size={4} direction="vertical">
                    <Tag color={SEVERITY_COLORS[value]}>{value.toUpperCase()}</Tag>
                    {record.immediate ? <Tag color="geekblue">IMMEDIATE</Tag> : null}
                </Space>
            ),
            width: 124,
        },
        {
            title: 'Trigger',
            dataIndex: 'triggerType',
            key: 'triggerType',
            render: (value, record) => (
                <Space size={4} direction="vertical">
                    <Text strong>{record.title}</Text>
                    <Text type="secondary">{value}</Text>
                </Space>
            ),
            width: 260,
        },
        {
            title: 'Scope',
            key: 'scope',
            render: (_, record) => (
                <Space size={4} direction="vertical">
                    <Text>{PRODUCT_LABELS[record.productId] || record.productId}</Text>
                    <Text type="secondary">{scopeText(record)}</Text>
                </Space>
            ),
            width: 178,
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message',
            render: (value, record) => (
                <Space size={4} direction="vertical" style={{ maxWidth: 360 }}>
                    <Text>{value}</Text>
                    <Text type="secondary">{metadataText(record)}</Text>
                </Space>
            ),
            width: 380,
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Space size={4} direction="vertical">
                    {record.acknowledged ? <Tag color="green">ACKNOWLEDGED</Tag> : <Tag color="red">ACTIVE</Tag>}
                    {record.manualHandoffAt ? <Tag color="purple">MANUAL RECORDED</Tag> : null}
                </Space>
            ),
            width: 152,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size={6} wrap>
                    <Button size="small" onClick={(event) => { event.stopPropagation(); openEvent(record); }}>
                        Details
                    </Button>
                    <Button
                        size="small"
                        icon={<LuCheckCircle />}
                        disabled={record.acknowledged}
                        loading={actionLoading}
                        onClick={(event) => {
                            event.stopPropagation();
                            void runAction({ action: 'acknowledge', eventId: record.id });
                        }}
                    >
                        Ack
                    </Button>
                    <Button size="small" icon={<LuMail />} onClick={(event) => { event.stopPropagation(); openPrefillModal(record, 'email'); }}>
                        Email
                    </Button>
                    <Button size="small" icon={<LuMessageCircle />} onClick={(event) => { event.stopPropagation(); openPrefillModal(record, 'whatsapp_web'); }}>
                        WhatsApp Web
                    </Button>
                </Space>
            ),
            width: 300,
        },
    ], [actionLoading, formatter, openEvent, openPrefillModal, runAction]);

    if (!FEATURE_FLAGS.ENABLE_PLATFORM_NOTIFICATION_DASHBOARD) {
        return (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
                <Alert message="Platform notification monitor is disabled" type="info" showIcon />
            </div>
        );
    }

    if (sessionStatus !== 'loading' && !isPlatform) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Access restricted to platform administrators." />
            </div>
        );
    }

    if (loading && !snapshot) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Platform Notifications</Title>
                    <Text type="secondary">Founder/operator alert tracking with manual Email and WhatsApp Web recovery</Text>
                </div>
                <Space wrap>
                    <Button href="/ops">Ops Control Room</Button>
                    <Button icon={<LuPlus />} type="primary" onClick={() => setManualAlertOpen(true)}>Manual Alert</Button>
                    <Button icon={<LuRefreshCw />} onClick={() => loadData(selectedEventId)} loading={loading}>Refresh</Button>
                </Space>
            </div>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Cost-bounded monitor"
                description="Uses existing systemAlerts. Manual refresh only, no realtime listener, one bounded recent-alert scan, five aggregate counts, and one direct read only when a detail row is selected."
            />

            <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Space wrap>
                        <Select value={statusFilter} options={STATUS_OPTIONS} style={{ width: 150 }} onChange={setStatusFilter} />
                        <Select value={severityFilter} options={SEVERITY_OPTIONS} style={{ width: 160 }} onChange={setSeverityFilter} />
                        <Select showSearch value={triggerFilter} options={triggerOptions} style={{ width: 260 }} onChange={setTriggerFilter} />
                    </Space>
                    <Text type="secondary">
                        Read cost: {snapshot?.cost.alertReads || 0} alerts / {snapshot?.cost.countQueries || 0} counts / scan {snapshot?.cost.scanLimit || 0}
                    </Text>
                </div>
            </Card>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <CountMetric label="Active" value={counts.active} tone={counts.active ? 'danger' : undefined} />
                <CountMetric label="Acknowledged" value={counts.acknowledged} />
                <CountMetric label="Critical" value={counts.critical} tone={counts.critical ? 'danger' : undefined} />
                <CountMetric label="Warning" value={counts.warning} tone={counts.warning ? 'warning' : undefined} />
                <CountMetric label="Info" value={counts.info} />
            </div>

            <Card
                size="small"
                title={`Alerts (${snapshot?.events.length || 0})`}
                extra={<Text type="secondary">No realtime listener</Text>}
            >
                <Table
                    rowKey="id"
                    size="small"
                    columns={columns}
                    dataSource={snapshot?.events || []}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    loading={loading}
                    scroll={{ x: 1526 }}
                    onRow={(record) => ({
                        onClick: () => openEvent(record),
                        style: { cursor: 'pointer' },
                    })}
                />
            </Card>

            <Drawer
                title={selectedEvent ? selectedEvent.title : 'Platform Notification'}
                open={Boolean(selectedEventId)}
                onClose={closeDrawer}
                width={760}
                destroyOnHidden
                extra={selectedEvent ? (
                    <Space wrap>
                        <Button
                            icon={<LuCheckCircle />}
                            disabled={selectedEvent.acknowledged}
                            loading={actionLoading}
                            onClick={() => runAction({ action: 'acknowledge', eventId: selectedEvent.id })}
                        >
                            Acknowledge
                        </Button>
                        <Button icon={<LuMail />} onClick={() => openPrefillModal(selectedEvent, 'email')}>Email</Button>
                        <Button icon={<LuMessageCircle />} onClick={() => openPrefillModal(selectedEvent, 'whatsapp_web')}>WhatsApp Web</Button>
                    </Space>
                ) : null}
            >
                {loading && selectedEventId && !selectedEvent ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
                        <Spin />
                    </div>
                ) : null}

                {selectedEvent ? (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="Alert ID"><Text copyable>{selectedEvent.id}</Text></Descriptions.Item>
                            <Descriptions.Item label="Severity"><Tag color={SEVERITY_COLORS[selectedEvent.severity]}>{selectedEvent.severity.toUpperCase()}</Tag></Descriptions.Item>
                            <Descriptions.Item label="Trigger"><Text copyable>{selectedEvent.triggerType}</Text></Descriptions.Item>
                            <Descriptions.Item label="Product">{PRODUCT_LABELS[selectedEvent.productId] || selectedEvent.productId}</Descriptions.Item>
                            <Descriptions.Item label="Scope">{scopeText(selectedEvent)}</Descriptions.Item>
                            <Descriptions.Item label="Time">{formatTimestamp(selectedEvent.timestamp, formatter)}</Descriptions.Item>
                            <Descriptions.Item label="Runbook">{selectedEvent.runbook}</Descriptions.Item>
                            <Descriptions.Item label="Channels">
                                <Space size={4} wrap>
                                    {selectedEvent.channels.map((channel: PlatformNotificationChannel) => <Tag key={channel}>{channel}</Tag>)}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                {selectedEvent.acknowledged ? <Tag color="green">ACKNOWLEDGED</Tag> : <Tag color="red">ACTIVE</Tag>}
                                {selectedEvent.manualHandoffAt ? <Tag color="purple">MANUAL RECORDED</Tag> : null}
                            </Descriptions.Item>
                            <Descriptions.Item label="Message">{selectedEvent.message}</Descriptions.Item>
                            <Descriptions.Item label="Metadata">{metadataText(selectedEvent)}</Descriptions.Item>
                        </Descriptions>

                        <div
                            style={{
                                border: `1px solid ${token.colorBorderSecondary}`,
                                borderRadius: 6,
                                padding: 12,
                                background: token.colorFillAlter,
                            }}
                        >
                            <Text strong>Manual recovery</Text>
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">
                                    Use Email or WhatsApp Web when automated delivery is unavailable or when a platform owner needs to send a reviewed message manually. Recording manual handoff marks action taken on the alert.
                                </Text>
                            </div>
                        </div>
                    </Space>
                ) : null}
            </Drawer>

            <Modal
                title={prefillModal?.channel === 'whatsapp_web' ? 'WhatsApp Web Message' : 'Email Message'}
                open={Boolean(prefillModal)}
                width={720}
                confirmLoading={actionLoading}
                onCancel={() => setPrefillModal(null)}
                footer={[
                    <Button key="cancel" onClick={() => setPrefillModal(null)}>Cancel</Button>,
                    <Button
                        key="copy"
                        icon={<LuCopy />}
                        onClick={() => void copyPrefillMessage()}
                    >
                        Copy Message
                    </Button>,
                    <Button key="open" icon={<LuExternalLink />} type="default" onClick={openPrefilledExternalTool}>
                        {prefillModal?.channel === 'whatsapp_web' ? 'Open WhatsApp Web' : 'Open Email'}
                    </Button>,
                    <Button
                        key="record"
                        type="primary"
                        loading={actionLoading}
                        disabled={!selectedEvent || !prefillModal}
                        onClick={async () => {
                            if (!prefillModal || !selectedEvent) return;
                            const ok = await runAction({
                                action: 'manualHandoff',
                                eventId: selectedEvent.id,
                                channel: prefillModal.channel,
                                destination: prefillModal.destination || undefined,
                                note: `Prepared from platform notification dashboard for ${selectedEvent.triggerType}`,
                            });
                            if (ok) setPrefillModal(null);
                        }}
                    >
                        Record Manual
                    </Button>,
                ]}
            >
                {prefillModal ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Alert
                            type="info"
                            showIcon
                            message="Review before sending"
                            description={`This opens your ${prefillModal.channel === 'whatsapp_web' ? 'WhatsApp Web' : 'email client'} with the message prefilled. It records action only after you click Record Manual.`}
                        />
                        <Select
                            value={prefillModal.channel}
                            style={{ width: '100%' }}
                            options={[
                                { label: 'Email', value: 'email' },
                                { label: 'WhatsApp Web', value: 'whatsapp_web' },
                            ]}
                            onChange={(channel) => setPrefillModal({
                                ...prefillModal,
                                channel,
                                destination: '',
                            })}
                        />
                        <Input
                            value={prefillModal.destination}
                            placeholder={prefillModal.channel === 'email' ? 'operator@example.com' : '+919999999999'}
                            onChange={(event) => setPrefillModal({ ...prefillModal, destination: event.target.value })}
                        />
                        {prefillModal.channel === 'email' ? (
                            <Input
                                value={prefillModal.subject}
                                placeholder="Email subject"
                                onChange={(event) => setPrefillModal({ ...prefillModal, subject: event.target.value })}
                            />
                        ) : null}
                        <TextArea
                            value={prefillModal.body}
                            rows={9}
                            maxLength={4000}
                            placeholder="Message body"
                            onChange={(event) => setPrefillModal({ ...prefillModal, body: event.target.value })}
                        />
                    </Space>
                ) : null}
            </Modal>

            <Modal
                title="Create Manual Platform Alert"
                open={manualAlertOpen}
                confirmLoading={actionLoading}
                onCancel={() => setManualAlertOpen(false)}
                onOk={async () => {
                    const values = await manualForm.validateFields();
                    const ok = await runAction({
                        action: 'createManualAlert',
                        ...values,
                    });
                    if (ok) {
                        manualForm.resetFields();
                        setManualAlertOpen(false);
                    }
                }}
            >
                <Form
                    form={manualForm}
                    layout="vertical"
                    initialValues={{
                        triggerType: 'MANUAL_PLATFORM_ALERT',
                        severity: 'warning',
                        productId: 'PLATFORM',
                    }}
                >
                    <Form.Item name="triggerType" label="Trigger" rules={[{ required: true }]}>
                        <Select showSearch options={(snapshot?.registry || []).map((entry) => ({ label: entry.title, value: entry.triggerType }))} />
                    </Form.Item>
                    <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
                        <Select options={SEVERITY_OPTIONS.filter((option) => option.value !== 'all')} />
                    </Form.Item>
                    <Form.Item name="productId" label="Product" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { label: 'Platform', value: 'PLATFORM' },
                                { label: 'MenuList', value: 'ML' },
                                { label: 'Answerlattice', value: 'AL' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="title" label="Title" rules={[{ required: true, min: 3, max: 180 }]}>
                        <Input maxLength={180} />
                    </Form.Item>
                    <Form.Item name="message" label="Message" rules={[{ required: true, min: 3, max: 1200 }]}>
                        <TextArea rows={5} maxLength={1200} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
