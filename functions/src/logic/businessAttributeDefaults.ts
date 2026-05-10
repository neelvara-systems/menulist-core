import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import {
    getAllowedBusinessAttributeKeysForCategory,
    getDietaryTagToBusinessAttributeMapForCategory,
    normalizeBusinessAttributeInferenceKey,
} from '../sharedData/businessAttributeInference';
import { resolveBusinessCategory } from '../sharedData/businessTypes';
import { revalidatePublicClientCacheForStore } from './publicCacheRevalidation';

type BusinessAttributes = Record<string, boolean | undefined>;
type BusinessAttributeSuggestionConfidence = 'high' | 'medium' | 'low';

interface StoreLike {
    businessAttributes?: BusinessAttributes;
    businessCategory?: string;
    businessType?: string;
}

interface MenuDataLike {
    businessAttributeSuggestions?: unknown;
    items?: any[];
}

interface BusinessAttributeSuggestionLike {
    key?: unknown;
    value?: unknown;
    confidence?: unknown;
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
    const attributes: BusinessAttributes = {};

    const applySuggestion = (rawKey: unknown, rawValue: unknown, rawConfidence?: unknown) => {
        const attributeKey = normalizeBusinessAttributeInferenceKey(rawKey, allowedKeys);
        if (!attributeKey || !isAffirmativeSuggestionValue(rawValue)) return;

        const confidence = normalizeSuggestionConfidence(rawConfidence);
        if (confidence !== 'high') return;

        attributes[attributeKey] = true;
    };

    if (Array.isArray(suggestions)) {
        suggestions.forEach((suggestion) => {
            const entry = suggestion && typeof suggestion === 'object'
                ? suggestion as BusinessAttributeSuggestionLike
                : null;
            if (!entry) return;
            applySuggestion(entry.key, entry.value, entry.confidence);
        });
        return attributes;
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

    return attributes;
}

function normalizeDietaryTagCandidates(value: string): string[] {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return [];

    return Array.from(new Set([
        normalized,
        normalized.replace(/\s+/g, '_'),
        normalized.replace(/\s+/g, '-'),
        normalized.replace(/[^a-z0-9]+/g, ''),
    ]));
}

function inferBusinessAttributesForStore(
    menuData: MenuDataLike | null | undefined,
    store: StoreLike | null | undefined,
): BusinessAttributes {
    const category = resolveBusinessCategory(store?.businessType, store?.businessCategory);
    const allowedKeys = new Set(getAllowedBusinessAttributeKeysForCategory(category));
    if (allowedKeys.size === 0) return {};

    const attributes = collectBusinessAttributeSuggestions(
        menuData?.businessAttributeSuggestions,
        allowedKeys,
    );

    const dietaryTagAttributeMap = getDietaryTagToBusinessAttributeMapForCategory(category);
    if (Object.keys(dietaryTagAttributeMap).length === 0) return attributes;

    (menuData?.items || []).flatMap(collectItemDietarySignals).forEach((tag) => {
        normalizeDietaryTagCandidates(String(tag || '')).some((candidate) => {
            const attributeKey = dietaryTagAttributeMap[candidate];
            if (!attributeKey) return false;
            attributes[attributeKey] = true;
            return true;
        });
    });

    return attributes;
}

function getBusinessAttributesWithMenuDefaults(
    menuData: MenuDataLike | null | undefined,
    store: StoreLike | null | undefined,
): BusinessAttributes | null {
    const inferredAttributes = inferBusinessAttributesForStore(menuData, store);
    const existingAttributes = store?.businessAttributes || {};
    const nextAttributes: BusinessAttributes = { ...existingAttributes };
    let changed = false;

    Object.entries(inferredAttributes).forEach(([key, value]) => {
        if (value !== true) return;
        if (typeof existingAttributes[key] === 'boolean') return;
        nextAttributes[key] = true;
        changed = true;
    });

    return changed ? nextAttributes : null;
}

export async function applyMenuDerivedBusinessAttributeDefaultsForStore(params: {
    context: string;
    menuData: MenuDataLike | null | undefined;
    storeId: string | number;
}): Promise<boolean> {
    const storeId = String(params.storeId || '').trim();
    if (!storeId) return false;

    const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeId);
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return false;

    const storeData = storeSnap.data() as StoreLike;
    const nextBusinessAttributes = getBusinessAttributesWithMenuDefaults(params.menuData, storeData);
    if (!nextBusinessAttributes) return false;

    await storeRef.update({ businessAttributes: nextBusinessAttributes });
    await revalidatePublicClientCacheForStore(storeId, params.context);

    functions.logger.info('[businessAttributeDefaults] Applied menu-derived business attribute defaults', {
        storeId,
        context: params.context,
        appliedKeys: Object.keys(nextBusinessAttributes).filter((key) => (
            nextBusinessAttributes[key] === true && storeData.businessAttributes?.[key] !== true
        )),
    });

    return true;
}
