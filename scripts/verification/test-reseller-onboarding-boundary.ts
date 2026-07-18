import assert from 'node:assert/strict';
import {
    getResellerOnboardingOperationFingerprint,
    isMatchingResellerOnboardingOperation,
} from '../../src/lib/reseller/resellerOnboardingOperation';
import { isActiveResellerProfileForSession } from '../../src/lib/reseller/resellerProfileAuthority';

const input = {
    billingInterval: 'MONTH' as const,
    businessName: 'Boundary Cafe',
    businessType: 'restaurant',
    commitmentMonths: 3,
    locationCount: 1,
    ownerLoginEmail: 'owner@example.com',
    ownerPassword: 'owner-password',
    ownerUsername: '919999999999',
    paymentMode: 'offline' as const,
    pricingTier: 'FOUNDER_400',
};

const fingerprint = getResellerOnboardingOperationFingerprint(input);
assert.equal(fingerprint.length, 64);
assert.equal(getResellerOnboardingOperationFingerprint({ ...input }), fingerprint);
assert.notEqual(getResellerOnboardingOperationFingerprint({ ...input, ownerPassword: 'changed-password' }), fingerprint);
assert.notEqual(getResellerOnboardingOperationFingerprint({ ...input, locationCount: 2 }), fingerprint);

const operationId = '2b167ac8-c4c1-4c90-aa8b-a2d3df7a4f18';
const operation = {
    action: 'ONBOARD',
    operationFingerprint: fingerprint,
    operationId,
    resellerId: 'reseller_auth_uid',
    storeId: 41,
    subscriptionId: 'manual_operation',
    tenantId: 31,
};
assert.equal(isMatchingResellerOnboardingOperation({
    fingerprint,
    operationData: operation,
    operationId,
    resellerId: 'reseller_auth_uid',
}), true);
assert.equal(isMatchingResellerOnboardingOperation({
    fingerprint,
    operationData: { ...operation, resellerId: 'another_reseller' },
    operationId,
    resellerId: 'reseller_auth_uid',
}), false);
assert.equal(isMatchingResellerOnboardingOperation({
    fingerprint,
    operationData: { ...operation, operationFingerprint: 'different' },
    operationId,
    resellerId: 'reseller_auth_uid',
}), false);

const profile = {
    active: true,
    authUserId: 'reseller_auth_uid',
    email: 'reseller@example.com',
    id: 'legacy_profile_id',
} as any;
assert.equal(isActiveResellerProfileForSession({
    actorId: 'reseller_auth_uid',
    profile,
    sessionEmail: 'Reseller@Example.com',
    sessionProfileId: 'legacy_profile_id',
}), true);
assert.equal(isActiveResellerProfileForSession({
    actorId: 'reseller_auth_uid',
    profile,
    sessionEmail: 'reseller@example.com',
    sessionProfileId: 'reseller_auth_uid',
}), true);
assert.equal(isActiveResellerProfileForSession({
    actorId: 'reseller_auth_uid',
    profile,
    sessionEmail: 'other@example.com',
    sessionProfileId: 'legacy_profile_id',
}), false);
assert.equal(isActiveResellerProfileForSession({
    actorId: 'reseller_auth_uid',
    profile: { ...profile, active: false },
    sessionEmail: 'reseller@example.com',
    sessionProfileId: 'legacy_profile_id',
}), false);
assert.equal(isActiveResellerProfileForSession({
    actorId: 'reseller_auth_uid',
    profile,
    sessionEmail: 'reseller@example.com',
    sessionProfileId: 'different_profile',
}), false);

console.log('Reseller onboarding operation and profile authority boundary tests passed.');
