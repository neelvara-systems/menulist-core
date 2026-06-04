/**
 * Central catalog for owner-facing printable assets.
 *
 * Menu Kit still generates the actual blobs. This catalog owns the stable
 * dashboard/mobile IDs, grouping, copy, and Menu Kit asset index mapping.
 *
 * @see __docs__/print-assets/print-assets_impl.md
 */

import type { MenuKitAssetKey } from '@lib/menu-kit/menuKitGenerator';

export type PrintAssetPlacement =
    | 'tables'
    | 'counter'
    | 'entrance'
    | 'feedback'
    | 'full-menu'
    | 'bundle';

export type MenuKitPrintAssetId =
    | 'table_tent'
    | 'single_table_card'
    | 'counter_sticker'
    | 'entrance_poster';

export type PrintAssetId =
    | MenuKitPrintAssetId
    | 'feedback_qr'
    | 'print_menu'
    | 'complete_menu_kit';

export type PrintAssetCatalogItem = {
    description: string;
    id: PrintAssetId;
    menuKitAssetKey?: MenuKitAssetKey;
    menuKitAssetIndex?: number;
    placement: PrintAssetPlacement;
    size: string;
    title: string;
};

export const PRINT_ASSET_MENU_KIT_INDEX: Record<MenuKitPrintAssetId, number> = {
    table_tent: 0,
    single_table_card: 9,
    counter_sticker: 1,
    entrance_poster: 2,
};

export const PRINT_ASSET_CATALOG: PrintAssetCatalogItem[] = [
    {
        description: 'Fold and place at the center of each table.',
        id: 'table_tent',
        menuKitAssetKey: 'table_tent',
        menuKitAssetIndex: PRINT_ASSET_MENU_KIT_INDEX.table_tent,
        placement: 'tables',
        size: 'A5 fold, two A6 faces',
        title: 'Table Tent',
    },
    {
        description: 'Use in acrylic holders, wall clips, or counter stands.',
        id: 'single_table_card',
        menuKitAssetKey: 'single_table_card',
        menuKitAssetIndex: PRINT_ASSET_MENU_KIT_INDEX.single_table_card,
        placement: 'tables',
        size: 'A6 portrait',
        title: 'Single Table Card',
    },
    {
        description: 'Place near billing, pickup, or service counter.',
        id: 'counter_sticker',
        menuKitAssetKey: 'counter_sticker',
        menuKitAssetIndex: PRINT_ASSET_MENU_KIT_INDEX.counter_sticker,
        placement: 'counter',
        size: '8 x 8 cm',
        title: 'Counter Sticker',
    },
    {
        description: 'Place on the door, window, or host stand.',
        id: 'entrance_poster',
        menuKitAssetKey: 'entrance_poster',
        menuKitAssetIndex: PRINT_ASSET_MENU_KIT_INDEX.entrance_poster,
        placement: 'entrance',
        size: 'A4 portrait',
        title: 'Entrance Poster',
    },
    {
        description: 'Use near exit or counter when feedback is enabled.',
        id: 'feedback_qr',
        placement: 'feedback',
        size: 'QR card',
        title: 'Feedback QR',
    },
    {
        description: 'Create the full printable menu PDF or print-shop packet.',
        id: 'print_menu',
        placement: 'full-menu',
        size: 'PDF',
        title: 'Print Menu',
    },
    {
        description: 'Download every print, social, and placement file together.',
        id: 'complete_menu_kit',
        placement: 'bundle',
        size: 'ZIP bundle',
        title: 'Complete Menu Kit',
    },
];

export const PRINT_ASSET_GROUPS: Array<{
    description: string;
    id: PrintAssetPlacement;
    title: string;
}> = [
    {
        description: 'Customer scan points placed on or near each table.',
        id: 'tables',
        title: 'Tables',
    },
    {
        description: 'Files customers see while paying, picking up, or waiting.',
        id: 'counter',
        title: 'Counter',
    },
    {
        description: 'Files for doors, windows, and walk-in discovery.',
        id: 'entrance',
        title: 'Entrance',
    },
    {
        description: 'Private customer feedback scan point.',
        id: 'feedback',
        title: 'Feedback',
    },
    {
        description: 'Full printable menu output.',
        id: 'full-menu',
        title: 'Full Menu',
    },
    {
        description: 'Everything in one download.',
        id: 'bundle',
        title: 'Bundle',
    },
];

export function getPrintAssetById(id: PrintAssetId): PrintAssetCatalogItem | undefined {
    return PRINT_ASSET_CATALOG.find((asset) => asset.id === id);
}
