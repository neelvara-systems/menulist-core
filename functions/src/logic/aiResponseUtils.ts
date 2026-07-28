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
 * - Provider data is structurally projected and text-normalized here before use.
 * - The redistribution layer performs a second output-specific sanitization pass.
 * - Data flows: provider unknown input → Functions admission → output redistribution.
 */

import * as functions from 'firebase-functions';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';
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

function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function normalizeMultilingualTextMap(value: unknown): Record<string, string> {
    const record = asRecord(value);
    if (!record) return {};
    return Object.fromEntries(
        Object.entries(record)
            .flatMap(([language, text]) => {
                if (!/^[a-z]{2,3}(?:-[a-z]{2,4})?$/i.test(language)) return [];
                const normalized = normalizeBoundedText(text, 2000);
                return normalized ? [[language, normalized] as const] : [];
            }),
    );
}

function normalizePrice(value: unknown): string | number | null | undefined {
    if (value === null) return null;
    if (typeof value === 'string') {
        const normalized = normalizeBoundedText(value, 80);
        return normalized || undefined;
    }
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Validate the basic structure of AI response
 * Checks that required fields exist and have correct types
 */
function validateResponseStructure(data: unknown): ValidationResult {
    const errors: string[] = [];
    const response = asRecord(data);

    if (!response) {
        return { valid: false, errors: ['Response is not an object'] };
    }

    if (response.message !== undefined && typeof response.message !== 'string') {
        errors.push('message field must be a string');
    }

    const extractedData = asRecord(response.data);
    if (!extractedData) {
        errors.push('data field must be an object');
        return { valid: false, errors };
    }

    // Validate languages
    if (!Array.isArray(extractedData.languages)) {
        errors.push('languages must be an array');
    } else if (extractedData.languages.length > 12) {
        errors.push('languages exceeds the supported limit');
    } else if (extractedData.languages.length > 0) {
        extractedData.languages.forEach((value, i) => {
            const lang = asRecord(value);
            if (!lang || typeof lang.code !== 'string' || !lang.code) {
                errors.push(`languages[${i}].code is required`);
            }
            if (!lang || typeof lang.name !== 'string' || !lang.name) {
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
        extractedData.categories.forEach((value, i) => {
            const category = asRecord(value);
            if (!category || !isSupportedScalarId(category.id)) {
                errors.push(`categories[${i}].id is required`);
            }
            if (!category || !isMultilingualTextMap(category.name)) {
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
        extractedData.items.forEach((value, i) => {
            const item = asRecord(value);
            if (!item || !isSupportedScalarId(item.id)) {
                errors.push(`items[${i}].id is required`);
            }
            if (!item || !isMultilingualTextMap(item.name)) {
                errors.push(`items[${i}].name must be an object`);
            }
            if (!item || !isSupportedScalarId(item.category)) {
                errors.push(`items[${i}].category is required`);
            }
            if (item?.attributes !== undefined && (!Array.isArray(item.attributes) || item.attributes.length > 50)) {
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
function normalizeResponseData(data: unknown): { message: string; data: ExtractedMenuData | null } {
    const response = asRecord(data);
    const extractedData = asRecord(response?.data);
    const message = typeof response?.message === 'string' ? response.message : '';
    if (!extractedData || Object.keys(extractedData).length === 0) {
        return {
            message,
            data: null
        };
    }

    // Normalize categories
    const categories = (Array.isArray(extractedData.categories) ? extractedData.categories : [])
        .flatMap((value) => {
            const category = asRecord(value);
            const name = normalizeMultilingualTextMap(category?.name);
            if (!category || !isSupportedScalarId(category.id) || Object.keys(name).length === 0) return [];
            const sourceFileIndex = normalizeSourceFileIndex(category.sourceFileIndex);
            return [{
                id: String(category.id),
                name,
                ...(sourceFileIndex !== undefined ? { sourceFileIndex } : {}),
            }];
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
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim().toLowerCase())
            .map((entry) => canonicalize ? canonicalize(entry) : entry)
            .filter((entry) => entry.length > 0)
            .filter((entry) => !allowlist || allowlist.has(entry));
        return normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
    };

    const normalizeBusinessAttributeSuggestions = (value: unknown): BusinessAttributeSuggestion[] | undefined => {
        if (!Array.isArray(value)) return undefined;
        const normalized = value
            .map((value): BusinessAttributeSuggestion | null => {
                const entry = asRecord(value);
                if (!entry) return null;
                const key = typeof entry.key === 'string' ? entry.key.trim() : '';
                if (!SAFE_BUSINESS_ATTRIBUTE_KEYS.has(key)) return null;
                if (entry.value !== true) return null;

                const rawConfidence = typeof entry.confidence === 'string'
                    ? entry.confidence.trim().toLowerCase()
                    : '';
                const confidence = ['high', 'medium', 'low'].includes(rawConfidence)
                    ? rawConfidence as 'high' | 'medium' | 'low'
                    : undefined;
                const sourceFileIndex = normalizeSourceFileIndex(entry.sourceFileIndex);
                const evidence = normalizeBoundedText(entry.evidence, 160) || undefined;

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
    const items = (Array.isArray(extractedData.items) ? extractedData.items : []).flatMap((value) => {
        const item = asRecord(value);
        const normalizedName = normalizeMultilingualTextMap(item?.name);
        if (!item || !isSupportedScalarId(item.id) || Object.keys(normalizedName).length === 0) return [];
        // Normalize tags from multilingual object to array
        let normalizedTags: string[] | undefined;
        if (item.tags) {
            if (Array.isArray(item.tags)) {
                // Defensive: ensure all tag values are strings
                normalizedTags = item.tags
                    .filter((tag: unknown): tag is string => typeof tag === 'string')
                    .map((tag: string) => normalizeBoundedText(tag, 80))
                    .filter((tag: string) => tag.length > 0);
            } else {
                const tagsRecord = asRecord(item.tags);
                // Extract from multilingual object: {"en": "Veg, Spicy"} -> ["Veg", "Spicy"]
                normalizedTags = Object.values(tagsRecord || {})
                    .filter((v): v is string => typeof v === 'string')
                    .flatMap((tagString) => tagString.split(',').map((tag) => normalizeBoundedText(tag, 80)))
                    .filter(t => t.length > 0);
            }
        }

        // Normalize confidence (Infrastructure Compounding 10.1)
        // Default to undefined (treated as high/high downstream) if AI doesn't return it
        let normalizedConfidence: { name: 'high' | 'medium' | 'low'; price: 'high' | 'medium' | 'low' } | undefined;
        const confidence = asRecord(item.confidence);
        if (confidence) {
            const validLevels = ['high', 'medium', 'low'];
            const nameConf = typeof confidence.name === 'string' && validLevels.includes(confidence.name)
                ? confidence.name as 'high' | 'medium' | 'low'
                : 'medium';
            const priceConf = typeof confidence.price === 'string' && validLevels.includes(confidence.price)
                ? confidence.price as 'high' | 'medium' | 'low'
                : 'medium';
            normalizedConfidence = { name: nameConf, price: priceConf };
        }

        // Normalize description: AI may return string instead of multilingual object
        let normalizedDescription: Record<string, string> | undefined;
        if (typeof item.description === 'string') {
            const description = normalizeBoundedText(item.description, 2000);
            if (description) normalizedDescription = { en: description };
        } else {
            const description = normalizeMultilingualTextMap(item.description);
            if (Object.keys(description).length > 0) normalizedDescription = description;
        }

        const dietaryTags = normalizeStringArray(item.dietaryTags, SAFE_DIETARY_TAGS, normalizeDietaryTag);
        const rawSpiceLevel = typeof item.spiceLevel === 'string' ? item.spiceLevel.trim().toLowerCase() : '';
        const spiceLevel = SAFE_SPICE_LEVELS.has(rawSpiceLevel)
            ? rawSpiceLevel as 'none' | 'mild' | 'medium' | 'hot' | 'very-hot'
            : undefined;
        const duration = typeof item.duration === 'number' ? item.duration : Number.NaN;
        const sourceFileIndex = normalizeSourceFileIndex(item.sourceFileIndex);
        const price = normalizePrice(item.price);
        const attributes = Array.isArray(item.attributes)
            ? item.attributes.flatMap((value) => {
                const attribute = asRecord(value);
                const attributeName = typeof attribute?.name === 'string'
                    ? { en: normalizeBoundedText(attribute.name, 500) }
                    : normalizeMultilingualTextMap(attribute?.name);
                if (!attribute || !isSupportedScalarId(attribute.id) || Object.keys(attributeName).length === 0) return [];
                const attributePrice = normalizePrice(attribute.price);
                return [{
                    id: String(attribute.id),
                    name: attributeName,
                    ...(attributePrice !== undefined ? { price: attributePrice } : {}),
                }];
            })
            : undefined;

        return [{
            id: String(item.id),
            name: normalizedName,
            categoryId: item.category != null ? String(item.category) : '',
            ...(normalizedDescription ? { description: normalizedDescription } : {}),
            ...(price !== undefined ? { price } : {}),
            ...(normalizedTags && normalizedTags.length > 0 ? { tags: Array.from(new Set(normalizedTags)) } : {}),
            ...(sourceFileIndex !== undefined ? { sourceFileIndex } : {}),
            ...(attributes && attributes.length > 0 ? { attributes } : {}),
            ...(dietaryTags ? { dietaryTags } : {}),
            ...(spiceLevel ? { spiceLevel } : {}),
            ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}),
            // Only include confidence if AI returned it (saves document bytes)
            ...(normalizedConfidence ? { confidence: normalizedConfidence } : {}),
        }];
    });

    // Normalize languages
    // Filter out languages with missing/invalid codes and validate code format (2-3 letter ISO 639)
    const languages = (Array.isArray(extractedData.languages) ? extractedData.languages : []).flatMap((value) => {
        const language = asRecord(value);
        const code = typeof language?.code === 'string' ? language.code.trim() : '';
        const name = normalizeBoundedText(language?.name, 120);
        if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(code) || !name) return [];
        return [{ name, code, isPrimary: language?.isPrimary === true }];
    });

    // Extract fileMessages if present (Section 8.14)
    const fileMessages = Array.isArray(extractedData.fileMessages)
        ? extractedData.fileMessages.map((value): FileMessage | null => {
            const msg = asRecord(value);
            const sourceFileIndex = normalizeSourceFileIndex(msg?.sourceFileIndex);
            const status = typeof msg?.status === 'string' && SAFE_FILE_MESSAGE_STATUSES.has(msg.status)
                ? msg.status as FileMessage['status']
                : null;
            const type = typeof msg?.type === 'string' && SAFE_FILE_MESSAGE_TYPES.has(msg.type)
                ? msg.type as FileMessage['type']
                : null;
            const message = normalizeBoundedText(msg?.message, 500);
            if (sourceFileIndex === undefined || !status || !type || !message) return null;

            const details = asRecord(msg?.details);
            const omittedItems = Array.isArray(details?.omittedItems)
                ? details.omittedItems.slice(0, 20).map((value) => {
                    const item = asRecord(value);
                    return {
                    position: normalizeBoundedText(item?.position, 80) || undefined,
                    partialName: normalizeBoundedText(item?.partialName, 120) || undefined,
                    reason: normalizeBoundedText(item?.reason, 160),
                    };
                }).filter((item: { reason: string }) => item.reason)
                : undefined;
            const affectedFields = Array.isArray(details?.affectedFields)
                ? details.affectedFields.slice(0, 20).map((value) => {
                    const field = asRecord(value);
                    const rawItemId = field?.itemId;
                    const itemId = typeof rawItemId === 'number' && Number.isSafeInteger(rawItemId)
                        ? rawItemId
                        : typeof rawItemId === 'string' && /^\d+$/.test(rawItemId)
                            ? Number(rawItemId)
                            : undefined;
                    return {
                    itemId,
                    itemName: normalizeBoundedText(field?.itemName, 120) || undefined,
                    field: normalizeBoundedText(field?.field, 80),
                    reason: normalizeBoundedText(field?.reason, 160),
                    };
                }).filter((field: { field: string; reason: string }) => field.field && field.reason)
                : undefined;
            const normalizeCount = (value: unknown) => {
                if (typeof value === 'number') {
                    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
                }
                if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
                    const count = Number(value.trim());
                    return Number.isSafeInteger(count) ? count : undefined;
                }
                return undefined;
            };
            const omittedCount = normalizeCount(details?.omittedCount);
            const extractedCount = normalizeCount(details?.extractedCount);
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
        message,
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
function parseAIResponseText(rawText: string | object): unknown {
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
            errorName: getBoundedFunctionsErrorName(parseError) || typeof parseError,
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
 * Text and structure are admitted here; redistribution applies output-specific sanitization again.
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
        const parsedRecord = asRecord(parsed);
        logger.warn('[AIResponseUtils] Response validation warnings', {
            failureCode: AI_RESPONSE_VALIDATION_WARNINGS,
            warningCount: validation.errors.length,
            hasMessage: typeof parsedRecord?.message === 'string',
            hasData: Boolean(parsedRecord?.data),
        });
        throw new Error('AI returned data in an unexpected format. Please try again.');
    }

    // Step 3: Normalize the data
    const normalized = normalizeResponseData(parsed);

    return normalized;
}
