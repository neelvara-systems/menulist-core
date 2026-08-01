import { FEATURE_FLAGS } from '@config/features';
import type {
    AiMenuManagerActionType,
    AiMenuManagerCardPayload,
    AiMenuManagerCommandContextSelection,
} from '@type/aiMenuManager';
import type { AiMenuManagerContextPacket } from '../contextPacket';

export const AI_MENU_MANAGER_ROUTER_OUTCOMES = [
    'answer',
    'diagnostic',
    'recommendation',
    'clarification',
    'prepare_action',
    'local_export',
    'manual_handoff',
    'unsupported',
    'receipt_status',
] as const;

export type AiMenuManagerRouterOutcome = typeof AI_MENU_MANAGER_ROUTER_OUTCOMES[number];

export const AI_MENU_MANAGER_SAFE_MODEL_TOOLS = [
    'search_menu_items',
    'get_selected_menu_status',
    'get_item_detail',
    'get_category_detail',
    'prepare_price_update_card',
    'prepare_availability_update_card',
    'prepare_visibility_update_card',
    'prepare_bulk_price_update_card',
    'prepare_design_card',
    'prepare_local_export_card',
    'prepare_clarification_card',
    'prepare_unsupported_card',
] as const;

export type AiMenuManagerSafeModelTool = typeof AI_MENU_MANAGER_SAFE_MODEL_TOOLS[number];

export type AiMenuManagerModelProviderName = 'deterministic' | 'cloud_planner' | 'local_assist';

export interface AiMenuManagerModelRouteInput {
    allowedActions: AiMenuManagerActionType[];
    composerContext?: AiMenuManagerCommandContextSelection;
    context: AiMenuManagerContextPacket;
    ownerMessage: string;
    pendingCards?: AiMenuManagerCardPayload[];
}

export interface AiMenuManagerModelTarget {
    displayName?: string;
    entityId?: string;
    entityType: 'item' | 'category' | 'project' | 'design' | 'store' | 'surface';
}

export interface AiMenuManagerModelRouteResult {
    actionType?: AiMenuManagerActionType;
    clarification?: {
        options: Array<{
            entityId?: string;
            entityType?: 'item' | 'category';
            label: string;
            prompt?: string;
        }>;
        question: string;
    };
    outcome: AiMenuManagerRouterOutcome;
    ownerReply: string;
    provider: AiMenuManagerModelProviderName;
    safety: {
        mutatesTruth: boolean;
        reason: string;
        requiresApproval: boolean;
    };
    suggestedReplies?: Array<{
        helper?: string;
        label: string;
        prompt: string;
    }>;
    targets?: AiMenuManagerModelTarget[];
    toolName?: AiMenuManagerSafeModelTool;
    values?: Record<string, unknown>;
}

export function isAiMenuManagerModelProviderEnabled(provider: AiMenuManagerModelProviderName): boolean {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        return false;
    }

    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_MODEL_ROUTER) {
        return provider === 'deterministic';
    }

    if (provider === 'cloud_planner') {
        return FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER;
    }

    if (provider === 'local_assist') {
        return FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST;
    }

    return true;
}

export function assertAiMenuManagerModelRouteIsSafe(result: AiMenuManagerModelRouteResult): void {
    const isPreparedAction = result.outcome === 'prepare_action';
    if (result.safety.mutatesTruth !== isPreparedAction) {
        throw new Error('Model route mutation state must match prepared-action outcome');
    }

    if (result.safety.requiresApproval !== isPreparedAction) {
        throw new Error('Model route approval state must match prepared-action outcome');
    }

    if (Boolean(result.actionType) !== isPreparedAction) {
        throw new Error('Model route action type must match prepared-action outcome');
    }

    if (result.toolName && !AI_MENU_MANAGER_SAFE_MODEL_TOOLS.includes(result.toolName)) {
        throw new Error('Model route selected an unsupported tool');
    }
}
