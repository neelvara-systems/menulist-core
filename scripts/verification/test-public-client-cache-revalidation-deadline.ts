import assert from 'node:assert/strict';

import { awaitPublicCacheRevalidationRequest } from '../../src/lib/cache/publicClientCache';

async function main() {
    let aborted = false;
    const neverSettles = new Promise<Response>(() => undefined);
    const timeoutOutcome = await awaitPublicCacheRevalidationRequest(
        neverSettles,
        5,
        () => {
            aborted = true;
        },
    );
    assert.deepEqual(timeoutOutcome, { type: 'timeout' });
    assert.equal(aborted, true);

    const response = new Response(null, { status: 204 });
    const responseOutcome = await awaitPublicCacheRevalidationRequest(
        Promise.resolve(response),
        50,
        () => {
            throw new Error('response path must not abort');
        },
    );
    assert.equal(responseOutcome.type, 'response');
    if (responseOutcome.type === 'response') {
        assert.equal(responseOutcome.response.status, 204);
    }

    const rejected = new Error('request failed');
    const errorOutcome = await awaitPublicCacheRevalidationRequest(
        Promise.reject(rejected),
        50,
        () => {
            throw new Error('error path must not abort');
        },
    );
    assert.equal(errorOutcome.type, 'error');
    if (errorOutcome.type === 'error') {
        assert.equal(errorOutcome.error, rejected);
    }

    console.log('Public client cache revalidation deadline tests passed.');
}

void main();
