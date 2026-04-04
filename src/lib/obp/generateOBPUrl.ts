/**
 * OBP URL Generator
 * 
 * Generates the official business page URL for a store.
 * Uses the existing subdomain/custom domain system.
 * 
 * @see __docs__/official-business-page/official-business-page_impl.md §10
 * @see src/constants/urls.ts — Single source of truth for platform URLs
 */

import { getMenuUrl, normalizeBaseUrl } from '@constant/urls';

/**
 * Generate the OBP URL for a store
 */
export function generateOBPUrl(
    subdomain?: string,
    customDomain?: string,
): string {
    if (customDomain) {
        return normalizeBaseUrl(customDomain);
    }
    if (subdomain) {
        return getMenuUrl(subdomain);
    }
    return '';
}

/**
 * Generate the menu URL (used for "View Menu" CTA on OBP page)
 */
export function generateMenuUrl(
    subdomain?: string,
    customDomain?: string,
): string {
    const base = generateOBPUrl(subdomain, customDomain);
    return base ? `${base}/menu` : '/menu';
}
