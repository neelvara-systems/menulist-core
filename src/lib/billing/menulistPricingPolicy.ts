import type { Plan, PlanType } from '@data/common';
import { MAX_SUBSCRIPTION_QUANTITY } from './paymentCheckoutBoundary';

export const MENULIST_MULTI_LOCATION_PLAN_ID = 'premium';
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
    if (input.userType !== 'B2C') return true;
    if (input.planId === MENULIST_MULTI_LOCATION_PLAN_ID) {
        return input.quantity >= MENULIST_MULTI_LOCATION_MINIMUM_QUANTITY;
    }
    return input.quantity === 1;
};
