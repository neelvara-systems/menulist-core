#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    acquireChatAnalyticsBackfillLease,
    backfillChatAnalyticsDays,
    releaseChatAnalyticsBackfillLease,
    syncChatAnalyticsNightly,
} from '../../functions-answerlattice/src/answerlattice/chatAnalyticsAggregation';
import { syncAnswerlatticeChatIntelligence } from '../../functions-answerlattice/src/answerlattice/chatIntelligence';
import { admin, firestoreAdmin } from '../../functions-answerlattice/src/firebaseAdmin';

const Timestamp = admin.firestore.Timestamp;

const yesterday = new Date();
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
yesterday.setUTCHours(12, 0, 0, 0);
const dateKey = yesterday.toISOString().slice(0, 10);

const message = (
    id: string,
    role: 'user' | 'assistant',
    feedback?: { isGood: boolean; comments?: string },
    question = 'Why did billing fail?',
) => ({
    id,
    role,
    ...(role === 'user' ? { content: question } : { craftedAnswer: 'Check the invoice status.' }),
    ...(feedback ? { feedback } : {}),
    createdOn: Timestamp.fromDate(yesterday),
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await firestoreAdmin.recursiveDelete(firestoreAdmin.collection('chatSessions'));
    await firestoreAdmin.recursiveDelete(firestoreAdmin.collection('chatAnalytics'));
    await firestoreAdmin.recursiveDelete(firestoreAdmin.collection('insights'));
    await firestoreAdmin.recursiveDelete(firestoreAdmin.collection('platformSummary'));

    await assert.rejects(
        Reflect.apply(syncChatAnalyticsNightly, null, ['1', 101]),
        /scope_invalid/,
        'runtime callers must not coerce scope IDs',
    );
    const poisonedStateRef = firestoreAdmin.collection('platformSummary').doc('chatAnalyticsState_3_303');
    await poisonedStateRef.set({ pId: 'AL', tId: 3, sId: 304, cursorModifiedOn: Timestamp.now() });
    await assert.rejects(
        syncChatAnalyticsNightly(3, 303),
        /state_scope_invalid/,
        'persisted continuation state must match the requested workspace',
    );
    await poisonedStateRef.set({
        pId: 'AL',
        tId: 3,
        sId: 303,
        cursorModifiedOn: Timestamp.now(),
        cursorDocumentId: ' malformed ',
    });
    await assert.rejects(
        syncChatAnalyticsNightly(3, 303),
        /state_cursor_invalid/,
        'malformed continuation document IDs must fail closed',
    );

    const now = Timestamp.now();
    await firestoreAdmin.collection('chatSessions').doc('session-1').set({
        pId: 'AL', tId: 1, sId: 101, uId: 'owner-1', title: 'Billing help', mode: 'qna',
        messages: [message('message-1', 'user'), message('message-2', 'assistant', { isGood: false, comments: 'Stale answer' })],
        createdOn: Timestamp.fromDate(yesterday), modifiedOn: now, createdBy: 'Owner', modifiedBy: 'Owner',
    });
    await firestoreAdmin.collection('chatSessions').doc('other-product').set({
        pId: 'ML', tId: 1, sId: 101, title: 'Must not count', mode: 'qna', messages: [],
        createdOn: Timestamp.fromDate(yesterday), modifiedOn: now,
    });
    await firestoreAdmin.collection('chatSessions').doc('other-workspace').set({
        pId: 'AL', tId: 2, sId: 202, title: 'Must not count', mode: 'qna', messages: [],
        createdOn: Timestamp.fromDate(yesterday), modifiedOn: now,
    });

    const first = await syncChatAnalyticsNightly(1, 101);
    assert.equal(first.summariesWritten, 1);
    const summaryRef = firestoreAdmin.collection('chatAnalytics').doc(`1_101_${dateKey}`);
    const summary = (await summaryRef.get()).data();
    assert.equal(summary?.pId, 'AL');
    assert.equal(summary?.tId, 1);
    assert.equal(summary?.sId, 101);
    assert.equal(summary?.totalChats, 1);
    assert.equal(summary?.negativeFeedback, 1);
    assert.equal(summary?.knowledgeGaps?.[0]?.count, 1);
    assert.equal(summary?.sourceComplete, true);

    const second = await syncChatAnalyticsNightly(1, 101);
    assert.equal(second.summariesWritten, 0, 'unchanged summaries must not be rewritten');
    assert.ok(second.summariesSkipped >= 1);

    const leaseNow = Timestamp.now();
    const leaseId = await acquireChatAnalyticsBackfillLease(1, 101, leaseNow);
    assert.ok(leaseId, 'first manual backfill must acquire the scoped lease');
    assert.equal(
        await acquireChatAnalyticsBackfillLease(1, 101, Timestamp.fromMillis(leaseNow.toMillis() + 1)),
        null,
        'concurrent manual backfill must be rejected',
    );
    await releaseChatAnalyticsBackfillLease(1, 101, 'not-the-owner');
    assert.equal((await firestoreAdmin.collection('platformSummary').doc('chatAnalyticsState_1_101').get()).get('manualBackfillLeaseId'), leaseId);
    await releaseChatAnalyticsBackfillLease(1, 101, leaseId as string);
    assert.equal(
        await acquireChatAnalyticsBackfillLease(1, 101, Timestamp.fromMillis(leaseNow.toMillis() + 30_000)),
        null,
        'immediate repeat must respect the persisted cooldown',
    );
    const nextLeaseId = await acquireChatAnalyticsBackfillLease(1, 101, Timestamp.fromMillis(leaseNow.toMillis() + 61_000));
    assert.ok(nextLeaseId, 'backfill may run again after the cooldown');
    await releaseChatAnalyticsBackfillLease(1, 101, nextLeaseId as string);

    const backfill = await backfillChatAnalyticsDays(1, 101, 1, new Date(yesterday.getTime() + 24 * 60 * 60 * 1000));
    assert.equal(backfill.results.length, 1);
    assert.equal(backfill.results[0].date, dateKey);
    assert.equal(backfill.results[0].status, 'skipped', 'unchanged canonical summary must not be rewritten');
    assert.equal(backfill.results[0].chats, 1);
    assert.equal(backfill.results[0].partial, false);

    const intelligenceNow = new Date(yesterday);
    intelligenceNow.setUTCDate(intelligenceNow.getUTCDate() + 1);
    intelligenceNow.setUTCHours(12, 0, 0, 0);
    const firstIntelligence = await syncAnswerlatticeChatIntelligence(1, 101, {
        generateWeekly: true,
        now: intelligenceNow,
    });
    assert.equal(firstIntelligence.daysRead, 1);
    assert.equal(firstIntelligence.feedbackWritten, true);
    assert.equal(firstIntelligence.weeklyWritten, true);

    const feedbackRef = firestoreAdmin.doc('insights/1/stores/101/ai/feedback');
    const weeklyRef = firestoreAdmin.doc('insights/1/stores/101/ai/weekly');
    const feedback = (await feedbackRef.get()).data();
    const weekly = (await weeklyRef.get()).data();
    assert.equal(feedback?.pId, 'AL');
    assert.equal(feedback?.tId, 1);
    assert.equal(feedback?.sId, 101);
    assert.equal(feedback?.generationMode, 'deterministic');
    assert.equal(feedback?.totalFeedbackAnalyzed, 1);
    assert.equal(feedback?.themes?.[0]?.theme, 'Why did billing fail?');
    assert.equal(weekly?.pId, 'AL');
    assert.equal(weekly?.tId, 1);
    assert.equal(weekly?.sId, 101);
    assert.equal(weekly?.generationMode, 'deterministic');
    assert.equal(weekly?.sourceCompleteness?.currentDays, 1);
    assert.equal(weekly?.sourceCompleteness?.previousDays, 0);
    assert.equal(weekly?.sourceCompleteness?.currentWeekComplete, false);
    assert.equal(weekly?.sourceCompleteness?.comparisonComplete, false);
    assert.match(weekly?.narrative || '', /1 conversation for/);
    assert.match(weekly?.narrative || '', /Recorded positive feedback was/);

    const replay = await syncAnswerlatticeChatIntelligence(1, 101, {
        generateWeekly: true,
        now: intelligenceNow,
    });
    assert.equal(replay.feedbackWritten, false, 'identical feedback input must be a no-op');
    assert.equal(replay.weeklyWritten, false, 'identical weekly input must be a no-op');

    await summaryRef.update({ sourceComplete: false });
    await assert.rejects(
        syncAnswerlatticeChatIntelligence(1, 101, {
            generateWeekly: true,
            now: intelligenceNow,
        }),
        /source_invalid/,
        'partial or malformed daily evidence must not enter weekly intelligence',
    );
    await summaryRef.update({ sourceComplete: true });

    await firestoreAdmin.collection('chatSessions').doc('session-2').set({
        pId: 'AL', tId: 1, sId: 101, uId: 'owner-1', title: 'Checkout help', mode: 'qna',
        messages: [
            message('message-3', 'user', undefined, 'Why is checkout slow?'),
            message('message-4', 'assistant', { isGood: false, comments: 'Missing timeout guidance' }),
        ],
        createdOn: Timestamp.fromDate(yesterday),
        modifiedOn: Timestamp.fromMillis(now.toMillis() + 1_000),
        createdBy: 'Owner',
        modifiedBy: 'Owner',
    });
    const refreshedSummary = await syncChatAnalyticsNightly(1, 101);
    assert.equal(refreshedSummary.summariesWritten, 1);
    const refreshedIntelligence = await syncAnswerlatticeChatIntelligence(1, 101, {
        generateWeekly: true,
        now: intelligenceNow,
    });
    assert.equal(refreshedIntelligence.feedbackWritten, true, 'changed gaps must refresh feedback insight');
    assert.equal(refreshedIntelligence.weeklyWritten, true, 'changed volume must refresh weekly insight');
    const refreshedFeedback = (await feedbackRef.get()).data();
    assert.equal(refreshedFeedback?.themes?.length, 2);
    assert.equal(refreshedFeedback?.totalFeedbackAnalyzed, 2);
}

run()
    .then(() => process.stdout.write('Answerlattice chat analytics scheduler passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
