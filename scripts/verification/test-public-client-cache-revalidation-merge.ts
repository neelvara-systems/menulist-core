import assert from 'node:assert/strict';
import {
    mergePendingPublicCacheRevalidation,
    type PublicCacheRevalidationOptions,
} from '../../src/lib/cache/publicClientCache';

const request = (
    context: string,
    options: PublicCacheRevalidationOptions,
) => ({ context, options });

const queuedScreenRefresh = request('publishProject', {
    projectId: 'project-b-42',
    touchScreen: true,
});
const laterCacheOnlyRefresh = request('updateStore', {
    touchScreen: false,
});

assert.deepEqual(
    mergePendingPublicCacheRevalidation(queuedScreenRefresh, laterCacheOnlyRefresh),
    queuedScreenRefresh,
    'a later cache-only request must not erase a queued Digital Screen refresh',
);

assert.deepEqual(
    mergePendingPublicCacheRevalidation(laterCacheOnlyRefresh, queuedScreenRefresh),
    queuedScreenRefresh,
    'a later Digital Screen refresh must upgrade a queued cache-only request',
);

const laterScreenRefresh = request('publishProjectAgain', {
    projectId: 'project-c-42',
    touchScreen: true,
});
assert.deepEqual(
    mergePendingPublicCacheRevalidation(queuedScreenRefresh, laterScreenRefresh),
    laterScreenRefresh,
    'equally strong screen refresh requests may coalesce to the latest context',
);

const laterCacheOnlyContext = request('updateStoreAgain', {});
assert.deepEqual(
    mergePendingPublicCacheRevalidation(laterCacheOnlyRefresh, laterCacheOnlyContext),
    laterCacheOnlyContext,
    'cache-only requests may coalesce to the latest context',
);

console.log('Public client cache pending revalidation merge boundary passed.');
