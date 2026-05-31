'use client'

/**
 * Answerlattice — Predictive Trigger Manager (Expansion Item #12)
 * 
 * Admin UI for managing predictive support trigger rules.
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/
 */

import { FEATURE_FLAGS } from '@config/features';
import { usePredictiveTriggers } from '@hook/answerlattice/usePredictiveTriggers';
import {
    ANSWERLATTICE_PREDICTIVE_CONSTRAINTS,
    ANSWERLATTICE_TRIGGER_ACTION_TYPES,
    ANSWERLATTICE_TRIGGER_SOURCE,
    AnswerlatticePredictiveTrigger,
} from '@type/answerlattice';
import {
    Badge,
    Button,
    Card,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Select,
    Skeleton,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    theme,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import {
    LuCheck,
    LuPause,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuTarget,
    LuTrash,
    LuZap,
} from 'react-icons/lu';

const { Text, Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
    active: 'green',
    suggested: 'gold',
    disabled: 'default',
    archived: 'red',
};

const SOURCE_LABELS: Record<string, string> = {
    manual: 'Manual',
    friction_auto: 'Auto (Friction)',
    system: 'System',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
    help_card: 'Help Card',
    workflow_guide: 'Workflow Guide',
    link_article: 'Link Article',
};

const normalizeTriggerCondition = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, 100);
    return normalized || undefined;
};

interface PredictiveTriggerManagerProps {
    tId: number;
    sId: number;
}

export default function PredictiveTriggerManager({ tId, sId }: PredictiveTriggerManagerProps) {
    const { token } = theme.useToken();
    const { triggers, loading, error, create, update, activate, disable, remove, refresh } = usePredictiveTriggers(tId, sId);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState<AnswerlatticePredictiveTrigger | null>(null);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();

    // Summary stats
    const stats = useMemo(() => {
        const active = triggers.filter(t => t.status === 'active').length;
        const suggested = triggers.filter(t => t.status === 'suggested').length;
        const disabled = triggers.filter(t => t.status === 'disabled').length;
        const avgEffectiveness = triggers
            .filter(t => t.effectiveness && t.effectiveness.impressions > 0)
            .reduce((sum, t) => sum + (t.effectiveness?.score || 0), 0) /
            (triggers.filter(t => t.effectiveness && t.effectiveness.impressions > 0).length || 1);
        return { active, suggested, disabled, total: triggers.length, avgEffectiveness };
    }, [triggers]);

    const handleCreate = useCallback(async () => {
        try {
            const values = await createForm.validateFields();
            const conditions = {
                page: normalizeTriggerCondition(values.page),
                feature: normalizeTriggerCondition(values.feature),
                workflow: normalizeTriggerCondition(values.workflow),
                plan: normalizeTriggerCondition(values.plan),
                userRole: normalizeTriggerCondition(values.userRole),
            };
            if (!conditions.page) {
                createForm.setFields([{ name: 'page', errors: ['Use letters, numbers, underscores, or hyphens.'] }]);
                return;
            }
            await create({
                tId,
                sId,
                name: values.name,
                description: values.description,
                conditions,
                action: {
                    type: values.actionType || ANSWERLATTICE_TRIGGER_ACTION_TYPES.HELP_CARD,
                    entityId: values.entityId || undefined,
                    articleId: values.articleId || undefined,
                    customTitle: values.customTitle || undefined,
                    customSummary: values.customSummary || undefined,
                },
                priority: values.priority || 50,
                cooldownHours: values.cooldownHours || 24,
                status: 'active',
                source: ANSWERLATTICE_TRIGGER_SOURCE.MANUAL,
            });
            setCreateModalOpen(false);
            createForm.resetFields();
        } catch {
            // form validation
        }
    }, [tId, sId, createForm, create]);

    const handleEdit = useCallback(async () => {
        if (!editingTrigger) return;
        try {
            const values = await editForm.validateFields();
            const conditions = {
                page: normalizeTriggerCondition(values.page),
                feature: normalizeTriggerCondition(values.feature),
                workflow: normalizeTriggerCondition(values.workflow),
                plan: normalizeTriggerCondition(values.plan),
                userRole: normalizeTriggerCondition(values.userRole),
            };
            if (!conditions.page) {
                editForm.setFields([{ name: 'page', errors: ['Use letters, numbers, underscores, or hyphens.'] }]);
                return;
            }
            await update({
                id: editingTrigger.id,
                name: values.name,
                description: values.description,
                conditions,
                action: {
                    type: values.actionType,
                    entityId: values.entityId || undefined,
                    articleId: values.articleId || undefined,
                    customTitle: values.customTitle || undefined,
                    customSummary: values.customSummary || undefined,
                },
                priority: values.priority,
                cooldownHours: values.cooldownHours,
            });
            setEditingTrigger(null);
        } catch {
            // form validation
        }
    }, [editingTrigger, editForm, update]);

    const openEdit = useCallback((trigger: AnswerlatticePredictiveTrigger) => {
        setEditingTrigger(trigger);
        editForm.setFieldsValue({
            name: trigger.name,
            description: trigger.description,
            page: trigger.conditions.page,
            feature: trigger.conditions.feature,
            workflow: trigger.conditions.workflow,
            plan: trigger.conditions.plan,
            userRole: trigger.conditions.userRole,
            actionType: trigger.action.type,
            entityId: trigger.action.entityId,
            articleId: trigger.action.articleId,
            customTitle: trigger.action.customTitle,
            customSummary: trigger.action.customSummary,
            priority: trigger.priority,
            cooldownHours: trigger.cooldownHours,
        });
    }, [editForm]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
        return <Empty description="Predictive Support is not enabled" />;
    }

    if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
    if (error) return <Empty description={error} />;

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: AnswerlatticePredictiveTrigger) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    {record.conditions.page && (
                        <Text type="secondary" style={{ fontSize: 12 }}>Page: {record.conditions.page}</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => (
                <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>
            ),
            filters: [
                { text: 'Active', value: 'active' },
                { text: 'Suggested', value: 'suggested' },
                { text: 'Disabled', value: 'disabled' },
            ],
            onFilter: (value: any, record: AnswerlatticePredictiveTrigger) => record.status === value,
        },
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
            width: 110,
            render: (source: string) => (
                <Tag>{SOURCE_LABELS[source] || source}</Tag>
            ),
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            width: 80,
            sorter: (a: AnswerlatticePredictiveTrigger, b: AnswerlatticePredictiveTrigger) => a.priority - b.priority,
        },
        {
            title: 'Cooldown',
            dataIndex: 'cooldownHours',
            key: 'cooldownHours',
            width: 90,
            render: (hours: number) => <Text type="secondary">{hours}h</Text>,
        },
        {
            title: 'Effectiveness',
            key: 'effectiveness',
            width: 120,
            render: (_: any, record: AnswerlatticePredictiveTrigger) => {
                if (!record.effectiveness || record.effectiveness.impressions === 0) {
                    return <Text type="secondary">No data</Text>;
                }
                const { impressions, clicks, score } = record.effectiveness;
                const pct = Math.round(score * 100);
                const color = pct >= 15 ? token.colorSuccess : pct >= 0 ? token.colorWarning : token.colorError;
                return (
                    <Space direction="vertical" size={0}>
                        <Text style={{ color, fontWeight: 600 }}>{pct}%</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{clicks}/{impressions} clicks</Text>
                    </Space>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 160,
            render: (_: any, record: AnswerlatticePredictiveTrigger) => (
                <Space size="small">
                    {record.status === 'suggested' && (
                        <Button type="text" icon={<LuCheck />} onClick={() => activate(record.id)} size="small" title="Activate" />
                    )}
                    {record.status === 'active' && (
                        <Button type="text" icon={<LuPause />} onClick={() => disable(record.id)} size="small" title="Disable" />
                    )}
                    {record.status === 'disabled' && (
                        <Button type="text" icon={<LuCheck />} onClick={() => activate(record.id)} size="small" title="Re-activate" />
                    )}
                    <Button type="text" icon={<LuPencil />} onClick={() => openEdit(record)} size="small" title="Edit" />
                    <Popconfirm
                        title="Delete this trigger?"
                        onConfirm={() => remove(record.id)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="text" icon={<LuTrash />} danger size="small" title="Delete" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const TriggerForm = ({ form }: { form: any }) => (
        <>
            <Form.Item name="name" label="Name" rules={[{ required: true, max: ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_NAME_LENGTH }]}>
                <Input placeholder="e.g., Webhook Setup Help" />
            </Form.Item>
            <Form.Item name="description" label="Description">
                <Input.TextArea placeholder="Optional description" maxLength={ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} rows={2} />
            </Form.Item>
            <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Conditions</Title>
            <Form.Item name="page" label="Page" rules={[{ required: true }]}>
                <Input placeholder="e.g., webhook_setup" />
            </Form.Item>
            <Flex gap={12}>
                <Form.Item name="feature" label="Feature" style={{ flex: 1 }}>
                    <Input placeholder="Optional" />
                </Form.Item>
                <Form.Item name="workflow" label="Workflow" style={{ flex: 1 }}>
                    <Input placeholder="Optional" />
                </Form.Item>
            </Flex>
            <Flex gap={12}>
                <Form.Item name="plan" label="Plan Filter" style={{ flex: 1 }}>
                    <Input placeholder="e.g., free" />
                </Form.Item>
                <Form.Item name="userRole" label="Role Filter" style={{ flex: 1 }}>
                    <Input placeholder="e.g., admin" />
                </Form.Item>
            </Flex>
            <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Action</Title>
            <Form.Item name="actionType" label="Type" initialValue="help_card">
                <Select options={Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Flex gap={12}>
                <Form.Item name="entityId" label="Entity ID" style={{ flex: 1 }}>
                    <Input placeholder="Answerlattice entity ID" />
                </Form.Item>
                <Form.Item name="articleId" label="Article ID" style={{ flex: 1 }}>
                    <Input placeholder="KB article ID" />
                </Form.Item>
            </Flex>
            <Form.Item name="customTitle" label="Custom Title">
                <Input placeholder="Override answer title (optional)" />
            </Form.Item>
            <Form.Item name="customSummary" label="Custom Summary">
                <Input.TextArea placeholder="Override answer summary (optional)" maxLength={ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_CUSTOM_SUMMARY_LENGTH} rows={2} />
            </Form.Item>
            <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>Behavior</Title>
            <Flex gap={12}>
                <Form.Item name="priority" label="Priority (0-100)" initialValue={50} style={{ flex: 1 }}>
                    <InputNumber min={ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY} max={ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="cooldownHours" label="Cooldown (hours)" initialValue={24} style={{ flex: 1 }}>
                    <InputNumber min={ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS} max={ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS} style={{ width: '100%' }} />
                </Form.Item>
            </Flex>
        </>
    );

    return (
        <div>
            {/* Summary Stats */}
            <Flex gap={16} style={{ marginBottom: 16 }} wrap="wrap">
                <Card size="small" style={{ minWidth: 120 }}>
                    <Statistic title="Active" value={stats.active} valueStyle={{ color: token.colorSuccess }} prefix={<LuZap />} />
                </Card>
                <Card size="small" style={{ minWidth: 120 }}>
                    <Statistic title="Suggested" value={stats.suggested} valueStyle={{ color: token.colorWarning }} prefix={<LuTarget />} />
                </Card>
                <Card size="small" style={{ minWidth: 120 }}>
                    <Statistic title="Total" value={stats.total} />
                </Card>
            </Flex>

            {/* Header */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <Space>
                    <Title level={5} style={{ margin: 0 }}>Predictive Triggers</Title>
                    {stats.suggested > 0 && (
                        <Badge count={`${stats.suggested} pending review`} style={{ backgroundColor: token.colorWarning }} />
                    )}
                </Space>
                <Space>
                    <Button icon={<LuRefreshCw />} onClick={refresh} size="small">Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={() => setCreateModalOpen(true)} size="small">
                        Create Trigger
                    </Button>
                </Space>
            </Flex>

            {/* Triggers Table */}
            {triggers.length === 0 ? (
                <Empty description="No predictive triggers yet. Create one or wait for auto-suggestions from friction patterns." />
            ) : (
                <Table
                    dataSource={triggers}
                    columns={columns}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                />
            )}

            {/* Create Modal */}
            <Modal
                title="Create Predictive Trigger"
                open={createModalOpen}
                onOk={handleCreate}
                onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
                width={isMobile ? 'calc(100vw - 24px)' : 600}
                okText="Create"
            >
                <Form form={createForm} layout="vertical" size="small">
                    <TriggerForm form={createForm} />
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Edit Trigger"
                open={!!editingTrigger}
                onOk={handleEdit}
                onCancel={() => setEditingTrigger(null)}
                width={isMobile ? 'calc(100vw - 24px)' : 600}
                okText="Save"
            >
                <Form form={editForm} layout="vertical" size="small">
                    <TriggerForm form={editForm} />
                </Form>
            </Modal>
        </div>
    );
}
