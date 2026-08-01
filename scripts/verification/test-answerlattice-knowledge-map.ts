import assert from 'node:assert/strict';

import {
    buildAnswerlatticePublicArticleOutline,
    renderPublicTiptapArticle,
} from '@lib/answerlattice/publicRichText';
import {
    getAnswerlatticeEntityGraphFreshness,
    parseAnswerlatticeCurrentGraphSourceVersions,
    parseAnswerlatticeEntityGraphIndex,
} from '@lib/answerlattice/runtimeSummaryContracts';
import {
    hashAnswerlatticeEntityGraphPayload,
    isCurrentAnswerlatticeEntityGraphIndex,
} from '../../functions-answerlattice/src/answerlattice/entityGraphIndexState';

const scope = { tId: 41, sId: 73 };
const validGraphSummary = {
    pId: 'AL',
    ...scope,
    lastRebuiltAt: new Date(),
    version: 2,
    entityCount: 2,
    relationCount: 1,
    sourceVersions: {
        entities: 4,
        entityRelations: 7,
        canonical: 9,
    },
    graph: {
        billing: {
            name: 'Billing',
            type: 'feature',
            currentVersion: 2_004_001,
            related: ['starter-plan', 'starter-plan'],
            relationTypes: {
                available_in: ['starter-plan', 'starter-plan'],
            },
            outgoingRelationTypes: {
                available_in: ['starter-plan', 'starter-plan'],
            },
            incomingRelationTypes: {},
            answerCount: 3,
            driftedAnswerCount: 1,
            reviewRequiredAnswerCount: 2,
        },
        'starter-plan': {
            name: 'Starter plan',
            type: 'plan',
            related: ['billing'],
            relationTypes: { available_in: ['billing'] },
            outgoingRelationTypes: {},
            incomingRelationTypes: { available_in: ['billing'] },
            answerCount: 1,
        },
    },
    privateMarker: 'must-not-project',
};
const graph = parseAnswerlatticeEntityGraphIndex(validGraphSummary, scope);

assert.ok(graph);
assert.deepEqual(graph?.graph.billing.related, ['starter-plan']);
assert.deepEqual(graph?.graph.billing.relationTypes.available_in, ['starter-plan']);
assert.deepEqual(graph?.graph.billing.outgoingRelationTypes?.available_in, ['starter-plan']);
assert.deepEqual(graph?.graph['starter-plan'].incomingRelationTypes?.available_in, ['billing']);
assert.deepEqual(graph?.sourceVersions, { entities: 4, entityRelations: 7, canonical: 9 });
assert.equal(graph?.graph.billing.currentVersion, 2_004_001);
assert.equal(graph?.graph.billing.driftedAnswerCount, 1);
assert.equal(graph?.graph.billing.reviewRequiredAnswerCount, 2);
assert.equal(graph?.graph['starter-plan'].driftedAnswerCount, 0);
assert.equal((graph as unknown as Record<string, unknown>).privateMarker, undefined);
assert.equal(parseAnswerlatticeEntityGraphIndex({ pId: 'ML', ...scope, graph: {} }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({ pId: 'AL', tId: 41, sId: 74, graph: {} }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({ ...validGraphSummary, lastRebuiltAt: 'yesterday' }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({ ...validGraphSummary, version: 0 }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({ ...validGraphSummary, entityCount: 3 }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({ ...validGraphSummary, relationCount: 2_001 }, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    graph: {
        ...validGraphSummary.graph,
        billing: { ...validGraphSummary.graph.billing, type: 'unknown' },
    },
}, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    graph: {
        ...validGraphSummary.graph,
        billing: {
            ...validGraphSummary.graph.billing,
            relationTypes: { invented_relation: ['starter-plan'] },
        },
    },
}, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    graph: {
        ...validGraphSummary.graph,
        billing: { ...validGraphSummary.graph.billing, related: ['missing-entity'] },
    },
}, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    graph: {
        ...validGraphSummary.graph,
        billing: { ...validGraphSummary.graph.billing, driftedAnswerCount: 4 },
    },
}, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    graph: {
        ...validGraphSummary.graph,
        billing: {
            ...validGraphSummary.graph.billing,
            incomingRelationTypes: undefined,
        },
    },
}, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    graph: {
        ...validGraphSummary.graph,
        billing: {
            ...validGraphSummary.graph.billing,
            outgoingRelationTypes: { requires: ['starter-plan'] },
        },
    },
}, scope), null);
assert.equal(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    sourceVersions: { entities: 1, entityRelations: -1, canonical: 2 },
}, scope), null);
assert.deepEqual(parseAnswerlatticeEntityGraphIndex({
    ...validGraphSummary,
    entityCount: 0,
    relationCount: 0,
    graph: {},
}, scope)?.graph, {});

const currentSourceVersions = parseAnswerlatticeCurrentGraphSourceVersions({
    schemaVersion: 1,
    pId: 'AL',
    ...scope,
    workspaceProfile: 0,
    widgetConfig: 0,
    kb: 0,
    docsNav: 0,
    entities: 4,
    entityRelations: 7,
    canonical: 10,
    surfaces: 0,
    releases: 0,
    branding: 0,
    mcpPolicy: 0,
    predictiveTriggers: 0,
}, scope);
assert.deepEqual(currentSourceVersions, { entities: 4, entityRelations: 7, canonical: 10 });
assert.equal(getAnswerlatticeEntityGraphFreshness(graph?.sourceVersions, currentSourceVersions), 'stale');
assert.equal(getAnswerlatticeEntityGraphFreshness(
    graph?.sourceVersions,
    { entities: 4, entityRelations: 7, canonical: 9 },
), 'current');
assert.equal(getAnswerlatticeEntityGraphFreshness(
    graph?.sourceVersions,
    { entities: 3, entityRelations: 7, canonical: 9 },
), 'unverified');
assert.equal(getAnswerlatticeEntityGraphFreshness(undefined, currentSourceVersions), 'unverified');
assert.equal(parseAnswerlatticeCurrentGraphSourceVersions({
    pId: 'ML',
    ...scope,
    entities: 4,
    entityRelations: 7,
    canonical: 9,
}, scope), null);

const storedGraphPayload = {
    entityCount: validGraphSummary.entityCount,
    relationCount: validGraphSummary.relationCount,
    graph: validGraphSummary.graph,
    sourceVersions: validGraphSummary.sourceVersions,
    interactionRules: [],
};
const storedGraphHash = hashAnswerlatticeEntityGraphPayload(storedGraphPayload);
const storedGraphEnvelope = {
    pId: 'AL',
    ...scope,
    lastRebuiltAt: new Date(),
    version: 2,
    entityCount: storedGraphPayload.entityCount,
    relationCount: storedGraphPayload.relationCount,
    graph: storedGraphPayload.graph,
    sourceVersions: storedGraphPayload.sourceVersions,
    sourceHash: storedGraphHash,
};
const graphStateExpectation = {
    ...scope,
    payload: storedGraphPayload,
    sourceHash: storedGraphHash,
    preservesInteractionRules: false,
};
assert.equal(
    isCurrentAnswerlatticeEntityGraphIndex(storedGraphEnvelope, graphStateExpectation),
    true,
);
assert.equal(
    isCurrentAnswerlatticeEntityGraphIndex({
        ...storedGraphEnvelope,
        graph: {},
    }, graphStateExpectation),
    false,
    'a matching stored source hash must not hide a corrupted graph payload',
);
assert.equal(
    isCurrentAnswerlatticeEntityGraphIndex({
        ...storedGraphEnvelope,
        stalePrivateField: true,
    }, graphStateExpectation),
    false,
    'stale summary fields must be reconciled by an exact replacement',
);
assert.equal(
    isCurrentAnswerlatticeEntityGraphIndex({
        ...storedGraphEnvelope,
        version: '2',
    }, graphStateExpectation),
    false,
    'invalid summary envelope metadata must not be treated as unchanged',
);
assert.equal(
    isCurrentAnswerlatticeEntityGraphIndex({
        ...storedGraphEnvelope,
        sId: scope.sId + 1,
    }, graphStateExpectation),
    false,
    'wrong-scope summary metadata must not be treated as unchanged',
);

const article = {
    type: 'doc',
    content: [
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Connect Slack' }],
        },
        {
            type: 'paragraph',
            content: [{
                type: 'text',
                text: '<script>alert("x")</script>',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            }],
        },
        {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Permissions' }],
        },
        {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Connect Slack' }],
        },
    ],
};

const outline = buildAnswerlatticePublicArticleOutline(article);
assert.equal(outline.length, 2);
assert.equal(outline[0].id, 'topic-connect-slack');
assert.equal(outline[0].children[0].id, 'topic-permissions');
assert.equal(outline[1].id, 'topic-connect-slack-2');

const rendered = renderPublicTiptapArticle(article);
assert.deepEqual(rendered.outline, outline);
assert.match(rendered.safeHtml, /<h2 id="topic-connect-slack">/);
assert.match(rendered.safeHtml, /<h3 id="topic-permissions">/);
assert.match(rendered.safeHtml, /<h2 id="topic-connect-slack-2">/);
assert.ok(rendered.safeHtml.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
assert.equal(rendered.safeHtml.includes('javascript:'), false);

const publicUrlBoundaryArticle = {
    type: 'doc',
    content: [
        {
            type: 'paragraph',
            content: [
                {
                    type: 'text',
                    text: 'Internal help',
                    marks: [{ type: 'link', attrs: { href: '/help/getting-started' } }],
                },
                {
                    type: 'text',
                    text: 'External help',
                    marks: [{ type: 'link', attrs: { href: 'https://docs.example.com/article' } }],
                },
                {
                    type: 'text',
                    text: 'Backslash escape',
                    marks: [{ type: 'link', attrs: { href: '/\\attacker.example/link' } }],
                },
                {
                    type: 'text',
                    text: 'Credential leak',
                    marks: [{ type: 'link', attrs: { href: 'https://user:secret@example.com/link' } }],
                },
            ],
        },
        { type: 'image', attrs: { src: '/images/help.png', alt: 'Internal image' } },
        { type: 'image', attrs: { src: '/\\attacker.example/image.png', alt: 'Escaped image' } },
        {
            type: 'image',
            attrs: {
                src: 'https://user:secret@example.com/image.png',
                alt: 'Credential image',
            },
        },
    ],
};
const publicUrlBoundaryHtml = renderPublicTiptapArticle(publicUrlBoundaryArticle).safeHtml;
assert.match(publicUrlBoundaryHtml, /href="\/help\/getting-started"/);
assert.match(publicUrlBoundaryHtml, /href="https:\/\/docs\.example\.com\/article"/);
assert.match(publicUrlBoundaryHtml, /src="\/images\/help\.png"/);
assert.equal(publicUrlBoundaryHtml.includes('attacker.example'), false);
assert.equal(publicUrlBoundaryHtml.includes('user:secret'), false);
assert.equal(publicUrlBoundaryHtml.includes('href="//'), false);

const bounded = buildAnswerlatticePublicArticleOutline({
    type: 'doc',
    content: Array.from({ length: 60 }, (_, index) => ({
        type: 'heading',
        attrs: { level: index % 8 },
        content: [{ type: 'text', text: `Topic ${index}` }],
    })),
});
const flatten = (nodes: typeof bounded): typeof bounded => nodes.flatMap(node => [node, ...flatten(node.children)]);
assert.equal(flatten(bounded).length, 40);
assert.ok(flatten(bounded).every(node => node.level >= 1 && node.level <= 6));

console.log('Answerlattice Knowledge Map contracts passed.');
