const RAZORPAY_PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]+$/;

export function isExactRazorpayPaymentId(value: unknown): value is string {
    return typeof value === 'string' && RAZORPAY_PAYMENT_ID_PATTERN.test(value);
}

export function getExactRazorpayPaymentHistory(subscription: Record<string, any>): string[] {
    return Array.isArray(subscription.billingHistory)
        ? subscription.billingHistory.filter(isExactRazorpayPaymentId)
        : [];
}

export function hasVerifiedSubscriptionPaymentEvidence(
    subscription: Record<string, any>,
): boolean {
    if (subscription.billingMode === 'manual') {
        return subscription.manualPaymentConfirmed === true;
    }
    if (subscription.billingMode !== undefined && subscription.billingMode !== 'auto') return false;
    if (subscription.paymentProvider !== 'razorpay') return false;
    return getExactRazorpayPaymentHistory(subscription).length > 0;
}
