import { FEATURE_FLAGS } from '@config/features';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';

export const MENULIST_BRANDING_REMOVAL_PLAN_TYPE = MENULIST_B2C_PLAN_IDS.MULTI_LOCATION;

export type MenuListBrandingInput = {
    activePlanType?: unknown;
};

export type MenuListAttributionPolicy = {
    activePlanType: string | null;
    showAttribution: boolean;
    hiddenReason: 'multi_location_plan' | null;
};

export function normalizeMenuListPlanType(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 160) return null;
    const normalized = value.trim().toLowerCase();
    return normalized || null;
}

export function canRemoveMenuListBranding(input: MenuListBrandingInput = {}): boolean {
    return (
        FEATURE_FLAGS.ENABLE_MULTI_LOCATION_MENULIST_BRANDING_REMOVAL === true
        && normalizeMenuListPlanType(input.activePlanType) === MENULIST_BRANDING_REMOVAL_PLAN_TYPE
    );
}

export function resolveMenuListAttributionPolicy(input: MenuListBrandingInput = {}): MenuListAttributionPolicy {
    const activePlanType = normalizeMenuListPlanType(input.activePlanType);
    const hidden = canRemoveMenuListBranding({ activePlanType });

    return {
        activePlanType,
        hiddenReason: hidden ? 'multi_location_plan' : null,
        showAttribution: !hidden,
    };
}
