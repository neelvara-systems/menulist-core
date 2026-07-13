import assert from 'node:assert/strict';
import {
    MAX_SUBSCRIPTION_QUANTITY,
    createCheckoutDismissedError,
    isPaymentCheckoutDismissedError,
    isRazorpayPaymentResponse,
    normalizeSubscriptionQuantity,
} from '../../src/lib/billing/paymentCheckoutBoundary';

assert.equal(normalizeSubscriptionQuantity(1), 1);
assert.equal(normalizeSubscriptionQuantity(7), 7);
assert.equal(normalizeSubscriptionQuantity('7'), 7);
assert.equal(normalizeSubscriptionQuantity(undefined), 1);
for (const invalidQuantity of [
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    MAX_SUBSCRIPTION_QUANTITY + 1,
    '01',
    ' 2 ',
    '',
    true,
    null,
]) {
    assert.throws(
        () => normalizeSubscriptionQuantity(invalidQuantity),
        (error: unknown) => error instanceof Error
            && 'code' in error
            && error.code === 'payment_subscription_quantity_invalid',
    );
}

const topupResponse = {
    razorpay_payment_id: 'pay_123',
    razorpay_signature: 'abc_DEF-123',
};
assert.equal(isRazorpayPaymentResponse(topupResponse, 'topup'), true);
assert.equal(isRazorpayPaymentResponse(topupResponse, 'subscription'), false);
assert.equal(isRazorpayPaymentResponse({
    ...topupResponse,
    razorpay_subscription_id: 'sub_123',
}, 'subscription'), true);

for (const invalid of [
    null,
    [],
    {},
    { razorpay_payment_id: '', razorpay_signature: 'sig' },
    { razorpay_payment_id: 'pay_123', razorpay_signature: '   ' },
    { razorpay_payment_id: 'pay/123', razorpay_signature: 'sig' },
    { razorpay_payment_id: 'p'.repeat(513), razorpay_signature: 'sig' },
]) {
    assert.equal(isRazorpayPaymentResponse(invalid, 'topup'), false);
}

const dismissedError = createCheckoutDismissedError();
assert.equal(isPaymentCheckoutDismissedError(dismissedError), true);
assert.equal(isPaymentCheckoutDismissedError(new Error('other')), false);
assert.equal(isPaymentCheckoutDismissedError('payment_checkout_dismissed'), false);

console.log('Payment checkout boundary tests passed');
