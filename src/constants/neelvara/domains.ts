import {
    DEPLOYMENT_TARGETS,
    getActiveProductDomains,
    getProductDeploymentTarget,
} from '@constant/deploymentTargets';
import { normalizeRequestAuthority } from '@lib/routing/hostAuthority';

export const NEELVARA_SITE_INTERNAL_BASE_PATH = '/sites/neelvara';
export const NEELVARA_LOCAL_DEV_PATH_PREFIX = getProductDeploymentTarget('neelvara', 'local').devPathPrefix;

export const NEELVARA_STAGING_DOMAINS = DEPLOYMENT_TARGETS.preview.neelvara.domains;
export const NEELVARA_PRODUCTION_DOMAINS = DEPLOYMENT_TARGETS.production.neelvara.domains;
export const NEELVARA_PRODUCT_DOMAINS = [
    ...NEELVARA_STAGING_DOMAINS,
    ...NEELVARA_PRODUCTION_DOMAINS,
] as const;
export const ACTIVE_NEELVARA_PRODUCT_DOMAINS = getActiveProductDomains('neelvara');

const ACTIVE_NEELVARA_PRODUCT_DOMAIN_SET = new Set<string>(ACTIVE_NEELVARA_PRODUCT_DOMAINS);

export function isNeelvaraProductHostname(hostname?: string | null): boolean {
    const normalizedHost = normalizeRequestAuthority(hostname)?.hostname;
    return Boolean(normalizedHost && ACTIVE_NEELVARA_PRODUCT_DOMAIN_SET.has(normalizedHost));
}
