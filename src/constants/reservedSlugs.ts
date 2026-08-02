/**
 * Reserved Slug Namespace
 * 
 * These slugs cannot be used as project names or outlet slugs.
 * Prevents future conflicts with platform surfaces.
 * 
 * @see __docs__/url-routing-architecture/README.md ADR-4
 */

import { CAMPAIGNCUE_PRODUCT_SLUG } from '@constant/campaigncue/product';
import { NEELVARA_PRODUCT_SLUG } from '@constant/neelvara/product';
import { SIGNALDESK_PRODUCT_SLUG } from '@constant/signaldesk/product';

/**
 * Reserved project slugs — blocked at project creation/rename time.
 * These are paths that MenuList may use for platform features.
 */
export const RESERVED_PROJECT_SLUGS: readonly string[] = [
    // G-05 (§9 R5 + §11 PUBLIC-ROUTING-DOCTRINE): `menu` is NOT reserved.
    // Under R5, /menu uses two-layer resolution:
    //   Layer 1 — if a project on this store has slug `menu`, normal slug
    //             lookup resolves it directly (owner-claimed canonical URL).
    //   Layer 2 — otherwise, /menu serves the isDefault project as a
    //             universal alias with <link rel="canonical"> pointing at
    //             the real slug URL.
    // Owners can therefore name a project "Menu" and own /menu as their
    // canonical URL, while stores that don't do so still get /menu as a
    // working universal-invariant fallback. Do NOT re-add 'menu' here.

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
    'client',

    // Customer App (PWA surface) — analytics project segment + shortcut handoff routes
    'customerapp',     // analytics projectId='customerApp' (lowercase match in checks)
    'pwa',             // future shortcut handoff base path

    // Separate product surfaces
    CAMPAIGNCUE_PRODUCT_SLUG,
] as const;

/**
 * Reserved outlet slugs — blocked at outlet creation time.
 * Prevents collision with project slugs at the store path level.
 */
export const RESERVED_OUTLET_SLUGS: readonly string[] = [
    ...RESERVED_PROJECT_SLUGS,
    // Additional outlet-level reserves
    'menu',            // /menu is the universal menu alias and cannot be an outlet root
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
    'dev', 'qa', 'staging', 'test', 'demo', 'docs', 'billing',
    'answerlattice',
    CAMPAIGNCUE_PRODUCT_SLUG,
    NEELVARA_PRODUCT_SLUG,
    SIGNALDESK_PRODUCT_SLUG,
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
