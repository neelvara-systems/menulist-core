#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    markOwnerActionDoneTransaction,
} from '../../src/lib/analytics/ownerActionReceiptTransaction';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';

const dashboardRef = firestoreAdmin.collection('analytics').doc('1_101_menu-project_dashboard_summary');
const receiptId = (value: number) => value.toString(16).padStart(32, '0');

const buildReceipt = (value: number) => ({
    receiptId: receiptId(value),
    actionId: `historical-action-${value}`,
    actionLabel: 'Review',
    actionTitle: `Historical action ${value}`,
    actionType: 'review',
    baselineLocalDate: '2026-07-10',
    checkAfterLocalDate: '2026-07-17',
    markedDoneAt: new Date(Date.UTC(2026, 6, value)).toISOString(),
    markedBy: 'owner-1',
    status: 'marked_done',
});

const mark = (actionId: string, incomingReceiptId: string) => markOwnerActionDoneTransaction(
    firestoreAdmin,
    {
        actionId,
        actionLabel: 'Mark done',
        actionTitle: `Action ${actionId}`,
        actionType: 'review',
        dashboardRef,
        receiptId: incomingReceiptId,
        userId: 'owner-1',
    },
);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    await dashboardRef.delete().catch(() => undefined);

    const missing = await mark('action-a', receiptId(100));
    assert.deepEqual(missing, { ok: false, error: 'Action list is not ready yet', status: 404 });

    const initialReceipts = Object.fromEntries(
        Array.from({ length: 19 }, (_, index) => {
            const value = index + 1;
            return [receiptId(value), buildReceipt(value)];
        }),
    );
    const actions = [
        { id: 'action-a', type: 'review', title: 'Action A', actionLabel: 'Mark done' },
        { id: 'action-b', type: 'review', title: 'Action B', actionLabel: 'Mark done' },
    ];
    await dashboardRef.set({
        lastSettledLocalDate: '2026-07-10',
        ownerActionPlan: { actions, receipts: initialReceipts },
        ownerActionReceipts: initialReceipts,
        overview: { ownerActionPlan: { actions, receipts: initialReceipts } },
        weekly: { metrics: { menuSessions: 12, actionRate: 10 } },
    });

    const incomingA = receiptId(100);
    const incomingB = receiptId(101);
    const [outcomeA, outcomeB] = await Promise.all([
        mark('action-a', incomingA),
        mark('action-b', incomingB),
    ]);
    assert.equal(outcomeA.ok, true);
    assert.equal(outcomeB.ok, true);

    const afterConcurrent = (await dashboardRef.get()).data() || {};
    const concurrentReceipts = afterConcurrent.ownerActionReceipts || {};
    assert.equal(Object.keys(concurrentReceipts).length, 20, 'concurrent new receipts must retain the cap');
    assert.ok(concurrentReceipts[incomingA], 'first concurrent receipt must survive');
    assert.ok(concurrentReceipts[incomingB], 'second concurrent receipt must survive');
    assert.equal(concurrentReceipts[receiptId(1)], undefined, 'oldest receipt must be pruned first');

    const siblingBeforeRemark = concurrentReceipts[incomingB];
    const remark = await mark('action-a', incomingA);
    assert.equal(remark.ok, true);
    const afterRemark = (await dashboardRef.get()).data() || {};
    const remarkReceipts = afterRemark.ownerActionReceipts || {};
    assert.equal(Object.keys(remarkReceipts).length, 20, 're-marking must not consume another receipt slot');
    assert.ok(remarkReceipts[incomingA], 're-marked receipt must remain present');
    assert.deepEqual(remarkReceipts[incomingB], siblingBeforeRemark, 're-marking must not alter a sibling receipt');

    const staleAction = await mark('removed-action', receiptId(102));
    assert.deepEqual(staleAction, { ok: false, error: 'Action is no longer available', status: 409 });

    process.stdout.write('Owner action receipt transaction emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
