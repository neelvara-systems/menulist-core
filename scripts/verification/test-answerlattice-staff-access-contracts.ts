#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
    createDefaultAnswerlatticeRoles,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    normalizeAnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { PRODUCT_IDS } from '@constant/product';
import {
    findAnswerlatticeRole,
    normalizeAnswerlatticeRolesForStore,
} from '@lib/answerlattice/accessControl';
import {
    buildAnswerlatticeStaffAccessFields,
    getAnswerlatticeStaffMembership,
    isAnswerlatticeManagedStaffIdentityCollision,
    isAnswerlatticeStaffAccountActive,
    isAnswerlatticeStaffRemovalReplay,
    isAnswerlatticeStaffSelfTarget,
    isAnswerlatticeStaffUserInScope,
    normalizeAnswerlatticeStaffMemberships,
    readAnswerlatticeStaffAccessState,
    resolveAnswerlatticeStaffAuthLookup,
    shouldSendAnswerlatticeStaffSetupEmail,
} from '@lib/answerlattice/staffAccessContracts';
import {
    ANSWERLATTICE_FIREBASE_CUSTOM_CLAIMS_MAX_BYTES,
    buildAnswerlatticeStaffClaimAccessProjection,
    buildAnswerlatticeStaffClaimStateSignature,
    normalizeAnswerlatticeStaffClaimPlatformRole,
    selectAnswerlatticeStaffClaimMembership,
} from '@lib/answerlattice/staffClaimsContracts';
import {
    buildAnswerlatticeRoleCreationFingerprint,
    classifyAnswerlatticeRoleCreationReplay,
} from '@lib/answerlattice/staffRoleContracts';

const memberships = [
    { name: 'Primary', role: DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER, storeId: 401 },
    { name: 'Support', role: DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF, storeId: 402 },
];

assert.deepEqual(normalizeAnswerlatticeStaffMemberships(memberships), memberships);
assert.equal(normalizeAnswerlatticeStaffMemberships(null), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([null]), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([{ role: 'staff', storeId: ' 401' }]), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([{ role: 'staff', storeId: '0401' }]), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([{ role: ' staff', storeId: 401 }]), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([{ role: 7, storeId: 401 }]), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([{ role: 'staff', storeId: 401, sId: 402 }]), null);
assert.equal(normalizeAnswerlatticeStaffMemberships([
    { role: 'staff', storeId: 401 },
    { role: 'owner', storeId: 401 },
]), null);

const state = readAnswerlatticeStaffAccessState({
    accessRevision: 7,
    role: DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
    sId: 402,
    stores: memberships,
    tId: 301,
});
assert(state);
assert.equal(state.tenantId, 301);
assert.equal(state.accessRevision, 7);
assert.equal(state.primaryMembership?.storeId, 402);
assert.equal(getAnswerlatticeStaffMembership(state, 401)?.role, DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER);
assert.equal(selectAnswerlatticeStaffClaimMembership(state, {
    currentClaimStoreId: 401,
    preferredStoreId: 402,
})?.storeId, 401);
assert.equal(selectAnswerlatticeStaffClaimMembership(state, {
    currentClaimStoreId: 999,
    preferredStoreId: 401,
})?.storeId, 401);
assert.equal(selectAnswerlatticeStaffClaimMembership(state, {
    currentClaimStoreId: '0401',
    preferredStoreId: 999,
})?.storeId, 402);
assert.equal(normalizeAnswerlatticeStaffClaimPlatformRole('PLATFORM'), 'PLATFORM');
assert.equal(normalizeAnswerlatticeStaffClaimPlatformRole('PLATFORM_SUPPORT'), 'PLATFORM_SUPPORT');
assert.equal(normalizeAnswerlatticeStaffClaimPlatformRole(' platform '), 'USER');
assert.equal(normalizeAnswerlatticeStaffClaimPlatformRole('UNSUPPORTED_ROLE'), 'USER');

assert.equal(readAnswerlatticeStaffAccessState({ stores: memberships, tId: ' 301' }), null);
assert.equal(readAnswerlatticeStaffAccessState({ stores: memberships, tenantId: 301, tId: 302 }), null);
assert.equal(readAnswerlatticeStaffAccessState({
    storeId: 401,
    sId: 402,
    stores: memberships,
    tenantId: 301,
}), null);
assert.equal(readAnswerlatticeStaffAccessState({
    pId: PRODUCT_IDS.MENULIST,
    stores: memberships,
    tenantId: 301,
}), null);
assert.equal(readAnswerlatticeStaffAccessState({
    pId: PRODUCT_IDS.ANSWERLATTICE,
    productId: PRODUCT_IDS.MENULIST,
    stores: memberships,
    tenantId: 301,
}), null);
const invalidLegacyRoleState = readAnswerlatticeStaffAccessState({
    role: { id: 'staff' },
    storeId: 401,
    tenantId: 301,
});
assert(invalidLegacyRoleState);
assert.deepEqual(invalidLegacyRoleState.memberships, []);
assert.equal(getAnswerlatticeStaffMembership(invalidLegacyRoleState, 401), null);
assert.equal(readAnswerlatticeStaffAccessState({
    role: 'staff',
    storeId: 401,
    stores: [{ role: 'staff', storeId: 401 }, { role: 'owner', storeId: 401 }],
    tenantId: 301,
}), null);

const legacyState = readAnswerlatticeStaffAccessState({
    role: DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
    storeId: 401,
    tenantId: 301,
});
assert(legacyState);
assert.deepEqual(legacyState.memberships, [{ name: '', role: 'staff', storeId: 401 }]);

const canonical = buildAnswerlatticeStaffAccessFields({
    accessRevision: 8,
    active: true,
    memberships,
    preferredStoreId: 402,
    tenantId: 301,
});
assert.equal(canonical.storeId, 402);
assert.equal(canonical.sId, 402);
assert.equal(canonical.role, DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF);
assert.deepEqual(canonical.storeIds, [401, 402]);
assert.equal(canonical.authDisabled, false);
assert.equal(isAnswerlatticeStaffAccountActive({
    ...canonical,
    deleted: false,
}), true);
assert.equal(isAnswerlatticeStaffAccountActive({
    ...canonical,
    authDisabled: true,
}), false);

const removed = buildAnswerlatticeStaffAccessFields({
    accessRevision: 9,
    active: false,
    memberships: [],
    tenantId: 301,
});
assert.equal(removed.storeId, null);
assert.equal(removed.sId, null);
assert.equal(removed.authDisabled, true);
assert.equal(removed.active, false);
assert.deepEqual(removed.storeIds, []);
const removedState = readAnswerlatticeStaffAccessState(removed);
assert(removedState);
assert.equal(removedState.primaryMembership, null);
assert.deepEqual(removedState.memberships, []);

const impossibleActiveWithoutMembership = buildAnswerlatticeStaffAccessFields({
    accessRevision: 10,
    active: true,
    memberships: [],
    tenantId: 301,
});
assert.equal(impossibleActiveWithoutMembership.active, false);
assert.equal(impossibleActiveWithoutMembership.authDisabled, true);

const defaultRoles = createDefaultAnswerlatticeRoles({ createdBy: 'test', sId: 401, tId: 301 });
assert.deepEqual(
    defaultRoles,
    createDefaultAnswerlatticeRoles({ createdBy: 'different-reader', sId: 401, tId: 301 }),
);
assert(defaultRoles.every(({ createdBy, createdOn }) => (
    createdBy === 'system' && createdOn === '1970-01-01T00:00:00.000Z'
)));
const roleAssignmentWithoutTeamAccess = normalizeAnswerlatticeRolePermissions({
    [ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]: true,
});
assert.equal(roleAssignmentWithoutTeamAccess[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM], false);
assert.equal(roleAssignmentWithoutTeamAccess[ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES], false);
const roleAssignmentWithTeamAccess = normalizeAnswerlatticeRolePermissions({
    [ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES]: true,
    [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM]: true,
});
assert.equal(roleAssignmentWithTeamAccess[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM], true);
assert.equal(roleAssignmentWithTeamAccess[ANSWERLATTICE_PERMISSION_KEYS.ASSIGN_ROLES], true);
assert.equal(findAnswerlatticeRole(defaultRoles, 'unknown-role'), undefined);
const malformedCustomRole = normalizeAnswerlatticeRolesForStore([{
    id: 'custom-malformed',
    name: 'Malformed',
    permissions: undefined,
}], 301, 401).roles.find(({ id }) => id === 'custom-malformed');
assert(malformedCustomRole);
assert.equal(malformedCustomRole.active, false);
assert.equal(Object.values(malformedCustomRole.permissions).some(Boolean), false);
const duplicateCustomRole = normalizeAnswerlatticeRolesForStore([{
    active: true,
    id: 'custom-duplicate',
    name: 'First duplicate',
    permissions: { canManageTeam: true },
}, {
    active: true,
    id: 'custom-duplicate',
    name: 'Second duplicate',
    permissions: { canAssignRoles: true },
}], 301, 401).roles.find(({ id }) => id === 'custom-duplicate');
assert(duplicateCustomRole);
assert.equal(duplicateCustomRole.active, false);
assert.equal(Object.values(duplicateCustomRole.permissions).some(Boolean), false);
const replayableCustomRole = normalizeAnswerlatticeRolesForStore([{
    active: true,
    creationRequestFingerprint: 'fingerprint',
    creationRequestId: 'request-id',
    id: 'custom-replayable',
    name: 'Replayable',
    permissions: {},
}], 301, 401).roles.find(({ id }) => id === 'custom-replayable');
assert(replayableCustomRole);
assert.equal(replayableCustomRole.creationRequestFingerprint, 'fingerprint');
assert.equal(replayableCustomRole.creationRequestId, 'request-id');

const roleCreationInput = {
    active: true,
    description: 'Can review support conversations',
    name: 'Conversation Reviewer',
    permissions: {
        canManageSupport: true,
        canViewReadiness: true,
    },
    requestId: 'request-role-001',
};
const roleCreationFingerprint = buildAnswerlatticeRoleCreationFingerprint(roleCreationInput, 301, 401);
assert.equal(
    roleCreationFingerprint,
    buildAnswerlatticeRoleCreationFingerprint({
        ...roleCreationInput,
        permissions: {
            canViewReadiness: true,
            canManageSupport: true,
        },
    }, 301, 401),
);
assert.equal(classifyAnswerlatticeRoleCreationReplay(null, roleCreationInput.requestId, roleCreationFingerprint), 'new');
const existingReplayRole = {
    ...replayableCustomRole,
    creationRequestFingerprint: roleCreationFingerprint,
    creationRequestId: roleCreationInput.requestId,
};
assert.equal(
    classifyAnswerlatticeRoleCreationReplay(
        existingReplayRole,
        roleCreationInput.requestId,
        roleCreationFingerprint,
    ),
    'replay',
);
assert.equal(
    classifyAnswerlatticeRoleCreationReplay(
        existingReplayRole,
        roleCreationInput.requestId,
        buildAnswerlatticeRoleCreationFingerprint({
            ...roleCreationInput,
            name: 'Changed role name',
        }, 301, 401),
    ),
    'conflict',
);
assert.equal(
    classifyAnswerlatticeRoleCreationReplay(existingReplayRole, 'different-request-id', roleCreationFingerprint),
    'conflict',
);

assert.equal(isAnswerlatticeStaffSelfTarget({
    sessionEmail: 'Owner@Example.com',
    sessionUserId: 'default-project-user',
    targetEmail: 'owner@example.com',
    targetUserId: 'answerlattice-project-user',
}), true);
assert.equal(isAnswerlatticeStaffSelfTarget({
    sessionEmail: 'first@example.com',
    sessionUserId: 'same-user',
    targetEmail: 'second@example.com',
    targetUserId: 'same-user',
}), true);
assert.equal(isAnswerlatticeStaffSelfTarget({
    sessionEmail: '',
    sessionUserId: '',
    targetEmail: '',
    targetUserId: '',
}), false);
assert.equal(shouldSendAnswerlatticeStaffSetupEmail({ hasEmail: true, replay: false }), true);
assert.equal(shouldSendAnswerlatticeStaffSetupEmail({ hasEmail: true, replay: true }), false);
assert.equal(shouldSendAnswerlatticeStaffSetupEmail({ hasEmail: false, replay: false }), false);
assert.equal(isAnswerlatticeManagedStaffIdentityCollision({
    existingRequestId: 'request-a',
    existingUser: true,
    hasEmail: false,
    requestId: 'request-b',
}), true);
assert.equal(isAnswerlatticeManagedStaffIdentityCollision({
    existingRequestId: 'request-a',
    existingUser: true,
    hasEmail: false,
    requestId: 'request-a',
}), false);
assert.equal(isAnswerlatticeManagedStaffIdentityCollision({
    existingRequestId: 'request-a',
    existingUser: true,
    hasEmail: true,
    requestId: 'request-b',
}), false);
assert.deepEqual(resolveAnswerlatticeStaffAuthLookup({
    dataEmail: 'stored@example.com',
    fallbackEmail: 'Target@Example.com',
    firebaseUid: 'stale-or-wrong-uid',
}), { email: 'target@example.com', type: 'email' });
assert.deepEqual(resolveAnswerlatticeStaffAuthLookup({
    dataEmail: '',
    firebaseUid: 'uid-only',
}), { type: 'uid', uid: 'uid-only' });
assert.equal(resolveAnswerlatticeStaffAuthLookup({ dataEmail: '', firebaseUid: '' }), null);
assert.deepEqual(buildAnswerlatticeStaffClaimAccessProjection({
    accountActive: false,
    roleId: 'owner',
    storeIds: ['401'],
    storeIsActive: true,
}), { roleId: 'inactive', storeIds: [] });
assert.deepEqual(buildAnswerlatticeStaffClaimAccessProjection({
    accountActive: true,
    roleId: 'owner',
    storeIds: ['401'],
    storeIsActive: true,
}), { roleId: 'owner', storeIds: ['401'] });
assert.deepEqual(buildAnswerlatticeStaffClaimAccessProjection({
    accountActive: true,
    roleId: 'owner',
    storeIds: ['401'],
    storeIsActive: false,
}), { roleId: 'inactive', storeIds: ['401'] });
const allPermissionClaims = ANSWERLATTICE_ALL_PERMISSIONS.reduce((claims, permission) => {
    claims[permission] = true;
    return claims;
}, {} as Record<(typeof ANSWERLATTICE_ALL_PERMISSIONS)[number], boolean>);
const claimStateSignature = buildAnswerlatticeStaffClaimStateSignature({
    accountActive: true,
    admin: true,
    permissions: allPermissionClaims,
    platformRole: 'PLATFORM_SUPPORT',
    roleId: 'owner',
    storeId: 401,
    storeIds: ['401', '402'],
    storeIsActive: true,
    tenantId: 301,
});
assert.equal(
    claimStateSignature,
    buildAnswerlatticeStaffClaimStateSignature({
        accountActive: true,
        admin: true,
        permissions: { ...allPermissionClaims },
        platformRole: 'PLATFORM_SUPPORT',
        roleId: 'owner',
        storeId: 401,
        storeIds: ['401', '402'],
        storeIsActive: true,
        tenantId: 301,
    }),
);
const maximumClaimProjection = {
    accessRevision: Number.MAX_SAFE_INTEGER,
    admin: true,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    platformRole: 'PLATFORM_SUPPORT',
    role: 'r'.repeat(120),
    storeId: String(Number.MAX_SAFE_INTEGER),
    storeIds: [String(Number.MAX_SAFE_INTEGER)],
    tenantId: String(Number.MAX_SAFE_INTEGER),
    uId: 'u'.repeat(160),
    ...allPermissionClaims,
};
assert(
    new TextEncoder().encode(JSON.stringify(maximumClaimProjection)).byteLength
        < ANSWERLATTICE_FIREBASE_CUSTOM_CLAIMS_MAX_BYTES,
    'the bounded Answerlattice custom-claim projection must remain below Firebase Auth\'s 1000-byte limit',
);

assert.equal(isAnswerlatticeStaffRemovalReplay({
    state,
    storeId: 999,
    value: { workspaceAccessRemovedStoreId: 999 },
}), true);
assert.equal(isAnswerlatticeStaffRemovalReplay({
    state,
    storeId: 401,
    value: { workspaceAccessRemovedStoreId: 401 },
}), false, 'a current membership must never be treated as a removal replay');
assert.equal(isAnswerlatticeStaffRemovalReplay({
    state,
    storeId: 999,
    value: { workspaceAccessRemovedStoreId: ' 999' },
}), false, 'a malformed removal marker must fail closed');

assert.equal(isAnswerlatticeStaffUserInScope({ stores: memberships, tenantId: 301 }, 301, 401), true);
assert.equal(isAnswerlatticeStaffUserInScope({ stores: memberships, tenantId: 302 }, 301, 401), false);
assert.equal(isAnswerlatticeStaffUserInScope({ stores: memberships, tenantId: 301 }, 301, 999), false);

console.log('Answerlattice staff access contract tests passed.');
