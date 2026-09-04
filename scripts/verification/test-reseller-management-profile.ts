import assert from "node:assert/strict";
import {
    getResellerManagementDraftValidationError,
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
const validCreateDraft = {
    active: true,
    addressLine: "1 Market Road",
    city: "Bengaluru",
    country: "India",
    email: "new.reseller@neelvara.com",
    maxOfflineActivations: "20",
    name: "New Reseller",
    notes: "Local fixture",
    password: "LocalOnly!234",
    phone: "919876543210",
    postalCode: "560001",
    state: "Karnataka",
    username: "new_reseller",
};
assert.equal(
    getResellerManagementDraftValidationError(validCreateDraft, { isEditing: false }),
    null,
    "a valid reseller create draft must pass the shared mobile validation boundary",
);
assert.equal(
    getResellerManagementDraftValidationError({ ...validCreateDraft, email: "invalid-email" }, { isEditing: false }),
    "Enter a valid reseller email.",
);
assert.equal(
    getResellerManagementDraftValidationError({ ...validCreateDraft, username: "Invalid User" }, { isEditing: false }),
    "Username must use 3 to 50 lowercase letters, numbers, dots, underscores, or hyphens.",
);
assert.equal(
    getResellerManagementDraftValidationError({ ...validCreateDraft, maxOfflineActivations: "0" }, { isEditing: false }),
    "Maximum offline activations must be between 1 and 100.",
);
assert.equal(
    getResellerManagementDraftValidationError({ ...validCreateDraft, password: "" }, { isEditing: false }),
    "Password must be between 6 and 100 characters.",
);
assert.equal(
    getResellerManagementDraftValidationError({ ...validCreateDraft, password: "" }, { isEditing: true }),
    null,
    "an unchanged password remains optional during reseller profile edits",
);
assert.equal(
    getResellerManagementDraftValidationError({ ...validCreateDraft, password: "short" }, { isEditing: true }),
    "New password must be between 6 and 100 characters.",
    "a non-empty replacement password must satisfy the same lower bound",
);
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
