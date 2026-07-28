import { DB_COLLECTIONS } from '../../src/constants/database';
import { getAnswerlatticeRetentionExpiry } from '../../src/lib/answerlattice/dataRetention';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '../../src/lib/firebase/answerlatticeFirebaseAdmin';
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

export const toAnswerlatticeSignalBackfillTimestamp = (value: unknown): Timestamp | null => {
    if (value instanceof Timestamp) return value;
    if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
        try {
            const millis = (value as { toMillis: () => unknown }).toMillis();
            return typeof millis === 'number' && Number.isFinite(millis)
                ? Timestamp.fromMillis(millis)
                : null;
        } catch {
            return null;
        }
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) return Timestamp.fromDate(value);
    return null;
};

const normalizeCursor = (value: string): string => {
    const cursor = value.trim();
    if (!cursor) return '';
    if (cursor.length > 1_500 || cursor.includes('/')) {
        throw new Error('--after must be one Firestore document ID no longer than 1500 characters.');
    }
    return cursor;
};

async function run(): Promise<void> {
    const requestedProjectId = getArg('project-id').trim();
    if (!requestedProjectId) {
        throw new Error('Pass --project-id=<answerlattice-qa|answerlattice> before running the signal TTL backfill.');
    }
    if (!['answerlattice-qa', 'answerlattice'].includes(requestedProjectId)) {
        throw new Error('--project-id must be answerlattice-qa or answerlattice.');
    }
    const apply = process.argv.includes('--apply');
    if (apply && getArg('confirm-project').trim() !== requestedProjectId) {
        throw new Error(`Refusing apply: pass --confirm-project=${requestedProjectId}.`);
    }
    const configuredProjectId = answerlatticeAdminApp?.options.projectId || '';
    if (configuredProjectId !== requestedProjectId) {
        throw new Error('Configured Answerlattice Admin project does not match --project-id.');
    }

    const db = answerlatticeFirestoreAdmin;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Answerlattice Firebase Admin is not configured.');
    }

    const after = normalizeCursor(getArg('after'));
    const pageLimit = normalizeLimit(getArg('limit'));
    let query = db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .orderBy(FieldPath.documentId())
        .limit(pageLimit);
    if (after) query = query.startAfter(after);

    const snapshot = await query.get();
    const updates = snapshot.docs.flatMap((document) => {
        const data = document.data() || {};
        if (toAnswerlatticeSignalBackfillTimestamp(data.expiresAt)) return [];
        const sourceTimestamp = toAnswerlatticeSignalBackfillTimestamp(data.timestamp)
            || toAnswerlatticeSignalBackfillTimestamp(data.createdOn);
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

if (require.main === module) {
    run().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message.slice(0, 240) : 'Signal TTL migration failed.'}\n`);
        process.exitCode = 1;
    });
}
