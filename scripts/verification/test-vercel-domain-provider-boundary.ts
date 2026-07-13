#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { vercelDomainFetch } from '../../src/lib/domains/vercelDomains';

async function run(): Promise<void> {
    const originalFetch = globalThis.fetch;
    const originalProjectId = process.env.VERCEL_PROJECT_ID;
    const originalToken = process.env.VERCEL_TOKEN;
    let bodyAbortObserved = false;

    process.env.VERCEL_PROJECT_ID = 'test-project';
    process.env.VERCEL_TOKEN = 'test-token';
    mock.timers.enable({ apis: ['setTimeout'] });

    try {
        globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
            const signal = init?.signal;
            const body = new ReadableStream<Uint8Array>({
                start(controller) {
                    signal?.addEventListener('abort', () => {
                        bodyAbortObserved = true;
                        const abortError = new Error('provider body aborted');
                        abortError.name = 'AbortError';
                        controller.error(abortError);
                    }, { once: true });
                },
            });
            return new Response(body, {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        }) as typeof fetch;

        const resultPromise = vercelDomainFetch('/v6/domains/example.com/config');
        await Promise.resolve();
        await Promise.resolve();
        mock.timers.tick(10_001);
        const result = await resultPromise;

        assert.equal(bodyAbortObserved, true, 'the provider deadline must remain active while the body is read');
        assert.equal(result.ok, false, 'an aborted or unparsable success body must not remain provider-success truth');
        assert.equal(result.status, 502, 'a malformed successful provider response must become a gateway failure');

        globalThis.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;
        const emptyBodyResult = await vercelDomainFetch('/v6/domains/example.com/config');
        assert.equal(emptyBodyResult.ok, false, 'an empty HTTP-200 provider body must fail closed');
        assert.equal(emptyBodyResult.status, 502);
    } finally {
        globalThis.fetch = originalFetch;
        mock.timers.reset();
        if (originalProjectId === undefined) delete process.env.VERCEL_PROJECT_ID;
        else process.env.VERCEL_PROJECT_ID = originalProjectId;
        if (originalToken === undefined) delete process.env.VERCEL_TOKEN;
        else process.env.VERCEL_TOKEN = originalToken;
    }

    process.stdout.write('Vercel domain provider deadline and parse-boundary tests passed.\n');
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
