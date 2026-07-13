#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import { claimNotificationDelivery, finalizeNotificationDelivery } from '../../src/lib/notifications/deliveryClaim';
import { Timestamp } from 'firebase-admin/firestore';

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');
    const collection = firestoreAdmin.collection(DB_COLLECTIONS.ANSWERLATTICE_NOTIFICATION_LOGS);
    const ref = collection.doc('same-event');
    await ref.delete();

    const now = Timestamp.fromMillis(1_800_000_000_000);
    const attempts = await Promise.all(Array.from({ length: 8 }, () => claimNotificationDelivery({
        fields: { eventType: 'TICKET_REPLY', recipientEmail: 'owner@example.com' },
        now,
        ref,
    })));
    const winners = attempts.filter((attempt) => attempt.claimed);
    assert.equal(winners.length, 1, 'concurrent attempts must produce one delivery claimant');
    const winner = winners[0];
    if (!winner.claimed) throw new Error('missing winner');

    assert.equal(await finalizeNotificationDelivery({
        claimId: 'not-the-winner',
        fields: { messageId: 'stale' },
        ref,
        status: 'sent',
    }), false, 'a stale worker cannot finalize another claim');
    assert.equal(await finalizeNotificationDelivery({
        claimId: winner.claimId,
        fields: { messageId: 'provider-message-1' },
        ref,
        status: 'sent',
    }), true);
    assert.deepEqual(await claimNotificationDelivery({ fields: {}, now, ref }), {
        claimed: false,
        reason: 'already_sent',
    });

    const recoveryRef = collection.doc('expired-event');
    await recoveryRef.set({
        claimExpiresAt: Timestamp.fromMillis(now.toMillis() - 1),
        claimId: 'expired',
        status: 'sending',
    });
    assert.equal((await claimNotificationDelivery({ fields: {}, now, ref: recoveryRef })).claimed, true);

    const snapshot = await ref.get();
    assert.equal(snapshot.data()?.status, 'sent');
    assert.equal(snapshot.data()?.messageId, 'provider-message-1');
    await Promise.all([ref.delete(), recoveryRef.delete()]);
    process.stdout.write('Notification delivery claim emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
