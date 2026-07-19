import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
    AnswerlatticeAnswerTestCaseSchema,
    AnswerlatticeAnswerTestRunClientSchema,
    createEmptyAnswerlatticeAnswerTestSummary,
    parseAnswerlatticeAnswerTestSummaryForClient,
    projectAnswerlatticeAnswerTestSummaryForClient,
} from '../../src/lib/answerlattice/answerTestContracts';
import {
    AnswerlatticeAnswerTestSummaryIntegrityError,
    normalizeAnswerlatticeAnswerTestSummary,
    selectAnswerlatticeReleaseTestCases,
} from '../../src/lib/answerlattice/answerTestServer';

const timestamp = '2026-07-18T00:00:00.000Z';
const testCase = AnswerlatticeAnswerTestCaseSchema.parse({
    id: 'billing_policy',
    title: 'Billing policy',
    query: 'What is the approved billing policy?',
    expected: {
        source: 'canonical',
        mustInclude: [],
        mustNotInclude: [],
        citationPolicy: 'not_required',
        referenceIds: [],
    },
    riskLevel: 'critical',
    relatedEntityIds: ['billing'],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
});
const summary = {
    ...createEmptyAnswerlatticeAnswerTestSummary(11, 22),
    revision: 5,
    cases: [testCase],
};
const retainedRun = {
    id: 'answer_test_current',
    requestFingerprint: 'a'.repeat(64),
    suiteRevision: summary.revision,
    mode: 'canonical_only' as const,
    status: 'passed' as const,
    startedAt: timestamp,
    completedAt: timestamp,
    createdBy: 'owner@example.com',
    caseCount: 1,
    passedCount: 1,
    failedCount: 0,
    criticalCaseCount: 1,
    criticalFailureCount: 0,
    proofStatus: 'ready' as const,
    providerCaseCount: 0,
    durationMs: 8,
    sourceVersions: {
        canonical: 1,
        kb: 2,
        docsNav: 3,
        entities: 4,
        entityRelations: 5,
        releases: 6,
    },
    results: [{
        caseId: testCase.id,
        title: testCase.title,
        passed: true,
        source: 'canonical' as const,
        riskLevel: 'critical' as const,
        relatedEntityIds: ['billing'],
        referenceIds: [],
        citationPolicy: 'not_required' as const,
        citationPassed: true,
        missingReferenceIds: [],
        answerPreview: 'Approved billing policy.',
        failures: [],
        aiProviderUsed: false,
        durationMs: 8,
    }],
};
const projectedSummary = projectAnswerlatticeAnswerTestSummaryForClient({
    ...summary,
    runs: [retainedRun],
    reservations: [{
        id: 'answer_test_reserved',
        requestFingerprint: 'b'.repeat(64),
        createdBy: 'owner@example.com',
        startedAt: timestamp,
        expiresAt: '2026-07-18T00:15:00.000Z',
    }],
});
assert.deepEqual(projectedSummary.reservations, [], 'browser summaries must not expose active run reservations');
assert.equal('requestFingerprint' in projectedSummary.runs[0], false, 'browser runs must not expose request fingerprints');
assert.equal('sourceVersions' in projectedSummary.runs[0], false, 'browser runs must not expose internal source-version counters');
assert.ok(
    parseAnswerlatticeAnswerTestSummaryForClient(projectedSummary, { tId: 11, sId: 22 }),
    'an exact projected browser summary must satisfy the strict client contract',
);
assert.equal(
    parseAnswerlatticeAnswerTestSummaryForClient(projectedSummary, { tId: 11, sId: 999 }),
    null,
    'a projected browser summary must fail a mismatched client scope',
);
assert.equal(
    parseAnswerlatticeAnswerTestSummaryForClient({ ...projectedSummary, unexpected: true }, { tId: 11, sId: 22 }),
    null,
    'browser summaries must reject unknown top-level fields',
);
assert.equal(
    AnswerlatticeAnswerTestRunClientSchema.safeParse(retainedRun).success,
    false,
    'the browser run contract must reject internal fingerprints and source-version counters',
);
assert.equal(
    AnswerlatticeAnswerTestRunClientSchema.safeParse({
        ...projectedSummary.runs[0],
        passedCount: 0,
    }).success,
    false,
    'the browser run contract must reject contradictory derived counts',
);

assert.deepEqual(
    normalizeAnswerlatticeAnswerTestSummary(summary, { tId: 11, sId: 22 }),
    summary,
    'an exact current answer-test summary must normalize without mutation',
);

for (const malformed of [
    { ...summary, pId: 'ML' },
    { ...summary, id: 'answerTests_11_999' },
    { ...summary, tId: '11' },
    { ...summary, schemaVersion: ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION + 1 },
    { ...summary, revision: '5' },
    { ...summary, cases: [testCase, testCase] },
]) {
    assert.throws(
        () => normalizeAnswerlatticeAnswerTestSummary(
            malformed as unknown as Record<string, unknown>,
            { tId: 11, sId: 22 },
        ),
        AnswerlatticeAnswerTestSummaryIntegrityError,
        'wrong-product, wrong-scope, future-schema, loose-revision, and duplicate-case summaries must fail closed',
    );
}

const legacyEvidence = normalizeAnswerlatticeAnswerTestSummary({
    ...summary,
    schemaVersion: 3,
    runs: [{
        id: 'answer_test_legacy',
        mode: 'canonical_only',
        results: [{
            caseId: testCase.id,
            title: testCase.title,
            passed: true,
            source: 'canonical',
            riskLevel: 'critical',
            relatedEntityIds: ['billing'],
            referenceIds: [],
            citationPolicy: 'not_required',
            citationPassed: true,
            missingReferenceIds: [],
            answerPreview: 'Approved billing policy.',
            failures: [],
            aiProviderUsed: false,
            durationMs: 8,
        }],
    }],
    reservations: [{
        id: 'answer_test_legacy',
        createdBy: 'owner@example.com',
        startedAt: timestamp,
        expiresAt: '2026-07-18T00:15:00.000Z',
    }],
}, { tId: 11, sId: 22 });
assert.equal(legacyEvidence.runs.length, 1, 'legacy retained runs must remain visible as historical evidence');
assert.equal(legacyEvidence.runs[0].suiteRevision, undefined, 'legacy runs must not be presented as current-suite proof');
assert.equal(legacyEvidence.reservations.length, 0, 'legacy reservations without request identity must not block new work');

assert.deepEqual(
    selectAnswerlatticeReleaseTestCases([testCase], {
        id: 'release_1',
        pId: 'AL',
        tId: 11,
        sId: 22,
        versionLabel: '1.0.0',
        versionNormalized: 1,
        releasedAt: {} as never,
        entityChanges: ['billing'],
        status: 'pending',
    }),
    [testCase],
    'release checks must select only active tests linked to changed entities',
);

process.stdout.write('Answerlattice Answer Tests runtime contracts passed.\n');
