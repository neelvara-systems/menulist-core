/**
 * Default Roles — Shared Data (Self-Contained)
 * ═══════════════════════════════════════════════════════════════
 *
 * PRIMARY SOURCE — This file is the single source of truth.
 * It MUST be self-contained (no imports from other project files).
 *
 * COPY RULE: This exact file is copied as-is to:
 *   functions/src/sharedData/defaultRoles.ts
 *
 * When updating this file, copy-paste the ENTIRE file to the backend.
 * Do NOT cherry-pick or modify — always full file replacement.
 *
 * @see functions/src/sharedData/README.md
 */

// ═══════════════════════════════════════════════════════════════
// TYPES (inlined — must stay self-contained, no external imports)
// ═══════════════════════════════════════════════════════════════

export type RolePermissions = {
    canAccessBilling?: boolean;
    canManageSubscription?: boolean;
    canManageUsers?: boolean;
    canAssignRoles?: boolean;
    canManageStore?: boolean;
    canAddStores?: boolean;
    canManageOutlets?: boolean;
    canSwitchStores?: boolean;
    canManageMenu?: boolean;
    canPublishMenu?: boolean;
    canUseMenuExtraction?: boolean;
    canGenerateDescriptions?: boolean;
    canGenerateImages?: boolean;
    canOverrideTheme?: boolean;
    canOverrideBrandIdentity?: boolean;
    canOverrideLayout?: boolean;
    canAddLocalCategories?: boolean;
    canAddLocalItems?: boolean;
    canOverridePrices?: boolean;
    canViewAnalytics?: boolean;
    canExportData?: boolean;
    canManageChat?: boolean;
    canViewCustomerData?: boolean;
};

export type StoreRoleDataType = {
    id: string;
    name: string;
    description: string;
    active: boolean;
    permissions: RolePermissions;
    createdOn: string;
    createdBy: string;
    modifiedBy?: string;
    modifiedOn?: string;
};

// ═══════════════════════════════════════════════════════════════
// ROLE IDENTIFIERS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_ROLE_IDS = {
    OWNER: 'owner',
    MANAGER: 'manager',
    STAFF: 'staff',
} as const;

export type DefaultRoleId = typeof DEFAULT_ROLE_IDS[keyof typeof DEFAULT_ROLE_IDS];

// ═══════════════════════════════════════════════════════════════
// PERMISSION DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const OWNER_PERMISSIONS: RolePermissions = {
    canAccessBilling: true,
    canManageSubscription: true,
    canManageUsers: true,
    canAssignRoles: true,
    canManageStore: true,
    canAddStores: true,
    canManageOutlets: true,
    canSwitchStores: true,
    canManageMenu: true,
    canPublishMenu: true,
    canUseMenuExtraction: true,
    canGenerateDescriptions: true,
    canGenerateImages: true,
    canOverrideTheme: true,
    canOverrideBrandIdentity: true,
    canOverrideLayout: true,
    canAddLocalCategories: true,
    canAddLocalItems: true,
    canOverridePrices: true,
    canViewAnalytics: true,
    canExportData: true,
    canManageChat: true,
    canViewCustomerData: true,
};

const MANAGER_PERMISSIONS: RolePermissions = {
    canAccessBilling: false,
    canManageSubscription: false,
    canManageUsers: true,
    canAssignRoles: false,
    canManageStore: true,
    canAddStores: false,
    canManageOutlets: false,
    canSwitchStores: true,
    canManageMenu: true,
    canPublishMenu: true,
    canUseMenuExtraction: false,
    canGenerateDescriptions: true,
    canGenerateImages: false,
    canOverrideTheme: false,
    canOverrideBrandIdentity: false,
    canOverrideLayout: false,
    canAddLocalCategories: true,
    canAddLocalItems: true,
    canOverridePrices: true,
    canViewAnalytics: true,
    canExportData: false,
    canManageChat: true,
    canViewCustomerData: true,
};

const STAFF_PERMISSIONS: RolePermissions = {
    canAccessBilling: false,
    canManageSubscription: false,
    canManageUsers: false,
    canAssignRoles: false,
    canManageStore: false,
    canAddStores: false,
    canManageOutlets: false,
    canSwitchStores: false,
    canManageMenu: false,
    canPublishMenu: false,
    canUseMenuExtraction: false,
    canGenerateDescriptions: false,
    canGenerateImages: false,
    canOverrideTheme: false,
    canOverrideBrandIdentity: false,
    canOverrideLayout: false,
    canAddLocalCategories: false,
    canAddLocalItems: false,
    canOverridePrices: false,
    canViewAnalytics: false,
    canExportData: false,
    canManageChat: true,
    canViewCustomerData: false,
};

// ═══════════════════════════════════════════════════════════════
// ROLE METADATA
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_ROLE_METADATA = {
    [DEFAULT_ROLE_IDS.OWNER]: {
        name: 'Owner',
        description: 'Full access to all features including billing, AI, and store management',
        permissions: OWNER_PERMISSIONS,
    },
    [DEFAULT_ROLE_IDS.MANAGER]: {
        name: 'Manager',
        description: 'Manage store operations, menu, and staff. No billing or AI credits access',
        permissions: MANAGER_PERMISSIONS,
    },
    [DEFAULT_ROLE_IDS.STAFF]: {
        name: 'Staff',
        description: 'Day-to-day operations. Can respond to customer chats only',
        permissions: STAFF_PERMISSIONS,
    },
} as const;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create default roles for a new store.
 * Called during onboarding and manual store creation.
 *
 * @param storeId - The store's unique ID (kept for backward compat, not used in role ID)
 * @param createdBy - Email of the user creating the store
 * @returns Array of 3 StoreRoleDataType objects
 */
export function createDefaultRoles(storeId: number, createdBy: string): StoreRoleDataType[] {
    const now = new Date().toISOString();

    return Object.entries(DEFAULT_ROLE_METADATA).map(([roleType, metadata]) => ({
        id: roleType,
        name: metadata.name,
        description: metadata.description,
        active: true,
        permissions: { ...metadata.permissions },
        createdOn: now,
        createdBy,
    }));
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

export const getOwnerRoleId = (_storeId?: number): string => DEFAULT_ROLE_IDS.OWNER;
export const getManagerRoleId = (_storeId?: number): string => DEFAULT_ROLE_IDS.MANAGER;
export const getStaffRoleId = (_storeId?: number): string => DEFAULT_ROLE_IDS.STAFF;

export const isDefaultRole = (roleId: string): boolean =>
    Object.values(DEFAULT_ROLE_IDS).includes(roleId as DefaultRoleId);

export const isOwnerRole = (roleId: string): boolean =>
    roleId === DEFAULT_ROLE_IDS.OWNER;

export const isCustomRole = (roleId: string): boolean =>
    !isDefaultRole(roleId);

export const generateCustomRoleId = (): string =>
    `custom-${Date.now()}`;
