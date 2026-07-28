#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    buildAnswerlatticeContentFeedbackStateDocumentId,
    executeAnswerlatticeContentFeedback,
} from '../../src/lib/answerlattice/contentFeedbackServer';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { cleanupAnswerlatticeOperationalRetention } from '../../functions-answerlattice/src/answerlattice/dataRetention';
import {
    getAnswerlatticeBundleLockDocId,
    getAnswerlatticeBundleManifestDocId,
    getExpectedAnswerlatticePublicBundleId,
    getMissingAnswerlatticeBundleManifestBase,
} from '../../functions-answerlattice/src/answerlattice/compiledContextVersions';
import { storageAdmin } from '../../functions-answerlattice/src/firebaseAdmin';

const scope = { tId: 1, sId: 101 };
const actor = {
    id: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
    sourceContext: {
        uId: 'owner-1',
        name: 'Owner',
        email: 'owner@example.com',
        pId: 'AL' as const,
        tId: 1,
        sId: 101,
    },
};
const secondActor = {
    id: 'owner-2',
    name: 'Second Owner',
    email: 'owner-2@example.com',
    sourceContext: {
        uId: 'owner-2',
        name: 'Second Owner',
        email: 'owner-2@example.com',
        pId: 'AL' as const,
        tId: 1,
        sId: 101,
    },
};

const request = (
    requestId: string,
    overrides: Partial<Parameters<typeof executeAnswerlatticeContentFeedback>[0]> = {},
) => ({
    requestId,
    type: 'article' as const,
    contentId: 'article-1',
    sentiment: 'like' as const,
    increment: true,
    comment: '',
    action: 'added' as const,
    ...overrides,
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    if (!db) throw new Error('Answerlattice Firestore Admin is required');
    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('missing_actor'), scope, {
            ...actor,
            id: 'unknown',
        }),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 401,
        'missing actor identity must fail before content feedback persistence',
    );
    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('coercive_actor'), scope, {
            ...actor,
            id: { toString: () => 'owner-1' } as unknown as string,
        }),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 401,
        'object actor identity must not be coerced into an authenticated user',
    );
    for (const collection of [
        'kb_articles',
        'answerlattice_faqs',
        'changelog',
        'article_feedback',
        'changelog_feedback',
        'faq_feedback',
        'answerlattice_signalEvents',
        'queryEmbeddings',
        'aiSearchHistory',
        'ownerNotificationEvents',
        'ownerNotificationDeliveries',
        'ownerNotificationRateLimits',
    ]) {
        await db.recursiveDelete(db.collection(collection));
    }

    await db.collection('kb_articles').doc('article-1').set({
        id: 'article-1', pId: 'AL', tId: 1, sId: 101, active: true, status: 'published', likes: 0, dislikes: 0,
    });
    await db.collection('kb_articles').doc('article-capped').set({
        id: 'article-capped', pId: 'AL', tId: 1, sId: 101, active: true, status: 'published', likes: 4, dislikes: 2,
    });
    await db.collection('kb_articles').doc('article-wrong-scope').set({
        id: 'article-wrong-scope', pId: 'AL', tId: 2, sId: 202, active: true, status: 'published', likes: 0, dislikes: 0,
    });
    await db.collection('kb_articles').doc('article-coercive-scope').set({
        id: 'article-coercive-scope', pId: 'AL', tId: '1', sId: '101', active: true, status: 'published', likes: 0, dislikes: 0,
    });
    await db.collection('kb_articles').doc('article-coercive-state').set({
        id: 'article-coercive-state', pId: 'AL', tId: 1, sId: 101, active: true, status: 'published', likes: 0, dislikes: 0,
    });
    await db.collection('kb_articles').doc('article-draft').set({
        id: 'article-draft', pId: 'AL', tId: 1, sId: 101, active: false, status: 'draft', likes: 0, dislikes: 0,
    });
    await db.collection('answerlattice_faqs').doc('faq-1').set({
        id: 'faq-1', pId: 'AL', tId: 1, sId: 101, active: true, status: 'published', likes: 0, dislikes: 0,
        entityIds: ['billing'],
    });
    await db.collection('answerlattice_faqs').doc('faq-draft').set({
        id: 'faq-draft', pId: 'AL', tId: 1, sId: 101, active: true, status: 'draft', likes: 0, dislikes: 0,
    });
    await db.collection('changelog').doc('1').collection('101').doc('page-1').set({
        pId: 'AL', tId: 1, sId: 101, pageNumber: 1,
        entries: [{ id: 'entry-1', title: 'Release', likes: 0, dislikes: 0 }],
    });
    await db.collection('changelog').doc('1').collection('101').doc('page-coercive-scope').set({
        pId: 'AL', tId: '1', sId: '101', pageNumber: 2,
        entries: [{ id: 'entry-coercive-scope', title: 'Invalid scope', likes: 0, dislikes: 0 }],
    });
    const coerciveStateRequest = request('feedback_request_coercive_state', {
        contentId: 'article-coercive-state',
    });
    await db.collection('article_feedback').doc('1').collection('101')
        .doc(buildAnswerlatticeContentFeedbackStateDocumentId(coerciveStateRequest))
        .set({
            pId: 'AL',
            tId: '1',
            sId: '101',
            type: 'article',
            contentId: 'article-coercive-state',
            pageId: null,
            actors: {},
            actorCount: 0,
        });
    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_coercive_content', {
            contentId: 'article-coercive-scope',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 404,
        'string content scope must not be admitted as the current workspace',
    );
    await assert.rejects(
        executeAnswerlatticeContentFeedback(coerciveStateRequest, scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
        'string actor-state scope must not be admitted as the current workspace',
    );
    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_coercive_changelog', {
            type: 'changelog',
            contentId: 'entry-coercive-scope',
            pageId: 'page-coercive-scope',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 404,
        'string changelog scope must not be admitted as the current workspace',
    );

    const first = await executeAnswerlatticeContentFeedback(request('feedback_request_1'), scope, actor);
    assert.equal(first.likes, 1);
    assert.equal(first.feedbackLogged, true);
    assert.equal(first.replayed, false);
    const replay = await executeAnswerlatticeContentFeedback(request('feedback_request_1'), scope, actor);
    assert.equal(replay.likes, 1);
    assert.equal(replay.feedbackLogged, false);
    assert.equal(replay.replayed, true);
    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_1', {
            sentiment: 'dislike',
            comment: 'Changed request',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    const freshDuplicate = await executeAnswerlatticeContentFeedback(request('feedback_request_fresh_duplicate'), scope, actor);
    assert.equal(freshDuplicate.likes, 1);
    assert.equal(freshDuplicate.feedbackLogged, false);
    assert.equal(freshDuplicate.replayed, true);
    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_switch_without_remove', {
            sentiment: 'dislike',
            comment: 'Changed sentiment without removing the like.',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 409,
    );
    const removed = await executeAnswerlatticeContentFeedback(request('feedback_request_remove_like', {
        increment: false,
        action: 'removed',
    }), scope, actor);
    assert.equal(removed.likes, 0);
    const duplicateRemove = await executeAnswerlatticeContentFeedback(request('feedback_request_duplicate_remove', {
        increment: false,
        action: 'removed',
    }), scope, actor);
    assert.equal(duplicateRemove.likes, 0);
    assert.equal(duplicateRemove.replayed, true);
    const readded = await executeAnswerlatticeContentFeedback(request('feedback_request_readd_like'), scope, actor);
    assert.equal(readded.likes, 1);

    const dislike = await executeAnswerlatticeContentFeedback(request('feedback_request_dislike', {
        sentiment: 'dislike',
        comment: 'This answer is stale.',
    }), scope, secondActor);
    assert.equal(dislike.dislikes, 1);
    await executeAnswerlatticeContentFeedback(request('feedback_request_dislike', {
        sentiment: 'dislike',
        comment: 'This answer is stale.',
    }), scope, secondActor);
    const signalSnapshot = await db.collection('answerlattice_signalEvents')
        .where('pId', '==', 'AL')
        .where('tId', '==', 1)
        .where('sId', '==', 101)
        .get();
    assert.equal(signalSnapshot.size, 1, 'a replayed dislike must not duplicate its signal');

    const article = (await db.collection('kb_articles').doc('article-1').get()).data();
    assert.equal(article?.likes, 1);
    assert.equal(article?.dislikes, 1);
    assert.equal(article?.modifiedOn, undefined, 'feedback must not change article freshness metadata');
    assert.equal(article?.recentFeedbackOperations?.length, 4);
    const audit = (await db.collection('article_feedback').doc('1').collection('101').doc('doc1_article-1').get()).data();
    assert.equal(audit?.list?.length, 4);
    assert.match(audit?.list?.[0]?.requestId || '', /^[a-f0-9]{24}$/);
    assert.equal(audit?.retentionDays, 365);
    assert.equal(typeof audit?.expiresAt?.toMillis, 'function');
    const articleStateId = buildAnswerlatticeContentFeedbackStateDocumentId(request('state_lookup'));
    const articleState = (await db.collection('article_feedback').doc('1').collection('101').doc(articleStateId).get()).data();
    assert.equal(articleState?.actorCount, 2);
    assert.deepEqual(Object.values(articleState?.actors || {}).sort(), ['dislike', 'like']);

    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_draft', {
            contentId: 'article-draft',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 404,
    );

    const changelog = await executeAnswerlatticeContentFeedback(request('feedback_request_changelog', {
        type: 'changelog',
        contentId: 'entry-1',
        pageId: 'page-1',
    }), scope, actor);
    assert.equal(changelog.likes, 1);
    const changelogPage = (await db.collection('changelog').doc('1').collection('101').doc('page-1').get()).data();
    assert.equal(changelogPage?.entries?.[0]?.likes, 1);
    assert.equal(changelogPage?.entries?.[0]?.title, 'Release');
    assert.equal(changelogPage?.modifiedOn, undefined, 'feedback must not change changelog freshness metadata');

    const faqFeedback = await executeAnswerlatticeContentFeedback(request('feedback_request_faq', {
        type: 'faq',
        contentId: 'faq-1',
        sentiment: 'dislike',
        comment: 'The short answer needs more detail.',
    }), scope, actor);
    assert.equal(faqFeedback.dislikes, 1);
    const faq = (await db.collection('answerlattice_faqs').doc('faq-1').get()).data();
    assert.equal(faq?.dislikes, 1);
    assert.equal(faq?.modifiedOn, undefined, 'feedback must not change FAQ freshness metadata');
    const faqAudit = (await db.collection('faq_feedback').doc('1').collection('101').doc('doc1_faq-1').get()).data();
    assert.equal(faqAudit?.list?.length, 1);
    assert.equal(faqAudit?.retentionDays, 365);

    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_faq_draft', {
            type: 'faq',
            contentId: 'faq-draft',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 404,
    );

    await assert.rejects(
        executeAnswerlatticeContentFeedback(request('feedback_request_wrong_scope', {
            contentId: 'article-wrong-scope',
        }), scope, actor),
        (error: unknown) => Number((error as { status?: unknown })?.status) === 404,
    );

    const cappedEvents = Array.from({ length: 200 }, (_, index) => ({
        requestId: index.toString(16).padStart(24, '0'),
        comment: `Event ${index}`,
        sentiment: 'like',
        action: 'added',
        createdOn: Timestamp.now(),
        uId: actor.id,
        userName: actor.name,
        sourceContext: actor.sourceContext,
    }));
    await db.collection('article_feedback').doc('1').collection('101').doc('doc1_article-capped').set({
        list: cappedEvents,
        pId: 'AL', tId: 1, sId: 101, uId: actor.id, role: 'CUSTOMER', sourceContext: actor.sourceContext,
    });
    const capped = await executeAnswerlatticeContentFeedback(request('feedback_request_capped', {
        contentId: 'article-capped',
    }), scope, actor);
    assert.equal(capped.likes, 5);
    assert.equal(capped.feedbackLogged, false);
    const cappedAudit = (await db.collection('article_feedback').doc('1').collection('101').doc('doc1_article-capped').get()).data();
    assert.equal(cappedAudit?.list?.length, 200);

    const expiredAt = Timestamp.fromMillis(Date.now() - 60_000);
    await db.collection('article_feedback').doc('1').collection('101').doc('expired-feedback').set({
        pId: 'AL', tId: 1, sId: 101, list: [], expiresAt: expiredAt, retentionDays: 365,
    });
    await db.collection('changelog_feedback').doc('1').collection('101').doc('expired-feedback').set({
        pId: 'AL', tId: 1, sId: 101, list: [], expiresAt: expiredAt, retentionDays: 365,
    });
    await db.collection('faq_feedback').doc('1').collection('101').doc('expired-feedback').set({
        pId: 'AL', tId: 1, sId: 101, list: [], expiresAt: expiredAt, retentionDays: 365,
    });
    const legacyCutoff = Timestamp.fromMillis(Date.now() - 120 * 24 * 60 * 60 * 1000);
    await db.collection('queryEmbeddings').doc('al-expired').set({
        pId: 'AL', tId: 1, sId: 101, createdAt: legacyCutoff,
    });
    await db.collection('queryEmbeddings').doc('ml-expired').set({
        pId: 'ML', tId: 1, sId: 101, createdAt: legacyCutoff,
    });
    await db.collection('aiSearchHistory').doc('al-expired').set({
        pId: 'AL', tId: 1, sId: 101, createdOn: legacyCutoff,
    });
    await db.collection('aiSearchHistory').doc('ml-expired').set({
        pId: 'ML', tId: 1, sId: 101, createdOn: legacyCutoff,
    });
    for (const [collectionName, timestampField] of [
        ['ownerNotificationEvents', 'createdAt'],
        ['ownerNotificationDeliveries', 'createdAt'],
        ['ownerNotificationRateLimits', 'updatedAt'],
    ] as const) {
        await db.collection(collectionName).doc('al-expired').set({
            productId: 'AL', [timestampField]: legacyCutoff,
        });
        await db.collection(collectionName).doc('ml-expired').set({
            productId: 'ML', [timestampField]: legacyCutoff,
        });
    }
    const cleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        batchLimit: 10,
        includeLegacyFirestoreCleanup: true,
    });
    assert.equal(cleanup.contentFeedbackDeleted, 3);
    assert.equal(cleanup.queryEmbeddingsDeleted, 1);
    assert.equal(cleanup.aiSearchHistoryDeleted, 1);
    assert.equal(cleanup.ownerNotificationEventsDeleted, 1);
    assert.equal(cleanup.ownerNotificationDeliveriesDeleted, 1);
    assert.equal(cleanup.ownerNotificationRateLimitsDeleted, 1);
    assert.equal((await db.collection('article_feedback').doc('1').collection('101').doc('expired-feedback').get()).exists, false);
    assert.equal((await db.collection('changelog_feedback').doc('1').collection('101').doc('expired-feedback').get()).exists, false);
    assert.equal((await db.collection('faq_feedback').doc('1').collection('101').doc('expired-feedback').get()).exists, false);
    assert.equal((await db.collection('queryEmbeddings').doc('al-expired').get()).exists, false);
    assert.equal((await db.collection('queryEmbeddings').doc('ml-expired').get()).exists, true);
    assert.equal((await db.collection('aiSearchHistory').doc('al-expired').get()).exists, false);
    assert.equal((await db.collection('aiSearchHistory').doc('ml-expired').get()).exists, true);
    for (const collectionName of [
        'ownerNotificationEvents',
        'ownerNotificationDeliveries',
        'ownerNotificationRateLimits',
    ]) {
        assert.equal((await db.collection(collectionName).doc('al-expired').get()).exists, false);
        assert.equal((await db.collection(collectionName).doc('ml-expired').get()).exists, true);
    }

    const publicBundleId = getExpectedAnswerlatticePublicBundleId(scope.tId, scope.sId);
    assert.ok(publicBundleId);
    const manifestRef = db.collection('platformSummary')
        .doc(getAnswerlatticeBundleManifestDocId(scope.tId, scope.sId));
    await manifestRef.set({
        ...getMissingAnswerlatticeBundleManifestBase(scope.tId, scope.sId),
        activeVersion: 6,
        bundleVersion: 6,
        lastReadyVersion: 6,
        publicBundleId,
        status: 'ready',
    });
    const bucket = storageAdmin.bucket();
    const versionPath = (visibility: 'private' | 'public', version: number, file: string) => (
        visibility === 'public'
            ? `answerlattice-context/public/${publicBundleId}/v${version}/${file}`
            : `answerlattice-context/private/${scope.tId}/${scope.sId}/v${version}/${file}`
    );
    for (const path of [
        versionPath('public', 1, 'a.json'),
        versionPath('public', 1, 'b.json'),
        versionPath('private', 1, 'a.json'),
        versionPath('private', 1, 'b.json'),
        versionPath('public', 4, 'kept.json'),
        versionPath('private', 7, 'future.json'),
    ]) {
        await bucket.file(path).save('{}', { resumable: false });
    }

    const firstBundleCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.deepEqual(firstBundleCleanup.errors, []);
    assert.equal(firstBundleCleanup.contextBundleObjectsDeleted, 2);
    let retainedManifest = (await manifestRef.get()).data() || {};
    assert.equal(retainedManifest.retentionScanActiveVersion, 6);
    assert.equal(retainedManifest.retentionScanNextVersion, 1);
    await manifestRef.update({
        activeVersion: 7,
        bundleVersion: 7,
        lastReadyVersion: 7,
    });

    const secondBundleCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.deepEqual(secondBundleCleanup.errors, []);
    assert.equal(secondBundleCleanup.contextBundleObjectsDeleted, 2);
    retainedManifest = (await manifestRef.get()).data() || {};
    assert.equal(retainedManifest.lastRetentionCleanedVersion, undefined);
    assert.equal(retainedManifest.retentionScanActiveVersion, 6);
    assert.equal(retainedManifest.retentionScanNextVersion, 2);

    const completedOldAuthorityCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.deepEqual(completedOldAuthorityCleanup.errors, []);
    assert.equal(completedOldAuthorityCleanup.contextBundleObjectsDeleted, 0);
    retainedManifest = (await manifestRef.get()).data() || {};
    assert.equal(retainedManifest.lastRetentionCleanedVersion, 6);
    assert.equal(retainedManifest.retentionScanActiveVersion, undefined);
    assert.equal((await bucket.file(versionPath('public', 4, 'kept.json')).exists())[0], true);
    assert.equal((await bucket.file(versionPath('private', 7, 'future.json')).exists())[0], true);

    const currentAuthorityCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.deepEqual(currentAuthorityCleanup.errors, []);
    assert.equal(currentAuthorityCleanup.contextBundleObjectsDeleted, 1);
    retainedManifest = (await manifestRef.get()).data() || {};
    assert.equal(retainedManifest.lastRetentionCleanedVersion, 7);
    assert.equal((await bucket.file(versionPath('public', 4, 'kept.json')).exists())[0], false);
    assert.equal((await bucket.file(versionPath('private', 7, 'future.json')).exists())[0], true);

    const unreferencedExpectedPublicPath = versionPath('public', 5, 'orphan.json');
    await bucket.file(unreferencedExpectedPublicPath).save('{}', { resumable: false });
    await manifestRef.update({
        activeVersion: 8,
        bundleVersion: 8,
        lastReadyVersion: 8,
        publicBundleId: '',
    });
    const emptyManifestPublicIdCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.deepEqual(emptyManifestPublicIdCleanup.errors, []);
    assert.equal(emptyManifestPublicIdCleanup.contextBundleObjectsDeleted, 1);
    assert.equal((await bucket.file(unreferencedExpectedPublicPath).exists())[0], false);
    assert.equal((await manifestRef.get()).data()?.lastRetentionCleanedVersion, 8);

    const failedVersion = 10;
    const failedLockRef = db.collection('platformSummary')
        .doc(getAnswerlatticeBundleLockDocId(scope.tId, scope.sId));
    const failedPublicObjectPath = versionPath('public', failedVersion, 'partial.json');
    const failedPrivateObjectPath = versionPath('private', failedVersion, 'partial.json');
    await Promise.all([
        failedLockRef.set({
            bundleVersion: failedVersion,
            lockId: 'failed-retention-emulator-lock',
            pId: 'AL',
            sId: scope.sId,
            schemaVersion: 1,
            status: 'failed',
            tId: scope.tId,
        }),
        bucket.file(failedPublicObjectPath).save('{}', { resumable: false }),
        bucket.file(failedPrivateObjectPath).save('{}', { resumable: false }),
    ]);
    const failedVersionCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.deepEqual(failedVersionCleanup.errors, []);
    assert.equal(failedVersionCleanup.contextBundleObjectsDeleted, 2);
    assert.equal((await bucket.file(failedPublicObjectPath).exists())[0], false);
    assert.equal((await bucket.file(failedPrivateObjectPath).exists())[0], false);
    assert.equal(
        (await failedLockRef.get()).data()?.storageCleanupCompletedVersion,
        failedVersion,
    );

    const foreignPublicBundleId = getExpectedAnswerlatticePublicBundleId(scope.tId + 1, scope.sId + 1);
    assert.ok(foreignPublicBundleId);
    const foreignObjectPath = `answerlattice-context/public/${foreignPublicBundleId}/v1/foreign.json`;
    await bucket.file(foreignObjectPath).save('{}', { resumable: false });
    await manifestRef.update({
        activeVersion: 9,
        bundleVersion: 9,
        lastReadyVersion: 9,
        publicBundleId: foreignPublicBundleId,
    });
    const mismatchedBundleCleanup = await cleanupAnswerlatticeOperationalRetention({
        tenants: [scope],
        storageDeleteLimit: 2,
    });
    assert.equal(mismatchedBundleCleanup.contextBundleObjectsDeleted, 0);
    assert.deepEqual(mismatchedBundleCleanup.errors, [
        'contextBundleVersions: ANSWERLATTICE_RETENTION_TASK_FAILED',
    ]);
    assert.equal((await bucket.file(foreignObjectPath).exists())[0], true);
}

run()
    .then(() => process.stdout.write('Answerlattice content-feedback emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
