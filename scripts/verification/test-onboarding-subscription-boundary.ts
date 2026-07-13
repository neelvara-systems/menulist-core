#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    isCurrentUserAvailableForOnboarding,
} from '../../src/lib/onboarding/createTenantStore';
import {
    findOnboardingProviderSubscriptionForAttempt,
    isOnboardingProviderSubscription,
    resolveOnboardingPlanPrice,
} from '../../src/lib/onboarding/onboardingSubscriptionBoundary';

const session = {
    authIssuedAt: 1_800_000_000,
    uId: 'owner-1',
    user: {
        email: 'owner@example.com',
        id: 'owner-1',
    },
};
const currentUser = {
    active: true,
    authDisabled: false,
    deleted: false,
    email: 'owner@example.com',
    id: 'owner-1',
    isVerified: true,
    platformRole: 'OWNER',
};

assert.equal(isCurrentUserAvailableForOnboarding({
    documentId: 'owner-1',
    session,
    userData: currentUser,
}), true);

for (const userData of [
    { ...currentUser, tenantId: 1 },
    { ...currentUser, storeId: 2 },
    { ...currentUser, stores: [{ storeId: 2 }] },
    { ...currentUser, storeIds: [2] },
    { ...currentUser, stores: 'malformed' },
    { ...currentUser, authDisabled: true },
    { ...currentUser, email: 'another@example.com' },
]) {
    assert.equal(isCurrentUserAvailableForOnboarding({
        documentId: 'owner-1',
        session,
        userData,
    }), false, 'existing scope, malformed state, or stale identity must fail closed');
}

assert.deepEqual(resolveOnboardingPlanPrice({ price: 49_900, monthlyCredits: 75 }), {
    monthlyCredits: 75,
    price: 49_900,
});
for (const price of [
    null,
    { price: null, monthlyCredits: 75 },
    { price: -1, monthlyCredits: 75 },
    { price: 49_900.5, monthlyCredits: 75 },
    { price: 49_900, monthlyCredits: null },
    { price: 49_900, monthlyCredits: 'Custom' },
]) {
    assert.equal(resolveOnboardingPlanPrice(price), null, 'non-purchasable plan data must fail closed');
}

assert.equal(isOnboardingProviderSubscription({
    id: 'sub_Abc123',
    short_url: 'https://rzp.io/i/example',
    total_count: 36,
}), true);
for (const candidate of [
    { id: 'order_Abc123', short_url: 'https://rzp.io/i/example', total_count: 36 },
    { id: '', short_url: 'https://rzp.io/i/example', total_count: 36 },
    { id: 'sub_bad-id', short_url: 'https://rzp.io/i/example', total_count: 36 },
]) {
    assert.equal(isOnboardingProviderSubscription(candidate), false, 'malformed provider data must fail closed');
}
assert.equal(isOnboardingProviderSubscription({
    id: 'sub_Abc123',
    short_url: null,
    total_count: 0,
}), true, 'only the provider ID is authoritative; other fields are normalized or server-derived');

const providerCandidate = {
    id: 'sub_Recovered123',
    notes: {
        onboardingAttemptId: 'attempt-1',
        onboardingSource: 'WEBSITE_ONBOARDING',
        planId: 'starter',
        storeId: 22,
        tenantId: 11,
        userId: 'owner-1',
    },
    plan_id: 'plan_1',
    short_url: 'https://rzp.io/i/recovered',
};
assert.equal(findOnboardingProviderSubscriptionForAttempt({
    attemptId: 'attempt-1',
    candidates: [providerCandidate],
    planId: 'starter',
    providerPlanId: 'plan_1',
    storeId: 22,
    tenantId: 11,
    userId: 'owner-1',
})?.id, 'sub_Recovered123');
assert.equal(findOnboardingProviderSubscriptionForAttempt({
    attemptId: 'attempt-other',
    candidates: [providerCandidate],
    planId: 'starter',
    providerPlanId: 'plan_1',
    storeId: 22,
    tenantId: 11,
    userId: 'owner-1',
}), null, 'provider recovery must require the exact deterministic attempt identity');

process.stdout.write('Onboarding subscription boundary tests passed.\n');
