import type {
    AnswerlatticeIntakeReviewItem,
    AnswerlatticeKnowledgeIntakeJob,
    AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';

export type AnswerlatticeKnowledgeIntakeBundleState = {
    job: AnswerlatticeKnowledgeIntakeJob | null;
    sources: AnswerlatticeKnowledgeSource[];
    reviewItems: AnswerlatticeIntakeReviewItem[];
};

export const upsertAnswerlatticeKnowledgeIntakeJob = (
    jobs: AnswerlatticeKnowledgeIntakeJob[],
    job: AnswerlatticeKnowledgeIntakeJob,
): AnswerlatticeKnowledgeIntakeJob[] => [
    job,
    ...jobs.filter(existing => existing.id !== job.id),
];

export const upsertAnswerlatticeKnowledgeIntakeSource = (
    bundle: AnswerlatticeKnowledgeIntakeBundleState,
    jobId: string,
    source: AnswerlatticeKnowledgeSource,
): AnswerlatticeKnowledgeIntakeBundleState => (
    bundle.job?.id === jobId
        ? {
            ...bundle,
            sources: [
                source,
                ...bundle.sources.filter(existing => existing.id !== source.id),
            ],
        }
        : bundle
);

export const upsertAnswerlatticeKnowledgeIntakeReviewItem = (
    bundle: AnswerlatticeKnowledgeIntakeBundleState,
    jobId: string,
    item: AnswerlatticeIntakeReviewItem,
): AnswerlatticeKnowledgeIntakeBundleState => (
    bundle.job?.id === jobId
        ? {
            ...bundle,
            reviewItems: bundle.reviewItems.map(existing => (
                existing.id === item.id ? item : existing
            )),
        }
        : bundle
);

export const markAnswerlatticeKnowledgeIntakeItemsPublished = (
    bundle: AnswerlatticeKnowledgeIntakeBundleState,
    jobId: string,
    itemIds: string[],
): AnswerlatticeKnowledgeIntakeBundleState => {
    if (bundle.job?.id !== jobId) return bundle;
    const publishedIds = new Set(itemIds);
    if (publishedIds.size === 0) return bundle;
    return {
        ...bundle,
        reviewItems: bundle.reviewItems.map(item => (
            publishedIds.has(item.id)
                ? { ...item, status: 'published' }
                : item
        )),
    };
};
