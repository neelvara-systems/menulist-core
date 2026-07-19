import { ANSWERLATTICE_RETENTION_DAYS } from '@data/shared/answerlatticeRetention';

const DAY_MS = 24 * 60 * 60 * 1000;

const timestampLikeToMillis = (value: unknown): number | null => {
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) ? millis : null;
    }
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    const timestamp = value as {
        seconds?: unknown;
        toDate?: () => unknown;
        toMillis?: () => unknown;
    };
    try {
        if (typeof timestamp.toMillis === 'function') {
            const millis = Number(timestamp.toMillis());
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof timestamp.toDate === 'function') {
            const date = timestamp.toDate();
            if (date instanceof Date) {
                const millis = date.getTime();
                return Number.isFinite(millis) ? millis : null;
            }
        }
    } catch {
        return null;
    }
    const seconds = Number(timestamp.seconds);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
};

export const isAnswerlatticeSearchHistoryAvailableForInteraction = (
    history: Record<string, unknown>,
    nowMs = Date.now(),
): boolean => {
    const expiresAtMs = timestampLikeToMillis(history.expiresAt);
    if (expiresAtMs !== null) return expiresAtMs > nowMs;

    const createdAtMs = timestampLikeToMillis(history.createdOn);
    if (createdAtMs === null) return false;
    const configuredRetentionDays = Number(history.retentionDays);
    const retentionDays = Number.isSafeInteger(configuredRetentionDays)
        && configuredRetentionDays > 0
        && configuredRetentionDays <= ANSWERLATTICE_RETENTION_DAYS.aiSearchHistory
        ? configuredRetentionDays
        : ANSWERLATTICE_RETENTION_DAYS.aiSearchHistory;
    return createdAtMs + (retentionDays * DAY_MS) > nowMs;
};
