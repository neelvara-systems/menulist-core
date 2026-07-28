#!/usr/bin/env ts-node

import assert = require('node:assert/strict');

const {
    acquireTaskLeaseForTest,
    recordTaskOutcomeForTest,
    replaceBillingHealthStateForTest,
    runOwnerNotificationRetentionCleanupForTest,
} = require('../../functions/lib/schedulers/menulistMaintenanceScheduler.js');
const { firestoreAdmin } = require('../../functions/lib/firebaseAdmin.js');
const {
    getOwnerNotificationDigest,
    processOwnerNotificationEvent,
    retryFailedOwnerNotifications,
} = require('../../functions/lib/ownerNotifications/processor.js');
const {
    projectOwnerNotificationPersistedEvent,
} = require('../../functions/lib/sharedData/ownerNotificationDeliveryBoundary.js');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const requireFromFunctions = createRequire(require.resolve('../../functions/package.json'));
const { FieldValue, Timestamp } = requireFromFunctions('firebase-admin/firestore');

const SYSTEM_COLLECTION = '_system';
const STATE_DOCUMENT = 'menulistMaintenanceScheduler';
const LOCK_DOCUMENT = 'menulistMaintenanceTaskLock_lease_ownership_test';
const BILLING_HEALTH_DOCUMENT = 'billing';
const MINUTE_MS = 60 * 1000;
const OWNER_NOTIFICATION_TENANT_ID = '101';
const OWNER_NOTIFICATION_STORE_ID = '202';

function sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
}

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
        firestoreAdmin.collection('stores').doc(OWNER_NOTIFICATION_STORE_ID).delete(),
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
    const legacyExpiredAt = Timestamp.fromDate(new Date('2026-05-01T00:00:00.000Z'));
    const cleanupNow = Timestamp.fromDate(new Date('2026-07-22T00:00:00.000Z'));
    for (const [collectionName, timestampField] of [
        ['ownerNotificationEvents', 'createdAt'],
        ['ownerNotificationDeliveries', 'createdAt'],
        ['ownerNotificationRateLimits', 'updatedAt'],
    ] as const) {
        await firestoreAdmin.collection(collectionName).doc('ml-legacy-expired').set({
            productId: 'ML',
            [timestampField]: legacyExpiredAt,
        });
        await firestoreAdmin.collection(collectionName).doc('al-legacy-expired').set({
            productId: 'AL',
            [timestampField]: legacyExpiredAt,
        });
        await firestoreAdmin.collection(collectionName).doc('ml-legacy-current').set({
            productId: 'ML',
            [timestampField]: cleanupNow,
        });
    }
    const notificationCleanup = await runOwnerNotificationRetentionCleanupForTest(
        cleanupNow,
    );
    assert.equal(notificationCleanup.details?.deleted, 6);
    for (const collectionName of [
        'ownerNotificationEvents',
        'ownerNotificationDeliveries',
        'ownerNotificationRateLimits',
    ]) {
        assert.equal((await firestoreAdmin.collection(collectionName).doc('ml-expired').get()).exists, false);
        assert.equal((await firestoreAdmin.collection(collectionName).doc('al-expired').get()).exists, true);
        assert.equal((await firestoreAdmin.collection(collectionName).doc('ml-legacy-expired').get()).exists, false);
        assert.equal((await firestoreAdmin.collection(collectionName).doc('al-legacy-expired').get()).exists, true);
        assert.equal((await firestoreAdmin.collection(collectionName).doc('ml-legacy-current').get()).exists, true);
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
    assert.deepEqual(retryResult, { retried: 0, succeeded: 0, ambiguous: 0 });
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

    const notificationNow = Timestamp.now();
    const notificationEmail = 'owner@example.com';
    await firestoreAdmin.collection('stores').doc(OWNER_NOTIFICATION_STORE_ID).set({
        tenantId: Number(OWNER_NOTIFICATION_TENANT_ID),
        storeId: Number(OWNER_NOTIFICATION_STORE_ID),
        name: 'Owner Store',
        email: notificationEmail,
    });

    const malformedRetryReferenceId = 'menu_publish_malformed_retry';
    const malformedRetryDedupeKey = [
        'ML',
        'STORE_PUBLISHED',
        OWNER_NOTIFICATION_TENANT_ID,
        OWNER_NOTIFICATION_STORE_ID,
        malformedRetryReferenceId,
    ].join('|');
    const malformedRetryEventId = sha256(malformedRetryDedupeKey).slice(0, 40);
    await firestoreAdmin.collection('ownerNotificationEvents').doc(malformedRetryEventId).set({
        productId: 'ML',
        triggerType: 'STORE_PUBLISHED',
        tenantId: OWNER_NOTIFICATION_TENANT_ID,
        storeId: OWNER_NOTIFICATION_STORE_ID,
        referenceId: malformedRetryReferenceId,
        dedupeKey: malformedRetryDedupeKey,
        recipientRole: 'primary_owner',
        metadata: {},
        priority: 'required',
        status: 'failed',
        source: { runtime: 'functions', path: 'test' },
        createdAt: notificationNow,
        updatedAt: notificationNow,
        processingAttempt: 1,
        retryCount: '1',
    });
    assert.deepEqual(
        await retryFailedOwnerNotifications(),
        { retried: 0, succeeded: 0, ambiguous: 0 },
    );
    const malformedRetryEvent = (await firestoreAdmin.collection('ownerNotificationEvents')
        .doc(malformedRetryEventId).get()).data() || {};
    assert.equal(malformedRetryEvent.status, 'failed');
    assert.equal(malformedRetryEvent.processingAttempt, 1);
    assert.equal(malformedRetryEvent.retryCount, '1');
    assert.equal(malformedRetryEvent.retriedAt, undefined);

    const staleReferenceId = 'menu_publish_stale_processing';
    const staleDedupeKey = [
        'ML',
        'STORE_PUBLISHED',
        OWNER_NOTIFICATION_TENANT_ID,
        OWNER_NOTIFICATION_STORE_ID,
        staleReferenceId,
    ].join('|');
    const staleEventId = sha256(staleDedupeKey).slice(0, 40);
    const staleProcessingAt = Timestamp.fromMillis(Date.now() - 16 * MINUTE_MS);
    await firestoreAdmin.collection('ownerNotificationEvents').doc(staleEventId).set({
        productId: 'ML',
        triggerType: 'STORE_PUBLISHED',
        tenantId: OWNER_NOTIFICATION_TENANT_ID,
        storeId: OWNER_NOTIFICATION_STORE_ID,
        referenceId: staleReferenceId,
        dedupeKey: staleDedupeKey,
        recipientRole: 'primary_owner',
        metadata: {},
        priority: 'required',
        status: 'processing',
        source: { runtime: 'functions', path: 'test' },
        createdAt: staleProcessingAt,
        updatedAt: staleProcessingAt,
        processingStartedAt: staleProcessingAt,
        processingAttempt: 1,
    });
    assert.deepEqual(
        await retryFailedOwnerNotifications(),
        { retried: 0, succeeded: 0, ambiguous: 1 },
    );
    const staleEvent = (await firestoreAdmin.collection('ownerNotificationEvents')
        .doc(staleEventId).get()).data() || {};
    assert.equal(staleEvent.status, 'failed');
    assert.equal(staleEvent.error, 'owner_notification_processing_outcome_ambiguous');
    assert.equal(staleEvent.processingAttempt, 2);
    assert.equal(staleEvent.retryCount, 1);

    const malformedDedupeEventId = 'malformed-dedupe';
    await firestoreAdmin.collection('ownerNotificationEvents').doc(malformedDedupeEventId).set({
        productId: 'ML',
        triggerType: 'MENU_PUBLISHED',
        tenantId: OWNER_NOTIFICATION_TENANT_ID,
        storeId: OWNER_NOTIFICATION_STORE_ID,
        referenceId: 'menu_publish_1',
        dedupeKey: 'ML|MENU_PUBLISHED|101|999|menu_publish_1',
        recipientRole: 'primary_owner',
        metadata: {},
        priority: 'required',
        status: 'failed',
        source: { runtime: 'functions', path: 'test' },
        createdAt: notificationNow,
        updatedAt: notificationNow,
        processingAttempt: 1,
    });
    assert.equal(await processOwnerNotificationEvent(malformedDedupeEventId), false);
    const malformedDedupeEvent = (await firestoreAdmin.collection('ownerNotificationEvents')
        .doc(malformedDedupeEventId).get()).data() || {};
    assert.equal(malformedDedupeEvent.status, 'failed');
    assert.equal(malformedDedupeEvent.processingAttempt, 1);

    const ambiguousReferenceId = 'menu_publish_ambiguous';
    const ambiguousDedupeKey = [
        'ML',
        'STORE_PUBLISHED',
        OWNER_NOTIFICATION_TENANT_ID,
        OWNER_NOTIFICATION_STORE_ID,
        ambiguousReferenceId,
    ].join('|');
    const ambiguousEventId = sha256(ambiguousDedupeKey).slice(0, 40);
    await firestoreAdmin.collection('ownerNotificationEvents').doc(ambiguousEventId).set({
        productId: 'ML',
        triggerType: 'STORE_PUBLISHED',
        tenantId: OWNER_NOTIFICATION_TENANT_ID,
        storeId: OWNER_NOTIFICATION_STORE_ID,
        referenceId: ambiguousReferenceId,
        dedupeKey: ambiguousDedupeKey,
        recipientRole: 'primary_owner',
        metadata: {},
        priority: 'required',
        status: 'failed',
        source: { runtime: 'functions', path: 'test' },
        createdAt: notificationNow,
        updatedAt: notificationNow,
        processingAttempt: 1,
    });
    const ambiguousRecipientHash = sha256(notificationEmail);
    const ambiguousDeliveryId = sha256(`${ambiguousEventId}|email|${ambiguousRecipientHash}`).slice(0, 40);
    await firestoreAdmin.collection('ownerNotificationDeliveries').doc(ambiguousDeliveryId).set({
        eventId: ambiguousEventId,
        productId: 'ML',
        triggerType: 'STORE_PUBLISHED',
        channel: 'email',
        recipientRole: 'primary_owner',
        recipientHash: ambiguousRecipientHash,
        recipientMasked: 'ow***@example.com',
        status: 'sending',
        subject: 'existing ambiguous send',
        templateKey: 'menulist.menu_published',
        templateVersion: '2026-06-02',
        providerMessageId: null,
        error: null,
        attempt: 1,
        createdAt: notificationNow,
        lastAttemptAt: notificationNow,
        sentAt: null,
    });
    assert.equal(await processOwnerNotificationEvent(ambiguousEventId), false);
    const ambiguousDelivery = (await firestoreAdmin.collection('ownerNotificationDeliveries')
        .doc(ambiguousDeliveryId).get()).data() || {};
    assert.equal(ambiguousDelivery.status, 'sending');
    assert.equal(ambiguousDelivery.attempt, 1);
    const ambiguousEvent = (await firestoreAdmin.collection('ownerNotificationEvents')
        .doc(ambiguousEventId).get()).data() || {};
    assert.equal(ambiguousEvent.status, 'failed');
    assert.equal(ambiguousEvent.processingAttempt, 2);

    const rateLimitedReferenceId = 'menu_publish_rate_limit';
    const rateLimitedDedupeKey = [
        'ML',
        'STORE_PUBLISHED',
        OWNER_NOTIFICATION_TENANT_ID,
        OWNER_NOTIFICATION_STORE_ID,
        rateLimitedReferenceId,
    ].join('|');
    const rateLimitedEventId = sha256(rateLimitedDedupeKey).slice(0, 40);
    await firestoreAdmin.collection('ownerNotificationEvents').doc(rateLimitedEventId).set({
        productId: 'ML',
        triggerType: 'STORE_PUBLISHED',
        tenantId: OWNER_NOTIFICATION_TENANT_ID,
        storeId: OWNER_NOTIFICATION_STORE_ID,
        referenceId: rateLimitedReferenceId,
        dedupeKey: rateLimitedDedupeKey,
        recipientRole: 'primary_owner',
        metadata: {},
        priority: 'required',
        status: 'pending',
        source: { runtime: 'functions', path: 'test' },
        createdAt: notificationNow,
        updatedAt: notificationNow,
    });
    const persistedRateLimitedEvent = (await firestoreAdmin.collection('ownerNotificationEvents')
        .doc(rateLimitedEventId).get()).data();
    assert.ok(projectOwnerNotificationPersistedEvent(persistedRateLimitedEvent, 'ML'));
    const dateKey = new Date().toISOString().slice(0, 10);
    const recipientLimitId = sha256(['ML', 'email', ambiguousRecipientHash, dateKey].join('|')).slice(0, 40);
    await firestoreAdmin.collection('ownerNotificationRateLimits').doc(recipientLimitId).set({
        productId: 'ML',
        channel: 'email',
        recipientHash: ambiguousRecipientHash,
        dateKey,
        count: '0',
        updatedAt: notificationNow,
    });
    assert.equal(await processOwnerNotificationEvent(rateLimitedEventId), false);
    const malformedLimit = (await firestoreAdmin.collection('ownerNotificationRateLimits')
        .doc(recipientLimitId).get()).data() || {};
    assert.equal(malformedLimit.count, '0');
    const rateLimitedEvent = (await firestoreAdmin.collection('ownerNotificationEvents')
        .doc(rateLimitedEventId).get()).data() || {};
    assert.equal(rateLimitedEvent.status, 'skipped');
    const rateLimitedDeliveries = await firestoreAdmin.collection('ownerNotificationDeliveries')
        .where('eventId', '==', rateLimitedEventId)
        .limit(2)
        .get();
    assert.equal(rateLimitedDeliveries.size, 1);
    assert.equal(rateLimitedDeliveries.docs[0].data().status, 'rate_limited');

    await resetState();
    process.stdout.write('Maintenance task lease emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
