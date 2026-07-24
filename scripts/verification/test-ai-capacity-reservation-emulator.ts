#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { recoverAiCapacityReservationsInCollectionRef } from '../../functions/src/schedulers/aiCapacityReservationRecovery';
import { finalizeAiOperationAccounting } from '../../src/lib/ai/accounting';
import {
    consumeAICapacity,
    refundDurableAiCapacityReservationByIdSafely,
    refundAiCapacityReservation,
    reserveAiCapacity,
} from '../../src/lib/ai/capacityCheck';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '../../src/types/razorpay';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const tId = 71;
const sId = 72;
const inheritedOutletSId = 73;
const action = AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION;
const subscriptionId = 'sub_ai_reservation_concurrency';
const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
const operationCollection = firestoreAdmin
    .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
    .doc(String(tId))
    .collection(String(sId));
const inheritedOutletOperationCollection = firestoreAdmin
    .collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)
    .doc(String(tId))
    .collection(String(inheritedOutletSId));

function subscription(): FirestoreSubscriptionDoc {
    return {
        id: subscriptionId,
        monthlyCredits: 12,
        monthlyCreditsAllowance: 12,
        pId: 'ML',
        productId: 'ML',
        sId,
        storeId: sId,
        tId,
        tenantId: tId,
        topUpCredits: 0,
    } as unknown as FirestoreSubscriptionDoc;
}

async function resetSubscription(monthlyCredits = 12, topUpCredits = 0): Promise<void> {
    await subscriptionRef.set({
        cycleStartDate: null,
        monthlyCredits,
        monthlyCreditsAllowance: 12,
        pId: 'ML',
        productId: 'ML',
        sId,
        storeId: sId,
        tId,
        tenantId: tId,
        topUpCredits,
    });
}

async function reserve(idempotencyKey: string, unitsToReserve: number) {
    return reserveAiCapacity({
        action,
        idempotencyKey,
        recoveryMode: 'automatic_refund',
        sId,
        source: 'capacity_reservation_emulator',
        subscription: subscription(),
        tId,
        unitsToReserve,
    });
}

async function deleteOperation(id: string): Promise<void> {
    await operationCollection.doc(id).delete();
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    await resetSubscription();
    await subscriptionRef.set({ pId: 'CC', productId: 'CC' }, { merge: true });
    await assert.rejects(
        reserve('reservation-wrong-product', 1),
        /persisted subscription scope mismatch/,
        'same-scope other-product subscriptions must not fund MenuList AI operations',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 12);
    assert.equal((await operationCollection.doc('reservation-wrong-product').get()).exists, false);

    await resetSubscription();
    await subscriptionRef.update({ tId: 99999 });
    await assert.rejects(
        reserve('reservation-conflicting-subscription-alias', 1),
        /persisted subscription scope mismatch/,
        'a conflicting persisted tenant alias must not fund MenuList AI work',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 12);
    assert.equal((await operationCollection.doc('reservation-conflicting-subscription-alias').get()).exists, false);

    await resetSubscription();
    await subscriptionRef.update({ monthlyCredits: '12' });
    await assert.rejects(
        reserve('reservation-string-balance', 1),
        /Not enough billing credits/,
        'numeric-string subscription balances must not authorize paid AI work',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, '12');
    assert.equal((await operationCollection.doc('reservation-string-balance').get()).exists, false);

    await resetSubscription();
    const concurrent = await Promise.allSettled([
        reserve('reservation-concurrent-a', 10),
        reserve('reservation-concurrent-b', 10),
    ]);
    const fulfilled = concurrent.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof reserve>>> => result.status === 'fulfilled');
    const rejected = concurrent.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    assert.equal(fulfilled.length, 1, 'only one concurrent request may reserve the same remaining credits');
    assert.equal(rejected.length, 1);
    assert.match(String(rejected[0].reason), /Not enough billing credits/);
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 2);
    const winningReservation = fulfilled[0].value;
    const losingOperationId = winningReservation.id === 'reservation-concurrent-a'
        ? 'reservation-concurrent-b'
        : 'reservation-concurrent-a';
    assert.equal((await operationCollection.doc(losingOperationId).get()).exists, false);
    const reservedDoc = await operationCollection.doc(winningReservation.id).get();
    assert.equal(reservedDoc.data()?.accountingStatus, 'reserved');
    assert.equal(reservedDoc.data()?.createdOn, undefined, 'pending reservations must not enter transaction-history ordering');

    const sameKeyReplay = await reserve(winningReservation.id, 10);
    assert.equal(sameKeyReplay.id, winningReservation.id);
    assert.equal(sameKeyReplay.state, 'reserved');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 2, 'same-key reservation replay must not debit twice');

    const settled = await finalizeAiOperationAccounting({
        capacityReservation: winningReservation,
        input: {
            action,
            billingMode: 'billable',
            clientResponse: { responseSummaryKind: 'reservation_emulator' },
            sId,
            tId,
            unitsConsumed: 10,
        },
        logLabel: 'AI reservation emulator',
    });
    assert.equal(settled.transactionId, winningReservation.id);
    assert.deepEqual(settled.remainingBalance, { billingStoreId: sId, monthlyCredits: 2, topUpCredits: 0 });
    const consumedDoc = await operationCollection.doc(winningReservation.id).get();
    assert.equal(consumedDoc.data()?.accountingStatus, 'consumed');
    assert.ok(consumedDoc.data()?.createdOn, 'settled operations must enter transaction history');

    const settledReplay = await finalizeAiOperationAccounting({
        capacityReservation: sameKeyReplay,
        input: { action, sId, tId, unitsConsumed: 10 },
        logLabel: 'AI reservation emulator replay',
    });
    assert.deepEqual(settledReplay.remainingBalance, { billingStoreId: sId, monthlyCredits: 2, topUpCredits: 0 });
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 2);
    const legacyIdempotentReplay = await finalizeAiOperationAccounting({
        idempotencyKey: winningReservation.id,
        input: { action, sId, tId, unitsConsumed: 10 },
        logLabel: 'AI reservation legacy replay emulator',
    });
    assert.deepEqual(
        legacyIdempotentReplay.remainingBalance,
        { billingStoreId: sId, monthlyCredits: 2, topUpCredits: 0 },
        'legacy replay responses retain the effective billing store scope',
    );
    const consumedRefund = await refundAiCapacityReservation(winningReservation, 'must_not_refund_consumed');
    assert.equal(consumedRefund.alreadyTerminal, true);
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 2);

    await resetSubscription(7, 5);
    const refundable = await reserve('reservation-refundable', 9);
    assert.deepEqual(refundable.remainingBalance, { billingStoreId: sId, monthlyCredits: 0, topUpCredits: 3 });
    const firstRefund = await refundAiCapacityReservation(refundable, 'provider_failed');
    assert.equal(firstRefund.alreadyTerminal, false);
    assert.deepEqual(firstRefund.remainingBalance, { billingStoreId: sId, monthlyCredits: 7, topUpCredits: 5 });
    const secondRefund = await refundAiCapacityReservation(refundable, 'duplicate_failure_handler');
    assert.equal(secondRefund.alreadyTerminal, true, 'refund retries must be idempotent');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 7);
    assert.equal((await subscriptionRef.get()).data()?.topUpCredits, 5);

    const reReserved = await reserve('reservation-refundable', 9);
    assert.equal(reReserved.state, 'reserved', 'a failed provider attempt may retry with the same durable operation ID');
    assert.equal((await operationCollection.doc(reReserved.id).get()).data()?.accountingReservationAttempt, 2);
    await refundAiCapacityReservation(reReserved, 'retry_cleanup');

    await resetSubscription(7, 5);
    const malformedRefundEvidence = await reserve('reservation-malformed-refund-evidence', 9);
    const malformedRefundRef = operationCollection.doc(malformedRefundEvidence.id);
    const originalRefundEvidence = (await malformedRefundRef.get()).data();
    await malformedRefundRef.update({ accountingChargedTopUpCredits: '2' });
    await assert.rejects(
        refundAiCapacityReservation(malformedRefundEvidence, 'must_reject_string_credit_evidence'),
        /refund credit evidence is invalid/,
        'numeric-string charged-credit evidence must not mint a refund',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 0);
    assert.equal((await subscriptionRef.get()).data()?.topUpCredits, 3);
    await malformedRefundRef.update({
        accountingChargedTopUpCredits: originalRefundEvidence?.accountingChargedTopUpCredits,
        accountingReservationBillingPeriod: '202607',
    });
    await assert.rejects(
        refundAiCapacityReservation(malformedRefundEvidence, 'must_reject_string_period_evidence'),
        /refund billing period is invalid/,
        'numeric-string billing-period evidence must not authorize a refund',
    );
    await malformedRefundRef.update({
        accountingReservationBillingPeriod: originalRefundEvidence?.accountingReservationBillingPeriod ?? null,
    });
    await refundAiCapacityReservation(malformedRefundEvidence, 'malformed_refund_cleanup');

    await resetSubscription();
    const conflictReservation = await reserve('reservation-conflict', 3);
    await assert.rejects(
        finalizeAiOperationAccounting({
            capacityReservation: conflictReservation,
            input: { action, sId, tId, unitsConsumed: 4 },
            logLabel: 'AI reservation conflict emulator',
        }),
        /settlement conflict/,
        'settlement cannot charge units different from the reserved contract',
    );
    assert.equal((await operationCollection.doc(conflictReservation.id).get()).data()?.accountingStatus, 'reserved');
    await refundAiCapacityReservation(conflictReservation, 'conflict_cleanup');

    await resetSubscription();
    const transactionScopeConflict = await reserve('reservation-transaction-scope-conflict', 2);
    await subscriptionRef.update({ sId: 99999 });
    await assert.rejects(
        finalizeAiOperationAccounting({
            capacityReservation: transactionScopeConflict,
            input: { action, sId, tId, unitsConsumed: 2 },
            logLabel: 'AI reservation transaction scope conflict emulator',
        }),
        /persisted subscription scope mismatch/,
        'transaction-current conflicting subscription aliases must block finalization',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 10);
    assert.equal((await operationCollection.doc(transactionScopeConflict.id).get()).data()?.accountingStatus, 'reserved');
    await subscriptionRef.update({ sId });
    await refundAiCapacityReservation(transactionScopeConflict, 'transaction_scope_cleanup');

    await resetSubscription();
    const operationScopeConflict = await reserve('reservation-operation-scope-conflict', 2);
    await operationCollection.doc(operationScopeConflict.id).update({ tenantId: 99999 });
    await assert.rejects(
        reserve(operationScopeConflict.id, 2),
        /idempotency conflict/,
        'conflicting operation scope aliases must not be accepted as reservation replay',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 10);
    await operationCollection.doc(operationScopeConflict.id).update({ tenantId: FieldValue.delete() });
    await refundAiCapacityReservation(operationScopeConflict, 'operation_scope_cleanup');

    await resetSubscription();
    const stringUnitsReplay = await reserve('reservation-string-units-replay', 2);
    const stringUnitsReplayRef = operationCollection.doc(stringUnitsReplay.id);
    await stringUnitsReplayRef.update({ accountingUnits: '2' });
    await assert.rejects(
        reserve(stringUnitsReplay.id, 2),
        /idempotency conflict/,
        'numeric-string accounting units must not satisfy idempotent reservation replay',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 10);
    await stringUnitsReplayRef.update({ accountingUnits: 2 });
    await refundAiCapacityReservation(stringUnitsReplay, 'string_units_cleanup');

    await assert.rejects(
        finalizeAiOperationAccounting({
            idempotencyKey: 'reservation-string-input-units',
            input: { action, sId, tId, unitsConsumed: '2' as unknown as number },
            logLabel: 'String input units emulator',
        }),
        /accounting units are invalid/,
        'numeric-string finalizer input units must fail before replay or persistence',
    );
    assert.equal((await operationCollection.doc('reservation-string-input-units').get()).exists, false);

    const historicalReplayId = 'reservation-historical-string-replay';
    const historicalReplayRef = operationCollection.doc(historicalReplayId);
    await historicalReplayRef.set({
        accountingBillingStoreId: sId,
        accountingIdempotencyKey: historicalReplayId,
        accountingStatus: 'consumed',
        accountingUnits: '2',
        action,
        remainingMonthlyCredits: 10,
        remainingTopUpCredits: 0,
        sId,
        tId,
    });
    await assert.rejects(
        finalizeAiOperationAccounting({
            idempotencyKey: historicalReplayId,
            input: { action, sId, tId, unitsConsumed: 2 },
            logLabel: 'Historical string unit replay emulator',
        }),
        /billing subscription is required/,
        'numeric-string persisted units must not satisfy historical replay',
    );
    await historicalReplayRef.update({ accountingUnits: 2, remainingMonthlyCredits: '10' });
    await assert.rejects(
        finalizeAiOperationAccounting({
            idempotencyKey: historicalReplayId,
            input: { action, sId, tId, unitsConsumed: 2 },
            logLabel: 'Historical string balance replay emulator',
        }),
        /accounting replay balance is invalid/,
        'numeric-string remaining balances must not enter replay responses',
    );
    await historicalReplayRef.delete();

    const freeReplayId = 'reservation-free-string-replay';
    const freeReplayRef = operationCollection.doc(freeReplayId);
    await freeReplayRef.set({
        accountingIdempotencyKey: freeReplayId,
        accountingStatus: 'not_required',
        accountingUnits: '0',
        action,
        sId,
        tId,
    });
    await assert.rejects(
        finalizeAiOperationAccounting({
            idempotencyKey: freeReplayId,
            input: { action, sId, tId, unitsConsumed: 0 },
            logLabel: 'Free string unit replay emulator',
        }),
        /idempotency conflict/,
        'numeric-string zero units must not satisfy free-operation replay',
    );
    await freeReplayRef.delete();

    await resetSubscription(8, 0);
    const inheritedOutletReservation = await reserveAiCapacity({
        action,
        idempotencyKey: 'reservation-inherited-outlet',
        recoveryMode: 'automatic_refund',
        sId: inheritedOutletSId,
        source: 'capacity_reservation_emulator',
        subscription: subscription(),
        tId,
        unitsToReserve: 3,
    });
    assert.equal(inheritedOutletReservation.sId, String(inheritedOutletSId));
    assert.equal(inheritedOutletReservation.billingStoreId, String(sId));
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 5, 'inherited outlet debits the effective HQ subscription');
    const inheritedReservedDoc = await inheritedOutletOperationCollection.doc(inheritedOutletReservation.id).get();
    assert.equal(inheritedReservedDoc.data()?.sId, inheritedOutletSId, 'history remains scoped to the outlet that requested the work');
    assert.equal(inheritedReservedDoc.data()?.accountingBillingStoreId, sId, 'reservation records the distinct effective billing store');
    const inheritedSettlement = await finalizeAiOperationAccounting({
        capacityReservation: inheritedOutletReservation,
        input: {
            action,
            billingMode: 'billable',
            clientResponse: { responseSummaryKind: 'inherited_outlet_emulator' },
            sId: inheritedOutletSId,
            tId,
            unitsConsumed: 3,
        },
        logLabel: 'Inherited outlet reservation emulator',
    });
    assert.deepEqual(inheritedSettlement.remainingBalance, {
        billingStoreId: sId,
        monthlyCredits: 5,
        topUpCredits: 0,
    });
    assert.equal((await inheritedOutletOperationCollection.doc(inheritedOutletReservation.id).get()).data()?.accountingStatus, 'consumed');

    await assert.rejects(
        reserve('reservation-fractional', 0.5),
        /positive safe integer/,
        'fractional content credits cannot enter the durable ledger',
    );
    await assert.rejects(
        reserve('reservation-unsafe-integer', Number.MAX_SAFE_INTEGER + 1),
        /positive safe integer/,
        'unsafe integer credit quantities cannot enter the durable ledger',
    );
    await assert.rejects(
        reserve('reservation-infinite', Number.POSITIVE_INFINITY),
        /positive safe integer/,
        'non-finite credit quantities cannot enter the durable ledger',
    );
    await assert.rejects(
        consumeAICapacity(subscription(), 0.5),
        /positive safe integer/,
        'legacy direct debit cannot silently accept fractional content credits',
    );
    await assert.rejects(
        finalizeAiOperationAccounting({
            capacitySubscription: subscription(),
            idempotencyKey: 'reservation-legacy-fractional',
            input: { action, sId, tId, unitsConsumed: 0.5 },
            logLabel: 'Fractional legacy accounting',
        }),
        /accounting units are invalid/,
        'historical idempotent finalization cannot persist fractional content credits',
    );
    await assert.rejects(
        reserveAiCapacity({
            action,
            idempotencyKey: 'reservation-cross-tenant',
            sId,
            subscription: { ...subscription(), tenantId: 999 },
            tId,
            unitsToReserve: 1,
        }),
        /scope mismatch/,
        'a subscription from another tenant cannot reserve this store capacity',
    );
    assert.equal((await operationCollection.doc('reservation-cross-tenant').get()).exists, false);

    await assert.rejects(
        finalizeAiOperationAccounting({
            capacitySubscription: subscription(),
            input: { action, sId, tId, unitsConsumed: 1 },
            logLabel: 'Unreserved paid operation',
        }),
        /pre-provider credit reservation/,
        'paid output cannot be finalized through the old post-provider debit path',
    );

    await resetSubscription();
    const staleReservation = await reserve('reservation-stale', 3);
    await operationCollection.doc(staleReservation.id).update({
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    const recovery = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: operationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    assert.equal(recovery.refunded, 1, 'stale interactive reservations must be recovered by maintenance');
    assert.equal((await operationCollection.doc(staleReservation.id).get()).data()?.accountingStatus, 'refunded');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 12);
    await operationCollection.doc(staleReservation.id).update({
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    const deletion = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: operationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    assert.equal(deletion.deleted, 1, 'expired refunded reservation shells must be deleted');
    assert.equal((await operationCollection.doc(staleReservation.id).get()).exists, false);

    await resetSubscription();
    const conflictingScopeRecovery = await reserve('reservation-conflicting-scope-recovery', 2);
    await operationCollection.doc(conflictingScopeRecovery.id).update({
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    await subscriptionRef.update({ tId: 99999 });
    const conflictingRecovery = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: operationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    assert.equal(conflictingRecovery.refunded, 0, 'conflicting subscription scope must not receive a recovery refund');
    assert.equal(conflictingRecovery.errors, 1);
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 10);
    assert.equal((await operationCollection.doc(conflictingScopeRecovery.id).get()).data()?.accountingStatus, 'reserved');
    await subscriptionRef.update({ tId });
    await refundAiCapacityReservation(conflictingScopeRecovery, 'conflicting_scope_cleanup');

    await resetSubscription(6, 0);
    const inheritedStaleReservation = await reserveAiCapacity({
        action,
        idempotencyKey: 'reservation-inherited-outlet-stale',
        recoveryMode: 'automatic_refund',
        sId: inheritedOutletSId,
        source: 'capacity_reservation_emulator',
        subscription: subscription(),
        tId,
        unitsToReserve: 2,
    });
    await inheritedOutletOperationCollection.doc(inheritedStaleReservation.id).update({
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    const inheritedRecovery = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: inheritedOutletOperationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(inheritedOutletSId),
        tId: String(tId),
    });
    assert.equal(inheritedRecovery.refunded, 1, 'stale inherited-outlet reservations refund the effective HQ subscription');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 6);

    const deadlineRaceReservation = await reserve('reservation-refunded-deadline-race', 1);
    await refundAiCapacityReservation(deadlineRaceReservation, 'deadline_race_setup');
    const deadlineRaceRef = operationCollection.doc(deadlineRaceReservation.id);
    await deadlineRaceRef.update({ reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000) });
    const staleQuerySnapshot = await operationCollection
        .where('reservationRecoveryAt', '<=', Timestamp.now())
        .limit(10)
        .get();
    await deadlineRaceRef.update({ reservationRecoveryAt: Timestamp.fromMillis(Date.now() + 60_000) });
    const staleQueryCollection = {
        where: () => ({
            limit: () => ({
                get: async () => staleQuerySnapshot,
            }),
        }),
    } as unknown as FirebaseFirestore.CollectionReference;
    const deadlineRaceRecovery = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: staleQueryCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    assert.equal(deadlineRaceRecovery.deleted, 0, 'a stale query snapshot cannot delete a shell whose current deadline moved forward');
    assert.equal((await deadlineRaceRef.get()).exists, true);

    await deadlineRaceRef.delete();
    await resetSubscription();
    const recoverableAfterPoison = await reserve('reservation-recoverable-after-poison', 2);
    await operationCollection.doc(recoverableAfterPoison.id).update({
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    const poisonRef = operationCollection.doc('reservation-poison-row');
    await poisonRef.set({
        accountingRecoveryMode: 'automatic_refund',
        accountingStatus: 'reserved',
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
        sId,
        tId,
    });
    const poisonRecovery = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: operationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    assert.equal(poisonRecovery.errors, 1, 'one malformed reservation is counted without aborting the store batch');
    assert.equal(poisonRecovery.refunded, 1, 'a valid later reservation is still refunded when another row is malformed');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 12);
    await poisonRef.delete();

    await resetSubscription();
    const malformedRecoveryEvidence = await reserve('reservation-malformed-recovery-evidence', 2);
    const malformedRecoveryRef = operationCollection.doc(malformedRecoveryEvidence.id);
    await malformedRecoveryRef.update({
        accountingChargedMonthlyCredits: '2',
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    const malformedRecovery = await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: operationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    assert.equal(malformedRecovery.refunded, 0, 'numeric-string recovery evidence must not mint credits');
    assert.equal(malformedRecovery.errors, 1);
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 10);
    assert.equal((await malformedRecoveryRef.get()).data()?.accountingStatus, 'reserved');
    await malformedRecoveryRef.update({ accountingChargedMonthlyCredits: 2 });
    await refundAiCapacityReservation(malformedRecoveryEvidence, 'malformed_recovery_cleanup');

    const durableReservation = await reserveAiCapacity({
        action,
        idempotencyKey: 'reservation-durable-retry',
        recoveryMode: 'durable_retry',
        sId,
        subscription: subscription(),
        tId,
        unitsToReserve: 3,
    });
    await operationCollection.doc(durableReservation.id).update({
        reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1_000),
    });
    await recoverAiCapacityReservationsInCollectionRef({
        collectionRef: operationCollection,
        db: firestoreAdmin,
        limit: 10,
        now: Timestamp.now(),
        sId: String(sId),
        tId: String(tId),
    });
    const durableDoc = await operationCollection.doc(durableReservation.id).get();
    assert.equal(durableDoc.data()?.accountingStatus, 'reserved', 'durable batch reservations must not be auto-refunded');
    assert.equal(durableDoc.data()?.reservationRecoveryAt, null);
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 9);
    await refundDurableAiCapacityReservationByIdSafely({
        action,
        operationId: durableReservation.id,
        reason: 'durable_test_cleanup',
        sId,
        tId,
    });
    assert.equal((await operationCollection.doc(durableReservation.id).get()).data()?.accountingStatus, 'refunded');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 12);

    await Promise.all([
        deleteOperation('reservation-concurrent-a'),
        deleteOperation('reservation-concurrent-b'),
        deleteOperation('reservation-refundable'),
        deleteOperation('reservation-conflict'),
        deleteOperation('reservation-conflicting-subscription-alias'),
        deleteOperation('reservation-string-balance'),
        deleteOperation('reservation-transaction-scope-conflict'),
        deleteOperation('reservation-operation-scope-conflict'),
        deleteOperation('reservation-string-units-replay'),
        deleteOperation('reservation-string-input-units'),
        deleteOperation('reservation-historical-string-replay'),
        deleteOperation('reservation-free-string-replay'),
        deleteOperation('reservation-malformed-refund-evidence'),
        deleteOperation('reservation-malformed-recovery-evidence'),
        deleteOperation('reservation-cross-tenant'),
        deleteOperation('reservation-fractional'),
        deleteOperation('reservation-unsafe-integer'),
        deleteOperation('reservation-infinite'),
        deleteOperation('reservation-legacy-fractional'),
        deleteOperation('reservation-refunded-deadline-race'),
        deleteOperation('reservation-recoverable-after-poison'),
        deleteOperation('reservation-poison-row'),
        deleteOperation('reservation-durable-retry'),
        deleteOperation('reservation-stale'),
        inheritedOutletOperationCollection.doc('reservation-inherited-outlet').delete(),
        inheritedOutletOperationCollection.doc('reservation-inherited-outlet-stale').delete(),
    ]);
    await subscriptionRef.delete();
    console.log('AI capacity reservation emulator tests passed.');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
