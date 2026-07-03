/**
 * Customer App — Directions Shortcut Handoff
 *
 * Route: {tenant-origin}/pwa/directions  → /client/pwa/directions
 *
 * Resolves the store's Google Maps URL (prefer `publicPresence.googleMapsUrl`,
 * fall back to a constructed Maps search URL from the address) and redirects
 * after firing analytics.
 */

import { notFound } from 'next/navigation';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import { normalizeOBPGoogleMapsUrl } from '@lib/obp/publicLinks';
import PwaDirectionsHandoffClient from './PwaDirectionsHandoffClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildMapsUrl(store: any): string | null {
    // 1. Owner-provided direct URL wins.
    const direct = normalizeOBPGoogleMapsUrl(store?.publicPresence?.googleMapsUrl);
    if (direct) return direct;

    // 2. Construct a maps search URL from the address components.
    const parts = [
        store?.name,
        store?.addressLine,
        store?.area,
        store?.city,
        store?.state,
        store?.postalCode,
        store?.country,
    ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0);

    if (parts.length === 0) return null;

    const query = encodeURIComponent(parts.join(', '));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default async function PwaDirectionsHandoffPage() {
    const tenant = await getTenantFromHeaders('PwaDirectionsHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const showDirections = store.publicPresence?.showDirections !== false;
    if (!showDirections) return notFound();

    const mapsUrl = buildMapsUrl(store);
    if (!mapsUrl) return notFound();

    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const storeName = getStoreContextName(store, 'Restaurant');

    return (
        <PwaDirectionsHandoffClient
            storeId={store.id}
            tenantId={store.tenantId}
            mapsUrl={mapsUrl}
            storeName={storeName}
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
