/**
 * Extraction Validation Utilities
 * 
 * Spec Reference: ai-extraction-integration.md Part 4D (Price Validation)
 * 
 * Validates extracted data before applying to project.
 */

import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

/**
 * Validate price format
 * 
 * Rules:
 * - Must be a non-empty string
 * - Uses the shared persisted menu-price text boundary
 * - Supports numeric, text, currency, and range prices
 * 
 * @param price - Price string to validate
 * @returns true if valid price format
 * 
 * @example
 * isValidPrice("$12.99") → true
 * isValidPrice("₹299") → true
 * isValidPrice("") → false
 * isValidPrice("<script>alert()</script>") → false
 * isValidPrice("Free 🎉") → false
 */
export function isValidPrice(price: string | undefined | null): boolean {
    const result = normalizeOptionalMenuPrice(price);
    return result.success && Boolean(result.data);
}

/**
 * Validate category name
 * 
 * @param name - Category name (can be multilingual object or string)
 * @param primaryLang - Primary language code
 * @returns true if valid
 */
export function isValidCategoryName(
    name: Record<string, string> | string | undefined,
    primaryLang: string = 'en'
): boolean {
    if (!name) return false;

    const nameStr = typeof name === 'string'
        ? name
        : name[primaryLang] || Object.values(name)[0];

    if (!nameStr) return false;
    if (nameStr.trim().length === 0) return false;
    if (nameStr.length > 100) return false;

    return true;
}

/**
 * Validate item name
 * 
 * @param name - Item name (can be multilingual object or string)
 * @param primaryLang - Primary language code
 * @returns true if valid
 */
export function isValidItemName(
    name: Record<string, string> | string | undefined,
    primaryLang: string = 'en'
): boolean {
    if (!name) return false;

    const nameStr = typeof name === 'string'
        ? name
        : name[primaryLang] || Object.values(name)[0];

    if (!nameStr) return false;
    if (nameStr.trim().length === 0) return false;
    if (nameStr.length > 200) return false;

    return true;
}

/**
 * Sanitize price string
 * 
 * @param price - Raw price string
 * @returns Sanitized price or empty string if invalid
 */
export function sanitizePrice(price: string | undefined | null): string {
    const result = normalizeOptionalMenuPrice(price);
    return result.success ? result.data || '' : '';
}

/**
 * Validation result for an extracted item
 */
export interface ItemValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
}

/**
 * Validate an extracted item
 * 
 * @param item - Extracted item to validate
 * @param primaryLang - Primary language code
 * @returns Validation result with warnings and errors
 */
export function validateExtractedItem(
    item: {
        name?: Record<string, string> | string;
        category?: string;
        price?: string;
    },
    primaryLang: string = 'en'
): ItemValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Name validation
    if (!isValidItemName(item.name, primaryLang)) {
        errors.push('Invalid or missing item name');
    }

    // Category validation
    if (!item.category) {
        errors.push('Missing category reference');
    }

    // Price validation (warning, not error)
    if (item.price && !isValidPrice(item.price)) {
        warnings.push('Invalid price format - will be skipped');
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
    };
}

/**
 * Validate an extracted category
 * 
 * @param category - Extracted category to validate
 * @param primaryLang - Primary language code
 * @returns Validation result
 */
export function validateExtractedCategory(
    category: {
        name?: Record<string, string> | string;
    },
    primaryLang: string = 'en'
): ItemValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!isValidCategoryName(category.name, primaryLang)) {
        errors.push('Invalid or missing category name');
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
    };
}

export default {
    isValidPrice,
    isValidCategoryName,
    isValidItemName,
    sanitizePrice,
    validateExtractedItem,
    validateExtractedCategory,
};
