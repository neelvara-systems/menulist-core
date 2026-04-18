/**
 * Dynamic Web App Manifest — per-tenant
 *
 * Route: {tenant-origin}/manifest.webmanifest
 *
 * Served directly (middleware matcher excludes .webmanifest), so this handler
 * reads the Host header itself and resolves the tenant via the same
 * resolveDomain() function the middleware uses.
 *
 * Caching:
 *   - Reuses `getStoreBySubdomain` / `getStoreByCustomDomain` (60s unstable_cache)
 *   - Sets Cache-Control public, s-maxage=3600 so browsers/CDNs cache for 1h
 */

import { FEATURE_FLAGS } from '@config/features';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { resolveDomain } from '@lib/multiTenant/domainResolver';
import { buildManifest } from '@lib/pwa/manifestGenerator';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function emptyManifest() {
    return new Response(JSON.stringify({}), {
        status: 404,
        headers: { 'Content-Type': 'application/manifest+json' },
    });
}

export async function GET() {
    try {
        // Global kill switch — owner-level opt-out lives on the store doc below.
        if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) return emptyManifest();

        const h = headers();
        // `host` reflects the incoming request; `x-forwarded-host` covers proxies.
        const hostname = h.get('x-forwarded-host') || h.get('host') || '';
        const domain = resolveDomain(hostname);

        if (!domain.isClient) {
            // Manifest only meaningful on tenant domains; platform domain returns 404.
            return emptyManifest();
        }

        let store = null;
        if (domain.subdomain) {
            store = await getStoreBySubdomain(domain.subdomain);
        } else if (domain.customDomain) {
            store = await getStoreByCustomDomain(domain.customDomain);
        }

        if (!store) return emptyManifest();

        // PWA can be globally disabled per store (opt-out)
        const pwaEnabled = store.pwaSettings?.enableInstallableApp !== false;
        if (!pwaEnabled) return emptyManifest();

        const displayName: string = store.name || store.storeName || 'Menu';
        const shortName: string | undefined = store.pwaSettings?.pwaShortName;

        // Theme + description pulled from publicPresence (the existing OBP-facing
        // branding surface). Falls back to sensible defaults in buildManifest().
        const themeColor: string | undefined = store.publicPresence?.accentColor;

        // Shortcut info — only include actions that the owner has explicitly
        // enabled for public presence. Matches OBP quick-actions visibility.
        const showCall = store.publicPresence?.showCall !== false;
        const showDirections = store.publicPresence?.showDirections !== false;
        const showWhatsApp = store.publicPresence?.showWhatsApp !== false;

        // Tel number: prefer full E.164 with dial code; fall back to raw phone.
        const rawPhone: string | undefined = store.phoneNumber;
        const dialCode: string | undefined = store.dialCode || store.countryCode;
        const phoneForTel =
            rawPhone && dialCode && !rawPhone.startsWith('+')
                ? `${dialCode.startsWith('+') ? '' : '+'}${dialCode}${rawPhone.replace(/^0+/, '')}`
                : rawPhone;

        const manifest = buildManifest({
            id: store.id,
            displayName,
            shortName,
            themeColor,
            shortcutInfo: {
                menuPath: '/',
                phone: showCall ? phoneForTel || null : null,
                mapsUrl: showDirections ? store.publicPresence?.googleMapsUrl || null : null,
                whatsappNumber: showWhatsApp ? store.publicPresence?.whatsappNumber || null : null,
            },
        });

        return new Response(JSON.stringify(manifest, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/manifest+json; charset=utf-8',
                // Browsers honor manifest updates on fetch — 1h cache is safe.
                'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (err) {
        console.error('[manifest] generation failed:', err);
        return emptyManifest();
    }
}
