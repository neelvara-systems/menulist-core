import { MENU_DESIGN_PRESETS, getMenuDesignPresetPatch, getPreferredMenuLayoutForMood } from '@lib/menu/menuDesignPresets';
import {
    BRAND_COLOR_PRESETS,
    MENU_LAYOUTS,
    MENU_MOODS,
    MenuLayout,
    MenuMood,
    normalizeHexColor,
} from '@template/main-app/projects/b2cView/designSystem';
import type {
    AiMenuManagerActionDefinition,
    AiMenuManagerActionType,
    AiMenuManagerBeforeAfterSummary,
    AiMenuManagerCardPayload,
    AiMenuManagerCommandContextSelection,
    AiMenuManagerEntityRef,
    AiMenuManagerExecutionMode,
    AiMenuManagerProjectPatch,
    AiMenuManagerScope,
    AiMenuManagerSuggestedReply,
} from '@type/aiMenuManager';
import { buildAnswerCard, buildClarificationCard, buildLocalExportCard, buildManualTaskCard, buildProposalCard, buildUnsupportedCard } from './cardBuilder';
import {
    findAiMenuManagerCategoryCandidates,
    findAiMenuManagerCategoryByName,
    findAiMenuManagerItemCandidates,
    findAiMenuManagerItemByName,
    type AiMenuManagerContextCategory,
    type AiMenuManagerContextItem,
    type AiMenuManagerContextPacket,
} from './contextPacket';
import { hashStableValue } from './idempotency';
import { getAiMenuManagerActionDefinition } from './actionRegistry';
import {
    buildAiMenuManagerFeedbackUrl,
    buildAiMenuManagerPosSetupInfo,
    withAiMenuManagerShareSource,
} from './localExportUrls';
import { resolveDomainConversationCommand } from './domainConversationRouter';

export interface AiMenuManagerResolvedCommand {
    actionType: AiMenuManagerActionType;
    definition: AiMenuManagerActionDefinition;
    title: string;
    message: string;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    patch?: AiMenuManagerProjectPatch;
    patchHash?: string;
    executionMode: AiMenuManagerExecutionMode;
    cardKind?: 'proposal' | 'manual_task' | 'local_export' | 'answer' | 'clarification' | 'unsupported';
    suggestedReplies?: AiMenuManagerSuggestedReply[];
    localActions?: AiMenuManagerCardPayload['localActions'];
}

const PRICE_WORDS = /\b(?:make|set|change|update|price|rate|cost|to|now|is|rs|inr|rupees|rupee|₹|for)\b/gi;
const MAX_SPECIAL_NOTE_LENGTH = 140;

function normalizeText(value = '') {
    return value
        .toLowerCase()
        .replace(/[₹]/g, ' rs ')
        .replace(/[^a-z0-9\s.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanItemName(value: string) {
    return normalizeText(value)
        .replace(PRICE_WORDS, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function scopeForContext(params: {
    tId: string | number;
    sId: string | number;
    projectId: string;
    context: AiMenuManagerContextPacket;
}): AiMenuManagerScope {
    return {
        type: 'project',
        tId: params.tId,
        sId: params.sId,
        projectId: params.projectId,
        label: `${params.context.storeName} / ${params.context.projectName}`,
    };
}

function itemRefs(context: AiMenuManagerContextPacket, item: AiMenuManagerContextItem): AiMenuManagerEntityRef[] {
    return [
        { kind: 'project', id: context.projectId, label: context.projectName },
        { kind: 'category', id: item.categoryId, label: item.categoryName },
        { kind: 'menu_item', id: item.id, label: item.name },
    ];
}

function categoryRefs(context: AiMenuManagerContextPacket, category: AiMenuManagerContextCategory): AiMenuManagerEntityRef[] {
    return [
        { kind: 'project', id: context.projectId, label: context.projectName },
        { kind: 'category', id: category.id, label: category.name },
    ];
}

function itemSuggestionReplies(
    context: AiMenuManagerContextPacket,
    buildPrompt: (item: AiMenuManagerContextItem) => string,
    helper: string,
    limit = 4,
): AiMenuManagerSuggestedReply[] {
    return context.items
        .filter((item) => item.active !== false)
        .slice(0, limit)
        .map((item) => ({
            composerContext: {
                target: 'item',
                selectedEntityIds: [item.id],
            },
            label: item.name,
            prompt: buildPrompt(item),
            helper,
        }));
}

function buildGuidedClarification(params: {
    context: AiMenuManagerContextPacket;
    message: string;
    suggestedReplies?: AiMenuManagerSuggestedReply[];
    title: string;
}): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition('system_clarification_request');
    return {
        actionType: 'system_clarification_request',
        definition,
        title: params.title,
        message: params.message,
        entityRefs: [{ kind: 'project', id: params.context.projectId, label: params.context.projectName }],
        beforeAfterSummary: {
            title: params.title,
            rows: [{ label: 'Needed', after: params.message }],
        },
        executionMode: definition.executionMode,
        cardKind: 'clarification',
        suggestedReplies: params.suggestedReplies,
    };
}

function buildItemCandidateClarification(params: {
    buildPrompt: (item: AiMenuManagerContextItem) => string;
    context: AiMenuManagerContextPacket;
    helper: string;
    itemName: string;
    items: AiMenuManagerContextItem[];
    title: string;
}) {
    return buildGuidedClarification({
        context: params.context,
        title: params.title,
        message: `I found more than one item matching "${params.itemName}". Choose the exact item so Menu Manager can prepare the card.`,
        suggestedReplies: params.items.slice(0, 5).map((item) => ({
            composerContext: {
                target: 'item',
                selectedEntityIds: [item.id],
            },
            label: item.name,
            prompt: params.buildPrompt(item),
            helper: params.helper,
        })),
    });
}

function buildCategoryCandidateClarification(params: {
    buildPrompt: (category: AiMenuManagerContextCategory) => string;
    categories: AiMenuManagerContextCategory[];
    categoryName: string;
    context: AiMenuManagerContextPacket;
    helper: string;
    title: string;
}) {
    return buildGuidedClarification({
        context: params.context,
        title: params.title,
        message: `I found more than one category matching "${params.categoryName}". Choose the exact category so Menu Manager can prepare the card.`,
        suggestedReplies: params.categories.slice(0, 5).map((category) => ({
            composerContext: {
                target: 'category',
                selectedEntityIds: [category.id],
            },
            label: category.name,
            prompt: params.buildPrompt(category),
            helper: params.helper,
        })),
    });
}

function withPatchHash(patch: AiMenuManagerProjectPatch | undefined) {
    return patch ? hashStableValue(patch) : undefined;
}

function localizedUpdate(context: AiMenuManagerContextPacket, value: string) {
    return { [context.defaultLanguage || 'en']: value };
}

function stripCommandWords(value: string, words: RegExp) {
    return value
        .replace(words, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function nextSuggestedPrice(price?: string) {
    const numeric = Number(String(price || '').replace(/[^0-9.]/g, ''));
    const nextPrice = Number.isFinite(numeric) && numeric > 0 ? numeric + 10 : 20;
    return Number.isInteger(nextPrice) ? String(nextPrice) : nextPrice.toFixed(2);
}

function safeExportFilename(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'menulist';
}

function buildItemUpdate(params: {
    actionType: AiMenuManagerActionType;
    title: string;
    message: string;
    context: AiMenuManagerContextPacket;
    item: AiMenuManagerContextItem;
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    updates: Record<string, unknown>;
}): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition(params.actionType);
    const patch: AiMenuManagerProjectPatch = {
        kind: 'item_update',
        itemIds: [params.item.id],
        updates: params.updates,
    };

    return {
        actionType: params.actionType,
        definition,
        title: params.title,
        message: params.message,
        entityRefs: itemRefs(params.context, params.item),
        beforeAfterSummary: params.beforeAfterSummary,
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
}

function buildSelectedItemsPriceUpdate(params: {
    amount: number;
    context: AiMenuManagerContextPacket;
    direction?: 1 | -1;
    isPercent?: boolean;
    items: AiMenuManagerContextItem[];
    setExact?: boolean;
}): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition(params.items.length > 1 ? 'bulk_price_update' : 'item_price_update');
    const itemUpdates = Object.fromEntries(params.items.map((item) => {
        const currentPrice = Number(String(item.price || '0').replace(/[^0-9.]/g, ''));
        const nextPrice = params.setExact
            ? params.amount
            : Math.max(0, currentPrice + (params.direction || 1) * (params.isPercent ? currentPrice * (params.amount / 100) : params.amount));
        const formatted = Number.isInteger(nextPrice) ? String(nextPrice) : nextPrice.toFixed(2);
        return [item.id, { price: formatted }];
    }));
    const patch: AiMenuManagerProjectPatch = params.items.length > 1
        ? {
            kind: 'bulk_item_update',
            itemIds: params.items.map((item) => item.id),
            itemUpdates,
        }
        : {
            kind: 'item_update',
            itemIds: [params.items[0].id],
            updates: itemUpdates[params.items[0].id],
        };

    return {
        actionType: params.items.length > 1 ? 'bulk_price_update' : 'item_price_update',
        definition,
        title: params.items.length > 1
            ? `Update ${params.items.length} selected item prices`
            : `Update ${params.items[0].name} price`,
        message: params.items.length > 1
            ? `${params.items.length} selected item prices will ${params.setExact ? `be set to ${params.amount}` : `${(params.direction || 1) > 0 ? 'increase' : 'decrease'} by ${params.amount}${params.isPercent ? '%' : ''}`}.`
            : `${params.items[0].name} will change from ${params.items[0].price || 'not set'} to ${(itemUpdates[params.items[0].id] as any).price}.`,
        entityRefs: [
            { kind: 'project', id: params.context.projectId, label: params.context.projectName },
            ...params.items.map((item) => ({ kind: 'menu_item' as const, id: item.id, label: item.name })),
        ],
        beforeAfterSummary: {
            title: params.items.length > 1 ? 'Selected item price update' : params.items[0].name,
            rows: params.items.map((item) => ({
                label: item.name,
                before: item.price || 'Not set',
                after: String((itemUpdates[item.id] as any).price),
            })),
            warnings: [
                params.items.length > 1
                    ? 'Bulk price changes affect every selected item after approval.'
                    : 'Price changes affect the public menu after approval.',
            ],
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
}

function buildSelectedItemsBooleanUpdate(params: {
    actionType: 'bulk_availability_update' | 'item_availability_update' | 'item_visibility_update';
    context: AiMenuManagerContextPacket;
    field: 'active' | 'available';
    items: AiMenuManagerContextItem[];
    nextValue: boolean;
}) {
    const definition = getAiMenuManagerActionDefinition(params.actionType);
    const patch: AiMenuManagerProjectPatch = params.items.length > 1
        ? {
            kind: 'bulk_item_update',
            itemIds: params.items.map((item) => item.id),
            updates: { [params.field]: params.nextValue },
        }
        : {
            kind: 'item_update',
            itemIds: [params.items[0].id],
            updates: { [params.field]: params.nextValue },
        };
    const isAvailability = params.field === 'available';
    const actionLabel = isAvailability
        ? params.nextValue ? 'Mark available' : 'Mark sold out'
        : params.nextValue ? 'Show' : 'Hide';

    return {
        actionType: params.actionType,
        definition,
        title: params.items.length > 1 ? `${actionLabel}: ${params.items.length} selected items` : `${actionLabel}: ${params.items[0].name}`,
        message: params.items.length > 1
            ? `${params.items.length} selected items will be ${isAvailability ? params.nextValue ? 'available' : 'sold out' : params.nextValue ? 'shown' : 'hidden'}.`
            : `${params.items[0].name} will be ${isAvailability ? params.nextValue ? 'available' : 'sold out' : params.nextValue ? 'shown on' : 'hidden from'} the selected menu.`,
        entityRefs: [
            { kind: 'project' as const, id: params.context.projectId, label: params.context.projectName },
            ...params.items.map((item) => ({ kind: 'menu_item' as const, id: item.id, label: item.name })),
        ],
        beforeAfterSummary: {
            title: isAvailability ? 'Selected item availability' : 'Selected item visibility',
            rows: params.items.map((item) => ({
                label: item.name,
                before: isAvailability ? item.available ? 'Available' : 'Sold out' : item.active ? 'Shown' : 'Hidden',
                after: isAvailability ? params.nextValue ? 'Available' : 'Sold out' : params.nextValue ? 'Shown' : 'Hidden',
            })),
            warnings: params.items.length > 1
                ? [`This changes every selected item after approval.`]
                : undefined,
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    } satisfies AiMenuManagerResolvedCommand;
}

function splitSelectedEntityNames(value: string) {
    return value
        .split(/\s*,\s*|\s+\+\s+|\s+and\s+/i)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function getComposerContextIds(
    composerContext: AiMenuManagerCommandContextSelection | undefined,
    target: 'item' | 'category',
) {
    if (composerContext?.target !== target) return [];
    return (composerContext.selectedEntityIds || [])
        .map((entry) => String(entry).trim())
        .filter(Boolean);
}

function getUniqueItemsByIds(context: AiMenuManagerContextPacket, ids: string[]) {
    const items: AiMenuManagerContextItem[] = [];
    const seen = new Set<string>();
    ids.forEach((id) => {
        const item = context.items.find((entry) => String(entry.id) === String(id));
        if (item && !seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
        }
    });
    return items;
}

function getUniqueItemsByNames(context: AiMenuManagerContextPacket, names: string[]) {
    const items: AiMenuManagerContextItem[] = [];
    const seen = new Set<string>();
    names.forEach((name) => {
        const item = findAiMenuManagerItemByName(context, name);
        if (item && !seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
        }
    });
    return items;
}

function getCategoryById(context: AiMenuManagerContextPacket, categoryId: string | undefined) {
    if (!categoryId) return null;
    return context.categories.find((category) => String(category.id) === String(categoryId)) || null;
}

function parseSelectedItemCommand(
    text: string,
    context: AiMenuManagerContextPacket,
    composerContext?: AiMenuManagerCommandContextSelection,
): {
    command: string;
    items: AiMenuManagerContextItem[];
} | null {
    const selectedItems = getUniqueItemsByIds(context, getComposerContextIds(composerContext, 'item'));
    const match = text.match(/^\s*Selected items?\s*:\s*(.+?)\.\s*(.+)$/i);
    if (!match) {
        return selectedItems.length ? { items: selectedItems, command: text.trim() } : null;
    }
    if (selectedItems.length) {
        return { items: selectedItems, command: match[2].trim() };
    }
    const names = splitSelectedEntityNames(match[1]);
    const items = getUniqueItemsByNames(context, names);
    if (!items.length || items.length !== names.length) return null;
    return { items, command: match[2].trim() };
}

function resolveSelectedItemsCommand(
    text: string,
    context: AiMenuManagerContextPacket,
    composerContext?: AiMenuManagerCommandContextSelection,
): AiMenuManagerResolvedCommand | null {
    const parsed = parseSelectedItemCommand(text, context, composerContext);
    if (!parsed) return null;
    const normalized = normalizeText(parsed.command);

    const relativePrice = normalized.match(/\b(increase|raise|decrease|reduce)\b(?:\s+(?:price|prices|rate|rates))?\s*(?:by\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(percent|percentage|%))?/i);
    if (relativePrice) {
        return buildSelectedItemsPriceUpdate({
            amount: Number(relativePrice[2]),
            context,
            direction: /^(increase|raise)$/.test(relativePrice[1]) ? 1 : -1,
            isPercent: Boolean(relativePrice[3]),
            items: parsed.items,
        });
    }

    const exactPrice = normalized.match(/^(?:set|change|update|make)?\s*(?:price|prices|rate|rates|cost)?\s*(?:to|as|is)?\s*(\d+(?:\.\d{1,2})?)$/i);
    if (exactPrice) {
        return buildSelectedItemsPriceUpdate({
            amount: Number(exactPrice[1]),
            context,
            items: parsed.items,
            setExact: true,
        });
    }

    const makesUnavailable = /\b(sold out|out of stock|not available|unavailable|over|finished|khatam)\b/.test(normalized);
    const makesAvailable = /\b(available again|back in stock|back|available|in stock)\b/.test(normalized);
    if (makesUnavailable || makesAvailable) {
        const nextValue = makesAvailable && !makesUnavailable;
        return buildSelectedItemsBooleanUpdate({
            actionType: parsed.items.length > 1 ? 'bulk_availability_update' : 'item_availability_update',
            context,
            field: 'available',
            items: parsed.items,
            nextValue,
        });
    }

    const hide = /\b(hide|remove from menu|do not show|disable|deactivate|turn off)\b/.test(normalized);
    const show = /\b(show|restore|enable|activate|make visible|turn on)\b/.test(normalized);
    if (hide || show) {
        return buildSelectedItemsBooleanUpdate({
            actionType: 'item_visibility_update',
            context,
            field: 'active',
            items: parsed.items,
            nextValue: show && !hide,
        });
    }

    const item = parsed.items.length === 1 ? parsed.items[0] : null;
    if (item) {
        const renameMatch = parsed.command.match(/^\s*(?:rename|change|update|set)?\s*(?:item\s+)?(?:name\s*)?(?:to|as)\s+(.+)$/i);
        if (renameMatch?.[1]?.trim()) {
            const nextName = renameMatch[1].trim();
            return buildItemUpdate({
                actionType: 'item_name_update',
                title: `Rename ${item.name}`,
                message: `${item.name} will be renamed to ${nextName}.`,
                context,
                item,
                beforeAfterSummary: {
                    title: item.name,
                    beforeLabel: 'Current name',
                    afterLabel: 'New name',
                    beforeValue: item.name,
                    afterValue: nextName,
                },
                updates: { name: localizedUpdate(context, nextName) },
            });
        }

        const descriptionMatch = parsed.command.match(/^\s*(?:set|change|update|add|write)?\s*(?:description|desc)\s*(?::|-|to|as)\s*(.+)$/i);
        if (descriptionMatch?.[1]?.trim() && descriptionMatch[1].trim().length >= 3) {
            const nextDescription = descriptionMatch[1].trim();
            return buildItemUpdate({
                actionType: 'item_description_update',
                title: `Update ${item.name} description`,
                message: `${item.name} description will be updated on the selected menu.`,
                context,
                item,
                beforeAfterSummary: {
                    title: item.name,
                    beforeLabel: 'Current description',
                    afterLabel: 'New description',
                    beforeValue: item.hasDescription ? 'Has description' : 'No description',
                    afterValue: nextDescription,
                },
                updates: {
                    description: localizedUpdate(context, nextDescription),
                    descriptionSource: 'manual',
                },
            });
        }

        const categoryMatch = parsed.command.match(/^\s*(?:move|put|shift)\s+(?:to|into|under)\s+(.+)$/i);
        if (categoryMatch?.[1]?.trim()) {
            const categoryName = stripCommandWords(categoryMatch[1], /\b(?:category|section|menu)\b/g);
            const category = findAiMenuManagerCategoryByName(context, categoryName);
            if (category) {
                return buildItemUpdate({
                    actionType: 'item_category_update',
                    title: `Move ${item.name}`,
                    message: `${item.name} will move from ${item.categoryName} to ${category.name}.`,
                    context,
                    item,
                    beforeAfterSummary: {
                        title: item.name,
                        beforeLabel: 'Current category',
                        afterLabel: 'New category',
                        beforeValue: item.categoryName,
                        afterValue: category.name,
                    },
                    updates: { category: category.id },
                });
            }
        }

        if (/\b(best seller|bestseller|popular)\b/.test(normalized)) {
            const nextValue = !/\b(remove|unmark|clear|not)\b/.test(normalized);
            return buildItemUpdate({
                actionType: 'item_bestseller_update',
                title: `${nextValue ? 'Mark bestseller' : 'Remove bestseller'}: ${item.name}`,
                message: `${item.name} will ${nextValue ? 'be marked as a bestseller' : 'no longer be marked as a bestseller'}.`,
                context,
                item,
                beforeAfterSummary: {
                    title: item.name,
                    beforeLabel: 'Current bestseller flag',
                    afterLabel: 'New bestseller flag',
                    beforeValue: item.isBestSeller ? 'Marked' : 'Not marked',
                    afterValue: nextValue ? 'Marked' : 'Not marked',
                },
                updates: { isBestSeller: nextValue },
            });
        }

        if (/\b(feature|featured|promote|highlight|spotlight)\b/.test(normalized)) {
            return buildFeaturedSectionUpdate(context, item);
        }

        const prepTimeMatch = normalized.match(/(?:prep time|preparation time|duration|takes)?\s*(?:to|is|as)?\s*(\d{1,3})\s*(?:min|mins|minute|minutes)$/i);
        const minutes = Number(prepTimeMatch?.[1]);
        if (/\b(prep time|preparation time|duration|takes)\b/.test(normalized) && Number.isFinite(minutes) && minutes > 0) {
            return buildItemUpdate({
                actionType: 'item_prep_time_update',
                title: `Update ${item.name} prep time`,
                message: `${item.name} preparation time will change to ${minutes} minutes.`,
                context,
                item,
                beforeAfterSummary: {
                    title: item.name,
                    beforeLabel: 'Current prep time',
                    afterLabel: 'New prep time',
                    beforeValue: item.duration ? `${item.duration} minutes` : 'Not set',
                    afterValue: `${minutes} minutes`,
                },
                updates: { duration: minutes },
            });
        }
    }

    return buildGuidedClarification({
        context,
        title: 'Choose what to change',
        message: 'Tell Menu Manager the exact change for the selected items, for example "increase price by 10" or "sold out".',
        suggestedReplies: [
            { label: 'Increase price', prompt: `${text.split('.')[0]}. increase price by 10`, helper: 'Prepare price changes for selected items' },
            { label: 'Mark sold out', prompt: `${text.split('.')[0]}. sold out`, helper: 'Mark selected items unavailable' },
            { label: 'Hide items', prompt: `${text.split('.')[0]}. hide`, helper: 'Hide selected items from customers' },
        ],
    });
}

function parseSelectedCategoryCommand(
    text: string,
    context: AiMenuManagerContextPacket,
    composerContext?: AiMenuManagerCommandContextSelection,
): {
    category: AiMenuManagerContextCategory;
    command: string;
} | null {
    const selectedCategory = getCategoryById(context, getComposerContextIds(composerContext, 'category')[0]);
    const match = text.match(/^\s*Selected category\s*:\s*(.+?)\.\s*(.+)$/i);
    if (!match) {
        return selectedCategory ? { category: selectedCategory, command: text.trim() } : null;
    }
    if (selectedCategory) {
        return { category: selectedCategory, command: match[2].trim() };
    }
    const category = findAiMenuManagerCategoryByName(context, match[1]);
    if (!category) return null;
    return { category, command: match[2].trim() };
}

function buildCategoryUpdate(params: {
    actionType: AiMenuManagerActionType;
    title: string;
    message: string;
    context: AiMenuManagerContextPacket;
    category: AiMenuManagerContextCategory;
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    updates: Record<string, unknown>;
}): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition(params.actionType);
    const patch: AiMenuManagerProjectPatch = {
        kind: 'category_update',
        categoryIds: [params.category.id],
        updates: params.updates,
    };

    return {
        actionType: params.actionType,
        definition,
        title: params.title,
        message: params.message,
        entityRefs: categoryRefs(params.context, params.category),
        beforeAfterSummary: params.beforeAfterSummary,
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
}

function buildManualFlowTask(params: {
    actionType: AiMenuManagerActionType;
    title: string;
    message: string;
    context: AiMenuManagerContextPacket;
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    entityRefs?: AiMenuManagerEntityRef[];
}): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition(params.actionType);

    return {
        actionType: params.actionType,
        definition,
        title: params.title,
        message: params.message,
        entityRefs: params.entityRefs || [{ kind: 'project', id: params.context.projectId, label: params.context.projectName }],
        beforeAfterSummary: params.beforeAfterSummary,
        executionMode: definition.executionMode,
        cardKind: 'manual_task',
    };
}

function resolvePriceCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const match = normalized.match(/(.+?)\s(?:to|now|is|rs|inr|rupees|rupee)?\s*(\d+(?:\.\d{1,2})?)(?:\s*(?:now|today|please))?\s*$/i);
    if (!match) return null;

    const rawName = cleanItemName(match[1] || '');
    const nextPrice = match[2];
    if (!rawName || !nextPrice) return null;

    const item = findAiMenuManagerItemByName(context, rawName);
    if (!item) {
        const candidates = findAiMenuManagerItemCandidates(context, rawName);
        if (candidates.length > 1) {
            return buildItemCandidateClarification({
                buildPrompt: (candidate) => `${candidate.name} ${nextPrice}`,
                context,
                helper: 'Prepare price card',
                itemName: rawName,
                items: candidates,
                title: 'Which item price should change?',
            });
        }
        return null;
    }

    return buildItemUpdate({
        actionType: 'item_price_update',
        title: `Update ${item.name} price`,
        message: `${item.name} will change from ${item.price || 'not set'} to ${nextPrice}.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current price',
            afterLabel: 'New price',
            beforeValue: item.price || 'Not set',
            afterValue: nextPrice,
            warnings: ['Price changes affect the public menu after approval.'],
        },
        updates: { price: nextPrice },
    });
}

function extractAvailabilityItemName(normalized: string) {
    return normalized
        .replace(/\b(?:sold out|out of stock|not available|unavailable|over|finished|khatam hai|khatam|available again|back in stock|back|available|in stock|restore)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveAvailabilityCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const makesUnavailable = /\b(sold out|out of stock|not available|unavailable|over|finished|khatam hai|khatam)\b/.test(normalized);
    const mentionsRestore = /\brestore\b/.test(normalized);
    const makesAvailable = /\b(available again|back in stock|back|available|in stock|restore)\b/.test(normalized);
    if (!makesUnavailable && !makesAvailable) return null;

    const itemName = extractAvailabilityItemName(normalized);
    const item = findAiMenuManagerItemByName(context, itemName);
    if (!item) {
        const candidates = findAiMenuManagerItemCandidates(context, itemName);
        if (candidates.length > 1) {
            return buildItemCandidateClarification({
                buildPrompt: (candidate) => `${candidate.name} ${makesAvailable && !makesUnavailable ? 'available' : 'sold out'}`,
                context,
                helper: 'Prepare availability card',
                itemName,
                items: candidates,
                title: 'Which item availability should change?',
            });
        }
        return null;
    }

    if (mentionsRestore) {
        if (!item.available && !item.active) {
            return buildGuidedClarification({
                context,
                title: `Restore ${item.name}`,
                message: `${item.name} is both hidden and sold out. Choose what should change first.`,
                suggestedReplies: [
                    {
                        composerContext: { target: 'item', selectedEntityIds: [item.id] },
                        helper: 'Change availability only',
                        label: 'Mark available',
                        prompt: 'Mark available',
                    },
                    {
                        composerContext: { target: 'item', selectedEntityIds: [item.id] },
                        helper: 'Change visibility only',
                        label: 'Show on menu',
                        prompt: 'Show item',
                    },
                ],
            });
        }
        if (item.available || !item.active) return null;
    }

    const nextValue = makesAvailable && !makesUnavailable;
    return buildItemUpdate({
        actionType: 'item_availability_update',
        title: `${nextValue ? 'Mark available' : 'Mark sold out'}: ${item.name}`,
        message: `${item.name} will be ${nextValue ? 'available' : 'sold out'} on the selected menu.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current availability',
            afterLabel: 'New availability',
            beforeValue: item.available ? 'Available' : 'Sold out',
            afterValue: nextValue ? 'Available' : 'Sold out',
        },
        updates: { available: nextValue },
    });
}

function resolveVisibilityCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const hide = /\b(hide|remove from menu|do not show|disable|deactivate|turn off)\b/.test(normalized);
    const show = /\b(show|restore|enable|activate|make visible|turn on)\b/.test(normalized);
    if (!hide && !show) return null;

    const itemName = normalized
        .replace(/\b(?:hide|remove from menu|do not show|disable|deactivate|turn off|show|restore|enable|activate|make visible|turn on|item|menu)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const item = findAiMenuManagerItemByName(context, itemName);
    if (!item) {
        const candidates = findAiMenuManagerItemCandidates(context, itemName);
        if (candidates.length > 1) {
            const nextValue = show && !hide;
            return buildItemCandidateClarification({
                buildPrompt: (candidate) => `${nextValue ? 'Show' : 'Hide'} ${candidate.name}`,
                context,
                helper: 'Prepare visibility card',
                itemName,
                items: candidates,
                title: 'Which item visibility should change?',
            });
        }
        return null;
    }

    const nextValue = show && !hide;
    return buildItemUpdate({
        actionType: 'item_visibility_update',
        title: `${nextValue ? 'Show' : 'Hide'} ${item.name}`,
        message: `${item.name} will be ${nextValue ? 'shown on' : 'hidden from'} the selected menu.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current visibility',
            afterLabel: 'New visibility',
            beforeValue: item.active ? 'Shown' : 'Hidden',
            afterValue: nextValue ? 'Shown' : 'Hidden',
        },
        updates: { active: nextValue },
    });
}

function resolveCategoryVisibilityCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(category|categories|section|sections)\b/.test(normalized)) return null;

    const hide = /\b(hide|remove from menu|do not show|disable|deactivate|turn off)\b/.test(normalized);
    const show = /\b(show|restore|enable|activate|make visible|turn on)\b/.test(normalized);
    if (!hide && !show) return null;

    const categoryName = normalized
        .replace(/\b(?:hide|remove from menu|do not show|disable|deactivate|turn off|show|restore|enable|activate|make visible|turn on|category|categories|section|sections|menu)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const category = findAiMenuManagerCategoryByName(context, categoryName);
    if (!category) {
        const candidates = findAiMenuManagerCategoryCandidates(context, categoryName);
        if (candidates.length > 1) {
            const nextValue = show && !hide;
            return buildCategoryCandidateClarification({
                buildPrompt: (candidate) => `${nextValue ? 'Show' : 'Hide'} ${candidate.name} category`,
                categories: candidates,
                categoryName,
                context,
                helper: 'Prepare category card',
                title: 'Which category visibility should change?',
            });
        }
        return null;
    }

    const nextValue = show && !hide;
    const itemCount = context.items.filter((item) => item.categoryId === category.id).length;

    return buildCategoryUpdate({
        actionType: 'category_visibility_update',
        title: `${nextValue ? 'Show' : 'Hide'} ${category.name}`,
        message: `${category.name} will be ${nextValue ? 'shown on' : 'hidden from'} the selected menu.`,
        context,
        category,
        beforeAfterSummary: {
            title: category.name,
            beforeLabel: 'Current category visibility',
            afterLabel: 'New category visibility',
            beforeValue: category.active ? 'Shown' : 'Hidden',
            afterValue: nextValue ? 'Shown' : 'Hidden',
            rows: [
                { label: 'Category items', before: `${itemCount}`, after: `${itemCount}` },
                { label: 'Menu order', before: 'Unchanged', after: 'Unchanged' },
            ],
            warnings: [
                nextValue
                    ? 'Items in this category become visible only if each item is also shown and available.'
                    : 'Hiding a category can hide every item inside that category from customers.',
            ],
        },
        updates: { active: nextValue },
    });
}

function resolveItemRenameCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const match = normalized.match(/^(?:rename|change|update|set)\s+(.+?)\s+(?:to|as|name to|name as)\s+(.+)$/i);
    if (!match || !/\b(?:rename|name)\b/.test(normalized)) return null;

    const item = findAiMenuManagerItemByName(context, match[1]);
    const nextName = (match[2] || '').trim();
    if (!item || !nextName) return null;

    return buildItemUpdate({
        actionType: 'item_name_update',
        title: `Rename ${item.name}`,
        message: `${item.name} will be renamed to ${nextName}.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current name',
            afterLabel: 'New name',
            beforeValue: item.name,
            afterValue: nextName,
        },
        updates: { name: localizedUpdate(context, nextName) },
    });
}

function resolveCategoryRenameCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const match = normalized.match(/^(?:rename|change|update|set)\s+(.+?)\s+(?:category|section)?\s*(?:to|as|name to|name as)\s+(.+)$/i);
    if (!match || !/\b(?:category|section|rename)\b/.test(normalized)) return null;

    const category = findAiMenuManagerCategoryByName(context, match[1]);
    const nextName = (match[2] || '').trim();
    if (!category || !nextName) return null;

    return buildCategoryUpdate({
        actionType: 'category_name_update',
        title: `Rename ${category.name}`,
        message: `${category.name} will be renamed to ${nextName}.`,
        context,
        category,
        beforeAfterSummary: {
            title: category.name,
            beforeLabel: 'Current category',
            afterLabel: 'New category',
            beforeValue: category.name,
            afterValue: nextName,
        },
        updates: { name: localizedUpdate(context, nextName) },
    });
}

function resolveItemDescriptionCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(description|describe)\b/.test(normalized)) return null;

    const match = text.match(/^\s*(?:set|change|update|add|write)?\s*(.+?)\s+(?:description|desc)\s*(?::|-|\s+(?:to|as)\s+)\s*(.+)$/i)
        || text.match(/^\s*(?:set|change|update|add|write)?\s*(?:description|desc)\s+(?:for|of)\s+(.+?)\s*(?::|-|\s+(?:to|as)\s+)\s*(.+)$/i);
    if (!match) return null;

    const item = findAiMenuManagerItemByName(context, match[1]);
    const nextDescription = (match[2] || '').trim();
    if (!item || nextDescription.length < 3) return null;

    return buildItemUpdate({
        actionType: 'item_description_update',
        title: `Update ${item.name} description`,
        message: `${item.name} description will be updated on the selected menu.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current description',
            afterLabel: 'New description',
            beforeValue: item.hasDescription ? 'Has description' : 'No description',
            afterValue: nextDescription,
        },
        updates: {
            description: localizedUpdate(context, nextDescription),
            descriptionSource: 'manual',
        },
    });
}

function resolveItemCategoryMoveCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(move|put|shift)\b/.test(normalized) || !/\b(to|into|under)\b/.test(normalized)) return null;

    const match = normalized.match(/^(?:move|put|shift)\s+(.+?)\s+(?:to|into|under)\s+(.+)$/i);
    if (!match) return null;

    const itemName = stripCommandWords(match[1], /\b(?:item|menu)\b/g);
    const categoryName = stripCommandWords(match[2], /\b(?:category|section|menu)\b/g);
    const item = findAiMenuManagerItemByName(context, itemName);
    const category = findAiMenuManagerCategoryByName(context, categoryName);
    if (!item || !category) return null;

    return buildItemUpdate({
        actionType: 'item_category_update',
        title: `Move ${item.name}`,
        message: `${item.name} will move from ${item.categoryName} to ${category.name}.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current category',
            afterLabel: 'New category',
            beforeValue: item.categoryName,
            afterValue: category.name,
        },
        updates: { category: category.id },
    });
}

function resolveBestSellerCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(best seller|bestseller|popular)\b/.test(normalized)) return null;

    const remove = /\b(remove|unmark|clear|not)\b/.test(normalized);
    const itemName = stripCommandWords(
        normalized,
        /\b(?:mark|make|set|as|best seller|bestseller|popular|item|menu|remove|unmark|clear|not)\b/g,
    );
    const item = findAiMenuManagerItemByName(context, itemName);
    if (!item) return null;

    const nextValue = !remove;
    return buildItemUpdate({
        actionType: 'item_bestseller_update',
        title: `${nextValue ? 'Mark bestseller' : 'Remove bestseller'}: ${item.name}`,
        message: `${item.name} will ${nextValue ? 'be marked as a bestseller' : 'no longer be marked as a bestseller'}.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current bestseller flag',
            afterLabel: 'New bestseller flag',
            beforeValue: item.isBestSeller ? 'Marked' : 'Not marked',
            afterValue: nextValue ? 'Marked' : 'Not marked',
        },
        updates: { isBestSeller: nextValue },
    });
}

function resolvePrepTimeCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(prep time|preparation time|duration|takes)\b/.test(normalized)) return null;

    const match = normalized.match(/(.+?)\s+(?:prep time|preparation time|duration|takes)?\s*(?:to|is|as)?\s*(\d{1,3})\s*(?:min|mins|minute|minutes)?$/i);
    if (!match) return null;

    const itemName = stripCommandWords(match[1], /\b(?:set|change|update|make|item|menu|prep time|preparation time|duration|takes)\b/g);
    const item = findAiMenuManagerItemByName(context, itemName);
    const minutes = Number(match[2]);
    if (!item || !Number.isFinite(minutes) || minutes <= 0) return null;

    return buildItemUpdate({
        actionType: 'item_prep_time_update',
        title: `Update ${item.name} prep time`,
        message: `${item.name} prep time will be set to ${minutes} minutes.`,
        context,
        item,
        beforeAfterSummary: {
            title: item.name,
            beforeLabel: 'Current time',
            afterLabel: 'New time',
            beforeValue: item.duration ? `${item.duration} minutes` : 'Not set',
            afterValue: `${minutes} minutes`,
        },
        updates: { duration: minutes },
    });
}

function findItemNameById(context: AiMenuManagerContextPacket, itemId?: string) {
    if (!itemId) return undefined;
    return context.items.find((item) => item.id === itemId)?.name;
}

function buildFeaturedSectionUpdate(
    context: AiMenuManagerContextPacket,
    item: AiMenuManagerContextItem | null,
): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition('decision_blocks_update');
    const currentPinnedName = findItemNameById(context, context.decisionBlocks.pinnedPopular);
    const nextFeaturedLabel = item?.name || currentPinnedName || 'MenuList chooses automatically';
    const patch: AiMenuManagerProjectPatch = {
        kind: 'decision_blocks_update',
        decisionBlocks: {
            enablePopular: true,
            ...(item ? { pinnedPopular: item.id } : {}),
        },
    };

    return {
        actionType: 'decision_blocks_update',
        definition,
        title: item ? `Feature ${item.name}` : 'Show Featured section',
        message: item
            ? `${item.name} will be pinned as the Featured choice for ${context.projectName}.`
            : currentPinnedName
                ? `The Featured section will be enabled for ${context.projectName}. ${currentPinnedName} stays selected as the Featured choice.`
                : `The Featured section will be enabled for ${context.projectName}. MenuList will choose automatically until you name an item.`,
        entityRefs: item
            ? itemRefs(context, item)
            : [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'Featured section',
            rows: [
                {
                    label: 'Current Featured choice',
                    before: context.decisionBlocks.enablePopular
                        ? currentPinnedName || 'MenuList chooses automatically'
                        : 'Hidden',
                    after: nextFeaturedLabel,
                },
                { label: 'Section', before: context.decisionBlocks.enablePopular ? 'Shown' : 'Hidden', after: 'Shown' },
                { label: 'Menu order', before: 'Unchanged', after: 'Unchanged' },
            ],
            warnings: ['This changes only the Featured section for the selected menu.'],
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
}

function resolveFeaturedSectionCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const mentionsFeatured = /\b(featured|feature|promote|highlight|spotlight)\b/.test(normalized);
    if (!mentionsFeatured) return null;
    if (/\b(what|which|suggest|recommend|should i|can i)\b/.test(normalized)) return null;

    const itemName = normalized
        .replace(/\b(?:show|add|set|make|put|pin|promote|highlight|spotlight|feature|featured|choice|section|menu|item|this|in|on|as|to|the)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const item = itemName ? findAiMenuManagerItemByName(context, itemName) : null;
    if (!item && /\b(this item|which item|promote item|feature item|highlight item)\b/.test(normalized)) {
        return buildGuidedClarification({
            context,
            title: 'Choose item to feature',
            message: 'Pick the item Menu Manager should put in the Featured section.',
            suggestedReplies: itemSuggestionReplies(
                context,
                (entry) => `Feature ${entry.name}`,
                'Feature this item',
            ),
        });
    }
    return buildFeaturedSectionUpdate(context, item);
}

function resolveSpecialNoteCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(note|banner|message|announcement)\b/.test(normalized)) return null;

    const rawNote = text
        .replace(/^\s*(?:show|set|update|change|add)?\s*(?:menu\s*)?(?:note|banner|message|announcement)\s*[:\-]?\s*/i, '')
        .trim();
    if (!rawNote || rawNote.length < 3) return null;

    const note = rawNote.slice(0, MAX_SPECIAL_NOTE_LENGTH);
    const definition = getAiMenuManagerActionDefinition('menu_special_note_update');
    const patch: AiMenuManagerProjectPatch = {
        kind: 'menu_settings_update',
        menuSettings: { specialNote: note },
    };

    return {
        actionType: 'menu_special_note_update',
        definition,
        title: 'Update menu note',
        message: `Menu note will be updated for ${context.projectName}.`,
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'Menu note',
            beforeLabel: 'Current',
            afterLabel: 'New',
            beforeValue: 'Existing note, if any',
            afterValue: note,
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
}

function buildCategoryBulkPriceUpdate(params: {
    amount: number;
    category: AiMenuManagerContextCategory;
    context: AiMenuManagerContextPacket;
    direction: 1 | -1;
    isPercent?: boolean;
}) {
    const affectedItems = params.context.items.filter((item) => {
        const currentPrice = Number(String(item.price || '').replace(/[^0-9.]/g, ''));
        return item.categoryId === params.category.id && item.price && Number.isFinite(currentPrice);
    });
    if (!affectedItems.length || !Number.isFinite(params.amount)) return null;

    const itemUpdates = Object.fromEntries(affectedItems.map((item) => {
        const currentPrice = Number(String(item.price || '0').replace(/[^0-9.]/g, ''));
        const delta = params.isPercent ? currentPrice * (params.amount / 100) : params.amount;
        const nextPrice = Math.max(0, currentPrice + params.direction * delta);
        const formatted = Number.isInteger(nextPrice) ? String(nextPrice) : nextPrice.toFixed(2);
        return [item.id, { price: formatted }];
    }));
    const patch: AiMenuManagerProjectPatch = {
        kind: 'bulk_item_update',
        itemIds: affectedItems.map((item) => item.id),
        itemUpdates,
    };
    const definition = getAiMenuManagerActionDefinition('bulk_price_update');

    return {
        actionType: 'bulk_price_update',
        definition,
        title: `Update ${params.category.name} prices`,
        message: `${affectedItems.length} ${params.category.name} item${affectedItems.length === 1 ? '' : 's'} will ${params.direction > 0 ? 'increase' : 'decrease'} by ${params.amount}${params.isPercent ? '%' : ''}.`,
        entityRefs: categoryRefs(params.context, params.category),
        beforeAfterSummary: {
            title: 'Bulk price update',
            rows: [
                { label: 'Scope', before: params.category.name, after: params.category.name },
                { label: 'Affected items', before: `${affectedItems.length}`, after: `${affectedItems.length}` },
                ...affectedItems.slice(0, 3).map((item) => ({
                    label: item.name,
                    before: item.price || 'Not set',
                    after: String((itemUpdates[item.id] as any).price),
                })),
            ],
            warnings: ['Bulk price changes affect every listed item after approval.'],
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    } satisfies AiMenuManagerResolvedCommand;
}

function buildCategoryBulkAvailabilityUpdate(params: {
    category: AiMenuManagerContextCategory;
    context: AiMenuManagerContextPacket;
    nextValue: boolean;
}) {
    const affectedItems = params.context.items.filter((item) => item.categoryId === params.category.id);
    if (!affectedItems.length) return null;

    const definition = getAiMenuManagerActionDefinition('bulk_availability_update');
    const patch: AiMenuManagerProjectPatch = {
        kind: 'bulk_item_update',
        itemIds: affectedItems.map((item) => item.id),
        updates: { available: params.nextValue },
    };

    return {
        actionType: 'bulk_availability_update',
        definition,
        title: `${params.nextValue ? 'Mark available' : 'Mark sold out'}: ${params.category.name}`,
        message: `${affectedItems.length} ${params.category.name} item${affectedItems.length === 1 ? '' : 's'} will be ${params.nextValue ? 'available' : 'sold out'}.`,
        entityRefs: categoryRefs(params.context, params.category),
        beforeAfterSummary: {
            title: 'Bulk availability update',
            rows: [
                { label: 'Scope', before: params.category.name, after: params.category.name },
                { label: 'Affected items', before: `${affectedItems.length}`, after: `${affectedItems.length}` },
                ...affectedItems.slice(0, 3).map((item) => ({
                    label: item.name,
                    before: item.available ? 'Available' : 'Sold out',
                    after: params.nextValue ? 'Available' : 'Sold out',
                })),
            ],
            warnings: ['Bulk availability changes affect every listed item after approval.'],
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    } satisfies AiMenuManagerResolvedCommand;
}

function resolveSelectedCategoryCommand(
    text: string,
    context: AiMenuManagerContextPacket,
    composerContext?: AiMenuManagerCommandContextSelection,
): AiMenuManagerResolvedCommand | null {
    const parsed = parseSelectedCategoryCommand(text, context, composerContext);
    if (!parsed) return null;
    const normalized = normalizeText(parsed.command);

    const relativePrice = normalized.match(/\b(increase|raise|decrease|reduce)\b(?:\s+(?:price|prices|rate|rates))?\s*(?:by\s*)?(\d+(?:\.\d{1,2})?)(?:\s*(percent|percentage|%))?/i);
    if (relativePrice) {
        return buildCategoryBulkPriceUpdate({
            amount: Number(relativePrice[2]),
            category: parsed.category,
            context,
            direction: /^(increase|raise)$/.test(relativePrice[1]) ? 1 : -1,
            isPercent: Boolean(relativePrice[3]),
        });
    }

    const makesUnavailable = /\b(sold out|out of stock|not available|unavailable|over|finished|khatam)\b/.test(normalized);
    const makesAvailable = /\b(available again|back in stock|back|available|in stock)\b/.test(normalized);
    if (makesUnavailable || makesAvailable) {
        return buildCategoryBulkAvailabilityUpdate({
            category: parsed.category,
            context,
            nextValue: makesAvailable && !makesUnavailable,
        });
    }

    const hide = /\b(hide|remove from menu|do not show|disable|deactivate|turn off)\b/.test(normalized);
    const show = /\b(show|restore|enable|activate|make visible|turn on)\b/.test(normalized);
    if (hide || show) {
        const nextValue = show && !hide;
        const itemCount = context.items.filter((item) => item.categoryId === parsed.category.id).length;
        return buildCategoryUpdate({
            actionType: 'category_visibility_update',
            title: `${nextValue ? 'Show' : 'Hide'} ${parsed.category.name}`,
            message: `${parsed.category.name} will be ${nextValue ? 'shown on' : 'hidden from'} the selected menu.`,
            context,
            category: parsed.category,
            beforeAfterSummary: {
                title: parsed.category.name,
                beforeLabel: 'Current category visibility',
                afterLabel: 'New category visibility',
                beforeValue: parsed.category.active ? 'Shown' : 'Hidden',
                afterValue: nextValue ? 'Shown' : 'Hidden',
                rows: [
                    { label: 'Category items', before: `${itemCount}`, after: `${itemCount}` },
                    { label: 'Menu order', before: 'Unchanged', after: 'Unchanged' },
                ],
                warnings: [
                    nextValue
                        ? 'Items in this category become visible only if each item is also shown and available.'
                        : 'Hiding a category can hide every item inside that category from customers.',
                ],
            },
            updates: { active: nextValue },
        });
    }

    const renameMatch = parsed.command.match(/^\s*(?:rename|change|update|set)?\s*(?:category|section)?\s*(?:name\s*)?(?:to|as)\s+(.+)$/i);
    if (renameMatch?.[1]?.trim()) {
        const nextName = renameMatch[1].trim();
        return buildCategoryUpdate({
            actionType: 'category_name_update',
            title: `Rename ${parsed.category.name}`,
            message: `${parsed.category.name} will be renamed to ${nextName}.`,
            context,
            category: parsed.category,
            beforeAfterSummary: {
                title: parsed.category.name,
                beforeLabel: 'Current category',
                afterLabel: 'New category',
                beforeValue: parsed.category.name,
                afterValue: nextName,
            },
            updates: { name: localizedUpdate(context, nextName) },
        });
    }

    return buildGuidedClarification({
        context,
        title: 'Choose what to change',
        message: 'Tell Menu Manager the exact change for the selected category, for example "increase price by 10", "sold out", or "hide".',
        suggestedReplies: [
            { label: 'Increase prices', prompt: `Selected category: ${parsed.category.name}. increase price by 10`, helper: 'Prepare price changes for this category' },
            { label: 'Mark sold out', prompt: `Selected category: ${parsed.category.name}. sold out`, helper: 'Mark every item in this category unavailable' },
            { label: 'Hide category', prompt: `Selected category: ${parsed.category.name}. hide`, helper: 'Hide this category from customers' },
        ],
    });
}

function resolveBulkPriceCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(?:increase|raise|decrease|reduce)\b/.test(normalized) || !/\b(?:all|category|section)\b/.test(normalized)) return null;

    const match = normalized.match(/\b(increase|raise|decrease|reduce)\b\s+(?:all\s+)?(.+?)\s+(?:by\s+)?(\d+(?:\.\d{1,2})?)\s*(percent|percentage|%)?$/i);
    if (!match) return null;

    const direction = /^(increase|raise)$/.test(match[1]) ? 1 : -1;
    const categoryName = stripCommandWords(match[2], /\b(?:items|item|prices|price|rates|rate|category|section|menu|by)\b/g);
    const category = findAiMenuManagerCategoryByName(context, categoryName);
    if (!category) return null;

    const amount = Number(match[3]);
    const isPercent = Boolean(match[4]);
    return buildCategoryBulkPriceUpdate({
        amount,
        category,
        context,
        direction,
        isPercent,
    });
}

function resolveBulkAvailabilityCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(?:all|category|section)\b/.test(normalized)) return null;

    const makesUnavailable = /\b(sold out|out of stock|not available|unavailable|over|finished|khatam)\b/.test(normalized);
    const makesAvailable = /\b(available again|back in stock|available|in stock)\b/.test(normalized);
    if (!makesUnavailable && !makesAvailable) return null;

    const categoryName = stripCommandWords(
        normalized,
        /\b(?:mark|make|set|all|items|item|category|section|as|sold out|out of stock|not available|unavailable|over|finished|khatam|available again|back in stock|available|in stock)\b/g,
    );
    const category = findAiMenuManagerCategoryByName(context, categoryName);
    if (!category) return null;

    const nextValue = makesAvailable && !makesUnavailable;
    return buildCategoryBulkAvailabilityUpdate({ category, context, nextValue });
}

function pickDesignPreset(text: string) {
    const normalized = normalizeText(text);
    const key = /\b(premium|minimal|elegant)\b/.test(normalized)
        ? 'premium-minimal'
        : /\b(fast|quick|speed|counter)\b/.test(normalized)
            ? 'fast-ordering'
            : /\b(warm|dining|family|restaurant)\b/.test(normalized)
                ? 'warm-dining'
                : /\b(bold|social|modern|instagram)\b/.test(normalized)
                    ? 'bold-social'
                    : /\b(cafe|fresh)\b/.test(normalized)
                        ? 'fresh-cafe'
                        : /\b(clean|simple|service)\b/.test(normalized)
                            ? 'clean-service'
                            : null;
    return key ? MENU_DESIGN_PRESETS.find((preset) => preset.key === key) || null : null;
}

const MENU_TONE_OPTIONS: MenuMood[] = [
    MenuMood.CLEAN,
    MenuMood.WARM,
    MenuMood.PREMIUM,
    MenuMood.BOLD,
    MenuMood.FAST,
];

const displayOptionConfig = {
    showCategoryIcons: {
        label: 'Category icons',
        offPrompt: 'Hide category icons',
        onPrompt: 'Show category icons',
    },
    showCategoryTabs: {
        label: 'Category tabs',
        offPrompt: 'Hide category tabs',
        onPrompt: 'Show category tabs',
    },
    showImages: {
        label: 'Item images',
        offPrompt: 'Hide item images',
        onPrompt: 'Show item images',
    },
    showItemPrices: {
        label: 'Item prices',
        offPrompt: 'Hide item prices',
        onPrompt: 'Show item prices',
    },
} as const;

function booleanDisplay(value?: boolean) {
    return value === false ? 'Hidden' : 'Shown';
}

function menuMoodLabel(value?: string) {
    return MENU_MOODS[value as MenuMood]?.label || value || 'Current';
}

function menuLayoutLabel(value?: string) {
    return MENU_LAYOUTS[value as MenuLayout]?.label || value || 'Current';
}

function pickMenuMood(text: string): MenuMood | null {
    const normalized = normalizeText(text);
    if (/\b(clean|calm)\b/.test(normalized)) return MenuMood.CLEAN;
    if (/\b(warm|inviting|family)\b/.test(normalized)) return MenuMood.WARM;
    if (/\b(premium|minimal|fine dining|boutique|elegant)\b/.test(normalized)) return MenuMood.PREMIUM;
    if (/\b(bold|social|nightlife|bar|burger)\b/.test(normalized)) return MenuMood.BOLD;
    if (/\b(fast|direct|counter|qsr|quick)\b/.test(normalized)) return MenuMood.FAST;
    return null;
}

function pickMenuLayout(text: string): MenuLayout | null {
    const normalized = normalizeText(text);
    if (/\blist\b/.test(normalized)) return MenuLayout.LIST;
    if (/\bgrid\b/.test(normalized)) return MenuLayout.GRID;
    if (/\bcard\b/.test(normalized)) return MenuLayout.CARD;
    return null;
}

function pickBrandColor(text: string): { color: string; name: string } | null {
    const hexMatch = text.match(/#?[0-9a-f]{6}\b/i);
    const normalizedHex = normalizeHexColor(hexMatch?.[0]);
    if (normalizedHex) {
        const known = BRAND_COLOR_PRESETS.find((preset) => preset.color.toLowerCase() === normalizedHex);
        return { color: normalizedHex, name: known?.name || normalizedHex.toUpperCase() };
    }

    const normalized = normalizeText(text);
    return BRAND_COLOR_PRESETS.find((preset) => {
        const presetName = normalizeText(preset.name);
        return normalized.includes(presetName)
            || presetName.split(' ').some((part) => part.length >= 3 && normalized.includes(part));
    }) || null;
}

function buildDesignPatchCommand(params: {
    actionType: AiMenuManagerActionType;
    title: string;
    message: string;
    context: AiMenuManagerContextPacket;
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    designPatch: NonNullable<AiMenuManagerProjectPatch['designPatch']>;
    entityRefs?: AiMenuManagerEntityRef[];
    designPresetKey?: string;
}): AiMenuManagerResolvedCommand {
    const definition = getAiMenuManagerActionDefinition(params.actionType);
    const patch: AiMenuManagerProjectPatch = {
        kind: 'menu_design_preset_apply',
        designPatch: params.designPatch,
        designPresetKey: params.designPresetKey,
    };

    return {
        actionType: params.actionType,
        definition,
        title: params.title,
        message: params.message,
        entityRefs: params.entityRefs || [{ kind: 'project', id: params.context.projectId, label: params.context.projectName }],
        beforeAfterSummary: params.beforeAfterSummary,
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
}

function resolveDesignCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const preset = pickDesignPreset(text);
    const mood = pickMenuMood(text);
    const layout = pickMenuLayout(text);
    const color = pickBrandColor(text);
    const mentionsBackground = /\b(background|backdrop|cover image|banner image)\b/.test(normalized);
    const mentionsColor = /\b(theme color|menu color|brand color|accent color|highlight color|color)\b/.test(normalized);
    const mentionsDisplay = /\b(display option|display options|category icons|category tabs)\b/.test(normalized)
        || /\b(show|hide|display|turn on|turn off|enable|disable)\b.*\b(prices?|rates?|images?|photos?|pictures?)\b/.test(normalized)
        || /\b(prices?|rates?|images?|photos?|pictures?)\b.*\b(show|hide|display|turn on|turn off|enable|disable)\b/.test(normalized);
    const mentionsLayout = /\b(layout|arrangement|list layout|grid layout|card layout)\b/.test(normalized);
    const mentionsTone = /\b(theme|tone|mood|presentation|appearance)\b/.test(normalized);
    const mentionsDesignSurface = /\b(menu|theme|style|design|look|mood|appearance|layout|display|presentation)\b/.test(normalized);
    const mentionsDesignAction = /\b(make|set|change|apply|use|switch|turn|give|choose|select|update)\b/.test(normalized);
    const asksForPresetStyle = Boolean(preset)
        && /\b(make|set|change|apply|use|switch|turn|give)\b/.test(normalized);
    const hasSpecificDesignIntent = asksForPresetStyle
        || mentionsBackground
        || mentionsLayout
        || mentionsColor
        || mentionsDisplay
        || mentionsTone
        || (mentionsDesignSurface && mentionsDesignAction);

    if (!hasSpecificDesignIntent) return null;

    if (mentionsBackground) {
        return buildManualFlowTask({
            actionType: 'menu_design_background_update',
            title: 'Open menu background settings',
            message: 'Choose or upload the background image from Menu design so the same image review tools are used.',
            context,
            beforeAfterSummary: {
                title: 'Background image',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Where to finish', after: 'More > Menu design > Background' },
                ],
                warnings: ['Menu Manager will not guess or apply a background image without a selected image asset.'],
            },
        });
    }

    if (mentionsLayout) {
        if (!layout) {
            return buildGuidedClarification({
                context,
                title: 'Choose menu layout',
                message: 'Pick the item layout Menu Manager should prepare.',
                suggestedReplies: [MenuLayout.LIST, MenuLayout.GRID, MenuLayout.CARD].map((layoutKey) => ({
                    label: MENU_LAYOUTS[layoutKey].label,
                    prompt: `Use ${MENU_LAYOUTS[layoutKey].label.toLowerCase()} layout`,
                    helper: MENU_LAYOUTS[layoutKey].description,
                })),
            });
        }

        return buildDesignPatchCommand({
            actionType: 'menu_design_layout_update',
            title: `Use ${MENU_LAYOUTS[layout].label} layout`,
            message: `${MENU_LAYOUTS[layout].label} layout will be applied to ${context.projectName}.`,
            context,
            beforeAfterSummary: {
                title: 'Menu layout',
                rows: [
                    { label: 'Layout', before: menuLayoutLabel(context.menuDesign.layout), after: MENU_LAYOUTS[layout].label },
                ],
            },
            designPatch: { menu: { layout } },
        });
    }

    if (mentionsColor) {
        if (!color) {
            return buildGuidedClarification({
                context,
                title: 'Choose theme color',
                message: 'Pick the highlight color Menu Manager should prepare.',
                suggestedReplies: BRAND_COLOR_PRESETS.map((presetColor) => ({
                    label: presetColor.name,
                    prompt: `Set theme color to ${presetColor.name}`,
                    helper: presetColor.color.toUpperCase(),
                })),
            });
        }

        return buildDesignPatchCommand({
            actionType: 'menu_design_color_update',
            title: `Use ${color.name} theme color`,
            message: `${color.name} will be used as the highlight color for ${context.projectName}.`,
            context,
            beforeAfterSummary: {
                title: 'Theme color',
                rows: [
                    { label: 'Color', before: context.menuDesign.accentColor || 'Current tone color', after: color.color.toUpperCase() },
                ],
            },
            designPatch: { brand: { accentColor: color.color } },
        });
    }

    if (mentionsDisplay) {
        const displayTarget = /\b(category icons?)\b/.test(normalized)
            ? 'showCategoryIcons'
            : /\b(category tabs?|tabs?)\b/.test(normalized)
                ? 'showCategoryTabs'
                : /\b(images?|photos?|pictures?)\b/.test(normalized)
                    ? 'showImages'
                    : /\b(prices?|rates?)\b/.test(normalized)
                        ? 'showItemPrices'
                        : null;
        const wantsOff = /\b(hide|remove|turn off|disable|stop showing|don t show|dont show)\b/.test(normalized);
        const wantsOn = /\b(show|display|turn on|enable)\b/.test(normalized);

        if (!displayTarget || (wantsOff === wantsOn)) {
            return buildGuidedClarification({
                context,
                title: 'Choose display option',
                message: 'Pick the display option Menu Manager should prepare.',
                suggestedReplies: Object.values(displayOptionConfig).flatMap((option) => [
                    { label: `Show ${option.label.toLowerCase()}`, prompt: option.onPrompt, helper: 'Customers will see it' },
                    { label: `Hide ${option.label.toLowerCase()}`, prompt: option.offPrompt, helper: 'Customers will not see it' },
                ]),
            });
        }

        const nextValue = wantsOn && !wantsOff;
        const config = displayOptionConfig[displayTarget];
        return buildDesignPatchCommand({
            actionType: 'menu_design_visibility_update',
            title: `${nextValue ? 'Show' : 'Hide'} ${config.label.toLowerCase()}`,
            message: `${config.label} will be ${nextValue ? 'shown' : 'hidden'} on ${context.projectName}.`,
            context,
            beforeAfterSummary: {
                title: 'Display option',
                rows: [
                    {
                        label: config.label,
                        before: booleanDisplay(context.menuDesign[displayTarget]),
                        after: nextValue ? 'Shown' : 'Hidden',
                    },
                ],
                warnings: ['This changes what customers can see on the public menu after approval.'],
            },
            designPatch: { menu: { [displayTarget]: nextValue } },
        });
    }

    if (mentionsTone && mood) {
        const nextLayout = getPreferredMenuLayoutForMood(mood);
        return buildDesignPatchCommand({
            actionType: 'menu_design_mood_update',
            title: `Use ${MENU_MOODS[mood].label} tone`,
            message: `${MENU_MOODS[mood].label} tone will be applied to ${context.projectName}.`,
            context,
            beforeAfterSummary: {
                title: 'Presentation tone',
                rows: [
                    { label: 'Tone', before: menuMoodLabel(context.menuDesign.mood), after: MENU_MOODS[mood].label },
                    { label: 'Layout', before: menuLayoutLabel(context.menuDesign.layout), after: MENU_LAYOUTS[nextLayout].label },
                ],
            },
            designPatch: { menu: { mood, layout: nextLayout } },
        });
    }

    if (!preset) {
        return buildGuidedClarification({
            context,
            title: 'Choose presentation tone',
            message: 'Pick the tone Menu Manager should prepare.',
            suggestedReplies: MENU_TONE_OPTIONS.map((moodOption) => ({
                label: MENU_MOODS[moodOption].label,
                prompt: `Set menu tone to ${MENU_MOODS[moodOption].label}`,
                helper: MENU_MOODS[moodOption].description,
            })),
        });
    }

    const designPatch = getMenuDesignPresetPatch(preset);
    return buildDesignPatchCommand({
        actionType: 'menu_design_preset_apply',
        context,
        title: `Apply ${preset.label}`,
        message: `${preset.label} will be applied to ${context.projectName}.`,
        entityRefs: [
            { kind: 'project', id: context.projectId, label: context.projectName },
            { kind: 'preset', id: preset.key, label: preset.label },
        ],
        beforeAfterSummary: {
            title: 'Menu style',
            rows: [
                { label: 'Tone', before: menuMoodLabel(context.menuDesign.mood), after: MENU_MOODS[preset.mood].label },
                { label: 'Layout', before: menuLayoutLabel(context.menuDesign.layout), after: MENU_LAYOUTS[preset.layout].label },
                { label: 'Accent', before: 'Current color', after: preset.accentColor },
                { label: 'Prices', before: booleanDisplay(context.menuDesign.showItemPrices), after: booleanDisplay(preset.showItemPrices) },
                { label: 'Images', before: booleanDisplay(context.menuDesign.showImages), after: booleanDisplay(preset.showImages) },
            ],
        },
        designPatch,
        designPresetKey: preset.key,
    });
}

function resolveImageCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(generate|create|make|add)\b.*\b(image|photo|picture)\b/.test(normalized)) return null;

    const itemName = normalized
        .replace(/\b(?:generate|create|make|add|image|photo|picture|for|of|item)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const item = findAiMenuManagerItemByName(context, itemName);
    const definition = getAiMenuManagerActionDefinition('image_item_generate');
    if (!item) {
        return buildGuidedClarification({
            context,
            title: 'Choose item for image',
            message: 'Pick the item that needs a new image.',
            suggestedReplies: itemSuggestionReplies(
                context,
                (entry) => `Generate image for ${entry.name}`,
                'Prepare image task',
            ),
        });
    }

    return {
        actionType: 'image_item_generate',
        definition,
        title: `Generate image for ${item.name}`,
        message: `Menu Manager can prepare a draft image task for ${item.name}. Generated images stay as drafts until you choose one to use on the menu.`,
        entityRefs: itemRefs(context, item),
        beforeAfterSummary: {
            title: 'Image task',
            rows: [
                { label: 'Item', after: item.name },
                { label: 'Current image', before: item.hasImage ? 'Has image' : 'No image' },
            ],
        },
        executionMode: definition.executionMode,
        cardKind: 'manual_task',
    };
}

function resolveTodaySpecialCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(today special|today's special|special today)\b/.test(normalized)) return null;

    if (/\b(menu|weekend|diwali|lunch|dinner|festival|seasonal)\b/.test(normalized)) {
        const definition = getAiMenuManagerActionDefinition('special_menu_create');
        return {
            actionType: 'special_menu_create',
            definition,
            title: 'Prepare special menu',
            message: 'Menu Manager can prepare this through the existing special menu flow.',
            entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
            beforeAfterSummary: {
                title: 'Special menu',
                rows: [{ label: 'Flow', after: 'Open existing special menu setup' }],
            },
            executionMode: definition.executionMode,
            cardKind: 'manual_task',
        };
    }

    const priceMatch = normalized.match(/today'?s? special\s+(.+?)\s+(\d+(?:\.\d{1,2})?)$/);
    if (priceMatch) {
        const definition = getAiMenuManagerActionDefinition('item_create');
        return {
            actionType: 'item_create',
            definition,
            title: `Add today special: ${priceMatch[1]}`,
            message: 'A single today special should become an item proposal in the current project, not a separate menu.',
            entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
            beforeAfterSummary: {
                title: 'Today special item',
                rows: [
                    { label: 'Item', after: priceMatch[1] },
                    { label: 'Price', after: priceMatch[2] },
                    { label: 'Placement', after: "Today's Special category or label" },
                ],
            },
            executionMode: definition.executionMode,
            cardKind: 'manual_task',
        };
    }

    return null;
}

function resolveSpecialMenuCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const mentionsSpecialMenu = /\b(special menu|weekend menu|diwali menu|festival menu|seasonal menu|lunch special menu|dinner special menu)\b/.test(normalized);
    if (!mentionsSpecialMenu) return null;

    const activate = /\b(start|activate|turn on|publish|use now|make live)\b/.test(normalized);
    return buildManualFlowTask({
        actionType: activate ? 'special_menu_activate' : 'special_menu_create',
        title: activate ? 'Prepare special menu activation' : 'Prepare special menu',
        message: activate
            ? 'Use the existing special menu flow to activate this menu after review.'
            : 'Use the existing special menu flow to create this special menu after review.',
        context,
        beforeAfterSummary: {
            title: activate ? 'Special menu activation' : 'Special menu setup',
            rows: [
                { label: 'Request', after: text },
                { label: 'Execution', after: 'Existing special menu flow' },
            ],
            warnings: ['This card does not change live menu truth by itself.'],
        },
    });
}

function resolveMenuImportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (/\b(apply|approve|use)\b.*\b(extracted|imported|reviewed|changes)\b/.test(normalized)) {
        return buildManualFlowTask({
            actionType: 'menu_import_review_apply',
            title: 'Apply reviewed import',
            message: 'Use the existing import review screen to apply extracted changes after checking them.',
            context,
            beforeAfterSummary: {
                title: 'Import review',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Execution', after: 'Existing extraction review flow' },
                ],
                warnings: ['AMM will not overwrite the live menu without the existing review/apply flow.'],
            },
        });
    }

    if (/\b(import|extract|fetch)\b.*\b(link|url|website)\b/.test(normalized) || /https?:\/\//i.test(text)) {
        return buildManualFlowTask({
            actionType: 'menu_link_import',
            title: 'Import menu link',
            message: 'Use the existing menu link import flow to fetch and review this source.',
            context,
            beforeAfterSummary: {
                title: 'Menu link import',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Execution', after: 'Existing link import flow' },
                ],
                warnings: ['External links are reviewed before they can change the selected menu.'],
            },
        });
    }

    if (/\b(import|upload|scan|extract)\b.*\b(pdf|photo|image|file|menu)\b/.test(normalized)) {
        return buildManualFlowTask({
            actionType: 'menu_file_upload',
            title: 'Import menu file',
            message: 'Upload the file through the existing menu import flow so MenuList can extract and review it.',
            context,
            beforeAfterSummary: {
                title: 'Menu file import',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Execution', after: 'Existing upload and extraction flow' },
                ],
                warnings: ['Extracted changes stay in review until you apply them.'],
            },
        });
    }

    return null;
}

function resolveMenuPublishCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(publish|make live|go live)\b/.test(normalized) || !/\b(menu|this)\b/.test(normalized)) return null;

    return buildManualFlowTask({
        actionType: 'menu_publish',
        title: 'Publish selected menu',
        message: 'Use the existing publish flow to make this selected menu live on MenuList-controlled surfaces.',
        context,
        beforeAfterSummary: {
            title: 'Publish menu',
            rows: [
                { label: 'Menu', before: context.projectName, after: context.projectName },
                { label: 'Public impact', after: 'Customers see the published version on MenuList-controlled surfaces after publish completes' },
            ],
            warnings: ['Publishing is not executed by this card until the publish adapter is connected.'],
        },
    });
}

type MobileMoreFlowMatch = {
    actionType?: AiMenuManagerActionType | ((normalized: string) => AiMenuManagerActionType);
    blocked?: boolean;
    guideMessage?: string;
    guideTitle?: string;
    guideWhen?: (normalized: string) => boolean;
    keywords: RegExp[];
    message: string;
    navigationOnly?: boolean;
    suggestedReplies?: AiMenuManagerSuggestedReply[];
    summaryTitle: string;
    title: string;
    where: string;
    warnings?: string[];
};

const NAVIGATE_TO_MORE_WORDS = /\b(open|go to|take me|show|view|where|screen|settings)\b/;
const OPEN_EXISTING_SCREEN_WORDS = /\b(open|go to|take me|view|where|screen|settings)\b/;
const OWNER_FLOW_WORDS = /\b(open|go to|take me|show|view|where|screen|settings|manage|set|setup|set up|configure|change|update|edit|connect|disconnect|check|download|export|print|share|copy|prepare|review|reply|resolve|invite|permission|role|billing|subscription|invoice|monitor|history|status)\b/;

const MOBILE_MORE_FLOW_MATCHES: MobileMoreFlowMatch[] = [
    {
        actionType: 'menu_design_settings_open',
        navigationOnly: true,
        title: 'Open Menu Design',
        summaryTitle: 'Menu design',
        where: 'More > Menu Design',
        message: 'Use the existing Menu Design screen for presentation tone, layout, theme color, background, and display options.',
        keywords: [/\bmenu design\b/, /\bdesign editor\b/, /\btheme settings?\b/, /\bappearance settings?\b/],
        warnings: ['If you want Menu Manager to prepare a design change, say the exact change, for example "Use grid layout" or "Set theme color to Gold".'],
    },
    {
        actionType: 'store_business_profile_update',
        title: 'Open Business Profile',
        summaryTitle: 'Business profile',
        where: 'More > Business Profile > Brand Settings',
        message: 'Use the existing Business Profile settings to change store name, logo, contact details, address, or business identity.',
        keywords: [/\bbusiness profile\b/, /\bbrand settings?\b/, /\bbusiness name\b/, /\blogo\b/, /\bcontact details?\b/, /\bstore address\b/, /\bgst\b/],
        warnings: ['Store identity changes must use the existing store settings path.'],
    },
    {
        actionType: 'public_presence_text_update',
        title: 'Open Official Page settings',
        summaryTitle: 'Official page',
        where: 'More > Business Profile > Official Page',
        message: 'Use the existing Official Page settings for WhatsApp, map, reservation, ordering, and public business page links.',
        keywords: [/\bofficial page\b/, /\bwhatsapp\b/, /\breservation link\b/, /\border link\b/, /\bgoogle maps?\b/, /\bbusiness page\b/],
        warnings: ['Public presence changes use existing store save and cache behavior.'],
    },
    {
        actionType: 'public_presence_social_links_update',
        title: 'Open social link settings',
        summaryTitle: 'Social links',
        where: 'More > Business Profile > Social Media',
        message: 'Use the existing Social Media settings to update profile links. Menu Manager will not post to external platforms.',
        keywords: [/\bsocial media\b/, /\bsocial links?\b/, /\binstagram link\b/, /\bfacebook link\b/, /\bzomato link\b/, /\bswiggy link\b/],
        warnings: ['Menu Manager can store profile links in MenuList settings. It cannot post to or update external platforms.'],
    },
    {
        actionType: 'public_presence_business_attributes_update',
        title: 'Open business attributes',
        summaryTitle: 'Business attributes',
        where: 'More > Business Profile > Business Attributes',
        message: 'Use the existing Business Attributes screen for amenities, cuisine signals, parking, Wi-Fi, and similar public details.',
        keywords: [/\bbusiness attributes?\b/, /\bamenities?\b/, /\bparking\b/, /\bwifi\b/, /\bwi fi\b/, /\bpet friendly\b/, /\bveg\b/],
    },
    {
        actionType: 'customer_app_settings_update',
        title: 'Open Customer App settings',
        summaryTitle: 'Customer app',
        where: 'More > Business Profile > Customer App',
        message: 'Use the existing Customer App settings for installable app branding, icons, and install-link sharing.',
        keywords: [/\bcustomer app\b/, /\bpwa\b/, /\binstall app\b/, /\bhome screen\b/, /\bapp icon\b/, /\binstall link\b/],
        guideTitle: 'Choose customer app task',
        guideMessage: 'Pick what Menu Manager should prepare for the Customer App flow.',
        guideWhen: (normalized) => !NAVIGATE_TO_MORE_WORDS.test(normalized)
            && !/\b(copy|share|icon|install link|home screen)\b/.test(normalized),
        suggestedReplies: [
            { label: 'Copy install link', prompt: 'Copy customer app install link', helper: 'Use existing browser-local copy/share' },
            { label: 'Share app link', prompt: 'Share customer app link', helper: 'Use native share where available' },
            { label: 'Open app settings', prompt: 'Open customer app settings', helper: 'Finish in existing Customer App screen' },
            { label: 'Update app icon', prompt: 'Update customer app icon', helper: 'Use existing app icon flow' },
        ],
        warnings: ['Sharing the install link stays browser-local/native-share unless durable tracking is explicitly needed.'],
    },
    {
        actionType: 'seo_settings_update',
        title: 'Open Search and Discovery',
        summaryTitle: 'Search and discovery',
        where: 'More > Search & Discovery',
        message: 'Use the existing Search & Discovery hub for domain, SEO, business copy, and discovery setup.',
        keywords: [/\bsearch discovery\b/, /\bsearch and discovery\b/, /\bdiscovery setup\b/, /\bfind us\b/, /\bsearch setup\b/],
    },
    {
        actionType: 'domain_subdomain_update',
        title: 'Open domain settings',
        summaryTitle: 'Domain',
        where: 'More > Search & Discovery > Domain',
        message: 'Use the existing Domain settings to check, connect, verify, or remove a domain.',
        keywords: [/\bdomain\b/, /\bsubdomain\b/, /\bcustom domain\b/, /\bdns\b/, /\bwebsite link\b/],
        warnings: ['Domain connection and removal need existing verification and guarded API checks.'],
    },
    {
        actionType: 'public_presence_business_copy_generate',
        title: 'Open business copy setup',
        summaryTitle: 'Business copy',
        where: 'More > Search & Discovery > Business Copy',
        message: 'Use the existing Business Copy setup for official page and discovery copy.',
        keywords: [/\bbusiness copy\b/, /\bcopy setup\b/, /\bseo copy\b/, /\bgenerate business copy\b/, /\babout business\b/],
    },
    {
        actionType: 'seo_settings_update',
        title: 'Open SEO settings',
        summaryTitle: 'SEO settings',
        where: 'More > Search & Discovery > SEO',
        message: 'Use the existing SEO settings for meta title, meta description, keywords, canonical, and tracking-facing fields.',
        keywords: [/\bseo\b/, /\bmeta title\b/, /\bmeta description\b/, /\bkeywords?\b/, /\bcanonical\b/],
    },
    {
        actionType: 'analytics_tracking_update',
        title: 'Open analytics settings',
        summaryTitle: 'Analytics settings',
        where: 'More > Analytics Settings',
        message: 'Use the existing Analytics settings for Google Analytics, Search Console, Facebook Pixel, and tracking IDs.',
        keywords: [/\banalytics settings?\b/, /\bgoogle analytics\b/, /\bsearch console\b/, /\bfacebook pixel\b/, /\btracking\b/],
    },
    {
        actionType: 'store_locale_region_update',
        title: 'Open language and region',
        summaryTitle: 'Language and region',
        where: 'More > Language & Region',
        message: 'Use the existing Language & Region settings for language, currency, timezone, and regional formats.',
        keywords: [/\blanguage\b/, /\bregion\b/, /\bcurrency\b/, /\btimezone\b/, /\btime zone\b/, /\bdate format\b/],
        warnings: ['Locale and currency changes can affect how customers read prices and times.'],
    },
    {
        actionType: 'store_working_hours_update',
        title: 'Open working hours',
        summaryTitle: 'Working hours',
        where: 'More > Working Hours',
        message: 'Use the existing Working Hours screen to edit opening and closing times.',
        keywords: [/\bworking hours\b/, /\bopening hours\b/, /\bbusiness hours\b/, /\bclosing time\b/, /\bopen time\b/, /\bclose time\b/],
        guideTitle: 'Choose working-hours change',
        guideMessage: 'Pick the working-hours change Menu Manager should prepare.',
        guideWhen: (normalized) => !NAVIGATE_TO_MORE_WORDS.test(normalized)
            && !/\b(today|tomorrow|weekday|weekdays|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|closed|close|open from|to \d)\b/.test(normalized),
        suggestedReplies: [
            { label: 'Today only', prompt: 'Change working hours for today', helper: 'One-day hours change' },
            { label: 'All weekdays', prompt: 'Change working hours for all weekdays', helper: 'Monday to Friday' },
            { label: 'Weekend', prompt: 'Change working hours for weekend', helper: 'Saturday and Sunday' },
            { label: 'Closed today', prompt: 'Set temporary status: closed today', helper: 'Use temporary status instead' },
        ],
        warnings: ['Hours changes affect public availability signals after the existing save completes.'],
    },
    {
        actionType: 'store_time_slot_preset_create',
        title: 'Open time slots',
        summaryTitle: 'Time slots',
        where: 'More > Time Slots',
        message: 'Use the existing Time Slots screen for breakfast, lunch, dinner, happy hour, and other slot presets.',
        keywords: [/\btime slots?\b/, /\bbreakfast\b/, /\blunch\b/, /\bdinner\b/, /\bhappy hour\b/, /\bslot preset\b/],
        guideTitle: 'Choose time slot',
        guideMessage: 'Pick the menu time slot Menu Manager should prepare.',
        guideWhen: (normalized) => !NAVIGATE_TO_MORE_WORDS.test(normalized)
            && !/\b(breakfast|lunch|dinner|happy hour)\b/.test(normalized),
        suggestedReplies: [
            { label: 'Breakfast', prompt: 'Set breakfast time slot', helper: 'Prepare breakfast slot setup' },
            { label: 'Lunch', prompt: 'Set lunch time slot', helper: 'Prepare lunch slot setup' },
            { label: 'Dinner', prompt: 'Set dinner time slot', helper: 'Prepare dinner slot setup' },
            { label: 'Happy hour', prompt: 'Set happy hour time slot', helper: 'Prepare happy hour slot setup' },
        ],
    },
    {
        actionType: (normalized) => /\b(clear|remove|back open|open again)\b/.test(normalized)
            ? 'menu_temp_status_clear'
            : 'menu_temp_status_set',
        title: 'Open temporary status',
        summaryTitle: 'Temporary status',
        where: 'More > Temporary Status',
        message: 'Use the existing Temporary Status screen for holiday, closed today, special hours, and temporary banners.',
        keywords: [/\btemporary status\b/, /\btemporarily closed\b/, /\bclosed today\b/, /\bholiday\b/, /\bspecial hours\b/, /\bstatus banner\b/],
        guideTitle: 'Choose temporary status',
        guideMessage: 'Pick the temporary status Menu Manager should prepare.',
        guideWhen: (normalized) => !/\b(closed today|holiday|special hours|back open|open again|clear|remove)\b/.test(normalized),
        suggestedReplies: [
            { label: 'Closed today', prompt: 'Set temporary status: closed today', helper: 'Customers see you are closed today' },
            { label: 'Holiday', prompt: 'Set temporary status: holiday', helper: 'Use existing holiday status flow' },
            { label: 'Special hours', prompt: 'Set temporary status: special hours', helper: 'Choose custom hours in existing flow' },
            { label: 'Back open', prompt: 'Clear temporary status', helper: 'Remove temporary public status' },
        ],
        warnings: ['Temporary public status must use the guarded temp-status API.'],
    },
    {
        actionType: 'locations_screen_open',
        title: 'Open locations',
        summaryTitle: 'Locations',
        where: 'More > Locations',
        message: 'Use the existing Locations screen for branches, outlets, and multi-location setup.',
        keywords: [/\blocations?\b/, /\bbranches\b/, /\boutlets?\b/, /\bmulti location\b/, /\bnew store\b/],
        warnings: ['Outlet and billing-aware location changes are high-risk and stay in the existing guarded flow.'],
    },
    {
        actionType: 'staff_access_open',
        title: 'Open staff users',
        summaryTitle: 'Staff access',
        where: 'More > Staff',
        message: 'Use the existing Staff screen to invite, remove, or manage team members.',
        keywords: [/\bstaff\b/, /\bteam\b/, /\bemployees?\b/, /\busers?\b/, /\binvite\b/, /\buser access\b/],
        warnings: ['Menu Manager will not change staff access directly from a chat card.'],
    },
    {
        actionType: 'roles_permissions_open',
        title: 'Open roles and permissions',
        summaryTitle: 'Roles and permissions',
        where: 'More > Roles & Permissions',
        message: 'Use the existing Roles & Permissions screen for access control.',
        keywords: [/\broles?\b/, /\bpermissions?\b/, /\baccess control\b/, /\bmanager role\b/, /\bcashier role\b/],
        warnings: ['Permission changes require the existing guarded staff-access path.'],
    },
    {
        actionType: 'billing_screen_open',
        title: 'Open billing',
        summaryTitle: 'Billing',
        where: 'More > Billing',
        message: 'Use the existing Billing screen for plan, subscription, payment, invoice, and upgrade work.',
        keywords: [/\bbilling\b/, /\bsubscription\b/, /\bplan\b/, /\bpayment\b/, /\binvoice\b/, /\bupgrade\b/],
        warnings: ['Billing and payment actions cannot be completed by Menu Manager.'],
    },
    {
        actionType: 'transactions_screen_open',
        title: 'Open transactions',
        summaryTitle: 'Transactions',
        where: 'More > Transactions',
        message: 'Use the existing Transactions screen for payment receipts, charge history, and billing history.',
        keywords: [/\btransactions?\b/, /\bpayment history\b/, /\bbilling history\b/, /\bcharges?\b/, /\breceipts?\b/],
    },
    {
        actionType: 'business_health_open',
        title: 'Open Business Health',
        summaryTitle: 'Business Health',
        where: 'More > Business Health',
        message: 'Use Business Health for checks and owner questions. Menu Manager stays separate and handles prepared menu-operation cards.',
        keywords: [/\bbusiness health\b/, /\bhealth check\b/, /\bchecks that need attention\b/],
        warnings: ['Business Health remains separate from Menu Manager execution.'],
    },
    {
        actionType: 'past_activity_open',
        title: 'Open past activity',
        summaryTitle: 'Past activity',
        where: 'More > Past Activity',
        message: 'Use the existing Past Activity screen to review completed or skipped actions.',
        keywords: [/\bpast activity\b/, /\btoday history\b/, /\bactivity history\b/, /\bcompleted actions?\b/, /\bskipped actions?\b/],
    },
    {
        actionType: 'print_assets_open',
        title: 'Open print assets',
        summaryTitle: 'Print assets',
        where: 'More > Assets',
        message: 'Use the existing Assets screen to download table, counter, entrance, feedback, and menu files.',
        keywords: [/\bprint assets?\b/, /\bassets?\b/, /\btable tent\b/, /\bcounter sticker\b/, /\bentrance\b/, /\bprintables?\b/],
        warnings: ['Print/download actions stay local unless a durable receipt is intentionally created.'],
    },
    {
        actionType: 'print_menu_open',
        title: 'Open Print Menu',
        summaryTitle: 'Print menu',
        where: 'More > Print Menu',
        message: 'Use the existing Print Menu flow to preview, download, or create a print-shop packet.',
        keywords: [/\bprint menu\b/, /\bmenu pdf\b/, /\bdownload menu\b/, /\bexport menu\b/, /\bprint shop\b/],
        warnings: ['Printed/exported copies can become stale after future menu changes.'],
    },
    {
        actionType: (normalized) => /\breply\b/.test(normalized)
            ? 'feedback_reply_save'
            : 'feedback_inbox_list',
        title: 'Open feedback',
        summaryTitle: 'Feedback',
        where: 'More > Feedback',
        message: 'Use the existing Feedback screen to read guest feedback, update status, reply, or access feedback QR/link tools.',
        keywords: [/\bfeedback\b/, /\bguest feedback\b/, /\breviews?\b/, /\bratings?\b/, /\bfeedback qr\b/, /\breply to review\b/],
        guideTitle: 'Choose feedback task',
        guideMessage: 'Pick the feedback task Menu Manager should prepare.',
        guideWhen: (normalized) => !NAVIGATE_TO_MORE_WORDS.test(normalized)
            && !/\b(qr|link|inbox|reply|resolve|status)\b/.test(normalized),
        suggestedReplies: [
            { label: 'Copy feedback link', prompt: 'Copy feedback link', helper: 'Use existing browser-local copy' },
            { label: 'Download feedback QR', prompt: 'Download feedback QR', helper: 'Use existing QR/export flow' },
            { label: 'Open feedback inbox', prompt: 'Open feedback inbox', helper: 'Review recent guest feedback' },
            { label: 'Prepare reply', prompt: 'Prepare feedback reply', helper: 'Review before copying' },
        ],
        warnings: ['Menu Manager cannot post review replies to external review platforms. Feedback work stays inside MenuList.'],
    },
    {
        actionType: (normalized) => /\b(copy|link)\b/.test(normalized)
            ? 'digital_screen_link_share'
            : /\b(slide|slides)\b/.test(normalized)
                ? 'digital_screen_slide_upload'
                : /\b(pause|resume|override|status)\b/.test(normalized)
                    ? 'digital_screen_override_update'
                    : 'digital_screen_status_card',
        title: 'Open Digital Screens',
        summaryTitle: 'Digital screens',
        where: 'More > Digital Screens',
        message: 'Use the existing Digital Screens screen for menu board status, screen links, overrides, and slide updates.',
        keywords: [/\bdigital screens?\b/, /\btv\b/, /\bmenu board\b/, /\bscreen link\b/, /\bslides?\b/, /\bdisplay screen\b/],
        guideTitle: 'Choose screen task',
        guideMessage: 'Pick the Digital Screens task Menu Manager should prepare.',
        guideWhen: (normalized) => !OPEN_EXISTING_SCREEN_WORDS.test(normalized)
            && !/\b(copy|link|slide|slides|pause|resume|override|status)\b/.test(normalized),
        suggestedReplies: [
            { label: 'Copy screen link', prompt: 'Copy digital screen link', helper: 'Use existing browser-local copy' },
            { label: 'Open screen setup', prompt: 'Open digital screens', helper: 'Finish in existing screen flow' },
            { label: 'Update slides', prompt: 'Update digital screen slides', helper: 'Use existing slide review flow' },
            { label: 'Pause screen', prompt: 'Pause digital screen', helper: 'Use existing screen control flow' },
        ],
    },
    {
        actionType: (normalized) => /\b(sample payload|download sample|payload sample)\b/.test(normalized)
            ? 'pos_sync_sample_payload_download'
            : /\b(technical summary|tech summary)\b/.test(normalized)
                ? 'pos_sync_technical_summary_copy'
                : /\b(setup info|setup details|copy setup|provider setup)\b/.test(normalized)
                    ? 'pos_sync_setup_info_copy'
                    : 'pos_sync_settings_update',
        title: 'Open POS Sync',
        summaryTitle: 'POS sync',
        where: 'More > POS Sync',
        message: 'Use the existing POS Sync screen for provider setup, test actions, setup-copy, and technical summaries.',
        keywords: [/\bpos\b/, /\bpos sync\b/, /\bexternal sync\b/, /\bwebhook\b/, /\bintegration secret\b/, /\bprovider setup\b/],
        warnings: ['Integration secrets and POS writes must stay in the guarded POS flow.'],
    },
    {
        actionType: 'integration_status_review',
        title: 'Open integrations',
        summaryTitle: 'Integrations',
        where: 'More > Integrations',
        message: 'Use the existing Integrations screen for connection status and first-party setup flows.',
        keywords: [/\bintegrations?\b/, /\bconnected systems?\b/, /\bgoogle business integration\b/, /\bgbp integration\b/],
        warnings: ['Read-only integration status and setup guidance are supported. Menu Manager does not mutate external systems from this card.'],
    },
    {
        actionType: 'help_screen_open',
        title: 'Open help',
        summaryTitle: 'Help',
        where: 'More > Help',
        message: 'Use the existing Help screen for support articles, tickets, and release notes.',
        keywords: [/\bhelp\b/, /\bsupport\b/, /\bsupport ticket\b/, /\bknowledge base\b/, /\brelease notes\b/],
    },
    {
        blocked: true,
        title: 'Internal screen not available through Menu Manager',
        summaryTitle: 'Internal screen',
        where: 'Platform, Reseller, or Answerlattice internal screens',
        message: 'Menu Manager cannot operate internal platform, reseller, or Answerlattice screens from an owner menu card.',
        keywords: [
            /\bplatform\b/,
            /\breseller\b/,
            /\banswerlattice\b/,
            /\btenant\b/,
            /\bentity blocks?\b/,
            /\bops control\b/,
            /\bscheduler monitor\b/,
            /\bextraction monitor\b/,
            /\bcost posture\b/,
        ],
        warnings: ['Use the existing internal screen with the required platform permissions.'],
    },
];

function resolveFeedbackExportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const isFeedbackRequest = /\b(feedback|guest feedback|rating|ratings|review|reviews)\b/.test(normalized);
    const wantsLink = /\b(link|url|copy|share)\b/.test(normalized);
    const wantsQr = /\b(qr|download|print|code)\b/.test(normalized);
    if (!isFeedbackRequest || (!wantsLink && !wantsQr)) return null;

    const actionType: AiMenuManagerActionType = wantsQr && !wantsLink
        ? 'feedback_qr_download'
        : 'feedback_link_share';
    const definition = getAiMenuManagerActionDefinition(actionType);
    const directUrl = buildAiMenuManagerFeedbackUrl(context.projectId, 'direct_link');
    const qrUrl = buildAiMenuManagerFeedbackUrl(context.projectId, 'feedback_qr');
    const filename = `${safeExportFilename(`${context.storeName}-${context.projectName}`)}-feedback-qr`;

    return {
        actionType,
        definition,
        title: actionType === 'feedback_qr_download' ? 'Download feedback QR' : 'Copy feedback link',
        message: 'Copy this menu feedback link or download a QR code customers can scan.',
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'Feedback access',
            rows: [
                { label: 'Feedback link', after: directUrl },
                { label: 'QR download', after: 'Available from this card' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['Review replies stay in the Feedback screen. Menu Manager cannot post replies to external review platforms.'],
        },
        localActions: [
            {
                type: 'copy_url',
                label: 'Copy feedback link',
                helper: 'Copies the customer feedback form link.',
                value: directUrl,
            },
            {
                type: 'open_url',
                label: 'Open link',
                helper: 'Opens the feedback form in a new tab.',
                value: directUrl,
            },
            {
                type: 'download_qr',
                label: 'Download QR',
                filename,
                helper: 'Downloads a QR code for the feedback form.',
                qrFooter: qrUrl.replace(/^https?:\/\//, ''),
                qrStoreName: context.storeName,
                qrSubtitle: 'Scan to leave feedback',
                qrTitle: 'Feedback QR',
                value: qrUrl,
            },
        ],
        executionMode: definition.executionMode,
        cardKind: 'local_export',
    };
}

function resolveCustomerAppExportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const isCustomerAppRequest = /\b(customer app|pwa|install app|home screen|app link|install link)\b/.test(normalized);
    const wantsLink = /\b(link|url|copy|share|install)\b/.test(normalized);
    if (!isCustomerAppRequest || !wantsLink) return null;

    const installUrl = context.publicLinks?.customerAppInstallUrl;
    if (!installUrl) {
        return buildManualFlowTask({
            actionType: 'customer_app_settings_update',
            title: 'Customer app link not ready',
            message: 'Set the store subdomain or custom domain first, then Menu Manager can prepare the install link.',
            context,
            beforeAfterSummary: {
                title: 'Customer app install link',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Where to finish', after: 'More > Business Profile > Customer App' },
                    { label: 'Link status', after: 'Missing public store link' },
                ],
                warnings: ['No customer app link was copied because this store does not have a public link in the loaded context.'],
            },
        });
    }

    const actionType: AiMenuManagerActionType = 'customer_app_install_link_share';
    const definition = getAiMenuManagerActionDefinition(actionType);
    const filename = `${safeExportFilename(`${context.storeName}-customer-app`)}-install-qr`;

    return {
        actionType,
        definition,
        title: 'Copy customer app install link',
        message: 'Copy this customer app install link or download a QR code for customers.',
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'Customer app install link',
            rows: [
                { label: 'Install link', after: installUrl },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['This only prepares the customer app link. App icon and branding changes stay in the Customer App settings flow.'],
        },
        localActions: [
            {
                type: 'copy_url',
                label: 'Copy install link',
                helper: 'Copies the customer app install link.',
                value: installUrl,
            },
            {
                type: 'open_url',
                label: 'Open link',
                helper: 'Opens the customer app install link in a new tab.',
                value: installUrl,
            },
            {
                type: 'download_qr',
                label: 'Download QR',
                filename,
                helper: 'Downloads a QR code for the install link.',
                qrFooter: installUrl.replace(/^https?:\/\//, ''),
                qrStoreName: context.storeName,
                qrSubtitle: 'Scan to install',
                qrTitle: 'Customer app QR',
                value: installUrl,
            },
        ],
        executionMode: definition.executionMode,
        cardKind: 'local_export',
    };
}

function resolveDigitalScreenExportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const isDigitalScreenRequest = /\b(digital screen|digital screens|screen link|menu board|tv menu|display screen)\b/.test(normalized);
    const wantsLink = /\b(link|url|copy|share|qr)\b/.test(normalized)
        || (/\bopen\b/.test(normalized) && /\b(screen link|tv menu|menu board)\b/.test(normalized));
    if (!isDigitalScreenRequest || !wantsLink) return null;

    const screenUrl = context.publicLinks?.digitalScreenUrl;
    const highlightsUrl = context.publicLinks?.digitalScreenHighlightsUrl;
    if (!screenUrl) {
        return buildManualFlowTask({
            actionType: 'digital_screen_link_share',
            title: 'Digital screen link not ready',
            message: 'Open Digital Screens and set up the screen once. After the screen token exists, Menu Manager can prepare the link from the loaded store context.',
            context,
            beforeAfterSummary: {
                title: 'Digital screen link',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Where to finish', after: 'More > Digital Screens' },
                    { label: 'Link status', after: 'Screen token missing in loaded context' },
                ],
                warnings: ['No extra Firestore read was added just to fetch a screen token for this card.'],
            },
        });
    }

    const actionType: AiMenuManagerActionType = 'digital_screen_link_share';
    const definition = getAiMenuManagerActionDefinition(actionType);
    const filename = `${safeExportFilename(`${context.storeName}-digital-screen`)}-qr`;

    return {
        actionType,
        definition,
        title: 'Copy digital screen link',
        message: 'Copy this Digital Screens link or download a QR code for setup.',
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'Digital screen link',
            rows: [
                { label: 'Screen link', after: screenUrl },
                { label: 'Highlights link', after: highlightsUrl || 'Not available' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['Slide changes, pause/resume, and screen overrides stay in the Digital Screens flow.'],
        },
        localActions: [
            {
                type: 'copy_url',
                label: 'Copy screen link',
                helper: 'Copies the Digital Screens menu-board link.',
                value: screenUrl,
            },
            {
                type: 'open_url',
                label: 'Open screen',
                helper: 'Opens the Digital Screens link in a new tab.',
                value: screenUrl,
            },
            ...(highlightsUrl ? [{
                type: 'copy_url' as const,
                label: 'Copy highlights link',
                helper: 'Copies the Highlights mode link.',
                value: highlightsUrl,
            }] : []),
            {
                type: 'download_qr',
                label: 'Download QR',
                filename,
                helper: 'Downloads a QR code for the Digital Screens link.',
                qrFooter: screenUrl.replace(/^https?:\/\//, ''),
                qrStoreName: context.storeName,
                qrSubtitle: 'Scan to open screen',
                qrTitle: 'Digital Screen QR',
                value: screenUrl,
            },
        ],
        executionMode: definition.executionMode,
        cardKind: 'local_export',
    };
}

function buildPosSamplePayload(context: AiMenuManagerContextPacket) {
    return JSON.stringify({
        event: 'menu.updated',
        version: '2026-06-18',
        store: {
            name: context.storeName,
        },
        menu: {
            id: context.projectId,
            name: context.projectName,
            items: context.items.slice(0, 3).map((item) => ({
                id: item.id,
                name: item.name,
                category: item.categoryName,
                price: item.price || null,
                available: item.available,
            })),
        },
    }, null, 2);
}

function resolvePosSyncExportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(pos|pos sync|external sync|webhook)\b/.test(normalized)) return null;

    const wantsSample = /\b(sample payload|download sample|payload sample)\b/.test(normalized);
    const wantsTechnicalSummary = /\b(technical summary|tech summary|copy technical)\b/.test(normalized);
    const wantsSetupInfo = /\b(setup info|setup details|setup copy|copy setup|provider setup|webhook setup|share setup|copy)\b/.test(normalized);

    if (!wantsSample && !wantsTechnicalSummary && !wantsSetupInfo) return null;

    const actionType: AiMenuManagerActionType = wantsSample
        ? 'pos_sync_sample_payload_download'
        : wantsTechnicalSummary
            ? 'pos_sync_technical_summary_copy'
            : 'pos_sync_setup_info_copy';
    const definition = getAiMenuManagerActionDefinition(actionType);
    const setupInfo = buildAiMenuManagerPosSetupInfo();
    const samplePayload = buildPosSamplePayload(context);
    const value = wantsSample ? samplePayload : setupInfo;
    const filename = wantsSample
        ? `${safeExportFilename(`${context.storeName}-${context.projectName}`)}-pos-sample-payload.json`
        : `${safeExportFilename(`${context.storeName}`)}-pos-setup-info.txt`;

    return {
        actionType,
        definition,
        title: wantsSample
            ? 'Download POS sample payload'
            : wantsTechnicalSummary
                ? 'Copy POS technical summary'
                : 'Copy POS setup details',
        message: wantsSample
            ? 'Download a sample POS payload for the selected menu.'
            : 'Copy the POS setup details for your provider.',
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'POS setup',
            rows: [
                { label: 'Request', after: text },
                { label: 'Output', after: wantsSample ? 'Sample JSON payload' : 'Provider setup text' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['Secrets, endpoint changes, tests, and POS writes stay in the guarded POS Sync screen.'],
        },
        localActions: wantsSample
            ? [
                {
                    type: 'download_text',
                    label: 'Download sample',
                    filename,
                    helper: 'Downloads a sample JSON payload.',
                    mimeType: 'application/json;charset=utf-8',
                    value,
                },
                {
                    type: 'copy_text',
                    label: 'Copy sample',
                    helper: 'Copies the sample JSON payload.',
                    value,
                },
            ]
            : [
                {
                    type: 'copy_text',
                    label: wantsTechnicalSummary ? 'Copy summary' : 'Copy setup details',
                    helper: 'Copies the POS setup text.',
                    value,
                },
                {
                    type: 'download_text',
                    label: 'Download text',
                    filename,
                    helper: 'Downloads the POS setup text.',
                    mimeType: 'text/plain;charset=utf-8',
                    value,
                },
            ],
        executionMode: definition.executionMode,
        cardKind: 'local_export',
    };
}

function resolveMobileMoreFlowCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!OWNER_FLOW_WORDS.test(normalized)) return null;

    const matchesFlow = (flow: MobileMoreFlowMatch) => (
        flow.keywords.some((keyword) => keyword.test(normalized))
            && (!flow.navigationOnly || NAVIGATE_TO_MORE_WORDS.test(normalized))
    );
    const matchedFlow = MOBILE_MORE_FLOW_MATCHES.find((flow) => flow.blocked && matchesFlow(flow))
        || MOBILE_MORE_FLOW_MATCHES.find((flow) => !flow.blocked && matchesFlow(flow));
    if (!matchedFlow) return null;

    if (matchedFlow.suggestedReplies?.length && matchedFlow.guideWhen?.(normalized)) {
        return buildGuidedClarification({
            context,
            title: matchedFlow.guideTitle || matchedFlow.title,
            message: matchedFlow.guideMessage || matchedFlow.message,
            suggestedReplies: matchedFlow.suggestedReplies,
        });
    }

    const beforeAfterSummary = {
        title: matchedFlow.summaryTitle,
        rows: [
            { label: 'Request', after: text },
            { label: 'Where to finish', after: matchedFlow.where },
            { label: 'Menu truth', after: matchedFlow.blocked ? 'Not changed by Menu Manager' : 'Unchanged until the existing flow is completed' },
        ],
        warnings: matchedFlow.warnings,
    };

    if (matchedFlow.blocked) {
        const definition = getAiMenuManagerActionDefinition('system_unsupported_action');
        return {
            actionType: 'system_unsupported_action',
            definition,
            title: matchedFlow.title,
            message: matchedFlow.message,
            entityRefs: [{ kind: 'manual_task', id: 'internal-screen', label: matchedFlow.where }],
            beforeAfterSummary,
            executionMode: definition.executionMode,
            cardKind: 'unsupported',
        };
    }

    if (!matchedFlow.actionType) return null;

    const actionType = typeof matchedFlow.actionType === 'function'
        ? matchedFlow.actionType(normalized)
        : matchedFlow.actionType;

    return buildManualFlowTask({
        actionType,
        title: matchedFlow.title,
        message: matchedFlow.message,
        context,
        entityRefs: [{ kind: 'manual_task', id: matchedFlow.where.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: matchedFlow.where }],
        beforeAfterSummary,
    });
}

function resolveMenuShareExportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (/\b(import|extract|fetch|publish|make live|go live)\b/.test(normalized)) return null;
    if (
        /\b(ready|safe|ok|okay|can i|should i|is my|working|live|updated|old|stale)\b/.test(normalized)
        && /\b(share|qr|link|public|customer)\b/.test(normalized)
    ) {
        return null;
    }

    const mentionsMenuShare = /\b(menu link|menu url|digital menu link|copy menu|share menu|menu qr|qr for menu|download menu qr|download qr code|open menu link)\b/.test(normalized)
        || (/\b(menu|digital menu)\b/.test(normalized) && /\b(copy|share|link|url|qr)\b/.test(normalized));
    if (!mentionsMenuShare) return null;

    const wantsQr = /\b(qr|qr code|download qr|print qr)\b/.test(normalized);
    const actionType: AiMenuManagerActionType = wantsQr ? 'menu_qr_download' : 'menu_share_copy_link';
    const menuUrl = context.publicLinks?.menuUrl;

    if (!menuUrl) {
        return buildManualFlowTask({
            actionType,
            title: wantsQr ? 'Menu QR not ready' : 'Menu link not ready',
            message: 'Open Share after the selected menu has a public link. Menu Manager will not guess a URL without tenant context.',
            context,
            beforeAfterSummary: {
                title: wantsQr ? 'Menu QR' : 'Menu link',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Where to finish', after: 'Share > Digital menu' },
                    { label: 'Link status', after: 'Missing public menu link in loaded context' },
                ],
                warnings: ['No extra Firestore read was added just to fetch a menu link for this card.'],
            },
        });
    }

    const copyUrl = withAiMenuManagerShareSource(menuUrl, 'copy_link');
    const directUrl = withAiMenuManagerShareSource(menuUrl, 'direct');
    const qrUrl = withAiMenuManagerShareSource(menuUrl, 'qr');
    const definition = getAiMenuManagerActionDefinition(actionType);
    const filename = `${safeExportFilename(`${context.storeName}-${context.projectName}`)}-menu-qr`;

    return {
        actionType,
        definition,
        title: wantsQr ? 'Download menu QR' : 'Copy menu link',
        message: wantsQr
            ? 'Download a QR code for the selected menu.'
            : 'Copy or open the public link for the selected menu.',
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: wantsQr ? 'Menu QR' : 'Menu link',
            rows: [
                { label: 'Menu', after: context.projectName },
                { label: 'Link', after: menuUrl },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['This only prepares the public menu link. Publishing and print exports stay in their existing flows.'],
        },
        localActions: [
            {
                type: 'copy_url',
                label: 'Copy menu link',
                helper: 'Copies the selected menu link.',
                value: copyUrl,
            },
            {
                type: 'open_url',
                label: 'Open menu',
                helper: 'Opens the selected menu in a new tab.',
                value: directUrl,
            },
            {
                type: 'download_qr',
                label: 'Download QR',
                filename,
                helper: 'Downloads a QR code for the selected menu.',
                qrFooter: qrUrl.replace(/^https?:\/\//, ''),
                qrStoreName: context.storeName,
                qrSubtitle: 'Scan to view menu',
                qrTitle: 'Menu QR',
                value: qrUrl,
            },
        ],
        executionMode: definition.executionMode,
        cardKind: 'local_export',
    };
}

function resolveOfficialPageExportCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const mentionsOfficialPage = /\b(official page|business page|public page|store page|obp)\b/.test(normalized);
    const wantsLinkOrQr = /\b(copy|share|link|url|qr|download|open)\b/.test(normalized);
    if (!mentionsOfficialPage || !wantsLinkOrQr) return null;

    const wantsQr = /\b(qr|qr code|download qr|print qr)\b/.test(normalized);
    const actionType: AiMenuManagerActionType = wantsQr ? 'public_presence_qr_download' : 'public_presence_link_share';
    const officialPageUrl = context.publicLinks?.officialPageUrl || context.publicLinks?.tenantBaseUrl;

    if (!officialPageUrl) {
        return buildManualFlowTask({
            actionType,
            title: wantsQr ? 'Official page QR not ready' : 'Official page link not ready',
            message: 'Open Official Page after the store has a public page link. Menu Manager will not guess a URL without tenant context.',
            context,
            beforeAfterSummary: {
                title: wantsQr ? 'Official page QR' : 'Official page link',
                rows: [
                    { label: 'Request', after: text },
                    { label: 'Where to finish', after: 'Share > Official Page' },
                    { label: 'Link status', after: 'Missing official page link in loaded context' },
                ],
                warnings: ['No extra Firestore read was added just to fetch an official page link for this card.'],
            },
        });
    }

    const copyUrl = withAiMenuManagerShareSource(officialPageUrl, 'copy_link');
    const directUrl = withAiMenuManagerShareSource(officialPageUrl, 'direct');
    const qrUrl = withAiMenuManagerShareSource(officialPageUrl, 'qr');
    const definition = getAiMenuManagerActionDefinition(actionType);
    const filename = `${safeExportFilename(`${context.storeName}-official-page`)}-qr`;

    return {
        actionType,
        definition,
        title: wantsQr ? 'Download official page QR' : 'Copy official page link',
        message: wantsQr
            ? 'Download a QR code for the official business page.'
            : 'Copy or open the public official page link.',
        entityRefs: [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: wantsQr ? 'Official page QR' : 'Official page link',
            rows: [
                { label: 'Store', after: context.storeName },
                { label: 'Link', after: officialPageUrl },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['This only prepares the public page link. Profile edits stay in the Official Page settings flow.'],
        },
        localActions: [
            {
                type: 'copy_url',
                label: 'Copy page link',
                helper: 'Copies the official page link.',
                value: copyUrl,
            },
            {
                type: 'open_url',
                label: 'Open page',
                helper: 'Opens the official page in a new tab.',
                value: directUrl,
            },
            {
                type: 'download_qr',
                label: 'Download QR',
                filename,
                helper: 'Downloads a QR code for the official page.',
                qrFooter: qrUrl.replace(/^https?:\/\//, ''),
                qrStoreName: context.storeName,
                qrSubtitle: 'Scan to view business page',
                qrTitle: 'Official Page QR',
                value: qrUrl,
            },
        ],
        executionMode: definition.executionMode,
        cardKind: 'local_export',
    };
}

function resolveExternalUnsupportedCommand(text: string, scope: AiMenuManagerScope): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(zomato|swiggy|ubereats|uber\s+eats|instagram|facebook|google business|google listing|google review|review reply)\b/.test(normalized)) {
        return null;
    }

    const destination = /\bzomato\b/.test(normalized)
        ? 'Zomato'
        : /\bswiggy\b/.test(normalized)
            ? 'Swiggy'
            : /\b(ubereats|uber\s+eats)\b/.test(normalized)
                ? 'Uber Eats'
                : /\binstagram\b/.test(normalized)
                    ? 'Instagram'
                    : /\bfacebook\b/.test(normalized)
                        ? 'Facebook'
                        : /\bgoogle review|review reply\b/.test(normalized)
                            ? 'Google reviews'
                            : 'Google Business Profile';
    const definition = getAiMenuManagerActionDefinition('system_unsupported_action');
    return {
        actionType: 'system_unsupported_action' as AiMenuManagerActionType,
        definition,
        title: `${destination} is not supported`,
        message: `Menu Manager does not support updating or posting to ${destination}. No MenuList menu, store, or public page data was changed.`,
        entityRefs: [{ kind: 'manual_task', id: destination.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: destination }],
        beforeAfterSummary: {
            title: 'External platform not supported',
            rows: [
                { label: 'Request', after: text },
                { label: 'Destination', after: destination },
                { label: 'Support status', after: 'Not supported by Menu Manager' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['MenuList does not have a Zomato, Swiggy, Instagram, Facebook, or Google posting integration in this flow.'],
        },
        suggestedReplies: [
            { label: 'Copy menu link', prompt: 'Copy menu link', helper: 'Share MenuList link' },
            { label: 'Download menu QR', prompt: 'Download menu QR', helper: 'Use MenuList QR' },
            { label: 'Download menu PDF', prompt: 'Download menu PDF', helper: 'Use fresh menu export' },
        ],
        executionMode: definition.executionMode,
        cardKind: 'unsupported' as const,
    };
}

function resolveGeneralOutOfScopeCommand(text: string, scope: AiMenuManagerScope): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const isGeneralQuestion = /\b(weather|forecast|temperature|rain|raining|humidity|news|headlines|current affairs|cricket|football|match score|score today|ipl|world cup|stock price|share price|bitcoin|crypto|exchange rate|tell me a joke|write a joke|poem|story)\b/.test(normalized);
    if (!isGeneralQuestion) return null;

    const definition = getAiMenuManagerActionDefinition('system_unsupported_action');
    return {
        actionType: 'system_unsupported_action' as AiMenuManagerActionType,
        definition,
        title: 'Menu Manager handles MenuList work',
        message: 'Menu Manager does not answer live weather, news, sports, market, or general chat questions. Ask for a menu, store, QR, feedback, hours, design, import, publish, or related MenuList task.',
        entityRefs: [],
        beforeAfterSummary: {
            title: 'Outside Menu Manager scope',
            rows: [
                { label: 'Request', after: text },
                { label: 'Support status', after: 'Not a MenuList operation' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['No external lookup or menu/store change was performed.'],
        },
        executionMode: definition.executionMode,
        cardKind: 'unsupported' as const,
    };
}

export function resolveAiMenuManagerCommand(params: {
    text: string;
    tId: string | number;
    sId: string | number;
    projectId: string;
    context: AiMenuManagerContextPacket;
    composerContext?: AiMenuManagerCommandContextSelection;
    cardId: string;
    createdAt: string;
}): { resolved: AiMenuManagerResolvedCommand | null; card: AiMenuManagerCardPayload } {
    const scope = scopeForContext(params);
    const menuShareExport = resolveMenuShareExportCommand(params.text, params.context);
    const officialPageExport = resolveOfficialPageExportCommand(params.text, params.context);
    const feedbackExport = resolveFeedbackExportCommand(params.text, params.context);
    const customerAppExport = resolveCustomerAppExportCommand(params.text, params.context);
    const digitalScreenExport = resolveDigitalScreenExportCommand(params.text, params.context);
    const posSyncExport = resolvePosSyncExportCommand(params.text, params.context);
    const moreFlow = resolveMobileMoreFlowCommand(params.text, params.context);
    const external = resolveExternalUnsupportedCommand(params.text, scope);
    const domainConversation = resolveDomainConversationCommand(params.text, params.context);
    const generalOutOfScope = resolveGeneralOutOfScopeCommand(params.text, scope);
    const resolved = menuShareExport
        || officialPageExport
        || feedbackExport
        || customerAppExport
        || digitalScreenExport
        || posSyncExport
        || external
        || resolveSelectedItemsCommand(params.text, params.context, params.composerContext)
        || resolveSelectedCategoryCommand(params.text, params.context, params.composerContext)
        || resolveMenuPublishCommand(params.text, params.context)
        || resolveMenuImportCommand(params.text, params.context)
        || resolveSpecialMenuCommand(params.text, params.context)
        || resolveTodaySpecialCommand(params.text, params.context)
        || resolveImageCommand(params.text, params.context)
        || resolveFeaturedSectionCommand(params.text, params.context)
        || resolveSpecialNoteCommand(params.text, params.context)
        || resolveDesignCommand(params.text, params.context)
        // Diagnostic owner questions like "why is my print menu wrong?" must
        // answer from loaded context before generic More/manual screen matches.
        || domainConversation
        || moreFlow
        || resolveBulkPriceCommand(params.text, params.context)
        || resolveBulkAvailabilityCommand(params.text, params.context)
        || resolveItemRenameCommand(params.text, params.context)
        || resolveCategoryRenameCommand(params.text, params.context)
        || resolveItemDescriptionCommand(params.text, params.context)
        || resolveItemCategoryMoveCommand(params.text, params.context)
        || resolveBestSellerCommand(params.text, params.context)
        || resolvePrepTimeCommand(params.text, params.context)
        || resolveAvailabilityCommand(params.text, params.context)
        || resolveCategoryVisibilityCommand(params.text, params.context)
        || resolveVisibilityCommand(params.text, params.context)
        || resolvePriceCommand(params.text, params.context)
        || generalOutOfScope;

    if (!resolved) {
        return {
            resolved: null,
            card: buildClarificationCard({
                cardId: params.cardId,
                scope,
                message: 'Tell Menu Manager the item name and the exact change, for example "Tea 20" or "Cold coffee sold out".',
                createdAt: params.createdAt,
                suggestedReplies: [
                    ...itemSuggestionReplies(
                        params.context,
                        (entry) => `${entry.name} ${nextSuggestedPrice(entry.price)}`,
                        'Change price',
                        2,
                    ),
                    ...itemSuggestionReplies(
                        params.context,
                        (entry) => `${entry.name} sold out`,
                        'Mark sold out',
                        2,
                    ),
                ].slice(0, 4),
            }),
        };
    }

    const card = resolved.cardKind === 'unsupported'
        ? buildUnsupportedCard({
            cardId: params.cardId,
            scope,
            title: resolved.title,
            message: resolved.message,
            entityRefs: resolved.entityRefs,
            beforeAfterSummary: resolved.beforeAfterSummary,
            suggestedReplies: resolved.suggestedReplies,
            createdAt: params.createdAt,
        })
        : resolved.cardKind === 'manual_task'
            ? buildManualTaskCard({
                cardId: params.cardId,
                definition: resolved.definition,
                title: resolved.title,
                message: resolved.message,
                scope,
                entityRefs: resolved.entityRefs,
                beforeAfterSummary: resolved.beforeAfterSummary,
                createdAt: params.createdAt,
                suggestedReplies: resolved.suggestedReplies,
                localActions: resolved.localActions,
            })
        : resolved.cardKind === 'local_export'
            ? buildLocalExportCard({
                cardId: params.cardId,
                definition: resolved.definition,
                title: resolved.title,
                message: resolved.message,
                scope,
                entityRefs: resolved.entityRefs,
                beforeAfterSummary: resolved.beforeAfterSummary,
                createdAt: params.createdAt,
                suggestedReplies: resolved.suggestedReplies,
                localActions: resolved.localActions || [],
            })
        : resolved.cardKind === 'answer'
            ? buildAnswerCard({
                cardId: params.cardId,
                definition: resolved.definition,
                title: resolved.title,
                message: resolved.message,
                scope,
                entityRefs: resolved.entityRefs,
                beforeAfterSummary: resolved.beforeAfterSummary,
                createdAt: params.createdAt,
                suggestedReplies: resolved.suggestedReplies,
            })
        : resolved.cardKind === 'clarification'
            ? buildClarificationCard({
                cardId: params.cardId,
                scope,
                title: resolved.title,
                message: resolved.message,
                createdAt: params.createdAt,
                suggestedReplies: resolved.suggestedReplies,
            })
        : buildProposalCard({
            cardId: params.cardId,
            definition: resolved.definition,
            title: resolved.title,
            message: resolved.message,
            scope,
            entityRefs: resolved.entityRefs,
            beforeAfterSummary: resolved.beforeAfterSummary,
            createdAt: params.createdAt,
            suggestedReplies: resolved.suggestedReplies,
            localActions: resolved.localActions,
        });

    return {
        resolved,
        card,
    };
}
