/**
 * Menu Kit Generator — Main Orchestrator
 *
 * Generates all Menu Kit assets in parallel, bundles into ZIP.
 * 100% client-side — zero Firebase cost.
 *
 * @see __docs__/menu-kit/menu-kit_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import JSZip from 'jszip';
import { loadLogo, PreloadedLogo } from './imageLoader';
import { generateCounterSticker } from './templates/counterStickerTemplate';
import { generateDeliveryBagSticker } from './templates/deliveryBagTemplate';
import { generateEntrancePoster } from './templates/entrancePosterTemplate';
import { generateGoogleMapsImage } from './templates/googleMapsTemplate';
import { generateInstagramStory } from './templates/instagramStoryTemplate';
import { generatePlacementGuide } from './templates/placementGuideTemplate';
import { generatePrintMenuSingleTableCard } from '../print-menu-surfaces/templates/singleTableCardTemplate';
import { generatePrintMenuTableTent } from '../print-menu-surfaces/templates/tableTentTemplate';
import { generateTakeawayCard } from './templates/takeawayCardTemplate';
import { generateWhatsappStatus } from './templates/whatsappStatusTemplate';
import { buildMenuKitUrl, buildPrintInstructions, MENU_KIT_UTM_SOURCES, MenuKitAsset, MenuKitInput, MenuKitResult, STAFF_SCRIPT, validateMenuUrl } from './types';

/**
 * Build per-surface input with UTM-tagged menuUrl if flag is enabled.
 * Falls back to plain menuUrl when UTM tracking is disabled.
 */
function buildSurfaceInput(input: MenuKitInput, utmMedium: string): MenuKitInput {
    if (!FEATURE_FLAGS.ENABLE_MENU_KIT_UTM) return input;
    return { ...input, menuUrl: buildMenuKitUrl(input.menuUrl, utmMedium) };
}

/**
 * Generate complete Menu Kit with all assets + ZIP bundle
 */
export async function generateMenuKit(input: MenuKitInput): Promise<MenuKitResult> {
    // Validate menu URL protocol before encoding into QR codes
    const validatedUrl = validateMenuUrl(input.menuUrl);
    if (!validatedUrl) {
        throw new Error('Invalid menu URL: must use http:// or https:// protocol');
    }

    const safeName = input.storeName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_') || 'Menu';

    // Pre-load logo image once, share across all templates (avoids N redundant fetches)
    let logo: PreloadedLogo | null = null;
    if (input.logoUrl) {
        logo = await loadLogo(input.logoUrl);
    }

    // Enrich input with pre-loaded logo for templates
    const enrichedInput = { ...input, _logo: logo } as MenuKitInput & { _logo: PreloadedLogo | null };

    // Generate all assets in parallel for speed
    // Each asset gets a UTM-tagged URL so scans can be attributed to the placement surface
    const buildInput = (utmMedium: string) => {
        const surfaceInput = buildSurfaceInput(enrichedInput, utmMedium);
        return { ...surfaceInput, _logo: logo } as MenuKitInput & { _logo: PreloadedLogo | null };
    };

    const [tentCard, sticker, entrancePoster, deliveryBag, takeawayCard, igStory, waStatus, gmImage, guide, singleTableCard] = await Promise.all([
        generatePrintMenuTableTent(buildInput(MENU_KIT_UTM_SOURCES.tableTent)),
        generateCounterSticker(buildInput(MENU_KIT_UTM_SOURCES.counterSticker)),
        generateEntrancePoster(buildInput(MENU_KIT_UTM_SOURCES.entrancePoster)),
        generateDeliveryBagSticker(buildInput(MENU_KIT_UTM_SOURCES.deliveryBag)),
        generateTakeawayCard(buildInput(MENU_KIT_UTM_SOURCES.takeawayCard)),
        generateInstagramStory(buildInput(MENU_KIT_UTM_SOURCES.instagramStory)),
        generateWhatsappStatus(buildInput(MENU_KIT_UTM_SOURCES.whatsappStatus)),
        generateGoogleMapsImage(buildInput(MENU_KIT_UTM_SOURCES.googleMaps)),
        generatePlacementGuide(enrichedInput), // Placement guide has no QR — no UTM needed
        generatePrintMenuSingleTableCard(buildInput(MENU_KIT_UTM_SOURCES.singleTableCard)),
    ]);

    const assets: MenuKitAsset[] = [
        { filename: `${safeName}_TableTent_A5_Fold.pdf`, blob: tentCard, mimeType: 'application/pdf', label: 'Table Tent (A5 fold)' },
        { filename: `${safeName}_CounterSticker_8x8.png`, blob: sticker, mimeType: 'image/png', label: 'Counter Sticker (8×8 cm)' },
        { filename: `${safeName}_EntrancePoster_A4.pdf`, blob: entrancePoster, mimeType: 'application/pdf', label: 'Entrance Poster (A4)' },
        { filename: `${safeName}_DeliveryBag_6x6.png`, blob: deliveryBag, mimeType: 'image/png', label: 'Delivery Bag Sticker (6×6 cm)' },
        { filename: `${safeName}_TakeawayCard_85x55.png`, blob: takeawayCard, mimeType: 'image/png', label: 'Takeaway Card' },
        { filename: `${safeName}_InstagramStory.png`, blob: igStory, mimeType: 'image/png', label: 'Instagram Story' },
        { filename: `${safeName}_WhatsAppStatus.png`, blob: waStatus, mimeType: 'image/png', label: 'WhatsApp Status' },
        { filename: `${safeName}_GoogleMaps.png`, blob: gmImage, mimeType: 'image/png', label: 'Google Maps Upload' },
        { filename: `${safeName}_PlacementGuide.png`, blob: guide, mimeType: 'image/png', label: 'Placement Guide' },
        { filename: `${safeName}_SingleTableCard_A6.pdf`, blob: singleTableCard, mimeType: 'application/pdf', label: 'Single Table / Counter Card (A6)' },
    ];

    // Bundle into ZIP
    const zip = new JSZip();
    for (const asset of assets) {
        zip.file(asset.filename, await asset.blob.arrayBuffer());
    }
    // Add print instructions text file for print shops
    zip.file('PRINT_INSTRUCTIONS.txt', buildPrintInstructions(input.storeName));
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return { assets, staffScript: STAFF_SCRIPT, zipBlob };
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
 * Returns true if shared successfully, false if not supported
 */
export async function shareBlob(blob: Blob, filename: string, title: string): Promise<boolean> {
    if (!navigator.share || !navigator.canShare) return false;

    try {
        const file = new File([blob], filename, { type: blob.type });
        const shareData: ShareData = { files: [file], title };

        if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return true;
        }
    } catch {
        // User cancelled or share failed — not an error
    }

    return false;
}
