#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

process.env.RAZORPAY_KEY_ID ||= 'test_plan_registry_key';
process.env.RAZORPAY_KEY_SECRET ||= 'test_plan_registry_secret';

const {
    claimProviderPlanRegistry,
    completeProviderPlanRegistryForTest,
    markProviderPlanCreateStarted,
} = require('../../src/lib/razorpay/plan-handler');

const productId = PRODUCT_IDS.MENULIST;

async function clearRegistry(): Promise<void> {
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.BILLING_PROVIDER_PLANS).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
}

async function getRegistryByLookupKey(lookupKey: string) {
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.BILLING_PROVIDER_PLANS)
        .where('lookupKey', '==', lookupKey)
        .limit(1)
        .get();
    assert.equal(snapshot.size, 1);
    return snapshot.docs[0].ref;
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }
    await clearRegistry();

    const lookupKey = 'ML_B2C_STARTER_MONTH_INR_49900';
    const attempts = Array.from({ length: 8 }, (_, index) => `plan-attempt-${index}`);
    const claims = await Promise.all(attempts.map((attemptId) => claimProviderPlanRegistry({
        attemptId,
        lookupKey,
        productId,
    })));
    const winners = claims
        .map((claim, index) => ({ claim, attemptId: attempts[index] }))
        .filter(({ claim }) => claim.outcome === 'acquired');
    assert.equal(winners.length, 1, 'one provider-plan registry claim must win');
    assert.equal(claims.filter((claim) => claim.outcome === 'waiting').length, 7);
    const winningAttemptId = winners[0].attemptId;

    assert.equal(await markProviderPlanCreateStarted({
        attemptId: winningAttemptId,
        lookupKey,
        productId,
    }), true);
    assert.equal((await claimProviderPlanRegistry({
        attemptId: 'waiting-attempt',
        lookupKey,
        productId,
    })).outcome, 'waiting');

    const providerCreatingRef = await getRegistryByLookupKey(lookupKey);
    await providerCreatingRef.set({ leaseExpiresAt: Timestamp.fromMillis(1) }, { merge: true });
    const recoveryClaim = await claimProviderPlanRegistry({
        attemptId: 'must-not-replace-provider-attempt',
        lookupKey,
        productId,
    });
    assert.deepEqual(recoveryClaim, {
        outcome: 'recover_provider',
        attemptId: winningAttemptId,
    });
    assert.equal(await markProviderPlanCreateStarted({
        attemptId: 'must-not-replace-provider-attempt',
        lookupKey,
        productId,
    }), false);

    const providerPlanId = await completeProviderPlanRegistryForTest({
        attemptId: winningAttemptId,
        lookupKey,
        productId,
        providerPlanId: 'plan_exactProvider123',
    });
    assert.equal(providerPlanId, 'plan_exactProvider123');
    assert.deepEqual(await claimProviderPlanRegistry({
        attemptId: 'ready-attempt',
        lookupKey,
        productId,
    }), {
        outcome: 'ready',
        providerPlanId: 'plan_exactProvider123',
    });
    assert.equal(await completeProviderPlanRegistryForTest({
        attemptId: winningAttemptId,
        lookupKey,
        productId,
        providerPlanId: 'plan_conflictingProvider456',
    }), 'plan_exactProvider123', 'the first ready provider identity remains authoritative');

    const safeReplacementKey = 'ML_B2C_PRO_YEAR_USD_120000';
    const firstSafeClaim = await claimProviderPlanRegistry({
        attemptId: 'safe-attempt-one',
        lookupKey: safeReplacementKey,
        productId,
    });
    assert.equal(firstSafeClaim.outcome, 'acquired');
    const safeReplacementRef = await getRegistryByLookupKey(safeReplacementKey);
    await safeReplacementRef.set({ leaseExpiresAt: Timestamp.fromMillis(1) }, { merge: true });
    const replacementClaim = await claimProviderPlanRegistry({
        attemptId: 'safe-attempt-two',
        lookupKey: safeReplacementKey,
        productId,
    });
    assert.deepEqual(replacementClaim, { outcome: 'acquired', attemptId: 'safe-attempt-two' });
    assert.equal(await markProviderPlanCreateStarted({
        attemptId: 'safe-attempt-one',
        lookupKey: safeReplacementKey,
        productId,
    }), false, 'an expired pre-provider owner cannot start after replacement');
    assert.equal(await markProviderPlanCreateStarted({
        attemptId: 'safe-attempt-two',
        lookupKey: safeReplacementKey,
        productId,
    }), true);

    const legacyLookupKey = 'ML_B2B_STARTER_MONTH_INR_79900';
    const legacyClaim = await claimProviderPlanRegistry({
        attemptId: 'legacy-attempt',
        lookupKey: legacyLookupKey,
        productId,
    });
    assert.equal(legacyClaim.outcome, 'acquired');
    const legacyRef = await getRegistryByLookupKey(legacyLookupKey);
    await legacyRef.set({
        leaseExpiresAt: Timestamp.fromMillis(1),
        stateVersion: FieldValue.delete(),
    }, { merge: true });
    assert.deepEqual(await claimProviderPlanRegistry({
        attemptId: 'legacy-replacement-must-not-win',
        lookupKey: legacyLookupKey,
        productId,
    }), {
        outcome: 'recover_provider',
        attemptId: 'legacy-attempt',
    });
    assert.equal(await completeProviderPlanRegistryForTest({
        attemptId: 'legacy-attempt',
        lookupKey: legacyLookupKey,
        productId,
        providerPlanId: 'plan_legacyRecovered123',
    }), 'plan_legacyRecovered123');

    const malformedLookupKey = 'ML_B2C_MALFORMED_MONTH_INR_100';
    await claimProviderPlanRegistry({
        attemptId: 'malformed-attempt',
        lookupKey: malformedLookupKey,
        productId,
    });
    const malformedRef = await getRegistryByLookupKey(malformedLookupKey);
    await malformedRef.set({ status: 'unexpected_state' }, { merge: true });
    await assert.rejects(() => claimProviderPlanRegistry({
        attemptId: 'malformed-retry',
        lookupKey: malformedLookupKey,
        productId,
    }), /registry state is invalid/);

    await clearRegistry();
    process.stdout.write('Billing provider-plan registry emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
