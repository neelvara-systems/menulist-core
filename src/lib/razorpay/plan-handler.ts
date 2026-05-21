import { Currency, PlanInterval, UserType } from "../../types/razorpay";
import { DEFAULT_PRODUCT_ID, type ProductId } from "@constant/product";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "./razorpay";

interface PlanInfo {
    price: number; // in smallest currency unit
    currency: Currency;
    interval: PlanInterval;
    userType: UserType;
    planId: string; // e.g., 'pro', 'starter'
    productId?: ProductId;
}

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
    logger.debug('Searching for Razorpay plan', { lookupKey, productId, userType, planId, interval });

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
            logger.info('Existing Razorpay plan found', { providerPlanId: foundPlan.id, lookupKey, productId });
            return foundPlan.id;
        }

        // 4. If no plan is found, create a new one.
        logger.info('Creating new Razorpay plan', { lookupKey, price, currency, interval });

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
        logger.info('Razorpay plan created successfully', { planId: newPlan.id, lookupKey, price, currency });

        return newPlan.id;
    } catch (error) {
        logger.error('Failed to find or create Razorpay plan', error, { lookupKey, price, currency });
        throw new Error(`Could not process Razorpay plan: ${(error as Error).message}`);
    }
}
