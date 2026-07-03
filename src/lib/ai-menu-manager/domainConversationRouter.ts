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

function mentionScore(entry: { aliases: string[]; name: string }, normalized: string) {
    return [normalizeDomainText(entry.name), ...entry.aliases.map(normalizeDomainText)]
        .filter((alias) => alias.length >= 3)
        .reduce((score, alias) => normalized.includes(alias) ? Math.max(score, alias.length) : score, 0);
}

function findMentionedItem(context: AiMenuManagerContextPacket, normalized: string) {
    const matches = context.items
        .map((item) => ({ item, score: mentionScore(item, normalized) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);
    if (!matches.length) return null;
    if (matches.length > 1 && matches[0].score === matches[1].score) return null;
    return matches[0].item;
}

function findMentionedCategory(context: AiMenuManagerContextPacket, normalized: string) {
    const matches = context.categories
        .map((category) => ({ category, score: mentionScore(category, normalized) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);
    if (!matches.length) return null;
    if (matches.length > 1 && matches[0].score === matches[1].score) return null;
    return matches[0].category;
}

function resolveSurfaceFreshnessQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksLiveSurface = /\b(qr|public menu|customer menu|menu link|live menu|customers?|customer)\b/.test(normalized)
        && /\b(old|stale|wrong|outdated|not updated|showing old|cache|cached)\b/.test(normalized);
    if (!asksLiveSurface) return null;

    return buildResult({
        context,
        title: 'Check the MenuList link first',
        message: context.publicLinks?.menuUrl
            ? 'The MenuList public link is based on the selected menu. If a customer still sees an old value, reopen the link or refresh the QR scan. Downloaded PDFs or third-party menus need a fresh export/update.'
            : 'The loaded context does not include a public menu link. Open the share tools to copy the current MenuList link or download a fresh QR.',
        beforeAfterSummary: {
            title: 'Public menu freshness',
            rows: [
                { label: 'Selected menu', after: context.projectName },
                { label: 'Menu link', after: context.publicLinks?.menuUrl ? 'Available' : 'Not available in loaded context' },
                { label: 'Printed/exported files', after: 'May need a fresh download after edits' },
                { label: 'External platforms', after: 'Not updated by Menu Manager' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['This is a read-only check from the loaded MenuList context. No external lookup was performed.'],
        },
        suggestedReplies: [
            { label: 'Copy menu link', prompt: 'Copy menu link', helper: 'Share current MenuList menu' },
            { label: 'Download menu QR', prompt: 'Download menu QR', helper: 'Fresh QR for this menu' },
            { label: 'Download menu PDF', prompt: 'Download menu PDF', helper: 'Fresh printable copy' },
        ],
    });
}

function resolvePrintFreshnessQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksPrintSurface = /\b(print|printed|pdf|menu pdf|downloaded menu|menu kit|export)\b/.test(normalized)
        && /\b(old|stale|wrong|outdated|not updated|showing old)\b/.test(normalized);
    if (!asksPrintSurface) return null;

    return buildResult({
        context,
        title: 'Print files need a fresh export',
        message: 'Printed menus and downloaded PDFs do not update after a later menu edit. Create or download a fresh print file from the current selected menu.',
        beforeAfterSummary: {
            title: 'Print freshness',
            rows: [
                { label: 'Selected menu', after: context.projectName },
                { label: 'Live MenuList menu', after: 'Uses current saved menu truth' },
                { label: 'Existing print/PDF file', after: 'Can be older than the latest edit' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: ['This answer does not regenerate anything by itself. Use the suggested next step to prepare the existing print/export flow.'],
        },
        suggestedReplies: [
            { label: 'Download menu PDF', prompt: 'Download menu PDF', helper: 'Fresh printable copy' },
            { label: 'Open print menu', prompt: 'Open print menu', helper: 'Review print output' },
        ],
    });
}

function resolveEntityStateQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksState = /\b(why|status|customer|customers|visible|hidden|unavailable|available|sold out|khatam|over|inactive|deactivated|shown|showing)\b/.test(normalized)
        && /\b(why|is|are|status|check|customer|customers|show me|tell me)\b/.test(normalized);
    if (!asksState) return null;

    const item = findMentionedItem(context, normalized);
    if (item) {
        const state = item.active === false
            ? 'Hidden from customers'
            : item.available === false
                ? 'Shown as unavailable'
                : 'Visible and available';
        return buildResult({
            context,
            title: `${item.name} status`,
            message: item.active === false
                ? `${item.name} is hidden in the selected menu. Customers will not see it until it is shown again.`
                : item.available === false
                    ? `${item.name} is visible but marked unavailable. Customers can see it as sold out/unavailable.`
                    : `${item.name} is visible and available in the selected menu.`,
            beforeAfterSummary: {
                title: 'Item status',
                rows: [
                    { label: 'Item', after: item.name },
                    { label: 'Category', after: item.categoryName },
                    { label: 'Current state', after: state },
                    { label: 'Price', after: item.price || 'Not set' },
                    { label: 'Menu truth', after: 'Unchanged' },
                ],
            },
            entityRefs: [
                projectRef(context),
                { kind: 'category', id: item.categoryId, label: item.categoryName },
                { kind: 'menu_item', id: item.id, label: item.name },
            ],
            suggestedReplies: item.active === false
                ? [{ label: `Show ${item.name}`, prompt: `Show ${item.name}`, helper: 'Prepare visibility card' }]
                : item.available === false
                    ? [{ label: `Make ${item.name} available`, prompt: `Make ${item.name} available`, helper: 'Prepare availability card' }]
                    : [
                        { label: `Mark ${item.name} sold out`, prompt: `${item.name} sold out`, helper: 'Prepare availability card' },
                        { label: `Hide ${item.name}`, prompt: `Hide ${item.name}`, helper: 'Prepare visibility card' },
                    ],
        });
    }

    const category = findMentionedCategory(context, normalized);
    if (category) {
        const itemCount = activeItems(context).filter((entry) => entry.categoryId === category.id).length;
        return buildResult({
            context,
            title: `${category.name} category status`,
            message: category.active === false
                ? `${category.name} is hidden in the selected menu. Customers will not see this section until it is shown again.`
                : `${category.name} is visible in the selected menu and has ${itemCount} active items in the loaded context.`,
            beforeAfterSummary: {
                title: 'Category status',
                rows: [
                    { label: 'Category', after: category.name },
                    { label: 'Current state', after: category.active === false ? 'Hidden from customers' : 'Visible to customers' },
                    { label: 'Active items', after: String(itemCount) },
                    { label: 'Menu truth', after: 'Unchanged' },
                ],
            },
            entityRefs: [
                projectRef(context),
                { kind: 'category', id: category.id, label: category.name },
            ],
            suggestedReplies: category.active === false
                ? [{ label: `Show ${category.name}`, prompt: `Show ${category.name} category`, helper: 'Prepare category card' }]
                : [{ label: `Hide ${category.name}`, prompt: `Hide ${category.name} category`, helper: 'Prepare category card' }],
        });
    }

    if (/\b(hidden|unavailable|sold out|khatam|over|inactive|deactivated)\b/.test(normalized)) {
        const soldOut = unavailableItems(context);
        const hidden = hiddenItems(context);
        const hiddenCats = hiddenCategories(context);
        return buildResult({
            context,
            title: 'Current hidden and unavailable entries',
            message: 'I checked the loaded selected menu context. Choose a suggested reply or name the item/category to prepare a card.',
            beforeAfterSummary: {
                title: 'Current menu status',
                rows: [
                    { label: 'Sold-out active items', after: soldOut.length ? listNames(soldOut, 6) : 'None found' },
                    { label: 'Hidden items', after: hidden.length ? listNames(hidden, 6) : 'None found' },
                    { label: 'Hidden categories', after: hiddenCats.length ? listNames(hiddenCats, 6) : 'None found' },
                    { label: 'Menu truth', after: 'Unchanged' },
                ],
            },
            suggestedReplies: [
                ...soldOut.slice(0, 2).map((entry) => ({
                    label: `Make ${entry.name} available`,
                    prompt: `Make ${entry.name} available`,
                    helper: 'Prepare availability card',
                })),
                ...hidden.slice(0, 1).map((entry) => ({
                    label: `Show ${entry.name}`,
                    prompt: `Show ${entry.name}`,
                    helper: 'Prepare visibility card',
                })),
                ...hiddenCats.slice(0, 1).map((entry) => ({
                    label: `Show ${entry.name}`,
                    prompt: `Show ${entry.name} category`,
                    helper: 'Prepare category card',
                })),
            ].slice(0, 4),
        });
    }

    return null;
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

function promotionCandidateItems(context: AiMenuManagerContextPacket) {
    return activeItems(context)
        .filter((item) => item.available !== false && Boolean(parsePrice(item.price)))
        .sort((a, b) => {
            const score = (item: typeof a) => (
                (item.isBestSeller ? 20 : 0)
                + (item.hasImage ? 12 : 0)
                + (item.hasDescription ? 8 : 0)
                + (item.ownerBoost || 0)
            );
            return score(b) - score(a);
        });
}

function resolvePromotionRecommendationQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksPromotion = /\b(what|which|suggest|recommend|can|should|today|now)\b.*\b(promote|feature|featured|special|push|highlight|bestseller)\b/.test(normalized)
        || /\b(what should i promote|what can i promote|what to promote|today special suggestion|suggest special)\b/.test(normalized);
    if (!asksPromotion) return null;

    const items = promotionCandidateItems(context);
    const item = items[0];
    if (!item) {
        return buildResult({
            context,
            title: 'Pick a priced available item first',
            message: 'I did not find a visible, available, priced item to promote in the loaded selected menu context.',
            beforeAfterSummary: {
                title: 'Promotion check',
                rows: [
                    { label: 'Visible active items', after: String(activeItems(context).length) },
                    { label: 'Promotion-ready items', after: 'None found in loaded context' },
                    { label: 'Menu truth', after: 'Unchanged' },
                ],
                warnings: ['Add or restore a priced item before preparing a featured item card.'],
            },
            suggestedReplies: [
                { label: 'What should I fix?', prompt: 'What should I fix today?', helper: 'Review menu gaps' },
                { label: 'Show Featured section', prompt: 'Show Featured section', helper: 'Prepare Featured section card' },
            ],
        });
    }

    return buildResult({
        context,
        title: `Promote ${item.name}`,
        message: `${item.name} is available and priced. It is the easiest item to promote from the loaded selected menu context.`,
        beforeAfterSummary: {
            title: 'Promotion recommendation',
            rows: [
                { label: 'Suggested item', after: item.name },
                { label: 'Category', after: item.categoryName },
                { label: 'Price', after: item.price || 'Not set' },
                { label: 'Photo', after: item.hasImage ? 'Present' : 'Missing' },
                { label: 'Menu truth', after: 'Unchanged' },
            ],
            warnings: item.hasImage ? undefined : ['This item has no photo in the loaded context. You can still feature it, or prepare a photo task first.'],
        },
        entityRefs: [
            projectRef(context),
            { kind: 'category', id: item.categoryId, label: item.categoryName },
            { kind: 'menu_item', id: item.id, label: item.name },
        ],
        suggestedReplies: [
            { label: `Feature ${item.name}`, prompt: `Feature ${item.name}`, helper: 'Prepare Featured item card' },
            { label: `Mark bestseller`, prompt: `Mark ${item.name} bestseller`, helper: 'Prepare bestseller card' },
            { label: 'Show Featured section', prompt: 'Show Featured section', helper: 'Prepare Featured section card' },
        ],
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

function resolveCustomerPriceConcernQuestion(text: string, context: AiMenuManagerContextPacket) {
    const normalized = normalizeDomainText(text);
    const asksPriceProblem = /\b(customer|guest|someone|they|client)\b.*\b(price|rate|cost)\b.*\b(wrong|old|different)\b/.test(normalized)
        || /\b(price|rate|cost)\b.*\b(wrong|old|different|customer says|guest says)\b/.test(normalized);
    if (!asksPriceProblem) return null;

    const item = findMentionedItem(context, normalized);
    if (item) {
        return buildResult({
            context,
            title: `${item.name} price`,
            message: `${item.name} is currently ${item.price || 'not priced'} in the selected menu. Send the correct price to prepare an approval card.`,
            beforeAfterSummary: {
                title: 'Current price check',
                rows: [
                    { label: 'Item', after: item.name },
                    { label: 'Category', after: item.categoryName },
                    { label: 'Current price', after: item.price || 'Not set' },
                    { label: 'Menu truth', after: 'Unchanged' },
                ],
                warnings: ['This is a read-only check from the loaded selected menu context.'],
            },
            entityRefs: [
                projectRef(context),
                { kind: 'category', id: item.categoryId, label: item.categoryName },
                { kind: 'menu_item', id: item.id, label: item.name },
            ],
            suggestedReplies: [
                { label: `${item.name} ${nextSuggestedPrice(item.price)}`, prompt: `${item.name} ${nextSuggestedPrice(item.price)}`, helper: 'Prepare price card' },
            ],
        });
    }

    const pricedItems = activeItems(context).filter((entry) => Boolean(parsePrice(entry.price))).slice(0, 5);
    return buildResult({
        context,
        title: 'Which item price should I check?',
        message: 'I can check the loaded menu prices. Name the item or choose a suggested item to prepare the next step.',
        beforeAfterSummary: {
            title: 'Current prices',
            rows: pricedItems.map((entry) => ({
                label: entry.name,
                after: entry.price || 'Not set',
            })),
            warnings: ['No menu truth changed.'],
        },
        suggestedReplies: pricedItems.slice(0, 4).map((entry) => ({
            label: entry.name,
            prompt: `Can I increase ${entry.name} price?`,
            helper: entry.price || 'Check price',
        })),
    });
}

export function resolveDomainConversationCommand(
    text: string,
    context: AiMenuManagerContextPacket,
): AiMenuManagerDomainConversationResult | null {
    return resolveCustomerPriceConcernQuestion(text, context)
        || resolveSurfaceFreshnessQuestion(text, context)
        || resolvePrintFreshnessQuestion(text, context)
        || resolveEntityStateQuestion(text, context)
        || resolveShareReadinessQuestion(text, context)
        || resolvePromotionRecommendationQuestion(text, context)
        || resolvePhotoGapQuestion(text, context)
        || resolveDescriptionGapQuestion(text, context)
        || resolveAvailabilityQuestion(text, context)
        || resolvePriceAdviceQuestion(text, context)
        || resolveMenuHealthQuestion(text, context);
}
