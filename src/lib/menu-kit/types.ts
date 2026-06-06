/**
 * Menu Kit Types
 *
 * Types for the auto-generated "Launch Pack" of print-ready
 * and social-ready assets owners receive when their menu is published.
 *
 * @see __docs__/menu-kit/menu-kit_spec.md
 */

import type { OfferingLabels } from './businessTypeLabels';

export interface MenuKitInput {
    storeName: string;
    menuUrl: string;           // Full URL: {subdomain}.menulist.ai/{slug}
    shortLink: string;         // Display-friendly: menulist.ai/{slug}
    logoUrl?: string;          // Optional store logo
    brandColor?: string;       // Store/OBP accent color for print/social surfaces
    lastPublishedAt?: Date;    // For "Updated on" footer
    businessType?: string;     // Store businessType for category-aware labels
    businessCategory?: string; // Broad category when businessType is generic
    activePlanType?: string | null; // Premium hides MenuList attribution; missing/non-premium keeps it visible
    locale?: string;           // BCP 47 locale (e.g., 'en-US', 'hi-IN') for surface copy translation
    templateFamilyId?: string; // Printable Asset Templates style family
}

export interface MenuKitAsset {
    filename: string;
    blob: Blob;
    mimeType: string;
    /** Human-readable label for UI */
    label: string;
}

export interface MenuKitResult {
    assets: MenuKitAsset[];
    staffScript: string;       // Text only, not a file
    zipBlob: Blob;
}

export const STAFF_SCRIPT = 'Menu? Please scan the QR on the table or at the counter.';

/**
 * UTM source identifiers for each Menu Kit asset.
 * Appended to QR-encoded URLs so analytics can distinguish
 * which physical/digital placement drives the most scans.
 *
 * Example: menulist.ai/slug?utm_source=menu_kit&utm_medium=table_tent
 */
export const MENU_KIT_UTM_SOURCES: Record<string, string> = {
    tableTent: 'table_tent',
    singleTableCard: 'single_table_card',
    counterSticker: 'counter_sticker',
    entrancePoster: 'entrance_poster',
    deliveryBag: 'delivery_bag',
    takeawayCard: 'takeaway_card',
    instagramStory: 'instagram_story',
    whatsappStatus: 'whatsapp_status',
    googleMaps: 'google_maps',
} as const;

/**
 * Append UTM parameters to a menu URL for placement-level scan tracking.
 * Returns the original URL if utm_medium is not provided.
 */
export function buildMenuKitUrl(menuUrl: string, utmMedium: string): string {
    try {
        const url = new URL(menuUrl);
        url.searchParams.set('utm_source', 'menu_kit');
        url.searchParams.set('utm_medium', utmMedium);
        return url.toString();
    } catch {
        // Fallback: append manually if URL parsing fails (e.g., relative URLs)
        const separator = menuUrl.includes('?') ? '&' : '?';
        return `${menuUrl}${separator}utm_source=menu_kit&utm_medium=${utmMedium}`;
    }
}

/**
 * Validate that a menu URL uses HTTPS protocol before encoding into QR.
 * Returns the URL unchanged if valid, or null if invalid.
 * Prevents malicious protocol injection into printed QR codes.
 */
export function validateMenuUrl(url: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
        return url;
    } catch {
        return null;
    }
}

export function buildPrintInstructions(
    storeName: string,
    labels?: Pick<OfferingLabels, 'offeringTitle' | 'offeringLower' | 'staffScript'>,
): string {
    const offeringTitle = labels?.offeringTitle || 'Menu';
    const offeringLower = labels?.offeringLower || 'menu';
    const staffScript = labels?.staffScript || STAFF_SCRIPT;

    return `MENU KIT - PRINT INSTRUCTIONS
${storeName}
${'='.repeat(40)}

Customer-facing page: ${offeringTitle}
Staff line: "${staffScript}"

1. TABLE CARD
   Size: A5 landscape sheet, folds into two A6 portrait faces
   Material: 300 GSM card
   Finish: Matte recommended
   Quantity: 1 per table + 20% extra
   Use: Fold down the center and place upright at the center of each table

2. SINGLE TABLE / COUNTER CARD
   Size: A6 portrait (105mm x 148mm)
   Material: 300 GSM card
   Finish: Matte recommended
   Quantity: 1 per table/counter stand + 20% extra
   Use: Place flat in acrylic holders, counter stands, wall clips, or table stands

3. COUNTER STICKER
   Size: 80mm x 80mm
   Material: Vinyl sticker
   Finish: Matte preferred (avoids glare)
   Quantity: 1
   Use: Place near payment, pickup, reception, or service counter

4. ENTRANCE POSTER
   Size: A4 (210mm x 297mm)
   Material: 200–300 GSM card
   Finish: Matte recommended
   Quantity: 1
   Use: Place at the entrance, window, reception, or host stand

5. DELIVERY BAG STICKER
   Size: 60mm x 60mm
   Material: Vinyl sticker
   Finish: Matte preferred
   Quantity: 1 roll (50–100 stickers)
   Use: Stick on delivery bags/boxes

6. TAKEAWAY CARD
   Size: 85mm x 55mm (business card)
   Material: 250–300 GSM card
   Finish: Matte recommended
   Quantity: 50–100 cards
   Use: Drop into takeaway bags/boxes

TIPS:
- Matte finish prevents reflection when scanning
- Replace damaged QR cards immediately
- Test the QR from customer areas before service
- The QR always opens the latest ${offeringLower}; reprint only when the link, logo, or physical card condition changes
`;
}
