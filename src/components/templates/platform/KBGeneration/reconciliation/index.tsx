'use client';

import { assertIngestionJobWriteSucceeded, updateJob } from '@database/kb-generation/jobs';
import { getArticleById, getArticlesByIds } from '@database/knowledgeBase/articles';
import { useAppDispatch } from '@hook/useAppDispatch';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { ARTICLE_RECONCILIATION_STATUS, IngestionJob } from '@type/knowledgeBase';
import { Alert, Button, List, message, Modal, Typography } from 'antd';
import { useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import ComparisonView, { type ArticleWithResolvedReconciliation } from './ComparisonView';

interface ReconciliationModalProps {
    open: boolean;
    job: IngestionJob | null;
    onClose: () => void;
    articlesToReview: IngestionJob['articlesToReview'];
}

type ArticleToReview = NonNullable<IngestionJob['articlesToReview']>[0];

const ReconciliationModal = ({ open, job, onClose, articlesToReview }: ReconciliationModalProps) => {
    const dispatch = useAppDispatch();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<ArticleWithResolvedReconciliation | null>(null);

    const onClickResolve = async (article: ArticleToReview) => {
        dispatch(startLoader('Fetching article details...'));
        try {
            const newArticle = await getArticleById(article.id);

            if (!newArticle || !newArticle.reconciliation) {
                message.error('Seems like there is not article to compare.');
                return;
            }

            const similarArticleIds = Array.from(new Set(newArticle.reconciliation.similarArticleIds || [])).slice(0, 3);
            const similarArticles = similarArticleIds.length > 0
                ? await getArticlesByIds(similarArticleIds)
                : [];
            setSelectedArticle({
                ...newArticle,
                reconciliation: {
                    ...newArticle.reconciliation,
                    similarArticles,
                },
            });
            setDrawerVisible(true);
        } catch (error) {
            setSelectedArticle(null);
            setDrawerVisible(false);
            message.error('Failed to fetch article details for comparison.');
        } finally {
            dispatch(stopLoader('Fetching article details...'));
        }
    };

    const handleDrawerClose = async () => {
        setDrawerVisible(false);
        setSelectedArticle(null);
    };

    const onDiscardArticle = async () => {
        if (!job || !selectedArticle) {
            throw new Error('kb_generation_reconciliation_context_missing');
        }
        const updatedCategoriesMap: NonNullable<IngestionJob['categories']> = {
            ...(job.categories || {}),
        };

        if (selectedArticle.categoryId && updatedCategoriesMap[selectedArticle.categoryId]) {
            const category = updatedCategoriesMap[selectedArticle.categoryId];
            updatedCategoriesMap[selectedArticle.categoryId] = selectedArticle.sectionId
                ? {
                    ...category,
                    sections: category.sections?.map((section) => (
                        section.id === selectedArticle.sectionId
                            ? {
                                ...section,
                                articles: section.articles?.filter((article) => article.id !== selectedArticle.id),
                            }
                            : section
                    )),
                }
                : {
                    ...category,
                    articles: category.articles?.filter((article) => article.id !== selectedArticle.id),
                };
        }

        const updatedJobdata = {
            articlesToReview: articlesToReview?.filter(a => a.id !== selectedArticle.id) || [],
            categories: updatedCategoriesMap
        }

        const updateResult = await updateJob(job.id, updatedJobdata);
        assertIngestionJobWriteSucceeded(
            updateResult,
            job.id,
            'kb_generation_reconciliation_discard_job_update_rejected',
        );
    }

    const onReplaceArticle = async () => {
        if (!job || !selectedArticle) {
            throw new Error('kb_generation_reconciliation_context_missing');
        }
        // 2. Update articlesToReview
        const articlesToReviewCopy: NonNullable<IngestionJob['articlesToReview']> = (articlesToReview || []).map(
            (article) => article.id === selectedArticle.id
                ? {
                    ...article,
                    status: ARTICLE_RECONCILIATION_STATUS.REPLACE,
                }
                : article,
        );

        //for deleting other articles we need to do this logic on publishApprove frunction becuase it will contains articles from production
        const updateResult = await updateJob(job.id, { articlesToReview: articlesToReviewCopy });
        assertIngestionJobWriteSucceeded(
            updateResult,
            job.id,
            'kb_generation_reconciliation_replace_job_update_rejected',
        );
    };

    const handleResolution = async (resolution: 'discard' | 'replace' | 'keep_both') => {
        dispatch(startLoader('Resolving article...'));

        try {
            if (!job || !selectedArticle) {
                throw new Error('kb_generation_reconciliation_context_missing');
            }
            if (resolution === 'discard') {
                await onDiscardArticle();
            } else if (resolution === 'replace') {
                await onReplaceArticle();
            } else if (resolution === 'keep_both') {
                const updateResult = await updateJob(job.id, { articlesToReview: articlesToReview?.filter(a => a.id !== selectedArticle.id) || [] });
                assertIngestionJobWriteSucceeded(
                    updateResult,
                    job.id,
                    'kb_generation_reconciliation_keep_both_job_update_rejected',
                );
            }
            message.success(`Article has been resolved as ${resolution}.`);
            handleDrawerClose();
        } catch (error) {
            message.error('Failed to resolve article.');
        } finally {
            dispatch(stopLoader('Resolving article...'));
        }
    };

    return (
        <Modal
            title="Duplicate Articles Detected"
            open={open}
            onCancel={onClose}
            footer={null}
            width="60vw"
        >
            <Typography.Paragraph type="secondary">
                The AI has identified articles that may be duplicates of existing content in your knowledge base. To maintain content quality and avoid redundancy, please resolve these duplicates before proceeding to the full review.
            </Typography.Paragraph>
            <Alert
                message={`${articlesToReview?.length || 0} Articles Require Your Attention`}
                description="You must resolve all detected duplicates before you can review and publish this job. Click 'Resolve' on each item below to compare the articles and decide on an action."
                type="warning"
                showIcon
                style={{ marginBottom: 24 }}
            />
            <List
                bordered
                itemLayout="horizontal"
                dataSource={articlesToReview}
                renderItem={(item) => (
                    <List.Item
                        style={{ padding: "12px 6px 12px 12px" }}
                        key={item.id}
                        actions={[
                            <Button
                                key={`resolve-${item.id}`}
                                icon={<LuArrowRight />}
                                shape='round'
                                onClick={() => onClickResolve(item)}>Start Review</Button>
                        ]}>
                        <List.Item.Meta
                            title={item.title}
                            description={`Found ${item.similarArticles?.length || 0} similar articles.`}
                        />
                    </List.Item>
                )}
            />
            {selectedArticle && (
                <ComparisonView
                    drawerVisible={drawerVisible}
                    handleDrawerClose={handleDrawerClose}
                    article={selectedArticle}
                    onResolved={handleResolution} />
            )}

        </Modal>
    );
};

export default ReconciliationModal;
