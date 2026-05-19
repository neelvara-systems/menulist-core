/**
 * Centralized Permission Constants
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Single source of truth for all permission keys.
 * Use these constants everywhere instead of string literals to avoid typos.
 * 
 * ADDING NEW PERMISSIONS:
 * 1. Add the constant here with clear naming: PERMISSION_<CATEGORY>_<ACTION>
 * 2. Add it to the PERMISSIONS object
 * 3. Add to ALL_PERMISSIONS array
 * 4. Add to appropriate PERMISSION_CATEGORIES
 * 5. Update RolePermissions type in src/types/platform/roles.ts
 * 6. Update default role permissions in src/data/defaultRoles.ts
 * 7. Add label in src/data/rolesPermissionsInitialData.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION KEYS - Use these constants everywhere
// ═══════════════════════════════════════════════════════════════════════════════

// 💰 Billing & Subscription
export const PERMISSION_BILLING_ACCESS = 'canAccessBilling' as const;
export const PERMISSION_BILLING_MANAGE_SUBSCRIPTION = 'canManageSubscription' as const;

// 👥 User Management
export const PERMISSION_USERS_MANAGE = 'canManageUsers' as const;
export const PERMISSION_USERS_ASSIGN_ROLES = 'canAssignRoles' as const;

// 🏪 Store Management
export const PERMISSION_STORE_MANAGE = 'canManageStore' as const;
export const PERMISSION_STORE_ADD = 'canAddStores' as const;
export const PERMISSION_PUBLIC_PRESENCE_MANAGE = 'canManagePublicPresence' as const;
export const PERMISSION_INTEGRATIONS_MANAGE = 'canManageIntegrations' as const;

// 🔗 Multi-Outlet (Feature #4C)
export const PERMISSION_OUTLET_MANAGE = 'canManageOutlets' as const;
export const PERMISSION_OUTLET_SWITCH = 'canSwitchStores' as const;

// 🍽️ Menu Management
export const PERMISSION_MENU_MANAGE = 'canManageMenu' as const;
export const PERMISSION_MENU_PUBLISH = 'canPublishMenu' as const;
export const PERMISSION_MENU_SHARING_MANAGE = 'canManageMenuSharing' as const;
export const PERMISSION_MENU_DESIGN_MANAGE = 'canManageMenuDesign' as const;

// 🤖 AI Features
export const PERMISSION_AI_EXTRACTION = 'canUseMenuExtraction' as const;
export const PERMISSION_AI_DESCRIPTIONS = 'canGenerateDescriptions' as const;
export const PERMISSION_AI_IMAGES = 'canGenerateImages' as const;

// 🎨 Branding
export const PERMISSION_BRANDING_THEME = 'canOverrideTheme' as const;
export const PERMISSION_BRANDING_IDENTITY = 'canOverrideBrandIdentity' as const;
export const PERMISSION_BRANDING_LAYOUT = 'canOverrideLayout' as const;

// 🏗️ Content Control
export const PERMISSION_CONTENT_CATEGORIES = 'canAddLocalCategories' as const;
export const PERMISSION_CONTENT_ITEMS = 'canAddLocalItems' as const;
export const PERMISSION_CONTENT_PRICES = 'canOverridePrices' as const;

// 📊 Analytics
export const PERMISSION_ANALYTICS_VIEW = 'canViewAnalytics' as const;
export const PERMISSION_ANALYTICS_EXPORT = 'canExportData' as const;

// 💬 Customer
export const PERMISSION_CUSTOMER_CHAT = 'canManageChat' as const;
export const PERMISSION_CUSTOMER_DATA = 'canViewCustomerData' as const;
export const PERMISSION_FEEDBACK_MANAGE = 'canManageFeedback' as const;

// 📺 Screens
export const PERMISSION_DIGITAL_SCREENS_MANAGE = 'canManageDigitalScreens' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSIONS OBJECT - For programmatic access
// ═══════════════════════════════════════════════════════════════════════════════

export const PERMISSIONS = {
    // Billing
    ACCESS_BILLING: PERMISSION_BILLING_ACCESS,
    MANAGE_SUBSCRIPTION: PERMISSION_BILLING_MANAGE_SUBSCRIPTION,
    // Users
    MANAGE_USERS: PERMISSION_USERS_MANAGE,
    ASSIGN_ROLES: PERMISSION_USERS_ASSIGN_ROLES,
    // Store
    MANAGE_STORE: PERMISSION_STORE_MANAGE,
    ADD_STORES: PERMISSION_STORE_ADD,
    MANAGE_PUBLIC_PRESENCE: PERMISSION_PUBLIC_PRESENCE_MANAGE,
    MANAGE_INTEGRATIONS: PERMISSION_INTEGRATIONS_MANAGE,
    // Multi-Outlet
    MANAGE_OUTLETS: PERMISSION_OUTLET_MANAGE,
    SWITCH_STORES: PERMISSION_OUTLET_SWITCH,
    // Menu
    MANAGE_MENU: PERMISSION_MENU_MANAGE,
    PUBLISH_MENU: PERMISSION_MENU_PUBLISH,
    MANAGE_MENU_SHARING: PERMISSION_MENU_SHARING_MANAGE,
    MANAGE_MENU_DESIGN: PERMISSION_MENU_DESIGN_MANAGE,
    // AI
    USE_MENU_EXTRACTION: PERMISSION_AI_EXTRACTION,
    GENERATE_DESCRIPTIONS: PERMISSION_AI_DESCRIPTIONS,
    GENERATE_IMAGES: PERMISSION_AI_IMAGES,
    // Branding
    OVERRIDE_THEME: PERMISSION_BRANDING_THEME,
    OVERRIDE_BRAND_IDENTITY: PERMISSION_BRANDING_IDENTITY,
    OVERRIDE_LAYOUT: PERMISSION_BRANDING_LAYOUT,
    // Content
    ADD_LOCAL_CATEGORIES: PERMISSION_CONTENT_CATEGORIES,
    ADD_LOCAL_ITEMS: PERMISSION_CONTENT_ITEMS,
    OVERRIDE_PRICES: PERMISSION_CONTENT_PRICES,
    // Analytics
    VIEW_ANALYTICS: PERMISSION_ANALYTICS_VIEW,
    EXPORT_DATA: PERMISSION_ANALYTICS_EXPORT,
    // Customer
    MANAGE_CHAT: PERMISSION_CUSTOMER_CHAT,
    VIEW_CUSTOMER_DATA: PERMISSION_CUSTOMER_DATA,
    MANAGE_FEEDBACK: PERMISSION_FEEDBACK_MANAGE,
    // Screens
    MANAGE_DIGITAL_SCREENS: PERMISSION_DIGITAL_SCREENS_MANAGE,
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL PERMISSIONS - For iteration in UI
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_PERMISSIONS: PermissionKey[] = [
    PERMISSION_BILLING_ACCESS,
    PERMISSION_BILLING_MANAGE_SUBSCRIPTION,
    PERMISSION_USERS_MANAGE,
    PERMISSION_USERS_ASSIGN_ROLES,
    PERMISSION_STORE_MANAGE,
    PERMISSION_STORE_ADD,
    PERMISSION_PUBLIC_PRESENCE_MANAGE,
    PERMISSION_INTEGRATIONS_MANAGE,
    PERMISSION_OUTLET_MANAGE,
    PERMISSION_OUTLET_SWITCH,
    PERMISSION_MENU_MANAGE,
    PERMISSION_MENU_PUBLISH,
    PERMISSION_MENU_SHARING_MANAGE,
    PERMISSION_MENU_DESIGN_MANAGE,
    PERMISSION_AI_EXTRACTION,
    PERMISSION_AI_DESCRIPTIONS,
    PERMISSION_AI_IMAGES,
    PERMISSION_BRANDING_THEME,
    PERMISSION_BRANDING_IDENTITY,
    PERMISSION_BRANDING_LAYOUT,
    PERMISSION_CONTENT_CATEGORIES,
    PERMISSION_CONTENT_ITEMS,
    PERMISSION_CONTENT_PRICES,
    PERMISSION_ANALYTICS_VIEW,
    PERMISSION_ANALYTICS_EXPORT,
    PERMISSION_CUSTOMER_CHAT,
    PERMISSION_CUSTOMER_DATA,
    PERMISSION_FEEDBACK_MANAGE,
    PERMISSION_DIGITAL_SCREENS_MANAGE,
];

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION CATEGORIES - For UI grouping
// ═══════════════════════════════════════════════════════════════════════════════

export const PERMISSION_CATEGORIES = {
    BILLING: {
        label: '💰 Billing',
        permissions: [PERMISSION_BILLING_ACCESS, PERMISSION_BILLING_MANAGE_SUBSCRIPTION],
    },
    USERS: {
        label: '👥 Users',
        permissions: [PERMISSION_USERS_MANAGE, PERMISSION_USERS_ASSIGN_ROLES],
    },
    STORE: {
        label: '🏪 Store',
        permissions: [
            PERMISSION_STORE_MANAGE,
            PERMISSION_PUBLIC_PRESENCE_MANAGE,
            PERMISSION_INTEGRATIONS_MANAGE,
            PERMISSION_STORE_ADD,
            PERMISSION_OUTLET_MANAGE,
            PERMISSION_OUTLET_SWITCH,
        ],
    },
    MENU: {
        label: '🍽️ Menu',
        permissions: [
            PERMISSION_MENU_MANAGE,
            PERMISSION_MENU_PUBLISH,
            PERMISSION_MENU_SHARING_MANAGE,
            PERMISSION_MENU_DESIGN_MANAGE,
            PERMISSION_DIGITAL_SCREENS_MANAGE,
        ],
    },
    AI_FEATURES: {
        label: '🤖 AI Features',
        permissions: [PERMISSION_AI_EXTRACTION, PERMISSION_AI_DESCRIPTIONS, PERMISSION_AI_IMAGES],
    },
    BRANDING: {
        label: '🎨 Branding',
        permissions: [PERMISSION_BRANDING_THEME, PERMISSION_BRANDING_IDENTITY, PERMISSION_BRANDING_LAYOUT],
    },
    CONTENT: {
        label: '🏗️ Content',
        permissions: [PERMISSION_CONTENT_CATEGORIES, PERMISSION_CONTENT_ITEMS, PERMISSION_CONTENT_PRICES],
    },
    ANALYTICS: {
        label: '📊 Analytics',
        permissions: [PERMISSION_ANALYTICS_VIEW, PERMISSION_ANALYTICS_EXPORT],
    },
    CUSTOMER: {
        label: '💬 Customer',
        permissions: [PERMISSION_CUSTOMER_CHAT, PERMISSION_FEEDBACK_MANAGE, PERMISSION_CUSTOMER_DATA],
    },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION LABELS - Human-readable names for UI
// ═══════════════════════════════════════════════════════════════════════════════

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    [PERMISSION_BILLING_ACCESS]: 'Access Billing',
    [PERMISSION_BILLING_MANAGE_SUBSCRIPTION]: 'Manage Subscription',
    [PERMISSION_USERS_MANAGE]: 'Manage Users',
    [PERMISSION_USERS_ASSIGN_ROLES]: 'Assign Roles',
    [PERMISSION_STORE_MANAGE]: 'Manage Store',
    [PERMISSION_STORE_ADD]: 'Add Stores',
    [PERMISSION_PUBLIC_PRESENCE_MANAGE]: 'Manage Public Presence',
    [PERMISSION_INTEGRATIONS_MANAGE]: 'Manage Integrations',
    [PERMISSION_OUTLET_MANAGE]: 'Manage Outlets',
    [PERMISSION_OUTLET_SWITCH]: 'Switch Stores',
    [PERMISSION_MENU_MANAGE]: 'Manage Menu',
    [PERMISSION_MENU_PUBLISH]: 'Publish Menu',
    [PERMISSION_MENU_SHARING_MANAGE]: 'Manage Sharing & QR',
    [PERMISSION_MENU_DESIGN_MANAGE]: 'Manage Menu Design',
    [PERMISSION_AI_EXTRACTION]: 'Use Menu Extraction',
    [PERMISSION_AI_DESCRIPTIONS]: 'Generate Descriptions',
    [PERMISSION_AI_IMAGES]: 'Generate Images',
    [PERMISSION_BRANDING_THEME]: 'Override Theme',
    [PERMISSION_BRANDING_IDENTITY]: 'Override Brand Identity',
    [PERMISSION_BRANDING_LAYOUT]: 'Override Layout',
    [PERMISSION_CONTENT_CATEGORIES]: 'Add Local Categories',
    [PERMISSION_CONTENT_ITEMS]: 'Add Local Items',
    [PERMISSION_CONTENT_PRICES]: 'Override Prices',
    [PERMISSION_ANALYTICS_VIEW]: 'View Analytics',
    [PERMISSION_ANALYTICS_EXPORT]: 'Export Data',
    [PERMISSION_CUSTOMER_CHAT]: 'Manage Chat',
    [PERMISSION_FEEDBACK_MANAGE]: 'Manage Feedback',
    [PERMISSION_CUSTOMER_DATA]: 'View Customer Data',
    [PERMISSION_DIGITAL_SCREENS_MANAGE]: 'Manage Digital Screens',
};
