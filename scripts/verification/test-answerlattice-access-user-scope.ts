import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_PERMISSION_KEYS,
    createDefaultAnswerlatticeRoles,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
} from '../../src/constants/answerlattice/permissions';
import {
    hasAnswerlatticePermission,
    selectAnswerlatticeAccessUserCandidate,
} from '../../src/lib/answerlattice/accessControl';

const canonical = {
    data: {
        email: 'owner@example.com',
        storeIds: [22],
        tenantId: 11,
    },
    id: 'user_canonical',
};

assert.equal(
    selectAnswerlatticeAccessUserCandidate([canonical], 11, 22)?.id,
    canonical.id,
    'the exact tenant and store candidate must be selected',
);
assert.equal(
    selectAnswerlatticeAccessUserCandidate([canonical], 12, 22),
    null,
    'a cross-tenant candidate must be rejected',
);
assert.equal(
    selectAnswerlatticeAccessUserCandidate([canonical], 11, 23),
    null,
    'a cross-store candidate must be rejected',
);
assert.equal(
    selectAnswerlatticeAccessUserCandidate([
        canonical,
        { ...canonical, id: 'user_duplicate' },
    ], 11, 22),
    null,
    'duplicate identities in one workspace must fail closed',
);
assert.equal(
    selectAnswerlatticeAccessUserCandidate([{
        data: {
            email: 'legacy@example.com',
            sId: 22,
            tId: 11,
        },
        id: 'user_legacy',
    }], 11, 22)?.id,
    'user_legacy',
    'legacy tId/sId records must remain readable during migration',
);
assert.equal(selectAnswerlatticeAccessUserCandidate([{
    data: { storeIds: [22], tenantId: 11, tId: 12 },
    id: 'conflicting-tenant-aliases',
}], 11, 22), null, 'conflicting tenant aliases must fail closed');
assert.equal(selectAnswerlatticeAccessUserCandidate([{
    data: { pId: 'ML', storeIds: [22], tenantId: 11 },
    id: 'wrong-product',
}], 11, 22), null, 'an explicit non-Answerlattice product identity must fail closed');
assert.equal(selectAnswerlatticeAccessUserCandidate([{
    data: { storeIds: [22, 'invalid'], tenantId: 11 },
    id: 'partially-invalid-store-list',
}], 11, 22), null, 'a partially invalid legacy store list must not grant access');
assert.equal(selectAnswerlatticeAccessUserCandidate([{
    data: { storeIds: [22, 22], tenantId: 11 },
    id: 'duplicate-store-list',
}], 11, 22), null, 'a duplicate legacy store list must fail closed');
assert.equal(selectAnswerlatticeAccessUserCandidate([{
    data: { sId: 22, storeId: 23, tenantId: 11 },
    id: 'conflicting-store-aliases',
}], 11, 22), null, 'conflicting legacy store aliases must fail closed');

const defaultRoles = createDefaultAnswerlatticeRoles({
    createdBy: 'permission-regression',
    sId: 22,
    tId: 11,
});
assert.equal(
    hasAnswerlatticePermission(
        DEFAULT_ANSWERLATTICE_ROLE_IDS.MANAGER,
        defaultRoles,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    ),
    false,
    'the default Answerlattice manager must not gain billing mutation access through the general management role',
);
assert.equal(
    hasAnswerlatticePermission(
        DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER,
        defaultRoles,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    ),
    true,
    'the Answerlattice owner must retain billing mutation access',
);
assert.equal(
    hasAnswerlatticePermission(
        DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF,
        defaultRoles,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    ),
    false,
    'the default Answerlattice staff role must not gain billing mutation access',
);

const billingOperatorRole = {
    ...defaultRoles.find(({ id }) => id === DEFAULT_ANSWERLATTICE_ROLE_IDS.MANAGER)!,
    id: 'billing-operator',
    name: 'Billing operator',
    permissions: {
        [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING]: true,
    },
};
assert.equal(
    hasAnswerlatticePermission(
        billingOperatorRole.id,
        [...defaultRoles, billingOperatorRole],
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    ),
    true,
    'an active custom role with persisted canManageBilling must retain billing mutation access',
);
assert.equal(
    hasAnswerlatticePermission(
        billingOperatorRole.id,
        [...defaultRoles, { ...billingOperatorRole, active: false }],
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING,
    ),
    false,
    'an inactive custom billing role must fail closed',
);

process.stdout.write('Answerlattice access user scope tests passed.\n');
