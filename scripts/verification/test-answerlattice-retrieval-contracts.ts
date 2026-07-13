import assert from 'node:assert/strict';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    CANONICAL_GOVERNED_FALLBACK_MESSAGES,
    isCanonicalGovernedFallbackReason,
} from '../../src/lib/answerlattice/canonicalRetrieval';
import {
    parseAnswerlatticeRetrievalCanonicalAnswer,
    parseAnswerlatticeRetrievalEntity,
    parseAnswerlatticeRetrievalRelease,
    parseAnswerlatticeRetrievalSearchIndex,
} from '../../src/lib/answerlattice/retrievalContracts';
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
};
assert.equal(isHelpCenterSearchResponse(safeResponse), true);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, tId: scope.tId }), false);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, references: [{ ...safeResponse.references[0], embedding: [1, 2] }] }), false);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, references: [{ ...safeResponse.references[0], embeddingV2: [1, 2] }] }), false);
assert.equal(isHelpCenterSearchResponse({ ...safeResponse, references: Array.from({ length: 9 }, () => safeResponse.references[0]) }), false);

assert.equal(isCanonicalGovernedFallbackReason('canonical_retrieval_unavailable'), true);
assert.equal(Boolean(CANONICAL_GOVERNED_FALLBACK_MESSAGES.canonical_retrieval_unavailable), true);

process.stdout.write('Answerlattice retrieval contract tests passed.\n');
