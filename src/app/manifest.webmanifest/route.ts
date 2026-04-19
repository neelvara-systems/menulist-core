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

export async function GET(request: Request) {
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

        // G-03 (§11 + D-10 PUBLIC-ROUTING-DOCTRINE): per-surface start_url.
        // Each client page emits `<link rel="manifest" href="/manifest.webmanifest?start=/{path}">`
        // so installs from different surfaces (OBP, outlet OBP, project menu)
        // yield distinct PWAs whose start_url matches the install surface.
        // Validate the `start` param: must be a same-origin path (starts with
        // `/`, no scheme, no `..` traversal). Anything else falls back to '/'.
        const requestUrl = new URL(request.url);
        const rawStart = requestUrl.searchParams.get('start') || '/';
        const isSafePath =
            rawStart.startsWith('/') &&
            !rawStart.startsWith('//') &&
            !rawStart.includes('..') &&
            !/^\/[a-z]+:/.test(rawStart); // defeats `/https://evil.com` smuggling
        const startUrl = isSafePath ? rawStart : '/';

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

        // Reservation + Order have no explicit toggle — presence of URL implies intent.
        const reservationUrl: string | undefined = store.publicPresence?.reservationUrl;
        const orderUrl: string | undefined = store.publicPresence?.orderUrl;

        // Tel number: prefer full E.164 with dial code; fall back to raw phone.
        const rawPhone: string | undefined = store.phoneNumber;
        const dialCode: string | undefined = store.dialCode || store.countryCode;
        const phoneForTel =
            rawPhone && dialCode && !rawPhone.startsWith('+')
                ? `${dialCode.startsWith('+') ? '' : '+'}${dialCode}${rawPhone.replace(/^0+/, '')}`
                : rawPhone;

        // Description — short snippet for install dialogs & PWA listings.
        // `store.tagline` is the owner-edited short tagline; fall back to a sensible default.
        const description: string =
            (typeof store.tagline === 'string' && store.tagline.trim().length > 0)
                ? store.tagline.trim().slice(0, 120)
                : `${displayName} — digital menu`;

        const manifest = buildManifest({
            id: store.id,
            displayName,
            shortName,
            themeColor,
            description,
            // G-03 (§11 + D-10): start_url = the surface the customer installed
            // from. Browsers will launch the installed PWA directly into this
            // path, honouring install-context = launch-context.
            startUrl,
            shortcutInfo: {
                // Menu shortcut points at the same install surface. For OBP
                // installs (startUrl='/'), the shortcut also lands on '/'
                // which is OBP → customer uses the "View Menu" CTA to reach
                // the default project. For menu-surface installs, the
                // shortcut lands directly on the menu.
                menuPath: startUrl,
                phone: showCall ? phoneForTel || null : null,
                mapsUrl: showDirections ? store.publicPresence?.googleMapsUrl || null : null,
                whatsappNumber: showWhatsApp ? store.publicPresence?.whatsappNumber || null : null,
                reservationUrl: reservationUrl || null,
                orderUrl: orderUrl || null,
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
