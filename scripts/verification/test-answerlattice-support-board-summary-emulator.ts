#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';
import {
    loadAnswerlatticeSupportBoardCoreCounts,
    refreshAnswerlatticeSupportBoardLiveSummary,
} from '../../functions-answerlattice/src/answerlattice/supportBoardSummary';
import { DB_COLLECTIONS } from '../../functions-answerlattice/src/constants/database';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required');
}

const SCOPE = { tId: 71, sId: 7101 };
const now = new Date('2026-07-21T08:00:00.000Z');

const makeCard = (pId: string, status: string, priority: string) => ({
    pId,
    ...SCOPE,
    status,
    priority,
    modifiedOn: now,
});

async function run(): Promise<void> {
    const cards = db.collection(DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS);
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`supportBoardSummary_${SCOPE.tId}_${SCOPE.sId}`);

    await Promise.all([
        db.recursiveDelete(cards),
        summaryRef.delete(),
    ]);

    await Promise.all([
        cards.doc('al-open').set(makeCard('AL', 'needs_answer', 'high')),
        cards.doc('foreign-open').set(makeCard('ML', 'needs_answer', 'high')),
        cards.doc('other-scope').set({ ...makeCard('AL', 'needs_answer', 'high'), sId: 7102 }),
    ]);

    const counts = await loadAnswerlatticeSupportBoardCoreCounts(SCOPE.tId, SCOPE.sId);
    assert.deepEqual(counts, {
        openCards: 1,
        needsAnswerCards: 1,
        highPriorityCards: 1,
        totalRecentCards: 1,
    });

    const refreshed = await refreshAnswerlatticeSupportBoardLiveSummary({
        before: null,
        after: makeCard('AL', 'needs_answer', 'high'),
        eventId: 'support-board-product-scope-test',
        eventTime: '2026-07-21T08:00:00.000Z',
    });
    assert.equal(refreshed.written, true);
    const summary = (await summaryRef.get()).data();
    assert.equal(summary?.pId, 'AL');
    assert.equal(summary?.totalRecentCards, 1);

    const rejected = await refreshAnswerlatticeSupportBoardLiveSummary({
        before: null,
        after: makeCard('ML', 'needs_answer', 'high'),
        eventId: 'support-board-foreign-product-test',
    });
    assert.deepEqual(rejected, { written: false, reason: 'invalid_scope' });

    await Promise.all([
        db.recursiveDelete(cards),
        summaryRef.delete(),
    ]);
}

run()
    .then(() => {
        console.log('Answerlattice Support Board summary product-scope emulator test passed.');
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
