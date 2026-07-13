import assert from 'node:assert/strict';
import { normalizeBusinessCopyGenerationResult } from '../../src/lib/ai/businessCopyOutput';

const valid = {
    descriptor: 'Neighbourhood cafe',
    keywords: ['cafe', ' breakfast ', 'cafe'],
    knownFor: 'Breakfast and coffee',
    metaDescription: 'Fresh breakfast and coffee served daily.',
    metaTitle: 'Green Table Cafe',
    pwaShortName: 'Green Table',
    specialNote: 'Breakfast is served until noon.',
    tagline: 'Good food, close to home',
};

assert.deepEqual(normalizeBusinessCopyGenerationResult(valid), {
    ...valid,
    keywords: ['cafe', 'breakfast'],
});

assert.equal(normalizeBusinessCopyGenerationResult(null), null);
assert.equal(normalizeBusinessCopyGenerationResult([]), null);
assert.equal(normalizeBusinessCopyGenerationResult({ ...valid, specialNote: undefined }), null);
assert.equal(normalizeBusinessCopyGenerationResult({ ...valid, keywords: [] }), null);
assert.equal(normalizeBusinessCopyGenerationResult({ ...valid, keywords: ['valid', { unsafe: true }] }), null);
assert.equal(normalizeBusinessCopyGenerationResult({ ...valid, tagline: '' }), null);

const long = normalizeBusinessCopyGenerationResult({
    ...valid,
    descriptor: `  ${'d'.repeat(80)}  `,
    keywords: Array.from({ length: 12 }, (_, index) => ` keyword-${index} ${'x'.repeat(100)}`),
    specialNote: `Line one\n${'n'.repeat(200)}`,
});
assert.ok(long);
assert.equal(long.descriptor.length, 40);
assert.equal(long.keywords.length, 10);
assert.ok(long.keywords.every((keyword) => keyword.length <= 80));
assert.equal(long.specialNote.length, 140);
assert.equal(long.specialNote.includes('\n'), false);

console.log('business copy output boundary tests passed');
