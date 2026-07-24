import assert from 'node:assert/strict';
import {
  buildFrictionInsightAccountingClientResponse,
  commitFrictionInsightIfSnapshotCurrent,
  frictionInsightTimestampToMillis,
  getFrictionInsightSourceFingerprint,
  normalizeFrictionInsightSourceSnapshot,
  parseFrictionInsightModelOutput,
} from '../../functions-answerlattice/src/answerlattice/frictionInsight';
import {
  cleanupExpiredFrictionStats,
  normalizeFrictionDailyStat,
} from '../../functions-answerlattice/src/answerlattice/frictionAggregation';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';
import { ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION } from '../../functions-answerlattice/src/sharedData/answerlatticeSupportMetrics';

const T_ID = 71_001;
const S_ID = 71_002;

async function main(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required.');

  const snapshotRef = db.collection('platformSummary').doc(`frictionSnapshot_${T_ID}_${S_ID}`);
  const insightRef = db.collection('platformSummary').doc(`friction_${T_ID}_${S_ID}`);
  await Promise.all([snapshotRef.delete(), insightRef.delete()]);

  await snapshotRef.set({
    pId: 'AL',
    tId: T_ID,
    sId: S_ID,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    lastUpdated: new Date('2026-07-20T00:00:00.000Z'),
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
    emergingTopics: [{
      entityId: 'billing',
      entityName: 'Billing',
      entityType: 'feature',
      queryCount: 8,
      escalationRate: 0.125,
      firstSeenDate: '2026-07-13',
    }],
  });
  await insightRef.set({
    privateLegacyPayload: 'must-be-pruned',
    staleMetric: 99,
    summary: 'stale',
  });

  const snapshot = (await snapshotRef.get()).data();
  const source = normalizeFrictionInsightSourceSnapshot(snapshot, T_ID, S_ID);
  assert.ok(source);
  assert.equal(frictionInsightTimestampToMillis(source.lastUpdated), Date.parse('2026-07-20T00:00:00.000Z'));
  assert.equal(normalizeFrictionInsightSourceSnapshot({ ...snapshot, totalSignals7d: '8' }, T_ID, S_ID), null);
  assert.equal(normalizeFrictionInsightSourceSnapshot({ ...snapshot, tId: String(T_ID) }, T_ID, S_ID), null);
  assert.equal(normalizeFrictionInsightSourceSnapshot({
    ...snapshot,
    window: { ...snapshot?.window, currentEndDate: '2026-07-20' },
  }, T_ID, S_ID), null);

  const validDailyStat = {
    pId: 'AL',
    tId: T_ID,
    sId: S_ID,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    entityId: 'billing',
    entityName: ' Billing ',
    entityType: ' feature ',
    date: '2026-07-19',
    queryCount: 8,
    ticketCount: 2,
    chatNegativeCount: 1,
    escalationCount: 1,
    lowConfidenceCount: 2,
    frictionScore: 999,
  };
  assert.deepEqual(normalizeFrictionDailyStat(validDailyStat, T_ID, S_ID), {
    entityId: 'billing',
    entityName: 'Billing',
    entityType: 'feature',
    date: '2026-07-19',
    queryCount: 8,
    ticketCount: 2,
    chatNegativeCount: 1,
    escalationCount: 1,
    lowConfidenceCount: 2,
    frictionScore: 11,
    legacy: false,
  });
  assert.equal(normalizeFrictionDailyStat({ ...validDailyStat, pId: 'ML' }, T_ID, S_ID), null);
  assert.equal(normalizeFrictionDailyStat({ ...validDailyStat, queryCount: '8' }, T_ID, S_ID), null);
  assert.equal(normalizeFrictionDailyStat({ ...validDailyStat, escalationCount: 9 }, T_ID, S_ID), null);
  assert.equal(normalizeFrictionInsightSourceSnapshot({
    ...snapshot,
    topFrictionEntities: [...(snapshot?.topFrictionEntities || []), snapshot?.topFrictionEntities?.[0]],
  }, T_ID, S_ID), null);

  const allowedEntityIds = new Set(['billing']);
  assert.equal(parseFrictionInsightModelOutput({
    summary: {},
    suggestedActions: [],
    emergingTopicNotes: [],
  }, allowedEntityIds), null);
  assert.equal(parseFrictionInsightModelOutput({
    summary: 'Review billing evidence.',
    suggestedActions: [{ entityId: 'billing', action: 'Review.', rawProviderText: 'private' }],
    emergingTopicNotes: [],
  }, allowedEntityIds), null);
  assert.equal(parseFrictionInsightModelOutput({
    summary: 'Review billing evidence.',
    suggestedActions: [{ entityId: 'unknown', action: 'Review.' }],
    emergingTopicNotes: [],
  }, allowedEntityIds), null);

  const firstInsight = {
    summary: 'Billing evidence needs review.',
    suggestedActions: [{ entityId: 'billing', action: 'Review the current approved billing answer.' }],
    emergingTopicNotes: ['Billing questions increased in the completed window.'],
  };
  assert.deepEqual(buildFrictionInsightAccountingClientResponse('MODERATE', null), {
    frictionLevel: 'MODERATE',
  });
  assert.deepEqual(buildFrictionInsightAccountingClientResponse('MODERATE', firstInsight), {
    emergingTopicsCount: 1,
    frictionLevel: 'MODERATE',
    suggestedActionCount: 1,
  });
  const sourceFingerprint = getFrictionInsightSourceFingerprint(source);
  assert.equal(await commitFrictionInsightIfSnapshotCurrent({
    insight: firstInsight,
    sId: S_ID,
    sourceFingerprint,
    tId: T_ID,
  }), true);
  const firstStored = (await insightRef.get()).data() || {};
  assert.deepEqual(Object.keys(firstStored).sort(), [
    'advisory',
    'emergingTopics',
    'frictionLevel',
    'generatedAt',
    'lastUpdated',
    'overallHealth',
    'pId',
    'promptVersion',
    'sId',
    'schemaVersion',
    'sourceSnapshotUpdatedAt',
    'suggestedActions',
    'summary',
    'tId',
    'topFrictions',
    'weekEnd',
    'weekStart',
  ]);
  assert.equal(firstStored.summary, firstInsight.summary);
  assert.equal(firstStored.privateLegacyPayload, undefined);
  assert.equal(firstStored.staleMetric, undefined);

  await snapshotRef.update({ totalSignals7d: 9 });
  assert.equal(await commitFrictionInsightIfSnapshotCurrent({
    insight: { ...firstInsight, summary: 'Must not publish over changed source.' },
    sId: S_ID,
    sourceFingerprint,
    tId: T_ID,
  }), false);
  assert.equal((await insightRef.get()).data()?.summary, firstInsight.summary);

  const currentSource = normalizeFrictionInsightSourceSnapshot((await snapshotRef.get()).data(), T_ID, S_ID);
  assert.ok(currentSource);
  const currentFingerprint = getFrictionInsightSourceFingerprint(currentSource);
  assert.equal(await commitFrictionInsightIfSnapshotCurrent({
    insight: {
      ...firstInsight,
      suggestedActions: [{ entityId: 'billing', action: 'Review.', rawProviderText: 'private' }],
    },
    sId: S_ID,
    sourceFingerprint: currentFingerprint,
    tId: T_ID,
  }), false);
  assert.equal((await insightRef.get()).data()?.summary, firstInsight.summary);

  const dailyStats = db.collection('answerlattice_frictionDailyStats');
  const expiredAlRef = dailyStats.doc(`${T_ID}_${S_ID}_billing_2026-01-01`);
  const expiredForeignRef = dailyStats.doc(`${T_ID}_${S_ID}_foreign_2026-01-01`);
  const recentAlRef = dailyStats.doc(`${T_ID}_${S_ID}_billing_2026-07-19`);
  await Promise.all([
    expiredAlRef.set({ ...validDailyStat, date: '2026-01-01' }),
    expiredForeignRef.set({ ...validDailyStat, pId: 'ML', entityId: 'foreign', date: '2026-01-01' }),
    recentAlRef.set(validDailyStat),
  ]);
  assert.deepEqual(await cleanupExpiredFrictionStats(
    T_ID,
    S_ID,
    90,
    100,
    new Date('2026-07-20T12:00:00.000Z'),
  ), { cleaned: 1 });
  assert.equal((await expiredAlRef.get()).exists, false);
  assert.equal((await expiredForeignRef.get()).exists, true);
  assert.equal((await recentAlRef.get()).exists, true);
  await assert.rejects(
    cleanupExpiredFrictionStats(T_ID, S_ID, -1, 100, new Date('2026-07-20T12:00:00.000Z')),
    /ANSWERLATTICE_FRICTION_STATS_CLEANUP_FAILED/,
  );

  await Promise.all([snapshotRef.delete(), insightRef.delete(), expiredForeignRef.delete(), recentAlRef.delete()]);
  console.log('Answerlattice friction insight state emulator tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
