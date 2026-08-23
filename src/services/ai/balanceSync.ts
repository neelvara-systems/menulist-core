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

import {
    getNonNegativeCreditInteger,
    getPositiveCreditInteger,
} from '@data/shared/aiCreditScalarContract';

export interface AIBalanceUpdate {
    billingStoreId: number;
    monthlyCredits: number;
    promotionalCredits: number;
    topUpCredits: number;
}

export function normalizeAiBalanceUpdate(value: unknown): AIBalanceUpdate | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const balance = value as Record<string, unknown>;
    const billingStoreId = getPositiveCreditInteger(balance.billingStoreId);
    const monthlyCredits = getNonNegativeCreditInteger(balance.monthlyCredits);
    const promotionalCredits = getNonNegativeCreditInteger(balance.promotionalCredits ?? 0);
    const topUpCredits = getNonNegativeCreditInteger(balance.topUpCredits);
    if (
        billingStoreId === null
        || monthlyCredits === null
        || promotionalCredits === null
        || topUpCredits === null
        || !Number.isSafeInteger(monthlyCredits + promotionalCredits + topUpCredits)
    ) {
        return null;
    }
    return { billingStoreId, monthlyCredits, promotionalCredits, topUpCredits };
}

/**
 * Call this in every frontend AI service after parsing the API response.
 * If the response contains `remainingBalance`, it dispatches an event
 * so the provider updates subscription state automatically.
 */
export function syncBalanceFromResponse(responseJson: unknown): void {
    if (typeof window === 'undefined') return;
    if (!responseJson || typeof responseJson !== 'object' || Array.isArray(responseJson)) return;
    const detail = normalizeAiBalanceUpdate((responseJson as Record<string, unknown>).remainingBalance);
    if (!detail) return;

    window.dispatchEvent(
        new CustomEvent<AIBalanceUpdate>('ai-balance-update', {
            detail,
        })
    );
}
