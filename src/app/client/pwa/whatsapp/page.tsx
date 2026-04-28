/**
 * Customer App — WhatsApp Shortcut Handoff
 *
 * Route: {tenant-origin}/pwa/whatsapp  → /client/pwa/whatsapp
 *
 * Builds a wa.me URL from `publicPresence.whatsappNumber` (falling back to
 * `phoneNumber` + `dialCode`), then redirects. Analytics attributed as
 * shortcut-call (documented in shortcutSourceDetector.ts).
 */

import { notFound } from 'next/navigation';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import PwaWhatsAppHandoffClient from './PwaWhatsAppHandoffClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function buildWaUrl(waNumber: string | undefined, fallbackPhone?: string, dialCode?: string): string | null {
    // wa.me expects digits only (no +, no spaces, no dashes).
    const candidate = (waNumber && waNumber.length > 0 ? waNumber : fallbackPhone) || '';
    if (!candidate) return null;

    const digitsOnly = candidate.replace(/[^\d]/g, '');
    if (!digitsOnly) return null;

    // If the number doesn't already start with a country code (heuristic:
    // 10 digits = India-local, 11 digits US-local-with-1), prepend dial code.
    let withCountry = digitsOnly;
    if (!candidate.startsWith('+') && dialCode && digitsOnly.length <= 11) {
        const dc = dialCode.replace(/[^\d]/g, '');
        // Avoid double-prefixing if dialCode is already there.
        if (!digitsOnly.startsWith(dc)) {
            withCountry = `${dc}${digitsOnly.replace(/^0+/, '')}`;
        }
    }

    return `https://wa.me/${withCountry}`;
}

export default async function PwaWhatsAppHandoffPage() {
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
        store.dialCode || store.countryCode,
    );
    if (!waUrl) return notFound();

    const analyticsPreferences = getResolvedAnalyticsPreferences(store.analytics);
    const contentLanguage = store.defaultLanguage || store.activeLanguages?.[0] || store.language || 'en';
    const storeName = getLocalizedText(
        store.publicPresence?.displayName,
        contentLanguage,
        getPrimaryLocalizedLanguage(store.publicPresence?.displayName, contentLanguage),
        store.name || 'Restaurant',
    );

    return (
        <PwaWhatsAppHandoffClient
            storeId={store.id}
            tenantId={store.tenantId}
            waUrl={waUrl}
            storeName={storeName}
            trackingEnabled={analyticsPreferences.trackCustomerApp}
            locationTrackingEnabled={analyticsPreferences.trackLocation}
        />
    );
}
