#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
    canDeleteCreatedResellerAuthUser,
    readResellerOwnerClaimInTransaction,
    ResellerOwnerClaimConflictError,
} from '@lib/reseller/resellerOwnerClaim';

const verifyExistingOwnerClaimSerializes = async (): Promise<void> => {
    const userId = 'reseller-existing-owner-race';
    const email = 'existing-owner-race@example.com';
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    await userRef.set({ active: true, email, firebaseUid: 'auth-existing-owner-race' });

    const results = await Promise.allSettled([94101, 94102].map((tenantId) => firestoreAdmin.runTransaction(async (transaction) => {
        const claim = await readResellerOwnerClaimInTransaction({
            authUid: 'auth-existing-owner-race',
            db: firestoreAdmin,
            existingOwnerExpected: true,
            expectedEmail: email,
            transaction,
            userId,
        });
        transaction.create(firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)), { tenantId });
        transaction.update(claim.ref, { storeId: tenantId + 100, tenantId });
        return tenantId;
    })));
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(
        rejected?.status === 'rejected'
        && rejected.reason instanceof ResellerOwnerClaimConflictError,
        'The second existing-owner onboarding must reject after the owner is linked',
    );
    const createdTenants = await Promise.all([94101, 94102].map((tenantId) => (
        firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)).get()
    )));
    assert.equal(createdTenants.filter(({ exists }) => exists).length, 1, 'The losing owner claim must not leave a tenant');
};

const verifyNewOwnerClaimAndCompensationOwnership = async (): Promise<void> => {
    const authUid = 'reseller-new-owner-race';
    const email = 'new-owner-race@example.com';
    const results = await Promise.allSettled([94201, 94202].map((tenantId) => firestoreAdmin.runTransaction(async (transaction) => {
        const claim = await readResellerOwnerClaimInTransaction({
            authUid,
            db: firestoreAdmin,
            existingOwnerExpected: false,
            expectedEmail: email,
            transaction,
            userId: authUid,
        });
        transaction.create(firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)), { tenantId });
        transaction.create(claim.ref, { email, firebaseUid: authUid, storeId: tenantId + 100, tenantId });
        return tenantId;
    })));
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    assert.equal(await canDeleteCreatedResellerAuthUser(firestoreAdmin, authUid), false, 'Bound Auth identity must not be deleted by losing compensation');
    assert.equal(await canDeleteCreatedResellerAuthUser(firestoreAdmin, 'reseller-unbound-auth'), true, 'Unbound request-created Auth identity remains compensatable');
};

const run = async (): Promise<void> => {
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    await verifyExistingOwnerClaimSerializes();
    await verifyNewOwnerClaimAndCompensationOwnership();
    console.log('Reseller owner-claim emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
