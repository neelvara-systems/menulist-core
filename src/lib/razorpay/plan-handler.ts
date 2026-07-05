import { Currency, PlanInterval, UserType } from "../../types/razorpay";
import { DEFAULT_PRODUCT_ID, type ProductId } from "@constant/product";
import { getBoundedRazorpayStringContext, getRazorpayFailureLogData } from "@lib/billing/razorpayDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { secureError } from "@lib/security/secureLogger";
import { razorpayClient } from "./razorpay";

interface PlanInfo {
    price: number; // in smallest currency unit
    currency: Currency;
    interval: PlanInterval;
    userType: UserType;
    planId: string; // e.g., 'pro', 'starter'
    productId?: ProductId;
}

type RazorpayPlanLogContextInput = {
    currency?: unknown;
    interval?: unknown;
    legacyLookupKey?: unknown;
    lookupKey?: unknown;
    planId?: unknown;
    price?: number;
    productId?: unknown;
    providerPlanId?: unknown;
    userType?: unknown;
};

const getRazorpayPlanLogContext = ({
    currency,
    interval,
    legacyLookupKey,
    lookupKey,
    planId,
    price,
    productId,
    providerPlanId,
    userType,
}: RazorpayPlanLogContextInput) => ({
    ...getBoundedRazorpayStringContext('lookupKey', lookupKey),
    ...getBoundedRazorpayStringContext('legacyLookupKey', legacyLookupKey),
    ...getBoundedRazorpayStringContext('providerPlanId', providerPlanId),
    ...getBoundedRazorpayStringContext('productId', productId),
    ...getBoundedRazorpayStringContext('userType', userType),
    ...getBoundedRazorpayStringContext('planId', planId),
    ...getBoundedRazorpayStringContext('interval', interval),
    ...getBoundedRazorpayStringContext('currency', currency),
    price,
});

/**
 * Finds an existing Razorpay plan or creates a new one to avoid duplicates.
 * It uses a unique key stored in the plan's 'notes' for lookups.
 * @param planInfo - The details of the plan to find or create.
 * @returns The Razorpay Plan ID (e.g., 'plan_xxxxxxxxxxxxx').
 */
export async function getOrCreateRazorpayPlan(planInfo: PlanInfo): Promise<string> {
    const { price, currency, interval, userType, planId, productId = DEFAULT_PRODUCT_ID } = planInfo;

    // 1. Generate a unique, predictable key for this plan variation.
    const lookupKey = `${productId}_${userType}_${planId}_${interval}_${currency}_${price}`.toUpperCase();
    const legacyLookupKey = `${userType}_${planId}_${interval}_${currency}_${price}`.toUpperCase();
    const planLogContext = getRazorpayPlanLogContext({
        currency,
        interval,
        legacyLookupKey,
        lookupKey,
        planId,
        price,
        productId,
        userType,
    });
    try {
        // 2. Search for an existing plan with this lookupKey.
        // Razorpay API returns plans paginated, fetching a reasonable number to check.
        const existingPlans = await razorpayClient.plans.all({ count: 100 });
        const foundPlan = existingPlans.items.find((p) => (
            p.notes?.lookupKey === lookupKey
            || (productId === DEFAULT_PRODUCT_ID && p.notes?.lookupKey === legacyLookupKey)
        ));

        // 3. If a plan is found, return its ID.
        if (foundPlan) {
            logger.info('Existing Razorpay plan found', {
                ...planLogContext,
                ...getBoundedRazorpayStringContext('providerPlanId', foundPlan.id),
            });
            return foundPlan.id;
        }

        // 4. If no plan is found, create a new one.
        logger.info('Creating new Razorpay plan', planLogContext);

        const planPayload = {
            period: (interval === "MONTH" ? "monthly" : "yearly") as "monthly" | "yearly",
            interval: 1,
            item: {
                name: `${userType} ${planId} - ${interval === "MONTH" ? "Monthly" : "Yearly"} (${currency})`,
                description: `Subscription for ${productId} ${userType} ${planId} tier on a ${interval.toLowerCase()} basis in ${currency}.`,
                amount: price,
                currency: currency,
            },
            notes: {
                productId,
                lookupKey: lookupKey, // Store our unique key for future searches
            },
        };

        const newPlan = await razorpayClient.plans.create(planPayload);
        logger.info('Razorpay plan created successfully', {
            ...planLogContext,
            ...getBoundedRazorpayStringContext('providerPlanId', newPlan.id),
        });

        return newPlan.id;
    } catch (error) {
        secureError(
            '[Razorpay] Plan lookup or create failed',
            new Error('razorpay_plan_lookup_or_create_failed'),
            getRazorpayFailureLogData(
                'razorpay_plan_lookup_or_create_failed',
                error,
                planLogContext,
            ),
        );
        throw new Error('Could not process Razorpay plan.');
    }
}
