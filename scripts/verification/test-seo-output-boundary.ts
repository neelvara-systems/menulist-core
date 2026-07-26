import assert from 'node:assert/strict';
import { normalizeSeoGenerationResult } from '../../src/lib/ai/seoOutput';

const valid = {
    keywords: ['cafe', ' breakfast ', 'cafe'],
    metaDescription: 'Fresh breakfast and coffee served daily.',
    metaTitle: 'Green Table Cafe',
    tagline: 'Good food, close to home',
};

assert.deepEqual(normalizeSeoGenerationResult(valid), {
    ...valid,
    keywords: ['cafe', 'breakfast'],
});

assert.equal(normalizeSeoGenerationResult(null), null);
assert.equal(normalizeSeoGenerationResult([]), null);
assert.equal(normalizeSeoGenerationResult({ ...valid, metaTitle: { unsafe: true } }), null);
assert.equal(normalizeSeoGenerationResult({ ...valid, keywords: [] }), null);
assert.equal(normalizeSeoGenerationResult({ ...valid, keywords: ['valid', { unsafe: true }] }), null);
assert.equal(normalizeSeoGenerationResult({ ...valid, tagline: '' }), null);

const long = normalizeSeoGenerationResult({
    ...valid,
    keywords: Array.from({ length: 12 }, (_, index) => ` keyword-${index} ${'x'.repeat(100)}`),
    metaDescription: `Line one\n${'d'.repeat(200)}`,
    metaTitle: `  ${'m'.repeat(80)}  `,
});
assert.ok(long);
assert.equal(long.keywords.length, 10);
assert.ok(long.keywords.every((keyword) => keyword.length <= 80));
assert.equal(long.metaDescription.length, 160);
assert.equal(long.metaDescription.includes('\n'), false);
assert.equal(long.metaTitle.length, 60);

console.log('SEO output boundary tests passed');
