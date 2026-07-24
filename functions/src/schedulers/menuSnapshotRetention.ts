import { Timestamp } from 'firebase-admin/firestore';

const DAY_MS = 24 * 60 * 60 * 1000;

// Snapshot rules allow five minutes of client/server transit and clock
// tolerance around the 90-day expiry marker. Cleanup waits through the same
// grace so no valid current snapshot is deleted before its declared expiry.
export const MENU_SNAPSHOT_EXPIRY_GRACE_MS = 5 * 60 * 1000;

export async function deleteExpiredMenuSnapshotsInCollectionRef(params: {
    collectionRef: FirebaseFirestore.CollectionReference;
    now: Timestamp;
    retentionDays: number;
    limit?: number;
}): Promise<{ scanned: number; deleted: number }> {
    if (!Number.isSafeInteger(params.retentionDays) || params.retentionDays <= 0) {
        throw new RangeError('Invalid menu snapshot retention days');
    }
    const safeLimit = Number.isSafeInteger(params.limit) && Number(params.limit) > 0
        ? Math.min(Number(params.limit), 400)
        : 25;
    const cutoff = Timestamp.fromMillis(
        params.now.toMillis()
        - params.retentionDays * DAY_MS
        - MENU_SNAPSHOT_EXPIRY_GRACE_MS,
    );
    const snapshot = await params.collectionRef
        .where('createdAt', '<=', cutoff)
        .orderBy('createdAt', 'asc')
        .limit(safeLimit)
        .get();

    if (snapshot.empty) return { scanned: 0, deleted: 0 };

    const batch = params.collectionRef.firestore.batch();
    for (const document of snapshot.docs) batch.delete(document.ref);
    await batch.commit();
    return { scanned: snapshot.size, deleted: snapshot.size };
}
