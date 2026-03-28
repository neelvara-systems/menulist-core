'use client';

import { updateJob } from "@database/kb-generation/jobs";
import { getArticleById } from "@database/knowledgeBase/articles";
import { useAppDispatch } from "@hook/useAppDispatch";
import { publishApprovedJob, PublishApprovedJobPayload, regenerateEmbedding } from '@lib/firebase/functions';
import { startLoader, stopLoader } from "@reduxSlices/loader";
import { IngestionJob, IngestionJobArticle, IngestionJobSection, KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
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
            setCategoriesData({ categories: job.categories as any });
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
                    const updatedCategories = { ...categoriesData.categories };
                    delete updatedCategories[categoryId];
                    setCategoriesData({ categories: updatedCategories });
                    await updateJob(job.id, { categories: updatedCategories as any });
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
                    const updatedCategories: any = { ...categoriesData.categories };
                    const cat = updatedCategories[selectedCategory.id];
                    if (cat?.sections) {
                        cat.sections = cat.sections.filter((s: IngestionJobSection) => s.id !== sectionId);
                    }
                    setCategoriesData({ categories: updatedCategories });
                    await updateJob(job.id, { categories: updatedCategories as any });
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
                    const updatedCategories: any = JSON.parse(JSON.stringify(categoriesData.categories));
                    const cat = updatedCategories[selectedCategory.id];
                    if (selectedSection && cat?.sections) {
                        const sec = cat.sections.find((s: IngestionJobSection) => s.id === selectedSection.id);
                        if (sec?.articles) {
                            sec.articles = sec.articles.filter((a: IngestionJobArticle) => a.id !== articleId);
                        }
                    } else if (cat?.articles) {
                        cat.articles = cat.articles.filter((a: IngestionJobArticle) => a.id !== articleId);
                    }
                    setCategoriesData({ categories: updatedCategories });
                    await updateJob(job.id, { categories: updatedCategories as any });
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
                    const payload: PublishApprovedJobPayload = { jobId: job.id, finalCategories: job.categories }
                    await publishApprovedJob(payload);
                    message.success('Job has been successfully published!');
                    onClose(); // Close the modal on success
                } catch (error) {
                    message.error('Failed to publish the job. Please try again.');
                } finally {
                    dispatch(stopLoader('Publishing job...'));
                }
            },
        });
    };

    const handleCategorySuccess = async (updatedCategory: any) => {
        dispatch(startLoader('Updating category...'));
        const updatedCategories = { ...categoriesData?.categories };
        if (Boolean(updatedCategory.sections?.length)) {
            updatedCategory.sections.map((section: IngestionJobSection) => {
                if (Boolean(section.articles?.length)) {
                    section.articles.map((article: IngestionJobArticle) => {
                        article.reEmbedding = true;
                    })
                }
            })
        } else if (Boolean(updatedCategory.articles?.length)) {
            updatedCategory.articles.map((article: IngestionJobArticle) => {
                article.reEmbedding = true;
            })
        }
        updatedCategories[updatedCategory.id] = updatedCategory;
        setCategoriesData({ categories: updatedCategories });
        await updateJob(job?.id, { categories: updatedCategories as any });
        dispatch(stopLoader('Updating category...'));
        setActiveModal({ type: "", data: null });
    };

    const handleSectionSuccess = async (updatedSection: any) => {
        dispatch(startLoader('Updating section...'));
        const updatedCategories: any = { ...categoriesData?.categories };
        let secIndex = updatedCategories[selectedCategory.id].sections.findIndex((section: IngestionJobSection) => section.id === updatedSection.id);

        if (Boolean(updatedSection.articles?.length)) {
            updatedSection.articles.map((article: IngestionJobArticle) => {
                article.reEmbedding = true;
            })
        }

        updatedCategories[selectedCategory.id].sections[secIndex] = updatedSection;
        setCategoriesData({ categories: updatedCategories });
        await updateJob(job?.id, { categories: updatedCategories as any });
        dispatch(stopLoader('Updating section...'));
        setActiveModal({ type: "", data: null });
    };

    const handleArticleSaveSuccess = async (savedArticle: KnowledgeBaseArticleType) => {
        dispatch(startLoader('Updating article...'));
        setActiveModal({ type: "", data: null });
        const isNewArticle = !activeModal.data;
        // For now, let's assume regeneration is needed on any save within the review flow.
        // More sophisticated check can be added later if performance becomes an issue.
        const needsRegeneration = true;

        if (needsRegeneration) {
            try {
                await regenerateEmbedding(savedArticle.id);
                message.info(`Embedding ${isNewArticle ? 'generation' : 'regeneration'} has been triggered.`);
            } catch (error) {
                dispatch(stopLoader('Updating article...'));
                message.error(`Failed to trigger embedding ${isNewArticle ? 'generation' : 'regeneration'}.`);
            }
        }

        dispatch(stopLoader('Updating article...'));
        setActiveModal({ type: "", data: null });
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
                    onSuccess={handleCategorySuccess}
                    from="review"
                />
                <SectionModal
                    open={activeModal.type === "section"}
                    editingSection={activeModal.data}
                    form={sectionForm}
                    onOk={() => sectionForm.submit()}
                    onCancel={() => setActiveModal({ type: "", data: null })}
                    onSuccess={handleSectionSuccess}
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
