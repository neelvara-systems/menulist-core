import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { matchDietaryTags } from '@lib/infrastructure/taxonomy/matcher';

type BusinessAttributes = Record<string, boolean | undefined>;

interface MenuDataLike {
    items?: any[];
}

interface StoreLike {
    businessAttributes?: BusinessAttributes;
    businessCategory?: string;
    businessType?: string;
}

const DIETARY_ATTRIBUTE_BY_TAG: Record<string, keyof BusinessAttributes> = {
    vegetarian: 'vegetarian',
    vegan: 'vegan',
    halal: 'halal',
    'gluten-free': 'glutenFree',
};

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

export function inferBusinessAttributesFromMenuData(
    menuData: MenuDataLike | null | undefined,
    store: StoreLike | null | undefined,
): BusinessAttributes {
    const businessCategory = resolveBusinessCategory(store?.businessType, store?.businessCategory);
    if (businessCategory !== 'food') return {};

    const itemTags = (menuData?.items || []).flatMap(collectItemDietarySignals);
    if (itemTags.length === 0) return {};

    const matchedTags = matchDietaryTags(itemTags).matchedTags;
    return matchedTags.reduce<BusinessAttributes>((attributes, tag) => {
        const attributeKey = DIETARY_ATTRIBUTE_BY_TAG[tag];
        if (attributeKey) {
            attributes[attributeKey] = true;
        }
        return attributes;
    }, {});
}

export function getBusinessAttributesWithMenuDefaults(
    menuData: MenuDataLike | null | undefined,
    store: StoreLike | null | undefined,
): BusinessAttributes | null {
    const inferredAttributes = inferBusinessAttributesFromMenuData(menuData, store);
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
