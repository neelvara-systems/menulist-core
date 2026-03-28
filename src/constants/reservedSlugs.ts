/**
 * Reserved Slug Namespace
 * 
 * These slugs cannot be used as project names or outlet slugs.
 * Prevents future conflicts with platform surfaces.
 * 
 * @see __docs__/url-routing-architecture/README.md ADR-4
 */

/**
 * Reserved project slugs — blocked at project creation/rename time.
 * These are paths that MenuList may use for platform features.
 */
export const RESERVED_PROJECT_SLUGS: readonly string[] = [
    // Current reserved
    'menu',           // Reserved: default menu route when OBP enabled

    // Future platform surfaces
    'info',
    'about',
    'contact',
    'reviews',
    'photos',
    'gallery',
    'offers',
    'updates',
    'order',
    'book',
    'events',
    'jobs',
    'careers',

    // Technical/internal
    'screen',
    'feedback',
    'admin',
    'api',
    'settings',
    'dashboard',
    'login',
    'signup',
    'auth',
    'webhook',
    'health',
    'status',
    'sitemap',
    'robots',
    'manifest',
    'sw',              // service worker
    '_next',
    '_client',
] as const;

/**
 * Reserved outlet slugs — blocked at outlet creation time.
 * Prevents collision with project slugs at the store path level.
 */
export const RESERVED_OUTLET_SLUGS: readonly string[] = [
    ...RESERVED_PROJECT_SLUGS,
    // Additional outlet-level reserves
    'locations',
    'stores',
    'outlets',
    'branches',
    'main',            // Could conflict with default store routing
] as const;

/**
 * Reserved subdomains — blocked at onboarding and subdomain change time.
 * These are subdomains that MenuList uses for platform infrastructure.
 */
export const RESERVED_SUBDOMAINS: readonly string[] = [
    'www', 'app', 'api', 'admin', 'dashboard', 'mail', 'blog',
    'help', 'support', 'status', 'menu', 'screen', 'feedback',
    'auth', 'login', 'signup', 'webhook', 'health', 'cdn',
    'dev', 'staging', 'test', 'demo', 'docs', 'billing',
] as const;

/**
 * Check if a slug is reserved for projects
 */
export function isReservedProjectSlug(slug: string): boolean {
    return RESERVED_PROJECT_SLUGS.includes(slug.toLowerCase());
}

/**
 * Check if a subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
    return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
}

/**
 * Check if a slug is reserved for outlets
 */
export function isReservedOutletSlug(slug: string): boolean {
    return RESERVED_OUTLET_SLUGS.includes(slug.toLowerCase());
}
