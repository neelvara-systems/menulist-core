/**
 * Strict HTTP Host authority parser shared by routing and product-domain
 * helpers. Tenant/product identity must be derived from a valid Host
 * authority only; forwarded-host lists, paths, credentials, malformed ports,
 * IPv6 literals, and other URL components fail closed.
 */

export function normalizeRequestAuthority(authority: string | null | undefined): {
    authority: string;
    hostname: string;
} | null {
    const candidate = authority?.trim().toLowerCase();
    if (!candidate || /[\s,\\/@?#]/.test(candidate)) return null;

    try {
        const parsed = new URL(`http://${candidate}`);
        if (
            parsed.username
            || parsed.password
            || parsed.pathname !== '/'
            || parsed.search
            || parsed.hash
        ) {
            return null;
        }

        const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
        if (
            !hostname
            || hostname.includes('..')
            || !/^[a-z0-9.-]+$/.test(hostname)
            || hostname.startsWith('.')
            || hostname.endsWith('.')
        ) {
            return null;
        }

        return {
            authority: parsed.port ? `${hostname}:${parsed.port}` : hostname,
            hostname,
        };
    } catch {
        return null;
    }
}
