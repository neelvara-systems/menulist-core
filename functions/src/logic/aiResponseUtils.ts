/**
 * AI Response Utilities for Firebase Functions
 * 
 * SIMPLIFIED VERSION for Firebase Cloud Functions
 * 
 * This module provides:
 * - Response parsing with BOM/markdown cleanup
 * - Basic structure validation (without external dependencies)
 * 
 * Note: 
 * - Full XSS sanitization is done on the frontend in redistributeExtractedData.ts
 * - We use simple validation here since Zod/DOMPurify have compatibility issues in Firebase
 * - Data flows: Firebase (basic validation) → Frontend (full sanitization)
 */

import * as functions from 'firebase-functions';
import { BusinessAttributeSuggestion, ExtractedMenuData, FileMessage } from '../types';
import { getAllBusinessAttributeInferenceKeys } from '../sharedData/businessAttributeInference';
import { normalizeExtractedBusinessProfile } from '../sharedData/extractedBusinessProfile';

const logger = functions.logger;
const AI_RESPONSE_PARSE_FAILED = 'AI_RESPONSE_PARSE_FAILED';
const AI_RESPONSE_VALIDATION_WARNINGS = 'AI_RESPONSE_VALIDATION_WARNINGS';

const SAFE_DIETARY_TAGS = new Set([
    'vegetarian',
    'non-vegetarian',
    'vegan',
    'gluten-free',
    'halal',
    'kosher',
    'keto',
    'dairy-free',
    'organic',
]);

const SAFE_SPICE_LEVELS = new Set(['none', 'mild', 'medium', 'hot', 'very-hot']);

const SAFE_BUSINESS_ATTRIBUTE_KEYS = new Set(getAllBusinessAttributeInferenceKeys());
const SAFE_FILE_MESSAGE_STATUSES = new Set(['error', 'warning']);
const SAFE_FILE_MESSAGE_TYPES = new Set([
    'image_unreadable',
    'no_menu_content',
    'image_partial',
    'low_quality',
    'items_omitted',
    'category_unclear',
    'values_omitted',
    'ocr_uncertain',
    'verify_required',
]);

function normalizeBoundedText(value: unknown, maxLength: number): string {
    return typeof value === 'string'
        ? value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : '';
}

function normalizeSourceFileIndex(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value >= 0 ? value : undefined;
    }
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        const parsed = Number(value.trim());
        return Number.isSafeInteger(parsed) ? parsed : undefined;
    }
    return undefined;
}

// ============================================================================
// BASIC STRUCTURE VALIDATION (No external dependencies)
// ============================================================================

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

function isSupportedScalarId(value: unknown): boolean {
    return (typeof value === 'string' && value.trim().length > 0)
        || (typeof value === 'number' && Number.isFinite(value));
}

function isMultilingualTextMap(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.entries(value as Record<string, unknown>).some(([language, text]) => (
        /^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(language)
        && typeof text === 'string'
        && text.trim().length > 0
    ));
}

/**
 * Validate the basic structure of AI response
 * Checks that required fields exist and have correct types
 */
function validateResponseStructure(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Response is not an object'] };
    }

    if (data.message !== undefined && typeof data.message !== 'string') {
        errors.push('message field must be a string');
    }

    if (!data.data || typeof data.data !== 'object' || Array.isArray(data.data)) {
        errors.push('data field must be an object');
        return { valid: false, errors };
    }

    const extractedData = data.data;

    // Validate languages
    if (!Array.isArray(extractedData.languages)) {
        errors.push('languages must be an array');
    } else if (extractedData.languages.length > 12) {
        errors.push('languages exceeds the supported limit');
    } else if (extractedData.languages.length > 0) {
        extractedData.languages.forEach((lang: any, i: number) => {
            if (!lang.code || typeof lang.code !== 'string') {
                errors.push(`languages[${i}].code is required`);
            }
            if (!lang.name || typeof lang.name !== 'string') {
                errors.push(`languages[${i}].name is required`);
            }
        });
    }

    // Validate categories
    if (!Array.isArray(extractedData.categories)) {
        errors.push('categories must be an array');
    } else if (extractedData.categories.length > 200) {
        errors.push('categories exceeds the supported limit');
    } else {
        extractedData.categories.forEach((cat: any, i: number) => {
            if (!isSupportedScalarId(cat.id)) {
                errors.push(`categories[${i}].id is required`);
            }
            if (!isMultilingualTextMap(cat.name)) {
                errors.push(`categories[${i}].name must be an object`);
            }
        });
    }

    // Validate items
    if (!Array.isArray(extractedData.items)) {
        errors.push('items must be an array');
    } else if (extractedData.items.length > 1000) {
        errors.push('items exceeds the supported limit');
    } else {
        extractedData.items.forEach((item: any, i: number) => {
            if (!isSupportedScalarId(item.id)) {
                errors.push(`items[${i}].id is required`);
            }
            if (!isMultilingualTextMap(item.name)) {
                errors.push(`items[${i}].name must be an object`);
            }
            if (!isSupportedScalarId(item.category)) {
                errors.push(`items[${i}].category is required`);
            }
            if (item.attributes !== undefined && (!Array.isArray(item.attributes) || item.attributes.length > 50)) {
                errors.push(`items[${i}].attributes must be a bounded array`);
            }
        });
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Normalize the response data
 * - Ensures IDs are strings
 * - Normalizes tags to array format
 * - Adds default values
 */
function normalizeResponseData(data: any): { message: string; data: ExtractedMenuData | null } {
    if (!data.data || Object.keys(data.data).length === 0) {
        return {
            message: data.message || '',
            data: null
        };
    }

    const extractedData = data.data;

    // Normalize categories
    // Filter out categories missing critical fields (id, name) to prevent invalid data reaching Firestore
    const categories = (extractedData.categories || []).filter((cat: any) => {
        if (cat.id === undefined || cat.id === null) return false;
        if (!cat.name || typeof cat.name !== 'object' || Object.keys(cat.name).length === 0) return false;
        return true;
    }).map((cat: any) => {
        const sourceFileIndex = normalizeSourceFileIndex(cat.sourceFileIndex);
        return {
            id: String(cat.id),
            name: cat.name || {},
            ...(sourceFileIndex !== undefined ? { sourceFileIndex } : {}),
        };
    });

    const normalizeDietaryTag = (value: string): string => {
        const normalized = value
            .trim()
            .toLowerCase()
            .replace(/_/g, '-')
            .replace(/\s+/g, '-');

        if (['veg', 'vegetarian'].includes(normalized)) return 'vegetarian';
        if (['non-veg', 'nonveg', 'nonvegetarian', 'non-vegetarian'].includes(normalized)) return 'non-vegetarian';
        if (['gf', 'glutenfree', 'gluten-free'].includes(normalized)) return 'gluten-free';
        if (['df', 'dairyfree', 'dairy-free'].includes(normalized)) return 'dairy-free';
        return normalized;
    };

    const normalizeStringArray = (
        value: unknown,
        allowlist?: Set<string>,
        canonicalize?: (value: string) => string,
    ): string[] | undefined => {
        if (!Array.isArray(value)) return undefined;
        const normalized = value
            .map((entry) => String(entry || '').trim().toLowerCase())
            .map((entry) => canonicalize ? canonicalize(entry) : entry)
            .filter((entry) => entry.length > 0)
            .filter((entry) => !allowlist || allowlist.has(entry));
        return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
    };

    const normalizeBusinessAttributeSuggestions = (value: unknown): BusinessAttributeSuggestion[] | undefined => {
        if (!Array.isArray(value)) return undefined;
        const normalized = value
            .map((entry: any) => {
                if (!entry || typeof entry !== 'object') return null;
                const key = typeof entry.key === 'string' ? entry.key.trim() : '';
                if (!SAFE_BUSINESS_ATTRIBUTE_KEYS.has(key)) return null;
                if (entry.value !== true) return null;

                const rawConfidence = String(entry.confidence || '').trim().toLowerCase();
                const confidence = ['high', 'medium', 'low'].includes(rawConfidence)
                    ? rawConfidence as 'high' | 'medium' | 'low'
                    : undefined;
                const sourceFileIndex = normalizeSourceFileIndex(entry.sourceFileIndex);
                const evidence = typeof entry.evidence === 'string'
                    ? entry.evidence.replace(/<[^>]*>/g, '').trim().slice(0, 160)
                    : undefined;

                return {
                    key,
                    value: true as const,
                    ...(confidence ? { confidence } : {}),
                    ...(evidence ? { evidence } : {}),
                    ...(sourceFileIndex !== undefined ? { sourceFileIndex } : {}),
                };
            })
            .filter((entry): entry is BusinessAttributeSuggestion => Boolean(entry));

        return normalized.length > 0 ? normalized : undefined;
    };

    // Normalize items with tags handling
    // Filter out items missing critical fields (name or id) to prevent invalid data reaching Firestore
    const items = (extractedData.items || []).filter((item: any) => {
        if (item.id === undefined || item.id === null) return false;
        if (!item.name || typeof item.name !== 'object' || Object.keys(item.name).length === 0) return false;
        return true;
    }).map((item: any) => {
        // Normalize tags from multilingual object to array
        let normalizedTags: string[] | undefined;
        if (item.tags) {
            if (Array.isArray(item.tags)) {
                // Defensive: ensure all tag values are strings
                normalizedTags = item.tags
                    .map((t: any) => typeof t === 'string' ? t : String(t))
                    .filter((t: string) => t.length > 0);
            } else if (typeof item.tags === 'object') {
                // Extract from multilingual object: {"en": "Veg, Spicy"} -> ["Veg", "Spicy"]
                normalizedTags = Object.values(item.tags)
                    .filter((v): v is string => typeof v === 'string')
                    .flatMap((tagString) => tagString.split(',').map(t => t.trim()))
                    .filter(t => t.length > 0);
            }
        }

        // Normalize confidence (Infrastructure Compounding 10.1)
        // Default to undefined (treated as high/high downstream) if AI doesn't return it
        let normalizedConfidence: { name: 'high' | 'medium' | 'low'; price: 'high' | 'medium' | 'low' } | undefined;
        if (item.confidence && typeof item.confidence === 'object') {
            const validLevels = ['high', 'medium', 'low'];
            const nameConf = validLevels.includes(item.confidence.name) ? item.confidence.name : 'medium';
            const priceConf = validLevels.includes(item.confidence.price) ? item.confidence.price : 'medium';
            normalizedConfidence = { name: nameConf, price: priceConf };
        }

        // Normalize name: ensure it's an object (AI validated above, but be safe)
        const normalizedName = (item.name && typeof item.name === 'object') ? item.name : {};

        // Normalize description: AI may return string instead of multilingual object
        let normalizedDescription: Record<string, string> | undefined;
        if (item.description) {
            if (typeof item.description === 'object' && !Array.isArray(item.description)) {
                normalizedDescription = item.description;
            } else if (typeof item.description === 'string' && item.description.trim()) {
                // AI returned plain string — wrap as English
                normalizedDescription = { en: item.description };
            }
        }

        const dietaryTags = normalizeStringArray(item.dietaryTags, SAFE_DIETARY_TAGS, normalizeDietaryTag);
        const rawSpiceLevel = String(item.spiceLevel || '').trim().toLowerCase();
        const spiceLevel = SAFE_SPICE_LEVELS.has(rawSpiceLevel)
            ? rawSpiceLevel as 'none' | 'mild' | 'medium' | 'hot' | 'very-hot'
            : undefined;
        const duration = Number(item.duration);
        const sourceFileIndex = normalizeSourceFileIndex(item.sourceFileIndex);

        return {
            id: String(item.id),
            name: normalizedName,
            categoryId: item.category != null ? String(item.category) : '',
            description: normalizedDescription,
            price: item.price,
            tags: normalizedTags,
            ...(sourceFileIndex !== undefined ? { sourceFileIndex } : {}),
            attributes: item.attributes
                ?.filter((attr: any) => attr && attr.id != null && attr.name)
                .map((attr: any) => ({
                    id: String(attr.id),
                    // Defensive: attr.name may be string instead of multilingual object
                    name: (attr.name && typeof attr.name === 'object') ? attr.name
                        : (typeof attr.name === 'string' ? { en: attr.name } : {}),
                    price: attr.price,
                })),
            ...(dietaryTags ? { dietaryTags } : {}),
            ...(spiceLevel ? { spiceLevel } : {}),
            ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}),
            // Only include confidence if AI returned it (saves document bytes)
            ...(normalizedConfidence ? { confidence: normalizedConfidence } : {}),
        };
    });

    // Normalize languages
    // Filter out languages with missing/invalid codes and validate code format (2-3 letter ISO 639)
    const languages = (extractedData.languages || []).filter((lang: any) => {
        if (!lang.code || typeof lang.code !== 'string') return false;
        // Basic ISO 639 validation: 2-3 lowercase letters, optionally with region (e.g., "en", "hi", "zh-TW")
        if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(lang.code.trim())) return false;
        return true;
    }).map((lang: any) => ({
        name: lang.name || '',
        code: lang.code.trim(),
        isPrimary: lang.isPrimary || false,
    }));

    // Extract fileMessages if present (Section 8.14)
    const fileMessages = Array.isArray(extractedData.fileMessages)
        ? extractedData.fileMessages.map((msg: any): FileMessage | null => {
            const sourceFileIndex = normalizeSourceFileIndex(msg?.sourceFileIndex);
            const status = typeof msg?.status === 'string' && SAFE_FILE_MESSAGE_STATUSES.has(msg.status)
                ? msg.status as FileMessage['status']
                : null;
            const type = typeof msg?.type === 'string' && SAFE_FILE_MESSAGE_TYPES.has(msg.type)
                ? msg.type as FileMessage['type']
                : null;
            const message = normalizeBoundedText(msg?.message, 500);
            if (sourceFileIndex === undefined || !status || !type || !message) return null;

            const omittedItems = Array.isArray(msg?.details?.omittedItems)
                ? msg.details.omittedItems.slice(0, 20).map((item: any) => ({
                    position: normalizeBoundedText(item?.position, 80) || undefined,
                    partialName: normalizeBoundedText(item?.partialName, 120) || undefined,
                    reason: normalizeBoundedText(item?.reason, 160),
                })).filter((item: { reason: string }) => item.reason)
                : undefined;
            const affectedFields = Array.isArray(msg?.details?.affectedFields)
                ? msg.details.affectedFields.slice(0, 20).map((field: any) => ({
                    itemId: Number.isSafeInteger(Number(field?.itemId)) ? Number(field.itemId) : undefined,
                    itemName: normalizeBoundedText(field?.itemName, 120) || undefined,
                    field: normalizeBoundedText(field?.field, 80),
                    reason: normalizeBoundedText(field?.reason, 160),
                })).filter((field: { field: string; reason: string }) => field.field && field.reason)
                : undefined;
            const normalizeCount = (value: unknown) => {
                const count = Number(value);
                return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
            };
            const omittedCount = normalizeCount(msg?.details?.omittedCount);
            const extractedCount = normalizeCount(msg?.details?.extractedCount);
            const hasDetails = Boolean(
                omittedItems?.length
                || affectedFields?.length
                || omittedCount !== undefined
                || extractedCount !== undefined,
            );

            return {
                sourceFileIndex,
                status,
                type,
                message,
                ...(hasDetails ? {
                    details: {
                        ...(omittedItems?.length ? { omittedItems } : {}),
                        ...(affectedFields?.length ? { affectedFields } : {}),
                        ...(omittedCount !== undefined ? { omittedCount } : {}),
                        ...(extractedCount !== undefined ? { extractedCount } : {}),
                    },
                } : {}),
            };
        }).filter((message: FileMessage | null): message is FileMessage => message !== null)
        : undefined;
    const businessAttributeSuggestions = normalizeBusinessAttributeSuggestions(extractedData.businessAttributeSuggestions);
    const extractedBusinessProfile = normalizeExtractedBusinessProfile(extractedData.extractedBusinessProfile);

    return {
        message: data.message || '',
        data: {
            languages,
            categories,
            items,
            ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
            ...(businessAttributeSuggestions ? { businessAttributeSuggestions } : {}),
            // Only include if there are fileMessages
            ...(fileMessages && fileMessages.length > 0 ? { fileMessages } : {}),
        }
    };
}

// ============================================================================
// PARSING
// ============================================================================

/**
 * Parse AI response text
 * 
 * Handles:
 * - BOM removal
 * - Markdown fence removal  
 * - JSON parsing
 */
function parseAIResponseText(rawText: string | object): any {
    // Handle case where response is already an object
    if (typeof rawText === 'object' && rawText !== null) {
        return rawText;
    }

    if (typeof rawText !== 'string') {
        throw new Error(`Unexpected input type: ${typeof rawText}`);
    }

    let cleanedText = rawText.trim();

    // Remove BOM if present
    if (cleanedText.charCodeAt(0) === 0xFEFF) {
        cleanedText = cleanedText.slice(1);
    }

    // Remove markdown code fences if present
    if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, '');
        cleanedText = cleanedText.replace(/\n?```\s*$/, '');
    }

    cleanedText = cleanedText.trim();

    try {
        return JSON.parse(cleanedText);
    } catch (parseError) {
        logger.warn('[AIResponseUtils] JSON parse failed', {
            failureCode: AI_RESPONSE_PARSE_FAILED,
            inputType: typeof rawText,
            inputLength: typeof rawText === 'string' ? rawText.length : undefined,
            errorName: parseError instanceof Error ? parseError.name : typeof parseError,
        });
        throw new Error('AI returned malformed data. Please try again.');
    }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Process AI response with parsing, validation, and normalization
 * 
 * This is the main function used by processMenuImages.ts
 * 
 * Pipeline:
 * 1. Parse JSON (with BOM/markdown cleanup)
 * 2. Validate structure (basic checks)
 * 3. Normalize data (ensure consistent types)
 * 
 * Note: XSS sanitization is done on the frontend in redistributeExtractedData.ts
 */
export function processAIResponseForFirebase(rawText: string | object): {
    message: string;
    data: ExtractedMenuData | null
} {
    // Step 1: Parse the raw text
    const parsed = parseAIResponseText(rawText);

    // Step 2: Validate structure
    const validation = validateResponseStructure(parsed);
    if (!validation.valid) {
        logger.warn('[AIResponseUtils] Response validation warnings', {
            failureCode: AI_RESPONSE_VALIDATION_WARNINGS,
            warningCount: validation.errors.length,
            hasMessage: typeof parsed?.message === 'string',
            hasData: Boolean(parsed?.data),
        });
        throw new Error('AI returned data in an unexpected format. Please try again.');
    }

    // Step 3: Normalize the data
    const normalized = normalizeResponseData(parsed);

    return normalized;
}
