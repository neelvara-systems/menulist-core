/**
 * Central catalog for owner-facing printable assets.
 *
 * Menu Kit still generates the actual blobs. This catalog owns the stable
 * dashboard/mobile IDs, grouping, copy, and Menu Kit asset index mapping.
 *
 * @see __docs__/print-assets/print-assets_impl.md
 */

import { PRINTABLE_ASSET_TYPES } from '@lib/printable-asset-templates/assetTypes';
import type {
    PrintableAssetType,
    PrintableAssetTypeId,
} from '@lib/printable-asset-templates/types';

export type PrintAssetPlacement = PrintableAssetType['placement'];

export type MenuKitPrintAssetId =
    | 'table_tent'
    | 'single_table_card'
    | 'counter_sticker'
    | 'entrance_poster';

export type PrintAssetId = PrintableAssetTypeId;

export type PrintAssetCatalogItem = {
    description: string;
    id: PrintAssetId;
    menuKitAssetKey?: PrintableAssetType['menuKitAssetKey'];
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

const isMenuKitPrintAssetId = (value: PrintAssetId): value is MenuKitPrintAssetId => (
    Object.prototype.hasOwnProperty.call(PRINT_ASSET_MENU_KIT_INDEX, value)
);

export const PRINT_ASSET_CATALOG: PrintAssetCatalogItem[] = PRINTABLE_ASSET_TYPES.map((asset) => ({
    description: asset.description,
    id: asset.id,
    ...(asset.menuKitAssetKey && isMenuKitPrintAssetId(asset.id) ? {
        menuKitAssetIndex: PRINT_ASSET_MENU_KIT_INDEX[asset.id],
        menuKitAssetKey: asset.menuKitAssetKey,
    } : {}),
    placement: asset.placement,
    size: asset.size,
    title: asset.title,
}));

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
        description: 'Flyers and posters for offers, launches, and local campaigns.',
        id: 'promotion',
        title: 'Promotion',
    },
    {
        description: 'Voucher-style files for gifts, credit, or prepaid offers.',
        id: 'gift',
        title: 'Gift',
    },
    {
        description: 'Business cards, ID cards, and quick identity handoffs.',
        id: 'identity',
        title: 'Identity',
    },
    {
        description: 'Invitation cards for events, openings, and workshops.',
        id: 'event',
        title: 'Event',
    },
    {
        description: 'Mailer-style cards for reminders, thanks, and small campaigns.',
        id: 'postcard',
        title: 'Postcard',
    },
    {
        description: 'Small item tags for retail, pickup, bakery, or counter products.',
        id: 'retail',
        title: 'Retail',
    },
    {
        description: 'Everything in one download.',
        id: 'bundle',
        title: 'Bundle',
    },
];

export function getPrintAssetById(id: unknown): PrintAssetCatalogItem | undefined {
    return PRINT_ASSET_CATALOG.find((asset) => asset.id === id);
}
