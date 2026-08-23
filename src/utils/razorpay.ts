import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import {
    hasCurrentSubscriptionPlanEntitlement,
    hasVerifiedSubscriptionPaymentEvidence,
} from "@lib/billing/subscriptionPlanEntitlement";

const toValidDate = (value: unknown): Date | null => {
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value : null;
    }
    if (!value || typeof value !== 'object') return null;

    try {
        const toDate = (value as { toDate?: unknown }).toDate;
        if (typeof toDate === 'function') {
            const date = toDate.call(value);
            return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
        }
        const seconds = Number((value as { seconds?: unknown }).seconds);
        if (Number.isFinite(seconds)) {
            const date = new Date(seconds * 1000);
            return Number.isFinite(date.getTime()) ? date : null;
        }
    } catch {
        return null;
    }

    return null;
};

const toNonNegativeSafeInteger = (value: unknown): number => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) return 0;
    const integerValue = Math.floor(numericValue);
    return Number.isSafeInteger(integerValue) ? integerValue : 0;
};

export const getGracePeriodInfo = (
    pastDueTimestamp: unknown,
    graceDays: number = 7,
    now: Date = new Date(),
) => {
    const pastDueDate = toValidDate(pastDueTimestamp);
    const normalizedGraceDays = Number(graceDays);
    if (
        !pastDueDate
        || !Number.isFinite(normalizedGraceDays)
        || normalizedGraceDays < 0
        || !Number.isFinite(now.getTime())
    ) return {
        remainingDays: 0,
        graceEndsDate: null,
        graceEndsTimestamp: null,
        hasKnownGracePeriod: false,
    };

    const graceEndsDate = new Date(pastDueDate.getTime() + normalizedGraceDays * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(graceEndsDate.getTime())) return {
        remainingDays: 0,
        graceEndsDate: null,
        graceEndsTimestamp: null,
        hasKnownGracePeriod: false,
    };
    const graceEndsTimestamp = Timestamp.fromDate(graceEndsDate);

    const remainingMs = graceEndsDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return {
        graceEndsDate,
        graceEndsTimestamp,
        remainingDays,
        hasKnownGracePeriod: true,
    };
};

export const getGracePeriodDisplayInfo = (pastDueTimestamp: unknown, graceDays: number = 7) => {
    const gracePeriodInfo = getGracePeriodInfo(pastDueTimestamp, graceDays);
    if (!gracePeriodInfo.hasKnownGracePeriod || !gracePeriodInfo.graceEndsTimestamp) {
        return {
            ...gracePeriodInfo,
            dayLabel: '',
            title: 'Payment recovery',
            summary: 'Grace period details unavailable.',
        };
    }

    const dayLabel = `${gracePeriodInfo.remainingDays} day${gracePeriodInfo.remainingDays === 1 ? '' : 's'}`;
    return {
        ...gracePeriodInfo,
        hasKnownGracePeriod: true,
        dayLabel,
        title: `Grace period (${dayLabel} left)`,
        summary: `${dayLabel} grace period remaining.`,
    };
};

/**
 * Determines if the user has valid paid access to the application.
 * Used by Dashboard/Projects gates to decide whether to allow access.
 * 
 * A paused subscription whose billing cycle has ended does NOT grant access
 * (the user hasn't paid for this period), but the subscription is still
 * visible on the billing page for support recovery.
 */
export function hasValidSubscriptionAccess(sub: FirestoreSubscriptionDoc | null): boolean {
    if (!sub) return false;
    if (!hasVerifiedSubscriptionPaymentEvidence(sub)) return false;
    if (sub.status === 'pending' || sub.status === 'expired' || sub.status === 'completed') return false;

    if (sub.status === 'past_due') {
        const gracePeriod = getGracePeriodInfo(sub.pastDueSinceAt);
        return gracePeriod.hasKnownGracePeriod && gracePeriod.remainingDays > 0;
    }

    return hasCurrentSubscriptionPlanEntitlement(sub);
}

/**
 * BT9: Calculate prorated amount for mid-cycle outlet addition.
 * Used in the "Add Outlet" confirmation modal to show estimated charge.
 * Razorpay handles actual proration — this is informational only.
 */
export function calculateProration(
    sub: FirestoreSubscriptionDoc,
    now: Date = new Date(),
): { proratedAmount: number; fullCycleAmount: number; daysRemaining: number; totalDays: number } {
    const amount = toNonNegativeSafeInteger(sub.chargedUnitAmount ?? sub.amount);
    const cycleStart = toValidDate(sub.cycleStartDate);
    const cycleEnd = toValidDate(sub.cycleEndDate);

    if (!cycleStart || !cycleEnd || !Number.isFinite(now.getTime()) || cycleEnd <= cycleStart) {
        return { proratedAmount: amount, fullCycleAmount: amount, daysRemaining: 0, totalDays: 30 };
    }

    const totalDays = Math.max(1, Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.min(
        totalDays,
        Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    );
    const proratedAmount = Math.round((amount * daysRemaining) / totalDays);

    return { proratedAmount, fullCycleAmount: amount, daysRemaining, totalDays };
}

export function calculateRemainingCredits(
    activeSubscription: FirestoreSubscriptionDoc | null | undefined,
    today: Date = new Date(),
    options: {
        includeCurrentMonthlyCredits?: boolean;
        includeFutureYearlyCredits?: boolean;
    } = {},
): {
    monthlyCreditsAllowance: number;
    monthsRemaining: number;
    totalRemainingCredits: number;
    unusedThisMonth: number;
} {
    if (!activeSubscription) {
        return { unusedThisMonth: 0, monthsRemaining: 0, monthlyCreditsAllowance: 0, totalRemainingCredits: 0 };
    }
    const monthlyCreditsAllowance = toNonNegativeSafeInteger(activeSubscription.monthlyCreditsAllowance);
    const monthlyCredits = toNonNegativeSafeInteger(activeSubscription.monthlyCredits);
    const topUpCredits = toNonNegativeSafeInteger(activeSubscription.topUpCredits);
    const includeCurrentMonthlyCredits = options.includeCurrentMonthlyCredits !== false;
    const includeFutureYearlyCredits = options.includeFutureYearlyCredits !== false;
    const transferableMonthlyCredits = includeCurrentMonthlyCredits ? monthlyCredits : 0;

    if (activeSubscription.planType === "MONTH") {
        return {
            unusedThisMonth: transferableMonthlyCredits,
            monthsRemaining: 0,
            monthlyCreditsAllowance,
            totalRemainingCredits: transferableMonthlyCredits + topUpCredits,
        };
    }

    const end = toValidDate(activeSubscription.cycleEndDate);
    if (!end || !Number.isFinite(today.getTime())) {
        return { unusedThisMonth: 0, monthsRemaining: 0, monthlyCreditsAllowance: 0, totalRemainingCredits: topUpCredits };
    }

    // If subscription is already expired
    if (today > end) return { unusedThisMonth: 0, monthsRemaining: 0, monthlyCreditsAllowance: 0, totalRemainingCredits: topUpCredits, };

    // Calculate months remaining (including current month if time left)
    let monthsRemaining = (end.getUTCFullYear() - today.getUTCFullYear()) * 12 +
        (end.getUTCMonth() - today.getUTCMonth());

    // If we are before or on the same day as cycleEndDate day → include current month
    if (today.getUTCDate() <= end.getUTCDate()) {
        monthsRemaining += 1;
    }

    // Remaining credits in current month
    const unusedThisMonth = transferableMonthlyCredits;

    // Last month case → only unused credits
    if (monthsRemaining <= 1) {
        return { unusedThisMonth, monthsRemaining: 0, monthlyCreditsAllowance, totalRemainingCredits: unusedThisMonth + topUpCredits, };
    }

    // Otherwise: unused current month + full months left
    return {
        unusedThisMonth,
        monthsRemaining: monthsRemaining - 1,
        monthlyCreditsAllowance,
        totalRemainingCredits: (
            unusedThisMonth
            +
            (includeFutureYearlyCredits ? (monthsRemaining - 1) * monthlyCreditsAllowance : 0)
        ) + topUpCredits,
    };
}
