import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { FEATURE_FLAGS } from '@config/features';
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
    ANSWERLATTICE_FRICTION_REVIEW_PATHS,
    ANSWERLATTICE_FRICTION_EVIDENCE_BRIEF_MAX_BYTES,
    buildAnswerlatticeFrictionEvidenceBrief,
} from '@lib/answerlattice/frictionEvidenceBrief';
import { getAnswerlatticeFrictionReviewDestination } from '@lib/answerlattice/frictionReviewRouting';
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
        last7d: {
            queryCount: 8,
            ticketCount: 2,
            chatNegativeCount: 1,
            escalationCount: 1,
            canonicalMissCount: 2,
            lowConfidenceCount: 2,
            frictionScore: 10,
        },
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
assert.deepEqual(projectedFrictionSnapshot.topFrictionEntities[0].last7d, {
    queryCount: 8,
    ticketCount: 2,
    chatNegativeCount: 1,
    escalationCount: 1,
    canonicalMissCount: 2,
    lowConfidenceCount: 2,
    frictionScore: 10,
});
const {
    ticketCount: _legacyTicketCount,
    chatNegativeCount: _legacyChatNegativeCount,
    canonicalMissCount: _legacyCanonicalMissCount,
    ...legacyLast7d
} = frictionSnapshot.topFrictionEntities[0].last7d;
const projectedLegacyFrictionSnapshot = parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    topFrictionEntities: [{
        ...frictionSnapshot.topFrictionEntities[0],
        last7d: legacyLast7d,
    }],
}, scope);
assert.ok(projectedLegacyFrictionSnapshot);
assert.equal(
    'ticketCount' in projectedLegacyFrictionSnapshot.topFrictionEntities[0].last7d,
    false,
    'legacy summaries remain readable without invented component zeroes',
);
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
    topFrictionEntities: [{
        ...frictionSnapshot.topFrictionEntities[0],
        last7d: {
            ...frictionSnapshot.topFrictionEntities[0].last7d,
            ticketCount: 5,
            chatNegativeCount: 2,
        },
    }],
}, scope), null, 'component totals cannot exceed the admitted evidence total');
assert.equal(parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    topFrictionEntities: [{
        ...frictionSnapshot.topFrictionEntities[0],
        last7d: {
            ...frictionSnapshot.topFrictionEntities[0].last7d,
            canonicalMissCount: 1,
        },
    }],
}, scope), null, 'canonical-miss projection must match the retained daily-row count');
assert.equal(parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    topFrictionEntities: [{
        ...frictionSnapshot.topFrictionEntities[0],
        last7d: {
            ...legacyLast7d,
            ticketCount: 2,
        },
    }],
}, scope), null, 'partial evidence breakdowns must fail closed');
assert.equal(parseAnswerlatticeFrictionSnapshot({
    ...frictionSnapshot,
    window: { ...calendarWindow, currentStartDate: '2026-07-10' },
}, scope), null);

const frictionEvidenceBrief = buildAnswerlatticeFrictionEvidenceBrief({
    entity: projectedFrictionSnapshot.topFrictionEntities[0],
    reviewPath: 'review_product_behavior',
    sourceLastUpdated: '2026-07-18T00:03:30.000Z',
    window: projectedFrictionSnapshot.window,
});
assert.equal(
    frictionEvidenceBrief.fileName,
    'answerlattice-friction-evidence-billing-2026-07-17.md',
);
assert.ok(frictionEvidenceBrief.markdown.includes('Selected review path: Review product behavior'));
assert.ok(frictionEvidenceBrief.markdown.includes('Support-evidence events: 8'));
assert.ok(frictionEvidenceBrief.markdown.includes('Ticket evidence: 2'));
assert.ok(frictionEvidenceBrief.markdown.includes('Canonical-miss evidence: 2'));
assert.ok(frictionEvidenceBrief.markdown.includes('Rising: 100% more evidence events'));
assert.ok(frictionEvidenceBrief.markdown.includes('does not prove unique affected users'));
assert.ok(!frictionEvidenceBrief.markdown.includes('Probable product defect'));
assert.ok(!frictionEvidenceBrief.markdown.includes('Affected users:'));
assert.ok(!frictionEvidenceBrief.markdown.includes('Pain reduced'));
const knownLimitationBrief = buildAnswerlatticeFrictionEvidenceBrief({
    entity: projectedFrictionSnapshot.topFrictionEntities[0],
    reviewPath: 'review_known_limitation',
    window: projectedFrictionSnapshot.window,
});
assert.ok(knownLimitationBrief.markdown.includes('Selected review path: Review known limitation'));
assert.ok(knownLimitationBrief.markdown.includes('Verify whether this is an intentional approved constraint'));
assert.ok(!knownLimitationBrief.markdown.includes('Confirmed limitation'));
assert.ok(
    new TextEncoder().encode(frictionEvidenceBrief.markdown).byteLength
        <= ANSWERLATTICE_FRICTION_EVIDENCE_BRIEF_MAX_BYTES,
);
assert.deepEqual(
    buildAnswerlatticeFrictionEvidenceBrief({
        entity: projectedFrictionSnapshot.topFrictionEntities[0],
        reviewPath: 'review_product_behavior',
        sourceLastUpdated: '2026-07-18T00:03:30.000Z',
        window: projectedFrictionSnapshot.window,
    }),
    frictionEvidenceBrief,
    'the same admitted snapshot and owner selection must produce the same brief',
);
assert.throws(() => buildAnswerlatticeFrictionEvidenceBrief({
    entity: projectedFrictionSnapshot.topFrictionEntities[0],
    reviewPath: 'automatic_root_cause' as never,
    window: projectedFrictionSnapshot.window,
}));
assert.throws(() => buildAnswerlatticeFrictionEvidenceBrief({
    entity: projectedFrictionSnapshot.topFrictionEntities[0],
    reviewPath: 'investigate_further',
    window: { ...projectedFrictionSnapshot.window, complete: false },
}));
assert.throws(() => buildAnswerlatticeFrictionEvidenceBrief({
    entity: projectedFrictionSnapshot.topFrictionEntities[0],
    reviewPath: 'investigate_further',
    window: { ...projectedFrictionSnapshot.window, currentEndDate: '2026-02-30' },
}));
const legacyFrictionEvidenceBrief = buildAnswerlatticeFrictionEvidenceBrief({
    entity: projectedLegacyFrictionSnapshot.topFrictionEntities[0],
    reviewPath: 'investigate_further',
    window: projectedLegacyFrictionSnapshot.window,
});
assert.ok(
    legacyFrictionEvidenceBrief.markdown.includes(
        'Evidence component breakdown: Available after the next nightly refresh.',
    ),
);
assert.equal(Object.keys(ANSWERLATTICE_FRICTION_REVIEW_PATHS).length, 7);
assert.deepEqual(
    getAnswerlatticeFrictionReviewDestination('investigate_further', 'billing'),
    {
        actionLabel: 'Open product context',
        helperText: 'Inspect the mapped topic and its governed relationships before deciding what should change.',
        href: '/answerlattice/governance/map?entity=billing',
        kind: 'internal_route',
    },
);
const knowledgeMapEnabled = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP;
try {
    (FEATURE_FLAGS as { ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP: boolean })
        .ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP = false;
    assert.deepEqual(
        getAnswerlatticeFrictionReviewDestination('investigate_further', 'billing'),
        {
            actionLabel: 'Copy brief',
            helperText: 'Product context is unavailable right now. Copy the evidence brief and review the topic in your existing product system.',
            kind: 'local_export',
        },
        'investigation must fail closed to the local packet when the Knowledge Map is disabled',
    );
} finally {
    (FEATURE_FLAGS as { ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP: boolean })
        .ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP = knowledgeMapEnabled;
}
assert.deepEqual(
    getAnswerlatticeFrictionReviewDestination('review_support_knowledge', 'billing'),
    {
        actionLabel: 'Review trusted answers',
        helperText: 'Open trusted answers filtered to this product topic.',
        href: '/answerlattice/governance/answers?entity=billing',
        kind: 'internal_route',
    },
);
assert.deepEqual(
    getAnswerlatticeFrictionReviewDestination('review_known_limitation', 'billing'),
    {
        actionLabel: 'Review limitation answers',
        helperText: 'Open trusted answers for this topic and verify that the limitation is intentional, approved, and current.',
        href: '/answerlattice/governance/answers?entity=billing',
        kind: 'internal_route',
    },
);
assert.deepEqual(
    getAnswerlatticeFrictionReviewDestination('review_access_explanation', 'billing'),
    {
        actionLabel: 'Review scoped answers',
        helperText: 'Open trusted answers for this topic and inspect their plan and role scope.',
        href: '/answerlattice/governance/answers?entity=billing',
        kind: 'internal_route',
    },
);
assert.equal(
    getAnswerlatticeFrictionReviewDestination('review_product_behavior', 'billing').kind,
    'local_export',
    'product behavior review must remain a local handoff to the owner engineering system',
);
assert.ok(
    getAnswerlatticeFrictionReviewDestination('watch_next_window', 'billing').helperText.includes(
        'No reminder is created.',
    ),
    'watching a future window must not imply saved reminder state',
);
assert.equal(
    getAnswerlatticeFrictionReviewDestination('no_action_now', 'billing').kind,
    'close',
);
assert.equal(
    getAnswerlatticeFrictionReviewDestination('review_support_knowledge', '../unsafe').kind,
    'local_export',
    'invalid entity context must fail closed to the local evidence packet',
);
assert.equal(
    getAnswerlatticeFrictionReviewDestination('automatic_root_cause' as never, 'billing').kind,
    'local_export',
    'unknown review paths must fail closed without navigation or persistence',
);

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
assert.ok(
    rootShared.includes('export interface AnswerlatticeFrictionEvidenceComponents'),
    'shared metrics must declare the bounded friction evidence components',
);

const frictionAggregation = fs.readFileSync(
    path.join(ROOT, 'functions-answerlattice/src/answerlattice/frictionAggregation.ts'),
    'utf8',
);
assert.ok(
    frictionAggregation.includes('agg.last7d.ticketCount += stat.ticketCount'),
    'snapshot aggregation must project retained ticket evidence',
);
assert.ok(
    frictionAggregation.includes('agg.last7d.chatNegativeCount += stat.chatNegativeCount'),
    'snapshot aggregation must project retained negative-feedback evidence',
);
assert.ok(
    frictionAggregation.includes('agg.last7d.canonicalMissCount += stat.lowConfidenceCount'),
    'snapshot aggregation must name retained canonical-miss evidence explicitly',
);

const frictionUi = fs.readFileSync(
    path.join(ROOT, 'src/components/templates/answerlattice/governance/FrictionTab.tsx'),
    'utf8',
);
const frictionEvidenceBriefUi = fs.readFileSync(
    path.join(ROOT, 'src/components/templates/answerlattice/governance/FrictionEvidenceBriefDrawer.tsx'),
    'utf8',
);
const frictionReviewRouting = fs.readFileSync(
    path.join(ROOT, 'src/lib/answerlattice/frictionReviewRouting.ts'),
    'utf8',
);
const knowledgeMapUi = fs.readFileSync(
    path.join(ROOT, 'src/components/templates/answerlattice/governance/KnowledgeMapDashboard.tsx'),
    'utf8',
);
assert.ok(frictionUi.includes('Support evidence load'), 'owner UI must name the aggregate precisely');
assert.ok(frictionUi.includes('Breakdown available after the next nightly refresh.'), 'legacy summaries need an explicit breakdown state');
assert.ok(!frictionUi.includes('queryCount} questions'), 'mixed evidence totals must not be described as questions');
assert.ok(frictionUi.includes('suggestedActions={insight.suggestedActions}'), 'validated advisory actions must reach the owner review surface');
assert.ok(frictionUi.includes('Open in Knowledge Map'), 'friction evidence must preserve entity context into the Knowledge Map');
assert.ok(frictionUi.includes("normalizeAnswerlatticeEntityId(searchParams?.get('entity'))"), 'Daily Brief entity context must be revalidated');
assert.ok(frictionUi.includes('Prepare evidence brief'), 'ranked evidence must expose the bounded owner handoff');
assert.ok(
    (frictionUi.match(/FEATURE_FLAGS\.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP/g) || []).length >= 3,
    'every direct friction-to-map control must honor the Knowledge Map kill switch',
);
assert.ok(
    frictionUi.includes('metricWindow: snapshot.window')
        && frictionUi.includes('sourceLastUpdated: snapshotLastUpdatedIso')
        && frictionUi.includes('briefSelection?.scopeKey === scopeKey'),
    'a prepared brief must freeze one scoped snapshot instead of mixing refreshed metadata',
);
assert.ok(
    frictionEvidenceBriefUi.includes('buildAnswerlatticeFrictionEvidenceBrief'),
    'the drawer must render the deterministic brief projection',
);
assert.ok(
    frictionEvidenceBriefUi.includes('getAnswerlatticeFrictionReviewDestination'),
    'the selected review path must resolve through the deterministic routing contract',
);
assert.ok(
    frictionEvidenceBriefUi.includes('router.push(reviewDestination.href)'),
    'internal continuation must use the validated destination route',
);
assert.ok(
    frictionEvidenceBriefUi.includes('reviewDestination.helperText'),
    'the owner must see the consequence of the selected review path before continuing',
);
assert.ok(
    frictionEvidenceBriefUi.includes('copyAnswerlatticeSupportTextToClipboard'),
    'the drawer must reuse the hardened clipboard boundary',
);
assert.ok(
    frictionEvidenceBriefUi.includes("new Blob([brief.markdown], { type: 'text/markdown;charset=utf-8' })"),
    'the drawer must keep Markdown download local to the browser',
);
assert.ok(
    frictionEvidenceBriefUi.includes('anchor?.remove()'),
    'the drawer must remove its temporary download element after success or failure',
);
assert.ok(
    frictionEvidenceBriefUi.includes('URL.revokeObjectURL(objectUrl)'),
    'the drawer must release its temporary download URL after success or failure',
);
assert.ok(
    frictionEvidenceBriefUi.includes('width="min(680px, 100vw)"'),
    'the evidence drawer must remain viewport-bounded on mobile',
);
assert.ok(
    frictionEvidenceBriefUi.includes('vertical={isMobile}'),
    'copy and download actions must stack on narrow viewports',
);
assert.ok(
    frictionEvidenceBriefUi.includes('style={{ minHeight: 44 }}'),
    'evidence-brief actions must retain 44px touch targets',
);
assert.ok(!frictionEvidenceBriefUi.includes('fetch('), 'preparing a brief must not add a network call');
assert.ok(!frictionEvidenceBriefUi.includes('@database/'), 'preparing a brief must not add a Firestore read or write');
assert.ok(
    frictionReviewRouting.includes('!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP'),
    'review routing must fail closed when the Knowledge Map is disabled',
);
assert.ok(!frictionReviewRouting.includes('fetch('), 'review routing must not add a network call');
assert.ok(!frictionReviewRouting.includes('@database/'), 'review routing must not add a Firestore read or write');
assert.ok(
    knowledgeMapUi.includes("return result.graph[requestedEntityId] ? requestedEntityId : ''")
        && knowledgeMapUi.includes('No substitute topic is shown.'),
    'a missing requested topic must remain visibly unselected instead of opening unrelated evidence',
);

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
