'use client';

import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import type {
    ReportLeadOpsSnapshot,
    ReportLeadReportStatus,
    ReportLeadReportStatusFilter,
    ReportLeadRow,
} from '@lib/ops/reportLeadTypes';
import { readReportLeadOpsSnapshotResponse } from '@lib/ops/reportLeadClientResponse';
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
import { redirect } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

const STATUS_OPTIONS: Array<{ label: string; value: ReportLeadReportStatusFilter }> = [
    { label: 'All recent', value: 'all' },
    { label: 'Missing basics', value: 'missing_basics' },
    { label: 'Unclear', value: 'unclear' },
    { label: 'Ready', value: 'ready' },
    { label: 'Not checked', value: 'not_checked' },
    { label: 'Manual review', value: 'manual_review_needed' },
];

const STATUS_COLORS: Record<ReportLeadReportStatus, string> = {
    ready: 'green',
    missing_basics: 'red',
    unclear: 'orange',
    not_checked: 'default',
    manual_review_needed: 'purple',
};

function formatTimestamp(value: string | null | undefined, formatter: IntlFormatter): string {
    if (!value) return '-';
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? '-' : label;
}

function formatStatus(value: string): string {
    return value.replace(/_/g, ' ').toUpperCase();
}

function formatBusiness(record: ReportLeadRow): string {
    const parts = [record.businessName, record.businessContext].filter(Boolean);
    return parts.length ? parts.join(' / ') : '-';
}

function buildMailtoHref(record: ReportLeadRow): string {
    const subject = `MenuList report follow-up${record.businessName ? ` - ${record.businessName}` : ''}`;
    return `mailto:${encodeURIComponent(record.workEmail || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(record.suggestedReply)}`;
}

function renderSetupJobTags(record: ReportLeadRow) {
    if (record.setupJobList.length === 0) {
        return <Text type="secondary">-</Text>;
    }

    const visibleJobs = record.setupJobList.slice(0, 2);
    const hiddenCount = Math.max(0, record.setupJobList.length - visibleJobs.length);

    return (
        <Space size={4} wrap>
            {visibleJobs.map((job) => (
                <Tag key={`${record.id}-${job.id}`}>{job.label}</Tag>
            ))}
            {hiddenCount > 0 ? <Tag>+{hiddenCount}</Tag> : null}
        </Space>
    );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'danger' | 'warning' }) {
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

export default function ReportLeadMonitor() {
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const { data: session, status: sessionStatus } = useSession();
    const isPlatform = resolveExactSessionPlatformRole(session) === 'PLATFORM';
    const requestIdRef = useRef(0);
    const [loading, setLoading] = useState(true);
    const [snapshot, setSnapshot] = useState<ReportLeadOpsSnapshot | null>(null);
    const [reportStatus, setReportStatus] = useState<ReportLeadReportStatusFilter>('all');
    const [toolId, setToolId] = useState('all');
    const [selectedLead, setSelectedLead] = useState<ReportLeadRow | null>(null);

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
            const params = new URLSearchParams({
                reportStatus,
                toolId,
                limit: '40',
            });
            const response = await fetch(`/api/ops/report-leads?${params.toString()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const data = await readReportLeadOpsSnapshotResponse(response, {
                ...getBoundedRuntimeStringContext('reportStatus', reportStatus),
                ...getBoundedRuntimeStringContext('toolId', toolId),
            });
            if (requestId !== requestIdRef.current) return;
            if (!data) {
                setSnapshot(null);
                message.error('Failed to load report leads');
                return;
            }
            setSnapshot(data);
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            setSnapshot(null);
            logRuntimeFailure('report_lead_monitor_load_failed', error, {
                ...getBoundedRuntimeStringContext('reportStatus', reportStatus),
                ...getBoundedRuntimeStringContext('toolId', toolId),
            });
            message.error('Failed to load report leads');
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [isPlatform, reportStatus, toolId]);

    useEffect(() => {
        if (sessionStatus === 'loading') return;
        void loadData();
        return () => {
            requestIdRef.current += 1;
        };
    }, [loadData, sessionStatus]);

    const toolOptions = useMemo(() => {
        const toolIds = new Set(snapshot?.leads.map((lead) => lead.sourceToolId) || []);
        return [
            { label: 'All tools', value: 'all' },
            ...Array.from(toolIds).sort().map((value) => ({ label: value, value })),
        ];
    }, [snapshot]);

    const copyReply = useCallback(async (record: ReportLeadRow) => {
        try {
            await copyRuntimeTextToClipboard(record.suggestedReply);
            message.success('Reply copied');
        } catch (error) {
            logRuntimeFailure('report_lead_reply_copy_failed', error, {
                ...getBoundedRuntimeStringContext('leadId', record.id),
                ...getBoundedRuntimeStringContext('toolId', record.sourceToolId),
                replyLength: record.suggestedReply.length,
                hasClipboardWrite: hasRuntimeClipboardWrite(),
                hasCopyFallback: hasRuntimeCopyFallback(),
            });
            message.error('Unable to copy reply');
        }
    }, []);

    const columns: ColumnsType<ReportLeadRow> = useMemo(() => [
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (value) => <Text type="secondary">{formatTimestamp(value, formatter)}</Text>,
            width: 150,
        },
        {
            title: 'Tool',
            dataIndex: 'sourceToolId',
            key: 'sourceToolId',
            render: (value, record) => (
                <Space direction="vertical" size={2}>
                    <Text strong>{value}</Text>
                    <Tag color={STATUS_COLORS[record.sourceReportStatus]}>{formatStatus(record.sourceReportStatus)}</Tag>
                </Space>
            ),
            width: 220,
        },
        {
            title: 'Business',
            key: 'business',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text>{formatBusiness(record)}</Text>
                    <Text type="secondary">{record.contactName || '-'}</Text>
                </Space>
            ),
            width: 220,
        },
        {
            title: 'Gaps',
            key: 'gaps',
            render: (_, record) => (
                <Space size={4} wrap>
                    <Tag color={record.missingCount > 0 ? 'red' : 'default'}>Missing {record.missingCount}</Tag>
                    <Tag color={record.unclearCount > 0 ? 'orange' : 'default'}>Unclear {record.unclearCount}</Tag>
                    <Tag>Not checked {record.notCheckedCount}</Tag>
                </Space>
            ),
            width: 210,
        },
        {
            title: 'Setup jobs',
            key: 'setupJobList',
            render: (_, record) => renderSetupJobTags(record),
            width: 260,
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_, record) => (
                <Space direction="vertical" size={2}>
                    <Text copyable={Boolean(record.workEmail)}>{record.workEmail || '-'}</Text>
                    {record.phoneNumber ? <Text copyable>{record.phoneNumber}</Text> : null}
                </Space>
            ),
            width: 230,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space size={6}>
                    <Button size="small" onClick={() => setSelectedLead(record)}>Details</Button>
                    <Button size="small" onClick={() => copyReply(record)}>Copy reply</Button>
                    <Button size="small" disabled={!record.workEmail} href={record.workEmail ? buildMailtoHref(record) : undefined}>
                        Email
                    </Button>
                </Space>
            ),
            width: 230,
        },
    ], [copyReply, formatter]);

    if (sessionStatus === 'loading' || loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const counts = snapshot?.counts || {
        scannedEnquiries: 0,
        reportLeadsInScan: 0,
        shown: 0,
        ready: 0,
        missingBasics: 0,
        unclear: 0,
        notChecked: 0,
        manualReviewNeeded: 0,
    };

    return (
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <Title level={3} style={{ marginBottom: 4 }}>Report Leads</Title>
                    <Text type="secondary">Consented follow-up requests from public MenuList Tool reports.</Text>
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
                message="Lead triage only"
                description="This reads existing public contact enquiries tagged by shareable reports. It does not store reports, inspect external platforms, or mutate owner business truth."
            />

            {snapshot?.feature.scanMayBeIncomplete ? (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Recent report-lead limit reached"
                    description="Results and filters cover only the bounded recent report-lead query. Older matching report leads may exist."
                />
            ) : null}

            <Card size="small" style={{ marginBottom: 16 }}>
                <Space wrap size={12}>
                    <Select
                        style={{ width: 190 }}
                        value={reportStatus}
                        options={STATUS_OPTIONS}
                        onChange={(value) => {
                            setReportStatus(value);
                            setSelectedLead(null);
                        }}
                    />
                    <Select
                        style={{ width: 260 }}
                        value={toolId}
                        options={toolOptions}
                        onChange={(value) => {
                            setToolId(value);
                            setSelectedLead(null);
                        }}
                    />
                    <Text type="secondary">
                        Manual refresh. Uses {snapshot?.cost.authReads || 1} current-user authorization read plus{' '}
                        {snapshot?.cost.enquiryReads || 0} report-lead enquiry reads.
                    </Text>
                </Space>
            </Card>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <Metric label="Shown" value={counts.shown} />
                <Metric label="Missing basics" value={counts.missingBasics} tone="danger" />
                <Metric label="Unclear" value={counts.unclear} tone="warning" />
                <Metric label="Ready" value={counts.ready} />
                <Metric label="Report leads in scan" value={counts.reportLeadsInScan} />
            </div>

            <Card size="small">
                <Table<ReportLeadRow>
                    rowKey="id"
                    columns={columns}
                    dataSource={snapshot?.leads || []}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 1520 }}
                    locale={{ emptyText: <Empty description="No report leads found in the recent scan" /> }}
                    onRow={(record) => ({
                        onClick: () => setSelectedLead(record),
                    })}
                />
            </Card>

            <Drawer
                open={Boolean(selectedLead)}
                title="Report lead details"
                onClose={() => setSelectedLead(null)}
                width={640}
            >
                {selectedLead ? (
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Descriptions size="small" column={1} bordered>
                            <Descriptions.Item label="Tool">{selectedLead.sourceToolId}</Descriptions.Item>
                            <Descriptions.Item label="Report status">
                                <Tag color={STATUS_COLORS[selectedLead.sourceReportStatus]}>{formatStatus(selectedLead.sourceReportStatus)}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Business">{formatBusiness(selectedLead)}</Descriptions.Item>
                            <Descriptions.Item label="Contact">{selectedLead.contactName || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Email">{selectedLead.workEmail || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{selectedLead.phoneNumber || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Source path">{selectedLead.sourcePath || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Created">{formatTimestamp(selectedLead.createdAt, formatter)}</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Setup job list">
                            {selectedLead.setupJobList.length > 0 ? (
                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                    {selectedLead.setupJobList.map((job) => (
                                        <div key={`${selectedLead.id}-${job.id}`} style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 8 }}>
                                            <Text strong>{job.label}</Text>
                                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>{job.reason}</Paragraph>
                                        </div>
                                    ))}
                                </Space>
                            ) : (
                                <Text type="secondary">No setup jobs were submitted with this report.</Text>
                            )}
                        </Card>

                        <Card size="small" title="Submitted summary">
                            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{selectedLead.messagePreview || '-'}</Paragraph>
                        </Card>

                        <Card size="small" title="Suggested first reply">
                            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{selectedLead.suggestedReply}</Paragraph>
                            <Space wrap>
                                <Button type="primary" onClick={() => copyReply(selectedLead)}>Copy reply</Button>
                                <Button disabled={!selectedLead.workEmail} href={selectedLead.workEmail ? buildMailtoHref(selectedLead) : undefined}>
                                    Open email
                                </Button>
                            </Space>
                        </Card>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Cost note: {snapshot?.cost.note || 'Manual refresh only.'}
                        </Text>
                    </Space>
                ) : null}
            </Drawer>
        </div>
    );
}
