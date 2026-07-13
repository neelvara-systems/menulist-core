import assert from 'node:assert/strict';
import {
    buildAnswerlatticeOnboardingRequestFingerprint,
    findAnswerlatticeProviderSubscriptionForAttempt,
    getAnswerlatticeOnboardingTimestampMillis,
} from '../../src/lib/answerlattice/onboardingProvisioning';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '../../src/lib/razorpay/checkoutUrl';

const baseRequest = {
    billingModel: 'subscription' as const,
    businessDayEndTime: '23:00',
    companyName: 'Example Labs',
    currency: 'INR' as const,
    interval: 'MONTH' as const,
    planId: 'answerlattice_starter',
    primarySurfaces: ['settings', 'billing', 'billing'],
    productName: 'Example App',
    productUrl: 'https://app.example.com',
    supportEmail: 'Support@Example.com',
    timeZone: 'Asia/Kolkata',
};

const fingerprint = buildAnswerlatticeOnboardingRequestFingerprint(baseRequest);
assert.equal(fingerprint.length, 64, 'fingerprint must be a SHA-256 hex digest');
assert.equal(
    fingerprint,
    buildAnswerlatticeOnboardingRequestFingerprint({
        ...baseRequest,
        primarySurfaces: ['billing', 'settings'],
        supportEmail: 'support@example.com',
    }),
    'equivalent normalized requests must share one provisioning fingerprint',
);
assert.notEqual(
    fingerprint,
    buildAnswerlatticeOnboardingRequestFingerprint({ ...baseRequest, companyName: 'Different Labs' }),
    'material request changes must not resume a different provisioning attempt',
);

assert.equal(getAnswerlatticeOnboardingTimestampMillis(1_700_000_000_000), 1_700_000_000_000);
assert.equal(
    getAnswerlatticeOnboardingTimestampMillis({ seconds: 1_700_000_000, nanoseconds: 500_000_000 }),
    1_700_000_000_500,
);
assert.equal(getAnswerlatticeOnboardingTimestampMillis({ toMillis: () => 1234 }), 1234);
assert.equal(getAnswerlatticeOnboardingTimestampMillis({ seconds: 'invalid' }), 0);

const matchingNotes = {
    onboardingAttemptId: 'alo_attempt',
    planId: 'answerlattice_starter',
    productId: 'AL',
    storeId: 22,
    tenantId: 11,
};
const recovered = findAnswerlatticeProviderSubscriptionForAttempt({
    attemptId: 'alo_attempt',
    candidates: [
        { created_at: 10, id: 'sub_old', notes: matchingNotes, plan_id: 'plan_123' },
        { created_at: 20, id: 'sub_wrong_scope', notes: { ...matchingNotes, storeId: 99 }, plan_id: 'plan_123' },
        { created_at: 30, id: 'sub_new', notes: matchingNotes, plan_id: 'plan_123' },
        { created_at: 40, id: 'sub_wrong_product', notes: { ...matchingNotes, productId: 'ML' }, plan_id: 'plan_123' },
    ],
    planId: 'answerlattice_starter',
    providerPlanId: 'plan_123',
    storeId: 22,
    tenantId: 11,
});
assert.equal(recovered?.id, 'sub_new', 'recovery must select the newest exact attempt and scope match');
assert.equal(
    findAnswerlatticeProviderSubscriptionForAttempt({
        attemptId: 'alo_missing',
        candidates: [{ id: 'sub_1', notes: matchingNotes, plan_id: 'plan_123' }],
        planId: 'answerlattice_starter',
        providerPlanId: 'plan_123',
        storeId: 22,
        tenantId: 11,
    }),
    null,
    'recovery must fail closed when the provider attempt correlation does not match',
);

assert.equal(
    normalizeRazorpaySubscriptionCheckoutUrl('https://rzp.io/rzp/Dqdqx3h'),
    'https://rzp.io/rzp/Dqdqx3h',
    'documented Razorpay subscription checkout URLs must remain usable',
);
assert.equal(
    normalizeRazorpaySubscriptionCheckoutUrl('javascript:alert(1)'),
    null,
    'non-HTTPS checkout schemes must fail closed',
);
assert.equal(
    normalizeRazorpaySubscriptionCheckoutUrl('https://rzp.io.attacker.example/rzp/Dqdqx3h'),
    null,
    'lookalike checkout hosts must fail closed',
);
assert.equal(
    normalizeRazorpaySubscriptionCheckoutUrl('https://user:pass@rzp.io/rzp/Dqdqx3h'),
    null,
    'credential-bearing checkout URLs must fail closed',
);

process.stdout.write('Answerlattice onboarding provisioning contract tests passed.\n');
