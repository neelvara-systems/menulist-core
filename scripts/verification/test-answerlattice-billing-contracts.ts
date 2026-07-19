#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    parseRazorpaySubscriptionCheckoutResponse,
    parseRazorpayTopupCheckoutResponse,
    projectRazorpaySubscriptionCheckoutResponse,
    projectRazorpayTopupCheckoutResponse,
} from '../../src/lib/billing/paymentCheckoutBoundary';
import { formatBillingHistoryEvents } from '../../src/lib/billing/billingHistoryFormatter';
import {
    normalizeRazorpayInvoiceUrl,
    normalizeRazorpaySubscriptionCheckoutUrl,
} from '../../src/lib/razorpay/checkoutUrl';

assert.deepEqual(
    projectRazorpaySubscriptionCheckoutResponse({
        id: 'sub_Abc123',
        notes: { tenantId: 1, userId: 'private-user' },
        short_url: 'https://rzp.io/i/private',
        status: 'created',
    }),
    { subscription: { id: 'sub_Abc123' } },
    'subscription checkout projection must omit the provider entity',
);
assert.deepEqual(
    projectRazorpaySubscriptionCheckoutResponse({ id: 'sub_Reused123' }, true),
    { subscription: { id: 'sub_Reused123' }, reused: true },
);
assert.equal(projectRazorpaySubscriptionCheckoutResponse({ id: 'bad_subscription' }), null);
assert.deepEqual(
    parseRazorpaySubscriptionCheckoutResponse({ subscription: { id: 'sub_Abc123' } }),
    { subscription: { id: 'sub_Abc123' } },
);
assert.equal(
    parseRazorpaySubscriptionCheckoutResponse({
        subscription: { id: 'sub_Abc123', notes: { userId: 'private-user' } },
    }),
    null,
    'browser parser must reject extra provider fields',
);
assert.equal(
    parseRazorpaySubscriptionCheckoutResponse({
        subscription: { id: 'sub_Abc123' },
        notes: { tenantId: 1 },
    }),
    null,
);

assert.deepEqual(
    projectRazorpayTopupCheckoutResponse({
        id: 'order_Abc123',
        notes: { tenantId: 1, userId: 'private-user' },
        amount: 249900,
    }),
    { order: { id: 'order_Abc123' } },
    'top-up checkout projection must omit the provider entity',
);
assert.deepEqual(
    parseRazorpayTopupCheckoutResponse({ order: { id: 'order_Abc123' } }),
    { order: { id: 'order_Abc123' } },
);
assert.equal(
    parseRazorpayTopupCheckoutResponse({
        order: { id: 'order_Abc123', amount: 249900 },
    }),
    null,
);
assert.equal(projectRazorpayTopupCheckoutResponse({ id: 'order_bad-id' }), null);

for (const normalize of [
    normalizeRazorpaySubscriptionCheckoutUrl,
    normalizeRazorpayInvoiceUrl,
]) {
    assert.equal(normalize('https://rzp.io/i/example#private'), 'https://rzp.io/i/example');
    assert.equal(normalize('https://user:secret@rzp.io/i/example'), null);
    assert.equal(normalize('http://rzp.io/i/example'), null);
    assert.equal(normalize('https://evil.example/i/example'), null);
    assert.equal(normalize('javascript:alert(1)'), null);
}

const billingHistory = formatBillingHistoryEvents([
    {
        id: 'payment-safe',
        event: 'subscription.charged',
        created_at: 1_700_000_000,
        invoiceUrl: 'https://rzp.io/i/invoice-safe#private',
        amount: 1200,
        currency: 'INR',
        status: 'captured',
    },
    {
        id: 'payment-unsafe',
        event: 'subscription.charged',
        created_at: 1_700_000_001,
        invoiceUrl: 'javascript:alert(1)',
        amount: 1200,
        currency: 'INR',
        status: 'captured',
    },
]);
assert.equal(billingHistory[0]?.invoiceUrl, 'https://rzp.io/i/invoice-safe');
assert.equal(billingHistory[1]?.invoiceUrl, undefined);

process.stdout.write('Answerlattice billing response and URL contracts passed.\n');
