import { normalizeBillingSubscriptionDocumentId, normalizeBillingSubscriptionScopeDocumentId } from './subscriptionDocumentIdBoundary';

type CheckoutRecoveryExpectation = {
    attemptId: string;
    planId: string;
    providerPlanId: string;
    productId: string;
    quantity: number;
    storeId: string | number;
    tenantId: string | number;
};

const RAZORPAY_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;

const asRecord = (value: unknown): Record<string, unknown> | null => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
);

const matchesCanonicalScopeNote = (value: unknown, expected: string | number): boolean => {
    const scope = normalizeBillingSubscriptionScopeDocumentId(expected);
    return Boolean(scope) && (value === scope?.numericId || value === scope?.documentId);
};

const matchesCanonicalQuantity = (value: unknown, expected: number, allowString: boolean): boolean => (
    value === expected || (allowString && value === String(expected))
);

export const isMatchingCheckoutProviderSubscription = (
    candidateValue: unknown,
    expected: CheckoutRecoveryExpectation,
): boolean => {
    const candidate = asRecord(candidateValue);
    const notes = asRecord(candidate?.notes);
    const candidateId = normalizeBillingSubscriptionDocumentId(candidate?.id);
    if (
        !candidate
        || !notes
        || !candidateId
        || !RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(candidateId)
        || candidate.status !== 'created'
        || candidate.plan_id !== expected.providerPlanId
        || notes.checkoutAttemptId !== expected.attemptId
        || notes.productId !== expected.productId
        || notes.planId !== expected.planId
        || !matchesCanonicalScopeNote(notes.tenantId, expected.tenantId)
        || !matchesCanonicalScopeNote(notes.storeId, expected.storeId)
        || !Number.isSafeInteger(expected.quantity)
        || expected.quantity <= 0
        || expected.quantity > 10_000
    ) {
        return false;
    }

    const hasNoteQuantity = notes.quantity != null && notes.quantity !== '';
    const hasProviderQuantity = candidate.quantity != null && candidate.quantity !== '';
    if (!hasNoteQuantity && !hasProviderQuantity) return expected.quantity === 1;
    if (
        hasNoteQuantity
        && !matchesCanonicalQuantity(notes.quantity, expected.quantity, true)
    ) {
        return false;
    }
    return !hasProviderQuantity
        || matchesCanonicalQuantity(candidate.quantity, expected.quantity, false);
};
