import {
    ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS,
    type AnswerlatticeIntakeReviewItem,
    type AnswerlatticeKnowledgeIntakeJob,
    type AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';

const ANSWERLATTICE_INTAKE_SOURCE_TERMINAL_STATUSES = new Set<AnswerlatticeKnowledgeIntakeJob['status']>([
    ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS.PUBLISHING,
    ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS.PUBLISHED,
    ANSWERLATTICE_KNOWLEDGE_INTAKE_STATUS.CANCELLED,
]);

/*
 * Keep this state helper aligned with the server-side intake mutation guard.
 * Completed or publishing jobs remain available as evidence but cannot accept
 * new source mutations.
 */
export const canAnswerlatticeKnowledgeIntakeAcceptSources = (
    status: AnswerlatticeKnowledgeIntakeJob['status'] | null | undefined,
): boolean => Boolean(status && !ANSWERLATTICE_INTAKE_SOURCE_TERMINAL_STATUSES.has(status));

export type {
    AnswerlatticeIntakeReviewItem,
    AnswerlatticeKnowledgeIntakeJob,
    AnswerlatticeKnowledgeSource,
};

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
