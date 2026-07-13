import assert from 'node:assert/strict';
import {
    canUserAccessStore,
    getAccessibleStoreSummaries,
    getMappedStoreIdsForUser,
    getStoreSummaryId,
    normalizeStoreSwitchStoreId,
} from '../../src/lib/multiOutlet/storeSwitchAccess';
import {
    applyActiveStoreContextValueToSession,
    normalizeActiveStoreContextValue,
} from '../../src/lib/multiOutlet/activeStoreContext';
import type LoginUserType from '../../src/types/loginUser';

for (const value of [1, 42, '1', '42']) {
    assert.equal(normalizeStoreSwitchStoreId(value), Number(value), `canonical store ID ${String(value)} should pass`);
}

for (const value of [
    null,
    undefined,
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
    assert.equal(normalizeStoreSwitchStoreId(value), null, `non-canonical store ID ${String(value)} should fail`);
}

const mapped = getMappedStoreIdsForUser({
    storeId: '1',
    storeIds: ['2', ' 3', '4e0', 5.5, 6],
    stores: [
        { storeId: '7', role: 'manager' },
        { storeId: '08', role: 'owner' },
    ],
});
assert.deepEqual(Array.from(mapped).sort((left, right) => left - right), [1, 2, 6, 7]);
assert.equal(canUserAccessStore({ sessionUser: { storeIds: ['1e3'] }, storeId: 1000 }), false);
assert.equal(canUserAccessStore({ sessionUser: { storeIds: ['1000'] }, storeId: 1000 }), true);
assert.equal(canUserAccessStore({ sessionUser: { platformRole: 'PLATFORM' }, storeId: ' 9' }), false);
assert.equal(canUserAccessStore({ sessionUser: { platformRole: 'PLATFORM' }, storeId: 9 }), true);

assert.equal(getStoreSummaryId({ storeId: '01' }), null);
assert.equal(getStoreSummaryId({ storeDetails: { storeId: '11' } }), 11);

const accessible = getAccessibleStoreSummaries({
    sessionUser: { storeIds: [1, 3, 4] },
    tenantDetails: {
        storesList: [
            { storeId: 1, active: true },
            { storeId: '02', active: true },
            { storeId: 3, active: false },
            { storeDetails: { storeId: 4, active: true } },
        ],
    },
});
assert.deepEqual(accessible.map(getStoreSummaryId), [1, 4]);

const baseSession = {
    sId: 22,
    tId: 11,
    user: {
        storeId: 22,
        storeIds: [22, 33],
        stores: [],
        tenantId: 11,
    },
} as LoginUserType;
const validActiveContext = normalizeActiveStoreContextValue({
    baseStoreId: 22,
    storeId: 33,
    tenantId: 11,
});
assert.ok(validActiveContext);
assert.equal(applyActiveStoreContextValueToSession(baseSession, validActiveContext)?.sId, 33);
assert.equal(applyActiveStoreContextValueToSession(baseSession, validActiveContext)?.user.storeId, 33);

const forgedActiveContext = normalizeActiveStoreContextValue({
    baseStoreId: 22,
    storeId: 44,
    tenantId: 11,
});
assert.ok(forgedActiveContext);
assert.equal(
    applyActiveStoreContextValueToSession(baseSession, forgedActiveContext),
    baseSession,
    'browser storage cannot switch a session to an unmapped store',
);
const contradictorySession = { ...baseSession, user: { ...baseSession.user, tenantId: 99 } };
assert.equal(
    applyActiveStoreContextValueToSession(contradictorySession, validActiveContext)?.sId,
    22,
    'contradictory session tenant aliases must fail closed',
);
assert.equal(normalizeActiveStoreContextValue({ baseStoreId: '22', storeId: 33, tenantId: 11 }), null);
assert.equal(normalizeActiveStoreContextValue({ baseStoreId: 22, storeId: '033', tenantId: 11 }), null);

console.log('Store-switch access boundary tests passed.');
