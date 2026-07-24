/**
 * Resolve the current tenant from incoming request headers.
 *
 * Consolidates the identical ~30-line function previously duplicated across:
 *   - src/app/client/[[...slug]]/page.tsx
 *   - src/app/client/obp/OBPContent.tsx
 *   - src/app/client/compliance/CompliancePageContent.tsx
 *
 * Tenant identity is derived from the original Host authority. Middleware-set
 * x-tenant-* values are integrity claims only and can never select a tenant.
 */

import { resolveTenantRequestIdentity } from '@lib/multiTenant/domainResolver';
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
    const headersList = await headers();
    const requestHost = headersList.get('host');
    const identity = resolveTenantRequestIdentity(requestHost, {
        subdomain: headersList.get('x-tenant-subdomain'),
        customDomain: headersList.get('x-tenant-custom-domain'),
        tenantType: headersList.get('x-tenant-type'),
    });

    // If still no host we're in a broken state — log once and return nulls
    if (!identity) {
        secureError('[Tenant Headers] No host header found', new Error('Tenant host header missing'), {
            logContext: sanitizeTenantLogContext(logContext),
            hasHost: Boolean(headersList.get('host')),
        });
        return {
            subdomain: null,
            customDomain: null,
            tenantType: null,
            host: null,
            origin: null,
        };
    }

    const forwardedProtocol = headersList.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const isLocalRuntime = process.env.NODE_ENV === 'development'
        || identity.hostname === 'localhost'
        || identity.hostname === '127.0.0.1'
        || identity.hostname.startsWith('192.168.');
    const protocol = isLocalRuntime && forwardedProtocol !== 'https' ? 'http' : 'https';
    const origin = `${protocol}://${identity.authority}`;

    return {
        subdomain: identity.subdomain,
        customDomain: identity.customDomain,
        tenantType: identity.tenantType,
        host: identity.hostname,
        origin,
    };
}
