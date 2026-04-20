/**
 * Slugify Utility
 * 
 * Converts project names to URL-safe slugs.
 * Used for path-based routing: joespizza.menulist.ai/food-menu
 */

import { FEATURE_FLAGS } from '@config/features';
import { appendPublicPath, getTenantBaseUrl } from '@constant/urls';

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
 * Generate a share URL for a project.
 *
 * Link-emitter audit (§9 R5 PUBLIC-ROUTING-DOCTRINE): when `projectName` is
 * provided, the returned URL is always the project's **real canonical slug
 * URL** — e.g., `/food-menu`, `/services`, `/carta`. This holds even for the
 * default project, because under R5 the canonical URL of every project is
 * its real slug (never the `/menu` alias).
 *
 * Callers that explicitly want the `/menu` alias URL (voice prompts,
 * "easy-to-type" signage) should call `generateMenuUrl` from
 * `@lib/obp/generateOBPUrl` directly — using the alias is an intentional
 * product choice, not a fallback.
 *
 * When `projectName` is not provided, returns:
 *   - under OBP: the `/menu` alias (Layer 2 of the resolver serves the
 *     default project for that URL, so the link always works)
 *   - without OBP: the tenant root URL
 *
 * @param subdomain - Store subdomain (e.g., "joespizza")
 * @param customDomain - Store custom domain (e.g., "joespizza.com")
 * @param projectName - Project name; slugified to build the canonical URL
 * @param isDefault - Retained for non-OBP mode only; ignored under OBP since
 *                    the default project's URL is its real slug, not root
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
        // T3-N-01 / R5 PUBLIC-ROUTING-DOCTRINE: `generateProjectUrl` without
        // tenant context is an invariant violation. Previously this branch
        // silently emitted `/menu/{slug}` or `/menu`, both of which are R5
        // prohibited (no URL in the product may take the `/menu/{slug}`
        // shape, and `/menu` without a tenant has no resolver). Every
        // call site in the codebase supplies tenant context today; if a
        // new path ever loses it, fail loudly rather than produce a
        // doctrine-violating URL.
        throw new Error(
            '[generateProjectUrl] tenant context required — ' +
            'subdomain or customDomain must be supplied (R5 invariant).',
        );
    }

    const slug = projectName ? slugify(projectName) : '';

    if (!slug) {
        // No project name supplied: fall back to the `/menu` alias under
        // OBP (Layer 2 resolves), or the tenant root without OBP.
        return FEATURE_FLAGS.ENABLE_OBP ? appendPublicPath(baseUrl, 'menu') : baseUrl;
    }

    // Under OBP, every project — including the default — lives at its real
    // canonical slug URL. `isDefault` is retained only for non-OBP mode,
    // where the default project may still live at the tenant root.
    if (!FEATURE_FLAGS.ENABLE_OBP && isDefault) {
        return baseUrl;
    }

    return appendPublicPath(baseUrl, slug);
}
