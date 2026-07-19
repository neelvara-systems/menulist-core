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
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import { buildTelHref } from '@lib/phone/phoneNumber';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { resolveStorePublicLanguage } from '@lib/localization/publicRenderLanguage';
import PwaCallHandoffClient from './PwaCallHandoffClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PwaCallHandoffPage({
    searchParams,
}: {
    searchParams?: { lang?: string | string[] };
}) {
    const tenant = await getTenantFromHeaders('PwaCallHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const showCall = store.publicPresence?.showCall !== false;
    if (!showCall) return notFound();

    const telUrl = buildTelHref({
        countryCode: store.countryCode,
        dialCode: store.dialCode,
        phoneNumber: store.phoneNumber,
    });
    if (!telUrl) return notFound();

    const activeLanguage = resolveStorePublicLanguage(store, searchParams?.lang);
    const t = createPublicCustomerTranslator(activeLanguage);
    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const storeName = getStoreContextName(store, t('common.business'));

    return (
        <PwaCallHandoffClient
            activeLanguage={activeLanguage}
            storeId={store.id}
            tenantId={store.tenantId}
            telUrl={telUrl}
            storeName={storeName}
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
