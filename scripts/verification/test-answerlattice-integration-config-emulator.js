#!/usr/bin/env node

const assert = require('node:assert/strict');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

process.env.ANSWERLATTICE_FIREBASE_MODE = 'separate';
process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT;

const { DB_COLLECTIONS } = require('../../functions-answerlattice/lib/constants/database');
const { firestoreAdmin } = require('../../functions-answerlattice/lib/firebaseAdmin');
const {
    claimCircuitBreakerProbe,
    getIntegrationConfig,
    recordDeliveryFailure,
    recordDeliverySuccess,
} = require('../../functions-answerlattice/lib/integrations/configStore');
const {
    emitIntegrationEvent,
    resetNightlyEventCounts,
} = require('../../functions-answerlattice/lib/integrations/eventBus');
const {
    claimIntegrationEvent,
    logDeliveryAttempt,
    updateIntegrationHealth,
    updateEventStatus,
} = require('../../functions-answerlattice/lib/integrations/deliveryLogger');
const {
    consumeAdapterMinuteSlot,
    filterEmailRecipientsByDailyLimit,
} = require('../../functions-answerlattice/lib/integrations/rateLimiter');
const { INTEGRATION_LIMITS } = require('../../functions-answerlattice/lib/integrations/types');

const SCOPE = { tId: 81, sId: 801 };
const DELIVERY_SCOPE = { tId: 82, sId: 802 };
const configRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(`integrationConfig_${SCOPE.tId}_${SCOPE.sId}`);
const deliveryConfigRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(`integrationConfig_${DELIVERY_SCOPE.tId}_${DELIVERY_SCOPE.sId}`);
const deliveryHealthRef = firestoreAdmin
    .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(`integrationHealth_${DELIVERY_SCOPE.tId}_${DELIVERY_SCOPE.sId}`);

async function run() {
    for (const collection of [
        DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS,
        DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS,
        DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_RATE_LIMITS,
    ]) {
        await firestoreAdmin.recursiveDelete(firestoreAdmin.collection(collection));
    }
    await deliveryHealthRef.delete();

    await configRef.set({
        slack: {
            enabled: false,
            webhookUrl: '',
            channel: '',
            eventFilters: [],
        },
    });

    const legacyConfig = await getIntegrationConfig(SCOPE.tId, SCOPE.sId);
    assert.equal(legacyConfig.pId, 'AL');
    assert.equal(legacyConfig.tId, SCOPE.tId);
    assert.equal(legacyConfig.sId, SCOPE.sId);
    const claimed = (await configRef.get()).data();
    assert.equal(claimed.pId, 'AL');
    assert.equal(claimed.tId, SCOPE.tId);
    assert.equal(claimed.sId, SCOPE.sId);

    await Promise.all(Array.from({ length: 12 }, () => (
        recordDeliveryFailure(SCOPE.tId, SCOPE.sId, 'slack')
    )));
    const failed = (await configRef.get()).data();
    assert.equal(failed.circuitBreaker.slack.consecutiveFailures, 12);
    assert.equal(typeof failed.circuitBreaker.slack.disabledAt.toMillis, 'function');

    await recordDeliverySuccess(SCOPE.tId, SCOPE.sId, 'slack');
    const reset = (await configRef.get()).data();
    assert.equal(reset.circuitBreaker.slack.consecutiveFailures, 0);
    assert.equal(reset.circuitBreaker.slack.disabledAt, null);

    await configRef.set({
        pId: 'ML',
        tId: SCOPE.tId,
        sId: SCOPE.sId,
        slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/services/example',
            channel: '',
            eventFilters: [],
        },
    });
    const rejected = await getIntegrationConfig(SCOPE.tId, SCOPE.sId);
    assert.equal(rejected.slack.enabled, false);
    assert.equal((await configRef.get()).data().pId, 'ML');
    await assert.rejects(
        recordDeliveryFailure(SCOPE.tId, SCOPE.sId, 'slack'),
        /ownership mismatch/,
    );

    resetNightlyEventCounts();
    const eventInput = {
        ...DELIVERY_SCOPE,
        eventType: 'nightly_summary',
        severity: 'low',
        deduplicationKey: 'run-1:nightly_summary',
        payload: { coverageRate: 0.8, errors: [] },
    };
    assert.equal(await emitIntegrationEvent(eventInput), true);
    assert.equal(await emitIntegrationEvent(eventInput), false, 'an exact replay must be suppressed, not counted as a new emission');
    assert.equal(await emitIntegrationEvent({
        ...eventInput,
        payload: { coverageRate: 0.4, errors: [] },
    }), false, 'a changed payload must not reuse an existing idempotency key');
    assert.equal(await emitIntegrationEvent({ ...eventInput, tId: 0 }), false, 'invalid scope must fail before persistence');

    const eventQuery = await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS)
        .where('tId', '==', DELIVERY_SCOPE.tId)
        .get();
    assert.equal(eventQuery.size, 1);
    const eventSnapshot = eventQuery.docs[0];
    const event = eventSnapshot.data();
    assert.equal(event.pId, 'AL');
    assert.equal(event.payload.coverageRate, 0.8);
    assert.match(event.idempotencyFingerprint, /^[a-f0-9]{64}$/);

    await eventSnapshot.ref.update({ payload: { coverageRate: 0.4, errors: [] } });
    assert.equal(
        await claimIntegrationEvent(eventSnapshot.id, event),
        false,
        'a processor must not claim a document whose payload changed after the trigger snapshot',
    );
    await eventSnapshot.ref.update({ payload: event.payload });
    assert.equal(await claimIntegrationEvent(eventSnapshot.id, event), true);
    assert.equal(await claimIntegrationEvent(eventSnapshot.id, event), false, 'only one processor may claim a pending event');
    assert.equal(await updateEventStatus(eventSnapshot.id, 'delivered', { ...event, tId: 999 }), false);
    assert.equal((await eventSnapshot.ref.get()).data().status, 'processing');
    assert.equal(await updateEventStatus(eventSnapshot.id, 'delivered', event), true);
    assert.equal((await eventSnapshot.ref.get()).data().status, 'delivered');

    await deliveryHealthRef.set({ legacyHealth: true });
    await updateIntegrationHealth({
        eventId: eventSnapshot.id,
        eventType: event.eventType,
        ...DELIVERY_SCOPE,
        adapter: 'slack',
        status: 'success',
        result: { success: true, statusCode: 200, durationMs: 3 },
    });
    const claimedHealth = (await deliveryHealthRef.get()).data();
    assert.equal(claimedHealth.pId, 'AL');
    assert.equal(claimedHealth.tId, DELIVERY_SCOPE.tId);
    assert.equal(claimedHealth.sId, DELIVERY_SCOPE.sId);
    assert.equal(claimedHealth.adapters.slack.lastStatus, 'success');
    assert.equal(claimedHealth['adapters.slack.lastStatus'], undefined);
    await updateIntegrationHealth({
        eventId: eventSnapshot.id,
        eventType: event.eventType,
        ...DELIVERY_SCOPE,
        adapter: 'email',
        status: 'success',
        result: { success: true, statusCode: 202, durationMs: 4 },
    });
    const mergedHealth = (await deliveryHealthRef.get()).data();
    assert.equal(mergedHealth.adapters.slack.lastStatus, 'success');
    assert.equal(mergedHealth.adapters.email.lastStatus, 'success');

    await deliveryHealthRef.set({
        pId: 'ML',
        ...DELIVERY_SCOPE,
        poisoned: true,
    });
    await updateIntegrationHealth({
        eventId: eventSnapshot.id,
        eventType: event.eventType,
        ...DELIVERY_SCOPE,
        adapter: 'email',
        status: 'failed',
        result: { success: false, error: 'Expected test failure', durationMs: 2 },
    });
    const rejectedHealth = (await deliveryHealthRef.get()).data();
    assert.equal(rejectedHealth.pId, 'ML');
    assert.equal(rejectedHealth.poisoned, true);
    assert.equal(rejectedHealth.adapters, undefined, 'conflicting health ownership must not be repaired or overwritten');

    const firstDeliveryResult = {
        success: false,
        retryable: false,
        statusCode: 503,
        error: 'First failure',
        durationMs: 5,
    };
    await logDeliveryAttempt({
        eventId: eventSnapshot.id,
        ...DELIVERY_SCOPE,
        adapter: 'slack',
        attempt: 1,
        result: firstDeliveryResult,
    });
    await logDeliveryAttempt({
        eventId: eventSnapshot.id,
        ...DELIVERY_SCOPE,
        adapter: 'slack',
        attempt: 1,
        result: { success: true, statusCode: 200, durationMs: 1 },
    });
    const deliveryLogs = await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_DELIVERY_LOGS)
        .where('eventId', '==', eventSnapshot.id)
        .get();
    assert.equal(deliveryLogs.size, 1, 'a repeated delivery-attempt acknowledgement must stay idempotent');
    assert.equal(deliveryLogs.docs[0].data().status, 'failed', 'append-only delivery logging must preserve the first attempt result');
    assert.equal(deliveryLogs.docs[0].data().statusCode, 503);

    for (let index = 0; index < INTEGRATION_LIMITS.MAX_EVENTS_PER_MINUTE_PER_ADAPTER; index += 1) {
        assert.equal(await consumeAdapterMinuteSlot(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'slack'), true);
    }
    assert.equal(await consumeAdapterMinuteSlot(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'slack'), false);
    assert.equal(await consumeAdapterMinuteSlot(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId + 1, 'slack'), true, 'rate limits must stay workspace-isolated');
    assert.deepEqual(
        await filterEmailRecipientsByDailyLimit(
            DELIVERY_SCOPE.tId,
            DELIVERY_SCOPE.sId,
            ['Owner@Example.com', 'owner@example.com'],
        ),
        ['owner@example.com'],
        'case variants must consume one recipient slot',
    );
    for (let index = 1; index < INTEGRATION_LIMITS.MAX_EMAIL_PER_DAY_PER_RECIPIENT; index += 1) {
        assert.deepEqual(
            await filterEmailRecipientsByDailyLimit(
                DELIVERY_SCOPE.tId,
                DELIVERY_SCOPE.sId,
                ['owner@example.com'],
            ),
            ['owner@example.com'],
        );
    }
    assert.deepEqual(
        await filterEmailRecipientsByDailyLimit(
            DELIVERY_SCOPE.tId,
            DELIVERY_SCOPE.sId,
            ['owner@example.com', 'fresh@example.com'],
        ),
        [],
        'one capped recipient must reject the complete email delivery',
    );
    for (let index = 0; index < INTEGRATION_LIMITS.MAX_EMAIL_PER_DAY_PER_RECIPIENT; index += 1) {
        assert.deepEqual(
            await filterEmailRecipientsByDailyLimit(
                DELIVERY_SCOPE.tId,
                DELIVERY_SCOPE.sId,
                ['fresh@example.com'],
            ),
            ['fresh@example.com'],
            'rejected multi-recipient delivery must not consume another recipient slot',
        );
    }
    assert.deepEqual(
        await filterEmailRecipientsByDailyLimit(
            DELIVERY_SCOPE.tId,
            DELIVERY_SCOPE.sId,
            ['fresh@example.com'],
        ),
        [],
    );
    await assert.rejects(
        consumeAdapterMinuteSlot(0, DELIVERY_SCOPE.sId, 'slack'),
        /scope is invalid/,
    );

    assert.equal(await consumeAdapterMinuteSlot(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'github'), true);
    const rateCounterSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_RATE_LIMITS)
        .where('tId', '==', DELIVERY_SCOPE.tId)
        .get();
    const githubCounter = rateCounterSnapshot.docs.find((doc) => doc.data().adapter === 'github');
    assert.ok(githubCounter);
    await githubCounter.ref.set({ pId: 'ML' }, { merge: true });
    await assert.rejects(
        consumeAdapterMinuteSlot(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'github'),
        /ownership mismatch/,
    );

    const FunctionsTimestamp = event.createdAt.constructor;
    const expiredBreakerAt = FunctionsTimestamp.fromMillis(
        Date.now() - INTEGRATION_LIMITS.CIRCUIT_BREAKER_COOLDOWN_MS - 1_000,
    );
    await deliveryConfigRef.set({
        pId: 'AL',
        ...DELIVERY_SCOPE,
        slack: {
            enabled: true,
            webhookUrl: 'https://hooks.slack.com/services/test/test/test',
            channel: '',
            eventFilters: ['nightly_summary'],
        },
        circuitBreaker: {
            slack: {
                consecutiveFailures: INTEGRATION_LIMITS.CIRCUIT_BREAKER_THRESHOLD,
                disabledAt: expiredBreakerAt,
                probeStartedAt: null,
            },
        },
    });
    const concurrentProbeClaims = await Promise.all(Array.from({ length: 12 }, () => (
        claimCircuitBreakerProbe(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'slack')
    )));
    assert.equal(
        concurrentProbeClaims.filter(Boolean).length,
        1,
        'only one post-cooldown circuit-breaker probe may be claimed concurrently',
    );
    const claimedProbeState = (await deliveryConfigRef.get()).data().circuitBreaker.slack;
    assert.equal(typeof claimedProbeState.probeStartedAt.toMillis, 'function');

    await recordDeliveryFailure(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'slack');
    const failedProbeState = (await deliveryConfigRef.get()).data().circuitBreaker.slack;
    assert.equal(failedProbeState.consecutiveFailures, INTEGRATION_LIMITS.CIRCUIT_BREAKER_THRESHOLD + 1);
    assert.equal(failedProbeState.probeStartedAt, null);

    await deliveryConfigRef.update({
        'circuitBreaker.slack.disabledAt': expiredBreakerAt,
        'circuitBreaker.slack.probeStartedAt': FunctionsTimestamp.fromMillis(
            Date.now() - INTEGRATION_LIMITS.CIRCUIT_BREAKER_PROBE_LEASE_MS - 1_000,
        ),
    });
    assert.equal(
        await claimCircuitBreakerProbe(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'slack'),
        true,
        'an expired probe lease must recover without manual cleanup',
    );
    await recordDeliverySuccess(DELIVERY_SCOPE.tId, DELIVERY_SCOPE.sId, 'slack');
    const recoveredProbeState = (await deliveryConfigRef.get()).data().circuitBreaker.slack;
    assert.equal(recoveredProbeState.consecutiveFailures, 0);
    assert.equal(recoveredProbeState.disabledAt, null);
    assert.equal(recoveredProbeState.probeStartedAt, null);

    process.stdout.write('Answerlattice integration config/delivery emulator tests passed.\n');
}

run()
    .then(() => firestoreAdmin.terminate())
    .catch(async error => {
        console.error(error);
        await firestoreAdmin.terminate().catch(() => undefined);
        process.exit(1);
    });
