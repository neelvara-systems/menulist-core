import type { Currency, Plan, PurchaseIntent } from '@data/common';
import { getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import {
    getMenuListPlanCheckoutQuantity,
    isValidMenuListPlanQuantity,
} from '@lib/billing/menulistPricingPolicy';
import { OnboardingSubscriptionSchema } from '@lib/validation/apiSchemas';

export const PURCHASE_INTENT_STORAGE_KEY = 'purchaseIntent';
export const PURCHASE_INTENT_STORAGE_VERSION = 3;
export const PURCHASE_INTENT_MAX_AGE_MS = 2 * 60 * 60 * 1_000;
export const PRICING_PLAN_HANDOFF_PATH = '/pricing';

export type PricingPlanHandoff = {
    currency: Currency;
    plan: Plan;
    quantity: number;
};

type StoredPurchaseIntentEnvelope = {
    createdAt: number;
    intent: unknown;
    version: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeOptionalString = (value: unknown): unknown => (
    typeof value === 'string' && value.trim() === '' ? undefined : value
);

export const buildPricingPlanHandoffPath = (
    plan: Plan,
    currency: Currency,
    quantity = getMenuListPlanCheckoutQuantity(plan),
): string | null => {
    if (!isValidMenuListPlanQuantity({ planId: plan.planId, quantity, userType: plan.type })) return null;
    if (currency !== 'INR' && currency !== 'USD') return null;

    const canonicalPlan = (plan.type === 'B2B' ? getB2BPlansList() : getB2CPlansList()).find((candidate) => (
        candidate.planId === plan.planId
        && candidate.billingInterval === plan.billingInterval
        && candidate.type === plan.type
    ));
    if (!canonicalPlan) return null;

    const params = new URLSearchParams({
        checkoutCurrency: currency,
        checkoutInterval: canonicalPlan.billingInterval,
        checkoutPlan: canonicalPlan.planId,
        checkoutQuantity: String(quantity),
        checkoutType: canonicalPlan.type,
    });
    return `${PRICING_PLAN_HANDOFF_PATH}?${params.toString()}`;
};

export const parsePricingPlanHandoff = (rawSearch: unknown): PricingPlanHandoff | null => {
    if (typeof rawSearch !== 'string' || rawSearch.length === 0 || rawSearch.length > 2_048) return null;
    const params = new URLSearchParams(rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch);
    const currency = params.get('checkoutCurrency');
    const interval = params.get('checkoutInterval');
    const planId = params.get('checkoutPlan');
    const userType = params.get('checkoutType');
    const rawQuantity = params.get('checkoutQuantity');
    if ((currency !== 'INR' && currency !== 'USD') || (userType !== 'B2B' && userType !== 'B2C')) return null;
    if (!rawQuantity || !/^[1-9]\d*$/.test(rawQuantity)) return null;
    const quantity = Number(rawQuantity);
    if (!Number.isSafeInteger(quantity)) return null;

    const plan = (userType === 'B2B' ? getB2BPlansList() : getB2CPlansList()).find((candidate) => (
        candidate.planId === planId
        && candidate.billingInterval === interval
        && candidate.type === userType
    ));
    if (!plan || !isValidMenuListPlanQuantity({ planId: plan.planId, quantity, userType: plan.type })) return null;

    return { currency, plan, quantity };
};

export const normalizePurchaseIntent = (value: unknown): PurchaseIntent | null => {
    if (!isRecord(value) || !isRecord(value.plan)) return null;

    const parsed = OnboardingSubscriptionSchema.safeParse({
        businessName: value.businessName,
        businessIndustry: value.businessIndustry,
        businessDayEndTime: normalizeOptionalString(value.businessDayEndTime),
        billingProfile: value.billingProfile,
        currency: value.currency,
        interval: value.plan.billingInterval,
        planId: value.plan.planId,
        quantity: value.quantity,
        selfReportedDiscoveryChannel: normalizeOptionalString(value.selfReportedDiscoveryChannel),
        timeZone: normalizeOptionalString(value.timeZone),
        userType: value.plan.type,
    });
    if (!parsed.success) return null;

    const plans = parsed.data.userType === 'B2B' ? getB2BPlansList() : getB2CPlansList();
    const plan = plans.find((candidate) => (
        candidate.planId === parsed.data.planId
        && candidate.billingInterval === parsed.data.interval
        && candidate.type === parsed.data.userType
    ));
    if (!plan) return null;
    if (!isValidMenuListPlanQuantity({
        planId: parsed.data.planId,
        quantity: parsed.data.quantity,
        userType: parsed.data.userType,
    })) return null;

    return {
        businessName: parsed.data.businessName,
        businessIndustry: parsed.data.businessIndustry,
        businessDayEndTime: parsed.data.businessDayEndTime,
        billingProfile: parsed.data.billingProfile,
        currency: parsed.data.currency,
        plan,
        quantity: parsed.data.quantity,
        selfReportedDiscoveryChannel: parsed.data.selfReportedDiscoveryChannel,
        timeZone: parsed.data.timeZone,
    };
};

export const serializePurchaseIntent = (
    value: unknown,
    createdAt = Date.now(),
): string | null => {
    const intent = normalizePurchaseIntent(value);
    if (!intent || !Number.isSafeInteger(createdAt) || createdAt <= 0) return null;
    return JSON.stringify({
        createdAt,
        intent,
        version: PURCHASE_INTENT_STORAGE_VERSION,
    } satisfies StoredPurchaseIntentEnvelope);
};

export const parseStoredPurchaseIntent = (
    raw: unknown,
    now = Date.now(),
): PurchaseIntent | null => {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > 32_768) return null;
    if (!Number.isSafeInteger(now) || now <= 0) return null;

    let decoded: unknown;
    try {
        decoded = JSON.parse(raw);
    } catch {
        return null;
    }
    if (!isRecord(decoded)) return null;

    const envelope = decoded as Partial<StoredPurchaseIntentEnvelope>;
    if (
        envelope.version !== PURCHASE_INTENT_STORAGE_VERSION
        || !Number.isSafeInteger(envelope.createdAt)
        || typeof envelope.createdAt !== 'number'
        || envelope.createdAt <= 0
        || envelope.createdAt > now + 60_000
        || now - envelope.createdAt > PURCHASE_INTENT_MAX_AGE_MS
    ) return null;

    return normalizePurchaseIntent(envelope.intent);
};
