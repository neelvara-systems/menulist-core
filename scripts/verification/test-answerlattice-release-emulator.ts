#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { ANSWERLATTICE_PERMISSION_KEYS } from '../../src/constants/answerlattice/permissions';
import type { AnswerlatticeAccessContext } from '../../src/lib/answerlattice/accessControl';
import {
    createEmptyAnswerlatticeAnswerTestSummary,
    getAnswerlatticeAnswerTestSummaryId,
} from '../../src/lib/answerlattice/answerTestContracts';
import { executeAnswerlatticeReleaseAction } from '../../src/lib/answerlattice/releaseServer';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { isAnswerlatticeContextBundleManifestForScope } from '../../src/lib/answerlattice/compiledContext';
import { Timestamp } from 'firebase-admin/firestore';

const access: AnswerlatticeAccessContext = {
    canUseManagement: true,
    currentRoleId: 'owner',
    isPlatformAdmin: false,
    permissions: {
        [ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE]: true,
    } as AnswerlatticeAccessContext['permissions'],
    roles: [],
    scope: { tenantId: 1, storeId: 101 },
    storeName: 'Example',
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Owner' },
};
const scope = { tId: 1, sId: 101 };

const createAction = (requestId: string, versionNormalized: number, entityChanges = ['billing']) => ({
    action: 'create' as const,
    requestId,
    scope,
    versionLabel: String(versionNormalized),
    versionNormalized: versionNormalized * 1_000_000,
    releasedAt: '2026-07-11T10:00:00.000Z',
    entityChanges,
});

const previewRelease = async (releaseId: string) => {
    const preview = await executeAnswerlatticeReleaseAction({
        action: 'preview_impact',
        requestId: `preview_${releaseId}`,
        scope,
        releaseId,
        includeAnswerTestProof: true,
    }, access);
    if (preview.action !== 'preview_impact') throw new Error('Expected release impact preview');
    return preview;
};

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db) throw new Error('Answerlattice Firestore Admin is required');
    for (const name of [
        'answerlattice_entities',
        'answerlattice_canonicalAnswers',
        'answerlattice_releases',
        'answerlattice_auditLogs',
        'answerlattice_cacheVersions',
        'platformSummary',
    ]) {
        await db.recursiveDelete(db.collection(name));
    }

    await db.collection('answerlattice_entities').doc('billing').set({ pId: 'AL', tId: 1, sId: 101, name: 'Billing' });
    await db.collection('answerlattice_entities').doc('other-workspace').set({ pId: 'AL', tId: 2, sId: 202, name: 'Other' });
    await db.collection('answerlattice_entities').doc('coercive-scope').set({ pId: 'AL', tId: '1', sId: '101', name: 'Coercive' });
    const answerTestSummary = createEmptyAnswerlatticeAnswerTestSummary(1, 101);
    answerTestSummary.revision = 1;
    answerTestSummary.cases = [{
        id: 'billing-critical',
        title: 'Billing answer stays correct',
        query: 'What changed in billing?',
        expected: {
            source: 'canonical',
            answerId: 'answer-billing',
            mustInclude: [],
            mustNotInclude: [],
            citationPolicy: 'not_required',
            referenceIds: [],
        },
        riskLevel: 'critical',
        relatedEntityIds: ['billing'],
        active: true,
        createdAt: '2026-07-11T09:00:00.000Z',
        updatedAt: '2026-07-11T09:00:00.000Z',
    }];
    await db.collection('platformSummary')
        .doc(getAnswerlatticeAnswerTestSummaryId(1, 101))
        .set(answerTestSummary);
    await db.collection('answerlattice_canonicalAnswers').doc('answer-billing').set({
        pId: 'AL',
        tId: 1,
        sId: 101,
        title: 'Billing limits',
        status: 'active',
        scope: { entityIds: ['billing'] },
        productBinding: { lastValidatedInVersion: 1_000_000 },
        governance: { driftFlag: false, driftReason: null },
        modifiedOn: Timestamp.fromMillis(1_700_000_000_000),
    });
    await db.collection('answerlattice_canonicalAnswers').doc('other-product').set({
        pId: 'ML',
        tId: 1,
        sId: 101,
        status: 'active',
        scope: { entityIds: ['billing'] },
        productBinding: { lastValidatedInVersion: 1_000_000 },
        governance: { driftFlag: false, driftReason: null },
    });

    const created = await executeAnswerlatticeReleaseAction(createAction('release_request_1', 2), access);
    assert.equal(created.action, 'create');
    assert.equal(created.replayed, false);
    const replay = await executeAnswerlatticeReleaseAction(createAction('release_request_1', 2), access);
    assert.equal(replay.action, 'create');
    if (replay.action !== 'create') throw new Error('Expected replayed release create');
    assert.equal(replay.replayed, true);
    await assert.rejects(
        executeAnswerlatticeReleaseAction(createAction('release_request_1', 3), access),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    await assert.rejects(
        executeAnswerlatticeReleaseAction(createAction('release_request_2', 3, ['other-workspace']), access),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 400,
    );
    await assert.rejects(
        executeAnswerlatticeReleaseAction(createAction('release_request_coercive', 3, ['coercive-scope']), access),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 400,
    );

    if (created.action !== 'create') throw new Error('Expected created release');
    const auditCountBeforePreview = (await db.collection('answerlattice_auditLogs').get()).size;
    const preview = await previewRelease(created.releaseId);
    assert.equal(preview.affectedAnswerCount, 1);
    assert.equal(preview.reviewRequiredCount, 1);
    assert.equal(preview.affectedAnswers[0]?.title, 'Billing limits');
    assert.equal(preview.answerTestProof.state, 'missing');
    assert.equal(preview.answerTestProof.criticalCaseCount, 1);
    assert.deepEqual(preview.directDependencyCoverage, {
        mappingScope: 'direct_entity_links_only',
        changedEntityIds: ['billing'],
        answerLinkedEntityIds: ['billing'],
        testLinkedEntityIds: ['billing'],
        entityIdsWithoutVisibleDirectLinks: [],
        directActiveAnswerCount: 1,
        activeLinkedTestCount: 1,
        testLinkEvidence: 'available',
    });
    const repeatedPreview = await previewRelease(created.releaseId);
    assert.equal(repeatedPreview.impactFingerprint, preview.impactFingerprint);
    assert.equal(
        (await db.collection('answerlattice_auditLogs').get()).size,
        auditCountBeforePreview,
        'impact preview must not create audit or knowledge writes',
    );
    assert.equal(
        (await db.collection('answerlattice_releases').doc(created.releaseId).get()).data()?.status,
        'pending',
        'impact preview must leave the release pending',
    );
    const activation = await executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_1',
        scope,
        releaseId: created.releaseId,
        impactFingerprint: preview.impactFingerprint,
    }, access);
    assert.equal(activation.action, 'activate');
    assert.equal(activation.status, 'active');
    assert.equal(activation.evaluatedAnswers, 1);
    assert.equal(activation.driftedAnswers, 1);
    const answer = (await db.collection('answerlattice_canonicalAnswers').doc('answer-billing').get()).data();
    assert.equal(answer?.governance?.driftFlag, true);
    assert.equal(answer?.governance?.reviewRequired, true);
    assert.match(answer?.governance?.driftReason || '', /version_mismatch/);
    const release = (await db.collection('answerlattice_releases').doc(created.releaseId).get()).data();
    assert.equal(release?.status, 'active');
    assert.equal(release?.driftEvaluation?.status, 'completed');
    const sourceVersions = (await db.collection('platformSummary').doc('sourceVersions_1_101').get()).data();
    assert.equal(sourceVersions?.releases, 1);
    assert.equal(sourceVersions?.canonical, 1);
    const cacheVersion = (await db.collection('answerlattice_cacheVersions').doc('canonical_1_101').get()).data();
    assert.equal(cacheVersion?.version, 1, 'release drift must invalidate cached canonical answers atomically');
    const bundleManifest = (await db.collection('platformSummary').doc('bundleManifest_1_101').get()).data();
    assert.equal(bundleManifest?.status, 'stale');
    assert.equal(
        isAnswerlatticeContextBundleManifestForScope(bundleManifest, 1, 101),
        true,
        'first release invalidation must create a complete valid compiled-context manifest',
    );
    const activeReplay = await executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_replay',
        scope,
        releaseId: created.releaseId,
        impactFingerprint: preview.impactFingerprint,
    }, access);
    assert.equal(activeReplay.action, 'activate');
    if (activeReplay.action !== 'activate') throw new Error('Expected replayed release activation');
    assert.equal(activeReplay.replayed, true);
    await assert.rejects(executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_wrong_preview',
        scope,
        releaseId: created.releaseId,
        impactFingerprint: 'd'.repeat(64),
    }, access), (error: unknown) => (
        Number((error as { status?: unknown })?.status) === 409
        && (error as { code?: unknown })?.code === 'release_impact_preview_stale'
    ));

    const second = await executeAnswerlatticeReleaseAction(createAction('release_request_3', 3), access);
    if (second.action !== 'create') throw new Error('Expected second release');
    const stalePreview = await previewRelease(second.releaseId);
    await db.collection('answerlattice_canonicalAnswers').doc('answer-billing').update({
        productBinding: { lastValidatedInVersion: 2_000_000 },
        modifiedOn: Timestamp.now(),
    });
    await assert.rejects(executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_stale_preview',
        scope,
        releaseId: second.releaseId,
        impactFingerprint: stalePreview.impactFingerprint,
    }, access), (error: unknown) => (
        Number((error as { status?: unknown })?.status) === 409
        && (error as { code?: unknown })?.code === 'release_impact_preview_stale'
    ));
    assert.equal(
        (await db.collection('answerlattice_releases').doc(second.releaseId).get()).data()?.status,
        'pending',
        'a stale preview must not claim or activate the release',
    );

    await db.collection('answerlattice_canonicalAnswers').doc('malformed-answer').set({
        pId: 'AL', tId: 1, sId: 101, status: 'active', scope: { entityIds: ['billing'] },
        productBinding: {}, governance: { driftFlag: false },
    });
    await assert.rejects(
        previewRelease(second.releaseId),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    const failed = (await db.collection('answerlattice_releases').doc(second.releaseId).get()).data();
    assert.equal(failed?.status, 'pending', 'invalid affected knowledge must leave the release pending');
    await db.collection('answerlattice_canonicalAnswers').doc('malformed-answer').update({
        productBinding: { lastValidatedInVersion: 2_000_000 },
        governance: { driftFlag: false, reviewRequired: false },
        modifiedOn: Timestamp.now(),
    });
    const validSecondPreview = await previewRelease(second.releaseId);
    await db.collection('answerlattice_canonicalAnswers').doc('malformed-answer').update({
        productBinding: { lastValidatedInVersion: '2000000' },
    });
    await assert.rejects(executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_string_version',
        scope,
        releaseId: second.releaseId,
        impactFingerprint: validSecondPreview.impactFingerprint,
    }, access));
    await db.collection('answerlattice_canonicalAnswers').doc('malformed-answer').update({
        productBinding: { lastValidatedInVersion: 2_000_000 },
        modifiedOn: Timestamp.now(),
    });
    const retriedPreview = await previewRelease(second.releaseId);
    const retried = await executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_3',
        scope,
        releaseId: second.releaseId,
        impactFingerprint: retriedPreview.impactFingerprint,
    }, access);
    assert.equal(retried.status, 'active');

    const third = await executeAnswerlatticeReleaseAction(createAction('release_request_4', 4), access);
    if (third.action !== 'create') throw new Error('Expected third release');
    const thirdPreview = await previewRelease(third.releaseId);
    const sourceVersionsRef = db.collection('platformSummary').doc('sourceVersions_1_101');
    const validSourceVersions = (await sourceVersionsRef.get()).data();
    await sourceVersionsRef.set({ pId: 'ML', tId: 1, sId: 101, marker: 'foreign-source' });
    await assert.rejects(executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_foreign_source',
        scope,
        releaseId: third.releaseId,
        impactFingerprint: thirdPreview.impactFingerprint,
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);
    assert.equal((await sourceVersionsRef.get()).data()?.marker, 'foreign-source');
    assert.equal(
        (await db.collection('answerlattice_releases').doc(third.releaseId).get()).data()?.status,
        'pending',
        'ownership conflict must release the activation lease for a safe retry',
    );
    await sourceVersionsRef.set(validSourceVersions!);
    const thirdRetryPreview = await previewRelease(third.releaseId);
    const thirdRetry = await executeAnswerlatticeReleaseAction({
        action: 'activate',
        requestId: 'release_activate_foreign_source_retry',
        scope,
        releaseId: third.releaseId,
        impactFingerprint: thirdRetryPreview.impactFingerprint,
    }, access);
    assert.equal(thirdRetry.status, 'active');

    await assert.rejects(executeAnswerlatticeReleaseAction({
        action: 'create',
        requestId: 'release_wrong_scope',
        scope: { tId: 2, sId: 202 },
        versionLabel: '5',
        versionNormalized: 5_000_000,
        releasedAt: '2026-07-11T10:00:00.000Z',
        entityChanges: ['billing'],
    }, access), (error: unknown) => Number((error as { status?: unknown })?.status) === 409);

    const audit = await db.collection('answerlattice_auditLogs')
        .where('pId', '==', 'AL')
        .where('tId', '==', 1)
        .where('sId', '==', 101)
        .get();
    assert.ok(audit.size >= 5, 'release lifecycle and drift changes must be audited');
    assert.ok(Timestamp.now().toMillis() > 0);
}

run()
    .then(() => process.stdout.write('Answerlattice release emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
