import assert from 'node:assert/strict';

import {
    applyStaffStoreRole,
    applyStaffStoreSelection,
    isStaffUserInTenantContext,
    mergeStaffRolesForCurrentStore,
    mergeLoadedStaffStoreForCurrentTenant,
    removeStaffStoreSelection,
} from '../../src/lib/staffManagement/formMappingBoundary';
import type { StaffFormUser } from '../../src/lib/staffManagement/types';
import type { StoreDataType } from '../../src/types/platform/store';
import type { TenantDataType } from '../../src/types/platform/tenant';

const user: StaffFormUser = {
    active: true,
    deleted: false,
    email: 'staff@example.com',
    name: 'Staff',
    storeId: 11,
    storeIds: [11, 12],
    stores: [
        { name: 'One', role: 'manager', storeId: 11 },
        { name: 'Two', role: 'staff', storeId: 12 },
    ],
    tenantId: 1,
};

const changedStore = applyStaffStoreSelection(user, 0, { name: 'Three', storeId: 13 });
assert.deepEqual(changedStore?.stores[0], { name: 'Three', role: '', storeId: 13 });
assert.equal(changedStore?.storeId, 13);
assert.deepEqual(changedStore?.storeIds, [13, 12]);
assert.equal(
    applyStaffStoreSelection(user, 0, { name: 'Two', storeId: 12 }),
    null,
    'duplicate store mappings must be rejected',
);
assert.equal(applyStaffStoreSelection(user, 4, { name: 'Three', storeId: 13 }), null);
assert.equal(applyStaffStoreRole(user, 1, 'manager')?.stores[1]?.role, 'manager');
assert.equal(isStaffUserInTenantContext(user, 1), true);
assert.equal(isStaffUserInTenantContext(user, 2), false);
assert.equal(isStaffUserInTenantContext(user, null), false);

const removedDefault = removeStaffStoreSelection(user, 0);
assert.equal(removedDefault?.storeId, 12);
assert.deepEqual(removedDefault?.storeIds, [12]);
assert.equal(removeStaffStoreSelection({
    ...user,
    stores: [{ name: 'One', role: 'owner', storeId: 11 }],
    storeIds: [11],
}, 0), null);

const tenant = {
    active: true,
    deleted: false,
    email: 'owner@example.com',
    name: 'Tenant One',
    storesList: [{ name: 'One', storeId: 11, storeKey: 'one' }],
    tenantId: 1,
    tenantKey: 'tenant-one',
} satisfies TenantDataType;
const loadedStore = {
    active: true,
    deleted: false,
    email: 'store@example.com',
    name: 'One',
    phoneNumber: '',
    storeId: 11,
    storeKey: 'one',
    tenantId: 1,
    tenantName: 'Tenant One',
} as StoreDataType;
const sourceRoles = [{
    active: true,
    createdBy: 'owner',
    createdOn: '2026-07-30',
    description: 'Staff',
    id: 'staff',
    name: 'Staff',
    permissions: {},
}];
const roleStore = { ...loadedStore, roles: sourceRoles };
const nextRoles = [{ ...sourceRoles[0], name: 'Team member' }];
assert.equal(
    mergeStaffRolesForCurrentStore(roleStore, 1, 11, sourceRoles, nextRoles)?.roles,
    nextRoles,
);
assert.equal(
    mergeStaffRolesForCurrentStore({ ...roleStore, storeId: 12 }, 1, 11, sourceRoles, nextRoles)?.roles,
    sourceRoles,
);
assert.equal(
    mergeStaffRolesForCurrentStore({ ...roleStore, roles: [...sourceRoles] }, 1, 11, sourceRoles, nextRoles)?.roles?.[0]?.name,
    'Staff',
);
assert.equal(
    mergeLoadedStaffStoreForCurrentTenant(tenant, 1, 11, loadedStore)?.storesList[0]?.storeDetails,
    loadedStore,
);
assert.equal(
    mergeLoadedStaffStoreForCurrentTenant({ ...tenant, tenantId: 2 }, 1, 11, loadedStore)?.storesList[0]?.storeDetails,
    undefined,
);
assert.equal(
    mergeLoadedStaffStoreForCurrentTenant(tenant, 1, 12, loadedStore)?.storesList[0]?.storeDetails,
    undefined,
);

console.log('Staff form mapping boundary tests passed.');
