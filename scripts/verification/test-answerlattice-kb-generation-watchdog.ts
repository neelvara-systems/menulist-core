#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { expireStaleAnswerlatticeGenerationJobs } from '../../functions-answerlattice/src/answerlattice/kbGenerationWatchdog';
import { admin, firestoreAdmin } from '../../functions-answerlattice/src/firebaseAdmin';

const Timestamp = admin.firestore.Timestamp;

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const jobs = firestoreAdmin.collection('kb_generation_jobs');
    await firestoreAdmin.recursiveDelete(jobs);

    const now = Timestamp.fromMillis(Date.UTC(2026, 6, 14, 12, 0, 0));
    const stale = Timestamp.fromMillis(now.toMillis() - 31 * 60 * 1000);
    const fresh = Timestamp.fromMillis(now.toMillis() - 29 * 60 * 1000);
    await Promise.all([
        jobs.doc('stale-valid').set({
            pId: 'AL', tId: 1, sId: 101, status: 'processing', modifiedOn: stale,
            generationRun: {
                id: 'run-valid', status: 'processing', startedAt: stale,
                leaseExpiresAt: Timestamp.fromMillis(stale.toMillis() + 15 * 60 * 1000), completedAt: null,
            },
        }),
        jobs.doc('fresh-valid').set({ pId: 'AL', tId: 1, sId: 101, status: 'processing', modifiedOn: fresh }),
        jobs.doc('wrong-product').set({ pId: 'ML', tId: 1, sId: 101, status: 'processing', modifiedOn: stale }),
        jobs.doc('wrong-tenant-type').set({ pId: 'AL', tId: '1', sId: 101, status: 'processing', modifiedOn: stale }),
        jobs.doc('wrong-store').set({ pId: 'AL', tId: 1, sId: 0, status: 'processing', modifiedOn: stale }),
    ]);

    const first = await expireStaleAnswerlatticeGenerationJobs(now);
    assert.equal(first.scanned, 4, 'only stale processing candidates should be scanned');
    assert.equal(first.timedOut, 1, 'only the exact Answerlattice-scoped job may be mutated');
    assert.equal(first.skippedInvalidScope, 3);
    assert.equal(first.skippedChanged, 0);

    const timedOut = (await jobs.doc('stale-valid').get()).data();
    assert.equal(timedOut?.status, 'failed');
    assert.equal(timedOut?.failureStage, 'generation');
    assert.equal(timedOut?.generationRun?.id, 'run-valid');
    assert.equal(timedOut?.generationRun?.status, 'failed');
    assert.equal(timedOut?.generationRun?.completedAt?.toMillis(), now.toMillis());
    assert.equal(timedOut?.modifiedOn?.toMillis(), now.toMillis());
    assert.match(timedOut?.errorMessage || '', /timed out/i);

    for (const id of ['fresh-valid', 'wrong-product', 'wrong-tenant-type', 'wrong-store']) {
        assert.equal((await jobs.doc(id).get()).get('status'), 'processing', `${id} must remain unchanged`);
    }

    const replay = await expireStaleAnswerlatticeGenerationJobs(now);
    assert.equal(replay.timedOut, 0, 'terminal replay must not repeat the side effect');
    assert.equal(replay.skippedInvalidScope, 3, 'malformed/cross-product candidates remain fail-closed');
}

run()
    .then(() => process.stdout.write('Answerlattice KB generation watchdog tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
