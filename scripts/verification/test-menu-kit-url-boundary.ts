import assert from 'node:assert/strict';

import {
    buildMenuKitUrl,
    MENU_KIT_ASSET_KEYS,
    normalizeMenuKitInput,
    validateMenuUrl,
} from '../../src/lib/menu-kit/types';
import {
    resolveMenuKitAssetTemplateFamilyId,
    resolveMenuKitZipTemplateFamilyId,
} from '../../src/lib/menu-kit/menuKitGenerator';

assert.equal(validateMenuUrl('https://example.com/menu'), 'https://example.com/menu');
assert.equal(validateMenuUrl(' https://example.com/menu '), 'https://example.com/menu');
assert.equal(validateMenuUrl('http://example.com/menu'), null);
assert.equal(
    validateMenuUrl('http://tenant.localhost:3000/menu'),
    process.env.NODE_ENV === 'production' ? null : 'http://tenant.localhost:3000/menu',
);
assert.equal(
    validateMenuUrl('http://127.0.0.1:3000/menu'),
    process.env.NODE_ENV === 'production' ? null : 'http://127.0.0.1:3000/menu',
);
assert.equal(validateMenuUrl('http://tenant.localhost.evil.example/menu'), null);
assert.equal(validateMenuUrl('javascript:alert(1)'), null);
assert.equal(validateMenuUrl('https://user:secret@example.com/menu'), null);
assert.equal(validateMenuUrl('//example.com/menu'), null);
assert.equal(validateMenuUrl({ href: 'https://example.com/menu' }), null);

assert.equal(
    buildMenuKitUrl('https://example.com/menu?lang=en', 'table_tent'),
    'https://example.com/menu?lang=en&utm_source=menu_kit&utm_medium=table_tent',
);

assert.equal(MENU_KIT_ASSET_KEYS.length, 10);
assert.equal(new Set(MENU_KIT_ASSET_KEYS).size, MENU_KIT_ASSET_KEYS.length);
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(resolveMenuKitAssetTemplateFamilyId({
        templateFamilyId: 'botanical-heritage',
        templateFamilyIds: {
            [assetKey]: 'executive-dark',
        },
    }, assetKey), 'botanical-heritage');
}
const legacyThemeInput = {
    templateFamilyIds: {
        entrance_poster: 'executive-dark',
        takeaway_card: 'botanical-heritage',
    },
};
assert.equal(resolveMenuKitZipTemplateFamilyId(legacyThemeInput), 'midnight-gold');
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(resolveMenuKitAssetTemplateFamilyId(legacyThemeInput, assetKey), 'midnight-gold');
}

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
    templateFamilyIds: {
        entrance_poster: ' executive-dark ',
        unknown_asset: 'must-not-survive',
    },
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
    templateFamilyIds: {
        entrance_poster: 'executive-dark',
    },
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
