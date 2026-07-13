#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const {
    computeRiskStateForTest,
    getRecentQualifyingHealthSignalWeeksForTest,
    groupHealthSignalDailyDocumentsForTest,
    normalizeHealthSignalDailyDocumentForTest,
} = require('../../functions/lib/functions/src/analytics/healthSignalsComputation.js');
const {
    getTodayLiveStats,
    initializeTodayDoc,
    onChatComplete,
    onFeedbackAdded,
    onRegenerationEvent,
} = require('../../functions/lib/functions/src/analytics/realtimeTracking.js');
const {
    claimStalenessDetectionForTest,
} = require('../../functions/lib/functions/src/analytics/stalenessCheck.js');
const { firestoreAdmin } = require('../../functions/lib/functions/src/firebaseAdmin.js');
const requireFromFunctions = createRequire(require.resolve('../../functions/package.json'));
const { Timestamp } = requireFromFunctions('firebase-admin/firestore');

const DAY_MS = 24 * 60 * 60 * 1000;

async function clearCollection(collectionName: string): Promise<void> {
    const snapshot = await firestoreAdmin.collection(collectionName).get();
    for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
        const batch = firestoreAdmin.batch();
        snapshot.docs.slice(offset, offset + 400).forEach((document: { ref: unknown }) => {
            batch.delete(document.ref);
        });
        await batch.commit();
    }
}

async function verifyRealtimeCounters(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const documentRef = firestoreAdmin.collection('chatAnalytics').doc(`1_101_${today}`);
    await documentRef.set({
        assistantChats: 7,
        date: today,
        negativeFeedback: 0,
        positiveFeedback: 0,
        qnaChats: 2,
        sId: '101',
        tId: '1',
        totalChats: 9,
        totalFeedback: 0,
        totalMessages: 20,
        totalRegenerations: 0,
    });

    await onChatComplete({
        hasFeedback: false,
        isPositive: false,
        messageCount: 3,
        mode: 'qna',
        regenerationCount: 1,
        sId: '101',
        sessionId: 'session-1',
        tId: '1',
    });
    let data = (await documentRef.get()).data() || {};
    assert.equal(data.qnaChats, 3, 'selected mode must increment');
    assert.equal(data.assistantChats, 7, 'selected mode must not erase the opposite mode counter');
    assert.equal(data.totalChats, 10);
    assert.equal(data.totalMessages, 23);

    await initializeTodayDoc({ tId: '1', sId: '101' });
    data = (await documentRef.get()).data() || {};
    assert.equal(data.totalChats, 10, 'initialization must not reset an existing daily document');
    assert.equal(data.assistantChats, 7, 'initialization must preserve accumulated mode counters');

    await onChatComplete({
        hasFeedback: false,
        isPositive: false,
        messageCount: -1,
        mode: 'assistant',
        regenerationCount: 0,
        sId: '101',
        sessionId: 'session-invalid',
        tId: '1',
    });
    data = (await documentRef.get()).data() || {};
    assert.equal(data.totalChats, 10, 'invalid runtime counters must fail before persistence');

    await onChatComplete({
        hasFeedback: false,
        isPositive: false,
        messageCount: 1,
        mode: 'qna',
        regenerationCount: 0,
        sId: '101',
        sessionId: 'session-forged-scope',
        tId: '01',
    });
    const forgedScopeDoc = await firestoreAdmin.collection('chatAnalytics').doc(`01_101_${today}`).get();
    assert.equal(forgedScopeDoc.exists, false, 'non-canonical tenant scope must fail before persistence');

    await onFeedbackAdded({ tId: '1', sId: '101', isPositive: true, date: '2026-02-30' });
    const invalidDateDoc = await firestoreAdmin.collection('chatAnalytics').doc('1_101_2026-02-30').get();
    assert.equal(invalidDateDoc.exists, false, 'invalid calendar dates must not create analytics documents');

    const feedbackOnlyRef = firestoreAdmin.collection('chatAnalytics').doc('1_202_2026-07-10');
    await onFeedbackAdded({ tId: '1', sId: '202', isPositive: true, date: '2026-07-10' });
    const feedbackOnly = (await feedbackOnlyRef.get()).data() || {};
    assert.deepEqual(
        { tId: feedbackOnly.tId, sId: feedbackOnly.sId, date: feedbackOnly.date },
        { tId: '1', sId: '202', date: '2026-07-10' },
        'feedback-first writes must persist the full analytics identity',
    );

    const regenerationOnlyRef = firestoreAdmin.collection('chatAnalytics').doc('1_303_2026-07-10');
    await onRegenerationEvent({ tId: '1', sId: '303', date: '2026-07-10' });
    const regenerationOnly = (await regenerationOnlyRef.get()).data() || {};
    assert.deepEqual(
        { tId: regenerationOnly.tId, sId: regenerationOnly.sId, date: regenerationOnly.date },
        { tId: '1', sId: '303', date: '2026-07-10' },
        'regeneration-first writes must persist the full analytics identity',
    );

    await documentRef.set({ totalChats: -1, qnaChats: '3', assistantChats: 4 }, { merge: true });
    const normalizedStats = await getTodayLiveStats({ tId: '1', sId: '101' });
    assert.equal(normalizedStats.totalChats, 0, 'negative persisted counters must not reach consumers');
    assert.equal(normalizedStats.qnaChats, 0, 'string counters must not be coerced into analytics truth');
    assert.equal(normalizedStats.assistantChats, 4, 'valid persisted counters must survive normalization');
}

function verifyHealthSignalContracts(): void {
    const localDate = '2026-07-06';
    const documentId = `1_101_menu_project_daily_${localDate}`;
    const valid = normalizeHealthSignalDailyDocumentForTest(documentId, {
        analyticsScope: 'customer',
        grain: 'daily',
        localDate,
        projectId: 'menu_project',
        sId: '101',
        surface: 'menu',
        tId: '1',
        totalActions: 10,
        totalViews: 100,
        uniqueVisitors: 60,
        viewsByEntrySource: { direct: 20 },
    }, '1', '101');
    assert(valid, 'current project-scoped analytics identity must be admitted');
    assert.equal(valid.directVisits, 20, 'direct visits may use the exact entry-source counter');

    const missingUnique = normalizeHealthSignalDailyDocumentForTest(documentId, {
        analyticsScope: 'customer',
        grain: 'daily',
        localDate,
        projectId: 'menu_project',
        sId: '101',
        surface: 'menu',
        tId: '1',
        totalActions: 10,
        totalViews: 100,
        viewsByEntrySource: { direct: 20 },
    }, '1', '101');
    assert.equal(missingUnique, null, 'missing exact unique counts must hide signals rather than invent percentages');

    const forgedScope = normalizeHealthSignalDailyDocumentForTest(documentId, {
        analyticsScope: 'customer',
        grain: 'daily',
        localDate,
        projectId: 'menu_project',
        sId: '202',
        surface: 'menu',
        tId: '1',
        totalActions: 10,
        totalViews: 100,
        uniqueVisitors: 60,
        viewsByEntrySource: { direct: 20 },
    }, '1', '101');
    assert.equal(forgedScope, null, 'cross-store embedded analytics identity must fail closed');

    const zeroCounts = normalizeHealthSignalDailyDocumentForTest(documentId, {
        analyticsScope: 'customer',
        grain: 'daily',
        localDate,
        projectId: 'menu_project',
        sId: '101',
        surface: 'menu',
        tId: '1',
        totalActions: 0,
        totalViews: 0,
        uniqueVisitors: 0,
        viewsByEntrySource: { direct: 0 },
    }, '1', '101');
    assert(zeroCounts, 'exact zero counters must remain valid');
    const zeroWeeks = groupHealthSignalDailyDocumentsForTest([zeroCounts]);
    assert.equal(zeroWeeks[0].uniqueVisitors, 0, 'zero unique counts must not trigger percentage fallback');
    assert.equal(zeroWeeks[0].directVisits, 0, 'zero direct counts must not trigger percentage fallback');

    const weeks = [
        { weekStart: '2026-06-08', totalViews: 100, uniqueVisitors: 60, directVisits: 20, totalActions: 30, daysWithData: 7 },
        { weekStart: '2026-06-15', totalViews: 100, uniqueVisitors: 60, directVisits: 20, totalActions: 30, daysWithData: 7 },
        { weekStart: '2026-06-22', totalViews: 60, uniqueVisitors: 60, directVisits: 10, totalActions: 10, daysWithData: 7 },
        { weekStart: '2026-06-29', totalViews: 60, uniqueVisitors: 60, directVisits: 10, totalActions: 10, daysWithData: 7 },
    ];
    assert.equal(
        getRecentQualifyingHealthSignalWeeksForTest(
            weeks,
            new Date('2026-07-06T03:00:00.000Z'),
        ).length,
        4,
        'four consecutive completed qualifying weeks must be admitted',
    );
    const gappedWeeks = [weeks[0], weeks[1], weeks[3], {
        ...weeks[3],
        weekStart: '2026-07-06',
    }];
    assert.equal(
        getRecentQualifyingHealthSignalWeeksForTest(
            gappedWeeks,
            new Date('2026-07-13T03:00:00.000Z'),
        ).length,
        0,
        'non-consecutive qualifying weeks must keep the signal hidden',
    );
    const weak = { state: 'weak', visible: true, dataPoints: 4, computedAt: '2026-07-06T03:00:00.000Z' };
    const previousRisk = {
        state: 'watch',
        visible: true,
        consecutiveWeakWeeks: 2,
        computedAt: '2026-07-06T03:00:00.000Z',
    };
    const sameWeek = computeRiskStateForTest(
        weak,
        weak,
        weeks,
        previousRisk,
        new Date('2026-07-08T03:00:00.000Z'),
    );
    assert.equal(sameWeek.consecutiveWeakWeeks, 2, 'same-week retries must not advance weak-week duration');
    const nextWeek = computeRiskStateForTest(
        weak,
        weak,
        weeks,
        previousRisk,
        new Date('2026-07-13T03:00:00.000Z'),
    );
    assert.equal(nextWeek.consecutiveWeakWeeks, 3, 'a later ISO week may advance weak-week duration once');

    const stable = { state: 'stable', visible: true, dataPoints: 4, computedAt: '2026-07-06T03:00:00.000Z' };
    const partialCurrentWeek = {
        weekStart: '2026-07-06',
        totalViews: 1,
        uniqueVisitors: 1,
        directVisits: 0,
        totalActions: 0,
        daysWithData: 1,
    };
    const stableCompletedWeeks = weeks.map((week) => ({ ...week, totalActions: 30 }));
    const currentWeekRisk = computeRiskStateForTest(
        stable,
        stable,
        [...stableCompletedWeeks, partialCurrentWeek],
        { ...stable, consecutiveWeakWeeks: 0 },
        new Date('2026-07-08T03:00:00.000Z'),
    );
    assert.equal(currentWeekRisk.state, 'stable', 'partial current-week activity must not trigger decline');
    assert.equal(currentWeekRisk.consecutiveWeakWeeks, 0, 'partial current-week activity must not advance risk duration');
}

async function verifyStalenessClaims(): Promise<void> {
    const now = Timestamp.fromDate(new Date('2026-07-13T00:00:00.000Z'));
    const base = {
        daysSincePublish: 100,
        now,
        score: 40,
        sId: '101',
        tId: '1',
    };
    const concurrent = await Promise.all([
        claimStalenessDetectionForTest(firestoreAdmin, base),
        claimStalenessDetectionForTest(firestoreAdmin, base),
    ]);
    assert.equal(
        concurrent.filter((result) => result.newDetection).length,
        1,
        'concurrent staleness runs must claim one tenant/store detection',
    );

    const duplicate = await claimStalenessDetectionForTest(firestoreAdmin, base);
    assert.equal(duplicate.newDetection, false, 'recent tenant/store checkpoint must enforce cooldown');

    const otherTenant = await claimStalenessDetectionForTest(firestoreAdmin, { ...base, tId: '2' });
    assert.equal(otherTenant.newDetection, true, 'another tenant must have an independent cooldown key');

    await firestoreAdmin.collection('messageLogs').doc('legacy-recent').set({
        type: 'staleness_check',
        recipientStoreId: '303',
        tId: '3',
        sentAt: Timestamp.fromMillis(now.toMillis() - 10 * DAY_MS),
    });
    const migratedLegacy = await claimStalenessDetectionForTest(firestoreAdmin, {
        ...base,
        sId: '303',
        tId: '3',
    });
    assert.equal(migratedLegacy.newDetection, false, 'recent same-tenant legacy detection must preserve cooldown');
    assert.equal(migratedLegacy.checkpointWritten, true, 'legacy detection must migrate to a scoped checkpoint');

    await firestoreAdmin.collection('messageLogs').doc('legacy-other-tenant').set({
        type: 'staleness_check',
        recipientStoreId: '404',
        tId: '4',
        sentAt: Timestamp.fromMillis(now.toMillis() - 10 * DAY_MS),
    });
    const differentTenant = await claimStalenessDetectionForTest(firestoreAdmin, {
        ...base,
        daysSincePublish: null,
        score: null,
        sId: '404',
        tId: '5',
    });
    assert.equal(differentTenant.newDetection, true, 'legacy rows from another tenant must not suppress detection');
    const persisted = (await firestoreAdmin.collection('messageLogs').doc('staleness_check_5_404').get()).data() || {};
    assert.equal(persisted.metadata?.daysSincePublish, null, 'missing legacy metrics must persist as null, not undefined');
    assert.equal(persisted.metadata?.truthScore, null, 'missing legacy scores must persist as null, not undefined');

    const afterCooldown = await claimStalenessDetectionForTest(firestoreAdmin, {
        ...base,
        now: Timestamp.fromMillis(now.toMillis() + 91 * DAY_MS),
    });
    assert.equal(afterCooldown.newDetection, true, 'expired checkpoint must permit the next cooldown-cycle detection');
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await clearCollection('chatAnalytics');
    await clearCollection('messageLogs');
    verifyHealthSignalContracts();
    await verifyRealtimeCounters();
    await verifyStalenessClaims();
    process.stdout.write('Functions analytics persistence tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
