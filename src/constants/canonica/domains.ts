/**
 * Canonica product-domain constants.
 *
 * Keep hostnames and clean dashboard path mapping here so MenuList domain
 * routing does not accumulate Canonica-specific static values.
 */

import {
    DEPLOYMENT_TARGETS,
    getActiveProductDomains,
    getProductDeploymentTarget,
} from '@constant/deploymentTargets';

export const CANONICA_LOCAL_DEV_PATH_PREFIX = getProductDeploymentTarget('canonica', 'local').devPathPrefix;

export const CANONICA_STAGING_DOMAINS = DEPLOYMENT_TARGETS.preview.canonica.domains;

export const CANONICA_PRODUCTION_DOMAINS = DEPLOYMENT_TARGETS.production.canonica.domains;

export const CANONICA_PRODUCT_DOMAINS = [
    ...CANONICA_STAGING_DOMAINS,
    ...CANONICA_PRODUCTION_DOMAINS,
] as const;

export const ACTIVE_CANONICA_PRODUCT_DOMAINS = getActiveProductDomains('canonica');

export const CANONICA_DASHBOARD_ROUTE_ROOTS = [
    'activation',
    'billing',
    'changelog',
    'conversations',
    'dashboard',
    'docs',
    'faqs',
    'governance',
    'help',
    'install-center',
    'kb-generation',
    'knowledge-base',
    'product-surfaces',
    'release-notes',
    'settings',
    'support',
    'support-board',
    'team',
    'tickets',
    'transactions',
    'widget',
    'weekly-digest',
] as const;

export const CANONICA_PRODUCT_PASSTHROUGH_PATHS = [
    '/api',
    '/signin',
    '/unauthorized',
] as const;

const ACTIVE_CANONICA_PRODUCT_DOMAIN_SET = new Set<string>(ACTIVE_CANONICA_PRODUCT_DOMAINS);
const CANONICA_DASHBOARD_ROUTE_ROOT_SET = new Set<string>(CANONICA_DASHBOARD_ROUTE_ROOTS);

export function isCanonicaProductHostname(hostname?: string | null) {
    return Boolean(hostname && ACTIVE_CANONICA_PRODUCT_DOMAIN_SET.has(hostname.split(':')[0].toLowerCase()));
}

export function getCanonicaDashboardRewritePath(pathname: string): string | null {
    const normalizedPathname = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const firstSegment = normalizedPathname.split('/').filter(Boolean)[0];

    if (!firstSegment || !CANONICA_DASHBOARD_ROUTE_ROOT_SET.has(firstSegment)) {
        return null;
    }

    return `/canonica${normalizedPathname}`;
}
