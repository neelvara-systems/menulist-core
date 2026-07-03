/**
 * Resolve the current tenant from incoming request headers.
 *
 * Consolidates the identical ~30-line function previously duplicated across:
 *   - src/app/client/[[...slug]]/page.tsx
 *   - src/app/client/obp/OBPContent.tsx
 *   - src/app/client/compliance/CompliancePageContent.tsx
 *
 * Reads middleware-set headers first (x-tenant-*), with a `resolveDomain`
 * fallback when the middleware headers are missing (e.g. direct requests,
 * header propagation issues on some CDN paths).
 */

import { resolveDomain } from '@lib/multiTenant/domainResolver';
import { secureError } from '@lib/security/secureLogger';
import { headers } from 'next/headers';

export type TenantInfo = {
    subdomain: string | null;
    customDomain: string | null;
    tenantType: string | null;
    host: string | null;
    origin: string | null;
};

const sanitizeTenantLogContext = (logContext: string): string => (
    logContext.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 80) || 'ClientPage'
);

/**
 * @param logContext Optional caller tag used when logging a missing host.
 *                   Purely cosmetic — aids debugging which page triggered the error.
 */
export async function getTenantFromHeaders(logContext = 'ClientPage'): Promise<TenantInfo> {
    const headersList = headers();
    const tenantSubdomain = headersList.get('x-tenant-subdomain');
    const tenantCustomDomain = headersList.get('x-tenant-custom-domain');
    const tenantTypeHeader = headersList.get('x-tenant-type');

    // Multiple fallback headers for host detection (Vercel + standard)
    const requestHost =
        headersList.get('x-forwarded-host') ||        // Standard proxy header
        headersList.get('host') ||                     // Standard host header
        headersList.get('x-vercel-proxied-host') ||   // Vercel specific
        headersList.get('x-vercel-deployment-url') || // Vercel deployment URL
        process.env.VERCEL_URL;                        // Vercel env fallback

    const host = requestHost ? requestHost.split(':')[0].toLowerCase() : null;
    const protocol =
        headersList.get('x-forwarded-proto') ||
        (process.env.NODE_ENV === 'development' ? 'http' : 'https');
    const origin = requestHost ? `${protocol}://${requestHost.toLowerCase()}` : null;

    // If still no host we're in a broken state — log once and return nulls
    if (!host) {
        secureError('[Tenant Headers] No host header found', new Error('Tenant host header missing'), {
            logContext: sanitizeTenantLogContext(logContext),
            hasForwardedHost: Boolean(headersList.get('x-forwarded-host')),
            hasHost: Boolean(headersList.get('host')),
            hasVercelHost: Boolean(headersList.get('x-vercel-proxied-host')),
            hasVercelUrl: Boolean(headersList.get('x-vercel-deployment-url')),
        });
    }

    // Fallback to resolveDomain if middleware headers not set
    const resolvedDomain = resolveDomain(host);
    const tenantType = tenantTypeHeader || (resolvedDomain.isClient ? resolvedDomain.type : null);
    const subdomain = tenantSubdomain || resolvedDomain.subdomain || null;
    const customDomain = tenantCustomDomain || resolvedDomain.customDomain || null;

    return { subdomain, customDomain, tenantType, host, origin };
}
