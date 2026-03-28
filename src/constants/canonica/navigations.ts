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
    LuDatabase,
    LuLayoutDashboard,
    LuMessageSquare,
    LuReceipt,
    LuSettings,
    LuShield,
    LuTicket,
} from 'react-icons/lu';

// ═══════════════════════════════════════════════════════════════
// ROUTE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CANONICA_BASE_PATH = '/canonica';

export const CANONICA_ROUTES = {
    DASHBOARD: `${CANONICA_BASE_PATH}/dashboard`,
    KNOWLEDGE_BASE: `${CANONICA_BASE_PATH}/knowledge-base`,
    KB_GENERATION: `${CANONICA_BASE_PATH}/kb-generation`,
    TICKETS: `${CANONICA_BASE_PATH}/tickets`,
    CONVERSATIONS: `${CANONICA_BASE_PATH}/conversations`,
    GOVERNANCE: `${CANONICA_BASE_PATH}/governance`,
    CHANGELOG: `${CANONICA_BASE_PATH}/changelog`,
    SETTINGS: `${CANONICA_BASE_PATH}/settings`,
} as const;

// ═══════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════

export interface CanonicaNavItem {
    key: string;
    label: string;
    route: string;
    icon: any;
    group?: string;
    /** Optional feature flag key — if set, nav item is hidden when flag is OFF */
    featureFlag?: string;
}

export const CANONICA_SIDEBAR_NAV: CanonicaNavItem[] = [
    // Core
    { key: 'dashboard', label: 'Dashboard', route: CANONICA_ROUTES.DASHBOARD, icon: LuLayoutDashboard, group: 'core' },
    { key: 'knowledge-base', label: 'Knowledge Base', route: CANONICA_ROUTES.KNOWLEDGE_BASE, icon: LuBook, group: 'core' },
    { key: 'kb-generation', label: 'KB Generation', route: CANONICA_ROUTES.KB_GENERATION, icon: LuDatabase, group: 'core' },
    { key: 'tickets', label: 'Tickets', route: CANONICA_ROUTES.TICKETS, icon: LuTicket, group: 'core' },
    { key: 'conversations', label: 'Conversations', route: CANONICA_ROUTES.CONVERSATIONS, icon: LuMessageSquare, group: 'core' },

    // Governance (feature-flagged)
    { key: 'governance', label: 'Governance', route: CANONICA_ROUTES.GOVERNANCE, icon: LuShield, group: 'governance', featureFlag: 'ENABLE_CANONICA_GOVERNANCE_UI' },

    // Management
    { key: 'changelog', label: 'Changelog', route: CANONICA_ROUTES.CHANGELOG, icon: LuReceipt, group: 'management' },
    { key: 'settings', label: 'Settings', route: CANONICA_ROUTES.SETTINGS, icon: LuSettings, group: 'management' },
];

// Group labels for sidebar section dividers
export const CANONICA_NAV_GROUPS: Record<string, string> = {
    core: 'Support',
    governance: 'Governance',
    management: 'Management',
};

// All Canonica routes as array (for SKIP_CLIENT_APP_LAYOUT_ROUTINGS detection)
export const ALL_CANONICA_ROUTES = Object.values(CANONICA_ROUTES);
