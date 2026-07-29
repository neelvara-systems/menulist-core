/**
 * Secure Logger - Prevents Sensitive Data Leakage
 * ═══════════════════════════════════════════════════════════════
 * 
 * OWASP A02: Cryptographic Failures
 * - Never log passwords, tokens, API keys
 * - Mask sensitive fields
 * - Sanitize before logging
 * 
 * OWASP A09: Security Logging (proper logging)
 */

type LogData = Record<string, unknown>;

const MAX_ERROR_FIELD_LENGTH = 80;
const MAX_LOG_ARRAY_ITEMS = 50;
const MAX_LOG_OBJECT_KEYS = 50;
const MAX_LOG_STRING_LENGTH = 500;

function getOwnDataEntries(
    value: object,
    limit: number = MAX_LOG_OBJECT_KEYS,
): Array<[string, unknown]> | null {
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

function getOwnDataValue(value: object, key: string): unknown {
    try {
        const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function hasOwnPropertyDescriptor(value: object, key: string): boolean {
    try {
        return Boolean(Reflect.getOwnPropertyDescriptor(value, key));
    } catch {
        return false;
    }
}

/**
 * Fields that should NEVER be logged
 */
const BLOCKED_FIELDS = new Set([
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'apikey',
    'secret',
    'privatekey',
    'creditcard',
    'ssn',
    'cvv',
    'pin'
]);

/**
 * Fields that should be partially masked
 */
const MASKED_FIELDS = new Set([
    'email',
    'phone',
    'ip',
    'sessionid'
]);

/**
 * Sanitize log data to prevent sensitive info leakage
 */
export function sanitizeLogData(data: LogData, seen: WeakSet<object> = new WeakSet()): LogData {
    if (!data || typeof data !== 'object') return {};
    if (seen.has(data)) {
        return { circular: true };
    }

    seen.add(data);
    const sanitized: LogData = {};
    const entries = getOwnDataEntries(data);
    if (!entries) return { inspectionFailed: true };

    for (const [key, value] of entries) {
        // Block completely
        const normalizedKey = normalizeLogFieldKey(key);

        if (BLOCKED_FIELDS.has(normalizedKey)) {
            sanitized[key] = '[REDACTED]';
            continue;
        }

        // Mask partially
        if (MASKED_FIELDS.has(normalizedKey) && typeof value === 'string') {
            sanitized[key] = maskValue(value);
            continue;
        }
        
        // Recursively sanitize objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = seen.has(value)
                ? '[Circular]'
                : sanitizeLogData(value as LogData, seen);
            continue;
        }

        // Sanitize arrays
        if (Array.isArray(value)) {
            const items = getOwnDataEntries(value, MAX_LOG_ARRAY_ITEMS);
            sanitized[key] = items
                ? items
                    .filter(([itemKey]) => /^(?:0|[1-9]\d*)$/.test(itemKey))
                    .sort(([left], [right]) => Number(left) - Number(right))
                    .map(([, item]) => sanitizeArrayLogItem(item, seen))
                : '[Inspection failed]';
            continue;
        }

        if (typeof value === 'string') {
            sanitized[key] = getBoundedLogString(value);
            continue;
        }

        if (
            value === null
            || typeof value === 'number'
            || typeof value === 'boolean'
        ) {
            sanitized[key] = value;
            continue;
        }

        sanitized[key] = `[${typeof value}]`;
    }
    
    return sanitized;
}

function sanitizeArrayLogItem(item: unknown, seen: WeakSet<object>): unknown {
    if (typeof item === 'string') return getBoundedLogString(item);
    if (item && typeof item === 'object') {
        return seen.has(item)
            ? '[Circular]'
            : sanitizeLogData(item as LogData, seen);
    }
    return item;
}

function normalizeLogFieldKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getBoundedLogString(value: string): string {
    return value.length > MAX_LOG_STRING_LENGTH
        ? `${value.slice(0, MAX_LOG_STRING_LENGTH)}...[truncated:${value.length}]`
        : value;
}

/**
 * Mask sensitive values (show first/last chars only)
 */
function maskValue(value: string): string {
    if (value.length <= 4) return '***';
    
    const first = value.slice(0, 2);
    const last = value.slice(-2);
    const masked = '*'.repeat(Math.min(value.length - 4, 10));
    
    return `${first}${masked}${last}`;
}

function getBoundedErrorString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;

    const normalized = value.trim();
    if (!normalized) return undefined;

    return normalized.slice(0, MAX_ERROR_FIELD_LENGTH);
}

function getBoundedErrorStatus(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value !== 'string') return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function sanitizeErrorForLog(error: Error): LogData {
    const name = getOwnDataValue(error, 'name');
    const message = getOwnDataValue(error, 'message');
    const stack = getOwnDataValue(error, 'stack');
    const errorName = typeof name === 'string' ? name : 'Error';
    const safeError: LogData = {
        name: getBoundedErrorString(errorName) || 'Error',
        messagePresent: typeof message === 'string' && message.length > 0,
        messageLength: typeof message === 'string' ? message.length : 0,
        stackPresent: (typeof stack === 'string' && stack.length > 0)
            || hasOwnPropertyDescriptor(error, 'stack'),
        stackLength: typeof stack === 'string' ? stack.length : 0
    };

    const code = getBoundedErrorString(getOwnDataValue(error, 'code'));
    if (code) {
        safeError.code = code;
    }

    const status = getBoundedErrorStatus(getOwnDataValue(error, 'status'));
    if (typeof status === 'number') {
        safeError.status = status;
    }

    const statusCode = getBoundedErrorStatus(getOwnDataValue(error, 'statusCode'));
    if (typeof statusCode === 'number') {
        safeError.statusCode = statusCode;
    }

    return sanitizeLogData(safeError);
}

/**
 * Secure console.log wrapper
 */
export function secureLog(message: string, data?: LogData): void {
    if (data) {
        const sanitized = sanitizeLogData(data);
        console.log(message, sanitized);
    } else {
        console.log(message);
    }
}

/**
 * Secure error logging
 */
export function secureError(message: string, error: Error, context?: LogData): void {
    const sanitizedContext = context ? sanitizeLogData(context) : {};
    
    console.error(message, {
        error: sanitizeErrorForLog(error),
        ...sanitizedContext
    });
}

/**
 * Check if request contains sensitive data
 */
export function containsSensitiveData(data: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
    if (typeof data !== 'object') return false;
    if (data === null) return false;
    if (seen.has(data)) return false;
    seen.add(data);
    
    try {
        for (const key of Reflect.ownKeys(data)) {
            if (typeof key !== 'string') continue;
            if (BLOCKED_FIELDS.has(normalizeLogFieldKey(key))) return true;

            const descriptor = Reflect.getOwnPropertyDescriptor(data, key);
            if (
                descriptor
                && 'value' in descriptor
                && descriptor.value !== null
                && typeof descriptor.value === 'object'
            ) {
                if (containsSensitiveData(descriptor.value, seen)) return true;
            }
        }
    } catch {
        return true;
    }

    return false;
}

/**
 * Sanitize error for client response
 * Never send stack traces or internal details to client
 */
export function sanitizeErrorForClient(error: Error): { message: string; code?: string } {
    const { name } = error;

    // Send generic copy to the browser; keep only a bounded code in development.
    if (process.env.NODE_ENV === 'production') {
        return {
            message: 'An error occurred. Please try again.',
            code: 'INTERNAL_ERROR'
        };
    }
    
    return {
        message: 'An error occurred. Please try again.',
        code: getBoundedErrorString(name) || 'INTERNAL_ERROR'
    };
}
