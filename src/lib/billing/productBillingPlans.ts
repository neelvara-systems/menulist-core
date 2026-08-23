import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { getResellerPlanByPlanId } from '@config/resellerPricing';
import { B2BplansList, B2CplansList, aiEnhancementPacksList, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import { getAnswerlatticePlanById, getAnswerlatticePlans, type AnswerlatticePlan } from '@data/answerlattice/plans';
import type { AIEnhancementPack, Plan, PlanType } from '@data/common';

export const ANSWERLATTICE_CREDIT_PACKS_LIST: AIEnhancementPack[] = [
    {
        packId: 'answerlattice_support_credits',
        name: 'Support Credit Pack',
        description: 'Extra Answerlattice credits for provider fallback answers, full-runtime answer tests, starter-answer generation, screenshot OCR, and short recording transcription. One-time purchase. No expiry.',
        creditAmount: 500,
        priceINR: { price: 199900, monthlyCredits: null },
        priceUSD: { price: 3900, monthlyCredits: null },
    },
    {
        packId: 'answerlattice_support_credits_2000',
        name: 'Support Credit Pack 2000',
        description: 'Extra Answerlattice credits for larger provider-backed intake, testing, OCR, transcription, and governed support workloads. One-time purchase. No expiry.',
        creditAmount: 2000,
        priceINR: { price: 599900, monthlyCredits: null },
        priceUSD: { price: 11900, monthlyCredits: null },
    },
];

export const ANSWERLATTICE_PLAN_TIER_ORDER: Record<string, number> = {
    answerlattice_launch: 1,
    answerlattice_growth: 2,
    answerlattice_studio: 3,
};

export const normalizeBillingProductId = (value: unknown): ProductId => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === PRODUCT_IDS.ANSWERLATTICE) return PRODUCT_IDS.ANSWERLATTICE;
    if (normalized === PRODUCT_IDS.CAMPAIGNCUE) return PRODUCT_IDS.CAMPAIGNCUE;
    if (normalized === PRODUCT_IDS.MYCODEX) return PRODUCT_IDS.MYCODEX;
    return PRODUCT_IDS.MENULIST;
};

const normalizeExplicitBillingProductId = (value: unknown): ProductId | null => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === PRODUCT_IDS.MENULIST) return PRODUCT_IDS.MENULIST;
    if (normalized === PRODUCT_IDS.ANSWERLATTICE) return PRODUCT_IDS.ANSWERLATTICE;
    if (normalized === PRODUCT_IDS.CAMPAIGNCUE) return PRODUCT_IDS.CAMPAIGNCUE;
    return null;
};

/**
 * Provider notes are the product authority after a Razorpay object exists.
 * Missing notes are accepted only for legacy MenuList objects; a request may
 * never redirect a provider object into another product's Firestore project.
 */
export const resolveProviderBillingProductId = (
    requestProductId: unknown,
    providerProductId: unknown,
): ProductId | null => {
    const requested = requestProductId == null || requestProductId === ''
        ? PRODUCT_IDS.MENULIST
        : normalizeExplicitBillingProductId(requestProductId);
    if (!requested) return null;

    if (providerProductId == null || providerProductId === '') {
        return requested === PRODUCT_IDS.MENULIST ? PRODUCT_IDS.MENULIST : null;
    }
    const provider = normalizeExplicitBillingProductId(providerProductId);
    return provider && provider === requested ? provider : null;
};

export const isAnswerlatticeBillingProduct = (productId: unknown): boolean => (
    normalizeBillingProductId(productId) === PRODUCT_IDS.ANSWERLATTICE
);

export const isCampaignCueBillingProduct = (productId: unknown): boolean => (
    normalizeBillingProductId(productId) === PRODUCT_IDS.CAMPAIGNCUE
);

export const isMyCodexBillingProduct = (productId: unknown): boolean => (
    normalizeBillingProductId(productId) === PRODUCT_IDS.MYCODEX
);

export const isProductBillingDisabled = (productId: unknown): boolean => {
    const normalized = normalizeBillingProductId(productId);
    return normalized === PRODUCT_IDS.CAMPAIGNCUE
        || normalized === PRODUCT_IDS.MYCODEX;
};

export const answerlatticePlanToBillingPlan = (plan: AnswerlatticePlan): Plan => ({
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
    if (isProductBillingDisabled(productId)) {
        return [];
    }

    if (isAnswerlatticeBillingProduct(productId)) {
        return getAnswerlatticePlans()
            .filter((plan) => plan.priceINR.price > 0 || plan.priceUSD.price > 0)
            .map(answerlatticePlanToBillingPlan);
    }

    return userType === 'B2B' ? getB2BPlansList() : getB2CPlansList();
};

export const getCreditPacksForProduct = (productId: unknown): AIEnhancementPack[] => {
    if (isProductBillingDisabled(productId)) return [];
    return isAnswerlatticeBillingProduct(productId) ? ANSWERLATTICE_CREDIT_PACKS_LIST : aiEnhancementPacksList;
};

export const getBillingPlanDetailsFromNotes = (notes: any): any => {
    if (!notes?.planId || !notes?.interval) return null;

    if (isProductBillingDisabled(notes.productId || notes.pId)) {
        return null;
    }

    if (isAnswerlatticeBillingProduct(notes.productId || notes.pId)) {
        return getAnswerlatticePlanById(notes.planId, notes.interval) || null;
    }

    if (String(notes.planId).startsWith('reseller_')) {
        return getResellerPlanByPlanId(notes.planId, notes.interval);
    }

    if (!notes.userType) return null;
    const planList = notes.userType === 'B2C' ? B2CplansList : B2BplansList;
    return planList.find((p) => p.planId === notes.planId && p.billingInterval === notes.interval) || null;
};
