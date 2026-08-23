import { MENULIST_B2C_PLAN_IDS } from "@constant/menulistPlans";

export const MENULIST_CONTENT_CREDIT_RATE_VERSION = "menulist-content-credit-v1";

export const CONTENT_CREDIT_OPERATION_COSTS = {
    DESCRIPTION_REWRITE: 1,
    GENERATED_MENU_IMAGE: 5,
    LANGUAGE_ADDITION: 3,
    ITEM_TRANSLATION: 1,
    IMAGE_TRANSLATION: 5,
    IMAGE_EDIT: 5,
} as const;

export const MENULIST_CONTENT_CREDIT_ALLOWANCES = {
    [MENULIST_B2C_PLAN_IDS.OFFICIAL]: 75,
    [MENULIST_B2C_PLAN_IDS.PRO]: 250,
    [MENULIST_B2C_PLAN_IDS.MULTI_LOCATION]: 300,
} as const;

export const MENULIST_CONTENT_CREDIT_PACK = {
    creditAmount: 250,
    packId: "enhancement",
    priceINRPaise: 79_900,
    priceUSDCents: 2_900,
} as const;

export const MENULIST_PROMOTIONAL_CREDIT_VALIDITY_DAYS = 365;
export const MENULIST_PURCHASED_CREDIT_REACTIVATION_DAYS = 365;

const resolveCreditTimestampMillis = (value: unknown): number | null => {
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) && millis > 0 ? millis : null;
    }
    if (!value || typeof value !== "object") return null;
    try {
        const toMillis = Reflect.get(value, "toMillis");
        if (typeof toMillis === "function") {
            const millis = Reflect.apply(toMillis, value, []);
            return typeof millis === "number" && Number.isFinite(millis) && millis > 0 ? millis : null;
        }
        const toDate = Reflect.get(value, "toDate");
        if (typeof toDate === "function") {
            const date = Reflect.apply(toDate, value, []);
            const millis = date instanceof Date ? date.getTime() : Number.NaN;
            return Number.isFinite(millis) && millis > 0 ? millis : null;
        }
        const seconds = Reflect.get(value, "seconds");
        return typeof seconds === "number" && Number.isSafeInteger(seconds) && seconds > 0
            ? seconds * 1_000
            : null;
    } catch {
        return null;
    }
};

export function resolveMenuListPromotionalCreditState(params: {
    credits: unknown;
    expiresAt: unknown;
    nowMs?: number;
}): { credits: number | null; expiresAtMillis: number | null } {
    const credits = params.credits ?? 0;
    const expiresAtMillis = resolveCreditTimestampMillis(params.expiresAt);
    const nowMs = params.nowMs ?? Date.now();
    if (
        typeof credits !== "number"
        || !Number.isSafeInteger(credits)
        || credits < 0
        || !Number.isFinite(nowMs)
        || nowMs < 0
    ) {
        return { credits: null, expiresAtMillis };
    }
    if (credits === 0) return { credits: 0, expiresAtMillis };
    return expiresAtMillis !== null && expiresAtMillis > nowMs
        ? { credits, expiresAtMillis }
        : { credits: 0, expiresAtMillis };
}

export function resolveMenuListMonthlyCreditAllowance(params: {
    fallbackAllowance?: number | null;
    planId: string;
    quantity?: number | null;
}): number {
    const baseAllowance = MENULIST_CONTENT_CREDIT_ALLOWANCES[
        params.planId as keyof typeof MENULIST_CONTENT_CREDIT_ALLOWANCES
    ];
    if (baseAllowance === undefined) {
        const fallback = Number(params.fallbackAllowance ?? 0);
        return Number.isSafeInteger(fallback) && fallback >= 0 ? fallback : 0;
    }
    const quantity = params.planId === MENULIST_B2C_PLAN_IDS.MULTI_LOCATION
        ? params.quantity == null
            ? 2
            : Number.isSafeInteger(params.quantity) && params.quantity >= 2 && params.quantity <= 31
                ? params.quantity
                : null
        : 1;
    if (quantity === null) {
        throw new Error('MenuList multi-location quantity is invalid.');
    }
    return baseAllowance * quantity;
}

const toNonNegativeInteger = (value: unknown, fallback = 0): number => {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) && numericValue >= 0 ? numericValue : fallback;
};

export function resolveMenuListQuantityCreditUpdate(params: {
    currentMonthlyCredits?: unknown;
    currentMonthlyCreditsAllowance?: unknown;
    planId: string;
    quantity?: number | null;
}): { monthlyCredits: number; monthlyCreditsAllowance: number } {
    const currentAllowance = toNonNegativeInteger(params.currentMonthlyCreditsAllowance);
    const currentCredits = Math.min(
        currentAllowance,
        toNonNegativeInteger(params.currentMonthlyCredits),
    );
    const monthlyCreditsAllowance = resolveMenuListMonthlyCreditAllowance({
        planId: params.planId,
        quantity: params.quantity,
        fallbackAllowance: currentAllowance,
    });
    const creditsUsedInCurrentCycle = Math.max(0, currentAllowance - currentCredits);

    return {
        monthlyCreditsAllowance,
        monthlyCredits: Math.max(0, monthlyCreditsAllowance - creditsUsedInCurrentCycle),
    };
}

export const getContentCreditOutcomeExamples = (credits: number) => {
    const availableCredits = Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : 0;

    return {
        descriptionRewrites: Math.floor(availableCredits / CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE),
        generatedMenuImages: Math.floor(availableCredits / CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE),
    };
};
