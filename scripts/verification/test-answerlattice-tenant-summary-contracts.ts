import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT,
    getAnswerlatticeTenantSummaryShardId,
    parseAnswerlatticeTenantSummary,
} from '../../functions-answerlattice/src/answerlattice/tenantSummary';

const validEntry = {
    pId: 'AL',
    tId: 11,
    sId: 22,
    active: true,
    hasEntities: true,
    source: 'entity_created',
};

const parseOne = (key: string, entry: Record<string, unknown>) => (
    parseAnswerlatticeTenantSummary({ tenants: { [key]: entry } })
);

assert.deepEqual(parseOne('11_22', validEntry).map(({ tId, sId }) => ({ tId, sId })), [
    { tId: 11, sId: 22 },
]);
assert.deepEqual(parseOne('11_22', { ...validEntry, tId: '11', sId: '22' }).map(({ tId, sId }) => ({ tId, sId })), [
    { tId: 11, sId: 22 },
]);

[
    ['wrong_product', { ...validEntry, pId: 'ML' }],
    ['missing_product', (({ pId: _pId, ...entry }) => entry)(validEntry)],
    ['inactive', { ...validEntry, active: false }],
    ['missing_active', (({ active: _active, ...entry }) => entry)(validEntry)],
    ['no_entities', { ...validEntry, hasEntities: false }],
    ['missing_entities', (({ hasEntities: _hasEntities, ...entry }) => entry)(validEntry)],
    ['string_active', { ...validEntry, active: 'true' }],
    ['string_entities', { ...validEntry, hasEntities: 'true' }],
    ['leading_zero', { ...validEntry, tId: '011' }],
    ['exponent_scope', { ...validEntry, tId: '1.1e1' }],
    ['decimal_scope', { ...validEntry, tId: 11.5 }],
    ['unsafe_scope', { ...validEntry, tId: Number.MAX_SAFE_INTEGER + 1 }],
].forEach(([label, entry]) => {
    assert.equal(parseOne('11_22', entry as Record<string, unknown>).length, 0, String(label));
});

assert.equal(parseOne('12_22', validEntry).length, 0, 'summary map key must match embedded scope');
assert.deepEqual(parseAnswerlatticeTenantSummary({ tenants: [] }), []);
assert.deepEqual(parseAnswerlatticeTenantSummary({ tenants: null }), []);

const shardIds = new Set<string>();
for (let tenantId = 1; tenantId <= 2_000; tenantId += 1) {
    const shardId = getAnswerlatticeTenantSummaryShardId(tenantId, tenantId + 10_000);
    assert.match(shardId, /^answerlatticeTenantsSummaryShard_\d{2}$/);
    shardIds.add(shardId);
}
assert.equal(shardIds.size, ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT, 'registry keys should distribute across every bounded shard');

console.log('Answerlattice tenant-summary runtime contracts passed.');
