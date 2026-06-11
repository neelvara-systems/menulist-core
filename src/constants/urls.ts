/**
 * Platform URL Constants — Single Source of Truth
 *
 * All MenuList platform URLs must be imported from here.
 * Never hardcode domain strings in components, API routes, or lib files.
 *
 * Domain Architecture (Multi-Product):
 *   Local: localhost:3000     — MenuList marketing/app shell
 *   Local tenant URL host: menulist.online — local generated customer links mirror staging
 *   Local: /__answerlattice        — Answerlattice website
 *   QA: menulist.online       — MenuList preview/staging
 *   QA: ecomsai.com           — Answerlattice preview/staging
 *   Prod: menulist.ai         — MenuList production
 *   Prod: answerlattice.com        — Answerlattice production
 *   [future product domains] — SurfaceOS / GrowthOS / KitStamp websites
 *   app.menulist.ai          — Owner/staff dashboard (authenticated)
 *   {subdomain}.menulist.online — Customer-facing digital menu in local/staging
 *   {subdomain}.menulist.ai     — Customer-facing digital menu in production
 *   help.menulist.ai         — Help center / knowledge base (future)
 *   support.menulist.ai      — Support portal (future)
 *   msg.menulist.ai          — Messaging-onboarding placeholder email domain
 *
 * @see src/constants/productDomains.ts — Multi-product domain registry
 * @see src/lib/multiTenant/domainResolver.ts — Runtime domain routing
 * @see src/middleware.ts — Edge middleware routing
 */

import { ALL_PRODUCT_DOMAINS } from './productDomains';
import { CAMPAIGNCUE_PRODUCT_ID } from '@constant/campaigncue/product';
import {
    getActiveProductDomains,
    getDeploymentStage,
    getProductDeploymentTarget,
} from './deploymentTargets';

// ═══════════════════════════════════════════════════════════════
// Base Domain
// ═══════════════════════════════════════════════════════════════

const sanitizeDomain = (value?: string | null): string => {
    if (!value) return '';
    return value
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
};

/** Root domain — used for marketing site, SEO, and canonical URLs */
const activeMenulistDomains = getActiveProductDomains('menulist').map((domain) => sanitizeDomain(domain));
const activeExternalMenulistDomains = activeMenulistDomains.filter((domain) =>
    domain
    && domain !== 'localhost'
    && domain !== '127.0.0.1'
    && !domain.startsWith('192.168.')
);
const localGeneratedTenantDomain = getProductDeploymentTarget('menulist', 'preview').domains[0] || 'menulist.online';
const defaultPlatformDomain = getDeploymentStage() === 'local'
    ? localGeneratedTenantDomain
    : activeExternalMenulistDomains[0] || 'menulist.ai';

const configuredPlatformDomain = sanitizeDomain(process.env.NEXT_PUBLIC_PLATFORM_DOMAIN);
const isConfiguredPlatformDomainAllowed = getDeploymentStage() === 'local'
    || configuredPlatformDomain === defaultPlatformDomain;

export const PLATFORM_DOMAIN = (isConfiguredPlatformDomainAllowed ? configuredPlatformDomain : '') || defaultPlatformDomain;

/**
 * Alias domains that behave identically to PLATFORM_DOMAIN for the active
 * runtime environment. Vercel preview should use menulist.online; production
 * should use menulist.ai. Non-local alias env values are filtered to the
 * active deployment's MenuList domains.
 */
const envDomainAliases = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN_ALIASES || '')
    .split(',')
    .map((entry) => sanitizeDomain(entry))
    .filter(Boolean);
const allowedEnvDomainAliases = getDeploymentStage() === 'local'
    ? envDomainAliases
    : envDomainAliases.filter((alias) => activeExternalMenulistDomains.includes(alias));

const defaultDomainAliases = [
    ...activeExternalMenulistDomains,
].filter((alias) => alias !== PLATFORM_DOMAIN && alias !== `www.${PLATFORM_DOMAIN}`);

export const PLATFORM_DOMAIN_ALIASES = Array.from(new Set([
    ...defaultDomainAliases,
    ...allowedEnvDomainAliases.filter((alias) => alias !== PLATFORM_DOMAIN && alias !== `www.${PLATFORM_DOMAIN}`),
]));

/** Full root URL with protocol */
export const PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, '');

const getHostnameFromUrl = (value?: string | null): string => {
    if (!value) return '';
    try {
        return new URL(normalizeBaseUrl(value)).hostname.toLowerCase();
    } catch {
        return '';
    }
};

const isCanonicalPublicHost = (hostname: string): boolean =>
    hostname === PLATFORM_DOMAIN
    || hostname === `www.${PLATFORM_DOMAIN}`
    || PLATFORM_DOMAIN_ALIASES.some(alias => hostname === alias);

const isLocalhostHost = (hostname: string): boolean =>
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.startsWith('192.168.');

export const normalizeBaseUrl = (value?: string | null): string => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return stripTrailingSlashes(withProtocol);
};

export const getPublicBaseUrl = (): string => {
    const envBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
    if (typeof window !== 'undefined' && window.location?.origin) {
        const currentOrigin = stripTrailingSlashes(window.location.origin);
        const currentHostname = window.location.hostname.toLowerCase();

        if (isLocalhostHost(currentHostname)) {
            return currentOrigin;
        }

        if (!envBaseUrl) {
            return currentOrigin;
        }
    }
    if (envBaseUrl) return envBaseUrl;
    if (typeof window !== 'undefined' && window.location?.origin) {
        return stripTrailingSlashes(window.location.origin);
    }
    return PLATFORM_URL;
};

// ═══════════════════════════════════════════════════════════════
// Subdomains (Platform Services)
// ═══════════════════════════════════════════════════════════════

/** Dashboard subdomain — owner/staff authenticated app */
export const DASHBOARD_SUBDOMAIN = 'app';
export const DASHBOARD_URL = `https://${DASHBOARD_SUBDOMAIN}.${PLATFORM_DOMAIN}`;

/** Help center subdomain */
export const HELP_SUBDOMAIN = 'help';
export const HELP_URL = `https://${HELP_SUBDOMAIN}.${PLATFORM_DOMAIN}`;

/** Support portal subdomain */
export const SUPPORT_SUBDOMAIN = 'support';
export const SUPPORT_URL = `https://${SUPPORT_SUBDOMAIN}.${PLATFORM_DOMAIN}`;

/** Messaging-onboarding placeholder email domain (not a real subdomain) */
export const MSG_EMAIL_DOMAIN = `msg.${PLATFORM_DOMAIN}`;

/** Staff ID placeholder email domain (not a real mailbox) */
export const STAFF_EMAIL_DOMAIN = `staff.${PLATFORM_DOMAIN}`;

// ═══════════════════════════════════════════════════════════════
// Derived URLs
// ═══════════════════════════════════════════════════════════════

/** Sign-in page URL */
export const SIGNIN_URL = `${PLATFORM_URL}/signin`;

/** System email sender (no-reply) */
export const SYSTEM_EMAIL_FROM = `MenuList <system@${PLATFORM_DOMAIN}>`;

/** Contact email for enterprise/partnerships */
export const CONTACT_EMAIL = `partners@${PLATFORM_DOMAIN}`;

/** POS sync documentation URL */
export const POS_DOCS_URL = `https://${PLATFORM_DOMAIN}/pos-sync`;

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Build a customer-facing menu URL from subdomain */
export const getMenuUrl = (subdomain: string): string => {
    const normalizedSubdomain = subdomain.trim().toLowerCase();
    if (!normalizedSubdomain) return getPublicBaseUrl();

    return normalizeBaseUrl(`https://${normalizedSubdomain}.${PLATFORM_DOMAIN}`);
};

/** Build a customer-facing tenant root URL from either custom domain or subdomain */
export const getTenantBaseUrl = (
    subdomain?: string,
    customDomain?: string,
): string => {
    if (customDomain) {
        return normalizeBaseUrl(customDomain);
    }

    if (subdomain) {
        return getMenuUrl(subdomain);
    }

    return getPublicBaseUrl();
};

/** Append a path segment to a public base URL without duplicating slashes */
export const appendPublicPath = (baseUrl: string, path: string): string => {
    const normalizedBase = normalizeBaseUrl(baseUrl);
    const normalizedPath = stripLeadingSlashes(path);
    return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
};

/** Build a generated email from phone number (messaging-onboarding) */
export const getGeneratedEmail = (phone: string): string => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return `${cleaned}@${MSG_EMAIL_DOMAIN}`;
};

/**
 * All platform domains that should NOT be treated as client tenants.
 * Used by domainResolver.ts and middleware.ts
 */
export const PLATFORM_DOMAINS = [
    PLATFORM_DOMAIN,
    `www.${PLATFORM_DOMAIN}`,
    `${DASHBOARD_SUBDOMAIN}.${PLATFORM_DOMAIN}`,
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    `${HELP_SUBDOMAIN}.${PLATFORM_DOMAIN}`,
    `${SUPPORT_SUBDOMAIN}.${PLATFORM_DOMAIN}`,
    `msg.${PLATFORM_DOMAIN}`,
    // Alias domains (staging/testing environments)
    ...PLATFORM_DOMAIN_ALIASES,
    // All product website domains (answerlattice.com, surfaceos.app, etc.)
    ...ALL_PRODUCT_DOMAINS,
];

/**
 * Reserved subdomains that are NOT client tenants.
 * Used by domainResolver.ts for subdomain routing.
 */
export const RESERVED_SUBDOMAINS = [
    'www',
    DASHBOARD_SUBDOMAIN,
    'api',
    'admin',
    'dashboard',
    'mail',
    'blog',
    HELP_SUBDOMAIN,
    SUPPORT_SUBDOMAIN,
    'status',
    CAMPAIGNCUE_PRODUCT_ID,
];
