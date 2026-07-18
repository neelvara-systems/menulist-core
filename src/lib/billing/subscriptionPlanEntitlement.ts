export interface SubscriptionPlanEntitlementInput {
    cycleEndDate?: unknown;
    planId?: string | null;
    status?: string | null;
}

export const PLAN_ENTITLED_SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'paused'] as const;

export function toSubscriptionCycleEndMillis(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    try {
        const toMillis = (value as { toMillis?: unknown }).toMillis;
        if (typeof toMillis === 'function') {
            const millis = Number(toMillis.call(value));
            return Number.isFinite(millis) ? millis : 0;
        }
        const seconds = Number((value as { seconds?: unknown }).seconds);
        return Number.isFinite(seconds) ? seconds * 1000 : 0;
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
    if (subscription.status === 'active') return true;
    if (subscription.status !== 'cancelled' && subscription.status !== 'paused') return false;

    const cycleEndMs = toSubscriptionCycleEndMillis(subscription.cycleEndDate);
    return Number.isFinite(nowMs) && cycleEndMs >= nowMs;
}

export function getActivePlanTypeForSubscription(
    subscription: SubscriptionPlanEntitlementInput,
    nowMs = Date.now(),
): string | null {
    if (!hasCurrentSubscriptionPlanEntitlement(subscription, nowMs)) return null;
    const normalized = String(subscription.planId || '').trim().toLowerCase();
    return normalized || null;
}
