#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { Timestamp as AppTimestamp } from 'firebase-admin/firestore';
import { Timestamp } from '../../functions-answerlattice/node_modules/@google-cloud/firestore';

import { runAnswerlatticeMasterScheduler } from '../../functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler';
import { upsertAnswerlatticeTenantSummary } from '../../functions-answerlattice/src/answerlattice/tenantSummary';
import { DB_COLLECTIONS } from '../../functions-answerlattice/src/constants/database';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';
import { createAnswerlatticeSupportSearchAccounting } from '../../src/lib/answerlattice/supportSearchAccounting';
import { getBillingPeriodKey } from '../../src/lib/billing/billingPeriod';
import { requireAnswerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';

const ACTIVE_SCOPES = [
  { tId: 81_001, sId: 81_101 },
  { tId: 82_002, sId: 82_202 },
] as const;
const NON_DUE_SCOPE = { tId: 83_003, sId: 83_303 } as const;
const INACTIVE_SCOPE = { tId: 84_004, sId: 84_404 } as const;
const ACCOUNTING_SCOPE = ACTIVE_SCOPES[0];
const SUBSCRIPTION_ID = 'al-scheduler-reliability-subscription';
const appDb = requireAnswerlatticeFirestoreAdmin();

const task = (result: Awaited<ReturnType<typeof runAnswerlatticeMasterScheduler>>, name: string) => {
  const match = result.tasks.find((entry) => entry.name === name);
  assert.ok(match, `scheduler result must include ${name}`);
  return match;
};

async function resetEmulator(): Promise<void> {
  const collections = [...new Set(Object.values(DB_COLLECTIONS))];
  await Promise.all(collections.map((collectionName) => db.recursiveDelete(db.collection(collectionName))));
}

async function seedProviderAlreadyHealthy(): Promise<void> {
  const now = Timestamp.now();
  const dayKey = new Date(now.toMillis()).toISOString().slice(0, 10);
  await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('answerlatticeAiProviderHealth').set({
    checkedAt: now,
    error: null,
    lastAttemptDayKey: dayKey,
    lastCompletedAt: now,
    lastCompletedDayKey: dayKey,
    latencyMs: 1,
    model: 'scheduler-emulator-provider-sentinel',
    productId: 'AL',
    provider: 'gemini',
    sdkSurface: 'answerlattice-functions-google-genai',
    source: 'answerlatticeMasterScheduler',
    status: 'ok',
    success: true,
    tokenCountSource: 'none',
    totalTokenCount: 0,
    updatedAt: now,
  });
}

async function seedTenant(scope: { tId: number; sId: number }, options: {
  active: boolean;
  businessDayEndTime: string;
  timeZone: string;
}): Promise<void> {
  await Promise.all([
    db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(`scheduler_entity_${scope.tId}_${scope.sId}`).set({
      pId: 'AL',
      ...scope,
      type: 'feature',
      name: `Scheduler fixture ${scope.tId}/${scope.sId}`,
      slug: `scheduler-fixture-${scope.tId}-${scope.sId}`,
      description: 'Disposable scheduler reliability fixture.',
      status: 'active',
      currentVersion: 1_000_000,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }),
    upsertAnswerlatticeTenantSummary(db, scope.tId, scope.sId, {
      source: 'scheduler_reliability_emulator',
      hasEntities: true,
      ...options,
    }),
  ]);
}

async function seedSubscription(monthlyCredits: number): Promise<void> {
  const cycleStartDate = AppTimestamp.now();
  const billingPeriod = getBillingPeriodKey(cycleStartDate);
  assert.ok(billingPeriod);
  await Promise.all([
    appDb.collection(DB_COLLECTIONS.STORES).doc(String(ACCOUNTING_SCOPE.sId)).set({
      id: ACCOUNTING_SCOPE.sId,
      pId: 'AL',
      productId: 'AL',
      ...ACCOUNTING_SCOPE,
      tenantId: ACCOUNTING_SCOPE.tId,
      storeId: ACCOUNTING_SCOPE.sId,
      answerlatticeSubscription: {
        id: SUBSCRIPTION_ID,
        monthlyCredits,
        topUpCredits: 0,
      },
    }),
    appDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID).set({
      id: SUBSCRIPTION_ID,
      pId: 'AL',
      productId: 'AL',
      ...ACCOUNTING_SCOPE,
      tenantId: ACCOUNTING_SCOPE.tId,
      storeId: ACCOUNTING_SCOPE.sId,
      status: 'active',
      billingMode: 'manual',
      manualPaymentConfirmed: true,
      cycleStartDate,
      cycleEndDate: AppTimestamp.fromMillis(Date.now() + 86_400_000),
      monthlyCreditsAllowance: monthlyCredits,
      monthlyCredits,
      topUpCredits: 0,
      creditsLastResetMonth: billingPeriod,
    }),
  ]);
}

async function createStaleReservation(requestId: string): Promise<{
  operationRef: FirebaseFirestore.DocumentReference;
  pointerRef: FirebaseFirestore.DocumentReference;
}> {
  const accounting = createAnswerlatticeSupportSearchAccounting({
    actor: { id: 'scheduler-reliability-owner', email: 'scheduler@example.invalid' },
    mountContext: 'help_center',
    requestId,
    scope: ACCOUNTING_SCOPE,
  });
  await accounting.beforeAiProviderCall();
  const pointers = await appDb.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS).get();
  const pointer = pointers.docs.find((document) => document.data().requestId === requestId) || pointers.docs[0];
  assert.ok(pointer, 'capacity reservation must create a recovery pointer');
  const operationId = String(pointer.data().operationId || '');
  assert.ok(operationId);
  const operationRef = appDb.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
    .doc(String(ACCOUNTING_SCOPE.tId)).collection(String(ACCOUNTING_SCOPE.sId)).doc(operationId);
  const expiredAt = AppTimestamp.fromMillis(Date.now() - 1);
  await Promise.all([
    pointer.ref.set({ recoveryAt: expiredAt }, { merge: true }),
    operationRef.set({ reservationRecoveryAt: expiredAt }, { merge: true }),
  ]);
  return { operationRef, pointerRef: pointer.ref };
}

async function main(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required.');
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required.');

  await resetEmulator();
  await seedProviderAlreadyHealthy();
  const now = new Date();
  const dueEndMinutes = ((now.getUTCHours() * 60) + now.getUTCMinutes() - 180 + (24 * 60)) % (24 * 60);
  const dueBusinessDayEndTime = `${String(Math.floor(dueEndMinutes / 60)).padStart(2, '0')}:${String(dueEndMinutes % 60).padStart(2, '0')}`;
  await Promise.all([
    ...ACTIVE_SCOPES.map((scope) => seedTenant(scope, {
      active: true,
      businessDayEndTime: dueBusinessDayEndTime,
      timeZone: 'UTC',
    })),
    seedTenant(NON_DUE_SCOPE, {
      active: true,
      businessDayEndTime: '23:59',
      timeZone: 'Pacific/Kiritimati',
    }),
    seedTenant(INACTIVE_SCOPE, {
      active: false,
      businessDayEndTime: dueBusinessDayEndTime,
      timeZone: 'UTC',
    }),
  ]);

  // An expired task lock must be recoverable rather than permanently blocking work.
  await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc('answerlatticeSchedulerTaskLock_ai_capacity_reservation_recovery').set({
      leaseOwner: 'expired-test-owner',
      leaseExpiresAt: Timestamp.fromMillis(Date.now() - 60_000),
    });

  await seedSubscription(1);
  const validReservation = await createStaleReservation('scheduler_valid_recovery_001');
  assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID).get()).data()?.monthlyCredits, 0);

  const first = await runAnswerlatticeMasterScheduler({
    trigger: 'scheduled',
    triggeredBy: 'scheduler_reliability_emulator',
  });
  assert.equal(first.status, 'success');
  assert.equal(task(first, 'ai_provider_health_check').activity, false);
  assert.equal(task(first, 'ai_provider_health_check').details?.reason, 'already_completed_today');
  assert.equal(task(first, 'ai_capacity_reservation_recovery').status, 'success');
  assert.equal(task(first, 'ai_capacity_reservation_recovery').activity, true);
  assert.deepEqual(task(first, 'ai_capacity_reservation_recovery').details, { errors: 0, refunded: 1, scanned: 1 });
  assert.equal(task(first, 'governance_nightly').status, 'success');
  assert.equal(task(first, 'governance_nightly').activity, true);
  assert.equal(task(first, 'governance_nightly').details?.processedTenants, ACTIVE_SCOPES.length);
  assert.equal(task(first, 'governance_nightly').details?.candidateTenants, ACTIVE_SCOPES.length);

  assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID).get()).data()?.monthlyCredits, 1);
  assert.equal((await validReservation.pointerRef.get()).exists, false);
  assert.equal((await validReservation.operationRef.get()).data()?.accountingStatus, 'refunded');

  const nightlyRunLogId = String(task(first, 'governance_nightly').details?.nightlyRunLogId || '');
  assert.ok(nightlyRunLogId);
  const nightlyLog = (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS).doc(nightlyRunLogId).get()).data();
  assert.equal(nightlyLog?.status, 'success');
  assert.equal(nightlyLog?.tenantsProcessed, ACTIVE_SCOPES.length);
  assert.deepEqual(
    (nightlyLog?.tenantRuns || []).map((run: Record<string, unknown>) => `${run.tId}_${run.sId}`).sort(),
    ACTIVE_SCOPES.map((scope) => `${scope.tId}_${scope.sId}`).sort(),
  );
  assert.deepEqual(Object.keys(nightlyLog?.tenantRunsByScope || {}).sort(), [
    ...ACTIVE_SCOPES.map((scope) => `${scope.tId}_${scope.sId}`),
  ].sort());
  for (const scope of ACTIVE_SCOPES) {
    const state = (await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
      .doc(`answerlatticeNightlyState_${scope.tId}_${scope.sId}`).get()).data();
    assert.equal(state?.status, 'completed');
    assert.equal(state?.lastDetails?.nightlyRunLogId, nightlyRunLogId);
  }
  assert.equal((await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(`answerlatticeNightlyState_${NON_DUE_SCOPE.tId}_${NON_DUE_SCOPE.sId}`).get()).exists, false);
  assert.equal((await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc(`answerlatticeNightlyState_${INACTIVE_SCOPE.tId}_${INACTIVE_SCOPE.sId}`).get()).exists, false);

  // A second scheduler tick must be an idempotent no-op for already-settled tenants.
  const second = await runAnswerlatticeMasterScheduler({
    trigger: 'scheduled',
    triggeredBy: 'scheduler_reliability_emulator',
  });
  assert.equal(second.status, 'skipped');
  assert.equal(task(second, 'ai_capacity_reservation_recovery').activity, false);
  assert.equal(task(second, 'governance_nightly').activity, false);
  assert.equal(task(second, 'governance_nightly').details?.reason, 'all_due_tenants_locked_or_completed');
  assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID).get()).data()?.monthlyCredits, 1);
  assert.equal((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS).get()).size, 1);

  const schedulerState = (await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc('answerlatticeSchedulerState').get()).data();
  assert.deepEqual(Object.keys(schedulerState?.tasks || {}).sort(), [
    'ai_capacity_reservation_recovery',
    'ai_provider_health_check',
    'governance_nightly',
  ]);
  assert.equal(schedulerState?.tasks?.ai_provider_health_check?.lastDetails?.reason, 'already_completed_today');
  assert.equal(schedulerState?.tasks?.ai_capacity_reservation_recovery?.lastDetails?.reason, undefined);

  // A held task lease must skip only that task while the rest of the scheduler continues.
  await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc('answerlatticeSchedulerTaskLock_ai_capacity_reservation_recovery').set({
      leaseOwner: 'active-test-owner',
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + 60_000),
    });
  const leaseHeld = await runAnswerlatticeMasterScheduler({
    trigger: 'scheduled',
    triggeredBy: 'scheduler_reliability_emulator',
  });
  assert.equal(task(leaseHeld, 'ai_capacity_reservation_recovery').status, 'skipped');
  assert.equal(task(leaseHeld, 'ai_capacity_reservation_recovery').details?.reason, 'lease_held');
  assert.notEqual(task(leaseHeld, 'ai_provider_health_check').status, 'failed');
  assert.notEqual(task(leaseHeld, 'governance_nightly').status, 'failed');
  await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
    .doc('answerlatticeSchedulerTaskLock_ai_capacity_reservation_recovery').delete();

  // Malformed recovery evidence must yield a partial run without minting credit,
  // deleting forensic evidence, or preventing independent tasks from completing.
  await seedSubscription(1);
  const malformedReservation = await createStaleReservation('scheduler_malformed_recovery_001');
  const malformedOperation = (await malformedReservation.operationRef.get()).data() || {};
  await malformedReservation.operationRef.set({
    creditConsumption: {
      ...malformedOperation.creditConsumption,
      monthlyCreditsDebited: '1',
    },
  }, { merge: true });
  const malformed = await runAnswerlatticeMasterScheduler({
    trigger: 'scheduled',
    triggeredBy: 'scheduler_reliability_emulator',
  });
  assert.equal(malformed.status, 'partial');
  assert.equal(task(malformed, 'ai_capacity_reservation_recovery').status, 'failed');
  assert.equal(task(malformed, 'ai_capacity_reservation_recovery').error, 'ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED');
  assert.notEqual(task(malformed, 'ai_provider_health_check').status, 'failed');
  assert.notEqual(task(malformed, 'governance_nightly').status, 'failed');
  assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(SUBSCRIPTION_ID).get()).data()?.monthlyCredits, 0);
  assert.equal((await malformedReservation.pointerRef.get()).exists, true);

  process.stdout.write(JSON.stringify({
    firstRunId: first.runId,
    malformedRunId: malformed.runId,
    nightlyRunLogId,
    scopesProcessed: ACTIVE_SCOPES,
    status: 'passed',
  }, null, 2) + '\n');
  process.stdout.write('Answerlattice master scheduler multi-tenant emulator reliability tests passed.\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
