const SUBDOMAIN_AVAILABILITY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;
const CUSTOM_DOMAIN_AVAILABILITY_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export function isLocalCustomDomainFixture(value: unknown, nodeEnv = process.env.NODE_ENV): value is string {
    if (nodeEnv === 'production' || typeof value !== 'string') return false;
    const hostname = value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]?.split(':')[0] || '';
    return hostname === 'localhost' || hostname.endsWith('.localhost');
}

export function normalizeSubdomainAvailabilityCandidate(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return SUBDOMAIN_AVAILABILITY_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeCustomDomainAvailabilityCandidate(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return normalized.length <= 253
        && CUSTOM_DOMAIN_AVAILABILITY_PATTERN.test(normalized)
        && normalized.split('.').every((label) => label.length <= 63)
        ? normalized
        : null;
}
