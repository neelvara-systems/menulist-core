/**
 * Customer App — Order Online Shortcut Handoff
 *
 * Route: {tenant-origin}/pwa/order  → /client/pwa/order
 *
 * Reads `publicPresence.orderUrl` and redirects to it after firing the
 * shortcut analytics event.
 */

import { notFound } from 'next/navigation';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import PwaExternalRedirectClient from '../PwaExternalRedirectClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwaOrderHandoffPage() {
    const tenant = await getTenantFromHeaders('PwaOrderHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const orderUrl: string | undefined = store.publicPresence?.orderUrl;
    if (!orderUrl) return notFound();

    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const storeName = getStoreContextName(store, 'Restaurant');

    return (
        <PwaExternalRedirectClient
            storeId={store.id}
            tenantId={store.tenantId}
            targetUrl={orderUrl}
            title={`Order from ${storeName}`}
            message="Opening order page…"
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
