import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    CANONICAL_GOVERNED_FALLBACK_MESSAGES,
    isCanonicalGovernedFallbackReason,
} from '../../src/lib/answerlattice/canonicalRetrieval';
import {
    extractAnswerlatticeTechnicalLiterals,
    fuseAnswerlatticeEvidenceRanks,
    prepareAnswerlatticeHybridEvidenceQuery,
    rankAnswerlatticeExactEntityEvidence,
} from '../../src/lib/answerlattice/hybridEvidenceRetrieval';
import {
    parseAnswerlatticeRetrievalCanonicalAnswer,
    parseAnswerlatticeRetrievalEntity,
    parseAnswerlatticeRetrievalRelease,
    parseAnswerlatticeRetrievalSearchIndex,
} from '../../src/lib/answerlattice/retrievalContracts';
import {
    normalizeAnswerlatticePublicCitations,
    normalizeAnswerlatticePublicFallbackReason,
    normalizeAnswerlatticeScopeClarification,
} from '../../src/lib/answerlattice/publicAnswerContracts';
import { isHelpCenterSearchResponse } from '../../src/lib/search/helpCenterSearchResponse';
import { SearchRequestSchema } from '../../src/lib/validation/chatSchemas';

const scope = { tId: 71, sId: 701 };
const identity = { pId: PRODUCT_IDS.ANSWERLATTICE, ...scope };

const searchIndex = {
    ...identity,
    id: 'idx-billing',
    entityId: 'billing',
    canonicalName: 'Billing',
    synonyms: ['invoice'],
    normalizedTokens: ['billing', 'invoice'],
    weight: 1,
};
assert.equal(parseAnswerlatticeRetrievalSearchIndex(searchIndex, scope).entityId, 'billing');
assert.throws(
    () => parseAnswerlatticeRetrievalSearchIndex({ ...searchIndex, sId: 702 }, scope),
    /outside the requested Answerlattice workspace|Invalid input/,
);
assert.throws(
    () => parseAnswerlatticeRetrievalSearchIndex({ ...searchIndex, pId: 'ML' }, scope),
    /Invalid literal value|Invalid input/,
);

const release = {
    ...identity,
    id: 'release-1',
    versionLabel: '1.0.0',
    versionNormalized: 1_000_000,
    releasedAt: new Date(),
    entityChanges: ['billing'],
    status: 'active',
};
assert.equal(parseAnswerlatticeRetrievalRelease(release, scope).versionNormalized, 1_000_000);

const entity = {
    ...identity,
    id: 'billing',
    type: 'feature',
    name: 'Billing',
    slug: 'billing',
    description: 'Invoice and payment support.',
    status: 'active',
    currentVersion: 1_000_000,
};
assert.equal(parseAnswerlatticeRetrievalEntity(entity, scope).name, 'Billing');

const canonical = {
    ...identity,
    id: 'answer-billing-failure',
    title: 'Resolve a failed invoice',
    slug: 'resolve-a-failed-invoice',
    status: 'active',
    answerType: 'explanation',
    scope: { entityIds: ['billing'] },
    productBinding: {
        introducedInVersion: 1_000_000,
        lastValidatedInVersion: 1_000_000,
        applicableVersions: { from: 1_000_000, to: null },
    },
    content: {
        structuredSummary: 'Review the failed invoice and retry with an active payment method.',
        detailedExplanation: 'Open Billing, inspect the failure reason, and retry the payment.',
    },
    evidence: {
        sourceIds: ['source-billing-doc'],
        citations: [{
            id: 'citation-billing-doc',
            title: 'Failed invoice documentation',
            url: 'https://docs.example.com/billing/failed-invoices',
            sourceId: 'source-billing-doc',
        }],
    },
    validation: {
        confidenceScore: 0.95,
        validationSource: 'manual',
        lastValidatedOn: new Date(),
        validatedBy: 'owner@example.com',
    },
    signalMetrics: { linkedTicketCount: 0, linkedChatCount: 0, negativeFeedbackCount: 0 },
    governance: { driftFlag: false, reviewRequired: false },
};
assert.equal(parseAnswerlatticeRetrievalCanonicalAnswer(canonical, scope).content.structuredSummary.length > 0, true);
assert.throws(
    () => parseAnswerlatticeRetrievalCanonicalAnswer({ ...canonical, governance: { driftFlag: 'false', reviewRequired: false } }, scope),
    /Expected boolean|Invalid input/,
);
assert.throws(
    () => parseAnswerlatticeRetrievalCanonicalAnswer({
        ...canonical,
        evidence: {
            sourceIds: ['source-billing-doc'],
            citations: [{
                id: 'citation-private-url',
                title: 'Private URL',
                url: 'https://owner:secret@docs.example.com/private',
            }],
        },
    }, scope),
    /citation URL|Invalid input/i,
);
assert.deepEqual(
    normalizeAnswerlatticePublicCitations(canonical.evidence.citations),
    [{
        id: 'citation-billing-doc',
        title: 'Failed invoice documentation',
        url: 'https://docs.example.com/billing/failed-invoices',
    }],
    'Public citation projection must remove internal source IDs.',
);
assert.equal(normalizeAnswerlatticePublicFallbackReason('canonical_retrieval_unavailable'), 'canonical_retrieval_unavailable');
assert.equal(normalizeAnswerlatticePublicFallbackReason('entity_match_below_threshold: best_score=1'), null);
assert.deepEqual(normalizeAnswerlatticePublicCitations([{
    id: 'citation-private-host',
    title: 'Private host',
    url: 'http://127.0.0.1/internal',
}]), []);
assert.deepEqual(normalizeAnswerlatticePublicCitations([{
    id: 'citation-tokenized-url',
    title: 'Tokenized URL',
    url: 'https://docs.example.com/private?access_token=secret',
}]), []);
for (const sensitiveQueryKey of ['accessToken', 'apiKey', 'clientSecret', 'refreshToken', 'sig']) {
    assert.deepEqual(normalizeAnswerlatticePublicCitations([{
        id: `citation-${sensitiveQueryKey}`,
        title: 'Sensitive URL',
        url: `https://docs.example.com/private?${sensitiveQueryKey}=secret`,
    }]), [], `public citation projection must reject ${sensitiveQueryKey}`);
}
assert.deepEqual(normalizeAnswerlatticePublicCitations([{
    id: 'citation-nonsensitive-suffix',
    title: 'Monkey guide',
    url: 'https://docs.example.com/guide?monkey=capuchin',
}]), [{
    id: 'citation-nonsensitive-suffix',
    title: 'Monkey guide',
    url: 'https://docs.example.com/guide?monkey=capuchin',
}], 'ordinary query keys ending in key-like letters must remain valid');
assert.deepEqual(normalizeAnswerlatticePublicCitations([{
    id: 'citation-valid-fd-host',
    title: 'Valid public documentation host',
    url: 'https://fdocs.example.com/support',
}]), [{
    id: 'citation-valid-fd-host',
    title: 'Valid public documentation host',
    url: 'https://fdocs.example.com/support',
}], 'normal public DNS names beginning with fd must not be treated as private IPv6 hosts');
assert.deepEqual(normalizeAnswerlatticePublicCitations([{
    id: 'citation-mapped-loopback',
    title: 'Mapped loopback address',
    url: 'http://[::ffff:127.0.0.1]/internal',
}]), [], 'IPv4-mapped private IPv6 hosts must be rejected');
assert.deepEqual(normalizeAnswerlatticePublicCitations([{
    id: 'citation-documentation-network',
    title: 'Reserved documentation network',
    url: 'http://203.0.113.10/internal',
}]), [], 'reserved IPv4 documentation ranges must be rejected');
assert.deepEqual(
    normalizeAnswerlatticeScopeClarification({ type: 'scope_context', requiredContext: ['plan', 'role', 'plan'] }),
    { type: 'scope_context', requiredContext: ['plan', 'role'] },
);

assert.equal(SearchRequestSchema.parse({ requestId: 'request_123', query: 'Why did billing fail?' }).mode, 'qna');
assert.equal(SearchRequestSchema.safeParse({ query: 'Why did billing fail?' }).success, false);
assert.equal(SearchRequestSchema.safeParse({ requestId: 'request_123', query: 'Question', tId: scope.tId }).success, false);

const safeResponse = {
    id: 'history-1',
    craftedAnswer: 'Open Billing and review the failed invoice.',
    references: [{ id: 'article-1', categoryId: 'billing', sectionId: 'invoices', title: 'Failed invoices', url: '/billing/failed' }],
    suggestedQuestions: ['How do I retry it?'],
    imageProcessed: false,
    answerSource: 'canonical',
    citations: normalizeAnswerlatticePublicCitations(canonical.evidence.citations),
    confidence: 'high',
};
assert.equal(isHelpCenterSearchResponse(safeResponse), true);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, tId: scope.tId }), false);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, references: [{ ...safeResponse.references[0], embedding: [1, 2] }] }), false);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, references: [{ ...safeResponse.references[0], embeddingV2: [1, 2] }] }), false);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, references: Array.from({ length: 9 }, () => safeResponse.references[0]) }), false);
assert.equal(isHelpCenterSearchResponse({
    ...safeResponse,
    citations: [{ ...safeResponse.citations[0], sourceId: 'source-billing-doc' }],
}), false);
assert.equal(isHelpCenterSearchResponse({
    ...safeResponse,
    citations: [{ ...safeResponse.citations[0], url: 'javascript:alert(1)' }],
}), false);

assert.equal(isCanonicalGovernedFallbackReason('canonical_retrieval_unavailable'), true);
assert.equal(Boolean(CANONICAL_GOVERNED_FALLBACK_MESSAGES.canonical_retrieval_unavailable), true);

const preparedHybridQuery = prepareAnswerlatticeHybridEvidenceQuery(
    'Why does /v1/webhooks return ERR-1042 with HTTP 403 on v2.4.1?',
    ['webhooks', 'unresolved', 'webhooks'],
);
assert.equal(preparedHybridQuery.eligible, true);
assert.deepEqual(preparedHybridQuery.entityIds, ['webhooks']);
assert.equal(preparedHybridQuery.technicalLiterals.includes('/v1/webhooks'), true);
assert.equal(preparedHybridQuery.technicalLiterals.includes('err-1042'), true);
assert.equal(preparedHybridQuery.technicalLiterals.includes('403'), true);
assert.equal(preparedHybridQuery.technicalLiterals.includes('v2.4.1'), true);
assert.equal(
    extractAnswerlatticeTechnicalLiterals('Why does /v1/webhooks. fail?').includes('/v1/webhooks'),
    true,
    'Sentence punctuation after an API path must not become part of the exact literal.',
);
assert.equal(
    extractAnswerlatticeTechnicalLiterals('This is a well-known webhook issue.').includes('-known'),
    false,
    'Hyphenated prose must not be mistaken for a command option.',
);
assert.equal(
    extractAnswerlatticeTechnicalLiterals('Run the command with --verbose or -v.').includes('--verbose'),
    true,
    'Explicit command options must remain eligible technical literals.',
);
assert.equal(
    extractAnswerlatticeTechnicalLiterals('The internal reference is 1403.').includes('403'),
    false,
    'HTTP status literals must not be extracted from larger numeric identifiers.',
);

const ordinaryHybridQuery = prepareAnswerlatticeHybridEvidenceQuery(
    'How do I connect my account?',
    ['webhooks'],
);
assert.equal(ordinaryHybridQuery.eligible, false, 'Ordinary language must not add the entity evidence read.');
assert.equal(
    prepareAnswerlatticeHybridEvidenceQuery('Does the API support webhooks over HTTP?', ['webhooks']).eligible,
    false,
    'Generic technical acronyms alone must not add the entity evidence read.',
);

const exactEntityMatches = rankAnswerlatticeExactEntityEvidence(preparedHybridQuery, [
    {
        id: 'shared-evidence',
        title: 'Recover from ERR-1042',
        contentText: 'The /v1/webhooks endpoint may return HTTP 403 when the signing role is missing.',
        entityIds: ['webhooks'],
        modifiedOnMs: 100,
    },
    {
        id: 'exact-only',
        title: 'Webhook API versions',
        contentText: 'Use /v1/webhooks on v2.4.1.',
        entityIds: ['webhooks'],
        modifiedOnMs: 200,
    },
    {
        id: 'full-url-only',
        title: 'Webhook endpoint',
        contentText: 'Send events to https://api.example.com/v1/webhooks.',
        entityIds: ['webhooks'],
        modifiedOnMs: 150,
    },
    {
        id: 'wrong-token',
        title: 'Webhook overview',
        contentText: 'General delivery guidance with no queried literal.',
        entityIds: ['webhooks'],
        modifiedOnMs: 300,
    },
    {
        id: 'wrong-entity',
        title: 'Recover from ERR-1042',
        contentText: 'This article is about exports.',
        entityIds: ['exports'],
        modifiedOnMs: 400,
    },
    {
        id: 'wrong-substring',
        title: 'Webhook reference 1403',
        contentText: 'A larger identifier must not satisfy a shorter status literal.',
        entityIds: ['webhooks'],
        modifiedOnMs: 500,
    },
]);
assert.deepEqual(
    exactEntityMatches.map(match => match.id),
    ['shared-evidence', 'exact-only', 'full-url-only'],
    'Exact/entity retrieval must reject token-only and entity-only candidates.',
);

const commandOptionQuery = prepareAnswerlatticeHybridEvidenceQuery(
    'Should I use --force?',
    ['webhooks'],
);
assert.deepEqual(
    rankAnswerlatticeExactEntityEvidence(commandOptionQuery, [
        {
            id: 'command-option',
            contentText: 'Run the command with --force after reviewing the pending changes.',
            entityIds: ['webhooks'],
        },
        {
            id: 'hyphenated-suffix',
            contentText: 'The mode--force label is an internal identifier.',
            entityIds: ['webhooks'],
        },
    ]).map(match => match.id),
    ['command-option'],
    'Command options must match as standalone literals rather than hyphenated suffixes.',
);

const fusedEvidence = fuseAnswerlatticeEvidenceRanks({
    vectorDocumentIds: ['semantic-only', 'shared-evidence'],
    exactEntityMatches,
});
assert.equal(fusedEvidence[0]?.id, 'shared-evidence', 'Cross-lane consensus must rank first.');
assert.equal(
    fusedEvidence.findIndex(result => result.id === 'exact-only')
        < fusedEvidence.findIndex(result => result.id === 'semantic-only'),
    true,
    'Exact technical evidence may outrank a vector-only result.',
);
assert.equal(
    fusedEvidence.filter(result => result.id === 'shared-evidence').length,
    1,
    'Rank fusion must deduplicate article IDs.',
);

const root = path.resolve(__dirname, '../..');
const searchCoreSource = fs.readFileSync(path.join(root, 'src/lib/search/searchCore.ts'), 'utf8');
const publicAnswerRouteSource = fs.readFileSync(path.join(root, 'src/app/api/answerlattice/public/v1/answers/route.ts'), 'utf8');
const featureSource = fs.readFileSync(path.join(root, 'src/config/features.ts'), 'utf8');
assert.equal(
    featureSource.includes('ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL: false'),
    true,
    'Hybrid evidence retrieval must remain default off until rollout proof exists.',
);
assert.equal(
    searchCoreSource.includes(".where('entityIds', 'array-contains-any', preparedHybridEvidenceQuery.entityIds)"),
    true,
    'Runtime must use the bounded entity-linked article query.',
);
assert.equal(
    searchCoreSource.includes('exactEntityCandidateCount = entitySnapshot.size;'),
    true,
    'Runtime must instrument bounded entity-lane candidates.',
);
assert.equal(
    searchCoreSource.includes('hybrid-evidence-v1'),
    true,
    'Enabled hybrid retrieval must use a distinct response-cache version.',
);
assert.equal(publicAnswerRouteSource.includes('evidenceReferenceIds'), false, 'Public answer API must not expose internal evidence IDs.');
assert.equal(publicAnswerRouteSource.includes('sourceId:'), false, 'Public answer API must not serialize internal source IDs.');

for (const indexPath of ['firestore.indexes.json', 'firestore-answerlattice.indexes.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, indexPath), 'utf8')) as {
        indexes?: Array<{
            collectionGroup?: string;
            fields?: Array<{ arrayConfig?: string; fieldPath?: string; order?: string }>;
        }>;
    };
    const hybridIndex = (manifest.indexes || []).find(index => (
        index.collectionGroup === 'kb_articles'
        && (index.fields || []).some(field => field.fieldPath === 'entityIds' && field.arrayConfig === 'CONTAINS')
        && ['pId', 'tId', 'sId', 'status', 'active'].every(
            fieldPath => (index.fields || []).some(field => field.fieldPath === fieldPath && field.order === 'ASCENDING'),
        )
    ));
    assert(hybridIndex, `${indexPath} must include the scoped hybrid evidence index.`);
}

process.stdout.write('Answerlattice retrieval contract tests passed.\n');
