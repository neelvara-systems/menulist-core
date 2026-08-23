export const MENULIST_B2C_PLAN_IDS = {
    OFFICIAL: 'menulist_official',
    PRO: 'menulist_pro',
    MULTI_LOCATION: 'menulist_multi_location',
} as const;

export const MENULIST_B2B_PLAN_IDS = {
    STARTER_API: 'menulist_api_starter',
    PRO_API: 'menulist_api_pro',
} as const;

export type MenuListB2CPlanId = typeof MENULIST_B2C_PLAN_IDS[keyof typeof MENULIST_B2C_PLAN_IDS];
export type MenuListB2BPlanId = typeof MENULIST_B2B_PLAN_IDS[keyof typeof MENULIST_B2B_PLAN_IDS];

export const MENULIST_B2C_PLAN_ID_LIST = Object.values(MENULIST_B2C_PLAN_IDS);
export const MENULIST_B2B_PLAN_ID_LIST = Object.values(MENULIST_B2B_PLAN_IDS);

export const isMenuListB2CPlanId = (value: unknown): value is MenuListB2CPlanId => (
    typeof value === 'string'
    && MENULIST_B2C_PLAN_ID_LIST.some((planId) => planId === value)
);

export const isMenuListB2BPlanId = (value: unknown): value is MenuListB2BPlanId => (
    typeof value === 'string'
    && MENULIST_B2B_PLAN_ID_LIST.some((planId) => planId === value)
);
