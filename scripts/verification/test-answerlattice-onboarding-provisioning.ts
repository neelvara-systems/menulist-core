import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS,
    answerlatticeProviderSubscriptionMatchesAttempt,
    buildAnswerlatticeOnboardingRequestFingerprint,
    findAnswerlatticeProviderSubscriptionForAttempt,
    getAnswerlatticeOnboardingTimestampMillis,
    isAnswerlatticeTerminalProviderSubscriptionStatus,
    shouldHoldAnswerlatticeOnboardingProviderRecovery,
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
        { created_at: 10, id: 'sub_old', notes: matchingNotes, plan_id: 'plan_123', status: 'created' },
        { created_at: 20, id: 'sub_wrong_scope', notes: { ...matchingNotes, storeId: 99 }, plan_id: 'plan_123', status: 'created' },
        { created_at: 30, id: 'sub_new', notes: matchingNotes, plan_id: 'plan_123', status: 'created' },
        { created_at: 35, id: 'sub_active', notes: matchingNotes, plan_id: 'plan_123', status: 'active' },
        { created_at: 40, id: 'sub_wrong_product', notes: { ...matchingNotes, productId: 'ML' }, plan_id: 'plan_123', status: 'created' },
    ],
    planId: 'answerlattice_starter',
    providerPlanId: 'plan_123',
    storeId: 22,
    tenantId: 11,
});
assert.equal(recovered?.id, 'sub_new', 'recovery must select the newest exact attempt and scope match');
assert.equal(
    answerlatticeProviderSubscriptionMatchesAttempt({
        attemptId: 'alo_attempt',
        candidate: { id: 'sub_active', notes: matchingNotes, plan_id: 'plan_123', status: 'active' },
        planId: 'answerlattice_starter',
        providerPlanId: 'plan_123',
        storeId: 22,
        tenantId: 11,
    }),
    true,
    'stored provider recovery must validate exact ownership independently from provider status',
);
assert.equal(
    answerlatticeProviderSubscriptionMatchesAttempt({
        attemptId: 'alo_attempt',
        candidate: { id: 'sub_active', notes: { ...matchingNotes, tenantId: '11x' }, plan_id: 'plan_123', status: 'active' },
        planId: 'answerlattice_starter',
        providerPlanId: 'plan_123',
        storeId: 22,
        tenantId: 11,
    }),
    false,
    'provider scope matching must not coerce malformed tenant identifiers',
);
assert.equal(
    findAnswerlatticeProviderSubscriptionForAttempt({
        attemptId: 'alo_missing',
        candidates: [{ id: 'sub_1', notes: matchingNotes, plan_id: 'plan_123', status: 'created' }],
        planId: 'answerlattice_starter',
        providerPlanId: 'plan_123',
        storeId: 22,
        tenantId: 11,
    }),
    null,
    'recovery must fail closed when the provider attempt correlation does not match',
);
assert.equal(
    findAnswerlatticeProviderSubscriptionForAttempt({
        attemptId: 'alo_attempt',
        candidates: [{ id: 'sub_active', notes: matchingNotes, plan_id: 'plan_123', status: 'active' }],
        planId: 'answerlattice_starter',
        providerPlanId: 'plan_123',
        storeId: 22,
        tenantId: 11,
    }),
    null,
    'onboarding recovery must not reinterpret an active provider object as a fresh checkout',
);
for (const status of ['cancelled', 'completed', 'expired']) {
    assert.equal(
        isAnswerlatticeTerminalProviderSubscriptionStatus(status),
        true,
        `${status} provider subscriptions must be recognized as unusable checkout terminals`,
    );
}
for (const status of ['created', 'authenticated', 'active', 'pending', 'halted', 'unknown']) {
    assert.equal(
        isAnswerlatticeTerminalProviderSubscriptionStatus(status),
        false,
        `${status} provider subscriptions must not be treated as terminal checkouts`,
    );
}

const recoveryStartedAt = 1_700_000_000_000;
assert.equal(
    shouldHoldAnswerlatticeOnboardingProviderRecovery({
        nowMillis: recoveryStartedAt,
        recoveryAvailableAt: recoveryStartedAt + ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS,
    }),
    true,
    'an unknown provider outcome must remain held before its recovery window opens',
);
assert.equal(
    shouldHoldAnswerlatticeOnboardingProviderRecovery({
        nowMillis: recoveryStartedAt + ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS,
        recoveryAvailableAt: recoveryStartedAt + ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS,
    }),
    false,
    'the same attempt may query provider recovery after the bounded hold',
);
assert.equal(
    shouldHoldAnswerlatticeOnboardingProviderRecovery({
        nowMillis: recoveryStartedAt,
        providerSubscriptionId: 'sub_known',
    }),
    false,
    'a stored provider subscription can be verified immediately without creating another one',
);
assert.equal(
    shouldHoldAnswerlatticeOnboardingProviderRecovery({ nowMillis: recoveryStartedAt }),
    true,
    'a malformed recovery state with no provider id or timestamp must fail closed',
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
