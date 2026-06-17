import type { AiMenuManagerActionType, AiMenuManagerReceipt } from '@type/aiMenuManager';

export function buildAiMenuManagerReceipt(params: {
    proposalId: string;
    actionType: AiMenuManagerActionType;
    projectId?: string;
    status: 'executed' | 'failed' | 'manual_task';
    title: string;
    message: string;
    undoAvailable?: boolean;
    executedAt?: string;
}): AiMenuManagerReceipt {
    const executedAt = params.executedAt || new Date().toISOString();

    return {
        receiptId: `${params.proposalId}:${params.status}:${Date.parse(executedAt) || Date.now()}`,
        proposalId: params.proposalId,
        actionType: params.actionType,
        status: params.status,
        title: params.title,
        message: params.message,
        projectId: params.projectId,
        executedAt,
        undoAvailable: params.undoAvailable === true,
    };
}
