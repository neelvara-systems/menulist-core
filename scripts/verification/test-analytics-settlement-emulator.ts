#!/usr/bin/env ts-node

const {
    applyLateDailyCorrection,
    assertCurrentPlatformAnalyticsAuthority,
    cleanupOldDocuments,
    updateSummaryDocument,
} = require('../../functions/lib/aggregateCustomerAnalytics.js');
const { firestoreAdmin } = require('../../functions/lib/firebaseAdmin.js');
const {
    normalizeDashboardAnalyticsIdentityForTest,
    normalizeDashboardAnalyticsRowForTest,
    normalizeDashboardAnalyticsSummaryForTest,
} = require('../../functions/lib/analytics/dashboardSummaryAggregation.js');
const {
    aggregateOBPAnalyticsForStoreDate,
    applyLateOBPCorrection,
    normalizeOBPDailyForTest,
    normalizeOBPDashboardIdentityForTest,
} = require('../../functions/lib/analytics/obpAnalyticsAggregation.js');

const T_ID = '1';
const S_ID = '101';
const PROJECT_ID = 'menu_project';

const dailyDocId = (date: string) => `${T_ID}_${S_ID}_${PROJECT_ID}_daily_${date}`;
const summaryDocId = `${T_ID}_${S_ID}_${PROJECT_ID}_overall_summary`;
const dashboardDocId = `${T_ID}_${S_ID}_${PROJECT_ID}_dashboard_summary`;
const obpDailyDocId = (date: string) => `${T_ID}_${S_ID}_obp_daily_${date}`;
const obpSummaryDocId = `${T_ID}_${S_ID}_obp_overall_summary`;
const obpDashboardDocId = `${T_ID}_${S_ID}_obp_dashboard_summary`;

const dailyRecord = (date: string, totalViews: number) => ({
    analyticsScope: 'customer',
    date,
    grain: 'daily',
    localDate: date,
    projectId: PROJECT_ID,
    sId: S_ID,
    storeTimeZone: 'UTC',
    surface: 'menu',
    tId: T_ID,
    totalViews,
});

const obpDailyRecord = (date: string, totalOBPViews: number) => ({
    analyticsScope: 'customer',
    date,
    grain: 'daily',
    localDate: date,
    projectId: 'obp',
    sId: S_ID,
    storeTimeZone: 'UTC',
    surface: 'obp',
    tId: T_ID,
    totalOBPViews,
});

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function clearAnalytics(): Promise<void> {
    const snapshot = await firestoreAdmin.collection('analytics').get();
    for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
        const batch = firestoreAdmin.batch();
        snapshot.docs.slice(offset, offset + 400).forEach((document) => batch.delete(document.ref));
        await batch.commit();
    }
}

async function verifyCurrentPlatformAnalyticsAuthority(): Promise<void> {
    const userId = 'analytics-platform-owner';
    const userRef = firestoreAdmin.collection('users').doc(userId);
    const auth = {
        uid: userId,
        token: { platformRole: 'PLATFORM' },
    };

    await userRef.set({
        active: true,
        authDisabled: false,
        blocked: false,
        deleted: false,
        isVerified: true,
        platformRole: 'PLATFORM',
    });
    await assertCurrentPlatformAnalyticsAuthority(firestoreAdmin, auth);

    for (const invalidCurrentUser of [
        { platformRole: 'USER' },
        { platformRole: 'PLATFORM', active: false },
        { platformRole: 'PLATFORM', authDisabled: true },
        { platformRole: 'PLATFORM', blocked: true },
        { platformRole: 'PLATFORM', deleted: true },
        { platformRole: 'PLATFORM', isVerified: false },
    ]) {
        await userRef.set(invalidCurrentUser);
        let rejected = false;
        try {
            await assertCurrentPlatformAnalyticsAuthority(firestoreAdmin, auth);
        } catch (error) {
            rejected = (error as { code?: unknown }).code === 'permission-denied';
        }
        assert(rejected, 'stale platform claim must not bypass current persisted user authority');
    }

    await userRef.delete();
    let missingRejected = false;
    try {
        await assertCurrentPlatformAnalyticsAuthority(firestoreAdmin, auth);
    } catch (error) {
        missingRejected = (error as { code?: unknown }).code === 'permission-denied';
    }
    assert(missingRejected, 'deleted platform user must fail closed');
}

async function verifyExplicitSettlementDate(): Promise<void> {
    const settlementDate = '2026-07-10';
    const legacyDaily = { ...dailyRecord(settlementDate, 5) };
    delete (legacyDaily as { date?: string }).date;

    const first = await updateSummaryDocument(
        firestoreAdmin,
        T_ID,
        S_ID,
        PROJECT_ID,
        legacyDaily,
        settlementDate,
    );
    const duplicate = await updateSummaryDocument(
        firestoreAdmin,
        T_ID,
        S_ID,
        PROJECT_ID,
        legacyDaily,
        settlementDate,
    );
    const summary = (await firestoreAdmin.collection('analytics').doc(summaryDocId).get()).data() || {};

    assert(first === true, 'first explicit-date settlement must update');
    assert(duplicate === false, 'duplicate explicit-date settlement must be idempotent');
    assert(summary.lastAggregatedDate === settlementDate, 'settlement must not substitute the current UTC date');
    assert(summary.lifetimeTotalViews === 5, 'duplicate settlement must not double increment');
}

async function verifyMalformedSummaryRejected(): Promise<void> {
    const settlementDate = '2026-07-11';
    await firestoreAdmin.collection('analytics').doc(summaryDocId).set({
        lastAggregatedDate: { malformed: true },
        lifetimeTotalViews: 5,
    });
    let malformedDateRejected = false;
    try {
        await updateSummaryDocument(
            firestoreAdmin,
            T_ID,
            S_ID,
            PROJECT_ID,
            dailyRecord(settlementDate, 4),
            settlementDate,
        );
    } catch (error) {
        malformedDateRejected = error instanceof Error
            && error.message === 'CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID';
    }
    const afterMalformedDate = (await firestoreAdmin.collection('analytics').doc(summaryDocId).get()).data() || {};
    assert(malformedDateRejected, 'malformed summary idempotency date must fail visibly');
    assert(afterMalformedDate.lifetimeTotalViews === 5, 'malformed summary rejection must not partially increment totals');

    await firestoreAdmin.collection('analytics').doc(summaryDocId).set({
        lastAggregatedDate: '2026-07-10',
        lifetimeTotalViews: '5',
    });
    let malformedCounterRejected = false;
    try {
        await updateSummaryDocument(
            firestoreAdmin,
            T_ID,
            S_ID,
            PROJECT_ID,
            dailyRecord(settlementDate, 4),
            settlementDate,
        );
    } catch (error) {
        malformedCounterRejected = error instanceof Error
            && error.message === 'CUSTOMER_ANALYTICS_SUMMARY_CONTRACT_INVALID';
    }
    const afterMalformedCounter = (await firestoreAdmin.collection('analytics').doc(summaryDocId).get()).data() || {};
    assert(malformedCounterRejected, 'malformed summary lifetime counter must fail visibly');
    assert(afterMalformedCounter.lifetimeTotalViews === '5', 'malformed counter rejection must preserve the persisted value for repair');
}

async function verifyAtomicLateCorrection(): Promise<void> {
    const correctionDate = '2026-07-09';
    await Promise.all([
        firestoreAdmin.collection('analytics').doc(dailyDocId(correctionDate)).set(dailyRecord(correctionDate, 4)),
        firestoreAdmin.collection('analytics').doc(dashboardDocId).set({
            daily30d: [{ date: correctionDate, totalViews: 1 }],
            kind: 'ownerDashboardSummary',
            lastSettledLocalDate: '2026-07-10',
            projectId: PROJECT_ID,
            sId: S_ID,
            tId: T_ID,
        }),
        firestoreAdmin.collection('analytics').doc(summaryDocId).set({
            lifetimeTotalViews: 5,
        }, { merge: true }),
    ]);

    const outcomes = await Promise.all([
        applyLateDailyCorrection(firestoreAdmin, T_ID, S_ID, PROJECT_ID, correctionDate),
        applyLateDailyCorrection(firestoreAdmin, T_ID, S_ID, PROJECT_ID, correctionDate),
    ]);
    const [summary, dashboard] = await Promise.all([
        firestoreAdmin.collection('analytics').doc(summaryDocId).get(),
        firestoreAdmin.collection('analytics').doc(dashboardDocId).get(),
    ]);
    const correctedRows = dashboard.data()?.daily30d || [];

    assert(outcomes.filter(Boolean).length === 1, 'concurrent late correction must apply exactly once');
    assert(summary.data()?.lifetimeTotalViews === 8, 'late correction must add only the positive delta once');
    assert(correctedRows[0]?.totalViews === 4, 'late correction must atomically advance the dashboard baseline');

    await Promise.all([
        firestoreAdmin.collection('analytics').doc(dailyDocId(correctionDate)).set(dailyRecord(correctionDate, 5)),
        firestoreAdmin.collection('analytics').doc(dashboardDocId).set({
            daily30d: [{ date: correctionDate, totalViews: 4 }],
            kind: 'ownerDashboardSummary',
            projectId: PROJECT_ID,
            sId: '202',
            tId: T_ID,
        }),
    ]);
    let forgedDashboardIdentityRejected = false;
    try {
        await applyLateDailyCorrection(firestoreAdmin, T_ID, S_ID, PROJECT_ID, correctionDate);
    } catch (error) {
        forgedDashboardIdentityRejected = error instanceof Error
            && error.message === 'CUSTOMER_ANALYTICS_DASHBOARD_CONTRACT_INVALID';
    }
    const afterForgedIdentity = (await firestoreAdmin.collection('analytics').doc(summaryDocId).get()).data() || {};
    assert(forgedDashboardIdentityRejected, 'late correction must reject mismatched embedded dashboard identity');
    assert(afterForgedIdentity.lifetimeTotalViews === 8, 'dashboard identity rejection must not increment the summary');

    await Promise.all([
        firestoreAdmin.collection('analytics').doc(dailyDocId(correctionDate)).set(dailyRecord(correctionDate, 5)),
        firestoreAdmin.collection('analytics').doc(dashboardDocId).set({
            daily30d: [{ date: correctionDate, totalViews: 'malformed-baseline' }],
            kind: 'ownerDashboardSummary',
            projectId: PROJECT_ID,
            sId: S_ID,
            tId: T_ID,
        }, { merge: true }),
    ]);
    let malformedBaselineRejected = false;
    try {
        await applyLateDailyCorrection(firestoreAdmin, T_ID, S_ID, PROJECT_ID, correctionDate);
    } catch {
        malformedBaselineRejected = true;
    }
    assert(malformedBaselineRejected, 'late correction must reject a malformed cached baseline');
}

async function verifyMultiBatchCleanup(): Promise<void> {
    for (let offset = 0; offset < 405; offset += 400) {
        const batch = firestoreAdmin.batch();
        for (let index = offset; index < Math.min(offset + 400, 405); index += 1) {
            const day = String((index % 28) + 1).padStart(2, '0');
            const docId = `${T_ID}_${S_ID}_${PROJECT_ID}_daily_2020-01-${day}_${String(index).padStart(3, '0')}`;
            batch.set(firestoreAdmin.collection('analytics').doc(docId), { marker: index });
        }
        await batch.commit();
    }

    const deleted = await cleanupOldDocuments(firestoreAdmin, T_ID, S_ID, PROJECT_ID);
    const remaining = await firestoreAdmin.collection('analytics')
        .where('__name__', '>=', `${T_ID}_${S_ID}_${PROJECT_ID}_daily_0000-00-00`)
        .where('__name__', '<', `${T_ID}_${S_ID}_${PROJECT_ID}_daily_2021-01-01`)
        .get();

    assert(deleted === 405, 'cleanup must delete every document across multiple fresh batches');
    assert(remaining.empty, 'cleanup must not leave the second batch behind');
}

async function verifyAtomicOBPLateCorrection(): Promise<void> {
    const correctionDate = '2026-07-09';
    await Promise.all([
        firestoreAdmin.collection('analytics').doc(obpDailyDocId(correctionDate)).set(obpDailyRecord(correctionDate, 4)),
        firestoreAdmin.collection('analytics').doc(obpDashboardDocId).set({
            daily30d: [{ date: correctionDate, totalOBPViews: 1 }],
            kind: 'obpDashboardSummary',
            lastSettledLocalDate: '2026-07-10',
            projectId: 'obp',
            sId: S_ID,
            tId: T_ID,
        }),
        firestoreAdmin.collection('analytics').doc(obpSummaryDocId).set({
            analyticsScope: 'customer',
            grain: 'summary',
            lifetime: { totalOBPViews: 5 },
            projectId: 'obp',
            sId: S_ID,
            surface: 'obp',
            tId: T_ID,
        }),
    ]);

    const outcomes = await Promise.all([
        applyLateOBPCorrection(firestoreAdmin, T_ID, S_ID, correctionDate),
        applyLateOBPCorrection(firestoreAdmin, T_ID, S_ID, correctionDate),
    ]);
    const [summary, dashboard] = await Promise.all([
        firestoreAdmin.collection('analytics').doc(obpSummaryDocId).get(),
        firestoreAdmin.collection('analytics').doc(obpDashboardDocId).get(),
    ]);
    assert(outcomes.filter(Boolean).length === 1, 'concurrent OBP late correction must apply exactly once');
    assert(summary.data()?.lifetime?.totalOBPViews === 8, 'OBP correction must add the positive delta once');
    assert(dashboard.data()?.daily30d?.[0]?.totalOBPViews === 4, 'OBP correction must atomically advance its cache baseline');

    await Promise.all([
        firestoreAdmin.collection('analytics').doc(obpDailyDocId(correctionDate)).set(obpDailyRecord(correctionDate, 5)),
        firestoreAdmin.collection('analytics').doc(obpDashboardDocId).set({
            daily30d: [{ date: correctionDate, totalOBPViews: '4' }],
        }, { merge: true }),
    ]);
    let malformedBaselineRejected = false;
    try {
        await applyLateOBPCorrection(firestoreAdmin, T_ID, S_ID, correctionDate);
    } catch (error) {
        malformedBaselineRejected = error instanceof Error
            && error.message === 'OBP_ANALYTICS_DAILY_CONTRACT_INVALID';
    }
    assert(malformedBaselineRejected, 'OBP correction must reject a malformed compact baseline');
}

async function verifyAtomicOBPLifetimeSettlement(): Promise<void> {
    const settlementDate = '2026-07-10';
    await firestoreAdmin.collection('analytics')
        .doc(obpDailyDocId(settlementDate))
        .set(obpDailyRecord(settlementDate, 5));

    const outcomes = await Promise.all([
        aggregateOBPAnalyticsForStoreDate(firestoreAdmin, T_ID, S_ID, settlementDate),
        aggregateOBPAnalyticsForStoreDate(firestoreAdmin, T_ID, S_ID, settlementDate),
    ]);
    const summary = (await firestoreAdmin.collection('analytics').doc(obpSummaryDocId).get()).data() || {};
    assert(outcomes.every(Boolean), 'concurrent OBP settlement calls must complete from the same valid daily truth');
    assert(summary.lifetime?.totalOBPViews === 5, 'concurrent OBP settlement must increment lifetime exactly once');
    assert(summary.lastProcessedDate === settlementDate, 'OBP summary must retain the explicit settlement date');
    assert(
        summary.tId === T_ID && summary.sId === S_ID && summary.projectId === 'obp'
            && summary.grain === 'summary' && summary.analyticsScope === 'customer' && summary.surface === 'obp',
        'OBP summary must persist exact scope/type identity',
    );

    await clearAnalytics();
    const laterDate = '2026-07-11';
    await Promise.all([
        firestoreAdmin.collection('analytics').doc(obpDailyDocId(settlementDate)).set(obpDailyRecord(settlementDate, 5)),
        firestoreAdmin.collection('analytics').doc(obpDailyDocId(laterDate)).set(obpDailyRecord(laterDate, 2)),
    ]);
    await Promise.all([
        aggregateOBPAnalyticsForStoreDate(firestoreAdmin, T_ID, S_ID, laterDate),
        aggregateOBPAnalyticsForStoreDate(firestoreAdmin, T_ID, S_ID, settlementDate),
    ]);
    const [outOfOrderSummary, outOfOrderDashboard] = await Promise.all([
        firestoreAdmin.collection('analytics').doc(obpSummaryDocId).get(),
        firestoreAdmin.collection('analytics').doc(obpDashboardDocId).get(),
    ]);
    assert(outOfOrderSummary.data()?.lifetime?.totalOBPViews === 7, 'out-of-order OBP dates must each settle exactly once');
    assert(
        outOfOrderSummary.data()?.processedLifetimeDates?.[settlementDate] === true
            && outOfOrderSummary.data()?.processedLifetimeDates?.[laterDate] === true,
        'OBP summary must retain both out-of-order idempotency receipts',
    );
    assert(outOfOrderDashboard.data()?.lastSettledLocalDate === laterDate, 'older OBP completion must not regress the dashboard cache date');

    await clearAnalytics();
    const nextDate = '2026-07-11';
    await Promise.all([
        firestoreAdmin.collection('analytics').doc(obpDailyDocId(nextDate)).set(obpDailyRecord(nextDate, 2)),
        firestoreAdmin.collection('analytics').doc(obpSummaryDocId).set({
            lifetime: { totalOBPViews: '5' },
        }, { merge: true }),
    ]);
    let malformedSummaryRejected = false;
    try {
        await aggregateOBPAnalyticsForStoreDate(firestoreAdmin, T_ID, S_ID, nextDate);
    } catch (error) {
        malformedSummaryRejected = error instanceof Error
            && error.message === 'OBP_ANALYTICS_SUMMARY_CONTRACT_INVALID';
    }
    const afterMalformed = (await firestoreAdmin.collection('analytics').doc(obpSummaryDocId).get()).data() || {};
    assert(malformedSummaryRejected, 'OBP settlement must reject a malformed lifetime summary');
    assert(afterMalformed.lifetime?.totalOBPViews === '5', 'malformed OBP summary rejection must not replace persisted lifetime truth');
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await verifyCurrentPlatformAnalyticsAuthority();
    assert(
        normalizeDashboardAnalyticsRowForTest({ date: '2026-07-10', totalViews: 2 }) !== null,
        'valid compact dashboard row must pass',
    );
    assert(
        normalizeDashboardAnalyticsRowForTest({ date: '2026-07-10', totalViews: '2' }) === null,
        'string compact dashboard counter must fail',
    );
    assert(
        normalizeDashboardAnalyticsRowForTest({ date: '2026-02-30', totalViews: 2 }) === null,
        'impossible compact dashboard date must fail',
    );
    assert(
        normalizeDashboardAnalyticsSummaryForTest({ lifetimeTotalViews: 5, viewsBySource: { qr: 5 } }) !== null,
        'valid analytics summary must pass',
    );
    assert(
        normalizeDashboardAnalyticsSummaryForTest({ lifetimeTotalViews: '5' }) === null,
        'string analytics lifetime counter must fail',
    );
    assert(
        normalizeDashboardAnalyticsSummaryForTest({ lifetime: { totalViews: Number.NaN } }) === null,
        'non-finite legacy analytics lifetime counter must fail',
    );
    assert(
        normalizeDashboardAnalyticsIdentityForTest(
            { kind: 'ownerDashboardSummary', projectId: PROJECT_ID, sId: S_ID, tId: T_ID },
            { projectId: PROJECT_ID, sId: S_ID, tId: T_ID },
        ) !== null,
        'matching dashboard identity must pass',
    );
    assert(
        normalizeDashboardAnalyticsIdentityForTest(
            { kind: 'ownerDashboardSummary', projectId: PROJECT_ID, sId: '202', tId: T_ID },
            { projectId: PROJECT_ID, sId: S_ID, tId: T_ID },
        ) === null,
        'cross-store embedded dashboard identity must fail',
    );
    assert(
        normalizeOBPDailyForTest({ date: '2026-07-10', totalOBPViews: 2 }, '2026-07-10') !== null,
        'valid compact OBP row must pass',
    );
    assert(
        normalizeOBPDailyForTest({ date: '2026-07-10', totalOBPViews: '2' }, '2026-07-10') === null,
        'string compact OBP counter must fail',
    );
    assert(
        normalizeOBPDailyForTest({ date: '2026-02-30', totalOBPViews: 2 }, '2026-02-30') === null,
        'impossible compact OBP date must fail',
    );
    assert(
        normalizeOBPDashboardIdentityForTest(
            { kind: 'obpDashboardSummary', projectId: 'obp', sId: S_ID, tId: T_ID },
            T_ID,
            S_ID,
        ) !== null,
        'matching OBP dashboard identity must pass',
    );
    assert(
        normalizeOBPDashboardIdentityForTest(
            { kind: 'obpDashboardSummary', projectId: 'obp', sId: '202', tId: T_ID },
            T_ID,
            S_ID,
        ) === null,
        'cross-store OBP dashboard identity must fail',
    );
    await clearAnalytics();
    await verifyExplicitSettlementDate();
    await verifyMalformedSummaryRejected();
    await clearAnalytics();
    await verifyAtomicLateCorrection();
    await verifyMultiBatchCleanup();
    await clearAnalytics();
    await verifyAtomicOBPLateCorrection();
    await clearAnalytics();
    await verifyAtomicOBPLifetimeSettlement();
    await clearAnalytics();
    process.stdout.write('Analytics settlement emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
