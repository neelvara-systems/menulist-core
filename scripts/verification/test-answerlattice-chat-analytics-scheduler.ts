#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    acquireChatAnalyticsBackfillLease,
    backfillChatAnalyticsDays,
    rebuildChatAnalyticsForDeletedSession,
    releaseChatAnalyticsBackfillLease,
    syncChatAnalyticsNightly,
} from '../../functions-answerlattice/src/answerlattice/chatAnalyticsAggregation';
import { syncAnswerlatticeChatIntelligence } from '../../functions-answerlattice/src/answerlattice/chatIntelligence';
import { recoverChatAnalyticsAfterDeletedSession } from '../../functions-answerlattice/src/answerlattice/chatAnalyticsDeletionRecovery';
import { admin, firestoreAdmin } from '../../functions-answerlattice/src/firebaseAdmin';

const Timestamp = admin.firestore.Timestamp;
const platformOperator = {
    accessRevision: 2,
    email: 'platform@example.com',
    platformRole: 'PLATFORM',
    userId: 'platform-user',
} as const;

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
    await firestoreAdmin.recursiveDelete(firestoreAdmin.collection('users'));
    await firestoreAdmin.collection('users').doc(platformOperator.userId).set({
        accessRevision: platformOperator.accessRevision,
        active: true,
        email: platformOperator.email,
        id: platformOperator.userId,
        isVerified: true,
        pId: 'AL',
        platformRole: platformOperator.platformRole,
        productId: 'AL',
        uId: platformOperator.userId,
    });

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

    const deletedSessionSnapshot = await firestoreAdmin.collection('chatSessions').doc('session-1').get();
    await deletedSessionSnapshot.ref.delete();
    const deleteRebuild = await rebuildChatAnalyticsForDeletedSession(
        deletedSessionSnapshot.id,
        deletedSessionSnapshot.data(),
    );
    assert.equal(deleteRebuild?.date, dateKey);
    assert.equal(deleteRebuild?.written, true);
    assert.equal(deleteRebuild?.totalChats, 0);
    assert.equal((await summaryRef.get()).get('totalChats'), 0);
    assert.equal((await summaryRef.get()).get('negativeFeedback'), 0);
    const deleteReplay = await rebuildChatAnalyticsForDeletedSession(
        deletedSessionSnapshot.id,
        deletedSessionSnapshot.data(),
    );
    assert.equal(deleteReplay?.written, false, 'delete-event replay must be source-hash idempotent');
    assert.equal(
        await rebuildChatAnalyticsForDeletedSession('session-1', {
            ...deletedSessionSnapshot.data(),
            pId: 'ML',
        }),
        null,
        'cross-product deleted rows must not rebuild Answerlattice analytics',
    );

    await deletedSessionSnapshot.ref.set(deletedSessionSnapshot.data() || {});
    const restoredSummary = await syncChatAnalyticsNightly(1, 101);
    assert.equal(restoredSummary.summariesWritten, 1);
    assert.equal((await summaryRef.get()).get('totalChats'), 1);

    const second = await syncChatAnalyticsNightly(1, 101);
    assert.equal(second.summariesWritten, 0, 'unchanged summaries must not be rewritten');
    assert.ok(second.summariesSkipped >= 1);

    const leaseNow = Timestamp.now();
    const leaseId = await acquireChatAnalyticsBackfillLease(1, 101, platformOperator, leaseNow);
    assert.ok(leaseId, 'first manual backfill must acquire the scoped lease');
    assert.equal(
        await acquireChatAnalyticsBackfillLease(
            1,
            101,
            platformOperator,
            Timestamp.fromMillis(leaseNow.toMillis() + 1),
        ),
        null,
        'concurrent manual backfill must be rejected',
    );
    await releaseChatAnalyticsBackfillLease(1, 101, 'not-the-owner');
    assert.equal((await firestoreAdmin.collection('platformSummary').doc('chatAnalyticsState_1_101').get()).get('manualBackfillLeaseId'), leaseId);
    await releaseChatAnalyticsBackfillLease(1, 101, leaseId as string);
    assert.equal(
        await acquireChatAnalyticsBackfillLease(
            1,
            101,
            platformOperator,
            Timestamp.fromMillis(leaseNow.toMillis() + 30_000),
        ),
        null,
        'immediate repeat must respect the persisted cooldown',
    );
    await firestoreAdmin.collection('users').doc(platformOperator.userId).update({ accessRevision: 3 });
    await assert.rejects(
        acquireChatAnalyticsBackfillLease(
            1,
            101,
            platformOperator,
            Timestamp.fromMillis(leaseNow.toMillis() + 61_000),
        ),
        /operator_revoked/,
        'a stale platform token must not acquire a lease after durable authority changes',
    );
    await firestoreAdmin.collection('users').doc(platformOperator.userId).update({
        accessRevision: platformOperator.accessRevision,
    });
    const nextLeaseId = await acquireChatAnalyticsBackfillLease(
        1,
        101,
        platformOperator,
        Timestamp.fromMillis(leaseNow.toMillis() + 61_000),
    );
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
    assert.equal(feedback?.schemaVersion, 2);
    assert.equal(feedback?.generationMode, 'deterministic');
    assert.equal(feedback?.totalFeedbackAnalyzed, undefined);
    assert.equal(feedback?.themes?.[0]?.theme, 'Why did billing fail?');
    assert.equal(weekly?.pId, 'AL');
    assert.equal(weekly?.tId, 1);
    assert.equal(weekly?.sId, 101);
    assert.equal(weekly?.schemaVersion, 2);
    assert.equal(weekly?.generationMode, 'deterministic');
    assert.equal(weekly?.sourceCompleteness?.currentDays, 1);
    assert.equal(weekly?.sourceCompleteness?.previousDays, 0);
    assert.equal(weekly?.sourceCompleteness?.currentWeekComplete, false);
    assert.equal(weekly?.sourceCompleteness?.comparisonComplete, false);
    assert.equal(weekly?.keyMetrics?.volumeChangePercent, null);
    assert.equal(weekly?.keyMetrics?.positiveFeedbackSharePointChange, null);
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
    assert.equal(refreshedFeedback?.totalFeedbackAnalyzed, undefined);

    const deletedSecondSnapshot = await firestoreAdmin.collection('chatSessions').doc('session-2').get();
    await deletedSecondSnapshot.ref.delete();
    const cascadedDelete = await recoverChatAnalyticsAfterDeletedSession(
        deletedSecondSnapshot.id,
        deletedSecondSnapshot.data(),
        intelligenceNow,
    );
    assert.equal(cascadedDelete.aggregate?.totalChats, 1);
    assert.equal(cascadedDelete.intelligence?.feedbackWritten, true);
    assert.equal(cascadedDelete.intelligence?.weeklyWritten, true);
    const feedbackAfterDelete = (await feedbackRef.get()).data();
    assert.equal(feedbackAfterDelete?.themes?.length, 1);
    assert.equal(feedbackAfterDelete?.totalFeedbackAnalyzed, undefined);
    const deleteCascadeReplay = await recoverChatAnalyticsAfterDeletedSession(
        deletedSecondSnapshot.id,
        deletedSecondSnapshot.data(),
        intelligenceNow,
    );
    assert.equal(deleteCascadeReplay.aggregate?.written, false);
    assert.equal(deleteCascadeReplay.intelligence?.feedbackWritten, false);
    assert.equal(deleteCascadeReplay.intelligence?.weeklyWritten, false);

    const partialDate = new Date(intelligenceNow);
    partialDate.setUTCDate(partialDate.getUTCDate() - 2);
    const partialDateKey = partialDate.toISOString().slice(0, 10);
    await firestoreAdmin.collection('chatAnalytics').doc(`1_101_${partialDateKey}`).set({
        pId: 'AL',
        tId: 1,
        sId: 101,
        date: partialDateKey,
        totalChats: 2_000,
        totalMessages: 4_000,
        positiveFeedback: 0,
        negativeFeedback: 0,
        totalFeedback: 0,
        totalRegenerations: 0,
        qnaChats: 2_000,
        assistantChats: 0,
        topQuestions: [],
        knowledgeGaps: [],
        sourceComplete: false,
        sourceSessionCount: 2_000,
        sourceLimit: 2_000,
        createdOn: Timestamp.now(),
        modifiedOn: Timestamp.now(),
    });
    const invalidatedDelete = await recoverChatAnalyticsAfterDeletedSession(
        deletedSecondSnapshot.id,
        deletedSecondSnapshot.data(),
        intelligenceNow,
    );
    assert.equal(invalidatedDelete.intelligenceInvalidated, true);
    assert.equal((await feedbackRef.get()).exists, false);
    assert.equal((await weeklyRef.get()).exists, false);
}

run()
    .then(() => process.stdout.write('Answerlattice chat analytics scheduler passed.\n'))
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
        process.exit(1);
    });
