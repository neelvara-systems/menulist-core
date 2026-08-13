#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import * as appLifecycle from '../../src/data/shared/razorpaySubscriptionLifecycle';
import * as functionsLifecycle from '../../functions/src/sharedData/razorpaySubscriptionLifecycle';
import {
    resolveRazorpayAuthenticatedSubscriptionState,
} from '../../src/lib/billing/razorpayRevenueProjectionBoundary';
import {
    getAllowedSubscriptionTransitions,
} from '../../src/lib/billing/subscriptionStateMachine';

const expectedEvents = [
    'subscription.authenticated',
    'subscription.activated',
    'subscription.charged',
    'subscription.completed',
    'subscription.updated',
    'subscription.pending',
    'subscription.halted',
    'subscription.cancelled',
    'subscription.paused',
    'subscription.resumed',
] as const;

assert.deepEqual(appLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_EVENTS, expectedEvents);
assert.deepEqual(
    functionsLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_EVENTS,
    appLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_EVENTS,
);
assert.deepEqual(
    functionsLifecycle.RAZORPAY_PROVIDER_SUBSCRIPTION_STATUS_MAP,
    appLifecycle.RAZORPAY_PROVIDER_SUBSCRIPTION_STATUS_MAP,
);
assert.deepEqual(
    functionsLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES,
    appLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES,
);

for (const event of expectedEvents) {
    assert.ok(appLifecycle.getRazorpaySubscriptionWebhookPolicy(event), `${event} policy is missing`);
}
assert.equal(appLifecycle.getRazorpaySubscriptionWebhookPolicy('subscription.unknown'), null);
assert.deepEqual(
    expectedEvents.filter((event) => (
        appLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES[event].settlesCapturedPayment
    )),
    ['subscription.charged'],
    'only subscription.charged may settle captured money',
);
const expectedProviderStatuses = {
    'subscription.authenticated': ['authenticated'],
    'subscription.activated': ['active'],
    'subscription.charged': ['active'],
    'subscription.completed': ['completed'],
    'subscription.updated': appLifecycle.RAZORPAY_PROVIDER_SUBSCRIPTION_STATUSES,
    'subscription.pending': ['pending'],
    'subscription.halted': ['halted'],
    'subscription.cancelled': ['cancelled'],
    'subscription.paused': ['paused'],
    'subscription.resumed': ['active'],
} as const;
for (const event of expectedEvents) {
    assert.deepEqual(
        appLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES[event].expectedProviderStatuses,
        expectedProviderStatuses[event],
        `${event} provider statuses`,
    );
    for (const status of appLifecycle.RAZORPAY_PROVIDER_SUBSCRIPTION_STATUSES) {
        assert.equal(
            appLifecycle.isRazorpaySubscriptionWebhookProviderStatusValid(event, status),
            expectedProviderStatuses[event].includes(status as never),
            `${event} must validate ${status} exactly`,
        );
    }
}
assert.equal(
    appLifecycle.isRazorpaySubscriptionWebhookProviderStatusValid('subscription.unknown', 'active'),
    false,
);

assert.deepEqual(appLifecycle.RAZORPAY_PROVIDER_SUBSCRIPTION_STATUS_MAP, {
    created: 'pending',
    authenticated: 'pending',
    active: 'active',
    pending: 'past_due',
    halted: 'past_due',
    paused: 'paused',
    cancelled: 'cancelled',
    completed: 'completed',
    expired: 'expired',
});
assert.equal(appLifecycle.resolveRazorpayProviderSubscriptionStatus('authenticated'), 'authenticated');
assert.equal(appLifecycle.resolveRazorpayProviderSubscriptionStatus('unknown'), null);
assert.equal(appLifecycle.RAZORPAY_SUBSCRIPTION_WEBHOOK_POLICIES['subscription.activated'].nextStatus, null);
assert.equal(appLifecycle.resolveRazorpayCheckoutVerificationOutcome('created'), 'processing');
assert.equal(appLifecycle.resolveRazorpayCheckoutVerificationOutcome('authenticated'), 'processing');
assert.equal(appLifecycle.resolveRazorpayCheckoutVerificationOutcome('active'), 'active');
for (const status of ['pending', 'halted', 'paused', 'cancelled', 'completed', 'expired', 'unknown']) {
    assert.equal(
        appLifecycle.resolveRazorpayCheckoutVerificationOutcome(status),
        null,
        `${status} must not be accepted as a successful checkout verification outcome`,
    );
}

const emandateCreatedAtSeconds = 1_800_000_000;
const emandateCreatedAtMillis = emandateCreatedAtSeconds * 1000;
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({
    status: 'created',
    payment_method: null,
    created_at: emandateCreatedAtSeconds,
}, emandateCreatedAtMillis), 'checkout');
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({
    status: 'created',
    payment_method: 'card',
    created_at: emandateCreatedAtSeconds,
}, emandateCreatedAtMillis), 'checkout');
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({
    status: 'created',
    payment_method: 'emandate',
    created_at: emandateCreatedAtSeconds,
}, emandateCreatedAtMillis + appLifecycle.RAZORPAY_EMANDATE_CONFIRMATION_WINDOW_MS), 'processing');
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({
    status: 'created',
    payment_method: 'emandate',
    created_at: emandateCreatedAtSeconds,
}, emandateCreatedAtMillis + appLifecycle.RAZORPAY_EMANDATE_CONFIRMATION_WINDOW_MS + 1), 'replace');
for (const status of ['authenticated', 'active', 'pending', 'halted', 'paused']) {
    assert.equal(
        appLifecycle.resolveRazorpayPendingCheckoutAction({ status }, emandateCreatedAtMillis),
        'processing',
        `${status} must not create a duplicate checkout`,
    );
}
for (const status of ['cancelled', 'completed', 'expired']) {
    assert.equal(
        appLifecycle.resolveRazorpayPendingCheckoutAction({ status }, emandateCreatedAtMillis),
        'replace',
        `${status} permits a replacement checkout`,
    );
}
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({
    status: 'created',
    payment_method: 'emandate',
    created_at: emandateCreatedAtSeconds + 1,
}, emandateCreatedAtMillis), null);
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({
    status: 'created',
    payment_method: 'emandate',
}, emandateCreatedAtMillis), null);
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction({ status: 'unknown' }, emandateCreatedAtMillis), null);
assert.equal(appLifecycle.resolveRazorpayPendingCheckoutAction(null, emandateCreatedAtMillis), null);
assert.ok(getAllowedSubscriptionTransitions('pending').includes('expired'));

const authenticatedState = resolveRazorpayAuthenticatedSubscriptionState({
    charge_at: 1_800_000_000,
    paid_count: 0,
    quantity: 2,
    start_at: 1_700_000_000,
    total_count: 12,
});
assert.deepEqual(authenticatedState, {
    chargeAtMillis: 1_800_000_000_000,
    chargeAtSeconds: 1_800_000_000,
    paidCount: 0,
    quantity: 2,
    startAtMillis: 1_700_000_000_000,
    startAtSeconds: 1_700_000_000,
    totalCount: 12,
});
assert.equal(resolveRazorpayAuthenticatedSubscriptionState({
    charge_at: 1_600_000_000,
    paid_count: 0,
    quantity: 1,
    start_at: 1_700_000_000,
    total_count: 12,
}), null);

console.log('Razorpay subscription lifecycle contract tests passed (10/10 events).');
