const RAZORPAY_SUBSCRIPTION_CHECKOUT_HOST = 'rzp.io';

/**
 * Razorpay subscription APIs return an HTTPS `rzp.io` authorisation URL.
 * Treat the provider value as untrusted at both the server and browser boundary.
 */
export function normalizeRazorpaySubscriptionCheckoutUrl(value: unknown): string | null {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw || raw.length > 500) return null;

    try {
        const url = new URL(raw);
        if (
            url.protocol !== 'https:'
            || url.hostname.toLowerCase() !== RAZORPAY_SUBSCRIPTION_CHECKOUT_HOST
            || Boolean(url.username)
            || Boolean(url.password)
            || (url.port && url.port !== '443')
        ) {
            return null;
        }
        url.hash = '';
        return url.toString();
    } catch {
        return null;
    }
}
