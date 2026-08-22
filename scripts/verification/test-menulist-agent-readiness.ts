import assert from 'node:assert/strict';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
    renderMenuListHomepageMarkdown,
    renderMenuListNotFoundMarkdown,
} from '../../src/lib/seo/menulistAgentReadiness';
import { GET as getOpenApi } from '../../src/app/(website)/developers/openapi/route';

const ROOT = path.resolve(__dirname, '..', '..');
const CONTROLLED_ENV_KEYS = ['VERCEL', 'VERCEL_ENV', 'NEXT_PUBLIC_ENV', 'NEXT_PUBLIC_VERCEL_ENV', 'NODE_ENV'] as const;
const originalEnv = Object.fromEntries(CONTROLLED_ENV_KEYS.map((key) => [key, process.env[key]]));

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

function request(url: string, options: { accept?: string; method?: string } = {}) {
    return new NextRequest(url, {
        method: options.method || 'GET',
        headers: {
            host: 'menulist.ai',
            accept: options.accept || 'text/html',
            'x-forwarded-proto': 'https',
        },
    });
}

async function main() {
    try {
        const homepageMarkdown = renderMenuListHomepageMarkdown();
        const notFoundMarkdown = renderMenuListNotFoundMarkdown();

        assert.match(homepageMarkdown, /^# MenuList$/m);
        assert.match(homepageMarkdown, /^## When to use MenuList$/m);
        assert.match(homepageMarkdown, /store-generated `ml_` API key/);
        assert.match(homepageMarkdown, /does not provide anonymous API access, OAuth, write endpoints, MCP\/WebMCP actions, or an official npm SDK/);
        assert.match(notFoundMarkdown, /https:\/\/menulist\.ai\/llms\.txt/);
        assert.match(notFoundMarkdown, /https:\/\/menulist\.ai\/sitemap\.xml/);

        const openApiResponse = getOpenApi();
        assert.equal(openApiResponse.status, 200);
        assert.match(openApiResponse.headers.get('content-type') || '', /^application\/vnd\.oai\.openapi\+json/);
        const openApi = await openApiResponse.json();
        assert.equal(openApi.openapi, '3.1.0');
        assert(openApi.paths['/api/public/v1/business']);
        assert(openApi.paths['/api/public/v1/menu']);
        assert.equal(openApi.components.securitySchemes.menuListApiKey.name, 'X-API-Key');
        assert.equal(
            openApi.paths['/api/public/v1/business'].get.responses['200'].content['application/json'].schema.$ref,
            '#/components/schemas/PublicBusiness',
        );
        assert.equal(
            openApi.paths['/api/public/v1/menu'].get.responses['200'].content['application/json'].schema.$ref,
            '#/components/schemas/PublicMenu',
        );

        setProductionStage();
        const { proxy } = require('../../src/proxy.ts') as typeof import('../../src/proxy');

        let response = await proxy(request('https://menulist.ai/', { accept: 'text/markdown, text/html;q=0.9' }));
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /^text\/markdown/);
        assert.equal(response.headers.get('vary'), 'Accept, Accept-Encoding');
        assert.equal(await response.text(), homepageMarkdown);

        response = await proxy(request('https://menulist.ai/missing-agent-page', { accept: 'text/markdown' }));
        assert.equal(response.status, 404);
        assert.match(response.headers.get('content-type') || '', /^text\/markdown/);
        assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
        assert.doesNotMatch(await response.text(), /missing-agent-page/);

        response = await proxy(request('https://menulist.ai/developers', { accept: 'text/markdown' }));
        assert.notEqual(response.headers.get('content-type'), 'text/markdown; charset=utf-8');

        response = await proxy(request('https://menulist.ai/', { accept: 'text/html' }));
        assert.notEqual(response.headers.get('content-type'), 'text/markdown; charset=utf-8');

        response = await proxy(request('https://menulist.ai/', { accept: 'text/markdown', method: 'POST' }));
        assert.notEqual(response.headers.get('content-type'), 'text/markdown; charset=utf-8');

        console.log('MenuList agent-readiness contracts passed.');
    } finally {
        restoreEnv();
    }
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
