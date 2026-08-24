import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS,
    answerlatticeProviderSubscriptionMatchesAttempt,
    buildAnswerlatticeOnboardingRequestFingerprint,
    findAnswerlatticeProviderSubscriptionForAttempt,
    getAnswerlatticeProviderSubscriptionCheckoutUrl,
    getAnswerlatticeOnboardingPositiveInteger,
    getAnswerlatticeOnboardingTimestampMillis,
    isAnswerlatticeTerminalProviderSubscriptionStatus,
    shouldHoldAnswerlatticeOnboardingProviderRecovery,
} from '../../src/lib/answerlattice/onboardingProvisioning';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '../../src/lib/razorpay/checkoutUrl';
import { normalizeAnswerlatticeOnboardResult } from '../../src/lib/answerlattice/onboardingResponse';

const baseRequest = {
    billingProfile: {
        legalName: 'Example Labs Private Limited',
        email: 'billing@example.com',
        countryCode: 'IN',
        addressLine1: '1 Example Road',
        city: 'Bengaluru',
        region: 'Karnataka',
        indianStateCode: '29',
        postalCode: '560001',
    },
    billingModel: 'subscription' as const,
    businessDayEndTime: '23:00',
    companyName: 'Example Labs',
    currency: 'INR' as const,
    interval: 'MONTH' as const,
    planId: 'answerlattice_launch',
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
assert.equal(getAnswerlatticeOnboardingTimestampMillis({ seconds: '1700000000', nanoseconds: 0 }), 0);
assert.equal(getAnswerlatticeOnboardingTimestampMillis({ toMillis: () => '1234' }), 0);
assert.equal(getAnswerlatticeOnboardingTimestampMillis({ seconds: 1, nanoseconds: 1_000_000_000 }), 0);
assert.doesNotThrow(() => {
    assert.equal(getAnswerlatticeOnboardingTimestampMillis({
        get toMillis() {
            throw new Error('hostile timestamp getter');
        },
    }), 0);
});
assert.doesNotThrow(() => {
    assert.equal(getAnswerlatticeOnboardingTimestampMillis({
        toMillis() {
            throw new Error('hostile timestamp conversion');
        },
    }), 0);
});
assert.equal(getAnswerlatticeOnboardingPositiveInteger(36), 36);
for (const invalidPositiveInteger of ['36', true, 0, -1, 1.5, Number.POSITIVE_INFINITY]) {
    assert.equal(
        getAnswerlatticeOnboardingPositiveInteger(invalidPositiveInteger),
        null,
        'billing and provider counts must not coerce malformed scalars',
    );
}

const matchingNotes = {
    onboardingAttemptId: 'alo_attempt',
    planId: 'answerlattice_launch',
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
    planId: 'answerlattice_launch',
    providerPlanId: 'plan_123',
    storeId: 22,
    tenantId: 11,
});
assert.equal(recovered?.id, 'sub_new', 'recovery must select the newest exact attempt and scope match');
assert.equal(
    answerlatticeProviderSubscriptionMatchesAttempt({
        attemptId: 'alo_attempt',
        candidate: { id: 'sub_active', notes: matchingNotes, plan_id: 'plan_123', status: 'active' },
        planId: 'answerlattice_launch',
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
        planId: 'answerlattice_launch',
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
        planId: 'answerlattice_launch',
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
        planId: 'answerlattice_launch',
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
assert.equal(
    getAnswerlatticeProviderSubscriptionCheckoutUrl({ short_url: 'https://rzp.io/rzp/Dqdqx3h' }),
    'https://rzp.io/rzp/Dqdqx3h',
    'an exact hosted provider checkout must be admitted before local finalization',
);
for (const short_url of [undefined, null, '', 'https://example.com/checkout', 'javascript:alert(1)']) {
    assert.equal(
        getAnswerlatticeProviderSubscriptionCheckoutUrl({ short_url }),
        null,
        'missing or untrusted provider checkout URLs must not become durable payment-pending truth',
    );
}
const hostileProviderCheckoutCandidate: Parameters<typeof getAnswerlatticeProviderSubscriptionCheckoutUrl>[0] = {};
Object.defineProperty(hostileProviderCheckoutCandidate, 'short_url', {
    get() {
        throw new Error('hostile provider checkout getter');
    },
});
assert.doesNotThrow(() => {
    assert.equal(getAnswerlatticeProviderSubscriptionCheckoutUrl(hostileProviderCheckoutCandidate), null);
});

const validOnboardResponse = {
    apiKey: `al_${'a'.repeat(32)}`,
    billing: {
        amount: 149_900,
        currency: 'INR',
        interval: 'MONTH',
    },
    recovered: false,
    subscription: {
        id: 'sub_answerlattice_123',
        shortUrl: 'https://rzp.io/rzp/Dqdqx3h#discarded',
        status: 'created',
    },
    plan: {
        id: 'answerlattice_launch',
        isBeta: false,
        name: 'Launch',
    },
    widgetKeyNeedsRotation: false,
    workspaceCreated: true,
};
assert.deepEqual(
    normalizeAnswerlatticeOnboardResult(validOnboardResponse),
    {
        ...validOnboardResponse,
        subscription: {
            ...validOnboardResponse.subscription,
            shortUrl: 'https://rzp.io/rzp/Dqdqx3h',
        },
    },
    'the browser acknowledgement must contain canonical current plan, amount, checkout and one-time key truth',
);
assert.equal(
    normalizeAnswerlatticeOnboardResult({
        ...validOnboardResponse,
        billing: { ...validOnboardResponse.billing, amount: 1 },
    }),
    null,
    'a positive but incorrect provider amount must not become displayed billing truth',
);
assert.equal(
    normalizeAnswerlatticeOnboardResult({
        ...validOnboardResponse,
        apiKey: 'not-an-answerlattice-key',
    }),
    null,
    'a malformed one-time widget key must not become successful setup truth',
);
assert.equal(
    normalizeAnswerlatticeOnboardResult({
        ...validOnboardResponse,
        subscription: {
            ...validOnboardResponse.subscription,
            shortUrl: 'https://rzp.io.attacker.example/checkout',
        },
    }),
    null,
    'lookalike checkout hosts must invalidate the complete onboarding acknowledgement',
);
assert.equal(
    normalizeAnswerlatticeOnboardResult({
        ...validOnboardResponse,
        apiKey: null,
        recovered: true,
        subscription: {
            ...validOnboardResponse.subscription,
            status: 'pending',
        },
        widgetKeyNeedsRotation: true,
    })?.apiKey,
    null,
    'a recovered payment-pending workspace may require a new widget key without inventing the lost plaintext',
);

process.stdout.write('Answerlattice onboarding provisioning contract tests passed.\n');
