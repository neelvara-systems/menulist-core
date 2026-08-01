/**
 * Role Permissions - Feature Flag Style
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Simple true/false flags for each permission.
 * Based on industry standards (Square, Toast, Lightspeed) and multi-chain requirements.
 */

import type { OutletPolicy } from '@type/multiOutlet.types';

// All available permissions as simple boolean flags
export type RolePermissions = {
    // 💰 Billing & Subscription
    canAccessBilling?: boolean;        // View billing, invoices, subscription
    canManageSubscription?: boolean;   // Upgrade, downgrade, cancel subscription

    // 👥 User Management
    canManageUsers?: boolean;          // Add, edit, remove users
    canAssignRoles?: boolean;          // Assign/change user roles

    // 🏪 Store Management  
    canManageStore?: boolean;          // Edit store settings, hours, info
    canAddStores?: boolean;            // Add new outlet stores (multi-chain)
    canManagePublicPresence?: boolean; // Edit public page, domain, SEO, discovery, customer app
    canManageIntegrations?: boolean;   // Manage POS/webhook and external integrations

    // 🔗 Multi-Outlet (Feature #4C)
    canManageOutlets?: boolean;        // Create/deactivate outlets, manage Chain Control Panel
    canSwitchStores?: boolean;         // Switch between stores as master user

    // 🍽️ Menu Management
    canManageMenu?: boolean;           // Edit menu items, categories, prices
    canPublishMenu?: boolean;          // Publish menu changes live
    canManageMenuSharing?: boolean;    // Manage share links, QR, print/download output
    canManageMenuDesign?: boolean;     // Edit menu design and customer-facing presentation

    // 🤖 AI Features (Credit-consuming)
    canUseMenuExtraction?: boolean;    // Run AI menu extraction
    canGenerateDescriptions?: boolean; // Generate AI descriptions
    canGenerateImages?: boolean;       // Generate AI images

    // 🎨 Branding (Multi-outlet override control)
    canOverrideTheme?: boolean;        // Override colors, fonts
    canOverrideBrandIdentity?: boolean; // Override brand identity and business classification
    canOverrideLayout?: boolean;       // Override UI layout

    // 🏗️ Content Control (Multi-outlet)
    canAddLocalCategories?: boolean;   // Add local-only categories
    canAddLocalItems?: boolean;        // Add local-only menu items
    canOverridePrices?: boolean;       // Override master menu prices

    // 📊 Analytics & Reports
    canViewAnalytics?: boolean;        // View reports, dashboards
    canExportData?: boolean;           // Export data, reports

    // 💬 Customer Interactions
    canManageChat?: boolean;           // View/respond to customer chats
    canManageFeedback?: boolean;       // View/respond to guest feedback
    canViewCustomerData?: boolean;     // View customer information

    // 📺 Digital Screens
    canManageDigitalScreens?: boolean; // Configure TV/menu-board screens
};

export type EffectiveRolePermissions = RolePermissions & {
    outletPolicy?: OutletPolicy;
};

// NOTE: Permission keys and categories moved to src/constants/permissions.ts
// Import from there: import { PERMISSIONS, ALL_PERMISSIONS, PERMISSION_CATEGORIES } from '@constant/permissions';

// Role document type in Firestore
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
