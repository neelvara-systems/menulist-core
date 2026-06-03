import { getBusinessCatalogKind, getBusinessOfferingKind, resolveBusinessCategory } from '@data/shared/businessTypes';
import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { resolveMenuCardBusinessPrintProfile } from '../templates/businessPrintProfiles';
import { buildBrandTokens } from './buildBrandTokens';
import { buildQrDestination, buildShortUrl } from './buildQrDestination';
import { resolveText, sanitizeMenuForPrint } from './sanitizeMenuForPrint';

export type BuildPrintSourceInput = {
    project: any;
    store: any;
    menuUrl: string;
    language?: string;
    settings: MenuCardExportSettings;
};

function parseDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return null;
}

function buildAddress(store: any): string | undefined {
    const parts = [
        store?.addressLine || store?.address,
        store?.area,
        store?.city,
        store?.state,
        store?.postalCode,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : undefined;
}

function asArray(value: any): any[] {
    return Array.isArray(value) ? value : [];
}

function resolveBrandColor(project: any, store: any): string | undefined {
    return store?.publicPresence?.accentColor
        || store?.primaryColor
        || store?.brandColor
        || store?.themeColor
        || project?.config?.design?.brand?.accentColor
        || undefined;
}

function resolveLogoUrl(store: any): string | undefined {
    return store?.logo
        || store?.logoUrl
        || store?.publicPresence?.logoUrl
        || store?.businessLogo
        || undefined;
}

function resolveStoreBusinessType(store: any): string | undefined {
    return store?.businessType
        || store?.publicPresence?.businessType
        || store?.businessIndustry
        || undefined;
}

function resolveStoreBusinessCategory(store: any): string | undefined {
    return store?.businessCategory
        || store?.publicPresence?.businessCategory
        || undefined;
}

function resolveStoreActivePlanType(store: any): string | null {
    return store?.activePlanType
        || store?.publicPresence?.activePlanType
        || null;
}

function appendUnique(target: any[], seen: Set<string>, entries: any[]) {
    entries.forEach((entry, index) => {
        if (!entry) return;
        const key = String(entry.id || entry.uid || entry.slug || entry.name?.en || entry.name || `${target.length}-${index}`);
        if (seen.has(key)) return;
        seen.add(key);
        target.push(entry);
    });
}

function resolveExtractedData(project: any): { items: any[]; categories: any[] } {
    const items: any[] = [];
    const categories: any[] = [];
    const itemKeys = new Set<string>();
    const categoryKeys = new Set<string>();
    const sources = [
        project?.extractedData?.data,
        project?.extractedData,
        project?.combinedData,
        ...asArray(project?.files).flatMap((file) => [
            file?.extractedData?.data,
            file?.extractedData,
            file?.combinedData,
        ]),
    ];

    sources.forEach((source) => {
        appendUnique(categories, categoryKeys, asArray(source?.categories));
        appendUnique(items, itemKeys, asArray(source?.items));
    });

    return { items, categories };
}

export function buildPrintSource(input: BuildPrintSourceInput): MenuCardPrintSource {
    const { project, store, menuUrl, settings } = input;
    const extractedData = resolveExtractedData(project);
    const language =
        input.language ||
        project?.defaultLanguage ||
        (Array.isArray(project?.languages) ? project.languages[0] : null) ||
        store?.defaultLanguage ||
        store?.language ||
        'en';

    const sanitized = sanitizeMenuForPrint(extractedData.items, extractedData.categories, language);
    const brandTokens = buildBrandTokens(resolveBrandColor(project, store));
    const businessType = resolveStoreBusinessType(store);
    const storedBusinessCategory = resolveStoreBusinessCategory(store);
    const businessCategory = resolveBusinessCategory(businessType, storedBusinessCategory);
    const catalogKind = getBusinessCatalogKind(businessType, businessCategory);
    const offeringKind = getBusinessOfferingKind(businessType, businessCategory);
    const printProfile = resolveMenuCardBusinessPrintProfile({ businessCategory, catalogKind, offeringKind });

    return {
        tenantId: store?.tenantId || store?.tId,
        storeId: store?.storeId || store?.sId,
        projectId: project?.projectId || project?.id || '',
        menuSnapshotId: null,
        business: {
            name: store?.name || store?.storeName || store?.businessName || 'Menu',
            logoUrl: resolveLogoUrl(store),
            phone: store?.phone || store?.phoneNumber || undefined,
            address: buildAddress(store),
            businessType,
            businessCategory,
            catalogKind,
            offeringKind,
            publicMenuUrl: menuUrl,
            activePlanType: resolveStoreActivePlanType(store),
            brandColor: brandTokens.accentColor,
            brandTokens,
        },
        qr: {
            destinationUrl: buildQrDestination(menuUrl, settings.preset),
            shortUrl: buildShortUrl(menuUrl),
            label: printProfile.qrLabel,
            errorCorrection: settings.preset === 'print_shop_packet' ? 'Q' : 'M',
        },
        menu: {
            title: resolveText(project?.name, language, printProfile.fallbackTitle),
            updatedAt: parseDate(project?.modifiedOn || project?.updatedAt || project?.lastPublishedAt),
            language,
            currency: store?.currencySymbol || store?.currency || store?.currencyCode || '',
            currencyCode: store?.currencyCode || store?.currency || undefined,
            categories: sanitized.categories,
        },
        flags: {
            hasPhotos: false,
            hasDescriptions: sanitized.categories.some((category) => category.items.some((item) => !!item.description)),
            hasVariants: sanitized.categories.some((category) => category.items.some((item) => item.attributes.length > 0)),
            hasDietaryTags: sanitized.categories.some((category) => category.items.some((item) => item.tags.length > 0)),
            hasMissingPrices: sanitized.missingPriceCount > 0,
        },
    };
}
