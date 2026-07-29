'use client';

import {
    DEPLOYMENT_IDENTITY_STORAGE_KEY,
    emitDeploymentIdentityUpdated,
} from '@constant/deploymentDebug';
import { clearAllCache } from '@lib/cache/swrLocalStorageProvider';
import { MENU_PROCESSING_DISMISS_STORAGE_KEY } from '@lib/extraction/menuProcessingDismissal';
import { clearCapturedLogs } from '@lib/localLogs/localLogsTracker';
import { writeActiveStoreContextId } from '@lib/multiOutlet/activeStoreContext';
import { clearUserContext } from '@lib/monitoring/logger';

export const AUTHENTICATED_SESSION_STORAGE_KEYS = [
    DEPLOYMENT_IDENTITY_STORAGE_KEY,
    'menulist_dashboard_project_id',
    'mobileMenuActiveProcessingJob',
    MENU_PROCESSING_DISMISS_STORAGE_KEY,
] as const;

export const AUTHENTICATED_LOCAL_STORAGE_KEYS = [
    'session_expired_shown',
] as const;

export const AUTHENTICATED_SESSION_STORAGE_PREFIXES = [
    'dismissedMenuProcessingJobs:',
    'menulist:activeProcessingJobId:',
    'menulist:mobileMenuActiveProcessingJob:',
    'menulist:pendingQualityAction:',
] as const;

type StorageLike = Pick<Storage, 'removeItem'> & Partial<Pick<Storage, 'key' | 'length'>>;

function removeStoragePrefixes(
    storage: StorageLike | null | undefined,
    prefixes: readonly string[],
): void {
    if (!storage || typeof storage.key !== 'function' || typeof storage.length !== 'number') return;
    const matchingKeys: string[] = [];
    try {
        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
                matchingKeys.push(key);
            }
        }
    } catch {
        return;
    }
    for (const key of matchingKeys) {
        try {
            storage.removeItem(key);
        } catch {
            // Continue clearing other authenticated browser state.
        }
    }
}

export function removeAuthenticatedStorageKeys(
    sessionStorage: StorageLike | null | undefined,
    localStorage: StorageLike | null | undefined,
): void {
    for (const key of AUTHENTICATED_SESSION_STORAGE_KEYS) {
        try {
            sessionStorage?.removeItem(key);
        } catch {
            // Browser storage can be unavailable in private or embedded contexts.
        }
    }
    removeStoragePrefixes(sessionStorage, AUTHENTICATED_SESSION_STORAGE_PREFIXES);

    for (const key of AUTHENTICATED_LOCAL_STORAGE_KEYS) {
        try {
            localStorage?.removeItem(key);
        } catch {
            // Browser storage can be unavailable in private or embedded contexts.
        }
    }
}

/**
 * Remove browser state that can identify or display the previous authenticated
 * tenant. Theme, language, consent, install and other device preferences remain.
 */
export function clearAuthenticatedBrowserState(): void {
    writeActiveStoreContextId(null);
    clearAllCache();
    clearCapturedLogs();
    clearUserContext();

    if (typeof window !== 'undefined') {
        removeAuthenticatedStorageKeys(window.sessionStorage, window.localStorage);
        emitDeploymentIdentityUpdated();
    }
}
