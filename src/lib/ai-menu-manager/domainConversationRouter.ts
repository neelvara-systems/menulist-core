import type {
    AiMenuManagerActionDefinition,
    AiMenuManagerBeforeAfterSummary,
    AiMenuManagerEntityRef,
    AiMenuManagerExecutionMode,
    AiMenuManagerSuggestedReply,
} from '@type/aiMenuManager';
import { getAiMenuManagerActionDefinition } from './actionRegistry';
import type { AiMenuManagerContextPacket } from './contextPacket';
import { findAiMenuManagerCategoryByName, findAiMenuManagerItemByName } from './contextPacket';

export interface AiMenuManagerDomainConversationResult {
    actionType: 'system_context_answer';
    definition: AiMenuManagerActionDefinition;
    title: string;
    message: string;
    entityRefs: AiMenuManagerEntityRef[];
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    executionMode: AiMenuManagerExecutionMode;
    cardKind: 'answer';
    patch?: undefined;
    patchHash?: undefined;
    suggestedReplies?: AiMenuManagerSuggestedReply[];
}

type MenuContextIssue = {
    count: number;
    examples: string;
    label: string;
    prompt?: string;
    severity: number;
};

function normalizeDomainText(value = '') {
    return value
        .toLowerCase()
        .replace(/[₹]/g, ' rs ')
        .replace(/[^a-z0-9\s.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function activeItems(context: AiMenuManagerContextPacket) {
    return context.items.filter((item) => item.active !== false);
}

function visibleCategories(context: AiMenuManagerContextPacket) {
    return context.categories.filter((category) => category.active !== false);
}

function listNames(entries: Array<{ name: string }>, limit = 4) {
    const visible = entries.slice(0, limit).map((entry) => entry.name);
    const remaining = entries.length - visible.length;
    return `${visible.join(', ')}${remaining > 0 ? `, +${remaining} more` : ''}`;
}

function parsePrice(value?: string) {
    const numeric = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function nextSuggestedPrice(value?: string) {
    const current = parsePrice(value);
    const next = current ? current + 10 : 20;
    return Number.isInteger(next) ? String(next) : next.toFixed(2);
}

function projectRef(context: AiMenuManagerContextPacket): AiMenuManagerEntityRef {
    return { kind: 'project', id: context.projectId, label: context.projectName };
}

function buildResult(params: {
    context: AiMenuManagerContextPacket;
    title: string;
    message: string;
    beforeAfterSummary: AiMenuManagerBeforeAfterSummary;
    entityRefs?: AiMenuManagerEntityRef[];
    suggestedReplies?: AiMenuManagerSuggestedReply[];
}): AiMenuManagerDomainConversationResult {
    const definition = getAiMenuManagerActionDefinition('system_context_answer');
    return {
        actionType: 'system_context_answer',
        definition,
        title: params.title,
        message: params.message,
        entityRefs: params.entityRefs || [projectRef(params.context)],
        beforeAfterSummary: params.beforeAfterSummary,
        executionMode: definition.executionMode,
        cardKind: 'answer',
        suggestedReplies: params.suggestedReplies,
    };
}

function missingPriceItems(context: AiMenuManagerContextPacket) {
    return activeItems(context).filter((item) => !parsePrice(item.price));
}

function unavailableItems(context: AiMenuManagerContextPacket) {
    return activeItems(context).filter((item) => item.available === false);
}

function hiddenItems(context: AiMenuManagerContextPacket) {
    return context.items.filter((item) => item.active === false);
}

function hiddenCategories(context: AiMenuManagerContextPacket) {
    return context.categories.filter((category) => category.active === false);
}

function missingImageItems(context: AiMenuManagerContextPacket) {
    return activeItems(context).filter((item) => !item.hasImage);
}

function missingDescriptionItems(context: AiMenuManagerContextPacket) {
    return activeItems(context).filter((item) => !item.hasDescription);
}

function buildMenuIssues(context: AiMenuManagerContextPacket): MenuContextIssue[] {
    const priceItems = missingPriceItems(context);
    const soldOutItems = unavailableItems(context);
    const hiddenMenuItems = hiddenItems(context);
    const hiddenMenuCategories = hiddenCategories(context);
    const imageItems = missingImageItems(context);
    const descriptionItems = missingDescriptionItems(context);
    const categories = visibleCategories(context);
    const emptyCategories = categories.filter((category) => !activeItems(context).some((item) => item.categoryId === category.id));
    const issues: Array<MenuContextIssue | null> = [
        priceItems.length ? {
            count: priceItems.length,
            examples: listNames(priceItems),
            label: 'Items without price',
            prompt: `${priceItems[0].name} ${nextSuggestedPrice(priceItems[0].price)}`,
            severity: 100,
        } : null,
        soldOutItems.length ? {
            count: soldOutItems.length,
            examples: listNames(soldOutItems),
            label: 'Sold-out active items',
            prompt: `Make ${soldOutItems[0].name} available`,
            severity: 90,
        } : null,
        hiddenMenuCategories.length ? {
            count: hiddenMenuCategories.length,
            examples: listNames(hiddenMenuCategories),
            label: 'Hidden categories',
            prompt: `Show ${hiddenMenuCategories[0].name} category`,
            severity: 80,
        } : null,
        hiddenMenuItems.length ? {
            count: hiddenMenuItems.length,
            examples: listNames(hiddenMenuItems),
            label: 'Hidden items',
            prompt: `Show ${hiddenMenuItems[0].name}`,
            severity: 70,
        } : null,
        emptyCategories.length ? {
            count: emptyCategories.length,
            examples: listNames(emptyCategories),
            label: 'Visible categories with no visible items',
            severity: 60,
        } : null,
        imageItems.length ? {
            count: imageItems.length,
            examples: listNames(imageItems),
            label: 'Items without photos',
            prompt: `Generate image for ${imageItems[0].name}`,
            severity: 50,
        } : null,
        descriptionItems.length ? {
            count: descriptionItems.length,
            examples: listNames(descriptionItems),
            label: 'Items without descriptions',
            prompt: `Add description for ${descriptionItems[0].name}: Freshly prepared and served hot.`,
            severity: 40,
        } : null,
    ];

    return issues
        .filter((issue): issue is MenuContextIssue => Boolean(issue))
        .sort((a, b) => b.severity - a.severity);
}

function buildIssueSuggestedReplies(issues: MenuContextIssue[]) {
    return issues
        .filter((issue) => Boolean(issue.prompt))
        .slice(0, 4)
        .map((issue) => ({
            label: issue.label,
            prompt: issue.prompt as string,
            helper: 'Prepare a card',
        }));
}

function resolveMenuHealthQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksForFixes = /\b(what|which|where|how)\b.*\b(fix|improve|better|missing|incomplete|problem|wrong|attention|ready|share|publish|qr)\b/.test(normalized)
        || /\b(menu health|menu readiness|ready to share|ready to publish|check my menu|review my menu|what should i fix|what needs attention)\b/.test(normalized);
    if (!asksForFixes) return null;

    const issues = buildMenuIssues(context);
    if (!issues.length) {
        return buildResult({
            context,
            title: 'Menu state is stable',
            message: 'The selected menu has prices, available active items, visible categories, and no obvious photo or description gaps in the loaded context.',
            beforeAfterSummary: {
                title: 'Selected menu check',
                rows: [
                    { label: 'Menu', after: context.projectName },
                    { label: 'Visible items', after: String(activeItems(context).length) },
                    { label: 'Visible categories', after: String(visibleCategories(context).length) },
                    { label: 'Menu truth', after: 'Unchanged' },
                ],
            },
            suggestedReplies: [
                { label: 'Copy menu link', prompt: 'Copy menu link', helper: 'Share menu' },
                { label: 'Download menu QR', prompt: 'Download menu QR', helper: 'Share QR' },
                { label: 'Make menu premium', prompt: 'Make menu premium', helper: 'Style update' },
            ],
        });
    }

    return buildResult({
        context,
        title: 'Start with these menu fixes',
        message: 'I checked the loaded selected menu context and found the highest-impact items to review first.',
        beforeAfterSummary: {
            title: 'Menu attention list',
            rows: issues.slice(0, 6).map((issue) => ({
                label: issue.label,
                before: `${issue.count}`,
                after: issue.examples,
            })),
            warnings: ['This is a read-only check. Choose a suggested reply or send a message to prepare an approval card.'],
        },
        suggestedReplies: buildIssueSuggestedReplies(issues),
    });
}

function resolvePhotoGapQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    if (!/\b(photo|photos|image|images|picture|pictures)\b/.test(normalized) || !/\b(missing|without|no|need|which|what)\b/.test(normalized)) {
        return null;
    }
    const items = missingImageItems(context);
    return buildResult({
        context,
        title: items.length ? 'Items missing photos' : 'No obvious photo gaps',
        message: items.length
            ? `${items.length} active items do not have photos in the loaded menu context.`
            : 'I did not find active items without photos in the loaded menu context.',
        beforeAfterSummary: {
            title: 'Photo check',
            rows: [
                { label: 'Items checked', after: String(activeItems(context).length) },
                { label: 'Missing photos', after: items.length ? listNames(items, 6) : 'None found' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
        },
        entityRefs: [
            projectRef(context),
            ...items.slice(0, 5).map((item) => ({ kind: 'menu_item' as const, id: item.id, label: item.name })),
        ],
        suggestedReplies: items.slice(0, 3).map((item) => ({
            label: `Generate ${item.name}`,
            prompt: `Generate image for ${item.name}`,
            helper: 'Prepare image draft',
        })),
    });
}

function resolveDescriptionGapQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    if (!/\b(description|descriptions|content|details)\b/.test(normalized) || !/\b(missing|without|no|need|which|what)\b/.test(normalized)) {
        return null;
    }
    const items = missingDescriptionItems(context);
    return buildResult({
        context,
        title: items.length ? 'Items missing descriptions' : 'No obvious description gaps',
        message: items.length
            ? `${items.length} active items do not have descriptions in the loaded menu context.`
            : 'I did not find active items without descriptions in the loaded menu context.',
        beforeAfterSummary: {
            title: 'Description check',
            rows: [
                { label: 'Items checked', after: String(activeItems(context).length) },
                { label: 'Missing descriptions', after: items.length ? listNames(items, 6) : 'None found' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
        },
        entityRefs: [
            projectRef(context),
            ...items.slice(0, 5).map((item) => ({ kind: 'menu_item' as const, id: item.id, label: item.name })),
        ],
        suggestedReplies: items.slice(0, 3).map((item) => ({
            label: `Describe ${item.name}`,
            prompt: `Add description for ${item.name}: Freshly prepared and served hot.`,
            helper: 'Prepare description card',
        })),
    });
}

function resolveAvailabilityQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    if (!/\b(sold out|unavailable|available|khatam|over|hidden|visible|deactivate|inactive)\b/.test(normalized) || !/\b(which|what|show|list|any|are)\b/.test(normalized)) {
        return null;
    }
    const soldOut = unavailableItems(context);
    const hidden = hiddenItems(context);
    const hiddenCats = hiddenCategories(context);
    return buildResult({
        context,
        title: 'Visibility and availability check',
        message: 'I checked active availability and hidden menu entries in the loaded selected menu context.',
        beforeAfterSummary: {
            title: 'Current menu visibility',
            rows: [
                { label: 'Sold-out active items', after: soldOut.length ? listNames(soldOut, 6) : 'None found' },
                { label: 'Hidden items', after: hidden.length ? listNames(hidden, 6) : 'None found' },
                { label: 'Hidden categories', after: hiddenCats.length ? listNames(hiddenCats, 6) : 'None found' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
        },
        suggestedReplies: [
            ...soldOut.slice(0, 2).map((item) => ({
                label: `Make ${item.name} available`,
                prompt: `Make ${item.name} available`,
                helper: 'Prepare availability card',
            })),
            ...hidden.slice(0, 1).map((item) => ({
                label: `Show ${item.name}`,
                prompt: `Show ${item.name}`,
                helper: 'Prepare visibility card',
            })),
            ...hiddenCats.slice(0, 1).map((category) => ({
                label: `Show ${category.name}`,
                prompt: `Show ${category.name} category`,
                helper: 'Prepare category card',
            })),
        ].slice(0, 4),
    });
}

function resolveShareReadinessQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksShareReadiness = /\b(ready|safe|ok|okay|can i|should i|is my)\b.*\b(share|publish|qr|customer|public|link)\b/.test(normalized)
        || /\b(qr menu|public menu|customer menu)\b.*\b(ready|working|live|updated|old|stale)\b/.test(normalized);
    if (!asksShareReadiness) return null;

    const issues = buildMenuIssues(context);
    const blockingIssues = issues.filter((issue) => issue.severity >= 60);
    return buildResult({
        context,
        title: blockingIssues.length ? 'Review before sharing' : 'Menu is ready to share',
        message: blockingIssues.length
            ? 'The selected menu can be shared, but these items should be reviewed before sending it to customers.'
            : 'The selected menu has no obvious blocking issues in the loaded context. You can copy the link or download the QR.',
        beforeAfterSummary: {
            title: 'Share readiness',
            rows: [
                { label: 'Menu', after: context.projectName },
                { label: 'Menu link', after: context.publicLinks?.menuUrl ? 'Available' : 'Not available in context' },
                { label: 'Visible items', after: String(activeItems(context).length) },
                { label: 'Review items', after: blockingIssues.length ? blockingIssues.map((issue) => `${issue.label}: ${issue.count}`).join(', ') : 'None found' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: context.publicLinks?.menuUrl ? undefined : ['The public menu link was not available in the loaded context.'],
        },
        suggestedReplies: [
            { label: 'Copy menu link', prompt: 'Copy menu link', helper: 'Share menu' },
            { label: 'Download menu QR', prompt: 'Download menu QR', helper: 'Share QR' },
            ...(issues[0]?.prompt ? [{ label: issues[0].label, prompt: issues[0].prompt, helper: 'Prepare fix' }] : []),
        ],
    });
}

function resolvePriceAdviceQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksForAdvice = /\b(can i|should i|what price|price advice|pricing advice)\b/.test(normalized)
        || /\b(how much|what should)\b.*\b(price|charge)\b/.test(normalized);
    if (!asksForAdvice || !/\b(price|prices|rate|rates|cost|rs|charge)\b/.test(normalized)) {
        return null;
    }

    const item = context.items.find((entry) => normalized.includes(normalizeDomainText(entry.name)))
        || findAiMenuManagerItemByName(context, normalized);
    const category = context.categories.find((entry) => normalized.includes(normalizeDomainText(entry.name)))
        || findAiMenuManagerCategoryByName(context, normalized);
    const scopedItems = category
        ? activeItems(context).filter((entry) => entry.categoryId === category.id)
        : item ? [item] : activeItems(context).slice(0, 5);

    return buildResult({
        context,
        title: 'Price change can be prepared',
        message: item
            ? `${item.name} is currently ${item.price || 'not priced'}. Send the new price and Menu Manager will prepare an approval card.`
            : category
                ? `${category.name} has ${scopedItems.length} active items. A bulk price change will need approval before it applies.`
                : 'Tell Menu Manager the item, category, or selected items and the amount. Price changes always need approval before they apply.',
        beforeAfterSummary: {
            title: 'Price context',
            rows: scopedItems.slice(0, 5).map((entry) => ({
                label: entry.name,
                before: entry.price || 'Not set',
                after: 'Waiting for requested change',
            })),
            warnings: ['Price updates are prepared as approval cards before any menu truth changes.'],
        },
        entityRefs: [
            projectRef(context),
            ...(item ? [{ kind: 'menu_item' as const, id: item.id, label: item.name }] : []),
            ...(category ? [{ kind: 'category' as const, id: category.id, label: category.name }] : []),
        ],
        suggestedReplies: item
            ? [{ label: `${item.name} ${nextSuggestedPrice(item.price)}`, prompt: `${item.name} ${nextSuggestedPrice(item.price)}`, helper: 'Prepare price card' }]
            : category
                ? [{ label: `Increase ${category.name}`, prompt: `Increase all ${category.name} by 10`, helper: 'Prepare bulk price card' }]
                : scopedItems.slice(0, 3).map((entry) => ({
                    label: `${entry.name} ${nextSuggestedPrice(entry.price)}`,
                    prompt: `${entry.name} ${nextSuggestedPrice(entry.price)}`,
                    helper: 'Prepare price card',
                })),
    });
}

export function resolveDomainConversationCommand(
    text: string,
    context: AiMenuManagerContextPacket,
): AiMenuManagerDomainConversationResult | null {
    return resolveShareReadinessQuestion(text, context)
        || resolvePhotoGapQuestion(text, context)
        || resolveDescriptionGapQuestion(text, context)
        || resolveAvailabilityQuestion(text, context)
        || resolvePriceAdviceQuestion(text, context)
        || resolveMenuHealthQuestion(text, context);
}
