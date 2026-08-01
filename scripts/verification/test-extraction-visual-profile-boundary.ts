import assert = require('node:assert/strict');

import {
    isValidCategoryName,
    isValidItemName,
    validateExtractedCategory,
    validateExtractedItem,
} from '../../src/lib/extraction/validation';
import { buildVisualProfileCompletion } from '../../src/lib/visualProfile/visualProfileCompletion';

assert.equal(isValidItemName({ en: 'Masala dosa' }), true);
assert.equal(isValidCategoryName({ hi: 'नाश्ता' }, 'en'), true);
assert.equal(isValidItemName({ en: ' '.repeat(5) }), false);
assert.equal(isValidItemName(new Proxy({}, {
    ownKeys() {
        throw new Error('blocked');
    },
})), false);
assert.equal(isValidCategoryName(Object.defineProperty({}, 'en', {
    enumerable: true,
    get() {
        throw new Error('blocked');
    },
})), false);

assert.deepEqual(validateExtractedItem({
    name: { en: 'Tea' },
    category: 'drinks',
    price: '₹20',
}), { isValid: true, warnings: [], errors: [] });
assert.equal(validateExtractedItem({
    name: 'Tea',
    category: ' ',
}).isValid, false);
assert.equal(validateExtractedItem({
    name: 'Tea',
    category: 'drinks',
    price: 20,
}).warnings.length, 1);
assert.equal(validateExtractedItem(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('blocked');
    },
})).isValid, false);
assert.equal(validateExtractedCategory({ name: { en: 'Drinks' } }).isValid, true);

const complete = buildVisualProfileCompletion({
    businessCategory: 'food',
    businessCover: 'cover.webp',
    photos: ['one.webp', 'two.webp', 'two.webp', 'three.webp'],
    projects: [{ active: true, projectImage: 'menu.webp' }],
});
assert.equal(complete.status, 'complete');
assert.equal(complete.photoCount, 3);

const malformedProjects = new Proxy([], {
    getOwnPropertyDescriptor() {
        throw new Error('blocked');
    },
});
const contained = buildVisualProfileCompletion({
    businessCategory: 'food',
    businessCover: 'cover.webp',
    photos: new Proxy([], {
        getOwnPropertyDescriptor() {
            throw new Error('blocked');
        },
    }),
    projects: malformedProjects,
});
assert.equal(contained.coverage, 'business-only');
assert.equal(contained.photoCount, 0);
assert.equal(contained.status, 'needs-attention');

const brokenInput = new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('blocked');
    },
});
assert.equal(
    buildVisualProfileCompletion(brokenInput as never).status,
    'needs-attention',
);

process.stdout.write('Extraction and visual-profile boundary tests passed.\n');
