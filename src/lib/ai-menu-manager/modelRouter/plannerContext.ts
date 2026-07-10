import type {
    AiMenuManagerActionType,
    AiMenuManagerCommandContextSelection,
    AiMenuManagerPendingOperation,
} from '@type/aiMenuManager';
import type { AiMenuManagerContextPacket } from '../contextPacket';
import type { AiMenuManagerModelRouteResult } from './routerOutcomeSchema';

const MAX_PLANNER_ITEMS = 32;
const MAX_PLANNER_CATEGORIES = 18;
const MAX_PLANNER_PENDING_CARDS = 5;

function trimText(value: unknown, maxLength: number) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function tokenize(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\u0080-\uFFFD\s]+/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
}

function rankContextEntry(
    ownerTokens: string[],
    selectedIds: Set<string>,
    entry: { id: string; name: string; aliases?: string[] },
) {
    if (selectedIds.has(String(entry.id))) return 10_000;
    const haystack = [entry.name, ...(entry.aliases || [])].join(' ').toLowerCase();
    return ownerTokens.reduce((score, token) => score + (haystack.includes(token) ? 10 : 0), 0);
}

export interface AiMenuManagerPlannerContext {
    project: {
        id: string;
        name: string;
        updatedAt?: string;
    };
    store: {
        businessType?: string;
        name: string;
    };
    summary: {
        categoryCount: number;
        hiddenCategoryCount: number;
        hiddenItemCount: number;
        itemCount: number;
        missingDescriptionCount: number;
        missingImageCount: number;
        missingPriceCount: number;
        soldOutItemCount: number;
    };
    menuDesign: AiMenuManagerContextPacket['menuDesign'];
    decisionBlocks: AiMenuManagerContextPacket['decisionBlocks'];
    items: Array<{
        active: boolean;
        aliases: string[];
        available: boolean;
        categoryId: string;
        categoryName: string;
        hasDescription: boolean;
        hasImage: boolean;
        id: string;
        isBestSeller?: boolean;
        name: string;
        price?: string;
    }>;
    categories: Array<{
        active: boolean;
        aliases: string[];
        id: string;
        name: string;
    }>;
    pendingCards: Array<{
        actionType: AiMenuManagerActionType;
        entityIds: string[];
        title: string;
    }>;
}

export function buildAiMenuManagerPlannerContext(params: {
    composerContext?: AiMenuManagerCommandContextSelection;
    context: AiMenuManagerContextPacket;
    ownerMessage: string;
    pendingOperations?: AiMenuManagerPendingOperation[];
}): AiMenuManagerPlannerContext {
    const selectedIds = new Set((params.composerContext?.selectedEntityIds || []).map(String));
    const ownerTokens = tokenize(params.ownerMessage);
    const rankedItems = [...params.context.items]
        .sort((left, right) => (
            rankContextEntry(ownerTokens, selectedIds, right)
            - rankContextEntry(ownerTokens, selectedIds, left)
        ))
        .slice(0, MAX_PLANNER_ITEMS);
    const rankedCategories = [...params.context.categories]
        .sort((left, right) => (
            rankContextEntry(ownerTokens, selectedIds, right)
            - rankContextEntry(ownerTokens, selectedIds, left)
        ))
        .slice(0, MAX_PLANNER_CATEGORIES);

    return {
        project: {
            id: params.context.projectId,
            name: trimText(params.context.projectName, 120),
            updatedAt: trimText(params.context.projectUpdatedAt, 80) || undefined,
        },
        store: {
            name: trimText(params.context.storeName, 120),
            businessType: trimText(params.context.businessType, 80) || undefined,
        },
        summary: {
            categoryCount: params.context.categories.length,
            hiddenCategoryCount: params.context.categories.filter((category) => !category.active).length,
            hiddenItemCount: params.context.items.filter((item) => !item.active).length,
            itemCount: params.context.items.length,
            missingDescriptionCount: params.context.items.filter((item) => !item.hasDescription).length,
            missingImageCount: params.context.items.filter((item) => !item.hasImage).length,
            missingPriceCount: params.context.items.filter((item) => !trimText(item.price, 32)).length,
            soldOutItemCount: params.context.items.filter((item) => !item.available).length,
        },
        menuDesign: params.context.menuDesign,
        decisionBlocks: params.context.decisionBlocks,
        items: rankedItems.map((item) => ({
            active: item.active,
            aliases: item.aliases.map((alias) => trimText(alias, 80)).filter(Boolean).slice(0, 4),
            available: item.available,
            categoryId: item.categoryId,
            categoryName: trimText(item.categoryName, 120),
            hasDescription: item.hasDescription,
            hasImage: item.hasImage,
            id: String(item.id),
            isBestSeller: item.isBestSeller,
            name: trimText(item.name, 120),
            price: trimText(item.price, 32) || undefined,
        })),
        categories: rankedCategories.map((category) => ({
            active: category.active,
            aliases: category.aliases.map((alias) => trimText(alias, 80)).filter(Boolean).slice(0, 3),
            id: String(category.id),
            name: trimText(category.name, 120),
        })),
        pendingCards: (params.pendingOperations || []).slice(0, MAX_PLANNER_PENDING_CARDS).map((operation) => ({
            actionType: operation.card.actionType,
            entityIds: operation.card.entityRefs.map((entry) => String(entry.id)).slice(0, 8),
            title: trimText(operation.card.title, 140),
        })),
    };
}

function getTargetIds(result: AiMenuManagerModelRouteResult, entityType: 'item' | 'category') {
    return (result.targets || [])
        .filter((target) => target.entityType === entityType && target.entityId)
        .map((target) => String(target.entityId));
}

function readBoolean(values: Record<string, unknown> | undefined, key: string) {
    return typeof values?.[key] === 'boolean' ? values[key] as boolean : null;
}

function readNumber(values: Record<string, unknown> | undefined, key: string) {
    const rawValue = values?.[key];
    if (
        typeof rawValue !== 'number'
        && (typeof rawValue !== 'string' || !rawValue.trim())
    ) {
        return null;
    }
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
}

function readString(values: Record<string, unknown> | undefined, key: string, maxLength = 160) {
    return trimText(values?.[key], maxLength) || null;
}

function itemComposerContext(itemIds: string[]): AiMenuManagerCommandContextSelection | undefined {
    return itemIds.length ? { target: 'item', selectedEntityIds: itemIds } : undefined;
}

function categoryComposerContext(categoryIds: string[]): AiMenuManagerCommandContextSelection | undefined {
    return categoryIds.length ? { target: 'category', selectedEntityIds: [categoryIds[0]] } : undefined;
}

export function materializeAiMenuManagerModelRoute(params: {
    context: AiMenuManagerContextPacket;
    result: AiMenuManagerModelRouteResult;
}): { composerContext?: AiMenuManagerCommandContextSelection; text: string } | null {
    const { result } = params;
    if (result.outcome !== 'prepare_action' || !result.actionType) return null;

    const itemIds = getTargetIds(result, 'item')
        .filter((id) => params.context.items.some((item) => String(item.id) === id));
    const categoryIds = getTargetIds(result, 'category')
        .filter((id) => params.context.categories.some((category) => String(category.id) === id));
    const firstItem = params.context.items.find((item) => String(item.id) === itemIds[0]);
    const firstCategory = params.context.categories.find((category) => String(category.id) === categoryIds[0]);
    const values = result.values;

    switch (result.actionType) {
        case 'item_price_update': {
            const newPrice = readNumber(values, 'newPrice');
            return firstItem && newPrice !== null
                ? { composerContext: itemComposerContext([itemIds[0]]), text: `Set price to ${newPrice}` }
                : null;
        }
        case 'item_name_update': {
            const newName = readString(values, 'newName', 120);
            return firstItem && newName
                ? { composerContext: itemComposerContext([itemIds[0]]), text: `Rename to ${newName}` }
                : null;
        }
        case 'item_description_update': {
            const description = readString(values, 'description', 500);
            return firstItem && description
                ? { composerContext: itemComposerContext([itemIds[0]]), text: `Description: ${description}` }
                : null;
        }
        case 'item_category_update': {
            const categoryId = readString(values, 'categoryId', 160) || categoryIds[0];
            const category = params.context.categories.find((entry) => String(entry.id) === categoryId);
            const duplicateCategoryName = category
                ? params.context.categories.filter((entry) => entry.name.trim().toLowerCase() === category.name.trim().toLowerCase()).length > 1
                : false;
            return firstItem && category && !duplicateCategoryName
                ? { composerContext: itemComposerContext([itemIds[0]]), text: `Move to ${category.name}` }
                : null;
        }
        case 'item_availability_update': {
            const available = readBoolean(values, 'available');
            return firstItem && available !== null
                ? { composerContext: itemComposerContext([itemIds[0]]), text: available ? 'available' : 'sold out' }
                : null;
        }
        case 'item_visibility_update': {
            const visible = readBoolean(values, 'visible');
            return firstItem && visible !== null
                ? { composerContext: itemComposerContext([itemIds[0]]), text: visible ? 'Show' : 'Hide' }
                : null;
        }
        case 'item_bestseller_update': {
            const enabled = readBoolean(values, 'enabled');
            return firstItem && enabled !== null
                ? { composerContext: itemComposerContext([itemIds[0]]), text: `${enabled ? 'Mark' : 'Remove'} bestseller` }
                : null;
        }
        case 'item_prep_time_update': {
            const minutes = readNumber(values, 'minutes');
            return firstItem && minutes !== null
                ? { composerContext: itemComposerContext([itemIds[0]]), text: `Set prep time to ${minutes} minutes` }
                : null;
        }
        case 'category_name_update': {
            const newName = readString(values, 'newName', 120);
            return firstCategory && newName
                ? { composerContext: categoryComposerContext([categoryIds[0]]), text: `Rename category to ${newName}` }
                : null;
        }
        case 'category_visibility_update': {
            const visible = readBoolean(values, 'visible');
            return firstCategory && visible !== null
                ? { composerContext: categoryComposerContext([categoryIds[0]]), text: visible ? 'Show' : 'Hide' }
                : null;
        }
        case 'menu_special_note_update': {
            const note = readString(values, 'note', 140);
            return note ? { text: `Show note: ${note}` } : null;
        }
        case 'menu_design_mood_update': {
            const mood = readString(values, 'mood', 40);
            return mood ? { text: `Make menu ${mood}` } : null;
        }
        case 'menu_design_layout_update': {
            const layout = readString(values, 'layout', 20);
            return layout ? { text: `Use ${layout} layout` } : null;
        }
        case 'menu_design_preset_apply': {
            const preset = readString(values, 'preset', 60);
            return preset ? { text: `Make menu ${preset}` } : null;
        }
        case 'menu_design_visibility_update': {
            const setting = readString(values, 'setting', 40);
            const visible = readBoolean(values, 'visible');
            if (!setting || visible === null) return null;
            const target = setting === 'prices' ? 'item prices'
                : setting === 'images' ? 'item images'
                    : setting === 'category_icons' ? 'category icons'
                        : setting === 'category_tabs' ? 'category tabs'
                            : null;
            return target ? { text: `${visible ? 'Show' : 'Hide'} ${target}` } : null;
        }
        case 'menu_design_color_update': {
            const color = readString(values, 'color', 40);
            return color ? { text: `Set theme color to ${color}` } : null;
        }
        case 'decision_blocks_update': {
            const enabled = readBoolean(values, 'enabled');
            if (enabled !== true) return null;
            return firstItem
                ? {
                    composerContext: itemComposerContext([itemIds[0]]),
                    text: 'Feature this item',
                }
                : { text: 'Show Featured section' };
        }
        case 'bulk_price_update': {
            const amount = readNumber(values, 'amount');
            const exactPrice = readNumber(values, 'newPrice');
            if (!itemIds.length) return null;
            if (exactPrice !== null) {
                return {
                    composerContext: { target: 'item', selectedEntityIds: itemIds },
                    text: `Set price to ${exactPrice}`,
                };
            }
            const direction = readString(values, 'direction', 20);
            return amount !== null && (direction === 'increase' || direction === 'decrease')
                ? {
                    composerContext: { target: 'item', selectedEntityIds: itemIds },
                    text: `${direction} price by ${amount}${readBoolean(values, 'isPercent') ? ' percent' : ''}`,
                }
                : null;
        }
        case 'bulk_availability_update': {
            const available = readBoolean(values, 'available');
            return itemIds.length && available !== null
                ? {
                    composerContext: { target: 'item', selectedEntityIds: itemIds },
                    text: available ? 'available' : 'sold out',
                }
                : null;
        }
        default:
            return null;
    }
}

export function isAiMenuManagerModelResolutionCompatible(
    plannedAction: AiMenuManagerActionType,
    resolvedAction: AiMenuManagerActionType,
) {
    if (plannedAction === resolvedAction) return true;
    return plannedAction === 'item_price_update' && resolvedAction === 'bulk_price_update'
        || plannedAction === 'item_availability_update' && resolvedAction === 'bulk_availability_update';
}

export function doesAiMenuManagerModelRouteMatchResolvedEntities(params: {
    resolvedEntityRefs: Array<{ id: string | number; kind: string }>;
    result: AiMenuManagerModelRouteResult;
}) {
    const resolvedItemIds = new Set(params.resolvedEntityRefs
        .filter((entry) => entry.kind === 'menu_item')
        .map((entry) => String(entry.id)));
    const resolvedCategoryIds = new Set(params.resolvedEntityRefs
        .filter((entry) => entry.kind === 'category')
        .map((entry) => String(entry.id)));
    const plannedItemIds = getTargetIds(params.result, 'item');
    const plannedCategoryIds = getTargetIds(params.result, 'category');

    if (!plannedItemIds.every((id) => resolvedItemIds.has(id))) return false;
    if (params.result.actionType?.startsWith('category_')) {
        return plannedCategoryIds.every((id) => resolvedCategoryIds.has(id));
    }
    return true;
}
