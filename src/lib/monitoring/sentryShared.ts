import { FEATURE_FLAGS } from '@config/features';
import { sanitizeErrorForLog, sanitizeLogData } from '@lib/security/secureLogger';

const runtimeEnvironment =
    process.env.NEXT_PUBLIC_ENV
    || process.env.VERCEL_ENV
    || process.env.NODE_ENV
    || 'development';

const isDevelopment = runtimeEnvironment === 'development';

function getConfiguredClientSentryDsn(): string {
    const publicProdDsn = String(process.env.NEXT_PUBLIC_SENTRY_DSN || '').trim();
    const publicDevDsn = String(process.env.NEXT_PUBLIC_SENTRY_DEV_DSN || '').trim();

    return isDevelopment ? publicDevDsn || publicProdDsn : publicProdDsn || publicDevDsn;
}

function getConfiguredServerSentryDsn(): string {
    const serverProdDsn = String(process.env.SENTRY_DSN || '').trim();
    const serverDevDsn = String(process.env.SENTRY_DEV_DSN || '').trim();
    const publicDsn = getConfiguredClientSentryDsn();

    return isDevelopment ? serverDevDsn || serverProdDsn || publicDsn : serverProdDsn || publicDsn;
}

const clientDsn = getConfiguredClientSentryDsn();
const serverDsn = getConfiguredServerSentryDsn();

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
    return summarizeMonitoringString('value_present', '1');
}

function getOwnMonitoringEntries(value: object, limit: number): Array<[string, unknown]> | null {
    try {
        const entries: Array<[string, unknown]> = [];
        for (const key of Reflect.ownKeys(value)) {
            if (entries.length >= limit) break;
            if (typeof key !== 'string') continue;
            const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
            if (!descriptor?.enumerable || !('value' in descriptor)) continue;
            entries.push([key, descriptor.value]);
        }
        return entries;
    } catch {
        return null;
    }
}

function isMonitoringError(value: unknown): value is Error {
    try {
        return value instanceof Error;
    } catch {
        return false;
    }
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

    if (isMonitoringError(value)) {
        return sanitizeErrorForLog(value);
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        const entries = getOwnMonitoringEntries(value, 20);
        if (!entries) return '[Inspection failed]';
        return entries
            .filter(([entryKey]) => /^(?:0|[1-9]\d*)$/.test(entryKey))
            .sort(([left], [right]) => Number(left) - Number(right))
            .map(([, entry]) => sanitizeMonitoringValue(entry, depth + 1, key, seen));
    }

    if (typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        const entries = getOwnMonitoringEntries(value, 40);
        if (!entries) return '[Inspection failed]';
        return Object.fromEntries(entries.map(([entryKey, entryValue]) => [
            entryKey,
            sanitizeMonitoringValue(entryValue, depth + 1, entryKey, seen),
        ]));
    }

    return `[${typeof value}]`;
}

export function getSanitizedMonitoringContext(context?: Record<string, unknown>) {
    if (!context) return undefined;
    const sanitized = sanitizeMonitoringValue(context);
    return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
        ? sanitized as Record<string, unknown>
        : { inspectionFailed: true };
}

export function getSanitizedMonitoringMessage(message: string): string {
    return sanitizeMonitoringString(message, 'message').slice(0, 200);
}

function sanitizeMonitoringBreadcrumb(breadcrumb: Record<string, unknown>): Record<string, unknown> {
    const sanitized = sanitizeMonitoringValue(breadcrumb);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) return {};
    return sanitized as Record<string, unknown>;
}

export function sanitizeMonitoringEvent<T extends object>(event: T): T {
    const sanitized = sanitizeMonitoringValue(event);
    if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
        return {} as T;
    }
    const sanitizedEvent = sanitized as Record<string, unknown>;

    if (typeof sanitizedEvent.message === 'string') {
        sanitizedEvent.message = getSanitizedMonitoringMessage(sanitizedEvent.message);
    }
    if (typeof sanitizedEvent.transaction === 'string') {
        sanitizedEvent.transaction = sanitizeMonitoringString(sanitizedEvent.transaction, 'routePath');
    }

    const exception = sanitizedEvent.exception;
    if (exception && typeof exception === 'object' && !Array.isArray(exception)) {
        const exceptionRecord = exception as Record<string, unknown>;
        const values = exceptionRecord.values;
        if (Array.isArray(values)) {
            sanitizedEvent.exception = {
                ...exceptionRecord,
                values: values.map((entry) => {
                    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return {};
                    const entryRecord = entry as Record<string, unknown>;
                    return {
                        ...entryRecord,
                        value: typeof entryRecord.value === 'string'
                            ? summarizeMonitoringString('error_message_present', entryRecord.value)
                            : entryRecord.value,
                    };
                }),
            };
        }
    }

    if (Array.isArray(sanitizedEvent.breadcrumbs)) {
        sanitizedEvent.breadcrumbs = sanitizedEvent.breadcrumbs.map((breadcrumb) => (
            breadcrumb && typeof breadcrumb === 'object' && !Array.isArray(breadcrumb)
                ? sanitizeMonitoringBreadcrumb(breadcrumb as Record<string, unknown>)
                : {}
        ));
    } else if (
        sanitizedEvent.breadcrumbs
        && typeof sanitizedEvent.breadcrumbs === 'object'
        && !Array.isArray(sanitizedEvent.breadcrumbs)
        && Array.isArray((sanitizedEvent.breadcrumbs as Record<string, unknown>).values)
    ) {
        const breadcrumbs = sanitizedEvent.breadcrumbs as Record<string, unknown>;
        sanitizedEvent.breadcrumbs = {
            ...breadcrumbs,
            values: (breadcrumbs.values as unknown[]).map((breadcrumb) => (
                breadcrumb && typeof breadcrumb === 'object' && !Array.isArray(breadcrumb)
                    ? sanitizeMonitoringBreadcrumb(breadcrumb as Record<string, unknown>)
                    : {}
            )),
        };
    }

    return sanitizedEvent as T;
}

type MonitoringScope = {
    setContext: (key: string, value: Record<string, unknown>) => void;
    setTag: (key: string, value: string) => void;
};

export function applyMonitoringContext(scope: MonitoringScope | null | undefined, context?: Record<string, unknown>) {
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
    let message = typeof originalException === 'string' ? originalException : '';
    if (isMonitoringError(originalException)) {
        try {
            const descriptor = Reflect.getOwnPropertyDescriptor(originalException, 'message');
            message = descriptor && 'value' in descriptor && typeof descriptor.value === 'string'
                ? descriptor.value
                : '';
        } catch {
            message = '';
        }
    }

    return !ignoredErrorPatterns.some((pattern) => pattern.test(message));
}
