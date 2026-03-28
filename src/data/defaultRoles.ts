/**
 * Default Roles Configuration
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Re-exports from src/data/shared/defaultRoles.ts (primary source for copy-paste to functions).
 * This file maintains backward compatibility for existing imports.
 *
 * Primary source: src/data/shared/defaultRoles.ts
 * Copy-paste target: functions/src/sharedData/defaultRoles.ts
 */

// Re-export everything from the shared self-contained file
export {
    createDefaultRoles,
    DEFAULT_ROLE_IDS,
    DEFAULT_ROLE_METADATA,
    generateCustomRoleId,
    getManagerRoleId,
    getOwnerRoleId,
    getStaffRoleId,
    isCustomRole,
    isDefaultRole,
    isOwnerRole
} from "@data/shared/defaultRoles";

export type {
    DefaultRoleId,
    RolePermissions,
    StoreRoleDataType
} from "@data/shared/defaultRoles";

