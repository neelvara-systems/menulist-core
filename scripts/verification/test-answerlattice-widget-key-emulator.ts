import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    ANSWERLATTICE_WIDGET_KEY_LIMIT,
    getAnswerlatticeWidgetKeyRecordByHash,
    normalizeAnswerlatticeWidgetApiState,
} from '../../src/lib/answerlattice/widgetKeyManager';
import {
    AnswerlatticeWidgetKeyStoreError,
    mutateAnswerlatticeWidgetKeys,
} from '../../src/lib/answerlattice/widgetKeyStore';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { hashApiKey, validatePublicApiKey } from '../../src/lib/publicApi/auth';

const scope = { tenantId: 101, storeId: 1001 };
const storeRef = () => db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
const keyFor = (character: string, index = 0) => `al_${character.repeat(30)}${String(index).padStart(2, '0')}`;

async function seedStore(pId: string = PRODUCT_IDS.ANSWERLATTICE): Promise<void> {
    await storeRef().set({
        id: scope.storeId,
        pId,
        productId: pId,
        tId: scope.tenantId,
        sId: scope.storeId,
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        active: true,
        answerlatticeWidgetApi: null,
    });
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db || typeof (db as any).collection !== 'function') throw new Error('Answerlattice emulator Firestore is not configured');

    await seedStore();
    const firstRawKey = keyFor('a', 1);
    const secondRawKey = keyFor('b', 2);
    const [first, second] = await Promise.all([
        mutateAnswerlatticeWidgetKeys(scope, {
            action: 'generate',
            apiKey: firstRawKey,
            keyHash: hashApiKey(firstRawKey),
            name: 'Production',
        }),
        mutateAnswerlatticeWidgetKeys(scope, {
            action: 'generate',
            apiKey: secondRawKey,
            keyHash: hashApiKey(secondRawKey),
            name: 'Staging',
        }),
    ]);
    assert.ok(first.generatedRecord?.id);
    assert.ok(second.generatedRecord?.id);

    let state = normalizeAnswerlatticeWidgetApiState((await storeRef().get()).data()?.answerlatticeWidgetApi);
    assert.equal(state.keyHashes.length, 2, 'concurrent generation must retain both committed keys');
    assert.ok(getAnswerlatticeWidgetKeyRecordByHash(state, hashApiKey(firstRawKey)));
    assert.ok(getAnswerlatticeWidgetKeyRecordByHash(state, hashApiKey(secondRawKey)));

    const firstKeyHash = hashApiKey(firstRawKey);
    const secondKeyHash = hashApiKey(secondRawKey);
    const firstKeyRecord = state.keysByHash[firstKeyHash];
    const secondKeyRecord = state.keysByHash[secondKeyHash];
    assert.ok(firstKeyRecord);
    assert.ok(secondKeyRecord);
    const duplicateManagementIdentity = normalizeAnswerlatticeWidgetApiState({
        ...state,
        keyHashes: [firstKeyHash, secondKeyHash],
        keysByHash: {
            [firstKeyHash]: { ...firstKeyRecord, id: 'duplicate-management-id' },
            [secondKeyHash]: { ...secondKeyRecord, id: 'duplicate-management-id' },
        },
    });
    assert.deepEqual(
        duplicateManagementIdentity.keyHashes,
        [],
        'duplicate management IDs must invalidate every ambiguous widget credential',
    );
    assert.deepEqual(duplicateManagementIdentity.keysByHash, {});

    const recordWithoutCreatedAt: Record<string, unknown> = { ...firstKeyRecord };
    delete recordWithoutCreatedAt.createdAt;
    const missingCreatedAtState = normalizeAnswerlatticeWidgetApiState({
        ...state,
        createdAt: undefined,
        keyHashes: [firstKeyHash],
        keysByHash: { [firstKeyHash]: recordWithoutCreatedAt },
    });
    assert.equal(
        missingCreatedAtState.keysByHash[firstKeyHash]?.createdAt,
        '1970-01-01T00:00:00.000Z',
        'missing legacy creation time must normalize deterministically',
    );

    const firstValidation = await validatePublicApiKey(firstRawKey, {
        allowLegacyRawFallback: false,
        includeAnswerlatticeWidgetApi: true,
        includePublicApi: false,
        preferAnswerlatticeWidgetApi: true,
    });
    assert.equal(firstValidation?.storeId, String(scope.storeId));
    assert.deepEqual(firstValidation?.answerlatticeScope, scope);

    for (const conflictingIdentity of [
        { tenantId: scope.tenantId + 1 },
        { storeId: scope.storeId + 1 },
        { productId: PRODUCT_IDS.MENULIST },
    ]) {
        await storeRef().set(conflictingIdentity, { merge: true });
        assert.equal(await validatePublicApiKey(firstRawKey, {
            allowLegacyRawFallback: false,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        }), null, `conflicting widget-store identity must fail closed: ${JSON.stringify(conflictingIdentity)}`);
        await seedStore();
        await storeRef().set({ answerlatticeWidgetApi: state }, { merge: true });
    }

    for (const conflictingCredential of [
        { status: 'disabled' },
        { productId: PRODUCT_IDS.MENULIST },
        { purpose: 'answerlattice_public_api' },
        { removeScopes: true },
        { scopes: ['widget:config', 'unknown'] },
        { scopes: ['widget:config', 'widget:config'] },
    ]) {
        const mutatedRecord: Record<string, unknown> = { ...firstKeyRecord, ...conflictingCredential };
        delete mutatedRecord.removeScopes;
        if ('removeScopes' in conflictingCredential) delete mutatedRecord.scopes;
        await storeRef().update({
            answerlatticeWidgetApi: {
                ...state,
                keysByHash: {
                    ...state.keysByHash,
                    [firstKeyHash]: mutatedRecord,
                },
            },
        });
        assert.equal(await validatePublicApiKey(firstRawKey, {
            allowLegacyRawFallback: false,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        }), null, `malformed managed widget credential must fail closed: ${JSON.stringify(conflictingCredential)}`);
        await storeRef().update({ answerlatticeWidgetApi: state });
    }

    await mutateAnswerlatticeWidgetKeys(scope, {
        action: 'revoke',
        keyId: first.generatedRecord!.id,
    });
    state = normalizeAnswerlatticeWidgetApiState((await storeRef().get()).data()?.answerlatticeWidgetApi);
    assert.equal(state.keyHashes.includes(hashApiKey(firstRawKey)), false);
    assert.equal(state.keysByHash[hashApiKey(firstRawKey)]?.status, 'revoked');
    assert.equal(await validatePublicApiKey(firstRawKey, {
        allowLegacyRawFallback: false,
        includeAnswerlatticeWidgetApi: true,
        includePublicApi: false,
        preferAnswerlatticeWidgetApi: true,
    }), null);

    await mutateAnswerlatticeWidgetKeys(scope, {
        action: 'delete',
        keyId: second.generatedRecord!.id,
    });
    state = normalizeAnswerlatticeWidgetApiState((await storeRef().get()).data()?.answerlatticeWidgetApi);
    assert.equal(state.keyHashes.length, 0);
    assert.equal(state.keysByHash[hashApiKey(secondRawKey)]?.status, 'revoked');

    const malformed = normalizeAnswerlatticeWidgetApiState({
        keyHashes: ['not-a-hash'],
        keysByHash: { 'not-a-hash': { id: 'bad', status: 'active' } },
    });
    assert.deepEqual(malformed.keyHashes, []);
    assert.deepEqual(malformed.keysByHash, {});

    await seedStore();
    const attempts = await Promise.allSettled(Array.from({ length: ANSWERLATTICE_WIDGET_KEY_LIMIT + 1 }, (_, index) => {
        const rawKey = keyFor(String.fromCharCode(99 + index), index);
        return mutateAnswerlatticeWidgetKeys(scope, {
            action: 'generate',
            apiKey: rawKey,
            keyHash: hashApiKey(rawKey),
            name: `Key ${index + 1}`,
        });
    }));
    assert.equal(attempts.filter(attempt => attempt.status === 'fulfilled').length, ANSWERLATTICE_WIDGET_KEY_LIMIT);
    const limitFailure = attempts.find(attempt => attempt.status === 'rejected');
    assert.ok(
        limitFailure
        && limitFailure.status === 'rejected'
        && limitFailure.reason instanceof AnswerlatticeWidgetKeyStoreError
        && limitFailure.reason.code === 'key_limit',
    );
    state = normalizeAnswerlatticeWidgetApiState((await storeRef().get()).data()?.answerlatticeWidgetApi);
    assert.equal(state.keyHashes.length, ANSWERLATTICE_WIDGET_KEY_LIMIT);

    await seedStore();
    const legacyRawKey = keyFor('y', 8);
    await storeRef().set({
        answerlatticeWidgetApi: {
            apiKeyHash: hashApiKey(legacyRawKey),
            keyPrefix: legacyRawKey.slice(0, 7),
            createdAt: new Date().toISOString(),
        },
    }, { merge: true });
    const legacyValidation = await validatePublicApiKey(legacyRawKey, {
        allowLegacyRawFallback: false,
        includeAnswerlatticeWidgetApi: true,
        includePublicApi: false,
        preferAnswerlatticeWidgetApi: true,
    });
    assert.equal(legacyValidation?.credential?.legacy, true, 'the explicit top-level legacy hash path remains supported');
    assert.deepEqual(legacyValidation?.answerlatticeScope, scope);

    await seedStore(PRODUCT_IDS.MENULIST);
    const wrongProductKey = keyFor('z', 9);
    await assert.rejects(
        () => mutateAnswerlatticeWidgetKeys(scope, {
            action: 'generate',
            apiKey: wrongProductKey,
            keyHash: hashApiKey(wrongProductKey),
        }),
        (error: unknown) => error instanceof AnswerlatticeWidgetKeyStoreError && error.code === 'workspace_mismatch',
    );

    process.stdout.write('Answerlattice widget-key emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
