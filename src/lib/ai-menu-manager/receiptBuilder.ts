import type { AiMenuManagerActionType, AiMenuManagerReceipt } from '@type/aiMenuManager';
import { AI_MENU_MANAGER_ACTION_TYPES } from './actionTypes';
import { normalizeAiMenuManagerProjectId } from './routeIds';

const ACTION_TYPES = new Set<string>(Object.values(AI_MENU_MANAGER_ACTION_TYPES));

function requireBoundedIdentifier(value: unknown, label: string, maxLength: number) {
    if (typeof value !== 'string' || value !== value.trim() || !value || value.length > maxLength) {
        throw new Error(`Invalid ${label}`);
    }
    return value;
}

function boundedText(value: unknown, maxLength: number, fallback: string) {
    if (typeof value !== 'string') return fallback;
    const text = value.trim();
    return text ? text.slice(0, maxLength) : fallback;
}

function normalizeExecutedAt(value: unknown) {
    if (typeof value !== 'string') return new Date().toISOString();
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
        ? value
        : new Date().toISOString();
}

export function buildAiMenuManagerReceipt(params: {
    proposalId: string;
    actionType: AiMenuManagerActionType;
    projectId?: string;
    status: AiMenuManagerReceipt['status'];
    title: string;
    message: string;
    undoAvailable?: boolean;
    executedAt?: string;
}): AiMenuManagerReceipt {
    const proposalId = requireBoundedIdentifier(params.proposalId, 'proposal ID', 200);
    if (!ACTION_TYPES.has(params.actionType)) throw new Error('Invalid action type');
    const projectId = params.projectId === undefined
        ? undefined
        : normalizeAiMenuManagerProjectId(params.projectId);
    if (params.projectId !== undefined && !projectId) throw new Error('Invalid project ID');
    const executedAt = normalizeExecutedAt(params.executedAt);
    const title = boundedText(params.title, 160, 'Menu Manager update');
    const message = boundedText(params.message, 500, 'Update recorded.');

    return {
        receiptId: `${proposalId}:${params.status}:${Date.parse(executedAt)}`,
        proposalId,
        actionType: params.actionType,
        status: params.status,
        title,
        message,
        ...(projectId ? { projectId } : {}),
        executedAt,
        undoAvailable: params.undoAvailable === true,
    };
}
