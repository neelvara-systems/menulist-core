import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
    normalizeAnswerlatticeWidgetConfigVersion,
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
    expectedConfigVersion: 7,
});

assert.deepEqual(valid.allowedOrigins, [
    'https://app.example.com',
    'http://localhost:3000',
]);
assert.deepEqual(valid.config.blockedRoutes, ['/help-center', '/admin/*']);
assert.equal(valid.expectedConfigVersion, 7);
assert.equal(normalizeWidgetAllowedOrigin('https://example.com/path'), null);
assert.equal(normalizeWidgetAllowedOrigin('https://user:secret@example.com'), null);
assert.equal(normalizeWidgetAllowedOrigin('https://example.com?preview=1'), null);
assert.equal(normalizeWidgetAllowedOrigin('ftp://example.com'), null);
assert.equal(normalizeWidgetBlockedRoute('/billing*'), null);
assert.equal(normalizeWidgetBlockedRoute('/billing/*'), '/billing/*');
assert.equal(normalizeAnswerlatticeWidgetConfigVersion(7), 7);
for (const invalidVersion of ['7', 7.5, -1, Number.MAX_SAFE_INTEGER + 1, Number.POSITIVE_INFINITY]) {
    assert.equal(normalizeAnswerlatticeWidgetConfigVersion(invalidVersion), 0);
}

assert.throws(() => parseWidgetConfigSaveInput({
    config: {},
    allowedOrigins: ['https://example.com/private'],
    expectedConfigVersion: 0,
}), /exact HTTP or HTTPS origin/i);

assert.throws(() => parseWidgetConfigSaveInput({
    config: { blockedRoutes: ['/billing*'] },
    allowedOrigins: [],
    expectedConfigVersion: 0,
}), /descendant pattern/i);

assert.throws(() => parseWidgetConfigSaveInput({
    config: { blockedRoutes: Array.from({ length: 51 }, (_, index) => `/route-${index}`) },
    allowedOrigins: [],
    expectedConfigVersion: 0,
}));

for (const invalidExpectedVersion of [undefined, '0', -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => parseWidgetConfigSaveInput({
        config: {},
        allowedOrigins: [],
        expectedConfigVersion: invalidExpectedVersion,
    }));
}

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
assert.ok(loader.includes("'answerlattice-widget-config:' + apiKey + ':' + widgetHost"));
assert.ok(loader.includes("'answerlattice-predictive-session:' + apiKey"));
assert.ok(!loader.includes('apiKey.slice(0, 14)'));
assert.ok(loader.includes('remoteConfigResponseMaxBytes = 64 * 1024'));
assert.ok(loader.includes('return readJsonResponseWithLimit(response, remoteConfigResponseMaxBytes);'));
assert.ok(!loader.includes('return response.json();'));
assert.ok(loader.includes("typeof response.body.getReader !== 'function'"));
assert.ok(loader.includes('totalBytes > maxBytes'));
assert.ok(loader.includes('return reader.cancel()'));
assert.ok(loader.includes('return readJsonResponseWithLimit(response, 32768);'));
assert.ok(!loader.includes('return response.text().then(function (body)'));
assert.ok(loader.includes('Number.isSafeInteger(data.configVersion)'));
assert.ok(loader.includes("typeof data.capabilities.predictiveSupport !== 'boolean'"));
assert.ok(loader.includes('data.capabilities.contextBundles !== Boolean(nextBundleConfig)'));
assert.ok(loader.indexOf('data.capabilities.contextBundles !== Boolean(nextBundleConfig)') < loader.indexOf('if (!applyRuntimeAuthorization(runtimeAuthorization))'));
assert.ok(loader.includes('Number.isSafeInteger(value.bundleVersion)'));
assert.ok(loader.includes('Number.isSafeInteger(expiresAt)'));
assert.ok(embedClient.includes("event.data?.type !== 'answerlattice-widget-bootstrap'"));
assert.ok(embedClient.includes('event.source !== window.parent'));
assert.ok(embedClient.includes('rawApiKey !== nextApiKey || !WIDGET_KEY_PATTERN.test(nextApiKey)'));
assert.ok(widgetClient.includes('Number.isInteger(input.contextVersion)'));
assert.ok(!widgetClient.includes('output.contextVersion = Math.floor(input.contextVersion)'));
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/guidance-outcome');
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/search');
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/feedback');
assertPublicWidgetFetchHasNoReferrerPolicy('/api/widget/escalation');
assert.ok(widgetConfigRoute.includes("response.headers.set('Cache-Control', 'private, no-store')"));
assert.ok(widgetConfigRoute.includes('saveAnswerlatticeWidgetConfigAdmin({'));
assert.ok(widgetConfigRoute.includes("code: 'ANSWERLATTICE_WIDGET_CONFIG_CONFLICT'"));
assert.ok(widgetConfigRoute.indexOf('checkRateLimit({') < widgetConfigRoute.indexOf('requireAnswerlatticePermission(request, session'));
assert.ok(widgetKeyRoute.includes('ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS'));
assert.ok(widgetKeyRoute.includes('response.headers.set(name, value)'));
assert.ok(widgetKeyRoute.includes('Revoke an old key before creating another.'));
assert.ok(!widgetKeyRoute.includes('Delete an old key before creating another.'));
assert.ok(publicWidgetConfigRoute.includes('const buildErrorResponse'));
assert.ok(publicWidgetConfigRoute.includes("'Cache-Control': 'no-store'"));
assert.ok(publicWidgetConfigRoute.includes("buildErrorResponse(request, { error: 'Origin not allowed' }, 403)"));
assert.ok(widgetActivityRoute.includes("'Cache-Control': 'private, no-store'"));
assert.ok(widgetActivityRoute.includes('canonicalIsoTimestampToMillis'));
assert.ok(widgetActivityRoute.includes('if (!Number.isFinite(date.getTime())) return null;'));
assert.ok(widgetActivityRoute.includes('data.pId === PRODUCT_IDS.ANSWERLATTICE'));
assert.ok(widgetActivityRoute.includes('normalizeAnswerlatticeScopeDocumentId(data.tId) === tenantId'));
assert.ok((widgetActivityRoute.match(/\.where\('pId', '==', PRODUCT_IDS\.ANSWERLATTICE\)/g) || []).length >= 2);

process.stdout.write('Answerlattice widget configuration contracts passed.\n');
