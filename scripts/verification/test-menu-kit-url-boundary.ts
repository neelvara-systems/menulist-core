import assert from 'node:assert/strict';

import {
    buildMenuKitUrl,
    normalizeMenuKitInput,
    validateMenuUrl,
} from '../../src/lib/menu-kit/types';

assert.equal(validateMenuUrl('https://example.com/menu'), 'https://example.com/menu');
assert.equal(validateMenuUrl(' https://example.com/menu '), 'https://example.com/menu');
assert.equal(validateMenuUrl('http://example.com/menu'), null);
assert.equal(validateMenuUrl('javascript:alert(1)'), null);
assert.equal(validateMenuUrl('https://user:secret@example.com/menu'), null);
assert.equal(validateMenuUrl('//example.com/menu'), null);
assert.equal(validateMenuUrl({ href: 'https://example.com/menu' }), null);

assert.equal(
    buildMenuKitUrl('https://example.com/menu?lang=en', 'table_tent'),
    'https://example.com/menu?lang=en&utm_source=menu_kit&utm_medium=table_tent',
);

const publishedAt = new Date('2026-07-29T00:00:00.000Z');
assert.deepEqual(normalizeMenuKitInput({
    storeName: '  Example\nCafe ',
    menuUrl: ' https://example.com/menu?lang=en ',
    shortLink: 'stale.example/other',
    logoUrl: ' https://cdn.example.com/logo.png ',
    brandColor: ' #abcdef ',
    businessType: ' Cafe ',
    businessCategory: ' Food ',
    activePlanType: ' menulist_pro ',
    locale: ' en-IN ',
    templateFamilyId: ' classic-luxe ',
    lastPublishedAt: publishedAt,
    unknownPrivateField: 'must-not-survive',
}), {
    storeName: 'Example Cafe',
    menuUrl: 'https://example.com/menu?lang=en',
    shortLink: 'example.com/menu?lang=en',
    logoUrl: 'https://cdn.example.com/logo.png',
    brandColor: '#abcdef',
    businessType: 'Cafe',
    businessCategory: 'Food',
    activePlanType: 'menulist_pro',
    locale: 'en-IN',
    templateFamilyId: 'classic-luxe',
    lastPublishedAt: publishedAt,
});

let accessorExecuted = false;
const accessorInput: Record<string, unknown> = {
    menuUrl: 'https://example.com/menu',
};
Object.defineProperty(accessorInput, 'storeName', {
    enumerable: true,
    get() {
        accessorExecuted = true;
        throw new Error('persisted Menu Kit accessor must not execute');
    },
});
assert.equal(normalizeMenuKitInput(accessorInput), null);
assert.equal(accessorExecuted, false);
assert.equal(normalizeMenuKitInput({
    storeName: { malformed: true },
    menuUrl: 'https://example.com/menu',
}), null);
assert.equal(normalizeMenuKitInput({
    storeName: 'Example',
    menuUrl: ['https://example.com/menu'],
}), null);
assert.deepEqual(normalizeMenuKitInput({
    storeName: 'Example',
    menuUrl: 'https://example.com/menu',
    lastPublishedAt: { seconds: 1 },
    shortLink: { malformed: true },
}), {
    storeName: 'Example',
    menuUrl: 'https://example.com/menu',
    shortLink: 'example.com/menu',
});

console.log('Menu Kit URL boundary tests passed.');
