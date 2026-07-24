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
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import { normalizeOBPExternalHttpsUrl } from '@lib/obp/publicLinks';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { resolveStorePublicLanguage } from '@lib/localization/publicRenderLanguage';
import PwaExternalRedirectClient from '../PwaExternalRedirectClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwaReservationHandoffPage(
    props: {
        searchParams?: Promise<{ lang?: string | string[] }>;
    }
) {
    const searchParams = await props.searchParams;
    const tenant = await getTenantFromHeaders('PwaReservationHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const reservationUrl = normalizeOBPExternalHttpsUrl(store.publicPresence?.reservationUrl);
    if (!reservationUrl) return notFound();

    const activeLanguage = resolveStorePublicLanguage(store, searchParams?.lang);
    const t = createPublicCustomerTranslator(activeLanguage);
    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const storeName = getStoreContextName(store, t('common.business'));

    return (
        <PwaExternalRedirectClient
            activeLanguage={activeLanguage}
            storeId={store.id}
            tenantId={store.tenantId}
            targetUrl={reservationUrl}
            title={t('menu.bookAtBusiness', { businessName: storeName })}
            message={t('menu.openingReservations')}
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
