import TiptapEditor from "@atoms/TiptapEditor";
import { FEATURE_FLAGS } from "@config/features";
import { getFaqsByArticleId } from '@database/answerlattice/faqs';
import { getProductSurfacesForSession, rebuildProductSurfaceContentSummary } from '@database/answerlattice/productSurfaces';
import { addArticle, updateArticle } from '@database/knowledgeBase/articles';
import { useAppDispatch } from "@hook/useAppDispatch";
import { extractEditortextForComparison } from "@lib/vectorEmbeddings/articleEmbeddings";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { KnowledgeBaseArticleEmbeddingPayload, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { ANSWERLATTICE_FAQ_STATUS, type AnswerlatticeFaq } from "@type/answerlattice";
import { getObjectDifferance } from "@util/deepMerge";
import { getNewIndex } from '@util/utils';
import { Button, Col, Divider, Form, Grid, Input, InputNumber, Modal, Row, Select, Space, Tag, Tooltip, Typography, message, theme } from "antd";
import { FormInstance } from 'antd/lib/form';
import { useEffect, useMemo, useState } from "react";
import { LuBookOpen, LuCheckCircle, LuFileText, LuHelpCircle, LuLink, LuPlus, LuRefreshCw, LuSave, LuSearch, LuTrash2, LuX } from "react-icons/lu";

interface ArticleModalProps {
    open: boolean;
    editingArticle: KnowledgeBaseArticleType | null;
    form: FormInstance;
    onOk: () => void;
    onCancel: () => void;
    onSuccess: (article: KnowledgeBaseArticleType) => void;
    selectedCategory: KnowledgeBaseCategory | null;
    selectedSection: KnowledgeBaseSection | null;
    categoriesData: KnowledgeBaseCategoriesType | null;
    from?: string;
}

const ArticleModal = ({ open, editingArticle, form, onOk, onCancel, onSuccess, selectedCategory, selectedSection, categoriesData, from }: ArticleModalProps) => {
    const dispatch = useAppDispatch();
    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [surfaceOptions, setSurfaceOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [faqOptions, setFaqOptions] = useState<Array<{ label: string; value: string }>>([]);
    const [linkedFaqIds, setLinkedFaqIds] = useState<string[]>([]);
    const [refreshingFaqs, setRefreshingFaqs] = useState(false);
    const selectedCategoryData = currentCategoryId ? categoriesData?.categories[currentCategoryId] : null;
    const hasSections = selectedCategoryData && selectedCategoryData.sections && selectedCategoryData.sections.length > 0;
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

    const titleValue = Form.useWatch('title', form);
    const showSurfaceBinding = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES && from !== 'review';
    const showGeneratedFaqs = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT && from === 'review';
    const showFaqLinks = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT && from !== 'review' && Boolean(editingArticle);

    const surfaceSelectOptions = useMemo(() => surfaceOptions, [surfaceOptions]);
    const isEditingArticle = Boolean(editingArticle);
    const linkedFaqCount = linkedFaqIds.length;
    const faqActionLabel = linkedFaqCount > 0 ? 'Refresh FAQ suggestions' : 'Generate FAQ suggestions';
    const sectionPanelStyle: React.CSSProperties = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 8,
        background: token.colorBgContainer,
        padding: isMobile ? 12 : 16,
    };
    const sectionTitleStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        color: token.colorText,
        fontWeight: 600,
    };

    useEffect(() => {
        if (Boolean(titleValue)) {
            const slug = titleValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const currentUrl = form.getFieldValue('url');
            if (!editingArticle || !currentUrl) {
                form.setFieldsValue({ url: slug });
            }
        }
        if (!editingArticle) {
            form.setFieldsValue({ index: getNewIndex(selectedSection?.articles ?? selectedCategoryData?.articles) });
        }
    }, [titleValue, form, editingArticle, selectedSection?.articles, selectedCategoryData?.articles]);

    useEffect(() => {
        if (open) {
            if (editingArticle) {
                // When editing, populate the form with the article's data
                setCurrentCategoryId(editingArticle.categoryId);
                setLinkedFaqIds(Array.isArray(editingArticle.faqIds) ? editingArticle.faqIds : []);
                form.setFieldsValue(editingArticle);
            } else {
                // When adding a new article, reset to default values
                const initialCategoryId = selectedCategory?.id ?? null;
                setCurrentCategoryId(initialCategoryId);
                setLinkedFaqIds([]);
                form.resetFields(); // Clear previous data
                form.setFieldsValue({
                    categoryId: initialCategoryId,
                    sectionId: selectedSection?.id ?? null,
                    index: getNewIndex(selectedSection?.articles ?? selectedCategory?.articles),
                });
            }
        } else {
            setLinkedFaqIds([]);
            form.resetFields();
        }
    }, [open, editingArticle, selectedCategory, selectedSection, form]);

    useEffect(() => {
        if (!open || (!showSurfaceBinding && !showGeneratedFaqs)) return;
        let mounted = true;
        getProductSurfacesForSession()
            .then((surfaces = []) => {
                if (!mounted) return;
                setSurfaceOptions(
                    surfaces
                        .filter(surface => surface.active !== false)
                        .map(surface => ({ label: surface.label, value: surface.key })),
                );
            })
            .catch(() => undefined);
        return () => { mounted = false; };
    }, [open, showSurfaceBinding, showGeneratedFaqs]);

    useEffect(() => {
        if (!open || !showFaqLinks || !editingArticle?.id) return;
        let mounted = true;
        getFaqsByArticleId(editingArticle.id)
            .then((faqs: AnswerlatticeFaq[] = []) => {
                if (!mounted) return;
                setFaqOptions(
                    faqs.map(faq => ({
                        label: `${faq.question}${faq.status === ANSWERLATTICE_FAQ_STATUS.PUBLISHED ? '' : ` (${faq.status.replace('_', ' ')})`}`,
                        value: faq.id,
                    })),
                );
            })
            .catch(() => undefined);
        return () => { mounted = false; };
    }, [open, showFaqLinks, editingArticle?.id]);

    const handleRefreshFaqSuggestions = async () => {
        if (!editingArticle?.id) return;

        const formValues = form.getFieldsValue(true);
        const titleChanged = String(formValues.title || '').trim() !== String(editingArticle.title || '').trim();
        const contentChanged = JSON.stringify(formValues.content || null) !== JSON.stringify(editingArticle.content || null);
        if (titleChanged || contentChanged) {
            message.warning('Save article changes before refreshing FAQ suggestions.');
            return;
        }

        setRefreshingFaqs(true);
        try {
            const response = await fetch('/api/answerlattice/faqs/generate-from-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId: editingArticle.id }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.error || 'Failed to refresh FAQ suggestions.');
            }

            const generatedFaqs = Array.isArray(result?.faqs) ? result.faqs : [];
            if (generatedFaqs.length > 0) {
                const nextOptions = generatedFaqs.map((faq: AnswerlatticeFaq) => ({
                    label: `${faq.question} (needs review)`,
                    value: faq.id,
                }));
                setFaqOptions(previous => {
                    const existingIds = new Set(previous.map(option => option.value));
                    return [
                        ...nextOptions.filter(option => !existingIds.has(option.value)),
                        ...previous,
                    ];
                });
                setLinkedFaqIds(previous => Array.from(new Set([
                    ...previous,
                    ...generatedFaqs.map((faq: AnswerlatticeFaq) => faq.id).filter(Boolean),
                ])));
            }

            const skippedCount = Number(result?.skippedDuplicateCount || 0);
            if (generatedFaqs.length > 0) {
                message.success(`Created ${generatedFaqs.length} FAQ suggestion${generatedFaqs.length === 1 ? '' : 's'} for review.`);
            } else if (skippedCount > 0) {
                message.info('Existing FAQs already cover this article.');
            } else {
                message.info('No new FAQ suggestions were found for this article.');
            }
        } catch (error: any) {
            message.error(error?.message || 'Failed to refresh FAQ suggestions.');
        } finally {
            setRefreshingFaqs(false);
        }
    };

    const generateEmbedding = async (article: KnowledgeBaseArticleType) => {
        const category = categoriesData?.categories[article.categoryId];
        const section = category?.sections?.find(s => s.id === article.sectionId);

        const embeddingPayload: KnowledgeBaseArticleEmbeddingPayload = {
            articleId: article.id,
            content: article.content,
            categoryId: article.categoryId,
            sectionId: article.sectionId,
            articleTitle: article.title,
            categoryTitle: category?.title ?? '',
            sectionTitle: section?.title ?? '',
        };

        const embeddingRes = await fetch('/api/helpCenter/article-embedding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeddingPayload })
        });
        const embeddingResult = await embeddingRes.json();
        if (!embeddingRes.ok) {
            message.warning(embeddingResult.error || 'Could not generate embedding for the article.');
        } else {
            message.success('Article embedding has been generated.');
        }
    }

    const handleFinish = async (values: any) => {
        if (from === 'review') {
            let data = { ...editingArticle, ...values };
            onSuccess(data);
            return;
        }

        const isEditing = !!editingArticle;
        const action = isEditing ? 'Updating' : 'Creating';
        dispatch(startLoader(`${action} article`));
        try {
            if (editingArticle) {
                const data = { ...editingArticle, ...values } as KnowledgeBaseArticleType;
                const changedData: any = getObjectDifferance(data, editingArticle);

                // Tiptap content is a JSON object, so we need to compare it specifically.
                const contentHasChanged = JSON.stringify(data.content) !== JSON.stringify(editingArticle.content);

                if (Object.keys(changedData).length === 0 && !contentHasChanged) {
                    message.info("No changes to save.");
                    onSuccess(editingArticle); // Return original article if no changes
                    return;
                }
                const dataToUpload: Partial<KnowledgeBaseArticleType> = { ...changedData, id: editingArticle.id };

                // Ensure the ID is included for the update operation
                const updatedArticle = await updateArticle(dataToUpload);
                const mergedArticle = { ...data, ...updatedArticle, id: editingArticle.id } as KnowledgeBaseArticleType;
                rebuildProductSurfaceContentSummary().catch(() => undefined);
                message.success("Article updated successfully!");

                const newContent = extractEditortextForComparison(data.content);
                const prevContent = extractEditortextForComparison(editingArticle.content);
                if (newContent !== prevContent) {
                    await generateEmbedding(mergedArticle);
                } else {
                    console.log("No content changes detected.");
                }
                onSuccess(mergedArticle);
            } else {
                const newArticleData: Partial<KnowledgeBaseArticleType> = {
                    ...values,
                    active: true,
                    status: 'published',
                    categoryId: values.categoryId,
                    sectionId: values.sectionId ?? null,
                    index: values.index,
                };
                const createdArticle = await addArticle(newArticleData as KnowledgeBaseArticleType);
                rebuildProductSurfaceContentSummary().catch(() => undefined);
                await generateEmbedding(createdArticle);
                message.success("Article created successfully!");
                onSuccess(createdArticle);
            }
        } catch (error) {
            message.error(`Failed to ${action.toLowerCase()} article.`);
        } finally {
            dispatch(stopLoader(`${action} article`));
        }
    };

    const RenderTitle = () => {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LuFileText size={18} />
                    <span>{editingArticle ? "Edit Article" : "Add Article"}</span>
                </div>
                <Space size={6} wrap>
                    {editingArticle && (
                        editingArticle.embedding ? (
                            <Tooltip title="Search data is ready for this article">
                                <Tag icon={<LuCheckCircle />} color="green" style={{ borderRadius: 12, marginInlineEnd: 0 }}>Search ready</Tag>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Search data has not been created yet">
                                <Tag icon={<LuSearch />} color="orange" style={{ borderRadius: 12, marginInlineEnd: 0 }}>Search pending</Tag>
                            </Tooltip>
                        )
                    )}
                    {showFaqLinks && (
                        <Tag icon={<LuHelpCircle />} color={linkedFaqCount > 0 ? 'blue' : 'default'} style={{ borderRadius: 12, marginInlineEnd: 0 }}>
                            {linkedFaqCount} FAQ{linkedFaqCount === 1 ? '' : 's'}
                        </Tag>
                    )}
                </Space>
            </div>
        );
    };

    return (
        <Modal
            title={<RenderTitle />}
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            centered={!isMobile}
            maskClosable={false}
            width={isMobile ? '100vw' : 1180}
            style={isMobile ? { top: 0, maxWidth: '100vw', paddingBottom: 0 } : undefined}
            styles={{
                header: {
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 0,
                    paddingBottom: 12,
                },
                body: {
                    maxHeight: isMobile ? 'calc(100vh - 156px)' : '72vh',
                    overflowY: 'auto',
                    paddingTop: 16,
                },
                footer: {
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    marginTop: 0,
                    paddingTop: 12,
                },
            }}
            footer={(
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column-reverse' : 'row',
                        justifyContent: 'flex-end',
                        gap: 8,
                    }}
                >
                    <Button icon={<LuX />} onClick={onCancel} block={isMobile}>Cancel</Button>
                    <Button icon={<LuSave />} type="primary" onClick={onOk} block={isMobile}>
                        {editingArticle ? 'Update Article' : 'Save Article'}
                    </Button>
                </div>
            )}
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div
                    style={{
                        ...sectionPanelStyle,
                        background: token.colorFillQuaternary,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: 12,
                        flexDirection: isMobile ? 'column' : 'row',
                    }}
                >
                    <Space size={8} wrap>
                        <Tag icon={<LuSearch />} color={editingArticle?.embedding ? 'green' : 'orange'} style={{ borderRadius: 12 }}>
                            {editingArticle?.embedding ? 'Search ready' : 'Search pending'}
                        </Tag>
                        {showFaqLinks && (
                            <Tag icon={<LuHelpCircle />} color={linkedFaqCount > 0 ? 'blue' : 'default'} style={{ borderRadius: 12 }}>
                                {linkedFaqCount} linked FAQ{linkedFaqCount === 1 ? '' : 's'}
                            </Tag>
                        )}
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {isEditingArticle
                            ? 'Saving content updates search data and asks linked FAQs for review.'
                            : 'Search data is created after the article is saved.'}
                    </Typography.Text>
                </div>

                <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
                    <Row gutter={[16, 16]} align="top">
                        <Col xs={24} lg={8}>
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <div style={sectionPanelStyle}>
                                    <div style={sectionTitleStyle}>
                                        <LuBookOpen size={16} />
                                        <span>Article Details</span>
                                    </div>
                                    <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} allowClear placeholder="Short article title" />
                                    </Form.Item>
                                    <Form.Item name="url" label="URL slug" rules={[{ required: true }]}>
                                        <Input allowClear placeholder="article-url-slug" />
                                    </Form.Item>
                                    <Row gutter={12}>
                                        <Col xs={24} sm={12} lg={24} xl={12}>
                                            <Form.Item name="index" label="Display order">
                                                <InputNumber min={0} style={{ width: '100%' }} />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} lg={24} xl={12}>
                                            <Form.Item name="tags" label="Tags">
                                                <Select mode="tags" style={{ width: '100%' }} placeholder="Add tags" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                                        <Select
                                            placeholder="Select a category"
                                            onSelect={(value) => {
                                                setCurrentCategoryId(value);
                                                form.setFieldsValue({ sectionId: null });
                                            }}
                                        >
                                            {categoriesData && (Object.values(categoriesData.categories) as KnowledgeBaseCategory[]).map(cat => (
                                                <Select.Option key={cat.id} value={cat.id}>{cat.title}</Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                    {hasSections && (
                                        <Form.Item name="sectionId" label="Section" rules={[{ required: hasSections }]}>
                                            <Select placeholder="Select a section" disabled={!currentCategoryId}>
                                                {hasSections && selectedCategoryData.sections.map(sec => (
                                                    <Select.Option key={sec.id} value={sec.id}>{sec.title}</Select.Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    )}
                                </div>

                                {(showSurfaceBinding || showFaqLinks) && (
                                    <div style={sectionPanelStyle}>
                                        <div style={sectionTitleStyle}>
                                            <LuLink size={16} />
                                            <span>Connections</span>
                                        </div>
                                        {showSurfaceBinding && (
                                            <Form.Item name="contextKeys" label="Product surfaces">
                                                <Select
                                                    mode="multiple"
                                                    allowClear
                                                    options={surfaceSelectOptions}
                                                    placeholder="Choose relevant surfaces"
                                                />
                                            </Form.Item>
                                        )}
                                        {showFaqLinks && (
                                            <Form.Item label="Linked FAQs" style={{ marginBottom: 0 }}>
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    <Select
                                                        mode="multiple"
                                                        disabled
                                                        value={linkedFaqIds}
                                                        options={faqOptions}
                                                        placeholder="No FAQs linked yet"
                                                    />
                                                    <Button
                                                        icon={<LuRefreshCw />}
                                                        loading={refreshingFaqs}
                                                        onClick={handleRefreshFaqSuggestions}
                                                        block
                                                    >
                                                        {faqActionLabel}
                                                    </Button>
                                                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                        Suggestions stay in review until you publish them.
                                                    </Typography.Text>
                                                </Space>
                                            </Form.Item>
                                        )}
                                    </div>
                                )}
                            </Space>
                        </Col>
                        <Col xs={24} lg={16}>
                            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                <div style={sectionPanelStyle}>
                                    <div style={sectionTitleStyle}>
                                        <LuFileText size={16} />
                                        <span>Article Content</span>
                                    </div>
                                    <Form.Item
                                        name="content"
                                        label={null}
                                        rules={[{ required: true, message: 'Please input the content!' }]}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <TiptapEditor
                                            value={form.getFieldValue('content')}
                                            onChange={value => form.setFieldsValue({ content: value })}
                                            placeholder="Start writing your article..."
                                        />
                                    </Form.Item>
                                </div>

                                {showGeneratedFaqs && (
                                    <div style={sectionPanelStyle}>
                                        <Divider orientation="left" style={{ marginTop: 0 }}>FAQs to publish with this article</Divider>
                                        <Form.List name="generatedFaqs">
                                            {(fields, { add, remove }) => (
                                                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                                    {fields.map((field, index) => (
                                                        <div
                                                            key={field.key}
                                                            style={{
                                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                                borderRadius: 8,
                                                                padding: 12,
                                                                background: token.colorFillAlter,
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                                                                <Typography.Text strong>FAQ {index + 1}</Typography.Text>
                                                                <Button
                                                                    size="small"
                                                                    type="text"
                                                                    danger
                                                                    icon={<LuTrash2 />}
                                                                    onClick={() => remove(field.name)}
                                                                />
                                                            </div>
                                                            <Form.Item
                                                                name={[field.name, 'question']}
                                                                label="Question"
                                                                rules={[{ required: true, message: 'Question is required.' }]}
                                                            >
                                                                <Input maxLength={240} placeholder="What will customers ask?" />
                                                            </Form.Item>
                                                            <Form.Item
                                                                name={[field.name, 'answer']}
                                                                label="Short answer"
                                                                rules={[{ required: true, message: 'Answer is required.' }]}
                                                            >
                                                                <Input.TextArea rows={3} maxLength={2000} placeholder="Short answer that can stand on its own." />
                                                            </Form.Item>
                                                            <Row gutter={12}>
                                                                <Col xs={24} md={12}>
                                                                    <Form.Item name={[field.name, 'tags']} label="Tags">
                                                                        <Select mode="tags" placeholder="billing, setup, plan" />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={24} md={12}>
                                                                    <Form.Item name={[field.name, 'contextKeys']} label="Product surfaces">
                                                                        <Select mode="tags" placeholder="billing, settings" options={surfaceSelectOptions} />
                                                                    </Form.Item>
                                                                </Col>
                                                            </Row>
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="dashed"
                                                        icon={<LuPlus />}
                                                        onClick={() => add({ question: '', answer: '', tags: [], contextKeys: [] })}
                                                        block
                                                    >
                                                        Add FAQ
                                                    </Button>
                                                </Space>
                                            )}
                                        </Form.List>
                                    </div>
                                )}
                            </Space>
                        </Col>
                    </Row>
                </Form>
            </Space>
        </Modal>
    );
}

export default ArticleModal;
