import assert from 'node:assert/strict';

import type { AiMenuManagerContextPacket } from '@lib/ai-menu-manager/contextPacket';
import { resolveAiMenuManagerCommand } from '@lib/ai-menu-manager/commandResolver';
import { resolveDomainConversationCommand } from '@lib/ai-menu-manager/domainConversationRouter';

function contextForItem(name: string, categoryActive = true): AiMenuManagerContextPacket {
    return {
        projectId: 'project-1',
        defaultLanguage: 'en',
        projectName: 'Dinner',
        storeName: 'Test Store',
        menuDesign: {},
        decisionBlocks: {
            enablePopular: true,
            enableQuickPick: true,
            enableBestValue: true,
        },
        categories: [{
            id: 'category-1',
            name: 'Main dishes',
            aliases: ['main dishes'],
            active: categoryActive,
            fileUid: 'file-1',
            hasImage: false,
            timeSlotsCount: 0,
        }],
        items: [{
            id: 'item-1',
            name,
            aliases: [name],
            categoryId: 'category-1',
            categoryName: 'Main dishes',
            fileUid: 'file-1',
            price: '250',
            available: true,
            active: true,
            hasImage: true,
            hasDescription: true,
            hasDisplayPrice: true,
        }],
    };
}

for (const itemName of ['पनीर टिक्का', 'شاي بالنعناع', 'மசாலா தோசை']) {
    const result = resolveDomainConversationCommand(
        `A customer says the ${itemName} price is wrong`,
        contextForItem(itemName),
    );

    assert.equal(result?.title, `${itemName} price`);
    assert.ok(result?.entityRefs.some((entity) => entity.kind === 'menu_item' && entity.id === 'item-1'));
    assert.equal(result?.beforeAfterSummary.rows?.find((row) => row.label === 'Current price')?.after, '250');
}

const substringResult = resolveDomainConversationCommand(
    'A customer says the price is different instead',
    contextForItem('Tea'),
);
assert.equal(substringResult?.title, 'Which item price should I check?');
assert.ok(!substringResult?.entityRefs.some((entity) => entity.kind === 'menu_item'));

const hiddenCategoryContext = contextForItem('Paneer Tikka', false);
const hiddenCategoryStatus = resolveDomainConversationCommand(
    'Why is Paneer Tikka not visible to customers?',
    hiddenCategoryContext,
);
assert.equal(
    hiddenCategoryStatus?.beforeAfterSummary.rows?.find((row) => row.label === 'Current state')?.after,
    'Hidden with its category',
);
assert.equal(hiddenCategoryStatus?.suggestedReplies?.[0]?.prompt, 'Show Main dishes category');

const hiddenCategoryPromotion = resolveDomainConversationCommand(
    'What should I promote today?',
    hiddenCategoryContext,
);
assert.equal(hiddenCategoryPromotion?.title, 'Pick a priced available item first');
assert.equal(
    hiddenCategoryPromotion?.beforeAfterSummary.rows?.find((row) => row.label === 'Promotion-ready items')?.after,
    'None found in loaded context',
);

const multilingualMutation = resolveAiMenuManagerCommand({
    text: 'पनीर टिक्का 300',
    tId: 'tenant-1',
    sId: 'store-1',
    projectId: 'project-1',
    context: contextForItem('पनीर टिक्का'),
    cardId: 'card-1',
    createdAt: '2026-07-29T00:00:00.000Z',
});
assert.equal(multilingualMutation.resolved?.actionType, 'item_price_update');
assert.equal(multilingualMutation.resolved?.patch?.updates?.price, '300');
assert.ok(multilingualMutation.resolved?.entityRefs.some((entity) => entity.kind === 'menu_item' && entity.id === 'item-1'));

console.log('AI Menu Manager domain-conversation tests passed.');
