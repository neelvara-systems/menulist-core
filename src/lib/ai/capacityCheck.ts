import { FEATURE_FLAGS } from "@config/features";
import { getUnitCost, isFreeTierAction, OVERDRAFT_BUFFER_PERCENT } from "@constant/AI/unitCosts";
import { DB_COLLECTIONS } from "@constant/database";
import { getActiveSubscriptionForStore } from "@database/subscriptions";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { FirestoreSubscriptionDoc } from "@type/razorpay";

/**
 * AI Capacity Check & Consumption Module
 *
 * Per-store capacity enforcement using existing subscription credits.
 * No new documents, no new collections — uses subscription.monthlyCredits + subscription.topUpCredits.
 *
 * Architecture: Per-store (not per-tenant). See spec doc §Multi-Outlet Pack Logic.
 *
 * @see __docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md
 */

export interface CapacityCheckResult {
    allowed: boolean;
    unitsRequired: number;
    remaining: number;
    reason?: "free" | "sufficient" | "overdraft" | "exhausted" | "maintenance" | "no_subscription";
    subscription: FirestoreSubscriptionDoc | null;
}

async function refreshMonthlyCreditsIfNeeded(
    subscription: FirestoreSubscriptionDoc,
): Promise<FirestoreSubscriptionDoc> {
    if (!subscription.id || subscription.monthlyCreditsAllowance <= 0) {
        return subscription;
    }

    const currentBillingPeriod = getBillingPeriodKey(subscription.cycleStartDate);
    if (subscription.creditsLastResetMonth === currentBillingPeriod) {
        return subscription;
    }

    const subscriptionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(subscription.id);

    return firestoreAdmin.runTransaction(async (tx) => {
        const subscriptionSnap = await tx.get(subscriptionRef);
        if (!subscriptionSnap.exists) return subscription;

        const current = {
            ...(subscriptionSnap.data() as FirestoreSubscriptionDoc),
            id: subscription.id,
        };
        const billingPeriod = getBillingPeriodKey(current.cycleStartDate);

        if (current.creditsLastResetMonth === billingPeriod || current.monthlyCreditsAllowance <= 0) {
            return current;
        }

        tx.set(subscriptionRef, {
            monthlyCredits: current.monthlyCreditsAllowance,
            creditsLastResetMonth: billingPeriod,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            ...current,
            monthlyCredits: current.monthlyCreditsAllowance,
            creditsLastResetMonth: billingPeriod,
        };
    });
}

/**
 * Check if a store's subscription has sufficient AI capacity for an action.
 *
 * Checks in order:
 * 1. Kill switch (ENABLE_AI_ENHANCEMENTS) — if OFF, block paid actions
 * 2. Free tier check — free actions always pass
 * 3. Subscription lookup — per-store
 * 4. Capacity check with overdraft buffer (soft enforcement at launch)
 *
 * IMPORTANT: This check happens BEFORE the Gemini API call.
 * If capacity is insufficient, the API call is never made.
 *
 * @param tenantId - Tenant ID from session
 * @param storeId - Store ID from session (capacity is per-store)
 * @param actionType - AI_ACTIONS_TYPES value
 * @param quantity - Number of items (for batch operations)
 */
export async function checkAICapacity(
    tenantId: number,
    storeId: number,
    actionType: string,
    quantity: number = 1,
): Promise<CapacityCheckResult> {
    // Free actions always allowed (even when kill switch is OFF)
    if (isFreeTierAction(actionType)) {
        return {
            allowed: true,
            unitsRequired: 0,
            remaining: Infinity,
            reason: "free",
            subscription: null,
        };
    }

    // Kill switch check — block all paid operations when OFF
    if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS) {
        return {
            allowed: false,
            unitsRequired: 0,
            remaining: 0,
            reason: "maintenance",
            subscription: null,
        };
    }

    const unitsRequired = getUnitCost(actionType) * quantity;
    let subscription = await getActiveSubscriptionForStore(tenantId, storeId);

    if (!subscription) {
        return { allowed: false, unitsRequired, remaining: 0, reason: "no_subscription", subscription: null };
    }

    // Lazy monthly credit reset: handles yearly plans (no monthly webhook) 
    // and acts as safety net for monthly plans. Race-safe (idempotent reset value).
    // Uses billing-cycle anchor day (not calendar month) to avoid premature resets.
    // E.g. sub starts Feb 15 → anchor=15 → billing months are 15th-to-15th.
    subscription = await refreshMonthlyCreditsIfNeeded(subscription);

    const remaining =
        (subscription.monthlyCredits || 0) + (subscription.topUpCredits || 0);

    // Soft enforcement: allow overdraft up to OVERDRAFT_BUFFER_PERCENT
    const overdraftAllowance = remaining * (OVERDRAFT_BUFFER_PERCENT / 100);
    const effectiveCapacity = remaining + overdraftAllowance;
    const isOverdraft = remaining < unitsRequired && effectiveCapacity >= unitsRequired;

    return {
        allowed: effectiveCapacity >= unitsRequired,
        unitsRequired,
        remaining,
        reason: remaining >= unitsRequired ? "sufficient" : isOverdraft ? "overdraft" : "exhausted",
        subscription,
    };
}

export interface RemainingBalance {
    monthlyCredits: number;
    topUpCredits: number;
}

/**
 * Consume AI capacity from a store's subscription.
 * Decrements monthlyCredits first, then topUpCredits.
 *
 * Returns the new balance so the API route can include it in the response,
 * allowing the frontend to update state without an extra Firebase read.
 *
 * IMPORTANT: Called AFTER successful Gemini API call, not before.
 * The pre-check is done by checkAICapacity() before the call.
 *
 * @param subscription - The subscription document (from checkAICapacity result)
 * @param unitsToConsume - Number of internal units to consume
 * @returns The updated balance after consumption
 */
export async function consumeAICapacity(
    subscription: FirestoreSubscriptionDoc,
    unitsToConsume: number,
): Promise<RemainingBalance | null> {
    if (!subscription?.id || unitsToConsume <= 0) return null;

    const subscriptionRef = firestoreAdmin
        .collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .doc(subscription.id);

    const updatedBalance = await firestoreAdmin.runTransaction(async (tx) => {
        const subscriptionSnap = await tx.get(subscriptionRef);
        if (!subscriptionSnap.exists) return null;

        const current = subscriptionSnap.data() as FirestoreSubscriptionDoc;
        const monthlyRemaining = Number(current.monthlyCredits ?? 0);
        const topUpRemaining = Number(current.topUpCredits ?? 0);

        let newMonthly = monthlyRemaining;
        let newTopUp = topUpRemaining;

        if (monthlyRemaining >= unitsToConsume) {
            // Fully covered by monthly credits
            newMonthly = monthlyRemaining - unitsToConsume;
        } else {
            // Use all remaining monthly, rest from topUp
            const remainder = unitsToConsume - monthlyRemaining;
            newMonthly = 0;
            newTopUp = Math.max(0, topUpRemaining - remainder);
        }

        tx.set(subscriptionRef, {
            monthlyCredits: newMonthly,
            topUpCredits: newTopUp,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
            monthlyCredits: newMonthly,
            topUpCredits: newTopUp,
            subscription: current,
        };
    });

    if (!updatedBalance) return null;

    // 📧 LIFECYCLE MESSAGE: Credits exhausted notification (fire-and-forget)
    // Fires when BOTH monthly + topUp credits hit zero after consumption
    if (updatedBalance.monthlyCredits === 0 && updatedBalance.topUpCredits === 0) {
        try {
            const { sendLifecycleMessage } = await import('@lib/messaging');
            sendLifecycleMessage({
                storeId: String(updatedBalance.subscription.storeId),
                tenantId: String(updatedBalance.subscription.tenantId),
                eventType: 'CREDITS_EXHAUSTED',
                referenceId: `credits-exhausted-${updatedBalance.subscription.storeId}-${new Date().toISOString().split('T')[0]}`,
                recipientEmail: updatedBalance.subscription.email || '',
                storeName: updatedBalance.subscription.name || '',
                metadata: {},
            }).catch(() => { /* non-blocking */ });
        } catch { /* non-blocking */ }
    }

    return {
        monthlyCredits: updatedBalance.monthlyCredits,
        topUpCredits: updatedBalance.topUpCredits,
    };
}

/**
 * Compute a billing-period-aware YYYYMM key using the subscription's anchor day.
 *
 * Razorpay billing cycles run from anchor day to anchor day (e.g., 15th to 15th).
 * If current day < anchor day → still in previous billing period.
 * If current day >= anchor day → in current billing period.
 *
 * Example: Sub starts Feb 15 (anchor=15)
 *   Mar 1  (day 1 < 15)  → 202602 (still Feb period — no premature reset)
 *   Mar 15 (day 15 >= 15) → 202603 (new period — reset triggers correctly)
 *
 * Month-end edge case: anchor=31 in Feb (28 days) → capped to 28.
 * Without this, credits would never reset in shorter months for yearly plans.
 *
 * @param cycleStartDate - Firestore Timestamp from subscription.cycleStartDate
 */
function getBillingPeriodKey(cycleStartDate: any): number {
    const now = new Date();

    // Fallback for subscriptions without cycleStartDate (pending status)
    if (!cycleStartDate?.seconds) {
        return now.getFullYear() * 100 + (now.getMonth() + 1);
    }

    const start = new Date(cycleStartDate.seconds * 1000);
    const rawAnchorDay = start.getDate();

    let year = now.getFullYear();
    let month = now.getMonth() + 1; // 1-indexed

    // Cap anchor to days in current month (e.g., anchor=31 in Feb→28)
    const daysInCurrentMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    const anchorDay = Math.min(rawAnchorDay, daysInCurrentMonth);

    // If we haven't reached the anchor day yet, we're still in previous billing period
    if (now.getDate() < anchorDay) {
        month -= 1;
        if (month === 0) { month = 12; year -= 1; }
    }

    return year * 100 + month;
}
