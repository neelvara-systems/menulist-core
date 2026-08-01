export const DEFAULT_PUBLIC_MENU_CURRENCY_CODE = 'INR';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const MAX_CURRENCY_SYMBOL_LENGTH = 8;
const UNSAFE_CURRENCY_SYMBOL_PATTERN = /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/;

function normalizePublicMenuCurrencyCode(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    return CURRENCY_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function resolvePublicMenuCurrencyCode(value: unknown): string {
    return normalizePublicMenuCurrencyCode(value) || DEFAULT_PUBLIC_MENU_CURRENCY_CODE;
}

export function resolvePublicMenuCurrencySymbol(
    value: unknown,
    currencyCode: unknown,
): string {
    const normalizedCurrencyCode = normalizePublicMenuCurrencyCode(currencyCode);
    if (normalizedCurrencyCode && typeof value === 'string') {
        const normalized = value.trim();
        if (
            normalized
            && normalized.length <= MAX_CURRENCY_SYMBOL_LENGTH
            && !UNSAFE_CURRENCY_SYMBOL_PATTERN.test(normalized)
        ) {
            return normalized;
        }
    }

    const resolvedCurrencyCode = normalizedCurrencyCode || DEFAULT_PUBLIC_MENU_CURRENCY_CODE;
    try {
        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency: resolvedCurrencyCode,
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).formatToParts(0).find((part) => part.type === 'currency')?.value
            || resolvedCurrencyCode;
    } catch {
        return resolvedCurrencyCode;
    }
}
