#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { executeAnswerlatticeContentFeedback } from '../../src/lib/answerlattice/contentFeedbackServer';
import { answerlatticeFirestoreAdmin as db } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

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
        'changelog',
        'article_feedback',
        'changelog_feedback',
        'answerlattice_signalEvents',
    ]) {
        await db.recursiveDelete(db.collection(collection));
    }

    await db.collection('kb_articles').doc('article-1').set({
        id: 'article-1', pId: 'AL', tId: 1, sId: 101, likes: 0, dislikes: 0,
    });
    await db.collection('kb_articles').doc('article-capped').set({
        id: 'article-capped', pId: 'AL', tId: 1, sId: 101, likes: 4, dislikes: 2,
    });
    await db.collection('kb_articles').doc('article-wrong-scope').set({
        id: 'article-wrong-scope', pId: 'AL', tId: 2, sId: 202, likes: 0, dislikes: 0,
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

    const dislike = await executeAnswerlatticeContentFeedback(request('feedback_request_dislike', {
        sentiment: 'dislike',
        comment: 'This answer is stale.',
    }), scope, actor);
    assert.equal(dislike.dislikes, 1);
    await executeAnswerlatticeContentFeedback(request('feedback_request_dislike', {
        sentiment: 'dislike',
        comment: 'This answer is stale.',
    }), scope, actor);
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
    assert.equal(article?.recentFeedbackOperations?.length, 2);
    const audit = (await db.collection('article_feedback').doc('1').collection('101').doc('doc1_article-1').get()).data();
    assert.equal(audit?.list?.length, 2);
    assert.match(audit?.list?.[0]?.requestId || '', /^[a-f0-9]{24}$/);

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
}

run()
    .then(() => process.stdout.write('Answerlattice content-feedback emulator tests passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
