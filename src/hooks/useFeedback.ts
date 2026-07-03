import { useEffect, useState } from 'react';
import { message } from 'antd';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';

export type ContentType = 'article' | 'changelog' | 'faq' | 'workflow';
export type FeedbackType = 'like' | 'dislike';

interface FeedbackConfig {
    contentType: ContentType;
    contentId: string;
    pageId?: string; // Optional, required for changelog (nested structure)
    initialLikes?: number;
    initialDislikes?: number;
}

interface FeedbackHandlers {
    updateFeedback: (contentId: string, type: FeedbackType, increment?: boolean, pageId?: string) => Promise<any>;
    storeFeedback: (userId: string, contentId: string, type: FeedbackType) => void;
    getStoredFeedback: (userId: string, contentId: string) => FeedbackType | null;
    removeStoredFeedback: (userId: string, contentId: string) => void;
    submitComment?: (contentType: ContentType, contentId: string, comment: string, sentiment: FeedbackType, action?: 'added' | 'removed') => Promise<any>;
}

interface UseFeedbackReturn {
    likes: number;
    dislikes: number;
    feedbackGiven: FeedbackType | null;
    isFeedbackModalVisible: boolean;
    handleFeedback: (type: FeedbackType) => Promise<void>;
    handleFeedbackSubmit: (comment: string) => Promise<void>;
    setIsFeedbackModalVisible: (visible: boolean) => void;
}

/**
 * Generic feedback hook for any content type
 * Handles likes, dislikes, undo, localStorage, and database updates
 * 
 * @example
 * ```tsx
 * const feedback = useFeedback({
 *   contentType: 'article',
 *   contentId: article.id,
 *   initialLikes: article.likes,
 *   initialDislikes: article.dislikes,
 * }, handlers);
 * ```
 */
export const useFeedback = (
    config: FeedbackConfig,
    handlers: FeedbackHandlers
): UseFeedbackReturn => {
    const { user } = useClientAuthSession() || {};
    const { contentType, contentId, pageId, initialLikes = 0, initialDislikes = 0 } = config;
    const {
        updateFeedback,
        storeFeedback,
        getStoredFeedback,
        removeStoredFeedback,
        submitComment
    } = handlers;

    const [likes, setLikes] = useState(initialLikes);
    const [dislikes, setDislikes] = useState(initialDislikes);
    const [feedbackGiven, setFeedbackGiven] = useState<FeedbackType | null>(null);
    const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);

    // Load feedback status from localStorage on mount
    useEffect(() => {
        if (!user?.id) return;
        const feedbackStatus = getStoredFeedback(user.id, contentId);
        if (feedbackStatus) {
            setFeedbackGiven(feedbackStatus);
        }
    }, [contentId, user?.id, getStoredFeedback]);

    const handleFeedback = async (type: FeedbackType) => {
        // Check authentication
        if (!user?.id) {
            message.warning('Please log in to provide feedback.');
            return;
        }

        // Check pageId requirement for changelog
        if (contentType === 'changelog' && !pageId) {
            logHookFailure('answerlattice_feedback_missing_page_id', undefined, {
                contentType,
                ...getBoundedHookStringContext('contentId', contentId),
            });
            return;
        }

        // Allow undo if clicking the same button
        if (feedbackGiven === type) {
            // Undo feedback
            if (type === 'like') {
                setLikes(prev => prev - 1);
            } else {
                setDislikes(prev => prev - 1);
            }
            setFeedbackGiven(null);
            removeStoredFeedback(user.id, contentId);

            try {
                // Decrement the count in database
                const promises: Promise<any>[] = [
                    updateFeedback(contentId, type, false, pageId)
                ];
                if (submitComment) {
                    promises.push(submitComment(contentType, contentId, '', type, 'removed'));
                }
                await Promise.all(promises);
                message.success('Feedback removed.');
            } catch (error) {
                logHookFailure('answerlattice_feedback_remove_failed', error, {
                    contentType,
                    feedbackType: type,
                    hasSubmitComment: Boolean(submitComment),
                    ...getBoundedHookStringContext('contentId', contentId),
                    ...getBoundedHookStringContext('pageId', pageId),
                });
                message.error('Failed to remove feedback. Please try again.');
                // Rollback UI
                if (type === 'like') {
                    setLikes(prev => prev + 1);
                } else {
                    setDislikes(prev => prev + 1);
                }
                setFeedbackGiven(type);
                storeFeedback(user.id, contentId, type);
            }
            return;
        }

        // Prevent switching from one type to another without undo first
        if (feedbackGiven && feedbackGiven !== type) {
            message.info('Please remove your current feedback first before giving a different one.');
            return;
        }

        // Handle dislike with comment modal
        if (type === 'dislike') {
            setIsFeedbackModalVisible(true);
        } else {
            // Handle like
            setLikes(prev => prev + 1);
            setFeedbackGiven(type);
            storeFeedback(user.id, contentId, type);

            try {
                const promises: Promise<any>[] = [
                    updateFeedback(contentId, type, true, pageId)
                ];
                if (submitComment) {
                    promises.push(submitComment(contentType, contentId, '', type, 'added'));
                }
                await Promise.all(promises);
            } catch (error) {
                logHookFailure('answerlattice_feedback_submit_failed', error, {
                    contentType,
                    feedbackType: type,
                    hasSubmitComment: Boolean(submitComment),
                    ...getBoundedHookStringContext('contentId', contentId),
                    ...getBoundedHookStringContext('pageId', pageId),
                });
                message.error('Failed to submit feedback. Please try again.');
                setLikes(prev => prev - 1);
                setFeedbackGiven(null);
                removeStoredFeedback(user.id, contentId);
            }
        }
    };

    const handleFeedbackSubmit = async (comment: string) => {
        setIsFeedbackModalVisible(false);

        if (!user?.id) {
            message.warning('Please log in to provide feedback.');
            return;
        }

        setDislikes(prev => prev + 1);
        setFeedbackGiven('dislike');
        storeFeedback(user.id, contentId, 'dislike');

        try {
            const promises: Promise<any>[] = [
                updateFeedback(contentId, 'dislike', true, pageId)
            ];

            // Add comment submission if handler provided
            if (submitComment) {
                promises.push(submitComment(contentType, contentId, comment, 'dislike', 'added'));
            }

            await Promise.all(promises);
            message.success('Thank you for your feedback!');
        } catch (error) {
            logHookFailure('answerlattice_feedback_comment_submit_failed', error, {
                contentType,
                commentPresent: comment.trim().length > 0,
                commentLength: comment.length,
                hasSubmitComment: Boolean(submitComment),
                ...getBoundedHookStringContext('contentId', contentId),
                ...getBoundedHookStringContext('pageId', pageId),
            });
            message.error('Failed to submit feedback. Please try again.');
            setDislikes(prev => prev - 1);
            setFeedbackGiven(null);
            removeStoredFeedback(user.id, contentId);
        }
    };

    return {
        likes,
        dislikes,
        feedbackGiven,
        isFeedbackModalVisible,
        handleFeedback,
        handleFeedbackSubmit,
        setIsFeedbackModalVisible,
    };
};
