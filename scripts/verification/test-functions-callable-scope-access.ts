import assert from 'node:assert/strict';
import {
    hasCallableTenantStoreAccess,
    parseCallableTenantStoreScope,
} from '../../functions/src/utils/callableScopeAccess';

assert.deepEqual(
    parseCallableTenantStoreScope({
        tenantId: 11,
        tId: '11',
        storeId: 22,
        sId: '22',
        storeIds: [22, '23', 23],
    }),
    { tenantId: '11', directStoreId: '22', storeIds: ['22', '23'] },
);
assert.equal(hasCallableTenantStoreAccess({ tId: 11, sId: 22 }, 11, 22), true);
assert.equal(hasCallableTenantStoreAccess({ tId: 11, storeIds: [22] }, '11', '22'), true);
assert.equal(hasCallableTenantStoreAccess({ tenantId: 11, tId: 12, storeId: 22 }, 11, 22), false);
assert.equal(hasCallableTenantStoreAccess({ tenantId: 11, storeId: 22, sId: 23 }, 11, 22), false);
assert.equal(hasCallableTenantStoreAccess({ tenantId: 11, storeId: 22, storeIds: [true] }, 11, 22), false);
assert.equal(hasCallableTenantStoreAccess({ tenantId: '011', storeId: 22 }, 11, 22), false);
assert.equal(hasCallableTenantStoreAccess({ tenantId: 11, storeId: 22 }, 11, 23), false);
assert.equal(hasCallableTenantStoreAccess({ tenantId: 11, storeId: 22 }, 12, 22), false);

process.stdout.write('Functions callable tenant/store scope tests passed.\n');
