/**
 * Multi-Outlet Master Store Propagation
 *
 * When a master store changes chain-level identity/classification fields,
 * hand the coupled master/outlet/summary write to the authenticated Admin
 * route. Browser code only validates the shaped acknowledgement.
 *
 * Called from updateStore() before its unrelated direct-field write.
 *
 * @see __docs__/official-business-page/official-business-page_impl.md ADR-7
 */

import { resolveStoreBusinessCategory } from "@data/shared/businessTypes";
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import {
    isBrandPropagationResult,
    MASTER_STORE_PROPAGATED_FIELDS,
    normalizeMasterStorePropagationFields,
    type BrandPropagationResult,
    type MasterStorePropagatedField,
} from "@lib/multiOutlet/brandPropagationBoundary";
import {
    createMultiOutletStatusError,
    MULTI_OUTLET_ACTION_REQUEST_POLICY,
    MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
} from "@lib/multiOutlet/outletActionResponseGuards";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";

/** Master-controlled fields propagated from master to outlets when overrides are locked. */
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
): Promise<BrandPropagationResult> {
    const fields = normalizeMasterStorePropagationFields(Object.keys(propagatedChanges || {}));
    if (fields.length === 0) return { failed: 0, propagated: 0, skipped: 0, success: true };

    try {
        const response = await fetch('/api/outlets/brand-propagation', {
            ...MULTI_OUTLET_ACTION_REQUEST_POLICY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masterStoreId, tenantId, values: propagatedChanges }),
        });
        const data = await readJsonResponseWithLimit<unknown>(
            response,
            MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES,
        );
        if (!response.ok) {
            throw createMultiOutletStatusError('multi_outlet_brand_propagation_rejected', response.status);
        }
        if (!isBrandPropagationResult(data)) {
            throw new Error('multi_outlet_brand_propagation_response_invalid');
        }
        return data;
    } catch (e) {
        logMultiOutletFailure('multi_outlet_brand_propagation_failed', e, {
            ...getBoundedMultiOutletStringContext('masterStoreId', masterStoreId),
            propagatedFieldCount: Object.keys(propagatedChanges).length,
        });
        throw e;
    }
}

export const propagateBrandToOutlets = propagateMasterStoreChangesToOutlets;
