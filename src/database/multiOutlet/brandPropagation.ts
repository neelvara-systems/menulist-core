/**
 * Multi-Outlet Brand Propagation
 *
 * When master store updates brand identity fields (logo, phoneNumber, etc.),
 * propagate to all outlets where outletPolicy.allowBrandingOverride === false.
 *
 * Non-blocking by design — called after master store save succeeds.
 * Follows same pattern as propagateNewProjectToOutlets().
 *
 * @see __docs__/official-business-page/official-business-page_impl.md ADR-7
 */

import { DB_COLLECTIONS } from "@constant/database";
import { revalidatePublicClientCache } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { secureError } from "@lib/security/secureLogger";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/** Fields that constitute "brand identity" — propagated from master to outlets */
const BRAND_FIELDS = [
    'logo',
    'phoneNumber',
    'currencyCode',
    'currencySymbol',
    'country',
    'timeZone',
    'defaultLanguage',
] as const;

type BrandField = typeof BRAND_FIELDS[number];

/**
 * Extract brand-relevant changes from a store update payload.
 * Returns null if no brand fields changed.
 */
export function extractBrandChanges(updatedFields: Record<string, any>): Record<BrandField, any> | null {
    const brandChanges: Partial<Record<BrandField, any>> = {};
    let hasBrandChanges = false;

    for (const field of BRAND_FIELDS) {
        if (field in updatedFields) {
            brandChanges[field] = updatedFields[field];
            hasBrandChanges = true;
        }
    }

    return hasBrandChanges ? brandChanges as Record<BrandField, any> : null;
}

/**
 * Propagate brand identity changes from master store to all outlets.
 *
 * @param tenantId - Tenant ID
 * @param masterStoreId - Master store ID (the one being updated)
 * @param brandChanges - Object with changed brand fields
 * @returns Count of propagated and failed outlets
 */
export async function propagateBrandToOutlets(
    tenantId: number,
    masterStoreId: number,
    brandChanges: Record<string, any>,
): Promise<{ propagated: number; failed: number; skipped: number }> {
    const result = { propagated: 0, failed: 0, skipped: 0 };

    try {
        // Get tenant to find all outlet stores
        const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
        const tenantSnap = await getDoc(tenantRef);
        if (!tenantSnap.exists()) return result;

        const storesList = tenantSnap.data()?.storesList || [];
        const outletStores = storesList.filter(
            (s: any) => s.storeId !== masterStoreId && s.isMaster !== true,
        );

        if (outletStores.length === 0) return result;

        // Check master store's outlet policy
        const masterRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(masterStoreId));
        const masterSnap = await getDoc(masterRef);
        const outletPolicy = masterSnap.data()?.outletPolicy;

        // If branding override is allowed, skip propagation
        // (outlets can have their own branding)
        if (outletPolicy?.allowBrandingOverride === true) {
            result.skipped = outletStores.length;
            return result;
        }

        // Propagate to each outlet
        for (const outlet of outletStores) {
            try {
                const outletRef = doc(firebaseClient, DB_COLLECTIONS.STORES, String(outlet.storeId));
                await updateDoc(outletRef, brandChanges);
                await revalidatePublicClientCache(outlet.storeId, "propagateBrandToOutlets");
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
