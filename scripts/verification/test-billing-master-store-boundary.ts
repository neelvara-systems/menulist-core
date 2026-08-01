import assert from 'node:assert/strict';
import { getExactMasterStoreIdFromList } from '../../src/lib/billing/masterStoreBoundary';

assert.equal(getExactMasterStoreIdFromList([
    { storeId: 10, isMaster: true },
    { storeId: 20, isMaster: false },
]), 10);
assert.equal(getExactMasterStoreIdFromList([
    { storeId: 10, isMaster: false },
    { storeId: 20 },
]), 20, 'one exact active unflagged legacy store may be inferred as master');
assert.equal(getExactMasterStoreIdFromList([
    { storeId: 10, active: false },
    { storeId: 20 },
]), 20);

for (const invalidList of [
    [{ storeId: '01', isMaster: true }],
    [{ storeId: true, isMaster: true }],
    [{ storeId: 10, active: 'false', isMaster: true }],
    [{ storeId: 10, isMaster: 'true' }],
    [{ storeId: 10, isMaster: true }, { storeId: 20, isMaster: true }],
    [{ storeId: 10 }, { storeId: 10 }],
    [{ storeId: 10, storeDetails: { storeId: 20 }, isMaster: true }],
    [{ storeId: 10, active: true, storeDetails: { active: false }, isMaster: true }],
    [{ storeId: 10, isMaster: true, storeDetails: { isMaster: false } }],
    [{ storeId: 10 }, { storeId: 20 }],
    [{ storeId: 10, isMaster: false }, { storeId: 20, isMaster: false }],
]) {
    assert.equal(
        getExactMasterStoreIdFromList(invalidList),
        null,
        `ambiguous or malformed billing master state must fail closed: ${JSON.stringify(invalidList)}`,
    );
}

const throwingStoreId = Object.defineProperty({}, 'storeId', {
    get() {
        throw new Error('hostile_store_id_getter');
    },
});
assert.equal(
    getExactMasterStoreIdFromList([throwingStoreId]),
    null,
    'throwing persisted accessors must fail closed',
);

console.log('Billing master-store boundary tests passed.');
