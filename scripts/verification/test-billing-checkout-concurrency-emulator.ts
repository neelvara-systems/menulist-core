#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import {
    claimBillingCheckoutLease,
    completeBillingCheckoutLease,
    markBillingCheckoutProviderCreated,
    releaseBillingCheckoutLease,
    renewExpiredBillingCheckoutLease,
} from '../../src/lib/billing/billingCheckoutLease';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

const identity = {
    actorId: 'billing-owner-a',
    kind: 'subscription' as const,
    productId: 'ML',
    tenantId: 901,
    storeId: 902,
    requestFacts: {
        currency: 'INR',
        interval: 'MONTH',
        planId: 'starter',
        quantity: 1,
    },
};

async function clearLeaseDocuments(): Promise<void> {
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    await clearLeaseDocuments();

    const claims = await Promise.all(Array.from({ length: 8 }, () => claimBillingCheckoutLease(identity)));
    const acquiredClaims = claims.filter((claim) => claim.outcome === 'acquired');
    assert.equal(acquiredClaims.length, 1, 'exactly one concurrent checkout lease claim must win');
    assert.equal(claims.filter((claim) => claim.outcome === 'in_progress').length, 7);
    const firstAttemptId = acquiredClaims[0]?.outcome === 'acquired'
        ? acquiredClaims[0].attemptId
        : '';
    assert.ok(firstAttemptId);

    const leaseSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).limit(1).get();
    assert.equal(leaseSnapshot.size, 1);
    await leaseSnapshot.docs[0].ref.set({ expiresAt: Timestamp.fromMillis(0) }, { merge: true });

    const recoveryClaim = await claimBillingCheckoutLease(identity);
    assert.equal(recoveryClaim.outcome, 'recover_attempt');
    if (recoveryClaim.outcome !== 'recover_attempt') throw new Error('expected recoverable attempt');
    assert.equal(recoveryClaim.attemptId, firstAttemptId);

    const renewals = await Promise.all(Array.from({ length: 8 }, () => (
        renewExpiredBillingCheckoutLease(identity, firstAttemptId)
    )));
    const winningRenewal = renewals.find((renewal) => renewal.acquired && renewal.attemptId);
    assert.equal(renewals.filter((renewal) => renewal.acquired).length, 1);
    assert.ok(winningRenewal?.attemptId);

    const providerEntityId = 'sub_checkoutLease123';
    assert.equal(await markBillingCheckoutProviderCreated({
        attemptId: winningRenewal?.attemptId || '',
        identity,
        providerEntityId,
    }), true);
    assert.deepEqual(await claimBillingCheckoutLease(identity), {
        outcome: 'provider_created',
        attemptId: winningRenewal?.attemptId,
        providerEntityId,
        startedAtMillis: winningRenewal?.startedAtMillis,
    });
    assert.equal((await claimBillingCheckoutLease({
        ...identity,
        requestFacts: { ...identity.requestFacts, quantity: 2 },
    })).outcome, 'conflict');
    assert.equal((await claimBillingCheckoutLease({
        ...identity,
        actorId: 'billing-owner-b',
    })).outcome, 'conflict');

    assert.equal(await releaseBillingCheckoutLease({
        attemptId: firstAttemptId,
        identity,
    }), false);
    assert.equal(await completeBillingCheckoutLease({
        attemptId: winningRenewal?.attemptId || '',
        identity,
    }), true);
    assert.equal((await claimBillingCheckoutLease(identity)).outcome, 'provider_created');
    assert.equal((await claimBillingCheckoutLease({
        ...identity,
        requestFacts: { ...identity.requestFacts, quantity: 2 },
    })).outcome, 'conflict');

    const completedSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES).limit(1).get();
    await completedSnapshot.docs[0].ref.set({ expiresAt: Timestamp.fromMillis(0) }, { merge: true });
    const postReplayClaim = await claimBillingCheckoutLease(identity);
    assert.equal(postReplayClaim.outcome, 'acquired');
    assert.equal(await releaseBillingCheckoutLease({
        attemptId: postReplayClaim.outcome === 'acquired' ? postReplayClaim.attemptId : '',
        identity,
    }), true);
    assert.equal((await claimBillingCheckoutLease({ ...identity, kind: 'topup' })).outcome, 'acquired');

    await clearLeaseDocuments();
    process.stdout.write('Billing checkout concurrency emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
