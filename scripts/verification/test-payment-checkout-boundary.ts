import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
    MAX_SUBSCRIPTION_QUANTITY,
    createCheckoutDismissedError,
    isPaymentCheckoutDismissedError,
    isRazorpayPaymentResponse,
    normalizeSubscriptionQuantity,
} from '../../src/lib/billing/paymentCheckoutBoundary';
import {
    getRazorpayManagedSubscriptionId,
    isRazorpayQuantityUpdateUnsupported,
    updateRazorpaySubscriptionQuantity,
} from '../../src/lib/billing/subscriptionProviderSync';
import {
    getAllowedSubscriptionTransitions,
    validateTransition,
} from '../../src/lib/billing/subscriptionStateMachine';
import { validateRazorpayWebhookSignature } from '../../src/lib/razorpay/webhook-validator';

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

const activeTransitions = getAllowedSubscriptionTransitions('active');
(activeTransitions as string[]).length = 0;
assert.equal(validateTransition('active', 'paused', 'test:immutable-transition-copy'), true);
assert.deepEqual(getAllowedSubscriptionTransitions('active'), [
    'past_due',
    'paused',
    'cancelled',
    'completed',
    'expired',
]);

assert.equal(getRazorpayManagedSubscriptionId({
    billingMode: 'manual',
    paymentProvider: 'razorpay',
    providerSubscriptionId: 'sub_manual123',
}), null);
assert.equal(getRazorpayManagedSubscriptionId({
    paymentProvider: 'razorpay',
    providerSubscriptionId: 'sub_valid123',
}), 'sub_valid123');
assert.equal(getRazorpayManagedSubscriptionId({
    paymentProvider: 'razorpay',
    providerSubscriptionId: ' sub_whitespace123 ',
}), null);
assert.doesNotThrow(() => getRazorpayManagedSubscriptionId({
    paymentProvider: 'razorpay',
    providerSubscriptionId: { toString: () => { throw new Error('must-not-coerce'); } } as unknown as string,
}));
assert.equal(isRazorpayQuantityUpdateUnsupported({
    error: { description: 'Payment mode is UPI and cannot be updated.' },
}), true);
assert.equal(isRazorpayQuantityUpdateUnsupported(new Proxy({}, {
    get() {
        throw new Error('provider-error-getter-failed');
    },
})), false);

async function runProviderBoundaryTests(): Promise<void> {
    await assert.rejects(
        updateRazorpaySubscriptionQuantity('not-a-subscription', 2),
        /razorpay_subscription_quantity_update_input_invalid/,
    );
    await assert.rejects(
        updateRazorpaySubscriptionQuantity('sub_valid123', MAX_SUBSCRIPTION_QUANTITY + 1),
        /razorpay_subscription_quantity_update_input_invalid/,
    );

    const body = '{"event":"subscription.charged"}';
    const secret = 'test_webhook_secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    assert.equal(await validateRazorpayWebhookSignature(body, signature, secret), true);
    assert.equal(await validateRazorpayWebhookSignature(body, signature.toUpperCase(), secret), false);
    assert.equal(await validateRazorpayWebhookSignature(body, 'a'.repeat(63), secret), false);

    console.log('Payment checkout boundary tests passed');
}

void runProviderBoundaryTests();
