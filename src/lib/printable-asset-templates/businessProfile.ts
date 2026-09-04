import { getStoreName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import type { PrintableAssetTypeId } from './types';

export type AssetBusinessProfileFieldId =
    | 'address'
    | 'brandName'
    | 'contactName'
    | 'email'
    | 'locationName'
    | 'logo'
    | 'phone'
    | 'tagline';

export type AssetBusinessProfileField = {
    description: string;
    id: AssetBusinessProfileFieldId;
    label: string;
};

export type AssetBusinessProfileReadiness = {
    completedCount: number;
    fields: Array<AssetBusinessProfileField & { complete: boolean }>;
    missingFields: AssetBusinessProfileField[];
    percent: number;
    totalCount: number;
};

export type AssetBusinessProfileDraft = {
    addressLine: string;
    brandName: string;
    city: string;
    contactName: string;
    country: string;
    email: string;
    locationName: string;
    phoneNumber: string;
    state: string;
    tagline: string;
};

const FIELD_DEFINITIONS: Record<AssetBusinessProfileFieldId, AssetBusinessProfileField> = {
    address: {
        description: 'Adds a customer-facing location to contact-focused assets.',
        id: 'address',
        label: 'Business address',
    },
    brandName: {
        description: 'Keeps the same brand identity across every location and asset.',
        id: 'brandName',
        label: 'Brand name',
    },
    contactName: {
        description: 'Gives business cards a real person customers can contact.',
        id: 'contactName',
        label: 'Contact name',
    },
    email: {
        description: 'Adds a public email to contact-focused assets.',
        id: 'email',
        label: 'Business email',
    },
    locationName: {
        description: 'Identifies the correct branch or location on generated assets.',
        id: 'locationName',
        label: 'Location name',
    },
    logo: {
        description: 'Replaces the initials mark with your real business logo.',
        id: 'logo',
        label: 'Business logo',
    },
    phone: {
        description: 'Adds a public phone number to contact-focused assets.',
        id: 'phone',
        label: 'Business phone',
    },
    tagline: {
        description: 'Adds a short line that explains what makes the business distinct.',
        id: 'tagline',
        label: 'Tagline',
    },
};

const CORE_ASSET_FIELDS: readonly AssetBusinessProfileFieldId[] = [
    'brandName',
    'locationName',
    'logo',
    'tagline',
];

const BUSINESS_CARD_FIELDS: readonly AssetBusinessProfileFieldId[] = [
    ...CORE_ASSET_FIELDS,
    'contactName',
    'phone',
    'email',
    'address',
];

const ALL_PROFILE_FIELDS: readonly AssetBusinessProfileFieldId[] = BUSINESS_CARD_FIELDS;

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function cleanText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function getAddressValue(storeDetails: unknown): string {
    const addressLine = cleanText(readOwnField(storeDetails, 'addressLine'))
        || cleanText(readOwnField(storeDetails, 'address'));
    const city = cleanText(readOwnField(storeDetails, 'city'));
    const state = cleanText(readOwnField(storeDetails, 'state'));
    const country = cleanText(readOwnField(storeDetails, 'country'));
    const hasUsableLocation = Boolean(addressLine || (city && (state || country)));

    return hasUsableLocation
        ? [addressLine, city, state, country].filter(Boolean).join(', ')
        : '';
}

export function getAssetBusinessProfileFieldIds(
    assetTypeId?: PrintableAssetTypeId | null,
): readonly AssetBusinessProfileFieldId[] {
    if (!assetTypeId || assetTypeId === 'complete_menu_kit') return ALL_PROFILE_FIELDS;
    if (assetTypeId === 'business_card') return BUSINESS_CARD_FIELDS;
    return CORE_ASSET_FIELDS;
}

export function getAssetBusinessProfileReadiness(
    storeDetails: unknown,
    tenantDetails?: unknown,
    assetTypeId?: PrintableAssetTypeId | null,
): AssetBusinessProfileReadiness {
    const values: Record<AssetBusinessProfileFieldId, string> = {
        address: getAddressValue(storeDetails),
        brandName: cleanText(readOwnField(tenantDetails, 'name'))
            || cleanText(readOwnField(storeDetails, 'tenantName')),
        contactName: cleanText(readOwnField(storeDetails, 'contactPersonName')),
        email: cleanText(readOwnField(storeDetails, 'email')) || cleanText(readOwnField(storeDetails, 'contactPersonEmail')),
        locationName: getStoreName(storeDetails, ''),
        logo: cleanText(readOwnField(storeDetails, 'logo')),
        phone: cleanText(readOwnField(storeDetails, 'phoneNumber')) || cleanText(readOwnField(storeDetails, 'contactPersonNumber')),
        tagline: getLocalizedText(
            readOwnField(storeDetails, 'tagline'),
            undefined,
            getPrimaryLocalizedLanguage(readOwnField(storeDetails, 'tagline'), 'en'),
            '',
        ),
    };
    const fieldIds = getAssetBusinessProfileFieldIds(assetTypeId);
    const fields = fieldIds.map((id) => ({
        ...FIELD_DEFINITIONS[id],
        complete: Boolean(values[id]),
    }));
    const missingFields = fields.filter((field) => !field.complete);
    const totalCount = fields.length;
    const completedCount = totalCount - missingFields.length;

    return {
        completedCount,
        fields,
        missingFields,
        percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 100,
        totalCount,
    };
}

export function buildAssetBusinessProfileDraft(
    storeDetails: unknown,
    tenantDetails?: unknown,
): AssetBusinessProfileDraft {
    const taglineValue = readOwnField(storeDetails, 'tagline');
    return {
        addressLine: cleanText(readOwnField(storeDetails, 'addressLine')) || cleanText(readOwnField(storeDetails, 'address')),
        brandName: cleanText(readOwnField(tenantDetails, 'name')) || cleanText(readOwnField(storeDetails, 'tenantName')),
        city: cleanText(readOwnField(storeDetails, 'city')),
        contactName: cleanText(readOwnField(storeDetails, 'contactPersonName')),
        country: cleanText(readOwnField(storeDetails, 'country')),
        email: cleanText(readOwnField(storeDetails, 'email')) || cleanText(readOwnField(storeDetails, 'contactPersonEmail')),
        locationName: cleanText(readOwnField(storeDetails, 'name')) || cleanText(readOwnField(storeDetails, 'storeName')),
        phoneNumber: cleanText(readOwnField(storeDetails, 'phoneNumber')) || cleanText(readOwnField(storeDetails, 'contactPersonNumber')),
        state: cleanText(readOwnField(storeDetails, 'state')),
        tagline: getLocalizedText(
            taglineValue,
            undefined,
            getPrimaryLocalizedLanguage(taglineValue, 'en'),
            '',
        ),
    };
}
