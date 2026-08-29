'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import {
    ANSWERLATTICE_EARLY_ACCESS_STAGE_LABELS,
    ANSWERLATTICE_EARLY_ACCESS_STATUS_LABELS,
    ANSWERLATTICE_EARLY_ACCESS_STATUSES,
    ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREA_LABELS,
    type AnswerlatticeEarlyAccessStage,
    type AnswerlatticeEarlyAccessStatus,
    type AnswerlatticeEarlyAccessSupportArea,
} from '@lib/answerlattice/earlyAccessContracts';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
    Flex,
    Grid,
    Input,
    List,
    Modal,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuExternalLink,
    LuLightbulb,
    LuMail,
    LuRefreshCw,
    LuSearch,
    LuUsers,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const MAX_RESPONSE_BYTES = 128 * 1024;

type EarlyAccessRequest = {
    id: string;
    name: string;
    workEmail: string;
    productUrl: string;
    productStage: string;
    supportArea: string;
    supportQuestions: string;
    featureIdea: string | null;
    status: AnswerlatticeEarlyAccessStatus;
    internalNotes: string | null;
    submissionCount: number;
    createdAt: string | null;
    lastSubmittedAt: string | null;
    modifiedOn: string | null;
};

type EarlyAccessCounts = Record<AnswerlatticeEarlyAccessStatus, number> & { total: number };

type EarlyAccessListResponse = {
    counts: EarlyAccessCounts;
    hasMore: boolean;
    nextCursor: string | null;
    requests: EarlyAccessRequest[];
    error?: string;
};

type EarlyAccessUpdateResponse = {
    request?: EarlyAccessRequest;
    error?: string;
};

const EMPTY_COUNTS: EarlyAccessCounts = {
    total: 0,
    pending: 0,
    approved: 0,
    invited: 0,
    activated: 0,
    declined: 0,
    withdrawn: 0,
};

const STATUS_COLORS: Record<AnswerlatticeEarlyAccessStatus, string> = {
    pending: 'gold',
    approved: 'cyan',
    invited: 'blue',
    activated: 'green',
    declined: 'red',
    withdrawn: 'default',
};

const formatDateTime = (value: string | null): string => {
    if (!value) return 'Not available';
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return 'Not available';
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(parsed);
};

const getStageLabel = (value: string): string => (
    ANSWERLATTICE_EARLY_ACCESS_STAGE_LABELS[value as AnswerlatticeEarlyAccessStage] || value || 'Not provided'
);

const getSupportAreaLabel = (value: string): string => (
    ANSWERLATTICE_EARLY_ACCESS_SUPPORT_AREA_LABELS[value as AnswerlatticeEarlyAccessSupportArea] || value || 'Not provided'
);

const getSafeProductUrl = (value: string): string | null => {
    try {
        const parsed = new URL(value);
        return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : null;
    } catch {
        return null;
    }
};

const statusTag = (status: AnswerlatticeEarlyAccessStatus) => (
    <Tag color={STATUS_COLORS[status]}>{ANSWERLATTICE_EARLY_ACCESS_STATUS_LABELS[status]}</Tag>
);

export default function AnswerlatticeEarlyAccessDashboard() {
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const [requests, setRequests] = useState<EarlyAccessRequest[]>([]);
    const [counts, setCounts] = useState<EarlyAccessCounts>(EMPTY_COUNTS);
    const [statusFilter, setStatusFilter] = useState<AnswerlatticeEarlyAccessStatus | 'all'>('all');
    const [search, setSearch] = useState('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selected, setSelected] = useState<EarlyAccessRequest | null>(null);
    const [draftStatus, setDraftStatus] = useState<AnswerlatticeEarlyAccessStatus>('pending');
    const [draftNotes, setDraftNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const requestSequenceRef = useRef(0);

    const fetchPage = useCallback(async ({ append = false, cursor }: { append?: boolean; cursor?: string | null } = {}) => {
        const requestSequence = requestSequenceRef.current + 1;
        requestSequenceRef.current = requestSequence;
        append ? setLoadingMore(true) : setLoading(true);
        if (!append) setLoadError(null);

        try {
            const query = new URLSearchParams({ pageSize: '50' });
            if (statusFilter !== 'all') query.set('status', statusFilter);
            if (cursor) query.set('cursor', cursor);
            const response = await fetch(`/api/answerlattice/platform/early-access?${query.toString()}`, {
                cache: 'no-store',
                credentials: 'same-origin',
            });
            const result = await readJsonResponseWithLimit<EarlyAccessListResponse>(response, MAX_RESPONSE_BYTES);
            if (!response.ok || !result?.requests || !result.counts) {
                throw new Error(result?.error || 'Could not load early access requests.');
            }
            if (requestSequenceRef.current !== requestSequence) return;

            setCounts(result.counts);
            setRequests((current) => append ? [...current, ...result.requests] : result.requests);
            setNextCursor(result.nextCursor);
            setHasMore(result.hasMore);
        } catch (error) {
            if (requestSequenceRef.current !== requestSequence) return;
            logRuntimeFailure('answerlattice_early_access_dashboard_load_failed', error, {
                append,
                status: statusFilter,
            });
            setLoadError('Could not load early access requests. Refresh and try again.');
        } finally {
            if (requestSequenceRef.current === requestSequence) {
                append ? setLoadingMore(false) : setLoading(false);
            }
        }
    }, [statusFilter]);

    useEffect(() => {
        void fetchPage();
    }, [fetchPage]);

    const filteredRequests = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return requests;
        return requests.filter((request) => (
            request.name.toLowerCase().includes(normalizedSearch)
            || request.workEmail.toLowerCase().includes(normalizedSearch)
            || request.productUrl.toLowerCase().includes(normalizedSearch)
            || request.supportQuestions.toLowerCase().includes(normalizedSearch)
            || (request.featureIdea || '').toLowerCase().includes(normalizedSearch)
        ));
    }, [requests, search]);

    const openRequest = useCallback((request: EarlyAccessRequest) => {
        setSelected(request);
        setDraftStatus(request.status);
        setDraftNotes(request.internalNotes || '');
    }, []);

    const saveRequest = useCallback(async () => {
        if (!selected || saving) return;
        setSaving(true);
        try {
            const response = await fetch('/api/answerlattice/platform/early-access', {
                method: 'PATCH',
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: selected.id,
                    status: draftStatus,
                    internalNotes: draftNotes || null,
                }),
            });
            const result = await readJsonResponseWithLimit<EarlyAccessUpdateResponse>(response, MAX_RESPONSE_BYTES);
            if (!response.ok || !result?.request) {
                throw new Error(result?.error || 'Could not update the request.');
            }

            setSelected(result.request);
            setDraftStatus(result.request.status);
            setDraftNotes(result.request.internalNotes || '');
            message.success('Early access request updated.');
            await fetchPage();
        } catch (error) {
            logRuntimeFailure('answerlattice_early_access_dashboard_update_failed', error, {
                status: draftStatus,
            });
            message.error('Could not update the request. Try again.');
        } finally {
            setSaving(false);
        }
    }, [draftNotes, draftStatus, fetchPage, saving, selected]);

    const confirmSave = useCallback(() => {
        if (!selected) return;
        const changed = selected.status !== draftStatus;
        if (!changed) {
            void saveRequest();
            return;
        }
        Modal.confirm({
            title: `Change status to ${ANSWERLATTICE_EARLY_ACCESS_STATUS_LABELS[draftStatus]}?`,
            content: 'This records an internal lifecycle decision. It does not send an email or create a workspace.',
            okText: 'Save status',
            cancelText: 'Cancel',
            onOk: saveRequest,
        });
    }, [draftStatus, saveRequest, selected]);

    const openEmailDraft = useCallback(() => {
        if (!selected) return;
        const subject = encodeURIComponent('Your AnswerLattice early access request');
        const email = encodeURIComponent(selected.workEmail);
        window.location.href = `mailto:${email}?subject=${subject}`;
    }, [selected]);

    const columns = useMemo<ColumnsType<EarlyAccessRequest>>(() => [
        {
            title: 'Applicant',
            key: 'applicant',
            render: (_, record) => (
                <div>
                    <Text strong>{record.name}</Text>
                    <div><Text type="secondary">{record.workEmail}</Text></div>
                </div>
            ),
        },
        {
            title: 'Product',
            key: 'product',
            render: (_, record) => (
                <div>
                    <Text>{getStageLabel(record.productStage)}</Text>
                    <div><Text type="secondary" ellipsis style={{ maxWidth: 220 }}>{record.productUrl}</Text></div>
                </div>
            ),
        },
        {
            title: 'Need',
            dataIndex: 'supportArea',
            key: 'supportArea',
            render: (value: string) => getSupportAreaLabel(value),
        },
        {
            title: 'Idea',
            dataIndex: 'featureIdea',
            key: 'featureIdea',
            render: (value: string | null) => value
                ? <Tag icon={<LuLightbulb aria-hidden />}>Shared</Tag>
                : <Text type="secondary">—</Text>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value: AnswerlatticeEarlyAccessStatus) => statusTag(value),
        },
        {
            title: 'Last request',
            dataIndex: 'lastSubmittedAt',
            key: 'lastSubmittedAt',
            render: (value: string | null, record) => (
                <div>
                    <Text>{formatDateTime(value)}</Text>
                    {record.submissionCount > 1 ? <div><Text type="secondary">{record.submissionCount} submissions</Text></div> : null}
                </div>
            ),
        },
        {
            title: '',
            key: 'action',
            align: 'right',
            render: (_, record) => <Button onClick={() => openRequest(record)}>Review</Button>,
        },
    ], [openRequest]);

    const stats = [
        { key: 'total' as const, label: 'Registered', value: counts.total },
        { key: 'pending' as const, label: 'Pending', value: counts.pending },
        { key: 'approved' as const, label: 'Approved', value: counts.approved },
        { key: 'invited' as const, label: 'Invited', value: counts.invited },
        { key: 'activated' as const, label: 'Activated', value: counts.activated },
        { key: 'closed' as const, label: 'Closed', value: counts.declined + counts.withdrawn },
    ];

    const selectedProductUrl = selected ? getSafeProductUrl(selected.productUrl) : null;
    const isInitialEmpty = !loading && counts.total === 0 && statusFilter === 'all' && !search.trim();

    return (
        <div style={{ margin: '0 auto', maxWidth: 1440, padding: screens.md ? 24 : 16 }}>
            <Flex align={screens.md ? 'center' : 'stretch'} gap={16} justify="space-between" vertical={!screens.md}>
                <div>
                    <Space size={10}>
                        <LuUsers aria-hidden color={token.colorPrimary} size={24} />
                        <Title level={2} style={{ margin: 0 }}>Early Access</Title>
                    </Space>
                    <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
                        Review qualified public requests, product needs, and feature ideas. No action here sends an email or creates a workspace automatically.
                    </Paragraph>
                </div>
                <Button icon={<LuRefreshCw aria-hidden />} loading={loading} onClick={() => void fetchPage()}>
                    Refresh
                </Button>
            </Flex>

            <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
                {stats.map((stat) => (
                    <Col key={stat.key} xs={12} sm={8} lg={4}>
                        <Card size="small">
                            <Statistic title={stat.label} value={stat.value} />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card style={{ marginTop: 16 }}>
                <Flex gap={12} justify="space-between" vertical={!screens.md}>
                    <Input
                        allowClear
                        aria-label="Search loaded early access requests"
                        prefix={<LuSearch aria-hidden />}
                        placeholder="Search loaded requests"
                        style={{ maxWidth: screens.md ? 420 : undefined }}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <Select
                        aria-label="Filter requests by status"
                        style={{ minWidth: screens.md ? 210 : undefined }}
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value)}
                        options={[
                            { label: 'All statuses', value: 'all' },
                            ...ANSWERLATTICE_EARLY_ACCESS_STATUSES.map((status) => ({
                                label: `${ANSWERLATTICE_EARLY_ACCESS_STATUS_LABELS[status]} (${counts[status]})`,
                                value: status,
                            })),
                        ]}
                    />
                </Flex>

                {loadError ? <Alert showIcon type="error" message={loadError} style={{ marginTop: 16 }} /> : null}

                {isInitialEmpty ? (
                    <div style={{ padding: screens.md ? '56px 24px' : '36px 8px', textAlign: 'center' }}>
                        <ContextualStateIllustration
                            className="mx-auto"
                            color={token.colorPrimary}
                            size={120}
                            treatment="softHalo"
                            variant="analyticsContext"
                        />
                        <Title level={4} style={{ marginBottom: 6, marginTop: 16 }}>No early access requests yet</Title>
                        <Text type="secondary">New requests will appear here after the public form is opened.</Text>
                    </div>
                ) : screens.md ? (
                    <Table<EarlyAccessRequest>
                        columns={columns}
                        dataSource={filteredRequests}
                        loading={loading}
                        locale={{ emptyText: 'No matching requests' }}
                        pagination={false}
                        rowKey="id"
                        scroll={{ x: 980 }}
                        style={{ marginTop: 16 }}
                    />
                ) : (
                    <List
                        dataSource={filteredRequests}
                        loading={loading}
                        locale={{ emptyText: 'No matching requests' }}
                        style={{ marginTop: 16 }}
                        renderItem={(request) => (
                            <List.Item style={{ paddingInline: 0 }}>
                                <Card size="small" style={{ width: '100%' }} onClick={() => openRequest(request)}>
                                    <Flex align="flex-start" gap={12} justify="space-between">
                                        <div style={{ minWidth: 0 }}>
                                            <Text strong>{request.name}</Text>
                                            <div><Text type="secondary" ellipsis>{request.workEmail}</Text></div>
                                        </div>
                                        {statusTag(request.status)}
                                    </Flex>
                                    <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8, marginTop: 12 }}>
                                        {request.supportQuestions}
                                    </Paragraph>
                                    <Flex gap={8} wrap="wrap">
                                        <Tag>{getStageLabel(request.productStage)}</Tag>
                                        <Tag>{getSupportAreaLabel(request.supportArea)}</Tag>
                                        {request.featureIdea ? <Tag icon={<LuLightbulb aria-hidden />}>Idea shared</Tag> : null}
                                    </Flex>
                                </Card>
                            </List.Item>
                        )}
                    />
                )}

                {hasMore ? (
                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                        <Button loading={loadingMore} onClick={() => void fetchPage({ append: true, cursor: nextCursor })}>
                            Load more
                        </Button>
                    </div>
                ) : null}
            </Card>

            <Drawer
                destroyOnHidden
                open={Boolean(selected)}
                title="Review early access request"
                width={screens.md ? 640 : '100%'}
                onClose={() => setSelected(null)}
                extra={selected ? statusTag(selected.status) : null}
            >
                {selected ? (
                    <Space direction="vertical" size={20} style={{ width: '100%' }}>
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Applicant">{selected.name}</Descriptions.Item>
                            <Descriptions.Item label="Email">{selected.workEmail}</Descriptions.Item>
                            <Descriptions.Item label="Product">
                                {selectedProductUrl ? (
                                    <a href={selectedProductUrl} rel="noreferrer" target="_blank">
                                        {selected.productUrl} <LuExternalLink aria-hidden size={13} />
                                    </a>
                                ) : selected.productUrl}
                            </Descriptions.Item>
                            <Descriptions.Item label="Stage">{getStageLabel(selected.productStage)}</Descriptions.Item>
                            <Descriptions.Item label="First support area">{getSupportAreaLabel(selected.supportArea)}</Descriptions.Item>
                            <Descriptions.Item label="Registered">{formatDateTime(selected.createdAt)}</Descriptions.Item>
                            <Descriptions.Item label="Last request">{formatDateTime(selected.lastSubmittedAt)}</Descriptions.Item>
                            <Descriptions.Item label="Submissions">{selected.submissionCount}</Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Support questions">
                            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{selected.supportQuestions}</Paragraph>
                        </Card>

                        <Card
                            size="small"
                            title={<Space><LuLightbulb aria-hidden /> Feature request or idea</Space>}
                        >
                            <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                                {selected.featureIdea || 'No feature idea was provided.'}
                            </Paragraph>
                        </Card>

                        <div>
                            <Text strong>Lifecycle status</Text>
                            <Select
                                style={{ marginTop: 8, width: '100%' }}
                                value={draftStatus}
                                onChange={setDraftStatus}
                                options={ANSWERLATTICE_EARLY_ACCESS_STATUSES.map((status) => ({
                                    label: ANSWERLATTICE_EARLY_ACCESS_STATUS_LABELS[status],
                                    value: status,
                                }))}
                            />
                            <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                                Status changes are internal records only. They do not send an email or provision access.
                            </Text>
                        </div>

                        <div>
                            <Text strong>Private operator notes</Text>
                            <Input.TextArea
                                maxLength={2000}
                                rows={5}
                                showCount
                                style={{ marginTop: 8 }}
                                value={draftNotes}
                                onChange={(event) => setDraftNotes(event.target.value)}
                                placeholder="Fit, follow-up context, concerns, or the invitation step completed."
                            />
                        </div>

                        <Flex gap={10} wrap="wrap">
                            <Button icon={<LuMail aria-hidden />} onClick={openEmailDraft}>Email applicant</Button>
                            <Button type="primary" loading={saving} onClick={confirmSave}>Save review</Button>
                        </Flex>
                    </Space>
                ) : null}
            </Drawer>
        </div>
    );
}
