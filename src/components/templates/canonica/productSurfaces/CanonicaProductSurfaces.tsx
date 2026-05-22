'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getEntities } from '@database/canonica/entities';
import {
    archiveProductSurface,
    getProductSurfaceContentSummaryForSession,
    getProductSurfacesForSession,
    rebuildProductSurfaceContentSummary,
    saveProductSurface,
} from '@database/canonica/productSurfaces';
import { buildSurfaceKeyFromLabel, normalizeSurfaceKey } from '@lib/canonica/productSurfaceContent';
import type { CanonicaEntity, CanonicaProductSurface, CanonicaSurfaceContentItem, CanonicaSurfaceContentSummary } from '@type/canonica';
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Flex,
    Form,
    Grid,
    Input,
    InputNumber,
    List,
    message,
    Popconfirm,
    Row,
    Select,
    Skeleton,
    Space,
    Switch,
    Tabs,
    Tag,
    Typography,
} from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArchive, LuBookOpen, LuHelpCircle, LuLayers, LuPlus, LuRefreshCw, LuSave, LuTicket } from 'react-icons/lu';
import { useClientAuthSession } from '@hook/useClientAuthSession';

const { Paragraph, Text, Title } = Typography;

const DEFAULT_SURFACE_VALUES = {
    active: true,
    priority: 100,
    visibility: {
        helpWidget: true,
        helpCenter: true,
        changelog: true,
    },
};

const getTimeLabel = (value: any) => {
    if (!value) return 'Not built yet';
    const date = typeof value.toDate === 'function'
        ? value.toDate()
        : value instanceof Timestamp
            ? value.toDate()
            : new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not built yet' : date.toLocaleString();
};

const getSurfaceSummary = (
    summary: CanonicaSurfaceContentSummary | null,
    surface?: CanonicaProductSurface | null,
): CanonicaSurfaceContentItem | null => {
    if (!summary?.surfaces || !surface?.key) return null;
    return summary.surfaces[surface.key] || null;
};

export default function CanonicaProductSurfaces() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);
    const [surfaces, setSurfaces] = useState<CanonicaProductSurface[]>([]);
    const [entities, setEntities] = useState<CanonicaEntity[]>([]);
    const [summary, setSummary] = useState<CanonicaSurfaceContentSummary | null>(null);
    const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);

    const selectedSurface = useMemo(
        () => surfaces.find(surface => surface.id === selectedSurfaceId) || null,
        [selectedSurfaceId, surfaces],
    );

    const selectedSummary = useMemo(
        () => getSurfaceSummary(summary, selectedSurface),
        [selectedSurface, summary],
    );

    const entityOptions = useMemo(
        () => entities.map(entity => ({
            label: `${entity.name} (${entity.type})`,
            value: entity.id,
        })),
        [entities],
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const tId = Number(session?.tId);
            const sId = Number(session?.sId);
            const [surfaceList, entityList, contentSummary] = await Promise.all([
                getProductSurfacesForSession(),
                Number.isFinite(tId) && Number.isFinite(sId) && tId > 0 && sId > 0 ? getEntities(tId, sId) : Promise.resolve([]),
                getProductSurfaceContentSummaryForSession(),
            ]);
            setSurfaces(surfaceList || []);
            setEntities(entityList || []);
            setSummary(contentSummary || null);
            setSelectedSurfaceId(prev => prev && surfaceList?.some(surface => surface.id === prev)
                ? prev
                : surfaceList?.[0]?.id || null);
        } catch (error: any) {
            message.error(error?.message || 'Failed to load product surfaces');
        } finally {
            setLoading(false);
        }
    }, [session?.sId, session?.tId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!selectedSurface) {
            form.setFieldsValue(DEFAULT_SURFACE_VALUES);
            return;
        }
        form.setFieldsValue({
            ...selectedSurface,
            routePatterns: selectedSurface.routePatterns || [],
            entityHints: selectedSurface.entityHints || [],
            entityIds: selectedSurface.entityIds || [],
            tags: selectedSurface.tags || [],
            visibility: selectedSurface.visibility || DEFAULT_SURFACE_VALUES.visibility,
        });
    }, [form, selectedSurface]);

    const handleNewSurface = useCallback(() => {
        setSelectedSurfaceId(null);
        form.resetFields();
        form.setFieldsValue(DEFAULT_SURFACE_VALUES);
    }, [form]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const values = await form.validateFields();
            const key = normalizeSurfaceKey(values.key) || buildSurfaceKeyFromLabel(values.label);
            const saved = await saveProductSurface({
                ...values,
                id: selectedSurface?.id,
                key,
            });
            setSelectedSurfaceId(saved.id || null);
            await rebuildProductSurfaceContentSummary();
            await loadData();
            message.success('Product surface saved');
        } catch (error: any) {
            message.error(error?.message || 'Failed to save product surface');
        } finally {
            setSaving(false);
        }
    }, [form, loadData, selectedSurface?.id]);

    const handleArchive = useCallback(async () => {
        if (!selectedSurface) return;
        setSaving(true);
        try {
            await archiveProductSurface(selectedSurface);
            await rebuildProductSurfaceContentSummary();
            await loadData();
            message.success('Product surface archived');
        } catch (error: any) {
            message.error(error?.message || 'Failed to archive product surface');
        } finally {
            setSaving(false);
        }
    }, [loadData, selectedSurface]);

    const handleRebuild = useCallback(async () => {
        setRebuilding(true);
        try {
            const nextSummary = await rebuildProductSurfaceContentSummary();
            setSummary(nextSummary || null);
            message.success('Context summary rebuilt');
        } catch (error: any) {
            message.error(error?.message || 'Failed to rebuild context summary');
        } finally {
            setRebuilding(false);
        }
    }, []);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_PRODUCT_SURFACES) return null;

    return (
        <div style={{ padding: isMobile ? 16 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>Product Surfaces</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 760 }}>
                        Connect pages, workflows, entities, articles, changelogs, and tickets so Canonica can answer in the right product context.
                    </Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<LuPlus />} onClick={handleNewSurface}>New Surface</Button>
                    <Button icon={<LuRefreshCw />} loading={rebuilding} onClick={handleRebuild}>Rebuild Summary</Button>
                </Space>
            </Flex>

            <Alert
                showIcon
                type="info"
                style={{ marginTop: 16, marginBottom: 16 }}
                message="Use stable context keys in your app"
                description="For example, pass contextKey: billing_invoices from the billing route. Canonica then prefers the articles, release notes, entities, and ticket signals connected to that product area."
            />

            {loading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <Card title="Surface Directory" extra={<Tag>{surfaces.length}</Tag>} styles={{ body: { padding: 0 } }}>
                            {surfaces.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No product surfaces yet" style={{ padding: 24 }} />
                            ) : (
                                <List
                                    dataSource={surfaces}
                                    renderItem={(surface) => {
                                        const active = selectedSurfaceId === surface.id;
                                        const itemSummary = getSurfaceSummary(summary, surface);
                                        return (
                                            <List.Item
                                                onClick={() => setSelectedSurfaceId(surface.id || null)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: 14,
                                                    background: active ? '#eef2ff' : undefined,
                                                    borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={<LuLayers style={{ marginTop: 4, color: active ? '#4338ca' : '#64748b' }} />}
                                                    title={<Flex justify="space-between" gap={8}><Text strong>{surface.label}</Text>{surface.active === false && <Tag>Archived</Tag>}</Flex>}
                                                    description={(
                                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                            <Text type="secondary" style={{ fontSize: 12 }}>{surface.key}</Text>
                                                            <Flex wrap="wrap" gap={4}>
                                                                {(surface.routePatterns || []).slice(0, 2).map(route => <Tag key={route}>{route}</Tag>)}
                                                                {(surface.routePatterns || []).length > 2 && <Tag>+{(surface.routePatterns || []).length - 2}</Tag>}
                                                            </Flex>
                                                            {itemSummary && (
                                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                                    {itemSummary.articles?.length || 0} articles · {itemSummary.faqs?.length || 0} FAQs · {itemSummary.changelogs?.length || 0} releases · {itemSummary.tickets?.total || 0} tickets
                                                                </Text>
                                                            )}
                                                        </Space>
                                                    )}
                                                />
                                            </List.Item>
                                        );
                                    }}
                                />
                            )}
                        </Card>
                    </Col>

                    <Col xs={24} lg={16}>
                        <Tabs
                            defaultActiveKey="settings"
                            items={[
                                {
                                    key: 'settings',
                                    label: 'Configuration',
                                    children: (
                                        <Card>
                                            <Form
                                                form={form}
                                                layout="vertical"
                                                initialValues={DEFAULT_SURFACE_VALUES}
                                            >
                                                <Row gutter={12}>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item name="label" label="Surface name" rules={[{ required: true, message: 'Surface name is required' }]}>
                                                            <Input placeholder="Billing invoices" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item name="key" label="Context key">
                                                            <Input placeholder="billing_invoices" />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                                <Form.Item name="description" label="Internal description">
                                                    <Input.TextArea rows={2} placeholder="What this page/workflow represents" />
                                                </Form.Item>
                                                <Form.Item name="routePatterns" label="Route patterns">
                                                    <Select mode="tags" tokenSeparators={[',']} placeholder="/billing, /billing/*" />
                                                </Form.Item>
                                                <Row gutter={12}>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name="feature" label="Feature">
                                                            <Input placeholder="billing" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name="page" label="Page">
                                                            <Input placeholder="invoices" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name="workflow" label="Workflow">
                                                            <Input placeholder="pay_invoice" />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                                <Form.Item name="entityIds" label="Product entities">
                                                    <Select mode="multiple" options={entityOptions} placeholder="Bind Canonica product entities" />
                                                </Form.Item>
                                                <Row gutter={12}>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item name="entityHints" label="Entity hints">
                                                            <Select mode="tags" tokenSeparators={[',']} placeholder="invoice, payment, subscription" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item name="tags" label="Content tags">
                                                            <Select mode="tags" tokenSeparators={[',']} placeholder="billing, plan" />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                                <Row gutter={12}>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name={['visibility', 'helpWidget']} label="Widget" valuePropName="checked">
                                                            <Switch />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name={['visibility', 'helpCenter']} label="Help Center" valuePropName="checked">
                                                            <Switch />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name={['visibility', 'changelog']} label="Changelog" valuePropName="checked">
                                                            <Switch />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                                <Row gutter={12}>
                                                    <Col xs={12} md={8}>
                                                        <Form.Item name="priority" label="Priority">
                                                            <InputNumber min={0} max={999} style={{ width: '100%' }} />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12} md={8}>
                                                        <Form.Item name="active" label="Active" valuePropName="checked">
                                                            <Switch />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                            </Form>
                                            <Flex justify="space-between" gap={8} wrap="wrap">
                                                <Popconfirm title="Archive this surface?" okText="Archive" onConfirm={handleArchive} disabled={!selectedSurface}>
                                                    <Button danger disabled={!selectedSurface} icon={<LuArchive />}>Archive</Button>
                                                </Popconfirm>
                                                <Button type="primary" loading={saving} icon={<LuSave />} onClick={handleSave}>Save Surface</Button>
                                            </Flex>
                                        </Card>
                                    ),
                                },
                                {
                                    key: 'preview',
                                    label: 'Related Content',
                                    children: (
                                        <Card>
                                            <Flex justify="space-between" align="center" gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
                                                <div>
                                                    <Text strong>{selectedSurface?.label || 'No surface selected'}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 12 }}>Summary generated: {getTimeLabel(summary?.generatedAt)}</Text>
                                                </div>
                                                <Button icon={<LuRefreshCw />} loading={rebuilding} onClick={handleRebuild}>Rebuild</Button>
                                            </Flex>
                                            {!selectedSummary ? (
                                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No related content found for this surface yet" />
                                            ) : (
                                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                                    <div>
                                                        <Text strong><LuBookOpen /> Articles</Text>
                                                        <List
                                                            size="small"
                                                            dataSource={selectedSummary.articles || []}
                                                            locale={{ emptyText: 'No linked articles' }}
                                                            renderItem={article => <List.Item>{article.title}</List.Item>}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Text strong><LuHelpCircle /> FAQs</Text>
                                                        <List
                                                            size="small"
                                                            dataSource={selectedSummary.faqs || []}
                                                            locale={{ emptyText: 'No linked FAQs' }}
                                                            renderItem={faq => <List.Item>{faq.question}</List.Item>}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Text strong>Changelog</Text>
                                                        <List
                                                            size="small"
                                                            dataSource={selectedSummary.changelogs || []}
                                                            locale={{ emptyText: 'No linked release notes' }}
                                                            renderItem={entry => <List.Item>{entry.title}</List.Item>}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Text strong><LuTicket /> Ticket Signals</Text>
                                                        <Paragraph type="secondary" style={{ margin: '6px 0 0 0' }}>
                                                            {selectedSummary.tickets?.open || 0} open / {selectedSummary.tickets?.total || 0} total. Recent: {(selectedSummary.tickets?.recentDisplayIds || []).join(', ') || 'none'}
                                                        </Paragraph>
                                                    </div>
                                                </Space>
                                            )}
                                        </Card>
                                    ),
                                },
                            ]}
                        />
                    </Col>
                </Row>
            )}
        </div>
    );
}
