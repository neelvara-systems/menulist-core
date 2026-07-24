import assert from 'node:assert/strict';
import { admitManualSubscriptionConfirmation } from '../../src/lib/billing/manualSubscriptionConfirmation';

const baseSubscription = {
    amount: 299_900,
    billingMode: 'manual',
    currency: 'INR',
    manualPaymentConfirmed: false,
    pId: 'ML',
    planId: 'plan_founder_annual',
    productId: 'ML',
    resellerId: 'reseller_valid',
    sId: 41,
    status: 'pending',
    statuses: [],
    storeId: 41,
    tId: 31,
    tenantId: 31,
};

const admit = (subscriptionData: unknown, actorId = 'reseller_valid', isPlatformUser = false) => (
    admitManualSubscriptionConfirmation({ actorId, isPlatformUser, subscriptionData })
);

assert.equal(admit(baseSubscription).kind, 'eligible');
assert.equal(admit({ ...baseSubscription, productId: undefined }).kind, 'malformed');
assert.equal(admit({ ...baseSubscription, pId: undefined }).kind, 'malformed');
assert.equal(admit({
    ...baseSubscription,
    status: 'active',
    manualPaymentConfirmed: true,
}).kind, 'already_confirmed');
assert.equal(admit(baseSubscription, 'platform_user', true).kind, 'eligible');

for (const status of ['active', 'cancelled', 'completed', 'expired', 'past_due']) {
    assert.equal(
        admit({ ...baseSubscription, status, manualPaymentConfirmed: false }).kind,
        'invalid_state',
        `${status} subscriptions must not be reactivated`,
    );
}

assert.equal(admit(baseSubscription, 'another_reseller').kind, 'forbidden');
assert.equal(admit(baseSubscription, 'bad/id').kind, 'forbidden');
assert.equal(admit({ ...baseSubscription, resellerId: 'bad/id' }).kind, 'forbidden');
assert.equal(admit({ ...baseSubscription, billingMode: 'online' }).kind, 'wrong_mode');

const malformedCases: unknown[] = [
    null,
    { ...baseSubscription, amount: '299900' },
    { ...baseSubscription, amount: Number.MAX_SAFE_INTEGER + 1 },
    { ...baseSubscription, currency: 'USD' },
    { ...baseSubscription, manualPaymentConfirmed: 'true' },
    { ...baseSubscription, pId: 'AL' },
    { ...baseSubscription, productId: 'ML', pId: 'AL' },
    { ...baseSubscription, storeId: 41, sId: 42 },
    { ...baseSubscription, tenantId: '031', tId: 31 },
    { ...baseSubscription, statuses: {} },
    { ...baseSubscription, statuses: Array.from({ length: 200 }, () => ({})) },
    { ...baseSubscription, planId: ' plan_founder_annual' },
];

for (const candidate of malformedCases) {
    assert.equal(admit(candidate).kind, 'malformed');
}

console.log('Reseller manual payment confirmation boundary tests passed.');
