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
 * @see src/lib/ai/capacityCheck.ts — consumeAICapacity returns the balance
 */

export interface AIBalanceUpdate {
    monthlyCredits: number;
    topUpCredits: number;
}

/**
 * Call this in every frontend AI service after parsing the API response.
 * If the response contains `remainingBalance`, it dispatches an event
 * so the provider updates subscription state automatically.
 */
export function syncBalanceFromResponse(responseJson: any): void {
    if (typeof window === 'undefined') return;
    if (!responseJson?.remainingBalance) return;

    window.dispatchEvent(
        new CustomEvent<AIBalanceUpdate>('ai-balance-update', {
            detail: responseJson.remainingBalance,
        })
    );
}
