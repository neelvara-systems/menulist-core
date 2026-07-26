import assert from "node:assert/strict";
import {
    addNonNegativeSafeIntegers,
    projectAddLocationReplay,
    projectResellerOfflineCapacity,
    projectResellerMutationProfileCounters,
    projectRenewReplay,
    resolveResellerMutationProfileId,
    resellerMutationDate,
} from "../../src/lib/reseller/resellerMutationState";

assert.equal(addNonNegativeSafeIntegers(100, 50), 150);
assert.equal(addNonNegativeSafeIntegers(Number.MAX_SAFE_INTEGER, 1), null);
assert.equal(addNonNegativeSafeIntegers("100", 50), null);
assert.equal(resellerMutationDate({ toDate: () => "not-a-date" }), null);
assert.equal(resellerMutationDate({ toMillis: () => Number.POSITIVE_INFINITY }), null);
assert.equal(resellerMutationDate({ toDate: () => { throw new Error("bad"); } }), null);
assert.equal(resolveResellerMutationProfileId("profile-1", "profile-1", false), "profile-1");
assert.equal(resolveResellerMutationProfileId(undefined, "profile-1", false), "profile-1");
assert.equal(resolveResellerMutationProfileId("profile-2", "profile-1", false), null);
assert.equal(resolveResellerMutationProfileId("profile/2", "profile-1", true), null);
assert.equal(resolveResellerMutationProfileId("profile-2", null, true), "profile-2");
assert.deepEqual(projectResellerOfflineCapacity({}, 20), { cap: 20, current: 0 });
assert.deepEqual(projectResellerOfflineCapacity({
    currentActiveOfflineStores: 2,
    maxOfflineActivations: 5,
}, 20), { cap: 5, current: 2 });
assert.equal(projectResellerOfflineCapacity({
    currentActiveOfflineStores: "2",
    maxOfflineActivations: 5,
}, 20), null);
assert.equal(projectResellerOfflineCapacity({
    currentActiveOfflineStores: 2,
    maxOfflineActivations: "5",
}, 20), null);
assert.deepEqual(projectResellerMutationProfileCounters({
    currentActiveOfflineStores: 1,
    maxOfflineActivations: 3,
    totalRevenueCollectedPaise: 100,
    totalTransactions: 2,
}, 50, { addOfflineSlot: true, defaultOfflineCap: 1 }), {
    status: "ok",
    updates: {
        currentActiveOfflineStores: 2,
        totalRevenueCollectedPaise: 150,
        totalTransactions: 3,
    },
});
assert.deepEqual(projectResellerMutationProfileCounters({
    currentActiveOfflineStores: 3,
    maxOfflineActivations: 3,
}, 50, { addOfflineSlot: true, defaultOfflineCap: 1 }), {
    cap: 3,
    status: "cap-exceeded",
});
assert.deepEqual(projectResellerMutationProfileCounters({
    totalRevenueCollectedPaise: "100",
}, 50, { addOfflineSlot: false, defaultOfflineCap: 1 }), { status: "invalid" });
assert.deepEqual(projectResellerMutationProfileCounters({
    totalRevenueCollectedPaise: Number.MAX_SAFE_INTEGER,
}, 1, { addOfflineSlot: false, defaultOfflineCap: 1 }), { status: "invalid" });

const addExpected = {
    locationCount: 2,
    operationId: "operation-1",
    resellerId: "actor-1",
    storeId: 101,
    subscriptionId: "subscription-1",
    tenantId: 201,
};
const addReplay = {
    action: "ADD_LOCATION",
    amountExpected: 20000,
    daysRemaining: 30,
    locationCount: 2,
    operationId: "operation-1",
    resellerId: "actor-1",
    storeId: 101,
    subscriptionId: "subscription-1",
    subscriptionQuantity: 3,
    tenantId: 201,
    validUntil: new Date("2026-08-25T00:00:00.000Z"),
};
assert(projectAddLocationReplay(addReplay, addExpected));
assert.equal(projectAddLocationReplay({ ...addReplay, amountExpected: "20000" }, addExpected), null);
assert.equal(projectAddLocationReplay({ ...addReplay, storeId: "101" }, addExpected), null);

const renewExpected = {
    durationMonths: 3,
    operationId: "operation-2",
    pricingTier: "FOUNDER_400",
    resellerId: "actor-1",
    storeId: 101,
    subscriptionId: "subscription-1",
    tenantId: 201,
};
const renewReplay = {
    action: "RENEW",
    amountExpected: 120000,
    commitmentMonths: 3,
    locationCount: 1,
    operationId: "operation-2",
    pricingTier: "FOUNDER_400",
    resellerId: "actor-1",
    storeId: 101,
    subscriptionId: "subscription-1",
    tenantId: 201,
    validFrom: new Date("2026-07-25T00:00:00.000Z"),
    validUntil: new Date("2026-10-25T00:00:00.000Z"),
};
assert(projectRenewReplay(renewReplay, renewExpected));
assert.equal(projectRenewReplay({ ...renewReplay, locationCount: 1.5 }, renewExpected), null);
assert.equal(projectRenewReplay({
    ...renewReplay,
    validUntil: renewReplay.validFrom,
}, renewExpected), null);

console.log("Reseller mutation-state boundary tests passed.");
