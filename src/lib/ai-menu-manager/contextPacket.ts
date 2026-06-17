import type { Project } from '@template/main-app/projects/types';
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
    menuDesign: {
        mood?: string;
        layout?: string;
        presetKey?: string;
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
    const decisionBlocks = project.menuSettings?.decisionBlocks || {};

    return {
        projectId,
        projectUpdatedAt: String((project as any).modifiedOn || (project as any).updatedAt || ''),
        defaultLanguage,
        projectName: readLocalized(project.name, defaultLanguage, 'Current menu'),
        storeName: params.storeName,
        businessType: params.businessType,
        menuDesign: {
            mood: menu.mood,
            layout: menu.layout,
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

    const candidates = context.items
        .map((item) => {
            const itemName = normalizeAlias(item.name);
            const score = itemName.includes(normalized)
                ? normalized.length / Math.max(itemName.length, 1)
                : normalized.includes(itemName)
                    ? itemName.length / Math.max(normalized.length, 1)
                    : item.aliases.some((alias) => alias.includes(normalized) || normalized.includes(alias))
                        ? 0.6
                        : 0;
            return { item, score };
        })
        .filter((entry) => entry.score >= 0.45)
        .sort((a, b) => b.score - a.score);

    if (candidates.length > 1 && candidates[0].score - candidates[1].score < 0.08) {
        return null;
    }

    return candidates[0]?.item || null;
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

    const candidates = context.categories
        .map((category) => {
            const categoryName = normalizeAlias(category.name);
            const score = categoryName.includes(normalized)
                ? normalized.length / Math.max(categoryName.length, 1)
                : normalized.includes(categoryName)
                    ? categoryName.length / Math.max(normalized.length, 1)
                    : category.aliases.some((alias) => alias.includes(normalized) || normalized.includes(alias))
                        ? 0.6
                        : 0;
            return { category, score };
        })
        .filter((entry) => entry.score >= 0.45)
        .sort((a, b) => b.score - a.score);

    if (candidates.length > 1 && candidates[0].score - candidates[1].score < 0.08) {
        return null;
    }

    return candidates[0]?.category || null;
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
