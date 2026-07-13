import assert from 'assert';
import { resolveAnswerlatticeTenantSettlementCompletionStatus } from '../../functions-answerlattice/src/answerlattice/masterSchedulerState';

assert.equal(resolveAnswerlatticeTenantSettlementCompletionStatus('success'), 'completed');
assert.equal(resolveAnswerlatticeTenantSettlementCompletionStatus('partial'), 'completed');
assert.equal(resolveAnswerlatticeTenantSettlementCompletionStatus('failed'), 'failed');
assert.equal(resolveAnswerlatticeTenantSettlementCompletionStatus(undefined), 'failed');

console.log('Answerlattice master scheduler settlement-state contracts passed.');
