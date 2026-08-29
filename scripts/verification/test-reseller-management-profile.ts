import assert from "node:assert/strict";
import {
    isResellerManagementDraftChanged,
    isResellerManagementProfilesResponse,
    projectResellerManagementProfile,
} from "../../src/lib/reseller/resellerManagementProfile";
import { projectResellerProfileRecord } from "../../src/lib/reseller/resellerProfileRecord";
import { Timestamp } from 'firebase/firestore';

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
assert.equal(isResellerManagementDraftChanged({
    active: true,
    addressLine: "",
    city: "",
    country: "",
    email: " RESELLER@EXAMPLE.TEST ",
    maxOfflineActivations: "20",
    name: " Example Reseller ",
    notes: " Founder note ",
    password: "",
    phone: "919999999999",
    postalCode: "",
    state: "",
    username: " EXAMPLE_RESELLER ",
}, projected), false, "equivalent desktop/mobile drafts must not enter the reseller write path");
assert.equal(isResellerManagementDraftChanged({
    ...projected,
    password: "new-password",
}, projected), true, "a replacement password remains a material reseller change");
assert.equal(isResellerManagementDraftChanged({
    ...projected,
    active: false,
}, projected), true, "lifecycle changes remain writable");
assert.equal(projectResellerManagementProfile({ ...persisted, totalTransactions: -1 }), null);
assert.equal(projectResellerManagementProfile({ ...persisted, totalRevenueCollectedPaise: 1.5 }), null);
assert.equal(projectResellerManagementProfile({ ...persisted, maxOfflineActivations: "20" }), null);
assert.equal(isResellerManagementProfilesResponse({
    invalidProfileCount: 0,
    isCapped: false,
    isPartial: false,
    profiles: [projected],
}), true);

const runtimeProfile = projectResellerProfileRecord('profile-1', {
    ...persisted,
    activatedAt: Timestamp.now(),
    createdOn: Timestamp.now(),
    modifiedOn: Timestamp.now(),
});
assert(runtimeProfile);
assert.equal(runtimeProfile.id, 'profile-1');
assert.equal(runtimeProfile.authUserId, 'private-auth-user');
assert.equal('password' in runtimeProfile, false, 'legacy password fields must not enter authority records');
assert.equal(projectResellerProfileRecord('../profile-1', persisted), null);
assert.equal(projectResellerProfileRecord('profile-1', { ...persisted, active: 'true' }), null);
assert.equal(projectResellerProfileRecord('profile-1', { ...persisted, totalTransactions: -1 }), null);
assert.equal(projectResellerProfileRecord('profile-1', { ...persisted, deleted: true }), null);
assert.equal(projectResellerProfileRecord('profile-1', {
    ...persisted,
    modifiedOn: { seconds: 1 },
}), null);
assert.deepEqual(projectResellerProfileRecord('legacy-profile', {
    active: true,
    authUserId: 'legacy-actor',
    email: 'legacy@example.test',
}), {
    active: true,
    authUserId: 'legacy-actor',
    email: 'legacy@example.test',
    id: 'legacy-profile',
}, 'legacy authority rows may omit non-authority display and counter fields');
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
