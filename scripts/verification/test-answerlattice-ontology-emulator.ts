#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import type { AnswerlatticeAccessContext } from '../../src/lib/answerlattice/accessControl';
import {
    executeAnswerlatticeOntologyAction,
    upsertAnswerlatticeExtractedEntityCandidate,
} from '../../src/lib/answerlattice/ontologyServer';
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

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db) throw new Error('Answerlattice Firestore Admin is required');
    for (const collection of [
        'answerlattice_entities', 'answerlattice_entitySlugIndex', 'answerlattice_entityRelations',
        'answerlattice_entitySearchIndex', 'answerlattice_entityCandidates', 'answerlattice_canonicalAnswers',
        'answerlattice_auditLogs', 'platformSummary',
    ]) await db.recursiveDelete(db.collection(collection));

    const create = await executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_1', entity: entityInput('billing-retry', 'Billing Retry'),
    }, access);
    assert.equal(create.replayed, false);
    assert.ok(create.entity?.id);
    const replay = await executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_1', entity: entityInput('billing-retry', 'Billing Retry'),
    }, access);
    assert.equal(replay.replayed, true);
    await assert.rejects(executeAnswerlatticeOntologyAction({
        action: 'create_entity', requestId: 'ontology_create_1', entity: entityInput('changed-slug', 'Changed'),
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);

    const entityId = create.entity!.id;
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
    const deprecated = await executeAnswerlatticeOntologyAction({
        action: 'deprecate_entity', requestId: 'ontology_deprecate_1', entityId,
    }, access);
    assert.equal(deprecated.entity?.status, 'deprecated');

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
