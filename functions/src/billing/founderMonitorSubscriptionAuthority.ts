import { hasVerifiedSubscriptionPaymentEvidence } from './subscriptionPaymentEvidence';

function normalizeStatus(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 80) return null;
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');
    return normalized || null;
}

function toTimestampMillis(value: unknown): number | null {
    if (value instanceof Date) {
        const millis = value.getTime();
        return Number.isFinite(millis) && millis >= 0 ? millis : null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.values(descriptors).some((descriptor) => descriptor.get || descriptor.set)) return null;
    const seconds = descriptors.seconds?.value ?? descriptors._seconds?.value;
    const nanoseconds = descriptors.nanoseconds?.value ?? descriptors._nanoseconds?.value ?? 0;
    if (
        typeof seconds !== 'number'
        || !Number.isSafeInteger(seconds)
        || seconds < 0
        || typeof nanoseconds !== 'number'
        || !Number.isSafeInteger(nanoseconds)
        || nanoseconds < 0
        || nanoseconds >= 1_000_000_000
    ) return null;
    const millis = (seconds * 1_000) + Math.floor(nanoseconds / 1_000_000);
    return Number.isSafeInteger(millis) ? millis : null;
}

export function isFounderMonitorActiveRevenueSubscription(
    subscription: Record<string, any>,
    nowMs = Date.now(),
): boolean {
    if (!Number.isFinite(nowMs) || nowMs < 0) return false;
    const status = normalizeStatus(subscription.status);
    if (status !== 'active' && status !== 'paid') return false;
    if (!hasVerifiedSubscriptionPaymentEvidence(subscription)) return false;

    const paidWindowEnd = subscription.billingMode === 'manual'
        ? subscription.validUntil ?? subscription.cycleEndDate
        : subscription.cycleEndDate;
    const paidWindowEndMs = toTimestampMillis(paidWindowEnd);
    return paidWindowEndMs !== null && paidWindowEndMs >= nowMs;
}

export function isFounderMonitorPastDueRevenueSubscription(
    subscription: Record<string, any>,
): boolean {
    const status = normalizeStatus(subscription.status);
    return (status === 'past_due' || status === 'paused')
        && hasVerifiedSubscriptionPaymentEvidence(subscription);
}

export function isFounderMonitorPaymentAttentionSubscription(
    subscription: Record<string, any>,
): boolean {
    const status = normalizeStatus(subscription.status);
    return status === 'pending' || status === 'past_due' || status === 'paused';
}
