import { getResellerPlanByPlanId } from "@config/resellerPricing";
import { B2BplansList, B2CplansList } from "@data/PlatformPlansList";
import { getBillingPlanDetailsFromNotes } from "./productBillingPlans";
import { Timestamp } from "firebase/firestore";

/**
 * Looks up plan details from the local constants based on Razorpay subscription notes.
 * Used by both webhook handler and verify-subscription route.
 *
 * Supports both standard plans (from PlatformPlansList) and reseller plans
 * (from resellerPricing.ts). Reseller plans are identified by planId prefix 'reseller_'.
 *
 * @param notes - The `notes` object from a Razorpay subscription entity
 * @returns The matching plan, or null if not found
 */
export const getPlanDetailsFromConstants = (notes: any) => {
    if (!notes || !notes.planId || !notes.interval) {
        return null;
    }

    const productPlan = getBillingPlanDetailsFromNotes(notes);
    if (productPlan) return productPlan;

    // Check if this is a reseller plan (planId starts with 'reseller_')
    if (notes.planId.startsWith('reseller_')) {
        return getResellerPlanByPlanId(notes.planId, notes.interval);
    }

    // Standard plan lookup (requires userType)
    if (!notes.userType) return null;
    const planList = notes.userType === 'B2C' ? B2CplansList : B2BplansList;
    return planList.find(p => p.planId === notes.planId && p.billingInterval === notes.interval) || null;
};

/**
 * Calculates the subscription end date based on start_at, total_count, and interval.
 * Used by both webhook handler and verify-subscription route.
 *
 * @param input - Exact provider start time, total count and canonical interval after runtime projection
 * @returns Firebase Timestamp representing the subscription end date
 */
export const getSubscriptionEndDate = ({
    interval,
    startAtMillis,
    totalCount,
}: {
    interval: 'MONTH' | 'YEAR';
    startAtMillis: number;
    totalCount: number;
}): Timestamp => {
    const startDate = new Date(startAtMillis);

    if (interval === 'YEAR') {
        startDate.setUTCFullYear(startDate.getUTCFullYear() + totalCount);
    } else {
        startDate.setUTCMonth(startDate.getUTCMonth() + totalCount);
    }

    return Timestamp.fromDate(startDate);
};
