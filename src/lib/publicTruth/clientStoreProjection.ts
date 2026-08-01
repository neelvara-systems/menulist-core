import type { StoreDataType } from '@type/platform/store';
import { getActiveTempStatus } from '@lib/tempStatus/statusBoundary';
import { normalizeMenuListPlanType } from '@lib/platform/menuListBranding';
import { normalizeSpecialHours } from '@lib/hours/specialHours';

export type PublicClientStore = Partial<StoreDataType> & Pick<StoreDataType, 'storeId' | 'tenantId'>;

type PlainRecord = Record<string, unknown>;

const getPlainRecord = (value: unknown): PlainRecord | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    try {
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) return null;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return null;
        return Object.fromEntries(
            Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]),
        );
    } catch {
        return null;
    }
};

const readBoundedString = (value: unknown, maxLength = 2_048): string | undefined => (
    typeof value === 'string' && value.length <= maxLength ? value : undefined
);

const pickStrings = (
    source: PlainRecord,
    fields: readonly string[],
): PlainRecord => Object.fromEntries(
    fields.flatMap((field) => {
        const value = readBoundedString(source[field]);
        return value === undefined ? [] : [[field, value]];
    }),
);

const pickBooleans = (
    source: PlainRecord,
    fields: readonly string[],
): PlainRecord => Object.fromEntries(
    fields.flatMap((field) => (
        typeof source[field] === 'boolean' ? [[field, source[field]]] : []
    )),
);

const readEstablishedYear = (value: unknown): number | undefined => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 1900
    && value <= new Date().getFullYear()
        ? value
        : undefined
);

const readGoogleRating = (value: unknown): number | undefined => (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= 1
    && value <= 5
        ? value
        : undefined
);

const readBoundedStringArray = (
    value: unknown,
    maxItems: number,
    maxItemLength = 2_048,
): string[] | undefined => (
    Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => typeof item === 'string' && item.length <= maxItemLength)
        ? [...value]
        : undefined
);

const readBoundedStringRecord = (
    value: unknown,
    maxEntries: number,
): Record<string, string> | undefined => {
    const record = getPlainRecord(value);
    if (!record) return undefined;
    const entries = Object.entries(record);
    if (
        entries.length > maxEntries
        || entries.some(([key, entry]) => (
            key.length === 0
            || key.length > 64
            || typeof entry !== 'string'
            || entry.length > 2_048
        ))
    ) return undefined;
    return Object.fromEntries(entries) as Record<string, string>;
};

const readPublicLocalizedText = (
    value: unknown,
): string | Record<string, string> | undefined => {
    const scalar = readBoundedString(value);
    if (scalar !== undefined) return scalar;
    return readBoundedStringRecord(value, 32);
};

const projectPublicPresence = (value: unknown): PlainRecord | undefined => {
    const source = getPlainRecord(value);
    if (!source) return undefined;
    const descriptor = readPublicLocalizedText(source.descriptor);
    const specialNote = readPublicLocalizedText(source.specialNote);
    const knownFor = readPublicLocalizedText(source.knownFor);
    const iconVariant = source.iconVariant === 'icons' || source.iconVariant === 'emoji'
        ? source.iconVariant
        : undefined;
    const establishedYear = readEstablishedYear(source.establishedYear);
    const googleRating = readGoogleRating(source.googleRating);
    const googleReviewCount = (
        typeof source.googleReviewCount === 'number'
        && Number.isSafeInteger(source.googleReviewCount)
        && source.googleReviewCount >= 0
    )
        ? source.googleReviewCount
        : undefined;
    const photos = readBoundedStringArray(source.photos, 100);
    const customAttributes = Array.isArray(source.customAttributes)
        && source.customAttributes.length <= 6
        ? source.customAttributes.map((item) => {
            const record = getPlainRecord(item);
            const id = readBoundedString(record?.id, 160);
            const label = readBoundedString(record?.label, 256);
            if (!record || id === undefined || label === undefined) return null;
            const icon = readBoundedString(record.icon, 160);
            return {
                id,
                label,
                ...(icon === undefined ? {} : { icon }),
                ...(typeof record.active === 'boolean' ? { active: record.active } : {}),
            };
        })
        : undefined;
    const projectedCustomAttributes = customAttributes?.every(Boolean)
        ? customAttributes
        : undefined;

    return {
        ...pickStrings(source, [
            'accentColor',
            'whatsappNumber',
            'googleMapsUrl',
            'reservationUrl',
            'orderUrl',
            'googleReviewUrl',
            'businessCover',
        ]),
        ...pickBooleans(source, [
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
        ]),
        ...(descriptor === undefined ? {} : { descriptor }),
        ...(specialNote === undefined ? {} : { specialNote }),
        ...(knownFor === undefined ? {} : { knownFor }),
        ...(iconVariant === undefined ? {} : { iconVariant }),
        ...(establishedYear === undefined ? {} : { establishedYear }),
        ...(googleRating === undefined ? {} : { googleRating }),
        ...(googleReviewCount === undefined ? {} : { googleReviewCount }),
        ...(photos === undefined ? {} : { photos }),
        ...(projectedCustomAttributes === undefined
            ? {}
            : { customAttributes: projectedCustomAttributes }),
    };
};

const projectAnalytics = (value: unknown): PlainRecord | undefined => {
    const source = getPlainRecord(value);
    if (!source) return undefined;
    return {
        ...pickStrings(source, [
            'googleAnalyticsId',
            'googleSearchConsole',
            'facebookPixelId',
        ]),
        ...pickBooleans(source, [
            'enhancedEcommerce',
            'trackCustomerApp',
            'trackDecisionBlocks',
            'trackMenuViews',
            'trackLocation',
            'trackOfficialBusinessPage',
        ]),
    };
};

const projectPwaSettings = (value: unknown): PlainRecord | undefined => {
    const source = getPlainRecord(value);
    if (!source) return undefined;
    const pwaShortName = readPublicLocalizedText(source.pwaShortName);
    return {
        ...pickBooleans(source, [
            'enableInstallableApp',
            'promoteInstallation',
        ]),
        ...(pwaShortName === undefined ? {} : { pwaShortName }),
    };
};

/**
 * Browser-safe projection for the public menu renderer.
 *
 * Canonical store documents also contain credentials, billing state, roles,
 * owner contact details, integration secrets, and internal workflow metadata.
 * Public server components may use the canonical record, but a client component
 * must receive only this explicit rendering contract.
 */
export function projectPublicClientStore(store: unknown): PublicClientStore | null {
    const source = getPlainRecord(store);
    if (!source) return null;
    if (!Number.isSafeInteger(source.storeId) || (source.storeId as number) <= 0) return null;
    if (!Number.isSafeInteger(source.tenantId) || (source.tenantId as number) <= 0) return null;

    const publicPresence = projectPublicPresence(source.publicPresence);
    const analytics = projectAnalytics(source.analytics);
    const pwaSettings = projectPwaSettings(source.pwaSettings);
    const tempStatus = getActiveTempStatus(source.tempStatus);
    const activePlanType = normalizeMenuListPlanType(source.activePlanType);
    const activeLanguages = readBoundedStringArray(source.activeLanguages, 32, 64);
    const workingHours = readBoundedStringRecord(source.workingHours, 32);
    const specialHours = normalizeSpecialHours(source.specialHours);
    const socialMedia = readBoundedStringRecord(source.socialMedia, 32);

    return {
        storeId: source.storeId as number,
        tenantId: source.tenantId as number,
        ...pickStrings(source, [
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
            'defaultLanguage',
            'currencyCode',
            'currencySymbol',
            'businessType',
            'businessCategory',
            'businessIndustry',
            'reviewUrl',
        ]),
        ...pickBooleans(source, ['feedbackEnabled']),
        ...(activeLanguages ? { activeLanguages } : {}),
        ...(activePlanType ? { activePlanType } : {}),
        ...(workingHours ? { workingHours } : {}),
        ...(specialHours && Object.keys(specialHours).length ? { specialHours } : {}),
        ...(socialMedia ? { socialMedia } : {}),
        ...(publicPresence ? { publicPresence } : {}),
        ...(analytics ? { analytics } : {}),
        ...(pwaSettings ? { pwaSettings } : {}),
        ...(tempStatus ? { tempStatus } : {}),
    } as PublicClientStore;
}
