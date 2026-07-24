import {
    getOwnerControlUsageMonthKey,
    normalizeOwnerControlDocumentIdPart,
    OWNER_CONTROL_TYPES,
    parseOwnerControlUsageDocument,
    type OwnerControlType,
} from '@data/shared/ownerControlUsageContract';
import { DB_COLLECTIONS } from '@constant/database';
import {
    doc,
    increment,
    runTransaction,
    serverTimestamp,
    Timestamp,
    type Firestore,
} from 'firebase/firestore';

function getFirestoreErrorCode(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
}

export function shouldRetryOwnerControlMonthBoundary(
    error: unknown,
    attemptedMonth: string,
    currentMonth: string,
    attempt: number,
): boolean {
    return attempt === 0
        && currentMonth !== attemptedMonth
        && getFirestoreErrorCode(error) === 'permission-denied';
}

export async function writeOwnerControlUsageEvent(
    database: Firestore,
    tId: string | number,
    sId: string | number,
    controlType: OwnerControlType,
): Promise<void> {
    const tenantDocumentId = normalizeOwnerControlDocumentIdPart(tId);
    const storeDocumentId = normalizeOwnerControlDocumentIdPart(sId);
    if (
        !tenantDocumentId
        || !storeDocumentId
        || !OWNER_CONTROL_TYPES.includes(controlType)
    ) {
        throw new Error('owner_control_usage_invalid_write_scope');
    }

    const documentId = `${tenantDocumentId}_${storeDocumentId}`;
    const documentRef = doc(database, DB_COLLECTIONS.OWNER_CONTROL_USAGE, documentId);

    for (let attempt = 0; attempt < 2; attempt++) {
        const attemptedMonth = getOwnerControlUsageMonthKey(new Date());
        try {
            await runTransaction(database, async (transaction) => {
                const currentSnapshot = await transaction.get(documentRef);
                if (!currentSnapshot.exists()) {
                    transaction.set(documentRef, {
                        tId: tenantDocumentId,
                        sId: storeDocumentId,
                        counts: { [controlType]: 1 },
                        lastUsed: { [controlType]: serverTimestamp() },
                        monthlyUsage: {
                            [attemptedMonth]: { [controlType]: 1 },
                        },
                        firstTrackedAt: serverTimestamp(),
                        lastUpdatedAt: serverTimestamp(),
                    });
                    return;
                }

                const current = parseOwnerControlUsageDocument(
                    currentSnapshot.data(),
                    currentSnapshot.id,
                    (value): value is Timestamp => value instanceof Timestamp,
                    (value) => value.toMillis(),
                );
                if (!current) {
                    throw new Error('owner_control_usage_invalid_persisted_state');
                }

                transaction.update(documentRef, {
                    [`counts.${controlType}`]: increment(1),
                    [`lastUsed.${controlType}`]: serverTimestamp(),
                    [`monthlyUsage.${attemptedMonth}.${controlType}`]: increment(1),
                    lastUpdatedAt: serverTimestamp(),
                });
            });
            return;
        } catch (error) {
            const currentMonth = getOwnerControlUsageMonthKey(new Date());
            if (shouldRetryOwnerControlMonthBoundary(
                error,
                attemptedMonth,
                currentMonth,
                attempt,
            )) {
                continue;
            }
            throw error;
        }
    }

    throw new Error('owner_control_usage_month_boundary_retry_exhausted');
}
