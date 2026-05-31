/**
 * Product Domain Registry — Single Source of Truth
 *
 * Maps external domains to internal product website route groups.
 * Each product in the MenuList ecosystem gets its own domain and
 * isolated website route group under src/app/sites/[productId]/.
 *
 * Routing Flow:
 *   1. Middleware reads hostname
 *   2. resolveProductSite() matches hostname against the active deployment target
 *   3. Middleware rewrites: answerlattice.com/pricing → /sites/answerlattice/pricing
 *   4. Next.js renders sites/answerlattice/pricing/page.tsx
 *
 * Local Dev:
 *   - Default (localhost:3000) → MenuList website
 *   - localhost:3000/__answerlattice/pricing → Answerlattice website
 *   - No /etc/hosts configuration needed
 *
 * @see src/middleware.ts — Uses this for hostname-based routing
 * @see src/lib/multiTenant/domainResolver.ts — Multi-tenant routing (client menus)
 * @see src/constants/urls.ts — MenuList-specific URL constants
 */

import {
    getActiveProductDomains,
    getProductDeploymentTarget,
} from './deploymentTargets';
import { FEATURE_FLAGS } from '@config/features';

// ═══════════════════════════════════════════════════════════════
// Product Identifiers
// ═══════════════════════════════════════════════════════════════

export type ProductId = 'menulist' | 'answerlattice' | 'surfaceos' | 'growthOS' | 'visualmeta' | 'mycodex';

// ═══════════════════════════════════════════════════════════════
// Product Domain Configuration
// ═══════════════════════════════════════════════════════════════

export interface ProductDomainConfig {
    /** Unique product identifier */
    id: ProductId;
    /** Display name */
    name: string;
    /** Production domains (hostname without protocol) */
    domains: string[];
    /** Local development path prefix (e.g., '/__answerlattice') */
    devPathPrefix: string;
    /**
     * Internal route path for middleware rewrite.
     * Empty string = root (website) route group (MenuList only).
     * All others: '/sites/{productId}'
     */
    internalBasePath: string;
    /** Whether this product's website is currently active */
    enabled: boolean;
}

export const PRODUCT_SITES: ProductDomainConfig[] = [
    {
        id: 'menulist',
        name: 'MenuList',
        domains: getActiveProductDomains('menulist'),
        devPathPrefix: '', // default — no prefix needed
        internalBasePath: '', // served from (website) route group at root
        enabled: true,
    },
    {
        id: 'answerlattice',
        name: 'Answerlattice',
        domains: getActiveProductDomains('answerlattice'),
        devPathPrefix: getProductDeploymentTarget('answerlattice', 'local').devPathPrefix,
        internalBasePath: '/sites/answerlattice',
        enabled: true,
    },
    {
        id: 'surfaceos',
        name: 'SurfaceOS',
        domains: [
            'surfaceos.app',
            'www.surfaceos.app',
        ],
        devPathPrefix: '/__surfaceos',
        internalBasePath: '/sites/surfaceos',
        enabled: false, // placeholder — not yet built
    },
    {
        id: 'growthOS',
        name: 'GrowthOS',
        domains: [
            'growthos.app',
            'www.growthos.app',
        ],
        devPathPrefix: '/__growthos',
        internalBasePath: '/sites/growthos',
        enabled: false, // placeholder — not yet built
    },
    {
        id: 'visualmeta',
        name: 'VisualMeta',
        domains: [
            'visualmeta.app',
            'www.visualmeta.app',
        ],
        devPathPrefix: '/__visualmeta',
        internalBasePath: '/sites/visualmeta',
        enabled: false, // placeholder — not yet built
    },
    {
        id: 'mycodex',
        name: 'MyCodex',
        domains: getActiveProductDomains('mycodex'),
        devPathPrefix: getProductDeploymentTarget('mycodex', 'local').devPathPrefix,
        internalBasePath: '/sites/mycodex',
        enabled: FEATURE_FLAGS.ENABLE_MYCODEX_READER,
    },
];

// ═══════════════════════════════════════════════════════════════
// Lookup Helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Active product website domains for this deployment stage (for
 * PLATFORM_DOMAINS inclusion). These hostnames should NOT be treated as
 * client tenant subdomains.
 */
export const ALL_PRODUCT_DOMAINS: string[] = PRODUCT_SITES.flatMap(p => p.domains);

/**
 * All dev path prefixes for enabled products (excluding menulist which has no prefix).
 */
export const ALL_DEV_PATH_PREFIXES: string[] = PRODUCT_SITES
    .filter(p => p.devPathPrefix)
    .map(p => p.devPathPrefix);

/**
 * Resolve hostname to a product site config.
 * Returns undefined if hostname doesn't match any product domain.
 */
export function resolveProductSiteByHostname(hostname: string): ProductDomainConfig | undefined {
    const normalizedHost = hostname.split(':')[0].toLowerCase();
    return PRODUCT_SITES.find(p =>
        p.enabled && p.domains.some(d => d === normalizedHost)
    );
}

/**
 * Resolve a dev path prefix to a product site config.
 * Used in local development: localhost:3000/__answerlattice/pricing → answerlattice site
 */
export function resolveProductSiteByDevPath(pathname: string): {
    product: ProductDomainConfig;
    strippedPath: string;
} | undefined {
    for (const product of PRODUCT_SITES) {
        if (product.enabled && product.devPathPrefix && pathname.startsWith(product.devPathPrefix)) {
            const strippedPath = pathname.slice(product.devPathPrefix.length) || '/';
            return { product, strippedPath };
        }
    }
    return undefined;
}

/**
 * Get a product site config by ID.
 */
export function getProductSiteById(id: ProductId): ProductDomainConfig | undefined {
    return PRODUCT_SITES.find(p => p.id === id);
}
