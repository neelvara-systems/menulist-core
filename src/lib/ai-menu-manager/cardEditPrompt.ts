import type { AiMenuManagerCardPayload } from '@type/aiMenuManager';

function firstEntityLabel(card: AiMenuManagerCardPayload, kind: string) {
    return card.entityRefs.find((entity) => entity.kind === kind)?.label;
}

export function getAiMenuManagerCardEditPrompt(card: AiMenuManagerCardPayload) {
    const suggested = card.suggestedReplies?.[0]?.prompt;
    if (suggested) return suggested;

    const itemName = firstEntityLabel(card, 'menu_item');
    const categoryName = firstEntityLabel(card, 'category');
    const afterValue = card.beforeAfterSummary.afterValue;

    if (card.actionType === 'item_price_update' && itemName && afterValue) {
        return `${itemName} ${afterValue}`;
    }

    if (card.actionType === 'item_availability_update' && itemName && afterValue) {
        return `${itemName} ${afterValue.toLowerCase() === 'sold out' ? 'sold out' : 'available'}`;
    }

    if (card.actionType === 'item_visibility_update' && itemName && afterValue) {
        return `${afterValue.toLowerCase() === 'shown' ? 'Show' : 'Hide'} ${itemName}`;
    }

    if (card.actionType === 'category_visibility_update' && categoryName && afterValue) {
        return `${afterValue.toLowerCase() === 'shown' ? 'Show' : 'Hide'} category ${categoryName}`;
    }

    if (card.actionType === 'decision_blocks_update' && itemName) {
        return `Feature ${itemName}`;
    }

    if (card.actionType === 'menu_design_mood_update') {
        return 'Change menu tone';
    }

    if (card.actionType === 'menu_design_layout_update') {
        return 'Change menu layout';
    }

    if (card.actionType === 'menu_design_preset_apply') {
        return 'Change menu style';
    }

    if (card.actionType === 'menu_design_color_update') {
        return 'Change theme color';
    }

    if (card.actionType === 'menu_design_visibility_update') {
        return 'Change display options';
    }

    return card.message || card.title;
}
