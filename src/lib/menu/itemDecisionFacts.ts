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

function hasValue(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
        return Object.values(value as Record<string, unknown>).some(hasValue);
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
    const value = item?.[key as keyof ExtractedDataItem] as DecisionFactValue | undefined;
    return hasValue(value) ? value : undefined;
}

export function getDecisionFactValue<T extends DecisionFactValue = DecisionFactValue>(
    item: Partial<ExtractedDataItem> | null | undefined,
    key: ItemDecisionFactKey,
): T | undefined {
    const factValue = item?.decisionFacts?.[key]?.value;
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
    if (!Array.isArray(value)) return [];

    const seen = new Set<string>();
    return value.reduce((acc: string[], rawValue) => {
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
    return value && !Array.isArray(value) && typeof value === 'object' ? value : undefined;
}
