#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    buildAnswerlatticeContentFeedbackStateDocumentId,
    executeAnswerlatticeContentFeedback,
} from '../../src/lib/answerlattice/contentFeedbackServer';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { cleanupAnswerlatticeOperationalRetention } from '../../functions-answerlattice/src/answerlattice/dataRetention';

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
    for (const collection of [
        'kb_articles',
        'answerlattice_faqs',
        'changelog',
        'article_feedback',
        'changelog_feedback',
        'faq_feedback',
        'answerlattice_signalEvents',
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
    const cleanup = await cleanupAnswerlatticeOperationalRetention({ tenants: [scope], batchLimit: 10 });
    assert.equal(cleanup.contentFeedbackDeleted, 3);
    assert.equal((await db.collection('article_feedback').doc('1').collection('101').doc('expired-feedback').get()).exists, false);
    assert.equal((await db.collection('changelog_feedback').doc('1').collection('101').doc('expired-feedback').get()).exists, false);
    assert.equal((await db.collection('faq_feedback').doc('1').collection('101').doc('expired-feedback').get()).exists, false);
}

run()
    .then(() => process.stdout.write('Answerlattice content-feedback emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
