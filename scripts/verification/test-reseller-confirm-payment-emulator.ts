import assert from 'node:assert/strict';
import { deleteApp } from 'firebase-admin/app';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { confirmManualSubscriptionPaymentServer } from '../../src/database/subscriptions/server';
import { admin, firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';

const collection = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS);
const testPrefix = `reseller-confirm-${Date.now()}`;

const validSubscription = {
    amount: 299_900,
    billingMode: 'manual',
    currency: 'INR',
    manualPaymentConfirmed: false,
    pId: 'ML',
    planId: 'plan_founder_annual',
    productId: 'ML',
    resellerId: 'reseller_valid',
    sId: 41,
    status: 'pending',
    statuses: [],
    storeId: 41,
    tId: 31,
    tenantId: 31,
};

async function run(): Promise<void> {
    const concurrentRef = collection.doc(`${testPrefix}-concurrent`);
    await concurrentRef.set(validSubscription);

    const concurrentResults = await Promise.all(Array.from({ length: 8 }, () => (
        confirmManualSubscriptionPaymentServer({
            actorId: 'reseller_valid',
            isPlatformUser: false,
            subscriptionId: concurrentRef.id,
        })
    )));
    assert(concurrentResults.every((result) => result.kind === 'confirmed'));
    const confirmedResults = concurrentResults.filter((result) => result.kind === 'confirmed');
    assert.equal(confirmedResults.filter((result) => result.alreadyConfirmed === false).length, 1);
    assert.equal(confirmedResults.filter((result) => result.alreadyConfirmed === true).length, 7);

    const stored = (await concurrentRef.get()).data();
    assert.equal(stored?.status, 'active');
    assert.equal(stored?.manualPaymentConfirmed, true);
    assert.equal(stored?.statuses.length, 1);

    const replay = await confirmManualSubscriptionPaymentServer({
        actorId: 'reseller_valid',
        isPlatformUser: false,
        subscriptionId: concurrentRef.id,
    });
    assert.equal(replay.kind, 'confirmed');
    if (replay.kind === 'confirmed') assert.equal(replay.alreadyConfirmed, true);
    assert.equal((await concurrentRef.get()).data()?.statuses.length, 1);

    const cancelledRef = collection.doc(`${testPrefix}-cancelled`);
    await cancelledRef.set({ ...validSubscription, status: 'cancelled' });
    assert.equal((await confirmManualSubscriptionPaymentServer({
        actorId: 'reseller_valid',
        isPlatformUser: false,
        subscriptionId: cancelledRef.id,
    })).kind, 'invalid_state');
    assert.equal((await cancelledRef.get()).data()?.status, 'cancelled');

    const foreignRef = collection.doc(`${testPrefix}-foreign`);
    await foreignRef.set(validSubscription);
    assert.equal((await confirmManualSubscriptionPaymentServer({
        actorId: 'another_reseller',
        isPlatformUser: false,
        subscriptionId: foreignRef.id,
    })).kind, 'forbidden');
    assert.equal((await foreignRef.get()).data()?.status, 'pending');

    const malformedRef = collection.doc(`${testPrefix}-malformed`);
    await malformedRef.set({ ...validSubscription, sId: 42 });
    assert.equal((await confirmManualSubscriptionPaymentServer({
        actorId: 'reseller_valid',
        isPlatformUser: false,
        subscriptionId: malformedRef.id,
    })).kind, 'malformed');
    assert.equal((await malformedRef.get()).data()?.status, 'pending');
}

run()
    .then(async () => {
        console.log('Reseller manual payment confirmation emulator tests passed.');
        await deleteApp(admin.app());
    })
    .catch(async (error) => {
        console.error(error);
        await deleteApp(admin.app());
        process.exitCode = 1;
    });
