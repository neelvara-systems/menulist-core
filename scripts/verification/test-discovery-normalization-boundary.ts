import assert from 'node:assert/strict';

import {
    enforceContrast,
    getContrastRatioString,
    getLuminance,
    isWCAGCompliant,
} from '../../src/lib/colorEnforcement';
import {
    createProvenanceEntry,
    detectChangedFields,
} from '../../src/lib/infrastructure/provenance/tracker';
import {
    extractStoreSemanticProfile,
    getAllSemanticAttributes,
} from '../../src/lib/infrastructure/semantics/attributeRegistry';
import {
    getAllTaxonomyCategories,
    getAllDietaryTags,
    getAllOfferingTags,
    getTaxonomyCategories,
} from '../../src/lib/infrastructure/taxonomy/registry';
import { BUSINESS_CATEGORIES } from '../../src/data/shared/businessTypes';
import { getActiveBusinessAttributeLabels } from '../../src/services/ai/businessCopy/utils';

assert.equal(getLuminance('#000'), 0);
assert.equal(getLuminance('fff'), 1);
assert.equal(Number.isNaN(getLuminance('#ffff')), true);
assert.equal(Number.isNaN(getLuminance('not-a-color')), true);
assert.equal(enforceContrast('not-a-color', '#fff', '#111'), '#111');
assert.equal(isWCAGCompliant('not-a-color', '#fff'), false);
assert.equal(getContrastRatioString('not-a-color', '#fff'), 'invalid');

assert.equal(createProvenanceEntry('ai_extraction', Number.NaN).confidence, 0);
assert.equal(createProvenanceEntry('ai_extraction', Number.POSITIVE_INFINITY).confidence, 0);
assert.equal(createProvenanceEntry('ai_extraction', 2).confidence, 1);

const cyclicTags: unknown[] = [];
cyclicTags.push(cyclicTags);
assert.deepEqual(
    detectChangedFields(
        { name: { en: 'Tea' }, tags: cyclicTags },
        { name: { en: 'Tea' }, tags: ['hot'] },
    ),
    ['tags'],
);

const throwingName = {};
Object.defineProperty(throwingName, 'en', {
    get() {
        throw new Error('name access should be contained');
    },
});
assert.doesNotThrow(() => detectChangedFields(
    { name: throwingName },
    { name: { en: 'Tea' } },
));

const firstSemanticSnapshot = getAllSemanticAttributes();
firstSemanticSnapshot[0].label = 'Mutated';
assert.notEqual(getAllSemanticAttributes()[0].label, 'Mutated');

const hostileAttributes = {};
Object.defineProperty(hostileAttributes, 'wifi', {
    get() {
        throw new Error('attribute access should be contained');
    },
});
assert.deepEqual(extractStoreSemanticProfile(hostileAttributes), {
    attributeIds: [],
    byGroup: {
        accessibility: [],
        amenity: [],
        dietary: [],
        payment: [],
        service_mode: [],
    },
});
assert.deepEqual(getActiveBusinessAttributeLabels(hostileAttributes), []);

const categorySnapshot = getTaxonomyCategories('food');
assert.ok(categorySnapshot.length > 0);
const originalCategoryAlias = categorySnapshot[0].aliases[0];
categorySnapshot[0].aliases[0] = 'mutated';
assert.equal(getTaxonomyCategories('food')[0].aliases[0], originalCategoryAlias);

const allTaxonomyCategories = getAllTaxonomyCategories();
assert.equal(new Set(allTaxonomyCategories.map(({ id }) => id)).size, allTaxonomyCategories.length);
assert.deepEqual(
    [...new Set(allTaxonomyCategories.map(({ businessCategory }) => businessCategory))].sort(),
    BUSINESS_CATEGORIES.map(({ value }) => value).sort(),
);
for (const businessCategory of BUSINESS_CATEGORIES) {
    const categories = getTaxonomyCategories(businessCategory.value);
    assert.ok(categories.length > 0);
    assert.equal(new Set(categories.map(({ sortOrder }) => sortOrder)).size, categories.length);
    for (const category of categories) {
        assert.equal(category.businessCategory, businessCategory.value);
        assert.ok(category.id.length > 0 && category.label.trim().length > 0);
        assert.ok(Number.isInteger(category.sortOrder) && category.sortOrder > 0);
        assert.ok(category.aliases.length > 0 && category.aliases.every((alias) => alias.trim().length > 0));
        assert.equal(
            new Set(category.aliases.map((alias) => alias.trim().toLowerCase())).size,
            category.aliases.length,
        );
    }
}

const dietarySnapshot = getAllDietaryTags();
assert.ok(dietarySnapshot.length > 0);
assert.equal(new Set(dietarySnapshot.map(({ id }) => id)).size, dietarySnapshot.length);
assert.equal(dietarySnapshot.some(({ schemaOrg }) => schemaOrg === null), false);
const originalDietaryAlias = dietarySnapshot[0].aliases[0];
dietarySnapshot[0].aliases[0] = 'mutated';
assert.equal(getAllDietaryTags()[0].aliases[0], originalDietaryAlias);

const offeringSnapshot = getAllOfferingTags();
assert.ok(offeringSnapshot.length > 0);
assert.equal(new Set(offeringSnapshot.map(({ id }) => id)).size, offeringSnapshot.length);
const originalScope = offeringSnapshot[0].scope[0];
offeringSnapshot[0].scope[0] = 'mutated';
assert.equal(getAllOfferingTags()[0].scope[0], originalScope);

console.log('Discovery normalization boundary verification passed.');
