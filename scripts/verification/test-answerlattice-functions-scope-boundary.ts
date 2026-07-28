import assert from 'node:assert/strict';
import {
    hasExactStoredAnswerlatticeProductAliases,
    normalizeExactAnswerlatticeScopeId,
    normalizeStoredAnswerlatticeScopeId,
    parseExactAnswerlatticeScope,
    parseStoredAnswerlatticeScope,
    parseStoredAnswerlatticeScopeAliases,
} from '../../functions-answerlattice/src/answerlattice/scopeBoundary';

assert.equal(normalizeExactAnswerlatticeScopeId(1), 1);
assert.equal(normalizeExactAnswerlatticeScopeId(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
[
    '1',
    '01',
    '1e0',
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    null,
    undefined,
    true,
    {},
].forEach(value => assert.equal(normalizeExactAnswerlatticeScopeId(value), null));

assert.deepEqual(parseExactAnswerlatticeScope(11, 22), { tId: 11, sId: 22 });
assert.equal(parseExactAnswerlatticeScope('11', 22), null);
assert.equal(parseExactAnswerlatticeScope(11, '22'), null);
assert.equal(parseExactAnswerlatticeScope(11, undefined), null);

assert.equal(normalizeStoredAnswerlatticeScopeId('11'), 11);
assert.equal(normalizeStoredAnswerlatticeScopeId('01'), null);
assert.equal(normalizeStoredAnswerlatticeScopeId('1e1'), null);
assert.equal(normalizeStoredAnswerlatticeScopeId(' 11'), null);
assert.deepEqual(parseStoredAnswerlatticeScope('11', '22'), { tId: 11, sId: 22 });
assert.equal(parseStoredAnswerlatticeScope('011', '22'), null);
assert.deepEqual(
    parseStoredAnswerlatticeScopeAliases({ tId: 11, tenantId: '11', sId: '22', storeId: 22 }),
    { tId: 11, sId: 22 },
);
assert.deepEqual(
    parseStoredAnswerlatticeScopeAliases({ tenantId: 11, storeId: 22 }),
    { tId: 11, sId: 22 },
);
assert.equal(
    parseStoredAnswerlatticeScopeAliases({ tId: 11, tenantId: 12, sId: 22, storeId: 22 }),
    null,
);
assert.equal(
    parseStoredAnswerlatticeScopeAliases({ tId: 11, tenantId: 11, sId: 22, storeId: 23 }),
    null,
);
assert.equal(
    parseStoredAnswerlatticeScopeAliases({ tId: 11, sId: 22, storeId: '022' }),
    null,
);
assert.equal(hasExactStoredAnswerlatticeProductAliases({ pId: 'AL' }), true);
assert.equal(hasExactStoredAnswerlatticeProductAliases({ productId: 'AL' }), true);
assert.equal(hasExactStoredAnswerlatticeProductAliases({ pId: 'AL', productId: 'AL' }), true);
assert.equal(hasExactStoredAnswerlatticeProductAliases({ pId: 'AL', productId: 'ML' }), false);
assert.equal(hasExactStoredAnswerlatticeProductAliases({ pId: 'ML', productId: 'AL' }), false);
assert.equal(hasExactStoredAnswerlatticeProductAliases({}), false);

console.log('Answerlattice Functions exact scope boundary tests passed.');
