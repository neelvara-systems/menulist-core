import assert from 'node:assert/strict';

import { normalizeTenantListDocument } from '../../src/database/tenants';

const normalized = normalizeTenantListDocument('14', {
    active: true,
    name: 'Legacy tenant',
    storesList: [
        { isMaster: true, name: 'Main Store', storeId: 101 },
        { name: 'Invalid Store', storeId: 'not-a-number' },
    ],
    tenantId: 14,
});

assert.ok(normalized, 'legacy tenant should normalize');
assert.equal(normalized.id, '14');
assert.equal(normalized.active, true);
assert.equal(normalized.deleted, false);
assert.equal(normalized.email, '');
assert.equal(normalized.tenantKey, '');
assert.deepEqual(normalized.storesList.map((store) => ({
    name: store.name,
    storeId: store.storeId,
    storeKey: store.storeKey,
})), [{
    name: 'Main Store',
    storeId: 101,
    storeKey: 'main_store',
}]);

assert.equal(
    normalizeTenantListDocument('invalid', {
        storesList: [],
        tenantKey: 'invalid',
    }).name,
    '',
    'missing presentation fields should receive deterministic safe defaults',
);

process.stdout.write('Tenant DAL boundary tests passed.\n');
