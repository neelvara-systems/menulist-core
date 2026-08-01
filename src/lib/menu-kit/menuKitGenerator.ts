/**
 * Menu Kit Generator — Main Orchestrator
 *
 * Generates all Menu Kit assets in parallel, bundles into ZIP.
 * 100% client-side — zero Firebase cost.
 *
 * @see __docs__/menu-kit/menu-kit_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { shareBrowserFile, type BrowserFileShareResult } from '@lib/export/browserFileShare';
import JSZip from 'jszip';
import { loadLogo, PreloadedLogo } from './imageLoader';
import { generateCounterSticker } from './templates/counterStickerTemplate';
import { generateDeliveryBagSticker } from './templates/deliveryBagTemplate';
import { generateEntrancePoster, generateEntrancePosterImage } from './templates/entrancePosterTemplate';
import { generateGoogleMapsImage } from './templates/googleMapsTemplate';
import { generateInstagramStory } from './templates/instagramStoryTemplate';
import { generatePlacementGuide } from './templates/placementGuideTemplate';
import { generatePrintMenuSingleTableCard, generatePrintMenuSingleTableCardImage } from '../print-menu-surfaces/templates/singleTableCardTemplate';
import { generatePrintMenuTableTent, generatePrintMenuTableTentImage } from '../print-menu-surfaces/templates/tableTentTemplate';
import { generateTakeawayCard } from './templates/takeawayCardTemplate';
import { generateWhatsappStatus } from './templates/whatsappStatusTemplate';
import { getOfferingLabels } from './businessTypeLabels';
import {
    buildMenuKitUrl,
    buildPrintInstructions,
    MENU_KIT_UTM_SOURCES,
    MenuKitAsset,
    MenuKitInput,
    MenuKitResult,
    normalizeMenuKitInput,
    validateMenuUrl,
} from './types';

export const MENU_KIT_ASSET_KEYS = [
    'table_tent',
    'counter_sticker',
    'entrance_poster',
    'delivery_bag',
    'takeaway_card',
    'instagram_story',
    'whatsapp_status',
    'google_maps',
    'placement_guide',
    'single_table_card',
] as const;

export type MenuKitAssetKey = typeof MENU_KIT_ASSET_KEYS[number];

type PreparedMenuKitInput = MenuKitInput & { _logo: PreloadedLogo | null };

type MenuKitAssetDefinition = {
    generate: (input: PreparedMenuKitInput) => Promise<Blob>;
    generateImage?: (input: PreparedMenuKitInput) => Promise<Blob>;
    imageSuffix?: string;
    key: MenuKitAssetKey;
    label: string;
    mimeType: string;
    suffix: string;
    utmMedium?: string;
};

const MENU_KIT_ASSET_DEFINITIONS: MenuKitAssetDefinition[] = [
    {
        generate: generatePrintMenuTableTent,
        generateImage: generatePrintMenuTableTentImage,
        imageSuffix: 'TableTent_A5_Fold.png',
        key: 'table_tent',
        label: 'Table Tent (A5 fold)',
        mimeType: 'application/pdf',
        suffix: 'TableTent_A5_Fold.pdf',
        utmMedium: MENU_KIT_UTM_SOURCES.tableTent,
    },
    {
        generate: generateCounterSticker,
        key: 'counter_sticker',
        label: 'Counter Sticker (8×8 cm)',
        mimeType: 'image/png',
        suffix: 'CounterSticker_8x8.png',
        utmMedium: MENU_KIT_UTM_SOURCES.counterSticker,
    },
    {
        generate: generateEntrancePoster,
        generateImage: generateEntrancePosterImage,
        imageSuffix: 'EntrancePoster_A4.png',
        key: 'entrance_poster',
        label: 'Entrance Poster (A4)',
        mimeType: 'application/pdf',
        suffix: 'EntrancePoster_A4.pdf',
        utmMedium: MENU_KIT_UTM_SOURCES.entrancePoster,
    },
    {
        generate: generateDeliveryBagSticker,
        key: 'delivery_bag',
        label: 'Delivery Bag Sticker (6×6 cm)',
        mimeType: 'image/png',
        suffix: 'DeliveryBag_6x6.png',
        utmMedium: MENU_KIT_UTM_SOURCES.deliveryBag,
    },
    {
        generate: generateTakeawayCard,
        key: 'takeaway_card',
        label: 'Takeaway Card',
        mimeType: 'image/png',
        suffix: 'TakeawayCard_85x55.png',
        utmMedium: MENU_KIT_UTM_SOURCES.takeawayCard,
    },
    {
        generate: generateInstagramStory,
        key: 'instagram_story',
        label: 'Instagram Story',
        mimeType: 'image/png',
        suffix: 'InstagramStory.png',
        utmMedium: MENU_KIT_UTM_SOURCES.instagramStory,
    },
    {
        generate: generateWhatsappStatus,
        key: 'whatsapp_status',
        label: 'WhatsApp Status',
        mimeType: 'image/png',
        suffix: 'WhatsAppStatus.png',
        utmMedium: MENU_KIT_UTM_SOURCES.whatsappStatus,
    },
    {
        generate: generateGoogleMapsImage,
        key: 'google_maps',
        label: 'Google Maps Upload',
        mimeType: 'image/png',
        suffix: 'GoogleMaps.png',
        utmMedium: MENU_KIT_UTM_SOURCES.googleMaps,
    },
    {
        generate: generatePlacementGuide,
        key: 'placement_guide',
        label: 'Placement Guide',
        mimeType: 'image/png',
        suffix: 'PlacementGuide.png',
    },
    {
        generate: generatePrintMenuSingleTableCard,
        generateImage: generatePrintMenuSingleTableCardImage,
        imageSuffix: 'SingleTableCard_A6.png',
        key: 'single_table_card',
        label: 'Single Table / Counter Card (A6)',
        mimeType: 'application/pdf',
        suffix: 'SingleTableCard_A6.pdf',
        utmMedium: MENU_KIT_UTM_SOURCES.singleTableCard,
    },
];

/**
 * Build per-surface input with UTM-tagged menuUrl if flag is enabled.
 * Falls back to plain menuUrl when UTM tracking is disabled.
 */
function buildSurfaceInput(input: MenuKitInput, utmMedium: string): MenuKitInput {
    if (!FEATURE_FLAGS.ENABLE_MENU_KIT_UTM) return input;
    return { ...input, menuUrl: buildMenuKitUrl(input.menuUrl, utmMedium) };
}

function buildMenuKitFilenamePart(value: string, fallback: string, options?: { allowSeparators?: boolean }): string {
    const normalized = value
        .replace(options?.allowSeparators ? /[^a-zA-Z0-9\s._-]/g : /[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_');
    const cleaned = options?.allowSeparators
        ? normalized.replace(/[._-]{2,}/g, '_').replace(/^[._-]+|[._-]+$/g, '')
        : normalized;
    return cleaned || fallback;
}

export function buildMenuKitSafeName(storeName: string): string {
    return buildMenuKitFilenamePart(storeName, 'Menu');
}

export function buildMenuKitZipFilename(storeName: string, templateFamilyId?: string): string {
    const templateSuffix = templateFamilyId
        ? buildMenuKitFilenamePart(templateFamilyId, '', { allowSeparators: true })
        : '';
    return `${buildMenuKitSafeName(storeName)}_MenuKit${templateSuffix ? `_${templateSuffix}` : ''}.zip`;
}

async function prepareMenuKitInput(input: MenuKitInput): Promise<{
    enrichedInput: PreparedMenuKitInput;
    logo: PreloadedLogo | null;
    safeName: string;
}> {
    const normalizedInput = normalizeMenuKitInput(input);
    if (!normalizedInput) {
        if (!validateMenuUrl(input?.menuUrl)) {
            throw new Error('Invalid menu URL: must use HTTPS without embedded credentials');
        }
        throw new Error('Invalid Menu Kit input');
    }
    const validatedUrl = normalizedInput.menuUrl;
    if (!validatedUrl) {
        throw new Error('Invalid menu URL: must use HTTPS without embedded credentials');
    }

    const safeName = buildMenuKitSafeName(normalizedInput.storeName);

    // Pre-load logo image once, share across selected template(s).
    let logo: PreloadedLogo | null = null;
    if (normalizedInput.logoUrl) {
        logo = await loadLogo(normalizedInput.logoUrl);
    }

    return {
        enrichedInput: { ...normalizedInput, menuUrl: validatedUrl, _logo: logo },
        logo,
        safeName,
    };
}

function buildPreparedSurfaceInput(
    preparedInput: PreparedMenuKitInput,
    logo: PreloadedLogo | null,
    utmMedium?: string,
): PreparedMenuKitInput {
    const surfaceInput = utmMedium ? buildSurfaceInput(preparedInput, utmMedium) : preparedInput;
    return { ...surfaceInput, _logo: logo };
}

async function renderMenuKitAsset(
    definition: MenuKitAssetDefinition,
    prepared: {
        enrichedInput: PreparedMenuKitInput;
        logo: PreloadedLogo | null;
        safeName: string;
    },
    preferredOutputFormat?: 'pdf' | 'png',
): Promise<MenuKitAsset> {
    const assetInput = buildPreparedSurfaceInput(prepared.enrichedInput, prepared.logo, definition.utmMedium);
    const useNativeImage = preferredOutputFormat === 'png' && Boolean(definition.generateImage);
    const blob = await (useNativeImage && definition.generateImage
        ? definition.generateImage(assetInput)
        : definition.generate(assetInput));
    return {
        blob,
        filename: `${prepared.safeName}_${useNativeImage && definition.imageSuffix ? definition.imageSuffix : definition.suffix}`,
        label: definition.label,
        mimeType: useNativeImage ? 'image/png' : definition.mimeType,
    };
}

/**
 * Generate one Menu Kit asset without rendering the whole ZIP.
 */
export async function generateMenuKitAsset(
    input: MenuKitInput,
    assetKey: MenuKitAssetKey,
    options?: { outputFormat?: 'pdf' | 'png' },
): Promise<MenuKitAsset> {
    const definition = MENU_KIT_ASSET_DEFINITIONS.find((asset) => asset.key === assetKey);
    if (!definition) {
        throw new Error(`Unknown Menu Kit asset: ${assetKey}`);
    }

    const prepared = await prepareMenuKitInput(input);
    return renderMenuKitAsset(definition, prepared, options?.outputFormat);
}

/**
 * Generate complete Menu Kit with all assets + ZIP bundle
 */
export async function generateMenuKit(input: MenuKitInput): Promise<MenuKitResult> {
    const prepared = await prepareMenuKitInput(input);
    const labels = getOfferingLabels(
        prepared.enrichedInput.businessType,
        prepared.enrichedInput.businessCategory,
    );
    const assets = await Promise.all(
        MENU_KIT_ASSET_DEFINITIONS.map((definition) => renderMenuKitAsset(definition, prepared)),
    );

    // Bundle into ZIP
    const zip = new JSZip();
    for (const asset of assets) {
        zip.file(asset.filename, await asset.blob.arrayBuffer());
    }
    // Add print instructions text file for print shops
    zip.file('PRINT_INSTRUCTIONS.txt', buildPrintInstructions(prepared.enrichedInput.storeName, labels));
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return {
        assets,
        staffScript: labels.staffScript,
        zipBlob,
        zipFilename: buildMenuKitZipFilename(
            prepared.enrichedInput.storeName,
            prepared.enrichedInput.templateFamilyId,
        ),
    };
}

/**
 * Download a single blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Share a blob using Web Share API (mobile)
 * Distinguishes unsupported sharing from an owner-cancelled share.
 */
export async function shareBlob(
    blob: Blob,
    filename: string,
    title: string,
): Promise<BrowserFileShareResult> {
    return shareBrowserFile({ blob, filename, title });
}
