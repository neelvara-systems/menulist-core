import {
    getDecisionFactArray,
    getDecisionFactString,
} from './itemDecisionFacts';
import type { ExtractedDataItem } from '@template/main-app/projects/types/extractedData.types';
import type { PublicCustomerMessageKey, PublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';

export type ItemDecisionSymbolId =
    | 'vegetarian'
    | 'non-vegetarian'
    | 'vegan'
    | 'gluten-free'
    | 'spice-mild'
    | 'spice-medium'
    | 'spice-hot'
    | 'spice-very-hot'
    | 'for-men'
    | 'for-women'
    | 'unisex'
    | 'kids'
    | 'adults'
    | 'seniors';

export type ItemDecisionSymbolKind =
    | 'dietary-dot'
    | 'leaf'
    | 'gluten-free'
    | 'spice'
    | 'audience';

export type ItemDecisionSymbolDefinition = {
    id: ItemDecisionSymbolId;
    kind: ItemDecisionSymbolKind;
    label: string;
    semanticColor: 'green' | 'red' | 'neutral';
    spiceMarks?: 1 | 2 | 3 | 4;
};

export type ItemDecisionSymbolSource = Partial<ExtractedDataItem> & {
    tags?: string[] | Record<string, string>;
};

export type ItemDecisionSymbolLabels = Partial<Record<ItemDecisionSymbolId, string>>;

const PUBLIC_SYMBOL_LABEL_KEYS: Readonly<Partial<Record<ItemDecisionSymbolId, PublicCustomerMessageKey>>> = Object.freeze({
    vegetarian: 'menu.vegetarian',
    'non-vegetarian': 'menu.nonVeg',
    'gluten-free': 'menu.glutenFree',
    'spice-mild': 'menu.spiceMild',
    'spice-medium': 'menu.spiceMedium',
    'spice-hot': 'menu.spiceHot',
    'spice-very-hot': 'menu.spiceVeryHot',
    'for-men': 'menu.forMen',
    'for-women': 'menu.forWomen',
});

export const ITEM_DECISION_SYMBOL_DEFINITIONS: Readonly<Record<ItemDecisionSymbolId, ItemDecisionSymbolDefinition>> = Object.freeze({
    vegetarian: { id: 'vegetarian', kind: 'dietary-dot', label: 'Vegetarian', semanticColor: 'green' },
    'non-vegetarian': { id: 'non-vegetarian', kind: 'dietary-dot', label: 'Non-vegetarian', semanticColor: 'red' },
    vegan: { id: 'vegan', kind: 'leaf', label: 'Vegan', semanticColor: 'green' },
    'gluten-free': { id: 'gluten-free', kind: 'gluten-free', label: 'Gluten-free', semanticColor: 'neutral' },
    'spice-mild': { id: 'spice-mild', kind: 'spice', label: 'Mild', semanticColor: 'red', spiceMarks: 1 },
    'spice-medium': { id: 'spice-medium', kind: 'spice', label: 'Medium', semanticColor: 'red', spiceMarks: 2 },
    'spice-hot': { id: 'spice-hot', kind: 'spice', label: 'Hot', semanticColor: 'red', spiceMarks: 3 },
    'spice-very-hot': { id: 'spice-very-hot', kind: 'spice', label: 'Very hot', semanticColor: 'red', spiceMarks: 4 },
    'for-men': { id: 'for-men', kind: 'audience', label: 'For men', semanticColor: 'neutral' },
    'for-women': { id: 'for-women', kind: 'audience', label: 'For women', semanticColor: 'neutral' },
    unisex: { id: 'unisex', kind: 'audience', label: 'Unisex', semanticColor: 'neutral' },
    kids: { id: 'kids', kind: 'audience', label: 'Kids', semanticColor: 'neutral' },
    adults: { id: 'adults', kind: 'audience', label: 'Adults', semanticColor: 'neutral' },
    seniors: { id: 'seniors', kind: 'audience', label: 'Seniors', semanticColor: 'neutral' },
});

const DIETARY_SYMBOL_BY_VALUE: Readonly<Record<string, ItemDecisionSymbolId>> = Object.freeze({
    vegetarian: 'vegetarian',
    veg: 'vegetarian',
    vegan: 'vegan',
    'plant-based': 'vegan',
    'plant based': 'vegan',
    'non-vegetarian': 'non-vegetarian',
    'non vegetarian': 'non-vegetarian',
    'non-veg': 'non-vegetarian',
    nonveg: 'non-vegetarian',
    nv: 'non-vegetarian',
    'gluten-free': 'gluten-free',
    'gluten free': 'gluten-free',
    gf: 'gluten-free',
});

const SPICE_SYMBOL_BY_VALUE: Readonly<Record<string, ItemDecisionSymbolId>> = Object.freeze({
    mild: 'spice-mild',
    'less-spicy': 'spice-mild',
    'less spicy': 'spice-mild',
    medium: 'spice-medium',
    hot: 'spice-hot',
    'very-hot': 'spice-very-hot',
    'very hot': 'spice-very-hot',
});

const AUDIENCE_SYMBOL_BY_VALUE: Readonly<Record<string, ItemDecisionSymbolId>> = Object.freeze({
    'for-men': 'for-men',
    'for men': 'for-men',
    male: 'for-men',
    men: 'for-men',
    gents: 'for-men',
    'for-women': 'for-women',
    'for women': 'for-women',
    female: 'for-women',
    women: 'for-women',
    ladies: 'for-women',
    unisex: 'unisex',
    kids: 'kids',
    kid: 'kids',
    child: 'kids',
    children: 'kids',
    adults: 'adults',
    adult: 'adults',
    seniors: 'seniors',
    senior: 'seniors',
});

const SYMBOL_ORDER: readonly ItemDecisionSymbolId[] = Object.freeze([
    'vegetarian',
    'non-vegetarian',
    'vegan',
    'gluten-free',
    'spice-mild',
    'spice-medium',
    'spice-hot',
    'spice-very-hot',
    'for-men',
    'for-women',
    'unisex',
    'kids',
    'adults',
    'seniors',
]);

function normalizeValue(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_]+/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function getLegacyTags(tags: ItemDecisionSymbolSource['tags']): string[] {
    if (Array.isArray(tags)) {
        try {
            return Array.from(tags)
                .slice(0, 32)
                .filter((tag): tag is string => typeof tag === 'string');
        } catch {
            return [];
        }
    }
    if (!tags || typeof tags !== 'object') return [];
    try {
        return Object.keys(tags)
            .slice(0, 32)
            .flatMap((key) => {
                const descriptor = Object.getOwnPropertyDescriptor(tags, key);
                return descriptor && typeof descriptor.value === 'string'
                    ? descriptor.value.split(',')
                    : [];
            });
    } catch {
        return [];
    }
}

function addMappedValues(
    values: readonly string[],
    mapping: Readonly<Record<string, ItemDecisionSymbolId>>,
    symbols: Set<ItemDecisionSymbolId>,
): void {
    values.forEach((value) => {
        const symbol = mapping[normalizeValue(value)];
        if (symbol) symbols.add(symbol);
    });
}

export function resolveItemDecisionSymbolIds(
    item: unknown,
    maxSymbols = 6,
): ItemDecisionSymbolId[] {
    if (!item || typeof item !== 'object' || Array.isArray(item) || maxSymbols <= 0) return [];
    const source = item as ItemDecisionSymbolSource;

    const symbols = new Set<ItemDecisionSymbolId>();
    const dietaryTags = getDecisionFactArray(source, 'dietaryTags');
    addMappedValues(dietaryTags, DIETARY_SYMBOL_BY_VALUE, symbols);

    const spiceLevel = getDecisionFactString(source, 'spiceLevel');
    if (spiceLevel) addMappedValues([spiceLevel], SPICE_SYMBOL_BY_VALUE, symbols);

    const targetAudience = getDecisionFactString(source, 'targetAudience');
    if (targetAudience) addMappedValues([targetAudience], AUDIENCE_SYMBOL_BY_VALUE, symbols);

    // Legacy tags are compatibility input only. They never create spice facts.
    let rawTags: ItemDecisionSymbolSource['tags'];
    try {
        const descriptor = Object.getOwnPropertyDescriptor(source, 'tags');
        rawTags = descriptor && 'value' in descriptor
            ? descriptor.value as ItemDecisionSymbolSource['tags']
            : undefined;
    } catch {
        rawTags = undefined;
    }
    const legacyTags = getLegacyTags(rawTags);
    addMappedValues(legacyTags, DIETARY_SYMBOL_BY_VALUE, symbols);
    addMappedValues(legacyTags, AUDIENCE_SYMBOL_BY_VALUE, symbols);

    // Vegan is already a stronger vegetarian signal, so avoid redundant adjacent marks.
    if (symbols.has('vegan')) symbols.delete('vegetarian');

    return SYMBOL_ORDER.filter((symbol) => symbols.has(symbol)).slice(0, Math.min(6, maxSymbols));
}

export function getItemDecisionSymbolDefinition(
    id: ItemDecisionSymbolId,
): ItemDecisionSymbolDefinition {
    return ITEM_DECISION_SYMBOL_DEFINITIONS[id];
}

export function getPublicItemDecisionSymbolLabels(
    translate: PublicCustomerTranslator,
): ItemDecisionSymbolLabels {
    return Object.fromEntries(
        Object.entries(PUBLIC_SYMBOL_LABEL_KEYS).map(([id, key]) => [id, translate(key)]),
    ) as ItemDecisionSymbolLabels;
}

export function isItemDecisionSymbolId(value: unknown): value is ItemDecisionSymbolId {
    return typeof value === 'string'
        && Object.prototype.hasOwnProperty.call(ITEM_DECISION_SYMBOL_DEFINITIONS, value);
}

export function isLegacyDecisionSymbolTag(value: string): boolean {
    const normalized = normalizeValue(value);
    return Boolean(DIETARY_SYMBOL_BY_VALUE[normalized] || AUDIENCE_SYMBOL_BY_VALUE[normalized]);
}

export function collectUsedItemDecisionSymbolIds(
    items: readonly { decisionSymbols?: readonly ItemDecisionSymbolId[] }[],
): ItemDecisionSymbolId[] {
    const used = new Set<ItemDecisionSymbolId>();
    items.forEach((item) => {
        item.decisionSymbols?.forEach((symbol) => {
            if (isItemDecisionSymbolId(symbol)) used.add(symbol);
        });
    });
    return SYMBOL_ORDER.filter((symbol) => used.has(symbol));
}
