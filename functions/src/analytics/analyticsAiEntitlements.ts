import { ANALYTICS_FEATURE_FLAGS } from './featureFlags';

export type AnalyticsAiEntitlementReason =
    | 'eligible'
    | 'feature_flag_disabled'
    | 'missing_plan'
    | 'plan_not_eligible';

export interface AnalyticsAiEntitlement {
    enabled: boolean;
    activePlanType?: string | null;
    requiredPlanType: typeof ANALYTICS_AI_REQUIRED_PLAN_TYPE;
    reason: AnalyticsAiEntitlementReason;
}

export const ANALYTICS_AI_REQUIRED_PLAN_TYPE = 'menulist_pro' as const;

const ANALYTICS_AI_PLAN_TYPES = new Set([
    ANALYTICS_AI_REQUIRED_PLAN_TYPE,
    'menulist_multi_location',
]);

function normalizePlanType(value: unknown): string | null {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized || null;
}

export function resolveAnalyticsAiEntitlement(storeSummary?: Record<string, unknown> | null): AnalyticsAiEntitlement {
    const activePlanType = normalizePlanType(storeSummary?.activePlanType);

    if (!ANALYTICS_FEATURE_FLAGS.ENABLE_OWNER_ANALYTICS_AI_SUMMARIES) {
        return {
            enabled: false,
            activePlanType,
            requiredPlanType: ANALYTICS_AI_REQUIRED_PLAN_TYPE,
            reason: 'feature_flag_disabled',
        };
    }

    if (!activePlanType) {
        return {
            enabled: false,
            activePlanType: null,
            requiredPlanType: ANALYTICS_AI_REQUIRED_PLAN_TYPE,
            reason: 'missing_plan',
        };
    }

    if (!ANALYTICS_AI_PLAN_TYPES.has(activePlanType)) {
        return {
            enabled: false,
            activePlanType,
            requiredPlanType: ANALYTICS_AI_REQUIRED_PLAN_TYPE,
            reason: 'plan_not_eligible',
        };
    }

    return {
        enabled: true,
        activePlanType,
        requiredPlanType: ANALYTICS_AI_REQUIRED_PLAN_TYPE,
        reason: 'eligible',
    };
}
