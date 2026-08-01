import { PLATFORM_DOMAIN } from '@constant/urls';

export function isPublicCreateMenuSuccessHostname(hostname: unknown): boolean {
    if (typeof hostname !== 'string') return false;
    const normalizedHostname = hostname.trim().toLowerCase().replace(/\.$/, '');
    const normalizedPlatformDomain = PLATFORM_DOMAIN.trim()
        .toLowerCase()
        .replace(/\.$/, '');
    if (!normalizedHostname || !normalizedPlatformDomain) return false;

    return normalizedHostname === normalizedPlatformDomain
        || normalizedHostname.endsWith(`.${normalizedPlatformDomain}`);
}
