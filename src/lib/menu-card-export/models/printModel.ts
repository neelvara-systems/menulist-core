import type { BusinessCatalogKind, BusinessOfferingKind } from '@data/shared/businessTypes';
import type { ItemDecisionSymbolId } from '@lib/menu/itemDecisionSymbols';

export type LocalizedText = string | Record<string, string> | undefined | null;

export type PrintAttribute = {
    id?: string;
    name: string;
    price?: string;
};

export type PrintItem = {
    id: string;
    name: string;
    price?: string;
    description?: string;
    categoryId?: string;
    attributes: PrintAttribute[];
    decisionSymbols?: ItemDecisionSymbolId[];
    tags: string[];
};

export type PrintCategory = {
    id: string;
    name: string;
    icon?: string;
    items: PrintItem[];
};

export type MenuCardBrandTokens = {
    accentColor: string;
    textColor: string;
    mutedColor: string;
    borderColor: string;
};

export type MenuCardPrintSource = {
    tenantId?: string;
    storeId?: string;
    projectId: string;
    menuSnapshotId: string | null;
    business: {
        name: string;
        tagline?: string;
        logoUrl?: string;
        phone?: string;
        address?: string;
        businessType?: string;
        businessCategory?: string;
        catalogKind: BusinessCatalogKind;
        offeringKind: BusinessOfferingKind;
        publicMenuUrl: string;
        activePlanType?: string | null;
        brandColor?: string;
        brandTokens: MenuCardBrandTokens;
    };
    qr: {
        destinationUrl: string;
        shortUrl?: string;
        label: string;
        errorCorrection: 'M' | 'Q';
    };
    menu: {
        title: string;
        updatedAt: string | null;
        language: string;
        currency: string;
        currencyCode?: string;
        categories: PrintCategory[];
    };
    flags: {
        hasPhotos: boolean;
        hasDescriptions: boolean;
        hasVariants: boolean;
        hasDietaryTags: boolean;
        hasCategoryIcons: boolean;
        hasMissingPrices: boolean;
    };
};
