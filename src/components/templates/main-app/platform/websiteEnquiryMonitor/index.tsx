'use client';

import { readWebsiteEnquiryOpsSnapshotResponse } from '@lib/ops/websiteEnquiryClientResponse';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import type {
    WebsiteEnquiryKindFilter,
    WebsiteEnquiryOpsSnapshot,
    WebsiteEnquiryRow,
    WebsiteEnquiryTopicFilter,
} from '@lib/ops/websiteEnquiryTypes';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

const KIND_OPTIONS: Array<{ label: string; value: WebsiteEnquiryKindFilter }> = [
    { label: 'All enquiries', value: 'all' },
    { label: 'Contact form', value: 'general' },
    { label: 'Tool report follow-up', value: 'report' },
];

const TOPIC_OPTIONS: Array<{ label: string; value: WebsiteEnquiryTopicFilter }> = [
    { label: 'All topics', value: 'all' },
    { label: 'General question', value: 'general' },
    { label: 'Demo', value: 'demo' },
    { label: 'Multi-location', value: 'multi-location' },
    { label: 'Pricing', value: 'pricing' },
    { label: 'Other', value: 'other' },
];

function formatTimestamp(value: string | null | undefined, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatLabel(value: string): string {
    return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildMailtoHref(record: WebsiteEnquiryRow): string {
    const subject = `MenuList ${formatLabel(record.helpTopic)} follow-up`;
    const body = [
        `Hi ${record.contactName || 'there'},`,
        '',
        'Thanks for contacting MenuList.',
        '',
        'We received your question and can help with the next practical step.',
        '',
        'Regards,',
        'MenuList',
    ].join('\n');
    return `mailto:${encodeURIComponent(record.workEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function WebsiteEnquiryMonitor() {
    const formatter = useFormatter();
    const { data: session, status: sessionStatus } = useSession();
    const isPlatform = resolveExactSessionPlatformRole(session) === 'PLATFORM';
    const requestIdRef = useRef(0);
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<WebsiteEnquiryOpsSnapshot | null>(null);
    const [kind, setKind] = useState<WebsiteEnquiryKindFilter>('all');
    const [topic, setTopic] = useState<WebsiteEnquiryTopicFilter>('all');
    const [selectedEnquiry, setSelectedEnquiry] = useState<WebsiteEnquiryRow | null>(null);

    if (sessionStatus !== 'loading' && !isPlatform) {
        redirect('/dashboard');
    }

    const loadData = useCallback(async () => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        if (!isPlatform) {
            if (requestId === requestIdRef.current) setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({ kind, topic, limit: '40' });
            const response = await fetch(`/api/ops/website-enquiries?${params.toString()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const data = await readWebsiteEnquiryOpsSnapshotResponse(response, {
                ...getBoundedRuntimeStringContext('kind', kind),
                ...getBoundedRuntimeStringContext('topic', topic),
            });
            if (requestId !== requestIdRef.current) return;
            if (!data) {
                setSnapshot(null);
                message.error('Failed to load website enquiries');
                return;
            }
            setSnapshot(data);
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            setSnapshot(null);
            logRuntimeFailure('website_enquiry_monitor_load_failed', error, {
                ...getBoundedRuntimeStringContext('kind', kind),
                ...getBoundedRuntimeStringContext('topic', topic),
            });
            message.error('Failed to load website enquiries');
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [isPlatform, kind, topic]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        void loadData();
        return () => {
            requestIdRef.current += 1;
        };
    }, [loadData, sessionStatus]);

    const columns: ColumnsType<WebsiteEnquiryRow> = useMemo(() => [
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 160,
        },
        {
            title: 'Type',
            dataIndex: 'kind',
            key: 'kind',
            render: (value) => <Tag color={value === 'report' ? 'blue' : 'default'}>{formatLabel(value)}</Tag>,
            width: 140,
        },
        {
            title: 'Topic',
            dataIndex: 'helpTopic',
            key: 'helpTopic',
            render: (value) => formatLabel(value),
            width: 150,
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{record.contactName || '-'}</Text>
                    <Text copyable={Boolean(record.workEmail)}>{record.workEmail || '-'}</Text>
                    {record.phoneNumber ? <Text copyable>{record.phoneNumber}</Text> : null}
                </Space>
            ),
            width: 240,
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message',
            ellipsis: true,
            width: 360,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size={6}>
                    <Button size="small" onClick={() => setSelectedEnquiry(record)}>Details</Button>
                    <Button
                        size="small"
                        disabled={!record.workEmail}
                        href={record.workEmail ? buildMailtoHref(record) : undefined}
                        onClick={(event) => event.stopPropagation()}
                    >
                        Email
                    </Button>
                </Space>
            ),
            width: 150,
        },
    ], [formatter]);

    if (sessionStatus === 'loading' || loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const counts = snapshot?.counts || {
        scannedEnquiries: 0,
        menuListEnquiriesInScan: 0,
        shown: 0,
        new: 0,
        general: 0,
        report: 0,
    };

    return (
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Website Enquiries</Title>
                    <Text type="secondary">Messages accepted through the public MenuList contact route.</Text>
                </div>
                <Space wrap>
                    <Button href="/ops">Ops</Button>
                    <Button onClick={loadData} loading={loading}>Refresh</Button>
                </Space>
            </div>

            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Platform-only response inbox"
                description="Review this inbox manually and reply through the contact details provided. It does not change business data, publish content, or create a realtime listener."
            />

            {snapshot?.feature.scanMayBeIncomplete ? (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Recent enquiry limit reached"
                    description="The inbox shows a bounded recent scan. Older enquiries may exist."
                />
            ) : null}

            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap size={12}>
                    <Select
                        style={{ width: 200 }}
                        value={kind}
                        options={KIND_OPTIONS}
                        onChange={(value) => {
                            setKind(value);
                            setSelectedEnquiry(null);
                        }}
                    />
                    <Select
                        style={{ width: 190 }}
                        value={topic}
                        options={TOPIC_OPTIONS}
                        onChange={(value) => {
                            setTopic(value);
                            setSelectedEnquiry(null);
                        }}
                    />
                    <Text type="secondary">
                        Shown {counts.shown} · New {counts.new} · Contact {counts.general} · Reports {counts.report}
                    </Text>
                </Space>
            </Card>

            <Card size="small">
                <Table<WebsiteEnquiryRow>
                    rowKey="id"
                    columns={columns}
                    dataSource={snapshot?.enquiries || []}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 1160 }}
                    locale={{ emptyText: <Empty description="No website enquiries found in the recent scan" /> }}
                    onRow={(record) => ({
                        onClick: () => setSelectedEnquiry(record),
                    })}
                />
            </Card>

            <Drawer
                open={Boolean(selectedEnquiry)}
                title="Website enquiry"
                onClose={() => setSelectedEnquiry(null)}
                width={620}
            >
                {selectedEnquiry ? (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="Type">{formatLabel(selectedEnquiry.kind)}</Descriptions.Item>
                            <Descriptions.Item label="Status">{formatLabel(selectedEnquiry.status)}</Descriptions.Item>
                            <Descriptions.Item label="Topic">{formatLabel(selectedEnquiry.helpTopic)}</Descriptions.Item>
                            <Descriptions.Item label="Name">{selectedEnquiry.contactName || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Email">{selectedEnquiry.workEmail || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{selectedEnquiry.phoneNumber || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Source path">{selectedEnquiry.sourcePath || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Tool">{selectedEnquiry.sourceToolId || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Created">{formatTimestamp(selectedEnquiry.createdAt, formatter)}</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Message">
                            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                                {selectedEnquiry.message || '-'}
                            </Paragraph>
                        </Card>

                        <Button
                            type="primary"
                            disabled={!selectedEnquiry.workEmail}
                            href={selectedEnquiry.workEmail ? buildMailtoHref(selectedEnquiry) : undefined}
                        >
                            Open email reply
                        </Button>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Cost note: {snapshot?.cost.note || 'Manual refresh only.'}
                        </Text>
                    </Space>
                ) : null}
            </Drawer>
        </div>
    );
}
