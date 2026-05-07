import { BUSINESS_TYPES } from '@data/shared/businessTypes';

const GENERIC_BUSINESS_TYPE_VALUES = new Set([
    'b2c',
    'b2b',
    'consumer',
    'business',
    'menulist',
]);

const BUSINESS_TYPE_BY_NORMALIZED_VALUE = new Map(
    BUSINESS_TYPES.map((businessType) => [
        businessType.value.trim().toLowerCase(),
        businessType.value,
    ]),
);

const cleanCandidate = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const cleaned = value.trim();
    if (!cleaned) return undefined;
    if (GENERIC_BUSINESS_TYPE_VALUES.has(cleaned.toLowerCase())) return undefined;
    return cleaned;
};

export function resolvePublicBusinessType(...candidates: unknown[]): string | undefined {
    for (const candidate of candidates) {
        const cleaned = cleanCandidate(candidate);
        if (!cleaned) continue;

        const registryValue = BUSINESS_TYPE_BY_NORMALIZED_VALUE.get(cleaned.toLowerCase());
        if (registryValue) return registryValue;
    }

    for (const candidate of candidates) {
        const cleaned = cleanCandidate(candidate);
        if (cleaned) return cleaned;
    }

    return undefined;
}
