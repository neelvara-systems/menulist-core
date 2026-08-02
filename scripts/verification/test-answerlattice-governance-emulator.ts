#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { DB_COLLECTIONS } from '../../src/constants/database';
import {
    ANSWERLATTICE_CACHE_SOURCES,
    getAnswerlatticeCacheVersionDocId,
} from '../../src/lib/answerlattice/cacheVersionManifest';
import {
    getAnswerlatticeBundleManifestDocId,
    getAnswerlatticeSourceVersionsDocId,
    isAnswerlatticeContextBundleManifestForScope,
} from '../../src/lib/answerlattice/compiledContext';
import {
    AnswerlatticeGovernanceError,
    executeAnswerlatticeGovernanceAction,
    prepareAnswerlatticeProposalImpact,
    type AnswerlatticeGovernanceAccess,
} from '../../src/lib/answerlattice/governanceServer';
import { requireAnswerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const access: AnswerlatticeGovernanceAccess = {
    scope: { tenantId: 1, storeId: 101 },
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' },
};
const db = requireAnswerlatticeFirestoreAdmin();

const baseAnswer = {
    title: 'How billing retries work',
    status: 'active' as const,
    answerType: 'explanation' as const,
    scope: {
        entityIds: ['entity_billing'],
        planIds: ['growth'],
        roleIds: ['owner'],
        stateIds: ['past_due'],
    },
    productBinding: {
        introducedInVersion: 1_000_000,
        lastValidatedInVersion: 1_000_000,
        applicableVersions: { from: 1_000_000, to: null },
    },
    content: {
        structuredSummary: 'Retry the failed invoice from Billing.',
        detailedExplanation: 'Open Billing, select the failed invoice, and retry it with an active payment method.',
        edgeCases: 'The retry may be unavailable while a payment is processing.',
    },
    evidence: {
        sourceIds: ['source_billing_doc'],
        citations: [],
    },
};

const toProposalAnswer = (answer: Record<string, any>, content: Record<string, unknown>) => ({
    title: answer.title,
    status: answer.status,
    answerType: answer.answerType || 'explanation',
    scope: answer.scope,
    productBinding: answer.productBinding,
    content: {
        ...answer.content,
        ...content,
    },
});

const hashValue = (value: string, length = 32) => createHash('sha256').update(value).digest('hex').slice(0, length);
const searchIndexId = (entityId: string) => `entity_index_${hashValue(`1:101:${entityId}`)}`;
const relationId = (fromEntityId: string, toEntityId: string, relationType: string) => (
    `relation_${hashValue(`1:101:${fromEntityId}:${toEntityId}:${relationType}`)}`
);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    for (const collectionName of [
        DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
        DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS,
        DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX,
        DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
        DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS,
        DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS,
        DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS,
        DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
        DB_COLLECTIONS.ANSWERLATTICE_RELEASES,
        DB_COLLECTIONS.ANSWERLATTICE_FAQS,
        DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES,
        DB_COLLECTIONS.KB_ARTICLES,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
    ]) {
        await db.recursiveDelete(db.collection(collectionName));
    }

    await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc('entity_billing').set({
        pId: 'AL',
        tId: 1,
        sId: 101,
        type: 'feature',
        name: 'Billing',
        slug: 'billing',
        description: 'Billing settings and invoice recovery.',
        status: 'active',
        currentVersion: 1_000_000,
    });

    const createResult = await executeAnswerlatticeGovernanceAction({
        action: 'propose_create',
        requestId: 'governance_create_1',
        answer: baseAnswer,
    }, access);
    assert.ok(createResult.proposalId, 'create must return a proposal id');

    const createProposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .doc(createResult.proposalId);
    const createProposal = (await createProposalRef.get()).data();
    assert.equal(createProposal?.suggestedChange?.baseAnswerFingerprint, undefined);
    await createProposalRef.update({
        confidenceScore: 0.15,
        'suggestedChange.draftSource': 'signal_cluster',
    });

    const createApprovalAction = {
        action: 'approve_proposal' as const,
        proposalId: createResult.proposalId,
        editedContent: {
            title: 'Recover a failed billing payment',
            structuredSummary: 'Retry the failed payment from the invoice detail.',
            detailedExplanation: 'Open Billing, select the failed invoice, confirm the payment method, and retry the payment.',
            edgeCases: '',
            constraints: 'Only workspace owners can retry a failed payment.',
            citations: [
                {
                    title: 'Billing retry documentation',
                    url: 'https://docs.example.com/billing/retry',
                    sourceId: 'source_billing_doc',
                },
                {
                    title: 'Duplicate billing retry documentation',
                    url: 'https://docs.example.com/billing/retry',
                    sourceId: 'source_billing_doc',
                },
            ],
        },
    };
    const cacheVersionId = getAnswerlatticeCacheVersionDocId(
        ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
        1,
        101,
    );
    const sourceVersionsRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeSourceVersionsDocId(1, 101));
    const manifestRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getAnswerlatticeBundleManifestDocId(1, 101));
    const cacheVersionRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS).doc(cacheVersionId);

    await sourceVersionsRef.set({
        pId: 'ML', tId: 1, sId: 101, marker: 'preserve-governance-source-collision',
    });
    await assert.rejects(
        executeAnswerlatticeGovernanceAction(createApprovalAction, access),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    assert.equal((await sourceVersionsRef.get()).data()?.marker, 'preserve-governance-source-collision');
    assert.equal((await createProposalRef.get()).data()?.status, 'pending_review');
    await sourceVersionsRef.delete();

    await manifestRef.set({
        pId: 'ML', tId: 1, sId: 101, marker: 'preserve-governance-manifest-collision',
    });
    await assert.rejects(
        executeAnswerlatticeGovernanceAction(createApprovalAction, access),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    assert.equal((await manifestRef.get()).data()?.marker, 'preserve-governance-manifest-collision');
    assert.equal((await createProposalRef.get()).data()?.status, 'pending_review');
    await manifestRef.delete();

    await cacheVersionRef.set({
        pId: 'ML', tId: 1, sId: 101, source: 'canonical', version: 9,
        marker: 'preserve-cache-version-collision',
    });
    await assert.rejects(
        executeAnswerlatticeGovernanceAction(createApprovalAction, access),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    assert.equal((await cacheVersionRef.get()).data()?.marker, 'preserve-cache-version-collision');
    assert.equal((await createProposalRef.get()).data()?.status, 'pending_review');
    await cacheVersionRef.delete();

    const createApproval = await executeAnswerlatticeGovernanceAction(createApprovalAction, access);
    assert.ok(createApproval.answerId, 'approval must create a canonical answer');

    const answerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .doc(createApproval.answerId);
    let answer = (await answerRef.get()).data();
    assert.equal(answer?.title, 'Recover a failed billing payment');
    assert.equal(answer?.content?.structuredSummary, 'Retry the failed payment from the invoice detail.');
    assert.equal(answer?.content?.detailedExplanation, 'Open Billing, select the failed invoice, confirm the payment method, and retry the payment.');
    assert.equal(answer?.content?.edgeCases, undefined, 'an explicit reviewer clear must remove optional content');
    assert.equal(answer?.content?.constraints, 'Only workspace owners can retry a failed payment.');
    assert.deepEqual(answer?.evidence?.sourceIds, ['source_billing_doc']);
    assert.equal(answer?.evidence?.citations?.length, 1, 'duplicate public citation URLs must be collapsed');
    assert.match(answer?.evidence?.citations?.[0]?.id || '', /^citation_[a-f0-9]{24}$/);
    assert.equal(answer?.evidence?.citations?.[0]?.sourceId, 'source_billing_doc');
    assert.deepEqual(answer?.scope?.planIds, ['growth']);
    assert.equal(answer?.validation?.confidenceScore, 1, 'proposal evidence scores must not become canonical answer confidence');
    assert.equal(answer?.validation?.validationSource, 'manual', 'human approval must remain the canonical validation authority');
    assert.equal((await createProposalRef.get()).data()?.status, 'implemented');

    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS).doc(cacheVersionId).get()).data()?.version,
        1,
        'canonical approval must invalidate the canonical cache',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeSourceVersionsDocId(1, 101)).get()).data()?.canonical,
        1,
        'canonical approval must advance the compiled-context source version',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(getAnswerlatticeBundleManifestDocId(1, 101)).get()).data()?.status,
        'stale',
        'canonical approval must mark the compiled bundle stale',
    );
    assert.equal(
        isAnswerlatticeContextBundleManifestForScope((await manifestRef.get()).data(), 1, 101),
        true,
        'first governance invalidation must create a complete valid compiled-context manifest',
    );

    const legacyUpdateResult = await executeAnswerlatticeGovernanceAction({
        action: 'propose_update',
        requestId: 'governance_update_legacy_1',
        answerId: createApproval.answerId,
        answer: toProposalAnswer(answer || {}, {
            structuredSummary: 'A legacy manual proposal without revision protection.',
        }),
    }, access);
    assert.ok(legacyUpdateResult.proposalId);
    const legacyProposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .doc(legacyUpdateResult.proposalId);
    const legacyProposal = (await legacyProposalRef.get()).data() || {};
    const { baseAnswerFingerprint: _legacyFingerprint, ...legacySuggestedChange } = legacyProposal.suggestedChange || {};
    await legacyProposalRef.update({ suggestedChange: legacySuggestedChange });

    let legacyApprovalError: unknown;
    try {
        await executeAnswerlatticeGovernanceAction({
            action: 'approve_proposal',
            proposalId: legacyUpdateResult.proposalId,
        }, access);
    } catch (error) {
        legacyApprovalError = error;
    }
    assert.ok(legacyApprovalError, 'legacy manual updates must be resubmitted with revision protection');
    assert.equal(Number((legacyApprovalError as { status?: unknown }).status), 409);
    assert.match(
        String((legacyApprovalError as { publicMessage?: unknown }).publicMessage || ''),
        /predates revision protection/i,
    );
    assert.equal((await legacyProposalRef.get()).data()?.status, 'pending_review');
    assert.equal(
        (await answerRef.get()).data()?.content?.structuredSummary,
        'Retry the failed payment from the invoice detail.',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS).doc(cacheVersionId).get()).data()?.version,
        1,
        'a rejected legacy proposal must not invalidate retrieval caches',
    );

    const legacySignalUpdateResult = await executeAnswerlatticeGovernanceAction({
        action: 'propose_update',
        requestId: 'governance_update_legacy_signal_1',
        answerId: createApproval.answerId,
        answer: toProposalAnswer(answer || {}, {
            structuredSummary: 'A legacy signal proposal without a revision fingerprint.',
        }),
    }, access);
    assert.ok(legacySignalUpdateResult.proposalId);
    const legacySignalProposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .doc(legacySignalUpdateResult.proposalId);
    const legacySignalProposal = (await legacySignalProposalRef.get()).data() || {};
    const { baseAnswerFingerprint: _legacySignalFingerprint, ...legacySignalSuggestedChange } = legacySignalProposal.suggestedChange || {};
    await legacySignalProposalRef.update({
        suggestedChange: {
            ...legacySignalSuggestedChange,
            draftSource: 'signal_cluster',
        },
    });
    const legacySignalImpact = await prepareAnswerlatticeProposalImpact({
        access,
        proposalId: legacySignalUpdateResult.proposalId,
    });
    assert.equal(
        legacySignalImpact.candidate.content.structuredSummary,
        'A legacy signal proposal without a revision fingerprint.',
        'an unchanged legacy signal proposal must remain reviewable',
    );
    await answerRef.update({
        'content.structuredSummary': 'A newer approved summary after the legacy signal proposal.',
        modifiedOn: Timestamp.fromMillis(Date.now() + 1000),
    });

    let legacySignalApprovalError: unknown;
    try {
        await executeAnswerlatticeGovernanceAction({
            action: 'approve_proposal',
            proposalId: legacySignalUpdateResult.proposalId,
        }, access);
    } catch (error) {
        legacySignalApprovalError = error;
    }
    assert.ok(legacySignalApprovalError, 'legacy signal updates must reject when canonical truth changed later');
    assert.equal(Number((legacySignalApprovalError as { status?: unknown }).status), 409);
    assert.match(
        String((legacySignalApprovalError as { publicMessage?: unknown }).publicMessage || ''),
        /changed after this proposal was created/i,
    );
    assert.equal((await legacySignalProposalRef.get()).data()?.status, 'pending_review');
    assert.equal(
        (await answerRef.get()).data()?.content?.structuredSummary,
        'A newer approved summary after the legacy signal proposal.',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS).doc(cacheVersionId).get()).data()?.version,
        1,
        'a rejected stale signal proposal must not invalidate retrieval caches',
    );

    const staleUpdateResult = await executeAnswerlatticeGovernanceAction({
        action: 'propose_update',
        requestId: 'governance_update_stale_1',
        answerId: createApproval.answerId,
        answer: toProposalAnswer(answer || {}, {
            structuredSummary: 'Proposed summary based on the first approved revision.',
        }),
    }, access);
    assert.ok(staleUpdateResult.proposalId);
    const staleProposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .doc(staleUpdateResult.proposalId);
    assert.match(
        (await staleProposalRef.get()).data()?.suggestedChange?.baseAnswerFingerprint || '',
        /^[a-f0-9]{64}$/,
        'update proposals must record the approved answer revision they were based on',
    );

    await answerRef.update({
        'content.structuredSummary': 'A newer approved summary that must not be overwritten.',
    });
    let staleApprovalError: unknown;
    try {
        await executeAnswerlatticeGovernanceAction({
            action: 'approve_proposal',
            proposalId: staleUpdateResult.proposalId,
        }, access);
    } catch (error) {
        staleApprovalError = error;
    }
    assert.ok(staleApprovalError, 'approval must fail closed when canonical truth changed after proposal creation');
    assert.equal(
        Number((staleApprovalError as { status?: unknown }).status),
        409,
        `stale approval must retain governance status; received ${staleApprovalError instanceof Error ? staleApprovalError.name : typeof staleApprovalError}`,
    );
    assert.match(
        String((staleApprovalError as { publicMessage?: unknown }).publicMessage || ''),
        /changed after this proposal was created/i,
        'stale approval must retain its safe public message',
    );
    assert.equal(
        staleApprovalError instanceof AnswerlatticeGovernanceError,
        true,
        'stale approval must retain the governance error type for the API boundary',
    );
    assert.equal((await staleProposalRef.get()).data()?.status, 'pending_review');
    assert.equal(
        (await answerRef.get()).data()?.content?.structuredSummary,
        'A newer approved summary that must not be overwritten.',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS).doc(cacheVersionId).get()).data()?.version,
        1,
        'a rejected stale proposal must not invalidate retrieval caches',
    );

    answer = (await answerRef.get()).data();
    const freshUpdateResult = await executeAnswerlatticeGovernanceAction({
        action: 'propose_update',
        requestId: 'governance_update_fresh_1',
        answerId: createApproval.answerId,
        answer: toProposalAnswer(answer || {}, {
            structuredSummary: 'The reviewed current billing recovery answer.',
        }),
    }, access);
    assert.ok(freshUpdateResult.proposalId);
    const freshApproval = await executeAnswerlatticeGovernanceAction({
        action: 'approve_proposal',
        proposalId: freshUpdateResult.proposalId,
    }, access);
    assert.equal(freshApproval.status, 'implemented');
    assert.equal(
        (await answerRef.get()).data()?.content?.structuredSummary,
        'The reviewed current billing recovery answer.',
    );
    const approvalReplay = await executeAnswerlatticeGovernanceAction({
        action: 'approve_proposal',
        proposalId: freshUpdateResult.proposalId,
    }, access);
    assert.equal(approvalReplay.status, 'implemented', 'completed approval must remain idempotent');
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS).doc(cacheVersionId).get()).data()?.version,
        2,
        'a fresh approved update must invalidate canonical retrieval exactly once',
    );

    const collisionEntityBase = {
        pId: 'AL', tId: 1, sId: 101, type: 'integration', status: 'active', currentVersion: 1_000_000,
        description: 'Collision-boundary entity.',
    };
    const foreignIndexSurvivorId = 'entity_foreign_index_survivor';
    const foreignIndexDuplicateId = 'entity_foreign_index_duplicate';
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignIndexSurvivorId).set({
            ...collisionEntityBase, name: 'Foreign Index Survivor', slug: 'foreign-index-survivor',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignIndexDuplicateId).set({
            ...collisionEntityBase, name: 'Foreign Index Duplicate', slug: 'foreign-index-duplicate',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).doc(searchIndexId(foreignIndexSurvivorId)).set({
            pId: 'ML', tId: 1, sId: 101, entityId: foreignIndexSurvivorId, marker: 'preserve-merge-index-collision',
        }),
    ]);
    await assert.rejects(executeAnswerlatticeGovernanceAction({
        action: 'merge_entities', requestId: 'governance_foreign_index_collision',
        survivorId: foreignIndexSurvivorId, mergedId: foreignIndexDuplicateId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
            .doc(searchIndexId(foreignIndexSurvivorId)).get()).data()?.marker,
        'preserve-merge-index-collision',
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignIndexDuplicateId).get()).data()?.status,
        'active',
    );

    const foreignRelationSurvivorId = 'entity_foreign_relation_survivor';
    const foreignRelationDuplicateId = 'entity_foreign_relation_duplicate';
    const foreignRelationTargetId = 'entity_foreign_relation_target';
    const foreignRelationTargetRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS)
        .doc(relationId(foreignRelationSurvivorId, foreignRelationTargetId, 'requires'));
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationSurvivorId).set({
            ...collisionEntityBase, name: 'Foreign Relation Survivor', slug: 'foreign-relation-survivor',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationDuplicateId).set({
            ...collisionEntityBase, name: 'Foreign Relation Duplicate', slug: 'foreign-relation-duplicate',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationTargetId).set({
            ...collisionEntityBase, name: 'Foreign Relation Target', slug: 'foreign-relation-target',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS).doc('foreign-relation-source').set({
            pId: 'AL', tId: 1, sId: 101, fromEntityId: foreignRelationDuplicateId,
            toEntityId: foreignRelationTargetId, relationType: 'requires',
        }),
        foreignRelationTargetRef.set({
            pId: 'ML', tId: 1, sId: 101, fromEntityId: foreignRelationSurvivorId,
            toEntityId: foreignRelationTargetId, relationType: 'requires', marker: 'preserve-merge-relation-collision',
        }),
    ]);
    await assert.rejects(executeAnswerlatticeGovernanceAction({
        action: 'merge_entities', requestId: 'governance_foreign_relation_collision',
        survivorId: foreignRelationSurvivorId, mergedId: foreignRelationDuplicateId,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await foreignRelationTargetRef.get()).data()?.marker, 'preserve-merge-relation-collision');
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS).doc('foreign-relation-source').get()).exists,
        true,
    );
    assert.equal(
        (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationDuplicateId).get()).data()?.status,
        'active',
    );
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignIndexSurvivorId).delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignIndexDuplicateId).delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).doc(searchIndexId(foreignIndexSurvivorId)).delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationSurvivorId).delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationDuplicateId).delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(foreignRelationTargetId).delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS).doc('foreign-relation-source').delete(),
        foreignRelationTargetRef.delete(),
    ]);

    const survivorId = 'entity_survivor';
    const duplicateId = 'entity_duplicate';
    const targetId = 'entity_target';
    const entityBase = {
        pId: 'AL', tId: 1, sId: 101, type: 'integration', status: 'active', currentVersion: 1_000_000,
    };
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(survivorId).set({
            ...entityBase, name: 'Billing Connector', slug: 'billing-connector',
            description: 'The supported billing connection.', aliases: ['billing integration'],
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(duplicateId).set({
            ...entityBase, name: 'Legacy Billing', slug: 'legacy-billing',
            description: 'A duplicate billing connection.', aliases: ['old billing'],
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(targetId).set({
            ...entityBase, name: 'Invoice Sync', slug: 'invoice-sync',
            description: 'Invoice synchronization target.',
        }),
        db.collection(DB_COLLECTIONS.KB_ARTICLES).doc('merge-article').set({
            pId: 'AL', tId: 1, sId: 101, entityIds: [duplicateId], active: true, status: 'published',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc('merge-faq').set({
            pId: 'AL', tId: 1, sId: 101, entityIds: [duplicateId], active: true, status: 'published',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES).doc('merge-surface').set({
            pId: 'AL', tId: 1, sId: 101, entityIds: [duplicateId], active: true,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS).doc('relation_duplicate_target').set({
            pId: 'AL', tId: 1, sId: 101, fromEntityId: duplicateId, toEntityId: targetId, relationType: 'requires',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS).doc('relation_survivor_target').set({
            pId: 'AL', tId: 1, sId: 101, fromEntityId: survivorId, toEntityId: targetId, relationType: 'requires',
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).doc('duplicate-search-index').set({
            pId: 'AL', tId: 1, sId: 101, entityId: duplicateId, canonicalName: 'Legacy Billing',
            synonyms: ['old billing'], normalizedTokens: ['legacy', 'billing'], prefixTokens: ['leg'], weight: 1,
        }),
    ]);

    const mergeResult = await executeAnswerlatticeGovernanceAction({
        action: 'merge_entities',
        requestId: 'governance_entity_merge_1',
        survivorId,
        mergedId: duplicateId,
    }, access);
    assert.equal(mergeResult.transferredArticles, 1);
    assert.equal(mergeResult.transferredFaqs, 1);
    assert.equal(mergeResult.transferredSurfaces, 1);
    assert.equal(mergeResult.transferredRelations, 1);
    assert.deepEqual((await db.collection(DB_COLLECTIONS.KB_ARTICLES).doc('merge-article').get()).data()?.entityIds, [survivorId]);
    assert.deepEqual((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_FAQS).doc('merge-faq').get()).data()?.entityIds, [survivorId]);
    assert.deepEqual((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES).doc('merge-surface').get()).data()?.entityIds, [survivorId]);
    assert.equal((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(duplicateId).get()).data()?.status, 'deprecated');
    assert.ok((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(survivorId).get()).data()?.aliases?.includes('legacy billing'));
    const mergedRelations = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS)
        .where('tId', '==', 1)
        .where('sId', '==', 101)
        .get();
    assert.equal(mergedRelations.size, 1, 'merge must collapse semantic duplicate relations');
    assert.equal(mergedRelations.docs[0]?.data()?.fromEntityId, survivorId);
    const survivorSearchIndexes = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
        .where('tId', '==', 1)
        .where('sId', '==', 101)
        .where('entityId', '==', survivorId)
        .get();
    assert.equal(survivorSearchIndexes.size, 1, 'merge must create a complete survivor search index when one is missing');
    assert.ok(survivorSearchIndexes.docs[0]?.data()?.prefixTokens?.includes('leg'));
    assert.equal((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX).doc('duplicate-search-index').get()).exists, false);

    const answerAudit = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS)
        .where('pId', '==', 'AL')
        .where('tId', '==', 1)
        .where('sId', '==', 101)
        .where('entityType', '==', 'canonicalAnswer')
        .get();
    assert.equal(answerAudit.size, 2, 'create and fresh update must each write one canonical audit event');

    const signalTimestamp = Timestamp.fromMillis(Date.now() + 1_000);
    await Promise.all(Array.from({ length: 5 }, (_, index) => (
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS).doc(`drift-signal-${index}`).set({
            pId: 'AL',
            tId: 1,
            sId: 101,
            entityId: 'entity_billing',
            type: 'chat_negative',
            timestamp: signalTimestamp,
        })
    )));
    const driftEvaluation = await executeAnswerlatticeGovernanceAction({ action: 'evaluate_drift' }, access);
    assert.equal(driftEvaluation.evaluatedAnswers, 1);
    assert.equal(driftEvaluation.updatedAnswers, 1);
    answer = (await answerRef.get()).data();
    assert.equal(answer?.governance?.driftFlag, true);
    assert.equal(answer?.governance?.reviewRequired, true);
    assert.match(answer?.governance?.driftReason || '', /^\[signal_anomaly\]/);

    const driftReplay = await executeAnswerlatticeGovernanceAction({ action: 'evaluate_drift' }, access);
    assert.equal(driftReplay.updatedAnswers, 0, 'identical server-derived drift evaluation must be idempotent');

    await executeAnswerlatticeGovernanceAction({
        action: 'validate_drift',
        answerId: createApproval.answerId,
    }, access);
    answer = (await answerRef.get()).data();
    assert.equal(answer?.governance?.driftFlag, false);
    assert.equal(answer?.governance?.reviewRequired, false);
}

run()
    .then(() => process.stdout.write('Answerlattice governance emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
