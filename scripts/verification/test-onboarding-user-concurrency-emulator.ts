#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import {
    assertCurrentUserAvailableForOnboardingInTransaction,
} from '../../src/lib/onboarding/createTenantStore';

const userId = 'onboarding-concurrency-owner';
const session = {
    authIssuedAt: 1_800_000_000,
    uId: userId,
    user: {
        email: 'onboarding-owner@example.com',
        id: userId,
    },
};

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    await userRef.set({
        active: true,
        authDisabled: false,
        deleted: false,
        email: 'onboarding-owner@example.com',
        id: userId,
        isVerified: true,
        platformRole: 'OWNER',
        storeIds: [],
        stores: [],
    });

    const attempts = await Promise.allSettled(Array.from({ length: 8 }, (_, index) => (
        firestoreAdmin.runTransaction(async (transaction) => {
            await assertCurrentUserAvailableForOnboardingInTransaction(
                transaction,
                firestoreAdmin,
                userId,
                session,
            );
            transaction.update(userRef, {
                storeId: index + 1,
                stores: [{ name: 'Main Store', role: 'OWNER', storeId: index + 1 }],
                tenantId: index + 1,
            });
            return index + 1;
        })
    )));

    const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled');
    const rejected = attempts.filter((attempt) => attempt.status === 'rejected');
    assert.equal(fulfilled.length, 1, 'exactly one concurrent onboarding transaction may win');
    assert.equal(rejected.length, 7, 'all retried losing transactions must observe the committed scope');
    rejected.forEach((attempt) => {
        if (attempt.status === 'rejected') {
            assert.ok(attempt.reason instanceof Error, 'a losing transaction must fail explicitly');
        }
    });

    const persisted = (await userRef.get()).data();
    assert.equal(persisted?.tenantId, persisted?.storeId, 'the winning scope must remain internally consistent');
    assert.equal(persisted?.stores?.length, 1);

    await userRef.delete();
    process.stdout.write('Onboarding current-user concurrency emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
