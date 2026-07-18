export const BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT = 100;

export function appendBoundedBillingStatusHistory<T>(
    current: unknown,
    entry: T | T[],
): T[] {
    const existing = Array.isArray(current) ? current as T[] : [];
    const additions = Array.isArray(entry) ? entry : [entry];
    return [...existing, ...additions].slice(-BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT);
}
