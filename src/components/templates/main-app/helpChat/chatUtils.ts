import {
    getAnswerlatticeHelpChatDraftKeys,
    getLegacyHelpChatDraftKeys,
} from '@lib/answerlattice/helpChatDrafts';
import { getBoundedHelpChatStringContext, logHelpChatFailure } from './helpChatDiagnostics';

/**
 * Helper: Clear localStorage draft for current session
 */
export function clearDraft(
    sessionId: string | null | undefined,
    draftScope?: string | null,
): void {
    const scopedKeys = getAnswerlatticeHelpChatDraftKeys(draftScope, sessionId);
    const legacyKeys = getLegacyHelpChatDraftKeys(sessionId);
    const keys = Array.from(new Set([
        scopedKeys?.draftKey,
        scopedKeys?.imageDraftKey,
        legacyKeys.draftKey,
        legacyKeys.imageDraftKey,
    ].filter((key): key is string => Boolean(key))));
    let firstError: unknown;
    let failedRemovalCount = 0;

    for (const key of keys) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            firstError ??= error;
            failedRemovalCount += 1;
        }
    }

    if (failedRemovalCount > 0) {
        logHelpChatFailure('help_chat_draft_clear_failed', firstError, {
            ...getBoundedHelpChatStringContext('sessionId', sessionId),
            attemptedRemovalCount: keys.length,
            failedRemovalCount,
        });
    }
}

/**
 * Maximum messages per conversation session.
 * Prevents Firestore 1MB doc size limit from being hit on long conversations.
 * Keeps the most recent messages, preserving the first user message for context.
 */
export const MAX_CONVERSATION_MESSAGES = 50;

/**
 * Trim messages array to stay within the conversation limit.
 * Keeps the first message (original question) + most recent messages.
 */
export function trimMessages<T>(messages: T[]): T[] {
    if (messages.length <= MAX_CONVERSATION_MESSAGES) return messages;
    const first = messages[0];
    const recent = messages.slice(-(MAX_CONVERSATION_MESSAGES - 1));
    return [first, ...recent];
}

/**
 * Helper: Detect similar queries in query history
 * Returns array of similar queries found
 */
export function detectSimilarQueries(history: string[], newQuery: string): string[] {
    const similarQueries: string[] = [];

    // Normalize new query (lowercase, remove extra spaces)
    const normalizedNew = newQuery.toLowerCase().trim().replace(/\s+/g, ' ');

    for (const pastQuery of history) {
        const normalizedPast = pastQuery.toLowerCase().trim().replace(/\s+/g, ' ');

        // Check for exact or very similar matches
        if (normalizedPast === normalizedNew) {
            similarQueries.push(pastQuery);
            continue;
        }

        // Check for keyword overlap (at least 50% common words)
        const newWords = normalizedNew.split(' ').filter(w => w.length > 3);
        const pastWords = normalizedPast.split(' ').filter(w => w.length > 3);

        if (newWords.length > 0 && pastWords.length > 0) {
            const commonWords = newWords.filter(word => pastWords.includes(word));
            const similarity = commonWords.length / Math.max(newWords.length, pastWords.length);

            if (similarity >= 0.5) {
                similarQueries.push(pastQuery);
            }
        }
    }

    return similarQueries;
}
