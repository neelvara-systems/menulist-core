#!/usr/bin/env ts-node

import assert from 'node:assert/strict';

const {
    acquireStoreNightlySchedulerLeaseForTest,
    completeStoreNightlySchedulerLeaseForTest,
} = require('../../functions/lib/functions/src/decisionBlocksScoring.js');
const { firestoreAdmin } = require('../../functions/lib/functions/src/firebaseAdmin.js');

const SYSTEM_COLLECTION = '_system';
const MINUTE_MS = 60 * 1000;

function stateRef(tId: string, sId: string) {
    return firestoreAdmin
        .collection(SYSTEM_COLLECTION)
        .doc(`storeNightlyScheduler_${tId}_${sId}`);
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const tId = 'tenant-a';
    const sId = 'store-a';
    await Promise.all([
        stateRef(tId, sId).delete(),
        stateRef('tenant-b', sId).delete(),
    ]);

    const firstRunAt = new Date('2026-07-23T12:00:00.000Z');
    const concurrent = await Promise.all([
        acquireStoreNightlySchedulerLeaseForTest(firestoreAdmin, tId, sId, 'scheduled-run-1', firstRunAt),
        acquireStoreNightlySchedulerLeaseForTest(firestoreAdmin, tId, sId, 'manual-run-2', firstRunAt),
    ]);
    const acquired = concurrent.filter(Boolean);
    assert.equal(acquired.length, 1, 'one tenant/store may have only one active manual recovery');

    const otherTenantLease = await acquireStoreNightlySchedulerLeaseForTest(
        firestoreAdmin,
        'tenant-b',
        sId,
        'manual-run-tenant-b',
        firstRunAt,
    );
    assert.ok(otherTenantLease, 'a separate tenant/store scope must use an independent lease');
    assert.equal(await completeStoreNightlySchedulerLeaseForTest(otherTenantLease, 'completed'), true);

    const firstLease = acquired[0];
    assert.equal(await completeStoreNightlySchedulerLeaseForTest(firstLease, 'completed'), true);
    const completedState = (await stateRef(tId, sId).get()).data() || {};
    assert.equal(completedState.status, 'completed');
    assert.equal(completedState.leaseOwner, undefined);
    assert.equal(completedState.leaseExpiresAt, undefined);

    const secondLease = await acquireStoreNightlySchedulerLeaseForTest(
        firestoreAdmin,
        tId,
        sId,
        'manual-run-3',
        new Date(firstRunAt.getTime() + MINUTE_MS),
    );
    assert.ok(secondLease, 'a completed recovery must allow an intentional later rerun');

    assert.equal(
        await acquireStoreNightlySchedulerLeaseForTest(
            firestoreAdmin,
            tId,
            sId,
            'manual-run-4',
            new Date(firstRunAt.getTime() + 9 * MINUTE_MS),
        ),
        null,
        'an unexpired recovery lease must reject another owner',
    );

    const replacementLease = await acquireStoreNightlySchedulerLeaseForTest(
        firestoreAdmin,
        tId,
        sId,
        'manual-run-5',
        new Date(firstRunAt.getTime() + 12 * MINUTE_MS),
    );
    assert.ok(replacementLease, 'an expired recovery lease must be recoverable');
    assert.equal(
        await completeStoreNightlySchedulerLeaseForTest(secondLease, 'completed'),
        false,
        'an expired owner must not finalize over its replacement',
    );
    const replacementState = (await stateRef(tId, sId).get()).data() || {};
    assert.equal(replacementState.status, 'running');
    assert.equal(replacementState.leaseOwner, replacementLease.leaseOwner);
    assert.equal(await completeStoreNightlySchedulerLeaseForTest(replacementLease, 'failed'), true);

    process.stdout.write('Store nightly scheduler lease emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
