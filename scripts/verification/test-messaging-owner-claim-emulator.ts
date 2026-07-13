#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getPhoneUserDocumentId } from '@lib/auth/phoneUserIdentity';
import {
    MessagingOwnerClaimConflictError,
    readMessagingOwnerClaimInTransaction,
} from '@lib/messaging-onboarding/messagingOwnerClaim';

const secret = process.env.NEXTAUTH_SECRET;
assert(secret, 'NEXTAUTH_SECRET is required');

const verifyCanonicalPhoneIdentity = (): void => {
    const phone = '+919876543210';
    const expectedDigest = crypto.createHmac('sha256', secret).update(`user:${phone}`).digest('hex');
    assert.equal(
        getPhoneUserDocumentId(phone),
        `phone_${expectedDigest.slice(0, 24)}`,
        'Messaging onboarding and phone OTP must retain one canonical phone user ID',
    );
};

const verifyExistingOwnerClaimSerializes = async (): Promise<void> => {
    const userId = 'messaging-existing-owner-race';
    const phone = '+919811111111';
    const phoneUsername = '919811111111';
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    await userRef.set({ phone, phoneUsername, stores: [], tenantId: null, storeId: null });

    const results = await Promise.allSettled([95101, 95102].map((tenantId) => (
        firestoreAdmin.runTransaction(async (transaction) => {
            const claim = await readMessagingOwnerClaimInTransaction({
                db: firestoreAdmin,
                existingUserExpected: true,
                expectedPhone: phone,
                expectedPhoneUsername: phoneUsername,
                transaction,
                userId,
            });
            transaction.create(
                firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)),
                { tenantId },
            );
            transaction.update(claim.ref, {
                storeId: tenantId + 100,
                stores: [{ storeId: tenantId + 100 }],
                tenantId,
            });
            return tenantId;
        })
    )));

    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(
        rejected?.status === 'rejected'
        && rejected.reason instanceof MessagingOwnerClaimConflictError,
        'The second existing phone owner claim must reject after scope is assigned',
    );
    const tenants = await Promise.all([95101, 95102].map((tenantId) => (
        firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)).get()
    )));
    assert.equal(tenants.filter(({ exists }) => exists).length, 1, 'The losing claim must not leave a tenant');
};

const verifyNewOwnerClaimSerializes = async (): Promise<void> => {
    const phone = '+919822222222';
    const phoneUsername = '919822222222';
    const userId = getPhoneUserDocumentId(phone);
    assert(userId);

    const results = await Promise.allSettled([95201, 95202].map((tenantId) => (
        firestoreAdmin.runTransaction(async (transaction) => {
            const claim = await readMessagingOwnerClaimInTransaction({
                db: firestoreAdmin,
                existingUserExpected: false,
                expectedPhone: phone,
                expectedPhoneUsername: phoneUsername,
                transaction,
                userId,
            });
            transaction.create(
                firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)),
                { tenantId },
            );
            transaction.create(claim.ref, {
                phone,
                phoneUsername,
                storeId: tenantId + 100,
                stores: [{ storeId: tenantId + 100 }],
                tenantId,
            });
            return tenantId;
        })
    )));

    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const tenants = await Promise.all([95201, 95202].map((tenantId) => (
        firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId)).get()
    )));
    assert.equal(tenants.filter(({ exists }) => exists).length, 1, 'A duplicate phone must not create a second tenant');
};

const verifyScopedOrMismatchedOwnerRejects = async (): Promise<void> => {
    const cases = [
        {
            data: { phone: '+919833333333', phoneUsername: '919833333333', stores: [{ storeId: 1 }] },
            id: 'messaging-owner-with-store-mapping',
            phone: '+919833333333',
            phoneUsername: '919833333333',
        },
        {
            data: { phone: '+919844444444', phoneUsername: '919844444444', stores: [] },
            id: 'messaging-owner-phone-mismatch',
            phone: '+919855555555',
            phoneUsername: '919855555555',
        },
        {
            data: { blocked: true, phone: '+919866666666', phoneUsername: '919866666666', stores: [] },
            id: 'messaging-owner-platform-blocked',
            phone: '+919866666666',
            phoneUsername: '919866666666',
        },
        {
            data: { phone: '+919877777777', phoneUsername: '919877777777', storeIds: [7], stores: [] },
            id: 'messaging-owner-with-store-id-mapping',
            phone: '+919877777777',
            phoneUsername: '919877777777',
        },
    ];

    for (const testCase of cases) {
        await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(testCase.id).set(testCase.data);
        await assert.rejects(
            firestoreAdmin.runTransaction((transaction) => readMessagingOwnerClaimInTransaction({
                db: firestoreAdmin,
                existingUserExpected: true,
                expectedPhone: testCase.phone,
                expectedPhoneUsername: testCase.phoneUsername,
                transaction,
                userId: testCase.id,
            })),
            MessagingOwnerClaimConflictError,
        );
    }
};

const run = async (): Promise<void> => {
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    verifyCanonicalPhoneIdentity();
    await verifyExistingOwnerClaimSerializes();
    await verifyNewOwnerClaimSerializes();
    await verifyScopedOrMismatchedOwnerRejects();
    console.log('Messaging owner-claim emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
