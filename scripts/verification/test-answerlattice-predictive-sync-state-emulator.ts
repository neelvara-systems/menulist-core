import assert from 'node:assert/strict';
import {
  autoGenerateSuggestions,
  rebuildTriggerCache,
  runPredictiveTriggerSync,
  updateEffectiveness,
} from '../../functions-answerlattice/src/answerlattice/predictiveTriggerSync';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';
import { ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION } from '../../functions-answerlattice/src/sharedData/answerlatticeSupportMetrics';

const T_ID = 72_001;
const S_ID = 72_002;
const RUN_AT = new Date('2026-07-20T12:00:00.000Z');
const ACTIVE_TRIGGER_ID = 'billing_recovery';

async function clearCollection(collectionName: string): Promise<void> {
  const snapshot = await db.collection(collectionName).get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
}

async function main(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required.');

  await Promise.all([
    clearCollection('answerlattice_predictiveTriggers'),
    clearCollection('answerlattice_signalEvents'),
    clearCollection('platformSummary'),
  ]);

  const frictionRef = db.collection('platformSummary').doc(`frictionSnapshot_${T_ID}_${S_ID}`);
  await frictionRef.set({
    pId: 'AL',
    tId: T_ID,
    sId: S_ID,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    lastUpdated: RUN_AT,
    window: {
      kind: 'utc_calendar_7_days',
      complete: true,
      startAt: new Date('2026-07-13T00:00:00.000Z'),
      endAt: new Date('2026-07-19T23:59:59.999Z'),
      sourceLimit: 500,
      observedCount: 14,
      currentStartDate: '2026-07-13',
      currentEndDate: '2026-07-19',
      previousStartDate: '2026-07-06',
      previousEndDate: '2026-07-12',
    },
    frictionLevel: 'MODERATE',
    totalWeightedLoad: 12.5,
    totalSignals7d: 8,
    totalEscalations7d: 1,
    unmappedEvidenceCount: 0,
    legacyDailyStatCount: 0,
    topFrictionEntities: [{
      entityId: 'billing',
      entityName: 'Billing',
      entityType: 'feature',
      last7d: { queryCount: 8, escalationCount: 1, lowConfidenceCount: 2, frictionScore: 12.5 },
      previous7d: { queryCount: 4, frictionScore: 6 },
      trendDirection: 'rising',
      trendScore: 2.08,
    }],
    emergingTopics: [],
  });

  const concurrentGeneration = await Promise.all([
    autoGenerateSuggestions(T_ID, S_ID, RUN_AT),
    autoGenerateSuggestions(T_ID, S_ID, RUN_AT),
  ]);
  assert.equal(concurrentGeneration.reduce((sum, count) => sum + count, 0), 1);
  const autoSuggestions = await db.collection('answerlattice_predictiveTriggers')
    .where('tId', '==', T_ID)
    .where('sId', '==', S_ID)
    .where('source', '==', 'friction_auto')
    .get();
  assert.equal(autoSuggestions.size, 1);
  assert.equal(autoSuggestions.docs[0].data().frictionSource.entityId, 'billing');

  await assert.rejects(
    runPredictiveTriggerSync(0, S_ID, RUN_AT),
    /ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT/,
  );
  await frictionRef.update({ totalSignals7d: '8' });
  await assert.rejects(
    autoGenerateSuggestions(T_ID, S_ID, RUN_AT),
    /ANSWERLATTICE_PREDICTIVE_TRIGGER_FRICTION_SOURCE_INVALID/,
  );
  await frictionRef.update({ totalSignals7d: 8 });

  const activeRef = db.collection('answerlattice_predictiveTriggers').doc(ACTIVE_TRIGGER_ID);
  await activeRef.set({
    pId: 'AL',
    tId: T_ID,
    sId: S_ID,
    name: 'Billing recovery',
    kind: 'predictive_help',
    conditions: { page: 'billing_settings' },
    action: { type: 'help_card', customTitle: 'Recover billing' },
    priority: 80,
    cooldownHours: 24,
    status: 'active',
    source: 'manual',
    createdOn: RUN_AT,
    modifiedOn: RUN_AT,
  });
  const signals = db.collection('answerlattice_signalEvents');
  await Promise.all([
    signals.doc('shown').set({
      pId: 'AL', tId: T_ID, sId: S_ID, entityId: 'unresolved', type: 'suggestion_shown',
      timestamp: new Date(RUN_AT.getTime() - 1_000), metadata: { triggerId: ACTIVE_TRIGGER_ID },
    }),
    signals.doc('clicked').set({
      pId: 'AL', tId: T_ID, sId: S_ID, entityId: 'unresolved', type: 'suggestion_clicked',
      timestamp: RUN_AT, metadata: { triggerId: ACTIVE_TRIGGER_ID },
    }),
    signals.doc('foreign').set({
      pId: 'ML', tId: T_ID, sId: S_ID, entityId: 'unresolved', type: 'suggestion_dismissed',
      timestamp: RUN_AT, metadata: { triggerId: ACTIVE_TRIGGER_ID },
    }),
  ]);
  assert.equal(await updateEffectiveness(T_ID, S_ID, RUN_AT), 1);
  const firstEffectiveness = (await activeRef.get()).data()?.effectiveness;
  assert.deepEqual({ ...firstEffectiveness, lastEvaluated: firstEffectiveness?.lastEvaluated?.toMillis() }, {
    impressions: 1, clicks: 1, dismissals: 0, score: 1, lastEvaluated: RUN_AT.getTime(),
  });

  const afterWindow = new Date(RUN_AT.getTime() + (31 * 24 * 60 * 60 * 1000));
  assert.equal(await updateEffectiveness(T_ID, S_ID, afterWindow), 1);
  const expiredEffectiveness = (await activeRef.get()).data()?.effectiveness;
  assert.deepEqual({ ...expiredEffectiveness, lastEvaluated: expiredEffectiveness?.lastEvaluated?.toMillis() }, {
    impressions: 0, clicks: 0, dismissals: 0, score: 0, lastEvaluated: afterWindow.getTime(),
  });

  const firstRebuild = await rebuildTriggerCache(T_ID, S_ID, afterWindow);
  assert.equal(firstRebuild.rebuilt, true);
  const summaryRef = db.collection('platformSummary').doc(`predictiveTriggers_${T_ID}_${S_ID}`);
  const summary = (await summaryRef.get()).data();
  assert.equal(summary?.contextInvalidationVersion, 1);
  assert.equal(summary?.version, afterWindow.getTime());
  assert.equal(summary?.triggers?.[ACTIVE_TRIGGER_ID]?.effectiveness, undefined);
  assert.equal((await db.collection('platformSummary').doc(`sourceVersions_${T_ID}_${S_ID}`).get()).data()?.predictiveTriggers, 1);
  assert.equal((await db.collection('platformSummary').doc(`bundleManifest_${T_ID}_${S_ID}`).get()).data()?.status, 'stale');

  const secondRebuild = await rebuildTriggerCache(T_ID, S_ID, afterWindow);
  assert.deepEqual(secondRebuild, { count: firstRebuild.count, rebuilt: false });
  assert.equal((await db.collection('platformSummary').doc(`sourceVersions_${T_ID}_${S_ID}`).get()).data()?.predictiveTriggers, 1);

  await summaryRef.update({ [`triggers.${ACTIVE_TRIGGER_ID}.privateLegacyField`]: 'must-be-pruned' });
  assert.equal((await rebuildTriggerCache(T_ID, S_ID, afterWindow)).rebuilt, true);
  assert.equal((await summaryRef.get()).data()?.triggers?.[ACTIVE_TRIGGER_ID]?.privateLegacyField, undefined);
  assert.equal((await db.collection('platformSummary').doc(`sourceVersions_${T_ID}_${S_ID}`).get()).data()?.predictiveTriggers, 2);

  const malformedTriggerRef = db.collection('answerlattice_predictiveTriggers').doc('malformed_owned_trigger');
  await malformedTriggerRef.set({
    pId: 'AL', tId: T_ID, sId: S_ID, status: 'active', source: 'manual',
    conditions: { page: 'billing_settings' }, action: { type: 'help_card' }, priority: 50, cooldownHours: 24,
  });
  const validSummaryHash = (await summaryRef.get()).data()?.sourceHash;
  await assert.rejects(
    rebuildTriggerCache(T_ID, S_ID, afterWindow),
    /ANSWERLATTICE_PREDICTIVE_TRIGGER_SOURCE_INVALID/,
  );
  assert.equal((await summaryRef.get()).data()?.sourceHash, validSummaryHash);
  assert.equal((await db.collection('platformSummary').doc(`sourceVersions_${T_ID}_${S_ID}`).get()).data()?.predictiveTriggers, 2);

  await Promise.all([
    clearCollection('answerlattice_predictiveTriggers'),
    clearCollection('answerlattice_signalEvents'),
    clearCollection('platformSummary'),
  ]);
  console.log('Answerlattice predictive sync state emulator tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
