import type { StoreDataType } from '@type/platform/store';
import { getActiveTempStatus } from '@lib/tempStatus/statusBoundary';

export type PublicClientStore = Partial<StoreDataType> & Pick<StoreDataType, 'storeId' | 'tenantId'>;

const pickDefined = <T extends Record<string, unknown>>(
    source: T,
    fields: readonly string[],
): Record<string, unknown> => Object.fromEntries(
    fields.flatMap((field) => source[field] !== undefined ? [[field, source[field]]] : []),
);

/**
 * Browser-safe projection for the public menu renderer.
 *
 * Canonical store documents also contain credentials, billing state, roles,
 * owner contact details, integration secrets, and internal workflow metadata.
 * Public server components may use the canonical record, but a client component
 * must receive only this explicit rendering contract.
 */
export function projectPublicClientStore(store: Record<string, any>): PublicClientStore | null {
    if (!store || typeof store !== 'object') return null;
    if (!Number.isSafeInteger(store.storeId) || store.storeId <= 0) return null;
    if (!Number.isSafeInteger(store.tenantId) || store.tenantId <= 0) return null;

    const publicPresence = store.publicPresence && typeof store.publicPresence === 'object'
        ? pickDefined(store.publicPresence, [
            'descriptor',
            'accentColor',
            'whatsappNumber',
            'googleMapsUrl',
            'showCall',
            'showWhatsApp',
            'showDirections',
            'showReservation',
            'showOrder',
            'showGoogleReview',
            'showFeedback',
            'showPrivacyLink',
            'showTermsLink',
            'showRefundLink',
            'iconVariant',
            'reservationUrl',
            'orderUrl',
            'specialNote',
            'establishedYear',
            'knownFor',
            'googleReviewUrl',
            'googleRating',
            'googleReviewCount',
            'businessCover',
            'photos',
            'customAttributes',
        ])
        : undefined;
    const analytics = store.analytics && typeof store.analytics === 'object'
        ? pickDefined(store.analytics, [
            'googleAnalyticsId',
            'googleSearchConsole',
            'facebookPixelId',
            'enhancedEcommerce',
            'trackCustomerApp',
            'trackDecisionBlocks',
            'trackMenuViews',
            'trackLocation',
            'trackOfficialBusinessPage',
        ])
        : undefined;
    const pwaSettings = store.pwaSettings && typeof store.pwaSettings === 'object'
        ? pickDefined(store.pwaSettings, [
            'enableInstallableApp',
            'promoteInstallation',
            'pwaShortName',
        ])
        : undefined;
    const tempStatus = getActiveTempStatus(store.tempStatus);

    return {
        ...pickDefined(store, [
            'storeId',
            'tenantId',
            'tenantName',
            'name',
            'countryCode',
            'dialCode',
            'phoneNumber',
            'addressLine',
            'area',
            'city',
            'state',
            'postalCode',
            'timeZone',
            'businessDayEndTime',
            'activeLanguages',
            'defaultLanguage',
            'currencyCode',
            'currencySymbol',
            'businessType',
            'businessCategory',
            'businessIndustry',
            'activePlanType',
            'workingHours',
            'socialMedia',
            'feedbackEnabled',
            'reviewUrl',
        ]),
        ...(publicPresence ? { publicPresence } : {}),
        ...(analytics ? { analytics } : {}),
        ...(pwaSettings ? { pwaSettings } : {}),
        ...(tempStatus ? { tempStatus } : {}),
    } as PublicClientStore;
}
