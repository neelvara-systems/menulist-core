import type { Project } from '@template/main-app/projects/types';
import {
    buildAiMenuManagerCustomerAppInstallUrl,
    buildAiMenuManagerDigitalScreenUrl,
    buildAiMenuManagerProjectMenuUrl,
    buildAiMenuManagerTenantBaseUrl,
} from './localExportUrls';
import { hashStableValue } from './idempotency';

export interface AiMenuManagerContextItem {
    id: string;
    name: string;
    aliases: string[];
    categoryId: string;
    categoryName: string;
    fileUid: string;
    price?: string;
    available: boolean;
    active: boolean;
    hasImage: boolean;
    hasDescription: boolean;
    isBestSeller?: boolean;
    duration?: number;
    orderIndex?: number;
    ownerBoost?: number;
}

export interface AiMenuManagerContextCategory {
    id: string;
    name: string;
    aliases: string[];
    active: boolean;
    fileUid: string;
    icon?: string;
    hasImage: boolean;
    timeSlotsCount: number;
    orderIndex?: number;
}

export interface AiMenuManagerContextPacket {
    projectId: string;
    projectUpdatedAt?: string;
    defaultLanguage: string;
    projectName: string;
    storeName: string;
    businessType?: string;
    publicLinks?: {
        customerAppInstallUrl?: string;
        digitalScreenHighlightsUrl?: string;
        digitalScreenUrl?: string;
        menuUrl?: string;
        officialPageUrl?: string;
        tenantBaseUrl?: string;
    };
    menuDesign: {
        accentColor?: string;
        mood?: string;
        layout?: string;
        presetKey?: string;
        showCategoryIcons?: boolean;
        showCategoryTabs?: boolean;
        showImages?: boolean;
        showItemPrices?: boolean;
    };
    decisionBlocks: {
        enablePopular: boolean;
        enableQuickPick: boolean;
        enableBestValue: boolean;
        pinnedPopular?: string;
        pinnedQuickPick?: string;
        pinnedBestValue?: string;
    };
    items: AiMenuManagerContextItem[];
    categories: AiMenuManagerContextCategory[];
}

function readLocalized(value: unknown, language = 'en', fallback = ''): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value || fallback;
    if (typeof value === 'object') {
        const map = value as Record<string, unknown>;
        const direct = map[language];
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        const en = map.en;
        if (typeof en === 'string' && en.trim()) return en.trim();
        const first = Object.values(map).find((entry) => typeof entry === 'string' && entry.trim());
        if (typeof first === 'string') return first.trim();
    }
    return fallback;
}

function normalizeAlias(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenAliases(value: string) {
    return normalizeAlias(value)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

function normalizePinnedItemId(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }
    if (Array.isArray(value)) {
        for (const entry of value) {
            const normalized = normalizePinnedItemId(entry);
            if (normalized) return normalized;
        }
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return normalizePinnedItemId(record.itemId ?? record.value ?? record.id);
    }
    return undefined;
}

export function buildAiMenuManagerContextPacket(params: {
    project: Project;
    storePublicContext?: {
        customDomain?: string;
        screenToken?: string;
        subdomain?: string;
    };
    storeName: string;
    businessType?: string;
}): AiMenuManagerContextPacket {
    const { project } = params;
    const defaultLanguage = project.defaultLanguage || project.languages?.[0] || 'en';
    const projectId = project.projectId || '';
    const categories: AiMenuManagerContextCategory[] = [];
    const categoryNameById = new Map<string, string>();
    const items: AiMenuManagerContextItem[] = [];

    project.files?.forEach((file) => {
        const extractedData = file.extractedData?.data;
        if (!extractedData) return;

        extractedData.categories?.forEach((category) => {
            const categoryName = readLocalized(category.name, defaultLanguage, 'Untitled category');
            categoryNameById.set(category.id, categoryName);
            categories.push({
                id: category.id,
                name: categoryName,
                aliases: Array.from(new Set([
                    normalizeAlias(categoryName),
                    normalizeAlias(categoryName.replace(/&/g, 'and')),
                    ...tokenAliases(categoryName),
                    ...(category.extractionIdAliases || []).map(normalizeAlias),
                ].filter(Boolean))),
                active: category.active !== false,
                fileUid: file.uid,
                icon: category.icon,
                hasImage: Boolean(category.images?.length),
                timeSlotsCount: Array.isArray(category.timeSlots) ? category.timeSlots.length : 0,
                orderIndex: category.orderIndex,
            });
        });

        extractedData.items?.forEach((item) => {
            const itemName = readLocalized(item.name, defaultLanguage, 'Untitled item');
            const categoryName = categoryNameById.get(item.category) || 'Uncategorized';
            const description = readLocalized(item.description, defaultLanguage, '');
            items.push({
                id: item.id,
                name: itemName,
                aliases: Array.from(new Set([
                    normalizeAlias(itemName),
                    normalizeAlias(itemName.replace(/&/g, 'and')),
                    normalizeAlias(itemName.replace(/\bmasala\b/g, 'masala')),
                    ...tokenAliases(itemName),
                    ...(item.extractionIdAliases || []).map(normalizeAlias),
                ].filter(Boolean))),
                categoryId: item.category,
                categoryName,
                fileUid: file.uid,
                price: item.price,
                available: item.available !== false,
                active: item.active !== false,
                hasImage: Boolean(item.images?.length),
                hasDescription: Boolean(description),
                isBestSeller: item.isBestSeller === true,
                duration: item.duration,
                orderIndex: item.orderIndex,
                ownerBoost: item.ownerBoost,
            });
        });
    });

    const design = (project.config as any)?.design;
    const menu = design?.menu || {};
    const projectName = readLocalized(project.name, defaultLanguage, 'Current menu');
    const decisionBlocks = project.menuSettings?.decisionBlocks || {};
    const tenantBaseUrl = params.storePublicContext
        ? buildAiMenuManagerTenantBaseUrl(params.storePublicContext)
        : '';
    const customerAppInstallUrl = params.storePublicContext
        ? buildAiMenuManagerCustomerAppInstallUrl(params.storePublicContext)
        : '';
    const menuUrl = params.storePublicContext
        ? buildAiMenuManagerProjectMenuUrl({
            ...params.storePublicContext,
            projectName,
        })
        : '';
    const digitalScreenUrl = buildAiMenuManagerDigitalScreenUrl({
        publicBaseUrl: tenantBaseUrl,
        screenToken: params.storePublicContext?.screenToken,
    });

    return {
        projectId,
        projectUpdatedAt: String((project as any).modifiedOn || (project as any).updatedAt || ''),
        defaultLanguage,
        projectName,
        storeName: params.storeName,
        businessType: params.businessType,
        publicLinks: {
            customerAppInstallUrl: customerAppInstallUrl || undefined,
            digitalScreenHighlightsUrl: digitalScreenUrl ? `${digitalScreenUrl}?mode=highlights` : undefined,
            digitalScreenUrl: digitalScreenUrl || undefined,
            menuUrl: menuUrl || undefined,
            officialPageUrl: tenantBaseUrl || undefined,
            tenantBaseUrl: tenantBaseUrl || undefined,
        },
        menuDesign: {
            accentColor: (project.config?.design?.brand as any)?.accentColor,
            mood: menu.mood,
            layout: menu.layout,
            showCategoryIcons: menu.showCategoryIcons,
            showCategoryTabs: menu.showCategoryTabs,
            showImages: menu.showImages,
            showItemPrices: menu.showItemPrices,
        },
        decisionBlocks: {
            enablePopular: decisionBlocks.enablePopular !== false,
            enableQuickPick: decisionBlocks.enableQuickPick !== false,
            enableBestValue: decisionBlocks.enableBestValue !== false,
            pinnedPopular: normalizePinnedItemId(decisionBlocks.pinnedPopular),
            pinnedQuickPick: normalizePinnedItemId(decisionBlocks.pinnedQuickPick),
            pinnedBestValue: normalizePinnedItemId(decisionBlocks.pinnedBestValue),
        },
        items,
        categories,
    };
}

export function findAiMenuManagerItemByName(context: AiMenuManagerContextPacket, rawName: string) {
    const normalized = normalizeAlias(rawName);
    if (!normalized) return null;

    const exactMatches = context.items.filter((item) => (
        item.aliases.includes(normalized)
        || normalizeAlias(item.name) === normalized
    ));
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1) return null;

    const candidates = rankAiMenuManagerItemCandidates(context, normalized);

    if (candidates.length > 1 && candidates.filter((entry) => entry.genericTokenMatch).length > 1) {
        return null;
    }

    if (candidates.length > 1 && candidates[0].score - candidates[1].score < 0.08) {
        return null;
    }

    return candidates[0]?.item || null;
}

function rankAiMenuManagerItemCandidates(context: AiMenuManagerContextPacket, normalized: string) {
    return context.items
        .map((item) => {
            const itemName = normalizeAlias(item.name);
            const aliases = item.aliases.map(normalizeAlias).filter(Boolean);
            const aliasMatch = aliases.find((alias) => alias.includes(normalized) || normalized.includes(alias));
            const genericTokenMatch = aliases.some((alias) => alias === normalized || alias.split(' ').includes(normalized))
                || itemName.split(' ').includes(normalized);
            const score = itemName.includes(normalized)
                ? normalized.length / Math.max(itemName.length, 1)
                : normalized.includes(itemName)
                    ? itemName.length / Math.max(normalized.length, 1)
                    : aliasMatch
                        ? aliasMatch === normalized ? 0.8 : 0.6
                        : 0;
            return { item, genericTokenMatch, score };
        })
        .filter((entry) => entry.score >= 0.45)
        .sort((a, b) => b.score - a.score);
}

export function findAiMenuManagerItemCandidates(context: AiMenuManagerContextPacket, rawName: string, limit = 5) {
    const normalized = normalizeAlias(rawName);
    if (!normalized) return [];

    const exactMatches = context.items.filter((item) => (
        item.aliases.includes(normalized)
        || normalizeAlias(item.name) === normalized
    ));
    if (exactMatches.length > 1) return exactMatches.slice(0, limit);

    return rankAiMenuManagerItemCandidates(context, normalized)
        .slice(0, limit)
        .map((entry) => entry.item);
}

export function findAiMenuManagerCategoryByName(context: AiMenuManagerContextPacket, rawName: string) {
    const normalized = normalizeAlias(rawName);
    if (!normalized) return null;

    const exactMatches = context.categories.filter((category) => (
        category.aliases.includes(normalized)
        || normalizeAlias(category.name) === normalized
    ));
    if (exactMatches.length === 1) return exactMatches[0];
    if (exactMatches.length > 1) return null;

    const candidates = rankAiMenuManagerCategoryCandidates(context, normalized);

    if (candidates.length > 1 && candidates.filter((entry) => entry.genericTokenMatch).length > 1) {
        return null;
    }

    if (candidates.length > 1 && candidates[0].score - candidates[1].score < 0.08) {
        return null;
    }

    return candidates[0]?.category || null;
}

function rankAiMenuManagerCategoryCandidates(context: AiMenuManagerContextPacket, normalized: string) {
    return context.categories
        .map((category) => {
            const categoryName = normalizeAlias(category.name);
            const aliases = category.aliases.map(normalizeAlias).filter(Boolean);
            const aliasMatch = aliases.find((alias) => alias.includes(normalized) || normalized.includes(alias));
            const genericTokenMatch = aliases.some((alias) => alias === normalized || alias.split(' ').includes(normalized))
                || categoryName.split(' ').includes(normalized);
            const score = categoryName.includes(normalized)
                ? normalized.length / Math.max(categoryName.length, 1)
                : normalized.includes(categoryName)
                    ? categoryName.length / Math.max(normalized.length, 1)
                    : aliasMatch
                        ? aliasMatch === normalized ? 0.8 : 0.6
                        : 0;
            return { category, genericTokenMatch, score };
        })
        .filter((entry) => entry.score >= 0.45)
        .sort((a, b) => b.score - a.score);
}

export function findAiMenuManagerCategoryCandidates(context: AiMenuManagerContextPacket, rawName: string, limit = 5) {
    const normalized = normalizeAlias(rawName);
    if (!normalized) return [];

    const exactMatches = context.categories.filter((category) => (
        category.aliases.includes(normalized)
        || normalizeAlias(category.name) === normalized
    ));
    if (exactMatches.length > 1) return exactMatches.slice(0, limit);

    return rankAiMenuManagerCategoryCandidates(context, normalized)
        .slice(0, limit)
        .map((entry) => entry.category);
}

export function buildAiMenuManagerContextBaseHash(context: AiMenuManagerContextPacket) {
    return hashStableValue({
        projectId: context.projectId,
        updatedAt: context.projectUpdatedAt || '',
        items: context.items
            .map((item) => ({
                id: item.id,
                categoryId: item.categoryId,
                price: item.price || '',
                available: item.available,
                active: item.active,
                hasImage: item.hasImage,
                hasDescription: item.hasDescription,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        categories: context.categories
            .map((category) => ({
                id: category.id,
                name: category.name,
                active: category.active,
                icon: category.icon || '',
                hasImage: category.hasImage,
                timeSlotsCount: category.timeSlotsCount,
                orderIndex: category.orderIndex ?? null,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        menuDesign: context.menuDesign,
        decisionBlocks: context.decisionBlocks,
    });
}
