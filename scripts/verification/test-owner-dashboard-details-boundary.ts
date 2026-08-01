import assert from 'node:assert/strict';

import { buildMenuAnalyticsDetailSections } from '../../src/lib/analytics/ownerDashboardDetails';

const validSections: ReturnType<typeof buildMenuAnalyticsDetailSections> = Reflect.apply(
    buildMenuAnalyticsDetailSections,
    undefined,
    [{
    metrics: {
        menuVisits: 12.9,
        itemClicks: 2,
        menuSessions: 4,
        engagedSessions: 3,
        engagedSessionRate: 140,
        actionSessions: 1,
        actionRate: -2,
        smartPicksRendered: Number.POSITIVE_INFINITY,
        smartPicksClicks: 0,
    },
    topItems: [
        { itemId: 'item-1', name: '  Masala\nTea ', clicks: 2 },
        { itemId: { malformed: true }, name: ['bad'], clicks: 100 },
    ],
    sourceQuality: [
        {
            source: 'qr',
            label: '  QR\nCode ',
            menuSessions: 3,
            actionSessions: 1,
            actionClicks: 1,
            actionRate: 250,
        },
    ],
    menuActions: {
        call: 2,
        whatsapp: Symbol('bad'),
        directions: 0,
        reserve: 0,
        order: 0,
    },
    topSearchTerms: [
        { term: '  tea\nnear me ', count: 4.8 },
        { term: { malformed: true }, count: 10 },
    ],
    }],
);

const validJson = JSON.stringify(validSections);
assert.ok(!validJson.includes('[object Object]'));
assert.ok(!validJson.includes('Infinity'));
assert.ok(!validJson.includes('NaN'));

const signals = validSections.find(({ key }) => key === 'signals');
assert.ok(signals);
assert.equal(signals.rows.find(({ key }) => key === 'menu-visits')?.value, '12');
assert.equal(signals.rows.find(({ key }) => key === 'engaged-sessions')?.detail, '100% of menu sessions');
assert.ok(!signals.rows.some(({ key }) => key === 'smart-picks-shown'));

const topItems = validSections.find(({ key }) => key === 'top-items');
assert.deepEqual(topItems?.rows.map(({ label, value }) => ({ label, value })), [
    { label: '1. Masala Tea', value: '2 taps' },
]);

const sources = validSections.find(({ key }) => key === 'source-quality');
assert.equal(sources?.rows[0].label, 'QR Code');
assert.match(sources?.rows[0].detail || '', /100% action rate$/);

const search = validSections.find(({ key }) => key === 'search');
assert.equal(search?.rows.find(({ key }) => key.startsWith('search-'))?.label, 'tea near me');
assert.equal(search?.rows.find(({ key }) => key.startsWith('search-'))?.value, '4');

let accessorExecuted = false;
const accessorData: Record<string, unknown> = {};
Object.defineProperty(accessorData, 'metrics', {
    enumerable: true,
    get() {
        accessorExecuted = true;
        throw new Error('persisted analytics accessor must not execute');
    },
});
assert.deepEqual(Reflect.apply(buildMenuAnalyticsDetailSections, undefined, [accessorData]), []);
assert.equal(accessorExecuted, false);

assert.deepEqual(Reflect.apply(buildMenuAnalyticsDetailSections, undefined, ['malformed']), []);
assert.deepEqual(Reflect.apply(buildMenuAnalyticsDetailSections, undefined, [[{ metrics: {} }]]), []);

const lifetimeSections: ReturnType<typeof buildMenuAnalyticsDetailSections> = Reflect.apply(
    buildMenuAnalyticsDetailSections,
    undefined,
    [{
    lifetimeMetrics: {
        totalViews: 9,
        totalClicks: 3,
        totalSearches: 2,
        totalMenuActionClicks: 1,
    },
    }],
);
const lifetimeSignals = lifetimeSections.find(({ key }) => key === 'signals');
assert.equal(lifetimeSignals?.rows.find(({ key }) => key === 'menu-visits')?.value, '9');
assert.equal(lifetimeSignals?.rows.find(({ key }) => key === 'item-clicks')?.value, '3');

const fallbackTranslation: ReturnType<typeof buildMenuAnalyticsDetailSections> = Reflect.apply(
    buildMenuAnalyticsDetailSections,
    undefined,
    [
    { metrics: { menuVisits: 1 } },
    () => ({ malformed: true }),
    ],
);
assert.equal(fallbackTranslation[0].title, 'Menu Signals');
assert.equal(fallbackTranslation[0].rows[0].label, 'Menu views');

console.log('Owner dashboard analytics detail boundary tests passed.');
