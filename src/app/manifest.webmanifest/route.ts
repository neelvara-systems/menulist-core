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
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { resolveStorePublicLanguage } from '@lib/localization/publicRenderLanguage';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveDomain, type ResolvedDomain } from '@lib/multiTenant/domainResolver';
import { normalizeMultiOutletProjectId } from '@lib/multiOutlet/projectIdBoundary';
import { normalizeOBPExternalHttpsUrl, normalizeOBPGoogleMapsUrl } from '@lib/obp/publicLinks';
import { getCustomerAppIconVersion } from '@lib/pwa/customerAppAssets';
import { getStoreManifestStartUrl } from '@lib/pwa/manifestIdentity';
import { buildManifest } from '@lib/pwa/manifestGenerator';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { buildTelHref } from '@lib/phone/phoneNumber';
import { normalizePublicProjectSlug } from '@lib/publicRouting/pathSegments';
import { secureError } from '@lib/security/secureLogger';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

const MAX_MANIFEST_START_URL_DIAGNOSTICS = 25;
const reportedManifestStartUrlFailures = new Set<string>();

function getManifestStartUrlSourceErrorName(error: unknown): string {
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
}

function logManifestStartUrlLookupFailure(error: unknown, storeId: string | number): void {
    const normalizedStoreId = String(storeId ?? '').trim();
    const failureKey = [
        normalizedStoreId.length,
        getManifestStartUrlSourceErrorName(error),
    ].join(':');

    if (!reportedManifestStartUrlFailures.has(failureKey)) {
        if (reportedManifestStartUrlFailures.size >= MAX_MANIFEST_START_URL_DIAGNOSTICS) return;
        reportedManifestStartUrlFailures.add(failureKey);
    }

    logRuntimeFailure('customer_app_manifest_start_url_lookup_failed', error, {
        ...getBoundedRuntimeStringContext('storeId', storeId),
        projectSummaryDocIdPresent: normalizedStoreId.length > 0,
        projectSummaryDocIdLength: normalizedStoreId.length > 0
            ? 'projects_'.length + normalizedStoreId.length
            : 0,
        fallbackPolicy: 'use_root_manifest_start_url',
        returnsRootStartUrl: true,
    });
}

/**
 * Customer App store-level launch target.
 *
 * The installed app identity belongs to the tenant store, not to the page where
 * installation started. `/menu` is preferred when the store has any active
 * customer menu because that alias follows the current default menu without
 * tying app identity to a rename-prone project slug.
 */
async function getStoreLevelStartUrl(tenantId: string | number, storeId: string | number): Promise<string> {
    if (!tenantId || !storeId) return '/';
    try {
        const snap = await firestoreAdmin
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`projects_${storeId}`)
            .get();
        if (!snap.exists) return '/';
        const projects = parseSummaryProjects(snap.data());
        const hasResolvableMenuAlias = Object.entries(projects).some(
            ([projectId, project]: [string, any]) => {
                const projectScope = normalizeMultiOutletProjectId(projectId);
                return projectScope?.tenantDocumentId === String(tenantId)
                    && projectScope.storeDocumentId === String(storeId)
                    && project.active !== false
                    && project.deleted !== true
                    && project.isSpecialMenu !== true
                    && (project.isDefault === true || normalizePublicProjectSlug(project.slug) === 'menu');
            },
        );
        return getStoreManifestStartUrl(hasResolvableMenuAlias);
    } catch (error) {
        logManifestStartUrlLookupFailure(error, storeId);
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

const buildManifestFailureLogContext = (
    hostname: string,
    domain: ResolvedDomain | null,
    storeId: string | number | null,
    error: unknown,
) => {
    const normalizedStoreId = String(storeId ?? '').trim();

    return {
        hostnamePresent: Boolean(hostname),
        hostnameLength: hostname.length,
        domainType: domain?.type ?? 'unresolved',
        isClientDomain: Boolean(domain?.isClient),
        hasSubdomain: Boolean(domain?.subdomain),
        hasCustomDomain: Boolean(domain?.customDomain),
        storeIdPresent: Boolean(normalizedStoreId),
        storeIdLength: normalizedStoreId.length,
        errorName: error instanceof Error ? error.name : typeof error,
    };
};

export async function GET() {
    let requestHostname = '';
    let resolvedDomain: ResolvedDomain | null = null;
    let resolvedStoreId: string | number | null = null;

    try {
        // Global kill switch — owner-level opt-out lives on the store doc below.
        if (!FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA) return emptyManifest();

        const h = await headers();
        // Tenant identity must come from the request Host authority. This route
        // is intentionally excluded from middleware, so do not accept
        // forwarded Host headers as a tenant selector or public manifest cache key.
        requestHostname = h.get('host') || '';
        const domain = resolveDomain(requestHostname);
        resolvedDomain = domain;

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
        resolvedStoreId = store.storeId;

        // PWA can be globally disabled per store (opt-out)
        const pwaEnabled = store.pwaSettings?.enableInstallableApp !== false;
        if (!pwaEnabled) return emptyManifest();

        const getCachedStoreLevelStartUrl = unstable_cache(
            getStoreLevelStartUrl,
            ['customer-app-manifest-start-url'],
            {
                revalidate: 3600,
                tags: [`menu-store-${store.storeId}`, `store-${store.storeId}`, 'client-stores'],
            },
        );
        const startUrl = await getCachedStoreLevelStartUrl(store.tenantId, store.storeId);

        const contentLanguage = resolveStorePublicLanguage(store);
        const t = createPublicCustomerTranslator(contentLanguage);
        const displayName: string = getStoreContextName(store, t('menu.menuOffering'));
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
        const mapsUrl = normalizeOBPGoogleMapsUrl(store.publicPresence?.googleMapsUrl);
        const reservationUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.reservationUrl);
        const orderUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.orderUrl);

        // Tel number: prefer full E.164 with dial code; fall back to raw phone.
        const rawPhone: string | undefined = store.phoneNumber;
        const phoneForTel = buildTelHref({
            countryCode: store.countryCode,
            dialCode: store.dialCode,
            phoneNumber: rawPhone,
        })?.replace(/^tel:/, '') || rawPhone;

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
                : t('menu.metadataMenuDescription', { businessName: displayName });

        const manifest = buildManifest({
            id: store.id,
            displayName,
            shortName,
            themeColor,
            description,
            iconVersion: getCustomerAppIconVersion(store),
            language: contentLanguage,
            // Customer App is one store-level app per tenant origin. Install
            // page is source attribution only; it never changes app identity.
            startUrl,
            shortcutInfo: {
                menuPath: startUrl === '/menu' ? startUrl : null,
                phone: showCall ? phoneForTel || null : null,
                mapsUrl: showDirections ? mapsUrl : null,
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
        secureError(
            '[manifest] generation failed',
            new Error('customer_app_manifest_generation_failed'),
            buildManifestFailureLogContext(requestHostname, resolvedDomain, resolvedStoreId, err),
        );
        return emptyManifest();
    }
}
