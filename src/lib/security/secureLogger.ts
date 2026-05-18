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
export function sanitizeLogData(data: LogData): LogData {
    const sanitized: LogData = {};
    
    for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Block completely
        if (BLOCKED_FIELDS.has(lowerKey)) {
            sanitized[key] = '[REDACTED]';
            continue;
        }
        
        // Mask partially
        if (MASKED_FIELDS.has(lowerKey) && typeof value === 'string') {
            sanitized[key] = maskValue(value);
            continue;
        }
        
        // Recursively sanitize objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeLogData(value as LogData);
            continue;
        }
        
        // Sanitize arrays
        if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'object' ? sanitizeLogData(item as LogData) : item
            );
            continue;
        }
        
        // Safe to log
        sanitized[key] = value;
    }
    
    return sanitized;
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
        error: {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        ...sanitizedContext
    });
}

/**
 * Check if request contains sensitive data
 */
export function containsSensitiveData(data: any): boolean {
    if (typeof data !== 'object') return false;
    
    for (const key of Object.keys(data)) {
        if (BLOCKED_FIELDS.has(key.toLowerCase())) {
            return true;
        }
        
        if (typeof data[key] === 'object') {
            if (containsSensitiveData(data[key])) {
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
    // In production, send generic message
    if (process.env.NODE_ENV === 'production') {
        return {
            message: 'An error occurred. Please try again.',
            code: 'INTERNAL_ERROR'
        };
    }
    
    // In development, send actual error (but sanitized)
    return {
        message: error.message,
        code: error.name
    };
}
