/**
 * Generic localStorage utility for content feedback
 * Supports: article, changelog, faq, workflow, etc.
 */

type ContentType = 'article' | 'changelog' | 'faq' | 'workflow';
type FeedbackType = 'like' | 'dislike';

export interface FeedbackEntry {
    itemId: string;
    type: FeedbackType;
    timestamp: string;
}

const isBrowser = typeof window !== 'undefined';

const getStorageKey = (contentType: ContentType, userId: string) => {
    return `${contentType}_feedback_${userId}`;
};

const safeParse = (value: string | null): Record<string, FeedbackEntry> => {
    if (!value) return {};
    try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
        console.warn('Failed to parse feedback', error);
        return {};
    }
};

const readFeedback = (contentType: ContentType, userId: string): Record<string, FeedbackEntry> => {
    if (!isBrowser) return {};
    try {
        const stored = localStorage.getItem(getStorageKey(contentType, userId));
        return safeParse(stored);
    } catch (error) {
        console.warn('localStorage unavailable:', error);
        return {};
    }
};

const writeFeedback = (contentType: ContentType, userId: string, feedback: Record<string, FeedbackEntry>) => {
    if (!isBrowser) return;
    try {
        localStorage.setItem(getStorageKey(contentType, userId), JSON.stringify(feedback));
    } catch (error) {
        console.warn(`Failed to write ${contentType} feedback (localStorage may be unavailable):`, error);
    }
};

export const storeContentFeedback = (contentType: ContentType, userId: string, itemId: string, type: FeedbackType) => {
    const feedback = readFeedback(contentType, userId);
    feedback[itemId] = {
        itemId,
        type,
        timestamp: new Date().toISOString(),
    };
    writeFeedback(contentType, userId, feedback);
};

export const getStoredContentFeedback = (contentType: ContentType, userId: string, itemId: string): FeedbackType | null => {
    const feedback = readFeedback(contentType, userId);
    return feedback[itemId]?.type || null;
};

export const removeStoredContentFeedback = (contentType: ContentType, userId: string, itemId: string) => {
    const feedback = readFeedback(contentType, userId);
    delete feedback[itemId];
    writeFeedback(contentType, userId, feedback);
};

export const clearAllStoredContentFeedback = (contentType: ContentType, userId: string) => {
    if (!isBrowser) return;
    try {
        localStorage.removeItem(getStorageKey(contentType, userId));
    } catch (error) {
        console.warn(`Failed to clear ${contentType} feedback:`, error);
    }
};
