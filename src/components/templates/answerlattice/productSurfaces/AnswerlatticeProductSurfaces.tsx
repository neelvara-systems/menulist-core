'use client';

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
import { getEntities } from '@database/answerlattice/entities';
import {
    archiveProductSurface,
    assertAnswerlatticeProductSurfaceArchiveSucceeded,
    assertAnswerlatticeProductSurfaceWriteSucceeded,
    getProductSurfaceContentSummaryForSession,
    getProductSurfacesForSession,
    rebuildProductSurfaceContentSummary,
    saveProductSurface,
} from '@database/answerlattice/productSurfaces';
import { ANSWERLATTICE_SURFACE_TEMPLATES, type AnswerlatticeSurfaceTemplate } from '@data/answerlattice/surfaceTemplates';
import { buildSurfaceKeyFromLabel, normalizeSurfaceKey } from '@lib/answerlattice/productSurfaceContent';
import type { AnswerlatticeEntity, AnswerlatticeProductSurface, AnswerlatticeSurfaceContentItem, AnswerlatticeSurfaceContentSummary } from '@type/answerlattice';
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
    theme,
} from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArchive, LuBookOpen, LuHelpCircle, LuLayers, LuPlus, LuRefreshCw, LuSave, LuSparkles, LuTicket } from 'react-icons/lu';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { useAnswerlatticePublicContentRequestScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';

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

const ANSWERLATTICE_PRODUCT_SURFACES_LOAD_FAILED = 'Could not load Product Pages & Flows';
const ANSWERLATTICE_PRODUCT_SURFACE_SAVE_FAILED = 'Could not save product surface';
const ANSWERLATTICE_PRODUCT_SURFACE_ARCHIVE_FAILED = 'Could not archive product surface';
const ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED = 'Could not rebuild context summary';
const ANSWERLATTICE_PRODUCT_SURFACE_TEMPLATES_APPLY_FAILED = 'Could not apply starter surfaces';

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
    summary: AnswerlatticeSurfaceContentSummary | null,
    surface?: AnswerlatticeProductSurface | null,
): AnswerlatticeSurfaceContentItem | null => {
    if (!summary?.surfaces || !surface?.key) return null;
    return summary.surfaces[surface.key] || null;
};

export default function AnswerlatticeProductSurfaces() {
    const session = useClientAuthSession();
    const requestScope = useAnswerlatticePublicContentRequestScope();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [applyingTemplates, setApplyingTemplates] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);
    const [surfaces, setSurfaces] = useState<AnswerlatticeProductSurface[]>([]);
    const [entities, setEntities] = useState<AnswerlatticeEntity[]>([]);
    const [summary, setSummary] = useState<AnswerlatticeSurfaceContentSummary | null>(null);
    const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);

    const selectedSurface = useMemo(
        () => surfaces.find(surface => surface.id === selectedSurfaceId) || null,
        [selectedSurfaceId, surfaces],
    );

    const selectedSummary = useMemo(
        () => getSurfaceSummary(summary, selectedSurface),
        [selectedSurface, summary],
    );

    const existingTemplateKeys = useMemo(
        () => new Set(surfaces.map(surface => surface.key)),
        [surfaces],
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
        } catch {
            message.error(ANSWERLATTICE_PRODUCT_SURFACES_LOAD_FAILED);
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
        const operationScope = requestScope;
        setSaving(true);
        try {
            if (!operationScope) throw new Error('Answerlattice workspace is not available.');
            const values = await form.validateFields();
            const key = normalizeSurfaceKey(values.key) || buildSurfaceKeyFromLabel(values.label);
            const saved = await saveProductSurface({
                ...values,
                id: selectedSurface?.id,
                key,
            });
            assertAnswerlatticeProductSurfaceWriteSucceeded(
                saved,
                selectedSurface?.id,
                'answerlattice_product_surface_management_save_rejected',
            );
            setSelectedSurfaceId(saved.id || null);
            await rebuildProductSurfaceContentSummary(operationScope);
            await loadData();
            message.success('Product surface saved');
        } catch {
            message.error(ANSWERLATTICE_PRODUCT_SURFACE_SAVE_FAILED);
        } finally {
            setSaving(false);
        }
    }, [form, loadData, requestScope, selectedSurface?.id]);

    const handleArchive = useCallback(async () => {
        if (!selectedSurface) return;
        const operationScope = requestScope;
        setSaving(true);
        try {
            if (!operationScope) throw new Error('Answerlattice workspace is not available.');
            const archived = await archiveProductSurface(selectedSurface);
            assertAnswerlatticeProductSurfaceArchiveSucceeded(
                archived,
                selectedSurface.id,
                'answerlattice_product_surface_management_archive_rejected',
            );
            await rebuildProductSurfaceContentSummary(operationScope);
            await loadData();
            message.success('Product surface archived');
        } catch {
            message.error(ANSWERLATTICE_PRODUCT_SURFACE_ARCHIVE_FAILED);
        } finally {
            setSaving(false);
        }
    }, [loadData, requestScope, selectedSurface]);

    const handleRebuild = useCallback(async () => {
        const operationScope = requestScope;
        setRebuilding(true);
        try {
            if (!operationScope) throw new Error('Answerlattice workspace is not available.');
            const nextSummary = await rebuildProductSurfaceContentSummary(operationScope);
            setSummary(nextSummary || null);
            message.success('Context summary rebuilt');
        } catch {
            message.error(ANSWERLATTICE_PRODUCT_SURFACE_SUMMARY_REBUILD_FAILED);
        } finally {
            setRebuilding(false);
        }
    }, [requestScope]);

    const saveTemplates = useCallback(async (templates: AnswerlatticeSurfaceTemplate[]) => {
        const operationScope = requestScope;
        const missingTemplates = templates.filter(template => !existingTemplateKeys.has(template.key));
        if (missingTemplates.length === 0) {
            message.info('Those starter surfaces already exist');
            return;
        }

        setApplyingTemplates(true);
        try {
            if (!operationScope) throw new Error('Answerlattice workspace is not available.');
            const saved = [];
            for (const template of missingTemplates) {
                const result = await saveProductSurface({
                    key: template.key,
                    label: template.label,
                    description: template.description,
                    routePatterns: template.routePatterns,
                    feature: template.feature,
                    page: template.page,
                    workflow: template.workflow,
                    entityHints: template.entityHints,
                    tags: template.tags,
                    priority: template.priority,
                    visibility: template.visibility,
                    active: true,
                });
                assertAnswerlatticeProductSurfaceWriteSucceeded(
                    result,
                    null,
                    'answerlattice_product_surface_templates_apply_rejected',
                );
                saved.push(result);
            }
            await rebuildProductSurfaceContentSummary(operationScope);
            await loadData();
            setSelectedSurfaceId(saved[0]?.id || null);
            message.success(`${saved.length} starter surface${saved.length === 1 ? '' : 's'} added`);
        } catch {
            message.error(ANSWERLATTICE_PRODUCT_SURFACE_TEMPLATES_APPLY_FAILED);
        } finally {
            setApplyingTemplates(false);
        }
    }, [existingTemplateKeys, loadData, requestScope]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) return null;

    const addMissingTemplatesButton = (
        <Button
            block={isMobile}
            icon={<LuSparkles />}
            loading={applyingTemplates}
            onClick={() => saveTemplates(ANSWERLATTICE_SURFACE_TEMPLATES)}
            size={isMobile ? 'middle' : 'small'}
            style={{ minHeight: 44 }}
        >
            Add missing templates
        </Button>
    );

    return (
        <div style={{ padding: isMobile ? '16px 16px calc(16px + env(safe-area-inset-bottom))' : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>{ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productPagesAndFlows}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 760 }}>
                        Connect customer pages and workflows to product topics, help content, releases, and support evidence so answers match where the customer is working.
                    </Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<LuPlus />} onClick={handleNewSurface}>New Page or Flow</Button>
                    <Button icon={<LuRefreshCw />} loading={rebuilding} onClick={handleRebuild}>Refresh Support Context</Button>
                </Space>
            </Flex>

            <Alert
                showIcon
                type="info"
                style={{ marginTop: 16, marginBottom: 16 }}
                message="Use stable context keys in your app"
                description="For example, pass contextKey: billing_invoices from the billing route. Answerlattice then prefers the articles, release notes, Product Topics, and ticket evidence connected to that product area."
            />

            {loading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <>
                    <Card
                        title={<Flex align="center" gap={8}><LuSparkles /> Starter pages and flows</Flex>}
                        extra={!isMobile ? addMissingTemplatesButton : null}
                        style={{ marginBottom: 16 }}
                    >
                        <Paragraph type="secondary" style={{ marginTop: 0 }}>
                            Add the common product pages most SaaS apps support first. Starter questions remain prompts for owner-reviewed articles, FAQs, and approved answers.
                        </Paragraph>
                        {isMobile ? (
                            <Flex style={{ marginBottom: 12 }}>
                                {addMissingTemplatesButton}
                            </Flex>
                        ) : null}
                        <Row gutter={[12, 12]}>
                            {ANSWERLATTICE_SURFACE_TEMPLATES.map((template) => {
                                const exists = existingTemplateKeys.has(template.key);
                                return (
                                    <Col xs={24} md={12} xl={8} key={template.key}>
                                        <Card
                                            size="small"
                                            title={template.label}
                                            extra={<Tag color={exists ? 'success' : 'processing'}>{exists ? 'Added' : template.key}</Tag>}
                                            actions={[
                                                <Button
                                                    key="apply"
                                                    type="link"
                                                    size="small"
                                                    disabled={exists}
                                                    loading={applyingTemplates}
                                                    onClick={() => saveTemplates([template])}
                                                    style={{ minHeight: isMobile ? 44 : undefined }}
                                                >
                                                    Add template
                                                </Button>,
                                            ]}
                                        >
                                            <Paragraph type="secondary" style={{ minHeight: 62 }}>
                                                {template.description}
                                            </Paragraph>
                                            <Space size={[4, 4]} wrap>
                                                {template.starterQuestions.slice(0, 2).map(question => (
                                                    <Tag key={question}>{question}</Tag>
                                                ))}
                                            </Space>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    </Card>

                    <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <Card title="Pages &amp; Flows" extra={<Tag>{surfaces.length}</Tag>} styles={{ body: { padding: 0 } }}>
                            {surfaces.length === 0 ? (
                                <Empty
                                    description="No product pages or flows yet"
                                    image={(
                                        <ContextualStateIllustration
                                            color={token.colorPrimary}
                                            size={104}
                                            treatment="softHalo"
                                            variant="roleStructureContext"
                                        />
                                    )}
                                    styles={{ image: { height: 104 } }}
                                    style={{ padding: 24 }}
                                />
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
                                                    background: active ? token.colorPrimaryBg : undefined,
                                                    borderLeft: active ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={<LuLayers style={{ marginTop: 4, color: active ? token.colorPrimary : token.colorTextSecondary }} />}
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
                                                            <Input
                                                                disabled={Boolean(selectedSurface)}
                                                                placeholder="billing_invoices"
                                                                title={selectedSurface ? 'Context keys stay fixed after creation so installed clients and answer mappings do not break.' : undefined}
                                                            />
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
                                                <Form.Item name="entityIds" label="Product Topics">
                                                    <Select mode="multiple" options={entityOptions} placeholder="Connect Answerlattice Product Topics" />
                                                </Form.Item>
                                                <Row gutter={12}>
                                                    <Col xs={24} md={12}>
                                                        <Form.Item name="entityHints" label="Topic hints">
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
                </>
            )}
        </div>
    );
}
