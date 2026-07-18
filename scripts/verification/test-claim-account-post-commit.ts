#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { runClaimAccountCacheRevalidation } from '../../src/lib/auth/claimAccountPostCommit';

async function run(): Promise<void> {
    const calls: string[] = [];
    const success = await runClaimAccountCacheRevalidation(
        { storeId: 101, tenantId: 1 },
        {
            revalidate: async (storeId, tenantId) => {
                calls.push(`revalidate:${tenantId}:${storeId}`);
            },
            onFailure: () => calls.push('unexpected-failure'),
        },
    );
    assert.equal(success, true);
    assert.deepEqual(calls, ['revalidate:1:101']);

    const cacheError = new Error('cache unavailable');
    let observed: unknown;
    const failed = await runClaimAccountCacheRevalidation(
        { storeId: 202, tenantId: 2 },
        {
            revalidate: async () => {
                throw cacheError;
            },
            onFailure: (error) => {
                observed = error;
            },
        },
    );
    assert.equal(failed, false, 'post-commit cache failure must not reject the completed claim');
    assert.equal(observed, cacheError, 'the cache failure must remain observable');
}

run()
    .then(() => process.stdout.write('Claim-account post-commit tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
