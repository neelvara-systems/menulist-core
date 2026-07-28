import assert from 'node:assert/strict';

import {
    ANSWERLATTICE_PUBLIC_API_PURPOSE,
    AnswerlatticePublicApiKeyActionSchema,
    classifyAnswerlatticePublicApiKeyRotationReplay,
} from '../../src/lib/answerlattice/publicApiContracts';

const requestId = '11111111-1111-4111-8111-111111111111';
const apiKey = `al_${'a'.repeat(32)}`;
const apiKeyHash = 'b'.repeat(64);
const expectedScope = { tenantId: 701, storeId: 7001 };
const existingCredential = {
    apiKeyHash,
    createdAt: '2026-07-26T00:00:00.000Z',
    keyPrefix: apiKey.slice(0, 7),
    productId: 'AL',
    purpose: ANSWERLATTICE_PUBLIC_API_PURPOSE,
    rotationRequestId: requestId,
    scopes: ['public:read'],
};

assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse({
    action: 'generate',
    apiKey,
    requestId,
    expectedScope,
    scopes: ['public:read'],
}).success, true);

for (const invalidRequest of [
    { action: 'generate', requestId, expectedScope, scopes: ['public:read'] },
    { action: 'generate', apiKey, expectedScope, scopes: ['public:read'] },
    { action: 'generate', apiKey: 'al_short', requestId, expectedScope, scopes: ['public:read'] },
    { action: 'generate', apiKey, requestId: 'not-a-uuid', expectedScope, scopes: ['public:read'] },
    { action: 'generate', apiKey, requestId, scopes: ['public:read'] },
    { action: 'generate', apiKey, requestId, expectedScope: { tenantId: 0, storeId: 7001 }, scopes: ['public:read'] },
    { action: 'generate', apiKey, requestId, expectedScope, scopes: ['public:read'], extra: true },
    { action: 'revoke' },
]) {
    assert.equal(AnswerlatticePublicApiKeyActionSchema.safeParse(invalidRequest).success, false);
}

assert.deepEqual(
    classifyAnswerlatticePublicApiKeyRotationReplay(existingCredential, {
        apiKeyHash,
        requestId,
        scopes: ['public:read'],
    }),
    {
        kind: 'replay',
        summary: {
            createdAt: existingCredential.createdAt,
            keyPrefix: existingCredential.keyPrefix,
            scopes: ['public:read'],
        },
    },
);

assert.deepEqual(
    classifyAnswerlatticePublicApiKeyRotationReplay(existingCredential, {
        apiKeyHash: 'c'.repeat(64),
        requestId,
        scopes: ['public:read'],
    }),
    { kind: 'conflict' },
);
assert.deepEqual(
    classifyAnswerlatticePublicApiKeyRotationReplay(existingCredential, {
        apiKeyHash,
        requestId,
        scopes: ['public:read', 'signals:write'],
    }),
    { kind: 'conflict' },
);
assert.deepEqual(
    classifyAnswerlatticePublicApiKeyRotationReplay(existingCredential, {
        apiKeyHash,
        requestId: '22222222-2222-4222-8222-222222222222',
        scopes: ['public:read'],
    }),
    { kind: 'new' },
);

process.stdout.write('Answerlattice Public API key idempotency contracts passed.\n');
