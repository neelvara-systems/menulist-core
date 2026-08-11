import type {
    OwnerActionResult,
    OwnerActionSuggestion,
    OwnerConfidence,
} from '@template/main-app/projects/types';
import type { DashboardTranslator } from './ownerDashboardPresentation';
import { isEnglishDashboardLocale } from './ownerDashboardPresentation';

type OwnerActionGroup =
    | 'availability'
    | 'customerActions'
    | 'details'
    | 'general'
    | 'menuOrder'
    | 'pricing'
    | 'search'
    | 'source'
    | 'timing';

const ACTION_GROUPS: Record<string, OwnerActionGroup> = {
    unavailable_demand: 'availability',
    hidden_demand: 'availability',
    bestseller_validation: 'menuOrder',
    category_reorder: 'menuOrder',
    menu_reorder: 'menuOrder',
    variant_clarity: 'details',
    image_gap: 'details',
    metadata_demand: 'details',
    timed_category: 'timing',
    daypart: 'timing',
    price_signal: 'pricing',
    search_fix: 'search',
    demand_gap: 'search',
    closed_hours_actions: 'customerActions',
    action_leakage: 'customerActions',
    source_quality: 'source',
    confidence: 'general',
};

export interface OwnerActionDisplay {
    actionLabel: string;
    description: string;
    metricLabel?: string;
    reason: string;
    title: string;
}

export function getOwnerConfidenceDisplay(
    confidence: OwnerConfidence,
    locale: string,
    t: DashboardTranslator,
): Pick<OwnerConfidence, 'label' | 'message'> {
    if (isEnglishDashboardLocale(locale)) {
        return { label: confidence.label, message: confidence.message };
    }
    return {
        label: t(`actionPlan.confidence.${confidence.status}.label`),
        message: t(`actionPlan.confidence.${confidence.status}.message`),
    };
}

export function getOwnerActionDisplay(
    action: OwnerActionSuggestion,
    locale: string,
    t: DashboardTranslator,
): OwnerActionDisplay {
    if (isEnglishDashboardLocale(locale)) {
        return {
            actionLabel: action.actionLabel,
            description: action.description,
            metricLabel: action.metricLabel,
            reason: action.reason,
            title: action.title,
        };
    }

    const group = ACTION_GROUPS[action.type] || 'general';
    return {
        actionLabel: t(`actionPlan.localizedActions.${group}.action`),
        description: t(`actionPlan.localizedActions.${group}.description`),
        reason: t('actionPlan.localizedActions.reason'),
        title: t(`actionPlan.localizedActions.${group}.title`),
    };
}

export function getOwnerActionResultDisplay(
    result: OwnerActionResult,
    locale: string,
    t: DashboardTranslator,
): Pick<OwnerActionResult, 'label' | 'message'> {
    if (isEnglishDashboardLocale(locale)) {
        return { label: result.label, message: result.message };
    }
    return {
        label: t(`actionPlan.results.${result.status}.label`),
        message: t(`actionPlan.results.${result.status}.message`),
    };
}

export function getOwnerActionPriorityLabel(
    priority: OwnerActionSuggestion['priority'],
    t: DashboardTranslator,
): string {
    return t(`actionPlan.priorities.${priority}`);
}
