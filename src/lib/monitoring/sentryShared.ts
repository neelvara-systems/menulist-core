import { FEATURE_FLAGS } from '@config/features';
import { sanitizeErrorForLog, sanitizeLogData } from '@lib/security/secureLogger';

const runtimeEnvironment =
    process.env.NEXT_PUBLIC_ENV
    || process.env.VERCEL_ENV
    || process.env.NODE_ENV
    || 'development';

const isDevelopment = runtimeEnvironment === 'development';
const FALLBACK_DEV_DSN = 'https://6d8940082c1030ff67af7e2345684dc9@o4510276442062848.ingest.us.sentry.io/4510276910710784';
const FALLBACK_PROD_DSN = 'https://74bb29116e9ac34f9e0b97a8121b95c7@o4510276442062848.ingest.us.sentry.io/4510276442259456';

const clientDsn = isDevelopment
    ? process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || FALLBACK_DEV_DSN
    : process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || FALLBACK_PROD_DSN;

const serverDsn = isDevelopment
    ? process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || clientDsn
    : process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || clientDsn;

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

export const isSentryMonitoringEnabled =
    FEATURE_FLAGS.ENABLE_SENTRY && Boolean(clientDsn || serverDsn);

const MONITORING_SENSITIVE_KEYS = new Set([
    'businessname',
    'customername',
    'displayemail',
    'displayname',
    'email',
    'name',
    'ownername',
    'phone',
    'phoneusername',
    'storename',
    'tenantname',
    'username',
]);

const MONITORING_IDENTIFIER_KEYS = new Set([
    'articleid',
    'customerid',
    'fileid',
    'id',
    'jobid',
    'orderid',
    'projectid',
    'providerid',
    'requestid',
    'sessionid',
    'sourceid',
    'storeid',
    'tenantid',
    'transactionid',
    'sid',
    'tid',
    'userid',
]);

const MONITORING_PATH_KEYS = new Set([
    'endpoint',
    'from',
    'pathname',
    'route',
    'routepath',
    'to',
    'url',
]);

const MONITORING_SUMMARY_PATTERN = /^\[[a-z_]+:length=\d+\]$/;
const MONITORING_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const MONITORING_ROUTE_PATTERN = /(?:^|\s)(?:https?:\/\/|\/[A-Za-z0-9._~/?#[\]@!$&'()*+,;=:%-]+)|[?&][A-Za-z0-9._~-]+=/i;
const MONITORING_SECRET_VALUE_PATTERN = /\b(?:bearer\s+[A-Za-z0-9._~+/=-]+|(?:token|api[_-]?key|secret|password|authorization)=\S+)/i;

function normalizeMonitoringKey(key?: string): string {
    return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function summarizeMonitoringString(kind: string, value: string): string {
    return `[${kind}:length=${value.length}]`;
}

function sanitizeMonitoringString(value: string, key?: string): string {
    if (MONITORING_SUMMARY_PATTERN.test(value)) return value;

    const normalizedKey = normalizeMonitoringKey(key);
    if (MONITORING_SENSITIVE_KEYS.has(normalizedKey)) return summarizeMonitoringString('redacted', value);
    if (MONITORING_IDENTIFIER_KEYS.has(normalizedKey)) return summarizeMonitoringString('identifier_present', value);
    if (MONITORING_PATH_KEYS.has(normalizedKey)) return summarizeMonitoringString('path_present', value);
    if (MONITORING_EMAIL_PATTERN.test(value) || MONITORING_SECRET_VALUE_PATTERN.test(value)) {
        return summarizeMonitoringString('redacted', value);
    }
    if (MONITORING_ROUTE_PATTERN.test(value)) return summarizeMonitoringString('path_present', value);

    const fieldKey = key || 'value';
    const sanitized = sanitizeLogData({ [fieldKey]: value })[fieldKey];
    return typeof sanitized === 'string' ? sanitized : String(sanitized || '');
}

function getSafeMonitoringTagValue(key: string, value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number' || typeof value === 'boolean') {
        return MONITORING_IDENTIFIER_KEYS.has(normalizeMonitoringKey(key))
            ? summarizeMonitoringString('identifier_present', String(value))
            : String(value);
    }
    if (typeof value === 'string') return sanitizeMonitoringString(value, key).slice(0, 200);
    return summarizeMonitoringString('value_present', String(value));
}

function sanitizeMonitoringValue(
    value: unknown,
    depth: number = 0,
    key?: string,
    seen: WeakSet<object> = new WeakSet()
): unknown {
    if (value == null) return value;
    if (depth >= 4) return '[Truncated]';

    if (typeof value === 'string') {
        return sanitizeMonitoringString(value, key);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        if (MONITORING_IDENTIFIER_KEYS.has(normalizeMonitoringKey(key))) {
            return summarizeMonitoringString('identifier_present', String(value));
        }
        return value;
    }

    if (value instanceof Error) {
        return sanitizeErrorForLog(value);
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return value.slice(0, 20).map((entry) => sanitizeMonitoringValue(entry, depth + 1, key, seen));
    }

    if (typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .slice(0, 40)
                .map(([entryKey, entryValue]) => [entryKey, sanitizeMonitoringValue(entryValue, depth + 1, entryKey, seen)])
        );
    }

    return String(value);
}

export function getSanitizedMonitoringContext(context?: Record<string, unknown>) {
    if (!context) return undefined;
    return sanitizeMonitoringValue(context) as Record<string, unknown>;
}

export function getSanitizedMonitoringMessage(message: string): string {
    return sanitizeMonitoringString(message, 'message').slice(0, 200);
}

function sanitizeMonitoringBreadcrumb(breadcrumb: Record<string, unknown>): Record<string, unknown> {
    return {
        ...breadcrumb,
        data: sanitizeMonitoringValue(breadcrumb.data),
        message: typeof breadcrumb.message === 'string'
            ? getSanitizedMonitoringMessage(breadcrumb.message)
            : breadcrumb.message,
    };
}

export function sanitizeMonitoringEvent<T extends object>(event: T): T {
    const sanitizedEvent: Record<string, any> = { ...(event as Record<string, any>) };

    if (typeof sanitizedEvent.message === 'string') {
        sanitizedEvent.message = getSanitizedMonitoringMessage(sanitizedEvent.message);
    }
    if (typeof sanitizedEvent.transaction === 'string') {
        sanitizedEvent.transaction = sanitizeMonitoringString(sanitizedEvent.transaction, 'routePath');
    }

    if (sanitizedEvent.exception && Array.isArray(sanitizedEvent.exception.values)) {
        sanitizedEvent.exception = {
            ...sanitizedEvent.exception,
            values: sanitizedEvent.exception.values.map((entry: Record<string, unknown>) => ({
                ...entry,
                mechanism: sanitizeMonitoringValue(entry.mechanism),
                type: typeof entry.type === 'string'
                    ? sanitizeMonitoringString(entry.type, 'errorType').slice(0, 120)
                    : entry.type,
                value: typeof entry.value === 'string'
                    ? summarizeMonitoringString('error_message_present', entry.value)
                    : entry.value,
            })),
        };
    }

    if (sanitizedEvent.extra) sanitizedEvent.extra = sanitizeMonitoringValue(sanitizedEvent.extra);
    if (sanitizedEvent.contexts) sanitizedEvent.contexts = sanitizeMonitoringValue(sanitizedEvent.contexts);
    if (sanitizedEvent.tags) sanitizedEvent.tags = sanitizeMonitoringValue(sanitizedEvent.tags);
    if (sanitizedEvent.user) sanitizedEvent.user = sanitizeMonitoringValue(sanitizedEvent.user);
    if (sanitizedEvent.request) sanitizedEvent.request = sanitizeMonitoringValue(sanitizedEvent.request);
    if (sanitizedEvent.fingerprint) sanitizedEvent.fingerprint = sanitizeMonitoringValue(sanitizedEvent.fingerprint);

    if (Array.isArray(sanitizedEvent.breadcrumbs)) {
        sanitizedEvent.breadcrumbs = sanitizedEvent.breadcrumbs.map(sanitizeMonitoringBreadcrumb);
    } else if (Array.isArray(sanitizedEvent.breadcrumbs?.values)) {
        sanitizedEvent.breadcrumbs = {
            ...sanitizedEvent.breadcrumbs,
            values: sanitizedEvent.breadcrumbs.values.map(sanitizeMonitoringBreadcrumb),
        };
    }

    return sanitizedEvent as T;
}

export function applyMonitoringContext(scope: any, context?: Record<string, unknown>) {
    const sanitizedContext = getSanitizedMonitoringContext(context);
    if (!scope || !sanitizedContext) return;

    const tagKeys = [
        'action',
        'buildId',
        'endpoint',
        'environment',
        'fileId',
        'model',
        'projectId',
        'requestId',
        'routePath',
        'shortBuildId',
        'source',
        'sourceLang',
        'storeId',
        'targetLang',
        'tenantId',
        'userId',
    ];

    for (const key of tagKeys) {
        const value = sanitizedContext[key];
        const tagValue = getSafeMonitoringTagValue(key, value);
        if (tagValue) {
            scope.setTag(key, tagValue);
        }
    }

    if (Array.isArray(sanitizedContext.targetLangs)) {
        const targetLangs = sanitizedContext.targetLangs
            .map((value) => getSafeMonitoringTagValue('targetLang', value))
            .filter(Boolean)
            .join(',');
        if (targetLangs) scope.setTag('targetLangs', targetLangs);
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
