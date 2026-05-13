/**
 * Outlet Policy Enforcement
 *
 * Applies master store's outletPolicy to restrict outlet user permissions.
 * Effective permission = rolePermission AND outletPolicy gate.
 *
 * Called in sessionProvider when store is NOT master (i.e., outlet store).
 * Master store users keep their full role permissions — policy only restricts outlets.
 *
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §12
 */

import type { OutletPolicy } from "@type/multiOutlet.types";
import type { RolePermissions } from "@type/platform/roles";

/**
 * Map from OutletPolicy keys to the RolePermissions keys they gate.
 * If outletPolicy.key === false, the corresponding rolePermission is forced to false.
 */
const POLICY_TO_PERMISSION_MAP: Partial<Record<keyof OutletPolicy, (keyof RolePermissions)[]>> = {
    canUseMenuExtraction: ['canUseMenuExtraction'],
    canGenerateDescriptions: ['canGenerateDescriptions'],
    canGenerateImages: ['canGenerateImages'],
    canOverrideTheme: ['canOverrideTheme'],
    canOverrideBrandIdentity: ['canOverrideBrandIdentity'],
    canOverrideLayout: ['canOverrideLayout'],
    allowLocalCategories: ['canAddLocalCategories'],
    allowLocalItems: ['canAddLocalItems'],
    priceOverride: ['canOverridePrices'],
};

/**
 * Apply outlet policy restrictions to role permissions.
 *
 * @param rolePermissions - User's role-based permissions (from store.roles)
 * @param outletPolicy - Chain-wide policy from master store (may be undefined for single stores)
 * @param isMasterStore - Whether the current store is the master store
 * @returns Effective permissions after policy enforcement
 */
export function applyOutletPolicy(
    rolePermissions: RolePermissions,
    outletPolicy: OutletPolicy | undefined,
    isMasterStore: boolean,
): RolePermissions {
    // Master store users are not restricted by outlet policy
    if (isMasterStore || !outletPolicy) {
        return rolePermissions;
    }

    // Clone permissions to avoid mutation
    const effective: RolePermissions = { ...rolePermissions };

    // Apply policy gates: if policy disables a capability, force permission to false
    for (const [policyKey, permissionKeys] of Object.entries(POLICY_TO_PERMISSION_MAP)) {
        const policyValue = outletPolicy[policyKey as keyof OutletPolicy];
        if (policyValue === false) {
            for (const permKey of permissionKeys) {
                effective[permKey] = false;
            }
        }
    }

    // Outlet users cannot manage outlets or billing (always master-only)
    effective.canManageOutlets = false;
    effective.canAddStores = false;
    effective.canAccessBilling = false;
    effective.canManageSubscription = false;

    // Editor-level outlet flags have no RolePermissions counterpart. Keep them
    // attached to the effective permission payload so mobile/desktop editors can
    // enforce direct item-level policy without another master-store read.
    (effective as RolePermissions & { outletPolicy?: OutletPolicy }).outletPolicy = outletPolicy;

    return effective;
}
