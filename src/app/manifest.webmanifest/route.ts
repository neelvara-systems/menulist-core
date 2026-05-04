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
import { getStoreContextName } from '@lib/businessIdentity/names';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveDomain } from '@lib/multiTenant/domainResolver';
import { getStoreManifestStartUrl } from '@lib/pwa/manifestIdentity';
import { buildManifest } from '@lib/pwa/manifestGenerator';
import { doc, getDoc } from 'firebase/firestore';
import { headers } from 'next/headers';

/**
 * Customer App store-level launch target.
 *
 * The installed app identity belongs to the tenant store, not to the page where
 * installation started. `/menu` is preferred when the store has any active
 * customer menu because that alias follows the current default menu without
 * tying app identity to a rename-prone project slug.
 */
async function getStoreLevelStartUrl(store: any): Promise<string> {
    if (!store?.storeId) return '/';
    try {
        const summaryRef = doc(
            firebaseClient,
            DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary',
            `projects_${store.storeId}`,
        );
        const snap = await getDoc(summaryRef);
        if (!snap.exists()) return '/';
        const projects = parseSummaryProjects(snap.data());
        const hasCustomerMenu = Object.values(projects).some(
            (p: any) => p.active !== false && !p.isSpecialMenu,
        );
        return getStoreManifestStartUrl(hasCustomerMenu);
    } catch {
        // A transient summary read failure should not make the manifest invalid.
        // Root OBP is always a safe tenant-scoped launch target.
        return '/';
    }
}

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

        const startUrl = await getStoreLevelStartUrl(store);

        const contentLanguage = store.defaultLanguage || store.activeLanguages?.[0] || store.language || 'en';
        const displayName: string = getStoreContextName(store, 'Menu');
        const shortName = getLocalizedText(
            store.pwaSettings?.pwaShortName,
            contentLanguage,
            getPrimaryLocalizedLanguage(store.pwaSettings?.pwaShortName, contentLanguage),
            '',
        ) || undefined;

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
            getLocalizedText(
                store.tagline,
                contentLanguage,
                getPrimaryLocalizedLanguage(store.tagline, contentLanguage),
                '',
            ).trim().length > 0
                ? getLocalizedText(
                    store.tagline,
                    contentLanguage,
                    getPrimaryLocalizedLanguage(store.tagline, contentLanguage),
                    '',
                ).trim().slice(0, 120)
                : `${displayName} — digital menu`;

        const manifest = buildManifest({
            id: store.id,
            displayName,
            shortName,
            themeColor,
            description,
            // Customer App is one store-level app per tenant origin. Install
            // page is source attribution only; it never changes app identity.
            startUrl,
            shortcutInfo: {
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
