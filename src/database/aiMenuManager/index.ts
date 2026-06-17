import type {
    AiMenuManagerCommandRequest,
    AiMenuManagerCommandResponse,
    AiMenuManagerExecutionDirective,
    AiMenuManagerInboxResponse,
    AiMenuManagerActionType,
} from '@type/aiMenuManager';

async function readApiResponse<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload?.message || payload?.error || 'Menu Manager request failed';
        const error = new Error(message) as Error & { status?: number; payload?: any };
        error.status = response.status;
        error.payload = payload;
        throw error;
    }
    return payload as T;
}

export function createAiMenuManagerIdempotencyKey(prefix = 'amm') {
    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${random}`;
}

export async function sendAiMenuManagerCommand(
    request: Omit<AiMenuManagerCommandRequest, 'idempotencyKey'> & { idempotencyKey?: string },
): Promise<AiMenuManagerCommandResponse> {
    const response = await fetch('/api/ai-menu-manager/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...request,
            idempotencyKey: request.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_cmd'),
        }),
    });
    return readApiResponse<AiMenuManagerCommandResponse>(response);
}

export async function getAiMenuManagerClientInbox(params: {
    storeId: string | number;
    projectId?: string;
    sessionId?: string;
    sessionDate?: string;
}): Promise<AiMenuManagerInboxResponse & { sessionId: string }> {
    const search = new URLSearchParams();
    search.set('storeId', String(params.storeId));
    if (params.projectId) search.set('projectId', params.projectId);
    if (params.sessionId) search.set('sessionId', params.sessionId);
    if (params.sessionDate) search.set('sessionDate', params.sessionDate);

    const response = await fetch(`/api/ai-menu-manager/inbox?${search.toString()}`, {
        method: 'GET',
    });
    return readApiResponse<AiMenuManagerInboxResponse & { sessionId: string }>(response);
}

export async function submitAiMenuManagerProposalAction(params: {
    proposalId: string;
    storeId: string | number;
    projectId?: string;
    actionType?: AiMenuManagerActionType;
    action: 'approve' | 'cancel' | 'reject' | 'mark_done';
    idempotencyKey?: string;
}): Promise<{ data: { directive?: AiMenuManagerExecutionDirective; proposal?: { proposalId: string; actionType: string; status: string }; status?: string } }> {
    const response = await fetch(`/api/ai-menu-manager/proposals/${encodeURIComponent(params.proposalId)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            storeId: params.storeId,
            projectId: params.projectId,
            actionType: params.actionType,
            action: params.action,
            idempotencyKey: params.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_action'),
        }),
    });
    return readApiResponse(response);
}

export async function completeAiMenuManagerClientProposal(params: {
    proposalId: string;
    storeId: string | number;
    projectId?: string;
    actionType?: AiMenuManagerActionType;
    executionId: string;
    patchHash: string;
    result: 'executed' | 'failed';
    message?: string;
    idempotencyKey?: string;
}) {
    const response = await fetch(`/api/ai-menu-manager/proposals/${encodeURIComponent(params.proposalId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            storeId: params.storeId,
            projectId: params.projectId,
            actionType: params.actionType,
            executionId: params.executionId,
            patchHash: params.patchHash,
            result: params.result,
            message: params.message,
            idempotencyKey: params.idempotencyKey || createAiMenuManagerIdempotencyKey('amm_complete'),
        }),
    });
    return readApiResponse(response);
}
