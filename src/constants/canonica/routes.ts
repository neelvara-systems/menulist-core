import { isCanonicaProductHostname } from './domains';

export const CANONICA_BASE_PATH = '/canonica';

export const CANONICA_ROUTES = {
    HELP: `${CANONICA_BASE_PATH}/help`,
    DOCS: `${CANONICA_BASE_PATH}/docs`,
    SUPPORT: `${CANONICA_BASE_PATH}/support`,
    RELEASE_NOTES: `${CANONICA_BASE_PATH}/release-notes`,
    ACTIVATION: `${CANONICA_BASE_PATH}/activation`,
    DASHBOARD: `${CANONICA_BASE_PATH}/dashboard`,
    KNOWLEDGE_BASE: `${CANONICA_BASE_PATH}/knowledge-base`,
    KB_GENERATION: `${CANONICA_BASE_PATH}/kb-generation`,
    TICKETS: `${CANONICA_BASE_PATH}/tickets`,
    CONVERSATIONS: `${CANONICA_BASE_PATH}/conversations`,
    GOVERNANCE: `${CANONICA_BASE_PATH}/governance`,
    CHANGELOG: `${CANONICA_BASE_PATH}/changelog`,
    FAQS: `${CANONICA_BASE_PATH}/faqs`,
    PRODUCT_SURFACES: `${CANONICA_BASE_PATH}/product-surfaces`,
    WIDGET: `${CANONICA_BASE_PATH}/widget`,
    WEEKLY_DIGEST: `${CANONICA_BASE_PATH}/weekly-digest`,
    BILLING: `${CANONICA_BASE_PATH}/billing`,
    TRANSACTIONS: `${CANONICA_BASE_PATH}/transactions`,
    SETTINGS: `${CANONICA_BASE_PATH}/settings`,
    TEAM: `${CANONICA_BASE_PATH}/team`,
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
