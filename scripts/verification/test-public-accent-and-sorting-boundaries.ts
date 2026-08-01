import assert from 'node:assert/strict';

import { APP_THEME_COLOR } from '../../src/constants/common';
import {
    normalizePublicAccentColor,
    resolveOBPAccentColor,
    resolvePublicMenuAccentColor,
} from '../../src/lib/obp/accentColor';
import { buildManifest } from '../../src/lib/pwa/manifestGenerator';
import { buildMobileAppSchema } from '../../src/lib/pwa/schemaJsonLd';
import { sortByActive } from '../../src/utils/sorting';
import imageToBase64 from '../../src/utils/imageToBase64';

assert.equal(normalizePublicAccentColor('#12aBcF'), '#12abcf');
assert.equal(normalizePublicAccentColor(' #AbC '), '#aabbcc');
assert.equal(normalizePublicAccentColor('red'), null);
assert.equal(normalizePublicAccentColor('linear-gradient(red, blue)'), null);
assert.equal(normalizePublicAccentColor('#12345678'), null);
assert.equal(normalizePublicAccentColor({ toString: () => '#123456' }), null);
assert.equal(resolveOBPAccentColor({ accentColor: '#ABC' }), '#aabbcc');
assert.equal(resolveOBPAccentColor({ accentColor: 'not-a-color' }), '#111');
assert.equal(resolveOBPAccentColor(null), '#111');
assert.equal(resolvePublicMenuAccentColor('#123456', { accentColor: '#abcdef' }), '#123456');
assert.equal(resolvePublicMenuAccentColor(undefined, { accentColor: '#ABC' }), '#aabbcc');
assert.equal(resolvePublicMenuAccentColor('invalid', { accentColor: 'invalid' }, '#0aF'), '#00aaff');
assert.equal(resolvePublicMenuAccentColor(undefined, null), null);

const manifest = buildManifest({
    backgroundColor: 'url(https://attacker.invalid/background)',
    displayName: 'Boundary Menu',
    id: 123,
    themeColor: 'linear-gradient(red, blue)',
});
assert.equal(manifest.theme_color, APP_THEME_COLOR);
assert.equal(manifest.background_color, '#ffffff');
assert.equal(buildManifest({
    displayName: 'Boundary Menu',
    id: 123,
    themeColor: '#0aF',
}).theme_color, '#00aaff');

assert.equal(buildMobileAppSchema({
    baseUrl: 'https://menu.example',
    description: 'Example',
    name: 'Menu',
    themeColor: 'not-a-color',
}).color, undefined);
assert.equal(buildMobileAppSchema({
    baseUrl: 'https://menu.example',
    description: 'Example',
    name: 'Menu',
    themeColor: '#ABC',
}).color, '#aabbcc');

assert.equal(
    imageToBase64({}),
    '',
    'server runtime without HTMLImageElement must return the existing empty fallback',
);

const original = [
    { active: false, id: 'inactive-first' },
    { active: true, id: 'active' },
    { active: false, id: 'inactive-second' },
] as const;
const originalSnapshot = original.map((entry) => entry.id);
const sorted = sortByActive(original);

assert.notEqual(sorted, original);
assert.deepEqual(original.map((entry) => entry.id), originalSnapshot);
assert.deepEqual(sorted.map((entry) => entry.id), [
    'active',
    'inactive-first',
    'inactive-second',
]);
assert.deepEqual(sortByActive(null), []);
assert.deepEqual(sortByActive(undefined), []);

console.log('Public accent and non-mutating sorting boundary tests passed.');
