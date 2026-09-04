import { getBusinessCatalogKind, getBusinessOfferingKind, resolveBusinessCategory } from '@data/shared/businessTypes';
import { FEATURE_FLAGS } from '@config/features';
import { resolveStorePermissionScopeDocumentIdAliases } from '@lib/permissions/scopeDocumentId';
import type { MenuCardExportSettings } from '../models/exportTypes';
import type { MenuCardPrintSource } from '../models/printModel';
import { resolveMenuCardBusinessPrintProfile } from '../templates/businessPrintProfiles';
import { buildBrandTokens } from './buildBrandTokens';
import { buildQrDestination, buildShortUrl } from './buildQrDestination';
import { MENU_CARD_PRINT_TEXT_LIMITS, resolveText, sanitizeMenuForPrint } from './sanitizeMenuForPrint';

export type BuildPrintSourceInput = {
    project: any;
    store: any;
    menuUrl: string;
    language?: string;
    settings: MenuCardExportSettings;
};

function readOwnField(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        return Object.prototype.hasOwnProperty.call(value, key)
            ? (value as Record<string, unknown>)[key]
            : undefined;
    } catch {
        return undefined;
    }
}

function parseDateValue(value: unknown): string | null {
    try {
        if (typeof value === 'string') {
            const candidate = value.trim();
            if (!candidate) return null;
            const millis = Date.parse(candidate);
            return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
        }
        if (value instanceof Date) {
            const millis = Date.prototype.getTime.call(value);
            return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        const toDate = readOwnField(value, 'toDate');
        if (typeof toDate !== 'function') return null;
        const converted = Reflect.apply(toDate, value, []);
        if (!(converted instanceof Date)) return null;
        const millis = Date.prototype.getTime.call(converted);
        return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    } catch {
        return null;
    }
}

function resolveProjectUpdatedAt(project: unknown): string | null {
    for (const field of ['modifiedOn', 'updatedAt', 'lastPublishedAt']) {
        const parsed = parseDateValue(readOwnField(project, field));
        if (parsed) return parsed;
    }
    return null;
}

function resolveProjectId(project: unknown): string {
    for (const field of ['projectId', 'id']) {
        const value = readOwnField(project, field);
        if (typeof value !== 'string') continue;
        const candidate = value.trim();
        if (candidate && candidate.length <= 1_500 && !candidate.includes('/')) return candidate;
    }
    return '';
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

export const MAX_MENU_CARD_LOGO_URL_LENGTH = 4_096;

export function normalizeMenuCardLogoUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const candidate = value.trim();
    if (!candidate || candidate.length > MAX_MENU_CARD_LOGO_URL_LENGTH) return undefined;

    try {
        const parsed = new URL(candidate);
        if (
            (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            || parsed.username
            || parsed.password
        ) {
            return undefined;
        }
        return parsed.toString();
    } catch {
        return undefined;
    }
}

function resolveLogoUrl(store: unknown): string | undefined {
    const publicPresence = readOwnField(store, 'publicPresence');
    for (const candidate of [
        readOwnField(store, 'logo'),
        readOwnField(store, 'logoUrl'),
        readOwnField(publicPresence, 'logoUrl'),
        readOwnField(store, 'businessLogo'),
    ]) {
        const normalized = normalizeMenuCardLogoUrl(candidate);
        if (normalized) return normalized;
    }
    return undefined;
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

function resolveStoreTagline(store: unknown, language: string): string | undefined {
    const publicPresence = readOwnField(store, 'publicPresence');
    const tagline = resolveText(
        readOwnField(store, 'tagline') ?? readOwnField(publicPresence, 'tagline'),
        language,
        '',
        MENU_CARD_PRINT_TEXT_LIMITS.BUSINESS_TAGLINE,
    );
    return tagline || undefined;
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

    const projectConfig = readOwnField(project, 'config');
    const projectDesign = readOwnField(projectConfig, 'design');
    const menuDesign = readOwnField(projectDesign, 'menu');
    const showCategoryIcons = FEATURE_FLAGS.ENABLE_CATEGORY_ICONS
        && readOwnField(menuDesign, 'showCategoryIcons') !== false;
    const sanitized = sanitizeMenuForPrint(
        extractedData.items,
        extractedData.categories,
        language,
        showCategoryIcons,
    );
    const brandTokens = buildBrandTokens(resolveBrandColor(project, store));
    const businessType = resolveStoreBusinessType(store);
    const storedBusinessCategory = resolveStoreBusinessCategory(store);
    const businessCategory = resolveBusinessCategory(businessType, storedBusinessCategory);
    const catalogKind = getBusinessCatalogKind(businessType, businessCategory);
    const offeringKind = getBusinessOfferingKind(businessType, businessCategory);
    const printProfile = resolveMenuCardBusinessPrintProfile({ businessCategory, catalogKind, offeringKind });

    const tenantScope = resolveStorePermissionScopeDocumentIdAliases([
        readOwnField(store, 'tenantId'),
        readOwnField(store, 'tId'),
    ]);
    const storeScope = resolveStorePermissionScopeDocumentIdAliases([
        readOwnField(store, 'storeId'),
        readOwnField(store, 'sId'),
    ]);

    return {
        tenantId: tenantScope?.documentId,
        storeId: storeScope?.documentId,
        projectId: resolveProjectId(project),
        menuSnapshotId: null,
        business: {
            name: store?.name || store?.storeName || store?.businessName || 'Menu',
            tagline: resolveStoreTagline(store, language),
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
            title: resolveText(
                project?.name,
                language,
                printProfile.fallbackTitle,
                MENU_CARD_PRINT_TEXT_LIMITS.MENU_TITLE,
            ),
            updatedAt: resolveProjectUpdatedAt(project),
            language,
            currency: store?.currencySymbol || store?.currency || store?.currencyCode || '',
            currencyCode: store?.currencyCode || store?.currency || undefined,
            categories: sanitized.categories,
        },
        flags: {
            hasPhotos: false,
            hasDescriptions: sanitized.categories.some((category) => category.items.some((item) => !!item.description)),
            hasVariants: sanitized.categories.some((category) => category.items.some((item) => item.attributes.length > 0)),
            hasDietaryTags: sanitized.categories.some((category) => category.items.some((item) => (
                item.decisionSymbols?.some((symbol) => (
                    symbol === 'vegetarian'
                    || symbol === 'non-vegetarian'
                    || symbol === 'vegan'
                    || symbol === 'gluten-free'
                ))
            ))),
            hasCategoryIcons: sanitized.categories.some((category) => Boolean(category.icon)),
            hasMissingPrices: sanitized.missingPriceCount > 0,
        },
    };
}
