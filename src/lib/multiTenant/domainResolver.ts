/**
 * Multi-Tenant Domain Resolver
 * 
 * Resolves incoming requests to the correct tenant based on:
 * 1. Product website domain (e.g., canonica.app → product website)
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
import {
    PLATFORM_DOMAIN,
    PLATFORM_DOMAIN_ALIASES,
    PLATFORM_DOMAINS,
    RESERVED_SUBDOMAINS,
} from "@constant/urls";

export type DomainType = 'platform' | 'product' | 'subdomain' | 'custom' | 'localhost';

export interface ResolvedDomain {
    type: DomainType;
    hostname: string;
    subdomain?: string;        // e.g., "joespizza" from joespizza.menulist.ai
    customDomain?: string;     // e.g., "joespizza.com"
    productSite?: ProductDomainConfig; // e.g., canonica.app → Canonica config
    isPlatform: boolean;
    isClient: boolean;
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

    // Normalize hostname (remove port if present)
    const normalizedHost = hostname.split(':')[0].toLowerCase();

    // Check if it's a product website domain (canonica.app, surfaceos.app, etc.)
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
    // For client domains, we rewrite to /_client/[domain] internally
    // This allows us to handle the routing in the (client) route group
    const domainKey = subdomain || customDomain || 'unknown';

    // If already accessing a client path, don't double-rewrite
    if (pathname.startsWith('/_client/')) {
        return pathname;
    }

    // Rewrite root to client page
    if (pathname === '/' || pathname === '') {
        return `/_client/${domainKey}`;
    }

    // Rewrite other paths under client
    return `/_client/${domainKey}${pathname}`;
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
        '/__canonica',
        '/__surfaceos',
        '/__growthos',
        '/__visualmeta',
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
        '/manifest.json',
        '/sw.js',
        '/workbox-',
    ];

    return bypassPaths.some(p => pathname.startsWith(p));
}
