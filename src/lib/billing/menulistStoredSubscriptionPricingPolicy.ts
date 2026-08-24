import {
    getResellerPlanByPlanId,
    resolveResellerMonthlyCreditsByPlanId,
} from '@config/resellerPricing';
import type { PlanType } from '@data/common';
import { resolveMenuListMonthlyCreditAllowance } from '@data/shared/contentCreditPolicy';
import { isValidMenuListPlanQuantity } from './menulistPricingPolicy';
import { MAX_SUBSCRIPTION_QUANTITY } from './paymentCheckoutBoundary';

type StoredMenuListSubscriptionPricing = {
    fallbackAllowance?: number | null;
    onboardingSource?: string | null;
    planId: string;
    quantity: number;
    resellerId?: string | null;
    userType: PlanType;
};

export const isValidMenuListStoredSubscriptionQuantity = (
    input: StoredMenuListSubscriptionPricing,
): boolean => {
    if (input.onboardingSource !== 'RESELLER_ONBOARDING') {
        return isValidMenuListPlanQuantity(input);
    }
    return input.userType === 'B2C'
        && typeof input.resellerId === 'string'
        && input.resellerId.trim().length > 0
        && Number.isSafeInteger(input.quantity)
        && input.quantity >= 1
        && input.quantity <= MAX_SUBSCRIPTION_QUANTITY
        && getResellerPlanByPlanId(input.planId, 'MONTH') !== null;
};

export const resolveMenuListStoredSubscriptionMonthlyCreditAllowance = (
    input: StoredMenuListSubscriptionPricing,
): number => {
    if (!isValidMenuListStoredSubscriptionQuantity(input)) {
        throw new Error('MenuList subscription quantity conflicts with its billing origin.');
    }
    if (input.onboardingSource === 'RESELLER_ONBOARDING') {
        const allowance = resolveResellerMonthlyCreditsByPlanId(input.planId, input.quantity);
        if (allowance === null) throw new Error('Reseller subscription plan is unavailable.');
        return allowance;
    }
    return resolveMenuListMonthlyCreditAllowance({
        fallbackAllowance: input.fallbackAllowance,
        planId: input.planId,
        quantity: input.quantity,
    });
};

export const resolveMenuListStoredSubscriptionQuantityCreditUpdate = (
    input: StoredMenuListSubscriptionPricing & {
        currentMonthlyCredits?: unknown;
        currentMonthlyCreditsAllowance?: unknown;
    },
): { monthlyCredits: number; monthlyCreditsAllowance: number } => {
    const currentAllowance = Number.isSafeInteger(input.currentMonthlyCreditsAllowance)
        && Number(input.currentMonthlyCreditsAllowance) >= 0
        ? Number(input.currentMonthlyCreditsAllowance)
        : 0;
    const currentCredits = Number.isSafeInteger(input.currentMonthlyCredits)
        && Number(input.currentMonthlyCredits) >= 0
        ? Math.min(currentAllowance, Number(input.currentMonthlyCredits))
        : 0;
    const monthlyCreditsAllowance = resolveMenuListStoredSubscriptionMonthlyCreditAllowance(input);
    const creditsUsedInCurrentCycle = Math.max(0, currentAllowance - currentCredits);
    return {
        monthlyCreditsAllowance,
        monthlyCredits: Math.max(0, monthlyCreditsAllowance - creditsUsedInCurrentCycle),
    };
};
