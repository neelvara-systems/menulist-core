import type { AiMenuManagerActionDefinition, AiMenuManagerApprovalPolicy } from '@type/aiMenuManager';

export function buildApprovalPolicy(definition: AiMenuManagerActionDefinition): AiMenuManagerApprovalPolicy {
    return {
        level: definition.approvalLevel,
        requiresApproval: definition.approvalLevel !== 'none',
        reason: getApprovalReason(definition),
    };
}

function getApprovalReason(definition: AiMenuManagerActionDefinition) {
    switch (definition.approvalLevel) {
        case 'high_confirm':
            return definition.actionType === 'item_price_update'
                ? 'Price changes affect customers and must show old price, new price, and menu scope.'
                : 'This changes public menu truth and needs approval.';
        case 'bulk_confirm':
            return 'This changes more than one menu entry and needs approval.';
        case 'destructive_confirm':
            return 'This can remove or disable content and needs approval.';
        case 'external_confirm':
            return 'This involves external or public handoff work and needs approval.';
        case 'confirm':
            return 'Review the prepared change before it applies.';
        case 'none':
        default:
            return 'No approval is needed for this card.';
    }
}
