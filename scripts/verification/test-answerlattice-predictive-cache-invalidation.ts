#!/usr/bin/env ts-node

import assert from 'node:assert/strict';

import { getAnswerlatticePublicCacheTags } from '@lib/actions/revalidateAnswerlatticePublicCache';
import { revalidateAnswerlatticePublicClientCache } from '@lib/cache/answerlatticePublicClientCache';

const globalRecord = globalThis as unknown as Record<string, unknown>;
const originalWindow = globalRecord.window;
const originalFetch = globalThis.fetch;

const installBrowserRuntime = (status: number) => {
    globalRecord.window = {
        setTimeout,
        clearTimeout,
    };
    globalThis.fetch = (async () => new Response(null, { status })) as typeof fetch;
};

async function main(): Promise<void> {
    const predictiveTags = getAnswerlatticePublicCacheTags(7, 9, 'predictive');
    assert.deepEqual(predictiveTags, [
        'answerlattice-public-7-9',
        'answerlattice-public-predictive-7-9',
    ]);
    assert.ok(getAnswerlatticePublicCacheTags(7, 9, 'all').includes('answerlattice-public-predictive-7-9'));

    installBrowserRuntime(500);
    await revalidateAnswerlatticePublicClientCache(
        { tId: 7, sId: 9 },
        'predictive',
        'bestEffortPredictiveTest',
    );
    await assert.rejects(
        () => revalidateAnswerlatticePublicClientCache(
            { tId: 7, sId: 9 },
            'predictive',
            'strictPredictiveTest',
            { throwOnFailure: true },
        ),
        /answerlattice_public_cache_revalidation_bad_status/,
    );

    installBrowserRuntime(200);
    await revalidateAnswerlatticePublicClientCache(
        { tId: 7, sId: 9 },
        'predictive',
        'strictPredictiveSuccess',
        { throwOnFailure: true },
    );

    process.stdout.write('Answerlattice predictive cache invalidation contracts passed.\n');
}

void main().finally(() => {
    if (originalWindow === undefined) {
        delete globalRecord.window;
    } else {
        globalRecord.window = originalWindow;
    }
    globalThis.fetch = originalFetch;
});
