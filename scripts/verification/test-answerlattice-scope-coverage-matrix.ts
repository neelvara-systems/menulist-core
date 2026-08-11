import assert from 'node:assert/strict';
import {
    AnswerlatticeAnswerTestCaseSchema,
    createEmptyAnswerlatticeAnswerTestSummary,
    type AnswerlatticeAnswerTestCase,
    type AnswerlatticeAnswerTestCaseResult,
    type AnswerlatticeAnswerTestRun,
} from '../../src/lib/answerlattice/answerTestContracts';
import {
    buildAnswerlatticeScopeCoverageMatrix,
    parseAnswerlatticeScopeCoverageMatrixForClient,
} from '../../src/lib/answerlattice/scopeCoverageMatrix';

const scope = { tId: 31, sId: 41 };
const createdAt = '2026-08-10T09:00:00.000Z';
const completedAt = '2026-08-10T10:00:00.000Z';
const nowMillis = Date.parse('2026-08-10T10:01:00.000Z');
const sourceVersions = {
    canonical: 1,
    kb: 2,
    docsNav: 3,
    entities: 4,
    entityRelations: 5,
    releases: 6,
};

const createCase = (
    id: string,
    expectedSource: 'canonical' | 'faq' = 'canonical',
    overrides: Partial<AnswerlatticeAnswerTestCase> = {},
): AnswerlatticeAnswerTestCase => AnswerlatticeAnswerTestCaseSchema.parse({
    id,
    title: id.replaceAll('_', ' '),
    query: `How does ${id.replaceAll('_', ' ')} work?`,
    context: {
        contextVersion: 1,
        plan: 'growth',
        role: 'workspace_owner',
        state: 'trial_active',
        version: '2.4.1',
    },
    expected: {
        source: expectedSource,
        mustInclude: [],
        mustNotInclude: [],
        citationPolicy: 'not_required',
        referenceIds: [],
    },
    riskLevel: id.includes('critical') ? 'critical' : 'standard',
    relatedEntityIds: [],
    active: true,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
});

const createResult = (
    testCase: AnswerlatticeAnswerTestCase,
    source: AnswerlatticeAnswerTestCaseResult['source'],
    passed: boolean,
    answerId?: string,
): AnswerlatticeAnswerTestCaseResult => ({
    caseId: testCase.id,
    title: testCase.title,
    passed,
    source,
    ...(answerId ? { answerId } : {}),
    riskLevel: testCase.riskLevel,
    relatedEntityIds: [],
    referenceIds: [],
    citationPolicy: 'not_required',
    citationPassed: true,
    missingReferenceIds: [],
    answerPreview: passed ? 'Current answer.' : 'Review answer.',
    failures: passed ? [] : ['Expected contract failed.'],
    aiProviderUsed: false,
    durationMs: 4,
});

const createRun = (
    id: string,
    results: AnswerlatticeAnswerTestCaseResult[],
    overrides: Partial<AnswerlatticeAnswerTestRun> = {},
): AnswerlatticeAnswerTestRun => {
    const passedCount = results.filter(result => result.passed).length;
    const criticalResults = results.filter(result => result.riskLevel === 'critical');
    const criticalFailureCount = criticalResults.filter(result => !result.passed).length;
    return {
        id,
        suiteRevision: 1,
        mode: 'canonical_only',
        status: passedCount === results.length ? 'passed' : passedCount === 0 ? 'failed' : 'partial',
        startedAt: '2026-08-10T09:59:00.000Z',
        completedAt,
        createdBy: 'owner@example.com',
        caseCount: results.length,
        passedCount,
        failedCount: results.length - passedCount,
        criticalCaseCount: criticalResults.length,
        criticalFailureCount,
        proofStatus: criticalFailureCount > 0
            ? 'blocked'
            : passedCount === results.length ? 'ready' : 'review',
        providerCaseCount: 0,
        durationMs: 20,
        sourceVersions,
        results,
        ...overrides,
    };
};

const coveredCase = createCase('critical_covered');
const reviewCase = createCase('review_case');
const missingCase = createCase('missing_case');
const unverifiedCase = createCase('unverified_case');
const otherRouteCase = createCase('faq_route', 'faq');
const summary = {
    ...createEmptyAnswerlatticeAnswerTestSummary(scope.tId, scope.sId),
    revision: 7,
    cases: [coveredCase, reviewCase, missingCase, unverifiedCase, otherRouteCase],
    runs: [createRun('run_current', [
        createResult(coveredCase, 'canonical', true, 'answer_covered'),
        createResult(reviewCase, 'canonical', false, 'answer_review'),
        createResult(missingCase, 'faq', false),
    ])],
};

const matrix = buildAnswerlatticeScopeCoverageMatrix(summary, sourceVersions, nowMillis);
assert.deepEqual(
    matrix.rows.map(row => [row.caseId, row.status]),
    [
        ['missing_case', 'missing'],
        ['review_case', 'needs_review'],
        ['unverified_case', 'unverified'],
        ['critical_covered', 'covered'],
        ['faq_route', 'other_route'],
    ],
    'matrix rows must prioritize deterministic attention states without treating intentional routes as gaps',
);
assert.equal(matrix.activeCaseCount, 5);
assert.equal(matrix.canonicalTargetCount, 4);
assert.equal(matrix.coveredCount, 1);
assert.equal(matrix.needsReviewCount, 1);
assert.equal(matrix.missingCount, 1);
assert.equal(matrix.unverifiedCount, 1);
assert.equal(matrix.otherRouteCount, 1);
assert.equal(matrix.rows.find(row => row.caseId === coveredCase.id)?.answerId, 'answer_covered');
assert.equal(matrix.rows.find(row => row.caseId === missingCase.id)?.actualSource, 'faq');

const laterSingleCaseRun = createRun(
    'run_later_single_case',
    [createResult(reviewCase, 'canonical', false, 'answer_review')],
    {
        startedAt: '2026-08-10T10:00:20.000Z',
        completedAt: '2026-08-10T10:00:30.000Z',
    },
);
const partialRunMatrix = buildAnswerlatticeScopeCoverageMatrix(
    { ...summary, runs: [laterSingleCaseRun, ...summary.runs] },
    sourceVersions,
    Date.parse('2026-08-10T10:01:00.000Z'),
);
assert.equal(
    partialRunMatrix.rows.find(row => row.caseId === coveredCase.id)?.status,
    'covered',
    'a later one-row run must not erase current proof retained for another unchanged case',
);

const pausedCase = createCase('paused_case', 'canonical', { active: false });
const pausedMatrix = buildAnswerlatticeScopeCoverageMatrix(
    { ...summary, cases: [coveredCase, pausedCase] },
    sourceVersions,
    nowMillis,
);
assert.deepEqual(
    pausedMatrix.rows.map(row => row.caseId),
    [coveredCase.id],
    'paused cases must stay outside the active owner coverage contract',
);

const criticalReviewCase = createCase('critical_review_case');
const standardReviewCase = createCase('standard_review_case');
const sameStateRiskMatrix = buildAnswerlatticeScopeCoverageMatrix(
    {
        ...summary,
        cases: [standardReviewCase, criticalReviewCase],
        runs: [createRun('run_same_state_risk', [
            createResult(standardReviewCase, 'canonical', false, 'answer_standard_review'),
            createResult(criticalReviewCase, 'canonical', false, 'answer_critical_review'),
        ])],
    },
    sourceVersions,
    nowMillis,
);
assert.deepEqual(
    sameStateRiskMatrix.rows.map(row => row.caseId),
    [criticalReviewCase.id, standardReviewCase.id],
    'critical questions must sort first within the same attention state',
);

const noIdentityRun = createRun('run_no_identity', [createResult(coveredCase, 'canonical', true)]);
const noIdentityMatrix = buildAnswerlatticeScopeCoverageMatrix(
    { ...summary, cases: [coveredCase], runs: [noIdentityRun] },
    sourceVersions,
    nowMillis,
);
assert.equal(noIdentityMatrix.rows[0]?.status, 'needs_review', 'canonical proof without answer identity needs review');

const editedCase = createCase('critical_covered', 'canonical', {
    updatedAt: '2026-08-10T10:00:30.000Z',
});
const editedMatrix = buildAnswerlatticeScopeCoverageMatrix(
    { ...summary, cases: [editedCase, reviewCase] },
    sourceVersions,
    nowMillis,
);
assert.equal(editedMatrix.rows.find(row => row.caseId === editedCase.id)?.status, 'unverified');
assert.equal(
    editedMatrix.rows.find(row => row.caseId === reviewCase.id)?.status,
    'needs_review',
    'editing one case must not invalidate another unchanged case',
);

const changedSourcesMatrix = buildAnswerlatticeScopeCoverageMatrix(
    summary,
    { ...sourceVersions, canonical: sourceVersions.canonical + 1 },
    nowMillis,
);
assert.equal(changedSourcesMatrix.coveredCount, 0);
assert.equal(changedSourcesMatrix.unverifiedCount, 4, 'a governed source-version change invalidates canonical proof');
assert.equal(changedSourcesMatrix.otherRouteCount, 1, 'intentional routes do not require canonical proof');

const legacyMatrix = buildAnswerlatticeScopeCoverageMatrix(
    { ...summary, cases: [coveredCase], runs: [{ ...summary.runs[0], sourceVersions: undefined }] },
    sourceVersions,
    nowMillis,
);
assert.equal(legacyMatrix.rows[0]?.status, 'unverified', 'legacy runs without source versions are historical only');

const futureMatrix = buildAnswerlatticeScopeCoverageMatrix(
    {
        ...summary,
        cases: [coveredCase],
        runs: [{ ...summary.runs[0], completedAt: '2026-08-10T10:07:00.000Z' }],
    },
    sourceVersions,
    nowMillis,
);
assert.equal(futureMatrix.rows[0]?.status, 'unverified', 'future-dated proof beyond tolerance must be rejected');

const duplicateResult = createResult(coveredCase, 'canonical', true, 'answer_covered');
const duplicateMatrix = buildAnswerlatticeScopeCoverageMatrix(
    { ...summary, cases: [coveredCase], runs: [createRun('run_duplicate', [duplicateResult, duplicateResult])] },
    sourceVersions,
    nowMillis,
);
assert.equal(duplicateMatrix.rows[0]?.status, 'unverified', 'duplicate result identities must not establish proof');

assert.deepEqual(
    parseAnswerlatticeScopeCoverageMatrixForClient(matrix, summary),
    matrix,
    'an exact matrix must satisfy strict browser admission',
);
for (const malformed of [
    { ...matrix, unexpected: true },
    { ...matrix, suiteRevision: matrix.suiteRevision + 1 },
    { ...matrix, coveredCount: matrix.coveredCount + 1 },
    { ...matrix, rows: matrix.rows.slice(1) },
    {
        ...matrix,
        rows: matrix.rows.map(row => row.caseId === coveredCase.id ? { ...row, status: 'other_route' } : row),
    },
    {
        ...matrix,
        rows: matrix.rows.map(row => row.caseId === unverifiedCase.id
            ? { ...row, actualSource: 'canonical' }
            : row),
    },
]) {
    assert.equal(
        parseAnswerlatticeScopeCoverageMatrixForClient(malformed, summary),
        null,
        'browser admission must reject unknown fields, wrong revisions, counts, row sets, and route contradictions',
    );
}

process.stdout.write('Answerlattice scope coverage matrix contracts passed.\n');
