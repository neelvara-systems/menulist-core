/**
 * Pricing Validation Schemas
 * ═══════════════════════════════════════════════════════════════
 *
 * Zod schemas for price validation (FR-4).
 * Part of Pricing Integrity System (Feature #1).
 *
 * Rules:
 * - Max 20 characters
 * - No emojis
 * - No HTML/script tags
 * - Supports: numeric ("299"), text ("Market Price"), range ("199-249")
 */

import { z } from "zod";

/**
 * Price string validation schema
 *
 * Validates:
 * - Max 20 characters
 * - Allowed characters: alphanumeric, spaces, hyphens, dots, slashes, currency symbols
 * - No HTML tags or script injections
 * - Trims whitespace
 */
export const priceStringSchema = z
    .string()
    .max(20, "Price must be 20 characters or less")
    .regex(/^[a-zA-Z0-9\s\-\.\/₹\$€£¥]+$/, "Price contains invalid characters")
    .transform((s) => s.trim())
    .refine((s) => !/<|>|&|script/i.test(s), "Price cannot contain HTML");

/**
 * Optional price schema (for items that may not have a base price)
 */
export const optionalPriceSchema = priceStringSchema.optional().nullable();

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

/**
 * Type exports for use in other modules
 */
export type UpdateItemPriceInput = z.infer<typeof updateItemPriceSchema>;
export type UpdateAttributePriceInput = z.infer<
    typeof updateAttributePriceSchema
>;
export type BatchUpdatePricesInput = z.infer<typeof batchUpdatePricesSchema>;
