import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Timestamp } from 'firebase/firestore';

import {
    buildFontFaceRule,
    isSameObjects,
    updateList,
} from '../../src/utils/utils';

const first: Record<string, unknown> = {
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    nested: [{ enabled: true, updatedAt: new Date('2026-07-30T00:00:00.000Z') }],
    tags: new Set(['a', 'b']),
};
first.self = first;
const second: Record<string, unknown> = {
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    nested: [{ enabled: true, updatedAt: new Date('2026-07-30T00:00:00.000Z') }],
    tags: new Set(['a', 'b']),
};
second.self = second;
assert.equal(isSameObjects(first, second), true);
(second.nested as Array<{ enabled: boolean }>)[0]!.enabled = false;
assert.equal(isSameObjects(first, second), false);
assert.equal(isSameObjects({ value: Number.NaN }, { value: Number.NaN }), true);

assert.deepEqual(
    updateList([{ id: 'a', value: 1 }], { id: 'a', value: 2 }),
    [{ id: 'a', value: 2 }],
);
assert.deepEqual(
    updateList([{ id: 'a', value: 1 }], { id: 'b', value: 2 }, 'first'),
    [{ id: 'b', value: 2 }, { id: 'a', value: 1 }],
);

const safeFontRule = buildFontFaceRule({
    code: 'MenuListSans',
    fileUrl: 'https://firebasestorage.googleapis.com/v0/b/example/o/font.woff2',
});
assert.ok(safeFontRule?.includes('font-family: "MenuListSans"'));
assert.ok(safeFontRule?.includes('url("https://firebasestorage.googleapis.com/'));
assert.equal(buildFontFaceRule({
    code: 'bad\";color:red;/*',
    fileUrl: 'https://example.com/font.woff2',
}), null);
assert.equal(buildFontFaceRule({
    code: 'SafeCode',
    fileUrl: "https://example.com/font.woff2');}body{display:none}/*",
}), null);
assert.equal(buildFontFaceRule({ code: 'SafeCode', fileUrl: 'javascript:alert(1)' }), null);

const utilitySource = readFileSync(resolve(process.cwd(), 'src/utils/utils.ts'), 'utf8');
[
    'buildCartItemData',
    'getCredentials',
    'updateManifestFile',
    'initialThemeHandler',
    'clearBrowserCache',
    'removeReferencesManually',
].forEach((retiredName) => {
    assert.ok(!utilitySource.includes(retiredName), `${retiredName} must remain retired`);
});

console.log('Shared utility boundary tests passed.');
