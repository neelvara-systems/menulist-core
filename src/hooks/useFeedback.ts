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
    handleFeedbackSubmit: (comment: string) => Promise<boolean>;
    setIsFeedbackModalVisible: (visible: boolean) => void;
}

const normalizeFeedbackCount = (value: unknown): number => (
    Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0
);

const getAuthoritativeFeedbackCounts = (value: unknown): { likes: number; dislikes: number } | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const result = value as Record<string, unknown>;
    if (!Number.isSafeInteger(result.likes)
        || Number(result.likes) < 0
        || !Number.isSafeInteger(result.dislikes)
        || Number(result.dislikes) < 0) {
        return null;
    }
    return { likes: Number(result.likes), dislikes: Number(result.dislikes) };
};

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

    const [likes, setLikes] = useState(normalizeFeedbackCount(initialLikes));
    const [dislikes, setDislikes] = useState(normalizeFeedbackCount(initialDislikes));
    const [feedbackGiven, setFeedbackGiven] = useState<FeedbackType | null>(null);
    const [isFeedbackModalVisible, setIsFeedbackModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const mutationInFlightRef = useRef(false);
    const mutationTokenRef = useRef(0);
    const operationScopeKey = JSON.stringify([
        contentType,
        contentId,
        pageId ?? null,
        user?.id ?? null,
        storageScope?.tId ?? null,
        storageScope?.sId ?? null,
    ]);
    const activeOperationScopeKeyRef = useRef(operationScopeKey);
    activeOperationScopeKeyRef.current = operationScopeKey;

    const beginMutation = (scopeKey: string): number | null => {
        if (mutationInFlightRef.current) return null;
        mutationInFlightRef.current = true;
        mutationTokenRef.current += 1;
        setIsSubmitting(true);
        return mutationTokenRef.current;
    };

    const isCurrentMutation = (token: number, scopeKey: string) => (
        mutationTokenRef.current === token
        && activeOperationScopeKeyRef.current === scopeKey
    );

    const endMutation = (token: number, scopeKey: string) => {
        if (!isCurrentMutation(token, scopeKey)) return;
        mutationInFlightRef.current = false;
        setIsSubmitting(false);
    };

    useEffect(() => {
        mutationTokenRef.current += 1;
        mutationInFlightRef.current = false;
        setIsSubmitting(false);
        setIsFeedbackModalVisible(false);
        setLikes(normalizeFeedbackCount(initialLikes));
        setDislikes(normalizeFeedbackCount(initialDislikes));
        setFeedbackGiven(null);
    }, [
        contentId,
        contentType,
        initialDislikes,
        initialLikes,
        pageId,
        storageScope?.sId,
        storageScope?.tId,
        user?.id,
    ]);

    // Load feedback status after content/workspace state is reset.
    useEffect(() => {
        if (!user?.id || !storageScope) return;
        const feedbackStatus = getStoredFeedback(storageScope, user.id, contentId);
        setFeedbackGiven(feedbackStatus);
    }, [contentId, user?.id, storageScope?.tId, storageScope?.sId, getStoredFeedback]);

    const applyAuthoritativeFeedbackCounts = (value: unknown) => {
        const counts = getAuthoritativeFeedbackCounts(value);
        if (!counts) return;
        setLikes(counts.likes);
        setDislikes(counts.dislikes);
    };

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
            const mutationScopeKey = operationScopeKey;
            const mutationToken = beginMutation(mutationScopeKey);
            if (mutationToken === null) return;
            const previousLikes = likes;
            const previousDislikes = dislikes;
            // Undo feedback
            if (type === 'like') {
                setLikes(Math.max(0, previousLikes - 1));
            } else {
                setDislikes(Math.max(0, previousDislikes - 1));
            }
            setFeedbackGiven(null);
            removeStoredFeedback(storageScope, user.id, contentId);

            try {
                // Decrement the count in database
                const result = await updateFeedback(contentId, type, false, pageId, '', 'removed');
                if (isCurrentMutation(mutationToken, mutationScopeKey)) {
                    applyAuthoritativeFeedbackCounts(result);
                    message.success('Feedback removed.');
                }
            } catch (error) {
                logHookFailure('answerlattice_feedback_remove_failed', error, {
                    contentType,
                    feedbackType: type,
                    ...getBoundedHookStringContext('contentId', contentId),
                    ...getBoundedHookStringContext('pageId', pageId),
                });
                storeFeedback(storageScope, user.id, contentId, type);
                if (isCurrentMutation(mutationToken, mutationScopeKey)) {
                    message.error('Failed to remove feedback. Please try again.');
                    // Rollback UI
                    setLikes(previousLikes);
                    setDislikes(previousDislikes);
                    setFeedbackGiven(type);
                }
            } finally {
                endMutation(mutationToken, mutationScopeKey);
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
            const mutationScopeKey = operationScopeKey;
            const mutationToken = beginMutation(mutationScopeKey);
            if (mutationToken === null) return;
            const previousLikes = likes;
            // Handle like
            setLikes(previousLikes + 1);
            setFeedbackGiven(type);
            storeFeedback(storageScope, user.id, contentId, type);

            try {
                const result = await updateFeedback(contentId, type, true, pageId, '', 'added');
                if (isCurrentMutation(mutationToken, mutationScopeKey)) {
                    applyAuthoritativeFeedbackCounts(result);
                }
            } catch (error) {
                logHookFailure('answerlattice_feedback_submit_failed', error, {
                    contentType,
                    feedbackType: type,
                    ...getBoundedHookStringContext('contentId', contentId),
                    ...getBoundedHookStringContext('pageId', pageId),
                });
                removeStoredFeedback(storageScope, user.id, contentId);
                if (isCurrentMutation(mutationToken, mutationScopeKey)) {
                    message.error('Failed to submit feedback. Please try again.');
                    setLikes(previousLikes);
                    setFeedbackGiven(null);
                }
            } finally {
                endMutation(mutationToken, mutationScopeKey);
            }
        }
    };

    const handleFeedbackSubmit = async (comment: string) => {
        if (!user?.id || !storageScope) {
            message.warning('Please log in to provide feedback.');
            return false;
        }
        const mutationScopeKey = operationScopeKey;
        const mutationToken = beginMutation(mutationScopeKey);
        if (mutationToken === null) return false;

        const previousDislikes = dislikes;
        setDislikes(previousDislikes + 1);
        setFeedbackGiven('dislike');
        storeFeedback(storageScope, user.id, contentId, 'dislike');

        try {
            const result = await updateFeedback(contentId, 'dislike', true, pageId, comment, 'added');
            if (!isCurrentMutation(mutationToken, mutationScopeKey)) return false;
            applyAuthoritativeFeedbackCounts(result);
            setIsFeedbackModalVisible(false);
            message.success('Thank you for your feedback!');
            return true;
        } catch (error) {
            logHookFailure('answerlattice_feedback_comment_submit_failed', error, {
                contentType,
                commentPresent: comment.trim().length > 0,
                commentLength: comment.length,
                ...getBoundedHookStringContext('contentId', contentId),
                ...getBoundedHookStringContext('pageId', pageId),
            });
            removeStoredFeedback(storageScope, user.id, contentId);
            if (isCurrentMutation(mutationToken, mutationScopeKey)) {
                message.error('Failed to submit feedback. Please try again.');
                setDislikes(previousDislikes);
                setFeedbackGiven(null);
            }
            return false;
        } finally {
            endMutation(mutationToken, mutationScopeKey);
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
