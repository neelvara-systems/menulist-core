const CANONICAL_TENANT_DOMAIN_COPY = 'menulist.online';

/**
 * Domain guidance is translated against the canonical production domain.
 * Render it with the active environment's tenant domain so the prose and the
 * adjacent customer link never contradict each other on QA.
 */
export function renderTenantDomainCopy(copy: string, tenantBaseDomain: string): string {
    const normalizedTenantBaseDomain = tenantBaseDomain.trim().toLowerCase();

    if (!normalizedTenantBaseDomain || normalizedTenantBaseDomain === CANONICAL_TENANT_DOMAIN_COPY) {
        return copy;
    }

    return copy.replaceAll(CANONICAL_TENANT_DOMAIN_COPY, normalizedTenantBaseDomain);
}
