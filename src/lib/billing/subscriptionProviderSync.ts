import type { FirestoreSubscriptionDoc } from "@type/razorpay";

type ProviderSyncSubscription = Pick<
    FirestoreSubscriptionDoc,
    "billingMode" | "paymentProvider" | "providerSubscriptionId"
>;

const RAZORPAY_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;

export const getRazorpayManagedSubscriptionId = (
    subscription?: Partial<ProviderSyncSubscription> | null,
): string | null => {
    const providerSubscriptionId = String(subscription?.providerSubscriptionId || "").trim();

    if (subscription?.paymentProvider && subscription.paymentProvider !== "razorpay") return null;
    if (subscription?.billingMode === "manual") return null;
    if (!RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(providerSubscriptionId)) return null;

    return providerSubscriptionId;
};

export const updateRazorpaySubscriptionQuantity = async (
    providerSubscriptionId: string,
    quantity: number,
) => {
    const { razorpayClient } = await import("@lib/razorpay/razorpay");
    return razorpayClient.subscriptions.update(providerSubscriptionId, { quantity });
};

export const fetchRazorpaySubscription = async (providerSubscriptionId: string) => {
    const { razorpayClient } = await import("@lib/razorpay/razorpay");
    return razorpayClient.subscriptions.fetch(providerSubscriptionId);
};
