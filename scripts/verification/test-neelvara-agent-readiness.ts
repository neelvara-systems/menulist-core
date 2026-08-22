import assert from 'node:assert/strict';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
    renderNeelvaraHomepageMarkdown,
    renderNeelvaraLlmsTxt,
    renderNeelvaraNotFoundMarkdown,
} from '../../src/lib/seo/neelvaraAgentReadiness';
import { GET as getNeelvaraLlmsTxt } from '../../src/app/sites/neelvara/llms.txt/route';

const ROOT = path.resolve(__dirname, '..', '..');
const CONTROLLED_ENV_KEYS = [
    'VERCEL',
    'VERCEL_ENV',
    'NEXT_PUBLIC_ENV',
    'NEXT_PUBLIC_VERCEL_ENV',
    'NODE_ENV',
] as const;

const originalEnv = Object.fromEntries(
    CONTROLLED_ENV_KEYS.map((key) => [key, process.env[key]]),
);

function clearRuntimeCache() {
    const sourceRoot = `${path.join(ROOT, 'src')}${path.sep}`;
    Object.keys(require.cache).forEach((cacheKey) => {
        if (cacheKey.startsWith(sourceRoot)) delete require.cache[cacheKey];
    });
}

function setProductionStage() {
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'production';
    process.env.NEXT_PUBLIC_ENV = 'production';
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    process.env.NODE_ENV = 'production';
    clearRuntimeCache();
}

function restoreEnv() {
    CONTROLLED_ENV_KEYS.forEach((key) => {
        const value = originalEnv[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    });
    clearRuntimeCache();
}

function request(
    url: string,
    host: string,
    options: { accept?: string; method?: string } = {},
) {
    return new NextRequest(url, {
        method: options.method || 'GET',
        headers: {
            host,
            accept: options.accept || 'text/html',
            'x-forwarded-proto': 'https',
        },
    });
}

async function main() {
    try {
        const homepageMarkdown = renderNeelvaraHomepageMarkdown();
        const llms = renderNeelvaraLlmsTxt();
        const notFoundMarkdown = renderNeelvaraNotFoundMarkdown();

        assert.match(homepageMarkdown, /^# Neelvara Systems$/m);
        assert.match(homepageMarkdown, /^## When to use this site$/m);
        assert.match(homepageMarkdown, /MenuList and Answerlattice are operated by Neelvara Systems\./);
        assert.match(llms, /^## Agent action boundary$/m);
        assert.match(llms, /provides no API, MCP server, authentication flow, form submission, purchasing action, or autonomous tool call/);
        assert.match(llms, /Canonical site: \[https:\/\/neelvara\.com\]\(https:\/\/neelvara\.com\)/);
        assert.match(llms, /- \[MenuList\]\(https:\/\/menulist\.ai\)/);
        assert.match(llms, /- \[Answerlattice\]\(https:\/\/answerlattice\.com\)/);
        assert.match(llms, /- \[[^\]]*Trust[^\]]*\]\(https:\/\/neelvara\.com\/trust\)/);
        assert.doesNotMatch(llms, /^- [^\[][^\n]*: https?:\/\//m);
        assert.match(notFoundMarkdown, /https:\/\/neelvara\.com\/llms\.txt/);
        assert.match(notFoundMarkdown, /https:\/\/neelvara\.com\/sitemap\.xml/);

        const llmsResponse = getNeelvaraLlmsTxt();
        assert.equal(llmsResponse.status, 200);
        assert.match(llmsResponse.headers.get('content-type') || '', /^text\/plain/);
        assert.equal(await llmsResponse.text(), llms);

        setProductionStage();
        const { proxy } = require('../../src/proxy.ts') as typeof import('../../src/proxy');

        let response = await proxy(request(
            'https://neelvara.com/',
            'neelvara.com',
            { accept: 'text/markdown, text/html;q=0.9' },
        ));
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /^text\/markdown/);
        assert.equal(response.headers.get('vary'), 'Accept, Accept-Encoding');
        assert.equal(response.headers.get('x-product-id'), 'neelvara');
        assert.equal(await response.text(), homepageMarkdown);

        response = await proxy(request(
            'https://neelvara.com/missing-agent-page',
            'neelvara.com',
            { accept: 'text/markdown' },
        ));
        assert.equal(response.status, 404);
        assert.match(response.headers.get('content-type') || '', /^text\/markdown/);
        assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
        assert.doesNotMatch(await response.text(), /missing-agent-page/);

        response = await proxy(request(
            'https://neelvara.com/products',
            'neelvara.com',
            { accept: 'text/markdown' },
        ));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/neelvara\/products$/);

        response = await proxy(request(
            'https://neelvara.com/',
            'neelvara.com',
            { accept: 'text/html' },
        ));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/neelvara$/);

        response = await proxy(request(
            'https://neelvara.com/',
            'neelvara.com',
            { accept: 'text/markdown', method: 'POST' },
        ));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/neelvara$/);

        response = await proxy(request(
            'https://menulist.ai/',
            'menulist.ai',
            { accept: 'text/markdown' },
        ));
        assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8');
        assert.match(await response.text(), /^# MenuList$/m);

        console.log('Neelvara agent-readiness contracts passed.');
    } finally {
        restoreEnv();
    }
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
