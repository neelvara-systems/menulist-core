import { ALL_PERMISSIONS, PermissionKey } from "@constant/permissions";
import { DEFAULT_ROLE_METADATA } from "@data/defaultRoles";
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

const getEmptyPermissions = (): RolePermissions => {
    const empty: RolePermissions = {};
    ALL_PERMISSIONS.forEach(key => { empty[key] = false; });
    return empty;
};

const getDefaultPermissionsForRole = (roleId: string | undefined): RolePermissions | undefined => {
    if (!roleId) return undefined;
    return DEFAULT_ROLE_METADATA[roleId as keyof typeof DEFAULT_ROLE_METADATA]?.permissions;
};

export function normalizeRolePermissions(
    permissions: RolePermissions | undefined,
    fallbackPermissions?: RolePermissions,
): RolePermissions {
    const normalized: RolePermissions = {};

    ALL_PERMISSIONS.forEach((key) => {
        if (permissions && Object.prototype.hasOwnProperty.call(permissions, key)) {
            normalized[key] = permissions[key] === true;
        } else {
            normalized[key] = fallbackPermissions?.[key] === true;
        }
    });

    return normalized;
}

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

    const permissions = normalizeRolePermissions(
        userRole.permissions,
        getDefaultPermissionsForRole(userRole.id),
    );

    // Direct boolean check - single role, no strategy needed
    return permissions[permission] === true;
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
        return getEmptyPermissions();
    }

    // Find user's role definition
    const userRole = storeRoles.find(
        role => role.active && role.id === userRoleId
    );

    if (!userRole) {
        return getEmptyPermissions();
    }

    // Return normalized permissions so legacy default roles receive newly added
    // default flags while custom roles keep missing flags denied.
    return normalizeRolePermissions(
        userRole.permissions,
        getDefaultPermissionsForRole(userRole.id),
    );
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
