/**
 * Zod Validation Schemas for Extraction
 * 
 * Spec Reference: ai-extraction-integration.md Part 4E (Zod Validation)
 * 
 * Authority-sensitive write gates for multi-outlet scenarios.
 */

import { z } from 'zod';
import { normalizeMenuExtractionJobId } from '@lib/menu-extraction/jobIdBoundary';
import { normalizeMenuExtractionProjectId } from '@lib/menu-extraction/projectIdBoundary';

// ═══════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Multilingual name object
 */
export const MultilingualNameSchema = z.record(z.string(), z.string());

/**
 * Price string validation
 * - Must contain at least one digit
 * - Max 20 characters
 * - No HTML tags
 */
export const PriceSchema = z.string()
    .max(20, 'Price too long')
    .refine(val => /[0-9]/.test(val), 'Price must contain at least one digit')
    .refine(val => !/<[^>]*>/.test(val), 'Price cannot contain HTML');

/**
 * Optional price (can be empty string or undefined)
 */
export const OptionalPriceSchema = z.union([
    PriceSchema,
    z.literal(''),
    z.undefined(),
]);

// ═══════════════════════════════════════════════════════════════════════════
// ITEM SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Item override schema (for outlet projects)
 */
export const ItemOverrideSchema = z.object({
    price: OptionalPriceSchema,
    available: z.boolean().optional(),
    active: z.boolean().optional(),
    orderIndex: z.number().optional(),
    isBestSeller: z.boolean().optional(),
});

/**
 * Category override schema (for outlet projects)
 */
export const CategoryOverrideSchema = z.object({
    orderIndex: z.number().optional(),
    active: z.boolean().optional(),
});

/**
 * New item schema
 */
export const NewItemSchema = z.object({
    id: z.string().min(1),
    name: MultilingualNameSchema,
    category: z.string().min(1),
    price: OptionalPriceSchema,
    description: MultilingualNameSchema.optional(),
    active: z.boolean().default(true),
    available: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
    attributes: z.array(z.object({
        id: z.string(),
        name: MultilingualNameSchema,
        price: OptionalPriceSchema,
        active: z.boolean().optional(),
    })).optional(),
});

/**
 * New category schema
 */
export const NewCategorySchema = z.object({
    id: z.string().min(1),
    name: MultilingualNameSchema,
    orderIndex: z.number().optional(),
    active: z.boolean().default(true),
});

// ═══════════════════════════════════════════════════════════════════════════
// APPLY CHANGES SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

const MenuExtractionProjectIdSchema = z.string()
    .trim()
    .refine((value) => normalizeMenuExtractionProjectId(value) === value, 'Invalid project ID');

const MenuExtractionJobIdSchema = z.string()
    .trim()
    .refine((value) => normalizeMenuExtractionJobId(value) === value, 'Invalid job ID');

/**
 * Schema for applying item override (outlet projects)
 */
export const ApplyItemOverrideSchema = z.object({
    projectId: MenuExtractionProjectIdSchema,
    masterItemId: z.string().min(1),
    override: ItemOverrideSchema,
});

/**
 * Schema for saving extraction review
 */
export const SaveExtractionReviewSchema = z.object({
    projectId: MenuExtractionProjectIdSchema,
    jobId: MenuExtractionJobIdSchema,
    mode: z.enum(['SINGLE_STORE', 'MASTER_PROJECT', 'OUTLET_LINKED']),

    // For SINGLE_STORE / MASTER_PROJECT
    projectMutations: z.object({
        upsertCategories: z.array(z.object({
            categoryId: z.string().optional(),
            newCategory: NewCategorySchema.optional(),
            patch: z.record(z.string(), z.unknown()).optional(),
            targetFileUid: z.string(),
        })),
        upsertItems: z.array(z.object({
            itemId: z.string().optional(),
            newItem: NewItemSchema.optional(),
            patch: z.record(z.string(), z.unknown()).optional(),
            targetFileUid: z.string(),
        })),
    }).optional(),

    // For OUTLET_LINKED
    outletMutations: z.object({
        upsertLocalCategories: z.array(NewCategorySchema),
        upsertLocalItems: z.array(NewItemSchema),
        applyOverrides: z.array(z.object({
            masterItemId: z.string(),
            patch: ItemOverrideSchema,
        })),
        applyCategoryOverrides: z.array(z.object({
            masterCategoryId: z.string(),
            patch: CategoryOverrideSchema,
        })).optional(),
    }).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate item override before applying
 */
export function validateItemOverride(data: unknown) {
    return ApplyItemOverrideSchema.safeParse(data);
}

/**
 * Validate extraction review save payload
 */
export function validateSaveExtractionReview(data: unknown) {
    return SaveExtractionReviewSchema.safeParse(data);
}

/**
 * Validate new item
 */
export function validateNewItem(data: unknown) {
    return NewItemSchema.safeParse(data);
}

/**
 * Validate new category
 */
export function validateNewCategory(data: unknown) {
    return NewCategorySchema.safeParse(data);
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type ItemOverride = z.infer<typeof ItemOverrideSchema>;
export type CategoryOverride = z.infer<typeof CategoryOverrideSchema>;
export type NewItem = z.infer<typeof NewItemSchema>;
export type NewCategory = z.infer<typeof NewCategorySchema>;
export type ApplyItemOverrideInput = z.infer<typeof ApplyItemOverrideSchema>;
export type SaveExtractionReviewInput = z.infer<typeof SaveExtractionReviewSchema>;

export default {
    validateItemOverride,
    validateSaveExtractionReview,
    validateNewItem,
    validateNewCategory,
};
