#!/usr/bin/env ts-node

import assert = require('node:assert/strict');
import { admin, firestoreAdmin } from '../../functions/src/firebaseAdmin';
import {
    deleteExpiredMenuSnapshotsInCollectionRef,
    MENU_SNAPSHOT_EXPIRY_GRACE_MS,
} from '../../functions/src/schedulers/menuSnapshotRetention';

const DAY_MS = 24 * 60 * 60 * 1000;

async function clearCollection(collection: FirebaseFirestore.CollectionReference): Promise<void> {
    const snapshot = await collection.get();
    if (snapshot.empty) return;
    const batch = collection.firestore.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
}

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const now = admin.firestore.Timestamp.fromDate(new Date('2026-07-22T00:00:00.000Z'));
    const snapshots = firestoreAdmin.collection('menuSnapshots').doc('1').collection('101');
    await clearCollection(snapshots);

    const oldCreatedAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - 91 * DAY_MS,
    );
    const recentCreatedAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - 89 * DAY_MS,
    );
    const beforeGraceCutoff = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - 90 * DAY_MS - MENU_SNAPSHOT_EXPIRY_GRACE_MS + 1,
    );
    await Promise.all([
        snapshots.doc('legacy-no-expiry').set({ createdAt: oldCreatedAt }),
        snapshots.doc('legacy-forged-future-expiry').set({
            createdAt: oldCreatedAt,
            expiresAt: admin.firestore.Timestamp.fromDate(new Date('2099-01-01T00:00:00.000Z')),
        }),
        snapshots.doc('recent-current').set({ createdAt: recentCreatedAt }),
        snapshots.doc('within-expiry-grace').set({ createdAt: beforeGraceCutoff }),
    ]);

    const result = await deleteExpiredMenuSnapshotsInCollectionRef({
        collectionRef: snapshots,
        now,
        retentionDays: 90,
        limit: 25,
    });
    assert.deepEqual(result, { scanned: 2, deleted: 2 });

    const [legacy, forged, recent, grace] = await Promise.all([
        snapshots.doc('legacy-no-expiry').get(),
        snapshots.doc('legacy-forged-future-expiry').get(),
        snapshots.doc('recent-current').get(),
        snapshots.doc('within-expiry-grace').get(),
    ]);
    assert.equal(legacy.exists, false, 'legacy snapshots without expiresAt must age out');
    assert.equal(forged.exists, false, 'old client-authored future expiry must not bypass retention');
    assert.equal(recent.exists, true, 'current snapshots must remain');
    assert.equal(grace.exists, true, 'cleanup must honor the snapshot expiry tolerance');

    await assert.rejects(
        deleteExpiredMenuSnapshotsInCollectionRef({
            collectionRef: snapshots,
            now,
            retentionDays: 0,
        }),
        /Invalid menu snapshot retention days/,
    );

    process.stdout.write('Menu snapshot retention emulator tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
