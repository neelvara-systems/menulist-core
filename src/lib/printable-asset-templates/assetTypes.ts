import type { PrintableAssetType, PrintableAssetTypeId } from './types';

type PrintableAssetPreviewLabels = {
    offeringUpper: string;
    printCardTitle: string;
    scanForUpper: string;
    scanToView: string;
};

export const PRINTABLE_ASSET_TYPES: PrintableAssetType[] = [
    {
        defaultTemplateId: 'classic-luxe',
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
        defaultTemplateId: 'classic-luxe',
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
        defaultTemplateId: 'modern-calm',
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
        defaultTemplateId: 'qr-first',
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
        defaultTemplateId: 'brand-banner',
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
        defaultTemplateId: 'soft-curve',
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
        defaultTemplateId: 'local-bold',
        description: 'Offer, launch, event, or delivery insert.',
        id: 'campaign_flyer',
        outputFormat: 'pdf',
        placement: 'promotion',
        size: 'A5 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Flyer',
    },
    {
        defaultTemplateId: 'classic-luxe',
        description: 'Voucher for gifts, credits, or prepaid offers.',
        id: 'gift_certificate',
        outputFormat: 'pdf',
        placement: 'gift',
        size: 'Gift card',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Gift Certificate',
    },
    {
        defaultTemplateId: 'modern-calm',
        description: 'Contact or QR card for counters, bags, and appointments.',
        id: 'business_card',
        outputFormat: 'pdf',
        placement: 'identity',
        size: '90 x 55 mm',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Business Card',
    },
    {
        defaultTemplateId: 'soft-curve',
        description: 'Invite card for events, openings, workshops, or specials.',
        id: 'event_invitation',
        outputFormat: 'pdf',
        placement: 'event',
        size: 'A6 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Invitation',
    },
    {
        defaultTemplateId: 'classic-luxe',
        description: 'Small mailer-style card for offers, thanks, and reminders.',
        id: 'postcard',
        outputFormat: 'pdf',
        placement: 'postcard',
        size: 'A6 landscape',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Postcard',
    },
    {
        defaultTemplateId: 'clean-utility',
        description: 'Small tag for retail, bakery, pickup, or counter items.',
        id: 'product_tag',
        outputFormat: 'pdf',
        placement: 'retail',
        size: '90 x 50 mm',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Product Tag',
    },
    {
        defaultTemplateId: 'brand-banner',
        description: 'Offer poster for windows, counters, and local campaigns.',
        id: 'campaign_poster',
        outputFormat: 'pdf',
        placement: 'promotion',
        size: 'A4 portrait',
        supportedOutputFormats: ['pdf', 'png'],
        title: 'Campaign Poster',
    },
    {
        defaultTemplateId: 'modern-calm',
        description: 'All print and social files in one download.',
        id: 'complete_menu_kit',
        outputFormat: 'zip',
        placement: 'bundle',
        size: 'ZIP',
        supportedOutputFormats: ['zip'],
        title: 'Complete Menu Kit',
    },
];

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
            return { actionLabel: 'GIFT CERTIFICATE', instructionLabel: 'Scan to redeem' };
        case 'business_card':
            return { actionLabel: 'CONTACT CARD', instructionLabel: `Scan for ${labels.offeringUpper}` };
        case 'event_invitation':
            return { actionLabel: 'YOU ARE INVITED', instructionLabel: 'Scan for details' };
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
