'use client'

/**
 * Answerlattice — Entity Management Dashboard
 * 
 * List/create/edit/deprecate entities, view relationships and search index.
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (Pillar 1)
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { useEntities } from '@hook/answerlattice/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    ANSWERLATTICE_ENTITY_STATUS,
    ANSWERLATTICE_ENTITY_TYPES,
    ANSWERLATTICE_RELATION_TYPES,
    AnswerlatticeEntity,
    AnswerlatticeEntityType,
    AnswerlatticeRelationType,
    denormalizeVersion,
} from '@type/answerlattice';
import {
    Badge,
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
    theme,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import {
    LuArchive,
    LuEye,
    LuGitMerge,
    LuLink,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuSearch,
    LuTrash2,
} from 'react-icons/lu';

const { Text, Title } = Typography;

const TYPE_COLORS: Record<string, string> = {
    feature: 'blue',
    plan: 'green',
    role: 'orange',
    workflow: 'purple',
    state: 'cyan',
    integration: 'magenta',
    error: 'red',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'green',
    deprecated: 'red',
    beta: 'orange',
};

const ENTITY_TYPE_OPTIONS = Object.entries(ANSWERLATTICE_ENTITY_TYPES).map(([key, value]) => ({
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    value,
}));

export default function EntityManagementDashboard() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const {
        entities, relations, searchIndex, loading, error, refresh,
        selectedEntity, setSelectedEntity,
        create, update, deprecate, merge, addRelation, removeRelation,
    } = useEntities(tId, sId);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [mergeEntityId, setMergeEntityId] = useState<string>();
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();
    const [relationForm] = Form.useForm();

    const filteredEntities = useMemo(() => {
        if (!searchText) return entities;
        const lower = searchText.toLowerCase();
        return entities.filter(e =>
            e.name.toLowerCase().includes(lower) ||
            e.type.toLowerCase().includes(lower) ||
            e.description?.toLowerCase().includes(lower)
        );
    }, [entities, searchText]);

    const entityRelationCounts = useMemo(() => {
        const counts = new Map<string, number>();
        relations.forEach(r => {
            counts.set(r.fromEntityId, (counts.get(r.fromEntityId) || 0) + 1);
            counts.set(r.toEntityId, (counts.get(r.toEntityId) || 0) + 1);
        });
        return counts;
    }, [relations]);

    const entitySearchIndexed = useMemo(() => {
        const indexed = new Set<string>();
        searchIndex.forEach(s => indexed.add(s.entityId));
        return indexed;
    }, [searchIndex]);

    const openDetail = useCallback((entity: AnswerlatticeEntity) => {
        setSelectedEntity(entity);
        setDrawerOpen(true);
        setEditMode(false);
        form.setFieldsValue({
            name: entity.name,
            description: entity.description,
            status: entity.status,
            aliases: entity.aliases || [],
        });
        relationForm.resetFields();
        setMergeEntityId(undefined);
    }, [form, relationForm, setSelectedEntity]);

    const handleSave = useCallback(async () => {
        if (!selectedEntity) return;
        try {
            const values = await form.validateFields();
            setSaving(true);
            const updated = await update({
                id: selectedEntity.id,
                name: values.name,
                description: values.description,
                status: values.status,
                aliases: values.aliases || [],
            });
            if (updated) {
                setEditMode(false);
                setDrawerOpen(false);
            }
        } catch {
            // form validation
        } finally {
            setSaving(false);
        }
    }, [selectedEntity, form, update]);

    const handleCreate = useCallback(async () => {
        try {
            const values = await createForm.validateFields();
            const slug = values.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            setSaving(true);
            const created = await create({
                tId, sId,
                name: values.name,
                slug,
                type: values.type as AnswerlatticeEntityType,
                description: values.description,
                status: ANSWERLATTICE_ENTITY_STATUS.ACTIVE,
                aliases: values.aliases || [],
                currentVersion: 1000000, // v1.0.0
            });
            if (created) {
                setCreateModalOpen(false);
                createForm.resetFields();
            }
        } catch {
            // form validation
        } finally {
            setSaving(false);
        }
    }, [tId, sId, createForm, create]);

    const handleDeprecate = useCallback(async (entityId: string) => {
        setSaving(true);
        try {
            const deprecated = await deprecate(entityId);
            if (deprecated && selectedEntity?.id === entityId) {
                setDrawerOpen(false);
                setEditMode(false);
            }
        } finally {
            setSaving(false);
        }
    }, [deprecate, selectedEntity?.id]);

    const handleAddRelation = useCallback(async () => {
        if (!selectedEntity) return;
        try {
            const values = await relationForm.validateFields();
            setSaving(true);
            const added = await addRelation({
                tId,
                sId,
                fromEntityId: selectedEntity.id,
                toEntityId: values.toEntityId,
                relationType: values.relationType as AnswerlatticeRelationType,
            });
            if (added) relationForm.resetFields();
        } catch {
            // form validation
        } finally {
            setSaving(false);
        }
    }, [addRelation, relationForm, sId, selectedEntity, tId]);

    const handleMerge = useCallback(async () => {
        if (!selectedEntity || !mergeEntityId) return;
        setSaving(true);
        try {
            const merged = await merge(selectedEntity.id, mergeEntityId);
            if (merged) {
                setMergeEntityId(undefined);
                setDrawerOpen(false);
            }
        } finally {
            setSaving(false);
        }
    }, [merge, mergeEntityId, selectedEntity]);

    const handleRemoveRelation = useCallback(async (relationId: string) => {
        setSaving(true);
        try {
            await removeRelation(relationId);
        } finally {
            setSaving(false);
        }
    }, [removeRelation]);

    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        entities.forEach(e => {
            counts[e.type] = (counts[e.type] || 0) + 1;
        });
        return counts;
    }, [entities]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI) return null;

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: AnswerlatticeEntity) => (
                <Text strong style={{ cursor: 'pointer' }} onClick={() => openDetail(record)}>
                    {name}
                </Text>
            ),
            sorter: (a: AnswerlatticeEntity, b: AnswerlatticeEntity) => a.name.localeCompare(b.name),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            render: (type: string) => (
                <Tag color={TYPE_COLORS[type] || 'default'}>{type}</Tag>
            ),
            filters: ENTITY_TYPE_OPTIONS.map(o => ({ text: o.label, value: o.value })),
            onFilter: (value: any, record: AnswerlatticeEntity) => record.type === value,
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
                { text: 'Beta', value: 'beta' },
                { text: 'Deprecated', value: 'deprecated' },
            ],
            onFilter: (value: any, record: AnswerlatticeEntity) => record.status === value,
        },
        {
            title: 'Version',
            key: 'version',
            width: 80,
            render: (_: any, record: AnswerlatticeEntity) => (
                <Text type="secondary">{denormalizeVersion(record.currentVersion)}</Text>
            ),
        },
        {
            title: 'Relations',
            key: 'relations',
            width: 80,
            render: (_: any, record: AnswerlatticeEntity) => {
                const count = entityRelationCounts.get(record.id) || 0;
                return count > 0 ? <Badge count={count} style={{ backgroundColor: token.colorPrimary }} /> : <Text type="secondary">0</Text>;
            },
        },
        {
            title: 'Indexed',
            key: 'indexed',
            width: 70,
            render: (_: any, record: AnswerlatticeEntity) => (
                entitySearchIndexed.has(record.id)
                    ? <Tag color="green" icon={<LuSearch style={{ verticalAlign: 'middle', marginRight: 2 }} />}>Yes</Tag>
                    : <Tag color="default">No</Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 130,
            render: (_: any, record: AnswerlatticeEntity) => (
                <Space>
                    <Button type="text" icon={<LuEye />} onClick={() => openDetail(record)} size="small" />
                    {record.status !== 'deprecated' && (
                        <Button type="text" icon={<LuPencil />} onClick={() => { openDetail(record); setEditMode(true); }} size="small" />
                    )}
                    {record.status !== 'deprecated' && (
                        <Popconfirm
                            title="Deprecate entity?"
                            description="Trusted answers, support content, Product Pages & Flows, and topic connections must be reassigned first."
                            onConfirm={() => handleDeprecate(record.id)}
                            okText="Deprecate"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" icon={<LuArchive />} danger size="small" loading={saving} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card>
                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message={error}
                        action={<Button size="small" onClick={refresh}>Retry</Button>}
                        style={{ marginBottom: 16 }}
                    />
                )}
                <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Space>
                        <Title level={5} style={{ margin: 0 }}>{ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productTopics}</Title>
                        <Badge count={entities.length} style={{ backgroundColor: token.colorPrimary }} />
                    </Space>
                    <Space>
                        <Input
                            placeholder="Search product topics..."
                            prefix={<LuSearch />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                            style={{ width: 200 }}
                        />
                        <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading} type="text" />
                        <Button type="primary" icon={<LuPlus />} onClick={() => setCreateModalOpen(true)}>
                            New Topic
                        </Button>
                    </Space>
                </Flex>

                {/* Type summary badges */}
                <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
                    {Object.entries(typeCounts).map(([type, count]) => (
                        <Tag key={type} color={TYPE_COLORS[type] || 'default'}>
                            {type}: {count}
                        </Tag>
                    ))}
                    <Tag color="default">
                        Relations: {relations.length}
                    </Tag>
                    <Tag color="default">
                        Search Index: {searchIndex.length}
                    </Tag>
                </Flex>

                <Table
                    dataSource={filteredEntities}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{
                        emptyText: (
                            <Empty
                                description="No product topics yet. Add the first feature, plan, role, workflow, state, integration, or error."
                                image={entities.length === 0 && !searchText ? (
                                    <ContextualStateIllustration
                                        color={token.colorPrimary}
                                        size={96}
                                        treatment="softHalo"
                                        variant="roleStructureContext"
                                    />
                                ) : Empty.PRESENTED_IMAGE_SIMPLE}
                                imageStyle={{ height: 96 }}
                            />
                        ),
                    }}
                />
            </Card>

            {/* Detail/Edit Drawer */}
            <Drawer
                title={editMode ? 'Edit Product Topic' : 'Product Topic Detail'}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setEditMode(false); }}
                width={isMobile ? '100%' : 560}
                extra={
                    editMode ? (
                        <Space>
                            <Button onClick={() => setEditMode(false)}>Cancel</Button>
                            <Button type="primary" onClick={handleSave} loading={saving}>Save</Button>
                        </Space>
                    ) : (
                        selectedEntity?.status !== 'deprecated'
                            ? <Button icon={<LuPencil />} onClick={() => setEditMode(true)}>Edit</Button>
                            : null
                    )
                }
            >
                {selectedEntity && !editMode && (
                    <Flex vertical gap={16}>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Name">{selectedEntity.name}</Descriptions.Item>
                            <Descriptions.Item label="Slug"><Text code>{selectedEntity.slug}</Text></Descriptions.Item>
                            <Descriptions.Item label="Type">
                                <Tag color={TYPE_COLORS[selectedEntity.type]}>{selectedEntity.type}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag color={STATUS_COLORS[selectedEntity.status]}>{selectedEntity.status}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Version">
                                {denormalizeVersion(selectedEntity.currentVersion)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Description">
                                {selectedEntity.description}
                            </Descriptions.Item>
                            <Descriptions.Item label="Aliases">
                                {selectedEntity.aliases?.length
                                    ? selectedEntity.aliases.map(alias => <Tag key={alias}>{alias}</Tag>)
                                    : <Text type="secondary">None</Text>}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Relations */}
                        <Card size="small" title={<Space><LuLink /> Connections ({entityRelationCounts.get(selectedEntity.id) || 0})</Space>}>
                            {relations
                                .filter(r => r.fromEntityId === selectedEntity.id || r.toEntityId === selectedEntity.id)
                                .map(r => {
                                    const isFrom = r.fromEntityId === selectedEntity.id;
                                    const otherEntity = entities.find(e => e.id === (isFrom ? r.toEntityId : r.fromEntityId));
                                    return (
                                        <Flex key={r.id} justify="space-between" align="center" gap={8} style={{ marginBottom: 8 }}>
                                            <Tag style={{ margin: 0 }}>
                                                {isFrom ? '→' : '←'} {r.relationType} {otherEntity?.name || 'unknown'}
                                            </Tag>
                                            <Popconfirm
                                                title="Remove relation?"
                                                onConfirm={() => handleRemoveRelation(r.id)}
                                                okText="Remove"
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Button type="text" danger size="small" icon={<LuTrash2 />} loading={saving} />
                                            </Popconfirm>
                                        </Flex>
                                    );
                                })
                            }
                            {(entityRelationCounts.get(selectedEntity.id) || 0) === 0 && (
                                <Text type="secondary">No relations</Text>
                            )}
                            {selectedEntity.status !== 'deprecated' && (
                                <Form form={relationForm} layout="vertical" style={{ marginTop: 12 }}>
                                    <Form.Item
                                        name="relationType"
                                        label="Relation"
                                        rules={[{ required: true, message: 'Select a relation type' }]}
                                    >
                                        <Select
                                            options={Object.values(ANSWERLATTICE_RELATION_TYPES).map(value => ({
                                                label: value.replaceAll('_', ' '),
                                                value,
                                            }))}
                                            placeholder="Select relation"
                                        />
                                    </Form.Item>
                                    <Form.Item
                                        name="toEntityId"
                                        label="Connected topic"
                                        rules={[{ required: true, message: 'Select a connected topic' }]}
                                    >
                                        <Select
                                            showSearch
                                            optionFilterProp="label"
                                            options={entities
                                                .filter(entity => entity.id !== selectedEntity.id && entity.status !== 'deprecated')
                                                .map(entity => ({ label: `${entity.name} (${entity.type})`, value: entity.id }))}
                                            placeholder="Select target"
                                        />
                                    </Form.Item>
                                    <Button icon={<LuPlus />} onClick={handleAddRelation} loading={saving}>
                                        Add relation
                                    </Button>
                                </Form>
                            )}
                        </Card>

                        {/* Search Index */}
                        <Card size="small" title={<Space><LuSearch /> Search Index</Space>}>
                            {entitySearchIndexed.has(selectedEntity.id) ? (
                                <Tag color="green">Indexed for retrieval</Tag>
                            ) : (
                                <Tag color="default">Not indexed</Tag>
                            )}
                        </Card>

                        {selectedEntity.status !== 'deprecated' && (
                            <Card size="small" title={<Space><LuGitMerge /> Merge Duplicate</Space>}>
                                <Flex vertical gap={8}>
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        value={mergeEntityId}
                                        onChange={setMergeEntityId}
                                        options={entities
                                            .filter(entity => (
                                                entity.id !== selectedEntity.id
                                                && entity.type === selectedEntity.type
                                                && entity.status !== 'deprecated'
                                            ))
                                            .map(entity => ({ label: entity.name, value: entity.id }))}
                                        placeholder="Choose duplicate entity"
                                    />
                                    <Popconfirm
                                        title="Merge this duplicate?"
                                        description="References will move to the current entity and the duplicate will be deprecated."
                                        onConfirm={handleMerge}
                                        okText="Merge"
                                        okButtonProps={{ danger: true }}
                                        disabled={!mergeEntityId}
                                    >
                                        <Button danger icon={<LuGitMerge />} disabled={!mergeEntityId} loading={saving}>
                                            Merge into {selectedEntity.name}
                                        </Button>
                                    </Popconfirm>
                                </Flex>
                            </Card>
                        )}
                    </Flex>
                )}

                {selectedEntity && editMode && (
                    <Form form={form} layout="vertical">
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                            <Input.TextArea rows={3} />
                        </Form.Item>
                        <Form.Item name="aliases" label="Aliases">
                            <Select
                                mode="tags"
                                tokenSeparators={[',']}
                                maxCount={20}
                                placeholder="Add alternate names"
                            />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select options={[
                                { label: 'Active', value: 'active' },
                                { label: 'Beta', value: 'beta' },
                            ]} />
                        </Form.Item>
                    </Form>
                )}
            </Drawer>

            {/* Create Modal */}
            <Modal
                title="Create Entity"
                open={createModalOpen}
                onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
                onOk={handleCreate}
                okText="Create"
                confirmLoading={saving}
                width={isMobile ? 'calc(100vw - 24px)' : 500}
            >
                <Form form={createForm} layout="vertical">
                    <Form.Item name="name" label="Entity Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., SSO Integration" />
                    </Form.Item>
                    <Form.Item name="type" label="Entity Type" rules={[{ required: true }]}>
                        <Select options={ENTITY_TYPE_OPTIONS} placeholder="Select type" />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                        <Input.TextArea rows={3} placeholder="What this entity represents" />
                    </Form.Item>
                    <Form.Item name="aliases" label="Aliases">
                        <Select
                            mode="tags"
                            tokenSeparators={[',']}
                            maxCount={20}
                            placeholder="Add alternate names"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}
