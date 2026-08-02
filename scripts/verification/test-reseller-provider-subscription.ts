import assert from "node:assert/strict";
import {
    projectResellerProviderSubscription,
    projectResellerProviderSubscriptionForAttempt,
} from "../../src/lib/reseller/resellerProviderSubscription";

assert.deepEqual(projectResellerProviderSubscription({
    id: "sub_Qa123",
    short_url: "https://rzp.io/i/example123",
}), {
    checkoutUrl: "https://rzp.io/i/example123",
    id: "sub_Qa123",
});
assert.equal(projectResellerProviderSubscription({
    id: "",
    short_url: "https://rzp.io/i/example123",
}), null);

const attempt = {
    locationCount: 2,
    operationFingerprint: 'a'.repeat(64),
    operationId: '2b167ac8-c4c1-4c90-aa8b-a2d3df7a4f18',
    planId: 'reseller_founder_400',
    providerPlanId: 'plan_Qa123',
    resellerId: 'reseller_auth_uid',
    storeId: 41,
    tenantId: 31,
};
const providerSubscription = {
    id: 'sub_Qa123',
    notes: {
        locationCount: '2',
        operationFingerprint: attempt.operationFingerprint,
        operationId: attempt.operationId,
        planId: attempt.planId,
        resellerId: attempt.resellerId,
        storeId: '41',
        tenantId: 31,
    },
    plan_id: attempt.providerPlanId,
    short_url: 'https://rzp.io/i/example123',
    status: 'created',
};
assert.deepEqual(projectResellerProviderSubscriptionForAttempt(providerSubscription, attempt), {
    checkoutUrl: 'https://rzp.io/i/example123',
    id: 'sub_Qa123',
});
for (const candidate of [
    { ...providerSubscription, status: 'cancelled' },
    { ...providerSubscription, plan_id: 'plan_other' },
    { ...providerSubscription, notes: { ...providerSubscription.notes, operationId: 'other' } },
    { ...providerSubscription, notes: { ...providerSubscription.notes, resellerId: 'other' } },
    { ...providerSubscription, notes: { ...providerSubscription.notes, storeId: 42 } },
    { ...providerSubscription, short_url: 'https://example.test/not-razorpay' },
]) {
    assert.equal(projectResellerProviderSubscriptionForAttempt(candidate, attempt), null);
}
assert.equal(projectResellerProviderSubscription({
    id: "sub/foreign",
    short_url: "https://rzp.io/i/example123",
}), null);
assert.equal(projectResellerProviderSubscription({
    id: "sub_Qa123",
    short_url: "https://example.test/not-razorpay",
}), null);
assert.equal(projectResellerProviderSubscription({
    id: 123,
    short_url: "https://rzp.io/i/example123",
}), null);

console.log("Reseller provider subscription boundary tests passed.");
