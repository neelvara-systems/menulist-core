#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import {
    claimBillingCheckoutLease,
    completeBillingCheckoutLease,
    markBillingCheckoutProviderCreateStarted,
    markBillingCheckoutProviderCreated,
    releaseBillingCheckoutLease,
    renewBillingCheckoutProviderRecoveryLease,
    renewExpiredBillingCheckoutLease,
} from '../../src/lib/billing/billingCheckoutLease';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

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
    }), false, 'a provider ID cannot be recorded before provider creation is fenced');
    assert.equal(await completeBillingCheckoutLease({
        attemptId: winningRenewal?.attemptId || '',
        identity,
    }), false, 'processing work cannot be completed without a provider checkpoint');
    assert.equal(await markBillingCheckoutProviderCreateStarted({
        attemptId: winningRenewal?.attemptId || '',
        identity,
    }), true);
    assert.equal(await releaseBillingCheckoutLease({
        attemptId: winningRenewal?.attemptId || '',
        identity,
    }), false, 'provider-ambiguous work cannot be released as pre-provider work');
    assert.equal((await claimBillingCheckoutLease(identity)).outcome, 'in_progress');

    const providerCreatingSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES)
        .limit(1)
        .get();
    await providerCreatingSnapshot.docs[0].ref.set({ expiresAt: Timestamp.fromMillis(0) }, { merge: true });
    const providerRecoveryClaim = await claimBillingCheckoutLease(identity);
    assert.equal(providerRecoveryClaim.outcome, 'recover_provider');
    assert.equal(await renewExpiredBillingCheckoutLease(
        identity,
        winningRenewal?.attemptId || '',
    ).then((result) => result.acquired), false, 'ambiguous provider work must not receive a new attempt');
    assert.equal(await renewBillingCheckoutProviderRecoveryLease(
        identity,
        winningRenewal?.attemptId || '',
    ), false, 'subscriptions do not have a provider create idempotency key');

    assert.equal(await markBillingCheckoutProviderCreated({
        attemptId: winningRenewal?.attemptId || '',
        identity,
        providerEntityId,
    }), true);
    assert.equal(await markBillingCheckoutProviderCreated({
        attemptId: winningRenewal?.attemptId || '',
        identity,
        providerEntityId: 'sub_conflictingProvider',
    }), false, 'the first exact provider identity must win');
    assert.equal(await markBillingCheckoutProviderCreated({
        attemptId: winningRenewal?.attemptId || '',
        identity,
        providerEntityId,
    }), true, 'the exact provider checkpoint is idempotent');
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
    await completedSnapshot.docs[0].ref.set({ expiresAt: Timestamp.fromMillis(1) }, { merge: true });
    const postReplayClaim = await claimBillingCheckoutLease(identity);
    assert.equal(postReplayClaim.outcome, 'acquired');
    assert.equal(await releaseBillingCheckoutLease({
        attemptId: postReplayClaim.outcome === 'acquired' ? postReplayClaim.attemptId : '',
        identity,
    }), true);

    const topupIdentity = { ...identity, kind: 'topup' as const };
    const topupClaim = await claimBillingCheckoutLease(topupIdentity);
    assert.equal(topupClaim.outcome, 'acquired');
    if (topupClaim.outcome !== 'acquired') throw new Error('expected top-up lease');
    assert.equal(await markBillingCheckoutProviderCreateStarted({
        attemptId: topupClaim.attemptId,
        identity: topupIdentity,
    }), true);
    const topupSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES)
        .where('kind', '==', 'topup')
        .limit(1)
        .get();
    await topupSnapshot.docs[0].ref.set({ expiresAt: Timestamp.fromMillis(0) }, { merge: true });
    const topupRecoveryClaim = await claimBillingCheckoutLease(topupIdentity);
    assert.deepEqual(topupRecoveryClaim, {
        outcome: 'recover_provider',
        attemptId: topupClaim.attemptId,
        startedAtMillis: topupClaim.startedAtMillis,
    });
    const topupRecoveryRenewals = await Promise.all(Array.from({ length: 8 }, () => (
        renewBillingCheckoutProviderRecoveryLease(topupIdentity, topupClaim.attemptId)
    )));
    assert.equal(topupRecoveryRenewals.filter(Boolean).length, 1);
    assert.equal(await markBillingCheckoutProviderCreateStarted({
        attemptId: topupClaim.attemptId,
        identity: topupIdentity,
    }), true, 'top-up recovery keeps the same attempt and unique receipt fence');
    assert.equal(await markBillingCheckoutProviderCreated({
        attemptId: topupClaim.attemptId,
        identity: topupIdentity,
        providerEntityId: 'order_checkoutLease123',
    }), true);

    const malformedIdentity = { ...identity, storeId: 903 };
    const malformedClaim = await claimBillingCheckoutLease(malformedIdentity);
    assert.equal(malformedClaim.outcome, 'acquired');
    if (malformedClaim.outcome !== 'acquired') throw new Error('expected malformed-state setup lease');
    const malformedSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES)
        .where('storeId', '==', '903')
        .limit(1)
        .get();
    await malformedSnapshot.docs[0].ref.set({ status: 'unexpected_state' }, { merge: true });
    assert.equal((await claimBillingCheckoutLease(malformedIdentity)).outcome, 'conflict');
    await malformedSnapshot.docs[0].ref.set({
        expiresAt: Timestamp.fromMillis(1),
        providerEntityId: '',
        status: 'completed',
    }, { merge: true });
    assert.equal(
        (await claimBillingCheckoutLease(malformedIdentity)).outcome,
        'conflict',
        'a malformed completed replay cannot be overwritten into a new provider create',
    );

    const legacySubscriptionIdentity = { ...identity, storeId: 904 };
    const legacySubscriptionClaim = await claimBillingCheckoutLease(legacySubscriptionIdentity);
    assert.equal(legacySubscriptionClaim.outcome, 'acquired');
    if (legacySubscriptionClaim.outcome !== 'acquired') throw new Error('expected legacy subscription setup lease');
    const legacySubscriptionSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES)
        .where('storeId', '==', '904')
        .limit(1)
        .get();
    await legacySubscriptionSnapshot.docs[0].ref.set({
        expiresAt: Timestamp.fromMillis(0),
        stateVersion: FieldValue.delete(),
    }, { merge: true });
    assert.equal(
        (await claimBillingCheckoutLease(legacySubscriptionIdentity)).outcome,
        'recover_provider',
        'an unversioned rolling-release lease must be treated as provider-ambiguous',
    );
    assert.equal((await renewExpiredBillingCheckoutLease(
        legacySubscriptionIdentity,
        legacySubscriptionClaim.attemptId,
    )).acquired, false);
    assert.equal(await markBillingCheckoutProviderCreated({
        attemptId: legacySubscriptionClaim.attemptId,
        identity: legacySubscriptionIdentity,
        providerEntityId: 'sub_legacyCheckoutLease123',
    }), true, 'an exact recovered legacy provider entity can be checkpointed');
    assert.equal(await releaseBillingCheckoutLease({
        attemptId: legacySubscriptionClaim.attemptId,
        identity: legacySubscriptionIdentity,
    }), false, 'a provider checkpoint cannot be released after a fetch or shape error');
    assert.equal(await releaseBillingCheckoutLease({
        attemptId: legacySubscriptionClaim.attemptId,
        identity: legacySubscriptionIdentity,
        providerEntityId: 'sub_wrongProvider',
    }), false);
    assert.equal(await releaseBillingCheckoutLease({
        attemptId: legacySubscriptionClaim.attemptId,
        identity: legacySubscriptionIdentity,
        providerEntityId: 'sub_legacyCheckoutLease123',
    }), true, 'only explicit compensation for the exact provider may release its checkpoint');

    const legacyTopupIdentity = { ...identity, kind: 'topup' as const, storeId: 905 };
    const legacyTopupClaim = await claimBillingCheckoutLease(legacyTopupIdentity);
    assert.equal(legacyTopupClaim.outcome, 'acquired');
    if (legacyTopupClaim.outcome !== 'acquired') throw new Error('expected legacy top-up setup lease');
    const legacyTopupSnapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.BILLING_CHECKOUT_LEASES)
        .where('storeId', '==', '905')
        .limit(1)
        .get();
    await legacyTopupSnapshot.docs[0].ref.set({
        expiresAt: Timestamp.fromMillis(0),
        stateVersion: FieldValue.delete(),
    }, { merge: true });
    assert.equal((await claimBillingCheckoutLease(legacyTopupIdentity)).outcome, 'recover_provider');
    assert.equal(await renewBillingCheckoutProviderRecoveryLease(
        legacyTopupIdentity,
        legacyTopupClaim.attemptId,
    ), true, 'legacy top-up recovery may retain the same unique receipt attempt');
    assert.equal(await markBillingCheckoutProviderCreateStarted({
        attemptId: legacyTopupClaim.attemptId,
        identity: legacyTopupIdentity,
    }), true);

    await clearLeaseDocuments();
    process.stdout.write('Billing checkout concurrency emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
