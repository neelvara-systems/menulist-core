import {
    MENULIST_TENANT_BASE_DOMAINS,
    PLATFORM_DOMAIN,
    PLATFORM_DOMAIN_ALIASES,
} from '@constant/urls';

function normalizeHostname(value: string): string {
    return value.trim().toLowerCase().replace(/\.$/, '');
}

export function isPublicCreateMenuSuccessHostname(hostname: unknown): boolean {
    if (typeof hostname !== 'string') return false;
    const normalizedHostname = normalizeHostname(hostname);
    if (!normalizedHostname) return false;

    const trustedPlatformHosts = [PLATFORM_DOMAIN, ...PLATFORM_DOMAIN_ALIASES]
        .map(normalizeHostname)
        .filter(Boolean);
    if (trustedPlatformHosts.includes(normalizedHostname)) return true;

    return MENULIST_TENANT_BASE_DOMAINS
        .map(normalizeHostname)
        .filter(Boolean)
        .some((tenantBaseDomain) =>
            normalizedHostname === tenantBaseDomain
            || normalizedHostname.endsWith(`.${tenantBaseDomain}`)
        );
}
