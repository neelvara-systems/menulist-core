import assert from 'node:assert/strict';
import { sanitizeMenuForPrint } from '@lib/menu-card-export/source/sanitizeMenuForPrint';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import {
    DEFAULT_PUBLIC_MENU_CURRENCY_CODE,
    resolvePublicMenuCurrencyCode,
    resolvePublicMenuCurrencySymbol,
} from '@lib/pricing/publicCurrency';
import { normalizeExtractedMenuPriceTruth, normalizeProjectPriceTruth } from '@lib/pricing/projectPriceTruth';
import {
    getPublicItemDisplayOptions,
    hasPublicItemDisplayPrice,
} from '@lib/pricing/publicItemPricePresentation';
import {
    formatScreenPrice,
    getScreenItemPrice,
    hasScreenPrice,
    parseScreenPrice,
} from '@lib/screen/screenContent';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';
import {
    applyBulkPricing,
    computePricingPreview,
} from '../../src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations';
import { itemMatchesFilters } from '../../src/components/templates/main-app/projects/editorView/utils/itemFilters';

assert.deepEqual(normalizeOptionalMenuPrice(' 299 '), { success: true, data: '299' });
assert.deepEqual(normalizeOptionalMenuPrice('Market Price'), { success: true, data: 'Market Price' });
assert.deepEqual(normalizeOptionalMenuPrice('बाजार भाव'), { success: true, data: 'बाजार भाव' });
assert.deepEqual(normalizeOptionalMenuPrice('₹1,299–₹1,499'), { success: true, data: '₹1,299–₹1,499' });
assert.deepEqual(normalizeOptionalMenuPrice(''), { success: true, data: '' });
assert.equal(normalizeOptionalMenuPrice(-1).success, false);
assert.equal(normalizeOptionalMenuPrice('<b>299</b>').success, false);
assert.equal(normalizeOptionalMenuPrice('299 🎉').success, false);
assert.equal(normalizeOptionalMenuPrice('299 ☕').success, false);
assert.equal(normalizeOptionalMenuPrice('299\u200B').success, false);
assert.equal(normalizeOptionalMenuPrice('100--20').success, false);
assert.equal(normalizeOptionalMenuPrice('x'.repeat(41)).success, false);

const project = normalizeProjectPriceTruth({
    files: [{
        extractedData: {
            data: {
                items: [{
                    price: 299,
                    attributes: [
                        { price: ' 199 ' },
                        { price: 'Market Price' },
                        { price: '' },
                    ],
                }],
            },
        },
    }],
    overrides: {
        items: { item1: { price: ' 349 ' } },
        attributes: { option1: { price: '' } },
    },
});
assert.equal(project.files[0].extractedData.data.items[0].price, '299');
assert.deepEqual(
    project.files[0].extractedData.data.items[0].attributes.map((attribute: { price: string }) => attribute.price),
    ['199', 'Market Price', ''],
);
assert.equal(project.overrides.items.item1.price, '349');
assert.equal(project.overrides.attributes.option1.price, '');
assert.throws(() => normalizeProjectPriceTruth({ files: [{ extractedData: { data: { items: [{ price: '<script>' }] } } }] }));
assert.equal(normalizeExtractedMenuPriceTruth({ items: [{ price: ' 299 ' }] }).items[0].price, '299');
assert.throws(() => normalizeExtractedMenuPriceTruth({ items: [{ price: '299 🎉' }] }));
const partiallyValidExtractedPrices = {
    items: [{ price: ' 299 ' }, { price: '<script>' }],
};
assert.throws(() => normalizeExtractedMenuPriceTruth(partiallyValidExtractedPrices));
assert.equal(
    partiallyValidExtractedPrices.items[0].price,
    ' 299 ',
    'a later invalid price must not partially normalize an extracted menu',
);
const partiallyValidProjectPrices = {
    files: [{ extractedData: { data: { items: [{ price: ' 199 ' }] } } }],
    overrides: { items: { invalid: { price: '299 🎉' } } },
};
assert.throws(() => normalizeProjectPriceTruth(partiallyValidProjectPrices));
assert.equal(
    partiallyValidProjectPrices.files[0].extractedData.data.items[0].price,
    ' 199 ',
    'an invalid override must not leave an earlier project item partially normalized',
);

assert.equal(formatMenuPrice('199–249', '₹'), '₹199–249');
assert.equal(resolvePublicMenuCurrencyCode(' usd '), 'USD');
assert.equal(resolvePublicMenuCurrencyCode(''), DEFAULT_PUBLIC_MENU_CURRENCY_CODE);
assert.equal(resolvePublicMenuCurrencyCode('US'), DEFAULT_PUBLIC_MENU_CURRENCY_CODE);
assert.equal(resolvePublicMenuCurrencySymbol('$', 'USD'), '$');
assert.equal(resolvePublicMenuCurrencySymbol('', 'USD'), '$');
assert.equal(resolvePublicMenuCurrencySymbol(undefined, 'INR'), '₹');
assert.equal(resolvePublicMenuCurrencySymbol('x'.repeat(9), 'EUR'), '€');
assert.equal(resolvePublicMenuCurrencySymbol('$', undefined), '₹');
assert.equal(resolvePublicMenuCurrencySymbol(`$\u202e`, 'USD'), '$');
assert.equal(hasPublicItemDisplayPrice({ price: 'Market Price' }), true);
assert.equal(hasPublicItemDisplayPrice({ price: '', attributes: [{ active: true, price: '149' }] }), true);
assert.equal(hasPublicItemDisplayPrice({ price: '', attributes: [{ active: false, price: '149' }] }), false);
assert.deepEqual(getPublicItemDisplayOptions({
    attributes: [
        { id: 'small', active: true, name: { en: 'Small', hi: 'छोटा' }, price: '100' },
        { id: 'oat', name: { en: 'Oat milk' }, price: '' },
        { id: 'retired', active: false, name: { en: 'Retired' }, price: '1' },
        { id: 'nameless', active: true, name: { en: '' }, price: '20' },
    ],
}, 'hi', '₹'), [
    { id: 'small', name: 'छोटा', priceLabel: '₹100.00' },
    { id: 'oat', name: 'Oat milk' },
]);
assert.equal(parseScreenPrice('Market Price'), 'Market Price');
assert.equal(formatScreenPrice('199-249', '₹'), '₹199-249');
assert.equal(hasScreenPrice('Market Price'), true);
assert.equal(hasScreenPrice(''), false);
assert.equal(getScreenItemPrice({
    price: '999',
    attributes: [
        { active: true, price: '100' },
        { price: '200' },
        { active: false, price: '1' },
    ],
}), '100-200');

const printProjection = sanitizeMenuForPrint([
    {
        id: 'variant-item',
        name: { en: 'Coffee' },
        price: '',
        attributes: [
            { active: true, name: { en: 'Small' }, price: '100' },
            { active: false, name: { en: 'Retired' }, price: '1' },
        ],
    },
], [], 'en');
assert.equal(printProjection.missingPriceCount, 0);
assert.equal(printProjection.categories[0].items[0].attributes.length, 1);

const completeOptionProjection = sanitizeMenuForPrint([{
    id: 'forty-option-item',
    name: { en: 'Choose a size' },
    attributes: [
        ...Array.from({ length: 40 }, (_, index) => ({
            active: true,
            name: { en: `Option ${index + 1}` },
            price: index % 2 === 0 ? String(100 + index) : '',
        })),
        { active: false, name: { en: 'Inactive option' }, price: '999' },
    ],
}], [], 'en');
assert.equal(completeOptionProjection.categories[0].items[0].attributes.length, 40);
assert.equal(completeOptionProjection.categories[0].items[0].attributes[39]?.name, 'Option 40');
assert.equal(
    completeOptionProjection.categories[0].items[0].attributes.some((attribute) => attribute.name === 'Inactive option'),
    false,
);

const bulkItems = [
    {
        id: 'numeric',
        name: 'Numeric',
        price: '₹1,299',
        category: 'cat',
        categoryName: 'Category',
        fileUid: 'file',
        active: true,
        available: true,
        isLocked: false,
    },
    {
        id: 'text',
        name: 'Text',
        price: 'Market Price',
        category: 'cat',
        categoryName: 'Category',
        fileUid: 'file',
        active: true,
        available: true,
        isLocked: false,
    },
    {
        id: 'range',
        name: 'Range',
        price: '199-249',
        category: 'cat',
        categoryName: 'Category',
        fileUid: 'file',
        active: true,
        available: true,
        isLocked: false,
    },
];
const bulkPreview = computePricingPreview(bulkItems, { method: 'increasePercent', value: 10 });
assert.equal(bulkPreview.itemsAffected, 1);
assert.equal(bulkPreview.itemsSkipped, 2);
assert.equal(bulkPreview.allChanges[0]?.oldPrice, 1299);

const unchangedFixedPreview = computePricingPreview([
    {
        ...bulkItems[0],
        price: '₹80',
    },
], { method: 'setFixed', value: 80 });
assert.equal(unchangedFixedPreview.itemsAffected, 0);
assert.equal(unchangedFixedPreview.allChanges.length, 0);

const attributeOnlyFixedPreview = computePricingPreview([
    {
        ...bulkItems[0],
        price: '₹80',
        attributes: [{ id: 'large', name: 'Large', price: '₹100' }],
    },
], { method: 'setFixed', value: 80 });
assert.equal(attributeOnlyFixedPreview.itemsAffected, 1);
assert.equal(attributeOnlyFixedPreview.allChanges.length, 1);
assert.equal(attributeOnlyFixedPreview.allChanges[0]?.isAttribute, true);
assert.equal(attributeOnlyFixedPreview.allChanges[0]?.newPrice, 80);

const bulkProject = {
    files: [{
        extractedData: {
            data: {
                items: bulkItems.map((item) => ({ id: item.id, price: item.price })),
            },
        },
    }],
};
const percentageUpdated = applyBulkPricing(
    bulkProject as never,
    new Set(['numeric', 'text', 'range']),
    { method: 'increasePercent', value: 10 },
) as typeof bulkProject;
assert.equal(percentageUpdated.files[0].extractedData.data.items[0].price, '1429');
assert.equal(percentageUpdated.files[0].extractedData.data.items[1].price, 'Market Price');
assert.equal(percentageUpdated.files[0].extractedData.data.items[2].price, '199-249');

const fixedUpdated = applyBulkPricing(
    bulkProject as never,
    new Set(['text']),
    { method: 'setFixed', value: 250 },
) as typeof bulkProject;
assert.equal(fixedUpdated.files[0].extractedData.data.items[1].price, '250');

const textPriceItem = {
    id: 'text',
    name: { en: 'Text price' },
    price: 'Market Price',
    category: 'cat',
};
assert.equal(itemMatchesFilters(textPriceItem as never, {
    filters: {
        activeStatus: null,
        category: null,
        hasImage: null,
        hasPrice: true,
        priceRange: { min: null, max: null },
        timeSlotPreset: null,
    },
}), true);
assert.equal(itemMatchesFilters(textPriceItem as never, {
    filters: {
        activeStatus: null,
        category: null,
        hasImage: null,
        hasPrice: null,
        priceRange: { min: 100, max: 300 },
        timeSlotPreset: null,
    },
}), false);
assert.equal(itemMatchesFilters({
    ...textPriceItem,
    price: '',
    attributes: [{ id: 'option', active: true, price: '₹199' }],
} as never, {
    filters: {
        activeStatus: null,
        category: null,
        hasImage: null,
        hasPrice: true,
        priceRange: { min: 100, max: 300 },
        timeSlotPreset: null,
    },
}), true);

console.log('Menu price boundary tests passed.');
