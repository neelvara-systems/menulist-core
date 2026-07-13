'use client';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_GOVERNANCE_TABS, getAnswerlatticeGovernanceRoute } from '@constant/answerlattice/navigations';
import { getAnswerVersionHistory } from '@database/answerlattice/auditLogs';
import { getReleases } from '@database/answerlattice/releases';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES,
    ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES,
    createEmptyAnswerlatticeAnswerTestSummary,
    type AnswerlatticeAnswerTestCase,
    type AnswerlatticeAnswerTestCaseResult,
    type AnswerlatticeAnswerTestMode,
    type AnswerlatticeAnswerTestRun,
    type AnswerlatticeAnswerTestSource,
    type AnswerlatticeAnswerTestSummary,
} from '@lib/answerlattice/answerTestContracts';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type { AnswerlatticeAuditLog, AnswerlatticeRelease } from '@type/answerlattice';
import {
    Alert,
    Button,
    Card,
    Checkbox,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    List,
    Modal,
    Popconfirm,
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
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuArchiveRestore,
    LuCheck,
    LuClipboardCheck,
    LuFlaskConical,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuRocket,
    LuShieldCheck,
    LuTrash2,
    LuX,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;
const RESPONSE_MAX_BYTES = 512 * 1024;
const ACTION_BUTTON_STYLE = { minHeight: 44 };
const ICON_ACTION_BUTTON_STYLE = { width: 44, minWidth: 44, height: 44, padding: 0 };

type AnswerTestResponse = {
    summary?: AnswerlatticeAnswerTestSummary;
    run?: AnswerlatticeAnswerTestRun;
    proposalId?: string;
    error?: string;
};

type TestFormValues = {
    title: string;
    query: string;
    expectedSource: AnswerlatticeAnswerTestSource;
    expectedAnswerId?: string;
    expectedFaqId?: string;
    minimumConfidence?: 'high' | 'medium' | 'low' | 'none';
    mustInclude?: string;
    mustNotInclude?: string;
    relatedEntityIds?: string;
    contextKey?: string;
    path?: string;
    feature?: string;
    workflow?: string;
    plan?: string;
    role?: string;
    active: boolean;
};

const SOURCE_LABELS: Record<AnswerlatticeAnswerTestSource, string> = {
    canonical: 'Canonical answer',
    faq: 'Published FAQ',
    rag: 'Knowledge fallback',
    escalation: 'Ticket escalation',
    no_answer: 'No approved answer',
};

const SOURCE_COLORS: Record<AnswerlatticeAnswerTestSource, string> = {
    canonical: 'green',
    faq: 'cyan',
    rag: 'blue',
    escalation: 'orange',
    no_answer: 'default',
};

const splitLines = (value?: string, maxItems = 8) => (
    Array.from(new Set(String(value || '')
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean)))
        .slice(0, maxItems)
);

const getErrorMessage = (payload: AnswerTestResponse | null, fallback: string) => (
    typeof payload?.error === 'string' && payload.error.trim() ? payload.error : fallback
);

const readResponse = async (response: Response): Promise<AnswerTestResponse | null> => (
    readJsonResponseWithLimit<AnswerTestResponse>(response, RESPONSE_MAX_BYTES)
);

const formatDateTime = (value?: string | null) => {
    if (!value) return 'Not run';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const buildFormValues = (testCase?: AnswerlatticeAnswerTestCase | null): TestFormValues => ({
    title: testCase?.title || '',
    query: testCase?.query || '',
    expectedSource: testCase?.expected.source || 'canonical',
    expectedAnswerId: testCase?.expected.answerId || '',
    expectedFaqId: testCase?.expected.faqId || '',
    minimumConfidence: testCase?.expected.minimumConfidence,
    mustInclude: testCase?.expected.mustInclude.join('\n') || '',
    mustNotInclude: testCase?.expected.mustNotInclude.join('\n') || '',
    relatedEntityIds: testCase?.relatedEntityIds.join('\n') || '',
    contextKey: testCase?.context?.contextKey || '',
    path: testCase?.context?.path || '',
    feature: testCase?.context?.feature || '',
    workflow: testCase?.context?.workflow || '',
    plan: testCase?.context?.plan || '',
    role: testCase?.context?.userRole || testCase?.context?.role || '',
    active: testCase?.active !== false,
});

const buildContext = (values: TestFormValues) => {
    const context = {
        contextVersion: 1,
        ...(values.contextKey?.trim() ? { contextKey: values.contextKey.trim() } : {}),
        ...(values.path?.trim() ? { path: values.path.trim() } : {}),
        ...(values.feature?.trim() ? { feature: values.feature.trim() } : {}),
        ...(values.workflow?.trim() ? { workflow: values.workflow.trim() } : {}),
        ...(values.plan?.trim() ? { plan: values.plan.trim() } : {}),
        ...(values.role?.trim() ? { role: values.role.trim() } : {}),
    };
    return Object.keys(context).length > 1 ? context : undefined;
};

export default function AnswerlatticeAnswerTests() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const router = useRouter();
    const isMobile = screens.md !== true;
    const tId = Number(session?.tId || 0);
    const sId = Number(session?.sId || 0);
    const [form] = Form.useForm<TestFormValues>();
    const [summary, setSummary] = useState<AnswerlatticeAnswerTestSummary>(() => createEmptyAnswerlatticeAnswerTestSummary(0, 0));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [runningMode, setRunningMode] = useState<AnswerlatticeAnswerTestMode | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [editingCase, setEditingCase] = useState<AnswerlatticeAnswerTestCase | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [releaseModalOpen, setReleaseModalOpen] = useState(false);
    const [releases, setReleases] = useState<AnswerlatticeRelease[]>([]);
    const [selectedReleaseId, setSelectedReleaseId] = useState<string>();
    const [releaseLoading, setReleaseLoading] = useState(false);
    const [rollbackResult, setRollbackResult] = useState<AnswerlatticeAnswerTestCaseResult | null>(null);
    const [rollbackHistory, setRollbackHistory] = useState<AnswerlatticeAuditLog[]>([]);
    const [selectedAuditLogId, setSelectedAuditLogId] = useState<string>();
    const [rollbackReason, setRollbackReason] = useState('Restore the last known answer version after a failed regression test.');
    const [rollbackLoading, setRollbackLoading] = useState(false);

    const loadSummary = useCallback(async () => {
        if (!tId || !sId || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) return;
        setLoading(true);
        try {
            const response = await fetch('/api/answerlattice/answer-tests', {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readResponse(response);
            if (!response.ok || !payload?.summary) throw new Error(getErrorMessage(payload, 'Could not load answer tests.'));
            setSummary(payload.summary);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not load answer tests.');
        } finally {
            setLoading(false);
        }
    }, [sId, tId]);

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    const saveCases = useCallback(async (cases: AnswerlatticeAnswerTestCase[]) => {
        setSaving(true);
        try {
            const response = await fetch('/api/answerlattice/answer-tests', {
                method: 'PUT',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revision: summary.revision, cases }),
            });
            const payload = await readResponse(response);
            if (!response.ok || !payload?.summary) throw new Error(getErrorMessage(payload, 'Could not save answer tests.'));
            setSummary(payload.summary);
            return true;
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not save answer tests.');
            return false;
        } finally {
            setSaving(false);
        }
    }, [summary.revision]);

    const openCreate = useCallback(() => {
        setEditingCase(null);
        form.setFieldsValue(buildFormValues());
        setEditorOpen(true);
    }, [form]);

    const openEdit = useCallback((testCase: AnswerlatticeAnswerTestCase) => {
        setEditingCase(testCase);
        form.setFieldsValue(buildFormValues(testCase));
        setEditorOpen(true);
    }, [form]);

    const submitCase = useCallback(async () => {
        const values = await form.validateFields();
        const now = new Date().toISOString();
        const nextCase: AnswerlatticeAnswerTestCase = {
            id: editingCase?.id || createRuntimeId('case'),
            title: values.title.trim(),
            query: values.query.trim(),
            ...(buildContext(values) ? { context: buildContext(values) } : {}),
            expected: {
                source: values.expectedSource,
                ...(values.expectedAnswerId?.trim() ? { answerId: values.expectedAnswerId.trim() } : {}),
                ...(values.expectedFaqId?.trim() ? { faqId: values.expectedFaqId.trim() } : {}),
                ...(values.minimumConfidence ? { minimumConfidence: values.minimumConfidence } : {}),
                mustInclude: splitLines(values.mustInclude),
                mustNotInclude: splitLines(values.mustNotInclude),
            },
            relatedEntityIds: splitLines(values.relatedEntityIds, 10),
            active: values.active !== false,
            createdAt: editingCase?.createdAt || now,
            updatedAt: now,
        };
        const cases = editingCase
            ? summary.cases.map(testCase => testCase.id === editingCase.id ? nextCase : testCase)
            : [...summary.cases, nextCase];
        if (await saveCases(cases)) {
            setEditorOpen(false);
            setEditingCase(null);
            form.resetFields();
            message.success(editingCase ? 'Answer test updated.' : 'Answer test added.');
        }
    }, [editingCase, form, saveCases, summary.cases]);

    const deleteCase = useCallback(async (caseId: string) => {
        if (await saveCases(summary.cases.filter(testCase => testCase.id !== caseId))) {
            setSelectedIds(ids => ids.filter(id => id !== caseId));
            message.success('Answer test removed.');
        }
    }, [saveCases, summary.cases]);

    const executeRun = useCallback(async (
        mode: AnswerlatticeAnswerTestMode,
        options?: { releaseId?: string },
    ) => {
        const selectedCount = selectedIds.length || summary.cases.filter(testCase => testCase.active).length;
        if (!options?.releaseId && selectedCount > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            message.warning(`Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} tests for one run.`);
            return;
        }
        setRunningMode(mode);
        try {
            const endpoint = options?.releaseId
                ? '/api/answerlattice/answer-tests/release-check'
                : '/api/answerlattice/answer-tests/run';
            const body = options?.releaseId
                ? { requestId: createRuntimeId('release_check'), releaseId: options.releaseId, mode }
                : { requestId: createRuntimeId('answer_test'), caseIds: selectedIds, mode };
            const response = await fetch(endpoint, {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const payload = await readResponse(response);
            if (!response.ok || !payload?.run || !payload.summary) {
                throw new Error(getErrorMessage(payload, 'Could not complete the answer test run.'));
            }
            setSummary(payload.summary);
            setReleaseModalOpen(false);
            message[payload.run.failedCount === 0 ? 'success' : 'warning'](
                payload.run.failedCount === 0
                    ? `${payload.run.passedCount} answer tests passed.`
                    : `${payload.run.failedCount} answer tests need review.`,
            );
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not complete the answer test run.');
        } finally {
            setRunningMode(null);
        }
    }, [selectedIds, summary.cases]);

    const updateSelectedIds = useCallback((nextIds: string[]) => {
        const uniqueActiveIds = Array.from(new Set(nextIds)).filter(id => (
            summary.cases.some(testCase => testCase.id === id && testCase.active)
        ));
        if (uniqueActiveIds.length > ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES) {
            message.warning(`A run can include up to ${ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES} tests.`);
        }
        setSelectedIds(uniqueActiveIds.slice(0, ANSWERLATTICE_ANSWER_TEST_MAX_RUN_CASES));
    }, [summary.cases]);

    const runFullRuntime = useCallback(() => {
        const selectedCount = selectedIds.length || summary.cases.filter(testCase => testCase.active).length;
        if (selectedCount > ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES) {
            message.warning(`Select no more than ${ANSWERLATTICE_ANSWER_TEST_MAX_FULL_RUNTIME_CASES} tests for a full-runtime run.`);
            return;
        }
        Modal.confirm({
            title: 'Run the full support pipeline?',
            content: 'Canonical and FAQ matches remain free. Each case that reaches an AI provider uses one support credit.',
            okText: 'Run tests',
            onOk: () => executeRun('full_runtime'),
        });
    }, [executeRun, selectedIds.length, summary.cases]);

    const openReleaseCheck = useCallback(async () => {
        setReleaseModalOpen(true);
        if (releases.length > 0 || !tId || !sId) return;
        setReleaseLoading(true);
        try {
            const list = await getReleases(tId, sId);
            setReleases(list || []);
            setSelectedReleaseId(list?.[0]?.id);
        } catch {
            message.error('Could not load releases.');
        } finally {
            setReleaseLoading(false);
        }
    }, [releases.length, sId, tId]);

    const applyResultAsExpectation = useCallback(async (result: AnswerlatticeAnswerTestCaseResult) => {
        const target = summary.cases.find(testCase => testCase.id === result.caseId);
        if (!target) return;
        const next: AnswerlatticeAnswerTestCase = {
            ...target,
            expected: {
                source: result.source,
                ...(target.expected.minimumConfidence ? { minimumConfidence: target.expected.minimumConfidence } : {}),
                mustInclude: target.expected.mustInclude,
                mustNotInclude: target.expected.mustNotInclude,
                ...(result.answerId ? { answerId: result.answerId } : {}),
                ...(result.faqId ? { faqId: result.faqId } : {}),
            },
            relatedEntityIds: result.relatedEntityIds.length > 0 ? result.relatedEntityIds : target.relatedEntityIds,
            updatedAt: new Date().toISOString(),
        };
        if (await saveCases(summary.cases.map(testCase => testCase.id === target.id ? next : testCase))) {
            message.success('Current result saved as the expected behavior.');
        }
    }, [saveCases, summary.cases]);

    const openRollback = useCallback(async (result: AnswerlatticeAnswerTestCaseResult) => {
        if (!result.answerId || !tId || !sId) return;
        setRollbackResult(result);
        setRollbackHistory([]);
        setSelectedAuditLogId(undefined);
        setRollbackLoading(true);
        try {
            const history = await getAnswerVersionHistory(tId, sId, result.answerId);
            const restorable = (history || []).filter(log => Boolean(log.previousState?.answerSnapshot));
            setRollbackHistory(restorable);
            setSelectedAuditLogId(restorable[0]?.id);
        } catch {
            message.error('Could not load answer history.');
        } finally {
            setRollbackLoading(false);
        }
    }, [sId, tId]);

    const createRollbackProposal = useCallback(async () => {
        if (!rollbackResult?.answerId || !selectedAuditLogId) return;
        setRollbackLoading(true);
        try {
            const response = await fetch('/api/answerlattice/answer-tests/rollback', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answerId: rollbackResult.answerId,
                    auditLogId: selectedAuditLogId,
                    reason: rollbackReason,
                }),
            });
            const payload = await readResponse(response);
            if (!response.ok || !payload?.proposalId) throw new Error(getErrorMessage(payload, 'Could not create rollback proposal.'));
            setRollbackResult(null);
            message.success('Rollback proposal added to the governance review queue.');
            router.push(getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE));
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not create rollback proposal.');
        } finally {
            setRollbackLoading(false);
        }
    }, [rollbackReason, rollbackResult, router, selectedAuditLogId]);

    const activeCount = summary.cases.filter(testCase => testCase.active).length;
    const latestRun = summary.runs[0];
    const selectedActiveCount = selectedIds.filter(id => summary.cases.some(testCase => testCase.id === id && testCase.active)).length;

    const columns = useMemo<ColumnsType<AnswerlatticeAnswerTestCase>>(() => [
        {
            title: 'Test',
            key: 'test',
            render: (_, testCase) => (
                <Flex vertical gap={2}>
                    <Text strong>{testCase.title}</Text>
                    <Text type="secondary" ellipsis={{ tooltip: testCase.query }}>{testCase.query}</Text>
                </Flex>
            ),
        },
        {
            title: 'Expected',
            key: 'expected',
            width: 180,
            render: (_, testCase) => <Tag color={SOURCE_COLORS[testCase.expected.source]}>{SOURCE_LABELS[testCase.expected.source]}</Tag>,
        },
        {
            title: 'Context',
            key: 'context',
            width: 170,
            render: (_, testCase) => (
                <Space size={[4, 4]} wrap>
                    {testCase.context?.page && <Tag>{testCase.context.page}</Tag>}
                    {testCase.context?.feature && <Tag>{testCase.context.feature}</Tag>}
                    {testCase.relatedEntityIds.length > 0 && <Tag>{testCase.relatedEntityIds.length} entities</Tag>}
                    {!testCase.context && testCase.relatedEntityIds.length === 0 && <Text type="secondary">Any page</Text>}
                </Space>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 100,
            render: (_, testCase) => <Tag color={testCase.active ? 'green' : 'default'}>{testCase.active ? 'Active' : 'Paused'}</Tag>,
        },
        {
            title: '',
            key: 'actions',
            width: 96,
            render: (_, testCase) => (
                <Space size={2}>
                    <Button type="text" icon={<LuPencil />} aria-label={`Edit ${testCase.title}`} onClick={() => openEdit(testCase)} style={ICON_ACTION_BUTTON_STYLE} />
                    <Popconfirm
                        title="Remove this answer test?"
                        onConfirm={() => deleteCase(testCase.id)}
                        okButtonProps={{ danger: true, style: ACTION_BUTTON_STYLE }}
                        cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                    >
                        <Button type="text" danger icon={<LuTrash2 />} aria-label={`Remove ${testCase.title}`} style={ICON_ACTION_BUTTON_STYLE} />
                    </Popconfirm>
                </Space>
            ),
        },
    ], [deleteCase, openEdit]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS) return null;

    return (
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1240, margin: '0 auto', padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} gap={12} vertical={isMobile}>
                <div>
                    <Space align="center">
                        <LuClipboardCheck size={22} color={token.colorPrimary} />
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Answer Tests</Title>
                    </Space>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 760 }}>
                        Lock important support behavior before releases. Tests use the same canonical-first retrieval path without creating customer search history or support signals.
                    </Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} onClick={loadSummary} loading={loading} style={ACTION_BUTTON_STYLE}>Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={openCreate} style={ACTION_BUTTON_STYLE}>Add test</Button>
                </Space>
            </Flex>

            <Alert
                type="info"
                showIcon
                message="Deterministic checks are free"
                description="Canonical-only runs verify approved answers and FAQs. Full-runtime runs continue into knowledge fallback and use one support credit only when an AI provider is reached."
            />

            <Flex gap={12} wrap="wrap">
                <Card size="small" style={{ flex: '1 1 180px' }}><Statistic title="Active tests" value={activeCount} /></Card>
                <Card size="small" style={{ flex: '1 1 180px' }}><Statistic title="Latest pass rate" value={latestRun?.caseCount ? Math.round((latestRun.passedCount / latestRun.caseCount) * 100) : 0} suffix="%" /></Card>
                <Card size="small" style={{ flex: '1 1 180px' }}><Statistic title="Needs review" value={latestRun?.failedCount || 0} valueStyle={{ color: latestRun?.failedCount ? token.colorWarning : token.colorSuccess }} /></Card>
                <Card size="small" style={{ flex: '1 1 220px' }}><Statistic title="Last run" value={formatDateTime(latestRun?.completedAt)} valueStyle={{ fontSize: 16 }} /></Card>
            </Flex>

            <Card
                title="Regression cases"
                extra={<Text type="secondary">{selectedActiveCount || activeCount} selected for the next run</Text>}
            >
                <Flex gap={8} wrap="wrap" style={{ marginBottom: 16 }}>
                    <Button
                        icon={<LuShieldCheck />}
                        onClick={() => executeRun('canonical_only')}
                        loading={runningMode === 'canonical_only'}
                        disabled={activeCount === 0}
                        style={ACTION_BUTTON_STYLE}
                    >
                        Run canonical checks
                    </Button>
                    <Button
                        icon={<LuFlaskConical />}
                        onClick={runFullRuntime}
                        loading={runningMode === 'full_runtime'}
                        disabled={activeCount === 0}
                        style={ACTION_BUTTON_STYLE}
                    >
                        Run full runtime
                    </Button>
                    <Button icon={<LuRocket />} onClick={openReleaseCheck} disabled={activeCount === 0} style={ACTION_BUTTON_STYLE}>Check a release</Button>
                </Flex>

                {isMobile ? (
                    <List
                        loading={loading}
                        dataSource={summary.cases}
                        locale={{ emptyText: <Empty description="Add the questions that must keep working after every release." /> }}
                        renderItem={testCase => (
                            <List.Item>
                                <Flex vertical gap={10} style={{ width: '100%' }}>
                                    <Flex justify="space-between" align="start" gap={8}>
                                        <Checkbox
                                            checked={selectedIds.includes(testCase.id)}
                                            disabled={!testCase.active}
                                            onChange={event => updateSelectedIds(
                                                event.target.checked
                                                    ? [...selectedIds, testCase.id]
                                                    : selectedIds.filter(id => id !== testCase.id),
                                            )}
                                        >
                                            <Text strong>{testCase.title}</Text>
                                        </Checkbox>
                                        <Tag color={testCase.active ? 'green' : 'default'}>{testCase.active ? 'Active' : 'Paused'}</Tag>
                                    </Flex>
                                    <Text type="secondary">{testCase.query}</Text>
                                    <Space wrap>
                                        <Tag color={SOURCE_COLORS[testCase.expected.source]}>{SOURCE_LABELS[testCase.expected.source]}</Tag>
                                        {testCase.relatedEntityIds.length > 0 && <Tag>{testCase.relatedEntityIds.length} entities</Tag>}
                                    </Space>
                                    <Flex gap={8}>
                                        <Button icon={<LuPencil />} onClick={() => openEdit(testCase)} block style={ACTION_BUTTON_STYLE}>Edit</Button>
                                        <Popconfirm
                                            title="Remove this answer test?"
                                            onConfirm={() => deleteCase(testCase.id)}
                                            okButtonProps={{ danger: true, style: ACTION_BUTTON_STYLE }}
                                            cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                                        >
                                            <Button danger icon={<LuTrash2 />} block style={ACTION_BUTTON_STYLE}>Remove</Button>
                                        </Popconfirm>
                                    </Flex>
                                </Flex>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Table
                        rowKey="id"
                        loading={loading}
                        dataSource={summary.cases}
                        columns={columns}
                        pagination={false}
                        rowSelection={{
                            selectedRowKeys: selectedIds,
                            onChange: keys => updateSelectedIds(keys.map(String)),
                            getCheckboxProps: testCase => ({ disabled: !testCase.active }),
                        }}
                        locale={{ emptyText: <Empty description="Add the questions that must keep working after every release." /> }}
                        scroll={{ x: 850 }}
                    />
                )}
            </Card>

            <Card title="Latest result">
                {!latestRun ? (
                    <Empty description="Run the active tests to create the first result." />
                ) : (
                    <Flex vertical gap={16}>
                        <Flex gap={8} wrap="wrap">
                            <Tag color={latestRun.status === 'passed' ? 'green' : latestRun.status === 'failed' ? 'red' : 'orange'}>
                                {latestRun.status === 'passed' ? 'Passed' : latestRun.status === 'failed' ? 'Failed' : 'Needs review'}
                            </Tag>
                            <Tag>{latestRun.mode === 'full_runtime' ? 'Full runtime' : 'Canonical only'}</Tag>
                            {latestRun.releaseVersion && <Tag color="purple">Release {latestRun.releaseVersion}</Tag>}
                            <Text type="secondary">{latestRun.passedCount}/{latestRun.caseCount} passed · {latestRun.providerCaseCount} provider-backed</Text>
                        </Flex>
                        <List
                            dataSource={latestRun.results}
                            renderItem={result => (
                                <List.Item>
                                    <Flex vertical gap={8} style={{ width: '100%' }}>
                                        <Flex justify="space-between" align="start" gap={8} wrap="wrap">
                                            <Space>
                                                {result.passed ? <LuCheck color={token.colorSuccess} /> : <LuX color={token.colorError} />}
                                                <Text strong>{result.title}</Text>
                                            </Space>
                                            <Space wrap>
                                                <Tag color={SOURCE_COLORS[result.source]}>{SOURCE_LABELS[result.source]}</Tag>
                                                <Text type="secondary">{result.durationMs} ms</Text>
                                            </Space>
                                        </Flex>
                                        {result.answerPreview && <Text>{result.answerPreview}</Text>}
                                        {result.failures.map(failure => <Text key={failure} type="danger">{failure}</Text>)}
                                        <Space wrap>
                                            {!result.passed && (
                                                <Popconfirm
                                                    title="Replace the expected result?"
                                                    description="Use this only after confirming the current answer is correct. It changes the regression test, not the live answer."
                                                    onConfirm={() => applyResultAsExpectation(result)}
                                                    okText="Replace expectation"
                                                >
                                                    <Button style={ACTION_BUTTON_STYLE}>
                                                        Use current result as expected
                                                    </Button>
                                                </Popconfirm>
                                            )}
                                            {!result.passed && result.answerId && (
                                                <Button icon={<LuArchiveRestore />} onClick={() => openRollback(result)} style={ACTION_BUTTON_STYLE}>
                                                    Prepare rollback proposal
                                                </Button>
                                            )}
                                        </Space>
                                    </Flex>
                                </List.Item>
                            )}
                        />
                    </Flex>
                )}
            </Card>

            <Modal
                title={editingCase ? 'Edit answer test' : 'Add answer test'}
                open={editorOpen}
                onCancel={() => setEditorOpen(false)}
                onOk={submitCase}
                okText={editingCase ? 'Save changes' : 'Add test'}
                confirmLoading={saving}
                okButtonProps={{ style: ACTION_BUTTON_STYLE }}
                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
                width={720}
                destroyOnClose
            >
                <Form form={form} layout="vertical" initialValues={buildFormValues()}>
                    <Form.Item name="title" label="Test name" rules={[{ required: true, message: 'Enter a short test name.' }]}>
                        <Input maxLength={120} placeholder="Failed invoice explanation" />
                    </Form.Item>
                    <Form.Item name="query" label="User question" rules={[{ required: true, min: 2, message: 'Enter the question users ask.' }]}>
                        <TextArea rows={3} maxLength={500} placeholder="Why did my invoice fail?" />
                    </Form.Item>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="expectedSource" label="Expected route" style={{ flex: 1 }} rules={[{ required: true }]}>
                            <Select options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))} />
                        </Form.Item>
                        <Form.Item name="minimumConfidence" label="Minimum confidence" style={{ flex: 1 }}>
                            <Select allowClear options={['high', 'medium', 'low', 'none'].map(value => ({ value, label: value }))} />
                        </Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="expectedAnswerId" label="Expected canonical answer ID" style={{ flex: 1 }}>
                            <Input maxLength={160} placeholder="Optional" />
                        </Form.Item>
                        <Form.Item name="expectedFaqId" label="Expected FAQ ID" style={{ flex: 1 }}>
                            <Input maxLength={160} placeholder="Optional" />
                        </Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="mustInclude" label="Required phrases" style={{ flex: 1 }}>
                            <TextArea rows={3} placeholder="One phrase per line" />
                        </Form.Item>
                        <Form.Item name="mustNotInclude" label="Blocked phrases" style={{ flex: 1 }}>
                            <TextArea rows={3} placeholder="One phrase per line" />
                        </Form.Item>
                    </Flex>
                    <Title level={5}>Page context</Title>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="path" label="Route" style={{ flex: 1 }}><Input placeholder="/billing/invoices" /></Form.Item>
                        <Form.Item name="contextKey" label="Context key" style={{ flex: 1 }}><Input placeholder="billing_invoices" /></Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="feature" label="Feature" style={{ flex: 1 }}><Input placeholder="billing" /></Form.Item>
                        <Form.Item name="workflow" label="Workflow" style={{ flex: 1 }}><Input placeholder="invoice_payment" /></Form.Item>
                    </Flex>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item name="plan" label="Plan" style={{ flex: 1 }}><Input placeholder="growth" /></Form.Item>
                        <Form.Item name="role" label="User role" style={{ flex: 1 }}><Input placeholder="workspace_owner" /></Form.Item>
                    </Flex>
                    <Form.Item name="relatedEntityIds" label="Related entity IDs" extra="Add one per line so release checks can run only affected tests.">
                        <TextArea rows={3} placeholder="billing_invoices" />
                    </Form.Item>
                    <Form.Item name="active" valuePropName="checked"><Checkbox>Include in test runs</Checkbox></Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Check release safety"
                open={releaseModalOpen}
                onCancel={() => setReleaseModalOpen(false)}
                onOk={() => selectedReleaseId && executeRun('canonical_only', { releaseId: selectedReleaseId })}
                okText="Run affected tests"
                confirmLoading={releaseLoading || runningMode === 'canonical_only'}
                okButtonProps={{ disabled: !selectedReleaseId, style: ACTION_BUTTON_STYLE }}
                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
            >
                <Paragraph type="secondary">
                    Answerlattice runs only tests linked to entities changed by the selected release. No product state is changed.
                </Paragraph>
                <Select
                    loading={releaseLoading}
                    value={selectedReleaseId}
                    onChange={setSelectedReleaseId}
                    style={{ width: '100%' }}
                    placeholder="Select a release"
                    options={releases.map(release => ({
                        value: release.id,
                        label: `${release.versionLabel} · ${release.entityChanges?.length || 0} changed entities`,
                    }))}
                />
            </Modal>

            <Modal
                title="Prepare rollback proposal"
                open={Boolean(rollbackResult)}
                onCancel={() => setRollbackResult(null)}
                onOk={createRollbackProposal}
                okText="Create review proposal"
                confirmLoading={rollbackLoading}
                okButtonProps={{ disabled: !selectedAuditLogId || rollbackReason.trim().length < 8, style: ACTION_BUTTON_STYLE }}
                cancelButtonProps={{ style: ACTION_BUTTON_STYLE }}
            >
                <Alert
                    type="warning"
                    showIcon
                    message="This does not change the live answer"
                    description="The selected prior version is copied into a version-update proposal. A governance reviewer must approve and implement it."
                    style={{ marginBottom: 16 }}
                />
                <Flex vertical gap={14}>
                    <Select
                        loading={rollbackLoading}
                        value={selectedAuditLogId}
                        onChange={setSelectedAuditLogId}
                        placeholder="Select a prior version"
                        options={rollbackHistory.map(log => ({
                            value: log.id,
                            label: `${formatDateTime(log.timestamp?.toDate?.()?.toISOString?.())} · ${log.performedBy || 'team member'}`,
                        }))}
                    />
                    {rollbackHistory.length === 0 && !rollbackLoading && (
                        <Alert type="info" message="No restorable version is available yet. New answer edits will retain a rollback snapshot." />
                    )}
                    <TextArea
                        value={rollbackReason}
                        onChange={event => setRollbackReason(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Why should this prior answer be restored?"
                    />
                </Flex>
            </Modal>
        </Flex>
    );
}
