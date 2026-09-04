import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { getOfferingLabels } from '../../src/lib/menu-kit/businessTypeLabels';
import { PRINTABLE_ASSET_TYPES } from '../../src/lib/printable-asset-templates/assetTypes';
import {
    buildPrintableAssetEditorDocument,
    isPrintableAssetEditorRenderable,
} from '../../src/lib/printable-asset-templates/editorDocumentAdapter';
import {
    buildPrintableGiftCertificateOverlaySvg,
    getPrintableGiftCertificateOverlayPath,
    PRINTABLE_GIFT_CERTIFICATE_OVERLAY_HEIGHT,
    PRINTABLE_GIFT_CERTIFICATE_OVERLAY_WIDTH,
} from '../../src/lib/printable-asset-templates/giftCertificateArtwork';
import { PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY } from '../../src/lib/printable-asset-templates/printableIconArtwork';
import { PRINTABLE_THEME_FAMILY_IDS } from '../../src/lib/printable-asset-templates/templateFamilies';
import { resolvePrintableTemplateBrandTokens } from '../../src/lib/printable-asset-templates/templateStyles';
import { resolvePrintableStaffBadgePerson } from '../../src/lib/printable-asset-templates/staffBadgePerson';
import { getPrintableThemeArtworkPaths, getPrintableThemeArtworkPlacement } from '../../src/lib/printable-asset-templates/themeArtwork';
import type { PrintableTemplateFamilyId } from '../../src/lib/printable-asset-templates/types';
import type { CreativeEditorElement } from '../../src/modules/creative-editor/types';

const CRAFT_CORNER_RATIO = 800 / 762;
const CRAFT_RAIL_RATIO = 640 / 960;
const LIGHT_SALON_SPA_THEME_IDS = [
    'petal-studio',
    'pearl-veil',
    'terracotta-glow',
    'glasshouse-beauty',
    'eucalyptus-retreat',
    'mineral-spring',
    'lotus-stillness',
    'sunlit-ritual',
] as const satisfies readonly PrintableTemplateFamilyId[];

function assertClose(actual: number, expected: number, label: string) {
    assert.ok(Math.abs(actual - expected) < 0.001, `${label}: expected ${expected}, received ${actual}`);
}

function assertKoboyoArtworkPolicyCoverage() {
    const assetIds = PRINTABLE_ASSET_TYPES.map((asset) => asset.id).sort();
    const policyAssetIds = Object.keys(PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY).sort();
    assert.deepEqual(policyAssetIds, assetIds, 'Koboyo suitability policy covers every printable asset exactly once');

    assert.deepEqual(
        PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY.feedback_qr,
        {
            iconIds: ['koboyo-review-quote'],
            rationale: 'A neutral quote bubble signals feedback without rating pressure or a selectable score.',
            status: 'use',
        },
        'Feedback QR uses one governed rating-neutral Koboyo review symbol',
    );
    assert.deepEqual(
        PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY.gift_certificate.iconIds,
        ['koboyo-gift'],
        'Gift Certificate uses the governed Koboyo gift artwork',
    );
    assert.deepEqual(
        PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY.event_invitation.iconIds,
        ['koboyo-may-garland', 'koboyo-flower', 'koboyo-celebration-burst'],
        'Event Invitation keeps its governed ceremonial Koboyo artwork set',
    );
    assert.deepEqual(
        PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY.postcard,
        {
            iconIds: ['koboyo-flower'],
            rationale: 'A small flower trio communicates appreciation through the same symbolic botanical language used across the asset system, without introducing faces or inventing a promotion, rating, or event.',
            status: 'use',
        },
        'Postcard uses one governed face-free customer-appreciation Koboyo symbol',
    );

    for (const assetId of [
        'business_card',
        'campaign_flyer',
        'campaign_poster',
        'complete_menu_kit',
        'counter_sticker',
        'entrance_poster',
        'print_menu',
        'product_tag',
        'single_table_card',
        'staff_id_card',
        'table_tent',
    ] as const) {
        assert.equal(PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY[assetId].status, 'not-beneficial', `${assetId} rejects decorative Koboyo clutter`);
        assert.deepEqual(PRINTABLE_ASSET_KOBOYO_ARTWORK_POLICY[assetId].iconIds, [], `${assetId} has no injected purpose icon`);
    }

}

function businessContextForTheme(themeId: PrintableTemplateFamilyId): { businessCategory: string; businessType: string } {
    if (
        themeId === 'craft-kitchen'
        || themeId === 'ember-house'
        || themeId === 'coastal-table'
        || themeId === 'sunday-table'
        || themeId === 'counter-rush'
    ) return { businessCategory: 'food', businessType: 'Restaurant' };
    if (themeId === 'roastery-ledger') return { businessCategory: 'food', businessType: 'Specialty Coffee Shop' };
    if (themeId === 'patisserie-conservatory') return { businessCategory: 'food', businessType: 'Bakery' };
    if (themeId === 'gelateria-riviera') return { businessCategory: 'food', businessType: 'Ice Cream Shop' };
    if (
        themeId === 'salon-atelier'
        || themeId === 'petal-studio'
        || themeId === 'pearl-veil'
        || themeId === 'terracotta-glow'
        || themeId === 'glasshouse-beauty'
    ) return { businessCategory: 'service', businessType: 'Salon' };
    if (
        themeId === 'ritual-sanctuary'
        || themeId === 'eucalyptus-retreat'
        || themeId === 'mineral-spring'
        || themeId === 'lotus-stillness'
        || themeId === 'sunlit-ritual'
    ) return { businessCategory: 'health', businessType: 'Spa' };
    if (themeId === 'performance-circuit') return { businessCategory: 'health', businessType: 'Fitness Center' };
    if (themeId === 'neighbourhood-standard' || themeId === 'field-notes') return { businessCategory: 'service', businessType: 'Pet Grooming Service' };
    if (themeId === 'boutique-window' || themeId === 'market-label') return { businessCategory: 'retail', businessType: 'Fashion Boutique' };
    if (themeId === 'civic-letterpress' || themeId === 'modern-practice') return { businessCategory: 'professional', businessType: 'Law Firm' };
    if (themeId === 'studio-contact-sheet' || themeId === 'maker-ledger') return { businessCategory: 'creative', businessType: 'Photography Studio' };
    if (themeId === 'clinical-calm' || themeId === 'mindful-motion') return { businessCategory: 'health', businessType: 'Dental Clinic' };
    if (themeId === 'hospitality-house' || themeId === 'future-workshop') return { businessCategory: 'specialty', businessType: 'Boutique Hotel' };
    return { businessCategory: 'service', businessType: 'Other' };
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isNamedTextElement(
    element: CreativeEditorElement,
    name: string,
): element is Extract<CreativeEditorElement, { type: 'text' }> {
    return element.type === 'text' && element.name === name;
}

function isTextElement(element: CreativeEditorElement): element is Extract<CreativeEditorElement, { type: 'text' }> {
    return element.type === 'text';
}

async function measureRenderedTextBounds(params: {
    align: 'center' | 'left' | 'right';
    canvasHeight: number;
    canvasWidth: number;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    lineHeight?: number;
    text: string;
    width: number;
    x: number;
    y: number;
}) {
    const textX = params.align === 'center'
        ? params.x + params.width / 2
        : params.align === 'right'
            ? params.x + params.width
            : params.x;
    const anchor = params.align === 'center' ? 'middle' : params.align === 'right' ? 'end' : 'start';
    const lines = params.text.split('\n');
    const lineHeight = params.fontSize * (params.lineHeight || 1.12);
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${params.canvasWidth}" height="${params.canvasHeight}">`,
        `<text x="${textX}" y="${params.y + params.fontSize}" fill="#000000" font-family="${escapeXml(params.fontFamily)}" font-size="${params.fontSize}" font-weight="${params.fontWeight}" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${textX}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`,
        '</svg>',
    ].join('');
    const { data, info } = await sharp(Buffer.from(svg))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    let left = info.width;
    let right = -1;
    let top = info.height;
    let bottom = -1;
    for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
            const alpha = data[(y * info.width + x) * info.channels + 3];
            if (alpha === 0) continue;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
        }
    }
    assert.ok(right >= left && bottom >= top, 'Headline produces visible rendered glyphs');
    return { bottom, left, right, top };
}

async function assertCenteredPrintableTextLayerGeometry(params: {
    canvasHeight: number;
    canvasWidth: number;
    label: string;
    layer: Extract<CreativeEditorElement, { type: 'text' }>;
}) {
    const { canvasHeight, canvasWidth, label, layer } = params;
    const lines = layer.text.split('\n');
    const glyphTolerance = Math.max(4, Math.round(canvasWidth * 0.002));
    assert.equal(layer.align, 'center', `${label} uses centered text alignment`);
    assert.ok(lines.length >= 1 && lines.length <= 2, `${label} uses at most two centered lines`);

    for (const [lineIndex, line] of lines.entries()) {
        const lineBounds = await measureRenderedTextBounds({
            align: 'center',
            canvasHeight,
            canvasWidth,
            fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight || '700',
            lineHeight: layer.lineHeight,
            text: line,
            width: layer.width,
            x: layer.x,
            y: layer.y + lineIndex * layer.fontSize * (layer.lineHeight || 1.12),
        });
        assert.ok(
            lineBounds.left >= layer.x - glyphTolerance,
            `${label} line ${lineIndex + 1} begins within the rendered-glyph tolerance of its centered text box`,
        );
        assert.ok(
            lineBounds.right <= layer.x + layer.width + glyphTolerance,
            `${label} line ${lineIndex + 1} ends within the rendered-glyph tolerance of its centered text box`,
        );
    }
}

for (const frame of [
    { height: 945, width: 945, x: 38, y: 38 },
    { height: 1748, width: 1240, x: 0, y: 0 },
    { height: 1748, width: 2480, x: 0, y: 0 },
    { height: 3508, width: 2480, x: 165, y: 260 },
]) {
    const placement = getPrintableThemeArtworkPlacement('craft-kitchen', frame);

    assertClose(
        placement.corner.width / placement.corner.height,
        CRAFT_CORNER_RATIO,
        'Craft Kitchen corner artwork keeps its natural aspect ratio',
    );
    assertClose(
        placement.rail.width / placement.rail.height,
        CRAFT_RAIL_RATIO,
        'Craft Kitchen rail artwork keeps its natural aspect ratio',
    );
    assert.ok(placement.corner.width >= frame.width * 0.28, 'Corner artwork has meaningful background presence');
    assert.ok(placement.rail.height >= Math.min(frame.height * 0.34, frame.width * 0.50), 'Rail artwork has meaningful background presence');
    assert.ok(placement.corner.x < frame.x, 'Craft Kitchen corner artwork intentionally bleeds past the left edge');
    assert.ok(placement.rail.x + placement.rail.width > frame.x + frame.width, 'Craft Kitchen rail artwork intentionally bleeds past the right edge');
}

for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
    const paths = getPrintableThemeArtworkPaths(themeId);
    assert.ok(paths?.page, `${themeId} has a dedicated full-page print master`);
    assert.match(
        paths.page,
        new RegExp(`/printable-themes/${themeId}/(?:universal-background|editorial-page-background)\\.png$`),
    );
}

for (const themeId of ['salon-atelier', 'ritual-sanctuary', 'performance-circuit'] satisfies PrintableTemplateFamilyId[]) {
    const paths = getPrintableThemeArtworkPaths(themeId);
    assert.ok(paths?.compact, `${themeId} has a dedicated compact-format master`);
    assert.match(paths.compact, new RegExp(`/printable-themes/${themeId}/compact-background\\.png$`));
}

const verticalStoryThemeVeilOpacities = {
    'ember-house': 0.72,
    'coastal-table': 0.70,
    'sunday-table': 0.72,
    'counter-rush': 0.78,
    'roastery-ledger': 0.64,
    'patisserie-conservatory': 0.70,
    'gelateria-riviera': 0.74,
    'salon-atelier': 0.62,
    'petal-studio': 0.62,
    'pearl-veil': 0.54,
    'terracotta-glow': 0.64,
    'glasshouse-beauty': 0.66,
    'ritual-sanctuary': 0.64,
    'eucalyptus-retreat': 0.62,
    'mineral-spring': 0.58,
    'lotus-stillness': 0.62,
    'sunlit-ritual': 0.64,
    'performance-circuit': 0.56,
    'neighbourhood-standard': 0.62,
    'field-notes': 0.62,
    'boutique-window': 0.62,
    'market-label': 0.66,
    'civic-letterpress': 0.60,
    'modern-practice': 0.60,
    'studio-contact-sheet': 0.72,
    'maker-ledger': 0.66,
    'clinical-calm': 0.62,
    'mindful-motion': 0.62,
    'hospitality-house': 0.62,
    'future-workshop': 0.64,
} as const satisfies Partial<Record<PrintableTemplateFamilyId, number>>;

for (const [themeId, expectedOpacity] of Object.entries(verticalStoryThemeVeilOpacities) as [PrintableTemplateFamilyId, number][]) {
    for (const assetTypeId of PRINTABLE_ASSET_TYPES.map((asset) => asset.id).filter(isPrintableAssetEditorRenderable)) {
        const businessContext = businessContextForTheme(themeId);
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId,
            brandColor: '#315f55',
            ...businessContext,
            contactAddress: '12 Museum Road, Bengaluru',
            contactEmail: 'hello@example.com',
            contactName: 'Example Studio',
            contactPhone: '+91 80 4567 8900',
            feedbackUrl: 'https://example.com/feedback',
            menuUrl: 'https://example.com/services',
            outputFormat: 'png',
            projectId: `${themeId}-${assetTypeId}-veil-regression`,
            shortLink: 'example.com/services',
            storeName: 'Example Studio',
            templateFamilyId: themeId,
        });
        const veils = documentValue.elements.filter((element) => (
            element.type === 'rect' && element.name === `${themeId} compact content veil`
        ));
        assert.equal(veils.length, assetTypeId === 'business_card' ? 2 : 1, `${themeId}/${assetTypeId} has one inset veil per printed face`);
        for (const veil of veils) {
            assert.equal(veil.opacity, expectedOpacity, `${themeId}/${assetTypeId} retains its approved translucent paper opacity`);
            const frameWidth = assetTypeId === 'business_card' ? 1063 : documentValue.canvas.width;
            const frameHeight = assetTypeId === 'business_card' ? 650 : documentValue.canvas.height;
            assert.ok(veil.width >= frameWidth * 0.92, `${themeId}/${assetTypeId} protects the copy width`);
            assert.ok(veil.height >= frameHeight * 0.93, `${themeId}/${assetTypeId} protects the copy height`);
        }
        const backgroundIndex = documentValue.elements.findIndex((element) => (
            element.type === 'image' && element.name === `${themeId} responsive theme background`
        ));
        const veilIndex = documentValue.elements.findIndex((element) => element.name === `${themeId} compact content veil`);
        const firstTextIndex = documentValue.elements.findIndex((element) => element.type === 'text');
        assert.ok(backgroundIndex >= 0 && veilIndex > backgroundIndex, `${themeId}/${assetTypeId} veil renders above the artwork`);
        assert.ok(firstTextIndex > veilIndex, `${themeId}/${assetTypeId} copy renders above the veil`);
    }
}

for (const assetTypeId of PRINTABLE_ASSET_TYPES.map((asset) => asset.id).filter(isPrintableAssetEditorRenderable)) {
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId,
        brandColor: '#A9472E',
        businessCategory: 'food',
        businessType: 'Restaurant',
        contactName: 'Nila House',
        feedbackUrl: 'https://nila.example/feedback',
        lastPublishedAt: new Date('2026-08-30T08:00:00.000Z'),
        menuUrl: 'https://nila.example/menu',
        outputFormat: 'png',
        projectId: `lankan-safe-field-${assetTypeId}`,
        shortLink: 'nila.example/menu',
        storeName: 'Nila House',
        templateFamilyId: 'lankan-block-print',
    });
    const safeFields = documentValue.elements.filter((element) => (
        element.type === 'rect' && element.name === 'Lankan compact content safe field'
    ));
    assert.equal(safeFields.length, assetTypeId === 'business_card' ? 2 : 1, `${assetTypeId} has one safe field per printed face`);
    for (const field of safeFields) {
        assert.equal(field.opacity, 0.94, `${assetTypeId} safe field keeps the approved artwork wash`);
        const frameWidth = assetTypeId === 'business_card' ? 1063 : documentValue.canvas.width;
        const frameHeight = assetTypeId === 'business_card' ? 650 : documentValue.canvas.height;
        assert.ok(field.width >= frameWidth * 0.86, `${assetTypeId} safe field protects the horizontal copy zone`);
        assert.ok(field.height >= frameHeight * 0.84, `${assetTypeId} safe field protects the vertical copy zone`);
    }
    const backgroundIndex = documentValue.elements.findIndex((element) => (
        element.type === 'image' && element.name === 'lankan-block-print responsive theme background'
    ));
    const safeFieldIndex = documentValue.elements.findIndex((element) => element.name === 'Lankan compact content safe field');
    const firstTextIndex = documentValue.elements.findIndex((element) => element.type === 'text');
    assert.ok(backgroundIndex >= 0 && safeFieldIndex > backgroundIndex, `${assetTypeId} safe field renders above the artwork`);
    assert.ok(firstTextIndex > safeFieldIndex, `${assetTypeId} copy renders above the safe field`);
}

async function assertLankanGiftCertificateHeadlineBounds() {
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'gift_certificate',
        brandColor: '#A9472E',
        businessCategory: 'food',
        businessType: 'Restaurant',
        contactName: 'Nila House',
        feedbackUrl: 'https://nila.example/feedback',
        lastPublishedAt: new Date('2026-08-30T08:00:00.000Z'),
        menuUrl: 'https://nila.example/menu',
        outputFormat: 'png',
        projectId: 'lankan-gift-certificate-headline-bounds',
        shortLink: 'nila.example/menu',
        storeName: 'Nila House',
        templateFamilyId: 'lankan-block-print',
    });
    const safeField = documentValue.elements.find((element) => (
        element.type === 'rect' && element.name === 'Lankan compact content safe field'
    ));
    const headline = documentValue.elements.find((element) => (
        element.type === 'text' && element.name === 'Voucher headline'
    ));
    assert.ok(safeField?.type === 'rect', 'Lankan gift certificate safe field exists');
    assert.ok(headline?.type === 'text', 'Lankan gift certificate headline exists');
    assert.equal(headline.rotation || 0, 0, 'Lankan gift certificate headline remains unrotated');
    const bounds = await measureRenderedTextBounds({
        align: headline.align || 'left',
        canvasHeight: documentValue.canvas.height,
        canvasWidth: documentValue.canvas.width,
        fontFamily: headline.fontFamily || 'Inter, Arial, sans-serif',
        fontSize: headline.fontSize,
        fontWeight: headline.fontWeight || '700',
        text: headline.text,
        width: headline.width,
        x: headline.x,
        y: headline.y,
    });
    const safePadding = Math.round(documentValue.canvas.width * 0.012);
    assert.ok(bounds.left >= headline.x, 'Rendered voucher headline starts inside its declared text box');
    assert.ok(bounds.right <= headline.x + headline.width, 'Rendered voucher headline ends inside its declared text box');
    assert.ok(bounds.left >= safeField.x + safePadding, 'Rendered voucher headline keeps left safe-field padding');
    assert.ok(bounds.right <= safeField.x + safeField.width - safePadding, 'Rendered voucher headline keeps right safe-field padding');
    assert.ok(bounds.top >= safeField.y + safePadding, 'Rendered voucher headline keeps top safe-field padding');
    assert.ok(bounds.bottom <= safeField.y + safeField.height - safePadding, 'Rendered voucher headline keeps bottom safe-field padding');
}

async function assertLankanAffectedAssetTextGeometry() {
    for (const assetTypeId of ['business_card', 'gift_certificate', 'postcard', 'product_tag'] as const) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId,
            brandColor: '#A9472E',
            businessCategory: 'food',
            businessType: 'Restaurant',
            contactName: 'Nila House',
            feedbackUrl: 'https://nila.example/feedback',
            lastPublishedAt: new Date('2026-08-30T08:00:00.000Z'),
            menuUrl: 'https://nila.example/menu',
            outputFormat: 'png',
            projectId: `lankan-affected-text-geometry-${assetTypeId}`,
            shortLink: 'nila.example/menu',
            storeName: 'Nila House',
            templateFamilyId: 'lankan-block-print',
        });
        const safeFields = documentValue.elements.filter((element) => (
            element.type === 'rect' && element.name === 'Lankan compact content safe field'
        ));
        const textElements = documentValue.elements.filter((element) => element.type === 'text');
        assert.ok(textElements.length > 0, `${assetTypeId} contains text layers to protect`);

        for (const textElement of textElements) {
            assert.equal(textElement.rotation || 0, 0, `${assetTypeId}/${textElement.name} remains unrotated`);
            const centerX = textElement.x + textElement.width / 2;
            const centerY = textElement.y + textElement.height / 2;
            const safeField = safeFields.find((field) => (
                centerX >= field.x
                && centerX <= field.x + field.width
                && centerY >= field.y
                && centerY <= field.y + field.height
            ));
            assert.ok(safeField?.type === 'rect', `${assetTypeId}/${textElement.name} belongs to a content safe field`);
            assert.ok(textElement.x >= safeField.x, `${assetTypeId}/${textElement.name} text box starts inside the safe field`);
            assert.ok(textElement.x + textElement.width <= safeField.x + safeField.width, `${assetTypeId}/${textElement.name} text box ends inside the safe field`);
            assert.ok(textElement.y >= safeField.y, `${assetTypeId}/${textElement.name} text box starts below the safe-field top`);
            assert.ok(textElement.y + textElement.height <= safeField.y + safeField.height, `${assetTypeId}/${textElement.name} text box ends above the safe-field bottom`);

            const bounds = await measureRenderedTextBounds({
                align: textElement.align || 'left',
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                fontFamily: textElement.fontFamily || 'Inter, Arial, sans-serif',
                fontSize: textElement.fontSize,
                fontWeight: textElement.fontWeight || '700',
                text: textElement.text,
                width: textElement.width,
                x: textElement.x,
                y: textElement.y,
            });
            assert.ok(bounds.left >= textElement.x, `${assetTypeId}/${textElement.name} rendered glyphs start inside the text box`);
            assert.ok(bounds.right <= textElement.x + textElement.width, `${assetTypeId}/${textElement.name} rendered glyphs end inside the text box`);
            assert.ok(bounds.top >= textElement.y, `${assetTypeId}/${textElement.name} rendered glyphs start below the text-box top`);
            assert.ok(bounds.bottom <= textElement.y + textElement.height, `${assetTypeId}/${textElement.name} rendered glyphs end above the text-box bottom`);
            assert.ok(bounds.left >= safeField.x, `${assetTypeId}/${textElement.name} rendered glyphs stay inside the safe-field left edge`);
            assert.ok(bounds.right <= safeField.x + safeField.width, `${assetTypeId}/${textElement.name} rendered glyphs stay inside the safe-field right edge`);
            assert.ok(bounds.top >= safeField.y, `${assetTypeId}/${textElement.name} rendered glyphs stay below the safe-field top edge`);
            assert.ok(bounds.bottom <= safeField.y + safeField.height, `${assetTypeId}/${textElement.name} rendered glyphs stay above the safe-field bottom edge`);
        }
    }
}

async function assertCampaignPosterTextAndQrGeometry() {
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'campaign_poster',
            brandColor: '#315f55',
            ...businessContextForTheme(themeId),
            campaignContent: {
                details: 'Available while the featured item remains published.',
                headline: "Today's special",
                offer: 'Signature seasonal selection',
            },
            contactName: 'Example Studio',
            feedbackUrl: 'https://example.com/feedback',
            menuUrl: 'https://example.com/services',
            outputFormat: 'png',
            projectId: `${themeId}-campaign-poster-geometry`,
            shortLink: 'example.com/services',
            storeName: 'Example Studio',
            templateFamilyId: themeId,
        });
        const headline = documentValue.elements.find((element) => element.type === 'text' && element.name === 'Campaign headline');
        const scanPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Campaign poster scan ticket');
        const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
        const callToAction = documentValue.elements.find((element) => element.type === 'text' && element.name === 'Call to action');
        const shortLink = documentValue.elements.find((element) => element.type === 'text' && element.name === 'Short link');
        const businessName = documentValue.elements.find((element) => element.type === 'text' && element.name === 'Business name');
        const offer = documentValue.elements.find((element) => element.type === 'text' && element.name === 'Campaign offer');
        const qr = documentValue.elements.find((element) => element.type === 'qr');
        const identityRule = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Campaign poster identity rule');
        assert.ok(headline?.type === 'text', `${themeId} campaign poster headline exists`);
        assert.ok(scanPanel?.type === 'rect', `${themeId} campaign poster scan panel exists`);
        assert.ok(qrPanel?.type === 'rect', `${themeId} campaign poster QR panel exists`);
        assert.ok(callToAction?.type === 'text', `${themeId} campaign poster call to action exists`);
        assert.ok(shortLink?.type === 'text', `${themeId} campaign poster short link exists`);
        assert.ok(businessName?.type === 'text', `${themeId} Campaign Poster business name exists`);
        assert.ok(offer?.type === 'text', `${themeId} Campaign Poster offer exists`);
        assert.ok(qr?.type === 'qr', `${themeId} Campaign Poster QR exists`);
        assert.ok(identityRule?.type === 'line', `${themeId} Campaign Poster identity rule exists`);
        assert.ok(offer.fontSize > businessName.fontSize, `${themeId} Campaign Poster makes the promoted item larger than the business name`);
        assert.ok(qr.width >= Math.round(documentValue.canvas.width * 0.26), `${themeId} Campaign Poster uses a distance-safe QR`);
        assert.equal(qrPanel.width - qr.width, 48, `${themeId} Campaign Poster keeps exactly 24 px decorative QR padding per side`);
        assert.equal(callToAction.text.includes('\n'), false, `${themeId} Campaign Poster keeps the business-aware scan action on one line when it fits safely`);
        assert.equal(identityRule.x + identityRule.width / 2, documentValue.canvas.width / 2, `${themeId} Campaign Poster identity rule is centered`);
        assert.equal(scanPanel.x + scanPanel.width / 2, documentValue.canvas.width / 2, `${themeId} Campaign Poster centers the vertical scan group`);
        assert.equal(scanPanel.opacity, 0, `${themeId} Campaign Poster removes the visible outer scan-group wrapper`);
        assert.equal(scanPanel.strokeWidth, 0, `${themeId} Campaign Poster removes the disruptive outer scan-group border`);
        assert.equal(scanPanel.stroke, 'transparent', `${themeId} Campaign Poster keeps the outer scan-group outline visually absent`);
        assert.equal(scanPanel.shadow, undefined, `${themeId} Campaign Poster does not recreate the removed wrapper with a shadow`);
        assert.equal(qrPanel.x + qrPanel.width / 2, documentValue.canvas.width / 2, `${themeId} Campaign Poster centers the QR panel`);
        assert.ok(callToAction.y + callToAction.height < qrPanel.y, `${themeId} Campaign Poster stacks the CTA above the QR`);
        assert.ok(qrPanel.y + qrPanel.height < shortLink.y, `${themeId} Campaign Poster stacks the hostname below the QR`);
        assert.ok(shortLink.y + shortLink.height <= scanPanel.y + scanPanel.height, `${themeId} Campaign Poster keeps the hostname inside the scan group`);
        assert.equal(
            documentValue.elements.some((element) => element.name === 'Flyer scan panel'),
            false,
            `${themeId} Campaign Poster does not fall back to the Flyer scan panel`,
        );
        assert.equal(
            documentValue.elements.some((element) => element.name === 'Campaign poster scan divider'),
            false,
            `${themeId} Campaign Poster uses a calm vertical scan stack without a leftover two-column divider`,
        );
        if (themeId === 'terracotta-glow') {
            const longCopyDocument = buildPrintableAssetEditorDocument({
                assetTypeId: 'campaign_poster',
                brandColor: '#B65B43',
                businessCategory: 'service',
                businessType: 'Salon',
                campaignContent: {
                    details: 'Choose from a carefully prepared set of services available for this campaign while appointments remain available.',
                    headline: 'A considered seasonal campaign prepared for our customers',
                    offer: 'Signature botanical treatment and restorative studio ritual',
                    terms: 'Availability varies by service and appointment. Ask the team before booking or purchasing.',
                    validUntil: 'Available through the final week of September',
                },
                menuUrl: 'https://aster-oak-studio.menulist.online/services',
                outputFormat: 'png',
                projectId: 'terracotta-campaign-poster-long-copy',
                shortLink: 'aster-oak-studio.menulist.online/services',
                storeName: 'Aster & Oak Botanical Treatment and Styling Studio',
                tagline: 'Thoughtful care and considered rituals for every visit',
                templateFamilyId: 'terracotta-glow',
            });
            const longCopyPanel = longCopyDocument.elements.find((element) => element.type === 'rect' && element.name === 'Campaign poster scan ticket');
            const longCopyQrPanel = longCopyDocument.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
            const longCopyCta = longCopyDocument.elements.find((element) => element.type === 'text' && element.name === 'Call to action');
            const longCopyTerms = longCopyDocument.elements.find((element) => element.type === 'text' && element.name === 'Campaign terms');
            const longCopyHost = longCopyDocument.elements.find((element) => element.type === 'text' && element.name === 'Short link');
            assert.ok(longCopyPanel?.type === 'rect', 'Terracotta long-copy Campaign Poster scan ticket exists');
            assert.ok(longCopyQrPanel?.type === 'rect', 'Terracotta long-copy Campaign Poster QR panel exists');
            assert.ok(longCopyCta?.type === 'text', 'Terracotta long-copy Campaign Poster CTA exists');
            assert.ok(longCopyTerms?.type === 'text', 'Terracotta long-copy Campaign Poster terms exist');
            assert.ok(longCopyHost?.type === 'text', 'Terracotta long-copy Campaign Poster short link exists');
            assert.ok(longCopyTerms.y + longCopyTerms.height < longCopyPanel.y, 'Terracotta long campaign copy reflows above the scan ticket');
            assert.ok(longCopyCta.y + longCopyCta.height < longCopyQrPanel.y, 'Terracotta long-copy CTA remains above the QR');
            assert.ok(longCopyQrPanel.y + longCopyQrPanel.height < longCopyHost.y, 'Terracotta long-copy hostname remains below the QR');
            assert.ok(longCopyHost.y + longCopyHost.height <= longCopyPanel.y + longCopyPanel.height, 'Terracotta long-copy hostname remains inside the scan ticket');
            assert.ok(longCopyPanel.y + longCopyPanel.height <= longCopyDocument.canvas.height, 'Terracotta long-copy scan ticket remains on canvas');
            for (const element of longCopyDocument.elements.filter((candidate) => candidate.type === 'text')) {
                assert.ok(element.x >= 0, `Terracotta long-copy ${element.name} starts on canvas`);
                assert.ok(element.x + element.width <= longCopyDocument.canvas.width, `Terracotta long-copy ${element.name} ends on canvas`);
                assert.ok(element.y >= 0, `Terracotta long-copy ${element.name} starts below the canvas top`);
                assert.ok(element.y + element.height <= longCopyDocument.canvas.height, `Terracotta long-copy ${element.name} ends above the canvas bottom`);
                assert.equal(element.align, 'center', `Terracotta long-copy ${element.name} remains center aligned`);
            }
        }

        const headlineBounds = await measureRenderedTextBounds({
            align: headline.align || 'center',
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            fontFamily: headline.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: headline.fontSize,
            fontWeight: headline.fontWeight || '900',
            text: headline.text,
            width: headline.width,
            x: headline.x,
            y: headline.y,
        });
        const glyphTolerance = Math.max(4, Math.round(documentValue.canvas.width * 0.002));
        assert.ok(
            headlineBounds.left >= headline.x - glyphTolerance,
            `${themeId} campaign headline starts within the antialiasing tolerance of its text box (${headlineBounds.left} >= ${headline.x - glyphTolerance})`,
        );
        assert.ok(
            headlineBounds.right <= headline.x + headline.width + glyphTolerance,
            `${themeId} campaign headline ends within the antialiasing tolerance of its text box (${headlineBounds.right} <= ${headline.x + headline.width + glyphTolerance})`,
        );
        assert.ok(callToAction.y >= scanPanel.y, `${themeId} campaign CTA starts inside the scan panel`);
        assert.ok(callToAction.y + callToAction.height <= scanPanel.y + scanPanel.height, `${themeId} campaign CTA ends inside the scan panel`);
        assert.ok(qrPanel.x >= scanPanel.x, `${themeId} campaign QR starts inside the scan panel`);
        assert.ok(qrPanel.x + qrPanel.width <= scanPanel.x + scanPanel.width, `${themeId} campaign QR ends inside the scan panel`);
        assert.ok(qrPanel.y >= scanPanel.y, `${themeId} campaign QR starts inside the scan panel`);
        assert.ok(qrPanel.y + qrPanel.height <= scanPanel.y + scanPanel.height, `${themeId} campaign QR ends inside the scan panel`);
        assert.ok(shortLink.y >= scanPanel.y, `${themeId} campaign short link starts inside the vertical scan group`);
        assert.ok(shortLink.y + shortLink.height <= scanPanel.y + scanPanel.height, `${themeId} campaign short link ends inside the vertical scan group`);
        if (themeId === 'lankan-block-print') {
            const safeField = documentValue.elements.find((element) => (
                element.type === 'rect' && element.name === 'Lankan compact content safe field'
            ));
            assert.ok(safeField?.type === 'rect', 'Lankan Campaign Poster has its inset content safe field');
            assert.ok(shortLink.x >= safeField.x, 'Lankan Campaign Poster short link starts inside the safe field');
            assert.ok(shortLink.x + shortLink.width <= safeField.x + safeField.width, 'Lankan Campaign Poster short link ends inside the safe field');
            assert.ok(shortLink.y >= safeField.y, 'Lankan Campaign Poster short link starts below the safe-field top');
            assert.ok(shortLink.y + shortLink.height <= safeField.y + safeField.height, 'Lankan Campaign Poster short link ends above the safe-field bottom');
        }
    }
}

async function assertPremiumTableTentIdentityAndGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const tagline = 'Thoughtful care, beautifully delivered.';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'table_tent',
        brandColor: '#B34F36',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        projectId: 'terracotta-glow-table-tent-polish',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline,
        templateFamilyId: 'terracotta-glow',
    });
    const logos = documentValue.elements.filter((element) => element.type === 'image' && element.name === 'Business logo');
    const businessNames = documentValue.elements.filter((element) => isNamedTextElement(element, 'Business name'));
    const taglines = documentValue.elements.filter((element) => isNamedTextElement(element, 'Business tagline'));
    const callsToAction = documentValue.elements.filter((element) => isNamedTextElement(element, 'Call to action'));
    const shortLinks = documentValue.elements.filter((element) => isNamedTextElement(element, 'Short link'));
    const qrPanels = documentValue.elements.filter((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCodes = documentValue.elements.filter((element) => element.type === 'qr');

    assert.equal(logos.length, 2, 'Table Tent uses the real business logo on both folded faces');
    assert.deepEqual(logos.map((logo) => logo.rotation || 0).sort((a, b) => a - b), [0, 180], 'Table Tent rotates only the folded logo face');
    assert.equal(businessNames.length, 2, 'Table Tent renders the business name on both folded faces');
    assert.ok(businessNames.every((name) => name.fontFamily === 'Georgia, serif'), 'Terracotta Glow uses its governed display serif for the business name');
    assert.equal(taglines.length, 2, 'Table Tent renders the owner tagline on both folded faces');
    assert.ok(taglines.every((layer) => layer.text === tagline), 'Table Tent preserves the owner tagline verbatim');
    assert.ok(callsToAction.every((layer) => layer.text === 'SCAN TO VIEW SERVICES'), 'Table Tent keeps one compact non-redundant governed scan instruction');
    assert.ok([...businessNames, ...taglines, ...callsToAction, ...shortLinks].every((layer) => layer.align === 'center'), 'Table Tent keeps every content line center aligned');
    assert.ok(shortLinks.every((layer) => layer.text === 'aster-oak-studio.menulist.online'), 'Table Tent displays only the canonical public host');
    assert.ok(qrCodes.every((layer) => layer.value === menuUrl), 'Table Tent QR codes retain the complete canonical project URL');
    assert.equal(qrPanels.length, 2, 'Table Tent renders one QR panel per folded face');
    assert.equal(qrCodes.length, 2, 'Table Tent renders one QR code per folded face');

    for (const layer of [
        businessNames.find((candidate) => !candidate.rotation),
        taglines.find((candidate) => !candidate.rotation),
        callsToAction.find((candidate) => !candidate.rotation),
        shortLinks.find((candidate) => !candidate.rotation),
    ]) {
        assert.ok(layer?.type === 'text', 'Table Tent keeps every upright centered-copy layer');
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Table Tent ${layer.name}`,
            layer,
        });
    }

    for (const rotation of [0, 180]) {
        const panel = qrPanels.find((layer) => (layer.rotation || 0) === rotation);
        const qrCode = qrCodes.find((layer) => (layer.rotation || 0) === rotation);
        const businessName = businessNames.find((layer) => (layer.rotation || 0) === rotation);
        const taglineLayer = taglines.find((layer) => (layer.rotation || 0) === rotation);
        const callToAction = callsToAction.find((layer) => (layer.rotation || 0) === rotation);
        const shortLink = shortLinks.find((layer) => (layer.rotation || 0) === rotation);
        assert.ok(panel?.type === 'rect' && qrCode?.type === 'qr', `Table Tent ${rotation} degree face keeps its scan-safe QR pair`);
        assert.ok(businessName?.type === 'text' && taglineLayer?.type === 'text' && callToAction?.type === 'text' && shortLink?.type === 'text', `Table Tent ${rotation} degree face keeps its complete text hierarchy`);
        assert.equal(panel.width - qrCode.width, 48, `Table Tent ${rotation} degree face limits QR panel padding to 24px per side`);
        assert.equal(panel.height - qrCode.height, 48, `Table Tent ${rotation} degree face limits vertical QR panel padding to 24px per side`);
        assert.ok(businessName.y + businessName.height <= taglineLayer.y, `Table Tent ${rotation} degree face keeps spacing below the business name`);
        assert.ok(taglineLayer.y + taglineLayer.height <= callToAction.y, `Table Tent ${rotation} degree face keeps spacing below the tagline`);
        assert.ok(
            callToAction.y - (taglineLayer.y + taglineLayer.height) >= Math.round(documentValue.canvas.height * 0.044) - 1,
            `Table Tent ${rotation} degree face preserves the governed tagline-to-CTA breathing room`,
        );
        assert.ok(callToAction.y + callToAction.height <= panel.y, `Table Tent ${rotation} degree face keeps the CTA clear of the QR panel`);
        assert.ok(
            panel.y - (callToAction.y + callToAction.height) >= Math.round(documentValue.canvas.height * 0.028) - 1,
            `Table Tent ${rotation} degree face preserves the scan-safe CTA-to-QR gap`,
        );
        assert.ok(
            panel.y - (callToAction.y + callToAction.height) <= Math.round(documentValue.canvas.height * 0.044),
            `Table Tent ${rotation} degree face keeps the CTA visually grouped with the QR panel`,
        );
        assert.ok(panel.y + panel.height <= shortLink.y, `Table Tent ${rotation} degree face keeps the public host below the QR panel`);
        assert.ok(
            shortLink.y - (panel.y + panel.height) >= Math.round(documentValue.canvas.height * 0.025) - 1,
            `Table Tent ${rotation} degree face preserves the governed QR-to-host breathing room`,
        );
        assert.ok(
            shortLink.y - (panel.y + panel.height) <= Math.round(documentValue.canvas.height * 0.060),
            `Table Tent ${rotation} degree face keeps the public host visually connected to the scan group`,
        );
    }

    const uprightBusinessName = businessNames.find((layer) => !layer.rotation);
    assert.ok(uprightBusinessName?.type === 'text', 'Table Tent has an upright business-name layer');
    const bounds = await measureRenderedTextBounds({
        align: uprightBusinessName.align || 'center',
        canvasHeight: documentValue.canvas.height,
        canvasWidth: documentValue.canvas.width,
        fontFamily: uprightBusinessName.fontFamily || 'Georgia, serif',
        fontSize: uprightBusinessName.fontSize,
        fontWeight: uprightBusinessName.fontWeight || '700',
        lineHeight: uprightBusinessName.lineHeight,
        text: uprightBusinessName.text,
        width: uprightBusinessName.width,
        x: uprightBusinessName.x,
        y: uprightBusinessName.y,
    });
    assert.ok(bounds.left >= uprightBusinessName.x, 'Table Tent business-name glyphs begin inside their declared text box');
    assert.ok(bounds.right <= uprightBusinessName.x + uprightBusinessName.width, 'Table Tent business-name glyphs end inside their declared text box');

    const noTaglineDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'table_tent',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'The Good Neighbour Beauty and Wellness Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        noTaglineDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Table Tent omits the tagline row instead of inventing public business copy',
    );
    assert.equal(
        noTaglineDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        0,
        'Table Tent does not substitute a platform logo when the client has no logo',
    );
    assert.equal(
        noTaglineDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        2,
        'Table Tent uses business initials on both folded faces when the client has no logo',
    );
    const noTaglineCta = noTaglineDocument.elements.find((element) => isNamedTextElement(element, 'Call to action') && !element.rotation);
    const noTaglineQrPanel = noTaglineDocument.elements.find((element) => element.type === 'rect' && element.name === 'QR panel' && !element.rotation);
    assert.ok(noTaglineCta?.type === 'text' && noTaglineQrPanel?.type === 'rect', 'No-tagline Table Tent keeps its CTA and QR action group');
    assert.ok(
        noTaglineQrPanel.y - (noTaglineCta.y + noTaglineCta.height) <= Math.round(noTaglineDocument.canvas.height * 0.044),
        'No-tagline Table Tent still keeps the CTA visually grouped with the QR panel',
    );
    const longBusinessName = noTaglineDocument.elements.find((element) => (
        isNamedTextElement(element, 'Business name') && !element.rotation
    ));
    assert.ok(longBusinessName?.type === 'text', 'Table Tent keeps a long upright business-name layer');
    const longNameBounds = await measureRenderedTextBounds({
        align: longBusinessName.align || 'center',
        canvasHeight: noTaglineDocument.canvas.height,
        canvasWidth: noTaglineDocument.canvas.width,
        fontFamily: longBusinessName.fontFamily || 'Georgia, serif',
        fontSize: longBusinessName.fontSize,
        fontWeight: longBusinessName.fontWeight || '700',
        lineHeight: longBusinessName.lineHeight,
        text: longBusinessName.text,
        width: longBusinessName.width,
        x: longBusinessName.x,
        y: longBusinessName.y,
    });
    assert.ok(longNameBounds.left >= longBusinessName.x, 'Long Table Tent business-name glyphs begin inside their declared text box');
    assert.ok(longNameBounds.right <= longBusinessName.x + longBusinessName.width, 'Long Table Tent business-name glyphs end inside their declared text box');
    assert.equal(longBusinessName.align, 'center', 'Long Table Tent business names remain center aligned');

    const longCopyDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'table_tent',
        businessCategory: 'creative',
        businessType: 'Photography Studio',
        menuUrl: 'https://extraordinarily-long-studio-name-for-guests-and-members.menulist.online/services',
        outputFormat: 'png',
        shortLink: 'extraordinarily-long-studio-name-for-guests-and-members.menulist.online/services',
        storeName: 'The Good Neighbour Creative Photography Studio',
        tagline: 'Thoughtful portraits and beautifully crafted stories for every occasion',
        templateFamilyId: 'terracotta-glow',
    });
    const longCopyLayers = longCopyDocument.elements.filter(isTextElement).filter((element) => (
        !element.rotation
        && ['Business name', 'Business tagline', 'Call to action', 'Short link'].includes(element.name)
    ));
    assert.equal(longCopyLayers.length, 4, 'Long-copy Table Tent keeps its complete centered text hierarchy');
    for (const layer of longCopyLayers) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: longCopyDocument.canvas.height,
            canvasWidth: longCopyDocument.canvas.width,
            label: `Long-copy Table Tent ${layer.name}`,
            layer,
        });
    }
    const longCopyQrPanel = longCopyDocument.elements.find((element) => element.type === 'rect' && element.name === 'QR panel' && !element.rotation);
    const longCopyCta = longCopyLayers.find((element) => element.name === 'Call to action');
    const longCopyShortLink = longCopyLayers.find((element) => element.name === 'Short link');
    assert.ok(longCopyQrPanel?.type === 'rect' && longCopyCta?.type === 'text' && longCopyShortLink?.type === 'text', 'Long-copy Table Tent exposes its reflow geometry');
    assert.doesNotMatch(longCopyCta.text, /\n/, 'Long creative-business CTAs stay on one centered line when a readable font size fits');
    assert.ok(longCopyCta.y + longCopyCta.height <= longCopyQrPanel.y, 'Long-copy Table Tent keeps the QR panel below the wrapped CTA');
    assert.ok(longCopyQrPanel.y + longCopyQrPanel.height <= longCopyShortLink.y, 'Long-copy Table Tent keeps the wrapped public host below the QR panel');
    assert.ok(longCopyShortLink.y + longCopyShortLink.height <= longCopyDocument.canvas.height, 'Long-copy Table Tent keeps the final centered line inside the face');

    const forcedWrapDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'table_tent',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'WWW Wellness & WWW Waterfront WWW Workshop',
        templateFamilyId: 'terracotta-glow',
    });
    const forcedWrapBusinessName = forcedWrapDocument.elements.find((element) => (
        isNamedTextElement(element, 'Business name') && !element.rotation
    ));
    assert.ok(forcedWrapBusinessName?.type === 'text', 'Table Tent keeps a measurable forced-wrap business name');
    assert.match(forcedWrapBusinessName.text, /\n/, 'Table Tent wraps genuinely oversized centered copy instead of compressing it horizontally');
    await assertCenteredPrintableTextLayerGeometry({
        canvasHeight: forcedWrapDocument.canvas.height,
        canvasWidth: forcedWrapDocument.canvas.width,
        label: 'Forced-wrap Table Tent business name',
        layer: forcedWrapBusinessName,
    });

    const craftDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'table_tent',
        businessCategory: 'food',
        businessType: 'Restaurant',
        logoUrl: 'https://cdn.menulist.online/fixtures/nila-house-logo.png',
        menuUrl: 'https://nila-house.menulist.online/menu',
        outputFormat: 'png',
        shortLink: 'nila-house.menulist.online/menu',
        storeName: 'Nila House',
        templateFamilyId: 'craft-kitchen',
    });
    const craftBorder = craftDocument.elements.find((element) => element.type === 'rect' && element.name === 'Print safe border');
    const craftLogo = craftDocument.elements.find((element) => element.type === 'image' && element.name === 'Business logo' && !element.rotation);
    const craftTextLayers = craftDocument.elements.filter(isTextElement).filter((element) => !element.rotation);
    assert.ok(craftBorder?.type === 'rect' && craftLogo?.type === 'image', 'Craft Kitchen Table Tent exposes its measurable border and upright logo');
    assert.ok(
        craftLogo.y >= craftBorder.y + (craftBorder.strokeWidth || 0) * 2 + Math.round(craftDocument.canvas.height * 0.02),
        'Craft Kitchen Table Tent keeps the logo below the top border with a visible safe gap',
    );
    assert.ok(
        craftTextLayers.every((layer) => layer.align === 'center'),
        'Craft Kitchen Table Tent keeps all upright text center aligned',
    );
    assert.ok(
        craftTextLayers.every((layer) => layer.x >= craftBorder.x && layer.x + layer.width <= craftBorder.x + craftBorder.width),
        'Craft Kitchen Table Tent keeps every text box inside the framed safe field',
    );

    for (const context of [
        { businessCategory: 'food', businessType: 'Restaurant', expected: 'SCAN TO VIEW MENU' },
        { businessCategory: 'service', businessType: 'Salon', expected: 'SCAN TO VIEW SERVICES' },
        { businessCategory: 'retail', businessType: 'Fashion Boutique', expected: 'SCAN TO VIEW CATALOG' },
        { businessCategory: 'creative', businessType: 'Photography Studio', expected: 'SCAN TO VIEW OFFERINGS' },
    ]) {
        const businessDocument = buildPrintableAssetEditorDocument({
            assetTypeId: 'table_tent',
            businessCategory: context.businessCategory,
            businessType: context.businessType,
            menuUrl: 'https://example-business.menulist.online/current',
            outputFormat: 'png',
            shortLink: 'example-business.menulist.online/current',
            storeName: 'Example Business',
            templateFamilyId: 'terracotta-glow',
        });
        const businessCallsToAction = businessDocument.elements.filter((element) => isNamedTextElement(element, 'Call to action'));
        assert.equal(businessCallsToAction.length, 2, `${context.businessType} Table Tent has one CTA per folded face`);
        assert.ok(
            businessCallsToAction.every((layer) => layer.text.replace(/\s+/g, ' ') === context.expected),
            `${context.businessType} Table Tent uses the governed ${context.expected} offering label`,
        );
        assert.ok(businessCallsToAction.every((layer) => layer.align === 'center'), `${context.businessType} Table Tent centers every CTA line`);
        if (context.businessType === 'Photography Studio') {
            assert.ok(businessCallsToAction.every((layer) => !layer.text.includes('\n')), 'Long creative-business CTAs use one centered line when a readable smaller size fits');
        }
    }
}

async function assertAllThemeTableTentRulebookGeometry() {
    const tagline = 'Made with care for every guest.';
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const businessContext = businessContextForTheme(themeId);
        const menuUrl = `https://${themeId}.menulist.online/current`;
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'table_tent',
            brandColor: '#315f55',
            ...businessContext,
            menuUrl,
            outputFormat: 'png',
            projectId: `${themeId}-table-tent-rulebook`,
            shortLink: `${themeId}.menulist.online/current`,
            storeName: 'Example Business House',
            tagline,
            templateFamilyId: themeId,
        });
        const faceWidth = documentValue.canvas.width / 2;
        const badges = documentValue.elements.filter((element) => element.type === 'ellipse' && element.name === 'Business badge');
        const initials = documentValue.elements.filter((element) => isNamedTextElement(element, 'Business initials'));
        const businessNames = documentValue.elements.filter((element) => isNamedTextElement(element, 'Business name'));
        const taglines = documentValue.elements.filter((element) => isNamedTextElement(element, 'Business tagline'));
        const callsToAction = documentValue.elements.filter((element) => isNamedTextElement(element, 'Call to action'));
        const shortLinks = documentValue.elements.filter((element) => isNamedTextElement(element, 'Short link'));
        const qrPanels = documentValue.elements.filter((element) => element.type === 'rect' && element.name === 'QR panel');
        const qrCodes = documentValue.elements.filter((element) => element.type === 'qr');

        assert.equal(badges.length, 2, `${themeId} Table Tent renders one truthful initials badge per folded face`);
        assert.equal(initials.length, 2, `${themeId} Table Tent renders initials on both folded faces`);
        assert.equal(businessNames.length, 2, `${themeId} Table Tent renders the business name on both folded faces`);
        assert.equal(taglines.length, 2, `${themeId} Table Tent renders the owner tagline on both folded faces`);
        assert.equal(callsToAction.length, 2, `${themeId} Table Tent renders one business-aware CTA per folded face`);
        assert.equal(shortLinks.length, 2, `${themeId} Table Tent renders one truthful public hostname per folded face`);
        assert.equal(qrPanels.length, 2, `${themeId} Table Tent renders one QR panel per folded face`);
        assert.equal(qrCodes.length, 2, `${themeId} Table Tent renders one live QR code per folded face`);
        assert.ok(qrCodes.every((layer) => layer.value === menuUrl), `${themeId} Table Tent QR codes retain the complete canonical destination`);
        assert.ok(shortLinks.every((layer) => layer.text === `${themeId}.menulist.online`), `${themeId} Table Tent prints only the canonical public hostname`);

        for (const name of ['Business initials', 'Business name', 'Business tagline', 'Call to action', 'Short link']) {
            const layers = documentValue.elements.filter((element) => isNamedTextElement(element, name));
            const upright = layers.find((layer) => !layer.rotation);
            const folded = layers.find((layer) => layer.rotation === 180);
            assert.ok(upright?.type === 'text' && folded?.type === 'text', `${themeId} Table Tent keeps ${name} on both physical faces`);
            assert.equal(folded.text, upright.text, `${themeId} Table Tent keeps ${name} identical across both physical faces`);
            assert.equal(upright.align, 'center', `${themeId} Table Tent centers upright ${name}`);
            assert.equal(folded.align, 'center', `${themeId} Table Tent centers folded ${name}`);
            assert.ok(upright.x >= faceWidth && upright.x + upright.width <= documentValue.canvas.width, `${themeId} Table Tent keeps upright ${name} inside its face`);
            assert.ok(folded.x >= 0 && folded.x + folded.width <= faceWidth, `${themeId} Table Tent keeps folded ${name} inside its face`);
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                label: `${themeId} Table Tent ${name}`,
                layer: upright,
            });
        }

        for (const rotation of [0, 180]) {
            const badge = badges.find((layer) => (layer.rotation || 0) === rotation);
            const businessName = businessNames.find((layer) => (layer.rotation || 0) === rotation);
            const taglineLayer = taglines.find((layer) => (layer.rotation || 0) === rotation);
            const callToAction = callsToAction.find((layer) => (layer.rotation || 0) === rotation);
            const panel = qrPanels.find((layer) => (layer.rotation || 0) === rotation);
            const qrCode = qrCodes.find((layer) => (layer.rotation || 0) === rotation);
            const shortLink = shortLinks.find((layer) => (layer.rotation || 0) === rotation);
            assert.ok(
                badge?.type === 'ellipse'
                && businessName?.type === 'text'
                && taglineLayer?.type === 'text'
                && callToAction?.type === 'text'
                && panel?.type === 'rect'
                && qrCode?.type === 'qr'
                && shortLink?.type === 'text',
                `${themeId} Table Tent ${rotation} degree face exposes its complete rulebook hierarchy`,
            );
            assert.ok(badge.y >= Math.round(documentValue.canvas.height * 0.09), `${themeId} Table Tent ${rotation} degree badge clears the top artwork/frame zone`);
            assert.ok(badge.y + badge.height <= businessName.y, `${themeId} Table Tent ${rotation} degree badge clears the business name`);
            assert.ok(businessName.y + businessName.height <= taglineLayer.y, `${themeId} Table Tent ${rotation} degree business name clears the tagline`);
            assert.ok(taglineLayer.y + taglineLayer.height <= callToAction.y, `${themeId} Table Tent ${rotation} degree tagline clears the CTA`);
            assert.ok(
                callToAction.y - (taglineLayer.y + taglineLayer.height) >= Math.round(documentValue.canvas.height * 0.044) - 1,
                `${themeId} Table Tent ${rotation} degree face preserves the 4.4% tagline-to-CTA interval`,
            );
            const ctaToQrGap = panel.y - (callToAction.y + callToAction.height);
            assert.ok(ctaToQrGap >= Math.round(documentValue.canvas.height * 0.028) - 1, `${themeId} Table Tent ${rotation} degree CTA clears the QR panel`);
            assert.ok(ctaToQrGap <= Math.round(documentValue.canvas.height * 0.044), `${themeId} Table Tent ${rotation} degree CTA stays grouped with the QR panel`);
            assert.equal(panel.width - qrCode.width, 48, `${themeId} Table Tent ${rotation} degree QR panel keeps 24px horizontal padding`);
            assert.equal(panel.height - qrCode.height, 48, `${themeId} Table Tent ${rotation} degree QR panel keeps 24px vertical padding`);
            assert.ok(panel.y + panel.height <= shortLink.y, `${themeId} Table Tent ${rotation} degree QR panel clears the public hostname`);
            const qrToHostGap = shortLink.y - (panel.y + panel.height);
            assert.ok(qrToHostGap >= Math.round(documentValue.canvas.height * 0.025) - 1, `${themeId} Table Tent ${rotation} degree face preserves the QR-to-host interval`);
            assert.ok(qrToHostGap <= Math.round(documentValue.canvas.height * 0.060), `${themeId} Table Tent ${rotation} degree public hostname stays grouped with the QR`);
            assert.ok(shortLink.y + shortLink.height <= documentValue.canvas.height, `${themeId} Table Tent ${rotation} degree public hostname remains on the printable face`);
        }
    }
}

async function assertPremiumSingleTableCardIdentityAndGeometry() {
    const tagline = 'Made with care for every guest.';
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const businessContext = businessContextForTheme(themeId);
        const menuUrl = `https://${themeId}.menulist.online/current`;
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'single_table_card',
            brandColor: '#315f55',
            ...businessContext,
            menuUrl,
            outputFormat: 'png',
            projectId: `${themeId}-single-table-card-rulebook`,
            shortLink: `${themeId}.menulist.online/current`,
            storeName: 'Example Business House',
            tagline,
            templateFamilyId: themeId,
        });
        const badge = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business badge');
        const initials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
        const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
        const taglineLayer = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
        const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
        const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));
        const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
        const qrCode = documentValue.elements.find((element) => element.type === 'qr');

        assert.ok(
            badge?.type === 'ellipse'
            && initials?.type === 'text'
            && businessName?.type === 'text'
            && taglineLayer?.type === 'text'
            && callToAction?.type === 'text'
            && shortLink?.type === 'text'
            && qrPanel?.type === 'rect'
            && qrCode?.type === 'qr',
            `${themeId} Single Table Card exposes its complete one-face identity and scan hierarchy`,
        );
        assert.equal(
            documentValue.elements.filter((element) => isNamedTextElement(element, 'Instruction')).length,
            0,
            `${themeId} Single Table Card removes the redundant secondary scan instruction`,
        );
        assert.match(callToAction.text.replace(/\s+/g, ' '), /^SCAN TO VIEW (MENU|SERVICES|CATALOG|OFFERINGS)$/);
        assert.doesNotMatch(callToAction.text, /CURRENT|\n/, `${themeId} Single Table Card keeps its compact CTA on one readable line`);
        assert.equal(shortLink.text, `${themeId}.menulist.online`, `${themeId} Single Table Card prints only the truthful canonical hostname`);
        assert.equal(qrCode.value, menuUrl, `${themeId} Single Table Card QR retains the complete canonical destination`);

        for (const layer of [initials, businessName, taglineLayer, callToAction, shortLink]) {
            assert.ok(layer.x >= 0 && layer.x + layer.width <= documentValue.canvas.width, `${themeId} Single Table Card ${layer.name} stays inside the portrait face`);
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                label: `${themeId} Single Table Card ${layer.name}`,
                layer,
            });
        }

        assert.ok(badge.y >= Math.round(documentValue.canvas.height * 0.09), `${themeId} Single Table Card identity clears the top artwork/frame zone`);
        assert.ok(badge.y + badge.height <= businessName.y, `${themeId} Single Table Card identity clears the business name`);
        assert.ok(businessName.y + businessName.height <= taglineLayer.y, `${themeId} Single Table Card business name clears the tagline`);
        assert.ok(taglineLayer.y + taglineLayer.height <= callToAction.y, `${themeId} Single Table Card tagline clears the CTA`);
        assert.ok(
            callToAction.y - (taglineLayer.y + taglineLayer.height) >= Math.round(documentValue.canvas.height * 0.044) - 1,
            `${themeId} Single Table Card preserves the 4.4% tagline-to-CTA interval`,
        );
        const ctaToQrGap = qrPanel.y - (callToAction.y + callToAction.height);
        assert.ok(ctaToQrGap >= Math.round(documentValue.canvas.height * 0.028) - 1, `${themeId} Single Table Card CTA clears the QR panel`);
        assert.ok(ctaToQrGap <= Math.round(documentValue.canvas.height * 0.044), `${themeId} Single Table Card CTA stays grouped with the QR panel`);
        assert.equal(qrPanel.width - qrCode.width, 48, `${themeId} Single Table Card QR panel keeps 24px horizontal padding`);
        assert.equal(qrPanel.height - qrCode.height, 48, `${themeId} Single Table Card QR panel keeps 24px vertical padding`);
        assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, `${themeId} Single Table Card QR panel clears the hostname`);
        const qrToHostGap = shortLink.y - (qrPanel.y + qrPanel.height);
        assert.ok(qrToHostGap >= Math.round(documentValue.canvas.height * 0.025) - 1, `${themeId} Single Table Card preserves the QR-to-host interval`);
        assert.ok(qrToHostGap <= Math.round(documentValue.canvas.height * 0.060), `${themeId} Single Table Card hostname stays connected to the scan group`);
        assert.ok(shortLink.y + shortLink.height <= documentValue.canvas.height, `${themeId} Single Table Card hostname stays on the printable face`);
    }

    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'single_table_card',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        1,
        'Single Table Card uses the real business logo when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Single Table Card does not layer initials over a real business logo',
    );
    const terracottaBackground = logoDocument.elements.find((element) => (
        element.type === 'image' && element.name === 'terracotta-glow responsive theme background'
    ));
    const terracottaVeil = logoDocument.elements.find((element) => (
        element.type === 'rect' && element.name === 'terracotta-glow compact content veil'
    ));
    assert.ok(terracottaBackground?.type === 'image' && terracottaVeil?.type === 'rect', 'Terracotta Glow Single Table Card preserves its full-background artwork and calm content veil');
    assert.equal(terracottaBackground.fit, 'cover', 'Terracotta Glow Single Table Card covers the full portrait without stretching its artwork');
    assert.deepEqual(
        [terracottaBackground.x, terracottaBackground.y, terracottaBackground.width, terracottaBackground.height],
        [0, 0, logoDocument.canvas.width, logoDocument.canvas.height],
        'Terracotta Glow Single Table Card artwork covers the complete print canvas',
    );
    assert.ok(
        logoDocument.elements.indexOf(terracottaBackground) < logoDocument.elements.indexOf(terracottaVeil),
        'Terracotta Glow Single Table Card keeps the content veil above the full-background artwork',
    );

    const noTaglineDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'single_table_card',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'The Good Neighbour Beauty and Wellness Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        noTaglineDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Single Table Card omits an absent tagline instead of inventing brand copy',
    );
    const noTaglineCta = noTaglineDocument.elements.find((element) => isNamedTextElement(element, 'Call to action'));
    const noTaglineQrPanel = noTaglineDocument.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    assert.ok(noTaglineCta?.type === 'text' && noTaglineQrPanel?.type === 'rect', 'No-tagline Single Table Card keeps its CTA and QR action group');
    assert.ok(
        noTaglineQrPanel.y - (noTaglineCta.y + noTaglineCta.height) <= Math.round(noTaglineDocument.canvas.height * 0.044),
        'No-tagline Single Table Card keeps the CTA connected to the QR panel',
    );

    const feedbackDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'feedback_qr',
        businessCategory: 'service',
        businessType: 'Salon',
        feedbackUrl: 'https://aster-oak-studio.menulist.online/feedback',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'botanical-heritage',
    });
    assert.ok(
        !feedbackDocument.elements.some((element) => isNamedTextElement(element, 'Instruction')),
        'Feedback QR propagation removes the redundant secondary instruction',
    );
    assert.ok(
        feedbackDocument.elements.some((element) => isNamedTextElement(element, 'Call to action') && element.text === 'TELL US HOW WE DID'),
        'Feedback QR propagation preserves one distinct feedback action',
    );
}

async function assertAllThemeCounterStickerRulebookGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'counter_sticker',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const background = documentValue.elements.find((element) => (
        element.type === 'image' && element.name === 'terracotta-glow responsive theme background'
    ));
    const veil = documentValue.elements.find((element) => (
        element.type === 'rect' && element.name === 'terracotta-glow compact content veil'
    ));
    const badge = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business badge');
    const initials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        background?.type === 'image'
        && veil?.type === 'rect'
        && badge?.type === 'ellipse'
        && initials?.type === 'text'
        && businessName?.type === 'text'
        && callToAction?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        'Terracotta Glow Counter Sticker exposes its complete close-range scan hierarchy',
    );
    assert.equal(background.fit, 'cover', 'Terracotta Glow Counter Sticker keeps aspect-preserving full-background artwork');
    assert.deepEqual(
        [background.x, background.y, background.width, background.height],
        [0, 0, documentValue.canvas.width, documentValue.canvas.height],
        'Terracotta Glow Counter Sticker artwork covers the complete square canvas',
    );
    assert.ok(
        documentValue.elements.indexOf(background) < documentValue.elements.indexOf(veil),
        'Terracotta Glow Counter Sticker keeps the calm content veil above its artwork',
    );
    assert.equal(
        documentValue.elements.filter((element) => element.type === 'ellipse' && element.name === 'Sticker background').length,
        0,
        'Terracotta Glow Counter Sticker removes the oversized generic accent circle',
    );
    assert.equal(
        documentValue.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Counter Sticker intentionally omits the tagline to preserve close-range scan hierarchy',
    );
    assert.equal(callToAction.text, 'VIEW SERVICES', 'Counter Sticker uses the shorter governed business-aware view action');
    assert.doesNotMatch(callToAction.text, /CURRENT|SCAN|\n/, 'Counter Sticker avoids redundant scan wording and keeps its action compact');
    assert.ok(callToAction.fontSize < businessName.fontSize, 'Counter Sticker keeps the business name typographically dominant over the CTA');
    assert.equal(shortLink.text, 'aster-oak-studio.menulist.online', 'Counter Sticker prints only the truthful public hostname');
    assert.equal(qrCode.value, menuUrl, 'Counter Sticker QR retains the complete canonical destination');
    assert.equal(qrPanel.width - qrCode.width, 48, 'Counter Sticker QR panel keeps 24px horizontal padding');
    assert.equal(qrPanel.height - qrCode.height, 48, 'Counter Sticker QR panel keeps 24px vertical padding');
    assert.ok(badge.y >= Math.round(documentValue.canvas.height * 0.07), 'Counter Sticker identity clears the top artwork edge');
    assert.ok(badge.y + badge.height <= businessName.y, 'Counter Sticker identity clears the business name');
    assert.ok(businessName.y + businessName.height <= callToAction.y, 'Counter Sticker business name clears the scan action');
    const ctaToQrGap = qrPanel.y - (callToAction.y + callToAction.height);
    assert.ok(ctaToQrGap >= Math.round(documentValue.canvas.height * 0.028), 'Counter Sticker keeps a deliberate CTA-to-QR interval');
    assert.ok(ctaToQrGap <= Math.round(documentValue.canvas.height * 0.044), 'Counter Sticker keeps the CTA connected to the QR');
    assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, 'Counter Sticker QR clears the public hostname');
    assert.ok(shortLink.y + shortLink.height <= documentValue.canvas.height * 0.94, 'Counter Sticker hostname clears the die-cut edge');

    for (const layer of [initials, businessName, callToAction, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Counter Sticker ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'counter_sticker',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        1,
        'Terracotta Glow Counter Sticker uses the real client logo when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Terracotta Glow Counter Sticker does not place initials over a real client logo',
    );

    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const businessContext = businessContextForTheme(themeId);
        const themeMenuUrl = `https://${themeId}.menulist.online/offerings`;
        const themeDocument = buildPrintableAssetEditorDocument({
            assetTypeId: 'counter_sticker',
            ...businessContext,
            menuUrl: themeMenuUrl,
            outputFormat: 'png',
            shortLink: `${themeId}.menulist.online/offerings`,
            storeName: 'The Good Neighbour Studio and Workshop',
            tagline: 'A deliberately omitted sticker tagline.',
            templateFamilyId: themeId,
        });
        const themeBusinessName = themeDocument.elements.find((element) => isNamedTextElement(element, 'Business name'));
        const themeCallToAction = themeDocument.elements.find((element) => isNamedTextElement(element, 'Call to action'));
        const themeQrPanel = themeDocument.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
        const themeQrCode = themeDocument.elements.find((element) => element.type === 'qr');
        const themeShortLink = themeDocument.elements.find((element) => isNamedTextElement(element, 'Short link'));
        const themeInitials = themeDocument.elements.find((element) => isNamedTextElement(element, 'Business initials'));

        assert.ok(
            themeBusinessName?.type === 'text'
            && themeCallToAction?.type === 'text'
            && themeQrPanel?.type === 'rect'
            && themeQrCode?.type === 'qr'
            && themeShortLink?.type === 'text'
            && themeInitials?.type === 'text',
            `${themeId} Counter Sticker exposes the complete governed hierarchy`,
        );
        assert.equal(
            themeDocument.elements.filter((element) => element.type === 'ellipse' && element.name === 'Sticker background').length,
            0,
            `${themeId} Counter Sticker removes the legacy oversized accent circle`,
        );
        assert.equal(
            themeDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
            0,
            `${themeId} Counter Sticker omits the tagline to protect the compact scan hierarchy`,
        );
        assert.match(themeCallToAction.text, /^VIEW /, `${themeId} Counter Sticker uses the governed compact view action`);
        assert.doesNotMatch(themeCallToAction.text, /CURRENT|SCAN|\n/, `${themeId} Counter Sticker avoids redundant wording and unnecessary wrapping`);
        assert.ok(themeCallToAction.fontSize < themeBusinessName.fontSize, `${themeId} Counter Sticker keeps the business name dominant`);
        assert.equal(themeShortLink.text, `${themeId}.menulist.online`, `${themeId} Counter Sticker prints only the canonical hostname`);
        assert.equal(themeQrCode.value, themeMenuUrl, `${themeId} Counter Sticker QR retains the complete destination`);
        assert.equal(themeQrPanel.width - themeQrCode.width, 48, `${themeId} Counter Sticker keeps 24px horizontal QR padding`);
        assert.equal(themeQrPanel.height - themeQrCode.height, 48, `${themeId} Counter Sticker keeps 24px vertical QR padding`);
        assert.ok(themeBusinessName.y + themeBusinessName.height <= themeCallToAction.y, `${themeId} Counter Sticker name clears the action`);
        const themeCtaToQrGap = themeQrPanel.y - (themeCallToAction.y + themeCallToAction.height);
        assert.ok(themeCtaToQrGap >= Math.round(themeDocument.canvas.height * 0.028), `${themeId} Counter Sticker keeps deliberate action-to-QR spacing`);
        assert.ok(themeCtaToQrGap <= Math.round(themeDocument.canvas.height * 0.044), `${themeId} Counter Sticker keeps the action connected to the QR`);
        assert.ok(themeQrPanel.y + themeQrPanel.height <= themeShortLink.y, `${themeId} Counter Sticker QR clears the hostname`);
        assert.ok(themeShortLink.y + themeShortLink.height <= themeDocument.canvas.height * 0.94, `${themeId} Counter Sticker hostname clears the die-cut edge`);

        for (const layer of [themeInitials, themeBusinessName, themeCallToAction, themeShortLink]) {
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: themeDocument.canvas.height,
                canvasWidth: themeDocument.canvas.width,
                label: `${themeId} Counter Sticker ${layer.name}`,
                layer,
            });
        }
    }

    process.stdout.write(`Counter Sticker rulebook geometry passed for all ${PRINTABLE_THEME_FAMILY_IDS.length} governed themes.\n`);
}

async function assertTerracottaEntrancePosterPilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'entrance_poster',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const background = documentValue.elements.find((element) => (
        element.type === 'image' && element.name === 'terracotta-glow responsive theme background'
    ));
    const veil = documentValue.elements.find((element) => (
        element.type === 'rect' && element.name === 'terracotta-glow compact content veil'
    ));
    const badge = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business badge');
    const initials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        background?.type === 'image'
        && veil?.type === 'rect'
        && badge?.type === 'ellipse'
        && initials?.type === 'text'
        && businessName?.type === 'text'
        && tagline?.type === 'text'
        && callToAction?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        'Terracotta Glow Entrance Poster exposes its complete distance-view identity and scan hierarchy',
    );
    assert.equal(background.fit, 'cover', 'Terracotta Glow Entrance Poster keeps aspect-preserving full-background artwork');
    assert.deepEqual(
        [background.x, background.y, background.width, background.height],
        [0, 0, documentValue.canvas.width, documentValue.canvas.height],
        'Terracotta Glow Entrance Poster artwork covers the complete A4 canvas',
    );
    assert.ok(
        documentValue.elements.indexOf(background) < documentValue.elements.indexOf(veil),
        'Terracotta Glow Entrance Poster keeps its calm content veil above the artwork',
    );
    assert.equal(
        documentValue.elements.filter((element) => isNamedTextElement(element, 'Poster headline')).length,
        0,
        'Terracotta Glow Entrance Poster removes the redundant OUR SERVICES headline',
    );
    assert.equal(
        documentValue.elements.filter((element) => isNamedTextElement(element, 'Scan instruction')).length,
        0,
        'Terracotta Glow Entrance Poster removes the duplicate legacy scan instruction',
    );
    assert.equal(callToAction.text, 'SCAN TO VIEW SERVICES', 'Entrance Poster retains the explicit distance-readable scan action');
    assert.doesNotMatch(callToAction.text, /CURRENT|\n/, 'Entrance Poster keeps its scan action compact and readable');
    assert.ok(businessName.fontSize > callToAction.fontSize, 'Entrance Poster keeps the business name typographically dominant');
    assert.equal(shortLink.text, 'aster-oak-studio.menulist.online', 'Entrance Poster prints only the truthful public hostname');
    assert.equal(qrCode.value, menuUrl, 'Entrance Poster QR retains the complete canonical destination');
    assert.equal(qrPanel.width - qrCode.width, 48, 'Entrance Poster QR panel keeps 24px horizontal padding');
    assert.equal(qrPanel.height - qrCode.height, 48, 'Entrance Poster QR panel keeps 24px vertical padding');
    assert.ok(badge.y >= Math.round(documentValue.canvas.height * 0.08), 'Entrance Poster identity clears the top artwork edge');
    assert.ok(badge.y + badge.height <= businessName.y, 'Entrance Poster identity clears the business name');
    assert.ok(businessName.y + businessName.height <= tagline.y, 'Entrance Poster business name clears the tagline');
    assert.ok(tagline.y + tagline.height <= callToAction.y, 'Entrance Poster tagline clears the scan action');
    const ctaToQrGap = qrPanel.y - (callToAction.y + callToAction.height);
    assert.ok(ctaToQrGap >= Math.round(documentValue.canvas.height * 0.028), 'Entrance Poster keeps a deliberate CTA-to-QR interval');
    assert.ok(ctaToQrGap <= Math.round(documentValue.canvas.height * 0.050), 'Entrance Poster keeps the CTA connected to the QR');
    assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, 'Entrance Poster QR clears the public hostname');
    assert.ok(shortLink.y + shortLink.height <= documentValue.canvas.height * 0.88, 'Entrance Poster hostname clears the lower artwork and trim edge');

    for (const layer of [initials, businessName, tagline, callToAction, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Entrance Poster ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'entrance_poster',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        1,
        'Terracotta Glow Entrance Poster uses the real client logo when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Terracotta Glow Entrance Poster does not place initials over a real client logo',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Entrance Poster omits an absent tagline instead of inventing public copy',
    );

    const legacyThemeDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'entrance_poster',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'botanical-heritage',
    });
    assert.ok(
        legacyThemeDocument.elements.some((element) => isNamedTextElement(element, 'Call to action'))
        && !legacyThemeDocument.elements.some((element) => isNamedTextElement(element, 'Poster headline')),
        'Entrance Poster rulebook replaces the legacy headline hierarchy in every theme',
    );
}

async function assertTerracottaFeedbackQrPilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const feedbackUrl = 'https://aster-oak-studio.menulist.online/feedback';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'feedback_qr',
        businessCategory: 'service',
        businessType: 'Salon',
        feedbackUrl,
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const background = documentValue.elements.find((element) => (
        element.type === 'image' && element.name === 'terracotta-glow responsive theme background'
    ));
    const veil = documentValue.elements.find((element) => (
        element.type === 'rect' && element.name === 'terracotta-glow compact content veil'
    ));
    const badge = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business badge');
    const initials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const businessTagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const conversationPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Feedback conversation panel');
    const conversationTail = documentValue.elements.find((element) => element.type === 'triangle' && element.name === 'Feedback conversation tail');
    const reviewQuoteArtwork = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Feedback review quote artwork');
    const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
    const feedbackMotivation = documentValue.elements.find((element) => isNamedTextElement(element, 'Feedback motivation'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        background?.type === 'image'
        && veil?.type === 'rect'
        && badge?.type === 'ellipse'
        && initials?.type === 'text'
        && businessName?.type === 'text'
        && businessTagline?.type === 'text'
        && conversationPanel?.type === 'rect'
        && conversationTail?.type === 'triangle'
        && reviewQuoteArtwork?.type === 'image'
        && callToAction?.type === 'text'
        && feedbackMotivation?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        'Terracotta Glow Feedback QR exposes its complete feedback-specific hierarchy',
    );
    assert.equal(background.fit, 'cover', 'Terracotta Glow Feedback QR keeps aspect-preserving full-background artwork');
    assert.deepEqual(
        [background.x, background.y, background.width, background.height],
        [0, 0, documentValue.canvas.width, documentValue.canvas.height],
        'Terracotta Glow Feedback QR artwork covers the complete print canvas',
    );
    assert.ok(
        documentValue.elements.indexOf(background) < documentValue.elements.indexOf(veil),
        'Terracotta Glow Feedback QR keeps its calm content veil above the artwork',
    );
    assert.equal(
        documentValue.elements.filter((element) => isNamedTextElement(element, 'Instruction')).length,
        0,
        'Terracotta Glow Feedback QR removes the redundant scan instruction',
    );
    assert.equal(
        businessTagline.text,
        'Thoughtful care, beautifully delivered.',
        'Feedback QR preserves the real optional business tagline without inventing copy',
    );
    assert.equal(callToAction.text, 'TELL US HOW WE DID', 'Feedback QR uses one warm and explicit feedback action');
    assert.equal(feedbackMotivation.text, 'Your feedback helps us improve.', 'Feedback QR explains why an honest response is useful');
    assert.doesNotMatch(callToAction.text, /MENU|SERVICES|CURRENT|\n/, 'Feedback QR cannot be confused with a menu or services action');
    assert.ok(
        decodeURIComponent(reviewQuoteArtwork.src).includes('https://koboyo.com/icons/review-quote'),
        'Feedback QR review artwork preserves its governed Koboyo source provenance',
    );
    assert.equal(reviewQuoteArtwork.fit, 'contain', 'Feedback QR keeps the Koboyo review symbol aspect-ratio safe');
    assert.equal(reviewQuoteArtwork.locked, true, 'Feedback QR locks the governed review symbol inside the larger composition');
    assert.equal(
        documentValue.elements.filter((element) => isNamedTextElement(element, 'Feedback sparkle')).length,
        0,
        'Feedback QR removes the subtle generic sparkle motif',
    );
    assert.ok(
        !documentValue.elements.some((element) => element.type === 'text' && /★|⭐|1\s*[-–]\s*5|five stars?/i.test(element.text)),
        'Feedback QR contains no star rating or score solicitation',
    );
    assert.ok(businessName.fontSize > callToAction.fontSize, 'Feedback QR keeps the business name typographically dominant');
    assert.ok(businessName.fontSize > businessTagline.fontSize, 'Feedback QR keeps the tagline subordinate to the business name');
    assert.equal(shortLink.text, 'aster-oak-studio.menulist.online', 'Feedback QR prints only the truthful feedback hostname');
    assert.equal(qrCode.value, feedbackUrl, 'Feedback QR encodes the complete feedback destination rather than the menu URL');
    assert.equal(qrPanel.width - qrCode.width, 48, 'Feedback QR panel keeps 24px horizontal padding');
    assert.equal(qrPanel.height - qrCode.height, 48, 'Feedback QR panel keeps 24px vertical padding');
    assert.ok(badge.y >= Math.round(documentValue.canvas.height * 0.085), 'Feedback QR identity clears the top artwork edge');
    assert.ok(badge.y + badge.height <= businessName.y, 'Feedback QR identity clears the business name');
    assert.ok(businessName.y + businessName.height <= businessTagline.y, 'Feedback QR business name clears the tagline');
    assert.ok(businessTagline.y + businessTagline.height <= conversationPanel.y, 'Feedback QR tagline clears the feedback conversation motif');
    assert.ok(
        conversationPanel.y - (businessTagline.y + businessTagline.height) >= Math.round(documentValue.canvas.height * 0.044),
        'Feedback QR preserves the governed tagline-to-conversation breathing room',
    );
    assert.ok(conversationPanel.y <= callToAction.y, 'Feedback QR action begins inside the conversation panel');
    assert.ok(callToAction.y + callToAction.height <= feedbackMotivation.y, 'Feedback QR action clears its supporting motivation line');
    assert.ok(
        feedbackMotivation.y + feedbackMotivation.height <= conversationPanel.y + conversationPanel.height,
        'Feedback QR motivation line remains inside the conversation panel',
    );
    assert.ok(
        documentValue.elements.indexOf(conversationTail) < documentValue.elements.indexOf(conversationPanel)
        && documentValue.elements.indexOf(conversationPanel) < documentValue.elements.indexOf(callToAction)
        && documentValue.elements.indexOf(conversationPanel) < documentValue.elements.indexOf(feedbackMotivation),
        'Feedback QR conversation artwork stays behind its readable copy',
    );
    assert.ok(
        documentValue.elements.indexOf(conversationPanel) < documentValue.elements.indexOf(reviewQuoteArtwork)
        && documentValue.elements.indexOf(reviewQuoteArtwork) < documentValue.elements.indexOf(callToAction)
        && documentValue.elements.indexOf(reviewQuoteArtwork) < documentValue.elements.indexOf(feedbackMotivation),
        'Feedback QR review artwork has a deliberate panel-to-purpose layer order',
    );
    assert.ok(reviewQuoteArtwork.x >= conversationPanel.x && reviewQuoteArtwork.x + reviewQuoteArtwork.width <= conversationPanel.x + conversationPanel.width, 'Feedback QR review symbol stays inside the conversation panel');
    assert.ok(reviewQuoteArtwork.y >= conversationPanel.y && reviewQuoteArtwork.y + reviewQuoteArtwork.height <= conversationPanel.y + conversationPanel.height, 'Feedback QR review symbol stays vertically inside the conversation panel');
    assert.ok(callToAction.x >= reviewQuoteArtwork.x + reviewQuoteArtwork.width, 'Feedback QR action copy clears the review artwork');
    const conversationToQrGap = qrPanel.y - (conversationPanel.y + conversationPanel.height);
    assert.ok(conversationToQrGap >= Math.round(documentValue.canvas.height * 0.028), 'Feedback QR keeps a deliberate conversation-to-QR interval');
    assert.ok(conversationToQrGap <= Math.round(documentValue.canvas.height * 0.050), 'Feedback QR keeps the invitation connected to the QR');
    assert.ok(
        conversationTail.y + conversationTail.height <= qrPanel.y
        && reviewQuoteArtwork.y + reviewQuoteArtwork.height <= qrPanel.y,
        'Feedback QR decorative artwork remains outside the protected QR panel',
    );
    assert.equal(
        documentValue.elements.filter((element) => (
            element.name === 'Feedback smile seal'
            || element.name === 'Feedback smile eye'
            || element.name === 'Feedback smile'
            || element.name === 'Feedback response ray'
        )).length,
        0,
        'Feedback QR removes the retired hand-built smile and response-ray motif',
    );
    assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, 'Feedback QR panel clears the feedback hostname');
    assert.ok(shortLink.y + shortLink.height <= documentValue.canvas.height * 0.86, 'Feedback QR hostname clears the lower artwork and trim edge');

    for (const layer of [initials, businessName, businessTagline, callToAction, feedbackMotivation, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Feedback QR ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'feedback_qr',
        businessCategory: 'service',
        businessType: 'Salon',
        feedbackUrl,
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        1,
        'Terracotta Glow Feedback QR uses the real client logo when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Terracotta Glow Feedback QR does not place initials over a real client logo',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Feedback QR omits the tagline row and reflows safely when the owner has not supplied one',
    );
    const noTaglineConversationPanel = logoDocument.elements.find((element) => (
        element.type === 'rect' && element.name === 'Feedback conversation panel'
    ));
    assert.ok(
        noTaglineConversationPanel?.type === 'rect' && noTaglineConversationPanel.y < conversationPanel.y,
        'Feedback QR moves the invitation upward when the optional tagline is absent',
    );

    const legacyThemeDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'feedback_qr',
        businessCategory: 'service',
        businessType: 'Salon',
        feedbackUrl,
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'botanical-heritage',
    });
    assert.ok(
        legacyThemeDocument.elements.some((element) => element.type === 'rect' && element.name === 'Feedback conversation panel')
        && !legacyThemeDocument.elements.some((element) => isNamedTextElement(element, 'Instruction')),
        'Feedback QR rulebook replaces the redundant instruction hierarchy in every theme',
    );
}

async function assertTerracottaCampaignFlyerPilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'campaign_flyer',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const background = documentValue.elements.find((element) => (
        element.type === 'image' && element.name === 'terracotta-glow responsive theme background'
    ));
    const veil = documentValue.elements.find((element) => (
        element.type === 'rect' && element.name === 'terracotta-glow compact content veil'
    ));
    const badge = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business badge');
    const initials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const businessTagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const editorialRule = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Flyer editorial rule');
    const scanPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Flyer scan panel');
    const scanDivider = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Flyer scan divider');
    const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        background?.type === 'image'
        && veil?.type === 'rect'
        && badge?.type === 'ellipse'
        && initials?.type === 'text'
        && businessName?.type === 'text'
        && businessTagline?.type === 'text'
        && editorialRule?.type === 'line'
        && scanPanel?.type === 'rect'
        && scanDivider?.type === 'line'
        && callToAction?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        'Terracotta Glow Flyer exposes its complete truthful identity and scan hierarchy',
    );
    assert.equal(background.fit, 'cover', 'Terracotta Glow Flyer keeps aspect-preserving full-background artwork');
    assert.deepEqual(
        [background.x, background.y, background.width, background.height],
        [0, 0, documentValue.canvas.width, documentValue.canvas.height],
        'Terracotta Glow Flyer artwork covers the complete A5 canvas',
    );
    assert.ok(
        documentValue.elements.indexOf(background) < documentValue.elements.indexOf(veil),
        'Terracotta Glow Flyer keeps its calm content veil above the artwork',
    );
    assert.equal(
        documentValue.elements.filter((element) => (
            isNamedTextElement(element, 'Offer headline')
            || isNamedTextElement(element, 'Primary offer')
            || isNamedTextElement(element, 'Offer details')
        )).length,
        0,
        'Flyer removes unsupported weekend-offer, special-offer, and terms claims',
    );
    assert.equal(businessTagline.text, 'Thoughtful care, beautifully delivered.', 'Flyer preserves the real optional business tagline');
    assert.equal(
        callToAction.text.replace(/\s+/g, ' '),
        'SCAN TO VIEW SERVICES',
        'Flyer uses one business-aware scan action without CURRENT',
    );
    assert.ok((callToAction.text.match(/\n/g) || []).length <= 1, 'Flyer limits its centered CTA to at most two lines');
    assert.ok(businessName.fontSize > callToAction.fontSize, 'Flyer keeps the business name typographically dominant');
    assert.equal(shortLink.text, 'aster-oak-studio.menulist.online', 'Flyer prints only the truthful canonical hostname');
    assert.equal(qrCode.value, menuUrl, 'Flyer QR retains the complete canonical destination');
    assert.equal(qrPanel.width - qrCode.width, 48, 'Flyer QR panel keeps 24px horizontal padding');
    assert.equal(qrPanel.height - qrCode.height, 48, 'Flyer QR panel keeps 24px vertical padding');
    assert.ok(badge.y >= Math.round(documentValue.canvas.height * 0.065), 'Flyer identity clears the top artwork edge');
    assert.ok(badge.y + badge.height <= businessName.y, 'Flyer identity clears the business name');
    assert.ok(businessName.y + businessName.height <= businessTagline.y, 'Flyer business name clears the tagline');
    assert.ok(businessTagline.y + businessTagline.height <= editorialRule.y, 'Flyer tagline clears the editorial divider');
    assert.ok(editorialRule.y <= scanPanel.y, 'Flyer editorial divider clears the scan panel');
    assert.ok(
        scanPanel.x <= callToAction.x
        && callToAction.x + callToAction.width <= scanDivider.x
        && scanDivider.x <= qrPanel.x
        && qrPanel.x + qrPanel.width <= scanPanel.x + scanPanel.width,
        'Flyer keeps CTA, divider, and QR in separate scan-panel columns',
    );
    assert.ok(
        scanPanel.y <= callToAction.y
        && callToAction.y + callToAction.height <= scanPanel.y + scanPanel.height
        && scanPanel.y <= qrPanel.y
        && qrPanel.y + qrPanel.height <= scanPanel.y + scanPanel.height,
        'Flyer keeps CTA and QR vertically inside the scan panel',
    );
    assert.ok(scanPanel.y + scanPanel.height <= shortLink.y, 'Flyer scan panel clears the recovery hostname');
    assert.ok(shortLink.y + shortLink.height <= documentValue.canvas.height * 0.86, 'Flyer hostname clears lower artwork and trim');

    for (const layer of [initials, businessName, businessTagline, callToAction, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Flyer ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'campaign_flyer',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        1,
        'Terracotta Glow Flyer uses the real client logo when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Terracotta Glow Flyer does not place initials over a real client logo',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Flyer omits the tagline row instead of inventing campaign or brand copy',
    );

    const legacyThemeDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'campaign_flyer',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'botanical-heritage',
    });
    assert.ok(
        legacyThemeDocument.elements.some((element) => element.type === 'rect' && element.name === 'Flyer scan panel')
        && !legacyThemeDocument.elements.some((element) => isNamedTextElement(element, 'Offer headline')),
        'Flyer rulebook removes synthetic offer claims in every theme',
    );
}

async function assertTerracottaGiftCertificatePilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'gift_certificate',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const background = documentValue.elements.find((element) => (
        element.type === 'image' && element.name === 'terracotta-glow responsive theme background'
    ));
    const veil = documentValue.elements.find((element) => (
        element.type === 'rect' && element.name === 'terracotta-glow compact content veil'
    ));
    const border = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Gift certificate border');
    const divider = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Gift certificate column divider');
    const giftWrapOverlay = documentValue.elements.find((element) => element.name === 'Gift wrap background overlay');
    const badge = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business badge');
    const initials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const headline = documentValue.elements.find((element) => isNamedTextElement(element, 'Voucher headline'));
    const titleRule = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Gift certificate title rule');
    const recipientLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Recipient label'));
    const senderLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Sender label'));
    const messageLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Message label'));
    const giftDetailsPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Gift details panel');
    const valueLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Gift value label'));
    const validityLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Gift validity label'));
    const certificateNumberLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Certificate number label'));
    const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        background?.type === 'image'
        && veil?.type === 'rect'
        && border?.type === 'rect'
        && divider?.type === 'line'
        && giftWrapOverlay?.type === 'image'
        && badge?.type === 'ellipse'
        && initials?.type === 'text'
        && businessName?.type === 'text'
        && tagline?.type === 'text'
        && headline?.type === 'text'
        && titleRule?.type === 'line'
        && recipientLabel?.type === 'text'
        && senderLabel?.type === 'text'
        && messageLabel?.type === 'text'
        && giftDetailsPanel?.type === 'rect'
        && valueLabel?.type === 'text'
        && validityLabel?.type === 'text'
        && certificateNumberLabel?.type === 'text'
        && callToAction?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        'Terracotta Glow Gift Certificate exposes a complete premium write-in and scan hierarchy',
    );
    assert.equal(background.fit, 'cover', 'Terracotta Glow Gift Certificate preserves aspect-ratio-safe full-background artwork');
    assert.deepEqual(
        [background.x, background.y, background.width, background.height],
        [0, 0, documentValue.canvas.width, documentValue.canvas.height],
        'Terracotta Glow Gift Certificate artwork covers the complete landscape canvas',
    );
    assert.ok(
        documentValue.elements.indexOf(background) < documentValue.elements.indexOf(veil)
        && documentValue.elements.indexOf(veil) < documentValue.elements.indexOf(border),
        'Gift Certificate keeps its calm content veil and certificate frame above the artwork',
    );
    assert.equal(giftWrapOverlay.src, getPrintableGiftCertificateOverlayPath('terracotta-glow'), 'Gift Certificate uses its governed Koboyo gift artwork');
    assert.equal(giftWrapOverlay.fit, 'cover', 'Gift Certificate preserves the edge-to-edge artwork aspect ratio');
    const terracottaTokens = resolvePrintableTemplateBrandTokens(undefined, 'terracotta-glow');
    const overlaySvg = buildPrintableGiftCertificateOverlaySvg({
        accent: terracottaTokens.accent,
        border: terracottaTokens.border,
        highlight: terracottaTokens.softAccent,
    });
    assert.match(overlaySvg, /data-icon-library="koboyo"/, 'Gift Certificate identifies Koboyo as its governed purpose-art library');
    assert.match(overlaySvg, /data-purpose-art="gift"/, 'Gift Certificate identifies the semantic gift purpose of its artwork');
    assert.match(overlaySvg, /https:\/\/koboyo\.com\/icons\/gift/, 'Gift Certificate preserves the official Koboyo gift source in its master');
    assert.match(overlaySvg, /id="gift-certificate-purpose-art"/, 'Gift Certificate embeds the governed Koboyo gift symbol in its larger composition');
    const giftWrapMetadata = await sharp(path.resolve(process.cwd(), `public${giftWrapOverlay.src}`)).metadata();
    assert.deepEqual(
        [giftWrapMetadata.width, giftWrapMetadata.height, giftWrapMetadata.hasAlpha],
        [1748, 826, true],
        'Gift Certificate gift-wrap artwork keeps its canvas-matched transparent master',
    );
    const giftWrapPath = path.resolve(process.cwd(), `public${giftWrapOverlay.src}`);
    const giftWrapRegionStats = async (region: { height: number; left: number; top: number; width: number }) => {
        const regionBuffer = await sharp(giftWrapPath).extract(region).png().toBuffer();
        return sharp(regionBuffer).stats();
    };
    const [leftEdgeStats, rightEdgeStats, calmCenterStats] = await Promise.all([
        giftWrapRegionStats({ left: 0, top: 0, width: 64, height: 240 }),
        giftWrapRegionStats({ left: 1684, top: 0, width: 64, height: 240 }),
        giftWrapRegionStats({ left: 420, top: 260, width: 760, height: 360 }),
    ]);
    assert.ok(
        (leftEdgeStats.channels[3]?.mean || 0) > 8
        && (rightEdgeStats.channels[3]?.mean || 0) > 8,
        'Gift Certificate soft wrap field visibly reaches both horizontal edges',
    );
    assert.ok(
        (calmCenterStats.channels[3]?.mean || 0) < 2,
        'Gift Certificate edge artwork preserves a transparent central writing field',
    );
    assert.deepEqual(
        [giftWrapOverlay.x, giftWrapOverlay.y, giftWrapOverlay.width, giftWrapOverlay.height, giftWrapOverlay.locked],
        [0, 0, documentValue.canvas.width, documentValue.canvas.height, true],
        'Gift Certificate gift-wrap artwork covers and locks to the complete canvas',
    );
    assert.ok(
        documentValue.elements.indexOf(veil) < documentValue.elements.indexOf(giftWrapOverlay)
        && documentValue.elements.indexOf(giftWrapOverlay) < documentValue.elements.indexOf(border)
        && documentValue.elements.indexOf(giftWrapOverlay) < documentValue.elements.indexOf(giftDetailsPanel),
        'Gift Certificate edge artwork remains behind the certificate frame and all functional content',
    );
    assert.equal(
        documentValue.elements.filter((element) => element.name === 'Gift ribbon ornament').length,
        0,
        'Gift Certificate removes the isolated corner-bow composition',
    );
    assert.equal(headline.text, 'GIFT CERTIFICATE', 'Gift Certificate retains one clear document title');
    assert.ok(headline.fontSize <= documentValue.canvas.height * 0.086, 'Gift Certificate prevents the title from overpowering the complete document');
    assert.equal(tagline.text, 'Thoughtful care, beautifully delivered.', 'Gift Certificate preserves the real optional business tagline');
    assert.deepEqual(
        [recipientLabel.text, senderLabel.text, messageLabel.text],
        ['PRESENTED TO', 'FROM', 'PERSONAL MESSAGE'],
        'Gift Certificate provides separate truthful recipient, sender, and message write-in fields',
    );
    assert.deepEqual(
        [valueLabel.text, validityLabel.text, certificateNumberLabel.text],
        ['VALUE', 'VALID UNTIL', 'CERTIFICATE NO.'],
        'Gift Certificate provides separate value, validity, and certificate-number write-in fields',
    );
    assert.equal(
        documentValue.elements.filter((element) => isNamedTextElement(element, 'Voucher detail')).length,
        0,
        'Gift Certificate removes the ambiguous combined Value / valid until placeholder',
    );
    assert.ok(
        !documentValue.elements.some((element) => element.type === 'text' && /₹|\$|£|€|redeem/i.test(element.text)),
        'Gift Certificate invents no amount, currency, expiry, or redemption capability',
    );
    assert.equal(callToAction.text, 'VIEW SERVICES', 'Gift Certificate uses a truthful business-aware discovery action');
    assert.equal(shortLink.text, 'aster-oak-studio.menulist.online', 'Gift Certificate prints only the canonical hostname');
    assert.equal(qrCode.value, menuUrl, 'Gift Certificate QR retains the complete canonical destination');
    assert.equal(qrPanel.width - qrCode.width, 48, 'Gift Certificate QR panel keeps 24px horizontal padding');
    assert.equal(qrPanel.height - qrCode.height, 48, 'Gift Certificate QR panel keeps 24px vertical padding');
    assert.ok(badge.x + badge.width <= businessName.x, 'Gift Certificate identity mark clears the business name');
    assert.ok(businessName.y + businessName.height <= tagline.y, 'Gift Certificate business name clears the tagline');
    assert.ok(tagline.y + tagline.height <= headline.y, 'Gift Certificate brand lockup clears the document title');
    assert.ok(headline.y + headline.height <= titleRule.y, 'Gift Certificate title clears its editorial rule');
    assert.ok(titleRule.y <= recipientLabel.y, 'Gift Certificate editorial rule clears the first write-in field');
    assert.ok(recipientLabel.y < senderLabel.y && senderLabel.y < messageLabel.y, 'Gift Certificate write-in fields keep a deliberate reading sequence');
    assert.ok(headline.x + headline.width <= divider.x, 'Gift Certificate title remains inside the writable column');
    assert.ok(giftDetailsPanel.x >= divider.x, 'Gift Certificate value and validity panel remains inside the scan column');
    assert.ok(callToAction.x >= divider.x && qrPanel.x >= divider.x && shortLink.x >= divider.x, 'Gift Certificate scan group remains inside the right column');
    assert.ok(callToAction.y + callToAction.height <= qrPanel.y, 'Gift Certificate action clears the QR panel');
    assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, 'Gift Certificate QR panel clears the hostname');
    assert.ok(shortLink.y + shortLink.height <= border.y + border.height, 'Gift Certificate hostname clears the lower certificate edge');

    for (const layer of [initials, callToAction, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Gift Certificate ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'gift_certificate',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        1,
        'Terracotta Glow Gift Certificate uses the real client logo when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Terracotta Glow Gift Certificate does not place initials over a real client logo',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length,
        0,
        'Gift Certificate omits the tagline row instead of inventing brand copy',
    );

}

async function assertTerracottaBusinessCardPilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'business_card',
        businessCategory: 'service',
        businessType: 'Salon',
        contactAddress: '18 Lavelle Road, Bengaluru',
        contactEmail: 'hello@asteroak.studio',
        contactName: 'Mira Shah',
        contactPhone: '+91 98450 21840',
        contactRole: 'Founder & Creative Director',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        socialHandle: '@asteroakstudio',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const printFrames = documentValue.metadata?.printFrames || [];
    const frontElements = documentValue.elements.filter((element) => element.printFrameId === 'front');
    const backElements = documentValue.elements.filter((element) => element.printFrameId === 'back');
    const frontAccentField = frontElements.find((element) => element.type === 'rect' && element.name === 'Business card front accent field');
    const backUtilityField = backElements.find((element) => element.type === 'rect' && element.name === 'Business card QR utility field');
    const frontBrandMark = frontElements.find((element) => element.type === 'ellipse' && element.name === 'Business card brand mark field');
    const backBrandMark = backElements.find((element) => element.type === 'ellipse' && element.name === 'Business card brand mark field');
    const frontBusinessName = frontElements.find((element) => isNamedTextElement(element, 'Business name'));
    const backBusinessName = backElements.find((element) => isNamedTextElement(element, 'Business name'));
    const frontTagline = frontElements.find((element) => isNamedTextElement(element, 'Tagline'));
    const contactName = backElements.find((element) => isNamedTextElement(element, 'Contact name'));
    const role = backElements.find((element) => isNamedTextElement(element, 'Role'));
    const contactIcons = backElements.filter((element): element is Extract<CreativeEditorElement, { type: 'image' }> => (
        element.type === 'image' && /^Business card (phone|email|address) icon$/.test(element.name)
    ));
    const contactValues = backElements.filter((element): element is Extract<CreativeEditorElement, { type: 'text' }> => (
        isTextElement(element) && /^Business card (phone|email|address) value$/.test(element.name)
    ));
    const action = backElements.find((element) => isNamedTextElement(element, 'Business card action'));
    const qrPanel = backElements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = backElements.find((element) => element.type === 'qr');
    const shortLink = backElements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.deepEqual(
        printFrames.map((frame) => [frame.id, frame.x, frame.y, frame.width, frame.height, frame.locked]),
        [
            ['front', 0, 0, 1063, 650, true],
            ['back', 1103, 0, 1063, 650, true],
        ],
        'Terracotta Glow Business Card preserves two exact protected 90 x 55 mm print faces',
    );
    assert.ok(
        frontAccentField?.type === 'rect'
        && backUtilityField?.type === 'rect'
        && frontBrandMark?.type === 'ellipse'
        && backBrandMark?.type === 'ellipse'
        && frontBusinessName?.type === 'text'
        && backBusinessName?.type === 'text'
        && frontTagline?.type === 'text'
        && contactName?.type === 'text'
        && action?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        'Terracotta Glow Business Card exposes its complete premium brand-front and contact-back hierarchy',
    );
    assert.equal(frontElements.filter((element) => element.type === 'qr').length, 0, 'Business Card keeps the brand-led front free of QR utility clutter');
    assert.equal(frontElements.filter((element) => isNamedTextElement(element, 'Contact name')).length, 0, 'Business Card keeps personal contact details off the brand-led front');
    assert.equal(contactName.text, 'Mira Shah', 'Business Card uses the real contact person instead of repeating the business name');
    assert.equal(role, undefined, 'Business Card omits designation even when a role is supplied');
    assert.equal(
        backElements.filter((element) => element.type === 'text' && /social/i.test(element.name)).length,
        0,
        'Business Card omits the social handle even when it is supplied',
    );
    assert.deepEqual(
        contactIcons.map((element) => element.name),
        ['Business card phone icon', 'Business card email icon', 'Business card address icon'],
        'Business Card replaces redundant contact labels with one restrained semantic SVG icon per fact',
    );
    assert.ok(
        contactIcons.every((element) => element.src.startsWith('data:image/svg+xml;charset=utf-8,') && element.src.includes(encodeURIComponent('#a9533e'))),
        'Business Card contact SVG icons inherit the Terracotta Glow parent-theme accent',
    );
    assert.equal(
        backElements.filter((element) => element.type === 'text' && /^(PHONE|EMAIL|VISIT)$/.test(element.text)).length,
        0,
        'Business Card removes the visible PHONE, EMAIL, and VISIT labels',
    );
    assert.deepEqual(
        contactValues.map((element) => element.text.replace(/\n/g, ' ')),
        ['+91 98450 21840', 'hello@asteroak.studio', '18 Lavelle Road, Bengaluru'],
        'Business Card prints only the admitted contact facts',
    );
    assert.equal(action.text.replace(/\n/g, ' '), 'VIEW SERVICES', 'Business Card uses one short business-aware QR action');
    assert.equal(shortLink.text.replace(/\n/g, ''), 'aster-oak-studio.menulist.online', 'Business Card prints only the truthful canonical hostname');
    assert.equal(qrCode.value, menuUrl, 'Business Card QR retains the complete canonical destination');
    assert.equal(qrPanel.width - qrCode.width, 48, 'Business Card QR panel keeps 24px horizontal padding');
    assert.equal(qrPanel.height - qrCode.height, 48, 'Business Card QR panel keeps 24px vertical padding');
    assert.ok(qrCode.width >= documentValue.canvas.height * 0.32, 'Business Card keeps the live QR at a practical physical scan size');
    assert.ok(contactValues.every((element) => element.fontSize >= documentValue.canvas.height * 0.038), 'Business Card keeps every contact value at a print-readable type size');
    assert.ok(action.fontSize >= documentValue.canvas.height * 0.032, 'Business Card keeps the QR action readable at physical size');
    assert.ok(shortLink.fontSize >= documentValue.canvas.height * 0.030, 'Business Card keeps the recovery hostname readable at physical size');
    assert.ok(
        documentValue.elements.indexOf(backUtilityField) < documentValue.elements.indexOf(action)
        && documentValue.elements.indexOf(backUtilityField) < documentValue.elements.indexOf(qrPanel)
        && documentValue.elements.indexOf(qrPanel) < documentValue.elements.indexOf(qrCode),
        'Business Card keeps the utility field behind its readable action and protected QR',
    );
    assert.ok(action.y + action.height <= qrPanel.y, 'Business Card action clears the QR panel');
    assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, 'Business Card QR panel clears the hostname');
    assert.equal(
        documentValue.elements.filter((element) => (
            element.type === 'text' && /Owner \/ Manager|Phone number|Business address|Follow \/ save \/ share|SCAN SAVE VISIT|Scan for/i.test(element.text)
        )).length,
        0,
        'Business Card removes invented placeholders and the legacy generic scan language',
    );

    for (const frame of printFrames) {
        const frameElements = documentValue.elements.filter((element) => element.printFrameId === frame.id);
        for (const element of frameElements) {
            assert.ok(element.x >= frame.x, `${frame.id}/${element.name} starts inside its assigned print face`);
            assert.ok(element.y >= frame.y, `${frame.id}/${element.name} starts below its assigned print-face top`);
            assert.ok(element.x + element.width <= frame.x + frame.width, `${frame.id}/${element.name} ends inside its assigned print face`);
            assert.ok(element.y + element.height <= frame.y + frame.height, `${frame.id}/${element.name} ends above its assigned print-face bottom`);
        }
    }

    for (const layer of [frontBusinessName, backBusinessName, contactName, ...contactValues]) {
        const bounds = await measureRenderedTextBounds({
            align: layer.align || 'left',
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight || '700',
            lineHeight: layer.lineHeight,
            text: layer.text,
            width: layer.width,
            x: layer.x,
            y: layer.y,
        });
        assert.ok(bounds.left >= layer.x - 4, `Business Card ${layer.name} rendered glyphs start inside the declared text box`);
        assert.ok(bounds.right <= layer.x + layer.width + 4, `Business Card ${layer.name} rendered glyphs end inside the declared text box`);
    }
    for (const layer of [action, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Business Card ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'business_card',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length,
        2,
        'Terracotta Glow Business Card uses the real client logo on both brand lockups when supplied',
    );
    assert.equal(
        logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length,
        0,
        'Terracotta Glow Business Card does not place initials over a real client logo',
    );

    const minimalDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'business_card',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(minimalDocument.elements.filter((element) => isNamedTextElement(element, 'Tagline')).length, 0, 'Business Card omits an absent tagline and recenters the front identity');
    assert.equal(minimalDocument.elements.filter((element) => isNamedTextElement(element, 'Contact name')).length, 0, 'Business Card omits an absent contact person rather than repeating the business name');
    assert.equal(
        minimalDocument.elements.filter((element) => /^Business card .* (icon|value)$/.test(element.name)).length,
        0,
        'Business Card omits unavailable contact rows instead of printing placeholders',
    );
    assert.equal(
        minimalDocument.elements.filter((element) => element.type === 'text' && /Owner \/ Manager|Phone number|Business address|Follow \/ save \/ share/i.test(element.text)).length,
        0,
        'Business Card minimal fallback invents no public contact facts',
    );
    assert.equal(minimalDocument.elements.filter((element) => element.type === 'qr').length, 1, 'Business Card minimal fallback preserves one useful canonical QR');

    const invalidContactDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'business_card',
        businessCategory: 'service',
        businessType: 'Salon',
        contactAddress: 'Business address',
        contactEmail: 'not-an-email',
        contactName: 'Your Name',
        contactPhone: 'Phone number',
        contactRole: 'Founder',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        socialHandle: '@should-not-render',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(
        invalidContactDocument.elements.filter((element) => isNamedTextElement(element, 'Contact name')).length,
        0,
        'Business Card rejects a placeholder-like contact name',
    );
    assert.equal(
        invalidContactDocument.elements.filter((element) => /^Business card .* (icon|value)$/.test(element.name)).length,
        0,
        'Business Card rejects malformed or placeholder-like contact facts',
    );
    assert.equal(
        invalidContactDocument.elements.filter((element) => isNamedTextElement(element, 'Role')).length,
        0,
        'Business Card excludes designation independently of other supplied fields',
    );

    const adjacentThemeDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'business_card',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'botanical-heritage',
    });
    assert.equal(
        adjacentThemeDocument.elements.filter((element) => element.type === 'rect' && element.name === 'Business card front accent field').length,
        1,
        'Business Card approved premium composition propagates to adjacent parent themes',
    );
}

function assertAllThemeBusinessCardRulebookGeometry() {
    const menuUrl = 'https://sample-business.menulist.online/menu';
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'business_card',
            ...businessContextForTheme(themeId),
            contactAddress: '18 Lavelle Road, Bengaluru',
            contactEmail: 'hello@samplebusiness.studio',
            contactName: 'Mira Shah',
            contactPhone: '+91 98450 21840',
            contactRole: 'Founder & Creative Director',
            menuUrl,
            outputFormat: 'png',
            projectId: `${themeId}-business-card-final-rulebook`,
            shortLink: 'sample-business.menulist.online/menu',
            socialHandle: '@samplebusiness',
            storeName: 'Sample Business Studio',
            tagline: 'Thoughtful work, beautifully delivered.',
            templateFamilyId: themeId,
        });
        const frames = documentValue.metadata?.printFrames || [];
        const frontElements = documentValue.elements.filter((element) => element.printFrameId === 'front');
        const backElements = documentValue.elements.filter((element) => element.printFrameId === 'back');
        const icons = backElements.filter((element): element is Extract<CreativeEditorElement, { type: 'image' }> => (
            element.type === 'image' && /^Business card (phone|email|address) icon$/.test(element.name)
        ));
        const values = backElements.filter((element): element is Extract<CreativeEditorElement, { type: 'text' }> => (
            isTextElement(element) && /^Business card (phone|email|address) value$/.test(element.name)
        ));
        const tokens = resolvePrintableTemplateBrandTokens(undefined, themeId);

        assert.deepEqual(
            frames.map((frame) => [frame.id, frame.width, frame.height, frame.locked]),
            [['front', 1063, 650, true], ['back', 1063, 650, true]],
            `${themeId}/business_card preserves the protected physical front/back contract`,
        );
        assert.equal(frontElements.filter((element) => element.type === 'qr').length, 0, `${themeId}/business_card keeps its front QR-free`);
        assert.equal(backElements.filter((element) => element.type === 'qr').length, 1, `${themeId}/business_card keeps one live QR on its back`);
        assert.equal(frontElements.filter((element) => element.type === 'rect' && element.name === 'Business card front accent field').length, 1, `${themeId}/business_card uses the approved brand-front composition`);
        assert.equal(backElements.filter((element) => element.type === 'rect' && element.name === 'Business card QR utility field').length, 1, `${themeId}/business_card uses the approved contact-plus-QR back composition`);
        assert.deepEqual(
            icons.map((element) => element.name),
            ['Business card phone icon', 'Business card email icon', 'Business card address icon'],
            `${themeId}/business_card uses one semantic SVG icon per admitted contact fact`,
        );
        assert.ok(
            icons.every((element) => element.src.includes(encodeURIComponent(tokens.accent))),
            `${themeId}/business_card contact SVG icons inherit the selected parent-theme accent`,
        );
        assert.deepEqual(
            values.map((element) => element.text.replace(/\n/g, ' ')),
            ['+91 98450 21840', 'hello@samplebusiness.studio', '18 Lavelle Road, Bengaluru'],
            `${themeId}/business_card preserves the truthful contact values`,
        );
        assert.equal(
            documentValue.elements.filter((element) => element.type === 'text' && /^(PHONE|EMAIL|VISIT)$/.test(element.text)).length,
            0,
            `${themeId}/business_card removes redundant visible contact labels`,
        );
        assert.equal(
            documentValue.elements.filter((element) => element.type === 'text' && (element.name === 'Role' || /social/i.test(element.name))).length,
            0,
            `${themeId}/business_card excludes designation and social handle`,
        );
        for (const frame of frames) {
            for (const element of documentValue.elements.filter((candidate) => candidate.printFrameId === frame.id)) {
                assert.ok(element.x >= frame.x, `${themeId}/${frame.id}/${element.name} starts inside its print face`);
                assert.ok(element.y >= frame.y, `${themeId}/${frame.id}/${element.name} starts below its print-face top`);
                assert.ok(element.x + element.width <= frame.x + frame.width, `${themeId}/${frame.id}/${element.name} ends inside its print face`);
                assert.ok(element.y + element.height <= frame.y + frame.height, `${themeId}/${frame.id}/${element.name} ends above its print-face bottom`);
            }
        }
    }
    process.stdout.write(`Business Card rulebook geometry passed for all ${PRINTABLE_THEME_FAMILY_IDS.length} governed themes.\n`);
}

async function assertAllThemeGiftCertificateRulebookGeometry() {
    const menuUrl = 'https://sample-business.menulist.online/menu';
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'gift_certificate',
            brandColor: '#315f55',
            ...businessContextForTheme(themeId),
            menuUrl,
            outputFormat: 'png',
            projectId: `${themeId}-gift-certificate-final-rulebook`,
            shortLink: 'sample-business.menulist.online/menu',
            storeName: 'Sample Business Studio',
            tagline: 'Thoughtful work, beautifully delivered.',
            templateFamilyId: themeId,
        });
        const giftWrapOverlay = documentValue.elements.find((element) => (
            element.type === 'image' && element.name === 'Gift wrap background overlay'
        ));
        const border = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Gift certificate border');
        const divider = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Gift certificate column divider');
        const detailsPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Gift details panel');
        const headline = documentValue.elements.find((element) => isNamedTextElement(element, 'Voucher headline'));
        const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
        const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
        const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
        const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
        const qrCode = documentValue.elements.find((element) => element.type === 'qr');
        const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));
        const fieldLabels = [
            'Recipient label',
            'Sender label',
            'Message label',
            'Gift value label',
            'Gift validity label',
            'Certificate number label',
        ].map((name) => documentValue.elements.find((element) => isNamedTextElement(element, name)));

        assert.ok(
            giftWrapOverlay?.type === 'image'
            && border?.type === 'rect'
            && divider?.type === 'line'
            && detailsPanel?.type === 'rect'
            && headline?.type === 'text'
            && businessName?.type === 'text'
            && tagline?.type === 'text'
            && callToAction?.type === 'text'
            && qrPanel?.type === 'rect'
            && qrCode?.type === 'qr'
            && shortLink?.type === 'text'
            && fieldLabels.every((element) => element?.type === 'text'),
            `${themeId}/gift_certificate keeps the complete approved certificate hierarchy`,
        );
        assert.equal(giftWrapOverlay.src, getPrintableGiftCertificateOverlayPath(themeId), `${themeId}/gift_certificate uses its own governed gift-wrap master`);
        assert.equal(giftWrapOverlay.fit, 'cover', `${themeId}/gift_certificate preserves overlay aspect ratio`);
        assert.deepEqual(
            [giftWrapOverlay.x, giftWrapOverlay.y, giftWrapOverlay.width, giftWrapOverlay.height, giftWrapOverlay.locked],
            [0, 0, documentValue.canvas.width, documentValue.canvas.height, true],
            `${themeId}/gift_certificate locks gift artwork to the complete canvas`,
        );
        assert.ok(
            documentValue.elements.indexOf(giftWrapOverlay) < documentValue.elements.indexOf(border)
            && documentValue.elements.indexOf(giftWrapOverlay) < documentValue.elements.indexOf(detailsPanel)
            && documentValue.elements.indexOf(giftWrapOverlay) < documentValue.elements.indexOf(headline),
            `${themeId}/gift_certificate keeps gift artwork behind every functional layer`,
        );
        assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Voucher detail')).length, 0, `${themeId}/gift_certificate removes the ambiguous legacy field`);
        assert.equal(documentValue.elements.filter((element) => element.name === 'Gift ribbon ornament').length, 0, `${themeId}/gift_certificate contains no pasted corner ornament`);
        assert.ok(!documentValue.elements.some((element) => element.type === 'text' && /₹|\$|£|€|redeem/i.test(element.text)), `${themeId}/gift_certificate fabricates no commercial value or redemption claim`);
        assert.ok(callToAction.text.startsWith('VIEW '), `${themeId}/gift_certificate keeps one compact business-aware discovery action`);
        assert.equal(qrPanel.width - qrCode.width, 48, `${themeId}/gift_certificate keeps 24px horizontal QR padding`);
        assert.equal(qrPanel.height - qrCode.height, 48, `${themeId}/gift_certificate keeps 24px vertical QR padding`);
        assert.equal(qrCode.value, menuUrl, `${themeId}/gift_certificate retains the complete canonical QR destination`);
        assert.equal(shortLink.text, 'sample-business.menulist.online', `${themeId}/gift_certificate prints only the truthful hostname`);
        assert.ok(headline.x + headline.width <= divider.x, `${themeId}/gift_certificate keeps the title in the writable column`);
        assert.ok(detailsPanel.x >= divider.x && callToAction.x >= divider.x && qrPanel.x >= divider.x, `${themeId}/gift_certificate keeps utility content in the right column`);
        assert.ok(callToAction.y + callToAction.height <= qrPanel.y, `${themeId}/gift_certificate keeps action copy clear of the QR panel`);
        assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, `${themeId}/gift_certificate keeps the QR clear of its recovery hostname`);
        assert.ok(shortLink.y + shortLink.height <= border.y + border.height, `${themeId}/gift_certificate keeps recovery copy inside the certificate frame`);

        for (const layer of [callToAction, shortLink]) {
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                label: `${themeId}/gift_certificate ${layer.name}`,
                layer,
            });
        }
        for (const layer of [businessName, tagline, headline, ...fieldLabels]) {
            assert.ok(layer?.type === 'text', `${themeId}/gift_certificate ${layer?.name || 'text layer'} exists`);
            const bounds = await measureRenderedTextBounds({
                align: layer.align || 'left',
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
                fontSize: layer.fontSize,
                fontWeight: layer.fontWeight || '700',
                lineHeight: layer.lineHeight,
                text: layer.text,
                width: layer.width,
                x: layer.x,
                y: layer.y,
            });
            assert.ok(bounds.left >= layer.x, `${themeId}/gift_certificate ${layer.name} glyphs start inside their text box`);
            assert.ok(bounds.right <= layer.x + layer.width, `${themeId}/gift_certificate ${layer.name} glyphs end inside their text box`);
        }

        const overlayPath = path.resolve(process.cwd(), `public${getPrintableGiftCertificateOverlayPath(themeId)}`);
        const overlayMetadata = await sharp(overlayPath).metadata();
        assert.deepEqual(
            [overlayMetadata.width, overlayMetadata.height, overlayMetadata.hasAlpha],
            [PRINTABLE_GIFT_CERTIFICATE_OVERLAY_WIDTH, PRINTABLE_GIFT_CERTIFICATE_OVERLAY_HEIGHT, true],
            `${themeId}/gift_certificate overlay retains its transparent print-resolution master`,
        );
        const tokens = resolvePrintableTemplateBrandTokens(undefined, themeId);
        const expectedOverlay = await sharp(Buffer.from(buildPrintableGiftCertificateOverlaySvg({
            accent: tokens.accent,
            border: tokens.border,
            highlight: tokens.softAccent,
        }))).png({ compressionLevel: 9 }).toBuffer();
        const storedOverlay = await readFile(overlayPath);
        assert.deepEqual(storedOverlay, expectedOverlay, `${themeId}/gift_certificate overlay is current with its governed theme tokens`);
    }
    process.stdout.write(`Gift Certificate rulebook geometry passed for all ${PRINTABLE_THEME_FAMILY_IDS.length} governed themes.\n`);
}

async function assertAllThemePosterFeedbackAndFlyerRulebookGeometry() {
    const menuUrl = 'https://sample-business.menulist.online/menu';
    const feedbackUrl = 'https://sample-business.menulist.online/feedback';
    const campaign = {
        details: 'Available with selected bookings or purchases this month.',
        headline: 'A Special Thank You',
        offer: 'Enjoy a complimentary signature extra',
        terms: 'Selected offerings only. Advance booking may be required.',
        validUntil: 'Valid through 30 September 2026',
    };

    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const businessContext = businessContextForTheme(themeId);
        for (const assetTypeId of ['entrance_poster', 'feedback_qr', 'campaign_flyer'] as const) {
            const documentValue = buildPrintableAssetEditorDocument({
                assetTypeId,
                brandColor: '#315f55',
                ...businessContext,
                feedbackUrl,
                flyerCampaign: assetTypeId === 'campaign_flyer' ? campaign : undefined,
                menuUrl,
                outputFormat: 'png',
                projectId: `${themeId}-${assetTypeId}-final-rulebook`,
                shortLink: 'sample-business.menulist.online/menu',
                storeName: 'Sample Business Studio',
                tagline: 'Thoughtful work, beautifully delivered.',
                templateFamilyId: themeId,
            });
            const background = documentValue.elements.find((element) => (
                element.type === 'image' && element.name === `${themeId} responsive theme background`
            ));
            const artwork = documentValue.elements.filter((element) => element.type === 'image');
            const identity = documentValue.elements.find((element) => (
                isNamedTextElement(element, 'Business initials') || element.type === 'image' && element.name === 'Business logo'
            ));
            const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
            const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
            const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Call to action'));
            const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
            const qrCode = documentValue.elements.find((element) => element.type === 'qr');
            const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

            assert.ok(artwork.length > 0, `${themeId}/${assetTypeId} preserves its governed theme artwork`);
            assert.ok(
                artwork.every((element) => element.type === 'image' && (element.fit === 'cover' || element.fit === 'contain')),
                `${themeId}/${assetTypeId} artwork preserves aspect ratio without horizontal stretching`,
            );
            if (background?.type === 'image') {
                assert.equal(background.fit, 'cover', `${themeId}/${assetTypeId} uses cover fit for its responsive full background`);
                assert.deepEqual(
                    [background.x, background.y, background.width, background.height],
                    [0, 0, documentValue.canvas.width, documentValue.canvas.height],
                    `${themeId}/${assetTypeId} responsive artwork covers the complete canvas`,
                );
            }
            assert.ok(identity && businessName?.type === 'text' && tagline?.type === 'text', `${themeId}/${assetTypeId} keeps real identity and optional tagline hierarchy`);
            assert.ok(callToAction?.type === 'text' && qrPanel?.type === 'rect' && qrCode?.type === 'qr' && shortLink?.type === 'text', `${themeId}/${assetTypeId} keeps a complete scan and recovery hierarchy`);
            assert.equal(qrPanel.width - qrCode.width, 48, `${themeId}/${assetTypeId} keeps 24px horizontal QR padding`);
            assert.equal(qrPanel.height - qrCode.height, 48, `${themeId}/${assetTypeId} keeps 24px vertical QR padding`);
            assert.equal(qrCode.value, assetTypeId === 'feedback_qr' ? feedbackUrl : menuUrl, `${themeId}/${assetTypeId} keeps its complete canonical QR destination`);
            assert.equal(shortLink.text, 'sample-business.menulist.online', `${themeId}/${assetTypeId} prints a truthful path-free hostname`);
            assert.ok(qrPanel.y + qrPanel.height <= shortLink.y, `${themeId}/${assetTypeId} QR panel clears the hostname`);
            assert.ok(shortLink.y + shortLink.height < documentValue.canvas.height, `${themeId}/${assetTypeId} hostname stays inside the print canvas`);
            assert.ok((callToAction.text.match(/\n/g) || []).length <= 1, `${themeId}/${assetTypeId} CTA uses no more than two centered lines`);

            const centeredLayers = [identity, businessName, tagline, callToAction, shortLink].filter((layer): layer is Extract<CreativeEditorElement, { type: 'text' }> => layer?.type === 'text');
            for (const layer of centeredLayers) {
                await assertCenteredPrintableTextLayerGeometry({
                    canvasHeight: documentValue.canvas.height,
                    canvasWidth: documentValue.canvas.width,
                    label: `${themeId}/${assetTypeId} ${layer.name}`,
                    layer,
                });
            }

            assert.equal(
                documentValue.elements.filter((element) => (
                    isNamedTextElement(element, 'Poster headline')
                    || isNamedTextElement(element, 'Scan instruction')
                    || isNamedTextElement(element, 'Offer headline')
                    || isNamedTextElement(element, 'Primary offer')
                    || isNamedTextElement(element, 'Offer details')
                )).length,
                0,
                `${themeId}/${assetTypeId} contains no legacy redundant or synthetic copy layers`,
            );

            if (assetTypeId === 'feedback_qr') {
                assert.ok(
                    documentValue.elements.some((element) => element.type === 'rect' && element.name === 'Feedback conversation panel')
                    && documentValue.elements.some((element) => element.type === 'triangle' && element.name === 'Feedback conversation tail')
                    && documentValue.elements.some((element) => element.type === 'image' && element.name === 'Feedback review quote artwork'),
                    `${themeId}/feedback_qr keeps its distinct conversation invitation`,
                );
                assert.equal(
                    documentValue.elements.filter((element) => isNamedTextElement(element, 'Feedback sparkle')).length,
                    0,
                    `${themeId}/feedback_qr removes the generic sparkle motif`,
                );
                assert.equal(callToAction.text, 'TELL US HOW WE DID', `${themeId}/feedback_qr uses one non-redundant feedback CTA`);
            }

            if (assetTypeId === 'campaign_flyer') {
                for (const [layerName, expectedText] of [
                    ['Campaign headline', campaign.headline],
                    ['Campaign offer', campaign.offer],
                    ['Campaign details', campaign.details],
                    ['Campaign validity', campaign.validUntil],
                    ['Campaign terms', campaign.terms],
                ] as const) {
                    const layer = documentValue.elements.find((element) => isNamedTextElement(element, layerName));
                    assert.ok(layer?.type === 'text' && layer.text === expectedText, `${themeId}/campaign_flyer preserves owner-supplied ${layerName.toLowerCase()}`);
                    await assertCenteredPrintableTextLayerGeometry({
                        canvasHeight: documentValue.canvas.height,
                        canvasWidth: documentValue.canvas.width,
                        label: `${themeId}/campaign_flyer ${layerName}`,
                        layer,
                    });
                }
            }
        }

        const fallbackFlyer = buildPrintableAssetEditorDocument({
            assetTypeId: 'campaign_flyer',
            ...businessContext,
            menuUrl,
            outputFormat: 'png',
            shortLink: 'sample-business.menulist.online/menu',
            storeName: 'Sample Business Studio',
            tagline: 'Thoughtful work, beautifully delivered.',
            templateFamilyId: themeId,
        });
        assert.equal(
            fallbackFlyer.elements.filter((element) => element.type === 'text' && element.name.startsWith('Campaign ')).length,
            0,
            `${themeId}/campaign_flyer fallback invents no campaign content`,
        );
    }
}

async function assertAllThemePostcardRulebookGeometry() {
    const postcardContent = {
        headline: 'A note for our valued customers',
        message: 'Thank you for being part of our journey. We look forward to welcoming you again.',
    };
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const businessContext = businessContextForTheme(themeId);
        const labels = getOfferingLabels(businessContext.businessType, businessContext.businessCategory);
        const menuUrl = `https://aster-oak-studio.menulist.online/${labels.offeringLower}`;
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'postcard',
        ...businessContext,
        menuUrl,
        outputFormat: 'png',
        postcardContent,
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: themeId,
    });
    const themeArtwork = documentValue.elements.filter((element): element is Extract<CreativeEditorElement, { type: 'image' }> => (
        element.type === 'image' && !element.name.startsWith('Postcard appreciation flower ')
    ));
    const stationery = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Postcard stationery field');
    const identity = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const editorialRule = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Postcard editorial rule');
    const appreciationFlowers = documentValue.elements.filter((element): element is Extract<CreativeEditorElement, { type: 'image' }> => (
        element.type === 'image' && element.name.startsWith('Postcard appreciation flower ')
    ));
    const headline = documentValue.elements.find((element) => isNamedTextElement(element, 'Postcard headline'));
    const message = documentValue.elements.find((element) => isNamedTextElement(element, 'Postcard message'));
    const actionPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Postcard action panel');
    const callToAction = documentValue.elements.find((element) => isNamedTextElement(element, 'Postcard call to action'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        themeArtwork.length > 0
        && stationery?.type === 'rect'
        && identity?.type === 'text'
        && businessName?.type === 'text'
        && tagline?.type === 'text'
        && editorialRule?.type === 'rect'
        && appreciationFlowers.length === 3
        && headline?.type === 'text'
        && message?.type === 'text'
        && actionPanel?.type === 'rect'
        && callToAction?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        `${themeId} Postcard exposes its complete owner-message and scan hierarchy`,
    );
    for (const artwork of themeArtwork) {
        assert.ok(artwork.fit === 'cover' || artwork.fit === 'contain', `${themeId} Postcard theme artwork preserves aspect ratio`);
    }
    assert.deepEqual(
        appreciationFlowers.map((flower) => flower.name),
        ['Postcard appreciation flower left', 'Postcard appreciation flower center', 'Postcard appreciation flower right'],
        'Postcard keeps one deliberate left-center-right appreciation flower row',
    );
    for (const flower of appreciationFlowers) {
        assert.equal(flower.fit, 'contain', `${flower.name} preserves its aspect ratio`);
        assert.equal(flower.locked, true, `${flower.name} remains a locked part of the larger composition`);
        assert.ok((flower.opacity ?? 1) <= 0.42, `${flower.name} remains subordinate to owner content`);
        assert.ok(decodeURIComponent(flower.src).includes('https://koboyo.com/icons/flower'), `${flower.name} preserves its governed Koboyo source provenance`);
    }
    assert.equal(headline.text.replaceAll('\n', ' '), postcardContent.headline, 'Postcard preserves the exact owner-authored headline');
    assert.equal(message.text.replaceAll('\n', ' '), postcardContent.message, 'Postcard preserves the exact owner-authored message');
    assert.equal(callToAction.text, labels.scanToViewCompactUpper.replace(/^SCAN TO /, ''), `${themeId} Postcard uses the business-aware compact action without redundant scan wording`);
    assert.equal(qrCode.value, menuUrl, 'Postcard QR keeps the complete canonical destination');
    assert.equal(shortLink.text, 'aster-oak-studio.menulist.online', 'Postcard prints the truthful path-free business hostname');
    assert.equal(qrPanel.width - qrCode.width, 24, 'Postcard keeps 12px horizontal decorative QR padding');
    assert.equal(qrPanel.height - qrCode.height, 24, 'Postcard keeps 12px vertical decorative QR padding');
    assert.ok(documentValue.elements.indexOf(stationery) < documentValue.elements.indexOf(identity), 'Postcard stationery remains behind identity');
    assert.equal(stationery.stroke, 'transparent', 'Postcard stationery adds no redundant outer border over the theme background');
    assert.equal(stationery.strokeWidth, 0, 'Postcard stationery outer border remains disabled');
    assert.equal(businessName.align, 'center', 'Postcard business name owns a centered second identity row');
    assert.equal(tagline.align, 'center', 'Postcard tagline owns a centered third identity row');
    assert.ok(identity.y + identity.height < businessName.y, 'Postcard logo or initials row clears the business-name row');
    assert.ok(businessName.y + businessName.height < tagline.y, 'Postcard business-name row clears the tagline row');
    assert.ok(Math.abs((identity.x + identity.width / 2) - (businessName.x + businessName.width / 2)) <= 2, 'Postcard logo or initials and business name share one horizontal center');
    assert.ok(Math.abs((businessName.x + businessName.width / 2) - (tagline.x + tagline.width / 2)) <= 2, 'Postcard business name and tagline share one horizontal center');
    assert.ok(Math.abs((tagline.x + tagline.width / 2) - (editorialRule.x + editorialRule.width / 2)) <= 2, 'Postcard editorial rule shares the identity stack horizontal center');
    assert.ok(tagline.y + tagline.height < editorialRule.y, 'Postcard stacked identity clears the editorial rule');
    assert.ok(documentValue.elements.indexOf(actionPanel) < documentValue.elements.indexOf(callToAction), 'Postcard action panel remains behind its action');
    assert.ok(qrPanel.x >= actionPanel.x && qrPanel.x + qrPanel.width <= actionPanel.x + actionPanel.width, 'Postcard QR panel stays inside its protected action field');
    assert.ok(qrPanel.y >= actionPanel.y && qrPanel.y + qrPanel.height <= actionPanel.y + actionPanel.height, 'Postcard QR panel stays inside its protected action field vertically');
    assert.ok(editorialRule.y + editorialRule.height < headline.y, 'Postcard gives the owner headline deliberate breathing space after the editorial rule');
    assert.ok(headline.x + headline.width < actionPanel.x, 'Postcard owner headline clears the scan action field');
    assert.ok(message.x + message.width < actionPanel.x, 'Postcard owner message clears the scan action field');
    const flowerRowBaseline = appreciationFlowers[0].y + appreciationFlowers[0].height;
    for (const flower of appreciationFlowers) {
        assert.ok(flower.x >= stationery.x && flower.x + flower.width <= stationery.x + stationery.width, `${flower.name} stays inside the stationery field horizontally`);
        assert.ok(flower.y > message.y + message.height, `${flower.name} stays below the owner message`);
        assert.ok(flower.y + flower.height <= stationery.y + stationery.height, `${flower.name} stays inside the stationery field vertically`);
        assert.ok(flower.x + flower.width < actionPanel.x, `${flower.name} clears the scan action field`);
        assert.ok(Math.abs((flower.y + flower.height) - flowerRowBaseline) <= 2, `${flower.name} shares the horizontal flower-row baseline`);
        assert.ok(documentValue.elements.indexOf(flower) < documentValue.elements.indexOf(headline), `${flower.name} remains behind owner copy`);
    }
    assert.equal(
        documentValue.elements.some((element) => element.type === 'text' && ['THANK YOU', 'A thank-you, update, or special offer.', 'SCAN FOR LATEST'].includes(element.text)),
        false,
        'Postcard contains no legacy synthetic campaign copy',
    );

    for (const layer of [businessName, tagline, headline, message]) {
        const bounds = await measureRenderedTextBounds({
            align: layer.align || 'left',
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight || '700',
            lineHeight: layer.lineHeight,
            text: layer.text,
            width: layer.width,
            x: layer.x,
            y: layer.y,
        });
        assert.ok(bounds.left >= layer.x - 4, `${themeId} Postcard ${layer.name} starts inside its text box`);
        assert.ok(bounds.right <= layer.x + layer.width + 4, `${themeId} Postcard ${layer.name} ends inside its text box`);
    }
    for (const layer of [callToAction, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `${themeId} Postcard ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'postcard',
        ...businessContext,
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        postcardContent,
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: themeId,
    });
    assert.equal(logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length, 1, 'Postcard uses a real client logo when supplied');
    assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length, 0, 'Postcard removes initials when a real logo exists');
    const logo = logoDocument.elements.find((element) => element.type === 'image' && element.name === 'Business logo');
    const logoBusinessName = logoDocument.elements.find((element) => isNamedTextElement(element, 'Business name'));
    assert.ok(logo?.type === 'image' && logoBusinessName?.type === 'text', 'Postcard real-logo variant preserves the stacked identity rows');
    assert.ok(logo.y + logo.height < logoBusinessName.y, 'Postcard real logo clears the business-name row');
    assert.ok(Math.abs((logo.x + logo.width / 2) - (logoBusinessName.x + logoBusinessName.width / 2)) <= 2, 'Postcard real logo and business name share one horizontal center');

    const fallbackDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'postcard',
        ...businessContext,
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: themeId,
    });
    assert.equal(fallbackDocument.elements.filter((element) => isNamedTextElement(element, 'Postcard headline')).length, 0, 'Postcard fallback invents no headline');
    assert.equal(fallbackDocument.elements.filter((element) => isNamedTextElement(element, 'Postcard message')).length, 0, 'Postcard fallback invents no message');
    assert.ok(fallbackDocument.elements.some((element) => isNamedTextElement(element, 'Business name')), 'Postcard fallback preserves truthful business identity');
    assert.ok(fallbackDocument.elements.some((element) => element.type === 'qr'), 'Postcard fallback preserves the canonical business link');
    assert.equal(fallbackDocument.elements.filter((element) => element.type === 'image' && element.name.startsWith('Postcard appreciation flower ')).length, 3, 'Postcard fallback preserves the restrained appreciation flower row');
    assert.equal(
        documentValue.elements.some((element) => element.type === 'image' && decodeURIComponent(element.src).includes('/icons/grateful')),
        false,
        `${themeId} Postcard renders no human or face illustration`,
    );
    }
}

async function assertProductTagRulebookGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const productTagContent = {
        detail: '50 ml · Small-batch botanical blend',
        name: 'Signature Botanical Oil',
        options: [
            { name: 'Travel size', priceLabel: '₹690' },
            { name: 'Full size', priceLabel: '₹1,290' },
            { name: 'Gift wrap' },
            { name: 'Refill pouch', priceLabel: '₹990' },
        ],
        price: '₹1,290',
    };
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
    const businessContext = businessContextForTheme(themeId);
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'product_tag',
        ...businessContext,
        menuUrl,
        outputFormat: 'png',
        productTagContent,
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: themeId,
    });
    const stationery = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Product tag stationery field');
    const actionPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Product tag action panel');
    const divider = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Product tag editorial divider');
    const identity = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const productName = documentValue.elements.find((element) => isNamedTextElement(element, 'Product name'));
    const productDetail = documentValue.elements.find((element) => isNamedTextElement(element, 'Product detail'));
    const productOptions = documentValue.elements.find((element) => isNamedTextElement(element, 'Product options'));
    const productPrice = documentValue.elements.find((element) => isNamedTextElement(element, 'Product price'));
    const action = documentValue.elements.find((element) => isNamedTextElement(element, 'Product tag call to action'));
    const qrPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'QR panel');
    const qrCode = documentValue.elements.find((element) => element.type === 'qr');
    const shortLink = documentValue.elements.find((element) => isNamedTextElement(element, 'Short link'));

    assert.ok(
        stationery?.type === 'rect'
        && actionPanel?.type === 'rect'
        && divider?.type === 'rect'
        && identity?.type === 'text'
        && businessName?.type === 'text'
        && tagline?.type === 'text'
        && productName?.type === 'text'
        && productDetail?.type === 'text'
        && productOptions?.type === 'text'
        && productPrice?.type === 'text'
        && action?.type === 'text'
        && qrPanel?.type === 'rect'
        && qrCode?.type === 'qr'
        && shortLink?.type === 'text',
        `${themeId} Product Tag exposes its complete truthful product-and-scan hierarchy`,
    );
    assert.equal(productName.text.replaceAll('\n', ' '), productTagContent.name, 'Product Tag preserves the exact owner-authored product name');
    assert.equal(productDetail.text.replaceAll('\n', ' '), productTagContent.detail, 'Product Tag preserves the exact owner-authored product detail');
    assert.equal(
        productOptions.text.replaceAll('\n', ' '),
        'Options: Travel size ₹690 · Full size ₹1,290 · Gift wrap · 1 more',
        'Product Tag summarizes valid active options without inventing add-on semantics',
    );
    assert.equal(productPrice.text.replaceAll('\n', ' '), productTagContent.price, 'Product Tag preserves the exact owner-authored price');
    assert.equal(action.text, 'VIEW DETAILS', 'Product Tag truthfully describes its exact-item destination across business categories');
    assert.equal(qrCode.value, menuUrl, 'Product Tag QR retains the complete canonical destination');
    assert.equal(shortLink.text.replaceAll('\n', ''), 'aster-oak-studio.menulist.online', 'Product Tag prints only the truthful path-free hostname');
    assert.equal(qrPanel.width - qrCode.width, 24, 'Product Tag keeps compact 12px horizontal QR padding');
    assert.equal(qrPanel.height - qrCode.height, 24, 'Product Tag keeps compact 12px vertical QR padding');
    assert.equal(stationery.strokeWidth, 0, 'Product Tag avoids a redundant outer border over the parent-theme background');
    assert.ok(documentValue.elements.indexOf(stationery) < documentValue.elements.indexOf(productName), 'Product Tag stationery stays behind owner content');
    assert.ok(documentValue.elements.indexOf(actionPanel) < documentValue.elements.indexOf(action), 'Product Tag action panel stays behind its copy');
    assert.ok(productName.x + productName.width < divider.x, 'Product Tag product name clears the editorial divider');
    assert.ok(productDetail.x + productDetail.width < divider.x, 'Product Tag product detail clears the editorial divider');
    assert.ok(productOptions.x + productOptions.width < divider.x, 'Product Tag options clear the editorial divider');
    assert.ok(productPrice.x + productPrice.width < divider.x, 'Product Tag price clears the editorial divider');
    assert.ok(qrPanel.x >= actionPanel.x && qrPanel.x + qrPanel.width <= actionPanel.x + actionPanel.width, 'Product Tag QR stays inside its protected action panel');
    assert.ok(qrPanel.y >= actionPanel.y && qrPanel.y + qrPanel.height <= actionPanel.y + actionPanel.height, 'Product Tag QR stays inside its protected action panel vertically');
    assert.ok(action.y + action.height < qrPanel.y, 'Product Tag action clears the QR panel');
    assert.ok(qrPanel.y + qrPanel.height < shortLink.y, 'Product Tag QR panel clears the hostname');
    assert.equal(
        documentValue.elements.some((element) => element.type === 'text' && /customer favorite|^new$/i.test(element.text.trim())),
        false,
        `${themeId} Product Tag contains no invented legacy promotion copy`,
    );
    for (const layer of [businessName, tagline, productName, productDetail, productOptions, productPrice]) {
        const bounds = await measureRenderedTextBounds({
            align: layer.align || 'left',
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: layer.fontSize,
            fontWeight: layer.fontWeight || '700',
            lineHeight: layer.lineHeight,
            text: layer.text,
            width: layer.width,
            x: layer.x,
            y: layer.y,
        });
        assert.ok(bounds.left >= layer.x - 4, `Product Tag ${layer.name} starts inside its declared text box`);
        assert.ok(bounds.right <= layer.x + layer.width + 4, `Product Tag ${layer.name} ends inside its declared text box`);
    }
    for (const layer of [action, shortLink]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `${themeId} Product Tag ${layer.name}`,
            layer,
        });
    }
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'product_tag',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        productTagContent,
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length, 1, 'Product Tag uses the real client logo when supplied');
    assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length, 0, 'Product Tag does not place initials over a real client logo');

    const fallbackDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'product_tag',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(fallbackDocument.elements.filter((element) => isNamedTextElement(element, 'Product name')).length, 0, 'Product Tag fallback invents no product name');
    assert.equal(fallbackDocument.elements.filter((element) => isNamedTextElement(element, 'Product detail')).length, 0, 'Product Tag fallback invents no product detail');
    assert.equal(fallbackDocument.elements.filter((element) => isNamedTextElement(element, 'Product price')).length, 0, 'Product Tag fallback invents no price');
    assert.equal(fallbackDocument.elements.filter((element) => element.type === 'qr').length, 1, 'Product Tag fallback preserves one useful canonical QR');

    process.stdout.write(`Product Tag rulebook geometry passed for all ${PRINTABLE_THEME_FAMILY_IDS.length} governed themes.\n`);
}


async function assertTerracottaEventInvitationPilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'event_invitation',
        businessCategory: 'service',
        businessType: 'Salon',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
        templateFamilyId: 'terracotta-glow',
    });
    const background = documentValue.elements.find((element) => element.type === 'image' && element.name === 'terracotta-glow responsive theme background');
    const stationery = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Invitation stationery field');
    const botanicalOrnament = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Invitation botanical ornament');
    const topGarlandOrnament = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Invitation top garland ornament');
    const closingCelebrationMark = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Invitation closing celebration mark');
    const brandMarkField = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business card brand mark field');
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
    const purpose = documentValue.elements.find((element) => isNamedTextElement(element, 'Invitation purpose'));
    const occasionLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Invitation occasion label'));
    const occasionLine = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Invitation occasion write-in line');
    const writeInPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Invitation write-in panel');

    const fieldNames = ['Invitation date', 'Invitation time', 'Invitation location'] as const;
    const fieldPairs = fieldNames.map((name) => ({
        label: documentValue.elements.find((element) => isNamedTextElement(element, `${name} label`)),
        line: documentValue.elements.find((element) => element.type === 'line' && element.name === `${name} write-in line`),
        name,
    }));

    assert.ok(
        background?.type === 'image'
        && stationery?.type === 'rect'
        && botanicalOrnament?.type === 'image'
        && topGarlandOrnament?.type === 'image'
        && closingCelebrationMark?.type === 'image'
        && brandMarkField?.type === 'ellipse'
        && businessName?.type === 'text'
        && tagline?.type === 'text'
        && purpose?.type === 'text'
        && occasionLabel?.type === 'text'
        && occasionLine?.type === 'line'
        && writeInPanel?.type === 'rect'
        && fieldPairs.every(({ label, line }) => label?.type === 'text' && line?.type === 'line'),
        'Terracotta Glow Invitation exposes its complete print-and-write hierarchy',
    );
    assert.equal(purpose.text, "You're invited", 'Invitation keeps one relevant asset-purpose statement');
    assert.equal(purpose.fontFamily, 'Bodoni MT, Didot, Georgia, serif', 'Invitation purpose uses a premium readable display stack');
    assert.equal(purpose.fontStyle, 'italic', 'Invitation purpose uses a restrained invitation-style italic');
    assert.ok((purpose.charSpacing || 0) <= 40, 'Invitation purpose avoids mechanical all-caps tracking');
    assert.equal(botanicalOrnament.fit, 'cover', 'Invitation botanical ornament preserves its full-canvas vector proportions');
    assert.equal(botanicalOrnament.x, 0, 'Invitation botanical ornament starts at the canvas left edge');
    assert.equal(botanicalOrnament.y, 0, 'Invitation botanical ornament starts at the canvas top edge');
    assert.equal(botanicalOrnament.width, documentValue.canvas.width, 'Invitation botanical ornament spans the complete canvas width');
    assert.equal(botanicalOrnament.height, documentValue.canvas.height, 'Invitation botanical ornament spans the complete canvas height');
    const botanicalMarkup = decodeURIComponent(botanicalOrnament.src);
    const topGarlandMarkup = decodeURIComponent(topGarlandOrnament.src);
    assert.ok(botanicalMarkup.includes('data-copy-safe-center="true"'), 'Invitation botanical ornament declares its protected central writing field');
    assert.ok(botanicalMarkup.includes('data-icon-library="koboyo"'), 'Invitation botanical ornament declares its governed artwork library');
    assert.ok(botanicalMarkup.includes('https://koboyo.com/icons/flower'), 'Invitation botanical ornament preserves its flower source provenance');
    assert.ok(!botanicalMarkup.includes('lower-blooms'), 'Invitation removes the rejected lower floral treatment');
    assert.equal(topGarlandOrnament.locked, true, 'Invitation top garland remains locked inside the finished composition');
    assert.equal(topGarlandOrnament.fit, 'contain', 'Invitation top garland preserves its source proportions');
    assert.ok(topGarlandMarkup.includes('https://koboyo.com/icons/may-garland'), 'Invitation top garland preserves its source provenance');
    assert.ok(topGarlandOrnament.y + topGarlandOrnament.height < brandMarkField.y, 'Invitation keeps the business identity separate from the top garland');
    assert.ok(brandMarkField.y + brandMarkField.height < businessName.y, 'Invitation gives the separate logo or initials row clear space before the business name');
    assert.equal(closingCelebrationMark.locked, true, 'Invitation closing celebration mark remains locked inside the finished composition');
    assert.equal(closingCelebrationMark.fit, 'contain', 'Invitation closing celebration mark preserves its source proportions');
    assert.ok(decodeURIComponent(closingCelebrationMark.src).includes('https://koboyo.com/icons/celebration-burst'), 'Invitation closing celebration mark preserves its source provenance');
    assert.equal(occasionLabel.text, 'OCCASION', 'Invitation provides a blank occasion field instead of a sample event');
    assert.deepEqual(
        fieldPairs.map(({ label }) => label?.type === 'text' ? label.text : ''),
        ['DATE', 'TIME', 'LOCATION'],
        'Invitation provides only relevant physical write-in labels',
    );
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Invitation venue label')).length, 0, 'Invitation does not split location into a venue field');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Invitation address label')).length, 0, 'Invitation does not split location into a separate address field');
    assert.equal(documentValue.elements.filter((element) => element.type === 'qr').length, 0, 'Invitation emits no irrelevant QR');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Invitation call to action')).length, 0, 'Invitation emits no event-details action');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Invitation response note')).length, 0, 'Invitation emits no reply-by claim');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Invitation details host')).length, 0, 'Invitation emits no unrelated destination hostname');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Event name')).length, 0, 'Invitation emits no sample event name');
    assert.equal(
        documentValue.elements.some((element) => (
            element.type === 'text'
            && /autumn open house|please reply|view event details|private event|new launch|special evening/i.test(element.text)
        )),
        false,
        'Invitation contains no fixture copy, reply request, destination action, or invented occasion',
    );
    assert.ok(documentValue.elements.indexOf(background) < documentValue.elements.indexOf(stationery), 'Invitation keeps artwork behind its stationery field');
    assert.ok(
        documentValue.elements.indexOf(stationery) < documentValue.elements.indexOf(botanicalOrnament)
        && documentValue.elements.indexOf(botanicalOrnament) < documentValue.elements.indexOf(topGarlandOrnament)
        && documentValue.elements.indexOf(botanicalOrnament) < documentValue.elements.indexOf(closingCelebrationMark)
        && documentValue.elements.indexOf(closingCelebrationMark) < documentValue.elements.indexOf(writeInPanel)
        && documentValue.elements.indexOf(botanicalOrnament) < documentValue.elements.indexOf(writeInPanel),
        'Invitation keeps botanical artwork above the stationery surface and below identity and functional writing fields',
    );
    assert.ok(topGarlandOrnament.y >= stationery.y && topGarlandOrnament.y + topGarlandOrnament.height <= stationery.y + stationery.height, 'Invitation top garland remains inside the stationery field');
    assert.ok(occasionLine.y > occasionLabel.y + occasionLabel.height, 'Invitation occasion line clears its label');
    assert.ok(writeInPanel.y > occasionLine.y, 'Invitation detail panel clears the occasion field');
    assert.equal(documentValue.elements.filter((element) => element.name === 'Invitation location continuation line').length, 0, 'Invitation keeps one generous location line without a redundant continuation');
    assert.equal(documentValue.elements.filter((element) => element.name === 'Invitation closing divider').length, 0, 'Invitation removes the rejected bottom closing ornament');
    assert.ok(closingCelebrationMark.y > writeInPanel.y + writeInPanel.height, 'Invitation celebration mark clears the complete write-in panel');
    assert.ok(closingCelebrationMark.y + closingCelebrationMark.height <= stationery.y + stationery.height, 'Invitation celebration mark remains inside the stationery field');

    for (const { label, line, name } of fieldPairs) {
        assert.ok(label?.type === 'text' && line?.type === 'line', `${name} exposes a label and write-in line`);
        assert.ok(line.y > label.y + label.height, `${name} write-in line clears its label`);
        assert.ok(line.x >= writeInPanel.x && line.x + line.width <= writeInPanel.x + writeInPanel.width, `${name} write-in line remains inside the protected panel`);
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Invitation ${name} label`,
            layer: label,
        });
    }
    for (const element of documentValue.elements) {
        assert.ok(element.x >= 0, `Invitation ${element.name} starts inside the canvas`);
        assert.ok(element.y >= 0, `Invitation ${element.name} starts below the canvas top`);
        assert.ok(element.x + element.width <= documentValue.canvas.width, `Invitation ${element.name} ends inside the canvas`);
        assert.ok(element.y + element.height <= documentValue.canvas.height, `Invitation ${element.name} ends above the canvas bottom`);
    }
    for (const layer of [businessName, tagline, purpose, occasionLabel]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Invitation ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'event_invitation',
        businessCategory: 'service',
        businessType: 'Salon',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length, 1, 'Terracotta Glow Invitation uses the real client logo when supplied');
    assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length, 0, 'Terracotta Glow Invitation removes initials when a real logo is supplied');
    assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business tagline')).length, 0, 'Invitation omits the tagline row when no valid tagline exists');

}

async function assertAllThemeEventInvitationRulebookGeometry() {
    let reviewedThemeCount = 0;
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const businessContext = businessContextForTheme(themeId);
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'event_invitation',
            ...businessContext,
            menuUrl: 'https://aster-oak-studio.menulist.online/services',
            outputFormat: 'png',
            shortLink: 'aster-oak-studio.menulist.online/services',
            storeName: 'Aster & Oak Studio',
            tagline: 'Thoughtful care, beautifully delivered.',
            templateFamilyId: themeId,
        });
        const stationery = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Invitation stationery field');
        const botanicalOrnament = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Invitation botanical ornament');
        const topGarlandOrnament = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Invitation top garland ornament');
        const closingCelebrationMark = documentValue.elements.find((element) => element.type === 'image' && element.name === 'Invitation closing celebration mark');
        const brandMarkField = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business card brand mark field');
        const businessInitials = documentValue.elements.find((element) => isNamedTextElement(element, 'Business initials'));
        const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
        const tagline = documentValue.elements.find((element) => isNamedTextElement(element, 'Business tagline'));
        const purpose = documentValue.elements.find((element) => isNamedTextElement(element, 'Invitation purpose'));
        const occasionLabel = documentValue.elements.find((element) => isNamedTextElement(element, 'Invitation occasion label'));
        const occasionLine = documentValue.elements.find((element) => element.type === 'line' && element.name === 'Invitation occasion write-in line');
        const writeInPanel = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Invitation write-in panel');
        const fieldNames = ['Invitation date', 'Invitation time', 'Invitation location'] as const;
        const fieldPairs = fieldNames.map((name) => ({
            label: documentValue.elements.find((element) => isNamedTextElement(element, `${name} label`)),
            line: documentValue.elements.find((element) => element.type === 'line' && element.name === `${name} write-in line`),
            name,
        }));

        assert.ok(
            stationery?.type === 'rect'
            && botanicalOrnament?.type === 'image'
            && topGarlandOrnament?.type === 'image'
            && closingCelebrationMark?.type === 'image'
            && brandMarkField?.type === 'ellipse'
            && businessInitials?.type === 'text'
            && businessName?.type === 'text'
            && tagline?.type === 'text'
            && purpose?.type === 'text'
            && occasionLabel?.type === 'text'
            && occasionLine?.type === 'line'
            && writeInPanel?.type === 'rect'
            && fieldPairs.every(({ label, line }) => label?.type === 'text' && line?.type === 'line'),
            `${themeId}/event_invitation keeps the complete approved premium hierarchy`,
        );
        assert.equal(purpose.text, "You're invited", `${themeId}/event_invitation keeps the approved invitation purpose`);
        assert.equal(purpose.fontStyle, 'italic', `${themeId}/event_invitation keeps ceremonial readable typography`);
        assert.ok(decodeURIComponent(topGarlandOrnament.src).includes('https://koboyo.com/icons/may-garland'), `${themeId}/event_invitation keeps the governed top garland`);
        assert.ok(decodeURIComponent(botanicalOrnament.src).includes('https://koboyo.com/icons/flower'), `${themeId}/event_invitation keeps the governed upper flower artwork`);
        assert.ok(decodeURIComponent(closingCelebrationMark.src).includes('https://koboyo.com/icons/celebration-burst'), `${themeId}/event_invitation keeps the governed closing celebration mark`);
        assert.ok(topGarlandOrnament.y + topGarlandOrnament.height < brandMarkField.y, `${themeId}/event_invitation keeps the logo or initials separate from the garland`);
        assert.ok(brandMarkField.y + brandMarkField.height < businessName.y, `${themeId}/event_invitation clears the business name below its identity mark`);
        assert.ok(writeInPanel.y > occasionLine.y, `${themeId}/event_invitation clears the occasion field before the detail panel`);
        assert.ok(closingCelebrationMark.y > writeInPanel.y + writeInPanel.height, `${themeId}/event_invitation clears the closing mark below the detail panel`);
        assert.ok(closingCelebrationMark.y + closingCelebrationMark.height <= stationery.y + stationery.height, `${themeId}/event_invitation keeps the closing mark inside the stationery field`);
        assert.ok(
            documentValue.elements.indexOf(stationery) < documentValue.elements.indexOf(botanicalOrnament)
            && documentValue.elements.indexOf(botanicalOrnament) < documentValue.elements.indexOf(topGarlandOrnament)
            && documentValue.elements.indexOf(closingCelebrationMark) < documentValue.elements.indexOf(writeInPanel),
            `${themeId}/event_invitation keeps decorative artwork below functional content`,
        );
        assert.equal(documentValue.elements.filter((element) => element.type === 'qr').length, 0, `${themeId}/event_invitation emits no irrelevant QR`);
        assert.equal(documentValue.elements.filter((element) => element.name === 'Invitation venue label').length, 0, `${themeId}/event_invitation emits no redundant venue field`);
        assert.equal(documentValue.elements.filter((element) => element.name === 'Invitation address label').length, 0, `${themeId}/event_invitation emits no redundant address field`);
        assert.equal(documentValue.elements.filter((element) => element.name === 'Invitation location continuation line').length, 0, `${themeId}/event_invitation emits one location line`);
        assert.equal(
            documentValue.elements.some((element) => (
                element.type === 'text'
                && /autumn open house|please reply|view event details|private event|new launch|special evening/i.test(element.text)
            )),
            false,
            `${themeId}/event_invitation invents no event facts or actions`,
        );
        for (const { label, line, name } of fieldPairs) {
            assert.ok(label?.type === 'text' && line?.type === 'line', `${themeId}/${name} exposes one label and line`);
            assert.ok(line.y > label.y + label.height, `${themeId}/${name} line clears its label`);
            assert.ok(line.x >= writeInPanel.x && line.x + line.width <= writeInPanel.x + writeInPanel.width, `${themeId}/${name} remains inside the protected panel`);
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                label: `${themeId} Invitation ${name} label`,
                layer: label,
            });
        }
        for (const layer of [businessInitials, businessName, tagline, purpose, occasionLabel]) {
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                label: `${themeId} Invitation ${layer.name}`,
                layer,
            });
        }
        const invitationLayers = documentValue.elements.slice(documentValue.elements.indexOf(stationery));
        for (const element of invitationLayers) {
            assert.ok(element.x >= 0 && element.y >= 0, `${themeId}/event_invitation ${element.name} starts inside the canvas`);
            assert.ok(element.x + element.width <= documentValue.canvas.width, `${themeId}/event_invitation ${element.name} ends inside the canvas width`);
            assert.ok(element.y + element.height <= documentValue.canvas.height, `${themeId}/event_invitation ${element.name} ends inside the canvas height`);
        }
        reviewedThemeCount += 1;
    }
    assert.equal(reviewedThemeCount, PRINTABLE_THEME_FAMILY_IDS.length, 'Event Invitation rulebook geometry covers every governed theme');
    process.stdout.write(`Event Invitation rulebook geometry passed for all ${reviewedThemeCount} governed themes.\n`);
}

async function assertTerracottaStaffNameBadgePilotGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    const documentValue = buildPrintableAssetEditorDocument({
        assetTypeId: 'staff_id_card',
        businessCategory: 'service',
        businessType: 'Salon',
        contactAddress: '18 Lavelle Road, Bengaluru',
        contactEmail: 'hello@asteroak.studio',
        contactName: 'Store Contact Person',
        contactPhone: '+91 98450 21840',
        contactRole: 'Unrelated Store Contact Role',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        socialHandle: '@asteroakstudio',
        staffName: 'Mira Shah',
        staffRole: 'Staff',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    const headerField = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Staff badge header field');
    const lanyardSlot = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Lanyard slot guide');
    const brandMark = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business card brand mark field');
    const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
    const monogramHalo = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Staff monogram halo');
    const monogramField = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Staff monogram field');
    const staffInitials = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff initials'));
    const staffName = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff name'));
    const staffRole = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff role'));
    const purpose = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff badge purpose'));
    const purposeDividers = documentValue.elements.filter((element) => element.type === 'line' && element.name === 'Staff badge purpose divider');

    assert.ok(
        headerField?.type === 'rect'
        && lanyardSlot?.type === 'rect'
        && brandMark?.type === 'ellipse'
        && businessName?.type === 'text'
        && monogramHalo?.type === 'ellipse'
        && monogramField?.type === 'ellipse'
        && staffInitials?.type === 'text'
        && staffName?.type === 'text'
        && staffRole?.type === 'text'
        && purpose?.type === 'text'
        && purposeDividers.length === 2,
        'Terracotta Glow Staff Name Badge exposes its complete premium identity hierarchy',
    );
    assert.equal(staffInitials.text, 'MS', 'Staff Name Badge derives its central monogram from the real staff name');
    assert.equal(staffName.text, 'Mira Shah', 'Staff Name Badge uses the explicitly supplied staff name');
    assert.equal(staffRole.text, 'STAFF', 'Staff Name Badge uses only the selected staff record role');
    assert.equal(documentValue.elements.some((element) => element.type === 'text' && element.text.includes('Store Contact')), false, 'Staff Name Badge ignores unrelated store contact-person fields');
    assert.equal(purpose.text, 'STAFF BADGE', 'Staff Name Badge states its non-credential purpose once');
    assert.equal(documentValue.elements.filter((element) => /photo/i.test(element.name)).length, 0, 'Staff Name Badge contains no unavailable photo affordance');
    assert.equal(documentValue.elements.filter((element) => element.type === 'qr').length, 0, 'Staff Name Badge adds no unexplained QR');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Phone number')).length, 0, 'Staff Name Badge does not expose the supplied phone number');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Address')).length, 0, 'Staff Name Badge does not expose the supplied business address');
    assert.equal(documentValue.elements.filter((element) => isNamedTextElement(element, 'Short link')).length, 0, 'Staff Name Badge removes the unrelated menu or services URL');
    assert.equal(documentValue.elements.filter((element) => /employee|certificate|number/i.test(element.name)).length, 0, 'Staff Name Badge invents no employee or certificate number field');
    assert.ok(
        documentValue.elements.indexOf(headerField) < documentValue.elements.indexOf(brandMark)
        && documentValue.elements.indexOf(monogramHalo) < documentValue.elements.indexOf(monogramField)
        && documentValue.elements.indexOf(monogramField) < documentValue.elements.indexOf(staffInitials),
        'Staff Name Badge keeps business identity and staff monogram in a deliberate background-to-copy layer order',
    );
    assert.ok(lanyardSlot.y >= documentValue.canvas.height * 0.025, 'Staff Name Badge lanyard guide clears the top trim edge');
    assert.ok(monogramHalo.y >= headerField.y + headerField.height, 'Staff Name Badge monogram clears the branded header');

    for (const element of documentValue.elements) {
        assert.ok(element.x >= 0, `Staff Name Badge ${element.name} starts inside the canvas`);
        assert.ok(element.y >= 0, `Staff Name Badge ${element.name} starts below the canvas top`);
        assert.ok(element.x + element.width <= documentValue.canvas.width, `Staff Name Badge ${element.name} ends inside the canvas`);
        assert.ok(element.y + element.height <= documentValue.canvas.height, `Staff Name Badge ${element.name} ends above the canvas bottom`);
    }
    const businessNameBounds = await measureRenderedTextBounds({
        align: businessName.align || 'left',
        canvasHeight: documentValue.canvas.height,
        canvasWidth: documentValue.canvas.width,
        fontFamily: businessName.fontFamily || 'Inter, Arial, sans-serif',
        fontSize: businessName.fontSize,
        fontWeight: businessName.fontWeight || '800',
        lineHeight: businessName.lineHeight,
        text: businessName.text,
        width: businessName.width,
        x: businessName.x,
        y: businessName.y,
    });
    assert.ok(businessNameBounds.left >= businessName.x - 4, 'Terracotta Glow Staff Name Badge business name starts inside the serif overhang tolerance');
    assert.ok(businessNameBounds.right <= businessName.x + businessName.width + 4, 'Terracotta Glow Staff Name Badge business name ends inside the serif overhang tolerance');
    for (const layer of [staffInitials, staffName, staffRole, purpose]) {
        await assertCenteredPrintableTextLayerGeometry({
            canvasHeight: documentValue.canvas.height,
            canvasWidth: documentValue.canvas.width,
            label: `Terracotta Glow Staff Name Badge ${layer.name}`,
            layer,
        });
    }

    const logoDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'staff_id_card',
        businessCategory: 'service',
        businessType: 'Salon',
        contactName: 'Store Contact Person',
        contactRole: 'Unrelated Store Contact Role',
        logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        staffName: 'Mira Shah',
        staffRole: 'Staff',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length, 1, 'Terracotta Glow Staff Name Badge uses the real client logo when supplied');
    assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length, 0, 'Terracotta Glow Staff Name Badge does not place business initials over a real client logo');
    assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Staff initials')).length, 1, 'Terracotta Glow Staff Name Badge preserves the real staff monogram when a business logo is supplied');

    const minimalDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'staff_id_card',
        businessCategory: 'service',
        businessType: 'Salon',
        contactName: 'Valid store contact',
        contactRole: 'Owner',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        staffName: 'Staff name',
        staffRole: 'Role',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'terracotta-glow',
    });
    assert.equal(minimalDocument.elements.filter((element) => isNamedTextElement(element, 'Staff name')).length, 0, 'Staff Name Badge rejects a placeholder-like staff name');
    assert.equal(minimalDocument.elements.filter((element) => isNamedTextElement(element, 'Staff role')).length, 0, 'Staff Name Badge rejects a placeholder-like role and never renders a role without a real staff name');
    assert.equal(minimalDocument.elements.filter((element) => /Staff monogram|Staff initials/.test(element.name)).length, 0, 'Staff Name Badge minimal state invents no staff monogram without a real staff name');
    assert.equal(minimalDocument.elements.filter((element) => /photo/i.test(element.name)).length, 0, 'Staff Name Badge minimal state exposes no unavailable photo affordance');

    const adjacentThemeDocument = buildPrintableAssetEditorDocument({
        assetTypeId: 'staff_id_card',
        businessCategory: 'service',
        businessType: 'Salon',
        contactName: 'Mira Shah',
        contactRole: 'Staff',
        menuUrl,
        outputFormat: 'png',
        shortLink: 'aster-oak-studio.menulist.online/services',
        staffName: 'Mira Shah',
        staffRole: 'Staff',
        storeName: 'Aster & Oak Studio',
        templateFamilyId: 'botanical-heritage',
    });
    assert.equal(adjacentThemeDocument.elements.filter((element) => element.type === 'rect' && element.name === 'Staff badge header field').length, 1, 'Staff Name Badge premium hierarchy propagates beyond the Terracotta Glow pilot');
}

async function assertAllThemeStaffNameBadgeRulebookGeometry() {
    const menuUrl = 'https://aster-oak-studio.menulist.online/services';
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'staff_id_card',
            ...businessContextForTheme(themeId),
            contactAddress: '18 Lavelle Road, Bengaluru',
            contactEmail: 'hello@asteroak.studio',
            contactName: 'Unrelated Store Contact',
            contactPhone: '+91 98450 21840',
            contactRole: 'Unrelated Store Contact Role',
            menuUrl,
            outputFormat: 'png',
            shortLink: 'aster-oak-studio.menulist.online/services',
            socialHandle: '@asteroakstudio',
            staffName: 'Mira Shah',
            staffRole: 'Staff',
            storeName: 'Aster & Oak Studio',
            templateFamilyId: themeId,
        });
        const tokens = resolvePrintableTemplateBrandTokens(undefined, themeId);
        const headerField = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Staff badge header field');
        const lanyardSlot = documentValue.elements.find((element) => element.type === 'rect' && element.name === 'Lanyard slot guide');
        const brandMark = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Business card brand mark field');
        const businessName = documentValue.elements.find((element) => isNamedTextElement(element, 'Business name'));
        const monogramHalo = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Staff monogram halo');
        const monogramField = documentValue.elements.find((element) => element.type === 'ellipse' && element.name === 'Staff monogram field');
        const staffInitials = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff initials'));
        const staffName = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff name'));
        const staffRole = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff role'));
        const purpose = documentValue.elements.find((element) => isNamedTextElement(element, 'Staff badge purpose'));
        const purposeDividers = documentValue.elements.filter((element) => element.type === 'line' && element.name === 'Staff badge purpose divider');

        assert.ok(
            headerField?.type === 'rect'
            && lanyardSlot?.type === 'rect'
            && brandMark?.type === 'ellipse'
            && businessName?.type === 'text'
            && monogramHalo?.type === 'ellipse'
            && monogramField?.type === 'ellipse'
            && staffInitials?.type === 'text'
            && staffName?.type === 'text'
            && staffRole?.type === 'text'
            && purpose?.type === 'text'
            && purposeDividers.length === 2,
            `${themeId} Staff Name Badge keeps the complete approved premium hierarchy`,
        );
        assert.equal(headerField.fill, tokens.accent, `${themeId} Staff Name Badge header inherits its parent-theme accent`);
        assert.equal(staffInitials.text, 'MS', `${themeId} Staff Name Badge derives the monogram from the selected staff member`);
        assert.equal(staffName.text, 'Mira Shah', `${themeId} Staff Name Badge preserves the selected staff name`);
        assert.equal(staffRole.text, 'STAFF', `${themeId} Staff Name Badge preserves the resolved current-store role`);
        assert.equal(purpose.text, 'STAFF BADGE', `${themeId} Staff Name Badge keeps one truthful purpose label`);
        assert.equal(documentValue.elements.some((element) => element.type === 'text' && element.text.includes('Unrelated Store Contact')), false, `${themeId} Staff Name Badge ignores unrelated store contact identity`);
        assert.equal(documentValue.elements.filter((element) => /photo/i.test(element.name)).length, 0, `${themeId} Staff Name Badge contains no unavailable photo affordance`);
        assert.equal(documentValue.elements.filter((element) => element.type === 'qr').length, 0, `${themeId} Staff Name Badge contains no unexplained QR`);
        assert.equal(documentValue.elements.filter((element) => ['Phone number', 'Address', 'Short link', 'Social handles'].includes(element.name)).length, 0, `${themeId} Staff Name Badge exposes no unrelated contact or social fields`);
        assert.ok(
            documentValue.elements.indexOf(headerField) < documentValue.elements.indexOf(brandMark)
            && documentValue.elements.indexOf(monogramHalo) < documentValue.elements.indexOf(monogramField)
            && documentValue.elements.indexOf(monogramField) < documentValue.elements.indexOf(staffInitials),
            `${themeId} Staff Name Badge preserves the approved background-to-identity layer order`,
        );
        assert.ok(lanyardSlot.y >= documentValue.canvas.height * 0.025, `${themeId} Staff Name Badge lanyard guide clears the trim edge`);
        assert.ok(monogramHalo.y >= headerField.y + headerField.height, `${themeId} Staff Name Badge monogram clears the branded header`);
        for (const element of documentValue.elements.filter((candidate) => candidate.type !== 'image')) {
            assert.ok(element.x >= 0 && element.y >= 0, `${themeId} Staff Name Badge ${element.name} begins inside the canvas`);
            assert.ok(element.x + element.width <= documentValue.canvas.width, `${themeId} Staff Name Badge ${element.name} stays inside the horizontal canvas bounds`);
            assert.ok(element.y + element.height <= documentValue.canvas.height, `${themeId} Staff Name Badge ${element.name} stays inside the vertical canvas bounds`);
        }
        for (const layer of [staffInitials, staffName, staffRole, purpose]) {
            await assertCenteredPrintableTextLayerGeometry({
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                label: `${themeId} Staff Name Badge ${layer.name}`,
                layer,
            });
        }

        const logoDocument = buildPrintableAssetEditorDocument({
            assetTypeId: 'staff_id_card',
            ...businessContextForTheme(themeId),
            logoUrl: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
            menuUrl,
            outputFormat: 'png',
            shortLink: 'aster-oak-studio.menulist.online/services',
            staffName: 'Mira Shah',
            staffRole: 'Staff',
            storeName: 'Aster & Oak Studio',
            templateFamilyId: themeId,
        });
        assert.equal(logoDocument.elements.filter((element) => element.type === 'image' && element.name === 'Business logo').length, 1, `${themeId} Staff Name Badge uses the real client logo when supplied`);
        assert.equal(logoDocument.elements.filter((element) => isNamedTextElement(element, 'Business initials')).length, 0, `${themeId} Staff Name Badge removes business initials when a real logo exists`);
    }
    process.stdout.write(`Staff Name Badge rulebook geometry passed for all ${PRINTABLE_THEME_FAMILY_IDS.length} governed themes.\n`);
}

function assertStaffBadgePersonSourceBoundary() {
    const staff = {
        active: true,
        deleted: false,
        email: 'mira@example.test',
        id: 'staff-mira',
        name: 'Mira Shah',
        storeIds: [401],
        stores: [{ name: 'Aster & Oak Studio', role: 'staff', storeId: 401 }],
        tenantId: 40,
    };
    const roles = [{
        active: true,
        createdBy: 'test',
        createdOn: '2026-09-01T00:00:00.000Z',
        description: 'Day-to-day staff access',
        id: 'staff',
        name: 'Staff',
        permissions: {},
    }];
    assert.deepEqual(
        resolvePrintableStaffBadgePerson(staff, 401, roles),
        { id: 'staff-mira', name: 'Mira Shah', role: 'Staff' },
        'Staff Name Badge admits only the staff name and the active per-store role display name',
    );
    assert.deepEqual(
        resolvePrintableStaffBadgePerson(
            { ...staff, stores: [{ name: 'Aster & Oak Studio', role: 'unknown-role', storeId: 401 }] },
            401,
            roles,
        ),
        { id: 'staff-mira', name: 'Mira Shah' },
        'Staff Name Badge omits unresolved role identifiers instead of printing internal values',
    );
    assert.equal(
        resolvePrintableStaffBadgePerson({ ...staff, active: false }, 401, roles),
        null,
        'Staff Name Badge excludes inactive staff records',
    );
    assert.equal(
        resolvePrintableStaffBadgePerson({ ...staff, name: 'Staff name' }, 401, roles),
        null,
        'Staff Name Badge excludes placeholder-like staff names',
    );
}

async function assertStaffIdCardLongNameGeometry() {
    const longBusinessName = 'Good Neighbour Pet Care & Home Services';
    const longStaffName = 'Alexandria Montgomery-Singh';
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: 'staff_id_card',
            brandColor: '#315f55',
            ...businessContextForTheme(themeId),
            contactAddress: '12 Museum Road, Bengaluru',
            contactName: 'Unrelated Store Contact',
            contactPhone: '+91 80 4567 8900',
            menuUrl: 'https://good-neighbour.example/services',
            outputFormat: 'png',
            projectId: `${themeId}-staff-id-long-name-geometry`,
            shortLink: 'good-neighbour.example/services',
            staffName: longStaffName,
            staffRole: 'Staff',
            storeName: longBusinessName,
            templateFamilyId: themeId,
        });
        assert.equal(documentValue.elements.filter((element) => /photo/i.test(element.name)).length, 0, `${themeId} Staff Name Badge has no unavailable photo affordance`);
        assert.equal(documentValue.elements.filter((element) => ['Phone number', 'Address', 'Short link'].includes(element.name)).length, 0, `${themeId} Staff Name Badge excludes unrelated store contact and link fields`);
        assert.equal(documentValue.elements.some((element) => element.type === 'text' && element.text.includes('Unrelated Store Contact')), false, `${themeId} Staff Name Badge ignores the store contact person`);
        for (const layerName of ['Business name', 'Staff name']) {
            const textElement = documentValue.elements.find((element) => (
                element.type === 'text' && element.name === layerName
            ));
            assert.ok(textElement?.type === 'text', `${themeId} Staff ID ${layerName} exists`);
            const bounds = await measureRenderedTextBounds({
                align: textElement.align || 'left',
                canvasHeight: documentValue.canvas.height,
                canvasWidth: documentValue.canvas.width,
                fontFamily: textElement.fontFamily || 'Inter, Arial, sans-serif',
                fontSize: textElement.fontSize,
                fontWeight: textElement.fontWeight || '900',
                text: textElement.text,
                width: textElement.width,
                x: textElement.x,
                y: textElement.y,
            });
            assert.ok(bounds.left >= textElement.x, `${themeId} Staff ID ${layerName} starts inside its text box`);
            assert.ok(bounds.right <= textElement.x + textElement.width, `${themeId} Staff ID ${layerName} ends inside its text box`);
            assert.ok(bounds.left >= 0 && bounds.right < documentValue.canvas.width, `${themeId} Staff ID ${layerName} stays on canvas`);
        }
    }
}

async function assertPrintMasterFiles() {
    for (const themeId of PRINTABLE_THEME_FAMILY_IDS) {
        const publicPath = getPrintableThemeArtworkPaths(themeId)?.page;
        assert.ok(publicPath, `${themeId} declares a print master path`);
        const metadata = await sharp(path.resolve(process.cwd(), `public${publicPath}`)).metadata();
        assert.ok((metadata.width || 0) >= 1_024, `${themeId} print master is at least 1024px wide`);
        assert.ok((metadata.height || 0) >= 1_400, `${themeId} print master is at least 1400px tall`);
        assert.ok((metadata.width || 0) < (metadata.height || 0), `${themeId} print master remains portrait and is never stretched landscape`);
    }

    for (const themeId of LIGHT_SALON_SPA_THEME_IDS) {
        const publicPath = getPrintableThemeArtworkPaths(themeId)?.page;
        assert.ok(publicPath, `${themeId} declares its light print master path`);
        const absolutePath = path.resolve(process.cwd(), `public${publicPath}`);
        const metadata = await sharp(absolutePath).metadata();
        assert.equal(metadata.width, 1_024, `${themeId} keeps the governed master width`);
        assert.equal(metadata.height, 1_536, `${themeId} keeps the governed master height`);

        const fullStats = await sharp(absolutePath).stats();
        const centerStats = await sharp(absolutePath)
            .extract({
                height: Math.round((metadata.height || 0) * 0.7),
                left: Math.round((metadata.width || 0) * 0.2),
                top: Math.round((metadata.height || 0) * 0.15),
                width: Math.round((metadata.width || 0) * 0.6),
            })
            .stats();
        const fullLuminance = fullStats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3;
        const centerLuminance = centerStats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.mean, 0) / 3;
        assert.ok(fullLuminance >= 205, `${themeId} remains a light full-page composition`);
        assert.ok(centerLuminance >= 220, `${themeId} keeps a light protected copy field`);
    }
}

async function runAsyncGeometryAssertions() {
    assertKoboyoArtworkPolicyCoverage();
    assertStaffBadgePersonSourceBoundary();
    await assertPrintMasterFiles();
    await assertLankanGiftCertificateHeadlineBounds();
    await assertLankanAffectedAssetTextGeometry();
    await assertPremiumTableTentIdentityAndGeometry();
    await assertAllThemeTableTentRulebookGeometry();
    await assertPremiumSingleTableCardIdentityAndGeometry();
    await assertAllThemeCounterStickerRulebookGeometry();
    await assertTerracottaEntrancePosterPilotGeometry();
    await assertTerracottaFeedbackQrPilotGeometry();
    await assertTerracottaCampaignFlyerPilotGeometry();
    await assertTerracottaBusinessCardPilotGeometry();
    assertAllThemeBusinessCardRulebookGeometry();
    await assertTerracottaGiftCertificatePilotGeometry();
    await assertAllThemeGiftCertificateRulebookGeometry();
    await assertAllThemePosterFeedbackAndFlyerRulebookGeometry();
    await assertAllThemePostcardRulebookGeometry();
    await assertProductTagRulebookGeometry();
    await assertCampaignPosterTextAndQrGeometry();
    await assertTerracottaEventInvitationPilotGeometry();
    await assertAllThemeEventInvitationRulebookGeometry();
    await assertTerracottaStaffNameBadgePilotGeometry();
    await assertAllThemeStaffNameBadgeRulebookGeometry();
    await assertStaffIdCardLongNameGeometry();
}

void runAsyncGeometryAssertions()
    .then(() => process.stdout.write('Printable theme artwork placement tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exitCode = 1;
    });
