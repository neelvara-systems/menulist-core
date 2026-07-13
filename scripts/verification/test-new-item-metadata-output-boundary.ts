import assert from 'node:assert/strict';
import { normalizeNewItemMetadataOutput } from '../../src/lib/ai/newItemMetadataOutput';
import { NewItemMetadataRequestSchema } from '../../src/lib/validation/apiSchemas';
import { mergeGeneratedItemMetadata } from '../../src/services/ai/dataGeneration/getNewItemMetadataViaAPI';

const options = {
    businessType: 'Restaurant',
    item: {
        attributes: [
            { id: 'large', name: 'Large' },
            { id: 'small', name: 'Small' },
        ],
        description: 'Owner description',
        name: 'Owner name',
    },
    sourceLanguageCode: 'en',
    targetLanguageCodes: ['en', 'fr'],
};

const normalized = normalizeNewItemMetadataOutput({
    active: false,
    allergens: ['nuts'],
    attributes: [
        { id: 'small', name: { en: 'Changed', fr: 'Petit' }, price: '1' },
        { id: 'large', name: { en: 'Changed', fr: 'Grand' }, price: '999' },
    ],
    category: 'wrong',
    description: { en: 'Changed', fr: 'Description' },
    dietaryTags: ['VEGAN', 'vegan', 'invented'],
    id: 'wrong',
    name: { en: 'Changed', fr: 'Nom' },
    spiceLevel: 'HOT',
}, options);

assert.deepEqual(normalized, {
    attributes: [
        { id: 'large', name: { en: 'Large', fr: 'Grand' } },
        { id: 'small', name: { en: 'Small', fr: 'Petit' } },
    ],
    description: { en: 'Owner description', fr: 'Description' },
    dietaryTags: ['vegan'],
    name: { en: 'Owner name', fr: 'Nom' },
    spiceLevel: 'hot',
});
assert.equal(normalizeNewItemMetadataOutput({
    attributes: [{ id: 'other', name: { en: 'Other', fr: 'Autre' } }],
    description: { en: 'Description', fr: 'Description' },
    name: { en: 'Name', fr: 'Nom' },
}, options), null);
assert.equal(normalizeNewItemMetadataOutput({
    attributes: [],
    description: { en: 'Description' },
    name: { en: 'Name', fr: 'Nom' },
}, options), null);

assert(normalized);
const merged = mergeGeneratedItemMetadata({
    active: true,
    attributes: [
        { active: true, id: 'small', name: { en: 'Small' }, price: '10' },
        { active: true, id: 'large', name: { en: 'Large' }, price: '20' },
    ],
    category: 'original',
    description: { en: 'Owner description' },
    id: 'item_1',
    name: { en: 'Owner name' },
}, normalized);
assert.equal(merged.id, 'item_1');
assert.equal(merged.category, 'original');
assert.equal(merged.active, true);
assert.equal(merged.attributes?.[0].price, '10');
assert.equal(merged.attributes?.[0].name.fr, 'Petit');
assert.equal(merged.attributes?.[1].price, '20');
assert.equal(merged.attributes?.[1].name.fr, 'Grand');

const baseRequest = {
    businessType: 'Restaurant',
    fileId: 'file_1',
    item: { id: 'item_1', name: 'Item' },
    projectId: '1-project-2',
    sourceLang: { code: 'en', name: 'English' },
    targetLang: [{ code: 'en', name: 'English' }, { code: 'fr', name: 'French' }],
};
assert.equal(NewItemMetadataRequestSchema.safeParse(baseRequest).success, true);
assert.equal(NewItemMetadataRequestSchema.safeParse({ ...baseRequest, item: { id: '', name: '' } }).success, false);
assert.equal(NewItemMetadataRequestSchema.safeParse({ ...baseRequest, projectId: 'other-project' }).success, false);
assert.equal(NewItemMetadataRequestSchema.safeParse({
    ...baseRequest,
    item: { id: 'item_1', name: 'Item', attributes: [{ id: 'a' }, { id: 'a' }] },
}).success, false);
assert.equal(NewItemMetadataRequestSchema.safeParse({
    ...baseRequest,
    targetLang: [{ code: 'fr', name: 'French' }, { code: 'fr', name: 'Duplicate' }],
}).success, false);

console.log('new item metadata output boundary tests passed');
