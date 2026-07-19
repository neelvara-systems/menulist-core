'use client';

import { FEATURE_FLAGS } from '@config/features';
import { usePredictiveTriggers } from '@hook/answerlattice/usePredictiveTriggers';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getAnswerlatticePredictiveTimestampMillis } from '@lib/answerlattice/predictiveSupportContracts';
import { normalizeAnswerlatticePublicCitationUrl } from '@lib/answerlattice/publicAnswerContracts';
import {
    ANSWERLATTICE_TRIGGER_ACTION_TYPES,
    ANSWERLATTICE_TRIGGER_SOURCE,
    type AnswerlatticePredictiveTrigger,
} from '@type/answerlattice';
import {
    Alert,
    Button,
    Card,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import {
    LuCheckCircle,
    LuAlertCircle,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuRotateCcw,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

type KnownIssueFormValues = {
    title: string;
    summary: string;
    page: string;
    feature?: string;
    workflow?: string;
    plan?: string;
    userRole?: string;
    severity: 'info' | 'degraded' | 'outage';
    statusPageUrl?: string;
    startsAt?: string;
    endsAt?: string;
};

const normalizeCondition = (value?: string) => {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 100);
    return normalized || undefined;
};

const toDateTimeInput = (value: unknown) => {
    if (!value) return '';
    let date: Date;
    try {
        date = typeof (value as any)?.toDate === 'function'
            ? (value as any).toDate()
            : new Date(value as any);
    } catch {
        return '';
    }
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toTimestamp = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : Timestamp.fromDate(date);
};

const getIssueState = (issue: AnswerlatticePredictiveTrigger) => {
    if (issue.status !== 'active') return { label: 'Resolved', color: 'default' };
    const startsAt = getAnswerlatticePredictiveTimestampMillis(issue.knownIssue?.startsAt) || 0;
    const endsAt = getAnswerlatticePredictiveTimestampMillis(issue.knownIssue?.endsAt) || 0;
    if (startsAt > Date.now()) return { label: 'Scheduled', color: 'blue' };
    if (endsAt > 0 && endsAt <= Date.now()) return { label: 'Expired', color: 'default' };
    return { label: 'Visible', color: 'orange' };
};

const getSeverityLabel = (severity?: string) => (
    severity === 'outage' ? 'Service issue' : severity === 'degraded' ? 'Degraded experience' : 'Notice'
);

export default function AnswerlatticeKnownIssues() {
    const session = useClientAuthSession();
    const tId = Number(session?.tId || 0);
    const sId = Number(session?.sId || 0);
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const { triggers, loading, create, update, refresh } = usePredictiveTriggers(tId, sId);
    const [form] = Form.useForm<KnownIssueFormValues>();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AnswerlatticePredictiveTrigger | null>(null);
    const [saving, setSaving] = useState(false);

    const issues = useMemo(
        () => triggers
            .filter(trigger => trigger.kind === 'known_issue')
            .sort((left, right) => {
                const leftActive = getIssueState(left).label === 'Visible' ? 1 : 0;
                const rightActive = getIssueState(right).label === 'Visible' ? 1 : 0;
                return rightActive - leftActive || right.priority - left.priority;
            }),
        [triggers],
    );

    const openCreate = useCallback(() => {
        setEditing(null);
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60_000;
        form.setFieldsValue({
            title: '',
            summary: '',
            page: '',
            severity: 'degraded',
            startsAt: new Date(now.getTime() - offset).toISOString().slice(0, 16),
            endsAt: '',
            statusPageUrl: '',
        });
        setModalOpen(true);
    }, [form]);

    const openEdit = useCallback((issue: AnswerlatticePredictiveTrigger) => {
        setEditing(issue);
        form.setFieldsValue({
            title: issue.action.customTitle || issue.name,
            summary: issue.action.customSummary || '',
            page: issue.conditions.page || '',
            feature: issue.conditions.feature || '',
            workflow: issue.conditions.workflow || '',
            plan: issue.conditions.plan || '',
            userRole: issue.conditions.userRole || '',
            severity: issue.knownIssue?.severity || 'degraded',
            statusPageUrl: issue.knownIssue?.statusPageUrl || '',
            startsAt: toDateTimeInput(issue.knownIssue?.startsAt),
            endsAt: toDateTimeInput(issue.knownIssue?.endsAt),
        });
        setModalOpen(true);
    }, [form]);

    const saveIssue = useCallback(async () => {
        const values = await form.validateFields();
        const page = normalizeCondition(values.page);
        if (!page) return;
        const startsAt = toTimestamp(values.startsAt) || Timestamp.now();
        const endsAt = toTimestamp(values.endsAt) || null;
        if (endsAt && endsAt.toMillis() <= startsAt.toMillis()) {
            message.error('The automatic end must be after the start time.');
            return;
        }
        setSaving(true);
        try {
            const normalizedStatusPageUrl = values.statusPageUrl?.trim()
                ? normalizeAnswerlatticePublicCitationUrl(values.statusPageUrl)
                : null;
            if (values.statusPageUrl?.trim() && (!normalizedStatusPageUrl || !normalizedStatusPageUrl.startsWith('https:'))) {
                form.setFields([{ name: 'statusPageUrl', errors: ['Use a public HTTPS status page URL.'] }]);
                return;
            }
            const conditions = {
                page,
                ...(normalizeCondition(values.feature) ? { feature: normalizeCondition(values.feature) } : {}),
                ...(normalizeCondition(values.workflow) ? { workflow: normalizeCondition(values.workflow) } : {}),
                ...(normalizeCondition(values.plan) ? { plan: normalizeCondition(values.plan) } : {}),
                ...(normalizeCondition(values.userRole) ? { userRole: normalizeCondition(values.userRole) } : {}),
            };
            const knownIssue = {
                severity: values.severity,
                startsAt,
                endsAt,
                ...(normalizedStatusPageUrl ? { statusPageUrl: normalizedStatusPageUrl } : {}),
            };
            let saved = false;
            if (editing) {
                saved = await update({
                    id: editing.id,
                    name: values.title.trim(),
                    description: 'Owner-declared known issue',
                    kind: 'known_issue',
                    conditions,
                    action: {
                        type: ANSWERLATTICE_TRIGGER_ACTION_TYPES.KNOWN_ISSUE,
                        customTitle: values.title.trim(),
                        customSummary: values.summary.trim(),
                    },
                    knownIssue,
                    priority: values.severity === 'outage' ? 100 : values.severity === 'degraded' ? 95 : 90,
                    modifiedOn: Timestamp.now(),
                });
            } else {
                saved = Boolean(await create({
                    tId,
                    sId,
                    name: values.title.trim(),
                    description: 'Owner-declared known issue',
                    kind: 'known_issue',
                    conditions,
                    action: {
                        type: ANSWERLATTICE_TRIGGER_ACTION_TYPES.KNOWN_ISSUE,
                        customTitle: values.title.trim(),
                        customSummary: values.summary.trim(),
                    },
                    knownIssue,
                    priority: values.severity === 'outage' ? 100 : values.severity === 'degraded' ? 95 : 90,
                    cooldownHours: 4,
                    status: 'active',
                    source: ANSWERLATTICE_TRIGGER_SOURCE.MANUAL,
                    createdOn: Timestamp.now(),
                    modifiedOn: Timestamp.now(),
                    createdBy: String(session?.user?.email || session?.uId || 'owner'),
                }));
            }
            if (!saved) return;
            setModalOpen(false);
            setEditing(null);
            form.resetFields();
        } finally {
            setSaving(false);
        }
    }, [create, editing, form, sId, session?.uId, session?.user?.email, tId, update]);

    const resolveIssue = useCallback(async (issue: AnswerlatticePredictiveTrigger) => {
        await update({
            id: issue.id,
            status: 'archived',
            knownIssue: {
                severity: issue.knownIssue?.severity || 'info',
                ...(issue.knownIssue?.startsAt ? { startsAt: issue.knownIssue.startsAt } : {}),
                endsAt: Timestamp.now(),
                ...(issue.knownIssue?.statusPageUrl ? { statusPageUrl: issue.knownIssue.statusPageUrl } : {}),
            },
            modifiedOn: Timestamp.now(),
        });
    }, [update]);

    const reopenIssue = useCallback(async (issue: AnswerlatticePredictiveTrigger) => {
        await update({
            id: issue.id,
            status: 'active',
            knownIssue: {
                severity: issue.knownIssue?.severity || 'info',
                startsAt: Timestamp.now(),
                endsAt: null,
                ...(issue.knownIssue?.statusPageUrl ? { statusPageUrl: issue.knownIssue.statusPageUrl } : {}),
            },
            modifiedOn: Timestamp.now(),
        });
    }, [update]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWN_ISSUES || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) return null;

    return (
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                <div>
                    <Space>
                        <LuAlertCircle size={22} color={token.colorWarning} />
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Known Issues</Title>
                    </Space>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720 }}>
                        Tell users about a current problem on the exact page it affects. Notices use the existing page-aware widget summary and stop automatically when their window ends.
                    </Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading}>Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreate}>Add issue</Button>
                </Space>
            </Flex>

            <Alert
                type="info"
                showIcon
                message="Known issues are notices, not answers"
                description="They appear before a user asks, only on matching pages. Resolving an issue removes it from the active widget path without changing canonical support knowledge."
            />

            {issues.length === 0 ? (
                <Empty description="No known issues. Add one only when users need a proactive service notice." />
            ) : (
                <Flex vertical gap={12}>
                    {issues.map(issue => {
                        const state = getIssueState(issue);
                        return (
                            <Card key={issue.id}>
                                <Flex justify="space-between" align="start" gap={16} vertical={isMobile}>
                                    <Flex vertical gap={8} style={{ minWidth: 0, flex: 1 }}>
                                        <Space wrap>
                                            <Tag color={state.color}>{state.label}</Tag>
                                            <Tag color={issue.knownIssue?.severity === 'outage' ? 'red' : issue.knownIssue?.severity === 'degraded' ? 'orange' : 'blue'}>
                                                {getSeverityLabel(issue.knownIssue?.severity)}
                                            </Tag>
                                            <Tag>{issue.conditions.page}</Tag>
                                        </Space>
                                        <Title level={4} style={{ margin: 0 }}>{issue.action.customTitle || issue.name}</Title>
                                        <Text>{issue.action.customSummary}</Text>
                                        <Text type="secondary">
                                            Starts {toDateTimeInput(issue.knownIssue?.startsAt).replace('T', ' ') || 'now'}
                                            {issue.knownIssue?.endsAt ? ` · Ends ${toDateTimeInput(issue.knownIssue.endsAt).replace('T', ' ')}` : ' · No automatic end'}
                                        </Text>
                                    </Flex>
                                    <Space wrap>
                                        <Button icon={<LuPencil />} onClick={() => openEdit(issue)}>Edit</Button>
                                        {issue.status === 'active' ? (
                                            <Popconfirm title="Mark this issue resolved?" description="The widget will stop showing this notice." onConfirm={() => resolveIssue(issue)}>
                                                <Button icon={<LuCheckCircle />}>Resolve</Button>
                                            </Popconfirm>
                                        ) : (
                                            <Popconfirm title="Show this issue again?" onConfirm={() => reopenIssue(issue)}>
                                                <Button icon={<LuRotateCcw />}>Reopen</Button>
                                            </Popconfirm>
                                        )}
                                    </Space>
                                </Flex>
                            </Card>
                        );
                    })}
                </Flex>
            )}

            <Modal
                title={editing ? 'Edit known issue' : 'Add known issue'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={saveIssue}
                okText={editing ? 'Save changes' : 'Publish notice'}
                confirmLoading={saving}
                width={700}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="title" label="Notice title" rules={[{ required: true, message: 'Enter a title.' }]}>
                        <Input maxLength={100} placeholder="Invoice payments are delayed" />
                    </Form.Item>
                    <Form.Item name="summary" label="What users should know" rules={[{ required: true, message: 'Explain the issue and next action.' }]}>
                        <TextArea rows={4} maxLength={200} showCount placeholder="Payments may take a few minutes to confirm. Do not retry while the invoice is processing." />
                    </Form.Item>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="page" label="Affected page" style={{ flex: 1 }} rules={[{ required: true, message: 'Add the page context value.' }]}>
                            <Input maxLength={100} placeholder="billing_invoices" />
                        </Form.Item>
                        <Form.Item name="severity" label="Severity" style={{ flex: 1 }} rules={[{ required: true }]}>
                            <Select options={[
                                { value: 'info', label: 'Notice' },
                                { value: 'degraded', label: 'Degraded experience' },
                                { value: 'outage', label: 'Service issue' },
                            ]} />
                        </Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="feature" label="Feature" style={{ flex: 1 }}><Input placeholder="billing" /></Form.Item>
                        <Form.Item name="workflow" label="Workflow" style={{ flex: 1 }}><Input placeholder="invoice_payment" /></Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="plan" label="Plan" style={{ flex: 1 }}><Input placeholder="Optional" /></Form.Item>
                        <Form.Item name="userRole" label="User role" style={{ flex: 1 }}><Input placeholder="Optional" /></Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="startsAt" label="Starts" style={{ flex: 1 }}><Input type="datetime-local" /></Form.Item>
                        <Form.Item name="endsAt" label="Ends automatically" style={{ flex: 1 }}><Input type="datetime-local" /></Form.Item>
                    </Flex>
                    <Form.Item
                        name="statusPageUrl"
                        label="Status page URL"
                        rules={[{
                            validator: async (_, value) => {
                                if (!value) return;
                                try {
                                    const normalized = normalizeAnswerlatticePublicCitationUrl(value);
                                    if (!normalized || !normalized.startsWith('https:')) throw new Error('invalid');
                                } catch {
                                    throw new Error('Use a public HTTPS status page URL.');
                                }
                            },
                        }]}
                    >
                        <Input maxLength={500} placeholder="https://status.yourapp.com" />
                    </Form.Item>
                </Form>
            </Modal>
        </Flex>
    );
}
