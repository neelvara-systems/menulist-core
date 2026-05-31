/**
 * Answerlattice product-domain constants.
 *
 * Keep hostnames and clean dashboard path mapping here so MenuList domain
 * routing does not accumulate Answerlattice-specific static values.
 */

import {
    DEPLOYMENT_TARGETS,
    getActiveProductDomains,
    getProductDeploymentTarget,
} from '@constant/deploymentTargets';

export const ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX = getProductDeploymentTarget('answerlattice', 'local').devPathPrefix;

export const ANSWERLATTICE_STAGING_DOMAINS = DEPLOYMENT_TARGETS.preview.answerlattice.domains;

export const ANSWERLATTICE_PRODUCTION_DOMAINS = DEPLOYMENT_TARGETS.production.answerlattice.domains;

export const ANSWERLATTICE_PRODUCT_DOMAINS = [
    ...ANSWERLATTICE_STAGING_DOMAINS,
    ...ANSWERLATTICE_PRODUCTION_DOMAINS,
] as const;

export const ACTIVE_ANSWERLATTICE_PRODUCT_DOMAINS = getActiveProductDomains('answerlattice');

export const ANSWERLATTICE_DASHBOARD_ROUTE_ROOTS = [
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

export const ANSWERLATTICE_PRODUCT_PASSTHROUGH_PATHS = [
    '/api',
    '/signin',
    '/unauthorized',
] as const;

const ACTIVE_ANSWERLATTICE_PRODUCT_DOMAIN_SET = new Set<string>(ACTIVE_ANSWERLATTICE_PRODUCT_DOMAINS);
const ANSWERLATTICE_DASHBOARD_ROUTE_ROOT_SET = new Set<string>(ANSWERLATTICE_DASHBOARD_ROUTE_ROOTS);

export function isAnswerlatticeProductHostname(hostname?: string | null) {
    return Boolean(hostname && ACTIVE_ANSWERLATTICE_PRODUCT_DOMAIN_SET.has(hostname.split(':')[0].toLowerCase()));
}

export function getAnswerlatticeDashboardRewritePath(pathname: string): string | null {
    const normalizedPathname = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const firstSegment = normalizedPathname.split('/').filter(Boolean)[0];

    if (!firstSegment || !ANSWERLATTICE_DASHBOARD_ROUTE_ROOT_SET.has(firstSegment)) {
        return null;
    }

    return `/answerlattice${normalizedPathname}`;
}
