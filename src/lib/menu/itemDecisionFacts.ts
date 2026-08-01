import type { DecisionFactValue, ExtractedDataItem } from '@template/main-app/projects/types/extractedData.types';

export type ItemDecisionFactKey =
    | 'allergens'
    | 'dietaryTags'
    | 'spiceLevel'
    | 'nutritionInfo'
    | 'duration'
    | 'skillLevel'
    | 'targetAudience'
    | 'materials'
    | 'warranty';

const LEGACY_FACT_KEYS: ItemDecisionFactKey[] = [
    'allergens',
    'dietaryTags',
    'spiceLevel',
    'nutritionInfo',
    'duration',
    'skillLevel',
    'targetAudience',
    'materials',
    'warranty',
];

function readOwnDataField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function snapshotArray(value: unknown, maxItems = 100): unknown[] | null {
    if (!Array.isArray(value)) return null;
    try {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
        const length = lengthDescriptor && 'value' in lengthDescriptor
            ? lengthDescriptor.value
            : undefined;
        if (!Number.isSafeInteger(length) || length < 0 || length > maxItems) return null;
        const values: unknown[] = [];
        for (let index = 0; index < length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            values.push(descriptor && 'value' in descriptor ? descriptor.value : undefined);
        }
        return values;
    } catch {
        return null;
    }
}

function hasValue(value: unknown, depth = 0, seen = new Set<object>()): boolean {
    if (value === undefined || value === null || value === '') return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) {
        if (depth >= 3 || seen.has(value)) return false;
        seen.add(value);
        const values = snapshotArray(value);
        try {
            return values !== null && values.some((entry) => hasValue(entry, depth + 1, seen));
        } finally {
            seen.delete(value);
        }
    }
    if (typeof value === 'object') {
        if (depth >= 3 || seen.has(value)) return false;
        seen.add(value);
        try {
            const keys = Object.keys(value);
            if (keys.length > 32) return false;
            return keys.some((key) => hasValue(readOwnDataField(value, key), depth + 1, seen));
        } catch {
            return false;
        } finally {
            seen.delete(value);
        }
    }
    return true;
}

function isZeroOnlyText(value: string): boolean {
    return /^\s*0+(\.0+)?\s*$/.test(value.trim());
}

function sanitizeDecisionFactText(value: unknown): string {
    if (typeof value !== 'string') return '';
    const normalized = value.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    return normalized && !isZeroOnlyText(normalized) ? normalized : '';
}

function getLegacyFactValue(item: Partial<ExtractedDataItem> | null | undefined, key: ItemDecisionFactKey): DecisionFactValue | undefined {
    const value = readOwnDataField(item, key) as DecisionFactValue | undefined;
    return hasValue(value) ? value : undefined;
}

export function getDecisionFactValue<T extends DecisionFactValue = DecisionFactValue>(
    item: Partial<ExtractedDataItem> | null | undefined,
    key: ItemDecisionFactKey,
): T | undefined {
    const decisionFacts = readOwnDataField(item, 'decisionFacts');
    const fact = readOwnDataField(decisionFacts, key);
    const factValue = readOwnDataField(fact, 'value');
    if (hasValue(factValue)) return factValue as T;
    return getLegacyFactValue(item, key) as T | undefined;
}

export function setDecisionFactValue(
    item: ExtractedDataItem,
    key: ItemDecisionFactKey,
    value: DecisionFactValue | undefined,
): ExtractedDataItem {
    const nextItem: ExtractedDataItem = { ...item };
    const nextFacts = { ...(nextItem.decisionFacts || {}) };

    if (hasValue(value)) {
        nextFacts[key] = {
            ...(nextFacts[key] || {}),
            value,
            source: 'owner',
            confirmed: true,
            updatedAt: new Date().toISOString(),
        };
    } else {
        delete nextFacts[key];
    }

    nextItem.decisionFacts = Object.keys(nextFacts).length > 0 ? nextFacts : undefined;

    if (LEGACY_FACT_KEYS.includes(key)) {
        (nextItem as unknown as Record<string, unknown>)[key] = hasValue(value) ? value : undefined;
    }

    return nextItem;
}

export function getDecisionFactArray(item: Partial<ExtractedDataItem> | null | undefined, key: ItemDecisionFactKey): string[] {
    const value = getDecisionFactValue(item, key);
    const values = snapshotArray(value);
    if (!values) return [];

    const seen = new Set<string>();
    return values.reduce<string[]>((acc, rawValue) => {
        const text = sanitizeDecisionFactText(rawValue);
        if (!text) return acc;

        const key = text.toLowerCase();
        if (seen.has(key)) return acc;
        seen.add(key);
        acc.push(text);
        return acc;
    }, []);
}

export function getDecisionFactString(item: Partial<ExtractedDataItem> | null | undefined, key: ItemDecisionFactKey): string | undefined {
    const value = getDecisionFactValue(item, key);
    const text = sanitizeDecisionFactText(value);
    return text || undefined;
}

export function getDecisionFactNumber(item: Partial<ExtractedDataItem> | null | undefined, key: ItemDecisionFactKey): number | undefined {
    const value = getDecisionFactValue(item, key);
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function getNutritionFact(item: Partial<ExtractedDataItem> | null | undefined) {
    const value = getDecisionFactValue(item, 'nutritionInfo');
    if (!value || Array.isArray(value) || typeof value !== 'object') return undefined;

    const result: NonNullable<ExtractedDataItem['nutritionInfo']> = {};
    for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
        const candidate = readOwnDataField(value, key);
        if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
            result[key] = candidate;
        }
    }
    const servingSize = sanitizeDecisionFactText(readOwnDataField(value, 'servingSize'));
    if (servingSize) result.servingSize = servingSize;
    return Object.keys(result).length > 0 ? result : undefined;
}
