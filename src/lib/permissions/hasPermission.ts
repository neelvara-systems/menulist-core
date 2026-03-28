import { ALL_PERMISSIONS, PermissionKey } from "@constant/permissions";
import { RolePermissions, StoreRoleDataType } from "@type/platform/roles";

/**
 * Permission Check Utility - Single Role per Store
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simple permission checking based on single role per store.
 * No strategy needed - user has ONE role, permissions come directly from it.
 * 
 * Usage:
 * ```typescript
 * // In component - use context (recommended)
 * const { userPermissions } = useContext(PlatformGlobalDataContext);
 * if (userPermissions.canAccessBilling) { ... }
 * 
 * // Direct check when needed
 * const canBill = hasPermission(userRoleId, storeRoles, 'canAccessBilling');
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE PERMISSION CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a user has a specific permission based on their single role
 * 
 * @param userRoleId - Single role ID assigned to user for this store (e.g., 'owner')
 * @param storeRoles - Array of role definitions from the store
 * @param permission - Permission key to check (e.g., 'canAccessBilling')
 * @returns boolean - true if user has permission, false otherwise
 */
export function hasPermission(
    userRoleId: string | undefined,
    storeRoles: StoreRoleDataType[],
    permission: PermissionKey
): boolean {
    if (!userRoleId) return false;

    // Find user's role definition
    const userRole = storeRoles.find(
        role => role.active && role.id === userRoleId
    );

    // No valid role = no permission
    if (!userRole) return false;

    // Direct boolean check - single role, no strategy needed
    return userRole.permissions[permission] === true;
}

/**
 * Get all permissions for a user's role
 * Used by sessionProvider to set userPermissions in context
 * 
 * @param userRoleId - Single role ID from user.stores[].role
 * @param storeRoles - Array of StoreRoleDataType from store.roles
 * @returns RolePermissions object (or empty object with all false if no role)
 */
export function getPermissionsForRole(
    userRoleId: string | undefined,
    storeRoles: StoreRoleDataType[]
): RolePermissions {
    if (!userRoleId) {
        // Return all permissions as false
        const empty: RolePermissions = {};
        ALL_PERMISSIONS.forEach(key => { empty[key] = false; });
        return empty;
    }

    // Find user's role definition
    const userRole = storeRoles.find(
        role => role.active && role.id === userRoleId
    );

    if (!userRole?.permissions) {
        const empty: RolePermissions = {};
        ALL_PERMISSIONS.forEach(key => { empty[key] = false; });
        return empty;
    }

    // Return role's permissions directly - no resolution needed
    return { ...userRole.permissions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if user has Owner role
 * Note: storeId param removed - roles are now simple IDs ('owner', 'manager', 'staff')
 */
export const isOwner = (userRoleId: string | undefined): boolean => {
    return userRoleId === 'owner';
};

/**
 * Check if user has Manager role
 */
export const isManager = (userRoleId: string | undefined): boolean => {
    return userRoleId === 'manager';
};

/**
 * Check if user has Staff role
 */
export const isStaff = (userRoleId: string | undefined): boolean => {
    return userRoleId === 'staff';
};

/**
 * Check if user has any valid role
 */
export const hasValidRole = (userRoleId: string | undefined): boolean => {
    return !!userRoleId && userRoleId.length > 0;
};
