import assert from 'node:assert/strict';
import { normalizeDefaultProjectAiContextRequest } from '../../src/services/ai/shared/defaultProjectAiContextBoundary';

const tenantOne = normalizeDefaultProjectAiContextRequest({
    activeSpecialMenuId: '1-special-101',
    primaryProjectId: '1-default-101',
    storeId: 101,
    tenantId: 1,
});
const tenantTwo = normalizeDefaultProjectAiContextRequest({
    activeSpecialMenuId: '1-special-101',
    primaryProjectId: '1-default-101',
    storeId: 101,
    tenantId: 2,
});

assert.deepEqual(tenantOne?.expectedScope, { tId: 1, sId: 101 });
assert.deepEqual(tenantTwo?.expectedScope, { tId: 2, sId: 101 });
assert.notEqual(
    tenantOne?.cacheKey,
    tenantTwo?.cacheKey,
    'different tenants sharing a numeric store ID must never share AI context cache state',
);

assert.equal(
    normalizeDefaultProjectAiContextRequest({ storeId: 101 }),
    null,
    'missing tenant scope must fail closed',
);
assert.equal(
    normalizeDefaultProjectAiContextRequest({ tenantId: 1 }),
    null,
    'missing store scope must fail closed',
);

for (const invalidScope of [
    { tenantId: '01', storeId: 101 },
    { tenantId: 1, storeId: '0101' },
    { tenantId: 1.5, storeId: 101 },
    { tenantId: 1, storeId: -1 },
    { tenantId: '1e0', storeId: 101 },
]) {
    assert.equal(
        normalizeDefaultProjectAiContextRequest(invalidScope),
        null,
        `malformed AI context scope must fail closed: ${JSON.stringify(invalidScope)}`,
    );
}

const boundedSelectors = normalizeDefaultProjectAiContextRequest({
    activeSpecialMenuId: ` ${'x'.repeat(180)}`,
    primaryProjectId: ' valid-project ',
    storeId: '101',
    tenantId: '1',
});
assert.equal(boundedSelectors?.activeSpecialMenuId, '');
assert.equal(boundedSelectors?.primaryProjectId, '');

console.log('Default project AI context boundary tests passed.');
