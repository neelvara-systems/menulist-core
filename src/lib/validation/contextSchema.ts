/**
 * Canonica — Context Payload Validation Schema
 * 
 * Validates and sanitizes the product context payload sent by client SDKs
 * alongside support queries. Context is TRANSIENT — never stored in Firestore.
 * 
 * Security:
 * - .strip() drops unknown fields silently (prevents injection)
 * - .transform() normalizes values (lowercase, strip special chars)
 * - Size limits enforced per field
 * - No PII patterns allowed
 * 
 * Feature-flagged: ENABLE_CANONICA_CONTEXT_AWARE
 * @see __docs__/canonica/context-aware-support/
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

const ContextStringSchema = z.string()
    .max(MAX_STRING_LENGTH)
    .refine((value) => !SENSITIVE_CONTEXT_PATTERN.test(value), {
        message: 'Context fields must not contain personal contact details',
    })
    .transform(sanitizeContextString);

/**
 * Zod schema for Canonica context payload.
 * All fields optional — system degrades gracefully without context.
 */
export const CanonicaContextSchema = z.object({
    contextVersion: z.number().int().min(1).max(10).optional().default(1),
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
    userRole: ContextStringSchema.optional(),
    plan: ContextStringSchema.optional(),
}).strip().superRefine((value, ctx) => {
    const payloadBytes = new TextEncoder().encode(JSON.stringify(value)).length;
    if (payloadBytes > MAX_CONTEXT_PAYLOAD_BYTES) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Context payload must be 2KB or smaller',
        });
    }
});

export type ValidatedContextPayload = z.infer<typeof CanonicaContextSchema>;
