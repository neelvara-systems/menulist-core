import type { MenuCardDensity, MenuCardExportPreset, MenuCardExportSettings, MenuCardOrientation, MenuCardPaperSize } from '../models/exportTypes';

export type MenuCardPresetConfig = {
    id: MenuCardExportPreset;
    label: string;
    description: string;
    defaultPaperSize: MenuCardPaperSize;
    defaultOrientation: MenuCardOrientation;
    defaultDensity: MenuCardDensity;
    includeQr: boolean;
    includeDescriptions: boolean;
    includeContactBlock: boolean;
    exposed: boolean;
};

export const menuCardPresetRegistry: MenuCardPresetConfig[] = [
    {
        id: 'home_print',
        label: 'Home Print',
        description: 'Printer-friendly PDF for quick in-house printing.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'balanced',
        includeQr: true,
        includeDescriptions: true,
        includeContactBlock: true,
        exposed: true,
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp PDF',
        description: 'Phone-readable PDF for sharing.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'comfortable',
        includeQr: true,
        includeDescriptions: false,
        includeContactBlock: true,
        exposed: true,
    },
    {
        id: 'print_shop_packet',
        label: 'Print-shop packet',
        description: 'PDF plus print notes and QR checklist.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'balanced',
        includeQr: true,
        includeDescriptions: true,
        includeContactBlock: true,
        exposed: true,
    },
    {
        id: 'table_menu',
        label: 'Table Menu',
        description: 'Dine-in menu with QR back to current menu.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'balanced',
        includeQr: true,
        includeDescriptions: true,
        includeContactBlock: true,
        exposed: true,
    },
    {
        id: 'takeaway_insert',
        label: 'Takeaway insert',
        description: 'Small menu insert with a prominent link back to the live menu.',
        defaultPaperSize: 'a5',
        defaultOrientation: 'portrait',
        defaultDensity: 'compact',
        includeQr: true,
        includeDescriptions: false,
        includeContactBlock: true,
        exposed: false,
    },
    {
        id: 'staff_reference',
        label: 'Staff reference',
        description: 'Compact current menu reference for staff use.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'compact',
        includeQr: false,
        includeDescriptions: false,
        includeContactBlock: false,
        exposed: false,
    },
    {
        id: 'multi_location_batch',
        label: 'Multi-location batch',
        description: 'Consistent print files generated for approved outlet menus.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'balanced',
        includeQr: true,
        includeDescriptions: true,
        includeContactBlock: true,
        exposed: false,
    },
    {
        id: 'page_images',
        label: 'Page images',
        description: 'Menu pages prepared as shareable images.',
        defaultPaperSize: 'a4',
        defaultOrientation: 'portrait',
        defaultDensity: 'balanced',
        includeQr: true,
        includeDescriptions: true,
        includeContactBlock: true,
        exposed: false,
    },
    {
        id: 'qr_insert',
        label: 'QR insert',
        description: 'Small print card that points to the current live menu.',
        defaultPaperSize: 'a5',
        defaultOrientation: 'portrait',
        defaultDensity: 'compact',
        includeQr: true,
        includeDescriptions: false,
        includeContactBlock: false,
        exposed: false,
    },
];

export function getMenuCardPreset(id: MenuCardExportPreset): MenuCardPresetConfig {
    return menuCardPresetRegistry.find((preset) => preset.id === id) || menuCardPresetRegistry[0];
}

export function buildDefaultSettings(presetId: MenuCardExportPreset, styleId = 'classic'): MenuCardExportSettings {
    const preset = getMenuCardPreset(presetId);
    return {
        preset: preset.id,
        paperSize: preset.defaultPaperSize,
        orientation: preset.defaultOrientation,
        density: preset.defaultDensity,
        styleId,
        includeLogo: true,
        includeDescriptions: preset.includeDescriptions,
        includePhotos: false,
        includeQr: preset.includeQr,
        includeContactBlock: preset.includeContactBlock,
        includeUpdatedDate: true,
    };
}
