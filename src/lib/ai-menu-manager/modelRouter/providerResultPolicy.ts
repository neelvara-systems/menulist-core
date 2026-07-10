import type { AiMenuManagerRouterOutcome } from './routerOutcomeSchema';

export const AI_MENU_MANAGER_CLOUD_PLANNER_OUTCOMES = [
    'answer',
    'diagnostic',
    'recommendation',
    'clarification',
    'prepare_action',
    'unsupported',
] as const satisfies readonly AiMenuManagerRouterOutcome[];

const CLOUD_PLANNER_OUTCOMES: ReadonlySet<AiMenuManagerRouterOutcome> = new Set<AiMenuManagerRouterOutcome>(AI_MENU_MANAGER_CLOUD_PLANNER_OUTCOMES);

const INTERNAL_COPY_PATTERN = /(?:patch[\s_]+hash|execution[\s_]+directive|context[\s_]+packet|confidence[\s_]+score|token[\s_]+count|large\s+language\s+model|\bgemini\b|\bgemma\b|\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b)/i;
const UNVERIFIED_COMPLETION_PATTERN = /(?:^\s*(?:done|completed|updated|published|posted|saved|deleted)\b|\b(?:i|menu manager|menulist)\s+(?:have\s+|has\s+)?(?:updated|changed|published|posted|saved|deleted|completed)\b|\b(?:has been|is now)\s+(?:updated|published|posted|saved|deleted)\b)/i;

export function isAiMenuManagerCloudPlannerOutcomeAllowed(outcome: AiMenuManagerRouterOutcome) {
    return CLOUD_PLANNER_OUTCOMES.has(outcome);
}

export function isAiMenuManagerCloudOwnerCopySafe(value: string) {
    const normalized = value.trim();
    return Boolean(normalized)
        && !INTERNAL_COPY_PATTERN.test(normalized)
        && !UNVERIFIED_COMPLETION_PATTERN.test(normalized);
}

export function resolveAiMenuManagerClarificationEntityType(params: {
    categoryIds: Set<string>;
    entityId?: string;
    itemIds: Set<string>;
}): 'item' | 'category' | undefined | null {
    if (!params.entityId) return undefined;
    const entityId = String(params.entityId);
    if (params.itemIds.has(entityId)) return 'item';
    if (params.categoryIds.has(entityId)) return 'category';
    return null;
}
