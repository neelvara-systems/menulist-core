import assert from 'node:assert/strict';

import {
    buildBusinessEntityIndexDoc,
    validateIndexDocSafety,
} from '../../src/lib/infrastructure/discovery/indexBuilder';
import { extractTaxonomyFromProject } from '../../src/lib/infrastructure/taxonomy/adapter';

const taxonomy = extractTaxonomyFromProject([
    null,
    'invalid',
    { extractedData: { data: { categories: [null, { id: 4, name: 'invalid' }] } } },
    {
        extractedData: {
            data: {
                categories: [{ id: ' mains ', name: ' Main dishes ' }],
                items: [
                    null,
                    { name: ' Curry ', price: 250, tags: [' Vegetarian ', 4], category: 'mains' },
                ],
            },
        },
    },
], 'food');

assert.equal(taxonomy.totalCategories, 1);
assert.equal(taxonomy.totalItems, 1);
assert.deepEqual(taxonomy.topItems, [{ name: 'Curry', price: '250' }]);

const validTimestamp = '2025-01-02T03:04:05.000Z';
const validTimestampMillis = Date.parse(validTimestamp);
const baseInput = {
    businessCategory: 'food',
    projectFiles: [],
    storeData: {
        active: true,
        activeLanguages: ['en'],
        businessAttributes: { acceptsCash: true },
        businessType: 'restaurant',
        city: 'Ahmedabad',
        country: 'India',
        defaultLanguage: 'en',
        geo: { latitude: 23.0225, longitude: 72.5714 },
        language: 'en',
        name: 'Main Store',
        priceRange: '$$' as const,
        publicPresence: { descriptor: 'Local restaurant' },
        state: 'Gujarat',
        storeId: 34,
        tenantId: 12,
        tenantName: 'Example Brand',
        workingHours: { mon: '09:00-18:00' },
    },
};

const valid = buildBusinessEntityIndexDoc({
    ...baseInput,
    projectData: {
        lastPublishedAt: {
            seconds: Math.floor(validTimestampMillis / 1000),
            nanoseconds: (validTimestampMillis % 1000) * 1_000_000,
        },
        menuVersion: 3,
    },
});
assert.equal(valid.lastPublishedAt, validTimestamp);
assert.equal(valid.storeId, 34);
assert.equal(valid.tenantId, 12);
assert.equal(validateIndexDocSafety(valid), true);
assert.equal(validateIndexDocSafety({
    ...valid,
    workingHours: {
        mon: '09:00-18:00',
        nestedSecret: 'must not be admitted',
    },
}), false);
assert.equal(validateIndexDocSafety(Object.defineProperty(
    { ...valid },
    'workingHours',
    {
        enumerable: true,
        get() {
            throw new Error('hostile persisted getter');
        },
    },
) as typeof valid), false);
const cyclicIndexDocument = { ...valid } as typeof valid & { nested?: unknown };
cyclicIndexDocument.nested = cyclicIndexDocument;
assert.equal(validateIndexDocSafety(cyclicIndexDocument), false);

for (const lastPublishedAt of [
    { toDate: 'not-a-function' },
    { toDate: () => new Date(Number.NaN) },
    { get toMillis() { throw new Error('hostile getter'); } },
    new Proxy({}, { get() { throw new Error('hostile proxy'); } }),
]) {
    const result = buildBusinessEntityIndexDoc({
        ...baseInput,
        projectData: { lastPublishedAt, menuVersion: 3 },
    });
    assert.equal(result.lastPublishedAt, undefined);
}

console.log('Discovery index boundary tests passed.');
