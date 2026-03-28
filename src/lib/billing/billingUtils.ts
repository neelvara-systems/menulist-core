import { getResellerPlanByPlanId } from "@config/resellerPricing";
import { B2BplansList, B2CplansList } from "@data/PlatformPlansList";
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
 * @param subscriptionEntity - The Razorpay subscription entity (must have start_at, total_count, notes.interval)
 * @returns Firebase Timestamp representing the subscription end date
 */
export const getSubscriptionEndDate = (subscriptionEntity: any): Timestamp => {
    const startAtMillis = subscriptionEntity.start_at * 1000;
    const startDate = new Date(startAtMillis);

    if (subscriptionEntity.notes.interval === 'YEAR') {
        startDate.setFullYear(startDate.getFullYear() + subscriptionEntity.total_count);
    } else if (subscriptionEntity.notes.interval === 'MONTH') {
        startDate.setMonth(startDate.getMonth() + subscriptionEntity.total_count);
    }

    return Timestamp.fromDate(startDate);
};
