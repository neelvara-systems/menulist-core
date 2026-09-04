import { resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '@data/shared/publicMenuDraftData';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveStoreBrandColor } from '@lib/menu-kit/brandTokens';
import { generateProjectUrl } from '@lib/utils/slugify';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { resolvePrintableAssetStyle } from './stylePreferences';
import type { PrintableAssetRenderInput } from './types';

export type ItemProductTagSource = {
    detail?: string | null;
    itemId?: string | null;
    name?: string | null;
    options?: readonly {
        name: string;
        priceLabel?: string;
    }[];
    price?: string | null;
};

export function appendItemQuery(menuUrl: string, itemId: string): string {
    const target = new URL(menuUrl);
    target.searchParams.set('item', itemId);
    return target.toString();
}

function resolveProjectName(project: Project, fallback: string): string {
    return getLocalizedText(
        project.name,
        project.defaultLanguage,
        getPrimaryLocalizedLanguage(project.name, project.defaultLanguage || 'en'),
        fallback,
    );
}

/**
 * Converts an authenticated owner item into the one canonical Product Tag
 * render input. The function intentionally fails closed when the item or
 * tenant URL is incomplete instead of emitting placeholder copy or domains.
 */
export function buildItemProductTagRenderInput(params: {
    item: ItemProductTagSource;
    project: Project | null | undefined;
    store: StoreDataType | null | undefined;
}): PrintableAssetRenderInput | null {
    const itemId = String(params.item.itemId || '').trim();
    const itemName = String(params.item.name || '').trim();
    const projectId = String(params.project?.projectId || '').trim();
    const subdomain = String(params.store?.subdomain || '').trim();
    const customDomain = String(params.store?.customDomain || '').trim();
    if (!params.store || !params.project || !itemId || !itemName || !projectId || (!subdomain && !customDomain)) {
        return null;
    }

    const storeName = getStoreContextName(params.store, 'Business');
    const projectName = resolveProjectName(params.project, 'Menu');
    const menuUrl = appendItemQuery(
        generateProjectUrl(subdomain, customDomain || undefined, projectName, false),
        itemId,
    );
    const businessCategory = resolveStoreBusinessCategory(
        params.store.businessType,
        params.store.businessCategory,
    );
    const resolvedStyle = resolvePrintableAssetStyle({
        assetTypeId: 'product_tag',
        businessCategory,
        businessType: params.store.businessType,
        preferences: params.store.printableAssetStylePreferences,
        projectId,
    });
    const tagline = getLocalizedText(
        params.store.tagline,
        params.store.defaultLanguage,
        getPrimaryLocalizedLanguage(params.store.tagline, params.store.defaultLanguage || 'en'),
        '',
    );
    const detail = String(params.item.detail || '').trim();
    const price = String(params.item.price || '').trim();
    const options = (Array.isArray(params.item.options) ? params.item.options : [])
        .map((option) => ({
            name: String(option?.name || '').trim(),
            priceLabel: String(option?.priceLabel || '').trim() || undefined,
        }))
        .filter((option) => option.name)
        .slice(0, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ATTRIBUTES_PER_ITEM);

    return {
        activePlanType: params.store.activePlanType,
        assetTypeId: 'product_tag',
        brandColor: resolveStoreBrandColor(params.store),
        businessCategory,
        businessType: params.store.businessType,
        logoUrl: params.store.logo || undefined,
        menuUrl,
        outputFormat: 'png',
        productTagContent: {
            name: itemName,
            ...(detail ? { detail } : {}),
            ...(options.length > 0 ? { options } : {}),
            ...(price ? { price } : {}),
        },
        projectId,
        shortLink: menuUrl.replace(/^https?:\/\//i, ''),
        storeName,
        tagline: tagline || undefined,
        templateFamilyId: resolvedStyle.templateFamilyId,
    };
}
