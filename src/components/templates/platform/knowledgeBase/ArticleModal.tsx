import TiptapEditor from "@atoms/TiptapEditor";
import { addArticle, updateArticle } from '@database/knowledgeBase/articles';
import { useAppDispatch } from "@hook/useAppDispatch";
import { extractEditortextForComparison } from "@lib/vectorEmbeddings/articleEmbeddings";
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { KnowledgeBaseArticleEmbeddingPayload, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { getObjectDifferance } from "@util/deepMerge";
import { getNewIndex } from '@util/utils';
import { Alert, Button, Col, Form, Input, InputNumber, Modal, Row, Select, Tag, Tooltip, message, theme } from "antd";
import { FormInstance } from 'antd/lib/form';
import { useEffect, useState } from "react";
import { LuCheckCircle } from "react-icons/lu";

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
    const selectedCategoryData = currentCategoryId ? categoriesData?.categories[currentCategoryId] : null;
    const hasSections = selectedCategoryData && selectedCategoryData.sections && selectedCategoryData.sections.length > 0;
    const { token } = theme.useToken();

    const titleValue = Form.useWatch('title', form);

    useEffect(() => {
        if (Boolean(titleValue)) {
            const slug = titleValue.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            form.setFieldsValue({ url: slug });
        }
        form.setFieldsValue({ index: getNewIndex(selectedSection?.articles ?? selectedCategoryData?.articles) });

    }, [titleValue, form]);

    useEffect(() => {
        if (open) {
            if (editingArticle) {
                // When editing, populate the form with the article's data
                setCurrentCategoryId(editingArticle.categoryId);
                form.setFieldsValue(editingArticle);
            } else {
                // When adding a new article, reset to default values
                const initialCategoryId = selectedCategory?.id ?? null;
                setCurrentCategoryId(initialCategoryId);
                form.resetFields(); // Clear previous data
                form.setFieldsValue({
                    categoryId: initialCategoryId,
                    sectionId: selectedSection?.id ?? null,
                    index: getNewIndex(selectedSection?.articles ?? selectedCategory?.articles),
                });
            }
        } else {
            form.resetFields();
        }
    }, [open, editingArticle, selectedCategory, selectedSection, form]);

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
                let data = { ...editingArticle, ...values };
                const changedData: any = getObjectDifferance(data, editingArticle);

                // Tiptap content is a JSON object, so we need to compare it specifically.
                const contentHasChanged = JSON.stringify(data.content) !== JSON.stringify(editingArticle.content);

                if (Object.keys(changedData).length === 0 && !contentHasChanged) {
                    message.info("No changes to save.");
                    onSuccess(editingArticle); // Return original article if no changes
                    return;
                }
                const dataToUpload: KnowledgeBaseArticleType = { ...changedData, id: editingArticle.id };

                // Ensure the ID is included for the update operation
                const updatedArticle = await updateArticle(dataToUpload);
                message.success("Article updated successfully!");

                const newContent = extractEditortextForComparison(dataToUpload.content);
                const prevContent = extractEditortextForComparison(editingArticle.content);
                if (newContent !== prevContent) {
                    await generateEmbedding(dataToUpload);
                } else {
                    console.log("No content changes detected.");
                }
                onSuccess(updatedArticle);
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{editingArticle ? "Edit Article" : "Add Article"}</span>
                {editingArticle && (
                    editingArticle.embedding ? (
                        <Tooltip title="Embedding generated for AI responses">
                            <Tag style={{ borderRadius: 12 }} color="green">Embedding Generated <LuCheckCircle color={token.colorSuccess} /></Tag>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Embedding not generated for AI responses">
                            <Tag style={{ borderRadius: 12 }} color="orange">Embedding Not Generated <LuCheckCircle color={token.colorError} /></Tag>
                        </Tooltip>
                    )
                )}
            </div>
        );
    };

    return (
        <Modal
            title={<RenderTitle />}
            open={open}
            onOk={onOk}
            onCancel={onCancel}
            centered
            width={1200} // Make modal wider for two-column layout
            footer={[
                <Button key="back" onClick={onCancel}>Cancel</Button>,
                <Button key="submit" type="primary" onClick={onOk}>{editingArticle ? 'Update Article' : 'Save Article'}</Button>,
            ]}
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                            <Input.TextArea allowClear />
                        </Form.Item>
                        <Form.Item name="url" label="URL Slug" rules={[{ required: true }]}>
                            <Input allowClear />
                        </Form.Item>
                        <Form.Item name="index" label="Index">
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                            <Select
                                placeholder="Select a category"
                                onSelect={(value) => {
                                    setCurrentCategoryId(value);
                                    form.setFieldsValue({ sectionId: null }); // Reset section when category changes
                                }}
                            >
                                {categoriesData && (Object.values(categoriesData.categories) as KnowledgeBaseCategory[]).map(cat => (
                                    <Select.Option key={cat.id} value={cat.id}>{cat.title}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        {hasSections && <Form.Item name="sectionId" label="Section" rules={[{ required: hasSections }]}>
                            <Select placeholder="Select a section" disabled={!currentCategoryId}>
                                {hasSections && selectedCategoryData.sections.map(sec => (
                                    <Select.Option key={sec.id} value={sec.id}>{sec.title}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>}
                        <Form.Item name="tags" label="Tags (Optional)">
                            <Select mode="tags" style={{ width: '100%' }} placeholder="Add tags" />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item
                            name="content"
                            label="Content"
                            rules={[{ required: true, message: 'Please input the content!' }]}
                        >
                            <TiptapEditor
                                value={form.getFieldValue('content')}
                                onChange={value => form.setFieldsValue({ content: value })}
                                placeholder="Start writing your article..."
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            {editingArticle ? (
                <Alert
                    message="Embeddings for this article have already been generated. If you make changes to the content, the embeddings will be automatically updated upon saving."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            ) : (
                <Alert
                    message="Embeddings will be generated for this article. Embeddings are created from the article's title and content to power our AI search capabilities."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            )}
        </Modal>
    );
}

export default ArticleModal;