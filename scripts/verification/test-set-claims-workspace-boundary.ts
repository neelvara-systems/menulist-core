import assert from 'node:assert/strict';
import {
    firebaseClaimsMatchTargetStore,
    resolveSetClaimsWorkspaceFromStore,
} from '../../src/lib/auth/setClaimsWorkspace';
import {
    getAnswerlatticeStaffClaimMembership,
    getAnswerlatticeStaffClaimStoreIds,
    hasAnswerlatticeTenantAdminClaim,
    readActiveAnswerlatticeStaffClaimState,
} from '../../src/lib/answerlattice/staffClaimsContracts';

const activeStore = { active: true, storeId: 200, tenantId: 100 };

assert.equal(hasAnswerlatticeTenantAdminClaim('staff', 'PLATFORM_SUPPORT'), true);
assert.equal(hasAnswerlatticeTenantAdminClaim('staff', 'PLATFORM'), true);
assert.equal(hasAnswerlatticeTenantAdminClaim('owner', 'USER'), true);
assert.equal(hasAnswerlatticeTenantAdminClaim('staff', 'USER'), false);

assert.deepEqual(
    resolveSetClaimsWorkspaceFromStore({
        dbUserTenantId: 100,
        hasPlatformAccess: false,
        storeData: activeStore,
        storeDocumentId: '200',
    }),
    {
        storeScope: { documentId: '200', numericId: 200 },
        tenantScope: { documentId: '100', numericId: 100 },
    },
    'a normal user should receive only the canonical same-tenant workspace',
);
assert.equal(
    resolveSetClaimsWorkspaceFromStore({
        dbUserTenantId: 101,
        hasPlatformAccess: false,
        storeData: activeStore,
        storeDocumentId: '200',
    }),
    null,
    'a non-platform user must not mint claims for a store owned by another tenant',
);
assert.equal(
    resolveSetClaimsWorkspaceFromStore({
        dbUserTenantId: 999,
        hasPlatformAccess: true,
        storeData: activeStore,
        storeDocumentId: '200',
    })?.tenantScope.documentId,
    '100',
    'platform access must derive tenant identity from canonical target-store truth',
);
[
    { storeData: { ...activeStore, active: false }, storeDocumentId: '200' },
    { storeData: { ...activeStore, blocked: true }, storeDocumentId: '200' },
    { storeData: { ...activeStore, deleted: true }, storeDocumentId: '200' },
    { storeData: { ...activeStore, storeId: 201 }, storeDocumentId: '200' },
    { storeData: { ...activeStore, tenantId: '0100' }, storeDocumentId: '200' },
    { storeData: activeStore, storeDocumentId: '200/child' },
].forEach(({ storeData, storeDocumentId }) => {
    assert.equal(
        resolveSetClaimsWorkspaceFromStore({
            dbUserTenantId: 100,
            hasPlatformAccess: false,
            storeData,
            storeDocumentId,
        }),
        null,
    );
});

console.log('Set-claims canonical workspace boundary tests passed.');

const canonicalClaims = {
    admin: false,
    storeId: '200',
    storeIds: ['200', '201'],
    tenantId: '100',
};
assert.equal(firebaseClaimsMatchTargetStore(canonicalClaims, 200), true);
assert.equal(firebaseClaimsMatchTargetStore({ ...canonicalClaims, storeId: '201' }, 200), false);
assert.equal(firebaseClaimsMatchTargetStore({ ...canonicalClaims, storeIds: ['201'] }, 200), false);
assert.equal(firebaseClaimsMatchTargetStore({ ...canonicalClaims, tenantId: 100 }, 200), false);
assert.equal(firebaseClaimsMatchTargetStore({ ...canonicalClaims, admin: 'false' }, 200), false);
assert.equal(firebaseClaimsMatchTargetStore(canonicalClaims, '0200'), false);

console.log('Set-claims browser refresh acknowledgement tests passed.');

const strictClaimState = readActiveAnswerlatticeStaffClaimState({
    active: true,
    authDisabled: false,
    deleted: false,
    role: 'owner',
    storeId: 200,
    storeIds: [201],
    stores: [{ name: 'Canonical membership', role: 'owner', storeId: 200 }],
    tenantId: 100,
});
assert(strictClaimState);
assert.deepEqual(getAnswerlatticeStaffClaimStoreIds(strictClaimState), ['200']);
assert.equal(getAnswerlatticeStaffClaimMembership(strictClaimState, 200)?.role, 'owner');
assert.equal(getAnswerlatticeStaffClaimMembership(strictClaimState, 201), null);
assert.equal(readActiveAnswerlatticeStaffClaimState({
    active: true,
    stores: [
        { name: 'First', role: 'owner', storeId: 200 },
        { name: 'Duplicate', role: 'staff', storeId: 200 },
    ],
    tenantId: 100,
}), null);
assert.equal(readActiveAnswerlatticeStaffClaimState({
    active: false,
    stores: [{ name: 'Inactive', role: 'owner', storeId: 200 }],
    tenantId: 100,
}), null);

console.log('Set-claims Answerlattice staff membership contract tests passed.');
