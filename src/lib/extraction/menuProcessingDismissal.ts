'use client';

/**
 * Client-side session persistence for dismissed menu-processing jobs.
 *
 * We keep dismissed preview jobs in sessionStorage for a short window so
 * page refreshes/reopens do not immediately redisplay review modals after
 * the owner intentionally closes a completed preview sheet.
 */

export const MENU_PROCESSING_DISMISS_STORAGE_KEY = 'dismissedMenuProcessingJobs';
export const MENU_PROCESSING_DISMISS_TTL_MS = 10 * 60 * 1000;

type DismissalRecord = {
    dismissedAt: number;
    expiresAt: number;
};

type DismissalMap = Record<string, DismissalRecord>;

function isBrowser() {
    return typeof window !== 'undefined';
}

function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readDismissals(nowMs = Date.now()): DismissalMap {
    if (!isBrowser()) {
        return {};
    }

    const raw = window.sessionStorage.getItem(MENU_PROCESSING_DISMISS_STORAGE_KEY);
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (!isObject(parsed)) {
            window.sessionStorage.removeItem(MENU_PROCESSING_DISMISS_STORAGE_KEY);
            return {};
        }

        const next: DismissalMap = {};
        let mutated = false;

        for (const [jobId, value] of Object.entries(parsed)) {
            if (typeof jobId !== 'string' || !jobId) {
                mutated = true;
                continue;
            }

            if (!isObject(value)) {
                mutated = true;
                continue;
            }

            const dismissedAt = Number(value.dismissedAt);
            const expiresAt = Number(value.expiresAt);

            if (!Number.isFinite(dismissedAt) || !Number.isFinite(expiresAt) || expiresAt <= nowMs) {
                mutated = true;
                continue;
            }

            next[jobId] = {
                dismissedAt,
                expiresAt,
            };
        }

        if (mutated) {
            if (Object.keys(next).length === 0) {
                window.sessionStorage.removeItem(MENU_PROCESSING_DISMISS_STORAGE_KEY);
            } else {
                window.sessionStorage.setItem(MENU_PROCESSING_DISMISS_STORAGE_KEY, JSON.stringify(next));
            }
        }

        return next;
    } catch {
        window.sessionStorage.removeItem(MENU_PROCESSING_DISMISS_STORAGE_KEY);
        return {};
    }
}

function writeDismissals(map: DismissalMap) {
    if (!isBrowser()) return;

    if (Object.keys(map).length === 0) {
        window.sessionStorage.removeItem(MENU_PROCESSING_DISMISS_STORAGE_KEY);
        return;
    }

    window.sessionStorage.setItem(MENU_PROCESSING_DISMISS_STORAGE_KEY, JSON.stringify(map));
}

export function getDismissedMenuProcessingJobIds(nowMs = Date.now()): string[] {
    return Object.keys(readDismissals(nowMs));
}

export function markMenuProcessingJobAsDismissed(jobId: string, ttlMs = MENU_PROCESSING_DISMISS_TTL_MS): void {
    if (!isBrowser() || !jobId) return;

    const now = Date.now();
    const map = readDismissals(now);
    map[jobId] = {
        dismissedAt: now,
        expiresAt: now + ttlMs,
    };
    writeDismissals(map);
}

export function clearMenuProcessingJobDismissal(jobId: string): void {
    if (!isBrowser() || !jobId) return;

    const map = readDismissals();
    if (!(jobId in map)) return;

    delete map[jobId];
    writeDismissals(map);
}

export function clearExpiredMenuProcessingJobDismissals(): void {
    if (!isBrowser()) return;
    const map = readDismissals();
    writeDismissals(map);
}
