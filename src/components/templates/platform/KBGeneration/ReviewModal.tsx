'use client';

import { assertIngestionJobWriteSucceeded, updateReviewJobNavigation } from "@database/kb-generation/jobs";
import { rebuildProductSurfaceContentSummaryWithDiagnostics } from "@database/answerlattice/productSurfaces";
import { FEATURE_FLAGS } from "@config/features";
import { assertKnowledgeBaseArticleWriteSucceeded, getArticleById, updateArticle } from "@database/knowledgeBase/articles";
import { useAppDispatch } from "@hook/useAppDispatch";
import { getBoundedAnswerlatticeStringContext } from '@lib/answerlattice/diagnostics';
import {
    deleteKnowledgeBaseReviewArticle,
    deleteKnowledgeBaseReviewCategory,
    deleteKnowledgeBaseReviewSection,
    updateKnowledgeBaseReviewCategory,
    updateKnowledgeBaseReviewSection,
    upsertKnowledgeBaseReviewArticle,
    toKnowledgeBaseReviewNavigation,
} from '@lib/answerlattice/knowledgeBaseReviewMutations';
import { publishApprovedJob, PublishApprovedJobPayload, regenerateEmbedding } from '@lib/firebase/functions';
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { IngestionJob, IngestionJobCategoriesMap, KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { Button, Form, Layout, message, Modal, Splitter } from "antd";
import { useEffect, useState } from "react";
import ArticleModal from "../knowledgeBase/ArticleModal";
import ArticlePane from "../knowledgeBase/ArticlePane";
import CategoryModal from "../knowledgeBase/CategoryModal";
import CategoryPane from "../knowledgeBase/CategoryPane";
import SectionModal from "../knowledgeBase/SectionModal";
import SectionPane from "../knowledgeBase/SectionPane";

interface ReviewModalProps {
    open: boolean;
    onClose: () => void;
    job: IngestionJob | null;
    articlesToReview: IngestionJob['articlesToReview'];
    onReconciliationRequired: () => void;
}

function ReviewModal({ open, onClose, job, articlesToReview, onReconciliationRequired }: ReviewModalProps) {
    const dispatch = useAppDispatch();
    const [categoriesData, setCategoriesData] = useState<KnowledgeBaseCategoriesType | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<KnowledgeBaseCategory | null>(null);
    const [selectedSection, setSelectedSection] = useState<KnowledgeBaseSection | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<KnowledgeBaseArticleType | null>(null);
    const [isArticleLoading, setIsArticleLoading] = useState(false);
    const [activeModal, setActiveModal] = useState<{ type: 'category' | 'section' | 'article' | "", data: any }>({ type: "", data: null });
    const [categoryForm] = Form.useForm();
    const [sectionForm] = Form.useForm();
    const [form] = Form.useForm();

    useEffect(() => {
        if (job) {
            setCategoriesData({ categories: toKnowledgeBaseReviewNavigation(job.categories || {}) });
        }
    }, [job]);

    const handleCategorySelect = async (category: KnowledgeBaseCategory) => {
        const sortedSections = category.sections ? [...category.sections].sort((a, b) => a.index - b.index) : [];
        const sortedCategory = {
            ...category,
            sections: sortedSections,
        };
        setSelectedCategory(sortedCategory);
        setSelectedSection(null);
        setSelectedArticle(null);
    };

    const handleSectionSelect = (section: KnowledgeBaseSection) => {
        setSelectedSection(section);
        setSelectedArticle(null);
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!job || !categoriesData) return;
        Modal.confirm({
            title: 'Delete this category?',
            content: 'This will remove the category and all its sections/articles from this job. This cannot be undone.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: async () => {
                dispatch(startLoader('Deleting category...'));
                try {
                    const updateResult = await updateReviewJobNavigation(
                        job.id,
                        'category_delete',
                        (current) => deleteKnowledgeBaseReviewCategory(current, categoryId),
                    );
                    assertIngestionJobWriteSucceeded(
                        updateResult,
                        job.id,
                        'kb_generation_review_category_delete_rejected',
                    );
                    const updatedCategories = toKnowledgeBaseReviewNavigation(updateResult.categories);
                    setCategoriesData({ categories: updatedCategories });
                    if (selectedCategory?.id === categoryId) {
                        setSelectedCategory(null);
                        setSelectedSection(null);
                        setSelectedArticle(null);
                    }
                    message.success('Category deleted');
                } catch {
                    message.error('Failed to delete category');
                } finally {
                    dispatch(stopLoader('Deleting category...'));
                }
            },
        });
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (!job || !categoriesData || !selectedCategory) return;
        Modal.confirm({
            title: 'Delete this section?',
            content: 'This will remove the section and all its articles from this job.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: async () => {
                dispatch(startLoader('Deleting section...'));
                try {
                    const updateResult = await updateReviewJobNavigation(
                        job.id,
                        'section_delete',
                        (current) => deleteKnowledgeBaseReviewSection(current, selectedCategory.id, sectionId),
                    );
                    assertIngestionJobWriteSucceeded(
                        updateResult,
                        job.id,
                        'kb_generation_review_section_delete_rejected',
                    );
                    const updatedCategories = toKnowledgeBaseReviewNavigation(updateResult.categories);
                    setCategoriesData({ categories: updatedCategories });
                    setSelectedCategory(updatedCategories[selectedCategory.id]);
                    if (selectedSection?.id === sectionId) {
                        setSelectedSection(null);
                        setSelectedArticle(null);
                    }
                    message.success('Section deleted');
                } catch {
                    message.error('Failed to delete section');
                } finally {
                    dispatch(stopLoader('Deleting section...'));
                }
            },
        });
    };

    const handleDeleteArticle = async (articleId: string) => {
        if (!job || !categoriesData || !selectedCategory) return;
        Modal.confirm({
            title: 'Delete this article?',
            content: 'This will remove the article from this job.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: async () => {
                dispatch(startLoader('Deleting article...'));
                try {
                    const updateResult = await updateReviewJobNavigation(
                        job.id,
                        'article_delete',
                        (current) => deleteKnowledgeBaseReviewArticle(
                            current,
                            selectedCategory.id,
                            articleId,
                            selectedSection?.id,
                        ),
                    );
                    assertIngestionJobWriteSucceeded(
                        updateResult,
                        job.id,
                        'kb_generation_review_article_delete_rejected',
                    );
                    const updatedCategories = toKnowledgeBaseReviewNavigation(updateResult.categories);
                    setCategoriesData({ categories: updatedCategories });
                    const updatedCategory = updatedCategories[selectedCategory.id];
                    setSelectedCategory(updatedCategory);
                    if (selectedSection) {
                        const updatedSection = updatedCategory.sections?.find((section) => section.id === selectedSection.id);
                        setSelectedSection(updatedSection || null);
                    }
                    setSelectedArticle(null);
                    message.success('Article deleted');
                } catch {
                    message.error('Failed to delete article');
                } finally {
                    dispatch(stopLoader('Deleting article...'));
                }
            },
        });
    };

    const handleArticleSelect = async (articleMeta: KnowledgeBaseArticleMeta) => {
        dispatch(startLoader('Fetching article content'));
        setIsArticleLoading(true);
        try {
            const fullArticle = await getArticleById(articleMeta.id);
            if (fullArticle) {
                if (fullArticle.reconciliation?.status === 'unresolved') {
                    onReconciliationRequired();
                } else {
                    setActiveModal({ type: "article", data: fullArticle });
                }
            } else {
                message.error('Could not find the selected article.');
            }
        } catch (error) {
            message.error('Failed to fetch article content.');
        } finally {
            dispatch(stopLoader('Fetching article content'));
            setIsArticleLoading(false);
        }
    };

    const handleApproveAndPublish = () => {
        if (articlesToReview && articlesToReview.length > 0) {
            message.warning('Please resolve all duplicate articles before publishing.');
            onReconciliationRequired();
            return;
        }

        Modal.confirm({
            title: 'Are you sure you want to approve and publish this job?',
            content: 'This action will make all reviewed articles live. This cannot be undone.',
            onOk: async () => {
                if (!job) return;
                dispatch(startLoader('Publishing job...'));
                try {
                    const finalCategories: IngestionJobCategoriesMap | undefined = categoriesData?.categories || job.categories;
                    if (!finalCategories || Object.keys(finalCategories).length === 0) {
                        throw new Error('Knowledge-base review navigation is unavailable.');
                    }
                    const payload: PublishApprovedJobPayload = { jobId: job.id, finalCategories };
                    await publishApprovedJob(payload);
                    let summaryRefreshSucceeded = true;
                    if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PRODUCT_SURFACES) {
                        summaryRefreshSucceeded = await rebuildProductSurfaceContentSummaryWithDiagnostics({
                            failureCode: 'answerlattice_kb_generation_summary_refresh_after_publish_failed',
                            context: {
                                ...getBoundedAnswerlatticeStringContext('jobId', job.id),
                                publishedArticleCount: Number(job.articlesToEmbedCount || job.articleIds?.length || 0),
                            },
                        });
                    }
                    if (summaryRefreshSucceeded) {
                        message.success('Job has been successfully published!');
                    } else {
                        message.warning('Job published, but contextual help refresh failed. Try Refresh after checking product surfaces.');
                    }
                    onClose(); // Close the modal on success
                } catch (error) {
                    message.error('Failed to publish the job. Please try again.');
                } finally {
                    dispatch(stopLoader('Publishing job...'));
                }
            },
        });
    };

    const handleCategorySuccess = async (updatedCategory: KnowledgeBaseCategory) => {
        dispatch(startLoader('Updating category...'));
        try {
            if (!job || !categoriesData) throw new Error('answerlattice_kb_generation_review_state_missing');
            const updateResult = await updateReviewJobNavigation(
                job.id,
                'category_update',
                (current) => updateKnowledgeBaseReviewCategory(current, updatedCategory),
            );
            assertIngestionJobWriteSucceeded(
                updateResult,
                job.id,
                'kb_generation_review_category_update_rejected',
            );
            const updatedCategories = toKnowledgeBaseReviewNavigation(updateResult.categories);
            setCategoriesData({ categories: updatedCategories });
            if (selectedCategory?.id === updatedCategory.id) {
                const categoryForReview = updatedCategories[updatedCategory.id];
                setSelectedCategory(categoryForReview);
                if (selectedSection) {
                    const refreshedSection = categoryForReview.sections?.find((section) => section.id === selectedSection.id);
                    setSelectedSection(refreshedSection || null);
                }
            }
            setActiveModal({ type: "", data: null });
        } catch {
            message.error('Failed to update category.');
        } finally {
            dispatch(stopLoader('Updating category...'));
        }
    };

    const handleSectionSuccess = async (updatedSection: KnowledgeBaseSection) => {
        dispatch(startLoader('Updating section...'));
        try {
            if (!job || !categoriesData || !selectedCategory) {
                throw new Error('answerlattice_kb_generation_review_state_missing');
            }
            const updateResult = await updateReviewJobNavigation(
                job.id,
                'section_update',
                (current) => updateKnowledgeBaseReviewSection(current, selectedCategory.id, updatedSection),
            );
            const updatedCategories = toKnowledgeBaseReviewNavigation(updateResult.categories);
            const category = updatedCategories[selectedCategory.id];
            const sections = category.sections || [];
            const storedSection = sections.find((section) => section.id === updatedSection.id);
            if (!storedSection) throw new Error('answerlattice_kb_generation_section_not_found');
            const sectionForReview = {
                ...storedSection,
                articles: storedSection.articles?.map((article) => ({ ...article, reEmbedding: true })),
            };
            assertIngestionJobWriteSucceeded(
                updateResult,
                job.id,
                'kb_generation_review_section_update_rejected',
            );
            setCategoriesData({ categories: updatedCategories });
            setSelectedCategory(category);
            setSelectedSection(sectionForReview);
            setActiveModal({ type: "", data: null });
        } catch {
            message.error('Failed to update section.');
        } finally {
            dispatch(stopLoader('Updating section...'));
        }
    };

    const handleArticleSaveSuccess = async (savedArticle: KnowledgeBaseArticleType) => {
        dispatch(startLoader('Updating article...'));
        try {
            const isNewArticle = !activeModal.data;
            const updatedArticle = await updateArticle(savedArticle, { mode: 'generation_review' });
            assertKnowledgeBaseArticleWriteSucceeded(
                updatedArticle,
                savedArticle.id,
                'kb_generation_review_article_update_rejected',
            );

            if (job && categoriesData && selectedCategory) {
                const articleMeta = {
                    id: savedArticle.id,
                    title: savedArticle.title,
                    active: savedArticle.active !== false,
                    index: Number(savedArticle.index || 0),
                    url: savedArticle.url || '',
                    reEmbedding: true,
                };

                const updateResult = await updateReviewJobNavigation(
                    job.id,
                    'article_upsert',
                    (current) => upsertKnowledgeBaseReviewArticle(
                        current,
                        selectedCategory.id,
                        articleMeta,
                        selectedSection?.id,
                    ),
                );
                assertIngestionJobWriteSucceeded(
                    updateResult,
                    job.id,
                    'kb_generation_review_article_job_update_rejected',
                );
                const updatedCategories = toKnowledgeBaseReviewNavigation(updateResult.categories);
                setCategoriesData({ categories: updatedCategories });
                const updatedCategory = updatedCategories[selectedCategory.id];
                setSelectedCategory(updatedCategory);
                if (selectedSection) {
                    const updatedSection = updatedCategory.sections?.find((section) => section.id === selectedSection.id);
                    setSelectedSection(updatedSection || null);
                }
            }

            await regenerateEmbedding(savedArticle.id);
            message.info(`Embedding ${isNewArticle ? 'generation' : 'regeneration'} has been triggered.`);
            setActiveModal({ type: "", data: null });
        } catch (error) {
            message.error('Failed to update article review changes.');
        } finally {
            dispatch(stopLoader('Updating article...'));
        }
    };


    if (!Boolean(categoriesData?.categories)) {
        return null
    }

    const categoriesList = Object.values(categoriesData.categories).sort((a, b) => a.index - b.index);

    return (
        <Modal
            title="Review Knowledge Base Content"
            open={open}
            onCancel={onClose}
            width="95vw"
            style={{ top: 20 }}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleApproveAndPublish}>
                    Approve & Publish
                </Button>,
            ]}>
            <Layout style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'row' }}>
                <Splitter style={{ height: '100%', width: '100%' }}>
                    <Splitter.Panel defaultSize="33%" min={300}>
                        <CategoryPane
                            isLoading={false}
                            categories={categoriesList}
                            selectedCategory={selectedCategory}
                            onCategorySelect={handleCategorySelect}
                            onAddCategory={() => { }}
                            onEditCategory={(cat) => setActiveModal({ type: "category", data: cat })}
                            onDeleteCategory={handleDeleteCategory}
                        />
                    </Splitter.Panel>
                    <Splitter.Panel defaultSize="33%" min={300}>
                        <SectionPane
                            isLoading={false}
                            selectedCategory={selectedCategory}
                            selectedSection={selectedSection}
                            onSectionSelect={handleSectionSelect}
                            onAddSection={() => { }}
                            onEditSection={(sec) => setActiveModal({ type: "section", data: sec })}
                            onDeleteSection={handleDeleteSection}
                        />
                    </Splitter.Panel>
                    <Splitter.Panel min={300}>
                        <ArticlePane
                            selectedContainer={selectedSection || selectedCategory}
                            articles={selectedSection?.articles || selectedCategory?.articles || []}
                            selectedArticle={selectedArticle}
                            onArticleSelect={handleArticleSelect}
                            onAddArticle={() => { }}
                            onEditArticle={handleArticleSelect}
                            onDeleteArticle={handleDeleteArticle}
                            isArticleLoading={isArticleLoading}
                        />
                    </Splitter.Panel>
                </Splitter>
                <CategoryModal
                    open={activeModal.type === "category"}
                    editingCategory={activeModal.data}
                    categoriesData={categoriesData}
                    form={categoryForm}
                    onOk={() => categoryForm.submit()}
                    onCancel={() => setActiveModal({ type: "", data: null })}
                    onReviewSuccess={handleCategorySuccess}
                    from="review"
                />
                <SectionModal
                    open={activeModal.type === "section"}
                    editingSection={activeModal.data}
                    form={sectionForm}
                    onOk={() => sectionForm.submit()}
                    onCancel={() => setActiveModal({ type: "", data: null })}
                    onReviewSuccess={handleSectionSuccess}
                    categoriesData={categoriesData}
                    selectedCategory={selectedCategory}
                    from="review"
                />
                <ArticleModal
                    open={activeModal.type === "article"}
                    editingArticle={activeModal.data}
                    form={form}
                    onOk={() => form.submit()}
                    onCancel={() => setActiveModal({ type: "", data: null })}
                    onSuccess={handleArticleSaveSuccess}
                    selectedCategory={selectedCategory}
                    selectedSection={selectedSection}
                    categoriesData={categoriesData}
                    from="review"
                />
            </Layout>
        </Modal>
    );
}

export default ReviewModal;
