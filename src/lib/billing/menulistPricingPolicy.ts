import type { Plan, PlanType } from '@data/common';
import {
    isMenuListB2BPlanId,
    isMenuListB2CPlanId,
    MENULIST_B2C_PLAN_IDS,
} from '@constant/menulistPlans';
import { MAX_SUBSCRIPTION_QUANTITY } from './paymentCheckoutBoundary';

export const MENULIST_MULTI_LOCATION_PLAN_ID = MENULIST_B2C_PLAN_IDS.MULTI_LOCATION;
export const MENULIST_MULTI_LOCATION_MINIMUM_QUANTITY = 2;

export const getMenuListPlanMinimumQuantity = (
    plan: Pick<Plan, 'minimumQuantity' | 'planId' | 'type'>,
): number => {
    if (plan.type !== 'B2C') return 1;
    if (plan.planId === MENULIST_MULTI_LOCATION_PLAN_ID) {
        return MENULIST_MULTI_LOCATION_MINIMUM_QUANTITY;
    }
    return plan.minimumQuantity ?? 1;
};

export const getMenuListPlanCheckoutQuantity = (
    plan: Pick<Plan, 'minimumQuantity' | 'planId' | 'type'>,
): number => getMenuListPlanMinimumQuantity(plan);

export const isValidMenuListPlanQuantity = (input: {
    planId: string;
    quantity: number;
    userType: PlanType;
}): boolean => {
    if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_SUBSCRIPTION_QUANTITY) {
        return false;
    }
    if (input.userType === 'B2B') {
        return isMenuListB2BPlanId(input.planId) && input.quantity === 1;
    }
    if (!isMenuListB2CPlanId(input.planId)) return false;
    if (input.planId === MENULIST_MULTI_LOCATION_PLAN_ID) {
        return input.quantity >= MENULIST_MULTI_LOCATION_MINIMUM_QUANTITY;
    }
    return input.quantity === 1;
};
