/**
 * Input Validation & Sanitization
 * ═══════════════════════════════════════════════════════════════
 * 
 * OWASP A03: Injection Prevention
 * - SQL/NoSQL Injection
 * - XSS Prevention
 * - Command Injection
 * - Path Traversal
 * 
 * Use BEFORE any database query or external system call
 */

import { z } from 'zod';
import { getBoundedSecurityStringContext, logSecurityDiagnostic } from './securityDiagnostics';

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input: string): string {
    if (!input) return '';

    return input
        .replace(/[<>]/g, '') // Remove < > to prevent XSS
        .replace(/[;{}()]/g, '') // Remove command injection chars
        .replace(/\.\./g, '') // Remove path traversal
        .trim()
        .slice(0, 10000); // Max length protection
}

/**
 * Validate email format
 */
export const emailSchema = z.string()
    .email('Invalid email format')
    .max(255)
    .transform(val => val.toLowerCase().trim());

/**
 * Validate UUID/Firebase ID
 */
export const idSchema = z.string()
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')
    .min(1)
    .max(100);

/**
 * Validate tenant/store IDs (numeric)
 */
export const numericIdSchema = z.union([
    z.string().regex(/^\d+$/).transform(Number),
    z.number()
]).refine(val => val > 0, 'ID must be positive');

/**
 * Sanitize object for Firestore
 * Prevents NoSQL injection via object properties
 */
export function sanitizeFirestoreQuery(query: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(query)) {
        // Only allow alphanumeric keys
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
            logSecurityDiagnostic('firestore_query_invalid_key_blocked', {
                ...getBoundedSecurityStringContext('queryKey', key),
            });
            continue;
        }

        // Sanitize value based on type
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'number') {
            sanitized[key] = value;
        } else if (typeof value === 'boolean') {
            sanitized[key] = value;
        } else if (value === null) {
            sanitized[key] = null;
        }
        // Skip objects, arrays, functions (potential injection vectors)
    }

    return sanitized;
}

/**
 * Validate file upload
 */
export const fileUploadSchema = z.object({
    name: z.string().max(255).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
    type: z.enum([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/json'
    ])
});

/**
 * Prevent path traversal attacks
 */
export function validatePath(path: string): boolean {
    // Block path traversal patterns
    if (path.includes('..')) return false;
    if (path.includes('~')) return false;
    if (path.startsWith('/')) return false;
    if (path.includes('\\')) return false;

    return true;
}

/**
 * Sanitize URL to prevent SSRF
 */
export function validateURL(url: string, allowedDomains?: string[]): boolean {
    try {
        const parsed = new URL(url);

        // Only allow HTTPS
        if (parsed.protocol !== 'https:') return false;

        // Block private IPs
        const hostname = parsed.hostname;
        if (hostname === 'localhost') return false;
        if (hostname.startsWith('127.')) return false;
        if (hostname.startsWith('192.168.')) return false;
        if (hostname.startsWith('10.')) return false;
        if (hostname.startsWith('172.')) return false;

        // Check allowed domains if specified
        if (allowedDomains && allowedDomains.length > 0) {
            return allowedDomains.some(domain => hostname.endsWith(domain));
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Rate limit key sanitization
 * Prevents cache poisoning
 */
export function sanitizeRateLimitKey(key: string): string {
    return key
        .replace(/[^a-zA-Z0-9:@.-]/g, '_')
        .slice(0, 200);
}

/**
 * XSS Prevention - Escape HTML
 */
export function escapeHTML(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return text.replace(/[&<>"'/]/g, char => map[char]);
}

/**
 * Validate MongoDB-style query operators
 * Prevent NoSQL injection
 */
export function isValidQueryOperator(key: string): boolean {
    const allowedOperators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'];
    return allowedOperators.includes(key);
}

/**
 * Comprehensive input validator for API routes
 */
export function validateAPIInput<T>(
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    data: unknown
): { success: true; data: T } | { success: false; error: string } {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: 'Invalid input' };
        }
        return { success: false, error: 'Invalid input' };
    }
}

export function getSafeZodValidationDetails(error: z.ZodError): {
    issueCount: number;
    issues: Array<{ code: string; field: string }>;
} {
    return {
        issueCount: error.issues.length,
        issues: error.issues.slice(0, 25).map((issue) => ({
            code: issue.code,
            field: issue.path.map(part => String(part)).join('.'),
        })),
    };
}

/**
 * Validate Project ID format
 * Expected format: {tenantId}-{timestamp}-{storeId}
 * 
 * OWASP A03: Injection Prevention
 * 
 * @example
 * validateProjectId('ABC123-1699234567-STORE456') // valid
 * validateProjectId('../../etc/passwd') // invalid
 */
export function validateProjectId(projectId: string): { valid: true; id: string } | { valid: false; error: string } {
    if (!projectId || typeof projectId !== 'string') {
        return { valid: false, error: 'Project ID is required' };
    }

    // Length validation (prevent DoS)
    if (projectId.length > 100) {
        return { valid: false, error: 'Project ID too long (max 100 characters)' };
    }

    if (projectId.length < 3) {
        return { valid: false, error: 'Project ID too short' };
    }

    // Format validation: alphanumeric + hyphens + underscores only
    // Blocks injection characters: ; & | < > $ ( ) ` etc.
    const pattern = /^[a-zA-Z0-9_-]+$/;
    if (!pattern.test(projectId)) {
        return { valid: false, error: 'Invalid project ID format. Only alphanumeric characters, hyphens, and underscores allowed.' };
    }

    // Additional safety: block suspicious patterns
    const suspiciousPatterns = [
        /\.\./,  // Path traversal
        /__proto__/,  // Prototype pollution
        /constructor/,
        /eval/i,
        /script/i,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(projectId)) {
            return { valid: false, error: 'Project ID contains invalid pattern' };
        }
    }

    return { valid: true, id: projectId };
}

/**
 * Validate and sanitize search query
 * Prevents NoSQL injection in search operations
 * 
 * @example
 * validateSearchQuery('menu items') // valid
 * validateSearchQuery('$where: function() { }') // sanitized
 */
export function validateSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
        return '';
    }

    // Remove NoSQL injection operators
    const sanitized = query
        .replace(/\$where/gi, '')
        .replace(/\$regex/gi, '')
        .replace(/\$ne/gi, '')
        .replace(/\$gt/gi, '')
        .replace(/\$lt/gi, '')
        .replace(/\$or/gi, '')
        .replace(/\$and/gi, '')
        // Remove code execution attempts
        .replace(/function\s*\(/gi, '')
        .replace(/eval\s*\(/gi, '')
        .replace(/<script/gi, '')
        // Keep only safe characters
        .replace(/[^a-zA-Z0-9\s\-_.,!?@]/g, '')
        // Limit length
        .slice(0, 200)
        .trim();

    return sanitized;
}

/**
 * Validate Firestore document ID
 * Prevents injection and ensures valid Firestore document ID format
 */
export function validateDocumentId(docId: string): { valid: true; id: string } | { valid: false; error: string } {
    if (!docId || typeof docId !== 'string') {
        return { valid: false, error: 'Document ID is required' };
    }

    // Firestore doc ID constraints
    if (docId.length > 1500) {
        return { valid: false, error: 'Document ID too long (max 1500 bytes)' };
    }

    // Firestore doesn't allow certain characters
    const invalidChars = /[\/\x00]/;
    if (invalidChars.test(docId)) {
        return { valid: false, error: 'Document ID contains invalid characters' };
    }

    // Block reserved names
    const reserved = ['.', '..', '__proto__', 'constructor', 'prototype'];
    if (reserved.includes(docId)) {
        return { valid: false, error: 'Document ID is reserved' };
    }

    return { valid: true, id: docId };
}

/**
 * Validate tenant ID format
 * Tenant IDs should be alphanumeric identifiers
 */
export function validateTenantId(tenantId: string | number): { valid: true; id: string } | { valid: false; error: string } {
    const id = String(tenantId);

    if (!id || id === 'undefined' || id === 'null') {
        return { valid: false, error: 'Tenant ID is required' };
    }

    if (id.length > 50) {
        return { valid: false, error: 'Tenant ID too long' };
    }

    // Alphanumeric only
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return { valid: false, error: 'Invalid tenant ID format' };
    }

    return { valid: true, id };
}

/**
 * Validate store ID format
 */
export function validateStoreId(storeId: string | number): { valid: true; id: string } | { valid: false; error: string } {
    const id = String(storeId);

    if (!id || id === 'undefined' || id === 'null') {
        return { valid: false, error: 'Store ID is required' };
    }

    if (id.length > 50) {
        return { valid: false, error: 'Store ID too long' };
    }

    // Alphanumeric only
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return { valid: false, error: 'Invalid store ID format' };
    }

    return { valid: true, id };
}
