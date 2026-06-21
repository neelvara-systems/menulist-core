import {
    DEPLOYMENT_TARGETS,
    getActiveProductDomains,
    getProductDeploymentTarget,
} from '@constant/deploymentTargets';

export const CONSTANTLAYER_SITE_INTERNAL_BASE_PATH = '/sites/constantlayer';
export const CONSTANTLAYER_LOCAL_DEV_PATH_PREFIX = getProductDeploymentTarget('constantlayer', 'local').devPathPrefix;

export const CONSTANTLAYER_STAGING_DOMAINS = DEPLOYMENT_TARGETS.preview.constantlayer.domains;
export const CONSTANTLAYER_PRODUCTION_DOMAINS = DEPLOYMENT_TARGETS.production.constantlayer.domains;
export const CONSTANTLAYER_PRODUCT_DOMAINS = [
    ...CONSTANTLAYER_STAGING_DOMAINS,
    ...CONSTANTLAYER_PRODUCTION_DOMAINS,
] as const;
export const ACTIVE_CONSTANTLAYER_PRODUCT_DOMAINS = getActiveProductDomains('constantlayer');

const ACTIVE_CONSTANTLAYER_PRODUCT_DOMAIN_SET = new Set<string>(ACTIVE_CONSTANTLAYER_PRODUCT_DOMAINS);

export function isConstantLayerProductHostname(hostname?: string | null): boolean {
    return Boolean(hostname && ACTIVE_CONSTANTLAYER_PRODUCT_DOMAIN_SET.has(hostname.split(':')[0].toLowerCase()));
}
