import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getSchedulerTaskStatus } from '../../functions/src/schedulers/taskStatus';

assert.equal(getSchedulerTaskStatus(0), 'success');
assert.equal(getSchedulerTaskStatus(1), 'failed');
assert.equal(getSchedulerTaskStatus(5), 'failed');
assert.equal(getSchedulerTaskStatus(Number.NaN), 'failed');
assert.equal(getSchedulerTaskStatus(-1), 'failed');
assert.equal(getSchedulerTaskStatus(1.5), 'failed');

const schedulerSource = readFileSync(
    path.resolve(process.cwd(), 'functions/src/decisionBlocksScoring.ts'),
    'utf8',
);

for (const failureExpression of [
    'results.intelligenceFailed',
    'ownerBusinessHealthResults.storesFailed',
    'driftResult.errors.length',
    'smResult.errors',
    'learningResult.storesFailed',
    'stalenessResult.errors',
    'storeRun.intelligenceFailed',
    'ownerBusinessHealthFailed ? 1 : 0',
]) {
    assert.ok(
        schedulerSource.includes(`getSchedulerTaskStatus(${failureExpression})`),
        `scheduler must derive task status from ${failureExpression}`,
    );
}

assert.ok(
    schedulerSource.includes('|| storeRun.intelligenceFailed > 0')
        && schedulerSource.includes('|| storeRun.analytics.storesFailed > 0')
        && schedulerSource.includes('|| ownerBusinessHealthFailed'),
    'manual recovery status must include non-scoring subsystem failures',
);
assert.ok(
    !schedulerSource.includes("driftResult.errors.length > 0 ? 'success' : 'success'"),
    'menu-drift errors must never be hard-coded as success',
);

console.log('Scheduler task-status boundary tests passed.');
