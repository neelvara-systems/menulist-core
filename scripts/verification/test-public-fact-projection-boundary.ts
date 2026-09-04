import assert = require('node:assert/strict');

import {
    logHoursStatusInvalidTimeRange,
    logHoursStatusTimeZoneFallback,
} from '../../src/lib/hours/hoursDiagnostics';
import {
    getDecisionFactArray,
    getDecisionFactNumber,
    getDecisionFactString,
    getDecisionFactValue,
    getNutritionFact,
    setDecisionFactValue,
} from '../../src/lib/menu/itemDecisionFacts';
import {
    collectUsedItemDecisionSymbolIds,
    resolveItemDecisionSymbolIds,
} from '../../src/lib/menu/itemDecisionSymbols';
import { calculatePhysicalSurfaceEligibility } from '../../src/lib/physical-surfaces/eligibility';
import { buildPrintableStoreContactFields } from '../../src/lib/printable-asset-templates/storeContact';

assert.doesNotThrow(() => logHoursStatusTimeZoneFallback(
    new Error('invalid zone'),
    { toString() { throw new Error('must not execute'); } } as never,
    'hours_engine_time',
    'default_time_zone',
));
assert.doesNotThrow(() => logHoursStatusInvalidTimeRange(
    { toString() { throw new Error('must not execute'); } } as never,
    { includes() { throw new Error('must not execute'); } } as never,
    'hours_engine_current_status',
));

assert.deepEqual(buildPrintableStoreContactFields({
    addressLine: ' ',
    address: '12 Market Road',
    city: 'Pune',
    email: 'owner@example.com',
    socialMedia: { instagram: 'menulist' },
}), {
    contactAddress: '12 Market Road, Pune',
    contactEmail: 'owner@example.com',
    contactName: undefined,
    contactPhone: undefined,
    contactRole: undefined,
    socialHandle: '@menulist',
});
assert.deepEqual(buildPrintableStoreContactFields(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('blocked');
    },
})), {
    contactAddress: undefined,
    contactEmail: undefined,
    contactName: undefined,
    contactPhone: undefined,
    contactRole: undefined,
    socialHandle: undefined,
});

const eligible = calculatePhysicalSurfaceEligibility({
    confidence: 0.9,
    subject: {
        itemId: 'item-1',
        itemName: 'Masala dosa',
        itemImageUrl: 'https://example.com/dosa.webp',
    },
    type: 'bestseller_boost',
} as never, 'https://example.com/menu', 7);
assert.equal(eligible.tentCard?.eligible, true);
assert.equal(eligible.counterSticker?.eligible, true);
assert.deepEqual(calculatePhysicalSurfaceEligibility({
    confidence: 1.5,
    subject: { itemId: 'item-1', itemName: 'Masala dosa' },
    type: 'bestseller_boost',
} as never, 'https://example.com/menu', 7), {});
assert.deepEqual(calculatePhysicalSurfaceEligibility({
    confidence: 0.9,
    subject: { itemId: '', itemName: 'Masala dosa' },
    type: 'bestseller_boost',
} as never, 'https://example.com/menu', 7), {});
assert.equal(calculatePhysicalSurfaceEligibility({
    confidence: 0.9,
    subject: { itemId: 'item-1', itemName: 'Masala dosa' },
    type: 'bestseller_boost',
} as never, 'https://example.com/menu', 7.5).counterSticker, undefined);

const facts = {
    decisionFacts: {
        dietaryTags: { value: [' Vegan ', '<b>Gluten-free</b>', 'vegan', '0'] },
        duration: { value: 45 },
        nutritionInfo: {
            value: {
                calories: 350,
                protein: 12,
                carbs: Number.NaN,
                servingSize: '<b>1 plate</b>',
            },
        },
    },
};
assert.deepEqual(getDecisionFactArray(facts as never, 'dietaryTags'), ['Vegan', 'Gluten-free']);
assert.equal(getDecisionFactNumber(facts as never, 'duration'), 45);
assert.deepEqual(getNutritionFact(facts as never), {
    calories: 350,
    protein: 12,
    servingSize: '1 plate',
});
assert.equal(getDecisionFactString(facts as never, 'materials'), undefined);

const cyclic: unknown[] = [];
cyclic.push(cyclic);
assert.equal(getDecisionFactValue({
    decisionFacts: { allergens: { value: cyclic } },
} as never, 'allergens'), undefined);
assert.equal(getDecisionFactValue(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('blocked');
    },
}) as never, 'allergens'), undefined);
assert.equal(setDecisionFactValue({
    id: 'item-1',
    active: true,
    category: 'cat-1',
    name: { en: 'Tea' },
} as never, 'materials', '   ').decisionFacts, undefined);

assert.deepEqual(resolveItemDecisionSymbolIds({
    decisionFacts: {
        dietaryTags: { value: ['vegetarian', 'gluten-free'] },
        spiceLevel: { value: 'very-hot' },
        targetAudience: { value: 'kids' },
    },
}), ['vegetarian', 'gluten-free', 'spice-very-hot', 'kids']);
assert.deepEqual(resolveItemDecisionSymbolIds({
    decisionFacts: {
        dietaryTags: { value: ['vegetarian', 'gluten-free'] },
        spiceLevel: { value: 'very-hot' },
        targetAudience: { value: 'kids' },
    },
}, 3), ['vegetarian', 'gluten-free', 'spice-very-hot']);
assert.deepEqual(resolveItemDecisionSymbolIds({
    name: { en: 'Hot deal for kids' },
    description: { en: 'Popular with adults' },
    attributes: [{ id: 'a1', active: true, name: { en: 'For women' }, price: '10' }],
    tags: ['Hot'],
}), []);
assert.deepEqual(resolveItemDecisionSymbolIds({
    dietaryTags: ['vegetarian', 'vegan'],
    spiceLevel: 'less spicy' as never,
    targetAudience: 'for-women',
}), ['vegan', 'spice-mild', 'for-women']);
assert.deepEqual(collectUsedItemDecisionSymbolIds([
    { decisionSymbols: ['spice-hot', 'vegetarian'] },
    { decisionSymbols: ['vegetarian', 'kids'] },
]), ['vegetarian', 'spice-hot', 'kids']);

process.stdout.write('Public fact projection boundary tests passed.\n');
