import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { serializeCreativeDocumentToSvg } from '../../src/modules/creative-editor/export';
import { PRINTABLE_ASSET_TYPES } from '../../src/lib/printable-asset-templates/assetTypes';
import {
    buildPrintableAssetEditorDocument,
    isPrintableAssetEditorRenderable,
} from '../../src/lib/printable-asset-templates/editorDocumentAdapter';
import { PRINTABLE_THEME_FAMILY_IDS } from '../../src/lib/printable-asset-templates/templateFamilies';
import { getPrintableThemeArtworkPaths } from '../../src/lib/printable-asset-templates/themeArtwork';
import type { PrintableAssetRenderInput, PrintableAssetTypeId, PrintableTemplateFamilyId } from '../../src/lib/printable-asset-templates/types';

const OUTPUT_DIRECTORY = path.resolve(process.cwd(), 'output/printable-theme-visual-audit');
const CORNER_PATH = path.resolve(process.cwd(), 'public/images/printable-themes/craft-kitchen/culinary-corner.png');
const RAIL_PATH = path.resolve(process.cwd(), 'public/images/printable-themes/craft-kitchen/culinary-rail.png');
const THEME_PAGE_PATHS = Object.fromEntries(
    PRINTABLE_THEME_FAMILY_IDS.flatMap((themeId) => {
        const page = getPrintableThemeArtworkPaths(themeId)?.page;
        return page ? [[themeId, page]] : [];
    }),
) as Partial<Record<PrintableTemplateFamilyId, string>>;
const THEME_COMPACT_PATHS = Object.fromEntries(
    PRINTABLE_THEME_FAMILY_IDS.flatMap((themeId) => {
        const compact = getPrintableThemeArtworkPaths(themeId)?.compact;
        return compact ? [[themeId, compact]] : [];
    }),
) as Partial<Record<PrintableTemplateFamilyId, string>>;
const ALL_VISUAL_THEME_IDS: PrintableTemplateFamilyId[] = [...PRINTABLE_THEME_FAMILY_IDS];
const requestedThemeIds = new Set(
    (process.env.PRINTABLE_THEME_FILTER || '').split(',').map((value) => value.trim()).filter(Boolean),
);
const VISUAL_THEME_IDS = requestedThemeIds.size > 0
    ? ALL_VISUAL_THEME_IDS.filter((themeId) => requestedThemeIds.has(themeId))
    : ALL_VISUAL_THEME_IDS;
const SALON_BEAUTY_THEME_IDS = new Set<PrintableTemplateFamilyId>([
    'salon-atelier',
    'petal-studio',
    'pearl-veil',
    'terracotta-glow',
    'glasshouse-beauty',
    'rosewater-editorial',
    'noir-studio',
]);
const SPA_THEME_IDS = new Set<PrintableTemplateFamilyId>([
    'ritual-sanctuary',
    'eucalyptus-retreat',
    'mineral-spring',
    'lotus-stillness',
    'sunlit-ritual',
    'mineral-sanctuary',
]);
const THEME_INPUT_OVERRIDES: Partial<Record<PrintableTemplateFamilyId, Partial<Omit<PrintableAssetRenderInput, 'assetTypeId' | 'templateFamilyId'>>>> = {
    'ember-house': {
        businessCategory: 'food',
        businessType: 'Restaurant',
        contactName: 'Ember & Grain House',
        menuUrl: 'https://ember-grain.example/menu',
        shortLink: 'ember-grain.example/menu',
        storeName: 'Ember & Grain House',
    },
    'coastal-table': {
        businessCategory: 'food',
        businessType: 'Restaurant',
        contactName: 'Tide & Citrus',
        menuUrl: 'https://tide-citrus.example/menu',
        shortLink: 'tide-citrus.example/menu',
        storeName: 'Tide & Citrus',
    },
    'sunday-table': {
        businessCategory: 'food',
        businessType: 'Restaurant',
        contactName: 'Marlow Sunday Kitchen',
        menuUrl: 'https://marlow-sunday.example/menu',
        shortLink: 'marlow-sunday.example/menu',
        storeName: 'Marlow Sunday Kitchen',
    },
    'counter-rush': {
        businessCategory: 'food',
        businessType: 'Restaurant',
        contactName: 'Rush & Bowl',
        menuUrl: 'https://rush-bowl.example/menu',
        shortLink: 'rush-bowl.example/menu',
        storeName: 'Rush & Bowl',
    },
    'roastery-ledger': {
        businessCategory: 'food',
        businessType: 'Specialty Coffee Shop',
        contactName: 'Copper & Bloom Roastery',
        menuUrl: 'https://copper-bloom.example/menu',
        shortLink: 'copper-bloom.example/menu',
        storeName: 'Copper & Bloom Roastery',
    },
    'patisserie-conservatory': {
        businessCategory: 'food',
        businessType: 'Bakery',
        contactName: 'Maison Pistache',
        menuUrl: 'https://maison-pistache.example/menu',
        shortLink: 'maison-pistache.example/menu',
        storeName: 'Maison Pistache',
    },
    'gelateria-riviera': {
        businessCategory: 'food',
        businessType: 'Ice Cream Shop',
        contactName: 'Riviera Gelato House',
        menuUrl: 'https://riviera-gelato.example/menu',
        shortLink: 'riviera-gelato.example/menu',
        storeName: 'Riviera Gelato House',
    },
    'salon-atelier': {
        businessCategory: 'service',
        businessType: 'Salon',
        contactName: 'Aster & Oak Studio',
        menuUrl: 'https://aster-oak.example/services',
        shortLink: 'aster-oak.example/services',
        storeName: 'Aster & Oak Studio',
    },
    'terracotta-glow': {
        businessCategory: 'service',
        businessType: 'Salon',
        contactName: 'Aster & Oak Studio',
        feedbackUrl: 'https://aster-oak-studio.menulist.online/feedback',
        menuUrl: 'https://aster-oak-studio.menulist.online/services',
        shortLink: 'aster-oak-studio.menulist.online/services',
        storeName: 'Aster & Oak Studio',
        tagline: 'Thoughtful care, beautifully delivered.',
    },
    'ritual-sanctuary': {
        businessCategory: 'health',
        businessType: 'Spa',
        contactName: 'Stillwater Ritual Spa',
        menuUrl: 'https://stillwater.example/rituals',
        shortLink: 'stillwater.example/rituals',
        storeName: 'Stillwater Ritual Spa',
    },
    'performance-circuit': {
        businessCategory: 'health',
        businessType: 'Fitness Center',
        contactName: 'Form & Field Studio',
        menuUrl: 'https://form-field.example/training',
        shortLink: 'form-field.example/training',
        storeName: 'Form & Field Studio',
    },
    'gallery-ledger': {
        businessCategory: 'professional',
        businessType: 'Interior Designer',
        contactName: 'Northline Atelier',
        menuUrl: 'https://northline.example/services',
        shortLink: 'northline.example/services',
        storeName: 'Northline Atelier',
    },
    'vital-current': {
        businessCategory: 'health',
        businessType: 'Fitness Center',
        contactName: 'Form & Field Studio',
        menuUrl: 'https://form-field.example/services',
        shortLink: 'form-field.example/services',
        storeName: 'Form & Field Studio',
    },
    'workshop-atlas': {
        businessCategory: 'professional',
        businessType: 'Home Renovation Contractor',
        contactName: 'Harbor Works Co.',
        menuUrl: 'https://harbor-works.example/services',
        shortLink: 'harbor-works.example/services',
        storeName: 'Harbor Works Co.',
    },
    'neighbourhood-standard': {
        businessCategory: 'service',
        businessType: 'Pet Grooming Service',
        contactName: 'Good Neighbour Pet Care',
        menuUrl: 'https://good-neighbour.example/services',
        shortLink: 'good-neighbour.example/services',
        storeName: 'Good Neighbour Pet Care',
    },
    'field-notes': {
        businessCategory: 'service',
        businessType: 'Landscaping Service',
        contactName: 'Field & Form Services',
        menuUrl: 'https://field-form.example/services',
        shortLink: 'field-form.example/services',
        storeName: 'Field & Form Services',
    },
    'boutique-window': {
        businessCategory: 'retail',
        businessType: 'Fashion Boutique',
        contactName: 'Maison Vale',
        menuUrl: 'https://maison-vale.example/collection',
        shortLink: 'maison-vale.example/collection',
        storeName: 'Maison Vale',
    },
    'market-label': {
        businessCategory: 'retail',
        businessType: 'Bookstore',
        contactName: 'Paper & Petal Market',
        menuUrl: 'https://paper-petal.example/catalog',
        shortLink: 'paper-petal.example/catalog',
        storeName: 'Paper & Petal Market',
    },
    'civic-letterpress': {
        businessCategory: 'professional',
        businessType: 'Law Firm',
        contactName: 'Alden & Rowe Advisory',
        menuUrl: 'https://alden-rowe.example/services',
        shortLink: 'alden-rowe.example/services',
        storeName: 'Alden & Rowe Advisory',
    },
    'modern-practice': {
        businessCategory: 'professional',
        businessType: 'Life Coach',
        contactName: 'North & Now Practice',
        menuUrl: 'https://north-now.example/services',
        shortLink: 'north-now.example/services',
        storeName: 'North & Now Practice',
    },
    'studio-contact-sheet': {
        businessCategory: 'creative',
        businessType: 'Photography Studio',
        contactName: 'Frame House Studio',
        menuUrl: 'https://frame-house.example/services',
        shortLink: 'frame-house.example/services',
        storeName: 'Frame House Studio',
    },
    'maker-ledger': {
        businessCategory: 'creative',
        businessType: 'Furniture Maker',
        contactName: 'Woven & Hewn',
        menuUrl: 'https://woven-hewn.example/catalog',
        shortLink: 'woven-hewn.example/catalog',
        storeName: 'Woven & Hewn',
    },
    'clinical-calm': {
        businessCategory: 'health',
        businessType: 'Dental Clinic',
        contactName: 'Harbor Dental Care',
        menuUrl: 'https://harbor-dental.example/services',
        shortLink: 'harbor-dental.example/services',
        storeName: 'Harbor Dental Care',
    },
    'mindful-motion': {
        businessCategory: 'health',
        businessType: 'Yoga Studio',
        contactName: 'Open Arc Studio',
        menuUrl: 'https://open-arc.example/classes',
        shortLink: 'open-arc.example/classes',
        storeName: 'Open Arc Studio',
    },
    'hospitality-house': {
        businessCategory: 'specialty',
        businessType: 'Boutique Hotel',
        contactName: 'The Serein House',
        menuUrl: 'https://serein-house.example/experiences',
        shortLink: 'serein-house.example/experiences',
        storeName: 'The Serein House',
    },
    'future-workshop': {
        businessCategory: 'specialty',
        businessType: '3D Printing Studio',
        contactName: 'Vector Forge Lab',
        menuUrl: 'https://vector-forge.example/services',
        shortLink: 'vector-forge.example/services',
        storeName: 'Vector Forge Lab',
    },
};
const requestedAssetTypeIds = new Set(
    (process.env.PRINTABLE_ASSET_FILTER || '').split(',').map((value) => value.trim()).filter(Boolean),
);
const VISUAL_ASSET_TYPE_IDS = PRINTABLE_ASSET_TYPES
    .map((asset) => asset.id)
    .filter(isPrintableAssetEditorRenderable)
    .filter((assetTypeId) => requestedAssetTypeIds.size === 0 || requestedAssetTypeIds.has(assetTypeId));

const baseInput = {
    brandColor: '#A52D24',
    businessCategory: 'food',
    businessType: 'Restaurant',
    contactAddress: '12 Museum Road, Bengaluru',
    contactEmail: 'hello@nilahouse.example',
    contactName: 'Nila House',
    contactPhone: '+91 80 4567 8900',
    contactRole: 'Owner',
    feedbackUrl: 'https://nila.example/feedback',
    flyerCampaign: {
        details: 'Available with selected bookings or purchases this month.',
        headline: 'A Special Thank You',
        offer: 'Enjoy a complimentary signature extra',
        terms: 'Selected offerings only. Advance booking may be required.',
        validUntil: 'Valid through 30 September 2026',
    },
    campaignContent: {
        details: 'A restorative botanical ritual prepared with aromatic oils.',
        headline: "Today's special",
        offer: 'Restorative Botanical Ritual',
    },
    lastPublishedAt: new Date('2026-08-30T08:00:00.000Z'),
    menuUrl: 'https://nila.example/menu',
    outputFormat: 'png',
    postcardContent: {
        headline: 'A note for our valued customers',
        message: 'Thank you for being part of our journey. We look forward to welcoming you again.',
    },
    projectId: 'craft-kitchen-visual-audit',
    shortLink: 'nila.example/menu',
    socialHandle: '@nilahouse',
    storeName: 'Nila House',
    tagline: 'Thoughtful work, beautifully delivered.',
    templateFamilyId: 'craft-kitchen',
} satisfies Omit<PrintableAssetRenderInput, 'assetTypeId'>;

async function imageDataUrl(filePath: string): Promise<string> {
    const bytes = await readFile(filePath);
    return `data:image/png;base64,${bytes.toString('base64')}`;
}

function toMenuListFixtureLink(value: string): string {
    return value.replace(/\.example(?=\/|$)/g, '.menulist.online');
}

async function main() {
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    const [cornerDataUrl, railDataUrl] = await Promise.all([
        imageDataUrl(CORNER_PATH),
        imageDataUrl(RAIL_PATH),
    ]);
    const pageDataUrls = new Map(
        await Promise.all(Object.entries(THEME_PAGE_PATHS).map(async ([themeId, publicPath]) => {
            const filePath = path.resolve(process.cwd(), `public${publicPath}`);
            return [themeId, await imageDataUrl(filePath)] as const;
        })),
    );
    const compactDataUrls = new Map(
        await Promise.all(Object.entries(THEME_COMPACT_PATHS).map(async ([themeId, publicPath]) => {
            const filePath = path.resolve(process.cwd(), `public${publicPath}`);
            return [themeId, await imageDataUrl(filePath)] as const;
        })),
    );
    const giftCertificateDataUrls = new Map(
        await Promise.all(PRINTABLE_THEME_FAMILY_IDS.map(async (themeId) => {
            const publicPath = getPrintableThemeArtworkPaths(themeId)?.giftCertificate;
            if (!publicPath) throw new Error(`${themeId} is missing its governed Gift Certificate overlay path`);
            const filePath = path.resolve(process.cwd(), `public${publicPath}`);
            return [themeId, { dataUrl: await imageDataUrl(filePath), publicPath }] as const;
        })),
    );

    let renderedOutputCount = 0;
    for (const themeId of VISUAL_THEME_IDS) {
        for (const assetTypeId of VISUAL_ASSET_TYPE_IDS satisfies PrintableAssetTypeId[]) {
            const themeInputOverrides = THEME_INPUT_OVERRIDES[themeId];
            const fixtureInput: PrintableAssetRenderInput = {
                ...baseInput,
                ...(SALON_BEAUTY_THEME_IDS.has(themeId) || SPA_THEME_IDS.has(themeId) ? {
                    businessCategory: SPA_THEME_IDS.has(themeId) ? 'health' : 'service',
                    businessType: SPA_THEME_IDS.has(themeId) ? 'Spa' : 'Salon',
                    contactName: SPA_THEME_IDS.has(themeId) ? 'Stillwater Ritual Spa' : 'Aster & Oak Studio',
                    menuUrl: SPA_THEME_IDS.has(themeId) ? 'https://stillwater.example/rituals' : 'https://aster-oak.example/services',
                    shortLink: SPA_THEME_IDS.has(themeId) ? 'stillwater.example/rituals' : 'aster-oak.example/services',
                    storeName: SPA_THEME_IDS.has(themeId) ? 'Stillwater Ritual Spa' : 'Aster & Oak Studio',
                } : {}),
                ...themeInputOverrides,
                ...(themeId === 'terracotta-glow' && assetTypeId === 'business_card' ? {
                    contactAddress: '18 Lavelle Road, Bengaluru',
                    contactEmail: 'hello@asteroak.studio',
                    contactName: 'Mira Shah',
                    contactPhone: '+91 98450 21840',
                    contactRole: 'Founder & Creative Director',
                    menuUrl: 'https://aster-oak-studio.menulist.online/services',
                    shortLink: 'aster-oak-studio.menulist.online/services',
                    socialHandle: '@asteroakstudio',
                } : {}),
                ...(assetTypeId === 'product_tag' ? {
                    menuUrl: 'https://aster-oak-studio.menulist.online/services?item=signature-botanical-oil',
                    productTagContent: {
                        detail: '50 ml · Small-batch botanical blend',
                        name: 'Signature Botanical Oil',
                        price: '₹1,290',
                    },
                    shortLink: 'aster-oak-studio.menulist.online/services?item=signature-botanical-oil',
                } : {}),
                ...(assetTypeId === 'staff_id_card' ? {
                    staffName: 'Mira Shah',
                    staffRole: 'Staff',
                } : {}),
                assetTypeId,
                projectId: `${themeId}-visual-audit`,
                templateFamilyId: themeId,
            };
            const documentValue = buildPrintableAssetEditorDocument({
                ...fixtureInput,
                feedbackUrl: fixtureInput.feedbackUrl ? toMenuListFixtureLink(fixtureInput.feedbackUrl) : undefined,
                menuUrl: toMenuListFixtureLink(fixtureInput.menuUrl),
                shortLink: toMenuListFixtureLink(fixtureInput.shortLink),
            });
            if (documentValue.elements.some((element) => (
                element.type === 'text'
                && element.name === 'Short link'
                && element.text.includes('.example')
            ))) {
                throw new Error(`${themeId}/${assetTypeId} exposed a reserved .example hostname`);
            }
            let svg = (await serializeCreativeDocumentToSvg(documentValue))
                .replaceAll('/images/printable-themes/craft-kitchen/culinary-corner.png', cornerDataUrl)
                .replaceAll('/images/printable-themes/craft-kitchen/culinary-rail.png', railDataUrl);
            const giftCertificateArtwork = giftCertificateDataUrls.get(themeId);
            if (giftCertificateArtwork) {
                svg = svg.replaceAll(giftCertificateArtwork.publicPath, giftCertificateArtwork.dataUrl);
            }
            const themePagePath = THEME_PAGE_PATHS[themeId];
            const themePageDataUrl = pageDataUrls.get(themeId);
            if (themePagePath && themePageDataUrl) {
                svg = svg.replaceAll(themePagePath, themePageDataUrl);
            }
            const themeCompactPath = THEME_COMPACT_PATHS[themeId];
            const themeCompactDataUrl = compactDataUrls.get(themeId);
            if (themeCompactPath && themeCompactDataUrl) {
                svg = svg.replaceAll(themeCompactPath, themeCompactDataUrl);
            }
            const outputPath = path.join(OUTPUT_DIRECTORY, `${themeId}-${assetTypeId}.png`);
            const outputInfo = await sharp(Buffer.from(svg))
                .resize({ width: Math.min(documentValue.canvas.width, 1_400), withoutEnlargement: true })
                .png({ compressionLevel: 9 })
                .toFile(outputPath);
            if (outputInfo.width <= 0 || outputInfo.height <= 0 || outputInfo.size < 10_000) {
                throw new Error(`${themeId}/${assetTypeId} produced an invalid visual fixture`);
            }
            renderedOutputCount += 1;
            process.stdout.write(`${themeId}/${assetTypeId} -> ${outputPath}\n`);
        }
    }
    const expectedOutputCount = VISUAL_THEME_IDS.length * VISUAL_ASSET_TYPE_IDS.length;
    if (renderedOutputCount !== expectedOutputCount) {
        throw new Error(`Expected ${expectedOutputCount} printable theme fixtures, rendered ${renderedOutputCount}`);
    }
    process.stdout.write(`Verified ${renderedOutputCount} printable theme fixtures (${VISUAL_THEME_IDS.length} themes x ${VISUAL_ASSET_TYPE_IDS.length} assets).\n`);
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
