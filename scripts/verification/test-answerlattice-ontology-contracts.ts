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
const invalidationOwnershipSource = fs.readFileSync(
    path.join(root, 'src/lib/answerlattice/invalidationOwnership.ts'),
    'utf8',
);
assert.match(
    invalidationOwnershipSource,
    /sourceVersionsSnapshot\.exists[\s\S]*data\.pId !== PRODUCT_IDS\.ANSWERLATTICE[\s\S]*data\.tId !== scope\.tId[\s\S]*data\.sId !== scope\.sId/,
    'compiled source-version invalidation must reject a deterministic row outside exact product/workspace ownership',
);
assert.match(
    invalidationOwnershipSource,
    /manifestSnapshot\.exists[\s\S]*!isAnswerlatticeContextBundleManifestForScope/,
    'bundle invalidation must reject a foreign or malformed deterministic manifest',
);
assert.match(
    invalidationOwnershipSource,
    /getAnswerlatticeMissingBundleManifestBase[\s\S]*sourceVersions: normalizeCompiledSourceVersions\(\{\}\)[\s\S]*stats: EMPTY_BUNDLE_STATS/,
    'first invalidation must materialize a complete valid manifest base instead of a partial stale row',
);
assert.match(
    ontologyServerSource,
    /readInvalidationOwnership\(transaction, scope\)[\s\S]*addInvalidationWrites\(transaction, scope, invalidationOwnership/,
    'ontology writes must read transaction-current invalidation ownership before mutation',
);
assert.match(
    ontologyServerSource,
    /const documentIsInScope[\s\S]*data\.pId === PRODUCT_IDS\.ANSWERLATTICE/,
    'server-owned ontology mutations must require exact Answerlattice product identity',
);
assert.match(
    ontologyServerSource,
    /const slugIndexIsOwnedBy[\s\S]*documentIsInScope\(data, scope\)[\s\S]*data\.slug === slug[\s\S]*data\.entityId === entityId/,
    'deterministic slug-index reuse and deletion must require exact product, workspace, slug and entity ownership',
);
assert.match(
    ontologyServerSource,
    /const searchIndexIsOwnedBy[\s\S]*documentIsInScope\(data, scope\)[\s\S]*data\.entityId === entityId/,
    'deterministic search-index updates must require exact product, workspace and entity ownership',
);
assert.match(
    ontologyServerSource,
    /if \(slugSnapshot\.exists\) \{[\s\S]*ontology_slug_conflict/,
    'entity creation must never overwrite a pre-existing deterministic slug-index row',
);
assert.match(
    ontologyServerSource,
    /oldSlugSnapshot\.exists[\s\S]*!slugIndexIsOwnedBy\(oldSlugSnapshot\.data\(\), scope, existing\.slug, action\.entityId\)/,
    'entity rename must fail before deleting a slug-index row outside exact ownership',
);
assert.match(
    ontologyServerSource,
    /searchIndexSnapshot\.exists[\s\S]*!searchIndexIsOwnedBy\(searchIndexSnapshot\.data\(\), scope, action\.entityId\)/,
    'entity update must fail before merging into a search-index row outside exact ownership',
);
assert.match(
    ontologyServerSource,
    /indexSnapshot\.exists[\s\S]*!searchIndexIsOwnedBy\(indexSnapshot\.data\(\), scope, action\.entityId\)/,
    'search-index rebuild must fail before merging into a row outside exact ownership',
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

const requiredProductScopedSources = [
    'src/database/answerlattice/entities.ts',
    'src/database/answerlattice/entityCandidates.ts',
    'src/database/answerlattice/canonicalAnswers.ts',
    'src/database/answerlattice/mutationProposals.ts',
    'src/database/answerlattice/predictiveTriggers.ts',
    'src/database/answerlattice/auditLogs.ts',
    'src/database/answerlattice/faqs.ts',
    'src/database/answerlattice/productSurfaces.ts',
    'src/lib/answerlattice/entityLookup.ts',
    'src/lib/answerlattice/contextBundleBuilderServer.ts',
    'src/lib/answerlattice/faqRetrieval.ts',
    'src/lib/answerlattice/firstTrustedAnswerPackServer.ts',
    'src/lib/answerlattice/governanceServer.ts',
    'src/lib/answerlattice/knowledgeIntake.ts',
    'src/lib/answerlattice/ontologyServer.ts',
    'src/lib/answerlattice/productSurfaceContentServer.ts',
    'src/lib/answerlattice/publicContentCache.ts',
    'src/app/api/answerlattice/articles/extract-entities/route.ts',
    'src/app/api/answerlattice/faqs/generate-from-article/route.ts',
    'src/app/api/answerlattice/mutation-proposals/regenerate-draft/route.ts',
    'src/app/api/platform/answerlattice-intake/route.ts',
    'functions-answerlattice/src/answerlattice/aiCapacityReservationRecovery.ts',
    'functions-answerlattice/src/answerlattice/answerlatticeNightly.ts',
    'functions-answerlattice/src/answerlattice/contextBundleBuilder.ts',
    'functions-answerlattice/src/answerlattice/draftGenerator.ts',
    'functions-answerlattice/src/answerlattice/kbGenerationWatchdog.ts',
    'functions-answerlattice/src/answerlattice/knowledgeIntakeSummary.ts',
    'functions-answerlattice/src/answerlattice/onboardingBootstrap.ts',
    'functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts',
    'functions-answerlattice/src/answerlattice/resolutionExtractor.ts',
];
const productSensitiveCollections = [
    'ANSWERLATTICE_ENTITIES',
    'ANSWERLATTICE_ENTITY_RELATIONS',
    'ANSWERLATTICE_ENTITY_SEARCH_INDEX',
    'ANSWERLATTICE_CANONICAL_ANSWERS',
    'ANSWERLATTICE_MUTATION_PROPOSALS',
    'ANSWERLATTICE_ENTITY_CANDIDATES',
    'ANSWERLATTICE_PREDICTIVE_TRIGGERS',
    'ANSWERLATTICE_AUDIT_LOGS',
    'ANSWERLATTICE_FAQS',
    'ANSWERLATTICE_PRODUCT_SURFACES',
    'ANSWERLATTICE_RELEASES',
    'ANSWERLATTICE_SIGNAL_EVENTS',
    'ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS',
    'ANSWERLATTICE_KNOWLEDGE_SOURCES',
    'ANSWERLATTICE_INTAKE_REVIEW_ITEMS',
    'ANSWERLATTICE_INTAKE_USAGE_LEDGER',
    'ANSWERLATTICE_AI_CAPACITY_RESERVATIONS',
    'KB_ARTICLES',
    'KB_GENERATION_JOBS',
];

for (const relativePath of requiredProductScopedSources) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    for (const collectionName of productSensitiveCollections) {
        const collectionPattern = new RegExp(`(?:collection\\([^\\n]*${collectionName}[^\\n]*\\)|${collectionName}[^\\n]*;)`, 'g');
        let match: RegExpExecArray | null;
        while ((match = collectionPattern.exec(source))) {
            const tail = source.slice(match.index, match.index + 1_500);
            const terminal = tail.search(/\\.(?:get|count)\\(\\)/);
            if (terminal < 0) continue;
            const querySource = tail.slice(0, terminal);
            if (!querySource.includes('.where(')) continue;
            assert.match(
                querySource,
                /where\(['"]pId['"],\s*['"]==['"],/,
                `${relativePath} has a ${collectionName} query without an explicit product partition`,
            );
        }
    }
}

const sharedTenantQueryCollections = new Set(['DB_COLLECTIONS.USERS', 'DB_COLLECTIONS.SUPPORT_TICKETS']);
for (const relativePath of requiredProductScopedSources) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    const tenantPredicate = /\.where\(['"]tId['"]/g;
    let match: RegExpExecArray | null;
    while ((match = tenantPredicate.exec(source))) {
        const preceding = source.slice(Math.max(0, match.index - 700), match.index);
        const collectionStart = preceding.lastIndexOf('.collection(');
        if (collectionStart < 0) continue;
        const querySource = preceding.slice(collectionStart);
        const collectionExpression = querySource.match(/^\.collection\(([^)]+)\)/)?.[1]?.trim();
        if (collectionExpression && sharedTenantQueryCollections.has(collectionExpression)) continue;
        assert.match(
            querySource,
            /where\(['"]pId['"],\s*['"]==['"],/,
            `${relativePath} has a tenant query without an explicit Answerlattice product partition`,
        );
    }
}

for (const indexFile of ['firestore-answerlattice.indexes.json', 'firestore.indexes.json']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, indexFile), 'utf8')) as {
        indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string }> }>;
    };
    const hasIndex = (collectionGroup: string, fields: string) => manifest.indexes.some((entry) => (
        entry.collectionGroup === collectionGroup
        && entry.fields.map(field => field.fieldPath).join(',') === fields
    ));
    assert.ok(hasIndex('answerlattice_entities', 'pId,tId,sId,status'), `${indexFile} lacks product-scoped entity status index`);
    assert.ok(hasIndex('answerlattice_entities', 'pId,tId,sId,type'), `${indexFile} lacks product-scoped entity type index`);
    assert.ok(hasIndex('answerlattice_entityRelations', 'pId,tId,sId,fromEntityId'), `${indexFile} lacks product-scoped relation index`);
    assert.ok(hasIndex('answerlattice_entitySearchIndex', 'pId,tId,sId,prefixTokens'), `${indexFile} lacks product-scoped prefix index`);
    assert.ok(hasIndex('answerlattice_canonicalAnswers', 'pId,tId,sId,status'), `${indexFile} lacks product-scoped canonical status index`);
    assert.ok(hasIndex('answerlattice_mutationProposals', 'pId,tId,sId,relatedEntityIds,status'), `${indexFile} lacks product-scoped proposal entity index`);
}

process.stdout.write('Answerlattice ontology contract tests passed.\n');
