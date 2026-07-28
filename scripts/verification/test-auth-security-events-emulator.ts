#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '@constant/database';
import {
    AuthSecurityUnavailableError,
    checkAccountLock,
    getSecuritySummary,
    logFailedLogin,
} from '@lib/auth/security';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';

const EMAIL = 'auth-security-events@example.com';

async function run(): Promise<void> {
    assert(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST is required');
    const events = firestoreAdmin.collection(DB_COLLECTIONS.AUTH_SECURITY_EVENTS);

    await Promise.all(Array.from({ length: 5 }, (_, index) => (
        logFailedLogin(
            EMAIL,
            'invalid_password',
            'credentials',
            { ip: `203.0.113.${index + 1}`, userAgent: 'auth-security-emulator' },
        )
    )));

    const locked = await checkAccountLock(EMAIL.toUpperCase());
    assert.equal(locked.isLocked, true);
    assert.equal(locked.failedAttempts, 5);
    assert(locked.lockedUntil instanceof Date);

    const afterLock = await events.where('email', '==', EMAIL).get();
    assert.equal(afterLock.docs.filter((doc) => doc.data().eventType === 'login_failed').length, 5);
    assert.equal(afterLock.docs.filter((doc) => doc.data().eventType === 'account_locked').length, 1);

    await logFailedLogin(EMAIL, 'invalid_password', 'credentials');
    const afterBlockedRetry = await events.where('email', '==', EMAIL).get();
    assert.equal(afterBlockedRetry.size, afterLock.size, 'An active lock must not create another failed event');

    const summary = await getSecuritySummary(new Date(Date.now() - 60_000));
    assert.equal(summary.totalAttempts, 6);
    assert.equal(summary.failedAttempts, 5);
    assert.equal(summary.lockedAccounts, 1);
    assert.deepEqual(summary.suspiciousIPs, []);

    await events.add({
        email: EMAIL,
        eventType: 'account_locked',
        expiresAt: new Date(Date.now() + 60_000),
        reason: 'malformed timestamp regression',
        source: 'credentials',
        timestamp: 'not-a-firestore-timestamp',
    });
    await assert.rejects(
        checkAccountLock(EMAIL),
        AuthSecurityUnavailableError,
    );

    await assert.rejects(
        logFailedLogin(EMAIL, 'x'.repeat(161), 'credentials'),
        AuthSecurityUnavailableError,
    );
    await assert.rejects(
        getSecuritySummary(new Date(Number.NaN)),
        AuthSecurityUnavailableError,
    );

    process.stdout.write('Auth security event concurrency and persisted-boundary emulator passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
