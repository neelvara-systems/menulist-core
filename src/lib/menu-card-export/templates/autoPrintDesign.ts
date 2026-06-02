import type { MenuCardExportPreset, MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { buildDefaultSettings } from '../presets/presetRegistry';
import { resolveMenuCardBusinessPrintProfile } from './businessPrintProfiles';

export type MenuCardAutoPrintDesign = {
    settings: MenuCardExportSettings;
    label: string;
    reason: string;
};

function getMenuShape(source: MenuCardPrintSource) {
    const categoryCount = source.menu.categories.length;
    const itemCount = source.menu.categories.reduce((total, category) => total + category.items.length, 0);
    const descriptionCount = source.menu.categories.reduce(
        (total, category) => total + category.items.filter((item) => !!item.description).length,
        0,
    );
    const descriptionRatio = itemCount > 0 ? descriptionCount / itemCount : 0;

    return {
        categoryCount,
        descriptionCount,
        descriptionRatio,
        itemCount,
        isDense: itemCount >= 42 || categoryCount >= 8 || (source.flags.hasVariants && itemCount >= 24),
        isShort: itemCount > 0 && itemCount <= 18,
    };
}

export function resolveAutoPrintDesign(
    source: MenuCardPrintSource,
    preset: MenuCardExportPreset = 'home_print',
): MenuCardAutoPrintDesign {
    const profile = resolveMenuCardBusinessPrintProfile({
        businessCategory: source.business.businessCategory,
        catalogKind: source.business.catalogKind,
        offeringKind: source.business.offeringKind,
    });
    const shape = getMenuShape(source);

    let styleId = 'classic';
    let density: MenuCardExportSettings['density'] = 'balanced';
    let includeDescriptions = source.flags.hasDescriptions && shape.descriptionRatio >= 0.18;
    let reason = 'Picked a balanced print layout from your current content.';

    if (profile.tone === 'product-catalog') {
        styleId = 'compact';
        density = shape.itemCount > 24 ? 'compact' : 'balanced';
        includeDescriptions = source.flags.hasDescriptions && shape.itemCount <= 32;
        reason = shape.itemCount > 24
            ? 'Picked a compact catalog layout so products and prices stay easy to scan.'
            : 'Picked a catalog layout that keeps products, prices, and QR handoff clear.';
    } else if (profile.tone === 'service-list' || profile.tone === 'professional-guide' || profile.tone === 'wellness-list') {
        styleId = shape.isDense ? 'compact' : 'premium';
        density = shape.isDense ? 'compact' : shape.isShort ? 'comfortable' : 'balanced';
        includeDescriptions = source.flags.hasDescriptions && !shape.isDense;
        reason = shape.isDense
            ? 'Picked a compact service list so longer offerings stay readable on one file.'
            : 'Picked a calmer service layout with clear categories and enough spacing.';
    } else if (shape.isDense) {
        styleId = 'compact';
        density = 'compact';
        includeDescriptions = false;
        reason = 'Picked a compact menu layout because this menu has many items or sections.';
    } else if (shape.isShort && source.flags.hasDescriptions) {
        styleId = 'premium';
        density = 'comfortable';
        includeDescriptions = true;
        reason = 'Picked an airier menu layout because the menu is short enough to use more spacing.';
    }

    if (preset === 'whatsapp') {
        density = shape.isDense ? 'compact' : 'comfortable';
        includeDescriptions = source.flags.hasDescriptions && shape.itemCount <= 18;
        reason = shape.isDense
            ? 'Picked a compact phone-share layout so the file stays easy to send.'
            : 'Picked a phone-readable layout with larger text.';
    }

    const settings = {
        ...buildDefaultSettings(preset, styleId),
        density,
        includeDescriptions,
        includeQr: true,
        includeContactBlock: true,
    };

    return {
        settings,
        label: `${profile.documentLabel} layout`,
        reason,
    };
}
