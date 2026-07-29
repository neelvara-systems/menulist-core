import type { FirestoreSubscriptionDoc } from "@type/razorpay";
import { MAX_SUBSCRIPTION_QUANTITY } from "./paymentCheckoutBoundary";

type ProviderSyncSubscription = Pick<
    FirestoreSubscriptionDoc,
    "billingMode" | "paymentProvider" | "providerSubscriptionId"
>;

const RAZORPAY_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;

const normalizeRazorpayManagedSubscriptionId = (value: unknown): string | null => (
    typeof value === "string"
    && value.length <= 180
    && RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(value)
        ? value
        : null
);

export const getRazorpayManagedSubscriptionId = (
    subscription?: Partial<ProviderSyncSubscription> | null,
): string | null => {
    if (subscription?.paymentProvider && subscription.paymentProvider !== "razorpay") return null;
    if (subscription?.billingMode === "manual") return null;
    return normalizeRazorpayManagedSubscriptionId(subscription?.providerSubscriptionId);
};

export const updateRazorpaySubscriptionQuantity = async (
    providerSubscriptionId: string,
    quantity: number,
) => {
    const normalizedProviderSubscriptionId = normalizeRazorpayManagedSubscriptionId(providerSubscriptionId);
    if (
        !normalizedProviderSubscriptionId
        || !Number.isSafeInteger(quantity)
        || quantity < 1
        || quantity > MAX_SUBSCRIPTION_QUANTITY
    ) {
        throw new Error("razorpay_subscription_quantity_update_input_invalid");
    }
    const { razorpayClient } = await import("@lib/razorpay/razorpay");
    return razorpayClient.subscriptions.update(normalizedProviderSubscriptionId, { quantity });
};

export const isRazorpayQuantityUpdateUnsupported = (error: unknown) => {
    try {
        const source = error && typeof error === "object"
            ? error as Record<string, unknown>
            : {};
        const nested = source.error;
        const providerError = nested && typeof nested === "object"
            ? nested as Record<string, unknown>
            : source;
        const text = [
            providerError.description,
            providerError.reason,
            providerError.message,
            source.message,
        ]
            .filter((value): value is string => typeof value === "string")
            .join(" ")
            .toLowerCase();

        return text.includes("payment mode is upi")
            || (text.includes("upi") && text.includes("cannot") && text.includes("updated"));
    } catch {
        return false;
    }
};

export const fetchRazorpaySubscription = async (providerSubscriptionId: string) => {
    const normalizedProviderSubscriptionId = normalizeRazorpayManagedSubscriptionId(providerSubscriptionId);
    if (!normalizedProviderSubscriptionId) {
        throw new Error("razorpay_subscription_fetch_input_invalid");
    }
    const { razorpayClient } = await import("@lib/razorpay/razorpay");
    return razorpayClient.subscriptions.fetch(normalizedProviderSubscriptionId);
};
