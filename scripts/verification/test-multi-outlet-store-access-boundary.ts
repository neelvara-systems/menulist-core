import assert from 'node:assert/strict';
import {
    buildUserStoreAccessUpdate,
    normalizeUserStoreAccessDocumentId,
} from '../../src/lib/multiOutlet/serverStoreAccess';
import {
    removeCompensatedStoreFromMappings,
    removeCompensatedStoreId,
} from '../../src/lib/onboarding/compensatedStoreMappings';
import { isMultiOutletTenantStoreListEntryInScope } from '../../src/lib/multiOutlet/projectIdBoundary';
import { normalizePersistedOutletPolicy } from '../../src/lib/multiOutlet/outletPolicyBoundary';
import { DEFAULT_OUTLET_POLICY } from '../../src/types/multiOutlet.types';

for (const value of ['user-1', 'oauth_abc123', 42]) {
    assert.equal(normalizeUserStoreAccessDocumentId(value), String(value));
}
for (const value of ['', ' user', 'user ', 'users/path', '.', '..', 'a'.repeat(161), null, undefined]) {
    assert.equal(normalizeUserStoreAccessDocumentId(value), null, `invalid user document ID ${String(value)} must fail`);
}

const update = buildUserStoreAccessUpdate({
    storeIds: [1, '2', '03', '4e0', 5.5, 0, -1, Number.MAX_SAFE_INTEGER + 1],
    stores: [
        { storeId: 1, name: 'One', role: 'owner' },
        { storeId: '2', name: 'Two', role: 'staff' },
        { storeId: '03', name: 'Leading zero', role: 'owner' },
        { storeId: '4e0', name: 'Exponent', role: 'owner' },
        { storeId: 5.5, name: 'Decimal', role: 'owner' },
        null,
    ],
}, 6, '  Canonical Outlet  ', 'owner');

assert(update);
assert.deepEqual(update.storeIds, [1, 2, 6]);
assert.deepEqual(update.stores, [
    { storeId: 1, name: 'One', role: 'owner' },
    { storeId: 2, name: 'Two', role: 'staff' },
    { storeId: 6, name: 'Canonical Outlet', role: 'owner' },
]);
assert.equal(buildUserStoreAccessUpdate({}, Number.MAX_SAFE_INTEGER + 1, 'Unsafe'), null);
assert.equal(buildUserStoreAccessUpdate({}, 1.5, 'Decimal'), null);

assert.deepEqual(removeCompensatedStoreId([1, '2', '02', '2e0', 2.5], 2), [1, '02', '2e0', 2.5]);
assert.deepEqual(removeCompensatedStoreFromMappings([
    { storeId: 1, name: 'One' },
    { storeId: '2', name: 'Two' },
    { storeId: '02', name: 'Leading zero' },
    { storeId: '2e0', name: 'Exponent' },
], 2), [
    { storeId: 1, name: 'One' },
    { storeId: '02', name: 'Leading zero' },
    { storeId: '2e0', name: 'Exponent' },
]);

assert.equal(isMultiOutletTenantStoreListEntryInScope(
    { active: true, isMaster: false, storeId: '22' },
    { isMaster: false, storeId: 22 },
), true);
assert.equal(isMultiOutletTenantStoreListEntryInScope(
    { active: false, isMaster: false, storeId: '22' },
    { isMaster: false, storeId: 22 },
), false);
assert.equal(isMultiOutletTenantStoreListEntryInScope(
    { active: false, isMaster: false, storeId: '22' },
    { allowInactive: true, isMaster: false, storeId: 22 },
), true);
for (const entry of [
    { active: true, isMaster: false, storeId: '022' },
    { active: true, isMaster: false, storeId: '2.2e1' },
    { active: 'true', isMaster: false, storeId: 22 },
    { active: true, isMaster: 'false', storeId: 22 },
]) {
    assert.equal(
        isMultiOutletTenantStoreListEntryInScope(entry, { isMaster: false, storeId: 22 }),
        false,
        'malformed persisted tenant membership must fail closed',
    );
}

assert.deepEqual(normalizePersistedOutletPolicy(undefined), DEFAULT_OUTLET_POLICY);
assert.deepEqual(normalizePersistedOutletPolicy({ imageOverride: true }), {
    ...DEFAULT_OUTLET_POLICY,
    imageOverride: true,
});
assert.equal(normalizePersistedOutletPolicy({ imageOverride: 'false' }), null);
assert.equal(normalizePersistedOutletPolicy([]), null);
const hostilePolicy = Object.create(null);
Object.defineProperty(hostilePolicy, 'imageOverride', {
    enumerable: true,
    get: () => {
        throw new Error('hostile accessor');
    },
});
assert.equal(normalizePersistedOutletPolicy(hostilePolicy), null);

console.log('Multi-outlet store access boundary tests passed.');
