#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { getGeneratedEmail } from '@constant/urls';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
    AuthUserIdentityConflictError,
    getAuthUserByEmail,
    getAuthUserByLoginIdentifier,
    getUniqueAuthUserByEmailFromCollection,
} from '@lib/auth/serverUserContext';
import {
    consumePhoneOtpLoginToken,
    PhoneOtpError,
    verifyPhoneOtpChallenge,
} from '@lib/auth/phoneOtp';
import { Timestamp } from 'firebase-admin/firestore';

const secret = process.env.NEXTAUTH_SECRET;
assert(secret, 'NEXTAUTH_SECRET is required');

const hmac = (value: string): string => crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('hex');

const seedChallenge = async (params: {
    challengeId: string;
    code?: string;
    expiresAtMs?: number;
    phoneE164: string;
}): Promise<FirebaseFirestore.DocumentReference> => {
    const code = params.code || '246810';
    const phoneUsername = params.phoneE164.replace(/\D/g, '');
    const ref = firestoreAdmin
        .collection(DB_COLLECTIONS.AUTH_PHONE_OTP_CHALLENGES)
        .doc(params.challengeId);
    await ref.set({
        attempts: 0,
        countryCode: 'IN',
        dialCode: '+91',
        expiresAt: Timestamp.fromMillis(params.expiresAtMs ?? Date.now() + 120_000),
        otpHash: hmac(`otp:${params.challengeId}:${params.phoneE164}:${code}`),
        phoneE164: params.phoneE164,
        phoneUsername,
        status: 'pending',
    });
    return ref;
};

const expectPhoneOtpError = async (
    action: Promise<unknown>,
    code: PhoneOtpError['code'],
): Promise<void> => {
    try {
        await action;
        assert.fail(`Expected PhoneOtpError(${code})`);
    } catch (error) {
        assert(error instanceof PhoneOtpError);
        assert.equal(error.code, code);
    }
};

const verifyInvalidAttemptsCommit = async (): Promise<void> => {
    const challengeId = 'OtpAttemptsCommit001';
    const ref = await seedChallenge({ challengeId, phoneE164: '+919700000001' });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
        await expectPhoneOtpError(
            verifyPhoneOtpChallenge({ challengeId, code: `11111${attempt}` }),
            'invalid_code',
        );
        const data = (await ref.get()).data();
        assert.equal(data?.attempts, attempt, `Invalid attempt ${attempt} must commit`);
        assert.equal(data?.status, 'pending');
    }

    await expectPhoneOtpError(
        verifyPhoneOtpChallenge({ challengeId, code: '111115' }),
        'too_many_attempts',
    );
    const exhausted = (await ref.get()).data();
    assert.equal(exhausted?.attempts, 5);
    assert.equal(exhausted?.status, 'too_many_attempts');
    await expectPhoneOtpError(
        verifyPhoneOtpChallenge({ challengeId, code: '246810' }),
        'too_many_attempts',
    );
};

const verifyExpiryStatusCommits = async (): Promise<void> => {
    const challengeId = 'OtpExpiredCommit0001';
    const ref = await seedChallenge({
        challengeId,
        expiresAtMs: Date.now() - 1_000,
        phoneE164: '+919700000002',
    });
    await expectPhoneOtpError(
        verifyPhoneOtpChallenge({ challengeId, code: '246810' }),
        'expired',
    );
    assert.equal((await ref.get()).data()?.status, 'expired');
};

const verifyMalformedChallengeStateFailsClosed = async (): Promise<void> => {
    const negativeAttemptsId = 'OtpNegativeAttempts01';
    const negativeAttemptsRef = await seedChallenge({
        challengeId: negativeAttemptsId,
        phoneE164: '+919700000006',
    });
    await negativeAttemptsRef.update({ attempts: -100 });
    await expectPhoneOtpError(
        verifyPhoneOtpChallenge({ challengeId: negativeAttemptsId, code: '246810' }),
        'invalid_code',
    );
    assert.equal((await negativeAttemptsRef.get()).data()?.attempts, -100);

    const stringAttemptsId = 'OtpStringAttempts0001';
    const stringAttemptsRef = await seedChallenge({
        challengeId: stringAttemptsId,
        phoneE164: '+919700000007',
    });
    await stringAttemptsRef.update({ attempts: '0' });
    await expectPhoneOtpError(
        verifyPhoneOtpChallenge({ challengeId: stringAttemptsId, code: '246810' }),
        'invalid_code',
    );
    assert.equal((await stringAttemptsRef.get()).data()?.status, 'pending');
};

const verifyConcurrentSuccessAndOneTimeConsumption = async (): Promise<void> => {
    const challengeId = 'OtpConcurrentValid01';
    const ref = await seedChallenge({ challengeId, phoneE164: '+919700000003' });
    const results = await Promise.allSettled([
        verifyPhoneOtpChallenge({ challengeId, code: '246810' }),
        verifyPhoneOtpChallenge({ challengeId, code: '246810' }),
    ]);
    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const winner = results.find((result) => result.status === 'fulfilled');
    assert(winner?.status === 'fulfilled');
    const challenge = (await ref.get()).data();
    assert.equal(challenge?.status, 'verified');
    assert.equal(challenge?.verificationOperationId, undefined);

    const user = await consumePhoneOtpLoginToken({ token: winner.value.loginToken });
    const userSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(user.id).get();
    assert.equal(userSnapshot.data()?.phone, '+919700000003');
    await expectPhoneOtpError(
        consumePhoneOtpLoginToken({ token: winner.value.loginToken }),
        'invalid_token',
    );
};

const verifyExpiredLoginTokenCommits = async (): Promise<void> => {
    const token = 'expired-phone-login-token-0000000000001xxxx';
    const tokenHash = hmac(`login-token:${token}`);
    const ref = firestoreAdmin
        .collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS)
        .doc(tokenHash);
    await ref.set({
        email: 'expired-phone@example.invalid',
        expiresAt: Timestamp.fromMillis(Date.now() - 1_000),
        status: 'active',
        userId: 'expired-phone-user',
    });
    await expectPhoneOtpError(consumePhoneOtpLoginToken({ token }), 'expired');
    assert.equal((await ref.get()).data()?.status, 'expired');
};

const verifyMalformedLoginTokenFailsClosed = async (): Promise<void> => {
    await expectPhoneOtpError(
        consumePhoneOtpLoginToken({ token: 'x'.repeat(44) }),
        'invalid_token',
    );

    const token = 'malformed-phone-login-token-000000000001xyz';
    assert.equal(token.length, 43);
    const tokenHash = hmac(`login-token:${token}`);
    const userId = 'malformed-token-user';
    const tokenRef = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_PHONE_OTP_LOGIN_TOKENS).doc(tokenHash);
    await Promise.all([
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId).set({
            active: true,
            email: '',
            isVerified: true,
        }),
        tokenRef.set({
            expiresAt: Timestamp.fromMillis(Date.now() + 120_000),
            status: 'active',
            userId,
        }),
    ]);
    await expectPhoneOtpError(consumePhoneOtpLoginToken({ token }), 'invalid_token');
    assert.equal((await tokenRef.get()).data()?.status, 'active');
    assert.equal((await tokenRef.get()).data()?.consumedAt, undefined);
};

const verifyAmbiguousAuthIdentitiesFailClosed = async (): Promise<void> => {
    const users = firestoreAdmin.collection(DB_COLLECTIONS.USERS);
    await Promise.all([
        users.doc('duplicate-email-user-a').set({ email: 'duplicate@example.com' }),
        users.doc('duplicate-email-user-b').set({ email: 'duplicate@example.com' }),
        users.doc('duplicate-phone-user-a').set({ username: '919700009999' }),
        users.doc('duplicate-phone-user-b').set({ phoneNumber: '919700009999' }),
        users.doc('unique-email-user').set({ email: 'unique@example.com' }),
    ]);

    await assert.rejects(getAuthUserByEmail('duplicate@example.com'), AuthUserIdentityConflictError);
    await assert.rejects(
        getUniqueAuthUserByEmailFromCollection(users, 'duplicate@example.com'),
        AuthUserIdentityConflictError,
    );
    await assert.rejects(getAuthUserByLoginIdentifier('919700009999'), AuthUserIdentityConflictError);
    assert.equal((await getAuthUserByEmail('unique@example.com'))?.id, 'unique-email-user');
};

const verifyLegacyPhoneOnlyUserGetsBoundLoginEmail = async (): Promise<void> => {
    const challengeId = 'OtpLegacyPhoneOnly01';
    const phoneE164 = '+919700000004';
    const phoneUsername = phoneE164.replace(/\D/g, '');
    const userId = 'legacy-phone-only-user';
    const userRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(userId);
    await userRef.set({
        active: true,
        authDisabled: false,
        phone: phoneE164,
        phoneUsername,
    });
    await seedChallenge({ challengeId, phoneE164 });

    const verified = await verifyPhoneOtpChallenge({ challengeId, code: '246810' });
    const persistedUser = (await userRef.get()).data();
    assert.equal(persistedUser?.email, getGeneratedEmail(phoneE164));
    const consumedUser = await consumePhoneOtpLoginToken({ token: verified.loginToken });
    assert.equal(consumedUser.id, userId);
};

const verifyLegacyPhoneEmailConflictFailsClosed = async (): Promise<void> => {
    const challengeId = 'OtpEmailConflict0001';
    const phoneE164 = '+919700000005';
    const phoneUsername = phoneE164.replace(/\D/g, '');
    const phoneUserId = 'legacy-phone-conflict-user';
    const phoneUserRef = firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc(phoneUserId);
    const challengeRef = await seedChallenge({ challengeId, phoneE164 });
    await Promise.all([
        phoneUserRef.set({ phone: phoneE164, phoneUsername }),
        firestoreAdmin.collection(DB_COLLECTIONS.USERS).doc('generated-email-conflict-user').set({
            email: getGeneratedEmail(phoneE164),
        }),
    ]);

    await assert.rejects(
        verifyPhoneOtpChallenge({ challengeId, code: '246810' }),
        AuthUserIdentityConflictError,
    );
    const challenge = (await challengeRef.get()).data();
    assert.equal(challenge?.status, 'pending');
    assert.equal(challenge?.verificationOperationId, undefined);
    const phoneUser = (await phoneUserRef.get()).data();
    assert.equal(phoneUser?.email, undefined);
    assert.equal(phoneUser?.phoneVerifiedAt, undefined);
};

const run = async (): Promise<void> => {
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    await verifyInvalidAttemptsCommit();
    await verifyExpiryStatusCommits();
    await verifyMalformedChallengeStateFailsClosed();
    await verifyConcurrentSuccessAndOneTimeConsumption();
    await verifyExpiredLoginTokenCommits();
    await verifyMalformedLoginTokenFailsClosed();
    await verifyAmbiguousAuthIdentitiesFailClosed();
    await verifyLegacyPhoneOnlyUserGetsBoundLoginEmail();
    await verifyLegacyPhoneEmailConflictFailsClosed();
    console.log('Phone OTP transaction emulator verification passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
