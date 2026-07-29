#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { vercelDomainFetch } from '../../src/lib/domains/vercelDomains';
import { normalizeVercelDomainDnsRecords } from '../../src/lib/domains/vercelDnsRecords';

async function run(): Promise<void> {
    const originalFetch = globalThis.fetch;
    const originalProjectId = process.env.VERCEL_PROJECT_ID;
    const originalToken = process.env.VERCEL_TOKEN;
    let bodyAbortObserved = false;

    assert.deepEqual(normalizeVercelDomainDnsRecords(
        { recommendedIPv4: [{ rank: 1, value: ['76.76.21.21'] }], recommendedCNAME: [{ rank: 1, value: 'project.vercel-dns-017.com' }] },
        { apexName: 'example.com', name: 'example.com' },
        'example.com',
    ), [{ name: 'example.com', type: 'A', value: '76.76.21.21' }], 'apex domains must use Vercel recommended IPv4 records');
    assert.deepEqual(normalizeVercelDomainDnsRecords(
        { recommendedIPv4: [{ rank: 1, value: ['76.76.21.21'] }], recommendedCNAME: [{ rank: 1, value: 'project.vercel-dns-017.com' }] },
        { apexName: 'example.com', name: 'www.example.com' },
        'www.example.com',
    ), [{ name: 'www.example.com', type: 'CNAME', value: 'project.vercel-dns-017.com' }], 'subdomains must use the project-specific Vercel recommended CNAME');
    assert.deepEqual(normalizeVercelDomainDnsRecords(
        {
            recommendedIPv4: [
                { rank: '', value: ['192.0.2.1'] },
                { rank: 1, value: ['76.76.21.21'] },
            ],
        },
        { apexName: 'example.com', name: 'example.com' },
        'example.com',
    ), [{ name: 'example.com', type: 'A', value: '76.76.21.21' }], 'malformed ranks must not outrank valid provider guidance');
    let rankCoercionCalled = false;
    assert.deepEqual(normalizeVercelDomainDnsRecords(
        {
            recommendedIPv4: [
                {
                    rank: {
                        valueOf: () => {
                            rankCoercionCalled = true;
                            return 0;
                        },
                    },
                    value: ['192.0.2.1'],
                },
                { rank: '1', value: ['76.76.21.21'] },
            ],
        },
        { apexName: 'example.com', name: 'example.com' },
        'example.com',
    ), [{ name: 'example.com', type: 'A', value: '76.76.21.21' }], 'rank admission must not execute provider-controlled conversion hooks');
    assert.equal(rankCoercionCalled, false);
    assert.deepEqual(normalizeVercelDomainDnsRecords({}, null, 'example.com'), [], 'missing provider guidance must not invent a DNS record');

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
