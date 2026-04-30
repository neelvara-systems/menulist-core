const runtimeEnvironment =
    process.env.NEXT_PUBLIC_ENV
    || process.env.VERCEL_ENV
    || process.env.NODE_ENV
    || 'development';

const isDevelopment = runtimeEnvironment === 'development';

const clientDsn = isDevelopment
    ? process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || ''
    : process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || '';

const serverDsn = isDevelopment
    ? process.env.SENTRY_DSN || clientDsn
    : process.env.SENTRY_DSN || clientDsn;

const ignoredErrorPatterns = [
    /ResizeObserver loop limit exceeded/i,
    /Non-Error promise rejection captured/i,
];

export const monitoringEnvironment = runtimeEnvironment;
export const monitoringRelease =
    process.env.SENTRY_RELEASE
    || process.env.NEXT_PUBLIC_BUILD_ID
    || process.env.VERCEL_GIT_COMMIT_SHA
    || 'local';

export const monitoringDsn = {
    client: clientDsn,
    server: serverDsn,
};

function sanitizeMonitoringValue(value: unknown, depth: number = 0): unknown {
    if (value == null) return value;
    if (depth >= 4) return '[Truncated]';

    if (typeof value === 'string') {
        return value.length > 1200 ? `${value.slice(0, 1200)}...[truncated]` : value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (value instanceof Error) {
        return {
            message: value.message,
            name: value.name,
            stack: value.stack?.split('\n').slice(0, 8).join('\n'),
        };
    }

    if (Array.isArray(value)) {
        return value.slice(0, 20).map((entry) => sanitizeMonitoringValue(entry, depth + 1));
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .slice(0, 40)
                .map(([key, entryValue]) => [key, sanitizeMonitoringValue(entryValue, depth + 1)])
        );
    }

    return String(value);
}

export function getSanitizedMonitoringContext(context?: Record<string, unknown>) {
    if (!context) return undefined;
    return sanitizeMonitoringValue(context) as Record<string, unknown>;
}

export function applyMonitoringContext(scope: any, context?: Record<string, unknown>) {
    const sanitizedContext = getSanitizedMonitoringContext(context);
    if (!scope || !sanitizedContext) return;

    const tagKeys = [
        'action',
        'endpoint',
        'fileId',
        'model',
        'projectId',
        'requestId',
        'sourceLang',
        'storeId',
        'targetLang',
        'tenantId',
        'userId',
    ];

    for (const key of tagKeys) {
        const value = sanitizedContext[key];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            scope.setTag(key, String(value));
        }
    }

    if (Array.isArray(sanitizedContext.targetLangs)) {
        scope.setTag('targetLangs', sanitizedContext.targetLangs.join(','));
    }

    scope.setContext('details', sanitizedContext);
}

export function shouldSendMonitoringEvent(hint?: { originalException?: unknown }) {
    const originalException = hint?.originalException;
    const message = originalException instanceof Error
        ? originalException.message
        : String(originalException || '');

    return !ignoredErrorPatterns.some((pattern) => pattern.test(message));
}

