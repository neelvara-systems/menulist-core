'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getEntities } from '@database/answerlattice/entities';
import {
    archiveFaq,
    getFaqsForSession,
    saveFaq,
} from '@database/answerlattice/faqs';
import {
    getProductSurfacesForSession,
    rebuildProductSurfaceContentSummary,
} from '@database/answerlattice/productSurfaces';
import { getCategories } from '@database/knowledgeBase/categories';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getAnswerlatticeUiErrorMessage } from '@lib/answerlattice/uiErrors';
import {
    ANSWERLATTICE_FAQ_SOURCE,
    ANSWERLATTICE_FAQ_STATUS,
    type AnswerlatticeEntity,
    type AnswerlatticeFaq,
    type AnswerlatticeProductSurface,
} from '@type/answerlattice';
import type { KnowledgeBaseArticleMeta, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
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
    Statistic,
    Tabs,
    Tag,
    Typography,
    theme,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuArchive, LuHelpCircle, LuPlus, LuRefreshCw, LuSave } from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;

const DEFAULT_FAQ_VALUES = {
    status: ANSWERLATTICE_FAQ_STATUS.DRAFT,
    source: ANSWERLATTICE_FAQ_SOURCE.MANUAL,
    active: true,
    sortOrder: 100,
    tags: [],
    contextKeys: [],
    entityIds: [],
};

const STATUS_COLORS: Record<string, string> = {
    [ANSWERLATTICE_FAQ_STATUS.DRAFT]: 'default',
    [ANSWERLATTICE_FAQ_STATUS.NEEDS_REVIEW]: 'orange',
    [ANSWERLATTICE_FAQ_STATUS.PUBLISHED]: 'green',
    [ANSWERLATTICE_FAQ_STATUS.ARCHIVED]: 'red',
};

const toDateLabel = (value: any) => {
    if (!value) return 'Never';
    const date = typeof value.toDate === 'function'
        ? value.toDate()
        : typeof value.seconds === 'number'
            ? new Date(value.seconds * 1000)
            : new Date(value);
    return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
};

const getTimestampMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const sortFaqList = (items: AnswerlatticeFaq[]) => [...items].sort((left, right) => (
    Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    || getTimestampMillis(right.modifiedOn) - getTimestampMillis(left.modifiedOn)
    || left.question.localeCompare(right.question)
));

const flattenArticleOptions = (categoriesData?: KnowledgeBaseCategoriesType | null) => {
    const options: Array<{ label: string; value: string; title: string }> = [];
    Object.values(categoriesData?.categories || {}).forEach((category: any) => {
        const addArticle = (article: KnowledgeBaseArticleMeta, prefix: string) => {
            if (!article?.id) return;
            options.push({
                label: `${prefix} / ${article.title}`,
                value: article.id,
                title: article.title,
            });
        };

        (category.articles || []).forEach((article: KnowledgeBaseArticleMeta) => addArticle(article, category.title));
        (category.sections || []).forEach((section: any) => {
            (section.articles || []).forEach((article: KnowledgeBaseArticleMeta) => addArticle(article, `${category.title} / ${section.title}`));
        });
    });
    return options.sort((left, right) => left.label.localeCompare(right.label));
};

export default function AnswerlatticeFaqManagement() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [faqs, setFaqs] = useState<AnswerlatticeFaq[]>([]);
    const [surfaces, setSurfaces] = useState<AnswerlatticeProductSurface[]>([]);
    const [entities, setEntities] = useState<AnswerlatticeEntity[]>([]);
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(null);
    const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null);

    const selectedFaq = useMemo(
        () => faqs.find(faq => faq.id === selectedFaqId) || null,
        [faqs, selectedFaqId],
    );

    const articleOptions = useMemo(() => flattenArticleOptions(categoriesData), [categoriesData]);
    const surfaceOptions = useMemo(
        () => surfaces
            .filter(surface => surface.active !== false)
            .map(surface => ({ label: surface.label, value: surface.key })),
        [surfaces],
    );
    const entityOptions = useMemo(
        () => entities.map(entity => ({ label: `${entity.name} (${entity.type})`, value: entity.id })),
        [entities],
    );

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const tId = Number(session?.tId);
            const sId = Number(session?.sId);
            const [faqList, surfaceList, categories, entityList] = await Promise.all([
                getFaqsForSession(undefined, 150),
                getProductSurfacesForSession(),
                getCategories(),
                Number.isFinite(tId) && Number.isFinite(sId) && tId > 0 && sId > 0 ? getEntities(tId, sId) : Promise.resolve([]),
            ]);

            setFaqs(faqList || []);
            setSurfaces(surfaceList || []);
            setCategoriesData((categories as KnowledgeBaseCategoriesType) || null);
            setEntities(entityList || []);
            setSelectedFaqId(prev => prev && faqList?.some(faq => faq.id === prev)
                ? prev
                : faqList?.[0]?.id || null);
        } catch (error) {
            message.error(getAnswerlatticeUiErrorMessage(error, 'Could not load FAQs'));
        } finally {
            setLoading(false);
        }
    }, [session?.sId, session?.tId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (!selectedFaq) {
            form.resetFields();
            form.setFieldsValue(DEFAULT_FAQ_VALUES);
            return;
        }
        form.setFieldsValue({
            ...DEFAULT_FAQ_VALUES,
            ...selectedFaq,
            tags: selectedFaq.tags || [],
            contextKeys: selectedFaq.contextKeys || [],
            entityIds: selectedFaq.entityIds || [],
        });
    }, [form, selectedFaq]);

    const handleNew = useCallback(() => {
        setSelectedFaqId(null);
        form.resetFields();
        form.setFieldsValue(DEFAULT_FAQ_VALUES);
    }, [form]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const values = await form.validateFields();
            const linkedArticle = articleOptions.find(option => option.value === values.articleId);
            const wasPublished = selectedFaq?.status === ANSWERLATTICE_FAQ_STATUS.PUBLISHED && selectedFaq.active !== false;
            const willBePublished = values.status === ANSWERLATTICE_FAQ_STATUS.PUBLISHED;
            const saved = await saveFaq({
                ...selectedFaq,
                ...values,
                id: selectedFaq?.id,
                active: values.status !== ANSWERLATTICE_FAQ_STATUS.ARCHIVED,
                articleTitle: linkedArticle?.title || values.articleTitle || null,
            });
            const nextFaq = { ...(selectedFaq || {}), ...saved } as AnswerlatticeFaq;
            setFaqs(prev => sortFaqList([
                ...prev.filter(faq => faq.id !== nextFaq.id),
                nextFaq,
            ]));
            setSelectedFaqId(nextFaq.id || null);
            let summaryRefreshFailed = false;
            if (wasPublished || willBePublished) {
                try {
                    await rebuildProductSurfaceContentSummary();
                } catch (summaryError) {
                    summaryRefreshFailed = true;
                    console.error('[Answerlattice FAQ] Product surface summary refresh failed after FAQ save', summaryError);
                }
            }
            if (summaryRefreshFailed) {
                message.warning('FAQ saved, but contextual help refresh failed. Try Refresh after checking product surfaces.');
                return;
            }
            message.success(willBePublished ? 'Answer published' : 'Answer saved');
        } catch (error) {
            message.error(getAnswerlatticeUiErrorMessage(error, 'Could not save FAQ'));
        } finally {
            setSaving(false);
        }
    }, [articleOptions, form, selectedFaq]);

    const handleArchive = useCallback(async () => {
        if (!selectedFaq?.id) return;
        setSaving(true);
        try {
            const wasPublished = selectedFaq.status === ANSWERLATTICE_FAQ_STATUS.PUBLISHED && selectedFaq.active !== false;
            await archiveFaq(selectedFaq.id);
            const nextFaq = { ...selectedFaq, status: ANSWERLATTICE_FAQ_STATUS.ARCHIVED, active: false } as AnswerlatticeFaq;
            setFaqs(prev => sortFaqList(prev.map(faq => faq.id === nextFaq.id ? nextFaq : faq)));
            let summaryRefreshFailed = false;
            if (wasPublished) {
                try {
                    await rebuildProductSurfaceContentSummary();
                } catch (summaryError) {
                    summaryRefreshFailed = true;
                    console.error('[Answerlattice FAQ] Product surface summary refresh failed after FAQ archive', summaryError);
                }
            }
            if (summaryRefreshFailed) {
                message.warning('FAQ archived, but contextual help refresh failed. Try Refresh after checking product surfaces.');
                return;
            }
            message.success('FAQ archived');
        } catch (error) {
            message.error(getAnswerlatticeUiErrorMessage(error, 'Could not archive FAQ'));
        } finally {
            setSaving(false);
        }
    }, [selectedFaq]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT) return null;

    return (
        <div style={{ padding: isMobile ? '16px 16px calc(16px + env(safe-area-inset-bottom))' : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'flex-start' : 'center'} gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ marginBottom: 4 }}>FAQs & custom answers</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 780 }}>
                        Publish owner-approved answers for repeated customer questions. Answerlattice can return these answers before AI fallback when the question matches, with linked articles, product surfaces, and entities attached.
                    </Paragraph>
                </div>
                <Space wrap>
                    <Button icon={<LuPlus />} onClick={handleNew}>New answer</Button>
                    <Button icon={<LuRefreshCw />} onClick={loadData}>Refresh</Button>
                </Space>
            </Flex>

            <Alert
                showIcon
                type="info"
                style={{ marginTop: 16, marginBottom: 16 }}
                message="Custom answers are the fast owner-answer layer"
                description="Use this for short repeated questions, billing explanations, setup notes, and support shortcuts. Keep the detailed explanation in the linked article so users can open the source when they need more context."
            />

            {loading ? (
                <Skeleton active paragraph={{ rows: 8 }} />
            ) : (
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <Card title="Answer directory" extra={<Tag>{faqs.length}</Tag>} styles={{ body: { padding: 0 } }}>
                            {faqs.length === 0 ? (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No FAQs yet" style={{ padding: 24 }} />
                            ) : (
                                <List
                                    dataSource={faqs}
                                    renderItem={(faq) => {
                                        const active = selectedFaqId === faq.id;
                                        return (
                                            <List.Item
                                                onClick={() => setSelectedFaqId(faq.id)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: 14,
                                                    background: active ? token.colorPrimaryBg : undefined,
                                                    borderLeft: active ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
                                                }}
                                            >
                                                <List.Item.Meta
                                                    avatar={<LuHelpCircle style={{ marginTop: 4, color: active ? token.colorPrimary : token.colorTextSecondary }} />}
                                                    title={(
                                                        <Flex justify="space-between" gap={8}>
                                                            <Text strong ellipsis>{faq.question}</Text>
                                                            <Tag color={STATUS_COLORS[faq.status]}>{faq.status.replace('_', ' ')}</Tag>
                                                        </Flex>
                                                    )}
                                                    description={(
                                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                            <Text type="secondary" ellipsis>{faq.answer}</Text>
                                                            {faq.articleTitle && <Text type="secondary" style={{ fontSize: 12 }}>Article: {faq.articleTitle}</Text>}
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
                        <Form form={form} layout="vertical" initialValues={DEFAULT_FAQ_VALUES}>
                            <Tabs
                                defaultActiveKey="answer"
                                items={[
                                    {
                                        key: 'answer',
                                        label: 'Answer',
                                        children: (
                                            <Card>
                                                <Form.Item name="question" label="Question" rules={[{ required: true, message: 'Question is required' }]}>
                                                    <Input maxLength={240} placeholder="What does the customer ask?" />
                                                </Form.Item>
                                                <Form.Item name="answer" label="Answer" rules={[{ required: true, message: 'Answer is required' }]}>
                                                    <Input.TextArea rows={5} maxLength={2000} placeholder="Short answer customers can understand immediately" />
                                                </Form.Item>
                                                <Row gutter={12}>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name="status" label="Status">
                                                            <Select
                                                                options={Object.values(ANSWERLATTICE_FAQ_STATUS).map(status => ({
                                                                    label: status.replace('_', ' '),
                                                                    value: status,
                                                                }))}
                                                            />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name="source" label="Source">
                                                            <Select
                                                                options={Object.values(ANSWERLATTICE_FAQ_SOURCE).map(source => ({
                                                                    label: source.replace('_', ' '),
                                                                    value: source,
                                                                }))}
                                                            />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={8}>
                                                        <Form.Item name="sortOrder" label="Display order">
                                                            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                            </Card>
                                        ),
                                    },
                                    {
                                        key: 'connections',
                                        label: 'Connections',
                                        children: (
                                            <Card>
                                                <Form.Item name="articleId" label="Linked article">
                                                    <Select
                                                        allowClear
                                                        showSearch
                                                        options={articleOptions}
                                                        optionFilterProp="label"
                                                        placeholder="Connect to the detailed article"
                                                    />
                                                </Form.Item>
                                                <Form.Item name="contextKeys" label="Product surfaces">
                                                    <Select mode="tags" options={surfaceOptions} placeholder="billing, onboarding, settings" />
                                                </Form.Item>
                                                <Form.Item name="entityIds" label="Product entities">
                                                    <Select mode="multiple" options={entityOptions} placeholder="Connect entities" />
                                                </Form.Item>
                                                <Form.Item name="tags" label="Tags">
                                                    <Select mode="tags" tokenSeparators={[',']} placeholder="billing, setup, plan" />
                                                </Form.Item>
                                            </Card>
                                        ),
                                    },
                                    {
                                        key: 'review',
                                        label: 'Review',
                                        children: (
                                            <Card>
                                                <Row gutter={[16, 16]}>
                                                    <Col xs={12} md={6}>
                                                        <Statistic title="Helpful" value={selectedFaq?.likes || 0} />
                                                    </Col>
                                                    <Col xs={12} md={6}>
                                                        <Statistic title="Not helpful" value={selectedFaq?.dislikes || 0} />
                                                    </Col>
                                                    <Col xs={12} md={6}>
                                                        <Text type="secondary">Last reviewed</Text>
                                                        <br />
                                                        <Text>{toDateLabel(selectedFaq?.lastReviewedOn)}</Text>
                                                    </Col>
                                                    <Col xs={12} md={6}>
                                                        <Text type="secondary">Review requested</Text>
                                                        <br />
                                                        <Text>{toDateLabel(selectedFaq?.reviewRequestedOn)}</Text>
                                                    </Col>
                                                </Row>
                                                <Paragraph type="secondary" style={{ marginTop: 16 }}>
                                                    When a linked article changes, Answerlattice marks related FAQs as needs review so owners can confirm the short answer is still correct.
                                                </Paragraph>
                                            </Card>
                                        ),
                                    },
                                ]}
                            />
                        </Form>
                        <Flex justify="space-between" gap={8} wrap="wrap" style={{ marginTop: 12 }}>
                            <Popconfirm title="Archive this FAQ?" okText="Archive" onConfirm={handleArchive} disabled={!selectedFaq}>
                                <Button danger disabled={!selectedFaq} icon={<LuArchive />}>Archive</Button>
                            </Popconfirm>
                            <Button type="primary" loading={saving} icon={<LuSave />} onClick={handleSave}>Save answer</Button>
                        </Flex>
                    </Col>
                </Row>
            )}
        </div>
    );
}
