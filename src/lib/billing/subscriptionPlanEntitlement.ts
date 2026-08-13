export interface SubscriptionPlanEntitlementInput {
    billingHistory?: unknown;
    billingMode?: unknown;
    cycleEndDate?: unknown;
    manualPaymentConfirmed?: unknown;
    paymentProvider?: unknown;
    planId?: string | null;
    status?: string | null;
}

export const PLAN_ENTITLED_SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'paused'] as const;
const RAZORPAY_PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]+$/;

export function hasVerifiedSubscriptionPaymentEvidence(
    subscription: SubscriptionPlanEntitlementInput,
): boolean {
    if (subscription.billingMode === 'manual') {
        return subscription.manualPaymentConfirmed === true;
    }
    if (subscription.billingMode !== undefined && subscription.billingMode !== 'auto') return false;
    if (subscription.paymentProvider !== 'razorpay') return false;
    return Array.isArray(subscription.billingHistory)
        && subscription.billingHistory.some((entry) => (
            typeof entry === 'string' && RAZORPAY_PAYMENT_ID_PATTERN.test(entry)
        ));
}

export function toSubscriptionCycleEndMillis(value: unknown): number {
    if (value === undefined || value === null) return 0;
    try {
        if (value instanceof Date) {
            const millis = Date.prototype.getTime.call(value);
            return Number.isFinite(millis) && millis >= 0 ? millis : 0;
        }
        if (typeof value !== 'object' || Array.isArray(value)) return 0;
        const descriptors = Object.getOwnPropertyDescriptors(value);
        if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return 0;
        const seconds = descriptors.seconds?.value ?? descriptors._seconds?.value;
        const nanoseconds = descriptors.nanoseconds?.value
            ?? descriptors._nanoseconds?.value
            ?? 0;
        if (
            typeof seconds !== 'number'
            || !Number.isSafeInteger(seconds)
            || seconds < 0
            || typeof nanoseconds !== 'number'
            || !Number.isSafeInteger(nanoseconds)
            || nanoseconds < 0
            || nanoseconds >= 1_000_000_000
        ) return 0;
        const millis = (seconds * 1_000) + Math.floor(nanoseconds / 1_000_000);
        return Number.isSafeInteger(millis) ? millis : 0;
    } catch {
        return 0;
    }
}

export function getSubscriptionPlanEntitlementStatusPriority(status: unknown): number {
    if (status === 'active') return 3;
    if (status === 'cancelled') return 2;
    if (status === 'paused') return 1;
    return 0;
}

export function hasCurrentSubscriptionPlanEntitlement(
    subscription: SubscriptionPlanEntitlementInput,
    nowMs = Date.now(),
): boolean {
    if (!Number.isFinite(nowMs) || nowMs < 0) return false;
    if (!hasVerifiedSubscriptionPaymentEvidence(subscription)) return false;
    if (!PLAN_ENTITLED_SUBSCRIPTION_STATUSES.includes(
        subscription.status as typeof PLAN_ENTITLED_SUBSCRIPTION_STATUSES[number],
    )) return false;
    if (subscription.cycleEndDate === undefined || subscription.cycleEndDate === null) return false;
    const cycleEndMs = toSubscriptionCycleEndMillis(subscription.cycleEndDate);
    return cycleEndMs > 0 && cycleEndMs >= nowMs;
}

export function getActivePlanTypeForSubscription(
    subscription: SubscriptionPlanEntitlementInput,
    nowMs = Date.now(),
): string | null {
    if (!hasCurrentSubscriptionPlanEntitlement(subscription, nowMs)) return null;
    if (typeof subscription.planId !== 'string' || subscription.planId.length > 160) return null;
    const normalized = subscription.planId.trim().toLowerCase();
    return normalized || null;
}
