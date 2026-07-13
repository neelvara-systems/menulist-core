import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import type { ContentFeedbackStorageScope } from '@lib/contentFeedbackStorage';

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
    updateFeedback: (
        contentId: string,
        type: FeedbackType,
        increment?: boolean,
        pageId?: string,
        comment?: string,
        action?: 'added' | 'removed',
    ) => Promise<unknown>;
    storeFeedback: (scope: ContentFeedbackStorageScope, userId: string, contentId: string, type: FeedbackType) => void;
    getStoredFeedback: (scope: ContentFeedbackStorageScope, userId: string, contentId: string) => FeedbackType | null;
    removeStoredFeedback: (scope: ContentFeedbackStorageScope, userId: string, contentId: string) => void;
}

interface UseFeedbackReturn {
    likes: number;
    dislikes: number;
    feedbackGiven: FeedbackType | null;
    isFeedbackModalVisible: boolean;
    isSubmitting: boolean;
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
    const session = useClientAuthSession();
    const { user } = session || {};
    const resolvedScope = resolveAnswerlatticeSessionScope(session);
    const storageScope = resolvedScope
        ? { tId: resolvedScope.tenantId, sId: resolvedScope.storeId }
        : null;
    const { contentType, contentId, pageId, initialLikes = 0, initialDislikes = 0 } = config;
    const {
        updateFeedback,
        storeFeedback,
        getStoredFeedback,
        removeStoredFeedback,
    } = handlers;

    const [likes, setLikes] = useState(initialLikes);
    const [dislikes, setDislikes] = useState(initialDislikes);
    const [feedbackGiven, setFeedbackGiven] = useState<FeedbackType | null>(null);
    const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const mutationInFlightRef = useRef(false);

    const beginMutation = () => {
        if (mutationInFlightRef.current) return false;
        mutationInFlightRef.current = true;
        setIsSubmitting(true);
        return true;
    };

    const endMutation = () => {
        mutationInFlightRef.current = false;
        setIsSubmitting(false);
    };

    useEffect(() => {
        setLikes(initialLikes);
        setDislikes(initialDislikes);
        setFeedbackGiven(null);
    }, [contentId, initialDislikes, initialLikes, storageScope?.tId, storageScope?.sId]);

    // Load feedback status after content/workspace state is reset.
    useEffect(() => {
        if (!user?.id || !storageScope) return;
        const feedbackStatus = getStoredFeedback(storageScope, user.id, contentId);
        setFeedbackGiven(feedbackStatus);
    }, [contentId, user?.id, storageScope?.tId, storageScope?.sId, getStoredFeedback]);

    const handleFeedback = async (type: FeedbackType) => {
        // Check authentication
        if (!user?.id || !storageScope) {
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
            if (!beginMutation()) return;
            // Undo feedback
            if (type === 'like') {
                setLikes(prev => prev - 1);
            } else {
                setDislikes(prev => prev - 1);
            }
            setFeedbackGiven(null);
            removeStoredFeedback(storageScope, user.id, contentId);

            try {
                // Decrement the count in database
                await updateFeedback(contentId, type, false, pageId, '', 'removed');
                message.success('Feedback removed.');
            } catch (error) {
                logHookFailure('answerlattice_feedback_remove_failed', error, {
                    contentType,
                    feedbackType: type,
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
                storeFeedback(storageScope, user.id, contentId, type);
            } finally {
                endMutation();
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
            if (!beginMutation()) return;
            // Handle like
            setLikes(prev => prev + 1);
            setFeedbackGiven(type);
            storeFeedback(storageScope, user.id, contentId, type);

            try {
                await updateFeedback(contentId, type, true, pageId, '', 'added');
            } catch (error) {
                logHookFailure('answerlattice_feedback_submit_failed', error, {
                    contentType,
                    feedbackType: type,
                    ...getBoundedHookStringContext('contentId', contentId),
                    ...getBoundedHookStringContext('pageId', pageId),
                });
                message.error('Failed to submit feedback. Please try again.');
                setLikes(prev => prev - 1);
                setFeedbackGiven(null);
                removeStoredFeedback(storageScope, user.id, contentId);
            } finally {
                endMutation();
            }
        }
    };

    const handleFeedbackSubmit = async (comment: string) => {
        setIsFeedbackModalVisible(false);

        if (!user?.id || !storageScope) {
            message.warning('Please log in to provide feedback.');
            return;
        }
        if (!beginMutation()) return;

        setDislikes(prev => prev + 1);
        setFeedbackGiven('dislike');
        storeFeedback(storageScope, user.id, contentId, 'dislike');

        try {
            await updateFeedback(contentId, 'dislike', true, pageId, comment, 'added');
            message.success('Thank you for your feedback!');
        } catch (error) {
            logHookFailure('answerlattice_feedback_comment_submit_failed', error, {
                contentType,
                commentPresent: comment.trim().length > 0,
                commentLength: comment.length,
                ...getBoundedHookStringContext('contentId', contentId),
                ...getBoundedHookStringContext('pageId', pageId),
            });
            message.error('Failed to submit feedback. Please try again.');
            setDislikes(prev => prev - 1);
            setFeedbackGiven(null);
            removeStoredFeedback(storageScope, user.id, contentId);
        } finally {
            endMutation();
        }
    };

    return {
        likes,
        dislikes,
        feedbackGiven,
        isFeedbackModalVisible,
        isSubmitting,
        handleFeedback,
        handleFeedbackSubmit,
        setIsFeedbackModalVisible,
    };
};
