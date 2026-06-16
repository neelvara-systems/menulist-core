/**
 * Multi-Outlet Master Store Propagation
 *
 * When master store updates chain-level identity/classification fields
 * (logo, phoneNumber, businessType, businessCategory, etc.), propagate to all
 * outlets where outletPolicy.canOverrideBrandIdentity === false.
 *
 * Called from updateStore() after the master store save succeeds.
 * Follows same pattern as propagateNewProjectToOutlets().
 *
 * @see __docs__/official-business-page/official-business-page_impl.md ADR-7
 */

import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import { DB_COLLECTIONS } from "@constant/database";
import { mergeStoreSummaryFields } from "@database/platformSummary";
import { revalidatePublicClientCache } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { secureError } from "@lib/security/secureLogger";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

/** Master-controlled fields propagated from master to outlets when overrides are locked. */
const MASTER_STORE_PROPAGATED_FIELDS = [
    'logo',
    'phoneNumber',
    'currencyCode',
    'currencySymbol',
    'country',
    'timeZone',
    'defaultLanguage',
    'businessType',
    'businessCategory',
] as const;

const STORE_SUMMARY_PROPAGATED_FIELDS = new Set<string>([
    'businessType',
    'businessCategory',
    'logo',
    'timeZone',
]);

type MasterStorePropagatedField = typeof MASTER_STORE_PROPAGATED_FIELDS[number];

export function hasMasterStorePropagationFields(updatedFields: Record<string, any>): boolean {
    return MASTER_STORE_PROPAGATED_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(updatedFields, field));
}

/**
 * Extract master-controlled outlet propagation changes from a store update payload.
 * Returns null if no propagated fields changed.
 */
export function extractMasterStorePropagationChanges(
    updatedFields: Record<string, any>,
): Record<MasterStorePropagatedField, any> | null {
    const propagationChanges: Partial<Record<MasterStorePropagatedField, any>> = {};
    let hasPropagationChanges = false;

    for (const field of MASTER_STORE_PROPAGATED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(updatedFields, field)) {
            propagationChanges[field] = updatedFields[field] === undefined ? null : updatedFields[field];
            hasPropagationChanges = true;
        }
    }

    if (!hasPropagationChanges) return null;

    if ('businessType' in propagationChanges || 'businessCategory' in propagationChanges) {
        propagationChanges.businessCategory = resolveStoreBusinessCategory(
            propagationChanges.businessType,
            propagationChanges.businessCategory,
        );
    }

    return propagationChanges as Record<MasterStorePropagatedField, any>;
}

export const extractBrandChanges = extractMasterStorePropagationChanges;

function extractStoresSummaryPropagationChanges(propagatedChanges: Record<string, any>) {
    const summaryPatch: Record<string, any> = {};

    for (const [field, value] of Object.entries(propagatedChanges)) {
        if (STORE_SUMMARY_PROPAGATED_FIELDS.has(field)) {
            summaryPatch[field] = value;
        }
    }

    if (Object.keys(summaryPatch).length === 0) return null;

    return summaryPatch;
}

/**
 * Propagate master store identity/classification changes to all outlets.
 *
 * @param tenantId - Tenant ID
 * @param masterStoreId - Master store ID (the one being updated)
 * @param propagatedChanges - Object with changed master-controlled fields
 * @returns Count of propagated and failed outlets
 */
export async function propagateMasterStoreChangesToOutlets(
    tenantId: number,
    masterStoreId: number,
    propagatedChanges: Record<string, any>,
): Promise<{ propagated: number; failed: number; skipped: number }> {
    const result = { propagated: 0, failed: 0, skipped: 0 };

    if (!propagatedChanges || Object.keys(propagatedChanges).length === 0) {
        return result;
    }

    try {
        // Get tenant to find all outlet stores
        const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
        const tenantSnap = await getDoc(tenantRef);
        if (!tenantSnap.exists()) return result;

        const storesList = tenantSnap.data()?.storesList || [];
        const outletStores = storesList.filter(
            (s: any) => s.storeId !== masterStoreId && s.isMaster !== true && s.active !== false,
        );

        if (outletStores.length === 0) return result;

        // Check master store's outlet policy
        const masterRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(masterStoreId));
        const masterSnap = await getDoc(masterRef);
        const outletPolicy = masterSnap.data()?.outletPolicy;
        const outletCanOverrideBrandIdentity = outletPolicy?.canOverrideBrandIdentity === true
            || outletPolicy?.allowBrandingOverride === true;

        // If branding override is allowed, skip propagation.
        // Outlets can then own their own brand identity and classification.
        if (outletCanOverrideBrandIdentity) {
            result.skipped = outletStores.length;
            return result;
        }

        // Propagate to each outlet
        for (const outlet of outletStores) {
            try {
                const outletRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(outlet.storeId));
                await updateDoc(outletRef, {
                    ...propagatedChanges,
                    modifiedOn: serverTimestamp(),
                });
                const summaryChanges = extractStoresSummaryPropagationChanges(propagatedChanges);
                if (summaryChanges) {
                    await mergeStoreSummaryFields(outlet.storeId, summaryChanges);
                }
                await revalidatePublicClientCache(outlet.storeId, "propagateMasterStoreChangesToOutlets");
                result.propagated++;
            } catch (e) {
                secureError(`[BrandPropagation] Failed for outlet ${outlet.storeId}`, e as Error);
                result.failed++;
            }
        }
    } catch (e) {
        secureError(`[BrandPropagation] Fatal error`, e as Error);
    }

    return result;
}

export const propagateBrandToOutlets = propagateMasterStoreChangesToOutlets;
