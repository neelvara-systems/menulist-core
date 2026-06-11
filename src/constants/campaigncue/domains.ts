import {
    DEPLOYMENT_TARGETS,
    getActiveProductDomains,
    getProductDeploymentTarget,
} from "@constant/deploymentTargets";

// Public website files live under /sites/campaigncue. Owner workspace files
// live under /campaigncue so CampaignCue follows the Answerlattice separation
// between public site routes and authenticated product app routes.
export const CAMPAIGNCUE_SITE_INTERNAL_BASE_PATH = "/sites/campaigncue";
export const CAMPAIGNCUE_WORKSPACE_PATH = "/app";
export const CAMPAIGNCUE_APP_INTERNAL_BASE_PATH = "/campaigncue";
export const CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH = `${CAMPAIGNCUE_APP_INTERNAL_BASE_PATH}${CAMPAIGNCUE_WORKSPACE_PATH}`;
export const CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX = getProductDeploymentTarget("campaigncue", "local").devPathPrefix;
export const CAMPAIGNCUE_LOCAL_WORKSPACE_PATH = `${CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX}${CAMPAIGNCUE_WORKSPACE_PATH}`;

export const CAMPAIGNCUE_STAGING_DOMAINS = DEPLOYMENT_TARGETS.preview.campaigncue.domains;
export const CAMPAIGNCUE_PRODUCTION_DOMAINS = DEPLOYMENT_TARGETS.production.campaigncue.domains;
export const CAMPAIGNCUE_PRODUCT_DOMAINS = [
    ...CAMPAIGNCUE_STAGING_DOMAINS,
    ...CAMPAIGNCUE_PRODUCTION_DOMAINS,
] as const;
export const ACTIVE_CAMPAIGNCUE_PRODUCT_DOMAINS = getActiveProductDomains("campaigncue");

const ACTIVE_CAMPAIGNCUE_PRODUCT_DOMAIN_SET = new Set<string>(ACTIVE_CAMPAIGNCUE_PRODUCT_DOMAINS);

const normalizePathname = (pathname?: string | null): string => (
    pathname === "/" ? "/" : String(pathname || "").replace(/\/+$/, "")
);

export function isCampaignCueProductHostname(hostname?: string | null): boolean {
    return Boolean(hostname && ACTIVE_CAMPAIGNCUE_PRODUCT_DOMAIN_SET.has(hostname.split(":")[0].toLowerCase()));
}

export function isCampaignCueRuntimeRoute(pathname?: string | null, hostname?: string | null): boolean {
    const normalizedPath = normalizePathname(pathname);
    return normalizedPath === CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX
        || normalizedPath.startsWith(`${CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX}/`)
        || normalizedPath === CAMPAIGNCUE_SITE_INTERNAL_BASE_PATH
        || normalizedPath.startsWith(`${CAMPAIGNCUE_SITE_INTERNAL_BASE_PATH}/`)
        || normalizedPath === CAMPAIGNCUE_APP_INTERNAL_BASE_PATH
        || normalizedPath.startsWith(`${CAMPAIGNCUE_APP_INTERNAL_BASE_PATH}/`)
        || isCampaignCueProductHostname(hostname);
}

export function getCampaignCueWorkspaceRewritePath(pathname: string): string | null {
    const normalizedPathname = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    if (normalizedPathname !== CAMPAIGNCUE_WORKSPACE_PATH) return null;

    return CAMPAIGNCUE_APP_INTERNAL_WORKSPACE_PATH;
}
