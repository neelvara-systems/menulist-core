/**
 * Answerlattice — Context Payload Validation Schema
 * 
 * Validates and sanitizes the product context payload sent through the v1
 * widget browser contract
 * alongside support queries. Context is TRANSIENT — never stored in Firestore.
 * 
 * Security:
 * - .strip() drops unknown fields silently (prevents injection)
 * - .transform() normalizes values (lowercase, strip special chars)
 * - Size limits enforced per field
 * - No PII patterns allowed
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_CONTEXT_AWARE
 * @see __docs__/answerlattice/context-aware-support/
 */

import { z } from 'zod';

const MAX_STRING_LENGTH = 100;
const MAX_ENTITY_HINTS = 5;
const MAX_HINT_LENGTH = 64;
const MAX_CONTEXT_PAYLOAD_BYTES = 2048;
const SENSITIVE_CONTEXT_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

/**
 * Sanitize a context string field:
 * - trim whitespace
 * - lowercase
 * - strip everything except alphanumeric, underscore, hyphen
 * - cap at MAX_STRING_LENGTH
 */
const sanitizeContextString = (val: string) =>
    val.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, MAX_STRING_LENGTH);

const sanitizeContextTitle = (val: string) =>
    val.trim().replace(/[<>{}]/g, '').replace(/\s+/g, ' ').slice(0, 120);

const normalizeContextPath = (val: string) => {
    let route = val.trim();
    if (!route) return '';
    try {
        if (/^https?:\/\//i.test(route)) {
            route = new URL(route).pathname || '/';
        }
    } catch {
        return '';
    }
    route = route.split(/[?#]/)[0]?.trim() || '';
    if (!route) return '';
    if (!route.startsWith('/')) route = `/${route}`;
    route = route.replace(/\/{2,}/g, '/');
    if (route.length > 1 && route.endsWith('/')) route = route.slice(0, -1);
    return route.slice(0, 180);
};

const ContextStringSchema = z.string()
    .max(MAX_STRING_LENGTH)
    .refine((value) => !SENSITIVE_CONTEXT_PATTERN.test(value), {
        message: 'Context fields must not contain personal contact details',
    })
    .transform(sanitizeContextString);

const ContextTitleSchema = z.string()
    .max(120)
    .refine((value) => !SENSITIVE_CONTEXT_PATTERN.test(value), {
        message: 'Context title must not contain personal contact details',
    })
    .transform(sanitizeContextTitle);

const ContextPathSchema = z.string()
    .max(256)
    .refine((value) => !SENSITIVE_CONTEXT_PATTERN.test(value), {
        message: 'Context path must not contain personal contact details',
    })
    .transform(normalizeContextPath)
    .refine(Boolean, {
        message: 'Context path must be a route path',
    });

/**
 * Zod schema for Answerlattice context payload.
 * All fields optional — system degrades gracefully without context.
 */
export const AnswerlatticeContextSchema = z.object({
    contextVersion: z.number().int().min(1).max(10).optional().default(1),
    path: ContextPathSchema.optional(),
    title: ContextTitleSchema.optional(),
    contextKey: ContextStringSchema.optional(),
    feature: ContextStringSchema.optional(),
    page: ContextStringSchema.optional(),
    workflow: ContextStringSchema.optional(),
    entityHints: z.array(
        z.string()
            .max(MAX_HINT_LENGTH)
            .refine((value) => !SENSITIVE_CONTEXT_PATTERN.test(value), {
                message: 'Context hints must not contain personal contact details',
            })
            .transform(s => s.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, ''))
    ).max(MAX_ENTITY_HINTS).optional(),
    role: ContextStringSchema.optional(),
    locale: ContextStringSchema.optional(),
    // Internal normalized fields used by the existing retrieval engine.
    // Public v1 install docs expose path/title/role instead.
    userRole: ContextStringSchema.optional(),
    plan: ContextStringSchema.optional(),
    state: ContextStringSchema.optional(),
}).strip().transform((value) => {
    const normalized = { ...value };
    if (normalized.role && !normalized.userRole) normalized.userRole = normalized.role;
    if (normalized.path && !normalized.page) {
        normalized.page = sanitizeContextString(normalized.path.replace(/^\/+/, '').replace(/\//g, '_') || 'home');
    }
    return normalized;
}).superRefine((value, ctx) => {
    const payloadBytes = new TextEncoder().encode(JSON.stringify(value)).length;
    if (payloadBytes > MAX_CONTEXT_PAYLOAD_BYTES) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Context payload must be 2KB or smaller',
        });
    }
});

export type ValidatedContextPayload = z.infer<typeof AnswerlatticeContextSchema>;
