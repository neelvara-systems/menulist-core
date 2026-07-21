import assert from 'node:assert/strict';
import type { CanonicalRetrievalResult } from '../../src/lib/answerlattice/canonicalRetrieval';
import { evaluateEscalation } from '../../src/lib/answerlattice/escalationEvaluator';
import { NO_ESCALATION } from '../../src/lib/answerlattice/escalationTypes';

const canonicalResult = (
    overrides: Partial<CanonicalRetrievalResult> = {},
): CanonicalRetrievalResult => ({
    found: false,
    canonical: false,
    matchedEntityIds: [],
    confidence: 'none',
    fallbackReason: 'no_entity_match',
    ...overrides,
});

const canonicalHit = evaluateEscalation({
    canonicalResult: canonicalResult({
        found: true,
        canonical: true,
        matchedEntityIds: ['billing'],
        confidence: 'high',
        fallbackReason: undefined,
    }),
    ragDocuments: [],
    searchQuery: 'How do I update billing?',
});
assert.deepEqual(canonicalHit, NO_ESCALATION);

const emptyFailure = evaluateEscalation({
    canonicalResult: canonicalResult(),
    ragDocuments: [],
    searchQuery: 'Why did the import fail?',
    answerWasEmpty: true,
    productContext: {
        page: ' imports '.repeat(100),
        workflow: 'recover_import',
    },
});
assert.equal(emptyFailure.escalationSuggested, true);
assert.equal(emptyFailure.escalationType, 'hard');
assert.deepEqual(emptyFailure.triggerTypes, [
    'insufficient_answer_evidence',
    'entity_resolution_failure',
]);
assert.equal(emptyFailure.escalationContext?.query, 'Why did the import fail?');
assert.equal(emptyFailure.escalationContext?.productContext?.page?.length, 180);
assert.ok(Number.isFinite(Date.parse(emptyFailure.escalationContext?.escalatedAt || '')));

const weakRag = evaluateEscalation({
    canonicalResult: canonicalResult({
        matchedEntityIds: ['slack-integration'],
        entityDebug: {
            queryTokens: Array.from({ length: 30 }, (_, index) => `token-${index}`),
            candidates: Array.from({ length: 6 }, (_, index) => ({
                entityId: `entity-${index}`,
                entityName: `Entity ${index}`,
                score: 0.4 - (index * 0.01),
            })),
            resolvedEntityId: 'slack-integration',
            confidence: 0.4,
        },
    }),
    ragDocuments: [
        { id: 'lower', title: 'Lower score', similarityScore: 0.2 },
        { id: 'higher', title: 'Higher score', similarityScore: 0.45 },
        { id: 'third', title: 'Third', similarityScore: 0.3 },
        { id: 'fourth', title: 'Fourth', similarityScore: 0.25 },
        { id: 'fifth', title: 'Fifth', similarityScore: 0.22 },
        { id: 'best-after-cap', title: 'Best after output cap', similarityScore: 0.49 },
    ],
    searchQuery: 'Slack will not connect',
});
assert.equal(weakRag.escalationType, 'soft');
assert.deepEqual(weakRag.triggerTypes, [
    'insufficient_answer_evidence',
    'rag_low_similarity',
]);
assert.deepEqual(
    weakRag.escalationContext?.retrievalDebug?.ragResults?.map((result) => result.docId),
    ['best-after-cap', 'higher', 'third', 'fourth', 'fifth'],
    'RAG evidence must use the actual best normalized score rather than caller order',
);
assert.equal(weakRag.escalationContext?.entityDebug?.queryTokens.length, 20);
assert.equal(weakRag.escalationContext?.entityDebug?.candidates.length, 3);

const strongRagAfterCanonicalMiss = evaluateEscalation({
    canonicalResult: canonicalResult(),
    ragDocuments: [{ id: 'billing-guide', title: 'Billing guide', similarityScore: 0.82 }],
    searchQuery: 'Where is billing?',
});
assert.deepEqual(
    strongRagAfterCanonicalMiss,
    NO_ESCALATION,
    'A normal canonical miss must not interrupt a useful source-backed RAG answer',
);

const refusalWithCandidateEvidence = evaluateEscalation({
    canonicalResult: canonicalResult(),
    ragDocuments: [{ id: 'candidate', title: 'Candidate only', similarityScore: 0.91 }],
    searchQuery: 'Can I pause billing?',
    answerWasEmpty: true,
});
assert.equal(refusalWithCandidateEvidence.escalationSuggested, true);
assert.equal(refusalWithCandidateEvidence.escalationType, 'hard');
assert.deepEqual(refusalWithCandidateEvidence.triggerTypes, [
    'insufficient_answer_evidence',
    'entity_resolution_failure',
]);

for (const invalidInput of [
    {
        canonicalResult: canonicalResult(),
        ragDocuments: [{ id: 'bad-score', title: 'Bad', similarityScore: Number.NaN }],
        searchQuery: 'Question',
    },
    {
        canonicalResult: canonicalResult(),
        ragDocuments: [{ id: 'bad-score', title: 'Bad', similarityScore: 1.1 }],
        searchQuery: 'Question',
    },
    {
        canonicalResult: canonicalResult(),
        ragDocuments: [],
        searchQuery: '   ',
    },
]) {
    assert.deepEqual(evaluateEscalation(invalidInput), NO_ESCALATION);
}

console.log('Answerlattice AI failure escalation contracts passed.');
