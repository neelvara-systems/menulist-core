import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { getResellerPlanByPlanId } from '@config/resellerPricing';
import { B2BplansList, B2CplansList, aiEnhancementPacksList, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import { getCanonicaPlanById, getCanonicaPlans, type CanonicaPlan } from '@data/canonica/plans';
import type { AIEnhancementPack, Plan, PlanType } from '@data/common';

export const CANONICA_CREDIT_PACKS_LIST: AIEnhancementPack[] = [
    {
        packId: 'canonica_support_credits',
        name: 'Support Credit Pack',
        description: 'Extra Canonica answer, chat, and governance credits. One-time purchase. No expiry.',
        creditAmount: 500,
        priceINR: { price: 249900, monthlyCredits: null },
        priceUSD: { price: 3000, monthlyCredits: null },
    },
];

export const CANONICA_PLAN_TIER_ORDER: Record<string, number> = {
    canonica_beta: 0,
    canonica_starter: 1,
    canonica_growth: 2,
    canonica_studio: 3,
};

export const normalizeBillingProductId = (value: unknown): ProductId => {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === PRODUCT_IDS.CANONICA ? PRODUCT_IDS.CANONICA : PRODUCT_IDS.MENULIST;
};

export const isCanonicaBillingProduct = (productId: unknown): boolean => (
    normalizeBillingProductId(productId) === PRODUCT_IDS.CANONICA
);

export const canonicaPlanToBillingPlan = (plan: CanonicaPlan): Plan => ({
    planId: plan.planId,
    type: 'B2B',
    name: plan.name,
    description: plan.description,
    isRecommended: plan.isRecommended,
    priceINR: plan.priceINR,
    priceUSD: plan.priceUSD,
    billingInterval: plan.billingInterval,
    featuresList: {
        entities: plan.limits.maxEntities,
        canonicalAnswers: plan.limits.maxCanonicalAnswers,
        kbArticles: plan.limits.maxKBArticles,
        signalEvents: plan.limits.maxSignalEventsPerMonth,
        workspaces: plan.limits.maxWorkspaces || 1,
        widgetIncluded: plan.limits.widgetIncluded,
        apiAccessIncluded: plan.limits.apiAccessIncluded,
    },
});

export const getBillingPlansForProduct = (
    productId: unknown,
    userType: PlanType | 'B2B' | 'B2C' = 'B2C',
): Plan[] => {
    if (isCanonicaBillingProduct(productId)) {
        return getCanonicaPlans()
            .filter((plan) => plan.priceINR.price > 0 || plan.priceUSD.price > 0)
            .map(canonicaPlanToBillingPlan);
    }

    return userType === 'B2B' ? getB2BPlansList() : getB2CPlansList();
};

export const getCreditPacksForProduct = (productId: unknown): AIEnhancementPack[] => (
    isCanonicaBillingProduct(productId) ? CANONICA_CREDIT_PACKS_LIST : aiEnhancementPacksList
);

export const getBillingPlanDetailsFromNotes = (notes: any): any => {
    if (!notes?.planId || !notes?.interval) return null;

    if (isCanonicaBillingProduct(notes.productId || notes.pId)) {
        return getCanonicaPlanById(notes.planId, notes.interval) || null;
    }

    if (String(notes.planId).startsWith('reseller_')) {
        return getResellerPlanByPlanId(notes.planId, notes.interval);
    }

    if (!notes.userType) return null;
    const planList = notes.userType === 'B2C' ? B2CplansList : B2BplansList;
    return planList.find((p) => p.planId === notes.planId && p.billingInterval === notes.interval) || null;
};
