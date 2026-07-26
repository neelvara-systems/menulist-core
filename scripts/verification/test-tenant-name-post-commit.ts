import assert from 'node:assert/strict';
import { runTenantNamePostCommitEffects } from '../../src/lib/multiTenant/tenantNamePostCommit';
import { runStorePublicTruthPostCommitEffects } from '../../src/lib/cache/storePublicTruthPostCommit';

async function run(): Promise<void> {
    const attempted: string[] = [];
    const failure = new Error('cache unavailable');
    const result = await runTenantNamePostCommitEffects({
        chunkSize: 1,
        storeIds: ['101', '102'],
        tenantId: '55',
        deps: {
            invalidateAssistant: async (storeId, tenantId) => {
                attempted.push(`assistant:${tenantId}:${storeId}`);
            },
            revalidate: async (tag) => {
                attempted.push(`cache:${tag}`);
                if (tag === 'store-101') throw failure;
            },
            touchScreen: async (storeId) => {
                attempted.push(`screen:${storeId}`);
                if (storeId === '102') throw new Error('screen unavailable');
            },
        },
    });

    assert.equal(result.effectsPending, true);
    assert.equal(result.failedEffectCount, 2);
    assert.equal(result.firstError, failure, 'the original first failure must remain observable');
    assert.deepEqual(attempted, [
        'cache:menu-store-101',
        'cache:store-101',
        'screen:101',
        'assistant:55:101',
        'cache:menu-store-102',
        'cache:store-102',
        'screen:102',
        'assistant:55:102',
        'cache:client-stores',
        'cache:screen-data',
    ], 'one failed effect must not stop later stores or global invalidation');

    const success = await runTenantNamePostCommitEffects({
        chunkSize: 20,
        storeIds: [],
        tenantId: '55',
        deps: {
            invalidateAssistant: async () => undefined,
            revalidate: async () => undefined,
            touchScreen: async () => undefined,
        },
    });
    assert.deepEqual(success, { effectsPending: false, failedEffectCount: 0, firstError: null });

    const syncFailure = new Error('next cache rejected tag');
    const syncAttempted: string[] = [];
    const syncResult = await runStorePublicTruthPostCommitEffects({
        chunkSize: 1,
        storeIds: ['151'],
        tenantId: '55',
        deps: {
            invalidateAssistant: async (storeId) => {
                syncAttempted.push(`assistant:${storeId}`);
            },
            revalidate: (tag) => {
                syncAttempted.push(`cache:${tag}`);
                if (tag === 'menu-store-151') throw syncFailure;
            },
            touchScreen: async (storeId) => {
                syncAttempted.push(`screen:${storeId}`);
            },
        },
    });
    assert.equal(syncResult.effectsPending, true);
    assert.equal(syncResult.firstError, syncFailure);
    assert.deepEqual(syncAttempted, [
        'cache:menu-store-151',
        'cache:store-151',
        'screen:151',
        'assistant:151',
        'cache:client-stores',
        'cache:screen-data',
    ], 'a synchronous Next cache failure must not skip later public-truth effects');

    const brandTags: string[] = [];
    await runStorePublicTruthPostCommitEffects({
        chunkSize: 20,
        includeScreenDataTag: false,
        storeIds: ['201'],
        tenantId: '55',
        deps: {
            invalidateAssistant: async () => undefined,
            revalidate: async (tag) => { brandTags.push(tag); },
            touchScreen: async () => undefined,
        },
    });
    assert(!brandTags.includes('screen-data'), 'non-screen brand propagation must not invalidate the global screen tag');
    assert(brandTags.includes('client-stores'), 'brand propagation must always invalidate client-store discovery');

    const invalidChunkStores: string[] = [];
    await runStorePublicTruthPostCommitEffects({
        chunkSize: Number.NaN,
        storeIds: ['301'],
        tenantId: '55',
        deps: {
            invalidateAssistant: async (storeId) => { invalidChunkStores.push(storeId); },
            revalidate: async () => undefined,
            touchScreen: async () => undefined,
        },
    });
    assert.deepEqual(invalidChunkStores, ['301'], 'an invalid chunk size must not silently skip committed stores');
}

run().then(() => {
    console.log('Tenant-name post-commit tests passed.');
}).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
