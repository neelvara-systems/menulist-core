#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getGlobalEmailUserDocumentId } from '@lib/auth/serverUserContext';
import {
    assertGoogleClaimTargetIsAvailable,
    canDeleteCreatedClaimAuthUser,
    ClaimTokenUnavailableError,
    getUniqueMessagingUserByClaimToken,
    releaseClaimAccountOperation,
    reserveClaimAccountOperation,
    runClaimAccountTransaction,
} from '@lib/auth/claimAccountConcurrency';
import { Timestamp } from 'firebase-admin/firestore';

const seedClaimUser = async (userId: string, token: string, extra: Record<string, unknown> = {}) => {
    const ref = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    await ref.set({
        active: true,
        claimToken: token,
        claimTokenExpiresAt: Timestamp.fromMillis(Date.now() + 60_000),
        storeId: 96102,
        stores: [{ name: 'Claim Store', role: 'owner', storeId: 96102 }],
        tenantId: 96101,
        ...extra,
    });
    await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc('96101').set({
            active: true,
            tenantId: 96101,
        }),
        firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc('96102').set({
            active: true,
            storeId: 96102,
            tenantId: 96101,
        }),
    ]);
    return ref;
};

const verifyOneReservationAndAtomicFinalize = async (): Promise<void> => {
    const token = 'claim_account_concurrency_token_0001';
    const userRef = await seedClaimUser('claim-account-concurrent', token);
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('claim-subscription');
    await subscriptionRef.set({
        pId: 'ML',
        productId: 'ML',
        sId: 96102,
        storeId: 96102,
        tId: 96101,
        tenantId: 96101,
        userId: 'before',
    });
    const conflictingSubscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc('claim-subscription-conflicting');
    await conflictingSubscriptionRef.set({
        pId: 'ML',
        productId: 'ML',
        sId: 96102,
        storeId: 96102,
        tId: 99999,
        tenantId: 96101,
        userId: 'foreign-before',
    });

    const attempts = [
        { mode: 'email-password' as const, operationId: 'claim-operation-email' },
        { mode: 'whatsapp-phone' as const, operationId: 'claim-operation-phone' },
    ];
    const reservations = await Promise.allSettled(attempts.map((attempt) => reserveClaimAccountOperation({
        claimToken: token,
        db: firestoreAdmin,
        messagingUserRef: userRef,
        ...attempt,
    })));
    assert.equal(reservations.filter(({ status }) => status === 'fulfilled').length, 1);
    const winningIndex = reservations.findIndex(({ status }) => status === 'fulfilled');
    const winner = attempts[winningIndex];
    const loser = reservations.find(({ status }) => status === 'rejected');
    assert(
        loser?.status === 'rejected' && loser.reason instanceof ClaimTokenUnavailableError,
        'A concurrent claim must stop before its external Auth side effect',
    );

    await runClaimAccountTransaction({
        claimToken: token,
        db: firestoreAdmin,
        messagingUserRef: userRef,
        mode: winner.mode,
        operationId: winner.operationId,
        subscription: {
            email: 'claimed@example.com',
            name: 'Claimed Owner',
            userDocId: userRef.id,
        },
        apply: (transaction) => {
            transaction.update(userRef, {
                claimToken: null,
                firebaseUid: 'claim-auth-uid',
            });
        },
    });

    const [userSnapshot, subscriptionSnapshot, conflictingSubscriptionSnapshot] = await Promise.all([
        userRef.get(),
        subscriptionRef.get(),
        conflictingSubscriptionRef.get(),
    ]);
    assert.equal(userSnapshot.data()?.claimToken, null);
    assert.equal(userSnapshot.data()?.claimOperation, undefined);
    assert.equal(subscriptionSnapshot.data()?.userId, userRef.id);
    assert.equal(subscriptionSnapshot.data()?.email, 'claimed@example.com');
    assert.equal(
        conflictingSubscriptionSnapshot.data()?.userId,
        'foreign-before',
        'account claim must not rewrite a subscription with conflicting scope aliases',
    );
    assert.equal(await canDeleteCreatedClaimAuthUser(firestoreAdmin, userRef, 'claim-auth-uid'), false);
};

const verifyFailedFinalizeRollsBackAndCanRelease = async (): Promise<void> => {
    const token = 'claim_account_failure_token_0000002';
    const userRef = await seedClaimUser('claim-account-failed-finalize', token);
    const operationId = 'claim-operation-failure';
    await reserveClaimAccountOperation({
        claimToken: token,
        db: firestoreAdmin,
        messagingUserRef: userRef,
        mode: 'email-password',
        operationId,
    });
    const tenantRef = firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc('96999');
    await assert.rejects(
        runClaimAccountTransaction({
            claimToken: token,
            db: firestoreAdmin,
            messagingUserRef: userRef,
            mode: 'email-password',
            operationId,
            subscription: { email: 'failed@example.com', userDocId: userRef.id },
            apply: (transaction) => {
                transaction.create(tenantRef, { tenantId: 96999 });
                throw new Error('forced-finalize-failure');
            },
        }),
        /forced-finalize-failure/,
    );
    assert.equal((await tenantRef.get()).exists, false, 'Failed finalize must not leave ownership writes');
    assert.equal((await userRef.get()).data()?.claimToken, token, 'Failed finalize keeps the token recoverable');
    assert.equal(await canDeleteCreatedClaimAuthUser(firestoreAdmin, userRef, 'unbound-auth-uid'), true);
    await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('other-bound-auth-user').set({
        firebaseUid: 'other-bound-auth-uid',
    });
    assert.equal(
        await canDeleteCreatedClaimAuthUser(firestoreAdmin, userRef, 'other-bound-auth-uid'),
        false,
        'Compensation must preserve an Auth identity bound by another user document',
    );
    await releaseClaimAccountOperation({ db: firestoreAdmin, messagingUserRef: userRef, operationId });
    assert.equal((await userRef.get()).data()?.claimOperation, undefined);
};

const verifyEmailClaimCreatesCanonicalEmailUser = async (): Promise<void> => {
    const token = 'claim_account_email_identity_token_006';
    const messagingUserRef = await seedClaimUser('claim-account-email-source', token);
    const email = 'canonical-claim@example.com';
    const emailUserId = getGlobalEmailUserDocumentId(email);
    assert(emailUserId);
    const emailUserRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(emailUserId);
    const operationId = 'claim-operation-email-identity';
    await reserveClaimAccountOperation({
        claimToken: token,
        db: firestoreAdmin,
        messagingUserRef,
        mode: 'email-password',
        operationId,
    });
    await runClaimAccountTransaction({
        claimToken: token,
        db: firestoreAdmin,
        messagingUserRef,
        mode: 'email-password',
        operationId,
        subscription: { email, userDocId: emailUserId },
        apply: async (transaction, current) => {
            const target = await transaction.get(emailUserRef);
            if (target.exists) throw new ClaimTokenUnavailableError();
            transaction.create(emailUserRef, {
                email,
                firebaseUid: 'canonical-email-auth-uid',
                storeId: current.claimAccountScope.storeId,
                stores: current.stores,
                tenantId: current.claimAccountScope.tenantId,
            });
            transaction.update(messagingUserRef, {
                active: false,
                claimToken: null,
                claimedByUserId: emailUserId,
            });
        },
    });
    const [source, target] = await Promise.all([messagingUserRef.get(), emailUserRef.get()]);
    assert.equal(source.data()?.active, false);
    assert.equal(source.data()?.claimedByUserId, emailUserId);
    assert.equal(target.data()?.email, email);
    assert.equal(target.data()?.tenantId, 96101);
};

const verifyExpiredReservationAndEligibility = async (): Promise<void> => {
    const token = 'claim_account_expired_lease_token_003';
    const userRef = await seedClaimUser('claim-account-expired-lease', token, {
        claimOperation: {
            id: 'old-operation',
            leaseExpiresAt: Timestamp.fromMillis(Date.now() - 1_000),
            mode: 'email-password',
            status: 'reserved',
        },
    });
    await reserveClaimAccountOperation({
        claimToken: token,
        db: firestoreAdmin,
        messagingUserRef: userRef,
        mode: 'google',
        operationId: 'replacement-operation',
    });
    assert.equal((await userRef.get()).data()?.claimOperation?.id, 'replacement-operation');

    const blockedRef = await seedClaimUser('claim-account-blocked', 'claim_account_blocked_token_000004', {
        blocked: true,
    });
    await assert.rejects(
        reserveClaimAccountOperation({
            claimToken: 'claim_account_blocked_token_000004',
            db: firestoreAdmin,
            messagingUserRef: blockedRef,
            mode: 'google',
            operationId: 'blocked-operation',
        }),
        ClaimTokenUnavailableError,
    );
    const malformedExpiryRef = await seedClaimUser(
        'claim-account-malformed-expiry',
        'claim_account_malformed_expiry_005',
        { claimTokenExpiresAt: { unexpected: true } },
    );
    await assert.rejects(
        reserveClaimAccountOperation({
            claimToken: 'claim_account_malformed_expiry_005',
            db: firestoreAdmin,
            messagingUserRef: malformedExpiryRef,
            mode: 'google',
            operationId: 'malformed-expiry-operation',
        }),
        ClaimTokenUnavailableError,
    );
    const missingExpiryRef = await seedClaimUser(
        'claim-account-missing-expiry',
        'claim_account_missing_expiry_00006',
        { claimTokenExpiresAt: null },
    );
    await assert.rejects(
        reserveClaimAccountOperation({
            claimToken: 'claim_account_missing_expiry_00006',
            db: firestoreAdmin,
            messagingUserRef: missingExpiryRef,
            mode: 'google',
            operationId: 'missing-expiry-operation',
        }),
        ClaimTokenUnavailableError,
    );
};

const verifyClaimTokenIdentityUniqueness = async (): Promise<void> => {
    const duplicateToken = 'claim_account_duplicate_token_00007';
    await Promise.all([
        seedClaimUser('claim-account-duplicate-a', duplicateToken),
        seedClaimUser('claim-account-duplicate-b', duplicateToken),
    ]);
    await assert.rejects(
        getUniqueMessagingUserByClaimToken(firestoreAdmin, duplicateToken),
        ClaimTokenUnavailableError,
        'duplicate claim-token identities must fail before a business is selected',
    );

    const uniqueToken = 'claim_account_unique_token_00000008';
    const uniqueRef = await seedClaimUser('claim-account-unique-token', uniqueToken);
    const uniqueUser = await getUniqueMessagingUserByClaimToken(firestoreAdmin, uniqueToken);
    assert.equal(uniqueUser?.id, uniqueRef.id, 'a unique claim token should retain its existing target');
};

const verifyGoogleTargetAdmission = (): void => {
    assert.doesNotThrow(() => assertGoogleClaimTargetIsAvailable({
        active: true,
        email: 'owner@example.com',
        stores: [],
    }, 'owner@example.com'));
    [
        { email: 'other@example.com' },
        { email: 'owner@example.com', storeId: 1 },
        { email: 'owner@example.com', storeIds: [1] },
        { blocked: true, email: 'owner@example.com' },
    ].forEach((data) => assert.throws(
        () => assertGoogleClaimTargetIsAvailable(data, 'owner@example.com'),
        ClaimTokenUnavailableError,
    ));
};

const run = async (): Promise<void> => {
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    await verifyOneReservationAndAtomicFinalize();
    await verifyFailedFinalizeRollsBackAndCanRelease();
    await verifyEmailClaimCreatesCanonicalEmailUser();
    await verifyExpiredReservationAndEligibility();
    await verifyClaimTokenIdentityUniqueness();
    verifyGoogleTargetAdmission();
    console.log('Claim-account concurrency emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
