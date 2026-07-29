'use client';

import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';

/**
 * Client-side session persistence for dismissed menu-processing jobs.
 *
 * We keep dismissed preview jobs in sessionStorage for a short window so
 * page refreshes/reopens do not immediately redisplay review modals after
 * the owner intentionally closes a completed preview sheet.
 */

export const MENU_PROCESSING_DISMISS_STORAGE_KEY = 'dismissedMenuProcessingJobs';
export const MENU_PROCESSING_DISMISS_TTL_MS = 10 * 60 * 1000;
const MENU_PROCESSING_DISMISS_MAX_TTL_MS = 60 * 60 * 1000;
const MENU_PROCESSING_DISMISS_MAX_RECORDS = 100;

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

export type MenuProcessingDismissalScope = {
    tenantId: unknown;
    storeId: unknown;
};

export function getMenuProcessingDismissalStorageKey(
    scope: MenuProcessingDismissalScope,
): string | null {
    return getTenantStoreStorageKey(
        MENU_PROCESSING_DISMISS_STORAGE_KEY,
        scope.tenantId,
        scope.storeId,
    );
}

function isValidJobId(value: unknown): value is string {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= 160
        && value.trim() === value
        && !/[\/\u0000-\u001f\u007f]/.test(value);
}

function readDismissals(storageKey: string | null, nowMs = Date.now()): DismissalMap {
    if (!isBrowser() || !storageKey || !Number.isSafeInteger(nowMs) || nowMs < 0) {
        return {};
    }

    try {
        const raw = window.sessionStorage.getItem(storageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!isObject(parsed) || Object.keys(parsed).length > MENU_PROCESSING_DISMISS_MAX_RECORDS) {
            window.sessionStorage.removeItem(storageKey);
            return {};
        }

        const next: DismissalMap = {};
        let mutated = false;

        for (const [jobId, value] of Object.entries(parsed)) {
            if (!isValidJobId(jobId)) {
                mutated = true;
                continue;
            }

            if (!isObject(value)) {
                mutated = true;
                continue;
            }

            const dismissedAt = value.dismissedAt;
            const expiresAt = value.expiresAt;

            if (
                typeof dismissedAt !== 'number'
                || typeof expiresAt !== 'number'
                || !Number.isSafeInteger(dismissedAt)
                || !Number.isSafeInteger(expiresAt)
                || dismissedAt < 0
                || dismissedAt > nowMs
                || expiresAt <= nowMs
                || expiresAt <= dismissedAt
                || expiresAt - dismissedAt > MENU_PROCESSING_DISMISS_MAX_TTL_MS
            ) {
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
                window.sessionStorage.removeItem(storageKey);
            } else {
                window.sessionStorage.setItem(storageKey, JSON.stringify(next));
            }
        }

        return next;
    } catch {
        try {
            window.sessionStorage.removeItem(storageKey);
        } catch {
            // Browser storage can be unavailable in private or embedded contexts.
        }
        return {};
    }
}

function writeDismissals(storageKey: string | null, map: DismissalMap) {
    if (!isBrowser() || !storageKey) return;

    try {
        if (Object.keys(map).length === 0) {
            window.sessionStorage.removeItem(storageKey);
            return;
        }

        window.sessionStorage.setItem(storageKey, JSON.stringify(map));
    } catch {
        // Dismissal is a best-effort UI preference and must not break review actions.
    }
}

export function getDismissedMenuProcessingJobIds(
    scope: MenuProcessingDismissalScope,
    nowMs = Date.now(),
): string[] {
    return Object.keys(readDismissals(getMenuProcessingDismissalStorageKey(scope), nowMs));
}

export function markMenuProcessingJobAsDismissed(
    scope: MenuProcessingDismissalScope,
    jobId: string,
    ttlMs = MENU_PROCESSING_DISMISS_TTL_MS,
): void {
    const storageKey = getMenuProcessingDismissalStorageKey(scope);
    if (
        !isBrowser()
        || !storageKey
        || !isValidJobId(jobId)
        || !Number.isSafeInteger(ttlMs)
        || ttlMs <= 0
        || ttlMs > MENU_PROCESSING_DISMISS_MAX_TTL_MS
    ) return;

    const now = Date.now();
    const map = readDismissals(storageKey, now);
    map[jobId] = {
        dismissedAt: now,
        expiresAt: now + ttlMs,
    };
    writeDismissals(storageKey, map);
}

export function clearMenuProcessingJobDismissal(
    scope: MenuProcessingDismissalScope,
    jobId: string,
): void {
    const storageKey = getMenuProcessingDismissalStorageKey(scope);
    if (!isBrowser() || !storageKey || !isValidJobId(jobId)) return;

    const map = readDismissals(storageKey);
    if (!(jobId in map)) return;

    delete map[jobId];
    writeDismissals(storageKey, map);
}

export function clearExpiredMenuProcessingJobDismissals(
    scope: MenuProcessingDismissalScope,
): void {
    const storageKey = getMenuProcessingDismissalStorageKey(scope);
    if (!isBrowser() || !storageKey) return;
    const map = readDismissals(storageKey);
    writeDismissals(storageKey, map);
}
