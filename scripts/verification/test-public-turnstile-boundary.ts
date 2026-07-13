#!/usr/bin/env ts-node

import assert from 'node:assert/strict';

async function run(): Promise<void> {
    process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret';
    const [{ verifyTurnstileToken }, { NextRequest }] = await Promise.all([
        import('../../src/middleware/publicApi'),
        import('next/server'),
    ]);
    const originalFetch = globalThis.fetch;
    const request = new NextRequest('https://www.menulist.ai/api/public/contact', {
        headers: { 'x-vercel-forwarded-for': '203.0.113.5' },
        method: 'POST',
    });

    try {
        let capturedInit: RequestInit | undefined;
        let callCount = 0;
        globalThis.fetch = async (input, init) => {
            callCount += 1;
            assert.equal(String(input), 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
            capturedInit = init;
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            });
        };
        const accepted = await verifyTurnstileToken('valid-token', request);
        assert.deepEqual(accepted, { ok: true });
        assert.equal(callCount, 1);
        assert.equal(capturedInit?.redirect, 'manual');
        assert(capturedInit?.signal instanceof AbortSignal, 'Turnstile request must carry an abort signal');

        globalThis.fetch = async () => new Response(null, {
            headers: { Location: 'https://attacker.example/steal' },
            status: 307,
        });
        const redirected = await verifyTurnstileToken('redirect-token', request);
        assert.equal(redirected.ok, false, 'Turnstile redirects must fail closed');
    } finally {
        globalThis.fetch = originalFetch;
        delete process.env.TURNSTILE_SECRET_KEY;
    }

    process.stdout.write('Public Turnstile provider-boundary tests passed.\n');
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exitCode = 1;
});
