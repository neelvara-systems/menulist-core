import assert from 'node:assert/strict';
import {
    buildAnswerlatticeIntegrationConfigIdentity,
    classifyAnswerlatticeIntegrationConfigOwnership,
} from '../../src/lib/answerlattice/integrationConfigOwnership';
import {
    buildIntegrationConfigIdentity,
    classifyIntegrationConfigOwnership,
} from '../../functions-answerlattice/src/integrations/configOwnership';

const scope = { tId: 11, sId: 22 };
const cases: Array<{ value: unknown; expected: 'owned' | 'legacy-unowned' | 'invalid' }> = [
    { value: {}, expected: 'legacy-unowned' },
    { value: { slack: {} }, expected: 'legacy-unowned' },
    { value: { pId: 'AL', tId: 11, sId: 22 }, expected: 'owned' },
    { value: { pId: 'AL', tId: '11', sId: '22' }, expected: 'owned' },
    { value: { pId: 'ML', tId: 11, sId: 22 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: 99, sId: 22 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: 11, sId: 99 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: 11 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: '011', sId: '22' }, expected: 'invalid' },
    { value: { pId: 'AL', tId: '11e0', sId: '22' }, expected: 'invalid' },
    { value: null, expected: 'invalid' },
    { value: [], expected: 'invalid' },
];

for (const testCase of cases) {
    assert.equal(classifyAnswerlatticeIntegrationConfigOwnership(testCase.value, scope), testCase.expected);
    assert.equal(classifyIntegrationConfigOwnership(testCase.value, scope.tId, scope.sId), testCase.expected);
}

assert.deepEqual(buildAnswerlatticeIntegrationConfigIdentity(scope), { pId: 'AL', tId: 11, sId: 22 });
assert.deepEqual(buildIntegrationConfigIdentity(scope.tId, scope.sId), { pId: 'AL', tId: 11, sId: 22 });
assert.equal(buildAnswerlatticeIntegrationConfigIdentity({ tId: 0, sId: 22 }), null);
assert.equal(buildIntegrationConfigIdentity('11', 22), null);

console.log('Answerlattice integration-config ownership boundaries passed.');
