#!/usr/bin/env ts-node

import assert = require('node:assert/strict');

const {
    acquireTaskLeaseForTest,
    recordTaskOutcomeForTest,
    replaceBillingHealthStateForTest,
    runOwnerNotificationRetentionCleanupForTest,
} = require('../../functions/lib/functions/src/schedulers/menulistMaintenanceScheduler.js');
const { firestoreAdmin } = require('../../functions/lib/functions/src/firebaseAdmin.js');
const {
    getOwnerNotificationDigest,
    retryFailedOwnerNotifications,
} = require('../../functions/lib/functions/src/ownerNotifications/processor.js');
const { createRequire } = require('node:module');
const requireFromFunctions = createRequire(require.resolve('../../functions/package.json'));
const { FieldValue, Timestamp } = requireFromFunctions('firebase-admin/firestore');

const SYSTEM_COLLECTION = '_system';
const STATE_DOCUMENT = 'menulistMaintenanceScheduler';
const LOCK_DOCUMENT = 'menulistMaintenanceTaskLock_lease_ownership_test';
const BILLING_HEALTH_DOCUMENT = 'billing';
const MINUTE_MS = 60 * 1000;

const task = {
    name: 'lease_ownership_test',
    cadence: { type: 'every', minutes: 60 },
    lockTtlMs: 10 * MINUTE_MS,
    run: async () => ({ activity: false }),
};

async function resetState(): Promise<void> {
    await Promise.all([
        firestoreAdmin.collection(SYSTEM_COLLECTION).doc(STATE_DOCUMENT).delete(),
        firestoreAdmin.collection(SYSTEM_COLLECTION).doc(LOCK_DOCUMENT).delete(),
        firestoreAdmin.collection('systemHealth').doc(BILLING_HEALTH_DOCUMENT).delete(),
        firestoreAdmin.recursiveDelete(firestoreAdmin.collection('ownerNotificationEvents')),
        firestoreAdmin.recursiveDelete(firestoreAdmin.collection('ownerNotificationDeliveries')),
        firestoreAdmin.recursiveDelete(firestoreAdmin.collection('ownerNotificationRateLimits')),
    ]);
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    await resetState();
    const firstStartedAt = new Date('2026-07-22T00:00:00.000Z');
    const firstLease = await acquireTaskLeaseForTest(task, 'run_one', firstStartedAt);
    assert.ok(firstLease, 'the first scheduler run must acquire the task lease');

    const replacementStartedAt = new Date(firstStartedAt.getTime() + 11 * MINUTE_MS);
    const replacementLease = await acquireTaskLeaseForTest(task, 'run_two', replacementStartedAt);
    assert.ok(replacementLease, 'an expired task lease must be recoverable');

    const staleFinalized = await recordTaskOutcomeForTest({
        task,
        leaseId: firstLease.leaseId,
        runId: 'run_one',
        startedAt: firstStartedAt,
        finishedAt: new Date(replacementStartedAt.getTime() + MINUTE_MS),
        status: 'success',
        durationMs: 12 * MINUTE_MS,
        details: { stale: true },
    });
    assert.equal(staleFinalized, false, 'an expired task owner must not publish an outcome');

    const staleState = (await firestoreAdmin.collection(SYSTEM_COLLECTION).doc(STATE_DOCUMENT).get()).data() || {};
    assert.equal(staleState.tasks?.lease_ownership_test, undefined);
    const replacementLock = (await firestoreAdmin.collection(SYSTEM_COLLECTION).doc(LOCK_DOCUMENT).get()).data() || {};
    assert.equal(replacementLock.leaseOwner, replacementLease.leaseId);

    const replacementFinalized = await recordTaskOutcomeForTest({
        task,
        leaseId: replacementLease.leaseId,
        runId: 'run_two',
        startedAt: replacementStartedAt,
        finishedAt: new Date(replacementStartedAt.getTime() + MINUTE_MS),
        status: 'success',
        durationMs: MINUTE_MS,
        details: { stale: false },
    });
    assert.equal(replacementFinalized, true, 'the current task owner must publish its outcome');

    const finalState = (await firestoreAdmin.collection(SYSTEM_COLLECTION).doc(STATE_DOCUMENT).get()).data() || {};
    assert.equal(finalState.tasks?.lease_ownership_test?.lastRunId, 'run_two');
    assert.equal(finalState.tasks?.lease_ownership_test?.lastStatus, 'success');
    assert.deepEqual(finalState.tasks?.lease_ownership_test?.lastDetails, { stale: false });
    const finalLock = (await firestoreAdmin.collection(SYSTEM_COLLECTION).doc(LOCK_DOCUMENT).get()).data() || {};
    assert.equal(finalLock.leaseOwner, null);
    assert.equal(finalLock.leaseExpiresAt.toMillis(), 0);

    const billingHealthRef = firestoreAdmin.collection('systemHealth').doc(BILLING_HEALTH_DOCUMENT);
    await billingHealthRef.set({ stalePrivateField: 'must-be-pruned', status: 'attention' });
    await replaceBillingHealthStateForTest({
        ambiguousProviderCheckoutCount: 0,
        ambiguousProviderPlanCount: 0,
        checkedAt: Timestamp.fromDate(new Date('2026-07-22T01:00:00.000Z')),
        expiredProcessingCheckoutCount: 0,
        expiredProcessingProviderPlanCount: 0,
        failedWebhookEventCount: 0,
        hasLimitedCount: false,
        orphanedProviderCheckoutCount: 0,
        staleWebhookClaimCount: 0,
        status: 'healthy',
        updatedAt: FieldValue.serverTimestamp(),
        webhookEventsDeleted: 0,
    });
    const billingHealth = (await billingHealthRef.get()).data() || {};
    assert.deepEqual(Object.keys(billingHealth).sort(), [
        'ambiguousProviderCheckoutCount',
        'ambiguousProviderPlanCount',
        'checkedAt',
        'expiredProcessingCheckoutCount',
        'expiredProcessingProviderPlanCount',
        'failedWebhookEventCount',
        'hasLimitedCount',
        'orphanedProviderCheckoutCount',
        'staleWebhookClaimCount',
        'status',
        'updatedAt',
        'webhookEventsDeleted',
    ]);
    assert.equal(billingHealth.status, 'healthy');

    const expiredAt = Timestamp.fromDate(new Date('2026-07-21T00:00:00.000Z'));
    for (const collectionName of [
        'ownerNotificationEvents',
        'ownerNotificationDeliveries',
        'ownerNotificationRateLimits',
    ]) {
        await firestoreAdmin.collection(collectionName).doc('ml-expired').set({ productId: 'ML', expiresAt: expiredAt });
        await firestoreAdmin.collection(collectionName).doc('al-expired').set({ productId: 'AL', expiresAt: expiredAt });
    }
    const notificationCleanup = await runOwnerNotificationRetentionCleanupForTest(
        Timestamp.fromDate(new Date('2026-07-22T00:00:00.000Z')),
    );
    assert.equal(notificationCleanup.details?.deleted, 3);
    for (const collectionName of [
        'ownerNotificationEvents',
        'ownerNotificationDeliveries',
        'ownerNotificationRateLimits',
    ]) {
        assert.equal((await firestoreAdmin.collection(collectionName).doc('ml-expired').get()).exists, false);
        assert.equal((await firestoreAdmin.collection(collectionName).doc('al-expired').get()).exists, true);
    }

    const recent = Timestamp.now();
    const older = Timestamp.fromMillis(recent.toMillis() - 60_000);
    for (let index = 0; index < 20; index += 1) {
        await firestoreAdmin.collection('ownerNotificationEvents').doc(`al-failed-${String(index).padStart(2, '0')}`).set({
            productId: 'AL',
            status: 'failed',
            updatedAt: older,
        });
    }
    await firestoreAdmin.collection('ownerNotificationEvents').doc('ml-failed-no-retry').set({
        productId: 'ML',
        status: 'failed',
        retryCount: 1,
        updatedAt: recent,
    });
    const retryResult = await retryFailedOwnerNotifications();
    assert.deepEqual(retryResult, { retried: 0, succeeded: 0 });
    for (let index = 0; index < 20; index += 1) {
        const foreign = (await firestoreAdmin.collection('ownerNotificationEvents')
            .doc(`al-failed-${String(index).padStart(2, '0')}`).get()).data();
        assert.equal(foreign?.retryCount, undefined);
        assert.equal(foreign?.retriedAt, undefined);
    }

    await firestoreAdmin.collection('ownerNotificationDeliveries').doc('ml-sent').set({
        productId: 'ML', status: 'sent', createdAt: recent,
    });
    await firestoreAdmin.collection('ownerNotificationDeliveries').doc('al-sent').set({
        productId: 'AL', status: 'sent', createdAt: recent,
    });
    await firestoreAdmin.collection('ownerNotificationDeliveries').doc('al-failed').set({
        productId: 'AL', status: 'failed', createdAt: recent,
    });
    assert.deepEqual(await getOwnerNotificationDigest(), { sent: 1, failed: 0, total: 1 });

    await resetState();
    process.stdout.write('Maintenance task lease emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
