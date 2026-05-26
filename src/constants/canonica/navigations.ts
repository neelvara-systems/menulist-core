/**
 * Canonica Dashboard — Navigation Constants
 * 
 * Separate from MenuList navigations. Canonica is a different product
 * with different ICP (SaaS founders, not restaurant owners).
 * 
 * All routes under /canonica/* prefix.
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md
 */

import {
    LuBook,
    LuCode,
    LuCreditCard,
    LuDatabase,
    LuGitPullRequest,
    LuHelpCircle,
    LuLayoutDashboard,
    LuLayers,
    LuMailCheck,
    LuMessageSquare,
    LuReceipt,
    LuRocket,
    LuSettings,
    LuShield,
    LuTicket,
    LuUsers,
} from 'react-icons/lu';
import type { CanonicaPermissionKey } from './permissions';
import { CANONICA_PERMISSION_KEYS } from './permissions';
import { CANONICA_BASE_PATH, CANONICA_ROUTES } from './routes';
export { CANONICA_BASE_PATH, CANONICA_ROUTES, normalizeCanonicaRoutePathname, toCanonicaDashboardRoute } from './routes';

// ═══════════════════════════════════════════════════════════════
// ROUTE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CANONICA_GOVERNANCE_TABS = {
    ANSWERS: 'answers',
    ENTITIES: 'entities',
    CANDIDATES: 'candidates',
    DRIFT: 'drift',
    SIGNAL_QUEUE: 'signal-queue',
    TRUST: 'trust',
} as const;

export function getCanonicaGovernanceRoute(tab: string) {
    return `${CANONICA_ROUTES.GOVERNANCE}?tab=${encodeURIComponent(tab)}`;
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════

export interface CanonicaNavItem {
    key: string;
    label: string;
    route: string;
    icon: any;
    group?: string;
    platformOnly?: boolean;
    managementOnly?: boolean;
    requiredPermission?: CanonicaPermissionKey;
    /** Optional feature flag key — if set, nav item is hidden when flag is OFF */
    featureFlag?: string;
}

export const CANONICA_SIDEBAR_NAV: CanonicaNavItem[] = [
    // Launch Setup
    { key: 'activation', label: 'Activation', route: CANONICA_ROUTES.ACTIVATION, icon: LuRocket, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS, featureFlag: 'ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER' },
    { key: 'settings', label: 'Product Details', route: CANONICA_ROUTES.SETTINGS, icon: LuSettings, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE },
    { key: 'team', label: 'Team Access', route: CANONICA_ROUTES.TEAM, icon: LuUsers, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_CANONICA_STAFF_ACCESS' },
    { key: 'kb-generation', label: 'Import Knowledge', route: CANONICA_ROUTES.KB_GENERATION, icon: LuDatabase, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE },
    { key: 'product-surfaces', label: 'Product Surfaces', route: CANONICA_ROUTES.PRODUCT_SURFACES, icon: LuLayers, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_CANONICA_PRODUCT_SURFACES' },
    { key: 'widget', label: 'Widget Install', route: CANONICA_ROUTES.WIDGET, icon: LuCode, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'billing', label: 'Billing', route: CANONICA_ROUTES.BILLING, icon: LuCreditCard, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_BILLING },

    // Support Control
    { key: 'help', label: 'Help Center', route: CANONICA_ROUTES.HELP, icon: LuLayoutDashboard, group: 'support' },
    { key: 'docs', label: 'Documentation', route: CANONICA_ROUTES.DOCS, icon: LuBook, group: 'support' },
    { key: 'release-notes', label: 'Release Notes', route: CANONICA_ROUTES.RELEASE_NOTES, icon: LuReceipt, group: 'support' },
    { key: 'knowledge-base', label: 'Knowledge Base', route: CANONICA_ROUTES.KNOWLEDGE_BASE, icon: LuBook, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE },
    { key: 'faqs', label: 'FAQs', route: CANONICA_ROUTES.FAQS, icon: LuHelpCircle, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_CANONICA_FAQ_MANAGEMENT' },
    { key: 'changelog', label: 'Changelog', route: CANONICA_ROUTES.CHANGELOG, icon: LuReceipt, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE },
    { key: 'tickets', label: 'Tickets', route: CANONICA_ROUTES.TICKETS, icon: LuTicket, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT },
    { key: 'conversations', label: 'Conversations', route: CANONICA_ROUTES.CONVERSATIONS, icon: LuMessageSquare, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT },
    { key: 'weekly-digest', label: 'Weekly Digest', route: CANONICA_ROUTES.WEEKLY_DIGEST, icon: LuMailCheck, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS, featureFlag: 'ENABLE_CANONICA_WEEKLY_DIGEST' },
    { key: 'transactions', label: 'Transactions', route: CANONICA_ROUTES.TRANSACTIONS, icon: LuReceipt, group: 'support', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_BILLING },

    // Knowledge Governance
    { key: 'dashboard', label: 'Readiness Metrics', route: CANONICA_ROUTES.DASHBOARD, icon: LuLayoutDashboard, group: 'governance', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS },
    { key: 'governance', label: 'Knowledge Governance', route: CANONICA_ROUTES.GOVERNANCE, icon: LuShield, group: 'governance', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_GOVERNANCE_UI' },
    { key: 'signal-queue', label: 'Signal Queue', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE), icon: LuGitPullRequest, group: 'governance', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_SIGNAL_MUTATION' },
];

// Group labels for sidebar section dividers
export const CANONICA_NAV_GROUPS: Record<string, string> = {
    launch: 'Launch Setup',
    support: 'Support Control',
    governance: 'Knowledge Governance',
};

export const CANONICA_MANAGEMENT_ROUTES = CANONICA_SIDEBAR_NAV
    .filter((nav) => nav.managementOnly || nav.platformOnly)
    .map((nav) => nav.route);

export const CANONICA_ADMIN_ROUTES = CANONICA_MANAGEMENT_ROUTES;

// All Canonica routes as array (for SKIP_CLIENT_APP_LAYOUT_ROUTINGS detection)
export const ALL_CANONICA_ROUTES = Object.values(CANONICA_ROUTES);
