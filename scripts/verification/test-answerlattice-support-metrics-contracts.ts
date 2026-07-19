import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    calculateAnswerlatticeFrictionLoad,
    classifyAnswerlatticeFrictionLevel,
    detectAnswerlatticeFrictionTrend,
    getAnswerlatticeUtcFrictionWindows,
} from '@data/shared/answerlatticeSupportMetrics';
import {
    parseAnswerlatticeCoverageData,
    parseAnswerlatticeFrictionInsight,
    parseAnswerlatticeFrictionSnapshot,
    parseAnswerlatticeTrustMetrics,
} from '@lib/answerlattice/analyticsIntelligenceContracts';

const ROOT = path.resolve(__dirname, '..', '..');
const timestamp = (seconds: number) => ({ seconds, nanoseconds: 0 });
const scope = { tenantId: 7, storeId: 9 };
const storedScope = { pId: 'AL', tId: 7, sId: 9 };

const windows = getAnswerlatticeUtcFrictionWindows(new Date('2026-07-18T14:00:00.000Z'));
assert.deepEqual(windows, {
    today: '2026-07-18',
    dayStartMs: Date.parse('2026-07-18T00:00:00.000Z'),
    currentStart: '2026-07-11',
    currentEnd: '2026-07-17',
    previousStart: '2026-07-04',
    previousEnd: '2026-07-10',
});
assert.equal(calculateAnswerlatticeFrictionLoad(10, 2, 3), 15);
assert.deepEqual(detectAnswerlatticeFrictionTrend(16, 10), { direction: 'rising', ratio: 1.6 });
assert.deepEqual(detectAnswerlatticeFrictionTrend(6, 10), { direction: 'improving', ratio: 0.6 });
assert.equal(classifyAnswerlatticeFrictionLevel(0), 'LOW');
assert.equal(classifyAnswerlatticeFrictionLevel(101), 'MODERATE');
assert.equal(classifyAnswerlatticeFrictionLevel(501), 'HIGH');

const rollingWindow = {
    kind: 'rolling_24_hours',
    startAt: timestamp(100),
    endAt: timestamp(200),
    complete: true,
    sourceLimit: 500,
    observedCount: 10,
};
const coverage = {
    ...storedScope,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    lastUpdated: timestamp(210),
    window: rollingWindow,
    coverage: { date: '2026-07-18', hits: 7, misses: 3, rate: 70, total: 10 },
};
assert.ok(parseAnswerlatticeCoverageData(coverage, scope));
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, tId: '7' }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, schemaVersion: 1 }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, window: { ...rollingWindow, complete: false } }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, coverage: { ...coverage.coverage, total: 9 } }, scope), null);

const trust = {
    ...storedScope,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    lastUpdated: timestamp(210),
    date: '2026-07-18',
    window: rollingWindow,
    sourceCompleteness: { complete: true, activeAnswers: 4, activeEntities: 5, signalEvents: 3, searchHistory: 10 },
    coverage: { rate: 70, hits: 7, misses: 3, total: 10, previousRate: 65 },
    nonEscalation: { rate: 80, withoutEscalation: 8, escalated: 2, total: 10, previousRate: 75 },
    drift: { rate: 25, driftedCount: 1, activeCount: 4, previousRate: 20 },
    entityAnswerCoverage: { rate: 80, coveredCount: 4, uncoveredCount: 1, driftedCoveredCount: 1, totalEntities: 5, previousRate: 60 },
    confirmedResolution: {
        rate: 67,
        confirmedResolved: 2,
        confirmedNotResolved: 1,
        explicitOutcomeTotal: 3,
        recontactEligible: 2,
        recontactedSameSession: 0,
        previousRate: 50,
        observationWindowHours: 24,
    },
    topFailingEntities: [{
        entityId: 'billing',
        entityName: 'Billing',
        entityType: 'feature',
        queryCount: 3,
        escalationCount: 1,
        reliabilityScore: 0,
        failureScore: 5,
        evidenceCount: 3,
        negativeFeedbackCount: 1,
        canonicalMissCount: 1,
        weightedLoad: 5,
    }],
    escalationBreakdown: { knowledgeGap: 1, lowConfidence: 1, entityMismatch: 0, retrievalFailure: 0, userRequested: 1, total: 2 },
};
assert.ok(parseAnswerlatticeTrustMetrics(trust, scope));
assert.equal(parseAnswerlatticeTrustMetrics({ ...trust, sourceCompleteness: { ...trust.sourceCompleteness, complete: false } }, scope), null);
assert.equal(parseAnswerlatticeTrustMetrics({ ...trust, topFailingEntities: [{ ...trust.topFailingEntities[0], entityId: '' }] }, scope), null);

const calendarWindow = {
    kind: 'utc_calendar_7_days',
    startAt: timestamp(100),
    endAt: timestamp(200),
    complete: true,
    sourceLimit: 500,
    observedCount: 14,
    currentStartDate: '2026-07-11',
    currentEndDate: '2026-07-17',
    previousStartDate: '2026-07-04',
    previousEndDate: '2026-07-10',
};
const frictionSnapshot = {
    ...storedScope,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    lastUpdated: timestamp(210),
    window: calendarWindow,
    topFrictionEntities: [],
    emergingTopics: [],
    frictionLevel: 'LOW',
    totalWeightedLoad: 10,
    overallHealth: 'LOW',
    totalSignals7d: 8,
    totalEscalations7d: 1,
    unmappedEvidenceCount: 0,
    legacyDailyStatCount: 0,
};
assert.ok(parseAnswerlatticeFrictionSnapshot(frictionSnapshot, scope));
assert.equal(parseAnswerlatticeFrictionSnapshot({ ...frictionSnapshot, frictionLevel: 'HEALTHY' }, scope), null);

const frictionInsight = {
    ...storedScope,
    schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    lastUpdated: timestamp(220),
    weekStart: '2026-07-11',
    weekEnd: '2026-07-17',
    summary: 'Billing questions rose and need evidence review.',
    advisory: true,
    sourceSnapshotUpdatedAt: timestamp(210),
    suggestedActions: [{ entityId: 'billing', action: 'Review the approved billing answer and recent fallback evidence.' }],
    frictionLevel: 'LOW',
};
assert.ok(parseAnswerlatticeFrictionInsight(frictionInsight, scope));
assert.equal(parseAnswerlatticeFrictionInsight({ ...frictionInsight, advisory: false }, scope), null);

const rootShared = fs.readFileSync(path.join(ROOT, 'src/data/shared/answerlatticeSupportMetrics.ts'), 'utf8');
const functionShared = fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/sharedData/answerlatticeSupportMetrics.ts'), 'utf8');
assert.equal(rootShared, functionShared, 'support metrics shared data must stay byte-for-byte mirrored');

const nightly = fs.readFileSync(path.join(ROOT, 'functions-answerlattice/src/answerlattice/answerlatticeNightly.ts'), 'utf8');
assert.ok(nightly.includes('.limit(sourceLimit + 1)'), 'coverage must use cap+1 saturation detection');
assert.ok(nightly.includes('coverageResult?.complete'), 'trust and downstream metrics must require complete coverage');
assert.ok(nightly.includes('Timestamp.fromMillis(coverageResult.windowStartMillis)'), 'trust signal evidence must use the exact coverage window start');
assert.ok(nightly.includes('sourceCompleteness: {'), 'trust summary must publish source completeness');
assert.ok(!fs.readFileSync(path.join(ROOT, 'src/lib/answerlattice/activationSummary.ts'), 'utf8').includes('const getTrustScore'), 'activation must not compute an opaque trust score');

const dashboard = fs.readFileSync(path.join(ROOT, 'src/app/(answerlattice)/answerlattice/dashboard/page.tsx'), 'utf8');
const weeklyDigest = fs.readFileSync(path.join(ROOT, 'src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx'), 'utf8');
const governanceHub = fs.readFileSync(path.join(ROOT, 'src/components/templates/answerlattice/governance/index.tsx'), 'utf8');
const ownerAssistant = fs.readFileSync(path.join(ROOT, 'src/lib/answerlattice/ownerSupportAssistant.ts'), 'utf8');
for (const [label, source] of [
    ['dashboard', dashboard],
    ['weekly digest', weeklyDigest],
    ['governance hub', governanceHub],
    ['owner assistant', ownerAssistant],
] as const) {
    assert.ok(!source.includes('trustScore'), `${label} must not render or derive an opaque trust score`);
    assert.ok(!source.includes('criticalEntities'), `${label} must not rename uncovered entities as critical entities`);
}
assert.ok(dashboard.includes('No escalation'), 'dashboard must expose the explicit no-escalation metric');
assert.ok(weeklyDigest.includes('parseAnswerlatticeWeeklySummary'), 'weekly digest must admit the scoped weekly summary contract');
assert.ok(weeklyDigest.includes('The digest is advisory. Review evidence before changing an approved answer.'), 'weekly digest must preserve the governance boundary');
assert.ok(!weeklyDigest.includes('/api/answerlattice/activation/summary'), 'weekly digest must not render activation readiness as weekly performance');
assert.ok(ownerAssistant.includes('entityAnswerCoverage?.uncoveredCount'), 'owner assistant must read uncovered entity coverage explicitly');

console.log('Answerlattice support metrics contracts passed.');
