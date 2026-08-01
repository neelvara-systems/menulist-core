import assert from 'node:assert/strict';
import {
    normalizeLegacyMenuPdfOptions,
    resolveLegacyMenuPdfIncludeQr,
} from '@lib/export/menuPdfGenerator';

assert.equal(resolveLegacyMenuPdfIncludeQr('https://menulist.ai/client/store/menu', undefined, true), true);
assert.equal(resolveLegacyMenuPdfIncludeQr('http://localhost:3000/client/store/menu', true, false), true);
assert.equal(resolveLegacyMenuPdfIncludeQr('https://menulist.ai/client/store/menu', false, true), false);
assert.equal(resolveLegacyMenuPdfIncludeQr('https://menulist.ai/client/store/menu', undefined, false), false);

for (const invalid of [
    undefined,
    null,
    '',
    '/client/store/menu',
    'javascript:alert(1)',
    'https://user:secret@menulist.ai/client/store/menu',
    { url: 'https://menulist.ai/client/store/menu' },
]) {
    assert.equal(resolveLegacyMenuPdfIncludeQr(invalid, true, true), false);
}

const normalized = normalizeLegacyMenuPdfOptions({
    categories: [],
    currency: { toString: () => 'USD' },
    items: [],
    language: 'en',
    logoUrl: 'data:image/png;base64,AAAA',
    menuUrl: 'https://menulist.ai/client/store/menu',
    projectData: {
        get modifiedOn() {
            throw new Error('must remain contained');
        },
    },
    projectId: '../other-project',
    projectName: 'Current menu',
    showDescriptions: 'true',
    storeData: {
        publicPresence: {
            logoUrl: 'https://cdn.example.com/logo.png',
        },
    },
    storeName: 'Boundary Cafe',
});
assert.equal(normalized?.menuUrl, 'https://menulist.ai/client/store/menu');
assert.equal(normalized?.projectId, undefined);
assert.equal(normalized?.currency, undefined);
assert.equal(normalized?.logoUrl, undefined);
assert.equal(normalized?.showDescriptions, undefined);
assert.equal(normalized?.storeData?.publicPresence?.logoUrl, 'https://cdn.example.com/logo.png');
assert.equal(normalizeLegacyMenuPdfOptions({ items: [], categories: [] }), null);

console.log('Legacy Menu PDF QR boundary tests passed.');
