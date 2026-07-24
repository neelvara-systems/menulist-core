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
import {
    getAnswerlatticeFrictionScopeKey,
    projectFrictionInsightsStateForScope,
} from '@hook/answerlattice/frictionInsightsScopeState';

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
const projectedCoverage = parseAnswerlatticeCoverageData({
    ...coverage,
    privateLegacyPayload: 'must-not-reach-owner-state',
}, scope);
assert.ok(projectedCoverage);
assert.equal('privateLegacyPayload' in projectedCoverage, false);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, tId: '7' }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, schemaVersion: 1 }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, window: { ...rollingWindow, complete: false } }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, coverage: { ...coverage.coverage, total: 9 } }, scope), null);
assert.equal(parseAnswerlatticeCoverageData({ ...coverage, coverage: { ...coverage.coverage, rate: 71 } }, scope), null);

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
const projectedTrust = parseAnswerlatticeTrustMetrics({
    ...trust,
    privateLegacyPayload: 'must-not-reach-owner-state',
}, scope);
assert.ok(projectedTrust);
assert.equal('privateLegacyPayload' in projectedTrust, false);
assert.equal(parseAnswerlatticeTrustMetrics({ ...trust, sourceCompleteness: { ...trust.sourceCompleteness, complete: false } }, scope), null);
assert.equal(parseAnswerlatticeTrustMetrics({ ...trust, topFailingEntities: [{ ...trust.topFailingEntities[0], entityId: '' }] }, scope), null);
assert.equal(parseAnswerlatticeTrustMetrics({
    ...trust,
    topFailingEntities: [{ ...trust.topFailingEntities[0], reliabilityScore: 'unknown' }],
}, scope), null);
assert.equal(parseAnswerlatticeTrustMetrics({
    ...trust,
    escalationBreakdown: { ...trust.escalationBreakdown, entityMismatch: 'unknown' },
}, scope), null);
assert.equal(parseAnswerlatticeTrustMetrics({
    ...trust,
    nonEscalation: { ...trust.nonEscalation, rate: 79 },
}, scope), null);

const calendarWindow = {
    kind: 'utc_calendar_7_days',
    startAt: timestamp(Date.parse('2026-07-11T00:00:00.000Z') / 1_000),
    endAt: timestamp(Date.parse('2026-07-17T23:59:59.000Z') / 1_000),
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
    topFrictionEntities: [{
        entityId: 'billing',
        entityName: 'Billing',
        entityType: 'feature',
        last7d: { queryCount: 8, escalationCount: 1, lowConfidenceCount: 2, frictionScore: 10 },
        previous7d: { queryCount: 4, frictionScore: 5 },
        trendDirection: 'rising',
        trendScore: 2,
    }],
    emergingTopics: [{
        entityId: 'billing',
        entityName: 'Billing',
        entityType: 'feature',
        queryCount: 8,
        escalationRate: 0.125,
        firstSeenDate: '2026-07-11',
    }],
    frictionLevel: 'LOW',
    totalWeightedLoad: 10,
    overallHealth: 'LOW',
    totalSignals7d: 8,
    totalEscalations7d: 1,
    unmappedEvidenceCount: 0,
    legacyDailyStatCount: 0,
};
const projectedFrictionSnapshot = parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    privateLegacyPayload: 'must-not-reach-owner-state',
}, scope);
assert.ok(projectedFrictionSnapshot);
assert.equal('privateLegacyPayload' in projectedFrictionSnapshot, false);
assert.equal(parseAnswerlatticeFrictionSnapshot({ ...frictionSnapshot, frictionLevel: 'HEALTHY' }, scope), null);
assert.equal(parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    topFrictionEntities: [frictionSnapshot.topFrictionEntities[0], frictionSnapshot.topFrictionEntities[0]],
}, scope), null);
assert.equal(parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    topFrictionEntities: [{
        ...frictionSnapshot.topFrictionEntities[0],
        last7d: { ...frictionSnapshot.topFrictionEntities[0].last7d, escalationCount: 9 },
    }],
}, scope), null);
assert.equal(parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    window: { ...calendarWindow, currentStartDate: '2026-07-10' },
}, scope), null);

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
    promptVersion: 'friction-insight-v1',
    generatedAt: timestamp(220),
};
const projectedFrictionInsight = parseAnswerlatticeFrictionInsight({
    ...frictionInsight,
    summary: '  Billing questions rose\n and need evidence review.  ',
    privateProviderPayload: 'must-not-reach-owner-state',
}, scope);
assert.ok(projectedFrictionInsight);
assert.equal(projectedFrictionInsight.summary, 'Billing questions rose and need evidence review.');
assert.equal('privateProviderPayload' in projectedFrictionInsight, false);
assert.equal(parseAnswerlatticeFrictionInsight({ ...frictionInsight, advisory: false }, scope), null);
assert.equal(parseAnswerlatticeFrictionInsight({ ...frictionInsight, promptVersion: undefined }, scope), null);
assert.equal(parseAnswerlatticeFrictionInsight({ ...frictionInsight, generatedAt: undefined }, scope), null);
assert.equal(parseAnswerlatticeFrictionInsight({ ...frictionInsight, weekEnd: '2026-07-18' }, scope), null);
assert.equal(parseAnswerlatticeFrictionInsight({
    ...frictionInsight,
    suggestedActions: [frictionInsight.suggestedActions[0], frictionInsight.suggestedActions[0]],
}, scope), null);

const scopeKey = getAnswerlatticeFrictionScopeKey(scope.tenantId, scope.storeId);
assert.equal(scopeKey, '7:9');
assert.equal(getAnswerlatticeFrictionScopeKey(0, scope.storeId), null);
const tenantAState = {
    scopeKey,
    snapshot: projectedFrictionSnapshot,
    insight: projectedFrictionInsight,
    loading: false,
    error: 'prior scope error',
};
assert.deepEqual(projectFrictionInsightsStateForScope(tenantAState, 8, 10), {
    snapshot: null,
    insight: null,
    loading: true,
    error: null,
});
assert.deepEqual(projectFrictionInsightsStateForScope(tenantAState, 0, 0), {
    snapshot: null,
    insight: null,
    loading: false,
    error: null,
});

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
