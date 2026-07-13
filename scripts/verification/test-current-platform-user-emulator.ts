#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { admin, firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { getCurrentPlatformUser, getCurrentUser } from '../../src/lib/auth/currentPlatformUser';

const session = {
    authIssuedAt: 1_800_000_000,
    uId: 'platform-user-1',
    user: {
        email: 'founder@example.com',
        id: 'platform-user-1',
    },
};

async function clearUsers(): Promise<void> {
    const snapshot = await firestoreAdmin.collection('users').get();
    if (snapshot.empty) return;
    const batch = firestoreAdmin.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    await clearUsers();
    const userRef = firestoreAdmin.collection('users').doc('platform-user-1');
    const currentUser = {
        active: true,
        authDisabled: false,
        deleted: false,
        email: 'founder@example.com',
        id: 'platform-user-1',
        isVerified: true,
        platformRole: 'PLATFORM',
    };
    await userRef.set(currentUser);

    const admitted = await getCurrentPlatformUser(session);
    assert.equal(admitted?.documentId, 'platform-user-1');
    assert.equal(admitted?.userData.email, 'founder@example.com');

    await userRef.set({ platformRole: 'OWNER' }, { merge: true });
    assert.equal(
        (await getCurrentUser(session))?.documentId,
        'platform-user-1',
        'a current owner remains eligible for self-service account mutations',
    );
    assert.equal(
        await getCurrentPlatformUser(session),
        null,
        'a current persisted role downgrade must invalidate the signed platform session',
    );

    await userRef.set({
        ...currentUser,
        platformRole: 'OWNER',
        authDisabled: true,
    });
    assert.equal(
        await getCurrentUser(session),
        null,
        'a currently disabled owner must fail self-service admission',
    );

    await userRef.set({
        ...currentUser,
        sessionRevokedAt: admin.firestore.Timestamp.fromMillis(1_800_000_001_000),
    });
    assert.equal(
        await getCurrentPlatformUser(session),
        null,
        'a current revocation after session issuance must fail closed',
    );

    await userRef.set({
        ...currentUser,
        sessionRevokedAt: admin.firestore.Timestamp.fromMillis(1_800_000_000_000),
    });
    assert.equal(
        await getCurrentPlatformUser(session),
        null,
        'a revocation at the session issuance boundary must fail closed',
    );

    await userRef.delete();
    await firestoreAdmin.collection('users').doc('legacy-random-id').set({
        ...currentUser,
        id: 'platform-user-1',
    });
    assert.equal(
        await getCurrentPlatformUser(session),
        null,
        'a same-email row under another document ID must not become an identity fallback',
    );

    assert.equal(
        await getCurrentPlatformUser({ ...session, uId: '../platform-user-1' }),
        null,
        'an invalid session document ID must fail before a user lookup',
    );

    await clearUsers();
    process.stdout.write('Current platform-user emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
