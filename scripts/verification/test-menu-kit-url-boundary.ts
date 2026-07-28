import assert from 'node:assert/strict';

import { buildMenuKitUrl, validateMenuUrl } from '../../src/lib/menu-kit/types';

assert.equal(validateMenuUrl('https://example.com/menu'), 'https://example.com/menu');
assert.equal(validateMenuUrl(' https://example.com/menu '), 'https://example.com/menu');
assert.equal(validateMenuUrl('http://example.com/menu'), null);
assert.equal(validateMenuUrl('javascript:alert(1)'), null);
assert.equal(validateMenuUrl('https://user:secret@example.com/menu'), null);
assert.equal(validateMenuUrl('//example.com/menu'), null);

assert.equal(
    buildMenuKitUrl('https://example.com/menu?lang=en', 'table_tent'),
    'https://example.com/menu?lang=en&utm_source=menu_kit&utm_medium=table_tent',
);

console.log('Menu Kit URL boundary tests passed.');
