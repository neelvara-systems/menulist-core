import countryData from '@atoms/phoneNumberInput/countryData';
import { BUSINESS_TYPES, normalizeBusinessCategory } from '@data/shared/businessTypes';
import { normalizeCurrencyCode, normalizeLanguageCodes } from '@data/shared/extractedBusinessProfile';
import type { MenuIntakeIdentityResponse } from './client';
import type { StoreDataType } from '@type/platform/store';

export type BusinessIdentitySuggestionField =
    | 'phoneNumber'
    | 'addressLine'
    | 'businessType'
    | 'businessCategory'
    | 'currencyCode'
    | 'activeLanguages'
    | 'defaultLanguage';

export type BusinessIdentityUpdatePayload = Partial<{
    phoneNumber: string;
    addressLine: string;
    businessType: string;
    businessCategory: string;
    currencyCode: string;
    currencySymbol: string;
    activeLanguages: string[];
    defaultLanguage: string;
}>;

export type BusinessIdentitySuggestion = {
    currentValue: string;
    field: BusinessIdentitySuggestionField;
    label: string;
    value: string;
    payloadValue?: string | string[];
    metadata?: {
        currencySymbol?: string;
        defaultLanguage?: string;
    };
};

type StoreIdentitySuggestionSource = Partial<StoreDataType> & {
    address?: string;
};

function normalizeValue(value: unknown): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeComparable(value: unknown): string {
    return normalizeValue(value).toLowerCase();
}

function normalizeBusinessType(value: unknown): string | null {
    const raw = normalizeComparable(value);
    if (!raw) return null;

    const exact = BUSINESS_TYPES.find((businessType) =>
        normalizeComparable(businessType.value) === raw ||
        normalizeComparable(businessType.label) === raw
    );
    if (exact) return exact.value;

    const partial = BUSINESS_TYPES.find((businessType) =>
        normalizeComparable(businessType.value).includes(raw) ||
        normalizeComparable(businessType.label).includes(raw) ||
        raw.includes(normalizeComparable(businessType.value)) ||
        raw.includes(normalizeComparable(businessType.label))
    );
    return partial?.value || null;
}

function normalizeLanguageList(value: unknown): string[] {
    return normalizeLanguageCodes(Array.isArray(value) ? value : String(value || '').split(','));
}

function formatStringList(value: unknown): string {
    const list = Array.isArray(value) ? value : normalizeLanguageList(value);
    return list.map(normalizeValue).filter(Boolean).join(', ');
}

function getCurrencySymbol(currencyCode: string): string | undefined {
    return countryData.find((country) => country.currencyCode === currencyCode)?.currencySymbol;
}

function addSuggestion(
    suggestions: BusinessIdentitySuggestion[],
    params: {
        currentValue?: unknown;
        field: BusinessIdentitySuggestionField;
        label: string;
        metadata?: BusinessIdentitySuggestion['metadata'];
        payloadValue?: string | string[];
        value?: unknown;
    },
) {
    const value = normalizeValue(params.value);
    if (!value) return;
    const currentValue = normalizeValue(params.currentValue);
    if (normalizeComparable(value) === normalizeComparable(currentValue)) return;
    if (suggestions.some((suggestion) => suggestion.field === params.field)) return;

    suggestions.push({
        currentValue,
        field: params.field,
        label: params.label,
        value,
        ...(params.payloadValue !== undefined ? { payloadValue: params.payloadValue } : {}),
        ...(params.metadata ? { metadata: params.metadata } : {}),
    });
}

export function buildBusinessIdentitySuggestions(
    result: MenuIntakeIdentityResponse | null | undefined,
    storeDetails: StoreIdentitySuggestionSource | null | undefined,
): BusinessIdentitySuggestion[] {
    if (!result?.identity || !storeDetails) return [];
    if (result.identity.confidence === 'low') return [];

    const suggestions: BusinessIdentitySuggestion[] = [];
    addSuggestion(suggestions, {
        currentValue: storeDetails.phoneNumber,
        field: 'phoneNumber',
        label: 'Phone number',
        value: result.identity.phoneNumber,
    });
    addSuggestion(suggestions, {
        currentValue: storeDetails.addressLine || storeDetails.address,
        field: 'addressLine',
        label: 'Address',
        value: result.identity.address,
    });

    const businessType = normalizeBusinessType(result.identity.businessType);
    if (businessType) {
        addSuggestion(suggestions, {
            currentValue: storeDetails.businessType,
            field: 'businessType',
            label: 'Business type',
            value: businessType,
        });
    }

    const businessCategory = normalizeBusinessCategory(result.identity.businessCategory || '');
    if (businessCategory) {
        addSuggestion(suggestions, {
            currentValue: storeDetails.businessCategory,
            field: 'businessCategory',
            label: 'Business category',
            value: businessCategory,
        });
    }

    const currencyCode = normalizeCurrencyCode(result.identity.currencyHint);
    const currencySymbol = currencyCode ? getCurrencySymbol(currencyCode) : undefined;
    if (currencyCode) {
        addSuggestion(suggestions, {
            currentValue: storeDetails.currencyCode,
            field: 'currencyCode',
            label: 'Currency',
            metadata: currencySymbol ? { currencySymbol } : undefined,
            value: currencySymbol ? `${currencyCode} (${currencySymbol})` : currencyCode,
            payloadValue: currencyCode,
        });
    }

    const detectedLanguages = normalizeLanguageList(result.identity.languages);
    const currentLanguages = normalizeLanguageList(storeDetails.activeLanguages || []);
    const mergedLanguages = Array.from(new Set([...currentLanguages, ...detectedLanguages]));
    if (detectedLanguages.length > 0 && mergedLanguages.length !== currentLanguages.length) {
        addSuggestion(suggestions, {
            currentValue: formatStringList(currentLanguages),
            field: 'activeLanguages',
            label: 'Menu languages',
            metadata: { defaultLanguage: detectedLanguages[0] },
            value: formatStringList(mergedLanguages),
            payloadValue: mergedLanguages,
        });
    }

    const detectedDefaultLanguage = detectedLanguages[0];
    if (detectedDefaultLanguage) {
        addSuggestion(suggestions, {
            currentValue: storeDetails.defaultLanguage,
            field: 'defaultLanguage',
            label: 'Default menu language',
            value: detectedDefaultLanguage,
        });
    }

    return suggestions;
}

export function buildBusinessIdentityUpdatePayload(
    suggestions: BusinessIdentitySuggestion[],
    selectedFields: BusinessIdentitySuggestionField[],
): BusinessIdentityUpdatePayload {
    const selected = new Set(selectedFields);
    return suggestions.reduce<BusinessIdentityUpdatePayload>((payload, suggestion) => {
        if (selected.has(suggestion.field)) {
            (payload as Record<string, unknown>)[suggestion.field] = suggestion.payloadValue ?? suggestion.value;
            if (suggestion.field === 'currencyCode' && suggestion.metadata?.currencySymbol) {
                payload.currencySymbol = suggestion.metadata.currencySymbol;
            }
            if (suggestion.field === 'activeLanguages' && suggestion.metadata?.defaultLanguage && selected.has('defaultLanguage')) {
                payload.defaultLanguage = suggestion.metadata.defaultLanguage;
            }
        }
        return payload;
    }, {});
}
