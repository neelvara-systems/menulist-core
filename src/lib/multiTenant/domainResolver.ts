/**
 * Multi-Tenant Domain Resolver
 * 
 * Resolves incoming requests to the correct tenant based on:
 * 1. Product website domain (e.g., answerlattice.com or campaigncue.ai → product website)
 * 2. Custom domain (e.g., joespizza.com → client menu)
 * 3. Subdomain (e.g., joespizza.menulist.ai → client menu)
 * 4. Platform domain (e.g., menulist.ai → MenuList website)
 *
 * @see src/constants/urls.ts — Single source of truth for all platform URLs
 * @see src/constants/productDomains.ts — Multi-product domain registry
 */

import {
    resolveProductSiteByHostname,
    type ProductDomainConfig,
} from "@constant/productDomains";
import { CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX } from "@constant/campaigncue/domains";
import {
    PLATFORM_DOMAIN,
    PLATFORM_DOMAIN_ALIASES,
    PLATFORM_DOMAINS,
    RESERVED_SUBDOMAINS,
} from "@constant/urls";
import { normalizeRequestAuthority } from "@lib/routing/hostAuthority";

export { normalizeRequestAuthority } from "@lib/routing/hostAuthority";

export type DomainType = 'platform' | 'product' | 'subdomain' | 'custom' | 'localhost';

export interface ResolvedDomain {
    type: DomainType;
    hostname: string;
    subdomain?: string;        // e.g., "joespizza" from joespizza.menulist.ai
    customDomain?: string;     // e.g., "joespizza.com"
    productSite?: ProductDomainConfig; // e.g., answerlattice.com → Answerlattice config
    isPlatform: boolean;
    isClient: boolean;
}

export type TenantDomainType = Extract<DomainType, 'subdomain' | 'custom'>;

export interface TenantRoutingClaims {
    subdomain?: string | null;
    customDomain?: string | null;
    tenantType?: string | null;
}

export interface TenantRequestIdentity {
    authority: string;
    hostname: string;
    subdomain: string | null;
    customDomain: string | null;
    tenantType: TenantDomainType | null;
    routingClaimsValid: boolean;
}

const isVercelDeploymentHost = (hostname: string): boolean =>
    hostname === 'vercel.app' || hostname.endsWith('.vercel.app');

/**
 * Derive tenant identity exclusively from the request Host authority. Routed
 * x-tenant-* values are treated as integrity claims only, so a forged or stale
 * header can never select a different tenant.
 */
export function resolveTenantRequestIdentity(
    authority: string | null,
    routingClaims: TenantRoutingClaims = {},
): TenantRequestIdentity | null {
    const normalizedAuthority = normalizeRequestAuthority(authority);
    if (!normalizedAuthority) return null;

    const resolvedDomain = resolveDomain(normalizedAuthority.hostname);
    const subdomain = resolvedDomain.isClient ? resolvedDomain.subdomain || null : null;
    const customDomain = resolvedDomain.isClient ? resolvedDomain.customDomain || null : null;
    const tenantType: TenantDomainType | null = resolvedDomain.type === 'subdomain' || resolvedDomain.type === 'custom'
        ? resolvedDomain.type
        : null;
    const hasRoutingClaims = Boolean(
        routingClaims.subdomain
        || routingClaims.customDomain
        || routingClaims.tenantType,
    );
    const routingClaimsValid = !hasRoutingClaims || (
        (routingClaims.subdomain || null) === subdomain
        && (routingClaims.customDomain || null) === customDomain
        && (routingClaims.tenantType || null) === tenantType
    );

    return {
        ...normalizedAuthority,
        subdomain,
        customDomain,
        tenantType,
        routingClaimsValid,
    };
}

/**
 * Parse hostname and determine domain type
 */
export function resolveDomain(hostname: string | null): ResolvedDomain {
    if (!hostname) {
        return {
            type: 'localhost',
            hostname: 'localhost',
            isPlatform: true,
            isClient: false,
        };
    }

    const normalizedAuthority = normalizeRequestAuthority(hostname);
    if (!normalizedAuthority) {
        return {
            type: 'localhost',
            hostname: 'localhost',
            isPlatform: true,
            isClient: false,
        };
    }

    // Normalize hostname through the same strict Host-authority parser used
    // by tenant identity resolution. Malformed host values must never fall
    // through to custom-domain tenant routing.
    const normalizedHost = normalizedAuthority.hostname;

    // Check if it's a product website domain (answerlattice.com, campaigncue.ai, surfaceos.app, etc.)
    // Must check BEFORE platform domain check since product domains are also in PLATFORM_DOMAINS
    const productSite = resolveProductSiteByHostname(normalizedHost);
    if (productSite && productSite.id !== 'menulist') {
        return {
            type: 'product',
            hostname: normalizedHost,
            productSite,
            isPlatform: false,
            isClient: false,
        };
    }

    // Check if it's a platform domain (menulist.ai, app.menulist.ai, localhost, etc.)
    if (PLATFORM_DOMAINS.some(d => d.split(':')[0] === normalizedHost)) {
        return {
            type: 'platform',
            hostname: normalizedHost,
            isPlatform: true,
            isClient: false,
        };
    }

    // Vercel-generated deployment aliases are app hosts for QA/prod smoke,
    // not tenant custom domains. Real customer routing still uses configured
    // platform subdomains or explicitly mapped custom domains.
    if (isVercelDeploymentHost(normalizedHost)) {
        return {
            type: 'platform',
            hostname: normalizedHost,
            isPlatform: true,
            isClient: false,
        };
    }

    // Check if it's a subdomain of any supported platform base domain
    // (production + aliases like menulist.online).
    const platformBaseDomains = Array.from(
        new Set(
            [PLATFORM_DOMAIN, ...PLATFORM_DOMAIN_ALIASES]
                .map((domain) => domain.replace(/^www\./, ''))
                .filter(Boolean)
        )
    );

    const matchedBaseDomain = platformBaseDomains.find((baseDomain) => normalizedHost.endsWith(`.${baseDomain}`));
    if (matchedBaseDomain) {
        const subdomain = normalizedHost.slice(0, -(matchedBaseDomain.length + 1));

        // Check if it's a reserved subdomain
        if (RESERVED_SUBDOMAINS.includes(subdomain)) {
            return {
                type: 'platform',
                hostname: normalizedHost,
                isPlatform: true,
                isClient: false,
            };
        }

        return {
            type: 'subdomain',
            hostname: normalizedHost,
            subdomain,
            isPlatform: false,
            isClient: true,
        };
    }

    // Check for localhost variations
    if (normalizedHost === 'localhost' || normalizedHost.startsWith('127.0.0.1') || normalizedHost.startsWith('192.168.')) {
        return {
            type: 'localhost',
            hostname: normalizedHost,
            isPlatform: true,
            isClient: false,
        };
    }

    // Must be a custom domain
    return {
        type: 'custom',
        hostname: normalizedHost,
        customDomain: normalizedHost,
        isPlatform: false,
        isClient: true,
    };
}

/**
 * Get the rewrite path for client routes
 * Converts domain-based access to internal path
 */
export function getClientRewritePath(
    pathname: string,
    subdomain?: string,
    customDomain?: string
): string {
    // For client domains, we rewrite to /client/[domain] internally
    // This allows us to handle the routing in the /client namespace
    const domainKey = subdomain || customDomain || 'unknown';

    // If already accessing a client path, don't double-rewrite
    if (pathname.startsWith('/client/')) {
        return pathname;
    }

    // Rewrite root to client page
    if (pathname === '/' || pathname === '') {
        return `/client/${domainKey}`;
    }

    // Rewrite other paths under client
    return `/client/${domainKey}${pathname}`;
}

/**
 * Check if a path should bypass domain routing
 * (API routes, static files, etc.)
 */
export function shouldBypassDomainRouting(pathname: string): boolean {
    const bypassPaths = [
        '/api/',
        '/_next/',
        '/sites/',
        '/__answerlattice',
        CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX,
        '/__mycodex',
        '/__surfaceos',
        '/__growthos',
        '/__kitstamp',
        '/favicon.ico',
        // Keep robots.txt and sitemap.xml out of this bypass list. Tenant
        // domains must pass through middleware so they rewrite to
        // /client/robots.txt and /client/sitemap.xml with per-store discovery
        // metadata; platform domains still fall through without rewrite.
        '/manifest.json',
        '/sw.js',
        '/serwist/',
        '/sw-customer.js',
        '/mycodex-sw.js',
        '/workbox-',
    ];

    return bypassPaths.some(p => pathname.startsWith(p));
}
