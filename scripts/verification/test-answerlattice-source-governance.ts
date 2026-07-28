import assert from 'node:assert/strict';
import { FEATURE_FLAGS } from '../../src/config/features';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    publishKnowledgeIntakeJob,
    updateKnowledgeIntakeReviewItem,
    updateKnowledgeSourceGovernance,
} from '../../src/lib/answerlattice/knowledgeIntake';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const scope = { tId: 21, sId: 2101 };
const actor = { id: 'owner-21', email: 'owner@example.com', name: 'Owner' };
const jobId = 'SOURCEGOVERNANCEJOB1';
const otherJobId = 'SOURCEGOVERNANCEOTHR';
const sourceId = `kis_${'1'.repeat(28)}`;
const conflictSourceId = `kis_${'2'.repeat(28)}`;
const foreignJobSourceId = `kis_${'3'.repeat(28)}`;
const reviewItemId = `kii_${'4'.repeat(28)}`;
const reverseReviewItemId = `kii_${'5'.repeat(28)}`;
const unreviewedConflictSourceId = `kis_${'6'.repeat(28)}`;
const fullConflictSourceId = `kis_${'7'.repeat(28)}`;
const existingFullConflictIds = ['8', '9', 'a', 'b', 'c'].map(value => `kis_${value.repeat(28)}`);

const governanceInput = (requestId: string, conflictSourceIds: string[] = []) => ({
    requestId,
    authority: 'official_documentation' as const,
    owner: 'Support',
    approvalStatus: 'approved' as const,
    accessScope: 'public' as const,
    citationEligibility: 'public' as const,
    effectiveDate: '2026-07-01',
    reviewDate: '2026-10-01',
    applicability: {
        products: ['Core app'],
        plans: ['Pro'],
        roles: ['Owner'],
        regions: ['EU'],
        versions: ['v2'],
    },
    conflictSourceIds,
    notes: 'Reviewed against the current product.',
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db || typeof (db as any).collection !== 'function') {
        throw new Error('Answerlattice emulator Firestore is not configured');
    }
    Object.assign(FEATURE_FLAGS as any, {
        ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE: true,
        ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE: false,
    });
    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            governanceInput('35694e87-b71d-48b8-a617-f234556d2228'),
            actor,
        ),
        /source governance is not enabled/,
        'the controlled rollout flag must fail closed',
    );
    Object.assign(FEATURE_FLAGS as any, {
        ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE: true,
    });

    const createdOn = Timestamp.fromDate(new Date('2026-07-26T00:00:00.000Z'));
    const persistedConflictGovernance = {
        authority: 'approved_support_material',
        owner: 'Support',
        approvalStatus: 'approved',
        accessScope: 'workspace_private',
        citationEligibility: 'internal_only',
        effectiveDate: '2026-07-01',
        reviewDate: '2026-10-01',
        applicability: {
            products: ['Core app'],
            plans: [],
            roles: [],
            regions: [],
            versions: [],
        },
        conflictSourceIds: [],
        notes: 'Reviewed before conflict linking.',
        reviewedBy: actor.email,
        reviewedOn: createdOn,
    };
    const baseJob = {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        ...scope,
        title: 'Source governance proof',
        status: 'reviewing',
        sourceCount: 4,
        readySourceCount: 4,
        reviewItemCount: 2,
        acceptedItemCount: 0,
        publishedItemCount: 0,
        rejectedItemCount: 0,
        usageUnitsConsumed: 0,
        createdOn,
        modifiedOn: createdOn,
    };
    await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(jobId).set({
            ...baseJob,
            id: jobId,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS).doc(otherJobId).set({
            ...baseJob,
            id: otherJobId,
            sourceCount: 1,
            reviewItemCount: 0,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(sourceId).set({
            id: sourceId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            type: 'help_doc',
            title: 'Current billing guide',
            status: 'ready',
            contentText: 'Billing settings are available to workspace owners on Pro.',
            contentExcerpt: 'Billing settings are available to workspace owners on Pro.',
            contentHash: 'a'.repeat(64),
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(conflictSourceId).set({
            id: conflictSourceId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            type: 'ticket_macro',
            title: 'Old billing macro',
            status: 'ready',
            contentText: 'Billing settings are available to every plan.',
            contentExcerpt: 'Billing settings are available to every plan.',
            contentHash: 'b'.repeat(64),
            governance: persistedConflictGovernance,
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(foreignJobSourceId).set({
            id: foreignJobSourceId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId: otherJobId,
            type: 'product_note',
            title: 'Other job note',
            status: 'ready',
            contentText: 'Other job evidence.',
            contentExcerpt: 'Other job evidence.',
            contentHash: 'c'.repeat(64),
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(unreviewedConflictSourceId).set({
            id: unreviewedConflictSourceId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            type: 'product_note',
            title: 'Unreviewed plan note',
            status: 'ready',
            contentText: 'This note has not been reviewed.',
            contentExcerpt: 'This note has not been reviewed.',
            contentHash: 'd'.repeat(64),
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(fullConflictSourceId).set({
            id: fullConflictSourceId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            type: 'product_note',
            title: 'Conflict-cap source',
            status: 'ready',
            contentText: 'This source already has the maximum number of unresolved conflicts.',
            contentExcerpt: 'This source already has the maximum number of unresolved conflicts.',
            contentHash: 'e'.repeat(64),
            governance: {
                ...persistedConflictGovernance,
                conflictSourceIds: existingFullConflictIds,
            },
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(reviewItemId).set({
            id: reviewItemId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            sourceId,
            sourceIds: [sourceId],
            target: 'canonical_proposal',
            status: 'draft',
            title: 'Who can manage billing?',
            question: 'Who can manage billing?',
            answer: 'Workspace owners on Pro can manage billing from Billing settings.',
            answerType: 'explanation',
            entityIds: ['entity_billing'],
            createdOn,
            modifiedOn: createdOn,
        }),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS).doc(reverseReviewItemId).set({
            id: reverseReviewItemId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            jobId,
            sourceId: conflictSourceId,
            sourceIds: [conflictSourceId],
            target: 'canonical_proposal',
            status: 'draft',
            title: 'Which plans include billing settings?',
            question: 'Which plans include billing settings?',
            answer: 'The reviewed support material says billing settings are available to every plan.',
            answerType: 'explanation',
            entityIds: ['entity_billing'],
            createdOn,
            modifiedOn: createdOn,
        }),
    ]);

    await assert.rejects(
        () => updateKnowledgeIntakeReviewItem(scope, jobId, reviewItemId, { status: 'accepted' }, actor),
        /Review every linked source/,
        'canonical acceptance must fail while source evidence is unreviewed',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            governanceInput('f7d53fa6-c743-4c89-aed8-248505423f16', [foreignJobSourceId]),
            actor,
        ),
        /not available for this intake job/,
        'conflict links must not cross the requested intake job',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            governanceInput('7dc9bb7d-04fc-4f9f-b801-e3289998852e', [unreviewedConflictSourceId]),
            actor,
        ),
        /Review every conflicting source before linking it/,
        'both sides must be reviewed before a reciprocal conflict can be recorded',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            governanceInput('71985a62-1981-4509-89a7-a510635d22b1', [fullConflictSourceId]),
            actor,
        ),
        /already has 5 unresolved conflicts/,
        'a reciprocal peer at the conflict cap must reject without partial writes',
    );
    const [unchangedTarget, unchangedFullConflict] = await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(sourceId).get(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(fullConflictSourceId).get(),
    ]);
    assert.equal(unchangedTarget.data()?.governance, undefined, 'failed reciprocal writes must not review the target');
    assert.deepEqual(
        unchangedFullConflict.data()?.governance?.conflictSourceIds,
        existingFullConflictIds,
        'failed reciprocal writes must preserve the peer conflict list',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            {
                ...governanceInput('a9d86829-da9d-41b0-9644-4cd5d09d3f25'),
                accessScope: 'workspace_private',
            },
            actor,
        ),
        /Only public sources can be publicly citable/,
        'public citations must fail closed for non-public sources',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            {
                ...governanceInput('bb4686f0-90d5-4968-850a-294ece4e6319'),
                approvalStatus: 'superseded',
            },
            actor,
        ),
        /must not be citable/,
        'superseded evidence must not remain citable',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            {
                ...governanceInput('77fdc389-9aa4-4a30-9149-6dd40a4adbdb'),
                reviewDate: '2026-06-30',
            },
            actor,
        ),
        /cannot be before its effective date/,
        'review dates must not precede the source effective date',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            governanceInput('d07816a2-3569-493c-a889-9526a9f46534', [sourceId]),
            actor,
        ),
        /cannot conflict with itself/,
        'a source must not link itself as a conflict',
    );

    const requestId = 'ae938378-d949-447a-b96f-fcbe59b7fdb9';
    const first = await updateKnowledgeSourceGovernance(
        scope,
        jobId,
        sourceId,
        governanceInput(requestId),
        actor,
    );
    assert.equal(first.source.governance?.approvalStatus, 'approved');
    assert.equal(first.source.governance?.reviewedBy, actor.email);
    assert.deepEqual(first.governanceUpdates.map(update => update.sourceId), [sourceId]);

    const replay = await updateKnowledgeSourceGovernance(
        scope,
        jobId,
        sourceId,
        governanceInput(requestId),
        actor,
    );
    assert.equal(replay.source.governance?.approvalStatus, 'approved');
    const auditSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('entityType', '==', 'knowledgeSource')
        .where('entityId', '==', sourceId)
        .get();
    assert.equal(auditSnap.size, 1, 'idempotent replay must not create another audit event');
    assert.equal(
        Object.prototype.hasOwnProperty.call(auditSnap.docs[0].data().newState || {}, 'contentText'),
        false,
        'audit state must not copy source content',
    );

    await assert.rejects(
        () => updateKnowledgeSourceGovernance(
            scope,
            jobId,
            sourceId,
            { ...governanceInput(requestId), notes: 'Different payload.' },
            actor,
        ),
        /conflicts with an earlier request/,
        'one request ID cannot authorize a different governance payload',
    );

    const accepted = await updateKnowledgeIntakeReviewItem(
        scope,
        jobId,
        reviewItemId,
        { status: 'accepted' },
        actor,
    );
    assert.equal(accepted.status, 'accepted');

    const conflictRequestId = 'ac4352cb-c298-43d0-825f-4c49f44e30dd';
    const conflictUpdate = await updateKnowledgeSourceGovernance(
        scope,
        jobId,
        sourceId,
        governanceInput(conflictRequestId, [conflictSourceId]),
        actor,
    );
    assert.deepEqual(
        conflictUpdate.governanceUpdates.map(update => update.sourceId).sort(),
        [sourceId, conflictSourceId].sort(),
        'the response must reconcile both sides of the conflict without a bundle reread',
    );
    const reciprocalConflict = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES)
        .doc(conflictSourceId)
        .get();
    assert.deepEqual(
        reciprocalConflict.data()?.governance?.conflictSourceIds,
        [sourceId],
        'linking a conflict must update the other source in the same transaction',
    );
    const conflictReplay = await updateKnowledgeSourceGovernance(
        scope,
        jobId,
        sourceId,
        governanceInput(conflictRequestId, [conflictSourceId]),
        actor,
    );
    assert.deepEqual(
        conflictReplay.governanceUpdates.map(update => update.sourceId).sort(),
        [sourceId, conflictSourceId].sort(),
        'an idempotent retry must replay every committed reciprocal patch after a lost response',
    );
    const reciprocalReplayAuditSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('entityType', '==', 'knowledgeSource')
        .where('entityId', '==', sourceId)
        .get();
    assert.equal(
        reciprocalReplayAuditSnap.size,
        2,
        'a reciprocal replay must not create another audit event',
    );
    await assert.rejects(
        () => updateKnowledgeIntakeReviewItem(
            scope,
            jobId,
            reverseReviewItemId,
            { status: 'accepted' },
            actor,
        ),
        /Review every linked source/,
        'the reciprocal source must not qualify as conflict-free evidence',
    );
    await assert.rejects(
        () => publishKnowledgeIntakeJob(scope, jobId, [reviewItemId], actor),
        /Review every linked source/,
        'canonical publication must re-check source conflicts after acceptance',
    );
    const proposalSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .get();
    assert.equal(proposalSnap.empty, true, 'blocked evidence must not create a canonical mutation proposal');

    const resolvedUpdate = await updateKnowledgeSourceGovernance(
        scope,
        jobId,
        sourceId,
        governanceInput('4ac546d8-5542-4b13-b411-dedff45ef606'),
        actor,
    );
    assert.deepEqual(
        resolvedUpdate.governanceUpdates.map(update => update.sourceId).sort(),
        [sourceId, conflictSourceId].sort(),
        'resolving a conflict must reconcile both source cards',
    );
    const [resolvedSource, resolvedConflict] = await Promise.all([
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(sourceId).get(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES).doc(conflictSourceId).get(),
    ]);
    assert.deepEqual(resolvedSource.data()?.governance?.conflictSourceIds, []);
    assert.deepEqual(
        resolvedConflict.data()?.governance?.conflictSourceIds,
        [],
        'removing a conflict must clear the reciprocal link in the same transaction',
    );
    const reverseAccepted = await updateKnowledgeIntakeReviewItem(
        scope,
        jobId,
        reverseReviewItemId,
        { status: 'accepted' },
        actor,
    );
    assert.equal(reverseAccepted.status, 'accepted', 'resolved reciprocal evidence can proceed to review');

    process.stdout.write('Answerlattice Source Governance emulator tests passed.\n');
}

run().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});
