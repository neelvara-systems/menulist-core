/**
 * OBP URL Generator
 * 
 * Generates the official business page URL for a store.
 * Uses the existing subdomain/custom domain system.
 * 
 * @see __docs__/official-business-page/official-business-page_impl.md §10
 * @see src/constants/urls.ts — Single source of truth for platform URLs
 */

import { appendPublicPath, getTenantBaseUrl } from '@constant/urls';
import { normalizePublicOutletSlug } from '@lib/publicRouting/pathSegments';

type ConfiguredOBPStoreAddress = {
    customDomain?: unknown;
    isMaster?: unknown;
    outletSlug?: unknown;
    storeDetails?: unknown;
    subdomain?: unknown;
};

const getConfiguredAddressValue = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

/**
 * Generate the OBP URL for a store
 */
export function generateOBPUrl(
    subdomain?: string,
    customDomain?: string,
): string {
    return getTenantBaseUrl(subdomain, customDomain);
}

/**
 * Generate an owner-shareable OBP URL only after the store has a configured
 * public address. `generateOBPUrl()` intentionally retains its platform-origin
 * fallback for public routing internals; owner distribution controls must not
 * treat that fallback as the store's customer link.
 */
export function generateConfiguredOBPUrl(
    subdomain?: string,
    customDomain?: string,
): string {
    return subdomain?.trim() || customDomain?.trim()
        ? generateOBPUrl(subdomain, customDomain)
        : '';
}

/**
 * Resolve the shareable OBP URL for a selected store.
 *
 * Outlet documents intentionally do not own the tenant host. Their public OBP
 * inherits the active master store's configured host and appends the validated
 * outlet slug. This keeps owner copy/share/QR controls aligned with the public
 * router without adding a store or tenant read.
 */
export function generateConfiguredStoreOBPUrl(
    store?: ConfiguredOBPStoreAddress | null,
    tenantStores?: readonly unknown[] | null,
): string {
    if (!store) return '';

    const directUrl = generateConfiguredOBPUrl(
        getConfiguredAddressValue(store.subdomain),
        getConfiguredAddressValue(store.customDomain),
    );
    if (directUrl) return directUrl;

    const outletSlug = normalizePublicOutletSlug(store.outletSlug);
    if (!outletSlug || !Array.isArray(tenantStores)) return '';

    const masterEntry = tenantStores.find((value) => (
        Boolean(value)
        && typeof value === 'object'
        && (value as ConfiguredOBPStoreAddress).isMaster === true
    )) as ConfiguredOBPStoreAddress | undefined;
    const nestedMaster = masterEntry?.storeDetails;
    const masterStore = nestedMaster && typeof nestedMaster === 'object'
        ? nestedMaster as ConfiguredOBPStoreAddress
        : masterEntry;
    const masterUrl = generateConfiguredOBPUrl(
        getConfiguredAddressValue(masterStore?.subdomain),
        getConfiguredAddressValue(masterStore?.customDomain),
    );

    return masterUrl ? appendPublicPath(masterUrl, outletSlug) : '';
}

/**
 * Generate the /menu alias URL.
 *
 * G-05 / R5 (§9 PUBLIC-ROUTING-DOCTRINE): `/menu` is now a two-layer path.
 * This helper remains as a narrow utility for contexts that intentionally
 * want the alias URL — voice prompts, "easy URL for signage" hints in the
 * dashboard, and fallback for emitters that don't yet know the real slug.
 *
 * For INTERNAL emitters (OBP CTA, share links, analytics), prefer
 * `getDefaultProjectUrl(subdomain, customDomain, defaultSlug)` so emitted
 * links point at the canonical per-project URL (e.g., `/food-menu`) rather
 * than the Layer 2 alias.
 */
export function generateMenuUrl(
    subdomain?: string,
    customDomain?: string,
): string {
    const base = generateOBPUrl(subdomain, customDomain);
    return base ? appendPublicPath(base, 'menu') : '/menu';
}

/**
 * Generate the canonical URL for the store's default project.
 *
 * G-05 / R5 (§9 PUBLIC-ROUTING-DOCTRINE) sub-change 3: OBP's "View Menu" CTA
 * must link to the default project's REAL canonical slug URL — never the
 * `/menu` alias — so that customer navigation consistently uses canonical
 * URLs and Google indexes one URL per project.
 *
 * When `defaultSlug` is provided, returns `{tenantBaseUrl}/{defaultSlug}`.
 * When it is not (no published default project), falls back to the `/menu`
 * alias URL — Layer 2 of the R5 resolver handles that case gracefully.
 */
export function getDefaultProjectUrl(
    subdomain?: string,
    customDomain?: string,
    defaultSlug?: string,
): string {
    const base = generateOBPUrl(subdomain, customDomain);
    if (!defaultSlug) {
        return base ? appendPublicPath(base, 'menu') : '/menu';
    }
    return base ? appendPublicPath(base, defaultSlug) : `/${defaultSlug}`;
}
