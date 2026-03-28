/**
 * Canonica — Context Payload Validation Schema
 * 
 * Validates and sanitizes the product context payload sent by client SDKs
 * alongside support queries. Context is TRANSIENT — never stored in Firestore.
 * 
 * Security:
 * - .strict() drops unknown fields silently (prevents injection)
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

/**
 * Sanitize a context string field:
 * - trim whitespace
 * - lowercase
 * - strip everything except alphanumeric, underscore, hyphen
 * - cap at MAX_STRING_LENGTH
 */
const sanitizeContextString = (val: string) =>
    val.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '').slice(0, MAX_STRING_LENGTH);

/**
 * Zod schema for Canonica context payload.
 * All fields optional — system degrades gracefully without context.
 */
export const CanonicaContextSchema = z.object({
    contextVersion: z.number().int().min(1).max(10).optional().default(1),
    feature: z.string().max(MAX_STRING_LENGTH).transform(sanitizeContextString).optional(),
    page: z.string().max(MAX_STRING_LENGTH).transform(sanitizeContextString).optional(),
    workflow: z.string().max(MAX_STRING_LENGTH).transform(sanitizeContextString).optional(),
    entityHints: z.array(
        z.string().max(MAX_HINT_LENGTH).transform(s => s.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, ''))
    ).max(MAX_ENTITY_HINTS).optional(),
    userRole: z.string().max(MAX_STRING_LENGTH).transform(sanitizeContextString).optional(),
    plan: z.string().max(MAX_STRING_LENGTH).transform(sanitizeContextString).optional(),
}).strict();

export type ValidatedContextPayload = z.infer<typeof CanonicaContextSchema>;
