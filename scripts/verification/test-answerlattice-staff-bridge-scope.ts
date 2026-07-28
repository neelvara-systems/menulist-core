import assert from 'node:assert/strict';
import {
    hasNoAnswerlatticeStaffBridgeMemberships,
    parseAnswerlatticeStaffBridgeAccountScope,
} from '../../src/lib/answerlattice/staffAccessBridge';

assert.deepEqual(
    parseAnswerlatticeStaffBridgeAccountScope({
        tenantId: 10,
        tId: '10',
        storeId: 20,
        sId: '20',
    }),
    { tenantId: 10, storeId: 20 },
);
assert.deepEqual(
    parseAnswerlatticeStaffBridgeAccountScope({ tenantId: 10 }),
    { tenantId: 10, storeId: null },
);
assert.equal(
    parseAnswerlatticeStaffBridgeAccountScope({ tenantId: 10, tId: 11 }),
    null,
);
assert.equal(
    parseAnswerlatticeStaffBridgeAccountScope({ tenantId: 10, storeId: 20, sId: 21 }),
    null,
);
assert.equal(parseAnswerlatticeStaffBridgeAccountScope({ storeId: 20 }), null);

assert.equal(hasNoAnswerlatticeStaffBridgeMemberships({ tenantId: 10 }), true);
assert.equal(hasNoAnswerlatticeStaffBridgeMemberships({ tenantId: 10, storeIds: [] }), true);
assert.equal(hasNoAnswerlatticeStaffBridgeMemberships({ tenantId: 10, storeId: 20, storeIds: [] }), false);
assert.equal(hasNoAnswerlatticeStaffBridgeMemberships({ tenantId: 10, sId: '20', storeIds: [] }), false);
assert.equal(hasNoAnswerlatticeStaffBridgeMemberships({ tenantId: 10, storeIds: [20] }), false);
assert.equal(hasNoAnswerlatticeStaffBridgeMemberships({ tenantId: 10, storeIds: 'invalid' }), false);

console.log('Answerlattice staff bridge scope tests passed.');
