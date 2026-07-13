import assert from 'node:assert/strict';
import { deriveAutomatedDriftState } from '../../functions-answerlattice/src/answerlattice/driftState';

assert.deepEqual(
    deriveAutomatedDriftState(false, null, []),
    { driftFlag: false, driftReason: null, shouldWrite: false },
    'a clean automated evaluation must not create a write',
);

assert.deepEqual(
    deriveAutomatedDriftState(true, '[signal_anomaly] existing', []),
    { driftFlag: true, driftReason: '[signal_anomaly] existing', shouldWrite: false },
    'a clean automated evaluation must not clear owner-review drift',
);

assert.deepEqual(
    deriveAutomatedDriftState(false, null, [' [scope_conflict] overlap ']),
    { driftFlag: true, driftReason: '[scope_conflict] overlap', shouldWrite: true },
    'new automated drift must be persisted',
);

assert.deepEqual(
    deriveAutomatedDriftState(true, '[scope_conflict] overlap', ['[scope_conflict] overlap']),
    { driftFlag: true, driftReason: '[scope_conflict] overlap', shouldWrite: false },
    'identical automated drift must be idempotent',
);

assert.deepEqual(
    deriveAutomatedDriftState(true, '[scope_conflict] overlap', ['[signal_anomaly] feedback']),
    { driftFlag: true, driftReason: '[signal_anomaly] feedback', shouldWrite: true },
    'changed drift evidence must refresh the review reason without clearing drift',
);

process.stdout.write('Answerlattice automated drift state tests passed.\n');
