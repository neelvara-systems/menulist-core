#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { AnswerlatticeSchedulerReadObserver } from '../../functions-answerlattice/src/answerlattice/schedulerReadTelemetry';

const observer = new AnswerlatticeSchedulerReadObserver();
observer.record({
    source: 'answerlattice_signalEvents',
    window: 'rolling_14d',
    documentsReturned: 80,
    queryLimit: 501,
});
observer.record({
    source: 'answerlattice_signalEvents',
    window: 'rolling_14d',
    documentsReturned: 501,
    queryLimit: 501,
    saturated: true,
});
observer.record({
    source: 'invalid source',
    window: 'rolling_14d',
    documentsReturned: 1,
    queryLimit: 1,
});
observer.record({
    source: 'answerlattice_signalEvents',
    window: 'invalid window',
    documentsReturned: 1,
    queryLimit: 1,
});

assert.deepEqual(observer.snapshot(), [
    ['answerlattice_signalEvents', 'rolling_14d', 2, 581, 1002, 1],
]);

const bounded = new AnswerlatticeSchedulerReadObserver();
for (let index = 0; index < 10; index += 1) {
    bounded.record({
        source: `source_${index}`,
        window: 'all',
        documentsReturned: index,
        queryLimit: 100,
    });
}
assert.equal(bounded.snapshot().length, 8, 'a task run log must retain at most eight source windows');

const immutableSnapshot = bounded.snapshot();
immutableSnapshot.pop();
assert.equal(bounded.snapshot().length, 8, 'callers must not mutate observer state through a snapshot');

process.stdout.write('Answerlattice scheduler read telemetry passed.\n');
