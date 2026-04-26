/**
 * Customer App — Reservation Shortcut Handoff
 *
 * Route: {tenant-origin}/pwa/reservation  → /client/pwa/reservation
 *
 * Reads `publicPresence.reservationUrl` and redirects to it after firing the
 * shortcut analytics event. Matches the call / whatsapp / directions pattern.
 */

import { notFound } from 'next/navigation';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import PwaExternalRedirectClient from '../PwaExternalRedirectClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwaReservationHandoffPage() {
    const tenant = await getTenantFromHeaders('PwaReservationHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const reservationUrl: string | undefined = store.publicPresence?.reservationUrl;
    if (!reservationUrl) return notFound();

    const trackingEnabled = store.analytics?.trackMenuViews !== false;
    const contentLanguage = store.defaultLanguage || store.activeLanguages?.[0] || store.language || 'en';
    const storeName = getLocalizedText(
        store.publicPresence?.displayName,
        contentLanguage,
        getPrimaryLocalizedLanguage(store.publicPresence?.displayName, contentLanguage),
        store.name || 'Restaurant',
    );

    return (
        <PwaExternalRedirectClient
            storeId={store.id}
            tenantId={store.tenantId}
            targetUrl={reservationUrl}
            title={`Book a table at ${storeName}`}
            message="Opening reservations…"
            trackingEnabled={trackingEnabled}
        />
    );
}
