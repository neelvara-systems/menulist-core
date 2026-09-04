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
    expandPrintOptionSegments,
    getCenteredTrackedTextStartX,
    getMenuCardBusinessInitials,
    isMenuCardLogoRasterSafe,
} from '../../src/lib/menu-card-export/render/renderPdf';
import {
    MAX_MENU_CARD_LOGO_URL_LENGTH,
    normalizeMenuCardLogoUrl,
} from '../../src/lib/menu-card-export/source/buildPrintSource';
import { resolveMenuCardColumnCount } from '../../src/lib/menu-card-export/layout/resolveColumnCount';
import { paginateBlocks } from '../../src/lib/menu-card-export/layout/paginateBlocks';
import type { PrintCategory } from '../../src/lib/menu-card-export/models/printModel';

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
assert.equal(buildDefaultSettings('home_print').includeCoverPage, true);
assert.equal(buildDefaultSettings('print_shop_packet').includeCoverPage, true);
assert.equal(buildDefaultSettings('table_menu').includeCoverPage, true);
assert.equal(buildDefaultSettings('whatsapp').includeCoverPage, false);
assert.equal(buildDefaultSettings('staff_reference').includeCoverPage, false);
assert.equal(
    buildDefaultSettings('home_print', 'classic', 'midnight-gold').printableThemeId,
    'midnight-gold',
);

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
    resolvePrintableTemplateBrandTokens('#abcdef', 'botanical-heritage'),
);
assert.equal(getPrintableTemplateTone('unknown-family'), 'botanical-heritage');
assert.doesNotThrow(() => Reflect.apply(resolvePrintableTemplateBrandTokens, undefined, [{ malformed: true }, ['bad']]));

assert.equal(normalizeMenuCardLogoUrl(' https://cdn.example.com/logo.png '), 'https://cdn.example.com/logo.png');
assert.equal(normalizeMenuCardLogoUrl('http://localhost:9199/logo.png'), 'http://localhost:9199/logo.png');
assert.equal(normalizeMenuCardLogoUrl('https://user:secret@example.com/logo.png'), undefined);
assert.equal(normalizeMenuCardLogoUrl('data:image/png;base64,AAAA'), undefined);
assert.equal(normalizeMenuCardLogoUrl(`https://example.com/${'x'.repeat(MAX_MENU_CARD_LOGO_URL_LENGTH)}`), undefined);
assert.equal(normalizeMenuCardLogoUrl({ toString: () => 'https://example.com/logo.png' }), undefined);
assert.equal(getMenuCardBusinessInitials('Aster & Oak Studio'), 'AS');
assert.equal(getMenuCardBusinessInitials('Nila'), 'NI');
assert.equal(getMenuCardBusinessInitials('  &  '), 'M');
assert.equal(getMenuCardBusinessInitials(null), 'M');

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

const coverCenterX = 105;
const coverLabel = 'SERVICES & PRICING';
const coverLabelWidth = 27.78;
const coverLabelCharSpace = 1.55;
const coverLabelStartX = getCenteredTrackedTextStartX({
    centerX: coverCenterX,
    charSpace: coverLabelCharSpace,
    text: coverLabel,
    textWidth: coverLabelWidth,
});
const coverLabelRenderedWidth = coverLabelWidth
    + (Array.from(coverLabel).length - 1) * coverLabelCharSpace;
assert.ok(
    Math.abs(coverLabelStartX + coverLabelRenderedWidth / 2 - coverCenterX) < 0.000_001,
    'tracked cover subtitle must share the exact logo and business-name center axis',
);
assert.equal(
    getCenteredTrackedTextStartX({ centerX: 105, charSpace: 2, text: 'A', textWidth: 4 }),
    103,
    'single-character labels must not receive phantom tracking width',
);

const buildCategories = (itemCount: number): PrintCategory[] => [{
    id: 'menu',
    name: 'Menu',
    items: Array.from({ length: itemCount }, (_, index) => ({
        id: `item-${index}`,
        name: `Item ${index + 1}`,
        price: '100',
        attributes: [],
        tags: [],
    })),
}];
const compactSettings = buildDefaultSettings('table_menu', 'compact');
const coverPlan = paginateBlocks(buildCategories(12), compactSettings);
assert.equal(coverPlan.pages[0]?.kind, 'cover');
assert.equal(coverPlan.pages[1]?.kind, 'menu');
assert.equal(coverPlan.pageCount, 2);
assert.equal(paginateBlocks(buildCategories(12), { ...compactSettings, includeCoverPage: false }).pageCount, 1);
assert.equal(resolveMenuCardColumnCount(compactSettings, buildCategories(26)), 2);
assert.equal(resolveMenuCardColumnCount(compactSettings, buildCategories(40)), 3);
assert.equal(
    resolveMenuCardColumnCount(buildDefaultSettings('table_menu', 'premium'), buildCategories(80)),
    1,
);
assert.equal(
    resolveMenuCardColumnCount({ ...compactSettings, preset: 'whatsapp' }, buildCategories(80)),
    1,
);

const optionSegments = expandPrintOptionSegments([{
    id: 'sizes',
    name: 'Sizes',
    items: [{
        id: 'coffee',
        name: 'Coffee',
        price: '100',
        description: 'Freshly brewed.',
        decisionSymbols: ['vegetarian', 'spice-medium'],
        attributes: Array.from({ length: 10 }, (_, index) => ({
            name: `Option ${index + 1}`,
            ...(index % 2 === 0 ? { price: String(100 + index) } : {}),
        })),
        tags: ['popular'],
    }],
}]);
assert.deepEqual(optionSegments[0]?.items.map((item) => item.attributes.length), [4, 4, 2]);
assert.deepEqual(
    optionSegments[0]?.items.flatMap((item) => item.attributes.map((attribute) => attribute.name)),
    Array.from({ length: 10 }, (_, index) => `Option ${index + 1}`),
);
assert.equal(optionSegments[0]?.items[1]?.name, 'Coffee (options continued)');
assert.equal(optionSegments[0]?.items[1]?.price, undefined);
assert.equal(optionSegments[0]?.items[1]?.description, undefined);
assert.deepEqual(optionSegments[0]?.items[0]?.decisionSymbols, ['vegetarian', 'spice-medium']);
assert.deepEqual(optionSegments[0]?.items[1]?.decisionSymbols, []);
assert.deepEqual(optionSegments[0]?.items[1]?.tags, []);

console.log('Menu card shared contract regression tests passed.');
