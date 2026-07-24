/**
 * Customer App — WhatsApp Shortcut Handoff
 *
 * Route: {tenant-origin}/pwa/whatsapp  → /client/pwa/whatsapp
 *
 * Builds a wa.me URL from `publicPresence.whatsappNumber` (falling back to
 * `phoneNumber` + `dialCode`), then redirects. Analytics attributed as
 * shortcut-whatsapp through `entry_source` (documented in shortcutSourceDetector.ts).
 */

import { notFound } from 'next/navigation';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { resolveStorePublicLanguage } from '@lib/localization/publicRenderLanguage';
import PwaWhatsAppHandoffClient from './PwaWhatsAppHandoffClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildWaUrl(waNumber: string | undefined, fallbackPhone?: string, countryCode?: string, dialCode?: string): string | null {
    const phoneParam = buildWhatsAppPhoneParam({
        countryCode,
        dialCode,
        phoneNumber: waNumber && waNumber.length > 0 ? waNumber : fallbackPhone,
    });
    return phoneParam ? `https://wa.me/${phoneParam}` : null;
}

export default async function PwaWhatsAppHandoffPage(
    props: {
        searchParams?: Promise<{ lang?: string | string[] }>;
    }
) {
    const searchParams = await props.searchParams;
    const tenant = await getTenantFromHeaders('PwaWhatsAppHandoff');
    const store = tenant.subdomain
        ? await getStoreBySubdomain(tenant.subdomain)
        : tenant.customDomain
            ? await getStoreByCustomDomain(tenant.customDomain)
            : null;

    if (!store) return notFound();

    const showWhatsApp = store.publicPresence?.showWhatsApp !== false;
    if (!showWhatsApp) return notFound();

    const waUrl = buildWaUrl(
        store.publicPresence?.whatsappNumber,
        store.phoneNumber,
        store.countryCode,
        store.dialCode,
    );
    if (!waUrl) return notFound();

    const activeLanguage = resolveStorePublicLanguage(store, searchParams?.lang);
    const t = createPublicCustomerTranslator(activeLanguage);
    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const storeName = getStoreContextName(store, t('common.business'));

    return (
        <PwaWhatsAppHandoffClient
            activeLanguage={activeLanguage}
            storeId={store.id}
            tenantId={store.tenantId}
            waUrl={waUrl}
            storeName={storeName}
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
