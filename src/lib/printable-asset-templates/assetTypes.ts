import type { PrintableAssetType, PrintableAssetTypeId } from './types';

export const PRINTABLE_ASSET_TYPES: PrintableAssetType[] = [
    {
        defaultTemplateId: 'classic-luxe',
        description: 'Full paper file for in-house printing or print shops.',
        id: 'print_menu',
        outputFormat: 'pdf',
        placement: 'full-menu',
        requiresMenuItems: true,
        size: 'PDF',
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
        title: 'Feedback QR',
    },
    {
        defaultTemplateId: 'modern-calm',
        description: 'All print and social files in one download.',
        id: 'complete_menu_kit',
        outputFormat: 'zip',
        placement: 'bundle',
        size: 'ZIP',
        title: 'Complete Menu Kit',
    },
];

export function getPrintableAssetType(id?: string | null): PrintableAssetType {
    return PRINTABLE_ASSET_TYPES.find((asset) => asset.id === id) || PRINTABLE_ASSET_TYPES[1];
}

export function isPrintableAssetTypeId(value?: string | null): value is PrintableAssetTypeId {
    return PRINTABLE_ASSET_TYPES.some((asset) => asset.id === value);
}
