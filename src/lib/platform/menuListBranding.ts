import { FEATURE_FLAGS } from '@config/features';

export const MENULIST_BRANDING_REMOVAL_PLAN_TYPE = 'premium';

export type MenuListBrandingInput = {
    activePlanType?: unknown;
};

export type MenuListAttributionPolicy = {
    activePlanType: string | null;
    showAttribution: boolean;
    hiddenReason: 'premium_plan' | null;
};

export function normalizeMenuListPlanType(value: unknown): string | null {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return normalized || null;
}

export function canRemoveMenuListBranding(input: MenuListBrandingInput = {}): boolean {
    return (
        FEATURE_FLAGS.ENABLE_PREMIUM_MENULIST_BRANDING_REMOVAL === true
        && normalizeMenuListPlanType(input.activePlanType) === MENULIST_BRANDING_REMOVAL_PLAN_TYPE
    );
}

export function resolveMenuListAttributionPolicy(input: MenuListBrandingInput = {}): MenuListAttributionPolicy {
    const activePlanType = normalizeMenuListPlanType(input.activePlanType);
    const hidden = canRemoveMenuListBranding({ activePlanType });

    return {
        activePlanType,
        hiddenReason: hidden ? 'premium_plan' : null,
        showAttribution: !hidden,
    };
}
