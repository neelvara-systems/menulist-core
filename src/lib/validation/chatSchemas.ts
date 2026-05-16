/**
 * Chat Input Validation Schemas
 * 
 * Validates all user inputs on backend to prevent:
 * - Injection attacks (XSS, SQL injection, command injection)
 * - Memory crashes from oversized inputs
 * - Type errors from invalid data
 * - API abuse
 * - Malicious URLs
 * 
 * Uses Zod for runtime type checking and validation.
 */

import { z } from 'zod';

// Security: Detect potentially malicious patterns
const containsMaliciousPattern = (str: string): boolean => {
    const maliciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,  // Script tags
        /javascript:/gi,                  // javascript: protocol
        /on\w+\s*=/gi,                   // Event handlers (onclick, onerror, etc.)
        /data:text\/html/gi,              // Data URLs with HTML
        /<iframe/gi,                      // Iframes
        /eval\s*\(/gi,                    // eval() calls
        /expression\s*\(/gi               // CSS expressions
    ];

    return maliciousPatterns.some(pattern => pattern.test(str));
};

// Chat message schema for conversation history
const ChatMessageSchema = z.object({
    role: z.enum(['user', 'assistant']),

    // User message content validation
    content: z.string()
        .max(2000, 'Message content too long (max 2000 characters)')
        .refine(
            (val) => !containsMaliciousPattern(val),
            { message: 'Message contains potentially malicious content' }
        )
        .optional(),

    // AI answer validation  
    craftedAnswer: z.string()
        .max(10000, 'Answer too long (max 10000 characters)')
        .optional(),

    // Image validation (optional)
    image: z.object({
        url: z.string().url().optional(),
        name: z.string().optional(),
        size: z.number().optional()
    }).nullable().optional()
});

// Main search request schema with comprehensive validation
export const SearchRequestSchema = z.object({
    // Query validation (most critical - prevents XSS, injection, buffer overflow)
    query: z.string()
        .min(1, 'Query cannot be empty')
        .max(2000, 'Query too long (max 2000 characters)')
        .trim()
        .refine(
            (val) => /\S/.test(val),
            { message: 'Query cannot be only whitespace' }
        )
        .refine(
            (val) => !containsMaliciousPattern(val),
            { message: 'Query contains potentially malicious content' }
        )
        .refine(
            (val) => {
                // Prevent extremely long words (potential buffer overflow)
                const words = val.split(/\s+/);
                return words.every(word => word.length <= 100);
            },
            { message: 'Query contains unreasonably long words' }
        ),

    // Image URL validation (strict security - only Firebase Storage)
    imageUrl: z.string()
        .url('Invalid image URL format')
        .max(500, 'Image URL too long')
        .startsWith('https://', 'Image URL must use HTTPS')
        .refine(
            (val) => {
                // Only allow Firebase Storage
                const allowedHosts = ['firebasestorage.googleapis.com'];
                try {
                    const url = new URL(val);
                    return allowedHosts.includes(url.hostname);
                } catch {
                    return false;
                }
            },
            { message: 'Only Firebase Storage URLs are allowed' }
        )
        .refine(
            (val) => {
                // Prevent path traversal attacks
                return !val.includes('..') && !val.includes('%2e%2e');
            },
            { message: 'Invalid characters in image URL' }
        )
        .optional()
        .nullable(),

    // Mode validation (only allow 'qna' or 'assistant')
    mode: z.enum(['qna', 'assistant']),

    // Context validation (for assistant mode conversations)
    context: z.array(ChatMessageSchema)
        .max(5, 'Context limited to last 5 messages for performance')
        .refine(
            (arr) => {
                // Validate alternating user/assistant messages
                if (!arr || arr.length === 0) return true;
                return arr.every((msg, i) => {
                    if (i === 0) return true; // First message can be anything
                    const prevRole = arr[i - 1].role;
                    return msg.role !== prevRole; // Roles should alternate
                });
            },
            { message: 'Context messages must alternate between user and assistant' }
        )
        .optional()
        .nullable(),

    // Context-aware support metadata. This is validated again by
    // CanonicaContextSchema in the route so conversation history and product
    // context stay separately owned.
    productContext: z.unknown().optional(),

    // AI Failure Escalation (Item #8) — session failure count for S3 repeated failure trigger
    sessionFailureCount: z.number()
        .int()
        .min(0)
        .max(100) // Reasonable upper bound
        .optional()
});

export type SearchRequestInput = z.infer<typeof SearchRequestSchema>;

/**
 * Validate search request
 * Returns validated data or throws ZodError with detailed messages
 */
export function validateSearchRequest(data: unknown): SearchRequestInput {
    return SearchRequestSchema.parse(data);
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidateSearchRequest(data: unknown) {
    return SearchRequestSchema.safeParse(data);
}
