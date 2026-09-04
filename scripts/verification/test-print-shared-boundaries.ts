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
    rehydratePrintableAssetEditorDocument,
} from '../../src/lib/printable-asset-templates/editorDocumentAdapter';
import { normalizePrintableAssetRenderInput } from '../../src/lib/printable-asset-templates/inputBoundary';
import {
    buildDecisionChoiceCampaignPosterRenderInput,
    buildTodayCampaignPosterRenderInput,
} from '../../src/lib/printable-asset-templates/campaignPoster';
import { buildItemProductTagRenderInput } from '../../src/lib/printable-asset-templates/itemProductTag';
import { getMenuListLogoMarkWidth } from '../../src/lib/menu-kit/platformAttribution';
import type { StoreDataType } from '../../src/types/platform/store';
import type { Campaign } from '../../src/types/campaigns';
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
    && element.text === 'boundary-cafe.menulist.online'
)));
assert.equal(
    admitPrintableAssetEditorDocument(printableDocument, printableInput.assetTypeId).canvas.width,
    2480,
);
const resizedPrintableDocument = {
    ...printableDocument,
    canvas: { ...printableDocument.canvas, height: 1200, width: 900 },
};
assert.deepEqual(
    {
        height: admitPrintableAssetEditorDocument(resizedPrintableDocument, printableInput.assetTypeId).canvas.height,
        width: admitPrintableAssetEditorDocument(resizedPrintableDocument, printableInput.assetTypeId).canvas.width,
    },
    { height: 1200, width: 900 },
    'A supported canvas size chosen in the editor must remain valid after saving and reopening.',
);
assert.equal(
    rehydratePrintableAssetEditorDocument(resizedPrintableDocument, printableInput).canvas.width,
    900,
    'Rehydration must preserve a supported saved canvas size.',
);
assert.throws(
    () => admitPrintableAssetEditorDocument({
        ...printableDocument,
        canvas: { ...printableDocument.canvas, height: 1200, width: 8 },
    }, printableInput.assetTypeId),
    /outside the supported range/,
    'A saved printable design must reject an undersized canvas before persistence.',
);
assert.throws(
    () => admitPrintableAssetEditorDocument({
        ...printableDocument,
        canvas: { ...printableDocument.canvas, height: 10_000, width: 10_000 },
    }, printableInput.assetTypeId),
    /outside the supported range/,
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
const normalizedFlyerCampaign = normalizePrintableAssetRenderInput({
    ...printableInput,
    assetTypeId: 'campaign_flyer',
    flyerCampaign: {
        details: 'd'.repeat(400),
        headline: `  ${'h'.repeat(90)}  `,
        offer: '  Complimentary signature extra  ',
        terms: 't'.repeat(200),
        validUntil: '  Valid through 30 September 2026  ',
    },
});
assert.ok((normalizedFlyerCampaign?.flyerCampaign?.headline.length || 0) > 0);
assert.ok((normalizedFlyerCampaign?.flyerCampaign?.headline.length || 0) <= 70);
assert.equal(normalizedFlyerCampaign?.flyerCampaign?.details?.length, 180);
assert.equal(normalizedFlyerCampaign?.flyerCampaign?.offer, 'Complimentary signature extra');
assert.equal(normalizedFlyerCampaign?.flyerCampaign?.terms?.length, 140);
assert.equal(normalizedFlyerCampaign?.flyerCampaign?.validUntil, 'Valid through 30 September 2026');
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        assetTypeId: 'campaign_flyer',
        flyerCampaign: { headline: '   ', offer: 'Must not survive without a headline' },
    })?.flyerCampaign,
    undefined,
);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        flyerCampaign: { headline: 'Must not leak into another asset' },
    })?.flyerCampaign,
    undefined,
);
const normalizedPosterCampaign = normalizePrintableAssetRenderInput({
    ...printableInput,
    assetTypeId: 'campaign_poster',
    campaignContent: {
        details: 'Available while the featured item remains published.',
        headline: 'Today\'s special',
        offer: 'Signature Botanical Oil',
    },
});
assert.equal(normalizedPosterCampaign?.campaignContent?.headline, "Today's special");
assert.equal(normalizedPosterCampaign?.campaignContent?.offer, 'Signature Botanical Oil');
assert.equal(normalizedPosterCampaign?.flyerCampaign, undefined);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        campaignContent: { headline: 'Must not leak into another asset' },
    })?.campaignContent,
    undefined,
);
const normalizedPostcardContent = normalizePrintableAssetRenderInput({
    ...printableInput,
    assetTypeId: 'postcard',
    postcardContent: {
        headline: `  ${'h'.repeat(90)}  `,
        message: 'm'.repeat(240),
    },
    templateFamilyId: 'terracotta-glow',
});
assert.ok((normalizedPostcardContent?.postcardContent?.headline.length || 0) > 0);
assert.ok((normalizedPostcardContent?.postcardContent?.headline.length || 0) <= 70);
assert.equal(normalizedPostcardContent?.postcardContent?.message?.length, 180);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        assetTypeId: 'postcard',
        postcardContent: { headline: '   ', message: 'Must not survive without a headline' },
        templateFamilyId: 'terracotta-glow',
    })?.postcardContent,
    undefined,
);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        assetTypeId: 'postcard',
        postcardContent: { headline: 'This owner message must survive theme switching' },
        templateFamilyId: 'botanical-heritage',
    })?.postcardContent?.headline,
    'This owner message must survive theme switching',
);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        postcardContent: { headline: 'Must not leak into another asset' },
    })?.postcardContent,
    undefined,
);
const normalizedGiftCertificateContent = normalizePrintableAssetRenderInput({
    ...printableInput,
    assetTypeId: 'gift_certificate',
    giftCertificateContent: {
        certificateNumber: 'c'.repeat(70),
        message: 'm'.repeat(200),
        recipient: `  ${'r'.repeat(90)}  `,
        sender: '  Aster & Oak Studio  ',
        validUntil: '  30 September 2026  ',
        value: '  ₹1,000  ',
    },
});
assert.ok((normalizedGiftCertificateContent?.giftCertificateContent?.recipient?.length || 0) > 0);
assert.ok((normalizedGiftCertificateContent?.giftCertificateContent?.recipient?.length || 0) <= 70);
assert.equal(normalizedGiftCertificateContent?.giftCertificateContent?.sender, 'Aster & Oak Studio');
assert.equal(normalizedGiftCertificateContent?.giftCertificateContent?.message?.length, 140);
assert.equal(normalizedGiftCertificateContent?.giftCertificateContent?.value, '₹1,000');
assert.equal(normalizedGiftCertificateContent?.giftCertificateContent?.validUntil, '30 September 2026');
assert.equal(normalizedGiftCertificateContent?.giftCertificateContent?.certificateNumber?.length, 40);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        giftCertificateContent: { recipient: 'Must not leak into another asset' },
    })?.giftCertificateContent,
    undefined,
);
const normalizedInvitationContent = normalizePrintableAssetRenderInput({
    ...printableInput,
    assetTypeId: 'event_invitation',
    invitationContent: {
        date: 'd'.repeat(70),
        location: 'l'.repeat(150),
        occasion: `  ${'o'.repeat(100)}  `,
        time: '  6:30 PM onwards  ',
    },
});
assert.ok((normalizedInvitationContent?.invitationContent?.occasion?.length || 0) > 0);
assert.ok((normalizedInvitationContent?.invitationContent?.occasion?.length || 0) <= 80);
assert.equal(normalizedInvitationContent?.invitationContent?.date?.length, 50);
assert.equal(normalizedInvitationContent?.invitationContent?.time, '6:30 PM onwards');
assert.equal(normalizedInvitationContent?.invitationContent?.location?.length, 120);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        invitationContent: { occasion: 'Must not leak into another asset' },
    })?.invitationContent,
    undefined,
);
const giftCertificateDocument = buildPrintableAssetEditorDocument({
    ...printableInput,
    assetTypeId: 'gift_certificate',
    giftCertificateContent: {
        certificateNumber: 'GC-2026-1042',
        message: 'With our warmest wishes',
        recipient: 'Aarav Mehta',
        sender: 'Aster & Oak Studio',
        validUntil: '30 September 2026',
        value: '₹1,000',
    },
});
const assertRuntimeValueClearsLabelAndLine = (
    documentValue: ReturnType<typeof buildPrintableAssetEditorDocument>,
    labelName: string,
    lineName: string,
    valueName: string,
) => {
    const label = documentValue.elements.find((element) => element.type === 'text' && element.name === labelName);
    const line = documentValue.elements.find((element) => element.type === 'line' && element.name === lineName);
    const value = documentValue.elements.find((element) => element.type === 'text' && element.name === valueName);
    assert.ok(label?.type === 'text', `${labelName} must exist`);
    assert.ok(line?.type === 'line', `${lineName} must exist`);
    assert.ok(value?.type === 'text', `${valueName} must exist`);
    assert.ok(value.y >= label.y + label.height, `${valueName} must clear its label`);
    assert.ok(value.y + value.height <= line.y, `${valueName} must stay above its write-in line`);
};
[
    ['Recipient label value', 'Aarav Mehta'],
    ['Sender label value', 'Aster & Oak Studio'],
    ['Message label value', 'With our warmest wishes'],
    ['Gift value label value', '₹1,000'],
    ['Gift validity label value', '30 September 2026'],
    ['Certificate number label value', 'GC-2026-1042'],
].forEach(([name, expected]) => {
    assert.ok(giftCertificateDocument.elements.some((element) => (
        element.type === 'text' && element.name === name && element.text === expected
    )), `Gift Certificate must render ${String(name)}`);
});
[
    'Recipient label',
    'Sender label',
    'Message label',
    'Gift value label',
    'Gift validity label',
    'Certificate number label',
].forEach((labelName) => assertRuntimeValueClearsLabelAndLine(
    giftCertificateDocument,
    labelName,
    `${labelName} line`,
    `${labelName} value`,
));
const invitationDocument = buildPrintableAssetEditorDocument({
    ...printableInput,
    assetTypeId: 'event_invitation',
    invitationContent: {
        date: 'Saturday, 12 September',
        location: 'Aster & Oak Studio, Pune',
        occasion: 'Customer evening',
        time: '6:30 PM onwards',
    },
});
[
    ['Invitation occasion value', 'Customer evening'],
    ['Invitation date value', 'Saturday, 12 September'],
    ['Invitation time value', '6:30 PM onwards'],
    ['Invitation location value', 'Aster & Oak Studio, Pune'],
].forEach(([name, expected]) => {
    assert.ok(invitationDocument.elements.some((element) => (
        element.type === 'text' && element.name === name && element.text === expected
    )), `Invitation must render ${String(name)}`);
});
[
    'Invitation occasion',
    'Invitation date',
    'Invitation time',
    'Invitation location',
].forEach((fieldName) => assertRuntimeValueClearsLabelAndLine(
    invitationDocument,
    `${fieldName} label`,
    `${fieldName} write-in line`,
    `${fieldName} value`,
));
const longRuntimeContentDocument = buildPrintableAssetEditorDocument({
    ...printableInput,
    assetTypeId: 'event_invitation',
    invitationContent: {
        date: 'Saturday, 12 September 2026, doors open before sunset',
        location: 'Aster and Oak Studio, Second Floor, Riverside Market, Central Pune, Maharashtra',
        occasion: 'An evening celebrating our community, collaborators, and customers',
        time: '6:30 PM onwards until closing',
    },
});
[
    'Invitation occasion',
    'Invitation date',
    'Invitation time',
    'Invitation location',
].forEach((fieldName) => assertRuntimeValueClearsLabelAndLine(
    longRuntimeContentDocument,
    `${fieldName} label`,
    `${fieldName} write-in line`,
    `${fieldName} value`,
));
const longGiftMessageDocument = buildPrintableAssetEditorDocument({
    ...printableInput,
    assetTypeId: 'gift_certificate',
    giftCertificateContent: {
        message: 'A thoughtful gift to enjoy whenever the moment feels right, with our warmest wishes from everyone here.',
    },
});
assertRuntimeValueClearsLabelAndLine(
    longGiftMessageDocument,
    'Message label',
    'Message label line',
    'Message label value',
);
const normalizedProductTagContent = normalizePrintableAssetRenderInput({
    ...printableInput,
    assetTypeId: 'product_tag',
    productTagContent: {
        detail: 'd'.repeat(140),
        name: `  ${'n'.repeat(90)}  `,
        price: 'p'.repeat(50),
    },
    templateFamilyId: 'terracotta-glow',
});
assert.ok((normalizedProductTagContent?.productTagContent?.name.length || 0) > 0);
assert.ok((normalizedProductTagContent?.productTagContent?.name.length || 0) <= 70);
assert.equal(normalizedProductTagContent?.productTagContent?.detail?.length, 100);
assert.equal(normalizedProductTagContent?.productTagContent?.price?.length, 30);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        assetTypeId: 'product_tag',
        productTagContent: { detail: 'Must not survive without a name', name: '   ' },
        templateFamilyId: 'terracotta-glow',
    })?.productTagContent,
    undefined,
);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        assetTypeId: 'product_tag',
        productTagContent: { name: 'Must survive a parent theme change' },
        templateFamilyId: 'botanical-heritage',
    })?.productTagContent?.name,
    'Must survive a parent theme change',
);
assert.equal(
    normalizePrintableAssetRenderInput({
        ...printableInput,
        productTagContent: { name: 'Must not leak into another asset' },
        templateFamilyId: 'terracotta-glow',
    })?.productTagContent,
    undefined,
);
const itemProductTagStore = {
    activePlanType: 'growth',
    businessCategory: 'service',
    businessType: 'Salon',
    customDomain: '',
    defaultLanguage: 'en',
    logo: 'https://cdn.menulist.online/fixtures/aster-oak-logo.png',
    name: 'Aster & Oak Studio',
    printableAssetStylePreferences: {
        businessThemeId: 'botanical-heritage',
        projectThemeOverrides: { 'project-1': 'terracotta-glow' },
    },
    subdomain: 'aster-oak-studio',
    tagline: 'Thoughtful care, beautifully delivered.',
    tenantName: 'Aster & Oak Studio',
} as unknown as StoreDataType;
const itemProductTagInput = buildItemProductTagRenderInput({
    item: {
        detail: '50 ml botanical blend',
        itemId: 'item-42',
        name: 'Signature Botanical Oil',
        price: '₹1,290',
    },
    project: {
        defaultLanguage: 'en',
        name: 'Services',
        projectId: 'project-1',
    },
    store: itemProductTagStore,
});
assert.ok(itemProductTagInput, 'A saved owner item and tenant link produce a Product Tag input');
assert.equal(itemProductTagInput.templateFamilyId, 'terracotta-glow', 'Product Tag resolves the project-selected parent theme before the business theme');
assert.equal(itemProductTagInput.productTagContent?.name, 'Signature Botanical Oil');
assert.equal(new URL(itemProductTagInput.menuUrl).searchParams.get('item'), 'item-42', 'Product Tag QR targets the exact source item');
assert.match(
    new URL(itemProductTagInput.menuUrl).hostname,
    /^aster-oak-studio\.menulist\.(?:digital|online)$/,
    'Product Tag uses the canonical environment-specific tenant host',
);
assert.equal(buildItemProductTagRenderInput({
    item: { itemId: 'item-42', name: 'Signature Botanical Oil' },
    project: { name: 'Services', projectId: 'project-1' },
    store: { ...itemProductTagStore, subdomain: '', customDomain: '' },
}), null, 'Product Tag fails closed instead of emitting a dummy URL');
const todayCampaign = {
    id: 'campaign-1',
    intent: 'in_store_reinforcement',
    kind: 'passive',
    primarySurface: 'print_poster',
    projectId: 'project-1',
    secondarySurfaces: [],
    status: 'suggested',
    subject: { itemId: 'item-42', itemName: 'Signature Botanical Oil' },
    type: 'todays_special',
} as unknown as Campaign;
const todayCampaignProject = {
    defaultLanguage: 'en',
    files: [{
        active: true,
        extractedData: {
            data: {
                categories: [],
                items: [{
                    active: true,
                    available: true,
                    category: 'rituals',
                    description: { en: 'A restorative botanical ritual prepared with aromatic oils.' },
                    id: 'item-42',
                    name: { en: 'Restorative Botanical Ritual' },
                }],
                languages: [{ code: 'en', isPrimary: true, name: 'English' }],
            },
        },
    }],
    name: 'Services',
    projectId: 'project-1',
};
const todayCampaignPosterInput = buildTodayCampaignPosterRenderInput({
    campaign: todayCampaign,
    expectedProjectId: 'project-1',
    menuUrl: 'https://aster-oak-studio.menulist.online/services',
    project: todayCampaignProject,
    store: itemProductTagStore,
});
assert.ok(todayCampaignPosterInput, 'A Today campaign with a valid project and public link produces a Campaign Poster');
assert.equal(todayCampaignPosterInput.templateFamilyId, 'terracotta-glow', 'Campaign Poster inherits the selected project theme');
assert.equal(todayCampaignPosterInput.campaignContent?.headline, "Today's special");
assert.equal(todayCampaignPosterInput.campaignContent?.offer, 'Restorative Botanical Ritual', 'Campaign Poster uses the current selected-project item name instead of a stale campaign snapshot');
assert.equal(todayCampaignPosterInput.campaignContent?.details, 'A restorative botanical ritual prepared with aromatic oils.', 'Campaign Poster includes the current localized item description when available');
assert.equal(new URL(todayCampaignPosterInput.menuUrl).searchParams.get('item'), 'item-42', 'Item campaigns use the existing exact-item deep link');
const campaignPosterWithoutDescription = buildTodayCampaignPosterRenderInput({
    campaign: todayCampaign,
    expectedProjectId: 'project-1',
    menuUrl: 'https://aster-oak-studio.menulist.online/services',
    project: {
        ...todayCampaignProject,
        files: [{
            ...todayCampaignProject.files[0],
            extractedData: {
                data: {
                    ...todayCampaignProject.files[0].extractedData.data,
                    items: [{
                        ...todayCampaignProject.files[0].extractedData.data.items[0],
                        description: undefined,
                    }],
                },
            },
        }],
    },
    store: itemProductTagStore,
});
assert.ok(campaignPosterWithoutDescription);
assert.equal(campaignPosterWithoutDescription.campaignContent?.details, undefined, 'Campaign Poster omits the description row when the current item has no description');
assert.equal(buildTodayCampaignPosterRenderInput({
    campaign: todayCampaign,
    expectedProjectId: 'another-project',
    menuUrl: 'https://aster-oak-studio.menulist.online/services',
    project: todayCampaignProject,
    store: itemProductTagStore,
}), null, 'Campaign Poster rejects a campaign from a different selected project');
assert.equal(buildTodayCampaignPosterRenderInput({
    campaign: todayCampaign,
    expectedProjectId: 'project-1',
    menuUrl: 'https://aster-oak-studio.menulist.online/services',
    project: {
        ...todayCampaignProject,
        files: [{
            ...todayCampaignProject.files[0],
            extractedData: {
                data: {
                    ...todayCampaignProject.files[0].extractedData.data,
                    items: [{
                        ...todayCampaignProject.files[0].extractedData.data.items[0],
                        available: false,
                    }],
                },
            },
        }],
    },
    store: itemProductTagStore,
}), null, 'Campaign Poster rejects an unavailable current item instead of printing a stale campaign snapshot');
const generalCampaignPosterInput = buildTodayCampaignPosterRenderInput({
    campaign: { ...todayCampaign, subject: {}, type: 'menu_highlight' },
    expectedProjectId: 'project-1',
    menuUrl: 'https://aster-oak-studio.menulist.online/services',
    project: todayCampaignProject,
    store: itemProductTagStore,
});
assert.ok(generalCampaignPosterInput);
assert.equal(new URL(generalCampaignPosterInput.menuUrl).searchParams.has('item'), false, 'General campaigns keep the selected project destination');
assert.equal(buildTodayCampaignPosterRenderInput({
    campaign: todayCampaign,
    expectedProjectId: 'project-1',
    menuUrl: 'http://aster-oak-studio.menulist.online/services',
    project: todayCampaignProject,
    store: itemProductTagStore,
}), null, 'Campaign Poster fails closed for a non-HTTPS public destination');
const decisionChoiceProject = {
    ...todayCampaignProject,
    menuSettings: {
        decisionBlocks: {
            enableBestValue: true,
            enablePopular: true,
            enableQuickPick: true,
            pinnedBestValue: 'item-42',
            pinnedPopular: 'item-42',
            pinnedQuickPick: 'item-42',
        },
    },
};
for (const [blockType, expectedHeadline] of [
    ['popular', 'Clients often book'],
    ['quickPick', 'Quick session'],
    ['bestValue', 'Good value'],
] as const) {
    const decisionChoicePosterInput = buildDecisionChoiceCampaignPosterRenderInput({
        blockType,
        project: decisionChoiceProject,
        store: itemProductTagStore,
    });
    assert.ok(decisionChoicePosterInput, `${blockType} saved choice produces a Campaign Poster`);
    assert.equal(decisionChoicePosterInput.campaignContent?.headline, expectedHeadline, `${blockType} uses the existing business-aware public choice label`);
    assert.equal(decisionChoicePosterInput.campaignContent?.offer, 'Restorative Botanical Ritual', `${blockType} uses the current selected item name`);
    assert.equal(decisionChoicePosterInput.campaignContent?.details, 'A restorative botanical ritual prepared with aromatic oils.', `${blockType} uses the current selected item description`);
    assert.equal(decisionChoicePosterInput.templateFamilyId, 'terracotta-glow', `${blockType} inherits the project parent theme`);
    assert.equal(new URL(decisionChoicePosterInput.menuUrl).searchParams.get('item'), 'item-42', `${blockType} QR targets the exact current item`);
}
assert.equal(buildDecisionChoiceCampaignPosterRenderInput({
    blockType: 'popular',
    project: {
        ...decisionChoiceProject,
        menuSettings: { decisionBlocks: { ...decisionChoiceProject.menuSettings.decisionBlocks, pinnedPopular: undefined } },
    },
    store: itemProductTagStore,
}), null, 'Automatic Featured choices cannot produce a static poster');
assert.equal(buildDecisionChoiceCampaignPosterRenderInput({
    blockType: 'popular',
    project: {
        ...decisionChoiceProject,
        menuSettings: { decisionBlocks: { ...decisionChoiceProject.menuSettings.decisionBlocks, enablePopular: false } },
    },
    store: itemProductTagStore,
}), null, 'A disabled Featured choice cannot produce a poster');
assert.equal(buildDecisionChoiceCampaignPosterRenderInput({
    blockType: 'popular',
    project: decisionChoiceProject,
    store: { ...itemProductTagStore, subdomain: '', customDomain: '' },
}), null, 'A Featured choice poster cannot fall back to a dummy customer URL');
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
