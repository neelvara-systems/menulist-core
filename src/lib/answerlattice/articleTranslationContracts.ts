import type { AnswerlatticeArticleTranslation } from '@type/answerlattice';

export type AnswerlatticeArticleTranslationState = 'approved' | 'draft';

export const getAnswerlatticeArticleTranslationState = (
    translation: AnswerlatticeArticleTranslation | null | undefined,
): AnswerlatticeArticleTranslationState | null => {
    if (!translation) return null;
    return translation.status === 'approved' && Boolean(translation.reviewedBy && translation.reviewedAt)
        ? 'approved'
        : 'draft';
};

export const isAnswerlatticeArticleTranslationApproved = (
    translation: AnswerlatticeArticleTranslation | null | undefined,
): boolean => getAnswerlatticeArticleTranslationState(translation) === 'approved';

