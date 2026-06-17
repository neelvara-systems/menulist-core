import { FEATURE_FLAGS } from '@config/features';
import type { AiMenuManagerActionDefinition, AiMenuManagerActionType } from '@type/aiMenuManager';
import {
    AI_MENU_MANAGER_ACTION_DEFINITION_BY_TYPE,
    AI_MENU_MANAGER_ACTION_DEFINITIONS,
    AI_MENU_MANAGER_EXECUTABLE_ACTIONS,
} from './actionTypes';

export function getAiMenuManagerActionDefinition(actionType: AiMenuManagerActionType): AiMenuManagerActionDefinition {
    return AI_MENU_MANAGER_ACTION_DEFINITION_BY_TYPE[actionType];
}

export function listAiMenuManagerActionDefinitions() {
    return AI_MENU_MANAGER_ACTION_DEFINITIONS;
}

export function listAiMenuManagerExecutableActions() {
    return AI_MENU_MANAGER_EXECUTABLE_ACTIONS;
}

export function isAiMenuManagerActionEnabled(action: AiMenuManagerActionDefinition | AiMenuManagerActionType) {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) return false;
    const definition = typeof action === 'string' ? getAiMenuManagerActionDefinition(action) : action;
    if (!definition) return false;
    const flags = FEATURE_FLAGS as Record<string, unknown>;
    return (definition.requiredFlags || []).every((flag) => flags[flag] === true);
}
