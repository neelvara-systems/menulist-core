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
    LuBarChart3,
    LuBookOpen,
    LuBoxes,
    LuCode,
    LuCreditCard,
    LuDatabase,
    LuFlame,
    LuGitPullRequest,
    LuGlobe,
    LuHeart,
    LuHelpCircle,
    LuHistory,
    LuLayoutDashboard,
    LuLayers,
    LuLanguages,
    LuMailCheck,
    LuKanbanSquare,
    LuMessageSquare,
    LuPaintbrush,
    LuReceipt,
    LuRocket,
    LuSettings,
    LuShield,
    LuShieldAlert,
    LuShieldCheck,
    LuTicket,
    LuUsers,
    LuZap,
} from 'react-icons/lu';
import type { CanonicaPermissionKey } from './permissions';
import { CANONICA_PERMISSION_KEYS } from './permissions';
import { CANONICA_BASE_PATH, CANONICA_ROUTES } from './routes';
export { CANONICA_BASE_PATH, CANONICA_ROUTES, normalizeCanonicaRoutePathname, toCanonicaDashboardRoute } from './routes';

export const CANONICA_DASHBOARD_SIDEBAR_EXPANDED_WIDTH = 256;

// ═══════════════════════════════════════════════════════════════
// ROUTE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CANONICA_GOVERNANCE_TABS = {
    ANSWERS: 'answers',
    ENTITIES: 'entities',
    ANALYTICS: 'analytics',
    HEALTH: 'health',
    HISTORY: 'history',
    CANDIDATES: 'candidates',
    DRIFT: 'drift',
    SIGNAL_QUEUE: 'signal-queue',
    TRUST: 'trust',
    BRANDING: 'branding',
    FRICTION: 'friction',
    LANGUAGES: 'languages',
    TRIGGERS: 'triggers',
} as const;

export const CANONICA_DEFAULT_GOVERNANCE_TAB = CANONICA_GOVERNANCE_TABS.ANSWERS;

const CANONICA_GOVERNANCE_TAB_VALUES = Object.values(CANONICA_GOVERNANCE_TABS);

export function isCanonicaGovernanceTab(tab: string | null | undefined): tab is typeof CANONICA_GOVERNANCE_TAB_VALUES[number] {
    return Boolean(tab && CANONICA_GOVERNANCE_TAB_VALUES.includes(tab as typeof CANONICA_GOVERNANCE_TAB_VALUES[number]));
}

export function getCanonicaGovernanceRoute(tab: string) {
    const normalizedTab = isCanonicaGovernanceTab(tab) ? tab : CANONICA_DEFAULT_GOVERNANCE_TAB;
    return `${CANONICA_ROUTES.GOVERNANCE}/${encodeURIComponent(normalizedTab)}`;
}

export function getCanonicaGovernanceTabFromPathname(pathname: string) {
    const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '';
    const segments = cleanPathname.split('/').filter(Boolean);
    const governanceIndex = segments.lastIndexOf('governance');
    const tab = governanceIndex >= 0 ? segments[governanceIndex + 1] : undefined;
    if (!tab) return null;

    const decodedTab = decodeURIComponent(tab);
    return isCanonicaGovernanceTab(decodedTab) ? decodedTab : null;
}

export const CANONICA_WIDGET_TABS = {
    UI: 'ui',
    INSTALL: 'install',
    HOSTED_HELP: 'hosted-help',
    ACCESS: 'access',
} as const;

export const CANONICA_DEFAULT_WIDGET_TAB = CANONICA_WIDGET_TABS.UI;

const CANONICA_WIDGET_TAB_VALUES = Object.values(CANONICA_WIDGET_TABS);

export function isCanonicaWidgetTab(tab: string | null | undefined): tab is typeof CANONICA_WIDGET_TAB_VALUES[number] {
    return Boolean(tab && CANONICA_WIDGET_TAB_VALUES.includes(tab as typeof CANONICA_WIDGET_TAB_VALUES[number]));
}

export function getCanonicaWidgetRoute(tab: string) {
    const normalizedTab = isCanonicaWidgetTab(tab) ? tab : CANONICA_DEFAULT_WIDGET_TAB;
    return `${CANONICA_ROUTES.WIDGET}/${encodeURIComponent(normalizedTab)}`;
}

export function getCanonicaWidgetTabFromPathname(pathname: string) {
    const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '';
    const segments = cleanPathname.split('/').filter(Boolean);
    const widgetIndex = segments.lastIndexOf('widget');
    const tab = widgetIndex >= 0 ? segments[widgetIndex + 1] : undefined;
    if (!tab) return null;

    const decodedTab = decodeURIComponent(tab);
    return isCanonicaWidgetTab(decodedTab) ? decodedTab : null;
}

export const CANONICA_TEAM_TABS = {
    MEMBERS: 'members',
    ROLES: 'roles',
} as const;

export const CANONICA_DEFAULT_TEAM_TAB = CANONICA_TEAM_TABS.MEMBERS;

const CANONICA_TEAM_TAB_VALUES = Object.values(CANONICA_TEAM_TABS);

export function isCanonicaTeamTab(tab: string | null | undefined): tab is typeof CANONICA_TEAM_TAB_VALUES[number] {
    return Boolean(tab && CANONICA_TEAM_TAB_VALUES.includes(tab as typeof CANONICA_TEAM_TAB_VALUES[number]));
}

export function getCanonicaTeamRoute(tab: string) {
    const normalizedTab = isCanonicaTeamTab(tab) ? tab : CANONICA_DEFAULT_TEAM_TAB;
    return `${CANONICA_ROUTES.TEAM}/${encodeURIComponent(normalizedTab)}`;
}

export function getCanonicaTeamTabFromPathname(pathname: string) {
    const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '';
    const segments = cleanPathname.split('/').filter(Boolean);
    const teamIndex = segments.lastIndexOf('team');
    const tab = teamIndex >= 0 ? segments[teamIndex + 1] : undefined;
    if (!tab) return null;

    const decodedTab = decodeURIComponent(tab);
    return isCanonicaTeamTab(decodedTab) ? decodedTab : null;
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
    subNav?: CanonicaNavItem[];
}

export const CANONICA_LAUNCH_SETUP_SUB_NAV: CanonicaNavItem[] = [
    { key: 'launch-activation', label: 'Activation', route: CANONICA_ROUTES.ACTIVATION, icon: LuRocket, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS, featureFlag: 'ENABLE_CANONICA_ACTIVATION_COMMAND_CENTER' },
    { key: 'launch-install-center', label: 'Install Center', route: CANONICA_ROUTES.INSTALL_CENTER, icon: LuCode, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET, featureFlag: 'ENABLE_CANONICA_AGENT_INSTALL' },
    { key: 'launch-settings', label: 'Product Details', route: CANONICA_ROUTES.SETTINGS, icon: LuSettings, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WORKSPACE },
    { key: 'launch-kb-generation', label: 'Import Knowledge', route: CANONICA_ROUTES.KB_GENERATION, icon: LuDatabase, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE },
    { key: 'launch-product-surfaces', label: 'Product Surfaces', route: CANONICA_ROUTES.PRODUCT_SURFACES, icon: LuLayers, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_CANONICA_PRODUCT_SURFACES' },
    { key: 'launch-readiness', label: 'Readiness Metrics', route: CANONICA_ROUTES.DASHBOARD, icon: LuLayoutDashboard, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS },
];

export const CANONICA_SUPPORT_CONTROL_SUB_NAV: CanonicaNavItem[] = [
    { key: 'support-knowledge-base', label: 'Knowledge Base', route: CANONICA_ROUTES.KNOWLEDGE_BASE, icon: LuBookOpen, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE },
    { key: 'support-faqs', label: 'FAQs', route: CANONICA_ROUTES.FAQS, icon: LuHelpCircle, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_CANONICA_FAQ_MANAGEMENT' },
    { key: 'support-changelog', label: 'Changelog', route: CANONICA_ROUTES.CHANGELOG, icon: LuReceipt, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_KNOWLEDGE },
    { key: 'support-board', label: 'Support Board', route: CANONICA_ROUTES.SUPPORT_BOARD, icon: LuKanbanSquare, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT, featureFlag: 'ENABLE_CANONICA_SUPPORT_BOARD' },
    { key: 'support-tickets', label: 'Ticket Inbox', route: CANONICA_ROUTES.TICKETS, icon: LuTicket, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT },
    { key: 'support-conversations', label: 'Conversations', route: CANONICA_ROUTES.CONVERSATIONS, icon: LuMessageSquare, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_SUPPORT },
    { key: 'support-weekly-digest', label: 'Weekly Digest', route: CANONICA_ROUTES.WEEKLY_DIGEST, icon: LuMailCheck, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS, featureFlag: 'ENABLE_CANONICA_WEEKLY_DIGEST' },
];

export const CANONICA_WIDGET_SUB_NAV: CanonicaNavItem[] = [
    { key: 'widget-ui', label: 'UI Configuration', route: getCanonicaWidgetRoute(CANONICA_WIDGET_TABS.UI), icon: LuPaintbrush, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'widget-install', label: 'Install & Embed', route: getCanonicaWidgetRoute(CANONICA_WIDGET_TABS.INSTALL), icon: LuCode, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'widget-hosted-help', label: 'Hosted Help', route: getCanonicaWidgetRoute(CANONICA_WIDGET_TABS.HOSTED_HELP), icon: LuGlobe, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'widget-access', label: 'Access & Security', route: getCanonicaWidgetRoute(CANONICA_WIDGET_TABS.ACCESS), icon: LuShield, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET },
];

export const CANONICA_TEAM_SUB_NAV: CanonicaNavItem[] = [
    { key: 'team-members', label: 'Members', route: getCanonicaTeamRoute(CANONICA_TEAM_TABS.MEMBERS), icon: LuUsers, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_CANONICA_STAFF_ACCESS' },
    { key: 'team-roles', label: 'Roles & Permissions', route: getCanonicaTeamRoute(CANONICA_TEAM_TABS.ROLES), icon: LuShieldCheck, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_CANONICA_STAFF_ACCESS' },
];

export const CANONICA_BILLING_SUB_NAV: CanonicaNavItem[] = [
    { key: 'billing-subscription', label: 'Subscription', route: CANONICA_ROUTES.BILLING, icon: LuCreditCard, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_BILLING },
    { key: 'billing-transactions', label: 'Transactions', route: CANONICA_ROUTES.TRANSACTIONS, icon: LuReceipt, managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_BILLING },
];

export const CANONICA_GOVERNANCE_SUB_NAV: CanonicaNavItem[] = [
    { key: 'governance-answers', label: 'Canonical Answers', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.ANSWERS), icon: LuBookOpen, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE },
    { key: 'governance-entities', label: 'Product Ontology', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.ENTITIES), icon: LuBoxes, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE },
    { key: 'governance-analytics', label: 'Answer Analytics', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.ANALYTICS), icon: LuBarChart3, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE },
    { key: 'governance-health', label: 'Entity Health', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.HEALTH), icon: LuHeart, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE },
    { key: 'governance-history', label: 'Version History', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.HISTORY), icon: LuHistory, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE },
    { key: 'governance-candidates', label: 'Entity Candidates', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.CANDIDATES), icon: LuGitPullRequest, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_ONTOLOGY' },
    { key: 'governance-drift', label: 'Drift Review', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.DRIFT), icon: LuShieldAlert, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_DRIFT_DETECTION' },
    { key: 'governance-signal-queue', label: 'Signal Queue', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE), icon: LuGitPullRequest, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_SIGNAL_MUTATION' },
    { key: 'governance-trust', label: 'Trust Metrics', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.TRUST), icon: LuShieldCheck, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_TRUST_METRICS' },
    { key: 'governance-branding', label: 'Branding', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.BRANDING), icon: LuPaintbrush, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_WHITE_LABEL' },
    { key: 'governance-friction', label: 'Friction', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.FRICTION), icon: LuFlame, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_FRICTION_INTELLIGENCE' },
    { key: 'governance-languages', label: 'Languages', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.LANGUAGES), icon: LuLanguages, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_MULTI_LANGUAGE' },
    { key: 'governance-triggers', label: 'Predictive Triggers', route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.TRIGGERS), icon: LuZap, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_PREDICTIVE_SUPPORT' },
];

export const CANONICA_SIDEBAR_NAV: CanonicaNavItem[] = [
    { key: 'launch', label: 'Launch Setup', route: CANONICA_ROUTES.ACTIVATION, icon: LuRocket, group: 'launch', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.VIEW_READINESS, subNav: CANONICA_LAUNCH_SETUP_SUB_NAV },
    { key: 'support', label: 'Support Control', route: CANONICA_ROUTES.KNOWLEDGE_BASE, icon: LuMessageSquare, group: 'support', managementOnly: true, subNav: CANONICA_SUPPORT_CONTROL_SUB_NAV },
    { key: 'widget', label: 'Widget & Hosted Help', route: CANONICA_ROUTES.WIDGET, icon: LuCode, group: 'widget', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_WIDGET, subNav: CANONICA_WIDGET_SUB_NAV },
    { key: 'team', label: 'Team & Access', route: CANONICA_ROUTES.TEAM, icon: LuUsers, group: 'team', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_CANONICA_STAFF_ACCESS', subNav: CANONICA_TEAM_SUB_NAV },
    { key: 'billing', label: 'Billing', route: CANONICA_ROUTES.BILLING, icon: LuCreditCard, group: 'billing', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_BILLING, subNav: CANONICA_BILLING_SUB_NAV },
    { key: 'governance', label: 'Knowledge Governance', route: CANONICA_ROUTES.GOVERNANCE, icon: LuShield, group: 'governance', managementOnly: true, requiredPermission: CANONICA_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_CANONICA_GOVERNANCE_UI', subNav: CANONICA_GOVERNANCE_SUB_NAV },
];

// Group labels for sidebar section dividers
export const CANONICA_NAV_GROUPS: Record<string, string> = {
    launch: 'Launch Setup',
    support: 'Support Control',
    widget: 'Widget & Hosted Help',
    team: 'Team & Access',
    billing: 'Billing',
    governance: 'Knowledge Governance',
};

export const CANONICA_FLAT_SIDEBAR_NAV = CANONICA_SIDEBAR_NAV.flatMap((nav) => [nav, ...(nav.subNav || [])]);

export const CANONICA_MANAGEMENT_ROUTES = CANONICA_SIDEBAR_NAV
    .flatMap((nav) => [nav, ...(nav.subNav || [])])
    .filter((nav) => nav.managementOnly || nav.platformOnly || Boolean(nav.requiredPermission))
    .map((nav) => nav.route);

export const CANONICA_ADMIN_ROUTES = CANONICA_MANAGEMENT_ROUTES;

// All Canonica routes as array (for SKIP_CLIENT_APP_LAYOUT_ROUTINGS detection)
export const ALL_CANONICA_ROUTES = Object.values(CANONICA_ROUTES);
