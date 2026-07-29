import { ANSWERLATTICE_RETENTION_DAYS } from '@data/shared/answerlatticeRetention';

const DAY_MS = 24 * 60 * 60 * 1000;

const safeRead = (value: object, key: string): unknown => {
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

const finiteDateMillis = (value: unknown): number | null => {
    if (!(value instanceof Date)) return null;
    try {
        const millis = Date.prototype.getTime.call(value);
        return Number.isFinite(millis) ? millis : null;
    } catch {
        return null;
    }
};

const timestampLikeToMillis = (value: unknown): number | null => {
    if (value instanceof Date) {
        return finiteDateMillis(value);
    }
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    const toMillis = safeRead(value, 'toMillis');
    try {
        if (typeof toMillis === 'function') {
            const millis = Reflect.apply(toMillis, value, []);
            return Number.isFinite(millis) ? millis : null;
        }
        const toDate = safeRead(value, 'toDate');
        if (typeof toDate === 'function') {
            return finiteDateMillis(Reflect.apply(toDate, value, []));
        }
    } catch {
        return null;
    }
    const seconds = safeRead(value, 'seconds');
    return typeof seconds === 'number' && Number.isFinite(seconds)
        ? seconds * 1000
        : null;
};

export const isAnswerlatticeSearchHistoryAvailableForInteraction = (
    history: Record<string, unknown>,
    nowMs = Date.now(),
): boolean => {
    if (!Number.isFinite(nowMs)) return false;

    const expiresAtMs = timestampLikeToMillis(safeRead(history, 'expiresAt'));
    if (expiresAtMs !== null) return expiresAtMs > nowMs;

    const createdAtMs = timestampLikeToMillis(safeRead(history, 'createdOn'));
    if (createdAtMs === null) return false;
    const configuredRetentionDays = safeRead(history, 'retentionDays');
    const retentionDays = typeof configuredRetentionDays === 'number'
        && Number.isSafeInteger(configuredRetentionDays)
        && configuredRetentionDays > 0
        && configuredRetentionDays <= ANSWERLATTICE_RETENTION_DAYS.aiSearchHistory
        ? configuredRetentionDays
        : ANSWERLATTICE_RETENTION_DAYS.aiSearchHistory;
    return createdAtMs + (retentionDays * DAY_MS) > nowMs;
};
