#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { admin, firestoreAdmin } from '../../functions/src/firebaseAdmin';
import {
  getAlertCooldownDocumentIds,
  isAlertTimestampWithinCooldown,
} from '../../functions/src/monitoring/alertBoundary';
import { createAlert } from '../../functions/src/monitoring/alerts';
import { logSystemError } from '../../functions/src/monitoring/errorTracking';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '../../functions/src/sharedData/platformNotificationRegistry';

async function clearCollection(collectionName: string): Promise<void> {
  const snapshot = await firestoreAdmin.collection(collectionName).get();
  if (snapshot.empty) return;
  const batch = firestoreAdmin.batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

async function run(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required');
  }

  await Promise.all([
    clearCollection('systemAlerts'),
    clearCollection('systemErrors'),
  ]);

  const tenMinuteIds = getAlertCooldownDocumentIds({
    tId: 'tenant-1',
    sId: 'store-1',
    title: 'Concurrent alert',
    nowMillis: 600_001,
    cooldownMs: 600_000,
  });
  assert.match(tenMinuteIds.current, /^alert_[a-f0-9]{40}_1$/);
  assert.match(tenMinuteIds.previous, /^alert_[a-f0-9]{40}_0$/);
  assert.equal(
    isAlertTimestampWithinCooldown(599_999, 600_001, 600_000),
    true,
    'an alert from the previous fixed bucket must still enforce the rolling cooldown',
  );
  assert.equal(isAlertTimestampWithinCooldown(1, 600_002, 600_000), false);

  const concurrentResults = await Promise.all(
    Array.from({ length: 12 }, () => createAlert({
      tId: 'tenant-1',
      sId: 'store-1',
      type: 'usage',
      severity: 'critical',
      title: 'Concurrent alert',
      message: 'Only one alert record and one delivery attempt may be created.',
      triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.GCP_BUDGET_ALERT,
      productId: 'PLATFORM',
      category: 'cost',
      actionRequired: true,
    })),
  );
  assert.equal(
    concurrentResults.filter(Boolean).length,
    1,
    'concurrent identical alert creation must have exactly one winner',
  );

  const firstAlertSnapshot = await firestoreAdmin.collection('systemAlerts').get();
  assert.equal(firstAlertSnapshot.size, 1);
  const firstAlert = firstAlertSnapshot.docs[0].data();
  assert.equal(firstAlert.type, 'usage');
  assert.equal(firstAlert.severity, 'critical');
  assert.equal(firstAlert.acknowledged, false);
  assert.equal(firstAlert.actionRequired, true);
  assert.equal(firstAlert.actionTaken, false);
  assert.ok(firstAlert.timestamp instanceof admin.firestore.Timestamp);
  assert.ok(firstAlert.expiresAt instanceof admin.firestore.Timestamp);
  assert.ok(
    firstAlert.expiresAt.toMillis() > Date.now() + 89 * 24 * 60 * 60 * 1000,
    'system alerts must carry the configured 90-day expiry boundary',
  );

  await Promise.all([
    logSystemError({
      tId: 'tenant-2',
      sId: 'store-2',
      errorType: 'function',
      severity: 'critical',
      message: 'CRITICAL_ALERT_CONTRACT_TEST',
      functionName: 'testSystemAlertContract',
    }),
    logSystemError({
      tId: 'tenant-2',
      sId: 'store-2',
      errorType: 'function',
      severity: 'critical',
      message: 'CRITICAL_ALERT_CONTRACT_TEST',
      functionName: 'testSystemAlertContract',
    }),
  ]);

  const alertsAfterCriticalError = await firestoreAdmin.collection('systemAlerts').get();
  assert.equal(
    alertsAfterCriticalError.size,
    2,
    'a deduplicated critical system error must create exactly one additional alert',
  );
  const criticalErrorAlert = alertsAfterCriticalError.docs
    .map((document) => document.data())
    .find((data) => data.title === 'Critical system error recorded');
  assert.ok(criticalErrorAlert, 'critical errors must use the canonical alert writer');
  assert.equal(criticalErrorAlert.type, 'error');
  assert.equal(criticalErrorAlert.severity, 'critical');
  assert.equal(criticalErrorAlert.actionRequired, true);
  assert.equal(criticalErrorAlert.actionTaken, false);
  assert.equal(criticalErrorAlert.acknowledged, false);
  assert.equal(criticalErrorAlert.metadata.platformTriggerType, 'CRITICAL_SYSTEM_ERROR');
  assert.ok(criticalErrorAlert.expiresAt instanceof admin.firestore.Timestamp);

  console.log('System alert contract emulator verification passed.');
}

run()
  .then(async () => {
    await admin.app().delete();
  })
  .catch(async (error) => {
    console.error(error);
    await admin.app().delete();
    process.exitCode = 1;
  });
