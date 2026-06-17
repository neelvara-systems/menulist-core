import { MENU_DESIGN_PRESETS, getMenuDesignPresetPatch } from '@lib/menu/menuDesignPresets';
import type {
    AiMenuManagerActionDefinition,
    AiMenuManagerActionType,
    AiMenuManagerBeforeAfterSummary,
    AiMenuManagerEntityRef,
    AiMenuManagerExecutionMode,
    AiMenuManagerProjectPatch,
    AiMenuManagerScope,
} from '@type/aiMenuManager';
import { buildClarificationCard, buildManualTaskCard, buildProposalCard, buildUnsupportedCard } from './cardBuilder';
import {
    findAiMenuManagerCategoryByName,
    findAiMenuManagerItemByName,
    type AiMenuManagerContextCategory,
    type AiMenuManagerContextItem,
    type AiMenuManagerContextPacket,
} from './contextPacket';
import { hashStableValue } from './idempotency';
import { getAiMenuManagerActionDefinition } from './actionRegistry';

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
    cardKind?: 'proposal' | 'manual_task' | 'clarification' | 'unsupported';
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
    if (!item) return null;

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
        .replace(/\b(?:sold out|out of stock|not available|unavailable|over|finished|khatam hai|khatam|available again|back in stock|back|available|in stock)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveAvailabilityCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const makesUnavailable = /\b(sold out|out of stock|not available|unavailable|over|finished|khatam hai|khatam)\b/.test(normalized);
    const makesAvailable = /\b(available again|back in stock|back|available|in stock)\b/.test(normalized);
    if (!makesUnavailable && !makesAvailable) return null;

    const itemName = extractAvailabilityItemName(normalized);
    const item = findAiMenuManagerItemByName(context, itemName);
    if (!item) return null;

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
    if (!item) return null;

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
    if (!category) return null;

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

    const match = text.match(/^\s*(?:set|change|update|add|write)?\s*(.+?)\s+(?:description|desc)\s*(?:to|as|:|-)\s*(.+)$/i)
        || text.match(/^\s*(?:set|change|update|add|write)?\s*(?:description|desc)\s+(?:for|of)\s+(.+?)\s*(?:to|as|:|-)\s*(.+)$/i);
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

function resolveFeaturedSectionCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const mentionsFeatured = /\b(featured|feature|promote|highlight|spotlight)\b/.test(normalized);
    if (!mentionsFeatured) return null;

    const itemName = normalized
        .replace(/\b(?:show|add|set|make|put|pin|promote|highlight|spotlight|feature|featured|choice|section|menu|item|this|in|on|as|to|the)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const item = itemName ? findAiMenuManagerItemByName(context, itemName) : null;
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

function resolveBulkPriceCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(?:increase|raise|decrease|reduce)\b/.test(normalized) || !/\b(?:all|category|section)\b/.test(normalized)) return null;

    const match = normalized.match(/\b(increase|raise|decrease|reduce)\b\s+(?:all\s+)?(.+?)\s+(?:by\s+)?(\d+(?:\.\d{1,2})?)\s*(percent|percentage|%)?$/i);
    if (!match) return null;

    const direction = /^(increase|raise)$/.test(match[1]) ? 1 : -1;
    const categoryName = stripCommandWords(match[2], /\b(?:items|item|prices|price|category|section|menu)\b/g);
    const category = findAiMenuManagerCategoryByName(context, categoryName);
    if (!category) return null;

    const amount = Number(match[3]);
    const isPercent = Boolean(match[4]);
    const affectedItems = context.items.filter((item) => item.categoryId === category.id && item.price && Number.isFinite(Number(item.price)));
    if (!affectedItems.length || !Number.isFinite(amount)) return null;

    const itemUpdates = Object.fromEntries(affectedItems.map((item) => {
        const currentPrice = Number(item.price || 0);
        const delta = isPercent ? currentPrice * (amount / 100) : amount;
        const nextPrice = Math.max(0, currentPrice + direction * delta);
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
        title: `Update ${category.name} prices`,
        message: `${affectedItems.length} ${category.name} item${affectedItems.length === 1 ? '' : 's'} will ${direction > 0 ? 'increase' : 'decrease'} by ${amount}${isPercent ? '%' : ''}.`,
        entityRefs: categoryRefs(context, category),
        beforeAfterSummary: {
            title: 'Bulk price update',
            rows: [
                { label: 'Scope', before: category.name, after: category.name },
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
    };
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

    const affectedItems = context.items.filter((item) => item.categoryId === category.id);
    if (!affectedItems.length) return null;

    const nextValue = makesAvailable && !makesUnavailable;
    const definition = getAiMenuManagerActionDefinition('bulk_availability_update');
    const patch: AiMenuManagerProjectPatch = {
        kind: 'bulk_item_update',
        itemIds: affectedItems.map((item) => item.id),
        updates: { available: nextValue },
    };

    return {
        actionType: 'bulk_availability_update',
        definition,
        title: `${nextValue ? 'Mark available' : 'Mark sold out'}: ${category.name}`,
        message: `${affectedItems.length} ${category.name} item${affectedItems.length === 1 ? '' : 's'} will be ${nextValue ? 'available' : 'sold out'}.`,
        entityRefs: categoryRefs(context, category),
        beforeAfterSummary: {
            title: 'Bulk availability update',
            rows: [
                { label: 'Scope', before: category.name, after: category.name },
                { label: 'Affected items', before: `${affectedItems.length}`, after: `${affectedItems.length}` },
                ...affectedItems.slice(0, 3).map((item) => ({
                    label: item.name,
                    before: item.available ? 'Available' : 'Sold out',
                    after: nextValue ? 'Available' : 'Sold out',
                })),
            ],
            warnings: ['Bulk availability changes affect every listed item after approval.'],
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
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

function resolveDesignCommand(text: string, context: AiMenuManagerContextPacket): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    const preset = pickDesignPreset(text);
    const mentionsDesignSurface = /\b(menu|theme|style|design|look|mood|appearance)\b/.test(normalized);
    const asksForPresetStyle = Boolean(preset)
        && /\b(make|set|change|apply|use|switch|turn|give)\b/.test(normalized);

    if (!mentionsDesignSurface && !asksForPresetStyle) return null;
    if (!preset) return null;

    const definition = getAiMenuManagerActionDefinition('menu_design_mood_update');
    const designPatch = getMenuDesignPresetPatch(preset);
    const patch: AiMenuManagerProjectPatch = {
        kind: 'menu_design_preset_apply',
        designPresetKey: preset.key,
        designPatch,
    };

    return {
        actionType: 'menu_design_mood_update',
        definition,
        title: `Apply ${preset.label}`,
        message: `${preset.label} will be applied to ${context.projectName}.`,
        entityRefs: [
            { kind: 'project', id: context.projectId, label: context.projectName },
            { kind: 'preset', id: preset.key, label: preset.label },
        ],
        beforeAfterSummary: {
            title: 'Menu style',
            rows: [
                { label: 'Mood', before: context.menuDesign.mood || 'Current', after: preset.mood },
                { label: 'Layout', before: context.menuDesign.layout || 'Current', after: preset.layout },
                { label: 'Accent', before: 'Current color', after: preset.accentColor },
            ],
        },
        patch,
        patchHash: withPatchHash(patch),
        executionMode: definition.executionMode,
    };
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

    return {
        actionType: 'image_item_generate',
        definition,
        title: item ? `Generate image for ${item.name}` : 'Generate item image',
        message: item
            ? `Menu Manager can prepare an image generation task for ${item.name}.`
            : 'Choose the item first so Menu Manager can prepare the image generation task.',
        entityRefs: item ? itemRefs(context, item) : [{ kind: 'project', id: context.projectId, label: context.projectName }],
        beforeAfterSummary: {
            title: 'Image task',
            rows: [
                { label: 'Item', after: item?.name || 'Needs item selection' },
                { label: 'Current image', before: item?.hasImage ? 'Has image' : 'No image' },
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
        message: 'Use the existing publish flow to make this selected menu live.',
        context,
        beforeAfterSummary: {
            title: 'Publish menu',
            rows: [
                { label: 'Menu', before: context.projectName, after: context.projectName },
                { label: 'Public impact', after: 'Customers see the published version after publish completes' },
            ],
            warnings: ['Publishing is not executed by this card until the publish adapter is connected.'],
        },
    });
}

function resolveExternalUnsupportedCommand(text: string, scope: AiMenuManagerScope): AiMenuManagerResolvedCommand | null {
    const normalized = normalizeText(text);
    if (!/\b(zomato|swiggy|ubereats|instagram|facebook|google business|google listing|google review|review reply)\b/.test(normalized)) {
        return null;
    }

    const definition = getAiMenuManagerActionDefinition('system_unsupported_action');
    return {
        actionType: 'system_unsupported_action' as AiMenuManagerActionType,
        definition,
        title: 'Manual task needed',
        message: 'Menu Manager cannot directly change that external platform until a first-party adapter is connected.',
        entityRefs: [],
        beforeAfterSummary: {
            title: 'External handoff',
            rows: [{ label: 'Task', after: text }],
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
    cardId: string;
    createdAt: string;
}) {
    const scope = scopeForContext(params);
    const external = resolveExternalUnsupportedCommand(params.text, scope);
    const resolved = external
        || resolveMenuPublishCommand(params.text, params.context)
        || resolveMenuImportCommand(params.text, params.context)
        || resolveSpecialMenuCommand(params.text, params.context)
        || resolveTodaySpecialCommand(params.text, params.context)
        || resolveImageCommand(params.text, params.context)
        || resolveFeaturedSectionCommand(params.text, params.context)
        || resolveSpecialNoteCommand(params.text, params.context)
        || resolveDesignCommand(params.text, params.context)
        || resolveBulkPriceCommand(params.text, params.context)
        || resolveBulkAvailabilityCommand(params.text, params.context)
        || resolveCategoryRenameCommand(params.text, params.context)
        || resolveItemRenameCommand(params.text, params.context)
        || resolveItemDescriptionCommand(params.text, params.context)
        || resolveItemCategoryMoveCommand(params.text, params.context)
        || resolveBestSellerCommand(params.text, params.context)
        || resolvePrepTimeCommand(params.text, params.context)
        || resolveAvailabilityCommand(params.text, params.context)
        || resolveCategoryVisibilityCommand(params.text, params.context)
        || resolveVisibilityCommand(params.text, params.context)
        || resolvePriceCommand(params.text, params.context);

    if (!resolved) {
        return {
            resolved: null,
            card: buildClarificationCard({
                cardId: params.cardId,
                scope,
                message: 'Tell Menu Manager the item name and the exact change, for example "Tea 20" or "Cold coffee sold out".',
                createdAt: params.createdAt,
            }),
        };
    }

    const card = resolved.cardKind === 'unsupported'
        ? buildUnsupportedCard({
            cardId: params.cardId,
            scope,
            message: resolved.message,
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
        });

    return {
        resolved,
        card,
    };
}
