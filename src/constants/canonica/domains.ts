/**
 * Canonica product-domain constants.
 *
 * Keep hostnames and clean dashboard path mapping here so MenuList domain
 * routing does not accumulate Canonica-specific static values.
 */

export const CANONICA_STAGING_DOMAINS = [
    'ecomsai.com',
    'www.ecomsai.com',
] as const;

export const CANONICA_PRODUCTION_DOMAINS = [
    'canonica.app',
    'www.canonica.app',
] as const;

export const CANONICA_PRODUCT_DOMAINS = [
    ...CANONICA_STAGING_DOMAINS,
    ...CANONICA_PRODUCTION_DOMAINS,
] as const;

export const CANONICA_DASHBOARD_ROUTE_ROOTS = [
    'activation',
    'changelog',
    'conversations',
    'dashboard',
    'docs',
    'governance',
    'help',
    'kb-generation',
    'knowledge-base',
    'product-surfaces',
    'release-notes',
    'settings',
    'support',
    'tickets',
    'widget',
] as const;

export const CANONICA_PRODUCT_PASSTHROUGH_PATHS = [
    '/api',
    '/signin',
    '/unauthorized',
] as const;

const CANONICA_PRODUCT_DOMAIN_SET = new Set<string>(CANONICA_PRODUCT_DOMAINS);
const CANONICA_DASHBOARD_ROUTE_ROOT_SET = new Set<string>(CANONICA_DASHBOARD_ROUTE_ROOTS);

export function isCanonicaProductHostname(hostname?: string | null) {
    return Boolean(hostname && CANONICA_PRODUCT_DOMAIN_SET.has(hostname.split(':')[0].toLowerCase()));
}

export function getCanonicaDashboardRewritePath(pathname: string): string | null {
    const normalizedPathname = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const firstSegment = normalizedPathname.split('/').filter(Boolean)[0];

    if (!firstSegment || !CANONICA_DASHBOARD_ROUTE_ROOT_SET.has(firstSegment)) {
        return null;
    }

    return `/canonica${normalizedPathname}`;
}
