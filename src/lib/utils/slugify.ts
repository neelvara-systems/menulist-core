/**
 * Slugify Utility
 * 
 * Converts project names to URL-safe slugs.
 * Used for path-based routing: joespizza.menulist.ai/food-menu
 */

import { FEATURE_FLAGS } from '@config/features';
import { appendPublicPath, getPublicBaseUrl, getTenantBaseUrl } from '@constant/urls';

/**
 * Convert a string to a URL-safe slug
 * @example slugify("Food Menu") → "food-menu"
 * @example slugify("Drinks & Bar") → "drinks-bar"
 * @example slugify("Café Spécial") → "cafe-special"
 */
export function slugify(text: string): string {
    if (!text) return '';

    return text
        .toString()
        .toLowerCase()
        .trim()
        // Replace accented characters with ASCII equivalents
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Remove all non-alphanumeric characters except hyphens
        .replace(/[^a-z0-9-]/g, '')
        // Remove multiple consecutive hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '');
}

/**
 * Check if a slug matches a project name
 * @example slugMatches("food-menu", "Food Menu") → true
 */
export function slugMatches(slug: string, projectName: string): boolean {
    return slugify(projectName) === slug.toLowerCase();
}

/**
 * Generate a share URL for a project
 * @param subdomain - Store subdomain (e.g., "joespizza")
 * @param customDomain - Store custom domain (e.g., "joespizza.com")
 * @param projectName - Project name to slugify
 * @param isDefault - If true, use root URL without slug
 */
export function generateProjectUrl(
    subdomain?: string,
    customDomain?: string,
    projectName?: string,
    isDefault?: boolean
): string {
    // Determine base URL
    let baseUrl: string;
    if (customDomain || subdomain) {
        baseUrl = getTenantBaseUrl(subdomain, customDomain);
    } else {
        const publicBaseUrl = getPublicBaseUrl();
        const slug = projectName ? slugify(projectName) : '';
        return (isDefault || !slug)
            ? appendPublicPath(publicBaseUrl, 'menu')
            : appendPublicPath(publicBaseUrl, `menu/${slug}`);
    }

    // If OBP is enabled, root resolves to OBP and the default menu lives at /menu.
    // Otherwise the root itself is the default menu.
    if (isDefault || !projectName) {
        return FEATURE_FLAGS.ENABLE_OBP ? appendPublicPath(baseUrl, 'menu') : baseUrl;
    }

    // Add slug path
    const slug = slugify(projectName);
    return slug ? appendPublicPath(baseUrl, slug) : baseUrl;
}
