import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_PUBLIC_API_PURPOSE,
    ANSWERLATTICE_PUBLIC_ENTITY_STATUSES,
    ANSWERLATTICE_PUBLIC_SIGNAL_TYPES,
    AnswerlatticePublicApiKeyActionSchema,
    AnswerlatticePublicApiKeyGeneratedResponseSchema,
    buildAnswerlatticePublicApiKeySummary,
    isAnswerlatticePublicApiCredentialInScope,
    normalizeAnswerlatticePublicApiScopes,
    sanitizeAnswerlatticePublicSignalMetadata,
} from '../../src/lib/answerlattice/publicApiContracts';

const exactCredential = {
    apiKeyHash: 'a'.repeat(64),
    keyPrefix: 'al_1234',
    createdAt: '2026-07-19T00:00:00.000Z',
    productId: 'AL',
    purpose: ANSWERLATTICE_PUBLIC_API_PURPOSE,
    scopes: ['public:read', 'signals:write', 'mcp:read'],
};

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
    scopes: ['public:read'],
}).success, true);
assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'generate',
    scopes: ['public:read', 'public:read'],
}).success, false);
assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'generate',
    scopes: ['widget:search'],
}).success, false);

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
}).success, true);

assert.deepEqual(ANSWERLATTICE_PUBLIC_ENTITY_STATUSES, ['active', 'beta']);
assert.equal((ANSWERLATTICE_PUBLIC_ENTITY_STATUSES as readonly string[]).includes('deprecated'), false);
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
});
assert.deepEqual(sanitizedMetadata, {
    severity: 'high',
    attemptCount: 2,
    values: ['a', 2, true],
    badkey: 'normalized',
});

process.stdout.write('Answerlattice Public API contract tests passed.\n');
