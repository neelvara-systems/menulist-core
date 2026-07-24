#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { AnswerlatticeAccessContext } from '../../src/lib/answerlattice/accessControl';
import {
    executeAnswerlatticeOntologyAction,
    upsertAnswerlatticeExtractedEntityCandidate,
} from '../../src/lib/answerlattice/ontologyServer';
import {
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
} from '../../src/lib/answerlattice/compiledContext';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';

const access: AnswerlatticeAccessContext = {
    canUseManagement: true,
    currentRoleId: 'owner',
    isPlatformAdmin: false,
    permissions: {} as AnswerlatticeAccessContext['permissions'],
    roles: [],
    scope: { tenantId: 1, storeId: 101 },
    storeName: 'Example',
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' },
};

const entityInput = (slug: string, name = slug) => ({
    type: 'feature' as const,
    name,
    slug,
    description: `${name} product capability.`,
    status: 'active' as const,
    currentVersion: 1_000_000,
});

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const entityIdForRequest = (requestId: string) => `entity_${sha(`1:101:${requestId}`).slice(0, 32)}`;
const searchIndexId = (entityId: string) => `entity_index_${sha(`1:101:${entityId}`).slice(0, 32)}`;
const slugIndexId = (slug: string) => `entity_slug_${sha(`1:101:${slug}`).slice(0, 32)}`;

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db) throw new Error('Answerlattice Firestore Admin is required');
    for (const collection of [
        'answerlattice_entities', 'answerlattice_entitySlugIndex', 'answerlattice_entityRelations',
        'answerlattice_entitySearchIndex', 'answerlattice_entityCandidates', 'answerlattice_canonicalAnswers',
        'answerlattice_faqs', 'answerlattice_productSurfaces', 'kb_articles',
        'answerlattice_auditLogs', 'platformSummary',
    ]) await db.recursiveDelete(db.collection(collection));

    await db.collection('answerlattice_entities').doc('foreign-product-same-slug').set({
        pId: 'ML', tId: 1, sId: 101, type: 'feature', name: 'Foreign Billing Retry', slug: 'billing-retry',
        description: 'A foreign-product row must not reserve an Answerlattice slug.', status: 'active', currentVersion: 1_000_000,
    });

    const foreignCreateRequestId = 'ontology_foreign_slug_create';
    const foreignCreateSlugRef = db.collection('answerlattice_entitySlugIndex').doc(slugIndexId('foreign-owned-create'));
    await foreignCreateSlugRef.set({
        pId: 'ML', tId: 1, sId: 101, slug: 'foreign-owned-create',
        entityId: entityIdForRequest(foreignCreateRequestId), marker: 'preserve-create-collision',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: foreignCreateRequestId,
        entity: entityInput('foreign-owned-create', 'Foreign-owned Create'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.deepEqual((await foreignCreateSlugRef.get()).data(), {
        pId: 'ML', tId: 1, sId: 101, slug: 'foreign-owned-create',
        entityId: entityIdForRequest(foreignCreateRequestId), marker: 'preserve-create-collision',
    });

    const sourceVersionsRef = db.collection('platformSummary').doc(getAnswerlatticeSourceVersionsDocId(1, 101));
    await sourceVersionsRef.set({
        pId: 'ML', tId: 1, sId: 101, marker: 'preserve-source-version-collision',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_foreign_source_versions',
        entity: entityInput('foreign-source-versions', 'Foreign Source Versions'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await sourceVersionsRef.get()).data()?.marker, 'preserve-source-version-collision');
    assert.equal(
        (await db.collection('answerlattice_entities').doc(entityIdForRequest('ontology_foreign_source_versions')).get()).exists,
        false,
    );
    await sourceVersionsRef.delete();

    const manifestRef = db.collection('platformSummary').doc(getAnswerlatticeBundleManifestDocId(1, 101));
    await manifestRef.set({
        pId: 'ML', tId: 1, sId: 101, marker: 'preserve-manifest-collision',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_foreign_manifest',
        entity: entityInput('foreign-manifest', 'Foreign Manifest'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await manifestRef.get()).data()?.marker, 'preserve-manifest-collision');
    assert.equal(
        (await db.collection('answerlattice_entities').doc(entityIdForRequest('ontology_foreign_manifest')).get()).exists,
        false,
    );
    await manifestRef.delete();

    const create = await executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_1', entity: entityInput('billing-retry', 'Billing Retry'),
    }, access);
    assert.equal(create.replayed, false);
    assert.ok(create.entity?.id);
    assert.equal(
        isAnswerlatticeContextBundleManifestForScope((await manifestRef.get()).data(), 1, 101),
        true,
        'first invalidation must create a complete valid compiled-context manifest',
    );
    const replay = await executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_1', entity: entityInput('billing-retry', 'Billing Retry'),
    }, access);
    assert.equal(replay.replayed, true);
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_1', entity: entityInput('changed-slug', 'Changed'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);

    const entityId = create.entity!.id;
    const entitySearchIndexRef = db.collection('answerlattice_entitySearchIndex').doc(searchIndexId(entityId));
    const validEntitySearchIndex = (await entitySearchIndexRef.get()).data();
    assert.ok(validEntitySearchIndex);
    await entitySearchIndexRef.set({
        pId: 'ML', tId: 1, sId: 101, entityId,
        marker: 'preserve-search-index-collision',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'update_entity', requestId: 'ontology_foreign_search_index_update', entityId,
        changes: { description: 'Must not overwrite the foreign search index.' },
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await entitySearchIndexRef.get()).data()?.marker, 'preserve-search-index-collision');
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'rebuild_search_index', requestId: 'ontology_foreign_search_index_rebuild', entityId,
        weight: 1.5,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await entitySearchIndexRef.get()).data()?.marker, 'preserve-search-index-collision');
    await entitySearchIndexRef.set(validEntitySearchIndex!);

    const foreignTargetSlugRef = db.collection('answerlattice_entitySlugIndex').doc(slugIndexId('foreign-owned-update'));
    await foreignTargetSlugRef.set({
        pId: 'ML', tId: 1, sId: 101, slug: 'foreign-owned-update', entityId,
        marker: 'preserve-update-collision',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'update_entity', requestId: 'ontology_foreign_slug_update', entityId,
        changes: { slug: 'foreign-owned-update' },
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await foreignTargetSlugRef.get()).data()?.marker, 'preserve-update-collision');
    assert.equal((await db.collection('answerlattice_entities').doc(entityId).get()).data()?.slug, 'billing-retry');

    const currentSlugRef = db.collection('answerlattice_entitySlugIndex').doc(slugIndexId('billing-retry'));
    await currentSlugRef.set({
        pId: 'ML', tId: 1, sId: 101, slug: 'billing-retry', entityId,
        marker: 'preserve-delete-collision',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'update_entity', requestId: 'ontology_foreign_old_slug_update', entityId,
        changes: { slug: 'safe-renamed-slug' },
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await currentSlugRef.get()).data()?.marker, 'preserve-delete-collision');
    await currentSlugRef.set({
        pId: 'AL', tId: 1, sId: 101, slug: 'billing-retry', entityId,
        createdAt: new Date(), updatedAt: new Date(),
    });

    const update = await executeAnswerlatticeOntologyAction({
        action: 'update_entity', requestId: 'ontology_update_1', entityId, changes: { aliases: ['billing retry'] },
    }, access);
    assert.deepEqual(update.entity?.aliases, ['billing retry']);
    assert.deepEqual(update.searchIndex?.synonyms, ['billing retry']);

    const second = await executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_2', entity: entityInput('retry-plan', 'Retry Plan'),
    }, access);
    const relation = await executeAnswerlatticeOntologyAction({
        action: 'create_relation', requestId: 'ontology_relation_1',
        fromEntityId: entityId, toEntityId: second.entity!.id, relationType: 'requires',
    }, access);
    assert.equal(relation.relation?.relationType, 'requires');
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_blocked', entityId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    await executeAnswerlatticeOntologyAction({
        action: 'delete_relation', requestId: 'ontology_relation_delete_1', relationId: relation.relation!.id,
    }, access);

    await db.collection('answerlattice_canonicalAnswers').doc('answer-1').set({
        pId: 'AL', tId: 1, sId: 101, status: 'active', scope: { entityIds: [entityId] },
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_answer_blocked', entityId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    await db.collection('answerlattice_canonicalAnswers').doc('answer-1').delete();

    await db.collection('kb_articles').doc('article-1').set({
        pId: 'AL', tId: 1, sId: 101, entityIds: [entityId], active: true, status: 'published',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_article_blocked', entityId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    await db.collection('kb_articles').doc('article-1').delete();

    await db.collection('answerlattice_faqs').doc('faq-1').set({
        pId: 'AL', tId: 1, sId: 101, entityIds: [entityId], active: true, status: 'published',
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_faq_blocked', entityId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    await db.collection('answerlattice_faqs').doc('faq-1').delete();

    await db.collection('answerlattice_productSurfaces').doc('surface-1').set({
        pId: 'AL', tId: 1, sId: 101, entityIds: [entityId], active: true,
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_surface_blocked', entityId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    await db.collection('answerlattice_productSurfaces').doc('surface-1').delete();

    const deprecated = await executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_1', entityId,
    }, access);
    assert.equal(deprecated.entity?.status, 'deprecated');

    await db.collection('answerlattice_entities').doc('legacy-without-product').set({
        tId: 1, sId: 101, type: 'feature', name: 'Legacy Entity', slug: 'legacy-entity',
        description: 'Legacy malformed entity.', status: 'active', currentVersion: 1_000_000,
    });
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'update_entity', requestId: 'ontology_legacy_scope_rejected', entityId: 'legacy-without-product',
        changes: { description: 'Must not be mutated without exact product identity.' },
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 404);

    const candidate = {
        pId: 'AL' as const,
        tId: 1,
        sId: 101,
        type: 'workflow' as const,
        name: 'Invoice Recovery',
        confidence: 0.75,
        frequency: { articles: 1, tickets: 0, chat: 0 },
        description: 'Workflow for recovering a failed invoice.',
        status: 'pending' as const,
    };
    const candidateCreate = await upsertAnswerlatticeExtractedEntityCandidate({
        scope: { tId: 1, sId: 101 }, actorLabel: 'system:test', candidate, sourceArticleId: 'article-1',
    });
    const candidateReplay = await upsertAnswerlatticeExtractedEntityCandidate({
        scope: { tId: 1, sId: 101 }, actorLabel: 'system:test', candidate, sourceArticleId: 'article-1',
    });
    assert.equal(candidateCreate.created, true);
    assert.equal(candidateReplay.created, false);
    const candidateDoc = (await db.collection('answerlattice_entityCandidates').doc(candidateCreate.candidateId).get()).data();
    assert.equal(candidateDoc?.frequency?.articles, 1, 'reprocessing the same article must not inflate frequency');
    const promoted = await executeAnswerlatticeOntologyAction({
        action: 'promote_candidate', requestId: 'ontology_promote_1', candidateId: candidateCreate.candidateId,
    }, access);
    assert.equal(promoted.candidateStatus, 'approved');
    assert.ok(promoted.entity?.id);

    const counterRef = db.collection('platformSummary').doc('ontologyCounters_1_101');
    await counterRef.update({ entityCount: 499 });
    const parallel = await Promise.allSettled([
        executeAnswerlatticeOntologyAction({ action: 'create_entity', requestId: 'ontology_limit_a', entity: entityInput('limit-a') }, access),
        executeAnswerlatticeOntologyAction({ action: 'create_entity', requestId: 'ontology_limit_b', entity: entityInput('limit-b') }, access),
    ]);
    assert.equal(parallel.filter((item) => item.status === 'fulfilled').length, 1);
    assert.equal(parallel.filter((item) => item.status === 'rejected').length, 1);
    assert.equal((await counterRef.get()).data()?.entityCount, 500);
}

run()
    .then(() => process.stdout.write('Answerlattice ontology emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
