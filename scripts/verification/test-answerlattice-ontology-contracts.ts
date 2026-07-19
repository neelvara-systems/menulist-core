import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Timestamp } from 'firebase/firestore';
import {
    AnswerlatticeOntologyActionResultSchema,
    AnswerlatticeOntologyActionSchema,
    normalizeStoredAnswerlatticeEntity,
    normalizeStoredAnswerlatticeEntityCandidate,
} from '../../src/lib/answerlattice/ontologyContracts';

const create = {
    action: 'create_entity',
    requestId: 'ontology_request_1',
    entity: {
        type: 'feature',
        name: 'Billing Retry',
        slug: 'billing-retry',
        description: 'Retries failed billing operations.',
        status: 'active',
        aliases: ['retry billing'],
        currentVersion: 1_000_000,
    },
};

assert.equal(AnswerlatticeOntologyActionSchema.safeParse(create).success, true);
assert.equal(AnswerlatticeOntologyActionSchema.safeParse({ ...create, tenantId: 1 }).success, false);
assert.equal(AnswerlatticeOntologyActionSchema.safeParse({
    action: 'update_entity', requestId: 'ontology_request_2', entityId: 'entity-1', changes: { type: 'plan' },
}).success, false, 'entity type must not enter the update contract');
assert.equal(AnswerlatticeOntologyActionSchema.safeParse({
    action: 'create_relation', requestId: 'ontology_request_3', fromEntityId: 'entity-1', toEntityId: 'entity-1', relationType: 'requires',
}).success, false);

const legacy = normalizeStoredAnswerlatticeEntity({
    tId: 1, sId: 101, type: 'feature', name: 'Billing Retry', slug: 'billing-retry',
    description: 'Retries failed billing operations.', status: 'active', currentVersion: 1_000_000,
    createdOn: Timestamp.now(),
}, 'entity-1');
assert.equal(legacy?.pId, 'AL', 'legacy product-specific rows without pId must normalize to AL');
assert.equal(normalizeStoredAnswerlatticeEntity({ ...legacy, pId: 'ML' }, 'entity-1'), null);
assert.equal(normalizeStoredAnswerlatticeEntityCandidate({
    tId: 1, sId: 101, name: 'Billing Retry', type: 'feature', confidence: 0.8,
    frequency: { articles: 1, tickets: 0, chat: 0 }, description: 'Billing retry.', status: 'pending',
}, 'candidate-1')?.status, 'pending');
assert.equal(normalizeStoredAnswerlatticeEntityCandidate({
    pId: 'AL', tId: 1, sId: 101, name: 'Billing Retry', type: 'feature', confidence: 0.8,
    frequency: { articles: 1, tickets: 0, chat: 0 }, description: 'Billing retry.', status: 'pending',
    sourceArticleIds: ['article-1'],
}, 'candidate-2')?.sourceArticleIds?.[0], 'article-1');
assert.equal(normalizeStoredAnswerlatticeEntityCandidate({
    pId: 'AL', tId: 1, sId: 101, name: 'Billing Retry', type: 'feature', confidence: 0.8,
    frequency: { articles: 1, tickets: 0, chat: 0 }, description: 'Billing retry.', status: 'pending',
    sourceArticleIds: ['invalid/article'],
}, 'candidate-3'), null, 'candidate provenance must use the KB article id boundary');
assert.equal(AnswerlatticeOntologyActionResultSchema.safeParse({
    success: true,
    action: 'create_entity',
    replayed: false,
    entity: legacy,
}).success, true);

const root = path.resolve(__dirname, '../..');
const ontologyServerSource = fs.readFileSync(path.join(root, 'src/lib/answerlattice/ontologyServer.ts'), 'utf8');
assert.match(
    ontologyServerSource,
    /const documentIsInScope[\s\S]*data\.pId === PRODUCT_IDS\.ANSWERLATTICE/,
    'server-owned ontology mutations must require exact Answerlattice product identity',
);
assert.match(ontologyServerSource, /ANSWERLATTICE_FAQ_MANAGEMENT_LIMIT \+ 1/);
assert.match(ontologyServerSource, /ANSWERLATTICE_PRODUCT_SURFACE_LIMIT \+ 1/);

const dashboardSource = fs.readFileSync(
    path.join(root, 'src/components/templates/answerlattice/governance/EntityManagementDashboard.tsx'),
    'utf8',
);
assert.match(dashboardSource, /create, update, deprecate, merge, addRelation, removeRelation/);
assert.equal(
    dashboardSource.includes("{ label: 'Deprecated', value: 'deprecated' }"),
    false,
    'deprecation must stay an explicit dependency-checked action instead of an edit-field value',
);

const nightlySource = fs.readFileSync(
    path.join(root, 'functions-answerlattice/src/answerlattice/answerlatticeNightly.ts'),
    'utf8',
);
assert.match(nightlySource, /limit\(SCHEDULER_LIMITS\.graphRelationsPerTenant \+ 1\)/);
assert.match(nightlySource, /graph relation limit exceeded; existing graph index was preserved/);

process.stdout.write('Answerlattice ontology contract tests passed.\n');
