import { PERMISSION_CATEGORIES, PermissionKey } from "@constant/permissions";
import { RolePermissions } from "@type/platform/roles";

/**
 * Roles & Permissions Configuration - Feature Flag Style
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simple true/false permission flags grouped by category.
 * Used for UI display and role editing.
 */

// Default permissions (all true - used as initial data for new custom roles)
const RolesPermissionInitialData: RolePermissions = {
    canAccessBilling: true,
    canManageSubscription: true,
    canManageUsers: true,
    canAssignRoles: true,
    canManageStore: true,
    canAddStores: true,
    canManagePublicPresence: true,
    canManageIntegrations: true,
    canManageOutlets: true,
    canSwitchStores: true,
    canManageMenu: true,
    canPublishMenu: true,
    canManageMenuSharing: true,
    canManageMenuDesign: true,
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
    canManageFeedback: true,
    canViewCustomerData: true,
    canManageDigitalScreens: true,
};

export default RolesPermissionInitialData;

// Permission categories for UI grouping (with labels)
export const PERMISSION_CATEGORIES_CONFIG = [
    {
        key: 'BILLING',
        label: 'Billing & Subscription',
        icon: '💰',
        permissions: PERMISSION_CATEGORIES.BILLING.permissions,
    },
    {
        key: 'USERS',
        label: 'User Management',
        icon: '👥',
        permissions: PERMISSION_CATEGORIES.USERS.permissions,
    },
    {
        key: 'STORE',
        label: 'Store Management',
        icon: '🏪',
        permissions: PERMISSION_CATEGORIES.STORE.permissions,
    },
    {
        key: 'MENU',
        label: 'Menu Management',
        icon: '🍽️',
        permissions: PERMISSION_CATEGORIES.MENU.permissions,
    },
    {
        key: 'AI_FEATURES',
        label: 'AI Features (Credits)',
        icon: '🤖',
        permissions: PERMISSION_CATEGORIES.AI_FEATURES.permissions,
    },
    {
        key: 'BRANDING',
        label: 'Branding & Theme',
        icon: '🎨',
        permissions: PERMISSION_CATEGORIES.BRANDING.permissions,
    },
    {
        key: 'CONTENT',
        label: 'Content Control',
        icon: '🏗️',
        permissions: PERMISSION_CATEGORIES.CONTENT.permissions,
    },
    {
        key: 'ANALYTICS',
        label: 'Analytics & Reports',
        icon: '📊',
        permissions: PERMISSION_CATEGORIES.ANALYTICS.permissions,
    },
    {
        key: 'CUSTOMER',
        label: 'Customer Interactions',
        icon: '💬',
        permissions: PERMISSION_CATEGORIES.CUSTOMER.permissions,
    },
];

// Human-readable labels for each permission
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    canAccessBilling: 'View Billing & Invoices',
    canManageSubscription: 'Manage Subscription',
    canManageUsers: 'Manage Users',
    canAssignRoles: 'Assign Roles',
    canManageStore: 'Edit Store Settings',
    canAddStores: 'Add New Stores',
    canManagePublicPresence: 'Manage Public Presence',
    canManageIntegrations: 'Manage Integrations',
    canManageOutlets: 'Manage Outlets',
    canSwitchStores: 'Switch Between Stores',
    canManageMenu: 'Edit Menu Items',
    canPublishMenu: 'Publish Menu Changes',
    canManageMenuSharing: 'Manage Sharing & QR',
    canManageMenuDesign: 'Manage Menu Design',
    canUseMenuExtraction: 'Use AI Menu Extraction',
    canGenerateDescriptions: 'Generate AI Descriptions',
    canGenerateImages: 'Generate AI Images',
    canOverrideTheme: 'Override Theme/Colors',
    canOverrideBrandIdentity: 'Override Brand Identity',
    canOverrideLayout: 'Override Layout',
    canAddLocalCategories: 'Add Local Categories',
    canAddLocalItems: 'Add Local Menu Items',
    canOverridePrices: 'Override Prices',
    canViewAnalytics: 'View Analytics',
    canExportData: 'Export Data',
    canManageChat: 'Manage Customer Chats',
    canManageFeedback: 'Manage Guest Feedback',
    canViewCustomerData: 'View Customer Data',
    canManageDigitalScreens: 'Manage Digital Screens',
};

// NOTE: Permission strategies removed - single role per store makes them unnecessary
// Each user has ONE role per store, so no conflict resolution needed

// NOTE: ALL_PERMISSIONS is exported from @constant/permissions - import from there
