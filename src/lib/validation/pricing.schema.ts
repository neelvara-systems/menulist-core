/**
 * Pricing Validation Schemas
 * ═══════════════════════════════════════════════════════════════
 *
 * Zod schemas for price validation (FR-4).
 * Part of Pricing Integrity System (Feature #1).
 *
 * Rules:
 * - Max 40 characters
 * - No emojis
 * - No HTML/script tags
 * - Supports: numeric ("299"), text ("Market Price"), range ("199-249")
 */

import { z } from "zod";

export const MENU_PRICE_TEXT_MAX_LENGTH = 40;
const MENU_PRICE_FORBIDDEN_CHARACTER_PATTERN = /[<>{}\[\]\\`|^~\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;
const MENU_PRICE_DECORATION_PATTERN = /[₹$€£¥\s.,/+():\-–—]/g;

const containsEmoji = (value: string): boolean => Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) || 0;
    return (codePoint >= 0x1F000 && codePoint <= 0x1FAFF)
        || (codePoint >= 0x2600 && codePoint <= 0x27BF)
        || codePoint === 0x20E3
        || codePoint === 0xFE0F;
});

const hasNegativeNumericEndpoint = (value: string): boolean => {
    const numericCandidate = value.replace(/[₹$€£¥,\s]/g, '');
    return /(^|[-/–—])-\d/.test(numericCandidate);
};

/**
 * Price string validation schema
 *
 * Validates:
 * - Max 40 characters
 * - Unicode labels plus common price punctuation/currency, without markup/control/emoji characters
 * - No HTML tags or script injections
 * - Trims whitespace
 */
export const priceStringSchema = z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string()
        .min(1, "Price is required")
        .max(MENU_PRICE_TEXT_MAX_LENGTH, `Price must be ${MENU_PRICE_TEXT_MAX_LENGTH} characters or less`)
        .refine((s) => !MENU_PRICE_FORBIDDEN_CHARACTER_PATTERN.test(s), "Price contains invalid characters")
        .refine((s) => !containsEmoji(s), "Price contains invalid characters")
        .refine((s) => s.replace(MENU_PRICE_DECORATION_PATTERN, '').length > 0, "Price must contain a number or label")
        .refine((s) => !hasNegativeNumericEndpoint(s), "Price cannot be negative"));

/**
 * Optional price schema (for items that may not have a base price)
 */
export const optionalPriceSchema = z.preprocess(
    (value) => typeof value === 'string' ? value.trim() : value,
    z.union([priceStringSchema, z.literal(''), z.null(), z.undefined()]),
);

/**
 * Item price update schema
 */
export const updateItemPriceSchema = z.object({
    projectId: z.string().min(1, "Project ID required"),
    itemId: z.string().min(1, "Item ID required"),
    price: optionalPriceSchema,
});

/**
 * Attribute price update schema
 */
export const updateAttributePriceSchema = z.object({
    projectId: z.string().min(1, "Project ID required"),
    itemId: z.string().min(1, "Item ID required"),
    attributeId: z.string().min(1, "Attribute ID required"),
    price: priceStringSchema,
});

/**
 * Batch price update schema
 */
export const batchUpdatePricesSchema = z.object({
    projectId: z.string().min(1, "Project ID required"),
    updates: z
        .array(
            z.object({
                itemId: z.string().min(1),
                price: optionalPriceSchema,
                attributes: z
                    .array(
                        z.object({
                            attributeId: z.string().min(1),
                            price: priceStringSchema,
                        }),
                    )
                    .optional(),
            }),
        )
        .max(50, "Maximum 50 items per batch"),
});

/**
 * Validate a price string
 *
 * @param price - Price string to validate
 * @returns Validation result with success flag and data/error
 */
export function validatePrice(price: string): {
    success: boolean;
    data?: string;
    error?: string;
} {
    const result = priceStringSchema.safeParse(price);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return {
        success: false,
        error: result.error.issues[0]?.message || "Invalid price format",
    };
}

export function normalizeOptionalMenuPrice(price: unknown): {
    success: boolean;
    data?: string;
    error?: string;
} {
    if (price === undefined || price === null) return { success: true, data: '' };
    if (typeof price === 'number') {
        return Number.isFinite(price) && price >= 0
            ? { success: true, data: String(price) }
            : { success: false, error: 'Price must be 0 or more' };
    }
    if (typeof price !== 'string') return { success: false, error: 'Invalid price format' };

    const normalized = price.trim();
    if (!normalized) return { success: true, data: '' };
    return validatePrice(normalized);
}

/**
 * Type exports for use in other modules
 */
export type UpdateItemPriceInput = z.infer<typeof updateItemPriceSchema>;
export type UpdateAttributePriceInput = z.infer<
    typeof updateAttributePriceSchema
>;
export type BatchUpdatePricesInput = z.infer<typeof batchUpdatePricesSchema>;
