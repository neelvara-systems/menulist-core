import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";

export const getGracePeriodInfo = (pastDueTimestamp: Timestamp | null | undefined, graceDays: number = 7) => {
    if (!pastDueTimestamp) return {
        remainingDays: 0,
        graceEndsDate: null,
        graceEndsTimestamp: null,
    };

    const pastDueDate = pastDueTimestamp.toDate();
    const graceEndsDate = new Date(pastDueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);
    const graceEndsTimestamp = Timestamp.fromDate(graceEndsDate);

    const now = new Date();
    const remainingMs = graceEndsDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    return {
        graceEndsDate,
        graceEndsTimestamp,
        remainingDays,
    };
};

/**
 * Determines if the user has valid paid access to the application.
 * Used by Dashboard/Projects gates to decide whether to allow access.
 * 
 * A paused subscription whose billing cycle has ended does NOT grant access
 * (the user hasn't paid for this period), but the subscription is still
 * visible on the billing page so they can resume it.
 */
export function hasValidSubscriptionAccess(sub: FirestoreSubscriptionDoc | null): boolean {
    if (!sub) return false;
    if (sub.status === 'pending' || sub.status === 'expired' || sub.status === 'completed') return false;

    // Paused subs with expired billing cycle → no access (but sub is resumable from billing page)
    if (sub.status === 'paused' && sub.cycleEndDate) {
        return sub.cycleEndDate.toMillis() >= Date.now();
    }

    // For active/past_due/cancelled — the DAL already ensures cycleEndDate >= now
    return true;
}

/**
 * BT9: Calculate prorated amount for mid-cycle outlet addition.
 * Used in the "Add Outlet" confirmation modal to show estimated charge.
 * Razorpay handles actual proration — this is informational only.
 */
export function calculateProration(
    sub: FirestoreSubscriptionDoc,
): { proratedAmount: number; fullCycleAmount: number; daysRemaining: number; totalDays: number } {
    const amount = sub.amount || 0;
    const now = new Date();

    if (!sub.cycleEndDate || !sub.cycleStartDate) {
        return { proratedAmount: amount, fullCycleAmount: amount, daysRemaining: 0, totalDays: 30 };
    }

    const cycleStart = sub.cycleStartDate.toDate();
    const cycleEnd = sub.cycleEndDate.toDate();
    const totalDays = Math.max(1, Math.ceil((cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const proratedAmount = Math.round((amount * daysRemaining) / totalDays);

    return { proratedAmount, fullCycleAmount: amount, daysRemaining, totalDays };
}

export function calculateRemainingCredits(activeSubscription: FirestoreSubscriptionDoc) {

    const { cycleEndDate, monthlyCreditsAllowance, monthlyCredits, topUpCredits } = activeSubscription;

    if (!activeSubscription) return { unusedThisMonth: 0, monthsRemaining: 0, monthlyCreditsAllowance: 0, totalRemainingCredits: topUpCredits, };

    if (activeSubscription.planType === "MONTH") {
        return { unusedThisMonth: monthlyCredits, totalRemainingCredits: (monthlyCredits + topUpCredits) };
    }

    const end = new Date(cycleEndDate.seconds * 1000);
    const today = new Date();

    // If subscription is already expired
    if (today > end) return { unusedThisMonth: 0, monthsRemaining: 0, monthlyCreditsAllowance: 0, totalRemainingCredits: topUpCredits, };

    // Calculate months remaining (including current month if time left)
    let monthsRemaining = (end.getFullYear() - today.getFullYear()) * 12 +
        (end.getMonth() - today.getMonth());

    // If we are before or on the same day as cycleEndDate day → include current month
    if (today.getDate() <= end.getDate()) {
        monthsRemaining += 1;
    }

    // Remaining credits in current month
    const unusedThisMonth = Math.max(monthlyCredits, 0);

    // Last month case → only unused credits
    if (monthsRemaining <= 1) {
        return { unusedThisMonth, monthsRemaining: 0, monthlyCreditsAllowance, totalRemainingCredits: unusedThisMonth + topUpCredits, };
    }

    // Otherwise: unused current month + full months left
    return {
        unusedThisMonth,
        monthsRemaining: monthsRemaining - 1,
        monthlyCreditsAllowance,
        totalRemainingCredits: (unusedThisMonth + (monthsRemaining - 1) * monthlyCreditsAllowance) + topUpCredits,
    };
}
