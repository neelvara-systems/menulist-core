import assert from 'node:assert/strict';

import { createFirebaseAuthMutationQueue } from '../../src/lib/auth/firebaseAuthMutationQueue';

const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
};

async function main(): Promise<void> {
    const queue = createFirebaseAuthMutationQueue();
    const firstGate = deferred<void>();
    const executionOrder: string[] = [];

    const staleHqRefresh = queue(async () => {
        executionOrder.push('hq-start');
        await firstGate.promise;
        executionOrder.push('hq-finish');
        return 'hq';
    });
    const currentBranchRefresh = queue(async () => {
        executionOrder.push('branch-start');
        executionOrder.push('branch-finish');
        return 'branch';
    });

    await Promise.resolve();
    assert.deepEqual(executionOrder, ['hq-start']);
    firstGate.resolve();
    assert.equal(await staleHqRefresh, 'hq');
    assert.equal(await currentBranchRefresh, 'branch');
    assert.deepEqual(executionOrder, ['hq-start', 'hq-finish', 'branch-start', 'branch-finish']);

    const failedRefresh = queue(async () => {
        executionOrder.push('failed-start');
        throw new Error('expected test failure');
    });
    const recoveryRefresh = queue(async () => {
        executionOrder.push('recovery-start');
        return 'recovered';
    });

    await assert.rejects(failedRefresh, /expected test failure/);
    assert.equal(await recoveryRefresh, 'recovered');
    assert.deepEqual(executionOrder.slice(-2), ['failed-start', 'recovery-start']);

    process.stdout.write('Firebase Auth mutation queue concurrency boundary verified.\n');
}

void main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
