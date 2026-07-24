import {
    ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME,
    ANSWERLATTICE_DEFAULT_TIME_ZONE,
    isValidAnswerlatticeTimeZone,
    normalizeAnswerlatticeBusinessDayEndTime,
} from './schedulerTime';

const BILLING_MODELS = new Set(['subscription', 'usage', 'one_time', 'not_sure']);

export type AnswerlatticeCompiledWorkspaceProduct = {
    name: string;
    url: string | null;
    supportEmail: string | null;
    billingModel: 'subscription' | 'usage' | 'one_time' | 'not_sure';
    timeZone: string;
    businessDayEndTime: string;
};

const normalizeString = (value: unknown, maxLength: number): string => (
    typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const firstString = (values: unknown[], maxLength: number): string => {
    for (const value of values) {
        const normalized = normalizeString(value, maxLength);
        if (normalized) return normalized;
    }
    return '';
};

const normalizeProductUrl = (value: unknown): string | null => {
    const normalized = normalizeString(value, 300);
    if (!normalized) return null;
    try {
        const parsed = new URL(normalized);
        return (
            (parsed.protocol === 'https:' || parsed.protocol === 'http:')
            && parsed.username === ''
            && parsed.password === ''
            && parsed.hostname.length > 0
        ) ? normalized : null;
    } catch {
        return null;
    }
};

const normalizeSupportEmail = (value: unknown): string | null => {
    const normalized = normalizeString(value, 160);
    return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
        ? normalized
        : null;
};

export const projectAnswerlatticeCompiledWorkspaceProduct = (
    value: unknown,
): AnswerlatticeCompiledWorkspaceProduct => {
    const store = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const billingModel = normalizeString(store.billingModel, 40);
    const timeZone = normalizeString(store.timeZone, 80);
    return {
        name: firstString([store.productName, store.name, store.companyName], 120) || 'Product',
        url: normalizeProductUrl(store.productUrl),
        supportEmail: normalizeSupportEmail(store.supportEmail),
        billingModel: BILLING_MODELS.has(billingModel)
            ? billingModel as AnswerlatticeCompiledWorkspaceProduct['billingModel']
            : 'subscription',
        timeZone: isValidAnswerlatticeTimeZone(timeZone)
            ? timeZone
            : ANSWERLATTICE_DEFAULT_TIME_ZONE,
        businessDayEndTime: normalizeAnswerlatticeBusinessDayEndTime(
            normalizeString(store.businessDayEndTime, 5)
                || ANSWERLATTICE_DEFAULT_BUSINESS_DAY_END_TIME,
        ),
    };
};
