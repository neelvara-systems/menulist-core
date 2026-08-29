import assert from 'node:assert/strict';

import {
    fitCanvasText,
    truncateCanvasText,
    wrapCanvasText,
} from '../../src/lib/menu-kit/canvasPrimitives';
import {
    admitPrintableAssetEditorDocument,
    buildPrintableAssetEditorDocument,
    getPrintableAssetDisplayShortLink,
} from '../../src/lib/printable-asset-templates/editorDocumentAdapter';
import { normalizePrintableAssetRenderInput } from '../../src/lib/printable-asset-templates/inputBoundary';
import { getMenuListLogoMarkWidth } from '../../src/lib/menu-kit/platformAttribution';
import {
    buildPrintReadinessItems,
    buildPrintShopHandoffMessage,
    hasConfiguredPrintBrandColor,
} from '../../src/lib/print-assets/ownerPrintGuidance';

let measureCalls = 0;
const canvasContext = {
    font: '',
    measureText(value: string) {
        measureCalls += 1;
        return { width: value.length * 10 };
    },
} as CanvasRenderingContext2D;

const fitted = fitCanvasText(canvasContext, 'Menu', 20, '999999999px Inter', 8);
assert.equal(fitted, '8px Inter');
assert.ok(measureCalls <= 252);

measureCalls = 0;
assert.equal(truncateCanvasText(canvasContext, 'x'.repeat(1_000_000), 100), 'xxxxxxx...');
assert.ok(measureCalls < 20);
assert.equal(truncateCanvasText(canvasContext, 'Menu', Number.NaN), '');
assert.deepEqual(
    wrapCanvasText(canvasContext, 'A very long restaurant name that needs three lines', 110, 3),
    ['A very long', 'restaurant', 'name tha...'],
);
assert.deepEqual(
    wrapCanvasText(canvasContext, 'x'.repeat(100), 100, 3),
    ['xxxxxxx...'],
);
assert.deepEqual(wrapCanvasText(canvasContext, 'Menu', 100, Number.NaN), []);

const printableInput = {
    assetTypeId: 'entrance_poster' as const,
    menuUrl: 'https://boundary-cafe.menulist.online/menu',
    outputFormat: 'png' as const,
    shortLink: 'boundary-cafe.menulist.online/menu',
    storeName: 'Boundary Cafe',
    templateFamilyId: 'modern-calm' as const,
};
const printableDocument = buildPrintableAssetEditorDocument(printableInput);
for (const templateFamilyId of [
    'classic-luxe',
    'executive-dark',
    'botanical-heritage',
    'modern-calm',
    'brand-banner',
    'soft-curve',
    'qr-first',
    'local-bold',
    'clean-utility',
] as const) {
    const counterStickerDocument = buildPrintableAssetEditorDocument({
        ...printableInput,
        assetTypeId: 'counter_sticker',
        templateFamilyId,
    });
    const counterStickerQr = counterStickerDocument.elements.find((element) => element.type === 'qr');
    const counterStickerCta = counterStickerDocument.elements.find((element) => (
        element.type === 'text' && element.name === 'Call to action'
    ));
    assert.ok(counterStickerQr?.type === 'qr');
    assert.ok(counterStickerCta?.type === 'text');
    assert.ok(
        counterStickerCta.y + counterStickerCta.height <= counterStickerQr.y,
        `${templateFamilyId} Counter Sticker call to action must remain outside the live QR code`,
    );
}
const feedbackPrintableInput = {
    ...printableInput,
    assetTypeId: 'feedback_qr' as const,
    feedbackUrl: 'https://boundary-cafe.menulist.online/feedback/1-default-2?source=feedback_qr',
};
assert.equal(
    getPrintableAssetDisplayShortLink(feedbackPrintableInput),
    'boundary-cafe.menulist.online/feedback/1-default-2?source=feedback_qr',
);
assert.equal(
    getPrintableAssetDisplayShortLink(printableInput),
    'boundary-cafe.menulist.online/menu',
);
const feedbackPrintableDocument = buildPrintableAssetEditorDocument(feedbackPrintableInput);
assert.ok(feedbackPrintableDocument.elements.some((element) => (
    element.type === 'qr'
    && element.value === feedbackPrintableInput.feedbackUrl
)));
assert.ok(feedbackPrintableDocument.elements.some((element) => (
    element.type === 'text'
    && element.name === 'Short link'
    && element.text.includes('/feedback/1-default-2')
)));
assert.equal(
    admitPrintableAssetEditorDocument(printableDocument, printableInput.assetTypeId).canvas.width,
    2480,
);
assert.throws(
    () => admitPrintableAssetEditorDocument({
        ...printableDocument,
        canvas: { ...printableDocument.canvas, height: 10_000, width: 10_000 },
    }, printableInput.assetTypeId),
    /size does not match/,
);
assert.throws(
    () => admitPrintableAssetEditorDocument({
        ...printableDocument,
        productContext: { ...printableDocument.productContext, productId: 'campaigncue' },
    }, printableInput.assetTypeId),
    /Invalid printable asset editor document/,
);

const normalizedPrintableInput = normalizePrintableAssetRenderInput({
    ...printableInput,
    contactName: 'n'.repeat(500),
    feedbackUrl: 'https://user:secret@example.com/feedback',
    logoUrl: 'data:image/png;base64,AAAA',
    projectId: '../another-project',
    shortLink: 'stale.example/private',
});
assert.equal(normalizedPrintableInput?.shortLink, 'boundary-cafe.menulist.online/menu');
assert.equal(normalizedPrintableInput?.contactName?.length, 240);
assert.equal(normalizedPrintableInput?.feedbackUrl, undefined);
assert.equal(normalizedPrintableInput?.logoUrl, undefined);
assert.equal(normalizedPrintableInput?.projectId, undefined);
assert.equal(normalizePrintableAssetRenderInput({ ...printableInput, assetTypeId: 'unknown' }), null);
assert.equal(normalizePrintableAssetRenderInput({ ...printableInput, templateFamilyId: 'unknown' }), null);
assert.equal(normalizePrintableAssetRenderInput({ ...printableInput, menuUrl: 'http://sample-cafe.menulist.online/menu' }), null);
assert.throws(
    () => admitPrintableAssetEditorDocument({
        ...printableDocument,
        elements: new Array(301).fill(printableDocument.elements[0]),
    }, printableInput.assetTypeId),
    /Invalid printable asset editor document/,
);
assert.equal(getMenuListLogoMarkWidth(Number.POSITIVE_INFINITY), getMenuListLogoMarkWidth(16));
assert.equal(getMenuListLogoMarkWidth(-1), getMenuListLogoMarkWidth(1));

const throwingStore = new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('persisted store inspection should be contained');
    },
});
assert.equal(hasConfiguredPrintBrandColor(throwingStore), false);
assert.doesNotThrow(() => buildPrintReadinessItems({ storeData: throwingStore }));
assert.equal(
    buildPrintReadinessItems({
        storeData: {
            publicPresence: { accentColor: 123 },
            primaryColor: '#abc',
            logo: 456,
        },
        storeLogo: '',
        storeName: null,
    }).find(({ id }) => id === 'brand-color')?.status,
    'ready',
);

const coerciveValue = {
    toString() {
        throw new Error('guidance must not coerce unknown values');
    },
};
assert.doesNotThrow(() => buildPrintShopHandoffMessage({
    menuLink: coerciveValue as never,
    storeName: coerciveValue as never,
}));
assert.match(buildPrintShopHandoffMessage({}), /Print files for MenuList business/);

console.log('Print shared boundary regression tests passed.');
