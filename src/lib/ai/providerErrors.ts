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

    const record = value as Record<string, unknown>;
    const indicators = Object.entries(record)
        .filter(([key, entry]) => isProviderErrorIndicatorEntry(key, entry))
        .map(([, entry]) => String(entry));

    return [
        ...(value instanceof Error ? [value.name] : []),
        ...indicators,
        ...getProviderErrorIndicators(record.error, depth + 1),
        ...getProviderErrorIndicators(record.errorDetails, depth + 1),
        ...getProviderErrorIndicators(record.details, depth + 1),
        ...getProviderErrorIndicators(record.metadata, depth + 1),
        ...getProviderErrorIndicators(record.cause, depth + 1),
    ];
};

const getProviderErrorIndicatorText = (error: unknown): string => (
    getProviderErrorIndicators(error).filter(Boolean).join(' ').toLowerCase()
);

const normalizeRetryAfterSeconds = (value: unknown): number | null => {
    if (value === undefined || value === null) return null;
    const normalizedValue = typeof value === 'string'
        ? value.trim().match(/^(\d+(?:\.\d+)?)s?$/i)?.[1]
        : value;
    if (normalizedValue === undefined) return null;
    const seconds = Number(normalizedValue);
    return Number.isFinite(seconds) && seconds > 0 ? Math.max(1, Math.ceil(seconds)) : null;
};

export const getAIProviderRetryAfter = (error: any): number | null => {
    if (!error || typeof error !== 'object') return null;
    const source = error as {
        retryAfterSeconds?: unknown;
        retryAfter?: unknown;
        retryDelaySeconds?: unknown;
        retryDelay?: unknown;
        details?: {
            retryAfterSeconds?: unknown;
            retryAfter?: unknown;
            retryDelaySeconds?: unknown;
            retryDelay?: unknown;
        };
    };
    return normalizeRetryAfterSeconds(
        source.retryAfterSeconds ??
        source.retryAfter ??
        source.retryDelaySeconds ??
        source.retryDelay ??
        source.details?.retryAfterSeconds ??
        source.details?.retryAfter ??
        source.details?.retryDelaySeconds ??
        source.details?.retryDelay,
    );
};

export const isAIProviderRateLimitError = (error: any): boolean => {
    const indicators = getProviderErrorIndicatorText(error);
    return error?.status === 429 ||
        error?.httpStatusCode === 429 ||
        error?.error?.code === 429 ||
        indicators.includes('429') ||
        indicators.includes('resource_exhausted') ||
        indicators.includes('quota') ||
        indicators.includes('rate_limit') ||
        indicators.includes('too_many_requests');
};
