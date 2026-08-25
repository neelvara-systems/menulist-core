import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    AnswerlatticeSupportSearchCapacityError,
    createAnswerlatticeSupportSearchAccounting,
} from '../../src/lib/answerlattice/supportSearchAccounting';
import {
    checkAnswerlatticeAICapacity,
    reserveAnswerlatticeAiOperationCapacity,
} from '../../src/lib/answerlattice/aiAccounting';
import { getBillingPeriodKey } from '../../src/lib/billing/billingPeriod';
import { requireAnswerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import type { CoreSearchResult } from '../../src/lib/search/types';
import type { FirestoreSubscriptionDoc } from '../../src/types/razorpay';
import { Timestamp } from 'firebase-admin/firestore';
import { recoverAnswerlatticeAiCapacityReservations } from '../../functions-answerlattice/src/answerlattice/aiCapacityReservationRecovery';

const scope = { tId: 91, sId: 901 };
const db = requireAnswerlatticeFirestoreAdmin();
const subscriptionId = 'al-subscription-901';
let currentScenario = 'initialization';

const scenario = (name: string): void => {
    currentScenario = name;
};

const result = (aiProviderUsed: boolean): CoreSearchResult => ({
    craftedAnswer: aiProviderUsed ? 'Provider-backed answer.' : 'Approved answer.',
    references: [],
    suggestedQuestions: [],
    canonical: !aiProviderUsed,
    answerSource: aiProviderUsed ? 'rag' : 'canonical',
    imageProcessed: false,
    aiProviderUsed,
    aiProviderOperations: aiProviderUsed ? ['embedding_generation', 'answer_generation'] : [],
    aiProviderTokenUsage: aiProviderUsed
        ? { promptTokenCount: 100, candidatesTokenCount: 40, totalTokenCount: 140, tokenCountSource: 'provider' }
        : { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0, tokenCountSource: 'none' },
});

async function seedSubscription(monthlyCredits: number, pId: string = PRODUCT_IDS.ANSWERLATTICE): Promise<void> {
    const cycleStartDate = Timestamp.now();
    const billingPeriod = getBillingPeriodKey(cycleStartDate);
    assert.ok(billingPeriod);
    await Promise.all([
        db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId)).set({
            id: scope.sId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            ...scope,
            answerlatticeSubscription: {
                id: subscriptionId,
                monthlyCredits,
                topUpCredits: 0,
            },
        }),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({
            id: subscriptionId,
            pId,
            productId: pId,
            ...scope,
            tenantId: scope.tId,
            storeId: scope.sId,
            status: 'active',
            billingMode: 'manual',
            manualPaymentConfirmed: true,
            cycleStartDate,
            cycleEndDate: Timestamp.fromMillis(Date.now() + 86_400_000),
            monthlyCreditsAllowance: monthlyCredits,
            monthlyCredits,
            topUpCredits: 0,
            creditsLastResetMonth: billingPeriod,
        }),
    ]);
}

const createAccounting = (requestId: string) => createAnswerlatticeSupportSearchAccounting({
    actor: { id: 'owner-91', email: 'owner@example.com' },
    mountContext: 'help_center',
    requestId,
    scope,
});

async function operationCount(): Promise<number> {
    return (await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId))
        .collection(String(scope.sId))
        .get()).size;
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    scenario('provider-free and settled provider request');
    await seedSubscription(2);
    const deterministic = createAccounting('deterministic_001');
    await deterministic.settle(result(false), 12);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 2);
    assert.equal(await operationCount(), 0, 'provider-free answers must not create billable operation rows');

    const paid = createAccounting('provider_001');
    await paid.beforeAiProviderCall();
    assert.equal(
        (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits,
        1,
        'support-search credits must be reserved before provider work',
    );
    await paid.settle(result(true), 120);
    await paid.settle(result(true), 120);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 1);
    const paidStore = (await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.sId)).get()).data();
    assert.equal(paidStore?.answerlatticeSubscription?.monthlyCredits, 1);
    assert.equal(paidStore?.['answerlatticeSubscription.monthlyCredits'], undefined, 'summary updates must not create literal dotted fields');
    assert.equal(await operationCount(), 1, 'an idempotent retry must reuse the operation row');

    scenario('concurrent admission');
    await seedSubscription(1);
    const first = createAccounting('concurrent_001');
    const second = createAccounting('concurrent_002');
    const gates = await Promise.allSettled([first.beforeAiProviderCall(), second.beforeAiProviderCall()]);
    assert.equal(gates.filter(entry => entry.status === 'fulfilled').length, 1);
    const rejected = gates.find(entry => entry.status === 'rejected');
    assert.ok(rejected && rejected.status === 'rejected' && rejected.reason instanceof AnswerlatticeSupportSearchCapacityError);
    const admittedAccounting = gates[0].status === 'fulfilled' ? first : second;
    await admittedAccounting.settle(result(true), 120);
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 0);
    assert.equal(await operationCount(), 2, 'only the pre-provider-reserved concurrent request may create an operation row');

    scenario('cross-product rejection');
    await seedSubscription(1, PRODUCT_IDS.MENULIST);
    const crossProduct = createAccounting('wrong_product_001');
    await assert.rejects(
        () => crossProduct.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'a shared-project subscription from another product must fail before provider use',
    );

    scenario('pending subscription rejection');
    await seedSubscription(1);
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ status: 'pending' }, { merge: true });
    const pending = createAccounting('pending_state_001');
    await assert.rejects(
        () => pending.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'a pending subscription must fail before provider use',
    );

    scenario('numeric-string balance rejection');
    await seedSubscription(1);
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ monthlyCredits: '1' }, { merge: true });
    const numericStringBalance = createAccounting('numeric_string_balance_001');
    await assert.rejects(
        () => numericStringBalance.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'numeric-string subscription balances must not authorize Answerlattice provider work',
    );

    scenario('fractional balance rejection');
    await seedSubscription(1);
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ topUpCredits: 0.5 }, { merge: true });
    const fractionalBalance = createAccounting('fractional_balance_001');
    await assert.rejects(
        () => fractionalBalance.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'fractional subscription balances must not authorize Answerlattice provider work',
    );

    scenario('coercible status rejection');
    await seedSubscription(1);
    await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({ status: ' ACTIVE ' }, { merge: true });
    const coercibleStatus = createAccounting('coercible_status_001');
    await assert.rejects(
        () => coercibleStatus.beforeAiProviderCall(),
        AnswerlatticeSupportSearchCapacityError,
        'coercible subscription states must not authorize Answerlattice provider work',
    );

    scenario('stale capacity snapshot');
    await seedSubscription(1);
    const staleCapacitySnapshot = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    const staleCapacitySubscription = {
        ...(staleCapacitySnapshot.data() as FirestoreSubscriptionDoc),
        id: staleCapacitySnapshot.id,
        creditsLastResetMonth: 200001,
    };
    await staleCapacitySnapshot.ref.set({
        tId: 92,
        tenantId: 92,
        monthlyCredits: 0,
        monthlyCreditsAllowance: 5,
        creditsLastResetMonth: 200001,
    }, { merge: true });
    const staleCapacity = await checkAnswerlatticeAICapacity(
        scope,
        'answerlattice_support_search',
        1,
        staleCapacitySubscription,
    );
    assert.equal(staleCapacity.allowed, false, 'current subscription scope must be revalidated before provider admission');
    assert.equal(
        (await staleCapacitySnapshot.ref.get()).data()?.monthlyCredits,
        0,
        'a stale preloaded subscription must not reset credits after current scope changed',
    );

    scenario('expired capacity snapshot');
    await seedSubscription(2);
    const expiredCapacitySnapshot = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    const expiredCapacitySubscription = {
        ...(expiredCapacitySnapshot.data() as FirestoreSubscriptionDoc),
        id: expiredCapacitySnapshot.id,
    };
    await expiredCapacitySnapshot.ref.set({
        cycleEndDate: Timestamp.fromMillis(Date.now() - 60_000),
    }, { merge: true });
    const expiredCapacity = await checkAnswerlatticeAICapacity(
        scope,
        'answerlattice_support_search',
        1,
        expiredCapacitySubscription,
    );
    assert.equal(expiredCapacity.allowed, false, 'an expired current subscription must fail before provider admission');
    assert.equal(
        (await expiredCapacitySnapshot.ref.get()).data()?.monthlyCredits,
        2,
        'an expired current subscription must not reset or debit credits',
    );

    scenario('expired reservation');
    await seedSubscription(2);
    const expiredReservationSnapshot = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    const expiredReservationSubscription = {
        ...(expiredReservationSnapshot.data() as FirestoreSubscriptionDoc),
        id: expiredReservationSnapshot.id,
    };
    await expiredReservationSnapshot.ref.set({
        cycleEndDate: Timestamp.fromMillis(Date.now() - 60_000),
    }, { merge: true });
    const operationCountBeforeExpiredReservation = await operationCount();
    await assert.rejects(
        () => reserveAnswerlatticeAiOperationCapacity({
            action: 'answerlattice_support_search',
            idempotencyKey: 'support-search:help_center:expired_reservation_001',
            scope,
            subscription: expiredReservationSubscription,
            unitsToReserve: 1,
        }),
        /active Answerlattice subscription is required/,
        'transaction-current expiry must block reservation before any credit or operation write',
    );
    assert.equal(
        await operationCount(),
        operationCountBeforeExpiredReservation,
        'rejected expired reservations must not create operation rows',
    );

    scenario('stale-scope reservation retry');
    await seedSubscription(2);
    const staleReservationSnapshot = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();
    const staleReservationSubscription = {
        ...(staleReservationSnapshot.data() as FirestoreSubscriptionDoc),
        id: staleReservationSnapshot.id,
    };
    const staleScopeReservation = await reserveAnswerlatticeAiOperationCapacity({
        action: 'answerlattice_support_search',
        idempotencyKey: 'support-search:help_center:stale_scope_reservation_001',
        scope,
        subscription: staleReservationSubscription,
        unitsToReserve: 1,
    });
    const staleScopePointerRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS)
        .doc(staleScopeReservation.operationId);
    const recoveryAtBeforeScopeChange = (await staleScopePointerRef.get()).data()?.recoveryAt.toMillis();
    await staleReservationSnapshot.ref.set({ status: 'pending' }, { merge: true });
    await assert.rejects(
        () => reserveAnswerlatticeAiOperationCapacity({
            action: 'answerlattice_support_search',
            idempotencyKey: 'support-search:help_center:stale_scope_reservation_001',
            scope,
            subscription: staleReservationSubscription,
            unitsToReserve: 1,
        }),
        /active Answerlattice subscription is required/,
        'a stale subscription object must not renew a reservation after current status changed',
    );
    assert.equal(
        (await staleScopePointerRef.get()).data()?.recoveryAt.toMillis(),
        recoveryAtBeforeScopeChange,
        'rejected stale reservation retries must not extend recovery time',
    );
    await Promise.all([
        staleScopePointerRef.delete(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
            .doc(String(scope.tId)).collection(String(scope.sId)).doc(staleScopeReservation.operationId).delete(),
    ]);

    scenario('invalid capacity quantity');
    await seedSubscription(1);
    await assert.rejects(
        () => checkAnswerlatticeAICapacity(scope, 'answerlattice_support_search', '1' as unknown as number),
        /capacity quantity is invalid/,
        'numeric-string operation quantities must not be accepted as Answerlattice credit units',
    );

    scenario('malformed replay evidence');
    await seedSubscription(2);
    const operationIdsBeforeReplayTest = new Set((await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId))
        .collection(String(scope.sId))
        .get()).docs.map(document => document.id));
    const replayScalar = createAccounting('replay_scalar_001');
    await replayScalar.beforeAiProviderCall();
    await replayScalar.settle(result(true), 120);
    const replayOperationSnapshot = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId))
        .collection(String(scope.sId))
        .get();
    const replayOperation = replayOperationSnapshot.docs.find(document => !operationIdsBeforeReplayTest.has(document.id));
    assert.ok(replayOperation, 'the replay scalar test must create one operation record');
    const validReplayData = replayOperation.data();
    await replayOperation.ref.set({ unitsConsumed: '1' }, { merge: true });
    await assert.rejects(
        () => replayScalar.settle(result(true), 120),
        /reservation (identity|evidence) is invalid/,
        'numeric-string operation units must not satisfy Answerlattice idempotent replay',
    );
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 1);

    await replayOperation.ref.set({
        unitsConsumed: validReplayData.unitsConsumed,
        creditConsumption: {
            ...validReplayData.creditConsumption,
            monthlyCreditsAfter: '1',
        },
    }, { merge: true });
    await assert.rejects(
        () => replayScalar.settle(result(true), 120),
        /reservation evidence is invalid/,
        'numeric-string balance evidence must not satisfy Answerlattice idempotent replay',
    );
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 1);

    scenario('provider-not-used refund');
    await seedSubscription(1);
    const providerNotUsed = createAccounting('provider_not_used_001');
    await providerNotUsed.beforeAiProviderCall();
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 0);
    await providerNotUsed.settle(result(false), 20);
    assert.equal(
        (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits,
        1,
        'a reserved request that never uses the provider must refund its credit',
    );

    scenario('failed-request refund');
    await seedSubscription(1);
    const failedRequest = createAccounting('failed_request_001');
    await failedRequest.beforeAiProviderCall();
    await failedRequest.abort('request_failed');
    assert.equal(
        (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits,
        1,
        'a failed request must refund its pre-provider reservation',
    );

    scenario('stale reservation recovery');
    await seedSubscription(1);
    const staleReservation = createAccounting('stale_reservation_001');
    await staleReservation.beforeAiProviderCall();
    const recoveryPointers = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS).get();
    assert.equal(recoveryPointers.size, 1, 'a live reservation must have one root recovery pointer');
    const stalePointer = recoveryPointers.docs[0];
    const staleOperationId = stalePointer.data().operationId;
    const staleOperationRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId)).collection(String(scope.sId)).doc(staleOperationId);
    await Promise.all([
        stalePointer.ref.set({ recoveryAt: Timestamp.fromMillis(Date.now() - 1) }, { merge: true }),
        staleOperationRef.set({ reservationRecoveryAt: Timestamp.fromMillis(Date.now() - 1) }, { merge: true }),
    ]);
    const recovered = await recoverAnswerlatticeAiCapacityReservations({ db, failFast: true, now: Timestamp.now() });
    assert.deepEqual(recovered, { errors: 0, refunded: 1, scanned: 1 });
    assert.equal((await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits, 1);
    assert.equal((await stalePointer.ref.get()).exists, false, 'successful stale recovery must delete its root pointer');
    assert.equal((await staleOperationRef.get()).data()?.accountingStatus, 'refunded');

    scenario('malformed recovery evidence');
    await seedSubscription(1);
    const malformedRecovery = createAccounting('malformed_recovery_001');
    await malformedRecovery.beforeAiProviderCall();
    const malformedPointerSnapshot = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_CAPACITY_RESERVATIONS).get();
    assert.equal(malformedPointerSnapshot.size, 1);
    const malformedPointer = malformedPointerSnapshot.docs[0];
    const malformedOperationRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS)
        .doc(String(scope.tId)).collection(String(scope.sId)).doc(malformedPointer.data().operationId);
    const malformedOperation = (await malformedOperationRef.get()).data() || {};
    await Promise.all([
        malformedPointer.ref.set({ recoveryAt: Timestamp.fromMillis(Date.now() - 1) }, { merge: true }),
        malformedOperationRef.set({
            creditConsumption: {
                ...malformedOperation.creditConsumption,
                monthlyCreditsDebited: '1',
            },
        }, { merge: true }),
    ]);
    const malformedRecoveryResult = await recoverAnswerlatticeAiCapacityReservations({ db, now: Timestamp.now() });
    assert.deepEqual(malformedRecoveryResult, { errors: 1, refunded: 0, scanned: 1 });
    assert.equal(
        (await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get()).data()?.monthlyCredits,
        0,
        'malformed recovery evidence must not mint support credits',
    );
    assert.equal((await malformedPointer.ref.get()).exists, true, 'malformed recovery must remain visible for repair');

    process.stdout.write('Answerlattice support-search accounting emulator tests passed.\n');
}

run().catch((error) => {
    console.error(`Answerlattice support-search accounting scenario failed: ${currentScenario}`);
    console.error(error);
    process.exit(1);
});
