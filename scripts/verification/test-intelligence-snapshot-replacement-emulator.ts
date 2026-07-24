#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { writeIntelligence7dSnapshot } from '../../functions/src/analytics/dashboardSummaryAggregation';
import { firestoreAdmin } from '../../functions/src/firebaseAdmin';
import { parseIntelligenceSnapshot } from '../../functions/src/intelligence/shared/analyticsAggregator';

const DOCUMENT_ID = '1_101_menu_intelligence_7d';
const documentRef = firestoreAdmin.collection('analytics').doc(DOCUMENT_ID);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await documentRef.set({
        staleTopLevel: true,
        viewsByItem: { 'stale-item': 999 },
        clicksByItem: { 'stale-item': 999 },
        hourlyClicksByItem: { 'stale-item': { '1': 999 } },
    });

    const settlementDate = '2026-07-20';
    const dailyMap = new Map<string, Record<string, unknown>>([[
        settlementDate,
        {
            date: settlementDate,
            totalViews: 20,
            totalClicks: 4,
            totalSessions: 3,
            viewsByItem: { 'current-item': 20 },
            clicksByItem: { 'current-item': 4 },
            recommendationClicksByItem: { 'current-item': 1 },
            hourlyClicksByItem: { 'current-item': { '12': 4 } },
            itemNames: { 'current-item': 'Current item' },
        },
    ]]);

    await writeIntelligence7dSnapshot(
        firestoreAdmin,
        '1',
        '101',
        'menu',
        settlementDate,
        dailyMap,
    );

    const snapshot = await documentRef.get();
    const data = snapshot.data();
    assert.equal(data?.staleTopLevel, undefined, 'complete replacement must remove unknown legacy fields');
    assert.deepEqual(data?.viewsByItem, { 'current-item': 20 }, 'complete replacement must prune stale item-map keys');
    assert.deepEqual(data?.hourlyClicksByItem, { 'current-item': { '12': 4 } });
    assert.ok(parseIntelligenceSnapshot(data, {
        tId: '1',
        sId: '101',
        projectId: 'menu',
        lastSettledLocalDate: settlementDate,
    }), 'the replacement writer output must pass the only scoring-input projector');

    process.stdout.write('Intelligence snapshot replacement emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
