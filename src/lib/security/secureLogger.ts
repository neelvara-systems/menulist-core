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

type LogData = Record<string, any>;

const MAX_ERROR_FIELD_LENGTH = 80;
const MAX_LOG_ARRAY_ITEMS = 50;
const MAX_LOG_OBJECT_KEYS = 50;
const MAX_LOG_STRING_LENGTH = 500;

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
    if (seen.has(data)) {
        return { circular: true };
    }

    seen.add(data);
    const sanitized: LogData = {};
    
    for (const [key, value] of Object.entries(data).slice(0, MAX_LOG_OBJECT_KEYS)) {
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
            sanitized[key] = value.slice(0, MAX_LOG_ARRAY_ITEMS).map(item => sanitizeArrayLogItem(item, seen));
            continue;
        }

        if (typeof value === 'string') {
            sanitized[key] = getBoundedLogString(value);
            continue;
        }

        // Safe to log
        sanitized[key] = value;
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
    const { name, message, stack } = error;
    const errorRecord = error as Error & Record<string, unknown>;
    const safeError: LogData = {
        name: getBoundedErrorString(name) || 'Error',
        messagePresent: typeof message === 'string' && message.length > 0,
        messageLength: typeof message === 'string' ? message.length : 0,
        stackPresent: typeof stack === 'string' && stack.length > 0,
        stackLength: typeof stack === 'string' ? stack.length : 0
    };

    const code = getBoundedErrorString(errorRecord.code);
    if (code) {
        safeError.code = code;
    }

    const status = getBoundedErrorStatus(errorRecord.status);
    if (typeof status === 'number') {
        safeError.status = status;
    }

    const statusCode = getBoundedErrorStatus(errorRecord.statusCode);
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
export function containsSensitiveData(data: any, seen: WeakSet<object> = new WeakSet()): boolean {
    if (typeof data !== 'object') return false;
    if (data === null) return false;
    if (seen.has(data)) return false;
    seen.add(data);
    
    for (const key of Object.keys(data)) {
        if (BLOCKED_FIELDS.has(normalizeLogFieldKey(key))) {
            return true;
        }
        
        if (typeof data[key] === 'object') {
            if (containsSensitiveData(data[key], seen)) {
                return true;
            }
        }
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
