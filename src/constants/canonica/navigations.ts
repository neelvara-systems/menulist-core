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
    LuDatabase,
    LuLayoutDashboard,
    LuLayers,
    LuMessageSquare,
    LuReceipt,
    LuSettings,
    LuShield,
    LuTicket,
} from 'react-icons/lu';
import { isCanonicaProductHostname } from './domains';

// ═══════════════════════════════════════════════════════════════
// ROUTE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CANONICA_BASE_PATH = '/canonica';

export const CANONICA_ROUTES = {
    HELP: `${CANONICA_BASE_PATH}/help`,
    DOCS: `${CANONICA_BASE_PATH}/docs`,
    SUPPORT: `${CANONICA_BASE_PATH}/support`,
    RELEASE_NOTES: `${CANONICA_BASE_PATH}/release-notes`,
    DASHBOARD: `${CANONICA_BASE_PATH}/dashboard`,
    KNOWLEDGE_BASE: `${CANONICA_BASE_PATH}/knowledge-base`,
    KB_GENERATION: `${CANONICA_BASE_PATH}/kb-generation`,
    TICKETS: `${CANONICA_BASE_PATH}/tickets`,
    CONVERSATIONS: `${CANONICA_BASE_PATH}/conversations`,
    GOVERNANCE: `${CANONICA_BASE_PATH}/governance`,
    CHANGELOG: `${CANONICA_BASE_PATH}/changelog`,
    PRODUCT_SURFACES: `${CANONICA_BASE_PATH}/product-surfaces`,
    WIDGET: `${CANONICA_BASE_PATH}/widget`,
    SETTINGS: `${CANONICA_BASE_PATH}/settings`,
} as const;

export function toCanonicaDashboardRoute(route: string, hostname?: string | null) {
    if (!isCanonicaProductHostname(hostname) || !route.startsWith(CANONICA_BASE_PATH)) {
        return route;
    }

    return route.slice(CANONICA_BASE_PATH.length) || '/dashboard';
}

export function normalizeCanonicaRoutePathname(pathname: string) {
    if (pathname === '/' || pathname.startsWith(CANONICA_BASE_PATH)) {
        return pathname;
    }

    return `${CANONICA_BASE_PATH}${pathname}`;
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
    /** Optional feature flag key — if set, nav item is hidden when flag is OFF */
    featureFlag?: string;
}

export const CANONICA_SIDEBAR_NAV: CanonicaNavItem[] = [
    // Client support portal
    { key: 'help', label: 'Help Center', route: CANONICA_ROUTES.HELP, icon: LuLayoutDashboard, group: 'client' },
    { key: 'docs', label: 'Documentation', route: CANONICA_ROUTES.DOCS, icon: LuBook, group: 'client' },
    { key: 'support', label: 'Support Tickets', route: CANONICA_ROUTES.SUPPORT, icon: LuTicket, group: 'client' },
    { key: 'release-notes', label: 'Release Notes', route: CANONICA_ROUTES.RELEASE_NOTES, icon: LuReceipt, group: 'client' },

    // Canonica operator surfaces
    { key: 'dashboard', label: 'Dashboard', route: CANONICA_ROUTES.DASHBOARD, icon: LuLayoutDashboard, group: 'core', platformOnly: true },
    { key: 'knowledge-base', label: 'Knowledge Base', route: CANONICA_ROUTES.KNOWLEDGE_BASE, icon: LuBook, group: 'core', platformOnly: true },
    { key: 'kb-generation', label: 'KB Generation', route: CANONICA_ROUTES.KB_GENERATION, icon: LuDatabase, group: 'core', platformOnly: true },
    { key: 'tickets', label: 'Tickets', route: CANONICA_ROUTES.TICKETS, icon: LuTicket, group: 'core', platformOnly: true },
    { key: 'conversations', label: 'Conversations', route: CANONICA_ROUTES.CONVERSATIONS, icon: LuMessageSquare, group: 'core', platformOnly: true },

    // Governance (feature-flagged)
    { key: 'governance', label: 'Governance', route: CANONICA_ROUTES.GOVERNANCE, icon: LuShield, group: 'governance', platformOnly: true, featureFlag: 'ENABLE_CANONICA_GOVERNANCE_UI' },

    // Management
    { key: 'changelog', label: 'Changelog', route: CANONICA_ROUTES.CHANGELOG, icon: LuReceipt, group: 'management', platformOnly: true },
    { key: 'product-surfaces', label: 'Product Surfaces', route: CANONICA_ROUTES.PRODUCT_SURFACES, icon: LuLayers, group: 'management', platformOnly: true, featureFlag: 'ENABLE_CANONICA_PRODUCT_SURFACES' },
    { key: 'widget', label: 'Widget', route: CANONICA_ROUTES.WIDGET, icon: LuCode, group: 'management', platformOnly: true },
    { key: 'settings', label: 'Settings', route: CANONICA_ROUTES.SETTINGS, icon: LuSettings, group: 'management', platformOnly: true },
];

// Group labels for sidebar section dividers
export const CANONICA_NAV_GROUPS: Record<string, string> = {
    client: 'Client Support',
    core: 'Operations',
    governance: 'Governance',
    management: 'Management',
};

export const CANONICA_ADMIN_ROUTES = CANONICA_SIDEBAR_NAV
    .filter((nav) => nav.platformOnly)
    .map((nav) => nav.route);

// All Canonica routes as array (for SKIP_CLIENT_APP_LAYOUT_ROUTINGS detection)
export const ALL_CANONICA_ROUTES = Object.values(CANONICA_ROUTES);
