/**
 * Answerlattice Dashboard — Navigation Constants
 * 
 * Separate from MenuList navigations. Answerlattice is a different product
 * with different ICP (SaaS founders, not restaurant owners).
 * 
 * All routes under /answerlattice/* prefix.
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md
 */

import {
    LuBarChart3,
    LuBell,
    LuBookOpen,
    LuBoxes,
    LuCode,
    LuClipboardCheck,
    LuCreditCard,
    LuFileInput,
    LuFlame,
    LuGitPullRequest,
    LuGitBranch,
    LuGlobe,
    LuHeart,
    LuHelpCircle,
    LuHistory,
    LuAlertCircle,
    LuLayoutDashboard,
    LuLayers,
    LuLanguages,
    LuMailCheck,
    LuKanbanSquare,
    LuKeyRound,
    LuListChecks,
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
import type { IconType } from 'react-icons';
import type { AnswerlatticePermissionKey } from './permissions';
import { ANSWERLATTICE_PERMISSION_KEYS } from './permissions';
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from './customerLanguage';
import { ANSWERLATTICE_BASE_PATH, ANSWERLATTICE_ROUTES } from './routes';
export { ANSWERLATTICE_BASE_PATH, ANSWERLATTICE_ROUTES, normalizeAnswerlatticeRoutePathname, toAnswerlatticeDashboardRoute } from './routes';

export const ANSWERLATTICE_DASHBOARD_SIDEBAR_EXPANDED_WIDTH = 256;

// ═══════════════════════════════════════════════════════════════
// ROUTE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const ANSWERLATTICE_GOVERNANCE_TABS = {
    ANSWERS: 'answers',
    ENTITIES: 'entities',
    MAP: 'map',
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

export const ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB = ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS;

const ANSWERLATTICE_GOVERNANCE_TAB_VALUES = Object.values(ANSWERLATTICE_GOVERNANCE_TABS);

const decodeRouteSegment = (value: string): string | null => {
    try {
        return decodeURIComponent(value);
    } catch {
        return null;
    }
};

export function isAnswerlatticeGovernanceTab(tab: string | null | undefined): tab is typeof ANSWERLATTICE_GOVERNANCE_TAB_VALUES[number] {
    return Boolean(tab && ANSWERLATTICE_GOVERNANCE_TAB_VALUES.includes(tab as typeof ANSWERLATTICE_GOVERNANCE_TAB_VALUES[number]));
}

export function getAnswerlatticeGovernanceRoute(tab: string) {
    const normalizedTab = isAnswerlatticeGovernanceTab(tab) ? tab : ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB;
    return `${ANSWERLATTICE_ROUTES.GOVERNANCE}/${encodeURIComponent(normalizedTab)}`;
}

export function getAnswerlatticeGovernanceTabFromPathname(pathname: string) {
    const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '';
    const segments = cleanPathname.split('/').filter(Boolean);
    const governanceIndex = segments.lastIndexOf('governance');
    const tab = governanceIndex >= 0 ? segments[governanceIndex + 1] : undefined;
    if (!tab) return null;

    const decodedTab = decodeRouteSegment(tab);
    return isAnswerlatticeGovernanceTab(decodedTab) ? decodedTab : null;
}

export const ANSWERLATTICE_WIDGET_TABS = {
    UI: 'ui',
    INSTALL: 'install',
    HOSTED_HELP: 'hosted-help',
    ACCESS: 'access',
} as const;

export const ANSWERLATTICE_DEFAULT_WIDGET_TAB = ANSWERLATTICE_WIDGET_TABS.UI;

const ANSWERLATTICE_WIDGET_TAB_VALUES = Object.values(ANSWERLATTICE_WIDGET_TABS);

export function isAnswerlatticeWidgetTab(tab: string | null | undefined): tab is typeof ANSWERLATTICE_WIDGET_TAB_VALUES[number] {
    return Boolean(tab && ANSWERLATTICE_WIDGET_TAB_VALUES.includes(tab as typeof ANSWERLATTICE_WIDGET_TAB_VALUES[number]));
}

export function getAnswerlatticeWidgetRoute(tab: string) {
    const normalizedTab = isAnswerlatticeWidgetTab(tab) ? tab : ANSWERLATTICE_DEFAULT_WIDGET_TAB;
    return `${ANSWERLATTICE_ROUTES.WIDGET}/${encodeURIComponent(normalizedTab)}`;
}

export function getAnswerlatticeWidgetTabFromPathname(pathname: string) {
    const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '';
    const segments = cleanPathname.split('/').filter(Boolean);
    const widgetIndex = segments.lastIndexOf('widget');
    const tab = widgetIndex >= 0 ? segments[widgetIndex + 1] : undefined;
    if (!tab) return null;

    const decodedTab = decodeRouteSegment(tab);
    return isAnswerlatticeWidgetTab(decodedTab) ? decodedTab : null;
}

export const ANSWERLATTICE_TEAM_TABS = {
    MEMBERS: 'members',
    ROLES: 'roles',
} as const;

export const ANSWERLATTICE_DEFAULT_TEAM_TAB = ANSWERLATTICE_TEAM_TABS.MEMBERS;

const ANSWERLATTICE_TEAM_TAB_VALUES = Object.values(ANSWERLATTICE_TEAM_TABS);

export function isAnswerlatticeTeamTab(tab: string | null | undefined): tab is typeof ANSWERLATTICE_TEAM_TAB_VALUES[number] {
    return Boolean(tab && ANSWERLATTICE_TEAM_TAB_VALUES.includes(tab as typeof ANSWERLATTICE_TEAM_TAB_VALUES[number]));
}

export function getAnswerlatticeTeamRoute(tab: string) {
    const normalizedTab = isAnswerlatticeTeamTab(tab) ? tab : ANSWERLATTICE_DEFAULT_TEAM_TAB;
    return `${ANSWERLATTICE_ROUTES.TEAM}/${encodeURIComponent(normalizedTab)}`;
}

export function getAnswerlatticeTeamTabFromPathname(pathname: string) {
    const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '';
    const segments = cleanPathname.split('/').filter(Boolean);
    const teamIndex = segments.lastIndexOf('team');
    const tab = teamIndex >= 0 ? segments[teamIndex + 1] : undefined;
    if (!tab) return null;

    const decodedTab = decodeRouteSegment(tab);
    return isAnswerlatticeTeamTab(decodedTab) ? decodedTab : null;
}

// ═══════════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════════════

export interface AnswerlatticeNavItem {
    key: string;
    label: string;
    route: string;
    icon: IconType;
    group?: string;
    platformOnly?: boolean;
    managementOnly?: boolean;
    requiredPermission?: AnswerlatticePermissionKey;
    /** Optional feature flag key — if set, nav item is hidden when flag is OFF */
    featureFlag?: string;
    /** Kept out of primary navigation and exposed through an explicit advanced-tools menu. */
    advanced?: boolean;
    subNav?: AnswerlatticeNavItem[];
}

export interface AnswerlatticePrimarySidebarItem {
    route: string;
    label?: string;
    icon?: IconType;
}

export interface AnswerlatticePrimarySidebarSection {
    key: string;
    label: string;
    items: AnswerlatticePrimarySidebarItem[];
}

export const ANSWERLATTICE_LAUNCH_SETUP_SUB_NAV: AnswerlatticeNavItem[] = [
    { key: 'launch-activation', label: 'Activation', route: ANSWERLATTICE_ROUTES.ACTIVATION, icon: LuRocket, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS, featureFlag: 'ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER' },
    { key: 'launch-first-answers', label: 'First 10 Answers', route: ANSWERLATTICE_ROUTES.LAUNCH_ANSWERS, icon: LuClipboardCheck, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_ANSWER_TESTS' },
    { key: 'launch-install-center', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.install.installSupport, route: ANSWERLATTICE_ROUTES.INSTALL_CENTER, icon: LuCode, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET, featureFlag: 'ENABLE_ANSWERLATTICE_AGENT_INSTALL' },
    { key: 'launch-settings', label: 'Product Details', route: ANSWERLATTICE_ROUTES.SETTINGS, icon: LuSettings, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WORKSPACE, advanced: true },
    { key: 'launch-knowledge-intake', label: 'Teach Answerlattice', route: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE, icon: LuFileInput, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE', advanced: true },
    { key: 'launch-product-surfaces', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productPagesAndFlows, route: ANSWERLATTICE_ROUTES.PRODUCT_SURFACES, icon: LuLayers, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_ANSWERLATTICE_PRODUCT_SURFACES', advanced: true },
    { key: 'launch-readiness', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.setupStatus, route: ANSWERLATTICE_ROUTES.DASHBOARD, icon: LuLayoutDashboard, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS },
];

export const ANSWERLATTICE_SUPPORT_CONTROL_SUB_NAV: AnswerlatticeNavItem[] = [
    { key: 'support-assistant', label: 'Daily Brief', route: ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT, icon: LuListChecks, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT, featureFlag: 'ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT' },
    { key: 'support-board', label: 'Support Board', route: ANSWERLATTICE_ROUTES.SUPPORT_BOARD, icon: LuKanbanSquare, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT, featureFlag: 'ENABLE_ANSWERLATTICE_SUPPORT_BOARD', advanced: true },
    { key: 'support-tickets', label: 'Ticket Inbox', route: ANSWERLATTICE_ROUTES.TICKETS, icon: LuTicket, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT },
    { key: 'support-conversations', label: 'Conversations', route: ANSWERLATTICE_ROUTES.CONVERSATIONS, icon: LuMessageSquare, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT, advanced: true },
    { key: 'support-feedback', label: 'Feedback', route: ANSWERLATTICE_ROUTES.FEEDBACK, icon: LuHeart, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT, featureFlag: 'ENABLE_ANSWERLATTICE_FEEDBACK_REVIEW', advanced: true },
    { key: 'support-weekly-digest', label: 'Weekly Digest', route: ANSWERLATTICE_ROUTES.WEEKLY_DIGEST, icon: LuMailCheck, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS, featureFlag: 'ENABLE_ANSWERLATTICE_WEEKLY_DIGEST', advanced: true },
    { key: 'support-workflow-notifications', label: 'Workflow Notifications', route: ANSWERLATTICE_ROUTES.WORKFLOW_NOTIFICATIONS, icon: LuBell, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS, featureFlag: 'ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS', advanced: true },
    { key: 'support-public-api', label: 'Public API', route: ANSWERLATTICE_ROUTES.PUBLIC_API, icon: LuKeyRound, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS, featureFlag: 'ENABLE_ANSWERLATTICE_PUBLIC_API', advanced: true },
    { key: 'support-knowledge-base', label: 'Knowledge Base', route: ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE, icon: LuBookOpen, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE, advanced: true },
    { key: 'support-faqs', label: 'FAQs', route: ANSWERLATTICE_ROUTES.FAQS, icon: LuHelpCircle, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE, featureFlag: 'ENABLE_ANSWERLATTICE_FAQ_MANAGEMENT', advanced: true },
    { key: 'support-changelog', label: 'Changelog', route: ANSWERLATTICE_ROUTES.CHANGELOG, icon: LuReceipt, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE, advanced: true },
    { key: 'support-known-issues', label: 'Known Issues', route: ANSWERLATTICE_ROUTES.KNOWN_ISSUES, icon: LuAlertCircle, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_KNOWN_ISSUES', advanced: true },
];

export const ANSWERLATTICE_WIDGET_SUB_NAV: AnswerlatticeNavItem[] = [
    { key: 'widget-ui', label: 'UI Configuration', route: getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.UI), icon: LuPaintbrush, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'widget-install', label: 'Install & Embed', route: getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.INSTALL), icon: LuCode, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'widget-hosted-help', label: 'Hosted Help', route: getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.HOSTED_HELP), icon: LuGlobe, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET },
    { key: 'widget-access', label: 'Access & Security', route: getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.ACCESS), icon: LuShield, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET },
];

export const ANSWERLATTICE_TEAM_SUB_NAV: AnswerlatticeNavItem[] = [
    { key: 'team-members', label: 'Members', route: getAnswerlatticeTeamRoute(ANSWERLATTICE_TEAM_TABS.MEMBERS), icon: LuUsers, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_ANSWERLATTICE_STAFF_ACCESS' },
    { key: 'team-roles', label: 'Roles & Permissions', route: getAnswerlatticeTeamRoute(ANSWERLATTICE_TEAM_TABS.ROLES), icon: LuShieldCheck, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_ANSWERLATTICE_STAFF_ACCESS' },
];

export const ANSWERLATTICE_BILLING_SUB_NAV: AnswerlatticeNavItem[] = [
    { key: 'billing-subscription', label: 'Subscription', route: ANSWERLATTICE_ROUTES.BILLING, icon: LuCreditCard, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING },
    { key: 'billing-transactions', label: 'Transactions', route: ANSWERLATTICE_ROUTES.TRANSACTIONS, icon: LuReceipt, managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING },
];

export const ANSWERLATTICE_GOVERNANCE_SUB_NAV: AnswerlatticeNavItem[] = [
    { key: 'governance-answer-tests', label: 'Answer Tests', route: ANSWERLATTICE_ROUTES.ANSWER_TESTS, icon: LuClipboardCheck, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_ANSWER_TESTS', advanced: true },
    { key: 'governance-answers', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.trustedAnswers, route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS), icon: LuBookOpen, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE },
    { key: 'governance-entities', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.productTopics, route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ENTITIES), icon: LuBoxes, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, advanced: true },
    { key: 'governance-map', label: 'Knowledge Map', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.MAP), icon: LuGitBranch, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP', advanced: true },
    { key: 'governance-analytics', label: 'Answer Analytics', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANALYTICS), icon: LuBarChart3, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, advanced: true },
    { key: 'governance-health', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.topicCoverage, route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.HEALTH), icon: LuHeart, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, advanced: true },
    { key: 'governance-history', label: 'Version History', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.HISTORY), icon: LuHistory, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, advanced: true },
    { key: 'governance-candidates', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.suggestedTopics, route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.CANDIDATES), icon: LuGitPullRequest, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_ONTOLOGY', advanced: true },
    { key: 'governance-drift', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.answersToRecheck, route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.DRIFT), icon: LuShieldAlert, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_DRIFT_DETECTION', advanced: true },
    { key: 'governance-signal-queue', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.knowledge.suggestedUpdates, route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE), icon: LuGitPullRequest, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_SIGNAL_MUTATION', advanced: true },
    { key: 'governance-trust', label: 'Trust Metrics', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.TRUST), icon: LuShieldCheck, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_TRUST_METRICS', advanced: true },
    { key: 'governance-branding', label: 'Branding', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.BRANDING), icon: LuPaintbrush, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_WHITE_LABEL', advanced: true },
    { key: 'governance-friction', label: 'Friction', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.FRICTION), icon: LuFlame, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE', advanced: true },
    { key: 'governance-languages', label: 'Languages', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.LANGUAGES), icon: LuLanguages, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_MULTI_LANGUAGE', advanced: true },
    { key: 'governance-triggers', label: 'Predictive Triggers', route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.TRIGGERS), icon: LuZap, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT', advanced: true },
];

export const ANSWERLATTICE_SIDEBAR_NAV: AnswerlatticeNavItem[] = [
    { key: 'launch', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.getLive, route: ANSWERLATTICE_ROUTES.ACTIVATION, icon: LuRocket, group: 'launch', managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS, subNav: ANSWERLATTICE_LAUNCH_SETUP_SUB_NAV },
    { key: 'support', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.runSupport, route: ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT, icon: LuMessageSquare, group: 'support', managementOnly: true, subNav: ANSWERLATTICE_SUPPORT_CONTROL_SUB_NAV },
    { key: 'widget', label: 'Widget & Hosted Help', route: ANSWERLATTICE_ROUTES.WIDGET, icon: LuCode, group: 'widget', managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET, subNav: ANSWERLATTICE_WIDGET_SUB_NAV },
    { key: 'team', label: 'Team & Access', route: ANSWERLATTICE_ROUTES.TEAM, icon: LuUsers, group: 'team', managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM, featureFlag: 'ENABLE_ANSWERLATTICE_STAFF_ACCESS', subNav: ANSWERLATTICE_TEAM_SUB_NAV },
    { key: 'billing', label: 'Billing', route: ANSWERLATTICE_ROUTES.BILLING, icon: LuCreditCard, group: 'billing', managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING, subNav: ANSWERLATTICE_BILLING_SUB_NAV },
    { key: 'governance', label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.answerQuality, route: ANSWERLATTICE_ROUTES.GOVERNANCE, icon: LuShield, group: 'governance', managementOnly: true, requiredPermission: ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE, featureFlag: 'ENABLE_ANSWERLATTICE_GOVERNANCE_UI', subNav: ANSWERLATTICE_GOVERNANCE_SUB_NAV },
];

/**
 * Founder-first navigation projection.
 *
 * The complete permission-filtered registry above remains authoritative. This
 * projection controls only the always-visible grouped sidebar presentation;
 * every other authorized route remains available through All tools.
 */
export const ANSWERLATTICE_PRIMARY_SIDEBAR_SECTIONS: AnswerlatticePrimarySidebarSection[] = [
    {
        key: 'get-live',
        label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.getLive,
        items: [
            { route: ANSWERLATTICE_ROUTES.ACTIVATION },
            { route: ANSWERLATTICE_ROUTES.LAUNCH_ANSWERS },
            { route: ANSWERLATTICE_ROUTES.INSTALL_CENTER },
            { route: ANSWERLATTICE_ROUTES.DASHBOARD },
        ],
    },
    {
        key: 'improve-answers',
        label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.improveAnswers,
        items: [
            { route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS) },
            { route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.SIGNAL_QUEUE) },
            { route: getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.DRIFT) },
        ],
    },
    {
        key: 'run-support',
        label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.runSupport,
        items: [
            { route: ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT },
            { route: ANSWERLATTICE_ROUTES.SUPPORT_BOARD },
            { route: ANSWERLATTICE_ROUTES.TICKETS },
        ],
    },
    {
        key: 'customer-help',
        label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.customerHelp,
        items: [
            {
                route: getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.UI),
                label: 'Widget & Hosted Help',
                icon: LuCode,
            },
        ],
    },
    {
        key: 'workspace',
        label: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.workspace,
        items: [
            {
                route: getAnswerlatticeTeamRoute(ANSWERLATTICE_TEAM_TABS.MEMBERS),
                label: 'Team & Access',
                icon: LuUsers,
            },
            {
                route: ANSWERLATTICE_ROUTES.BILLING,
                label: 'Billing',
                icon: LuCreditCard,
            },
        ],
    },
];

// Group labels for sidebar section dividers
export const ANSWERLATTICE_NAV_GROUPS: Record<string, string> = {
    launch: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.getLive,
    support: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.runSupport,
    widget: 'Widget & Hosted Help',
    team: 'Team & Access',
    billing: 'Billing',
    governance: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.answerQuality,
};

export const ANSWERLATTICE_FLAT_SIDEBAR_NAV = ANSWERLATTICE_SIDEBAR_NAV.flatMap((nav) => [nav, ...(nav.subNav || [])]);

export const ANSWERLATTICE_MANAGEMENT_ROUTES = ANSWERLATTICE_SIDEBAR_NAV
    .flatMap((nav) => [nav, ...(nav.subNav || [])])
    .filter((nav) => nav.managementOnly || nav.platformOnly || Boolean(nav.requiredPermission))
    .map((nav) => nav.route);

export const ANSWERLATTICE_ADMIN_ROUTES = ANSWERLATTICE_MANAGEMENT_ROUTES;

// All Answerlattice routes as array (for SKIP_CLIENT_APP_LAYOUT_ROUTINGS detection)
export const ALL_ANSWERLATTICE_ROUTES = Object.values(ANSWERLATTICE_ROUTES);
