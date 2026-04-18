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
import { requestBodyComposer } from '@lib/apiHelper';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { uploadFile } from '@lib/firebase/storage';
import { generateStoragePath } from '@lib/storage/pathGenerator';
import { doc, updateDoc } from 'firebase/firestore';

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
    pwaShortName?: string;
}

export type PWAIconMode = 'generated' | 'override';

export interface PWAIconOverride {
    /** Full Firebase Storage URL for an owner-uploaded icon. */
    pwaIconOverrideUrl: string | null;
    pwaIconMode: PWAIconMode;
}

export interface PWAIconUploadInput {
    file: File;
    tenantId: string | number;
    storeId: string | number;
    onProgress?: (progress: number) => void;
}

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

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
            // Build a nested-key update payload so we only touch pwaSettings.*
            // Firestore dot-notation updates merge into existing map fields.
            const update: Record<string, any> = {};
            if (typeof settings.enableInstallableApp === 'boolean') {
                update['pwaSettings.enableInstallableApp'] = settings.enableInstallableApp;
            }
            if (typeof settings.promoteInstallation === 'boolean') {
                update['pwaSettings.promoteInstallation'] = settings.promoteInstallation;
            }
            if (typeof settings.pwaShortName === 'string') {
                update['pwaSettings.pwaShortName'] = settings.pwaShortName.trim().slice(0, 12);
            }
            if (Object.keys(update).length === 0) return { noop: true };

            await updateDoc(getDocRef(storeId), await requestBodyComposer(update));
            return { success: true, updated: Object.keys(update) };
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
            const update: Record<string, any> = {
                'publicPresence.pwaIconMode': override.pwaIconMode,
                'publicPresence.pwaIconOverrideUrl': override.pwaIconOverrideUrl,
            };
            await updateDoc(getDocRef(storeId), await requestBodyComposer(update));
            return { success: true };
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
    const extFromType = file.type.split('/')[1] || 'png';
    const safeExt = extFromType.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const fileId = `${Date.now()}-pwa-icon.${safeExt}`;
    const storagePath = generateStoragePath({
        collection: 'stores',
        fileType: 'pwa-icons',
        session: { tId: tenantId, sId: storeId },
        fileId,
    });

    const result = await uploadFile(storagePath, file, onProgress || (() => { }));
    return result.downloadURL;
};

// ─────────────────────────────────────────────────────────────
// Defaults — read by UI when the store doc hasn't been touched.
// ─────────────────────────────────────────────────────────────

export const PWA_DEFAULTS: Required<PWASettings> = {
    enableInstallableApp: true,
    promoteInstallation: true,
    pwaShortName: '',
};

/**
 * Resolve effective PWA settings by merging store doc values with defaults.
 * UI layer should use this to avoid showing "undefined" states.
 */
export function resolvePWASettings(storeDoc: any): Required<PWASettings> {
    const s = storeDoc?.pwaSettings || {};
    return {
        enableInstallableApp:
            typeof s.enableInstallableApp === 'boolean' ? s.enableInstallableApp : PWA_DEFAULTS.enableInstallableApp,
        promoteInstallation:
            typeof s.promoteInstallation === 'boolean' ? s.promoteInstallation : PWA_DEFAULTS.promoteInstallation,
        pwaShortName: typeof s.pwaShortName === 'string' ? s.pwaShortName : PWA_DEFAULTS.pwaShortName,
    };
}
