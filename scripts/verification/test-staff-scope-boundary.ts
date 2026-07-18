import assert from 'node:assert/strict';
import { ALL_PERMISSIONS, PERMISSION_CATEGORIES, PERMISSION_LABELS } from '../../src/constants/permissions';
import RolesPermissionInitialData, {
    PERMISSION_CATEGORIES_CONFIG,
    PERMISSION_LABELS as PERMISSION_UI_LABELS,
} from '../../src/data/rolesPermissionsInitialData';
import { DEFAULT_ROLE_METADATA } from '../../src/data/shared/defaultRoles';
import {
    canManageStaffTarget,
    normalizePersistedStaffStoreMappings,
    normalizeStaffStoreScopeDocumentId,
    staffTargetHasOwnerAccess,
} from '../../src/lib/staffManagement/scopeBoundary';
import { CreateStaffSchema, UpdateStaffSchema } from '../../src/lib/staffManagement/server';

for (const value of [1, 42, '1', '42']) {
    assert.deepEqual(normalizeStaffStoreScopeDocumentId(value), {
        numericId: Number(value),
        documentId: String(value),
    });
}

for (const value of [
    '',
    ' 1',
    '1 ',
    '01',
    '+1',
    '1e3',
    '1.5',
    1.5,
    0,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
    String(Number.MAX_SAFE_INTEGER + 1),
]) {
    assert.equal(normalizeStaffStoreScopeDocumentId(value), null, `non-canonical staff scope ${String(value)} should fail`);
}

const baseCreate = {
    email: 'staff@example.com',
    name: 'Staff Member',
    tenantId: 1,
    storeId: 2,
};
assert.equal(CreateStaffSchema.safeParse(baseCreate).success, true);
assert.equal(CreateStaffSchema.safeParse({ ...baseCreate, storeId: Number.MAX_SAFE_INTEGER + 1 }).success, false);
assert.equal(CreateStaffSchema.safeParse({ ...baseCreate, tenantId: Number.MAX_SAFE_INTEGER + 1 }).success, false);
assert.equal(UpdateStaffSchema.safeParse({
    userId: 'user-1',
    tenantId: 1,
    stores: [{ storeId: Number.MAX_SAFE_INTEGER + 1, role: 'staff' }],
}).success, false);
const fullTenantStoreMappings = Array.from({ length: 31 }, (_, index) => ({
    role: 'staff',
    storeId: index + 1,
}));
assert.equal(UpdateStaffSchema.safeParse({
    userId: 'user-1',
    tenantId: 1,
    stores: fullTenantStoreMappings,
}).success, true, 'one master plus 30 outlets must remain assignable');
assert.equal(UpdateStaffSchema.safeParse({
    userId: 'user-1',
    tenantId: 1,
    stores: [...fullTenantStoreMappings, { role: 'staff', storeId: 32 }],
}).success, false, 'staff mappings above the shared tenant cap must fail');

assert.deepEqual(normalizePersistedStaffStoreMappings([
    { storeId: 1, name: 'One', role: 'owner' },
    { storeId: '2', name: 'Two', role: 'staff' },
    { storeId: ' 3', name: 'Whitespace', role: 'owner' },
    { storeId: '04', name: 'Leading zero', role: 'owner' },
    { storeId: '5e0', name: 'Exponent', role: 'owner' },
    { storeId: 6.5, name: 'Decimal', role: 'owner' },
    { storeId: Number.MAX_SAFE_INTEGER + 1, name: 'Unsafe', role: 'owner' },
    null,
]), [
    { storeId: 1, name: 'One', role: 'owner' },
    { storeId: 2, name: 'Two', role: 'staff' },
]);

const ownerTarget = { stores: [{ storeId: 1, name: 'One', role: 'owner' }] };
const ordinaryStaffTarget = { stores: [{ storeId: 1, name: 'One', role: 'staff' }] };
assert.equal(staffTargetHasOwnerAccess(ownerTarget), true);
assert.equal(staffTargetHasOwnerAccess({ ownerProtected: true, stores: [] }), true);
assert.equal(staffTargetHasOwnerAccess(ordinaryStaffTarget), false);
assert.equal(canManageStaffTarget({ canAssignRoles: false, canManageUsers: true, target: ownerTarget }), false);
assert.equal(canManageStaffTarget({ canAssignRoles: true, canManageUsers: true, target: ownerTarget }), true);
assert.equal(canManageStaffTarget({ canAssignRoles: false, canManageUsers: true, target: ordinaryStaffTarget }), true);
assert.equal(canManageStaffTarget({ canAssignRoles: true, canManageUsers: false, target: ordinaryStaffTarget }), false);

const uniquePermissionKeys = new Set(ALL_PERMISSIONS);
assert.equal(uniquePermissionKeys.size, ALL_PERMISSIONS.length, 'permission constants must be unique');
assert.equal(ALL_PERMISSIONS.length, 29, 'permission taxonomy must preserve the current 29-key contract');
const categorizedPermissionKeys = Object.values(PERMISSION_CATEGORIES).flatMap(({ permissions }) => permissions);
assert.deepEqual(new Set(categorizedPermissionKeys), uniquePermissionKeys, 'permission categories must cover every key');
assert.equal(categorizedPermissionKeys.length, uniquePermissionKeys.size, 'each permission must belong to one category');
assert.deepEqual(
    new Set(PERMISSION_CATEGORIES_CONFIG.flatMap(({ permissions }) => permissions)),
    uniquePermissionKeys,
    'role editor categories must cover every permission key',
);
for (const permission of ALL_PERMISSIONS) {
    assert.equal(typeof PERMISSION_LABELS[permission], 'string');
    assert.equal(typeof PERMISSION_UI_LABELS[permission], 'string');
    assert.equal(RolesPermissionInitialData[permission], false, `custom roles must default ${permission} to denied`);
    for (const metadata of Object.values(DEFAULT_ROLE_METADATA)) {
        assert.equal(typeof metadata.permissions[permission], 'boolean', `default role ${metadata.name} must define ${permission}`);
    }
}

console.log('Staff scope boundary tests passed.');
