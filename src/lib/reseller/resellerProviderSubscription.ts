import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";

export type ResellerProviderSubscription = {
    checkoutUrl: string;
    id: string;
};

export type ResellerProviderSubscriptionAttempt = {
    locationCount: number;
    operationFingerprint: string;
    operationId: string;
    planId: string;
    providerPlanId: string;
    resellerId: string;
    storeId: number;
    tenantId: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

export const projectResellerProviderSubscription = (
    value: unknown,
): ResellerProviderSubscription | null => {
    if (
        !isRecord(value)
        || !isValidFirestoreDocumentId(value.id)
        || value.id !== value.id.trim()
    ) {
        return null;
    }
    const checkoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(value.short_url);
    return checkoutUrl ? { checkoutUrl, id: value.id } : null;
};

const normalizeProviderNote = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
    return '';
};

export const projectResellerProviderSubscriptionForAttempt = (
    value: unknown,
    attempt: ResellerProviderSubscriptionAttempt,
): ResellerProviderSubscription | null => {
    if (!isRecord(value) || !isRecord(value.notes)) return null;
    const notes = value.notes;
    if (
        normalizeProviderNote(value.status) !== 'created'
        || normalizeProviderNote(value.plan_id) !== attempt.providerPlanId
        || normalizeProviderNote(notes.operationId) !== attempt.operationId
        || normalizeProviderNote(notes.operationFingerprint) !== attempt.operationFingerprint
        || normalizeProviderNote(notes.resellerId) !== attempt.resellerId
        || normalizeProviderNote(notes.tenantId) !== String(attempt.tenantId)
        || normalizeProviderNote(notes.storeId) !== String(attempt.storeId)
        || normalizeProviderNote(notes.locationCount) !== String(attempt.locationCount)
        || normalizeProviderNote(notes.planId) !== attempt.planId
    ) return null;
    return projectResellerProviderSubscription(value);
};
