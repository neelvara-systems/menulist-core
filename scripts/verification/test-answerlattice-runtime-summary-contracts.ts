import assert from 'assert';
import {
    parseAnswerlatticeEntityGraphIndex,
    parseAnswerlatticePredictiveTriggerIndex,
} from '@lib/answerlattice/runtimeSummaryContracts';
import {
    getContextContentSummaryDocId,
    normalizeAnswerlatticeSurfaceContentSummary,
    normalizeStoredAnswerlatticeProductSurface,
    parseProductSurfaceSaveInput,
    resolveSurfaceContentForContext,
    scoreSurfaceRouteForContextPath,
} from '@lib/answerlattice/productSurfaceContent';
import { AnswerlatticeContextSchema } from '@lib/validation/contextSchema';
import { validateAnswerlatticePageContext } from '../../packages/answerlattice-web/src';

const scope = { tId: 7, sId: 9 };
const trigger = {
    pId: 'AL',
    ...scope,
    id: 'trigger-1',
    name: 'Billing help',
    kind: 'predictive_help',
    conditions: { page: 'billing' },
    action: { type: 'help_card' },
    priority: 10,
    cooldownHours: 24,
    status: 'active',
    source: 'manual',
    sourceContext: { email: 'private@example.com' },
    createdBy: 'private actor',
    traceId: 'private trace',
};
const predictive = parseAnswerlatticePredictiveTriggerIndex({
    pId: 'AL',
    ...scope,
    lastUpdated: new Date('2026-07-23T00:00:00.000Z'),
    version: 1,
    triggerCount: 1,
    activeTriggerCount: 1,
    triggers: {
        'trigger-1': trigger,
        foreign: { ...trigger, id: 'foreign', sId: 10 },
        'missing-product': { ...trigger, pId: undefined },
        'string-scope': { ...trigger, tId: '7' },
        'fractional-priority': { ...trigger, priority: 1.5 },
        'bad-cooldown': { ...trigger, cooldownHours: '24' },
        'bad-source': { ...trigger, source: 'imported' },
        'bad-action': { ...trigger, action: { type: 'redirect' } },
        'path/shaped': trigger,
    },
}, scope);
assert.ok(predictive);
assert.equal(predictive?.triggerCount, 1);
assert.equal(predictive?.activeTriggerCount, 1);
assert.deepEqual(Object.keys(predictive?.triggers || {}), ['trigger-1']);
assert.equal('sourceContext' in (predictive?.triggers['trigger-1'] as unknown as Record<string, unknown>), false);
assert.equal('createdBy' in (predictive?.triggers['trigger-1'] as unknown as Record<string, unknown>), false);
assert.equal('traceId' in (predictive?.triggers['trigger-1'] as unknown as Record<string, unknown>), false);
assert.equal(parseAnswerlatticePredictiveTriggerIndex({ pId: 'AL', ...scope, sId: 10, triggers: {} }, scope), null);
assert.equal(parseAnswerlatticePredictiveTriggerIndex({ ...scope, triggers: {} }, scope), null);
assert.equal(parseAnswerlatticePredictiveTriggerIndex({
    pId: 'AL', ...scope, version: 1, triggerCount: 0, activeTriggerCount: 0, triggers: {},
}, scope), null);
assert.equal(parseAnswerlatticePredictiveTriggerIndex({
    pId: 'AL', ...scope, lastUpdated: new Date(), version: 1,
    triggerCount: 2, activeTriggerCount: 1, triggers: { 'trigger-1': trigger },
}, scope), null);

const graph = parseAnswerlatticeEntityGraphIndex({
    pId: 'AL',
    ...scope,
    graph: {
        billing: {
            name: 'Billing',
            type: 'feature',
            related: Array.from({ length: 30 }, (_, index) => `entity-${index}`),
            relationTypes: { depends_on: ['entity-1', 'entity-2'] },
            answerCount: 2,
        },
    },
    interactionRules: [],
}, scope);
assert.ok(graph);
assert.equal(graph?.graph.billing.related.length, 20);
assert.equal(parseAnswerlatticeEntityGraphIndex({ pId: 'ML', ...scope, graph: {} }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({ pId: 'AL', ...scope, tId: 8, graph: {} }, scope), null);

const storedSurface = normalizeStoredAnswerlatticeProductSurface({
    pId: 'AL',
    ...scope,
    key: 'billing',
    label: 'Billing',
    routePatterns: ['/billing'],
    entityIds: ['billing', 'unresolved'],
    tags: ['Billing'],
    active: true,
    priority: 5,
    privateNote: 'do not expose',
}, scope, 'surface_7_9_billing');
assert.ok(storedSurface);
assert.equal(storedSurface?.pId, 'AL');
assert.deepEqual(storedSurface?.entityIds, ['billing']);
assert.equal('privateNote' in (storedSurface as unknown as Record<string, unknown>), false);
assert.equal(normalizeStoredAnswerlatticeProductSurface({ pId: 'ML', ...scope, key: 'billing', label: 'Billing' }, scope, 'surface_7_9_billing'), null);
assert.equal(normalizeStoredAnswerlatticeProductSurface({ pId: 'AL', ...scope, tId: '7', key: 'billing', label: 'Billing' }, scope, 'surface_7_9_billing'), null);
assert.throws(() => parseProductSurfaceSaveInput({ label: 'Billing' }, { tId: '7' as unknown as number, sId: 9 }));
assert.throws(() => getContextContentSummaryDocId('7' as unknown as number, 9));

const surfaceSummary = normalizeAnswerlatticeSurfaceContentSummary({
    pId: 'AL',
    ...scope,
    generatedAt: { seconds: 1, nanoseconds: 0 },
    source: 'private source',
    surfaceCount: 99,
    articleCount: 1,
    changelogCount: 1,
    ticketCount: 2,
    surfaces: {
        billing: {
            key: 'billing',
            label: 'Billing',
            routePatterns: ['/billing'],
            feature: 'Billing',
            entityIds: ['billing', 'unresolved'],
            articles: [{ id: 'article_1', title: 'Refunds', categoryTitle: 'Billing', privateNote: 'hidden' }],
            faqs: [{ id: 'faq_1', question: 'How do refunds work?', answer: 'Refunds are visible.', articleId: 'article_1', traceId: 'hidden' }],
            changelogs: [{ id: 'change_1', pageId: 'page_1', title: 'Release', releasedOn: { seconds: 1, nanoseconds: 0 }, privateNote: 'hidden' }],
            tickets: { total: 2, open: 5, recentDisplayIds: ['T1', 'T1', 'x'.repeat(50)] },
            privateNote: 'hidden',
        },
        'bad/key': {
            key: 'bad/key',
            label: 'Invalid',
            routePatterns: ['/bad'],
            articles: [],
            changelogs: [],
            tickets: { total: 0, open: 0, recentDisplayIds: [] },
        },
    },
}, scope, 'contextContent_7_9');
assert.ok(surfaceSummary);
assert.equal(surfaceSummary?.pId, 'AL');
assert.equal(surfaceSummary?.surfaceCount, 1);
assert.equal(surfaceSummary?.faqCount, 0);
assert.equal('source' in (surfaceSummary as unknown as Record<string, unknown>), false);
assert.equal('privateNote' in (surfaceSummary?.surfaces.billing as unknown as Record<string, unknown>), false);
assert.equal('privateNote' in (surfaceSummary?.surfaces.billing.articles[0] as unknown as Record<string, unknown>), false);
assert.equal('traceId' in ((surfaceSummary?.surfaces.billing.faqs || [])[0] as unknown as Record<string, unknown>), false);
assert.equal(surfaceSummary?.surfaces.billing.tickets.open, 2);
assert.deepEqual(surfaceSummary?.surfaces.billing.tickets.recentDisplayIds, ['T1']);
assert.equal(normalizeAnswerlatticeSurfaceContentSummary({ pId: 'ML', ...scope, surfaces: {}, surfaceCount: 0, articleCount: 0, changelogCount: 0, ticketCount: 0 }, scope), null);
assert.equal(normalizeAnswerlatticeSurfaceContentSummary({ pId: 'AL', ...scope, tId: '7', surfaces: {}, surfaceCount: 0, articleCount: 0, changelogCount: 0, ticketCount: 0 }, scope), null);

const routeSummary = normalizeAnswerlatticeSurfaceContentSummary({
    pId: 'AL',
    ...scope,
    surfaceCount: 3,
    articleCount: 0,
    faqCount: 0,
    changelogCount: 0,
    ticketCount: 0,
    surfaces: {
        global: {
            key: 'global',
            label: 'Global',
            routePatterns: ['*'],
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
            articles: [],
            faqs: [],
            changelogs: [],
            tickets: { total: 0, open: 0, recentDisplayIds: [] },
        },
        billing: {
            key: 'billing',
            label: 'Billing',
            routePatterns: ['/billing/*'],
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
            articles: [],
            faqs: [],
            changelogs: [],
            tickets: { total: 0, open: 0, recentDisplayIds: [] },
        },
        billing_invoices: {
            key: 'billing_invoices',
            label: 'Billing invoices',
            routePatterns: ['/billing/invoices'],
            visibility: { helpWidget: true, helpCenter: false, changelog: true },
            articles: [],
            faqs: [],
            changelogs: [],
            tickets: { total: 0, open: 0, recentDisplayIds: [] },
        },
    },
}, scope, 'contextContent_7_9');
assert.ok(routeSummary);
assert.ok(scoreSurfaceRouteForContextPath(['/billing/*'], '/billing') > 0);
assert.ok(scoreSurfaceRouteForContextPath(['/billing/*'], '/billing/invoices') > 0);
assert.equal(scoreSurfaceRouteForContextPath(['/billing/*'], '/settings'), 0);
assert.equal(
    resolveSurfaceContentForContext(routeSummary, { path: '/billing/invoices' }, 'helpWidget')?.key,
    'billing_invoices',
);
assert.equal(
    resolveSurfaceContentForContext(routeSummary, { path: '/billing/invoices' }, 'helpCenter')?.key,
    'billing',
);
assert.equal(
    resolveSurfaceContentForContext(routeSummary, { path: '/billing/payment-methods' }, 'helpWidget')?.key,
    'billing',
);

const validatedServerContext = AnswerlatticeContextSchema.parse({
    path: 'https://example.com/billing/invoices?customer=private',
    state: 'Payment_Failed',
    version: 'v2.4.1',
});
assert.equal(validatedServerContext.path, '/billing/invoices');
assert.equal(validatedServerContext.page, undefined);
assert.equal(validatedServerContext.state, 'payment_failed');
assert.equal(validatedServerContext.version, '2.4.1');
assert.equal(AnswerlatticeContextSchema.safeParse({ path: '/billing/*' }).success, false);
assert.equal(AnswerlatticeContextSchema.safeParse({ version: 'latest' }).success, false);

const validatedSdkContext = validateAnswerlatticePageContext({
    path: 'https://example.com/billing/invoices?customer=private',
    state: 'Payment_Failed',
    version: 'v2.4.1',
});
assert.equal(validatedSdkContext.ok, true);
if (validatedSdkContext.ok) {
    assert.equal(validatedSdkContext.context.path, '/billing/invoices');
    assert.equal(validatedSdkContext.context.page, undefined);
    assert.equal(validatedSdkContext.context.state, 'payment_failed');
    assert.equal(validatedSdkContext.context.version, '2.4.1');
}
assert.equal(validateAnswerlatticePageContext({ path: '/billing/*' }).ok, false);
assert.equal(validateAnswerlatticePageContext({ version: 'latest' }).ok, false);

console.log('Answerlattice predictive, graph, and surface summary contracts passed.');
