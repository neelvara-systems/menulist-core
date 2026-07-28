/**
 * PWA Settings DAL — Customer App (installable menu)
 *
 * Minimal surface: all PWA config lives on the existing `stores/{storeId}` doc
 * under two namespaces:
 *   - `pwaSettings`              — behavior flags (enable install, prompt promotion, short name)
 *   - `publicPresence.pwaIcon*`  — icon override URL + mode (generated vs override)
 *     ↑ reuses the existing OBP/branding namespace. No new top-level field.
 *
 * No new collection. No new schema version.
 *
 * @see __docs__/customer-app/customer-app_impl.md §Database Schema
 */

import { DB_COLLECTIONS } from '@constant/database';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { requestBodyComposer } from '@lib/apiHelper';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { revalidatePublicClientCache } from '@lib/cache/publicClientCache';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { firebaseStorage } from '@lib/firebase/firebaseClient';
import { uploadFile } from '@lib/firebase/storage';
import getActiveSession from '@lib/auth/getActiveSession';
import { normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';
import { assertPreparedPWAIconFile, isPWAIconStoragePath } from '@lib/pwa/pwaIconStorageBoundary';
import { readCommittedPWAIconOverride } from '@lib/pwa/pwaIconCommitBoundary';
import { createRuntimeId } from '@lib/runtime/randomId';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { STORAGE_CACHE_CONTROL } from '@lib/storage/cacheControl';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { summarizeStorageCleanupResults } from '@lib/storage/storageCleanupResults';
import { getLocalizedText, getPrimaryLocalizedLanguage, isLocalizedText, LocalizedTextValue } from '@lib/localization/text';
import { doc, getDocFromServer, updateDoc } from 'firebase/firestore';
import { ref } from 'firebase/storage';

const COLLECTION = DB_COLLECTIONS.STORES;

const getDocRef = (storeId: string | number) =>
    doc(firebaseClient, COLLECTION, String(storeId));

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PWASettings {
    /** Master enable for installable app on this store. Defaults to true if undefined. */
    enableInstallableApp?: boolean;
    /** Whether to show the install prompt banner. Defaults to true. */
    promoteInstallation?: boolean;
    /** Override short_name in manifest (max 12 chars). Falls back to first word of store name. */
    pwaShortName?: string | Record<string, string>;
}

export interface ResolvedPWASettings {
    enableInstallableApp: boolean;
    promoteInstallation: boolean;
    pwaShortName: string;
}

export type PWAIconMode = 'generated' | 'override';

export interface PWAIconOverride {
    /** Full Firebase Storage URL for an owner-uploaded icon. */
    pwaIconOverrideUrl: string | null;
    pwaIconMode: PWAIconMode;
    /** Cache-busting marker for manifest/apple-touch-icon/startup-image URLs. */
    pwaIconUpdatedAt?: string;
}

export interface PWAIconUploadInput {
    file: File;
    tenantId: string | number;
    storeId: string | number;
    onProgress?: (progress: number) => void;
}

export type PWAIconCleanupOperation = 'remove' | 'replace';

export type PWASettingsUpdateResult = {
    success: true;
    updated: string[];
} | {
    noop: true;
};

export type PWAIconOverrideUpdateResult = {
    success: true;
    pwaIconUpdatedAt: string;
};

export type PWAIconReplacementResult = PWAIconOverrideUpdateResult & {
    url: string;
};

export const isPWASettingsUpdateResult = (result: unknown): result is PWASettingsUpdateResult => {
    if (!result || typeof result !== 'object' || Array.isArray(result)) return false;
    const candidate = result as { success?: unknown; updated?: unknown; noop?: unknown };
    return (
        (candidate.success === true && Array.isArray(candidate.updated))
        || candidate.noop === true
    );
};

export function assertPWASettingsUpdateSucceeded(result: unknown): asserts result is PWASettingsUpdateResult {
    if (isPWASettingsUpdateResult(result)) return;
    throw new Error('pwa_settings_update_rejected');
}

export const isPWAIconOverrideUpdateResult = (result: unknown): result is PWAIconOverrideUpdateResult => (
    Boolean(result && typeof result === 'object')
    && !Array.isArray(result)
    && (result as PWAIconOverrideUpdateResult).success === true
    && typeof (result as PWAIconOverrideUpdateResult).pwaIconUpdatedAt === 'string'
);

export function assertPWAIconOverrideUpdateSucceeded(result: unknown): asserts result is PWAIconOverrideUpdateResult {
    if (isPWAIconOverrideUpdateResult(result)) return;
    throw new Error('pwa_icon_override_update_rejected');
}

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

type PWAIconScope = { tenantId: number; storeId: number };

const getRequiredPWAScope = async (
    storeId: unknown,
    tenantId?: unknown,
): Promise<PWAIconScope> => {
    const session = await getActiveSession();
    const sessionTenantId = normalizeStoreSwitchStoreId(session?.tId);
    const sessionStoreId = normalizeStoreSwitchStoreId(session?.sId);
    const requestedStoreId = normalizeStoreSwitchStoreId(storeId);
    const requestedTenantId = tenantId === undefined
        ? sessionTenantId
        : normalizeStoreSwitchStoreId(tenantId);
    if (
        !sessionTenantId
        || !sessionStoreId
        || !requestedTenantId
        || !requestedStoreId
        || requestedTenantId !== sessionTenantId
        || requestedStoreId !== sessionStoreId
    ) throw new Error('pwa_store_scope_invalid');
    return { tenantId: requestedTenantId, storeId: requestedStoreId };
};

const isOwnedPWAIconUrl = (value: unknown, scope: PWAIconScope): value is string => {
    if (typeof value !== 'string' || !value) return false;
    try {
        const iconRef = ref(firebaseStorage, value);
        return iconRef.bucket === ref(firebaseStorage).bucket
            && isPWAIconStoragePath(iconRef.fullPath, scope);
    } catch {
        return false;
    }
};

/**
 * Update PWA behavior settings on a store. Merges only the provided fields;
 * all other store fields are untouched.
 */
export const updatePWASettings = async (
    storeId: string | number,
    settings: Partial<PWASettings>,
) => {
    return await apiCallComposer(
        async () => {
            await getRequiredPWAScope(storeId);
            // Build a nested-key update payload so we only touch pwaSettings.*
            // Firestore dot-notation updates merge into existing map fields.
            const update: Record<string, unknown> = {};
            if (typeof settings.enableInstallableApp === 'boolean') {
                update['pwaSettings.enableInstallableApp'] = settings.enableInstallableApp;
            }
            if (typeof settings.promoteInstallation === 'boolean') {
                update['pwaSettings.promoteInstallation'] = settings.promoteInstallation;
            }
            if (typeof settings.pwaShortName === 'string') {
                update['pwaSettings.pwaShortName'] = settings.pwaShortName.trim().slice(0, 12);
            } else if (isLocalizedText(settings.pwaShortName)) {
                update['pwaSettings.pwaShortName'] = Object.fromEntries(
                    Object.entries(settings.pwaShortName).map(([language, value]) => [
                        language,
                        String(value || '').trim().slice(0, 12),
                    ]),
                );
            }
            if (Object.keys(update).length === 0) return { noop: true } satisfies PWASettingsUpdateResult;

            await updateDoc(getDocRef(storeId), await requestBodyComposer(update, { isNew: false }));
            await revalidatePublicClientCache(storeId, 'updatePWASettings');
            return { success: true, updated: Object.keys(update) } satisfies PWASettingsUpdateResult;
        },
        { storeId, settings },
        'updatePWASettings',
    );
};

/**
 * Set or clear the per-store PWA icon override. Passing `null` for the URL
 * reverts to the generated icon.
 */
export const updatePWAIconOverride = async (
    storeId: string | number,
    override: PWAIconOverride,
) => {
    return await apiCallComposer(
        async () => {
            const scope = await getRequiredPWAScope(storeId);
            if (
                (override.pwaIconMode === 'generated' && override.pwaIconOverrideUrl !== null)
                || (override.pwaIconMode === 'override' && !isOwnedPWAIconUrl(override.pwaIconOverrideUrl, scope))
            ) throw new Error('pwa_icon_override_invalid');
            const pwaIconUpdatedAt = new Date().toISOString();
            const update: Record<string, unknown> = {
                'publicPresence.pwaIconMode': override.pwaIconMode,
                'publicPresence.pwaIconOverrideUrl': override.pwaIconOverrideUrl,
                'publicPresence.pwaIconUpdatedAt': pwaIconUpdatedAt,
            };
            await updateDoc(getDocRef(storeId), await requestBodyComposer(update, { isNew: false }));
            await revalidatePublicClientCache(storeId, 'updatePWAIconOverride');
            return { success: true, pwaIconUpdatedAt } satisfies PWAIconOverrideUpdateResult;
        },
        { storeId, override },
        'updatePWAIconOverride',
    );
};

/**
 * Upload a custom PWA icon to Firebase Storage using the same tenant/store
 * isolation pattern used elsewhere in the codebase.
 */
export const uploadPWAIconOverride = async ({
    file,
    tenantId,
    storeId,
    onProgress,
}: PWAIconUploadInput): Promise<string> => {
    const scope = await getRequiredPWAScope(storeId, tenantId);
    assertPreparedPWAIconFile(file);
    const fileId = `${createRuntimeId('pwa_icon')}.png`;
    const storagePath = generateStoragePath({
        collection: 'stores',
        fileType: 'pwa-icons',
        session: { tId: scope.tenantId, sId: scope.storeId },
        fileId,
    });

    const result = await uploadFile(storagePath, file, onProgress || (() => { }), null, {
        cacheControl: STORAGE_CACHE_CONTROL.immutablePublic,
        contentType: file.type || 'image/png',
    }, {
        cleanupOnDownloadUrlFailure: true,
    });
    return result.downloadURL;
};

export const cleanupPWAIconOverrideUrls = async (
    urls: readonly string[],
    operation: PWAIconCleanupOperation,
    scope: PWAIconScope,
) => {
    const uniqueUrls = Array.from(new Set(
        urls.map((url) => url.trim()).filter((url) => isOwnedPWAIconUrl(url, scope)),
    ));
    const results = await Promise.allSettled(uniqueUrls.map((url) => deleteFileByUrl(url)));
    const summary = summarizeStorageCleanupResults(results);
    if (summary.failed > 0) {
        logRuntimeFailure('pwa_icon_storage_cleanup_failed', new Error('storage_cleanup_failed'), {
            operation,
            attemptedCleanupCount: summary.attempted,
            failedCleanupCount: summary.failed,
        });
    }
    return summary;
};

const readCurrentPWAIconStore = async (scope: PWAIconScope): Promise<Record<string, unknown>> => {
    const snapshot = await getDocFromServer(getDocRef(scope.storeId));
    const data = snapshot.exists() ? snapshot.data() : null;
    if (
        !data
        || String(data.storeId) !== String(scope.storeId)
        || String(data.tenantId) !== String(scope.tenantId)
    ) {
        throw new Error('pwa_icon_current_store_scope_invalid');
    }
    return data;
};

const cleanupSupersededPWAIconUrl = async (
    previousUrl: string,
    operation: PWAIconCleanupOperation,
    scope: PWAIconScope,
): Promise<void> => {
    try {
        const currentStore = await readCurrentPWAIconStore(scope);
        const publicPresence = currentStore.publicPresence;
        if (
            publicPresence
            && typeof publicPresence === 'object'
            && !Array.isArray(publicPresence)
            && (publicPresence as Record<string, unknown>).pwaIconOverrideUrl === previousUrl
        ) {
            return;
        }
    } catch (error) {
        logRuntimeFailure('pwa_icon_superseded_cleanup_guard_failed', error, {
            operation,
            previousUrlPresent: Boolean(previousUrl),
        });
        return;
    }
    await cleanupPWAIconOverrideUrls([previousUrl], operation, scope);
};

export const replacePWAIconOverride = async ({
    file,
    onProgress,
    previousUrl,
    storeId,
    tenantId,
}: PWAIconUploadInput & { previousUrl?: string | null }): Promise<PWAIconReplacementResult> => {
    const scope = await getRequiredPWAScope(storeId, tenantId);
    const uploadedUrl = await uploadPWAIconOverride({ file, onProgress, storeId, tenantId });
    let result: PWAIconOverrideUpdateResult;
    try {
        result = await updatePWAIconOverride(storeId, {
            pwaIconMode: 'override',
            pwaIconOverrideUrl: uploadedUrl,
        });
        assertPWAIconOverrideUpdateSucceeded(result);
    } catch (error) {
        let committedOverride: ReturnType<typeof readCommittedPWAIconOverride> = null;
        try {
            committedOverride = readCommittedPWAIconOverride(
                await readCurrentPWAIconStore(scope),
                scope,
                uploadedUrl,
            );
        } catch (readBackError) {
            logRuntimeFailure('pwa_icon_override_write_outcome_ambiguous', readBackError, {
                operation: 'replace',
                uploadedUrlPresent: Boolean(uploadedUrl),
            });
            throw error;
        }
        if (committedOverride) {
            result = {
                success: true,
                pwaIconUpdatedAt: committedOverride.pwaIconUpdatedAt,
            };
        } else {
            await cleanupPWAIconOverrideUrls([uploadedUrl], 'replace', scope);
            throw error;
        }
    }
    if (previousUrl && previousUrl !== uploadedUrl) {
        await cleanupSupersededPWAIconUrl(previousUrl, 'replace', scope);
    }
    return { ...result, url: uploadedUrl };
};

export const removePWAIconOverride = async ({
    previousUrl,
    storeId,
    tenantId,
}: {
    previousUrl?: string | null;
    storeId: string | number;
    tenantId: string | number;
}): Promise<PWAIconOverrideUpdateResult> => {
    const scope = await getRequiredPWAScope(storeId, tenantId);
    const result = await updatePWAIconOverride(storeId, {
        pwaIconMode: 'generated',
        pwaIconOverrideUrl: null,
    });
    assertPWAIconOverrideUpdateSucceeded(result);
    if (previousUrl) await cleanupSupersededPWAIconUrl(previousUrl, 'remove', scope);
    return result;
};

// ─────────────────────────────────────────────────────────────
// Defaults — read by UI when the store doc hasn't been touched.
// ─────────────────────────────────────────────────────────────

export const PWA_DEFAULTS: ResolvedPWASettings = {
    enableInstallableApp: true,
    promoteInstallation: true,
    pwaShortName: '',
};

/**
 * Resolve effective PWA settings by merging store doc values with defaults.
 * UI layer should use this to avoid showing "undefined" states.
 */
export function resolvePWASettings(storeDoc: unknown): ResolvedPWASettings {
    const store = storeDoc && typeof storeDoc === 'object' && !Array.isArray(storeDoc)
        ? storeDoc as Record<string, unknown>
        : {};
    const s = store.pwaSettings && typeof store.pwaSettings === 'object' && !Array.isArray(store.pwaSettings)
        ? store.pwaSettings as Record<string, unknown>
        : {};
    const activeLanguages = Array.isArray(store.activeLanguages) ? store.activeLanguages : [];
    const contentLanguage = (
        typeof store.defaultLanguage === 'string' && store.defaultLanguage
    ) || (
        typeof activeLanguages[0] === 'string' && activeLanguages[0]
    ) || (
        typeof store.language === 'string' && store.language
    ) || 'en';
    const resolvedShortName = getLocalizedText(
        s.pwaShortName as LocalizedTextValue,
        contentLanguage,
        getPrimaryLocalizedLanguage(s.pwaShortName as LocalizedTextValue, contentLanguage),
        PWA_DEFAULTS.pwaShortName,
    );
    return {
        enableInstallableApp:
            typeof s.enableInstallableApp === 'boolean' ? s.enableInstallableApp : PWA_DEFAULTS.enableInstallableApp,
        promoteInstallation:
            typeof s.promoteInstallation === 'boolean' ? s.promoteInstallation : PWA_DEFAULTS.promoteInstallation,
        pwaShortName: resolvedShortName,
    };
}
