import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { normalizeAuthSessionStoreScope } from '@lib/auth/sessionUserBoundary';

assert.deepEqual(normalizeAuthSessionStoreScope({
    storeId: 22,
    storeIds: [22, '33'],
    stores: [{ role: 'owner', storeId: 22 }, { role: 'manager', storeId: '44' }],
    tenantId: '11',
}), {
    storeId: 22,
    storeIds: [22, 33, 44],
    stores: [{ role: 'owner', storeId: 22 }, { role: 'manager', storeId: 44 }],
    tenantId: 11,
});

const adversarialScope = normalizeAuthSessionStoreScope({
    storeId: '1e3',
    storeIds: ['1e3', '01000', '1000 ', 1000.5, Number.MAX_SAFE_INTEGER + 1],
    stores: [
        { role: 'owner', storeId: '1e3' },
        { role: 'owner', storeId: '01000' },
        { role: 'owner', storeId: 1000 },
        null,
        ['invalid'],
    ],
    tenantId: ' 11',
});
assert.equal(adversarialScope.tenantId, null);
assert.equal(adversarialScope.storeId, null);
assert.deepEqual(adversarialScope.storeIds, [1000]);
assert.deepEqual(adversarialScope.stores, [{ role: 'owner', storeId: 1000 }]);

const invalidRoleScope = normalizeAuthSessionStoreScope({
    storeId: 2,
    stores: [
        { role: 'x'.repeat(65), storeId: 2 },
        { role: { toString: () => 'owner' }, storeId: 3 },
    ],
    tenantId: 1,
});
assert.deepEqual(invalidRoleScope.stores, [
    { role: '', storeId: 2 },
    { role: '', storeId: 3 },
]);

const contradictoryRoleScope = normalizeAuthSessionStoreScope({
    storeId: 2,
    stores: [
        { role: 'owner', storeId: 2 },
        { role: 'staff', storeId: '2' },
        { role: 'manager', storeId: 3 },
        { role: 'manager', storeId: '3' },
    ],
    tenantId: 1,
});
assert.deepEqual(contradictoryRoleScope.stores, [
    { role: '', storeId: 2 },
    { role: 'manager', storeId: 3 },
]);

const authSource = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/auth/index.ts'), 'utf8');
assert.match(
    authSource,
    /const sessionStoreScope = normalizeAuthSessionStoreScope\(sanitized\);/,
    'JWT/session production must use the exact persisted store-scope boundary',
);
assert.match(authSource, /storeIds: sessionStoreScope\.storeIds,/);
assert.match(authSource, /stores: sessionStoreScope\.stores,/);
assert.match(
    authSource,
    /const sessionStoreRole = sessionStoreMapping\s+\? sessionStoreMapping\.role\s+: \(dbUser as any\)\.role;/,
    'an explicit mapping with a conflicting/invalid role must not fall back to a broader top-level role',
);
assert.doesNotMatch(
    authSource,
    /\.map\(\(storeId\) => Number\(storeId\)\)/,
    'session membership must not coerce exponent, whitespace, decimal or leading-zero IDs',
);

console.log('Auth session user boundary tests passed.');
