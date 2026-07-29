import assert from 'node:assert/strict';
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
    generateAnswerlatticeVerifiedContextKey,
    normalizeAnswerlatticeEvidenceHosts,
    normalizeAnswerlatticeEvidenceLinks,
    normalizeVerifiedContextKeyRecord,
    verifyAnswerlatticeVisitorToken,
} from '../../src/lib/answerlattice/verifiedWidgetContextServer';
import {
    ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
    AnswerlatticeAnswerTestCaseSchema,
    AnswerlatticeAnswerTestRunRequestSchema,
    createEmptyAnswerlatticeAnswerTestSummary,
    getAnswerlatticeAnswerTestSummaryId,
    hasDisallowedAnswerlatticeCriticalRagCaseMutation,
    isAnswerlatticeAnswerTestRunCurrent,
    parseAnswerlatticeAnswerTestSummaryIdentity,
    prepareAnswerlatticeAnswerTestCasesForWrite,
    type AnswerlatticeAnswerTestCase,
} from '../../src/lib/answerlattice/answerTestContracts';
import {
    evaluateAnswerTestCase,
    extractAnswerTestReferenceIds,
    getAnswerTestProofSummary,
} from '../../src/lib/answerlattice/answerTestEvaluation';
import { getAnswerlatticeAnswerTestRunRequestFingerprint } from '../../src/lib/answerlattice/answerTestRunIdentity';
import { buildAnswerlatticeActivationAnswerTestSummary } from '../../src/lib/answerlattice/activationAnswerTestSummary';
import {
    ANSWERLATTICE_WIDGET_RUNTIME_PROOF_MAX_AGE_MS,
    buildAnswerlatticeActivationSummary,
} from '../../src/lib/answerlattice/activationSummary';
import { isAnswerlatticeActivationSummaryResponse } from '../../src/lib/answerlattice/activationDashboardResponseClient';
import { ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS } from '../../src/lib/answerlattice/answerTestStarterPack';
import {
    AnswerlatticeProposalImpactResponseSchema,
    buildAnswerlatticeProposalImpactAffectedEntityIds,
    classifyAnswerlatticeProposalImpact,
    selectAnswerlatticeProposalImpactCases,
} from '../../src/lib/answerlattice/proposalImpactContracts';

const encodeJson = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const createToken = ({
    privateKeyPkcs8,
    keyId,
    payload,
}: {
    privateKeyPkcs8: string;
    keyId: string;
    payload: Record<string, unknown>;
}) => {
    const header = encodeJson({ alg: 'EdDSA', typ: 'JWT', kid: keyId });
    const body = encodeJson(payload);
    const input = `${header}.${body}`;
    const privateKey = createPrivateKey({
        key: Buffer.from(privateKeyPkcs8, 'base64'),
        format: 'der',
        type: 'pkcs8',
    });
    const signature = sign(null, Buffer.from(input), privateKey).toString('base64url');
    return `${input}.${signature}`;
};

const nowSeconds = 1_800_000_000;
const generated = generateAnswerlatticeVerifiedContextKey();
assert.deepEqual(normalizeVerifiedContextKeyRecord(generated.record), generated.record);
assert.equal(normalizeVerifiedContextKeyRecord({ ...generated.record, createdAt: 'not-a-date' }), null);
assert.equal(normalizeVerifiedContextKeyRecord({ ...generated.record, rotatedAt: '2026-01-01' }), null);
assert.equal(normalizeVerifiedContextKeyRecord({ ...generated.record, publicKeySpki: 'not-base64' }), null);
const validToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: nowSeconds,
        exp: nowSeconds + 300,
        sub: 'Customer_123',
        name: 'Example Customer',
        email: 'customer@example.com',
        plan: 'Growth',
        role: 'Owner',
        locale: 'en-IN',
        tId: 999,
        sId: 888,
        privateRecord: 'must-not-pass',
    },
});

const verified = verifyAnswerlatticeVisitorToken(validToken, generated.record, nowSeconds * 1000);
assert.ok(verified, 'valid signed visitor token should verify');
assert.deepEqual(verified, {
    id: 'Customer_123',
    name: 'Example Customer',
    email: 'customer@example.com',
    plan: 'growth',
    role: 'owner',
    locale: 'en-in',
    verified: true,
    keyId: generated.record.keyId,
});
assert.equal('tId' in verified, false, 'tenant claims must never enter verified visitor output');
assert.equal('sId' in verified, false, 'store claims must never enter verified visitor output');

const stringTimeToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: String(nowSeconds),
        exp: String(nowSeconds + 300),
        sub: 'customer_123',
    },
});
assert.equal(verifyAnswerlatticeVisitorToken(stringTimeToken, generated.record, nowSeconds * 1000), null);

const numericSubjectToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: nowSeconds,
        exp: nowSeconds + 300,
        sub: 123,
    },
});
assert.equal(verifyAnswerlatticeVisitorToken(numericSubjectToken, generated.record, nowSeconds * 1000), null);
assert.equal(
    verifyAnswerlatticeVisitorToken(validToken, generated.record, String(nowSeconds * 1000) as unknown as number),
    null,
);

const caseSensitiveSubjectToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: nowSeconds,
        exp: nowSeconds + 300,
        sub: 'Customer_ABC',
    },
});
assert.equal(
    verifyAnswerlatticeVisitorToken(caseSensitiveSubjectToken, generated.record, nowSeconds * 1000)?.id,
    'Customer_ABC',
    'verified visitor subjects must preserve their exact case-sensitive identity',
);

for (const invalidSubject of [` ${'a'.repeat(10)}`, `${'a'.repeat(10)} `, 'a'.repeat(121), 'customer\u0000id']) {
    const invalidSubjectToken = createToken({
        privateKeyPkcs8: generated.privateKeyPkcs8,
        keyId: generated.record.keyId,
        payload: {
            aud: 'answerlattice-widget',
            iat: nowSeconds,
            exp: nowSeconds + 300,
            sub: invalidSubject,
        },
    });
    assert.equal(
        verifyAnswerlatticeVisitorToken(invalidSubjectToken, generated.record, nowSeconds * 1000),
        null,
        'verified visitor subjects must reject values that would be trimmed, truncated, or contain controls',
    );
}

const expiredToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: nowSeconds - 301,
        exp: nowSeconds - 1,
        sub: 'customer_123',
    },
});
assert.equal(
    verifyAnswerlatticeVisitorToken(expiredToken, generated.record, nowSeconds * 1000),
    null,
    'expired token must fail closed',
);

const wrongAudienceToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'another-audience',
        iat: nowSeconds,
        exp: nowSeconds + 300,
        sub: 'customer_123',
    },
});
assert.equal(
    verifyAnswerlatticeVisitorToken(wrongAudienceToken, generated.record, nowSeconds * 1000),
    null,
    'wrong audience must fail closed',
);

const tamperedParts = validToken.split('.');
tamperedParts[1] = encodeJson({
    aud: 'answerlattice-widget',
    iat: nowSeconds,
    exp: nowSeconds + 300,
    sub: 'attacker',
});
assert.equal(
    verifyAnswerlatticeVisitorToken(tamperedParts.join('.'), generated.record, nowSeconds * 1000),
    null,
    'tampered payload must fail signature verification',
);

assert.deepEqual(
    normalizeAnswerlatticeEvidenceHosts([
        'https://Errors.Example.com',
        'errors.example.com',
        'https://errors.example.com/path',
        'https://errors.example.com:443',
        'https://user:pass@errors.example.com',
        'http://errors.example.com',
    ]),
    ['errors.example.com'],
    'allowed evidence hosts must be exact HTTPS hostnames without paths, ports, or credentials',
);

const links = normalizeAnswerlatticeEvidenceLinks([
    { label: 'First error', url: 'https://errors.example.com/event/one#private-fragment' },
    { label: 'Duplicate', url: 'https://errors.example.com/event/one' },
    { label: 'Second error', url: 'https://errors.example.com/event/two' },
    { label: 'Wrong subdomain', url: 'https://child.errors.example.com/event/three' },
    { label: 'Port', url: 'https://errors.example.com:444/event/four' },
], ['errors.example.com']);

assert.deepEqual(links, [
    { label: 'First error', url: 'https://errors.example.com/event/one' },
    { label: 'Second error', url: 'https://errors.example.com/event/two' },
]);

const cappedLinks = normalizeAnswerlatticeEvidenceLinks([
    { url: 'https://errors.example.com/1' },
    { url: 'https://errors.example.com/2' },
    { url: 'https://errors.example.com/3' },
    { url: 'https://errors.example.com/4' },
], ['errors.example.com']);
assert.equal(cappedLinks.length, 3, 'evidence links must remain capped at three');

const nowIso = new Date(nowSeconds * 1000).toISOString();
const legacyCase = AnswerlatticeAnswerTestCaseSchema.parse({
    id: 'legacy_case',
    title: 'Legacy canonical answer',
    query: 'What is the approved billing policy?',
    expected: {
        source: 'canonical',
        mustInclude: [],
        mustNotInclude: [],
    },
    relatedEntityIds: [],
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
});
assert.equal(legacyCase.riskLevel, 'standard', 'legacy answer tests must default to standard risk');
assert.equal(legacyCase.expected.citationPolicy, 'not_required', 'legacy answer tests must not gain a new evidence requirement');
assert.deepEqual(legacyCase.expected.referenceIds, [], 'legacy answer tests must receive an empty reference list');
const serverSaveTime = '2027-01-01T00:00:00.000Z';
const [serverStampedChangedCase, serverPreservedCase, serverStampedNewCase] = prepareAnswerlatticeAnswerTestCasesForWrite(
    [
        legacyCase,
        { ...legacyCase, id: 'unchanged_case', title: 'Unchanged case' },
    ],
    [
        {
            ...legacyCase,
            query: 'What is the current approved billing policy?',
            createdAt: '2099-01-01T00:00:00.000Z',
            updatedAt: '2099-01-01T00:00:00.000Z',
        },
        {
            ...legacyCase,
            id: 'unchanged_case',
            title: 'Unchanged case',
            createdAt: '2099-01-01T00:00:00.000Z',
            updatedAt: '2099-01-01T00:00:00.000Z',
        },
        {
            ...legacyCase,
            id: 'new_case',
            createdAt: '2099-01-01T00:00:00.000Z',
            updatedAt: '2099-01-01T00:00:00.000Z',
        },
    ],
    serverSaveTime,
);
assert.equal(serverStampedChangedCase.createdAt, legacyCase.createdAt, 'existing case creation time must be immutable');
assert.equal(serverStampedChangedCase.updatedAt, serverSaveTime, 'changed case definition must receive the server edit time');
assert.equal(serverPreservedCase.createdAt, legacyCase.createdAt, 'unchanged case creation time must ignore client timestamps');
assert.equal(serverPreservedCase.updatedAt, legacyCase.updatedAt, 'unchanged case edit time must ignore client timestamps');
assert.equal(serverStampedNewCase.createdAt, serverSaveTime, 'new case creation time must be server-authored');
assert.equal(serverStampedNewCase.updatedAt, serverSaveTime, 'new case edit time must be server-authored');
assert.throws(
    () => AnswerlatticeAnswerTestCaseSchema.parse({
        ...legacyCase,
        expected: {
            ...legacyCase.expected,
            citationPolicy: 'specific_sources',
            referenceIds: [],
        },
    }),
    'specific-source tests must declare at least one reference ID',
);
assert.equal(
    AnswerlatticeAnswerTestCaseSchema.safeParse({
        ...legacyCase,
        expected: {
            ...legacyCase.expected,
            mustInclude: ['invoice'],
            mustNotInclude: ['Invoice'],
        },
    }).success,
    false,
    'one phrase cannot be both required and blocked',
);
assert.equal(
    AnswerlatticeAnswerTestRunRequestSchema.safeParse({
        requestId: 'answer_test_duplicate_ids',
        caseIds: ['legacy_case', 'legacy_case'],
        mode: 'canonical_only',
    }).success,
    false,
    'one run request must not repeat a case ID',
);

const exactSummary = {
    ...createEmptyAnswerlatticeAnswerTestSummary(11, 22),
    revision: 3,
    cases: [legacyCase],
};
assert.equal(
    parseAnswerlatticeAnswerTestSummaryIdentity(exactSummary, { tId: 11, sId: 22 })?.revision,
    exactSummary.revision,
    'an exact Answerlattice answer-test summary must remain usable',
);
for (const malformedSummary of [
    { ...exactSummary, pId: 'ML' },
    { ...exactSummary, id: 'answerTests_11_999' },
    { ...exactSummary, schemaVersion: ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION + 1 },
    { ...exactSummary, revision: '3' },
]) {
    assert.equal(
        parseAnswerlatticeAnswerTestSummaryIdentity(
            malformedSummary as unknown as Record<string, unknown>,
            { tId: 11, sId: 22 },
        ),
        null,
        'malformed persisted answer-test truth must fail closed instead of being partially accepted',
    );
}
assert.throws(
    () => getAnswerlatticeAnswerTestSummaryId(Number.NaN, 22),
    'answer-test summary IDs must reject non-numeric scope',
);

const answerTestFingerprint = getAnswerlatticeAnswerTestRunRequestFingerprint({
    kind: 'answer_test',
    mode: 'canonical_only',
    suiteRevision: 3,
    caseIds: ['legacy_case'],
});
assert.equal(answerTestFingerprint.length, 64, 'answer-test request fingerprints must be SHA-256 evidence');
assert.equal(
    answerTestFingerprint,
    getAnswerlatticeAnswerTestRunRequestFingerprint({
        kind: 'answer_test',
        mode: 'canonical_only',
        suiteRevision: 3,
        caseIds: ['legacy_case'],
    }),
    'identical answer-test requests must produce the same fingerprint',
);
assert.notEqual(
    answerTestFingerprint,
    getAnswerlatticeAnswerTestRunRequestFingerprint({
        kind: 'release_check',
        mode: 'canonical_only',
        suiteRevision: 3,
        caseIds: ['legacy_case'],
        releaseId: 'release_1',
    }),
    'manual runs and release checks must not share idempotency identity',
);
assert.equal(
    isAnswerlatticeAnswerTestRunCurrent({ suiteRevision: 3 }, exactSummary),
    true,
    'a run tied to the current suite revision must remain current',
);
assert.equal(
    isAnswerlatticeAnswerTestRunCurrent({ suiteRevision: 2 }, exactSummary),
    false,
    'a case-definition edit must make older proof stale',
);

assert.deepEqual(
    extractAnswerTestReferenceIds([
        { id: 'article_one', title: 'One' },
        'article_two',
        { id: 'article_one' },
        { documentId: 'must_not_be_trusted' },
        null,
    ]),
    ['article_one', 'article_two'],
    'answer-test evidence must use bounded explicit reference IDs and deduplicate them',
);

const criticalEvidenceCase: AnswerlatticeAnswerTestCase = AnswerlatticeAnswerTestCaseSchema.parse({
    ...legacyCase,
    id: 'critical_evidence_case',
    title: 'Critical evidence-backed answer',
    riskLevel: 'critical',
    expected: {
        source: 'rag',
        minimumConfidence: 'medium',
        mustInclude: ['invoice'],
        mustNotInclude: ['guaranteed refund'],
        citationPolicy: 'specific_sources',
        referenceIds: ['article_one'],
    },
});

assert.equal(
    AnswerlatticeAnswerTestCaseSchema.safeParse(criticalEvidenceCase).success,
    true,
    'legacy critical-RAG cases must remain readable',
);
assert.equal(
    hasDisallowedAnswerlatticeCriticalRagCaseMutation([criticalEvidenceCase], [criticalEvidenceCase]),
    false,
    'an unchanged legacy critical-RAG case must not corrupt unrelated suite saves',
);
assert.equal(
    hasDisallowedAnswerlatticeCriticalRagCaseMutation(
        [criticalEvidenceCase],
        [{ ...criticalEvidenceCase, title: 'Edited critical fallback test' }],
    ),
    true,
    'an edited active critical-RAG case must be rejected',
);
assert.equal(
    hasDisallowedAnswerlatticeCriticalRagCaseMutation(
        [criticalEvidenceCase],
        [{ ...criticalEvidenceCase, active: false }],
    ),
    false,
    'an owner must be able to deactivate a legacy critical-RAG case safely',
);
assert.equal(
    hasDisallowedAnswerlatticeCriticalRagCaseMutation([], [criticalEvidenceCase]),
    true,
    'a new critical-RAG case must be rejected',
);

const criticalRagResult = evaluateAnswerTestCase(criticalEvidenceCase, {
    source: 'rag',
    answer: 'The invoice can be retried after the payment method is updated.',
    referenceIds: ['article_one'],
    confidence: 'high',
    aiProviderUsed: true,
}, 12.9);
assert.equal(criticalRagResult.passed, false, 'provider-backed RAG must never certify critical proof');
assert.match(criticalRagResult.failures.join(' '), /Knowledge fallback cannot certify a critical answer/);
assert.equal(getAnswerTestProofSummary([criticalRagResult]).proofStatus, 'blocked');
assert.equal(criticalRagResult.citationPassed, true, 'matching evidence remains visible even when authority blocks proof');
assert.equal(criticalRagResult.durationMs, 12, 'duration evidence must be normalized to a non-negative integer');

const standardEvidenceCase = { ...criticalEvidenceCase, riskLevel: 'standard' as const };
const passingEvidenceResult = evaluateAnswerTestCase(standardEvidenceCase, {
    source: 'rag',
    answer: 'The invoice can be retried after the payment method is updated.',
    referenceIds: ['article_one'],
    confidence: 'high',
    aiProviderUsed: true,
}, 12.9);
assert.equal(passingEvidenceResult.passed, true, 'governed assertions may still verify a standard fallback case');
assert.equal(passingEvidenceResult.citationPassed, true, 'matching evidence must be recorded explicitly');

const failingEvidenceResult = evaluateAnswerTestCase(criticalEvidenceCase, {
    source: 'rag',
    answer: 'A guaranteed refund is available.',
    referenceIds: ['article_two'],
    confidence: 'low',
    aiProviderUsed: true,
}, 8);
assert.equal(failingEvidenceResult.passed, false, 'missing claims, blocked claims, low confidence, and wrong evidence must fail');
assert.equal(failingEvidenceResult.citationPassed, false, 'missing expected evidence must fail independently');
assert.deepEqual(failingEvidenceResult.missingReferenceIds, ['article_one']);
assert.equal(getAnswerTestProofSummary([passingEvidenceResult]).proofStatus, 'ready');
assert.deepEqual(getAnswerTestProofSummary([failingEvidenceResult]), {
    criticalCaseCount: 1,
    criticalFailureCount: 1,
    proofStatus: 'blocked',
});

const standardFailure = { ...failingEvidenceResult, riskLevel: 'standard' as const };
assert.equal(
    getAnswerTestProofSummary([standardFailure]).proofStatus,
    'review',
    'standard failures must require review without marking release proof blocked',
);

const abstentionCase: AnswerlatticeAnswerTestCase = AnswerlatticeAnswerTestCaseSchema.parse({
    ...legacyCase,
    id: 'safe_abstention_case',
    title: 'Safe abstention',
    expected: {
        source: 'no_answer',
        mustInclude: [],
        mustNotInclude: [],
        citationPolicy: 'not_required',
        referenceIds: [],
    },
});
assert.equal(evaluateAnswerTestCase(abstentionCase, {
    source: 'no_answer',
    answer: '',
    referenceIds: [],
    confidence: 'none',
    aiProviderUsed: false,
}, 1).passed, true, 'explicit no-answer behavior must be provable without invented evidence');

const impactCases = Array.from({ length: 11 }, (_, index): AnswerlatticeAnswerTestCase => (
    AnswerlatticeAnswerTestCaseSchema.parse({
        ...legacyCase,
        id: `impact_case_${index}`,
        title: `Impact case ${index}`,
        riskLevel: index === 10 ? 'critical' : 'standard',
        relatedEntityIds: ['entity_billing'],
    })
));
const selectedImpact = selectAnswerlatticeProposalImpactCases(
    [
        ...impactCases,
        { ...legacyCase, id: 'unrelated_case', relatedEntityIds: ['entity_other'] },
        { ...legacyCase, id: 'inactive_case', active: false, relatedEntityIds: ['entity_billing'] },
        {
            ...legacyCase,
            id: 'target_answer_case',
            relatedEntityIds: [],
            expected: { ...legacyCase.expected, answerId: 'canonical_target' },
        },
    ],
    ['entity_billing'],
    'canonical_target',
);
assert.equal(selectedImpact.linkedTestCount, 12, 'proposal impact must count only active explicitly linked tests');
assert.equal(selectedImpact.cases.length, 10, 'proposal impact must cap execution at ten linked tests');
assert.equal(selectedImpact.testsTruncated, true, 'proposal impact must disclose when linked tests are truncated');
assert.equal(selectedImpact.cases[0].riskLevel, 'critical', 'critical linked tests must be selected before standard tests');
const allAffectedImpactEntities = buildAnswerlatticeProposalImpactAffectedEntityIds(
    Array.from({ length: 25 }, (_, index) => `proposal_entity_${index}`),
    Array.from({ length: 25 }, (_, index) => `current_entity_${index}`),
    Array.from({ length: 25 }, (_, index) => `candidate_entity_${index}`),
);
assert.equal(
    allAffectedImpactEntities.length,
    75,
    'proposal impact must retain every bounded proposal, current, and candidate entity',
);
assert.equal(
    allAffectedImpactEntities.includes('current_entity_24'),
    true,
    'proposal impact must not truncate a removed current-answer entity behind proposal entities',
);
assert.equal(
    allAffectedImpactEntities.includes('candidate_entity_24'),
    true,
    'proposal impact must not truncate a newly proposed entity behind current entities',
);
assert.equal(
    classifyAnswerlatticeProposalImpact(passingEvidenceResult, failingEvidenceResult),
    'regression',
    'a current pass that becomes a projected failure must be labelled regression',
);
assert.equal(
    classifyAnswerlatticeProposalImpact(failingEvidenceResult, passingEvidenceResult),
    'improvement',
    'a current failure that becomes a projected pass must be labelled improvement',
);
assert.equal(
    classifyAnswerlatticeProposalImpact(
        passingEvidenceResult,
        { ...passingEvidenceResult, answerPreview: 'Changed approved wording' },
    ),
    'changed',
    'changed output must remain visible even when both results pass',
);
assert.equal(
    classifyAnswerlatticeProposalImpact(passingEvidenceResult, { ...passingEvidenceResult }),
    'unchanged',
    'identical outcomes must be labelled unchanged',
);
assert.equal(
    AnswerlatticeProposalImpactResponseSchema.safeParse({
        requestId: 'impact_request_1',
        proposalId: 'proposal_1',
        candidate: {
            answerId: 'canonical_target',
            title: 'Billing answer',
            status: 'active',
            answerType: 'explanation',
            entityIds: ['entity_billing'],
            versionFrom: 1,
            versionTo: null,
            structuredSummary: 'Approved billing guidance.',
        },
        currentAnswer: null,
        linkedTestCount: 0,
        evaluatedTestCount: 0,
        testsTruncated: false,
        currentProofStatus: null,
        proposedProofStatus: null,
        regressionCount: 0,
        improvementCount: 0,
        changedCount: 0,
        unchangedCount: 0,
        comparisons: [],
        warnings: ['No active Answer Test is linked.'],
        unexpectedScope: 99,
    }).success,
    false,
    'proposal impact browser responses must reject unknown fields',
);

const activationSourceVersions = {
    canonical: 3,
    kb: 4,
    docsNav: 2,
    entities: 5,
    entityRelations: 1,
    releases: 6,
};
const activationCases = ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS.map((id, index) => ({
    id,
    active: true,
    updatedAt: '2026-07-17T09:00:00.000Z',
    riskLevel: index === 0 ? 'critical' as const : 'standard' as const,
}));
const activationResults = ANSWERLATTICE_FIRST_TRUSTED_ANSWER_CASE_IDS.map(caseId => ({
    caseId,
    passed: true,
    riskLevel: 'standard',
}));
const activationSummaryIdentity = {
    id: getAnswerlatticeAnswerTestSummaryId(11, 22),
    schemaVersion: ANSWERLATTICE_ANSWER_TEST_SUMMARY_SCHEMA_VERSION,
    revision: 7,
};
assert.deepEqual(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            proofStatus: 'ready',
            criticalFailureCount: 0,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults,
        }],
    }, 11, 22, activationSourceVersions),
    {
        activeCaseCount: 10,
        firstTenCount: 10,
        latestProofStatus: 'ready',
        latestCriticalFailureCount: 0,
        latestProofStale: false,
        lastRunAt: '2026-07-17T10:00:00.000Z',
    },
    'Activation must derive launch proof only from a retained run that covers all active First 10 cases',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults.slice(0, 9),
        }],
    }, 11, 22, activationSourceVersions).latestProofStatus,
    null,
    'A partial run must not make the First 10 launch proof ready',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            proofStatus: 'ready',
            criticalFailureCount: 0,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults.map((result, index) => index === 0
                ? { ...result, passed: false, riskLevel: 'critical' }
                : result),
        }],
    }, 11, 22, activationSourceVersions).latestProofStatus,
    'blocked',
    'Activation must derive proof status from retained case results instead of trusting contradictory stored metadata',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases.map(testCase => ({ ...testCase, riskLevel: 'standard' as const })),
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults.map((result, index) => index === 0
                ? { ...result, passed: false, riskLevel: 'critical' }
                : result),
        }],
    }, 11, 22, activationSourceVersions).latestProofStatus,
    'blocked',
    'A retained critical result cannot be downgraded by contradictory current standard-risk metadata',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults.map((result, index) => index === 0
                ? { caseId: result.caseId, passed: false }
                : result),
        }],
    }, 11, 22, activationSourceVersions).latestProofStatus,
    null,
    'A retained result without an explicit risk classification must not establish launch proof',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            proofStatus: 'review',
            criticalFailureCount: 0,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults.map((result, index) => index === 0
                ? { ...result, passed: false, riskLevel: 'standard' }
                : result),
        }],
    }, 11, 22, activationSourceVersions).latestProofStatus,
    'blocked',
    'Activation must derive criticality from the current case definition instead of stale retained result metadata',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            proofStatus: 'ready',
            criticalFailureCount: 0,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: [...activationResults, { ...activationResults[0] }],
        }],
    }, 11, 22, activationSourceVersions).latestProofStatus,
    null,
    'A malformed run with duplicate case results must not become launch proof',
);
assert.deepEqual(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases.map((testCase, index) => index === 0
            ? { ...testCase, updatedAt: '2026-07-17T11:00:00.000Z' }
            : testCase),
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults,
        }],
    }, 11, 22, activationSourceVersions),
    {
        activeCaseCount: 10,
        firstTenCount: 10,
        latestProofStatus: null,
        latestCriticalFailureCount: 0,
        latestProofStale: true,
        lastRunAt: '2026-07-17T10:00:00.000Z',
    },
    'Editing a First 10 case after the retained run must invalidate launch proof',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults,
        }],
    }, 11, 22, { ...activationSourceVersions, canonical: activationSourceVersions.canonical + 1 }).latestProofStale,
    true,
    'Changing governed answer sources after the retained run must invalidate launch proof',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            results: activationResults,
        }],
    }, 11, 22, activationSourceVersions).latestProofStale,
    true,
    'A legacy run without a source-version snapshot must require one fresh rerun',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: { ...activationSourceVersions, kb: null },
            results: activationResults,
        }],
    }, 11, 22, activationSourceVersions).latestProofStale,
    true,
    'Malformed retained source-version evidence must fail closed instead of coercing to zero',
);
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases,
        runs: [{
            suiteRevision: activationSummaryIdentity.revision - 1,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults,
        }],
    }, 11, 22, activationSourceVersions).latestProofStale,
    true,
    'A run started from an older test-suite revision must remain historical proof',
);
assert.deepEqual(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 11,
        sId: 22,
        cases: activationCases.map((testCase, index) => index === 0
            ? { ...testCase, updatedAt: 'not-a-date' }
            : testCase),
        runs: [{
            suiteRevision: activationSummaryIdentity.revision,
            completedAt: '2026-07-17T10:00:00.000Z',
            sourceVersions: activationSourceVersions,
            results: activationResults,
        }],
    }, 11, 22, activationSourceVersions),
    {
        activeCaseCount: 9,
        firstTenCount: 9,
        latestProofStatus: null,
        latestCriticalFailureCount: 0,
        latestProofStale: false,
        lastRunAt: null,
    },
    'A launch case without a valid server timestamp must not count toward First 10 proof',
);
const futureDatedProof = buildAnswerlatticeActivationAnswerTestSummary({
    ...activationSummaryIdentity,
    pId: 'AL',
    tId: 11,
    sId: 22,
    cases: activationCases,
    runs: [{
        suiteRevision: activationSummaryIdentity.revision,
        completedAt: '2999-01-01T00:00:00.000Z',
        sourceVersions: activationSourceVersions,
        results: activationResults,
    }],
}, 11, 22, activationSourceVersions);
assert.equal(futureDatedProof.latestProofStatus, null, 'a future-dated run must never satisfy current launch proof');
assert.equal(futureDatedProof.latestProofStale, true, 'a future-dated covered run must remain visibly stale');
assert.equal(
    buildAnswerlatticeActivationAnswerTestSummary({
        ...activationSummaryIdentity,
        pId: 'AL',
        tId: 999,
        sId: 22,
        cases: activationCases,
        runs: [],
    }, 11, 22, activationSourceVersions).firstTenCount,
    0,
    'A cross-scope Answer Tests summary must fail closed',
);

const activationNowMillis = Date.parse('2026-07-19T12:00:00.000Z');
const activationWidgetHash = 'a'.repeat(64);
const buildActivationStore = (lastSeenAt: string) => ({
    pId: 'AL',
    tId: 11,
    sId: 22,
    storeId: 22,
    tenantId: 11,
    companyName: 'Example SaaS',
    productName: 'Example Product',
    productUrl: 'https://app.example.com',
    supportEmail: 'support@example.com',
    billingModel: 'subscription',
    primarySurfaces: ['billing'],
    answerlatticeSubscription: {
        id: 'sub_123',
        pId: 'AL',
        productId: 'AL',
        tId: 11,
        sId: 22,
        tenantId: 11,
        storeId: 22,
        planId: 'answerlattice_starter',
        planName: 'Starter',
        status: 'active',
        currency: 'USD',
        amount: 49,
    },
    answerlatticeWidgetApi: {
        keyHashes: [activationWidgetHash],
        activeKeyHash: activationWidgetHash,
        keysByHash: {
            [activationWidgetHash]: {
                id: 'key_123',
                name: 'Production widget',
                keyPrefix: 'al_live',
                status: 'active',
                productId: 'AL',
                purpose: 'answerlattice_widget',
                scopes: ['widget:config'],
                createdAt: '2026-07-18T10:00:00.000Z',
            },
        },
    },
    widgetAllowedOrigins: ['https://app.example.com'],
    widgetRuntimeStatus: {
        lastSeenAt,
        lastOrigin: 'https://app.example.com',
        lastPath: '/settings/billing',
        lastContextKey: 'settings_billing',
        lastFeature: 'billing',
        lastPage: 'settings',
        userAgentFamily: 'chrome',
        seenCount: 3,
    },
});
const activationContextSummary = {
    pId: 'AL',
    tId: 11,
    sId: 22,
    generatedAt: '2026-07-19T10:00:00.000Z',
    surfaceCount: 1,
    articleCount: 1,
    faqCount: 1,
    changelogCount: 1,
    ticketCount: 1,
    surfaces: {
        settings_billing: {
            key: 'settings_billing',
            label: 'Billing settings',
            routePatterns: ['/settings/billing'],
            feature: 'billing',
            articles: [{ id: 'article_1', title: 'Manage billing' }],
            faqs: [{ id: 'faq_1', question: 'How does billing work?' }],
            changelogs: [{ id: 'release_1', pageId: 'page_1', title: 'Billing update' }],
            tickets: { total: 1, open: 0, recentDisplayIds: [] },
        },
    },
};
const activationCoverage = {
    coverage: { rate: 100, total: 10 },
};
const activationTrustMetrics = {
    sourceCompleteness: { complete: true },
    nonEscalation: { rate: 100 },
    confirmedResolution: { explicitOutcomeTotal: 1, rate: 100 },
    drift: { activeCount: 1, rate: 0 },
    entityAnswerCoverage: { totalEntities: 1, rate: 100 },
};
const activationCompiledContext = {
    status: 'ready',
    bundleVersion: 1,
    activeVersion: 1,
    lastReadyVersion: 1,
    publicBundleId: 'pb_activation123',
    generatedAt: '2026-07-19T10:00:00.000Z',
    lastBuildCompletedAt: '2026-07-19T10:00:00.000Z',
    lastBuildError: null,
    staleReason: null,
    stats: { bytesTotal: 1024, routes: 1 },
    publicBundlesReady: true,
    privateBundlesReady: false,
};
const activationAnswerTests = {
    activeCaseCount: 10,
    firstTenCount: 10,
    latestProofStatus: 'ready' as const,
    latestCriticalFailureCount: 0,
    latestProofStale: false,
    lastRunAt: '2026-07-19T10:00:00.000Z',
};
const buildActivationSummaryForRuntime = (lastSeenAt: string) => buildAnswerlatticeActivationSummary({
    tId: 11,
    sId: 22,
    storeData: buildActivationStore(lastSeenAt),
    contextSummary: activationContextSummary as any,
    coverage: activationCoverage as any,
    trustMetrics: activationTrustMetrics as any,
    compiledContext: activationCompiledContext as any,
    answerTests: activationAnswerTests,
    nowMillis: activationNowMillis,
});
const freshActivationSummary = buildActivationSummaryForRuntime(
    new Date(activationNowMillis - ANSWERLATTICE_WIDGET_RUNTIME_PROOF_MAX_AGE_MS + 1).toISOString(),
);
assert.equal(freshActivationSummary.launchProof.ready, true, 'Current widget telemetry may complete launch proof');
assert.equal(freshActivationSummary.stage, 'live', 'Only complete launch proof may select the live stage');
assert.equal(
    isAnswerlatticeActivationSummaryResponse({ summary: freshActivationSummary }),
    true,
    'The activation browser boundary must accept the normalized server summary',
);

const staleActivationSummary = buildActivationSummaryForRuntime(
    new Date(activationNowMillis - ANSWERLATTICE_WIDGET_RUNTIME_PROOF_MAX_AGE_MS - 1).toISOString(),
);
assert.equal(staleActivationSummary.launchProof.ready, false, 'Stale widget telemetry must block launch proof');
assert.equal(staleActivationSummary.stage, 'install', 'Stale widget proof must return the owner to install verification');
assert.equal(
    staleActivationSummary.steps.find(step => step.key === 'widget-install')?.status,
    'attention',
    'A previously seen but stale widget must require review',
);
assert.equal(
    staleActivationSummary.steps.find(step => step.key === 'page-context')?.status,
    'attention',
    'Stale page context must not remain complete',
);
assert.equal(
    isAnswerlatticeActivationSummaryResponse({
        summary: { ...staleActivationSummary, stage: 'live' },
    }),
    false,
    'The browser boundary must reject a live stage without complete launch proof',
);
assert.equal(
    isAnswerlatticeActivationSummaryResponse({
        summary: {
            ...freshActivationSummary,
            widget: {
                ...freshActivationSummary.widget,
                runtimeStatus: {
                    ...freshActivationSummary.widget.runtimeStatus,
                    lastSeenAt: 'not-a-timestamp',
                },
            },
        },
    }),
    false,
    'The browser boundary must reject malformed runtime timestamps',
);
assert.equal(
    isAnswerlatticeActivationSummaryResponse({
        summary: {
            ...freshActivationSummary,
            launchProof: {
                ...freshActivationSummary.launchProof,
                completeCount: 0,
            },
        },
    }),
    false,
    'The browser boundary must reject contradictory launch proof counts',
);

const answerTestsUi = readFileSync(
    path.join(process.cwd(), 'src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx'),
    'utf8',
);
assert.match(answerTestsUi, /normalizeAnswerlatticeOwnerReleaseContext\(searchParams\.get\('release'\)\)/);
assert.match(answerTestsUi, /openReleaseCheck\(requestedReleaseId\)/);
assert.match(answerTestsUi, /Review approved answer/);
assert.match(answerTestsUi, /getAnswerlatticeAnswerContextRoute\(/);

console.log('Answerlattice founder support controls contract tests passed');
