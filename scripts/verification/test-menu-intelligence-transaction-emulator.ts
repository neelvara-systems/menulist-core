#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { firestoreAdmin } from '../../functions/src/firebaseAdmin';
import {
    computeAndPersistMenuIntelligence,
    parseMenuIntelligenceState,
} from '../../functions/src/intelligence/menuIntelligence';
import type { AggregatedAnalytics } from '../../functions/src/intelligence/shared/analyticsAggregator';
import type { ExtractedItem } from '../../functions/src/intelligence/shared/itemExtractor';

const COLLECTION = 'menuIntelligence';
const DOCUMENT_ID = '1_101_menu';
const documentRef = firestoreAdmin.collection(COLLECTION).doc(DOCUMENT_ID);
const item: ExtractedItem = {
    itemId: 'item-1',
    itemName: 'Lunch',
    category: 'main',
    views: 50,
    clicks: 10,
    orders: 0,
    price: 120,
    decisionBlockClicks: 2,
    hourlyClicks: { '12': 10 },
};
const analytics: AggregatedAnalytics = {
    totalViews: 50,
    totalClicks: 10,
    totalSessions: 10,
    clicksByItem: { 'item-1': 10 },
    viewsByItem: { 'item-1': 50 },
    recommendationClicksByItem: { 'item-1': 2 },
    hourlyClicksByItem: { 'item-1': { '12': 10 } },
    itemNames: { 'item-1': 'Lunch' },
    daysWithData: 7,
    lastSettledLocalDate: '2026-07-20',
    source: 'intelligence_7d',
};

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await documentRef.delete().catch(() => undefined);

    await Promise.all([
        computeAndPersistMenuIntelligence(
            firestoreAdmin, COLLECTION, [item], analytics,
            { tId: '1', sId: '101', projectId: 'menu' }, 'nightly_job',
        ),
        computeAndPersistMenuIntelligence(
            firestoreAdmin, COLLECTION, [item], analytics,
            { tId: '1', sId: '101', projectId: 'menu' }, 'manual_trigger',
        ),
    ]);

    const snapshot = await documentRef.get();
    const parsed = parseMenuIntelligenceState(snapshot.data(), snapshot.id);
    if (!parsed) throw new Error('transaction output must pass the persisted-state projector');
    assert.equal(parsed.runCount, 2, 'concurrent scheduled/manual runs must both advance run count');
    assert.equal(parsed.daysSinceCreation, 1, 'same-date transaction retry must not double mature the state');
    assert.equal(parsed.itemConfidence['item-1'].stableDays, 1);

    await documentRef.set({ tId: '1', sId: '101', projectId: 'menu', malformed: true });
    await assert.rejects(
        () => computeAndPersistMenuIntelligence(
            firestoreAdmin, COLLECTION, [item], analytics,
            { tId: '1', sId: '101', projectId: 'menu' }, 'manual_trigger',
        ),
        /menu_intelligence_invalid_persisted_state/,
    );
    assert.equal((await documentRef.get()).data()?.malformed, true, 'malformed legacy state must not be overwritten silently');

    await assert.rejects(
        () => computeAndPersistMenuIntelligence(
            firestoreAdmin, COLLECTION, [item], analytics,
            { tId: '1', sId: '101', projectId: 'bad/id' }, 'manual_trigger',
        ),
        /menu_intelligence_invalid_identity/,
        'persistence identity must fail before Firestore document-path construction',
    );

    process.stdout.write('Menu Intelligence transaction emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
