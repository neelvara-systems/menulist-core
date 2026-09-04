'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

import { PRODUCT_IDS } from '@constant/product';
import { FEATURE_FLAGS } from '@config/features';
import type { OwnerNotificationChannel, OwnerNotificationProductId } from '@data/shared/ownerNotificationRegistry';
import type {
    OwnerNotificationOpsDeliveryRow,
    OwnerNotificationOpsEventRow,
    OwnerNotificationOpsSnapshot,
    OwnerNotificationOpsStatusFilter,
} from '@lib/ops/ownerNotificationTypes';
import {
    readOwnerNotificationActionResponse,
    readOwnerNotificationSnapshotResponse,
} from '@lib/ops/ownerNotificationClientResponse';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import {
    copyRuntimeTextToClipboard,
    getBoundedRuntimeStringContext,
    hasRuntimeClipboardWrite,
    hasRuntimeCopyFallback,
    logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { createRuntimeId } from '@lib/runtime/randomId';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Input,
    Modal,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    App,
    theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

const { Text, Title } = Typography;
const { TextArea } = Input;

const PRODUCT_OPTIONS: Array<{ label: string; value: OwnerNotificationProductId }> = [
    { label: 'MenuList', value: PRODUCT_IDS.MENULIST },
    { label: 'Answerlattice', value: PRODUCT_IDS.ANSWERLATTICE },
];

const STATUS_OPTIONS: Array<{ label: string; value: OwnerNotificationOpsStatusFilter }> = [
    { label: 'Failed', value: 'failed' },
    { label: 'Partial', value: 'partial' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Skipped', value: 'skipped' },
    { label: 'Invalid data', value: 'invalid' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'All recent', value: 'all' },
];

const STATUS_COLORS: Record<string, string> = {
    pending: 'gold',
    processing: 'blue',
    delivered: 'green',
    partial: 'orange',
    failed: 'red',
    skipped: 'default',
    invalid: 'magenta',
};

function formatTimestamp(value: string | null | undefined, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatScope(record: OwnerNotificationOpsEventRow): string {
    if (record.storeId) return `Store ${record.storeId}`;
    if (record.workspaceId) return `Workspace ${record.workspaceId}`;
    return record.tenantId || '-';
}

function metadataText(record: OwnerNotificationOpsEventRow): string {
    const entries = Object.entries(record.metadataPreview || {});
    if (!entries.length) return '-';
    return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' / ');
}

function formatMonitorError(value: unknown): string {
    const text = String(value || '').trim();
    if (!text) return '-';
    if (/^[A-Za-z0-9_.:-]{1,80}$/.test(text)) return text;
    if (/^(Stored error|Subject|Provider message id) present \(\d+ chars\)\.$/.test(text)) return text;
    return `Stored error present (${text.length} chars).`;
}

function canRetry(status: string): boolean {
    return status === 'failed';
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

function CountMetric({ label, value, tone }: { label: string; value: number; tone?: 'danger' | 'warning' }) {
    const { token } = theme.useToken();
    return (
        <div
            style={{
                minWidth: 112,
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

export default function OwnerNotificationMonitor() {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const { data: session, status: sessionStatus } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === 'PLATFORM';
    const [productId, setProductId] = useState<OwnerNotificationProductId>(PRODUCT_IDS.MENULIST);
    const [statusFilter, setStatusFilter] = useState<OwnerNotificationOpsStatusFilter>('failed');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [snapshot, setSnapshot] = useState<OwnerNotificationOpsSnapshot | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [prefillModal, setPrefillModal] = useState<{
        channel: OwnerNotificationChannel;
        destination: string;
        destinationTouched: boolean;
        subject: string;
        subjectTouched: boolean;
        body: string;
        bodyTouched: boolean;
        actionId: string;
    } | null>(null);

    const loadData = useCallback(async (eventId?: string | null) => {
        if (!isPlatform) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const query = new URLSearchParams({
                productId,
                status: statusFilter,
                limit: '30',
            });
            if (eventId) query.set('eventId', eventId);

            const response = await fetch(`/api/ops/owner-notifications?${query.toString()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const data = await readOwnerNotificationSnapshotResponse(response, {
                ...getBoundedRuntimeStringContext('eventId', eventId),
                ...getBoundedRuntimeStringContext('productId', productId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
            });
            if (!data) {
                messageApi.error('Failed to load owner notifications');
                return;
            }
            setSnapshot(data);
        } catch (error) {
            logRuntimeFailure('owner_notification_monitor_load_failed', error, {
                ...getBoundedRuntimeStringContext('eventId', eventId),
                ...getBoundedRuntimeStringContext('productId', productId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
            });
            messageApi.error('Failed to load owner notifications');
        } finally {
            setLoading(false);
        }
    }, [isPlatform, productId, statusFilter]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        setSelectedEventId(null);
        void loadData(null);
    }, [loadData, sessionStatus]);

    const runAction = useCallback(async (body: Record<string, unknown>) => {
        setActionLoading(true);
        try {
            const response = await fetch('/api/ops/owner-notifications', {
                cache: 'no-store',
                credentials: 'same-origin',
                method: 'POST',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const actionResult = await readOwnerNotificationActionResponse(response, {
                ...getBoundedRuntimeStringContext('action', body.action),
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
            });
            if (!actionResult) {
                messageApi.error('Owner notification action failed');
                return;
            }
            messageApi.success(actionResult.message || 'Action completed');
            await loadData(selectedEventId);
        } catch (error) {
            logRuntimeFailure('owner_notification_monitor_action_failed', error, {
                ...getBoundedRuntimeStringContext('action', body.action),
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
            });
            messageApi.error('Owner notification action failed');
        } finally {
            setActionLoading(false);
        }
    }, [loadData, selectedEventId]);

    const openEvent = useCallback((record: OwnerNotificationOpsEventRow) => {
        setSelectedEventId(record.id);
        void loadData(record.id);
    }, [loadData]);

    const closeDrawer = useCallback(() => {
        setSelectedEventId(null);
        void loadData(null);
    }, [loadData]);

    const counts = snapshot?.counts || {
        pending: 0,
        processing: 0,
        delivered: 0,
        partial: 0,
        failed: 0,
        skipped: 0,
        invalid: 0,
    };

    const selectedEvent = snapshot?.selectedEvent?.id === selectedEventId ? snapshot.selectedEvent : undefined;
    const recipient = selectedEvent ? snapshot?.resolvedRecipient : undefined;

    const openPrefillModal = useCallback((record: OwnerNotificationOpsEventRow, channel: OwnerNotificationChannel) => {
        setSelectedEventId(record.id);
        setPrefillModal({
            channel,
            destination: '',
            destinationTouched: false,
            subject: '',
            subjectTouched: false,
            body: '',
            bodyTouched: false,
            actionId: createRuntimeId('owner_handoff'),
        });
        void loadData(record.id);
    }, [loadData]);

    const prefillDestination = prefillModal
        ? (prefillModal.destinationTouched
            ? prefillModal.destination
            : prefillModal.channel === 'email'
                ? recipient?.email || ''
                : recipient?.whatsappNumber || '')
        : '';
    const prefillSubject = prefillModal
        ? (prefillModal.subjectTouched
            ? prefillModal.subject
            : snapshot?.manualTemplate?.subject || selectedEvent?.triggerType || '')
        : '';
    const prefillBody = prefillModal
        ? (prefillModal.bodyTouched
            ? prefillModal.body
            : snapshot?.manualTemplate?.text || (selectedEvent ? metadataText(selectedEvent) : ''))
        : '';

    const openPrefilledExternalTool = useCallback(() => {
        if (!prefillModal) return;
        if (!prefillDestination.trim()) {
            messageApi.warning(prefillModal.channel === 'email' ? 'Enter an email address' : 'Enter a WhatsApp number');
            return;
        }

        if (prefillModal.channel === 'email') {
            window.location.href = buildMailtoHref(prefillDestination, prefillSubject, prefillBody);
            return;
        }

        const whatsappWebHref = buildWhatsappWebHref(prefillDestination, prefillBody);
        try {
            openIsolatedBrowserUrl(whatsappWebHref);
        } catch (error) {
            logRuntimeFailure('owner_notification_monitor_whatsapp_open_failed', error, {
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
                ...getBoundedRuntimeStringContext('productId', productId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
                ...getBoundedRuntimeStringContext('destination', prefillDestination),
                ...getBoundedRuntimeStringContext('messageBody', prefillBody),
                ...getBoundedRuntimeStringContext('whatsappWebHref', whatsappWebHref),
            });
            messageApi.error('Unable to open WhatsApp Web');
        }
    }, [prefillBody, prefillDestination, prefillModal, prefillSubject, productId, selectedEventId, statusFilter]);

    const copyPrefillMessage = useCallback(async () => {
        if (!prefillModal) return;
        const messageText = prefillModal.channel === 'email'
            ? `${prefillSubject}\n\n${prefillBody}`
            : prefillBody;
        try {
            await copyRuntimeTextToClipboard(messageText);
            messageApi.success('Message copied');
        } catch (error) {
            logRuntimeFailure('owner_notification_monitor_message_copy_failed', error, {
                ...getBoundedRuntimeStringContext('selectedEventId', selectedEventId),
                ...getBoundedRuntimeStringContext('productId', productId),
                ...getBoundedRuntimeStringContext('statusFilter', statusFilter),
                ...getBoundedRuntimeStringContext('channel', prefillModal.channel),
                ...getBoundedRuntimeStringContext('destination', prefillDestination),
                ...getBoundedRuntimeStringContext('subject', prefillSubject),
                ...getBoundedRuntimeStringContext('messageBody', prefillBody),
                messageTextLength: messageText.length,
                hasClipboardWrite: hasRuntimeClipboardWrite(),
                hasCopyFallback: hasRuntimeCopyFallback(),
            });
            messageApi.error('Unable to copy message');
        }
    }, [prefillBody, prefillDestination, prefillModal, prefillSubject, productId, selectedEventId, statusFilter]);

    const eventColumns: ColumnsType<OwnerNotificationOpsEventRow> = useMemo(() => [
        {
            title: 'Updated',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 144,
        },
        {
            title: 'Trigger',
            dataIndex: 'triggerType',
            key: 'triggerType',
            render: (value, record) => (
                <Space size={4} direction="vertical">
                    <Text strong>{value}</Text>
                    <Tag>{record.priority}</Tag>
                </Space>
            ),
            width: 220,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value, record) => (
                <Space size={4} direction="vertical">
                    <Tag color={STATUS_COLORS[value] || 'default'}>{String(value).toUpperCase()}</Tag>
                    {record.manualHandoffAt ? <Tag color="purple">MANUAL RECORDED</Tag> : null}
                </Space>
            ),
            width: 150,
        },
        {
            title: 'Recipient',
            dataIndex: 'recipientRole',
            key: 'recipientRole',
            render: (value, record) => (
                <Space size={4} direction="vertical">
                    <Text>{value}</Text>
                    <Space size={4}>
                        {(record.requestedChannels.length ? record.requestedChannels : ['registry']).map((channel) => (
                            <Tag key={channel}>{channel}</Tag>
                        ))}
                    </Space>
                </Space>
            ),
            width: 164,
        },
        {
            title: 'Scope',
            key: 'scope',
            render: (_, record) => (
                <Space size={4} direction="vertical">
                    <Text>{PRODUCT_OPTIONS.find((item) => item.value === record.productId)?.label || record.productId}</Text>
                    <Text type="secondary">{formatScope(record)}</Text>
                </Space>
            ),
            width: 184,
        },
        {
            title: 'Reference',
            dataIndex: 'referenceId',
            key: 'referenceId',
            render: (value, record) => (
                <Space size={4} direction="vertical">
                    <Text copyable>{value}</Text>
                    <Text type={record.error ? 'danger' : 'secondary'}>{record.error ? formatMonitorError(record.error) : metadataText(record)}</Text>
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size={6}>
                    <Button
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            openEvent(record);
                        }}
                    >
                        Details
                    </Button>
                    <Button
                        size="small"
                        disabled={!canRetry(record.status)}
                        loading={actionLoading}
                        onClick={(event) => {
                            event.stopPropagation();
                            void runAction({ action: 'retry', productId: record.productId, eventId: record.id });
                        }}
                    >
                        Retry
                    </Button>
                    <Button
                        size="small"
                        disabled={!canRetry(record.status)}
                        onClick={(event) => {
                            event.stopPropagation();
                            openPrefillModal(record, 'email');
                        }}
                    >
                        Email
                    </Button>
                    <Button
                        size="small"
                        disabled={!canRetry(record.status)}
                        onClick={(event) => {
                            event.stopPropagation();
                            openPrefillModal(record, 'whatsapp');
                        }}
                    >
                        WhatsApp Web
                    </Button>
                </Space>
            ),
            width: 310,
        },
    ], [actionLoading, formatter, openEvent, openPrefillModal, runAction]);

    const deliveryColumns: ColumnsType<OwnerNotificationOpsDeliveryRow> = useMemo(() => [
        {
            title: 'Time',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 144,
        },
        {
            title: 'Channel',
            dataIndex: 'channel',
            key: 'channel',
            render: (value, record) => (
                <Space size={4}>
                    <Tag>{value}</Tag>
                    {record.deliveryMode === 'manual_handoff' ? <Tag color="purple">MANUAL</Tag> : null}
                </Space>
            ),
            width: 130,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => <Tag color={value === 'sent' ? 'green' : value === 'failed' ? 'red' : 'default'}>{String(value).toUpperCase()}</Tag>,
            width: 120,
        },
        {
            title: 'Recipient',
            dataIndex: 'recipientMasked',
            key: 'recipientMasked',
            width: 150,
        },
        {
            title: 'Template',
            key: 'template',
            render: (_, record) => (
                <Space size={4} direction="vertical">
                    <Text>{record.templateKey}</Text>
                    <Text type="secondary">{record.subject || record.providerMessageId || '-'}</Text>
                </Space>
            ),
        },
        {
            title: 'Error',
            dataIndex: 'error',
            key: 'error',
            render: (value) => <Text type="danger">{formatMonitorError(value)}</Text>,
        },
    ], [formatter]);

    if (!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD) {
        return (
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
                <Alert message="Owner notification monitor is disabled" type="info" showIcon />
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
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Owner Notification Monitor</Title>
                    <Text type="secondary">Platform-only tracking, retry, and manual handoff for owner email and WhatsApp notices</Text>
                </div>
                <Space wrap>
                    <Button href="/ops">Ops Control Room</Button>
                    <Button onClick={() => loadData(selectedEventId)} loading={loading}>Refresh</Button>
                </Space>
            </div>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Cost-bounded monitor"
                description="Manual refresh only. Current persisted platform authorization and one bounded recent-event window drive rows and counts. Detail recipient lookup runs only after selecting one event. WhatsApp system sends still require the channel flag, provider config, consent, and template or session policy."
            />

            <Card size="small" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Space wrap>
                        <Select
                            aria-label="Filter owner notifications by product"
                            value={productId}
                            options={PRODUCT_OPTIONS}
                            style={{ width: 160 }}
                            onChange={setProductId}
                        />
                        <Select
                            aria-label="Filter owner notifications by status"
                            value={statusFilter}
                            options={STATUS_OPTIONS}
                            style={{ width: 150 }}
                            onChange={setStatusFilter}
                        />
                    </Space>
                    <Text type="secondary">
                        Read cost: {snapshot?.cost.authReads || 0} auth / {snapshot?.cost.eventReads || 0} event / {snapshot?.cost.deliveryReads || 0} delivery / {snapshot?.cost.scopeReads || 0} scope / {snapshot?.cost.countQueries || 0} counts
                    </Text>
                </div>
            </Card>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <CountMetric label="Recent failed" value={counts.failed} tone={counts.failed ? 'danger' : undefined} />
                <CountMetric label="Recent partial" value={counts.partial} tone={counts.partial ? 'warning' : undefined} />
                <CountMetric label="Recent pending" value={counts.pending} />
                <CountMetric label="Recent processing" value={counts.processing} />
                <CountMetric label="Recent skipped" value={counts.skipped} />
                <CountMetric label="Recent invalid" value={counts.invalid} tone={counts.invalid ? 'danger' : undefined} />
                <CountMetric label="Recent delivered" value={counts.delivered} />
            </div>

            <Card
                size="small"
                title={`Events (${snapshot?.events.length || 0})`}
                extra={<Text type="secondary">Scan limit {snapshot?.filters.scanLimit || 0}</Text>}
            >
                <Table
                    rowKey="id"
                    size="small"
                    columns={eventColumns}
                    dataSource={snapshot?.events || []}
                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                    loading={loading}
                    scroll={{ x: 1080 }}
                />
            </Card>

            <Drawer
                title={selectedEvent ? selectedEvent.triggerType : 'Owner Notification'}
                open={Boolean(selectedEventId)}
                onClose={closeDrawer}
                width={760}
                destroyOnHidden
                extra={selectedEvent ? (
                    <Space>
                        <Button
                            disabled={!canRetry(selectedEvent.status)}
                            loading={actionLoading}
                            onClick={() => runAction({ action: 'retry', productId: selectedEvent.productId, eventId: selectedEvent.id })}
                        >
                            Retry
                        </Button>
                        <Button
                            disabled={!canRetry(selectedEvent.status)}
                            onClick={() => openPrefillModal(selectedEvent, 'email')}
                        >
                            Email
                        </Button>
                        <Button
                            disabled={!canRetry(selectedEvent.status)}
                            onClick={() => openPrefillModal(selectedEvent, 'whatsapp')}
                        >
                            WhatsApp Web
                        </Button>
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
                        {snapshot?.detailError ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="Recipient detail is temporarily unavailable"
                                description="The event is still visible, but recipient and template details could not be resolved. Refresh before a recovery action."
                            />
                        ) : null}
                        <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="Event ID"><Text copyable>{selectedEvent.id}</Text></Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={STATUS_COLORS[selectedEvent.status] || 'default'}>{selectedEvent.status.toUpperCase()}</Tag>
                                {selectedEvent.manualHandoffAt ? <Tag color="purple">MANUAL RECORDED</Tag> : null}
                            </Descriptions.Item>
                            <Descriptions.Item label="Reference"><Text copyable>{selectedEvent.referenceId}</Text></Descriptions.Item>
                            <Descriptions.Item label="Scope">{formatScope(selectedEvent)}</Descriptions.Item>
                            <Descriptions.Item label="Source">{selectedEvent.sourcePath}</Descriptions.Item>
                            <Descriptions.Item label="Updated">{formatTimestamp(selectedEvent.updatedAt, formatter)}</Descriptions.Item>
                            <Descriptions.Item label="Error">{formatMonitorError(selectedEvent.error)}</Descriptions.Item>
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
                            <Text strong>Resolved Recipient</Text>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 8 }}>
                                <div>
                                    <Text type="secondary">Name</Text><br />
                                    <Text>{recipient?.name || '-'}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">Email</Text><br />
                                    <Text copyable={Boolean(recipient?.email)}>{recipient?.email || '-'}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">WhatsApp</Text><br />
                                    <Text copyable={Boolean(recipient?.whatsappNumber)}>{recipient?.whatsappNumber || '-'}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">Consent</Text><br />
                                    {recipient?.whatsappConsent ? <Tag color="green">YES</Tag> : <Tag>NO</Tag>}
                                </div>
                            </div>
                        </div>

                        <Table
                            rowKey="id"
                            size="small"
                            title={() => 'Delivery Attempts'}
                            columns={deliveryColumns}
                            dataSource={snapshot?.deliveries || []}
                            pagination={false}
                            scroll={{ x: 760 }}
                        />
                    </Space>
                ) : null}
            </Drawer>

            <Modal
                title={prefillModal?.channel === 'whatsapp' ? 'WhatsApp Web Message' : 'Email Message'}
                open={Boolean(prefillModal)}
                width={720}
                confirmLoading={actionLoading}
                onCancel={() => setPrefillModal(null)}
                footer={[
                    <Button key="cancel" onClick={() => setPrefillModal(null)}>Cancel</Button>,
                    <Button
                        key="copy"
                        onClick={() => void copyPrefillMessage()}
                    >
                        Copy Message
                    </Button>,
                    <Button key="open" type="default" onClick={openPrefilledExternalTool}>
                        {prefillModal?.channel === 'whatsapp' ? 'Open WhatsApp Web' : 'Open Email'}
                    </Button>,
                    <Button
                        key="record"
                        type="primary"
                        loading={actionLoading}
                        disabled={!selectedEvent || !prefillModal}
                        onClick={async () => {
                            if (!prefillModal || !selectedEvent) return;
                            await runAction({
                                action: 'manualHandoff',
                                productId: selectedEvent.productId,
                                eventId: selectedEvent.id,
                                channel: prefillModal.channel,
                                destination: prefillDestination || undefined,
                                note: `Prepared from dashboard template ${snapshot?.manualTemplate?.templateKey || selectedEvent.triggerType}`,
                                actionId: prefillModal.actionId,
                            });
                            setPrefillModal(null);
                        }}
                    >
                        Record Manual
                    </Button>,
                ]}
            >
                {prefillModal ? (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        {selectedEvent ? (
                            <Alert
                                type="info"
                                showIcon
                                message="Review before sending"
                                description={`Template: ${snapshot?.manualTemplate?.templateKey || selectedEvent.triggerType}. This opens your ${prefillModal.channel === 'whatsapp' ? 'WhatsApp Web' : 'email client'} with the message prefilled; it does not mark the event sent until you record the manual handoff.`}
                            />
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                <Spin />
                            </div>
                        )}
                        <Select
                            value={prefillModal.channel}
                            style={{ width: '100%' }}
                            options={[
                                { label: 'Email', value: 'email' },
                                { label: 'WhatsApp Web', value: 'whatsapp' },
                            ]}
                            onChange={(channel) => setPrefillModal({
                                ...prefillModal,
                                channel,
                                destination: '',
                                destinationTouched: false,
                            })}
                        />
                        <Input
                            value={prefillDestination}
                            placeholder={prefillModal.channel === 'email' ? 'owner@example.com' : '+919999999999'}
                            onChange={(event) => setPrefillModal({
                                ...prefillModal,
                                destination: event.target.value,
                                destinationTouched: true,
                            })}
                        />
                        {prefillModal.channel === 'email' ? (
                            <Input
                                value={prefillSubject}
                                placeholder="Email subject"
                                onChange={(event) => setPrefillModal({
                                    ...prefillModal,
                                    subject: event.target.value,
                                    subjectTouched: true,
                                })}
                            />
                        ) : null}
                        <TextArea
                            value={prefillBody}
                            rows={8}
                            maxLength={3000}
                            placeholder="Message body"
                            onChange={(event) => setPrefillModal({
                                ...prefillModal,
                                body: event.target.value,
                                bodyTouched: true,
                            })}
                        />
                        {prefillModal.channel === 'whatsapp' ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="WhatsApp Web opens externally"
                                description="Confirm the recipient and send the message in WhatsApp Web, then return here and record the manual handoff."
                            />
                        ) : null}
                    </Space>
                ) : null}
            </Modal>
        </div>
    );
}
