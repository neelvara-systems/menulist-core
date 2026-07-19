import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
    normalizeWidgetAllowedOrigin,
    normalizeWidgetBlockedRoute,
    parseWidgetConfigSaveInput,
} from '../../src/lib/answerlattice/widgetConfig';

const repoRoot = path.resolve(__dirname, '../..');
const read = (relativePath: string) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

const valid = parseWidgetConfigSaveInput({
    config: {
        headerTitle: 'Product help',
        blockedRoutes: [
            '/help-center',
            'https://app.example.com/admin/*?preview=1',
            '/help-center',
        ],
    },
    allowedOrigins: [
        'https://APP.example.com/',
        'https://app.example.com',
        'http://localhost:3000',
    ],
});

assert.deepEqual(valid.allowedOrigins, [
    'https://app.example.com',
    'http://localhost:3000',
]);
assert.deepEqual(valid.config.blockedRoutes, ['/help-center', '/admin/*']);
assert.equal(normalizeWidgetAllowedOrigin('https://example.com/path'), null);
assert.equal(normalizeWidgetAllowedOrigin('https://user:secret@example.com'), null);
assert.equal(normalizeWidgetAllowedOrigin('https://example.com?preview=1'), null);
assert.equal(normalizeWidgetAllowedOrigin('ftp://example.com'), null);
assert.equal(normalizeWidgetBlockedRoute('/billing*'), null);
assert.equal(normalizeWidgetBlockedRoute('/billing/*'), '/billing/*');

assert.throws(() => parseWidgetConfigSaveInput({
    config: {},
    allowedOrigins: ['https://example.com/private'],
}), /exact HTTP or HTTPS origin/i);

assert.throws(() => parseWidgetConfigSaveInput({
    config: { blockedRoutes: ['/billing*'] },
    allowedOrigins: [],
}), /descendant pattern/i);

assert.throws(() => parseWidgetConfigSaveInput({
    config: { blockedRoutes: Array.from({ length: 51 }, (_, index) => `/route-${index}`) },
    allowedOrigins: [],
}));

const loader = read('public/widget/answerlattice-widget.js');
const embedClient = read('src/app/widget/embed/WidgetEmbedClient.tsx');
const widgetClient = read('src/app/widget/[apiKey]/WidgetClient.tsx');
const widgetConfigRoute = read('src/app/api/answerlattice/widget-config/route.ts');
const widgetKeyRoute = read('src/app/api/answerlattice/widget-key/route.ts');
const publicWidgetConfigRoute = read('src/app/api/widget/config/route.ts');
const widgetActivityRoute = read('src/app/api/answerlattice/widget-activity/route.ts');
const assertPublicWidgetFetchHasNoReferrerPolicy = (endpoint: string) => {
    const start = widgetClient.indexOf(`fetch('${endpoint}'`);
    assert.ok(start >= 0, `missing widget request for ${endpoint}`);
    assert.ok(
        widgetClient.slice(start, start + 1_200).includes("referrerPolicy: 'no-referrer'"),
        `${endpoint} must retain the no-referrer request policy`,
    );
};

assert.ok(loader.includes("iframe.src = widgetHost + '/widget/embed';"));
assert.ok(!loader.includes("'/widget/' + encodeURIComponent(apiKey)"));
assert.ok(loader.includes("iframe.setAttribute('referrerpolicy', 'no-referrer');"));
assert.ok(loader.includes("type: 'answerlattice-widget-bootstrap', apiKey: apiKey"));
assert.ok(loader.includes('runtimeDenied'));
assert.ok(loader.includes("url.searchParams.set('path', runtimePath)"));
assert.ok(loader.includes("referrerPolicy: 'no-referrer'"));
assert.ok(!loader.includes("pattern.slice(-1) === '*'"));
assert.ok(embedClient.includes("event.data?.type !== 'answerlattice-widget-bootstrap'"));
assert.ok(embedClient.includes('event.source !== window.parent'));
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/guidance-outcome');
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/search');
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/feedback');
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/escalation');
assert.ok(widgetConfigRoute.includes("response.headers.set('Cache-Control', 'private, no-store')"));
assert.ok(widgetKeyRoute.includes("response.headers.set('Cache-Control', 'private, no-store')"));
assert.ok(widgetKeyRoute.includes('Revoke an old key before creating another.'));
assert.ok(!widgetKeyRoute.includes('Delete an old key before creating another.'));
assert.ok(publicWidgetConfigRoute.includes('const buildErrorResponse'));
assert.ok(publicWidgetConfigRoute.includes("'Cache-Control': 'no-store'"));
assert.ok(publicWidgetConfigRoute.includes("buildErrorResponse(request, { error: 'Origin not allowed' }, 403)"));
assert.ok(widgetActivityRoute.includes("'Cache-Control': 'private, no-store'"));
assert.ok(widgetActivityRoute.includes('canonicalIsoTimestampToMillis'));
assert.ok(widgetActivityRoute.includes('normalizeAnswerlatticeScopeDocumentId(data.tId) === tenantId'));

process.stdout.write('Answerlattice widget configuration contracts passed.\n');
