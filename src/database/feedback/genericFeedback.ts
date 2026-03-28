/**
 * Generic Feedback System
 * 
 * Handles feedback (likes/dislikes) for all content types with a unified API.
 * Internally routes to the appropriate storage mechanism for each content type.
 */

import { updateArticleFeedback } from '@database/knowledgeBase/articles';
import { updateChangelogFeedback } from '@database/changelog';

export type ContentType = 'article' | 'changelog' | 'faq' | 'workflow';

export interface FeedbackUpdateParams {
    contentType: ContentType;
    contentId: string;
    feedbackType: 'like' | 'dislike';
    increment?: boolean;
    // Additional params for specific content types
    pageId?: string; // Required for changelog (parent document ID)
}

/**
 * Generic function to update feedback for any content type
 * 
 * @param params - Feedback update parameters
 * @returns Updated feedback counts {likes, dislikes}
 * 
 * @example
 * // Article
 * await updateContentFeedback({
 *     contentType: 'article',
 *     contentId: 'article123',
 *     feedbackType: 'like',
 *     increment: true
 * });
 * 
 * // Changelog
 * await updateContentFeedback({
 *     contentType: 'changelog',
 *     contentId: 'entry123',
 *     pageId: 'page456',
 *     feedbackType: 'like',
 *     increment: true
 * });
 */
export const updateContentFeedback = async (params: FeedbackUpdateParams) => {
    const { contentType, contentId, feedbackType, increment = true, pageId } = params;

    switch (contentType) {
        case 'article':
            return await updateArticleFeedback(contentId, feedbackType, increment);

        case 'changelog':
            if (!pageId) {
                throw new Error('pageId is required for changelog feedback');
            }
            return await updateChangelogFeedback(pageId, contentId, feedbackType, increment);

        case 'faq':
            // TODO: Implement FAQ feedback when FAQ feature is added
            throw new Error('FAQ feedback not yet implemented');

        case 'workflow':
            // TODO: Implement Workflow feedback when Workflow feature is added
            throw new Error('Workflow feedback not yet implemented');

        default:
            throw new Error(`Unknown content type: ${contentType}`);
    }
};

/**
 * Type-specific helper functions for better DX
 */

export const updateArticleFeedbackGeneric = (
    articleId: string,
    feedbackType: 'like' | 'dislike',
    increment?: boolean
) => {
    return updateContentFeedback({
        contentType: 'article',
        contentId: articleId,
        feedbackType,
        increment,
    });
};

export const updateChangelogFeedbackGeneric = (
    pageId: string,
    entryId: string,
    feedbackType: 'like' | 'dislike',
    increment?: boolean
) => {
    return updateContentFeedback({
        contentType: 'changelog',
        contentId: entryId,
        pageId,
        feedbackType,
        increment,
    });
};

// Future helpers (ready for implementation)

export const updateFaqFeedbackGeneric = (
    faqId: string,
    feedbackType: 'like' | 'dislike',
    increment?: boolean
) => {
    return updateContentFeedback({
        contentType: 'faq',
        contentId: faqId,
        feedbackType,
        increment,
    });
};

export const updateWorkflowFeedbackGeneric = (
    workflowId: string,
    feedbackType: 'like' | 'dislike',
    increment?: boolean
) => {
    return updateContentFeedback({
        contentType: 'workflow',
        contentId: workflowId,
        feedbackType,
        increment,
    });
};
