import { DEFAULT_ROLE_IDS } from '@data/shared/defaultRoles';

export const OWNER_ACCESS_NOT_TRANSFER_COPY = (
    'Owner access gives full operational permissions. It does not transfer the business account, billing records, notification recipients, or existing subscriptions. Contact support for an ownership transfer.'
);

export const OWNERSHIP_TRANSFER_SUPPORT_EMAIL = 'support@menulist.ai';

export function hasOperationalOwnerAccess(
    mappings: Array<{ role?: unknown }> | null | undefined,
): boolean {
    return Boolean(mappings?.some((mapping) => mapping?.role === DEFAULT_ROLE_IDS.OWNER));
}
