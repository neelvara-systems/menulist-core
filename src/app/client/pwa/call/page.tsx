/**
 * Customer App — Call Shortcut Handoff
 *
 * Route: {tenant-origin}/pwa/call  → rewritten by middleware to /client/pwa/call
 *
 * Flow:
 *   1. Server resolves tenant via headers (same pattern as `[[...slug]]/page.tsx`)
 *   2. Server passes phone + tracking context to client component
 *   3. Client component fires CUSTOMER_APP_SHORTCUT_CALL (via shortcutSourceDetector
 *      — ?entry_source=shortcut-call is already on the URL from the manifest shortcut)
 *   4. Client then `window.location.replace('tel:+...')`
 */

import { notFound } from 'next/navigation';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import PwaCallHandoffClient from './PwaCallHandoffClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildTelUrl(phone: string | undefined, dialCode?: string): string | null {
    if (!phone) return null;
    if (phone.startsWith('+')) return `tel:${phone.replace(/\s+/g, '')}`;
    if (!dialCode) return `tel:${phone.replace(/\s+/g, '')}`;
    const prefix = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
    return `tel:${prefix}${phone.replace(/\s+/g, '').replace(/^0+/, '')}`;
}

export default async function PwaCallHandoffPage() {
    const tenant = await getTenantFromHeaders('PwaCallHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const showCall = store.publicPresence?.showCall !== false;
    if (!showCall) return notFound();

    const telUrl = buildTelUrl(store.phoneNumber, store.dialCode || store.countryCode);
    if (!telUrl) return notFound();

    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const contentLanguage = store.defaultLanguage || store.activeLanguages?.[0] || store.language || 'en';
    const storeName = getLocalizedText(
        store.publicPresence?.displayName,
        contentLanguage,
        getPrimaryLocalizedLanguage(store.publicPresence?.displayName, contentLanguage),
        store.name || 'Restaurant',
    );

    return (
        <PwaCallHandoffClient
            storeId={store.id}
            tenantId={store.tenantId}
            telUrl={telUrl}
            storeName={storeName}
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
