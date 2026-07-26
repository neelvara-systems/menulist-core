import assert from "node:assert/strict";
import {
    isResellerManagementProfilesResponse,
    projectResellerManagementProfile,
} from "../../src/lib/reseller/resellerManagementProfile";

const persisted = {
    active: true,
    addressLine: "",
    authUserId: "private-auth-user",
    currentActiveOfflineStores: 1,
    email: "reseller@example.test",
    id: "profile-1",
    maxOfflineActivations: 20,
    name: "Example Reseller",
    notes: "Founder note",
    password: "legacy-secret",
    phone: "919999999999",
    totalOfflineStores: 1,
    totalOnlineStores: 2,
    totalRevenueCollectedPaise: 120000,
    totalStoresOnboarded: 3,
    totalTransactions: 4,
    username: "example_reseller",
};
const projected = projectResellerManagementProfile(persisted);
assert(projected);
assert.equal("password" in projected, false);
assert.equal("authUserId" in projected, false);
assert.equal(projectResellerManagementProfile({ ...persisted, totalTransactions: -1 }), null);
assert.equal(projectResellerManagementProfile({ ...persisted, totalRevenueCollectedPaise: 1.5 }), null);
assert.equal(projectResellerManagementProfile({ ...persisted, maxOfflineActivations: "20" }), null);
assert.equal(isResellerManagementProfilesResponse({
    invalidProfileCount: 0,
    isCapped: false,
    isPartial: false,
    profiles: [projected],
}), true);
assert.equal(isResellerManagementProfilesResponse({
    invalidProfileCount: 1,
    isCapped: false,
    isPartial: false,
    profiles: [projected],
}), false);
assert.equal(isResellerManagementProfilesResponse({
    invalidProfileCount: 0,
    isCapped: false,
    isPartial: false,
    profiles: [{ ...projected, authUserId: "private-auth-user" }],
}), false);
assert.equal(isResellerManagementProfilesResponse({
    invalidProfileCount: 0,
    isCapped: true,
    isPartial: true,
    profiles: [projected],
}), true);

console.log("Reseller management profile boundary tests passed.");
