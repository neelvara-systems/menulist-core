export type RazorpayCheckoutConstructor = new (
    options: Record<string, unknown>,
) => { open(): void };

export const isRazorpayCheckoutReady = (
    value: unknown,
): value is RazorpayCheckoutConstructor => typeof value === 'function';

export const isRazorpayCheckoutConfigurationReady = (
    scriptLoaded: boolean,
    keyId: unknown,
): keyId is string => (
    scriptLoaded
    && typeof keyId === 'string'
    && /^rzp_(?:live|test)_[A-Za-z0-9]{8,128}$/.test(keyId)
);
