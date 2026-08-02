'use client'

/**
 * Answerlattice — Canonical Answer Editor
 * 
 * Full CRUD UI for canonical answers with entity binding, version management,
 * content editing, and governance status display.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (Pillar 2)
 */

import { FEATURE_FLAGS } from '@config/features';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useCanonicalAnswers } from '@hook/answerlattice/useCanonicalAnswers';
import { useEntities } from '@hook/answerlattice/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    normalizeAnswerlatticeCanonicalAnswerId,
    normalizeAnswerlatticeEntityId,
} from '@lib/answerlattice/governanceIdBoundary';
import { normalizeAnswerlatticePublicCitationUrl } from '@lib/answerlattice/publicAnswerContracts';
import {
    ANSWERLATTICE_ANSWER_STATUS,
    ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS,
    ANSWERLATTICE_ENTITY_TYPES,
    ANSWERLATTICE_PREREQUISITE_TYPE,
    ANSWERLATTICE_PROCEDURE_ACTIONS,
    ANSWERLATTICE_PROCEDURE_CONSTRAINTS,
    ANSWERLATTICE_VALIDATION_SOURCE,
    ANSWERLATTICE_WARNING_SEVERITY,
    AnswerlatticeAnswerType,
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeProcedure,
    AnswerlatticeProcedureStep,
    denormalizeVersion,
    normalizeVersion
} from '@type/answerlattice';
import {
    Badge,
    Alert,
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
import { createRuntimeId } from '@lib/runtime/randomId';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuAlertTriangle,
    LuCheck,
    LuEye,
    LuExternalLink,
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

const ACTION_OPTIONS = Object.values(ANSWERLATTICE_PROCEDURE_ACTIONS).map(a => ({ label: a, value: a }));
const SEVERITY_OPTIONS = Object.values(ANSWERLATTICE_WARNING_SEVERITY).map(s => ({ label: s, value: s }));
const PREREQ_TYPE_OPTIONS = Object.values(ANSWERLATTICE_PREREQUISITE_TYPE).map(t => ({ label: t, value: t }));

const DEFAULT_STEP: AnswerlatticeProcedureStep = { stepOrder: 1, action: 'click', instruction: '' };
const VERSION_LABEL_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

const parseVersionLabel = (value: unknown): number | null => {
    const label = typeof value === 'string' ? value.trim() : '';
    if (!VERSION_LABEL_PATTERN.test(label)) return null;
    const normalized = normalizeVersion(label);
    return Number.isInteger(normalized) && normalized > 0 && normalized <= 999_999_999
        ? normalized
        : null;
};

const optionalIds = (value: unknown): string[] | undefined => (
    Array.isArray(value) && value.length > 0 ? value : undefined
);

const buildPublicCitations = (value: unknown) => (
    Array.isArray(value)
        ? value.slice(0, ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS).flatMap((citation) => {
            const title = typeof citation?.title === 'string' ? citation.title.trim() : '';
            const url = normalizeAnswerlatticePublicCitationUrl(citation?.url);
            if (!title || !url) return [];
            return [{ id: createRuntimeId('citation'), title, url }];
        })
        : []
);

export default function CanonicalAnswerEditor() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const routeContextQuery = searchParams?.toString() ?? '';
    const requestedEntityId = normalizeAnswerlatticeEntityId(searchParams?.get('entity')) || '';
    const requestedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(searchParams?.get('answer')) || '';
    const isMobile = screens.md !== true;
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const {
        answers, driftedAnswers, loading, refresh,
        selectedAnswer, setSelectedAnswer,
        create, update,
    } = useCanonicalAnswers(tId, sId);

    const { entities } = useEntities(tId, sId, 'entities_only');

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();
    const [editAnswerType, setEditAnswerType] = useState<AnswerlatticeAnswerType>('explanation');
    const [createAnswerType, setCreateAnswerType] = useState<AnswerlatticeAnswerType>('explanation');
    const [editSteps, setEditSteps] = useState<AnswerlatticeProcedureStep[]>([]);
    const [createSteps, setCreateSteps] = useState<AnswerlatticeProcedureStep[]>([{ ...DEFAULT_STEP }]);
    const [savingProposal, setSavingProposal] = useState(false);
    const [creatingProposal, setCreatingProposal] = useState(false);
    const handledAnswerContextRef = useRef('');

    const entityOptions = useMemo(() =>
        (entities || []).map(e => ({ label: `${e.name} (${e.type})`, value: e.id })),
        [entities]
    );

    const planOptions = useMemo(() =>
        (entities || [])
            .filter(entity => entity.type === ANSWERLATTICE_ENTITY_TYPES.PLAN)
            .map(entity => ({ label: entity.name, value: entity.slug })),
        [entities]
    );

    const roleOptions = useMemo(() =>
        (entities || [])
            .filter(entity => entity.type === ANSWERLATTICE_ENTITY_TYPES.ROLE)
            .map(entity => ({ label: entity.name, value: entity.slug })),
        [entities]
    );

    const stateOptions = useMemo(() =>
        (entities || [])
            .filter(entity => entity.type === ANSWERLATTICE_ENTITY_TYPES.STATE)
            .map(entity => ({ label: entity.name, value: entity.slug })),
        [entities]
    );

    const entityMap = useMemo(() => {
        const map = new Map<string, string>();
        (entities || []).forEach(e => {
            map.set(e.id, e.name);
            map.set(e.slug, e.name);
        });
        return map;
    }, [entities]);

    const clearRouteContext = useCallback((key: 'answer' | 'entity') => {
        const nextParams = new URLSearchParams(routeContextQuery);
        if (!nextParams.has(key)) return;
        nextParams.delete(key);
        router.replace(`${pathname}${nextParams.size ? `?${nextParams.toString()}` : ''}`, { scroll: false });
    }, [pathname, routeContextQuery, router]);

    const openDetail = useCallback((answer: AnswerlatticeCanonicalAnswer) => {
        setSelectedAnswer(answer);
        setDrawerOpen(true);
        setEditMode(false);
        const at = answer.answerType || 'explanation';
        setEditAnswerType(at as AnswerlatticeAnswerType);
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
            planIds: answer.scope.planIds || [],
            roleIds: answer.scope.roleIds || [],
            stateIds: answer.scope.stateIds || [],
            versionFrom: denormalizeVersion(answer.productBinding.applicableVersions.from),
            versionTo: answer.productBinding.applicableVersions.to
                ? denormalizeVersion(answer.productBinding.applicableVersions.to)
                : '',
            citations: (answer.evidence?.citations || []).map(citation => ({
                title: citation.title,
                url: citation.url,
            })),
        });
    }, [form, setSelectedAnswer]);

    useEffect(() => {
        if (!requestedAnswerId) {
            handledAnswerContextRef.current = '';
            return;
        }
        if (loading || !tId || !sId) return;
        const contextKey = `${tId}:${sId}:${requestedAnswerId}`;
        if (handledAnswerContextRef.current === contextKey) return;
        const requestedAnswer = answers.find(answer => answer.id === requestedAnswerId);
        if (!requestedAnswer) return;
        handledAnswerContextRef.current = contextKey;
        openDetail(requestedAnswer);
    }, [answers, loading, openDetail, requestedAnswerId, sId, tId]);

    const visibleAnswers = useMemo(() => (
        requestedEntityId
            ? answers.filter(answer => answer.scope.entityIds.includes(requestedEntityId))
            : answers
    ), [answers, requestedEntityId]);
    const requestedAnswerMissing = Boolean(
        requestedAnswerId
        && !loading
        && !answers.some(answer => answer.id === requestedAnswerId),
    );
    const focusedEntityName = requestedEntityId
        ? entityMap.get(requestedEntityId) || requestedEntityId
        : '';
    const openCreateProposal = useCallback(() => {
        createForm.resetFields();
        if (
            requestedEntityId
            && entityOptions.some(option => option.value === requestedEntityId)
        ) {
            createForm.setFieldsValue({ entityIds: [requestedEntityId] });
        }
        setCreateModalOpen(true);
    }, [createForm, entityOptions, requestedEntityId]);

    const handleSave = useCallback(async () => {
        if (!selectedAnswer || savingProposal) return;
        setSavingProposal(true);
        try {
            const values = await form.validateFields();
            const versionFrom = parseVersionLabel(values.versionFrom);
            const versionToInput = String(values.versionTo || '').trim();
            const versionTo = versionToInput ? parseVersionLabel(versionToInput) : null;
            if (!versionFrom || (versionToInput && !versionTo) || (versionTo && versionTo < versionFrom)) {
                throw new Error('Invalid canonical answer version window');
            }
            const procedure: AnswerlatticeProcedure | undefined =
                editAnswerType === 'procedure' && editSteps.length > 0
                    ? {
                        ...selectedAnswer.content.procedure,
                        steps: editSteps,
                    }
                    : undefined;
            const submitted = await update({
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
                evidence: {
                    sourceIds: selectedAnswer.evidence?.sourceIds || [],
                    citations: buildPublicCitations(values.citations),
                },
                scope: {
                    entityIds: values.entityIds,
                    planIds: optionalIds(values.planIds),
                    roleIds: optionalIds(values.roleIds),
                    stateIds: optionalIds(values.stateIds),
                },
                productBinding: {
                    ...selectedAnswer.productBinding,
                    applicableVersions: {
                        from: versionFrom,
                        to: versionTo,
                    },
                },
            });
            if (submitted) {
                setEditMode(false);
                setDrawerOpen(false);
            }
        } catch {
            // form validation failed
        } finally {
            setSavingProposal(false);
        }
    }, [selectedAnswer, savingProposal, form, update, editAnswerType, editSteps]);

    const handleCreate = useCallback(async () => {
        if (creatingProposal) return;
        setCreatingProposal(true);
        try {
            const values = await createForm.validateFields();
            const versionNorm = parseVersionLabel(values.versionFrom);
            const versionToInput = String(values.versionTo || '').trim();
            const versionTo = versionToInput ? parseVersionLabel(versionToInput) : null;
            if (!versionNorm || (versionToInput && !versionTo) || (versionTo && versionTo < versionNorm)) {
                throw new Error('Invalid canonical answer version window');
            }
            const procedureSlug = String(values.title || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '')
                .slice(0, ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_PROCEDURE_SLUG_LENGTH);
            const procedure: AnswerlatticeProcedure | undefined =
                createAnswerType === 'procedure' && createSteps.length > 0
                    ? {
                        ...(procedureSlug ? { procedureSlug } : {}),
                        steps: createSteps,
                    }
                    : undefined;
            const submitted = await create({
                tId, sId,
                title: values.title,
                slug: values.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'),
                status: ANSWERLATTICE_ANSWER_STATUS.ACTIVE,
                answerType: createAnswerType,
                scope: {
                    entityIds: values.entityIds,
                    planIds: optionalIds(values.planIds),
                    roleIds: optionalIds(values.roleIds),
                    stateIds: optionalIds(values.stateIds),
                },
                productBinding: {
                    introducedInVersion: versionNorm,
                    lastValidatedInVersion: versionNorm,
                    applicableVersions: { from: versionNorm, to: versionTo },
                },
                content: {
                    structuredSummary: values.structuredSummary,
                    detailedExplanation: values.detailedExplanation,
                    edgeCases: values.edgeCases || undefined,
                    constraints: values.constraints || undefined,
                    procedure,
                },
                evidence: {
                    sourceIds: [],
                    citations: buildPublicCitations(values.citations),
                },
                validation: {
                    confidenceScore: 1.0,
                    validationSource: ANSWERLATTICE_VALIDATION_SOURCE.MANUAL,
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
            if (submitted) {
                setCreateModalOpen(false);
                createForm.resetFields();
                setCreateAnswerType('explanation');
                setCreateSteps([{ ...DEFAULT_STEP }]);
            }
        } catch {
            // form validation
        } finally {
            setCreatingProposal(false);
        }
    }, [creatingProposal, tId, sId, createForm, create, createAnswerType, createSteps]);

    // Step editor helpers
    const updateStep = useCallback((
        steps: AnswerlatticeProcedureStep[],
        setSteps: (s: AnswerlatticeProcedureStep[]) => void,
        index: number,
        field: keyof AnswerlatticeProcedureStep,
        value: AnswerlatticeProcedureStep[keyof AnswerlatticeProcedureStep],
    ) => {
        setSteps(steps.map((step, stepIndex) => (
            stepIndex === index ? { ...step, [field]: value } as AnswerlatticeProcedureStep : step
        )));
    }, []);

    const addStep = useCallback((steps: AnswerlatticeProcedureStep[], setSteps: (s: AnswerlatticeProcedureStep[]) => void) => {
        if (steps.length >= ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_STEPS) return;
        setSteps([...steps, { stepOrder: steps.length + 1, action: 'click', instruction: '' }]);
    }, []);

    const removeStep = useCallback((steps: AnswerlatticeProcedureStep[], setSteps: (s: AnswerlatticeProcedureStep[]) => void, index: number) => {
        if (steps.length <= 1) return;
        const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
        setSteps(updated);
    }, []);

    const renderStepEditor = useCallback((steps: AnswerlatticeProcedureStep[], setSteps: (s: AnswerlatticeProcedureStep[]) => void) => (
        <Card size="small" title={<Space><LuListOrdered /> Procedure Steps ({steps.length}/{ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_STEPS})</Space>}>
            <Flex vertical gap={8}>
                {steps.map((step, idx) => (
                    <Flex
                        key={step.stepOrder}
                        vertical
                        gap={8}
                        style={{ paddingBottom: 10, borderBottom: idx < steps.length - 1 ? `1px solid ${token.colorBorderSecondary}` : undefined }}
                    >
                        <Flex gap={8} align="start" wrap="wrap">
                            <InputNumber value={step.stepOrder} disabled style={{ width: 50 }} size="small" />
                            <Select
                                value={step.action}
                                onChange={(value) => updateStep(steps, setSteps, idx, 'action', value)}
                                options={ACTION_OPTIONS}
                                style={{ width: 120 }}
                                size="small"
                            />
                            <Input
                                value={step.instruction}
                                onChange={(event) => updateStep(steps, setSteps, idx, 'instruction', event.target.value)}
                                placeholder="Instruction, for example: Select Connect Slack"
                                maxLength={ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_INSTRUCTION_LENGTH}
                                size="small"
                                style={{ flex: '1 1 240px' }}
                            />
                            <Button
                                type="text"
                                icon={<LuMinus />}
                                onClick={() => removeStep(steps, setSteps, idx)}
                                disabled={steps.length <= 1}
                                size="small"
                                danger
                                aria-label={`Remove step ${step.stepOrder}`}
                            />
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            <Input
                                value={step.target}
                                onChange={(event) => updateStep(steps, setSteps, idx, 'target', event.target.value.trim().toLowerCase())}
                                placeholder="Target ID, for example: slack.connect"
                                maxLength={ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_TARGET_LENGTH}
                                size="small"
                                style={{ flex: '1 1 220px' }}
                            />
                            <Input
                                value={step.expectedEvent}
                                onChange={(event) => updateStep(steps, setSteps, idx, 'expectedEvent', event.target.value.trim().toLowerCase())}
                                placeholder="Completion event, for example: slack.oauth.started"
                                maxLength={ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_EXPECTED_EVENT_LENGTH}
                                size="small"
                                style={{ flex: '1 1 240px' }}
                            />
                        </Flex>
                        <Flex gap={8} wrap="wrap">
                            <Input
                                value={step.expectedResult}
                                onChange={(event) => updateStep(steps, setSteps, idx, 'expectedResult', event.target.value)}
                                placeholder="Expected result"
                                maxLength={ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_EXPECTED_RESULT_LENGTH}
                                size="small"
                                style={{ flex: '1 1 220px' }}
                            />
                            <Input
                                value={step.troubleshootingHint}
                                onChange={(event) => updateStep(steps, setSteps, idx, 'troubleshootingHint', event.target.value)}
                                placeholder="Fallback if this step fails"
                                maxLength={ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_TROUBLESHOOTING_HINT_LENGTH}
                                size="small"
                                style={{ flex: '1 1 240px' }}
                            />
                        </Flex>
                    </Flex>
                ))}
                <Button
                    type="dashed"
                    icon={<LuPlus />}
                    onClick={() => addStep(steps, setSteps)}
                    disabled={steps.length >= ANSWERLATTICE_PROCEDURE_CONSTRAINTS.MAX_STEPS}
                    size="small"
                    block
                >
                    Add Step
                </Button>
            </Flex>
        </Card>
    ), [updateStep, addStep, removeStep]);

    const renderCitationEditor = useCallback(() => (
        <Card size="small" title="Approved Public Sources">
            <Form.List
                name="citations"
                rules={[{
                    validator: async (_, citations) => {
                        if ((citations || []).length > ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS) {
                            throw new Error(`Use at most ${ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS} public sources`);
                        }
                    },
                }]}
            >
                {(fields, { add, remove }, { errors }) => (
                    <Flex vertical gap={10}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Only these reviewer-approved links are shown with customer-facing canonical answers. Internal evidence stays private.
                        </Text>
                        {fields.map(field => (
                            <Flex key={field.key} gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'start'}>
                                <Form.Item
                                    {...field}
                                    name={[field.name, 'title']}
                                    label="Source title"
                                    style={{ flex: 1, marginBottom: 0 }}
                                    rules={[{
                                        required: true,
                                        max: ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_CITATION_TITLE_LENGTH,
                                    }]}
                                >
                                    <Input placeholder="Product documentation" />
                                </Form.Item>
                                <Form.Item
                                    {...field}
                                    name={[field.name, 'url']}
                                    label="Public URL"
                                    style={{ flex: 1.4, marginBottom: 0 }}
                                    rules={[
                                        { required: true },
                                        {
                                            validator: (_, value) => normalizeAnswerlatticePublicCitationUrl(value)
                                                ? Promise.resolve()
                                                : Promise.reject(new Error('Use a public HTTP or HTTPS URL without credentials')),
                                        },
                                    ]}
                                >
                                    <Input placeholder="https://docs.example.com/article" />
                                </Form.Item>
                                <Button
                                    type="text"
                                    danger
                                    icon={<LuMinus />}
                                    onClick={() => remove(field.name)}
                                    aria-label="Remove public source"
                                    style={{ marginTop: isMobile ? 0 : 30 }}
                                />
                            </Flex>
                        ))}
                        <Button
                            type="dashed"
                            icon={<LuPlus />}
                            onClick={() => add({ title: '', url: '' })}
                            disabled={fields.length >= ANSWERLATTICE_CANONICAL_EVIDENCE_CONSTRAINTS.MAX_PUBLIC_CITATIONS}
                            block
                        >
                            Add public source
                        </Button>
                        <Form.ErrorList errors={errors} />
                    </Flex>
                )}
            </Form.List>
        </Card>
    ), [isMobile]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI) return null;

    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (title: string, record: AnswerlatticeCanonicalAnswer) => (
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
            render: (_: any, record: AnswerlatticeCanonicalAnswer) => {
                const at = record.answerType || 'explanation';
                return <Tag color={ANSWER_TYPE_COLORS[at] || 'default'}>{ANSWER_TYPE_LABELS[at] || at}</Tag>;
            },
            filters: Object.entries(ANSWER_TYPE_LABELS).map(([value, text]) => ({ text, value })),
            onFilter: (value: any, record: AnswerlatticeCanonicalAnswer) => (record.answerType || 'explanation') === value,
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
            onFilter: (value: any, record: AnswerlatticeCanonicalAnswer) => record.status === value,
        },
        {
            title: 'Entities',
            key: 'entities',
            width: 200,
            render: (_: any, record: AnswerlatticeCanonicalAnswer) => (
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
            render: (_: any, record: AnswerlatticeCanonicalAnswer) => {
                const score = Math.round((record.validation?.confidenceScore || 0) * 100);
                const color = score >= 80 ? token.colorSuccess : score >= 50 ? token.colorWarning : token.colorError;
                return <Text style={{ color }}>{score}%</Text>;
            },
            sorter: (a: AnswerlatticeCanonicalAnswer, b: AnswerlatticeCanonicalAnswer) =>
                (a.validation?.confidenceScore || 0) - (b.validation?.confidenceScore || 0),
        },
        {
            title: 'Signals',
            key: 'signals',
            width: 100,
            render: (_: any, record: AnswerlatticeCanonicalAnswer) => {
                const total = (record.signalMetrics?.linkedTicketCount || 0) +
                    (record.signalMetrics?.linkedChatCount || 0);
                return <Text type="secondary">{total}</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: any, record: AnswerlatticeCanonicalAnswer) => (
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
                        <Badge count={visibleAnswers.length} style={{ backgroundColor: token.colorPrimary }} />
                        {driftedAnswers.length > 0 && (
                            <Badge count={`${driftedAnswers.length} drifted`} style={{ backgroundColor: token.colorWarning }} />
                        )}
                    </Space>
                    <Space>
                        <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading} type="text">
                            Refresh
                        </Button>
                        <Button type="primary" icon={<LuPlus />} onClick={openCreateProposal}>
                            New answer proposal
                        </Button>
                    </Space>
                </Flex>

                {requestedEntityId ? (
                    <Alert
                        closable
                        message={`Showing answers for ${focusedEntityName}`}
                        description="This focus came from an owner review surface. Clear it to review every canonical answer."
                        onClose={() => clearRouteContext('entity')}
                        showIcon
                        style={{ marginBottom: 16 }}
                        type="info"
                    />
                ) : null}
                {requestedAnswerMissing ? (
                    <Alert
                        closable
                        message="The requested canonical answer is no longer available"
                        onClose={() => clearRouteContext('answer')}
                        showIcon
                        style={{ marginBottom: 16 }}
                        type="warning"
                    />
                ) : null}

                <Table
                    dataSource={visibleAnswers}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{
                        emptyText: (
                            <Empty
                                description={requestedEntityId ? 'No canonical answers are linked to this product area' : 'No approved answers yet'}
                                image={answers.length === 0 && !requestedEntityId ? (
                                    <ContextualStateIllustration
                                        color={token.colorPrimary}
                                        size={96}
                                        treatment="softHalo"
                                        variant="feedbackContext"
                                    />
                                ) : Empty.PRESENTED_IMAGE_SIMPLE}
                                imageStyle={{ height: 96 }}
                            >
                                <Space direction="vertical" size={8} align="center">
                                    <Text type="secondary">
                                        Start with one answer tied to a product entity, or generate drafts from Knowledge Intake first.
                                    </Text>
                                    <Button type="primary" icon={<LuPlus />} onClick={openCreateProposal}>
                                        Prepare first answer
                                    </Button>
                                </Space>
                            </Empty>
                        ),
                    }}
                />
            </Card>

            {/* Detail/Edit Drawer */}
            <Drawer
                title={editMode ? 'Propose Canonical Answer Update' : 'Canonical Answer Detail'}
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setEditMode(false);
                    clearRouteContext('answer');
                }}
                width={isMobile ? '100%' : 640}
                extra={
                    editMode ? (
                        <Space>
                            <Button onClick={() => setEditMode(false)}>Cancel</Button>
                            <Button type="primary" icon={<LuCheck />} onClick={handleSave} loading={savingProposal}>Send for review</Button>
                        </Space>
                    ) : (
                        <Button icon={<LuPencil />} onClick={() => setEditMode(true)}>Prepare update</Button>
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
                            {selectedAnswer.scope.planIds && selectedAnswer.scope.planIds.length > 0 && (
                                <Descriptions.Item label="Plans">
                                    <Space wrap>
                                        {selectedAnswer.scope.planIds.map(id => (
                                            <Tag key={id} color="cyan">{entityMap.get(id) || id}</Tag>
                                        ))}
                                    </Space>
                                </Descriptions.Item>
                            )}
                            {selectedAnswer.scope.roleIds && selectedAnswer.scope.roleIds.length > 0 && (
                                <Descriptions.Item label="Roles">
                                    <Space wrap>
                                        {selectedAnswer.scope.roleIds.map(id => (
                                            <Tag key={id} color="geekblue">{entityMap.get(id) || id}</Tag>
                                        ))}
                                    </Space>
                                </Descriptions.Item>
                            )}
                            {selectedAnswer.scope.stateIds && selectedAnswer.scope.stateIds.length > 0 && (
                                <Descriptions.Item label="States">
                                    <Space wrap>
                                        {selectedAnswer.scope.stateIds.map(id => (
                                            <Tag key={id} color="gold">{entityMap.get(id) || id}</Tag>
                                        ))}
                                    </Space>
                                </Descriptions.Item>
                            )}
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
                            <Descriptions.Item label="Internal Evidence">
                                {selectedAnswer.evidence?.sourceIds.length || 0} linked source{selectedAnswer.evidence?.sourceIds.length === 1 ? '' : 's'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Public Sources">
                                {selectedAnswer.evidence?.citations.length ? (
                                    <Flex vertical gap={4}>
                                        {selectedAnswer.evidence.citations.map(citation => (
                                            <Typography.Link
                                                key={citation.id}
                                                href={citation.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <LuExternalLink size={12} aria-hidden style={{ marginRight: 6 }} />
                                                {citation.title}
                                            </Typography.Link>
                                        ))}
                                    </Flex>
                                ) : <Text type="secondary">None approved</Text>}
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
                                            description: (
                                                <Flex vertical gap={2}>
                                                    {step.target && <Text type="secondary">Target: {step.target}</Text>}
                                                    {step.expectedEvent && <Text type="secondary">Wait for: {step.expectedEvent}</Text>}
                                                    {step.expectedResult && <Text type="secondary">{step.expectedResult}</Text>}
                                                </Flex>
                                            ),
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
                        <Alert
                            type="info"
                            showIcon
                            message="Updates require Governance approval"
                            description="Submitting this form creates a review proposal. The approved answer remains unchanged until a reviewer applies it."
                            style={{ marginBottom: 16 }}
                        />
                        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ label: l, value: v }))} />
                        </Form.Item>
                        {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && (
                            <Form.Item name="answerType" label="Answer Type">
                                <Select
                                    value={editAnswerType}
                                    onChange={(v) => setEditAnswerType(v as AnswerlatticeAnswerType)}
                                    options={Object.entries(ANSWER_TYPE_LABELS).map(([v, l]) => ({ label: l, value: v }))}
                                />
                            </Form.Item>
                        )}
                        <Form.Item name="entityIds" label="Bound Entities" rules={[{ required: true, type: 'array', min: 1, message: 'At least one entity required' }]}>
                            <Select mode="multiple" options={entityOptions} placeholder="Select entities" />
                        </Form.Item>
                        <Form.Item name="planIds" label="Applicable Plans (optional)">
                            <Select mode="multiple" options={planOptions} placeholder="All plans when empty" />
                        </Form.Item>
                        <Form.Item name="roleIds" label="Applicable Roles (optional)">
                            <Select mode="multiple" options={roleOptions} placeholder="All roles when empty" />
                        </Form.Item>
                        <Form.Item name="stateIds" label="Applicable Product States (optional)">
                            <Select mode="multiple" options={stateOptions} placeholder="All states when empty" />
                        </Form.Item>
                        <Flex gap={12} vertical={isMobile}>
                            <Form.Item
                                name="versionFrom"
                                label="Applicable From Version"
                                style={{ flex: 1 }}
                                rules={[
                                    { required: true, message: 'Starting version is required' },
                                    {
                                        validator: (_, value) => parseVersionLabel(value)
                                            ? Promise.resolve()
                                            : Promise.reject(new Error('Use a version such as 2.4.1')),
                                    },
                                ]}
                            >
                                <Input placeholder="e.g., 2.4.1" />
                            </Form.Item>
                            <Form.Item
                                name="versionTo"
                                label="Through Version (optional)"
                                style={{ flex: 1 }}
                                dependencies={['versionFrom']}
                                rules={[{
                                    validator: (_, value) => {
                                        if (!String(value || '').trim()) return Promise.resolve();
                                        const to = parseVersionLabel(value);
                                        const from = parseVersionLabel(form.getFieldValue('versionFrom'));
                                        if (!to) return Promise.reject(new Error('Use a version such as 3.0.0'));
                                        return from && to < from
                                            ? Promise.reject(new Error('Through version must be the same or later'))
                                            : Promise.resolve();
                                    },
                                }]}
                            >
                                <Input placeholder="Current when empty" />
                            </Form.Item>
                        </Flex>
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
                        {renderCitationEditor()}
                        {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && editAnswerType === 'procedure' && (
                            renderStepEditor(editSteps, setEditSteps)
                        )}
                    </Form>
                )}
            </Drawer>

            {/* Create Modal */}
            <Modal
                title="Propose Canonical Answer"
                open={createModalOpen}
                onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
                onOk={handleCreate}
                okText="Send for review"
                confirmLoading={creatingProposal}
                width={isMobile ? 'calc(100vw - 24px)' : 600}
            >
                <Form form={createForm} layout="vertical">
                    <Alert
                        type="info"
                        showIcon
                        message="Nothing publishes directly"
                        description="This creates a pending proposal. A Governance reviewer must approve it before it becomes an active canonical answer."
                        style={{ marginBottom: 16 }}
                    />
                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                        <Input placeholder="e.g., How to configure SSO integration" />
                    </Form.Item>
                    {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && (
                        <Form.Item name="answerType" label="Answer Type" initialValue="explanation">
                            <Select
                                value={createAnswerType}
                                onChange={(v) => setCreateAnswerType(v as AnswerlatticeAnswerType)}
                                options={Object.entries(ANSWER_TYPE_LABELS).map(([v, l]) => ({ label: l, value: v }))}
                            />
                        </Form.Item>
                    )}
                    <Form.Item name="entityIds" label="Bound Entities" rules={[{ required: true, type: 'array', min: 1, message: 'At least one entity required' }]}>
                        <Select mode="multiple" options={entityOptions} placeholder="Select entities this answer is about" />
                    </Form.Item>
                    <Form.Item name="planIds" label="Applicable Plans (optional)">
                        <Select mode="multiple" options={planOptions} placeholder="All plans when empty" />
                    </Form.Item>
                    <Form.Item name="roleIds" label="Applicable Roles (optional)">
                        <Select mode="multiple" options={roleOptions} placeholder="All roles when empty" />
                    </Form.Item>
                    <Form.Item name="stateIds" label="Applicable Product States (optional)">
                        <Select mode="multiple" options={stateOptions} placeholder="All states when empty" />
                    </Form.Item>
                    <Flex gap={12} vertical={isMobile}>
                        <Form.Item
                            name="versionFrom"
                            label="Applicable From Version"
                            initialValue="1.0.0"
                            style={{ flex: 1 }}
                            rules={[
                                { required: true, message: 'Starting version is required' },
                                {
                                    validator: (_, value) => parseVersionLabel(value)
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('Use a version such as 2.4.1')),
                                },
                            ]}
                        >
                            <Input placeholder="e.g., 2.4.1" />
                        </Form.Item>
                        <Form.Item
                            name="versionTo"
                            label="Through Version (optional)"
                            style={{ flex: 1 }}
                            dependencies={['versionFrom']}
                            rules={[{
                                validator: (_, value) => {
                                    if (!String(value || '').trim()) return Promise.resolve();
                                    const to = parseVersionLabel(value);
                                    const from = parseVersionLabel(createForm.getFieldValue('versionFrom'));
                                    if (!to) return Promise.reject(new Error('Use a version such as 3.0.0'));
                                    return from && to < from
                                        ? Promise.reject(new Error('Through version must be the same or later'))
                                        : Promise.resolve();
                                },
                            }]}
                        >
                            <Input placeholder="Current when empty" />
                        </Form.Item>
                    </Flex>
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
                    {renderCitationEditor()}
                    {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && createAnswerType === 'procedure' && (
                        renderStepEditor(createSteps, setCreateSteps)
                    )}
                </Form>
            </Modal>
        </>
    );
}
