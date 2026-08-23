import assert from 'node:assert/strict';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
    isKnownAnswerlatticeDiscoveryPath,
    renderAnswerlatticeHomepageMarkdown,
    renderAnswerlatticeNotFoundMarkdown,
} from '../../src/lib/seo/answerlatticeAgentReadiness';
import { GET as getAnswerlatticeOpenApi } from '../../src/app/sites/answerlattice/openapi.json/route';
import { answerlatticePublicApiError } from '../../src/lib/answerlattice/publicApi';
import { ANSWERLATTICE_PUBLIC_PAGES } from '../../src/app/sites/answerlattice/siteConfig';

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
            host: 'answerlattice.com',
            accept: options.accept || 'text/html',
            'x-forwarded-proto': 'https',
        },
    });
}

async function main() {
    try {
        const homepageMarkdown = renderAnswerlatticeHomepageMarkdown();
        const notFoundMarkdown = renderAnswerlatticeNotFoundMarkdown();

        assert.match(homepageMarkdown, /^# AnswerLattice$/m);
        assert.match(homepageMarkdown, /^## When to use AnswerLattice$/m);
        assert.match(homepageMarkdown, /disabled by default/);
        assert.match(homepageMarkdown, /must not mutate workspaces, approved answers, tickets, billing, private knowledge/);
        assert.match(notFoundMarkdown, /https:\/\/answerlattice\.com\/llms\.txt/);
        assert.match(notFoundMarkdown, /https:\/\/answerlattice\.com\/sitemap\.xml/);
        ANSWERLATTICE_PUBLIC_PAGES.forEach((page) => {
            assert.equal(isKnownAnswerlatticeDiscoveryPath(page.path), true, `Expected ${page.path} to be a known discovery path`);
        });
        assert.equal(isKnownAnswerlatticeDiscoveryPath('/pre-onboarding.md'), true);
        assert.equal(isKnownAnswerlatticeDiscoveryPath('/_next/static/chunks/app.js'), true);
        assert.equal(isKnownAnswerlatticeDiscoveryPath('/missing-agent-page'), false);

        const openApiResponse = getAnswerlatticeOpenApi();
        assert.equal(openApiResponse.status, 200);
        assert.match(openApiResponse.headers.get('content-type') || '', /^application\/vnd\.oai\.openapi\+json/);
        const openApi = await openApiResponse.json();
        assert.equal(openApi.openapi, '3.1.0');
        assert.equal(openApi.info.version, '1.3.0');
        assert.equal(openApi.info['x-versioning-policy'].currentMajor, 'v1');
        assert.deepEqual(openApi.info['x-versioning-policy'].currentDeprecations, []);
        assert.equal(openApi.externalDocs.url, 'https://answerlattice.com/developers#public-api-versioning');
        assert.equal(openApi.paths['/api/answerlattice/public/v1/answers'].post.operationId, 'retrieveGovernedAnswer');
        assert.equal(openApi.paths['/api/answerlattice/public/v1/answers'].post.deprecated, false);
        assert.equal(openApi.paths['/api/answerlattice/public/v1/entities'].get.operationId, 'listGovernedEntities');
        assert.equal(openApi.paths['/api/answerlattice/public/v1/signals'].post.operationId, 'submitGovernanceSignal');
        assert.equal(openApi.components.securitySchemes.answerlatticeApiKey.name, 'X-API-Key');
        assert.equal(
            openApi.paths['/api/answerlattice/public/v1/answers'].post.responses['200'].content['application/json'].schema.$ref,
            '#/components/schemas/AnswerResult',
        );

        const apiError = answerlatticePublicApiError('INVALID_INPUT', 'Invalid request body', 400);
        assert.equal(apiError.status, 400);
        assert.equal(apiError.headers.get('cache-control'), 'private, no-store, max-age=0');
        assert.deepEqual(await apiError.json(), {
            error: {
                code: 'INVALID_INPUT',
                message: 'Invalid request body',
                resolution: 'Correct the request against the published OpenAPI schema before retrying.',
            },
        });

        setProductionStage();
        const { proxy } = require('../../src/proxy.ts') as typeof import('../../src/proxy');

        let response = await proxy(request('https://answerlattice.com/', { accept: 'text/markdown, text/html;q=0.9' }));
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /^text\/markdown/);
        assert.equal(response.headers.get('vary'), 'Accept, Accept-Encoding');
        assert.equal(response.headers.get('x-product-id'), 'answerlattice');
        assert.equal(await response.text(), homepageMarkdown);

        response = await proxy(request('https://answerlattice.com/missing-agent-page', { accept: 'text/markdown' }));
        assert.equal(response.status, 404);
        assert.match(response.headers.get('content-type') || '', /^text\/markdown/);
        assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
        assert.doesNotMatch(await response.text(), /missing-agent-page/);

        response = await proxy(request('https://answerlattice.com/developers', { accept: 'text/markdown' }));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/answerlattice\/developers$/);

        response = await proxy(request('https://answerlattice.com/openapi.json', { accept: 'text/markdown' }));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/answerlattice\/openapi\.json$/);

        response = await proxy(request('https://answerlattice.com/', { accept: 'text/html' }));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/answerlattice$/);

        response = await proxy(request('https://answerlattice.com/', { accept: 'text/markdown', method: 'POST' }));
        assert.match(response.headers.get('x-middleware-rewrite') || '', /\/sites\/answerlattice$/);

        console.log('AnswerLattice agent-readiness contracts passed.');
    } finally {
        restoreEnv();
    }
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
