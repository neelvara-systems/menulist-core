import { normalizeAnswerlatticeChatSessionId } from './chatSessionContracts';

export const DEV_CHAT_CLEANUP_MAX_SESSIONS = 50;

export type DevChatCleanupSummary = Readonly<{
    deletedSessionIds: string[];
    failedSessionIds: string[];
    imagesDeleted: number;
}>;

export function normalizeDevChatCleanupSessionIds(value: unknown): string[] | null {
    if (!Array.isArray(value) || value.length > DEV_CHAT_CLEANUP_MAX_SESSIONS) return null;

    const result: string[] = [];
    const seen = new Set<string>();
    for (const rawId of value) {
        const sessionId = normalizeAnswerlatticeChatSessionId(rawId);
        if (!sessionId || sessionId !== rawId) return null;
        if (seen.has(sessionId)) continue;
        seen.add(sessionId);
        result.push(sessionId);
    }
    return result;
}

export function summarizeDevChatCleanupResults(
    sessionIds: readonly string[],
    results: readonly PromiseSettledResult<unknown>[],
): DevChatCleanupSummary {
    if (sessionIds.length !== results.length) {
        throw new Error('dev_chat_cleanup_result_count_mismatch');
    }

    const deletedSessionIds: string[] = [];
    const failedSessionIds: string[] = [];
    let imagesDeleted = 0;

    results.forEach((result, index) => {
        const expectedSessionId = sessionIds[index];
        const value = result.status === 'fulfilled' && result.value && typeof result.value === 'object'
            ? result.value as Record<string, unknown>
            : null;
        const storageFilesDeleted = value?.storageFilesDeleted;
        const acknowledged = value?.success === true
            && value?.deleted === true
            && value?.sessionId === expectedSessionId
            && Number.isSafeInteger(storageFilesDeleted)
            && Number(storageFilesDeleted) >= 0;

        if (!acknowledged) {
            failedSessionIds.push(expectedSessionId);
            return;
        }

        deletedSessionIds.push(expectedSessionId);
        imagesDeleted += Number(storageFilesDeleted);
    });

    return { deletedSessionIds, failedSessionIds, imagesDeleted };
}
