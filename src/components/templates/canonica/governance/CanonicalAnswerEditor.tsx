'use client'

/**
 * Canonica — Canonical Answer Editor
 * 
 * Full CRUD UI for canonical answers with entity binding, version management,
 * content editing, and governance status display.
 * 
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (Pillar 2)
 */

import { FEATURE_FLAGS } from '@config/features';
import { useCanonicalAnswers } from '@hook/canonica/useCanonicalAnswers';
import { useEntities } from '@hook/canonica/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    CANONICA_ANSWER_STATUS,
    CANONICA_PREREQUISITE_TYPE,
    CANONICA_PROCEDURE_ACTIONS,
    CANONICA_PROCEDURE_CONSTRAINTS,
    CANONICA_VALIDATION_SOURCE,
    CANONICA_WARNING_SEVERITY,
    CanonicaAnswerType,
    CanonicaCanonicalAnswer,
    CanonicaProcedure,
    CanonicaProcedureStep,
    denormalizeVersion,
    normalizeVersion
} from '@type/canonica';
import {
    Badge,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Steps,
    Table,
    Tag,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useMemo, useState } from 'react';
import {
    LuAlertTriangle,
    LuCheck,
    LuEye,
    LuListOrdered,
    LuMinus,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuShieldAlert,
} from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
    active: 'green',
    needs_review: 'orange',
    deprecated: 'red',
    archived: 'default',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    needs_review: 'Needs Review',
    deprecated: 'Deprecated',
    archived: 'Archived',
};

const ANSWER_TYPE_LABELS: Record<string, string> = {
    explanation: 'Explanation',
    navigation: 'Navigation',
    procedure: 'Procedure',
};

const ANSWER_TYPE_COLORS: Record<string, string> = {
    explanation: 'blue',
    navigation: 'cyan',
    procedure: 'purple',
};

const ACTION_OPTIONS = Object.values(CANONICA_PROCEDURE_ACTIONS).map(a => ({ label: a, value: a }));
const SEVERITY_OPTIONS = Object.values(CANONICA_WARNING_SEVERITY).map(s => ({ label: s, value: s }));
const PREREQ_TYPE_OPTIONS = Object.values(CANONICA_PREREQUISITE_TYPE).map(t => ({ label: t, value: t }));

const DEFAULT_STEP: CanonicaProcedureStep = { stepOrder: 1, action: 'click', instruction: '' };

export default function CanonicalAnswerEditor() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const {
        answers, driftedAnswers, loading, refresh,
        selectedAnswer, setSelectedAnswer,
        create, update,
    } = useCanonicalAnswers(tId, sId);

    const { entities } = useEntities(tId, sId);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();
    const [editAnswerType, setEditAnswerType] = useState<CanonicaAnswerType>('explanation');
    const [createAnswerType, setCreateAnswerType] = useState<CanonicaAnswerType>('explanation');
    const [editSteps, setEditSteps] = useState<CanonicaProcedureStep[]>([]);
    const [createSteps, setCreateSteps] = useState<CanonicaProcedureStep[]>([{ ...DEFAULT_STEP }]);

    const entityOptions = useMemo(() =>
        (entities || []).map(e => ({ label: `${e.name} (${e.type})`, value: e.id })),
        [entities]
    );

    const entityMap = useMemo(() => {
        const map = new Map<string, string>();
        (entities || []).forEach(e => map.set(e.id, e.name));
        return map;
    }, [entities]);

    const openDetail = useCallback((answer: CanonicaCanonicalAnswer) => {
        setSelectedAnswer(answer);
        setDrawerOpen(true);
        setEditMode(false);
        const at = answer.answerType || 'explanation';
        setEditAnswerType(at as CanonicaAnswerType);
        setEditSteps(answer.content.procedure?.steps || [{ ...DEFAULT_STEP }]);
        form.setFieldsValue({
            title: answer.title,
            status: answer.status,
            answerType: at,
            structuredSummary: answer.content.structuredSummary,
            detailedExplanation: answer.content.detailedExplanation,
            edgeCases: answer.content.edgeCases || '',
            constraints: answer.content.constraints || '',
            entityIds: answer.scope.entityIds,
            versionFrom: denormalizeVersion(answer.productBinding.applicableVersions.from),
        });
    }, [form, setSelectedAnswer]);

    const handleSave = useCallback(async () => {
        if (!selectedAnswer) return;
        try {
            const values = await form.validateFields();
            const procedure: CanonicaProcedure | undefined =
                editAnswerType === 'procedure' && editSteps.length > 0
                    ? { steps: editSteps }
                    : undefined;
            await update({
                id: selectedAnswer.id,
                title: values.title,
                status: values.status,
                answerType: editAnswerType,
                content: {
                    structuredSummary: values.structuredSummary,
                    detailedExplanation: values.detailedExplanation,
                    edgeCases: values.edgeCases || undefined,
                    constraints: values.constraints || undefined,
                    procedure,
                },
                scope: {
                    ...selectedAnswer.scope,
                    entityIds: values.entityIds,
                },
            });
            setEditMode(false);
            setDrawerOpen(false);
        } catch {
            // form validation failed
        }
    }, [selectedAnswer, form, update, editAnswerType, editSteps]);

    const handleCreate = useCallback(async () => {
        try {
            const values = await createForm.validateFields();
            const versionNorm = normalizeVersion(values.versionFrom || '1.0.0');
            const procedure: CanonicaProcedure | undefined =
                createAnswerType === 'procedure' && createSteps.length > 0
                    ? { steps: createSteps }
                    : undefined;
            await create({
                tId, sId,
                title: values.title,
                slug: values.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
                status: CANONICA_ANSWER_STATUS.ACTIVE,
                answerType: createAnswerType,
                scope: {
                    entityIds: values.entityIds,
                },
                productBinding: {
                    introducedInVersion: versionNorm,
                    lastValidatedInVersion: versionNorm,
                    applicableVersions: { from: versionNorm, to: null },
                },
                content: {
                    structuredSummary: values.structuredSummary,
                    detailedExplanation: values.detailedExplanation,
                    edgeCases: values.edgeCases || undefined,
                    constraints: values.constraints || undefined,
                    procedure,
                },
                validation: {
                    confidenceScore: 1.0,
                    validationSource: CANONICA_VALIDATION_SOURCE.MANUAL,
                    lastValidatedOn: Timestamp.now(),
                    validatedBy: 'admin',
                },
                signalMetrics: {
                    linkedTicketCount: 0,
                    linkedChatCount: 0,
                    negativeFeedbackCount: 0,
                },
                governance: {
                    driftFlag: false,
                    reviewRequired: false,
                },
            });
            setCreateModalOpen(false);
            createForm.resetFields();
            setCreateAnswerType('explanation');
            setCreateSteps([{ ...DEFAULT_STEP }]);
        } catch {
            // form validation
        }
    }, [tId, sId, createForm, create, createAnswerType, createSteps]);

    // Step editor helpers
    const updateStep = useCallback((steps: CanonicaProcedureStep[], setSteps: (s: CanonicaProcedureStep[]) => void, index: number, field: keyof CanonicaProcedureStep, value: any) => {
        const updated = [...steps];
        (updated[index] as any)[field] = value;
        setSteps(updated);
    }, []);

    const addStep = useCallback((steps: CanonicaProcedureStep[], setSteps: (s: CanonicaProcedureStep[]) => void) => {
        if (steps.length >= CANONICA_PROCEDURE_CONSTRAINTS.MAX_STEPS) return;
        setSteps([...steps, { stepOrder: steps.length + 1, action: 'click', instruction: '' }]);
    }, []);

    const removeStep = useCallback((steps: CanonicaProcedureStep[], setSteps: (s: CanonicaProcedureStep[]) => void, index: number) => {
        if (steps.length <= 1) return;
        const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
        setSteps(updated);
    }, []);

    const renderStepEditor = useCallback((steps: CanonicaProcedureStep[], setSteps: (s: CanonicaProcedureStep[]) => void) => (
        <Card size="small" title={<Space><LuListOrdered /> Procedure Steps ({steps.length}/{CANONICA_PROCEDURE_CONSTRAINTS.MAX_STEPS})</Space>}>
            <Flex vertical gap={8}>
                {steps.map((step, idx) => (
                    <Flex key={idx} gap={8} align="start">
                        <InputNumber
                            value={step.stepOrder}
                            disabled
                            style={{ width: 50 }}
                            size="small"
                        />
                        <Select
                            value={step.action}
                            onChange={(v) => updateStep(steps, setSteps, idx, 'action', v)}
                            options={ACTION_OPTIONS}
                            style={{ width: 120 }}
                            size="small"
                        />
                        <Input
                            value={step.instruction}
                            onChange={(e) => updateStep(steps, setSteps, idx, 'instruction', e.target.value)}
                            placeholder="Instruction (e.g., Click Team Members)"
                            maxLength={CANONICA_PROCEDURE_CONSTRAINTS.MAX_INSTRUCTION_LENGTH}
                            size="small"
                            style={{ flex: 1 }}
                        />
                        <Button
                            type="text"
                            icon={<LuMinus />}
                            onClick={() => removeStep(steps, setSteps, idx)}
                            disabled={steps.length <= 1}
                            size="small"
                            danger
                        />
                    </Flex>
                ))}
                <Button
                    type="dashed"
                    icon={<LuPlus />}
                    onClick={() => addStep(steps, setSteps)}
                    disabled={steps.length >= CANONICA_PROCEDURE_CONSTRAINTS.MAX_STEPS}
                    size="small"
                    block
                >
                    Add Step
                </Button>
            </Flex>
        </Card>
    ), [updateStep, addStep, removeStep]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI) return null;

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (title: string, record: CanonicaCanonicalAnswer) => (
                <Space>
                    <Text strong style={{ cursor: 'pointer' }} onClick={() => openDetail(record)}>
                        {title}
                    </Text>
                    {record.governance.driftFlag && (
                        <Tooltip title={record.governance.driftReason || 'Drifted'}>
                            <LuAlertTriangle style={{ color: token.colorWarning }} />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: 'Type',
            key: 'answerType',
            width: 100,
            render: (_: any, record: CanonicaCanonicalAnswer) => {
                const at = record.answerType || 'explanation';
                return <Tag color={ANSWER_TYPE_COLORS[at] || 'default'}>{ANSWER_TYPE_LABELS[at] || at}</Tag>;
            },
            filters: Object.entries(ANSWER_TYPE_LABELS).map(([value, text]) => ({ text, value })),
            onFilter: (value: any, record: CanonicaCanonicalAnswer) => (record.answerType || 'explanation') === value,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={STATUS_COLORS[status] || 'default'}>
                    {STATUS_LABELS[status] || status}
                </Tag>
            ),
            filters: Object.entries(STATUS_LABELS).map(([value, text]) => ({ text, value })),
            onFilter: (value: any, record: CanonicaCanonicalAnswer) => record.status === value,
        },
        {
            title: 'Entities',
            key: 'entities',
            width: 200,
            render: (_: any, record: CanonicaCanonicalAnswer) => (
                <Space size={[0, 4]} wrap>
                    {record.scope.entityIds.slice(0, 3).map(id => (
                        <Tag key={id} color="blue">{entityMap.get(id) || id.slice(0, 8)}</Tag>
                    ))}
                    {record.scope.entityIds.length > 3 && (
                        <Tag>+{record.scope.entityIds.length - 3}</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Confidence',
            key: 'confidence',
            width: 100,
            render: (_: any, record: CanonicaCanonicalAnswer) => {
                const score = Math.round((record.validation?.confidenceScore || 0) * 100);
                const color = score >= 80 ? token.colorSuccess : score >= 50 ? token.colorWarning : token.colorError;
                return <Text style={{ color }}>{score}%</Text>;
            },
            sorter: (a: CanonicaCanonicalAnswer, b: CanonicaCanonicalAnswer) =>
                (a.validation?.confidenceScore || 0) - (b.validation?.confidenceScore || 0),
        },
        {
            title: 'Signals',
            key: 'signals',
            width: 100,
            render: (_: any, record: CanonicaCanonicalAnswer) => {
                const total = (record.signalMetrics?.linkedTicketCount || 0) +
                    (record.signalMetrics?.linkedChatCount || 0);
                return <Text type="secondary">{total}</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: any, record: CanonicaCanonicalAnswer) => (
                <Space>
                    <Button type="text" icon={<LuEye />} onClick={() => openDetail(record)} size="small" />
                    <Button
                        type="text"
                        icon={<LuPencil />}
                        onClick={() => { openDetail(record); setEditMode(true); }}
                        size="small"
                    />
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card>
                <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Space>
                        <Title level={5} style={{ margin: 0 }}>Canonical Answers</Title>
                        <Badge count={answers.length} style={{ backgroundColor: token.colorPrimary }} />
                        {driftedAnswers.length > 0 && (
                            <Badge count={`${driftedAnswers.length} drifted`} style={{ backgroundColor: token.colorWarning }} />
                        )}
                    </Space>
                    <Space>
                        <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading} type="text">
                            Refresh
                        </Button>
                        <Button type="primary" icon={<LuPlus />} onClick={() => setCreateModalOpen(true)}>
                            New Answer
                        </Button>
                    </Space>
                </Flex>

                <Table
                    dataSource={answers}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No canonical answers yet" /> }}
                />
            </Card>

            {/* Detail/Edit Drawer */}
            <Drawer
                title={editMode ? 'Edit Canonical Answer' : 'Canonical Answer Detail'}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setEditMode(false); }}
                width={isMobile ? '100%' : 640}
                extra={
                    editMode ? (
                        <Space>
                            <Button onClick={() => setEditMode(false)}>Cancel</Button>
                            <Button type="primary" icon={<LuCheck />} onClick={handleSave}>Save</Button>
                        </Space>
                    ) : (
                        <Button icon={<LuPencil />} onClick={() => setEditMode(true)}>Edit</Button>
                    )
                }
            >
                {selectedAnswer && !editMode && (
                    <Flex vertical gap={16}>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Title">{selectedAnswer.title}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={STATUS_COLORS[selectedAnswer.status]}>{STATUS_LABELS[selectedAnswer.status]}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Governance">
                                {selectedAnswer.governance.driftFlag ? (
                                    <Space><LuShieldAlert style={{ color: token.colorWarning }} /><Text type="warning">Drifted</Text></Space>
                                ) : (
                                    <Space><LuCheck style={{ color: token.colorSuccess }} /><Text type="success">Clean</Text></Space>
                                )}
                            </Descriptions.Item>
                            {selectedAnswer.governance.driftReason && (
                                <Descriptions.Item label="Drift Reason">
                                    <Text type="secondary" style={{ fontSize: 12 }}>{selectedAnswer.governance.driftReason}</Text>
                                </Descriptions.Item>
                            )}
                            <Descriptions.Item label="Entities">
                                <Space wrap>
                                    {selectedAnswer.scope.entityIds.map(id => (
                                        <Tag key={id} color="blue">{entityMap.get(id) || id}</Tag>
                                    ))}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Version">
                                {denormalizeVersion(selectedAnswer.productBinding.applicableVersions.from)}
                                {' → '}
                                {selectedAnswer.productBinding.applicableVersions.to
                                    ? denormalizeVersion(selectedAnswer.productBinding.applicableVersions.to)
                                    : 'current'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Confidence">
                                {Math.round((selectedAnswer.validation?.confidenceScore || 0) * 100)}%
                            </Descriptions.Item>
                            <Descriptions.Item label="Signals">
                                Tickets: {selectedAnswer.signalMetrics?.linkedTicketCount || 0} |
                                Chat: {selectedAnswer.signalMetrics?.linkedChatCount || 0} |
                                Negative: {selectedAnswer.signalMetrics?.negativeFeedbackCount || 0}
                            </Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Structured Summary">
                            <Paragraph>{selectedAnswer.content.structuredSummary}</Paragraph>
                        </Card>
                        <Card size="small" title="Detailed Explanation">
                            <Paragraph>{selectedAnswer.content.detailedExplanation}</Paragraph>
                        </Card>
                        {selectedAnswer.content.edgeCases && (
                            <Card size="small" title="Edge Cases">
                                <Paragraph>{selectedAnswer.content.edgeCases}</Paragraph>
                            </Card>
                        )}
                        {selectedAnswer.content.constraints && (
                            <Card size="small" title="Constraints">
                                <Paragraph>{selectedAnswer.content.constraints}</Paragraph>
                            </Card>
                        )}
                        {selectedAnswer.answerType === 'procedure' && selectedAnswer.content.procedure && (
                            <>
                                <Divider orientation="left" style={{ margin: '8px 0' }}>Procedure</Divider>
                                <Card size="small" title="Steps">
                                    <Steps direction="vertical" size="small" current={-1} items={
                                        selectedAnswer.content.procedure.steps.map(step => ({
                                            title: <Text><Tag color="purple">{step.action}</Tag> {step.instruction}</Text>,
                                            description: step.expectedResult ? <Text type="secondary">{step.expectedResult}</Text> : undefined,
                                        }))
                                    } />
                                </Card>
                                {selectedAnswer.content.procedure.warnings && selectedAnswer.content.procedure.warnings.length > 0 && (
                                    <Card size="small" title="Warnings">
                                        {selectedAnswer.content.procedure.warnings.map((w, i) => (
                                            <Tag key={i} color={w.severity === 'destructive' ? 'red' : w.severity === 'warning' ? 'orange' : 'blue'}>
                                                {w.severity}: {w.message}
                                            </Tag>
                                        ))}
                                    </Card>
                                )}
                                {selectedAnswer.content.procedure.prerequisites && selectedAnswer.content.procedure.prerequisites.length > 0 && (
                                    <Card size="small" title="Prerequisites">
                                        {selectedAnswer.content.procedure.prerequisites.map((p, i) => (
                                            <Tag key={i} color="geekblue">{p.type}: {p.description}</Tag>
                                        ))}
                                    </Card>
                                )}
                            </>
                        )}
                    </Flex>
                )}

                {selectedAnswer && editMode && (
                    <Form form={form} layout="vertical">
                        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v }))} />
                        </Form.Item>
                        {FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && (
                            <Form.Item name="answerType" label="Answer Type">
                                <Select
                                    value={editAnswerType}
                                    onChange={(v) => setEditAnswerType(v as CanonicaAnswerType)}
                                    options={Object.entries(ANSWER_TYPE_LABELS).map(([v, l]) => ({ label: l, value: v }))}
                                />
                            </Form.Item>
                        )}
                        <Form.Item name="entityIds" label="Bound Entities" rules={[{ required: true, type: 'array', min: 1, message: 'At least one entity required' }]}>
                            <Select mode="multiple" options={entityOptions} placeholder="Select entities" />
                        </Form.Item>
                        <Form.Item name="structuredSummary" label="Structured Summary (≤500 chars)" rules={[{ required: true, max: 500 }]}>
                            <TextArea rows={3} maxLength={500} showCount />
                        </Form.Item>
                        <Form.Item name="detailedExplanation" label="Detailed Explanation" rules={[{ required: true }]}>
                            <TextArea rows={5} />
                        </Form.Item>
                        <Form.Item name="edgeCases" label="Edge Cases (optional)">
                            <TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name="constraints" label="Constraints (optional)">
                            <TextArea rows={2} />
                        </Form.Item>
                        {FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && editAnswerType === 'procedure' && (
                            renderStepEditor(editSteps, setEditSteps)
                        )}
                    </Form>
                )}
            </Drawer>

            {/* Create Modal */}
            <Modal
                title="Create Canonical Answer"
                open={createModalOpen}
                onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
                onOk={handleCreate}
                okText="Create"
                width={isMobile ? 'calc(100vw - 24px)' : 600}
            >
                <Form form={createForm} layout="vertical">
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                        <Input placeholder="e.g., How to configure SSO integration" />
                    </Form.Item>
                    {FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && (
                        <Form.Item name="answerType" label="Answer Type" initialValue="explanation">
                            <Select
                                value={createAnswerType}
                                onChange={(v) => setCreateAnswerType(v as CanonicaAnswerType)}
                                options={Object.entries(ANSWER_TYPE_LABELS).map(([v, l]) => ({ label: l, value: v }))}
                            />
                        </Form.Item>
                    )}
                    <Form.Item name="entityIds" label="Bound Entities" rules={[{ required: true, type: 'array', min: 1, message: 'At least one entity required' }]}>
                        <Select mode="multiple" options={entityOptions} placeholder="Select entities this answer is about" />
                    </Form.Item>
                    <Form.Item name="versionFrom" label="Applicable From Version" initialValue="1.0.0">
                        <Input placeholder="e.g., 2.4.1" />
                    </Form.Item>
                    <Form.Item name="structuredSummary" label="Structured Summary (≤500 chars)" rules={[{ required: true, max: 500 }]}>
                        <TextArea rows={3} maxLength={500} showCount placeholder="Concise, deterministic answer core" />
                    </Form.Item>
                    <Form.Item name="detailedExplanation" label="Detailed Explanation" rules={[{ required: true }]}>
                        <TextArea rows={5} placeholder="Rich declarative explanation" />
                    </Form.Item>
                    <Form.Item name="edgeCases" label="Edge Cases (optional)">
                        <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="constraints" label="Constraints (optional)">
                        <TextArea rows={2} />
                    </Form.Item>
                    {FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && createAnswerType === 'procedure' && (
                        renderStepEditor(createSteps, setCreateSteps)
                    )}
                </Form>
            </Modal>
        </>
    );
}
