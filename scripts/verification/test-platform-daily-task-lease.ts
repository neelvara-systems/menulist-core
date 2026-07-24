#!/usr/bin/env ts-node

import assert from 'node:assert/strict';

const {
    acquirePlatformDailyTaskLeaseForTest,
    completePlatformDailyTaskLeaseForTest,
    getPlatformDailyTaskDayKeyForTest,
} = require('../../functions/lib/functions/src/decisionBlocksScoring.js');
const { firestoreAdmin } = require('../../functions/lib/functions/src/firebaseAdmin.js');

const STATE_COLLECTION = '_system';
const STATE_DOCUMENT = 'decisionBlocksPlatformDaily';
const MINUTE_MS = 60 * 1000;

async function resetState(): Promise<void> {
    await firestoreAdmin.collection(STATE_COLLECTION).doc(STATE_DOCUMENT).delete();
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    await resetState();
    const firstRunAt = new Date('2026-07-17T00:30:00.000Z');
    const concurrent = await Promise.all([
        acquirePlatformDailyTaskLeaseForTest(firestoreAdmin, firstRunAt),
        acquirePlatformDailyTaskLeaseForTest(firestoreAdmin, firstRunAt),
    ]);
    const acquired = concurrent.filter(Boolean);
    assert.equal(acquired.length, 1, 'concurrent scheduler instances must acquire one daily lease');

    assert.equal(getPlatformDailyTaskDayKeyForTest(firstRunAt), acquired[0].dayKey);
    assert.equal(await completePlatformDailyTaskLeaseForTest(acquired[0], 'completed'), true);
    assert.equal(
        await acquirePlatformDailyTaskLeaseForTest(
            firestoreAdmin,
            new Date(firstRunAt.getTime() + 12 * 60 * MINUTE_MS),
        ),
        null,
        'a completed UTC day must not rerun platform-wide tasks',
    );

    const nextDayAt = new Date('2026-07-18T00:30:00.000Z');
    const nextDayLease = await acquirePlatformDailyTaskLeaseForTest(firestoreAdmin, nextDayAt);
    assert.ok(nextDayLease, 'the next UTC day must be eligible');
    assert.equal(await completePlatformDailyTaskLeaseForTest(nextDayLease, 'failed'), true);

    assert.equal(
        await acquirePlatformDailyTaskLeaseForTest(
            firestoreAdmin,
            new Date(nextDayAt.getTime() + 30 * MINUTE_MS),
        ),
        null,
        'a failed suite must respect the bounded retry delay',
    );

    const retryAt = new Date(nextDayAt.getTime() + 56 * MINUTE_MS);
    const retryLease = await acquirePlatformDailyTaskLeaseForTest(firestoreAdmin, retryAt);
    assert.ok(retryLease, 'a failed suite must become retryable after the delay');
    assert.equal(await completePlatformDailyTaskLeaseForTest(retryLease, 'completed'), true);

    const state = (await firestoreAdmin.collection(STATE_COLLECTION).doc(STATE_DOCUMENT).get()).data() || {};
    assert.equal(state.status, 'completed');
    assert.equal(state.lastCompletedDayKey, '2026-07-18');
    assert.equal(state.leaseExpiresAt, undefined);

    await resetState();
    const expiryTestAt = new Date('2026-07-19T00:30:00.000Z');
    const expiringLease = await acquirePlatformDailyTaskLeaseForTest(firestoreAdmin, expiryTestAt);
    assert.ok(expiringLease, 'an unclaimed day must acquire a lease');
    assert.equal(
        await acquirePlatformDailyTaskLeaseForTest(
            firestoreAdmin,
            new Date(expiryTestAt.getTime() + 9 * MINUTE_MS),
        ),
        null,
        'an unexpired running lease must exclude a second owner',
    );
    const recoveredLease = await acquirePlatformDailyTaskLeaseForTest(
        firestoreAdmin,
        new Date(expiryTestAt.getTime() + 11 * MINUTE_MS),
    );
    assert.ok(recoveredLease, 'an expired running lease must be recoverable');
    assert.equal(
        await completePlatformDailyTaskLeaseForTest(expiringLease, 'completed'),
        false,
        'an expired lease owner must not finalize over its replacement',
    );
    const replacementState = (await firestoreAdmin.collection(STATE_COLLECTION).doc(STATE_DOCUMENT).get()).data() || {};
    assert.equal(replacementState.status, 'running');
    assert.equal(replacementState.leaseOwner, recoveredLease.leaseOwner);
    assert.equal(await completePlatformDailyTaskLeaseForTest(recoveredLease, 'completed'), true);

    process.stdout.write('Platform daily task lease emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
