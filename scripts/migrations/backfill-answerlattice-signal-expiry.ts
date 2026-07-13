import { DB_COLLECTIONS } from '../../src/constants/database';
import { getAnswerlatticeRetentionExpiry } from '../../src/lib/answerlattice/dataRetention';
import { answerlatticeFirestoreAdmin } from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 450;

const getArg = (name: string) => {
    const prefix = `--${name}=`;
    return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || '';
};

const normalizeLimit = (value: string) => {
    const parsed = Number(value || DEFAULT_LIMIT);
    return Number.isSafeInteger(parsed) && parsed > 0
        ? Math.min(parsed, MAX_LIMIT)
        : DEFAULT_LIMIT;
};

const toTimestamp = (value: unknown): Timestamp | null => {
    if (value instanceof Timestamp) return value;
    if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
        const millis = Number((value as { toMillis: () => number }).toMillis());
        return Number.isFinite(millis) ? Timestamp.fromMillis(millis) : null;
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) return Timestamp.fromDate(value);
    return null;
};

async function run(): Promise<void> {
    const db = answerlatticeFirestoreAdmin;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Answerlattice Firebase Admin is not configured.');
    }

    const apply = process.argv.includes('--apply');
    const after = getArg('after').trim();
    const pageLimit = normalizeLimit(getArg('limit'));
    let query = db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .orderBy(FieldPath.documentId())
        .limit(pageLimit);
    if (after) query = query.startAfter(after);

    const snapshot = await query.get();
    const updates = snapshot.docs.flatMap((document) => {
        const data = document.data() || {};
        if (data.expiresAt) return [];
        const sourceTimestamp = toTimestamp(data.timestamp) || toTimestamp(data.createdOn);
        if (!sourceTimestamp) return [];
        return [{
            ref: document.ref,
            expiresAt: getAnswerlatticeRetentionExpiry('signalEvents', sourceTimestamp),
        }];
    });

    if (apply && updates.length > 0) {
        const batch = db.batch();
        updates.forEach((update) => batch.update(update.ref, { expiresAt: update.expiresAt }));
        await batch.commit();
    }

    const nextCursor = snapshot.size === pageLimit ? snapshot.docs[snapshot.docs.length - 1]?.id || '' : '';
    process.stdout.write(JSON.stringify({
        applied: apply,
        nextCursor,
        scanned: snapshot.size,
        skipped: snapshot.size - updates.length,
        updated: apply ? updates.length : 0,
        wouldUpdate: updates.length,
    }, null, 2));
    process.stdout.write('\n');
}

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Signal TTL migration failed.'}\n`);
    process.exitCode = 1;
});
