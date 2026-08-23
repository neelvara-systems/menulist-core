#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    isCurrentUserAvailableForOnboarding,
} from '../../src/lib/onboarding/createTenantStore';
import {
    findOnboardingProviderSubscriptionForAttempt,
    isOnboardingProviderSubscription,
    isMatchingOnboardingProviderSubscription,
    isMatchingPersistedOnboardingSubscription,
    isOwnedOnboardingProviderSubscriptionAttempt,
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
    notes: {},
    plan_id: 'plan_1',
    quantity: 1,
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
        planId: 'menulist_official',
        storeId: 22,
        tenantId: 11,
        userId: 'owner-1',
    },
    plan_id: 'plan_1',
    quantity: 1,
    short_url: 'https://rzp.io/i/recovered',
    total_count: 36,
};
const providerExpectation = {
    attemptId: 'attempt-1',
    candidate: providerCandidate,
    planId: 'menulist_official',
    quantity: 1,
    providerPlanId: 'plan_1',
    storeId: 22,
    tenantId: 11,
    totalCount: 36,
    userId: 'owner-1',
};
assert.equal(isMatchingOnboardingProviderSubscription(providerExpectation), true);
assert.equal(isOwnedOnboardingProviderSubscriptionAttempt(providerExpectation), true);
for (const candidate of [
    { ...providerCandidate, plan_id: 'plan_other' },
    { ...providerCandidate, quantity: 2 },
    { ...providerCandidate, total_count: 3 },
    { ...providerCandidate, notes: { ...providerCandidate.notes, onboardingAttemptId: 'attempt-other' } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, onboardingSource: 'OTHER' } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, planId: 'growth' } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, storeId: 23 } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, tenantId: 12 } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, userId: 'owner-2' } },
    { ...providerCandidate, notes: null },
]) {
    assert.equal(isMatchingOnboardingProviderSubscription({ ...providerExpectation, candidate }), false);
}
for (const candidate of [
    { ...providerCandidate, notes: { ...providerCandidate.notes, onboardingAttemptId: 'attempt-other' } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, onboardingSource: 'OTHER' } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, planId: 'growth' } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, storeId: 23 } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, tenantId: 12 } },
    { ...providerCandidate, notes: { ...providerCandidate.notes, userId: 'owner-2' } },
]) {
    assert.equal(isOwnedOnboardingProviderSubscriptionAttempt({ ...providerExpectation, candidate }), false);
}
assert.equal(isOwnedOnboardingProviderSubscriptionAttempt({
    ...providerExpectation,
    candidate: { ...providerCandidate, plan_id: 'plan_other', quantity: 2, total_count: 3 },
}), true, 'an exact owned attempt remains safe to cancel when its commercial response contract is invalid');
assert.equal(findOnboardingProviderSubscriptionForAttempt({
    attemptId: 'attempt-1',
    candidates: [providerCandidate],
    planId: 'menulist_official',
    quantity: 1,
    providerPlanId: 'plan_1',
    storeId: 22,
    tenantId: 11,
    totalCount: 36,
    userId: 'owner-1',
})?.id, 'sub_Recovered123');
assert.equal(findOnboardingProviderSubscriptionForAttempt({
    attemptId: 'attempt-other',
    candidates: [providerCandidate],
    planId: 'menulist_official',
    quantity: 1,
    providerPlanId: 'plan_1',
    storeId: 22,
    tenantId: 11,
    totalCount: 36,
    userId: 'owner-1',
}), null, 'provider recovery must require the exact deterministic attempt identity');

const persistedSubscription = {
    id: 'sub_Recovered123',
    paymentProvider: 'razorpay',
    pId: 'ML',
    planId: 'menulist_official',
    quantity: 1,
    productId: 'ML',
    providerStatus: 'active',
    providerSubscriptionId: 'sub_Recovered123',
    sId: 22,
    status: 'active',
    storeId: 22,
    tId: 11,
    tenantId: 11,
    uId: 'owner-1',
    userId: 'owner-1',
};
assert.equal(isMatchingPersistedOnboardingSubscription({
    planId: 'menulist_official',
    quantity: 1,
    providerSubscriptionId: 'sub_Recovered123',
    storeId: 22,
    subscription: persistedSubscription,
    tenantId: 11,
    userId: 'owner-1',
}), true, 'an exact persisted record remains authoritative even if a webhook already changed status');
for (const subscription of [
    { ...persistedSubscription, providerSubscriptionId: 'sub_Other123' },
    { ...persistedSubscription, pId: 'AL' },
    { ...persistedSubscription, productId: 'AL' },
    { ...persistedSubscription, tenantId: 12 },
    { ...persistedSubscription, tId: 12 },
    { ...persistedSubscription, storeId: 23 },
    { ...persistedSubscription, sId: 23 },
    { ...persistedSubscription, userId: 'owner-2' },
    { ...persistedSubscription, uId: 'owner-2' },
    { ...persistedSubscription, planId: 'growth' },
    { ...persistedSubscription, providerStatus: 'authenticated' },
    Object.fromEntries(Object.entries(persistedSubscription).filter(([key]) => key !== 'providerStatus')),
    Object.fromEntries(Object.entries(persistedSubscription).filter(([key]) => key !== 'productId')),
    Object.fromEntries(Object.entries(persistedSubscription).filter(([key]) => key !== 'tId')),
    Object.fromEntries(Object.entries(persistedSubscription).filter(([key]) => key !== 'sId')),
    Object.fromEntries(Object.entries(persistedSubscription).filter(([key]) => key !== 'uId')),
]) {
    assert.equal(isMatchingPersistedOnboardingSubscription({
        planId: 'menulist_official',
        quantity: 1,
        providerSubscriptionId: 'sub_Recovered123',
        storeId: 22,
        subscription,
        tenantId: 11,
        userId: 'owner-1',
    }), false, 'ambiguous persistence recovery must require exact local subscription identity');
}

process.stdout.write('Onboarding subscription boundary tests passed.\n');
