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
import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getStoreByCustomDomain, getStoreByOutletSlug, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { resolveDomain } from '@lib/multiTenant/domainResolver';
import { buildManifest } from '@lib/pwa/manifestGenerator';
import { doc, getDoc } from 'firebase/firestore';
import { headers } from 'next/headers';

/**
 * G-11 (§11 + A-12 PUBLIC-ROUTING-DOCTRINE): validate a start_url path against
 * the current store state. Returns the ORIGINAL path if the target is still
 * resolvable, or a degraded path per the A-12 fallback ladder:
 *
 *   project → /menu alias (if isDefault still exists on that store)
 *           → store OBP ('/{outletSlug}' for outlets, '/' for master)
 *           → brand OBP ('/')
 *
 * Called only inside the manifest route — all Firestore reads go through
 * already-cached helpers (getStoreByOutletSlug, platformSummary/projects_*),
 * so this does not add per-manifest cost on cache hits.
 */
async function resolveStartUrlWithFallback(
    masterStore: any,
    rawStart: string,
): Promise<string> {
    // Normalize: strip query/hash, collapse trailing slash.
    const cleaned = rawStart.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    if (cleaned === '/' || cleaned === '') return '/';

    const segments = cleaned.split('/').filter(Boolean);

    // Helper: does this storeId have any active, non-special-menu projects
    // with the given slug? /menu Layer 2 alias is considered "present" when an
    // isDefault project exists, since the alias will still render.
    const checkStore = async (storeId: number, projectSlug?: string) => {
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary',
                `projects_${storeId}`,
            );
            const snap = await getDoc(summaryRef);
            if (!snap.exists()) return { hasProject: false, hasDefault: false };
            const projects = parseSummaryProjects(snap.data());
            const active = Object.values(projects).filter(
                (p: any) => p.active !== false && !p.isSpecialMenu,
            );
            const hasDefault = active.some((p: any) => p.isDefault === true);
            if (!projectSlug) return { hasProject: false, hasDefault };
            const target = projectSlug.toLowerCase();
            const hasProject = active.some((p: any) => {
                const cur = (p.slug || '').toLowerCase();
                const previous: string[] = Array.isArray(p.previousSlugs) ? p.previousSlugs : [];
                return cur === target || previous.map((s) => s.toLowerCase()).includes(target);
            });
            return { hasProject, hasDefault };
        } catch {
            // On read failure, be permissive — don't degrade the owner's
            // existing install silently due to a transient Firestore blip.
            return { hasProject: true, hasDefault: true };
        }
    };

    // Case 1: '/{seg}' — could be a project on master OR an outlet slug.
    if (segments.length === 1) {
        const seg = segments[0].toLowerCase();
        if (seg === 'menu') {
            // Layer 2 alias — valid iff master has an isDefault project.
            const { hasDefault } = await checkStore(masterStore.storeId);
            return hasDefault ? '/menu' : '/';
        }
        // Try project-on-master first.
        const masterRes = await checkStore(masterStore.storeId, seg);
        if (masterRes.hasProject) return cleaned;
        // Try outlet.
        if (masterStore.isMaster && FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
            const outlet = await getStoreByOutletSlug(masterStore.tenantId, seg).catch(() => null);
            if (outlet?.storeId) return cleaned; // outlet OBP still valid
        }
        // Degrade: project gone → try /menu alias, else brand OBP.
        return masterRes.hasDefault ? '/menu' : '/';
    }

    // Case 2: '/{outletSlug}/{projectSlug}' or '/{outletSlug}/menu'.
    if (segments.length === 2) {
        const outletSlug = segments[0].toLowerCase();
        const second = segments[1].toLowerCase();

        if (!masterStore.isMaster || !FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
            // Multi-outlet not in play — treat as single-segment resolution.
            return '/';
        }

        const outlet = await getStoreByOutletSlug(masterStore.tenantId, outletSlug).catch(() => null);
        if (!outlet?.storeId) {
            // Outlet gone → straight to brand OBP.
            return '/';
        }

        if (second === 'menu') {
            const { hasDefault } = await checkStore(outlet.storeId);
            return hasDefault ? `/${outletSlug}/menu` : `/${outletSlug}`;
        }

        const { hasProject, hasDefault } = await checkStore(outlet.storeId, second);
        if (hasProject) return cleaned;
        // Project gone → outlet-level /menu alias, else outlet OBP.
        return hasDefault ? `/${outletSlug}/menu` : `/${outletSlug}`;
    }

    // Any deeper path is not a canonical surface — collapse to brand OBP.
    return '/';
}

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

        // G-11 (§11 + A-12 PUBLIC-ROUTING-DOCTRINE): validate the start_url
        // target and degrade up the fallback ladder when it no longer exists.
        // For PWA relaunches the browser refetches the manifest — so the next
        // time the installed PWA starts online it will pick up the degraded
        // path and the customer never sees a terminal 404 from a deleted
        // project / deactivated outlet.
        const resolvedStartUrl = await resolveStartUrlWithFallback(store, startUrl);

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
            // G-11: if the original install target is gone, resolvedStartUrl
            // has been degraded up the A-12 ladder already.
            startUrl: resolvedStartUrl,
            shortcutInfo: {
                // Menu shortcut points at the same install surface. For OBP
                // installs (startUrl='/'), the shortcut also lands on '/'
                // which is OBP → customer uses the "View Menu" CTA to reach
                // the default project. For menu-surface installs, the
                // shortcut lands directly on the menu.
                menuPath: resolvedStartUrl,
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
