'use client'

/**
 * Canonica — Entity Management Dashboard
 * 
 * List/create/edit/deprecate entities, view relationships and search index.
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (Pillar 1)
 */

import { FEATURE_FLAGS } from '@config/features';
import { useEntities } from '@hook/canonica/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    CANONICA_ENTITY_STATUS,
    CANONICA_ENTITY_TYPES,
    CanonicaEntity,
    CanonicaEntityType,
    denormalizeVersion,
} from '@type/canonica';
import {
    Badge,
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
    LuLink,
    LuPencil,
    LuPlus,
    LuRefreshCw,
    LuSearch,
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

const ENTITY_TYPE_OPTIONS = Object.entries(CANONICA_ENTITY_TYPES).map(([key, value]) => ({
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
        entities, relations, searchIndex, loading, refresh,
        selectedEntity, setSelectedEntity,
        create, update, deprecate,
    } = useEntities(tId, sId);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const [createForm] = Form.useForm();

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

    const openDetail = useCallback((entity: CanonicaEntity) => {
        setSelectedEntity(entity);
        setDrawerOpen(true);
        setEditMode(false);
        form.setFieldsValue({
            name: entity.name,
            description: entity.description,
            status: entity.status,
        });
    }, [form, setSelectedEntity]);

    const handleSave = useCallback(async () => {
        if (!selectedEntity) return;
        try {
            const values = await form.validateFields();
            await update({
                id: selectedEntity.id,
                name: values.name,
                description: values.description,
                status: values.status,
            });
            setEditMode(false);
            setDrawerOpen(false);
        } catch {
            // form validation
        }
    }, [selectedEntity, form, update]);

    const handleCreate = useCallback(async () => {
        try {
            const values = await createForm.validateFields();
            const slug = values.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
            await create({
                tId, sId,
                name: values.name,
                slug,
                type: values.type as CanonicaEntityType,
                description: values.description,
                status: CANONICA_ENTITY_STATUS.ACTIVE,
                currentVersion: 1000000, // v1.0.0
            });
            setCreateModalOpen(false);
            createForm.resetFields();
        } catch {
            // form validation
        }
    }, [tId, sId, createForm, create]);

    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        entities.forEach(e => {
            counts[e.type] = (counts[e.type] || 0) + 1;
        });
        return counts;
    }, [entities]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI) return null;

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: CanonicaEntity) => (
                <Text strong style={{ cursor: 'pointer' }} onClick={() => openDetail(record)}>
                    {name}
                </Text>
            ),
            sorter: (a: CanonicaEntity, b: CanonicaEntity) => a.name.localeCompare(b.name),
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
            onFilter: (value: any, record: CanonicaEntity) => record.type === value,
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
            onFilter: (value: any, record: CanonicaEntity) => record.status === value,
        },
        {
            title: 'Version',
            key: 'version',
            width: 80,
            render: (_: any, record: CanonicaEntity) => (
                <Text type="secondary">{denormalizeVersion(record.currentVersion)}</Text>
            ),
        },
        {
            title: 'Relations',
            key: 'relations',
            width: 80,
            render: (_: any, record: CanonicaEntity) => {
                const count = entityRelationCounts.get(record.id) || 0;
                return count > 0 ? <Badge count={count} style={{ backgroundColor: token.colorPrimary }} /> : <Text type="secondary">0</Text>;
            },
        },
        {
            title: 'Indexed',
            key: 'indexed',
            width: 70,
            render: (_: any, record: CanonicaEntity) => (
                entitySearchIndexed.has(record.id)
                    ? <Tag color="green" icon={<LuSearch style={{ verticalAlign: 'middle', marginRight: 2 }} />}>Yes</Tag>
                    : <Tag color="default">No</Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 130,
            render: (_: any, record: CanonicaEntity) => (
                <Space>
                    <Button type="text" icon={<LuEye />} onClick={() => openDetail(record)} size="small" />
                    <Button type="text" icon={<LuPencil />} onClick={() => { openDetail(record); setEditMode(true); }} size="small" />
                    {record.status !== 'deprecated' && (
                        <Popconfirm
                            title="Deprecate entity?"
                            description="Active canonical answers must be reassigned first."
                            onConfirm={() => deprecate(record.id)}
                            okText="Deprecate"
                            okButtonProps={{ danger: true }}
                        >
                            <Button type="text" icon={<LuArchive />} danger size="small" />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <Card>
                <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Space>
                        <Title level={5} style={{ margin: 0 }}>Product Ontology</Title>
                        <Badge count={entities.length} style={{ backgroundColor: token.colorPrimary }} />
                    </Space>
                    <Space>
                        <Input
                            placeholder="Search entities..."
                            prefix={<LuSearch />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                            style={{ width: 200 }}
                        />
                        <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading} type="text" />
                        <Button type="primary" icon={<LuPlus />} onClick={() => setCreateModalOpen(true)}>
                            New Entity
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
                    locale={{ emptyText: <Empty description="No entities yet. Create your first product entity." /> }}
                />
            </Card>

            {/* Detail/Edit Drawer */}
            <Drawer
                title={editMode ? 'Edit Entity' : 'Entity Detail'}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setEditMode(false); }}
                width={isMobile ? '100%' : 560}
                extra={
                    editMode ? (
                        <Space>
                            <Button onClick={() => setEditMode(false)}>Cancel</Button>
                            <Button type="primary" onClick={handleSave}>Save</Button>
                        </Space>
                    ) : (
                        <Button icon={<LuPencil />} onClick={() => setEditMode(true)}>Edit</Button>
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
                        </Descriptions>

                        {/* Relations */}
                        <Card size="small" title={<Space><LuLink /> Relations ({entityRelationCounts.get(selectedEntity.id) || 0})</Space>}>
                            {relations
                                .filter(r => r.fromEntityId === selectedEntity.id || r.toEntityId === selectedEntity.id)
                                .map(r => {
                                    const isFrom = r.fromEntityId === selectedEntity.id;
                                    const otherEntity = entities.find(e => e.id === (isFrom ? r.toEntityId : r.fromEntityId));
                                    return (
                                        <Tag key={r.id} style={{ marginBottom: 4 }}>
                                            {isFrom ? '→' : '←'} {r.relationType} {otherEntity?.name || 'unknown'}
                                        </Tag>
                                    );
                                })
                            }
                            {(entityRelationCounts.get(selectedEntity.id) || 0) === 0 && (
                                <Text type="secondary">No relations</Text>
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
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select options={[
                                { label: 'Active', value: 'active' },
                                { label: 'Beta', value: 'beta' },
                                { label: 'Deprecated', value: 'deprecated' },
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
                </Form>
            </Modal>
        </>
    );
}
