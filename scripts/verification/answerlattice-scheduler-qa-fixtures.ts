#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const QA_PROJECT_ID = 'neelvara-answerlattice-qa';
const QA_BUCKET = `${QA_PROJECT_ID}.firebasestorage.app`;
const MARKER_ID = 'answerlatticeSchedulerQaFixture_20260825';
const SUBSCRIPTION_ID = 'al-scheduler-qa-fixture-subscription';
const REQUEST_SEED = 'answerlattice-scheduler-qa-valid-recovery-20260825';
const ACCOUNTING_HASH = createHash('sha256').update(REQUEST_SEED).digest('hex');
const OPERATION_ID = `idem_${ACCOUNTING_HASH.slice(0, 48)}`;
const DUE_SCOPES = [
  { tId: 98_100_101, sId: 98_100_201 },
  { tId: 98_100_102, sId: 98_100_202 },
] as const;
const NON_DUE_SCOPE = { tId: 98_100_103, sId: 98_100_203 } as const;
const INACTIVE_SCOPE = { tId: 98_100_104, sId: 98_100_204 } as const;
const ALL_SCOPES = [...DUE_SCOPES, NON_DUE_SCOPE, INACTIVE_SCOPE] as const;

const projectId = process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (projectId !== QA_PROJECT_ID) {
  throw new Error(`QA fixture controller refuses project ${String(projectId || 'unset')}.`);
}
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error('QA fixture controller refuses emulator hosts.');
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: QA_PROJECT_ID,
  storageBucket: process.env.ANSWERLATTICE_FIREBASE_STORAGE_BUCKET || QA_BUCKET,
}, 'answerlattice-scheduler-qa-fixtures');
const db = getFirestore(app);
const storage = getStorage(app);

const tenantKey = (scope: { tId: number; sId: number }) => `${scope.tId}_${scope.sId}`;
const entityId = (scope: { tId: number; sId: number }) => `scheduler_qa_entity_${scope.tId}_${scope.sId}`;

function tenantShardId(scope: { tId: number; sId: number }): string {
  const key = tenantKey(scope);
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const foldedHash = ((hash >>> 0) ^ (hash >>> 16)) >>> 0;
  return `answerlatticeTenantsSummaryShard_${String(foldedHash % 64).padStart(2, '0')}`;
}

function nextHourlyHalfPast(now: Date): Date {
  const tick = new Date(now);
  tick.setUTCSeconds(0, 0);
  if (tick.getUTCMinutes() < 30) tick.setUTCMinutes(30);
  else {
    tick.setUTCHours(tick.getUTCHours() + 1);
    tick.setUTCMinutes(30);
  }
  return tick;
}

function dueBusinessDayEndTime(tick: Date): string {
  const endMinutes = ((tick.getUTCHours() * 60) + tick.getUTCMinutes() - 180 + (24 * 60)) % (24 * 60);
  return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
}

async function deleteExactFixtureDocuments(): Promise<void> {
  const batch = db.batch();
  for (const scope of ALL_SCOPES) {
    batch.delete(db.collection('answerlattice_entities').doc(entityId(scope)));
  }
  batch.delete(db.collection('stores').doc(String(DUE_SCOPES[0].sId)));
  batch.delete(db.collection('subscriptions').doc(SUBSCRIPTION_ID));
  batch.delete(db.collection('answerlattice_aiCapacityReservations').doc(OPERATION_ID));
  batch.delete(db.collection('answerlattice_aiOperations')
    .doc(String(DUE_SCOPES[0].tId)).collection(String(DUE_SCOPES[0].sId)).doc(OPERATION_ID));
  batch.delete(db.collection('platformSummary').doc(MARKER_ID));
  await batch.commit();

  const shardDeletes = new Map<string, Record<string, ReturnType<typeof FieldValue.delete>>>();
  for (const scope of ALL_SCOPES) {
    const shardId = tenantShardId(scope);
    const updates = shardDeletes.get(shardId) || {};
    updates[`tenants.${tenantKey(scope)}`] = FieldValue.delete();
    shardDeletes.set(shardId, updates);
  }
  for (const [shardId, updates] of shardDeletes) {
    const shardRef = db.collection('platformSummary').doc(shardId);
    if ((await shardRef.get()).exists) await shardRef.update(updates);
  }

  for (const scope of ALL_SCOPES) {
    const platformDocs = await db.collection('platformSummary').where('tId', '==', scope.tId).get();
    const owned = platformDocs.docs.filter(document => document.data().sId === scope.sId);
    if (owned.length) {
      const cleanup = db.batch();
      owned.forEach(document => cleanup.delete(document.ref));
      await cleanup.commit();
    }
  }
}

async function prepare(): Promise<void> {
  const existingMarker = await db.collection('platformSummary').doc(MARKER_ID).get();
  assert.equal(existingMarker.exists, false, 'cleanup the previous QA fixture before preparing another');

  const now = new Date();
  const expectedFirstTick = nextHourlyHalfPast(now);
  const businessDayEndTime = dueBusinessDayEndTime(expectedFirstTick);
  const timestamp = Timestamp.fromDate(now);
  const cycleEndDate = Timestamp.fromMillis(now.getTime() + (7 * 86_400_000));
  const billingPeriod = (now.getUTCFullYear() * 100) + now.getUTCMonth() + 1;

  for (const scope of ALL_SCOPES) {
    const active = scope !== INACTIVE_SCOPE;
    const due = DUE_SCOPES.some(candidate => candidate.tId === scope.tId && candidate.sId === scope.sId);
    await Promise.all([
      db.collection('answerlattice_entities').doc(entityId(scope)).set({
        pId: 'AL',
        ...scope,
        type: 'feature',
        name: `QA scheduler fixture ${scope.tId}/${scope.sId}`,
        slug: `qa-scheduler-${scope.tId}-${scope.sId}`,
        description: 'Disposable hosted scheduler reliability fixture.',
        status: 'active',
        currentVersion: 1_000_000,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      db.collection('platformSummary').doc(tenantShardId(scope)).set({
        summaryType: 'answerlattice_tenant_registry_shard',
        shardVersion: 1,
        tenants: {
          [tenantKey(scope)]: {
            pId: 'AL',
            ...scope,
            active,
            hasEntities: true,
            source: 'scheduler_qa_reliability_fixture',
            timeZone: due ? 'UTC' : 'Pacific/Kiritimati',
            businessDayEndTime: due ? businessDayEndTime : '23:59',
            lastSeenAt: timestamp,
            updatedAt: timestamp,
          },
        },
        updatedAt: timestamp,
      }, { merge: true }),
    ]);
  }

  const scope = DUE_SCOPES[0];
  const recoveryAt = Timestamp.fromMillis(now.getTime() - 1);
  const creditConsumption = {
    monthlyCreditsBefore: 1,
    topUpCreditsBefore: 0,
    totalCreditsBefore: 1,
    monthlyCreditsDebited: 1,
    topUpCreditsDebited: 0,
    unitsConsumed: 1,
    monthlyCreditsAfter: 0,
    topUpCreditsAfter: 0,
    totalCreditsAfter: 0,
  };
  await Promise.all([
    db.collection('stores').doc(String(scope.sId)).set({
      id: scope.sId,
      pId: 'AL',
      productId: 'AL',
      ...scope,
      tenantId: scope.tId,
      storeId: scope.sId,
      answerlatticeSubscription: { id: SUBSCRIPTION_ID, monthlyCredits: 0, topUpCredits: 0 },
    }),
    db.collection('subscriptions').doc(SUBSCRIPTION_ID).set({
      id: SUBSCRIPTION_ID,
      pId: 'AL',
      productId: 'AL',
      ...scope,
      tenantId: scope.tId,
      storeId: scope.sId,
      status: 'active',
      billingMode: 'manual',
      manualPaymentConfirmed: true,
      cycleStartDate: timestamp,
      cycleEndDate,
      monthlyCreditsAllowance: 1,
      monthlyCredits: 0,
      topUpCredits: 0,
      creditsLastResetMonth: billingPeriod,
    }),
    db.collection('answerlattice_aiOperations').doc(String(scope.tId)).collection(String(scope.sId)).doc(OPERATION_ID).set({
      id: OPERATION_ID,
      pId: 'AL',
      ...scope,
      action: 'answerlattice_support_search',
      billingMode: 'billable',
      aiLogMode: 'accounting_only',
      unitsConsumed: 1,
      accountingIdempotencyHash: ACCOUNTING_HASH,
      accountingStatus: 'reserved',
      accountingSubscriptionId: SUBSCRIPTION_ID,
      accountingReservationAttempt: 1,
      accountingReservationBillingPeriod: billingPeriod,
      accountingMonthlyCreditCeiling: 1,
      creditConsumption,
      reservationRecoveryAt: recoveryAt,
      modifiedOn: timestamp,
    }),
    db.collection('answerlattice_aiCapacityReservations').doc(OPERATION_ID).set({
      pId: 'AL',
      ...scope,
      action: 'answerlattice_support_search',
      operationId: OPERATION_ID,
      accountingIdempotencyHash: ACCOUNTING_HASH,
      subscriptionId: SUBSCRIPTION_ID,
      unitsReserved: 1,
      recoveryAt,
      modifiedOn: timestamp,
    }),
    db.collection('platformSummary').doc(MARKER_ID).set({
      pId: 'AL',
      fixtureType: 'answerlattice_scheduler_qa_reliability',
      preparedAt: timestamp,
      expectedFirstTick: Timestamp.fromDate(expectedFirstTick),
      dueBusinessDayEndTime: businessDayEndTime,
      dueScopes: DUE_SCOPES.map(tenantKey),
      nonDueScope: tenantKey(NON_DUE_SCOPE),
      inactiveScope: tenantKey(INACTIVE_SCOPE),
      operationId: OPERATION_ID,
      status: 'prepared',
    }),
  ]);

  process.stdout.write(JSON.stringify({
    projectId: QA_PROJECT_ID,
    expectedFirstTick: expectedFirstTick.toISOString(),
    dueBusinessDayEndTime: businessDayEndTime,
    dueScopes: DUE_SCOPES,
    nonDueScope: NON_DUE_SCOPE,
    inactiveScope: INACTIVE_SCOPE,
    operationId: OPERATION_ID,
    status: 'prepared',
  }, null, 2) + '\n');
}

async function verify(expectIdempotent: boolean): Promise<void> {
  const markerRef = db.collection('platformSummary').doc(MARKER_ID);
  const marker = (await markerRef.get()).data();
  assert.ok(marker, 'QA fixture marker is missing');
  const preparedAt = marker.preparedAt as Timestamp;
  const logs = await db.collection('answerlattice_schedulerRunLogs')
    .where('startedAt', '>=', preparedAt)
    .orderBy('startedAt', 'asc')
    .limit(20)
    .get();
  const dueKeys = DUE_SCOPES.map(tenantKey);
  const matchingLogs = logs.docs.filter(document => {
    const runs = document.data().tenantRunsByScope || {};
    return dueKeys.every(key => Object.prototype.hasOwnProperty.call(runs, key));
  });
  assert.ok(matchingLogs.length >= 1, 'no hosted scheduler run contains both due QA fixture scopes');
  const firstLog = matchingLogs[0];
  assert.equal(firstLog.data().status, 'success');
  assert.equal(firstLog.data().phase, 'completed');
  assert.equal(firstLog.data().tenantRunsByScope[tenantKey(NON_DUE_SCOPE)], undefined);
  assert.equal(firstLog.data().tenantRunsByScope[tenantKey(INACTIVE_SCOPE)], undefined);
  for (const dueKey of dueKeys) {
    const tenantRun = firstLog.data().tenantRunsByScope[dueKey];
    assert.equal(tenantRun?.status, 'success');
    const tasks = Object.values(tenantRun?.tasks || {}) as Array<Record<string, any>>;
    assert.equal(tasks.length, 20, `${dueKey} must complete the complete governance task set`);
    assert.equal(tasks.some(task => task.status === 'failed'), false, `${dueKey} contains a failed task`);
    const contextRepair = tasks.find(task => task.name === 'compiled_context_bundle_repair');
    assert.equal(contextRepair?.status, 'success');
    assert.equal(contextRepair?.details?.status, 'ready');
    assert.equal(contextRepair?.details?.rebuilt, true);
    assert.ok(contextRepair?.details?.bytesTotal > 0, `${dueKey} did not publish a non-empty context bundle`);
    const graphRebuild = tasks.find(task => task.name === 'graph_index_rebuild');
    assert.equal(graphRebuild?.status, 'success');
    assert.equal(graphRebuild?.details?.rebuilt, true);
    assert.equal(graphRebuild?.details?.entityCount, 1);
    assert.equal(tasks.find(task => task.name === 'trust_metrics')?.details?.written, true);
    assert.equal(tasks.find(task => task.name === 'knowledge_intake_summary')?.details?.summaryWritten, true);
    assert.equal(tasks.find(task => task.name === 'predictive_trigger_sync')?.details?.cacheRebuilt, true);
  }

  const [pointer, operation, subscription, store] = await Promise.all([
    db.collection('answerlattice_aiCapacityReservations').doc(OPERATION_ID).get(),
    db.collection('answerlattice_aiOperations').doc(String(DUE_SCOPES[0].tId))
      .collection(String(DUE_SCOPES[0].sId)).doc(OPERATION_ID).get(),
    db.collection('subscriptions').doc(SUBSCRIPTION_ID).get(),
    db.collection('stores').doc(String(DUE_SCOPES[0].sId)).get(),
  ]);
  assert.equal(pointer.exists, false);
  assert.equal(operation.data()?.accountingStatus, 'refunded');
  assert.equal(subscription.data()?.monthlyCredits, 1);
  assert.equal(store.data()?.answerlatticeSubscription?.monthlyCredits, 1);
  for (const scope of DUE_SCOPES) {
    const state = (await db.collection('platformSummary').doc(`answerlatticeNightlyState_${tenantKey(scope)}`).get()).data();
    assert.equal(state?.status, 'completed');
    assert.equal(state?.lastDetails?.nightlyRunLogId, firstLog.id);
  }
  assert.equal((await db.collection('platformSummary').doc(`answerlatticeNightlyState_${tenantKey(NON_DUE_SCOPE)}`).get()).exists, false);
  assert.equal((await db.collection('platformSummary').doc(`answerlatticeNightlyState_${tenantKey(INACTIVE_SCOPE)}`).get()).exists, false);

  if (expectIdempotent) {
    const firstVerifiedAt = marker.firstVerifiedAt as Timestamp | undefined;
    assert.ok(firstVerifiedAt, 'run verify once before requesting the idempotency check');
    assert.equal(matchingLogs.length, 1, 'a repeat tick must not create another governance run for completed fixture scopes');
    const schedulerState = (await db.collection('platformSummary').doc('answerlatticeSchedulerState').get()).data() || {};
    assert.ok(schedulerState.updatedAt.toMillis() > firstVerifiedAt.toMillis());
    assert.ok(
      ['all_due_tenants_locked_or_completed', 'no_due_tenants'].includes(
        schedulerState.tasks?.governance_nightly?.lastDetails?.reason,
      ),
      'repeat tick must report either completed/locked due work or no tenants in the due window',
    );
    assert.equal(schedulerState.tasks?.ai_capacity_reservation_recovery?.lastDetails?.refunded, 0);
  } else {
    await markerRef.set({
      status: 'first_cycle_verified',
      firstRunLogId: firstLog.id,
      firstVerifiedAt: Timestamp.now(),
    }, { merge: true });
  }

  process.stdout.write(JSON.stringify({
    idempotencyVerified: expectIdempotent,
    projectId: QA_PROJECT_ID,
    runLogId: firstLog.id,
    status: 'verified',
  }, null, 2) + '\n');
}

async function retargetNow(): Promise<void> {
  const markerRef = db.collection('platformSummary').doc(MARKER_ID);
  const marker = await markerRef.get();
  assert.equal(marker.exists, true, 'QA fixture marker is missing');
  const now = new Date();
  const businessDayEndTime = dueBusinessDayEndTime(now);
  const updatedAt = Timestamp.fromDate(now);
  for (const scope of DUE_SCOPES) {
    await db.collection('platformSummary').doc(tenantShardId(scope)).set({
      tenants: {
        [tenantKey(scope)]: {
          pId: 'AL',
          ...scope,
          active: true,
          hasEntities: true,
          source: 'scheduler_qa_reliability_fixture',
          timeZone: 'UTC',
          businessDayEndTime,
          lastSeenAt: updatedAt,
          updatedAt,
        },
      },
      updatedAt,
    }, { merge: true });
  }
  await markerRef.set({
    expectedFirstTick: updatedAt,
    dueBusinessDayEndTime: businessDayEndTime,
    retargetedAt: updatedAt,
  }, { merge: true });
  process.stdout.write(JSON.stringify({
    businessDayEndTime,
    projectId: QA_PROJECT_ID,
    status: 'retargeted',
  }, null, 2) + '\n');
}

async function cleanup(): Promise<void> {
  const marker = (await db.collection('platformSummary').doc(MARKER_ID).get()).data();
  const manifests = await Promise.all(DUE_SCOPES.map(scope => db.collection('platformSummary')
    .where('tId', '==', scope.tId).get()));
  const prefixes = new Set<string>();
  manifests.flatMap(snapshot => snapshot.docs)
    .filter(document => DUE_SCOPES.some(scope => (
      document.data().tId === scope.tId && document.data().sId === scope.sId
    )))
    .forEach(document => {
    const data = document.data();
    if (typeof data.publicBundleId === 'string') prefixes.add(`answerlattice-context/public/${data.publicBundleId}/`);
    if (Number.isSafeInteger(data.tId) && Number.isSafeInteger(data.sId)) {
      prefixes.add(`answerlattice-context/private/${data.tId}/${data.sId}/`);
    }
  });
  const storageDeletes = await Promise.allSettled(
    [...prefixes].map(prefix => storage.bucket().deleteFiles({ prefix, force: true })),
  );
  const failedStorageDelete = storageDeletes.find(result => result.status === 'rejected');
  if (failedStorageDelete?.status === 'rejected') throw failedStorageDelete.reason;

  if (marker?.preparedAt instanceof Timestamp) {
    const logs = await db.collection('answerlattice_schedulerRunLogs')
      .where('startedAt', '>=', marker.preparedAt)
      .orderBy('startedAt', 'asc')
      .limit(50)
      .get();
    const fixtureKeys = new Set(DUE_SCOPES.map(tenantKey));
    const ownedLogs = logs.docs.filter(document => {
      const keys = Object.keys(document.data().tenantRunsByScope || {});
      return keys.length > 0 && keys.every(key => fixtureKeys.has(key));
    });
    if (ownedLogs.length) {
      const logCleanup = db.batch();
      ownedLogs.forEach(document => logCleanup.delete(document.ref));
      await logCleanup.commit();
    }
  }

  await deleteExactFixtureDocuments();
  const remainingExactDocuments = await Promise.all([
    db.collection('platformSummary').doc(MARKER_ID).get(),
    db.collection('stores').doc(String(DUE_SCOPES[0].sId)).get(),
    db.collection('subscriptions').doc(SUBSCRIPTION_ID).get(),
    db.collection('answerlattice_aiCapacityReservations').doc(OPERATION_ID).get(),
    ...ALL_SCOPES.map(scope => db.collection('answerlattice_entities').doc(entityId(scope)).get()),
    ...ALL_SCOPES.map(scope => db.collection('platformSummary').doc(`answerlatticeNightlyState_${tenantKey(scope)}`).get()),
  ]);
  assert.ok(remainingExactDocuments.every(document => !document.exists), 'QA fixture cleanup left an owned document');
  for (const scope of ALL_SCOPES) {
    const shard = (await db.collection('platformSummary').doc(tenantShardId(scope)).get()).data();
    assert.equal(shard?.tenants?.[tenantKey(scope)], undefined, 'QA fixture cleanup left a tenant registry entry');
  }
  process.stdout.write(JSON.stringify({ projectId: QA_PROJECT_ID, status: 'cleaned' }, null, 2) + '\n');
}

async function inspect(): Promise<void> {
  const marker = (await db.collection('platformSummary').doc(MARKER_ID).get()).data();
  assert.ok(marker?.preparedAt instanceof Timestamp, 'QA fixture marker is missing');
  const logs = await db.collection('answerlattice_schedulerRunLogs')
    .where('startedAt', '>=', marker.preparedAt)
    .orderBy('startedAt', 'asc')
    .limit(20)
    .get();
  const states = await Promise.all(ALL_SCOPES.map(async scope => ({
    key: tenantKey(scope),
    state: (await db.collection('platformSummary').doc(`answerlatticeNightlyState_${tenantKey(scope)}`).get()).data() || null,
  })));
  process.stdout.write(JSON.stringify({
    logs: logs.docs.map(document => ({
      id: document.id,
      status: document.data().status,
      phase: document.data().phase,
      errors: document.data().errors,
      errorMessages: document.data().errorMessages,
      tenantRuns: document.data().tenantRuns,
      tenantRunsByScope: document.data().tenantRunsByScope,
    })),
    states,
  }, null, 2) + '\n');
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === 'prepare') await prepare();
  else if (command === 'retarget-now') await retargetNow();
  else if (command === 'verify') await verify(process.argv.includes('--expect-idempotent'));
  else if (command === 'cleanup') await cleanup();
  else if (command === 'inspect') await inspect();
  else throw new Error('Use prepare, retarget-now, verify, inspect, or cleanup.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await deleteApp(app);
});
