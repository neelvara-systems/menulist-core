/**
 * Tenant/store/user-scoped browser acknowledgement for content reactions.
 * Firestore remains authoritative; malformed or legacy identity-less cache
 * entries are removed and refetched through normal content state.
 */

import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

type ContentType = 'article' | 'changelog' | 'faq' | 'workflow';
type FeedbackType = 'like' | 'dislike';

export type ContentFeedbackStorageScope = {
    tId: number;
    sId: number;
};

export interface FeedbackEntry {
    itemId: string;
    type: FeedbackType;
    timestamp: string;
}

type ContentFeedbackStorageEnvelope = {
    version: 1;
    tId: number;
    sId: number;
    userId: string;
    entries: Record<string, FeedbackEntry>;
};

const CONTENT_FEEDBACK_STORAGE_VERSION = 1;
const CONTENT_FEEDBACK_STORAGE_MAX_ENTRIES = 500;
const CONTENT_FEEDBACK_ID_MAX_LENGTH = 180;
const isBrowser = typeof window !== 'undefined';

const createEmptyEntries = (): Record<string, FeedbackEntry> => Object.create(null) as Record<string, FeedbackEntry>;

const normalizeScope = (scope: ContentFeedbackStorageScope): ContentFeedbackStorageScope | null => (
    Number.isSafeInteger(scope?.tId) && scope.tId > 0
    && Number.isSafeInteger(scope?.sId) && scope.sId > 0
        ? { tId: scope.tId, sId: scope.sId }
        : null
);

const normalizeStorageId = (value: unknown): string | null => {
    const id = typeof value === 'string' ? value.trim() : '';
    return id
        && id.length <= CONTENT_FEEDBACK_ID_MAX_LENGTH
        && isValidFirestoreDocumentId(id)
        ? id
        : null;
};

const normalizeTimestamp = (value: unknown): string | null => {
    if (typeof value !== 'string' || value.length > 40) return null;
    const timestamp = new Date(value);
    return Number.isFinite(timestamp.getTime())
        && timestamp.getTime() <= Date.now()
        && timestamp.toISOString() === value
        ? value
        : null;
};

const getStorageKey = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
) => `content-feedback-v${CONTENT_FEEDBACK_STORAGE_VERSION}:${contentType}:${scope.tId}:${scope.sId}:${encodeURIComponent(userId)}`;

export const getContentFeedbackStorageKey = getStorageKey;

const normalizeEnvelope = (
    value: unknown,
    scope: ContentFeedbackStorageScope,
    userId: string,
): ContentFeedbackStorageEnvelope | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const envelope = value as Record<string, unknown>;
    if (envelope.version !== CONTENT_FEEDBACK_STORAGE_VERSION
        || envelope.tId !== scope.tId
        || envelope.sId !== scope.sId
        || envelope.userId !== userId
        || !envelope.entries
        || typeof envelope.entries !== 'object'
        || Array.isArray(envelope.entries)) {
        return null;
    }

    const rawEntries = Object.entries(envelope.entries as Record<string, unknown>);
    if (rawEntries.length > CONTENT_FEEDBACK_STORAGE_MAX_ENTRIES) return null;
    const entries = createEmptyEntries();
    for (const [key, rawEntry] of rawEntries) {
        if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) return null;
        const entry = rawEntry as Record<string, unknown>;
        const itemId = normalizeStorageId(entry.itemId);
        const timestamp = normalizeTimestamp(entry.timestamp);
        if (!itemId
            || key !== itemId
            || (entry.type !== 'like' && entry.type !== 'dislike')
            || !timestamp
            || Object.keys(entry).some(field => !['itemId', 'type', 'timestamp'].includes(field))) {
            return null;
        }
        entries[itemId] = { itemId, type: entry.type, timestamp };
    }

    return {
        version: CONTENT_FEEDBACK_STORAGE_VERSION,
        tId: scope.tId,
        sId: scope.sId,
        userId,
        entries,
    };
};

export const normalizeContentFeedbackStorageEnvelope = normalizeEnvelope;

const readFeedback = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
): Record<string, FeedbackEntry> => {
    if (!isBrowser) return createEmptyEntries();
    const key = getStorageKey(contentType, scope, userId);
    let stored: string | null;
    try {
        stored = localStorage.getItem(key);
    } catch (error) {
        logHookFailure('content_feedback_storage_read_failed', error, {
            contentType,
            ...getBoundedHookStringContext('userId', userId),
        });
        return createEmptyEntries();
    }
    if (!stored) return createEmptyEntries();

    try {
        const envelope = normalizeEnvelope(JSON.parse(stored) as unknown, scope, userId);
        if (envelope) return envelope.entries;
        localStorage.removeItem(key);
        return createEmptyEntries();
    } catch (error) {
        try {
            localStorage.removeItem(key);
        } catch (evictionError) {
            logHookFailure('content_feedback_storage_read_failed', evictionError, {
                contentType,
                ...getBoundedHookStringContext('userId', userId),
                operation: 'invalid_cache_eviction',
            });
        }
        logHookFailure('content_feedback_storage_parse_failed', error, {
            contentType,
            ...getBoundedHookStringContext('userId', userId),
        });
        return createEmptyEntries();
    }
};

const writeFeedback = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
    feedback: Record<string, FeedbackEntry>,
) => {
    if (!isBrowser) return;
    const entries = Object.fromEntries(
        Object.values(feedback)
            .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
            .slice(0, CONTENT_FEEDBACK_STORAGE_MAX_ENTRIES)
            .map(entry => [entry.itemId, entry]),
    );
    const envelope: ContentFeedbackStorageEnvelope = {
        version: CONTENT_FEEDBACK_STORAGE_VERSION,
        tId: scope.tId,
        sId: scope.sId,
        userId,
        entries,
    };
    try {
        localStorage.setItem(getStorageKey(contentType, scope, userId), JSON.stringify(envelope));
    } catch (error) {
        logHookFailure('content_feedback_storage_write_failed', error, {
            contentType,
            ...getBoundedHookStringContext('userId', userId),
            feedbackCount: Object.keys(entries).length,
        });
    }
};

const normalizeStorageContext = (
    scope: ContentFeedbackStorageScope,
    userId: unknown,
    itemId?: unknown,
) => {
    const normalizedScope = normalizeScope(scope);
    const normalizedUserId = normalizeStorageId(userId);
    const normalizedItemId = itemId === undefined ? undefined : normalizeStorageId(itemId);
    return normalizedScope && normalizedUserId && (itemId === undefined || normalizedItemId)
        ? { scope: normalizedScope, userId: normalizedUserId, itemId: normalizedItemId }
        : null;
};

export const storeContentFeedback = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
    itemId: string,
    type: FeedbackType,
) => {
    const context = normalizeStorageContext(scope, userId, itemId);
    if (!context || (type !== 'like' && type !== 'dislike') || !context.itemId) return;
    const feedback = readFeedback(contentType, context.scope, context.userId);
    feedback[context.itemId] = {
        itemId: context.itemId,
        type,
        timestamp: new Date().toISOString(),
    };
    writeFeedback(contentType, context.scope, context.userId, feedback);
};

export const getStoredContentFeedback = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
    itemId: string,
): FeedbackType | null => {
    const context = normalizeStorageContext(scope, userId, itemId);
    if (!context?.itemId) return null;
    return readFeedback(contentType, context.scope, context.userId)[context.itemId]?.type || null;
};

export const removeStoredContentFeedback = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
    itemId: string,
) => {
    const context = normalizeStorageContext(scope, userId, itemId);
    if (!context?.itemId) return;
    const feedback = readFeedback(contentType, context.scope, context.userId);
    delete feedback[context.itemId];
    writeFeedback(contentType, context.scope, context.userId, feedback);
};

export const clearAllStoredContentFeedback = (
    contentType: ContentType,
    scope: ContentFeedbackStorageScope,
    userId: string,
) => {
    if (!isBrowser) return;
    const context = normalizeStorageContext(scope, userId);
    if (!context) return;
    try {
        localStorage.removeItem(getStorageKey(contentType, context.scope, context.userId));
    } catch (error) {
        logHookFailure('content_feedback_storage_clear_failed', error, {
            contentType,
            ...getBoundedHookStringContext('userId', context.userId),
        });
    }
};
