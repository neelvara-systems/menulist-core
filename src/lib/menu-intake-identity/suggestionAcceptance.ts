import { BUSINESS_TYPES } from '@constant/common';
import type { MenuIntakeIdentityResponse } from './client';
import type { StoreDataType } from '@type/platform/store';

export type BusinessIdentitySuggestionField = 'name' | 'phoneNumber' | 'addressLine' | 'businessType';

export type BusinessIdentitySuggestion = {
    currentValue: string;
    field: BusinessIdentitySuggestionField;
    label: string;
    value: string;
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

function addSuggestion(
    suggestions: BusinessIdentitySuggestion[],
    params: {
        currentValue?: unknown;
        field: BusinessIdentitySuggestionField;
        label: string;
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
        currentValue: storeDetails.name,
        field: 'name',
        label: 'Business name',
        value: result.identity.businessName,
    });
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

    return suggestions;
}

export function buildBusinessIdentityUpdatePayload(
    suggestions: BusinessIdentitySuggestion[],
    selectedFields: BusinessIdentitySuggestionField[],
): Partial<Record<BusinessIdentitySuggestionField, string>> {
    const selected = new Set(selectedFields);
    return suggestions.reduce<Partial<Record<BusinessIdentitySuggestionField, string>>>((payload, suggestion) => {
        if (selected.has(suggestion.field)) {
            payload[suggestion.field] = suggestion.value;
        }
        return payload;
    }, {});
}
