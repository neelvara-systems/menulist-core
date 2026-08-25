import type {
    AnswerlatticeIntakeReviewItem,
    AnswerlatticeKnowledgeIntakeJob,
    AnswerlatticeKnowledgeSource,
} from '@type/answerlattice';

export type AnswerlatticeKnowledgeIntakeClientSource = Omit<
    AnswerlatticeKnowledgeSource,
    'contentText'
>;

export type AnswerlatticeKnowledgeIntakeClientBundle = {
    job: AnswerlatticeKnowledgeIntakeJob | null;
    sources: AnswerlatticeKnowledgeIntakeClientSource[];
    reviewItems: AnswerlatticeIntakeReviewItem[];
};

/**
 * Intake source bodies can reach 40,000 characters each and are not needed by
 * the owner list or review-evidence UI. Keep them server-side and return the
 * bounded contentExcerpt instead so realistic jobs remain within the guarded
 * client response budget.
 */
export function projectKnowledgeIntakeBundleForClient(input: {
    job: AnswerlatticeKnowledgeIntakeJob | null;
    sources: AnswerlatticeKnowledgeSource[];
    reviewItems: AnswerlatticeIntakeReviewItem[];
}): AnswerlatticeKnowledgeIntakeClientBundle {
    return {
        ...input,
        sources: input.sources.map(({ contentText: _contentText, ...source }) => source),
    };
}
