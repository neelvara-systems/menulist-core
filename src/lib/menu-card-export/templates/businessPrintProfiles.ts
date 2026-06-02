import type { BusinessCatalogKind, BusinessOfferingKind } from '@data/shared/businessTypes';

export type MenuCardBusinessPrintTone =
    | 'food-menu'
    | 'service-list'
    | 'product-catalog'
    | 'professional-guide'
    | 'wellness-list';

export type MenuCardBusinessPrintProfile = {
    tone: MenuCardBusinessPrintTone;
    documentLabel: string;
    qrLabel: string;
    fallbackTitle: string;
};

export function resolveMenuCardBusinessPrintProfile(params: {
    businessCategory?: string;
    catalogKind?: BusinessCatalogKind;
    offeringKind?: BusinessOfferingKind;
}): MenuCardBusinessPrintProfile {
    const category = String(params.businessCategory || '').trim().toLowerCase();
    const catalogKind = params.catalogKind || 'offerCatalog';
    const offeringKind = params.offeringKind || 'service';

    if (category === 'food' || catalogKind === 'menu' || offeringKind === 'menuItem') {
        return {
            tone: 'food-menu',
            documentLabel: 'Menu',
            qrLabel: 'View current menu',
            fallbackTitle: 'Menu',
        };
    }

    if (category === 'retail' || offeringKind === 'product') {
        return {
            tone: 'product-catalog',
            documentLabel: 'Catalog',
            qrLabel: 'View current catalog',
            fallbackTitle: 'Catalog',
        };
    }

    if (category === 'health') {
        return {
            tone: 'wellness-list',
            documentLabel: 'Services',
            qrLabel: 'View current services',
            fallbackTitle: 'Services',
        };
    }

    if (category === 'professional') {
        return {
            tone: 'professional-guide',
            documentLabel: 'Services',
            qrLabel: 'View current services',
            fallbackTitle: 'Services',
        };
    }

    return {
        tone: 'service-list',
        documentLabel: 'Services',
        qrLabel: 'View current services',
        fallbackTitle: 'Services',
    };
}
