import { isAnswerlatticeProductHostname } from './domains';

export const ANSWERLATTICE_BASE_PATH = '/answerlattice';

export const ANSWERLATTICE_ROUTES = {
    HELP: `${ANSWERLATTICE_BASE_PATH}/help`,
    DOCS: `${ANSWERLATTICE_BASE_PATH}/docs`,
    SUPPORT: `${ANSWERLATTICE_BASE_PATH}/support`,
    RELEASE_NOTES: `${ANSWERLATTICE_BASE_PATH}/release-notes`,
    ACTIVATION: `${ANSWERLATTICE_BASE_PATH}/activation`,
    INSTALL_CENTER: `${ANSWERLATTICE_BASE_PATH}/install-center`,
    DASHBOARD: `${ANSWERLATTICE_BASE_PATH}/dashboard`,
    KNOWLEDGE_BASE: `${ANSWERLATTICE_BASE_PATH}/knowledge-base`,
    KNOWLEDGE_INTAKE: `${ANSWERLATTICE_BASE_PATH}/knowledge-intake`,
    KB_GENERATION: `${ANSWERLATTICE_BASE_PATH}/kb-generation`,
    TICKETS: `${ANSWERLATTICE_BASE_PATH}/tickets`,
    CONVERSATIONS: `${ANSWERLATTICE_BASE_PATH}/conversations`,
    FEEDBACK: `${ANSWERLATTICE_BASE_PATH}/feedback`,
    SUPPORT_BOARD: `${ANSWERLATTICE_BASE_PATH}/support-board`,
    GOVERNANCE: `${ANSWERLATTICE_BASE_PATH}/governance`,
    CHANGELOG: `${ANSWERLATTICE_BASE_PATH}/changelog`,
    FAQS: `${ANSWERLATTICE_BASE_PATH}/faqs`,
    PRODUCT_SURFACES: `${ANSWERLATTICE_BASE_PATH}/product-surfaces`,
    WIDGET: `${ANSWERLATTICE_BASE_PATH}/widget`,
    WEEKLY_DIGEST: `${ANSWERLATTICE_BASE_PATH}/weekly-digest`,
    BILLING: `${ANSWERLATTICE_BASE_PATH}/billing`,
    TRANSACTIONS: `${ANSWERLATTICE_BASE_PATH}/transactions`,
    SETTINGS: `${ANSWERLATTICE_BASE_PATH}/settings`,
    TEAM: `${ANSWERLATTICE_BASE_PATH}/team`,
} as const;

export function toAnswerlatticeDashboardRoute(route: string, hostname?: string | null) {
    if (!isAnswerlatticeProductHostname(hostname) || !route.startsWith(ANSWERLATTICE_BASE_PATH)) {
        return route;
    }

    return route.slice(ANSWERLATTICE_BASE_PATH.length) || '/dashboard';
}

export function normalizeAnswerlatticeRoutePathname(pathname: string) {
    if (pathname === '/' || pathname.startsWith(ANSWERLATTICE_BASE_PATH)) {
        return pathname;
    }

    return `${ANSWERLATTICE_BASE_PATH}${pathname}`;
}
