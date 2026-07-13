import { isMenuListPublicEntityEligible } from '@lib/publicTruth/entityEligibility';

/**
 * Shared admission for MenuList entities that may back an external pull API
 * credential or response. Missing lifecycle fields remain compatible with
 * legacy active documents; explicit inactive/deleted/blocked state fails.
 */
export function isMenuListPublicApiEntityEligible(value: unknown): boolean {
    return isMenuListPublicEntityEligible(value);
}
