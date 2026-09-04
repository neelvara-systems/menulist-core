import assert from 'node:assert/strict';
import {
    MENU_CARD_PRINT_TEXT_LIMITS,
    sanitizeMenuForPrint,
} from '@lib/menu-card-export/source/sanitizeMenuForPrint';
import { normalizePrintableCategoryIcon } from '@lib/menu-card-export/render/renderCategoryIcon';

const brokenLocalized = {
    get fr() {
        throw new Error('broken preferred language');
    },
    en: 'Safe English',
};
const throwingConversion = {
    toString() {
        throw new Error('must not execute');
    },
};

const projected = sanitizeMenuForPrint(
    [
        {
            id: 'item-1',
            categoryId: 'category-1',
            name: brokenLocalized,
            description: { fr: throwingConversion, en: 'Safe description' },
            price: '12',
            tags: ['vegan', throwingConversion, 7],
            attributes: [
                { id: 1, name: brokenLocalized, price: 3 },
                {
                    get active() {
                        throw new Error('broken attribute');
                    },
                    name: 'Ignored safely',
                },
            ],
        },
    ],
    [
        { id: 'category-1', name: brokenLocalized, icon: 'lu:LuSoup' },
        { name: 'First id-less category' },
        { name: 'Second id-less category' },
    ],
    'fr',
);

assert.deepEqual(
    projected.categories.map((category) => category.id),
    ['category-1'],
);
assert.equal(projected.categories[0]?.name, 'Safe English');
assert.equal(projected.categories[0]?.icon, 'lu:LuSoup');
assert.equal(projected.categories[0]?.items[0]?.name, 'Safe English');
assert.equal(projected.categories[0]?.items[0]?.description, 'Safe description');
assert.deepEqual(projected.categories[0]?.items[0]?.tags, ['vegan', '7']);
assert.deepEqual(projected.categories[0]?.items[0]?.decisionSymbols, ['vegan']);
assert.equal(projected.categories[0]?.items[0]?.attributes[0]?.id, '1');

const decisionSymbols = sanitizeMenuForPrint(
    [
        {
            id: 'structured-food',
            categoryId: 'symbol-category',
            name: 'Paneer Bowl',
            decisionFacts: {
                dietaryTags: { value: ['vegetarian', 'gluten-free'] },
                spiceLevel: { value: 'less spicy' },
            },
            attributes: [{ name: 'Kids size', price: '8' }],
        },
        {
            id: 'owner-audience',
            categoryId: 'symbol-category',
            name: 'Junior Session',
            decisionFacts: { targetAudience: { value: 'kids' } },
            description: 'A hot deal without a spice fact.',
        },
        {
            id: 'ordinary-words',
            categoryId: 'symbol-category',
            name: 'Hot Deal',
            tags: ['Hot'],
            attributes: [{ name: 'For women size', price: '10' }],
        },
    ],
    [{ id: 'symbol-category', name: 'Symbols' }],
);
assert.deepEqual(
    decisionSymbols.categories[0]?.items.map((item) => item.decisionSymbols),
    [
        ['vegetarian', 'gluten-free', 'spice-mild'],
        ['kids'],
        [],
    ],
);

const hostileLegacyTags = new Proxy({}, {
    ownKeys() {
        throw new Error('broken legacy tags');
    },
});
const safelyIgnoredHostileTags = sanitizeMenuForPrint(
    [{ id: 'hostile-tags', name: 'Safe item', tags: hostileLegacyTags }],
    [],
);
assert.deepEqual(safelyIgnoredHostileTags.categories[0]?.items[0]?.decisionSymbols, []);

const idless = sanitizeMenuForPrint(
    [
        { id: 'first', categoryId: 'First category', name: 'First', price: '1' },
        { id: 'second', categoryId: 'Second category', name: 'Second', price: '2' },
    ],
    [
        { name: 'First category' },
        { name: 'Second category' },
    ],
);
assert.deepEqual(
    idless.categories.map((category) => category.id),
    ['First category', 'Second category'],
);
assert.deepEqual(
    idless.categories.map((category) => category.items[0]?.id),
    ['first', 'second'],
);

const unnamed = sanitizeMenuForPrint(
    [
        { id: 'fallback-first', categoryId: 'category-0', name: 'First fallback', price: '1' },
        { id: 'fallback-second', categoryId: 'category-1', name: 'Second fallback', price: '2' },
    ],
    [{}, {}],
);
assert.deepEqual(
    unnamed.categories.map((category) => category.id),
    ['category-0', 'category-1'],
);
assert.deepEqual(
    unnamed.categories.map((category) => category.items[0]?.id),
    ['fallback-first', 'fallback-second'],
);

const hostileItems = new Proxy([], {
    get() {
        throw new Error('broken item array');
    },
});
assert.deepEqual(sanitizeMenuForPrint(hostileItems, [], 'en').categories, []);

const bounded = sanitizeMenuForPrint(
    [{
        id: 'i'.repeat(MENU_CARD_PRINT_TEXT_LIMITS.ID + 50),
        categoryId: 'bounded-category',
        name: 'n'.repeat(MENU_CARD_PRINT_TEXT_LIMITS.ITEM_NAME + 50),
        description: 'd'.repeat(MENU_CARD_PRINT_TEXT_LIMITS.DESCRIPTION + 50),
        tags: ['t'.repeat(MENU_CARD_PRINT_TEXT_LIMITS.TAG + 50)],
        attributes: [{
            name: 'a'.repeat(MENU_CARD_PRINT_TEXT_LIMITS.ATTRIBUTE_NAME + 50),
        }],
    }],
    [{ id: 'bounded-category', name: 'c'.repeat(MENU_CARD_PRINT_TEXT_LIMITS.CATEGORY_NAME + 50) }],
);
const boundedCategory = bounded.categories[0];
const boundedItem = boundedCategory?.items[0];
assert.equal(boundedCategory?.name.length, MENU_CARD_PRINT_TEXT_LIMITS.CATEGORY_NAME);
assert.equal(boundedItem?.id.length, MENU_CARD_PRINT_TEXT_LIMITS.ID);
assert.equal(boundedItem?.name.length, MENU_CARD_PRINT_TEXT_LIMITS.ITEM_NAME);
assert.equal(boundedItem?.description?.length, MENU_CARD_PRINT_TEXT_LIMITS.DESCRIPTION);
assert.equal(boundedItem?.tags[0]?.length, MENU_CARD_PRINT_TEXT_LIMITS.TAG);
assert.equal(boundedItem?.attributes[0]?.name.length, MENU_CARD_PRINT_TEXT_LIMITS.ATTRIBUTE_NAME);

const categoryIconBoundary = sanitizeMenuForPrint(
    [
        { id: 'valid-lucide-item', categoryId: 'valid-lucide', name: 'Soup' },
        { id: 'valid-emoji-item', categoryId: 'valid-emoji', name: 'Pizza' },
        { id: 'invalid-item', categoryId: 'invalid-icon', name: 'Unsafe' },
    ],
    [
        { id: 'valid-lucide', name: 'Soups', icon: ' lu:LuSoup ' },
        { id: 'valid-emoji', name: 'Pizza', icon: 'emoji:🍕' },
        { id: 'invalid-icon', name: 'Unsafe', icon: 'emoji:<svg onload=alert(1)>' },
    ],
);
assert.equal(categoryIconBoundary.categories[0]?.icon, 'lu:LuSoup');
assert.equal(categoryIconBoundary.categories[1]?.icon, 'emoji:🍕');
assert.equal(categoryIconBoundary.categories[2]?.icon, undefined);
assert.equal(normalizePrintableCategoryIcon('lu:LuSoup'), 'lu:LuSoup');
assert.equal(normalizePrintableCategoryIcon('emoji:🍕'), 'emoji:🍕');
assert.equal(normalizePrintableCategoryIcon('lu:LuDefinitelyNotAnIcon'), '');
assert.equal(
    sanitizeMenuForPrint(
        [{ id: 'hidden-icon-item', categoryId: 'hidden-icon', name: 'Soup' }],
        [{ id: 'hidden-icon', name: 'Soups', icon: 'lu:LuSoup' }],
        'en',
        false,
    ).categories[0]?.icon,
    undefined,
    'the shared menu design switch must suppress category icons in print',
);

console.log('Menu Card Export print sanitizer boundary tests passed.');
