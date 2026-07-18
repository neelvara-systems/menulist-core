import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { mergeMissingBusinessAttributeDefaults } from '@data/shared/businessAttributeDefaults';
import {
    getAllowedBusinessAttributeKeysForCategory,
    getDietaryTagToBusinessAttributeMapForCategory,
    normalizeBusinessAttributeInferenceKey,
} from '@data/shared/businessAttributeInference';
import { matchDietaryTags } from '@lib/infrastructure/taxonomy/matcher';

type BusinessAttributes = Record<string, unknown>;
type BusinessAttributeSuggestionConfidence = 'high' | 'medium' | 'low';

interface BusinessAttributeSuggestionLike {
    key?: unknown;
    value?: unknown;
    confidence?: unknown;
    evidence?: unknown;
}

interface MenuDataLike {
    businessAttributeSuggestions?: unknown;
    items?: any[];
}

interface StoreLike {
    businessAttributes?: BusinessAttributes;
    businessCategory?: string;
    businessType?: string;
}

function collectTextValues(value: unknown): string[] {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collectTextValues);
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).flatMap(collectTextValues);
    }
    return [];
}

function collectItemDietarySignals(item: any): string[] {
    return [
        ...collectTextValues(item?.tags),
        ...collectTextValues(item?.dietaryTags),
        ...collectTextValues(item?.decisionFacts?.dietaryTags?.value),
    ];
}

function getAllowedAttributeKeys(store: StoreLike | null | undefined): Set<string> {
    const category = resolveBusinessCategory(store?.businessType, store?.businessCategory);
    return new Set(getAllowedBusinessAttributeKeysForCategory(category));
}

function normalizeAttributeKey(rawKey: unknown, allowedKeys: Set<string>): string | null {
    return normalizeBusinessAttributeInferenceKey(rawKey, allowedKeys) || null;
}

function normalizeSuggestionConfidence(value: unknown): BusinessAttributeSuggestionConfidence | null {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'high' || normalized === 'medium' || normalized === 'low'
        ? normalized
        : null;
}

function isAffirmativeSuggestionValue(value: unknown): boolean {
    if (value === true) return true;
    if (typeof value === 'string') {
        return ['true', 'yes', 'available', 'supported'].includes(value.trim().toLowerCase());
    }
    return false;
}

function collectBusinessAttributeSuggestions(
    suggestions: unknown,
    allowedKeys: Set<string>,
): BusinessAttributes {
    const nextAttributes: BusinessAttributes = {};

    const applySuggestion = (rawKey: unknown, rawValue: unknown, rawConfidence?: unknown) => {
        const attributeKey = normalizeAttributeKey(rawKey, allowedKeys);
        if (!attributeKey || !isAffirmativeSuggestionValue(rawValue)) return;

        const confidence = normalizeSuggestionConfidence(rawConfidence);
        if (confidence !== 'high') return;

        nextAttributes[attributeKey] = true;
    };

    if (Array.isArray(suggestions)) {
        suggestions.forEach((suggestion) => {
            const entry = suggestion && typeof suggestion === 'object'
                ? suggestion as BusinessAttributeSuggestionLike
                : null;
            if (!entry) return;
            applySuggestion(entry.key, entry.value, entry.confidence);
        });
        return nextAttributes;
    }

    if (suggestions && typeof suggestions === 'object') {
        Object.entries(suggestions as Record<string, unknown>).forEach(([key, value]) => {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                const entry = value as BusinessAttributeSuggestionLike;
                applySuggestion(entry.key || key, entry.value ?? true, entry.confidence);
                return;
            }
            applySuggestion(key, value);
        });
    }

    return nextAttributes;
}

export function inferBusinessAttributesFromMenuData(
    menuData: MenuDataLike | null | undefined,
    store: StoreLike | null | undefined,
): BusinessAttributes {
    const allowedKeys = getAllowedAttributeKeys(store);
    if (allowedKeys.size === 0) return {};

    const attributes = collectBusinessAttributeSuggestions(
        menuData?.businessAttributeSuggestions,
        allowedKeys,
    );
    const itemTags = (menuData?.items || []).flatMap(collectItemDietarySignals);
    if (itemTags.length === 0) return attributes;

    const category = resolveBusinessCategory(store?.businessType, store?.businessCategory);
    const dietaryTagAttributeMap = getDietaryTagToBusinessAttributeMapForCategory(category);
    if (Object.keys(dietaryTagAttributeMap).length === 0) return attributes;
    const matchedTags = matchDietaryTags(itemTags).matchedTags;
    return matchedTags.reduce<BusinessAttributes>((nextAttributes, tag) => {
        const attributeKey = dietaryTagAttributeMap[tag];
        if (attributeKey) {
            nextAttributes[attributeKey] = true;
        }
        return nextAttributes;
    }, attributes);
}

export function getBusinessAttributesWithMenuDefaults(
    menuData: MenuDataLike | null | undefined,
    store: StoreLike | null | undefined,
): BusinessAttributes | null {
    const inferredAttributes = inferBusinessAttributesFromMenuData(menuData, store);
    const existingAttributes = store?.businessAttributes || {};
    const result = mergeMissingBusinessAttributeDefaults(
        existingAttributes,
        inferredAttributes,
        Array.from(getAllowedAttributeKeys(store)),
    );

    return result.changed ? result.businessAttributes : null;
}
