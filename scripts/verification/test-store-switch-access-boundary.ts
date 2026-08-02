import assert from 'node:assert/strict';
import {
    canUserAccessStore,
    claimStoreSwitchAttempt,
    getAccessibleStoreSummaries,
    getMappedStoreIdsForUser,
    getStoreSummaryId,
    normalizeStoreSwitchStoreId,
    releaseStoreSwitchAttempt,
} from '../../src/lib/multiOutlet/storeSwitchAccess';
import {
    ACTIVE_STORE_CONTEXT_STORAGE_KEY,
    applyActiveStoreContextValueToSession,
    normalizeActiveStoreContextValue,
    readActiveStoreContextId,
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

const firstStoreSwitchAttempt = claimStoreSwitchAttempt();
assert.notEqual(firstStoreSwitchAttempt, null);
if (firstStoreSwitchAttempt === null) throw new Error('first store-switch attempt was not admitted');
assert.equal(claimStoreSwitchAttempt(), null, 'a second mounted switch surface cannot claim concurrent Firebase claim work');
assert.equal(releaseStoreSwitchAttempt(firstStoreSwitchAttempt + 1), false, 'a foreign attempt cannot release the active claim');
assert.equal(claimStoreSwitchAttempt(), null, 'a foreign release must leave the active claim owned');
assert.equal(releaseStoreSwitchAttempt(firstStoreSwitchAttempt), true);
const nextStoreSwitchAttempt = claimStoreSwitchAttempt();
assert.notEqual(nextStoreSwitchAttempt, null);
if (nextStoreSwitchAttempt === null) throw new Error('next store-switch attempt was not admitted');
assert.notEqual(nextStoreSwitchAttempt, firstStoreSwitchAttempt, 'attempt tokens must not be reused');
assert.equal(releaseStoreSwitchAttempt(nextStoreSwitchAttempt), true);

const baseSession = {
    expires: '2026-08-01T00:00:00.000Z',
    pId: 'ML',
    platformRole: 'OWNER',
    role: 'OWNER',
    sId: 22,
    tId: 11,
    uId: 'user-1',
    user: {
        active: true,
        email: 'owner@example.com',
        id: 'user-1',
        isVerified: true,
        name: 'Owner',
        pId: 'ML',
        platformRole: 'OWNER',
        productId: 'ML',
        role: 'OWNER',
        storeId: 22,
        storeIds: [22, 33],
        stores: [],
        tenantId: 11,
    },
} satisfies LoginUserType;
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

const originalWindow = globalThis.window;
const storageValues = new Map<string, string>();
const removedStorageKeys: string[] = [];
const localStorageDouble = {
    getItem: (key: string) => storageValues.get(key) ?? null,
    removeItem: (key: string) => {
        removedStorageKeys.push(key);
        storageValues.delete(key);
    },
    setItem: (key: string, value: string) => {
        storageValues.set(key, value);
    },
};
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: localStorageDouble },
});

storageValues.set(ACTIVE_STORE_CONTEXT_STORAGE_KEY, JSON.stringify(validActiveContext));
assert.equal(readActiveStoreContextId(), 33, 'structured owner-scoped context should survive refresh');

storageValues.set(ACTIVE_STORE_CONTEXT_STORAGE_KEY, '33');
assert.equal(readActiveStoreContextId(), null, 'legacy scalar context must not drive SessionProvider');
assert.ok(removedStorageKeys.includes(ACTIVE_STORE_CONTEXT_STORAGE_KEY));

storageValues.set(ACTIVE_STORE_CONTEXT_STORAGE_KEY, '{"storeId":33}');
assert.equal(readActiveStoreContextId(), null, 'partially scoped context must be evicted');
assert.equal(storageValues.has(ACTIVE_STORE_CONTEXT_STORAGE_KEY), false);

if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
} else {
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
    });
}

console.log('Store-switch access boundary tests passed.');
