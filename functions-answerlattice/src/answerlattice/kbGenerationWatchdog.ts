import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const PRODUCT_ID = 'AL';
const PROCESSING_STATUS = 'processing';
const FAILED_STATUS = 'failed';
const WATCHDOG_TIMEOUT_MS = 30 * 60 * 1000;
const WATCHDOG_SCAN_LIMIT = 10;
const WATCHDOG_FAILURE_MESSAGE = 'Knowledge generation timed out. You can retry this job.';

export type KbGenerationWatchdogResult = {
    scanned: number;
    timedOut: number;
    skippedChanged: number;
    skippedInvalidScope: number;
};

const isPositiveScopeId = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const isTimestamp = (value: unknown): value is Timestamp => (
    value instanceof Timestamp
);

const hasExactAnswerlatticeJobScope = (value: Record<string, unknown>): boolean => (
    value.pId === PRODUCT_ID
    && isPositiveScopeId(value.tId)
    && isPositiveScopeId(value.sId)
);

export async function expireStaleAnswerlatticeGenerationJobs(
    now: Timestamp = Timestamp.now(),
): Promise<KbGenerationWatchdogResult> {
    const cutoff = Timestamp.fromMillis(now.toMillis() - WATCHDOG_TIMEOUT_MS);
    const snapshot = await db.collection(DB_COLLECTIONS.KB_GENERATION_JOBS)
        .where('pId', '==', PRODUCT_ID)
        .where('status', '==', PROCESSING_STATUS)
        .where('modifiedOn', '<', cutoff)
        .limit(WATCHDOG_SCAN_LIMIT)
        .get();
    const result: KbGenerationWatchdogResult = {
        scanned: snapshot.size,
        timedOut: 0,
        skippedChanged: 0,
        skippedInvalidScope: 0,
    };

    for (const candidate of snapshot.docs) {
        const candidateData = candidate.data();
        if (!hasExactAnswerlatticeJobScope(candidateData)) {
            result.skippedInvalidScope += 1;
            continue;
        }

        const timedOut = await db.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(candidate.ref);
            const current = currentSnapshot.data();
            if (
                !currentSnapshot.exists
                || !current
                || !hasExactAnswerlatticeJobScope(current)
                || current.status !== PROCESSING_STATUS
                || !isTimestamp(current.modifiedOn)
                || current.modifiedOn.toMillis() >= cutoff.toMillis()
            ) {
                return false;
            }

            const generationRun = current.generationRun;
            const failedGenerationRun = generationRun && typeof generationRun === 'object' && !Array.isArray(generationRun)
                ? {
                    ...generationRun,
                    status: FAILED_STATUS,
                    completedAt: now,
                }
                : undefined;
            transaction.set(candidate.ref, {
                status: FAILED_STATUS,
                errorMessage: WATCHDOG_FAILURE_MESSAGE,
                failureStage: 'generation',
                ...(failedGenerationRun ? { generationRun: failedGenerationRun } : {}),
                modifiedOn: now,
            }, { merge: true });
            return true;
        });

        if (timedOut) result.timedOut += 1;
        else result.skippedChanged += 1;
    }

    return result;
}
