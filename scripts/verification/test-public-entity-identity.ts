#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from '../../src/lib/publicTruth/entityEligibility';

assert.deepEqual(
    normalizeMenuListPublicEntityIdentityAliases([101, '101']),
    { documentId: '101', numericId: 101 },
    'compatible numeric/string legacy aliases must resolve to one canonical identity',
);
assert.equal(
    normalizeMenuListPublicEntityIdentityAliases([101, 102]),
    null,
    'conflicting store or tenant identity aliases must fail closed',
);
assert.equal(
    normalizeMenuListPublicEntityIdentityAliases(['101', '0101']),
    null,
    'leading-zero aliases must not coerce to a canonical identity',
);
assert.equal(
    normalizeMenuListPublicEntityIdentityAliases(['101', '1.01e2']),
    null,
    'scientific-notation aliases must not coerce to a canonical identity',
);
assert.equal(
    normalizeMenuListPublicEntityIdentityAliases([' 101']),
    null,
    'whitespace-mutated identities must fail closed',
);
assert.equal(
    normalizeMenuListPublicEntityIdentityAliases([]),
    null,
    'missing required identity aliases must not invent scope',
);

assert.equal(isMenuListPublicEntityEligible({}), true, 'legacy entities without lifecycle flags remain eligible');
assert.equal(isMenuListPublicEntityEligible({ active: false }), false, 'inactive entities fail closed');
assert.equal(isMenuListPublicEntityEligible({ deleted: true }), false, 'deleted entities fail closed');
assert.equal(isMenuListPublicEntityEligible({ tenantBlocked: true }), false, 'tenant-block mirrors fail closed');
assert.equal(
    isMenuListPublicEntityEligible({ blockDetails: { blocked: true } }),
    false,
    'canonical platform block details fail closed',
);

process.stdout.write('Public entity identity and lifecycle boundary tests passed.\n');
