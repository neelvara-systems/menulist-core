import assert from 'node:assert/strict';

import {
    hexToRgb,
    mixHex,
    normalizeMenuKitBrandColor,
    resolveStoreBrandColor,
    rgbToHex,
} from '../../src/lib/menu-kit/brandTokens';
import {
    buildDefaultSettings,
    getMenuCardPreset,
    menuCardPresetRegistry,
} from '../../src/lib/menu-card-export/presets/presetRegistry';
import type { MenuCardExportPreset } from '../../src/lib/menu-card-export/models/exportTypes';
import { PRINTABLE_TEMPLATE_FAMILIES } from '../../src/lib/printable-asset-templates/templateFamilies';
import {
    getPrintableTemplateTone,
    resolvePrintableTemplateBrandTokens,
} from '../../src/lib/printable-asset-templates/templateStyles';
import {
    MAX_MENU_CARD_LOGO_RASTER_DIMENSION,
    MAX_MENU_CARD_LOGO_RASTER_PIXELS,
    isMenuCardLogoRasterSafe,
} from '../../src/lib/menu-card-export/render/renderPdf';
import {
    MAX_MENU_CARD_LOGO_URL_LENGTH,
    normalizeMenuCardLogoUrl,
} from '../../src/lib/menu-card-export/source/buildPrintSource';

assert.equal(resolveStoreBrandColor({
    publicPresence: { accentColor: 123 },
    primaryColor: '#ABC',
}), '#ABC');
assert.equal(resolveStoreBrandColor({
    publicPresence: { accentColor: 'not-a-color' },
    primaryColor: false,
    brandColor: '#123456',
}), '#123456');
assert.equal(resolveStoreBrandColor({ themeColor: { value: '#ffffff' } }), undefined);
assert.equal(resolveStoreBrandColor(null), undefined);

assert.equal(normalizeMenuKitBrandColor(123), '#2d2d2d');
assert.equal(normalizeMenuKitBrandColor('#abc', 'invalid'), '#aabbcc');
assert.equal(normalizeMenuKitBrandColor('invalid', 'also-invalid'), '#2d2d2d');
assert.equal(rgbToHex([Number.NaN, Number.POSITIVE_INFINITY, -1]), '#000000');
assert.equal(mixHex('#ffffff', '#000000', Number.NaN), '#000000');

const expectedPresetIds: MenuCardExportPreset[] = [
    'home_print',
    'whatsapp',
    'print_shop_packet',
    'table_menu',
    'takeaway_insert',
    'staff_reference',
    'multi_location_batch',
    'page_images',
    'qr_insert',
];

assert.deepEqual(menuCardPresetRegistry.map(({ id }) => id), expectedPresetIds);
for (const presetId of expectedPresetIds) {
    assert.equal(getMenuCardPreset(presetId).id, presetId);
    assert.equal(buildDefaultSettings(presetId).preset, presetId);
}
assert.equal(buildDefaultSettings('takeaway_insert').paperSize, 'a5');
assert.equal(buildDefaultSettings('staff_reference').includeQr, false);
assert.equal(buildDefaultSettings('qr_insert').includeContactBlock, false);

const colorTokenPairs = [
    ['accent', 'accentRgb'],
    ['accentText', 'accentTextRgb'],
    ['border', 'borderRgb'],
    ['gradientFrom', 'gradientFromRgb'],
    ['gradientTo', 'gradientToRgb'],
    ['muted', 'mutedRgb'],
    ['paper', 'paperRgb'],
    ['softAccent', 'softAccentRgb'],
    ['surface', 'surfaceRgb'],
    ['text', 'textRgb'],
] as const;

for (const family of PRINTABLE_TEMPLATE_FAMILIES) {
    const tokens = resolvePrintableTemplateBrandTokens('#abcdef', family.id);
    for (const [hexField, rgbField] of colorTokenPairs) {
        assert.match(tokens[hexField], /^#[0-9a-f]{6}$/);
        assert.deepEqual(tokens[rgbField], hexToRgb(tokens[hexField]));
    }
    assert.match(tokens.qrDark, /^#[0-9a-f]{6}$/);
    assert.match(tokens.qrLight, /^#[0-9a-f]{6}$/);
    assert.equal(getPrintableTemplateTone(family.id), family.id);
}

assert.deepEqual(
    resolvePrintableTemplateBrandTokens('#abcdef', 'unknown-family'),
    resolvePrintableTemplateBrandTokens('#abcdef', 'modern-calm'),
);
assert.equal(getPrintableTemplateTone('unknown-family'), 'modern-calm');
assert.doesNotThrow(() => Reflect.apply(resolvePrintableTemplateBrandTokens, undefined, [{ malformed: true }, ['bad']]));

assert.equal(normalizeMenuCardLogoUrl(' https://cdn.example.com/logo.png '), 'https://cdn.example.com/logo.png');
assert.equal(normalizeMenuCardLogoUrl('http://localhost:9199/logo.png'), 'http://localhost:9199/logo.png');
assert.equal(normalizeMenuCardLogoUrl('https://user:secret@example.com/logo.png'), undefined);
assert.equal(normalizeMenuCardLogoUrl('data:image/png;base64,AAAA'), undefined);
assert.equal(normalizeMenuCardLogoUrl(`https://example.com/${'x'.repeat(MAX_MENU_CARD_LOGO_URL_LENGTH)}`), undefined);
assert.equal(normalizeMenuCardLogoUrl({ toString: () => 'https://example.com/logo.png' }), undefined);

assert.equal(isMenuCardLogoRasterSafe(1, 1), true);
assert.equal(
    isMenuCardLogoRasterSafe(MAX_MENU_CARD_LOGO_RASTER_DIMENSION, MAX_MENU_CARD_LOGO_RASTER_DIMENSION),
    MAX_MENU_CARD_LOGO_RASTER_DIMENSION ** 2 <= MAX_MENU_CARD_LOGO_RASTER_PIXELS,
);
assert.equal(isMenuCardLogoRasterSafe(MAX_MENU_CARD_LOGO_RASTER_DIMENSION + 1, 1), false);
assert.equal(isMenuCardLogoRasterSafe(1, MAX_MENU_CARD_LOGO_RASTER_DIMENSION + 1), false);
assert.equal(isMenuCardLogoRasterSafe(Number.NaN, 1), false);
assert.equal(isMenuCardLogoRasterSafe(1.5, 1), false);
assert.equal(isMenuCardLogoRasterSafe('2048', 1), false);

console.log('Menu card shared contract regression tests passed.');
