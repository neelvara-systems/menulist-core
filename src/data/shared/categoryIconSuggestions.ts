/**
 * Category Icon Suggestions — Shared Data (Self-Contained)
 * ═══════════════════════════════════════════════════════════════
 *
 * PRIMARY SOURCE — This file is the single source of truth.
 * It may import sibling shared data files only. Do not import app or
 * Functions-only modules.
 *
 * COPY RULE: This exact file is copied as-is to:
 *   functions/src/sharedData/categoryIconSuggestions.ts
 *
 * When updating this file, copy-paste the ENTIRE file to the backend.
 * Do NOT cherry-pick or modify — always full file replacement.
 */

import { normalizeBusinessCategory as normalizeSharedBusinessCategory } from './businessTypes';

export type CategoryIconMatchSource = 'category-name' | 'item-context' | 'fallback';
export type CategoryIconMatchConfidence = 'high' | 'medium' | 'low';

export interface CategoryIconSuggestion {
    icon: string;
    keywords: string[];
}

export interface CategoryIconMatch {
    icon: string;
    confidence: CategoryIconMatchConfidence;
    source: CategoryIconMatchSource;
    matchedKeyword?: string;
}

export interface CategoryIconTarget {
    id?: string | number;
    name?: Record<string, string>;
    icon?: unknown;
}

export interface CategoryIconItemContext {
    category?: string | number;
    categoryId?: string | number;
    name?: Record<string, string>;
}

export const CATEGORY_ICON_VALUE_MAX_LENGTH = 80;

/**
 * Keep persisted category icons inside the documented cross-runtime contract.
 * Lucide names remain data (never executable markup), while emoji values are
 * bounded so a malformed extraction cannot inflate owner or public payloads.
 */
export function normalizeCategoryIcon(value: unknown): string {
    if (typeof value !== 'string') return '';
    const candidate = value.trim();
    if (!candidate || candidate.length > CATEGORY_ICON_VALUE_MAX_LENGTH || /[\u0000-\u001F\u007F<>]/.test(candidate)) {
        return '';
    }

    if (/^lu:Lu[A-Za-z0-9]+$/.test(candidate)) return candidate;
    if (!candidate.startsWith('emoji:')) return '';

    const emoji = candidate.slice('emoji:'.length).trim();
    if (!emoji || Array.from(emoji).length > 12 || /^[\x00-\x7F]+$/.test(emoji)) return '';
    return `emoji:${emoji}`;
}

const COMMON_SUGGESTIONS: CategoryIconSuggestion[] = [
    { icon: 'lu:LuStore', keywords: ['featured', 'highlights', 'top picks', 'popular', 'special', 'signature'] },
    { icon: 'lu:LuSparkles', keywords: ['new', 'seasonal', 'limited', 'chef special', 'recommended'] },
    { icon: 'lu:LuTag', keywords: ['sale', 'offer', 'deal', 'combo', 'bundle'] },
];

const BUSINESS_CATEGORY_ICON_SUGGESTIONS: Record<string, CategoryIconSuggestion[]> = {
    food: [
        { icon: 'lu:LuUtensilsCrossed', keywords: ['menu', 'mains', 'main course', 'food', 'all day', 'house specials', 'entree', 'entrees'] },
        { icon: 'lu:LuChefHat', keywords: ['chef', 'specials', 'kitchen', 'signature'] },
        { icon: 'lu:LuCoffee', keywords: ['coffee', 'cafe', 'espresso', 'latte', 'tea', 'hot drinks'] },
        { icon: 'lu:LuCupSoda', keywords: ['drink', 'drinks', 'beverage', 'beverages', 'juice', 'soda', 'shake', 'mocktail', 'cold drinks'] },
        { icon: 'lu:LuWine', keywords: ['wine', 'cocktail', 'bar', 'spirits'] },
        { icon: 'lu:LuBeer', keywords: ['beer', 'draft', 'ale', 'lager'] },
        { icon: 'lu:LuCakeSlice', keywords: ['cake', 'bakery', 'pastry'] },
        { icon: 'lu:LuCroissant', keywords: ['croissant', 'baked', 'bread', 'toast'] },
        { icon: 'lu:LuDessert', keywords: ['dessert', 'desserts', 'sweet', 'sweets'] },
        { icon: 'lu:LuDonut', keywords: ['donut', 'doughnut'] },
        { icon: 'lu:LuPizza', keywords: ['pizza', 'flatbread'] },
        { icon: 'lu:LuSandwich', keywords: ['sandwich', 'burger', 'wrap', 'roll'] },
        { icon: 'lu:LuSalad', keywords: ['salad', 'greens', 'healthy bowls'] },
        { icon: 'lu:LuSoup', keywords: ['soup', 'broth', 'ramen'] },
        { icon: 'lu:LuFish', keywords: ['fish', 'seafood', 'sushi', 'prawn', 'shrimp'] },
        { icon: 'lu:LuBeef', keywords: ['beef', 'meat', 'steak', 'bbq', 'grill', 'kebab', 'chicken'] },
        { icon: 'lu:LuLeafyGreen', keywords: ['vegan', 'vegetarian', 'plant based', 'organic'] },
        { icon: 'lu:LuCherry', keywords: ['ice cream', 'gelato', 'frozen', 'sundae'] },
        { icon: 'lu:LuApple', keywords: ['fruit', 'fresh', 'breakfast'] },
    ],
    service: [
        { icon: 'lu:LuScissors', keywords: ['hair', 'haircut', 'barber', 'trim', 'styling', 'removal', 'remove'] },
        { icon: 'lu:LuSparkles', keywords: ['beauty', 'glow', 'facial', 'skin', 'bridal', 'makeup'] },
        { icon: 'lu:LuFlower2', keywords: ['spa', 'wellness', 'relax', 'aroma'] },
        { icon: 'lu:LuHand', keywords: ['massage', 'therapy', 'care', 'hand', 'hands', 'feet', 'foot'] },
        { icon: 'lu:LuBath', keywords: ['bath', 'spa bath', 'body soak'] },
        { icon: 'lu:LuDroplets', keywords: ['hydration', 'wash', 'cleanse'] },
        { icon: 'lu:LuShowerHead', keywords: ['wash', 'rinse', 'shower'] },
        { icon: 'lu:LuBrush', keywords: ['nail', 'nails', 'brush', 'grooming', 'gel', 'polish', 'manicure', 'pedicure', 'extension', 'extensions', 'acrylic', 'overlay', 'overlays', 'art'] },
        { icon: 'lu:LuDog', keywords: ['pet', 'dog', 'cat', 'grooming'] },
        { icon: 'lu:LuCar', keywords: ['car wash', 'detailing', 'vehicle'] },
        { icon: 'lu:LuWrench', keywords: ['repair', 'service', 'maintenance', 'fix'] },
    ],
    retail: [
        { icon: 'lu:LuShoppingBag', keywords: ['shop', 'store', 'collection', 'new arrivals', 'featured'] },
        { icon: 'lu:LuShirt', keywords: ['shirt', 'clothing', 'fashion', 'apparel', 'mens', 'womens', 'kids'] },
        { icon: 'lu:LuFootprints', keywords: ['shoes', 'footwear', 'sneakers', 'sandals'] },
        { icon: 'lu:LuGem', keywords: ['jewelry', 'diamond', 'gold', 'ring', 'luxury'] },
        { icon: 'lu:LuWatch', keywords: ['watch', 'timepiece'] },
        { icon: 'lu:LuBookOpen', keywords: ['books', 'book', 'reading', 'stationery'] },
        { icon: 'lu:LuGift', keywords: ['gift', 'gifts', 'occasion'] },
        { icon: 'lu:LuLaptop', keywords: ['laptop', 'computer', 'electronics'] },
        { icon: 'lu:LuSmartphone', keywords: ['phone', 'mobile', 'smartphone', 'gadgets'] },
        { icon: 'lu:LuSofa', keywords: ['home', 'furniture', 'living', 'decor'] },
        { icon: 'lu:LuFlower', keywords: ['flower', 'flowers', 'floral', 'bouquet'] },
        { icon: 'lu:LuStore', keywords: ['essentials', 'catalog', 'products'] },
    ],
    health: [
        { icon: 'lu:LuHeartPulse', keywords: ['wellness', 'care', 'health', 'cardio'] },
        { icon: 'lu:LuDumbbell', keywords: ['gym', 'fitness', 'strength', 'training', 'weights'] },
        { icon: 'lu:LuStethoscope', keywords: ['clinic', 'consultation', 'doctor', 'dental', 'medical'] },
        { icon: 'lu:LuPill', keywords: ['supplements', 'medicine', 'recovery'] },
        { icon: 'lu:LuSyringe', keywords: ['treatment', 'shots'] },
        { icon: 'lu:LuLeaf', keywords: ['yoga', 'holistic', 'natural'] },
        { icon: 'lu:LuBadgePlus', keywords: ['program', 'plan', 'membership'] },
    ],
    creative: [
        { icon: 'lu:LuCamera', keywords: ['photo', 'photography', 'shoot', 'studio'] },
        { icon: 'lu:LuPalette', keywords: ['art', 'design', 'creative', 'gallery'] },
        { icon: 'lu:LuMusic', keywords: ['music', 'instruments', 'lessons'] },
        { icon: 'lu:LuPenTool', keywords: ['tattoo', 'custom', 'illustration', 'editing'] },
        { icon: 'lu:LuBrush', keywords: ['makeup', 'beauty', 'paint', 'craft'] },
        { icon: 'lu:LuFlower2', keywords: ['decor', 'event', 'styling'] },
        { icon: 'lu:LuGem', keywords: ['handmade jewelry', 'artisan'] },
    ],
    professional: [
        { icon: 'lu:LuBriefcase', keywords: ['services', 'advisory', 'consulting', 'firm'] },
        { icon: 'lu:LuHome', keywords: ['property', 'real estate', 'interior', 'home'] },
        { icon: 'lu:LuCreditCard', keywords: ['finance', 'billing', 'pricing'] },
        { icon: 'lu:LuCalendarDays', keywords: ['appointments', 'bookings', 'planning'] },
        { icon: 'lu:LuMapPin', keywords: ['travel', 'destination', 'local'] },
        { icon: 'lu:LuUsers2', keywords: ['team', 'group', 'family'] },
        { icon: 'lu:LuShield', keywords: ['legal', 'compliance', 'protection'] },
    ],
    specialty: [
        { icon: 'lu:LuCar', keywords: ['car', 'auto', 'vehicle', 'garage'] },
        { icon: 'lu:LuWrench', keywords: ['repair', 'fix', 'service bay'] },
        { icon: 'lu:LuBike', keywords: ['bike', 'cycle', 'rental'] },
        { icon: 'lu:LuBaby', keywords: ['kids', 'child', 'children', 'daycare'] },
        { icon: 'lu:LuBedDouble', keywords: ['rooms', 'stay', 'hotel'] },
        { icon: 'lu:LuKeyRound', keywords: ['access', 'workspace', 'membership'] },
        { icon: 'lu:LuHome', keywords: ['space', 'property', 'rental'] },
    ],
};

function resolveIconBusinessCategory(value?: string): string {
    return normalizeSharedBusinessCategory(value) || 'food';
}

function normalizeKeyword(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesKeyword(normalizedValue: string, keyword: string): boolean {
    const normalizedKeyword = normalizeKeyword(keyword);
    if (!normalizedKeyword) return false;

    const words = normalizedKeyword.split(' ');
    const lastWord = words[words.length - 1];
    const pluralLastWord = /[^aeiou]y$/.test(lastWord)
        ? `${lastWord.slice(0, -1)}ies`
        : /(s|x|z|ch|sh)$/.test(lastWord)
            ? `${lastWord}es`
            : `${lastWord}s`;
    const pluralKeyword = [...words.slice(0, -1), pluralLastWord].join(' ');
    const paddedValue = ` ${normalizedValue} `;
    return [normalizedKeyword, pluralKeyword]
        .some((candidate) => paddedValue.includes(` ${candidate} `));
}

function findSuggestionMatch(
    normalizedValue: string,
    suggestions: CategoryIconSuggestion[],
): { suggestion: CategoryIconSuggestion; keyword: string } | null {
    if (!normalizedValue) return null;

    for (const suggestion of suggestions) {
        const keyword = suggestion.keywords.find((entry) => matchesKeyword(normalizedValue, entry));
        if (keyword) {
            return { suggestion, keyword };
        }
    }

    return null;
}

function dedupeIcons(icons: string[]): string[] {
    return Array.from(new Set(icons.filter(Boolean)));
}

function getTextValues(value?: Record<string, string>): string[] {
    if (!value || typeof value !== 'object') return [];
    return Object.values(value).filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function getCategoryId(value: CategoryIconItemContext): string {
    return String(value.category ?? value.categoryId ?? '');
}

function isValidCategoryIcon(value: unknown): value is string {
    return normalizeCategoryIcon(value).length > 0;
}

export function getCategoryIconSuggestions(categoryName?: string, businessCategory?: string, limit = 8): string[] {
    const normalizedCategory = resolveIconBusinessCategory(businessCategory);
    const scopedSuggestions = BUSINESS_CATEGORY_ICON_SUGGESTIONS[normalizedCategory] || [];
    const normalizedName = normalizeKeyword(categoryName || '');

    const matchedScoped = normalizedName
        ? scopedSuggestions.filter((entry) => entry.keywords.some((keyword) => matchesKeyword(normalizedName, keyword)))
        : [];
    const matchedCommon = normalizedName
        ? COMMON_SUGGESTIONS.filter((entry) => entry.keywords.some((keyword) => matchesKeyword(normalizedName, keyword)))
        : [];

    const ordered = dedupeIcons([
        ...matchedScoped.map((entry) => entry.icon),
        ...matchedCommon.map((entry) => entry.icon),
        ...scopedSuggestions.map((entry) => entry.icon),
        ...COMMON_SUGGESTIONS.map((entry) => entry.icon),
    ]);

    return ordered.slice(0, limit);
}

export function resolveCategoryIcon(
    categoryName?: string,
    businessCategory?: string,
    itemContext: string[] = [],
): CategoryIconMatch | null {
    const normalizedCategory = resolveIconBusinessCategory(businessCategory);
    const scopedSuggestions = BUSINESS_CATEGORY_ICON_SUGGESTIONS[normalizedCategory] || [];
    const normalizedName = normalizeKeyword(categoryName || '');

    const scopedNameMatch = findSuggestionMatch(normalizedName, scopedSuggestions);
    if (scopedNameMatch) {
        return {
            icon: scopedNameMatch.suggestion.icon,
            confidence: 'high',
            source: 'category-name',
            matchedKeyword: scopedNameMatch.keyword,
        };
    }

    const commonNameMatch = findSuggestionMatch(normalizedName, COMMON_SUGGESTIONS);
    if (commonNameMatch) {
        return {
            icon: commonNameMatch.suggestion.icon,
            confidence: 'high',
            source: 'category-name',
            matchedKeyword: commonNameMatch.keyword,
        };
    }

    const normalizedItemContext = normalizeKeyword(itemContext.join(' '));
    const scopedItemMatch = findSuggestionMatch(normalizedItemContext, scopedSuggestions);
    if (scopedItemMatch) {
        return {
            icon: scopedItemMatch.suggestion.icon,
            confidence: 'medium',
            source: 'item-context',
            matchedKeyword: scopedItemMatch.keyword,
        };
    }

    return null;
}

export function applyCategoryIconDefaults<TCategory extends CategoryIconTarget>(
    categories: TCategory[] = [],
    items: CategoryIconItemContext[] = [],
    businessCategory?: string,
): TCategory[] {
    return categories.map((category) => {
        if (isValidCategoryIcon(category.icon)) return category;

        const categoryName = getTextValues(category.name).join(' ');
        const categoryId = String(category.id ?? '');
        const itemNames = items
            .filter((item) => categoryId && getCategoryId(item) === categoryId)
            .flatMap((item) => getTextValues(item.name))
            .slice(0, 12);
        const match = resolveCategoryIcon(categoryName, businessCategory, itemNames);

        if (!match) return category;

        return {
            ...category,
            icon: match.icon,
        };
    });
}
