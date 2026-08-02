import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    readAnswerlatticePublicApiKeySummary,
    revokeAnswerlatticePublicApiKey,
    rotateAnswerlatticePublicApiKey,
} from '../../src/lib/answerlattice/publicApiKeyStore';
import { requireAnswerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { hashApiKey, validatePublicApiKey } from '../../src/lib/publicApi/auth';

const scope = { tenantId: 701, storeId: 7001 };
const db = requireAnswerlatticeFirestoreAdmin();
const actor = { id: 'owner_public_api_test' };
const storeRef = () => db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
const rawKey = (character: string) => `al_${character.repeat(32)}`;

async function readPublicApiAudits(): Promise<Record<string, any>[]> {
    const snapshot = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).get();
    return snapshot.docs
        .map((doc) => doc.data())
        .filter((audit) => audit.tId === scope.tenantId && audit.sId === scope.storeId);
}

async function seedStore(overrides: Record<string, unknown> = {}): Promise<void> {
    await storeRef().set({
        id: scope.storeId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        productId: PRODUCT_IDS.ANSWERLATTICE,
        tId: scope.tenantId,
        sId: scope.storeId,
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        active: true,
        deleted: false,
        ...overrides,
    });
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await seedStore();
    assert.equal(await readAnswerlatticePublicApiKeySummary(scope), null);

    const firstKey = rawKey('a');
    const firstSummary = await rotateAnswerlatticePublicApiKey(scope, actor, {
        apiKeyHash: hashApiKey(firstKey),
        keyPrefix: firstKey.slice(0, 7),
        requestId: '11111111-1111-4111-8111-111111111111',
        scopes: ['public:read'],
        createdAt: '2026-07-19T00:00:00.000Z',
    });
    assert.deepEqual(firstSummary, {
        keyPrefix: firstKey.slice(0, 7),
        createdAt: '2026-07-19T00:00:00.000Z',
        scopes: ['public:read'],
    });

    let persisted = (await storeRef().get()).data()?.publicApi;
    assert.equal(persisted.apiKey, undefined, 'raw API keys must never be persisted');
    assert.equal(persisted.apiKeyHash, hashApiKey(firstKey));
    assert.equal(persisted.productId, PRODUCT_IDS.ANSWERLATTICE);
    assert.equal(persisted.purpose, 'answerlattice_public_api');
    assert.deepEqual(persisted.scopes, ['public:read']);
    let audits = await readPublicApiAudits();
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, 'public_api_key_rotated');
    assert.equal(audits[0].performedBy, actor.id);
    assert.equal(JSON.stringify(audits[0]).includes(firstKey), false, 'audit must not store raw keys');
    assert.equal(JSON.stringify(audits[0]).includes(hashApiKey(firstKey)), false, 'audit must not store key hashes');

    const replaySummary = await rotateAnswerlatticePublicApiKey(scope, actor, {
        apiKeyHash: hashApiKey(firstKey),
        keyPrefix: firstKey.slice(0, 7),
        requestId: '11111111-1111-4111-8111-111111111111',
        scopes: ['public:read'],
        createdAt: '2026-07-19T00:00:30.000Z',
    });
    assert.deepEqual(replaySummary, firstSummary, 'exact retry must return committed credential summary');
    assert.equal((await readPublicApiAudits()).length, 1, 'exact retry must not duplicate audit truth');
    await assert.rejects(
        () => rotateAnswerlatticePublicApiKey(scope, actor, {
            apiKeyHash: hashApiKey(rawKey('z')),
            keyPrefix: rawKey('z').slice(0, 7),
            requestId: '11111111-1111-4111-8111-111111111111',
            scopes: ['public:read'],
            createdAt: '2026-07-19T00:00:30.000Z',
        }),
        (error: unknown) => typeof error === 'object'
            && error !== null
            && (error as { code?: unknown }).code === 'idempotency_conflict',
    );

    const firstValidation = await validatePublicApiKey(firstKey, {
        allowLegacyRawFallback: false,
        cacheTtlMs: 0,
    });
    assert.equal(firstValidation?.credentialSource, 'publicApi');
    assert.equal(firstValidation?.storeId, String(scope.storeId));

    const secondKey = rawKey('b');
    await rotateAnswerlatticePublicApiKey(scope, actor, {
        apiKeyHash: hashApiKey(secondKey),
        keyPrefix: secondKey.slice(0, 7),
        requestId: '22222222-2222-4222-8222-222222222222',
        scopes: ['public:read', 'signals:write'],
        createdAt: '2026-07-19T00:01:00.000Z',
    });
    assert.equal(await validatePublicApiKey(firstKey, {
        allowLegacyRawFallback: false,
        cacheTtlMs: 0,
    }), null, 'rotation must invalidate the previous key');
    assert.equal((await validatePublicApiKey(secondKey, {
        allowLegacyRawFallback: false,
        cacheTtlMs: 0,
    }))?.storeId, String(scope.storeId));
    audits = await readPublicApiAudits();
    assert.equal(audits.filter((audit) => audit.action === 'public_api_key_rotated').length, 2);

    await revokeAnswerlatticePublicApiKey(scope, actor);
    persisted = (await storeRef().get()).data()?.publicApi;
    assert.equal(persisted, undefined);
    assert.equal(await validatePublicApiKey(secondKey, {
        allowLegacyRawFallback: false,
        cacheTtlMs: 0,
    }), null, 'revocation must invalidate the active key');
    audits = await readPublicApiAudits();
    assert.equal(audits.filter((audit) => audit.action === 'public_api_key_revoked').length, 1);

    await seedStore({ pId: PRODUCT_IDS.MENULIST, productId: PRODUCT_IDS.MENULIST });
    await assert.rejects(
        () => rotateAnswerlatticePublicApiKey(scope, actor, {
            apiKeyHash: hashApiKey(rawKey('c')),
            keyPrefix: rawKey('c').slice(0, 7),
            requestId: '33333333-3333-4333-8333-333333333333',
            scopes: ['public:read'],
            createdAt: '2026-07-19T00:02:00.000Z',
        }),
        (error: unknown) => typeof error === 'object'
            && error !== null
            && (error as { code?: unknown }).code === 'workspace_mismatch',
    );

    await seedStore({ tId: scope.tenantId + 1, tenantId: scope.tenantId + 1 });
    await assert.rejects(
        () => readAnswerlatticePublicApiKeySummary(scope),
        (error: unknown) => typeof error === 'object'
            && error !== null
            && (error as { code?: unknown }).code === 'workspace_mismatch',
    );

    process.stdout.write('Answerlattice Public API key emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
