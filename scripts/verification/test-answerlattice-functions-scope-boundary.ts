import assert from 'node:assert/strict';
import {
    normalizeExactAnswerlatticeScopeId,
    normalizeStoredAnswerlatticeScopeId,
    parseExactAnswerlatticeScope,
    parseStoredAnswerlatticeScope,
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

console.log('Answerlattice Functions exact scope boundary tests passed.');
