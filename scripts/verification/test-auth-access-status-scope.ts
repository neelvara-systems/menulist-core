import assert from 'node:assert/strict';

import {
    isAccessStatusEntityIdentityConsistent,
    isAccessStatusStoreOwnedByTenant,
    resolveAccessStatusPreferredScope,
} from '../../src/lib/auth/accessStatusScope';

assert.deepEqual(
    resolveAccessStatusPreferredScope([11, '11'], [12]),
    { documentId: '11', state: 'resolved' },
);
assert.deepEqual(
    resolveAccessStatusPreferredScope([undefined, null], [11, '11']),
    { documentId: '11', state: 'resolved' },
);
assert.deepEqual(resolveAccessStatusPreferredScope([], []), { state: 'absent' });
assert.deepEqual(resolveAccessStatusPreferredScope([11, 12], [11]), { state: 'invalid' });
assert.deepEqual(resolveAccessStatusPreferredScope([11, 'invalid'], [11]), { state: 'invalid' });
assert.deepEqual(resolveAccessStatusPreferredScope([], [11, 12]), { state: 'invalid' });

assert.equal(
    isAccessStatusEntityIdentityConsistent({ tenantId: 11, tId: '11' }, '11', ['tenantId', 'tId']),
    true,
);
assert.equal(
    isAccessStatusEntityIdentityConsistent({}, '11', ['tenantId', 'tId']),
    true,
);
assert.equal(
    isAccessStatusEntityIdentityConsistent({ tenantId: 11, tId: 12 }, '11', ['tenantId', 'tId']),
    false,
);
assert.equal(
    isAccessStatusEntityIdentityConsistent({ storeId: 21, sId: 'invalid' }, '21', ['storeId', 'sId']),
    false,
);

assert.equal(isAccessStatusStoreOwnedByTenant({ tenantId: 11, tId: '11' }, '11'), true);
assert.equal(isAccessStatusStoreOwnedByTenant({ tId: 11 }, '11'), true);
assert.equal(isAccessStatusStoreOwnedByTenant({ tenantId: 11, tId: 12 }, '11'), false);
assert.equal(isAccessStatusStoreOwnedByTenant({ tenantId: 11, tId: 'invalid' }, '11'), false);

console.log('Auth access-status exact scope tests passed');
