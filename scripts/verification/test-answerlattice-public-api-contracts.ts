import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
    ANSWERLATTICE_PUBLIC_API_PURPOSE,
    ANSWERLATTICE_PUBLIC_ENTITY_STATUSES,
    ANSWERLATTICE_PUBLIC_SIGNAL_TYPES,
    AnswerlatticePublicApiKeyActionSchema,
    AnswerlatticePublicApiKeyGeneratedResponseSchema,
    AnswerlatticePublicApiKeyRevokedResponseSchema,
    AnswerlatticePublicApiKeyStatusResponseSchema,
    answerlatticePublicApiManagementScopesMatch,
    buildAnswerlatticePublicEntityQueryPredicates,
    buildAnswerlatticePublicApiKeySummary,
    isAnswerlatticePublicApiCredentialInScope,
    normalizeAnswerlatticePublicApiScopes,
    sanitizeAnswerlatticePublicSignalMetadata,
    toAnswerlatticePublicIsoTimestamp,
} from '../../src/lib/answerlattice/publicApiContracts';
import { serializeAnswerlatticePublicCanonicalAnswer } from '../../src/lib/answerlattice/publicAnswerContracts';

const exactCredential = {
    apiKeyHash: 'a'.repeat(64),
    keyPrefix: 'al_1234',
    createdAt: '2026-07-19T00:00:00.000Z',
    productId: 'AL',
    purpose: ANSWERLATTICE_PUBLIC_API_PURPOSE,
    scopes: ['public:read', 'signals:write', 'mcp:read'],
};
const managementScope = { tenantId: 701, storeId: 7001 };

assert.deepEqual(
    normalizeAnswerlatticePublicApiScopes(['mcp:read', 'signals:write', 'public:read', 'signals:write', 'unknown']),
    ['public:read', 'signals:write', 'mcp:read'],
);
assert.equal(isAnswerlatticePublicApiCredentialInScope(exactCredential, 'public:read'), true);
assert.equal(isAnswerlatticePublicApiCredentialInScope(exactCredential, 'signals:write'), true);
assert.equal(isAnswerlatticePublicApiCredentialInScope(exactCredential, 'mcp:read'), true);
assert.equal(isAnswerlatticePublicApiCredentialInScope({
    ...exactCredential,
    scopes: ['mcp:read'],
}, 'public:read'), false);
assert.equal(isAnswerlatticePublicApiCredentialInScope({
    ...exactCredential,
    scopes: ['mcp:read'],
}, 'mcp:read'), true);
assert.equal(isAnswerlatticePublicApiCredentialInScope({ ...exactCredential, productId: undefined }, 'public:read'), false);
assert.equal(isAnswerlatticePublicApiCredentialInScope({ ...exactCredential, purpose: undefined }, 'public:read'), false);
assert.equal(isAnswerlatticePublicApiCredentialInScope({ ...exactCredential, scopes: undefined }, 'public:read'), false);
assert.equal(isAnswerlatticePublicApiCredentialInScope({ ...exactCredential, scopes: ['public:read', 'unknown'] }, 'public:read'), false);
assert.equal(isAnswerlatticePublicApiCredentialInScope({ ...exactCredential, purpose: 'answerlattice_widget' }, 'public:read'), false);

assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'generate',
    apiKey: `al_${'a'.repeat(32)}`,
    requestId: '11111111-1111-4111-8111-111111111111',
    expectedScope: managementScope,
    scopes: ['public:read'],
}).success, true);
assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'generate',
    apiKey: `al_${'a'.repeat(32)}`,
    requestId: '11111111-1111-4111-8111-111111111111',
    expectedScope: managementScope,
    scopes: ['public:read', 'public:read'],
}).success, false);
assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'generate',
    apiKey: `al_${'a'.repeat(32)}`,
    requestId: '11111111-1111-4111-8111-111111111111',
    expectedScope: managementScope,
    scopes: ['widget:search'],
}).success, false);
assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'revoke',
    expectedScope: managementScope,
}).success, true);
assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({ action: 'revoke' }).success, false);
assert.equal(answerlatticePublicApiManagementScopesMatch(managementScope, managementScope), true);
assert.equal(answerlatticePublicApiManagementScopesMatch(
    managementScope,
    { tenantId: 701, storeId: 7002 },
), false);

assert.deepEqual(buildAnswerlatticePublicApiKeySummary(exactCredential), {
    keyPrefix: 'al_1234',
    createdAt: '2026-07-19T00:00:00.000Z',
    scopes: ['public:read', 'signals:write', 'mcp:read'],
});
assert.equal(buildAnswerlatticePublicApiKeySummary({ ...exactCredential, createdAt: 'not-a-date' }), null);
assert.equal(buildAnswerlatticePublicApiKeySummary({ ...exactCredential, productId: 'ML' }), null);
assert.equal(buildAnswerlatticePublicApiKeySummary({ ...exactCredential, purpose: 'answerlattice_widget' }), null);
assert.equal(buildAnswerlatticePublicApiKeySummary({ ...exactCredential, apiKeyHash: 'not-a-hash' }), null);
assert.equal(buildAnswerlatticePublicApiKeySummary({ ...exactCredential, keyPrefix: 'ml_1234' }), null);
assert.equal(buildAnswerlatticePublicApiKeySummary({ ...exactCredential, scopes: ['public:read', 'unknown'] }), null);
assert.equal(AnswerlatticePublicApiKeyGeneratedResponseSchema.safeParse({
    apiKey: `al_${'a'.repeat(32)}`,
    credential: buildAnswerlatticePublicApiKeySummary(exactCredential),
    scope: managementScope,
}).success, true);
assert.equal(AnswerlatticePublicApiKeyStatusResponseSchema.safeParse({
    credential: buildAnswerlatticePublicApiKeySummary(exactCredential),
    scope: managementScope,
}).success, true);
assert.equal(AnswerlatticePublicApiKeyRevokedResponseSchema.safeParse({
    success: true,
    credential: null,
    scope: managementScope,
}).success, true);

assert.deepEqual(ANSWERLATTICE_PUBLIC_ENTITY_STATUSES, ['active', 'beta']);
assert.equal((ANSWERLATTICE_PUBLIC_ENTITY_STATUSES as readonly string[]).includes('deprecated'), false);
assert.deepEqual(buildAnswerlatticePublicEntityQueryPredicates(undefined, undefined), [{
    field: 'status',
    operator: 'in',
    value: ['active', 'beta'],
}]);
assert.deepEqual(buildAnswerlatticePublicEntityQueryPredicates('feature', undefined), [
    { field: 'type', operator: '==', value: 'feature' },
    { field: 'status', operator: 'in', value: ['active', 'beta'] },
]);
assert.deepEqual(buildAnswerlatticePublicEntityQueryPredicates('feature', 'active'), [
    { field: 'type', operator: '==', value: 'feature' },
    { field: 'status', operator: '==', value: 'active' },
]);
assert.equal((ANSWERLATTICE_PUBLIC_SIGNAL_TYPES as readonly string[]).includes('ticket'), true);
assert.equal((ANSWERLATTICE_PUBLIC_SIGNAL_TYPES as readonly string[]).includes('guided_resolution'), true);
assert.equal((ANSWERLATTICE_PUBLIC_SIGNAL_TYPES as readonly string[]).includes('suggestion_shown'), false);

const sanitizedMetadata = sanitizeAnswerlatticePublicSignalMetadata({
    severity: 'high',
    attemptCount: 2,
    source: 'spoofed',
    userId: 'spoofed-user',
    requestId: 'spoofed-request',
    externalId: 'spoofed-external',
    nested: { secret: 'not admitted' },
    values: ['a', 2, true, null, { no: 'object' }],
    'bad key!': 'normalized',
    invalidNumber: Number.NaN,
    mixedNumbers: [1, Number.POSITIVE_INFINITY, 2],
});
assert.deepEqual(sanitizedMetadata, {
    severity: 'high',
    attemptCount: 2,
    values: ['a', 2, true],
    badkey: 'normalized',
    mixedNumbers: [1, 2],
});

assert.equal(toAnswerlatticePublicIsoTimestamp('2026-07-26T00:00:00.000Z'), '2026-07-26T00:00:00.000Z');
assert.equal(toAnswerlatticePublicIsoTimestamp(new Date('2026-07-26T00:00:00.000Z')), '2026-07-26T00:00:00.000Z');
assert.equal(toAnswerlatticePublicIsoTimestamp({ toMillis: () => 1_774_742_400_000 }), '2026-03-29T00:00:00.000Z');
assert.equal(toAnswerlatticePublicIsoTimestamp({ toDate: () => new Date('2026-07-26T00:00:00.000Z') }), '2026-07-26T00:00:00.000Z');
assert.equal(toAnswerlatticePublicIsoTimestamp(new Date('invalid')), null);
assert.equal(toAnswerlatticePublicIsoTimestamp({
    get toDate() {
        throw new Error('crafted timestamp getter');
    },
}), null);
assert.equal(toAnswerlatticePublicIsoTimestamp(new Proxy({}, {
    get() {
        throw new Error('crafted timestamp proxy');
    },
})), null);

const publicAnswerFixture = {
    id: 'answer_public_projection',
    pId: 'AL' as const,
    tId: 701,
    sId: 7001,
    title: 'Retry a failed payment',
    slug: 'retry-failed-payment',
    status: 'active' as const,
    answerType: 'procedure' as const,
    scope: {
        entityIds: ['billing'],
        planIds: ['growth'],
    },
    productBinding: {
        introducedInVersion: 1,
        lastValidatedInVersion: 2,
        applicableVersions: { from: 1, to: null },
        internalReleaseNotes: 'must not cross the public boundary',
    },
    content: {
        structuredSummary: 'Retry from Billing.',
        detailedExplanation: 'Open Billing and retry the failed payment.',
        procedure: {
            procedureSlug: 'retry_payment',
            steps: [{
                stepOrder: 1,
                action: 'navigate' as const,
                instruction: 'Open Billing.',
                target: 'billing',
            }],
        },
    },
    validation: {
        confidenceScore: 0.9,
        validationSource: 'manual' as const,
        lastValidatedOn: Timestamp.fromDate(new Date('2026-07-26T00:00:00.000Z')),
        validatedBy: 'owner',
    },
    signalMetrics: {
        linkedTicketCount: 0,
        linkedChatCount: 0,
        negativeFeedbackCount: 0,
    },
    governance: {
        driftFlag: false,
        reviewRequired: false,
        driftReason: 'must not cross the public boundary',
    },
    modifiedOn: Timestamp.fromDate(new Date('2026-07-26T01:00:00.000Z')),
};
const serializedPublicAnswer = serializeAnswerlatticePublicCanonicalAnswer(publicAnswerFixture, true);
assert.equal(serializedPublicAnswer?.productBinding.introducedInVersion, 1);
assert.equal('internalReleaseNotes' in (serializedPublicAnswer?.productBinding || {}), false);
assert.equal('driftReason' in (serializedPublicAnswer?.governance || {}), false);
assert.equal(serializedPublicAnswer?.content.procedure?.steps[0].instruction, 'Open Billing.');
assert.equal(serializeAnswerlatticePublicCanonicalAnswer(publicAnswerFixture, false)?.content.procedure, null);

process.stdout.write('Answerlattice Public API contract tests passed.\n');
