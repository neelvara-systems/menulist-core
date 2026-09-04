import type { PrintableAssetType, PrintableAssetTypeId } from './types';

type PrintableAssetPreviewLabels = {
    offeringUpper: string;
    printCardTitle: string;
    scanForUpper: string;
    scanToView: string;
};

export const PRINTABLE_ASSET_TYPES: PrintableAssetType[] = [
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Full paper file for in-house printing or print shops.',
        id: 'print_menu',
        outputFormat: 'pdf',
        placement: 'full-menu',
        requiresMenuItems: true,
        size: 'PDF',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Print Menu',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Folded display for table centers, readable from both sides.',
        id: 'table_tent',
        menuKitAssetKey: 'table_tent',
        outputFormat: 'pdf',
        placement: 'tables',
        size: 'A5 fold',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Table Tent',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Upright card for acrylic holders, counters, and wall clips.',
        id: 'single_table_card',
        menuKitAssetKey: 'single_table_card',
        outputFormat: 'pdf',
        placement: 'tables',
        size: 'A6 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Single Table Card',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Sticker for billing, pickup, reception, or service counters.',
        id: 'counter_sticker',
        menuKitAssetKey: 'counter_sticker',
        outputFormat: 'png',
        placement: 'counter',
        size: '8 x 8 cm',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Counter Sticker',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Door, window, entrance, or host-stand poster.',
        id: 'entrance_poster',
        menuKitAssetKey: 'entrance_poster',
        outputFormat: 'pdf',
        placement: 'entrance',
        size: 'A4 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Entrance Poster',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Private feedback QR for exits, counters, or receipts.',
        id: 'feedback_qr',
        outputFormat: 'png',
        placement: 'feedback',
        requiresFeedback: true,
        size: 'PNG card',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Feedback QR',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Offer, launch, event, or delivery insert.',
        id: 'campaign_flyer',
        outputFormat: 'pdf',
        placement: 'promotion',
        size: 'A5 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Flyer',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Voucher for gifts, credits, or prepaid offers.',
        id: 'gift_certificate',
        outputFormat: 'pdf',
        placement: 'gift',
        size: 'Gift card',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Gift Certificate',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Front and back card; PDF stays paired, image download gives both sides.',
        id: 'business_card',
        outputFormat: 'pdf',
        placement: 'identity',
        size: '2 x 90 x 55 mm',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Business Card',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Portrait staff or owner name badge with a premium initials monogram.',
        id: 'staff_id_card',
        outputFormat: 'pdf',
        placement: 'identity',
        size: '54 x 85 mm',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Staff Name Badge',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Invite card for events, openings, workshops, or specials.',
        id: 'event_invitation',
        outputFormat: 'pdf',
        placement: 'event',
        size: 'A6 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Invitation',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Small mailer-style card for offers, thanks, and reminders.',
        id: 'postcard',
        outputFormat: 'pdf',
        placement: 'postcard',
        size: 'A6 landscape',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Postcard',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Small tag for retail, bakery, pickup, or counter items.',
        id: 'product_tag',
        outputFormat: 'pdf',
        placement: 'retail',
        size: '90 x 50 mm',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Product Tag',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'Offer poster for windows, counters, and local campaigns.',
        id: 'campaign_poster',
        outputFormat: 'pdf',
        placement: 'promotion',
        size: 'A4 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Campaign Poster',
    },
    {
        defaultTemplateId: 'botanical-heritage',
        description: 'All print and social files in one download.',
        id: 'complete_menu_kit',
        outputFormat: 'zip',
        placement: 'bundle',
        size: 'ZIP',
        supportedOutputFormats: ['zip'],
        title: 'Complete Menu Kit',
    },
];

/**
 * Assets that owners can start without first selecting a menu item.
 * Product Tag remains a first-class renderable asset, but its owner entry
 * point lives beside the source item so its name, description, price, and
 * direct link always come from real project data.
 */
export const PRINTABLE_ASSET_CATALOG_TYPES: PrintableAssetType[] = PRINTABLE_ASSET_TYPES.filter(
    (asset) => asset.id !== 'product_tag',
);

export const PRINTABLE_BRAND_KIT_PREVIEW_ASSET_IDS: readonly PrintableAssetTypeId[] = Object.freeze([
    'print_menu',
    'table_tent',
    'feedback_qr',
    'entrance_poster',
    'gift_certificate',
    'business_card',
]);

export function getPrintableAssetType(id?: string | null): PrintableAssetType {
    return PRINTABLE_ASSET_TYPES.find((asset) => asset.id === id) || PRINTABLE_ASSET_TYPES[1];
}

export function isPrintableAssetTypeId(value?: string | null): value is PrintableAssetTypeId {
    return PRINTABLE_ASSET_TYPES.some((asset) => asset.id === value);
}

export function getPrintableAssetPreviewCopy(
    assetTypeId: PrintableAssetTypeId,
    labels: PrintableAssetPreviewLabels,
): { actionLabel: string; instructionLabel: string } {
    switch (assetTypeId) {
        case 'feedback_qr':
            return { actionLabel: 'Feedback QR', instructionLabel: 'Scan to leave feedback' };
        case 'counter_sticker':
            return { actionLabel: labels.scanForUpper, instructionLabel: labels.scanToView };
        case 'campaign_flyer':
            return { actionLabel: 'WEEKEND OFFER', instructionLabel: 'Scan for details' };
        case 'gift_certificate':
            return { actionLabel: 'GIFT CERTIFICATE', instructionLabel: 'Add gift details before download' };
        case 'business_card':
            return { actionLabel: 'CONTACT CARD', instructionLabel: 'PDF paired, image split' };
        case 'staff_id_card':
            return { actionLabel: 'STAFF BADGE', instructionLabel: 'Owner or staff name badge' };
        case 'event_invitation':
            return { actionLabel: 'YOU ARE INVITED', instructionLabel: 'Add or handwrite event details' };
        case 'postcard':
            return { actionLabel: 'THANK YOU', instructionLabel: 'Scan for your latest' };
        case 'product_tag':
            return { actionLabel: 'NEW ITEM', instructionLabel: 'Scan for details' };
        case 'campaign_poster':
            return { actionLabel: "TODAY'S SPECIAL", instructionLabel: 'Scan for offer' };
        default:
            return { actionLabel: labels.printCardTitle, instructionLabel: labels.scanToView };
    }
}
