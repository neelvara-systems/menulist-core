/**
 * AI Balance Sync Utility
 * 
 * After every AI API call, the backend returns `remainingBalance` in the response.
 * This utility dispatches a CustomEvent so the SessionProvider can update
 * `activeSubscription` state without a separate Firebase read.
 * 
 * This saves 1 Firestore read per AI operation on the frontend side.
 * 
 * @see src/providers/sessionProvider.tsx — listens for 'ai-balance-update'
 * @see src/lib/ai/capacityCheck.ts — reservation settlement returns the scoped balance
 */

export interface AIBalanceUpdate {
    billingStoreId: number;
    monthlyCredits: number;
    topUpCredits: number;
}

function normalizeBalanceUpdate(value: unknown): AIBalanceUpdate | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const balance = value as Record<string, unknown>;
    const billingStoreId = Number(balance.billingStoreId);
    const monthlyCredits = Number(balance.monthlyCredits);
    const topUpCredits = Number(balance.topUpCredits);
    if (
        !Number.isSafeInteger(billingStoreId)
        || billingStoreId <= 0
        || !Number.isFinite(monthlyCredits)
        || monthlyCredits < 0
        || !Number.isFinite(topUpCredits)
        || topUpCredits < 0
    ) {
        return null;
    }
    return { billingStoreId, monthlyCredits, topUpCredits };
}

/**
 * Call this in every frontend AI service after parsing the API response.
 * If the response contains `remainingBalance`, it dispatches an event
 * so the provider updates subscription state automatically.
 */
export function syncBalanceFromResponse(responseJson: unknown): void {
    if (typeof window === 'undefined') return;
    if (!responseJson || typeof responseJson !== 'object' || Array.isArray(responseJson)) return;
    const detail = normalizeBalanceUpdate((responseJson as Record<string, unknown>).remainingBalance);
    if (!detail) return;

    window.dispatchEvent(
        new CustomEvent<AIBalanceUpdate>('ai-balance-update', {
            detail,
        })
    );
}
