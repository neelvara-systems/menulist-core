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

    const firstValidation = await validatePublicApiKey(firstRawKey, {
        allowLegacyRawFallback: false,
        includeAnswerlatticeWidgetApi: true,
        includePublicApi: false,
        preferAnswerlatticeWidgetApi: true,
    });
    assert.equal(firstValidation?.storeId, String(scope.storeId));

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
