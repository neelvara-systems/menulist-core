import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";

export type ResellerProviderSubscription = {
    checkoutUrl: string;
    id: string;
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
