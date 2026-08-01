/**
 * Extraction Validation Utilities
 * 
 * Spec Reference: ai-extraction-integration.md Part 4D (Price Validation)
 * 
 * Validates extracted data before applying to project.
 */

import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';

function readOwnDataField(value: unknown, key: string): unknown {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function getLocalizedName(value: unknown, primaryLang: string): string | null {
    if (typeof value === 'string') return value;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;

    const primary = readOwnDataField(value, primaryLang);
    if (typeof primary === 'string' && primary.length > 0) return primary;

    try {
        const keys = Object.keys(value);
        if (keys.length > 64) return null;
        for (const key of keys) {
            const candidate = readOwnDataField(value, key);
            if (typeof candidate === 'string' && candidate.length > 0) return candidate;
        }
    } catch {
        return null;
    }
    return null;
}

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
    name: unknown,
    primaryLang: string = 'en'
): boolean {
    const nameStr = getLocalizedName(name, primaryLang);

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
    name: unknown,
    primaryLang: string = 'en'
): boolean {
    const nameStr = getLocalizedName(name, primaryLang);

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
    item: unknown,
    primaryLang: string = 'en'
): ItemValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Name validation
    const name = readOwnDataField(item, 'name');
    const category = readOwnDataField(item, 'category');
    const price = readOwnDataField(item, 'price');

    if (!isValidItemName(name, primaryLang)) {
        errors.push('Invalid or missing item name');
    }

    // Category validation
    if (typeof category !== 'string' || !category.trim() || category.length > 200) {
        errors.push('Missing category reference');
    }

    // Price validation (warning, not error)
    if (price !== undefined && price !== null && price !== '' && (
        typeof price !== 'string' || !isValidPrice(price)
    )) {
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
    category: unknown,
    primaryLang: string = 'en'
): ItemValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!isValidCategoryName(readOwnDataField(category, 'name'), primaryLang)) {
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
