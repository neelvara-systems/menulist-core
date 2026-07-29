const PROVIDER_ERROR_INDICATOR_KEYS = new Set([
    'code',
    'domain',
    'name',
    'quotaId',
    'quotaLimit',
    'quotaMetric',
    'reason',
    'status',
    'statusCode',
    'type',
]);

const isProviderErrorIndicatorEntry = (key: string, value: unknown): boolean => {
    if (key.toLowerCase().includes('message')) return false;
    return (PROVIDER_ERROR_INDICATOR_KEYS.has(key) || /quota|limit/i.test(key)) &&
        (typeof value === 'string' || typeof value === 'number');
};

const getProviderErrorIndicators = (value: unknown, depth = 0): string[] => {
    if (!value || depth > 3) return [];
    if (Array.isArray(value)) {
        return value.slice(0, 5).flatMap((entry) => getProviderErrorIndicators(entry, depth + 1));
    }
    if (typeof value !== 'object') return [];

    let entries: Array<[string, unknown]>;
    try {
        entries = Object.entries(value);
    } catch {
        return [];
    }
    const indicators = entries
        .filter(([key, entry]) => isProviderErrorIndicatorEntry(key, entry))
        .map(([, entry]) => String(entry));

    return [
        ...(getBoundedErrorName(value) === 'Error' ? ['Error'] : []),
        ...indicators,
        ...getProviderErrorIndicators(getUnknownObjectValueAtPath(value, ['error']), depth + 1),
        ...getProviderErrorIndicators(getUnknownObjectValueAtPath(value, ['errorDetails']), depth + 1),
        ...getProviderErrorIndicators(getUnknownObjectValueAtPath(value, ['details']), depth + 1),
        ...getProviderErrorIndicators(getUnknownObjectValueAtPath(value, ['metadata']), depth + 1),
        ...getProviderErrorIndicators(getUnknownObjectValueAtPath(value, ['cause']), depth + 1),
    ];
};

const getProviderErrorIndicatorText = (error: unknown): string => (
    getProviderErrorIndicators(error).filter(Boolean).join(' ').toLowerCase()
);

const normalizeRetryAfterSeconds = (value: unknown): number | null => {
    if (value === undefined || value === null) return null;
    const normalizedValue = typeof value === 'number'
        ? value
        : typeof value === 'string'
            ? value.trim().match(/^(\d+(?:\.\d+)?)s?$/i)?.[1]
            : undefined;
    if (normalizedValue === undefined) return null;
    const seconds = Number(normalizedValue);
    return Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.ceil(seconds)) : null;
};

export const getAIProviderRetryAfter = (error: unknown): number | null => {
    if (!error || typeof error !== 'object') return null;
    const paths = [
        ['retryAfterSeconds'],
        ['retryAfter'],
        ['retryDelaySeconds'],
        ['retryDelay'],
        ['details', 'retryAfterSeconds'],
        ['details', 'retryAfter'],
        ['details', 'retryDelaySeconds'],
        ['details', 'retryDelay'],
    ];
    for (const path of paths) {
        const retryAfter = normalizeRetryAfterSeconds(getUnknownObjectValueAtPath(error, path));
        if (retryAfter !== null) return retryAfter;
    }
    return null;
};

export const isAIProviderRateLimitError = (error: unknown): boolean => {
    const indicators = getProviderErrorIndicatorText(error);
    return getBoundedErrorNumberAtPath(error, ['status']) === 429 ||
        getBoundedErrorNumberAtPath(error, ['httpStatusCode']) === 429 ||
        getBoundedErrorNumberAtPath(error, ['error', 'code']) === 429 ||
        indicators.includes('429') ||
        indicators.includes('resource_exhausted') ||
        indicators.includes('quota') ||
        indicators.includes('rate_limit') ||
        indicators.includes('too_many_requests');
};
import {
    getBoundedErrorName,
    getBoundedErrorNumberAtPath,
    getUnknownObjectValueAtPath,
} from '@lib/monitoring/boundedLogContext';
